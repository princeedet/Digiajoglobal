<?php
// ─── DigiAjo Global — Register User + Create Pending Payment ─────────────────
// POST /api/register.php
// Body (JSON): { name, phone, email, plan, paymentMethod, bankRef?, ref? }
// Returns:     { success, userId, paymentId, reference, message }

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
    exit;
}

// ─── Validate Required Fields ─────────────────────────────────────────────────
$required = ['name', 'phone', 'email', 'plan', 'paymentMethod'];
foreach ($required as $field) {
    if (empty($body[$field])) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
        exit;
    }
}

$name           = trim($body['name']);
$phone          = trim($body['phone']);
$email          = strtolower(trim($body['email']));
$plan           = $body['plan'];           // 'double-up' | 'digimart'
$paymentMethod  = $body['paymentMethod'];  // 'bank' | 'paystack' | 'flutterwave'
$bankRef        = trim($body['bankRef'] ?? '');
$referredByCode = trim($body['ref'] ?? '');

// ─── Validate Plan ─────────────────────────────────────────────────────────────
$planMap = [
    'double-up' => ['label' => 'Double Up', 'fee' => 2000,   'purpose' => 'Double Up Registration',  'paymentType' => 'registration_fee'],
    'digimart'  => ['label' => 'DigiMart',  'fee' => 100000, 'purpose' => 'DigiMart Unit Registration', 'paymentType' => 'digimart_unit'],
];
if (!isset($planMap[$plan])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Invalid plan selected']);
    exit;
}
$planInfo = $planMap[$plan];

