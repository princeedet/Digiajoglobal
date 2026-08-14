<?php
// ─── DigiAjo Global — Register User + Create Pending Payment ─────────────────
// POST /api/register.php
// Body (JSON): { name, phone, email, plan, paymentMethod, bankRef? }
// Returns:     { success, userId, paymentId, reference, message }

require_once __DIR__ . '/config.php';

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

$name          = trim($body['name']);
$phone         = trim($body['phone']);
$email         = strtolower(trim($body['email']));
$plan          = $body['plan'];           // 'double-up' | 'digimart'
$paymentMethod = $body['paymentMethod'];  // 'bank' | 'paystack' | 'flutterwave'
$bankRef       = trim($body['bankRef'] ?? '');
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

$db = getDB();

// ─── Check Duplicate Email ─────────────────────────────────────────────────────
$check = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$check->execute([$email]);
if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => 'An account with this email already exists. Please log in instead.']);
    exit;
}

// ─── Generate Unique Member ID ─────────────────────────────────────────────────
function generateMemberId(PDO $db): string {
    do {
        $id  = 'DA-' . str_pad((string)random_int(10000, 99999), 5, '0', STR_PAD_LEFT);
        $row = $db->prepare('SELECT id FROM users WHERE member_id = ? LIMIT 1');
        $row->execute([$id]);
    } while ($row->fetch());
    return $id;
}

$memberId = generateMemberId($db);

// ─── Generate Unique Payment Reference ──────────────────────────────────────
function generatePayRef(PDO $db): string {
    do {
        $ref = 'PAY-' . str_pad((string)random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $row = $db->prepare('SELECT id FROM payments WHERE payment_ref = ? LIMIT 1');
        $row->execute([$ref]);
    } while ($row->fetch());
    return $ref;
}

// ─── Build Payment Reference & Status ────────────────────────────────────────
if ($paymentMethod === 'bank') {
    // Truncate to 40 chars since payment_ref is VARCHAR(40)
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

// ─── Initials ─────────────────────────────────────────────────────────────────
$parts    = preg_split('/\s+/', trim($name));
$initials = strtoupper(implode('', array_map(fn($p) => $p[0] ?? '', array_slice($parts, 0, 2))));

// ─── Default Password = Last 6 Digits of Phone ────────────────────────────────
$cleanPhone  = preg_replace('/\D/', '', $phone);
$defaultPass = substr($cleanPhone, -6);
$passHash    = password_hash($defaultPass, PASSWORD_BCRYPT);

// ─── Generate referral code ───────────────────────────────────────────────────
$referralCode = strtoupper(substr(md5($email . time()), 0, 8));

// ─── Resolve Referrer ─────────────────────────────────────────────────────────
$referrerId = null;
if (!empty($referredByCode)) {
    $refCheck = $db->prepare('SELECT id FROM users WHERE referral_code = ? LIMIT 1');
    $refCheck->execute([$referredByCode]);
    $refRow = $refCheck->fetch(PDO::FETCH_ASSOC);
    if ($refRow) {
        $referrerId = (int)$refRow['id'];
    }
}

// ─── Insert User ──────────────────────────────────────────────────────────────
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

// ─── Insert Referral Record ────────────────────────────────────────────────────
if ($referrerId) {
    try {
        $referralStatus = ($paymentStatus === 'approved') ? 'active' : 'pending';
        $db->prepare("
            INSERT INTO referrals (referrer_id, referee_id, status)
            VALUES (?, ?, ?)
        ")->execute([$referrerId, $dbUserId, $referralStatus]);
    } catch (PDOException $e) {
        // Table might have different schema – non-fatal
    }
}

// ─── Insert Payment ────────────────────────────────────────────────────────────
$payRef    = generatePayRef($db);
$payInsert = $db->prepare("
    INSERT INTO payments
        (payment_ref, user_id, member_id, member_name, amount, channel,
         payment_type, status, payment_status, purpose)
    VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

// ─── Auto-create savings plan for approved online payments ────────────────────
if ($paymentStatus === 'approved' && $plan === 'double-up') {
    try {
        $db->prepare("
            INSERT INTO savings_plans
                (user_id, start_date, plan_type)
            VALUES (?, CURDATE(), 'double_up')
        ")->execute([$dbUserId]);
    } catch (PDOException $e) {
        // Table might have different schema – non-fatal
    }

} elseif ($paymentStatus === 'approved' && $plan === 'digimart') {
    // Check if digimart_investments table exists before inserting
    try {
        $db->prepare("
            INSERT INTO digimart_investments
                (user_id, units, unit_price, total_invested, investment_date, maturity_date, status)
            VALUES (?, 1, 100000, 100000, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active')
        ")->execute([$dbUserId]);
    } catch (PDOException $e) {
        // Table might not exist yet – non-fatal
    }
}

// ─── Welcome Notification ─────────────────────────────────────────────────────
$notifMsg = ($paymentMethod === 'bank')
    ? "Welcome to DigiAjo, {$name}! Your registration is pending payment confirmation. Once confirmed by admin, log in with your email and last 6 digits of your phone number."
    : "Welcome to DigiAjo, {$name}! Your account is now active. Log in with your email and last 6 digits of your phone number.";

try {
    $db->prepare("
        INSERT INTO notifications (user_id, member_id, title, message, type)
        VALUES (?, ?, 'Welcome to DigiAjo!', ?, 'info')
    ")->execute([$dbUserId, $memberId, $notifMsg]);
} catch (PDOException $e) {
    // Non-fatal if notifications table has different schema
}

// ─── Send Emails ──────────────────────────────────────────────────────────────
require_once __DIR__ . '/utils/email.php';

// Email to User
$userSubject = "Welcome to DigiAjo Global!";
$userMsg = "<p>Hi $name,</p>";
if ($paymentMethod === 'bank') {
    $userMsg .= "<p>Thank you for registering. Your account is currently pending payment confirmation. Once confirmed by our admin, you can log in using your email and your default password.</p>";
} else {
    $userMsg .= "<p>Thank you for registering. Your account is now active! You can log in using your email and your default password.</p>";
}

$userMsg .= "<p><strong>Your Default Password:</strong> $defaultPass</p>";
$userMsg .= "<p><em>Note: Your password is the last 6 digits of your phone number. You can change this in your profile settings after logging in.</em></p>";

send_email($email, $userSubject, $userMsg);

// Email to Admin
$adminEmail = "admin@digiajoglobal.com"; // Default admin email
$adminSubject = "New Member Registration: $name";
$adminMsg = "<p>A new user has registered on DigiAjo Global.</p>
<ul>
    <li><strong>Name:</strong> $name</li>
    <li><strong>Email:</strong> $email</li>
    <li><strong>Phone:</strong> $phone</li>
    <li><strong>Plan:</strong> {$planInfo['label']}</li>
    <li><strong>Payment Method:</strong> " . strtoupper($paymentMethod) . "</li>
</ul>";
send_email($adminEmail, $adminSubject, $adminMsg);

// ─── Response ─────────────────────────────────────────────────────────────────
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