try {
    $db = getDB();

    // ─── Helper to safely add column if not exists across all MySQL versions ─────
    if (!function_exists('addColumnIfNotExists')) {
        function addColumnIfNotExists(PDO $db, string $table, string $column, string $typeDef) {
            try {
                $check = $db->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
                if ($check && $check->rowCount() === 0) {
                    $db->exec("ALTER TABLE `$table` ADD `$column` $typeDef");
                }
            } catch (Exception $e) {}
        }
    }

    // ─── Ensure Tables and Columns Exist ─────────────────────────────────────────
    $db->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            member_id VARCHAR(50) UNIQUE,
            name VARCHAR(255) NOT NULL,
            initials VARCHAR(10),
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(50),
            password_hash VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending_verification',
            plan_type VARCHAR(50) DEFAULT 'Double Up',
            registration_fee DECIMAL(10,2) DEFAULT 2000.00,
            registration_fee_paid TINYINT(1) DEFAULT 0,
            needs_security_update TINYINT(1) DEFAULT 1,
            referral_code VARCHAR(50),
            referred_by INT,
            saved DECIMAL(10,2) DEFAULT 0.00,
            weeks INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    addColumnIfNotExists($db, 'users', 'referral_code', 'VARCHAR(50)');
    addColumnIfNotExists($db, 'users', 'referred_by', 'INT');
    addColumnIfNotExists($db, 'users', 'needs_security_update', 'TINYINT(1) DEFAULT 1');
    addColumnIfNotExists($db, 'users', 'registration_fee', 'DECIMAL(10,2) DEFAULT 2000.00');
    addColumnIfNotExists($db, 'users', 'registration_fee_paid', 'TINYINT(1) DEFAULT 0');
    addColumnIfNotExists($db, 'users', 'initials', 'VARCHAR(10)');
    addColumnIfNotExists($db, 'users', 'saved', 'DECIMAL(10,2) DEFAULT 0.00');
    addColumnIfNotExists($db, 'users', 'weeks', 'INT DEFAULT 0');

    $db->exec("
        CREATE TABLE IF NOT EXISTS referrals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            referrer_id INT NOT NULL,
            referee_id INT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            payment_ref VARCHAR(100),
            user_id INT,
            member_id VARCHAR(50),
            member_name VARCHAR(255),
            amount DECIMAL(12,2) NOT NULL,
            channel VARCHAR(50) DEFAULT 'bank_transfer',
            payment_type VARCHAR(50) DEFAULT 'registration_fee',
            status VARCHAR(50) DEFAULT 'pending',
            payment_status VARCHAR(50) DEFAULT 'pending',
            purpose VARCHAR(255),
            hands INT DEFAULT 1,
            weeks_covered INT DEFAULT 1,
            payment_scope VARCHAR(50) DEFAULT 'registration',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP NULL
        )
    ");

    addColumnIfNotExists($db, 'payments', 'hands', 'INT DEFAULT 1');
    addColumnIfNotExists($db, 'payments', 'weeks_covered', 'INT DEFAULT 1');
    addColumnIfNotExists($db, 'payments', 'payment_scope', "VARCHAR(100) DEFAULT 'registration'");
    addColumnIfNotExists($db, 'payments', 'payment_type', "VARCHAR(100) DEFAULT 'registration_fee'");
    addColumnIfNotExists($db, 'payments', 'payment_status', "VARCHAR(50) DEFAULT 'pending'");
    addColumnIfNotExists($db, 'payments', 'purpose', 'VARCHAR(255)');
    addColumnIfNotExists($db, 'payments', 'member_name', 'VARCHAR(255)');
    addColumnIfNotExists($db, 'payments', 'member_id', 'VARCHAR(50)');

    // Ensure payment_scope is a generous VARCHAR rather than restrictive ENUM
    try {
        $db->exec("ALTER TABLE payments MODIFY COLUMN payment_scope VARCHAR(100) DEFAULT 'registration'");
        $db->exec("ALTER TABLE payments MODIFY COLUMN payment_type VARCHAR(100) DEFAULT 'registration_fee'");
    } catch (Exception $e) {}

    // ─── Check Duplicate Email ──────────────────────────────────────────────────
    $check = $db->prepare('SELECT id, member_id, status, registration_fee_paid FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $check->execute([$email]);
    $existingUser = $check->fetch(PDO::FETCH_ASSOC);

    if ($existingUser) {
        // If active/verified, prevent duplicate registration
        if ($existingUser['status'] === 'active' || (int)$existingUser['registration_fee_paid'] === 1) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'This email address is already registered on DigiAjo. Please use a new email address or log in.'
            ]);
            exit;
        }

        // Unverified user retrying / submitting payment transfer
        $dbUserId = (int)$existingUser['id'];
        $memberId = $existingUser['member_id'] ?: ('DA-' . str_pad((string)$dbUserId, 5, '0', STR_PAD_LEFT));

        if ($paymentMethod === 'bank') {
            if (strlen($bankRef) > 40) {
                $bankRef = substr($bankRef, 0, 40);
            }
            $txRef         = $bankRef ?: sprintf('DGA/%s%s/%s', date('n'), date('j'), substr($memberId, -3));
            $channel       = 'bank_transfer';
            $paymentStatus = 'pending';
            $userStatus    = 'pending_verification';
        } else {
            $gatewayLabel  = strtoupper($paymentMethod);
            $txRef         = $gatewayLabel . '_' . random_int(100000000, 999999999);
            $channel       = 'card';
            $paymentStatus = 'approved';
            $userStatus    = 'active';
        }

        $cleanPhone  = preg_replace('/\D/', '', $phone);
        $defaultPass = substr($cleanPhone, -6);
        $passHash    = password_hash($defaultPass, PASSWORD_BCRYPT);
        $parts       = preg_split('/\s+/', trim($name));
        $initials    = strtoupper(implode('', array_map(fn($p) => $p[0] ?? '', array_slice($parts, 0, 2))));

        $db->prepare("
            UPDATE users 
            SET name = ?, initials = ?, phone = ?, password_hash = ?, plan_type = ?, registration_fee = ?, status = ?
            WHERE id = ?
        ")->execute([$name, $initials, $phone, $passHash, $planInfo['label'], $planInfo['fee'], $userStatus, $dbUserId]);

        // Insert or update pending payment
        $payCheck = $db->prepare("SELECT id FROM payments WHERE user_id = ? AND status = 'pending' LIMIT 1");
        $payCheck->execute([$dbUserId]);
        $existingPay = $payCheck->fetch();

        if ($existingPay) {
            $db->prepare("
                UPDATE payments 
                SET payment_ref = ?, member_name = ?, amount = ?, channel = ?, payment_type = ?, purpose = ?
                WHERE id = ?
            ")->execute([$txRef, $name, $planInfo['fee'], $channel, $planInfo['paymentType'], $planInfo['purpose'], $existingPay['id']]);
            $payRef = $txRef;
        } else {
            $payRef = 'PAY-' . str_pad((string)random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
            $db->prepare("
                INSERT INTO payments
                    (payment_ref, user_id, member_id, member_name, amount, channel,
                     payment_type, status, payment_status, purpose, hands, weeks_covered, payment_scope)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'registration')
            ")->execute([
                $txRef,
                $dbUserId,
                $memberId,
                $name,
                $planInfo['fee'],
                $channel,
                $planInfo['paymentType'],
                $paymentStatus,
                $paymentStatus,
                $planInfo['purpose'],
            ]);
        }

        echo json_encode([
            'success'       => true,
            'userId'        => $memberId,
            'paymentId'     => $payRef,
            'reference'     => $txRef,
            'status'        => $userStatus,
            'paymentStatus' => $paymentStatus,
            'message'       => 'Registration transfer submitted! Awaiting payment confirmation from admin.',
        ]);
        exit;
    }

    // ─── Generate Unique Member ID ─────────────────────────────────────────────
    do {
        $memberId = 'DA-' . str_pad((string)random_int(10000, 99999), 5, '0', STR_PAD_LEFT);
        $row = $db->prepare('SELECT id FROM users WHERE member_id = ? LIMIT 1');
        $row->execute([$memberId]);
    } while ($row->fetch());

    // ─── Generate Unique Payment Reference ──────────────────────────────────
    do {
        $payRef = 'PAY-' . str_pad((string)random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $row = $db->prepare('SELECT id FROM payments WHERE payment_ref = ? LIMIT 1');
        $row->execute([$payRef]);
    } while ($row->fetch());

    // ─── Build Payment Reference & Status ────────────────────────────────────
    if ($paymentMethod === 'bank') {
        if (strlen($bankRef) > 40) {
            $bankRef = substr($bankRef, 0, 40);
        }
        $txRef         = $bankRef ?: sprintf('DGA/%s%s/%s', date('n'), date('j'), substr($memberId, -3));
        $channel       = 'bank_transfer';
        $paymentStatus = 'pending';
        $userStatus    = 'pending_verification';
    } else {
        $gatewayLabel  = strtoupper($paymentMethod);
        $txRef         = $gatewayLabel . '_' . random_int(100000000, 999999999);
        $channel       = 'card';
        $paymentStatus = 'approved';
        $userStatus    = 'active';
    }

    $parts    = preg_split('/\s+/', trim($name));
    $initials = strtoupper(implode('', array_map(fn($p) => $p[0] ?? '', array_slice($parts, 0, 2))));
    $cleanPhone  = preg_replace('/\D/', '', $phone);
    $defaultPass = substr($cleanPhone, -6);
    $passHash    = password_hash($defaultPass, PASSWORD_BCRYPT);
    $referralCode = strtoupper(substr(md5($email . time()), 0, 8));

    // ─── Resolve Referrer ─────────────────────────────────────────────────────
    $referrerId = null;
    if (!empty($referredByCode)) {
        $refCheck = $db->prepare('SELECT id FROM users WHERE referral_code = ? OR member_id = ? LIMIT 1');
        $refCheck->execute([$referredByCode, $referredByCode]);
        $refRow = $refCheck->fetch(PDO::FETCH_ASSOC);
        if ($refRow) {
            $referrerId = (int)$refRow['id'];
        }
    }

    // ─── Insert User ──────────────────────────────────────────────────────────
    $userInsert = $db->prepare("
        INSERT INTO users
            (member_id, name, initials, email, phone, password_hash, status, plan_type,
             registration_fee, registration_fee_paid, needs_security_update, referral_code, referred_by)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ");
    $userInsert->execute([
        $memberId,
        $name,
        $initials,
        $email,
        $phone,
        $passHash,
        $userStatus,
        $planInfo['label'],
        $planInfo['fee'],
        $paymentStatus === 'approved' ? 1 : 0,
        $referralCode,
        $referrerId
    ]);
    $dbUserId = (int)$db->lastInsertId();

    // ─── Insert Referral Record ────────────────────────────────────────────────
    if ($referrerId) {
        try {
            $referralStatus = ($paymentStatus === 'approved') ? 'active' : 'pending';
            $db->prepare("
                INSERT INTO referrals (referrer_id, referee_id, status)
                VALUES (?, ?, ?)
            ")->execute([$referrerId, $dbUserId, $referralStatus]);
        } catch (PDOException $e) {}
    }

    // ─── Insert Payment ────────────────────────────────────────────────────────
    $payInsert = $db->prepare("
        INSERT INTO payments
            (payment_ref, user_id, member_id, member_name, amount, channel,
             payment_type, status, payment_status, purpose, hands, weeks_covered, payment_scope)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'registration')
    ");
    $payInsert->execute([
        $txRef,
        $dbUserId,
        $memberId,
        $name,
        $planInfo['fee'],
        $channel,
        $planInfo['paymentType'],
        $paymentStatus,
        $paymentStatus,
        $planInfo['purpose'],
    ]);

    // ─── Auto-create savings plan for approved online payments ────────────────
    if ($paymentStatus === 'approved' && $plan === 'double-up') {
        try {
            $db->prepare("
                INSERT INTO savings_plans
                    (user_id, start_date, plan_type)
                VALUES (?, CURDATE(), 'double_up')
            ")->execute([$dbUserId]);
        } catch (PDOException $e) {}
    }

    // ─── Response ─────────────────────────────────────────────────────────────
    echo json_encode([
        'success'       => true,
        'userId'        => $memberId,
        'paymentId'     => $payRef,
        'reference'     => $txRef,
        'status'        => $userStatus,
        'paymentStatus' => $paymentStatus,
        'message'       => ($paymentMethod === 'bank')
            ? 'Registration submitted! Awaiting payment confirmation from admin.'
            : 'Registration and payment successful! Your account is now active.',
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Server error: ' . $e->getMessage()
    ]);
}

