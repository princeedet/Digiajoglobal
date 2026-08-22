<?php
// ─── DigiAjo Global — Admin Payments Management & Approval Endpoint ─────────
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

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

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            payment_ref VARCHAR(100) NULL,
            amount DECIMAL(12,2) NOT NULL,
            channel VARCHAR(50) DEFAULT 'bank_transfer',
            status VARCHAR(50) DEFAULT 'pending',
            payment_status VARCHAR(50) DEFAULT 'pending',
            purpose VARCHAR(255) NULL,
            payment_type VARCHAR(100) DEFAULT 'registration_fee',
            member_name VARCHAR(100) NULL,
            member_id VARCHAR(50) NULL,
            hands INT DEFAULT 1,
            weeks_covered INT DEFAULT 1,
            payment_scope VARCHAR(100) DEFAULT 'registration',
            paid_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    addColumnIfNotExists($db, 'payments', 'payment_status', "VARCHAR(50) DEFAULT 'pending'");
    addColumnIfNotExists($db, 'payments', 'payment_type', "VARCHAR(100) DEFAULT 'registration_fee'");
    addColumnIfNotExists($db, 'payments', 'purpose', "VARCHAR(255)");
    addColumnIfNotExists($db, 'payments', 'hands', "INT DEFAULT 1");
    addColumnIfNotExists($db, 'payments', 'weeks_covered', "INT DEFAULT 1");
    addColumnIfNotExists($db, 'payments', 'payment_scope', "VARCHAR(100) DEFAULT 'registration'");
    addColumnIfNotExists($db, 'payments', 'member_name', "VARCHAR(255)");
    addColumnIfNotExists($db, 'payments', 'member_id', "VARCHAR(50)");
    addColumnIfNotExists($db, 'payments', 'paid_at', "DATETIME NULL");

    // ─── GET: Fetch all payments ──────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $db->query("
            SELECT 
                p.id as _dbId,
                COALESCE(NULLIF(p.payment_ref, ''), CONCAT('PAY-', p.id)) as id,
                COALESCE(p.member_name, u.name, 'Member') as member,
                COALESCE(p.member_id, u.member_id, CONCAT('DA-', p.user_id)) as memberId,
                p.amount,
                DATE_FORMAT(COALESCE(p.created_at, NOW()), '%d %b %Y, %h:%i %p') as date,
                COALESCE(NULLIF(p.payment_ref, ''), CONCAT('PAY-', p.id)) as reference,
                COALESCE(p.channel, 'bank_transfer') as channel,
                COALESCE(p.status, 'pending') as status,
                COALESCE(p.purpose, 'Registration Fee') as purpose,
                COALESCE(p.payment_type, 'registration_fee') as payment_type
            FROM payments p
            LEFT JOIN users u ON (u.id = p.user_id OR u.member_id = p.member_id)
            ORDER BY p.created_at DESC
        ");
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($payments as &$p) {
            $p['amount'] = (float)$p['amount'];

            if ($p['channel'] === 'bank_transfer') {
                $p['channel'] = 'Bank transfer';
            } else if ($p['channel'] === 'card') {
                $p['channel'] = 'Card';
            } else if ($p['channel'] === 'ussd') {
                $p['channel'] = 'USSD';
            }

            if (empty($p['purpose'])) {
                $typeLabels = [
                    'registration_fee'    => 'Registration Fee',
                    'weekly_contribution' => 'Weekly Savings Contribution',
                    'digimart_unit'       => 'DigiMart Co-ownership Unit Purchase',
                    'fine'                => 'Late Payment Fine',
                ];
                $p['purpose'] = $typeLabels[$p['payment_type']] ?? ucwords(str_replace('_', ' ', $p['payment_type']));
            }
        }
        unset($p);

        echo json_encode([
            'success' => true,
            'payments' => $payments
        ]);
        exit;
    }

    // ─── POST: Approve or Reject Payment ──────────────────────────────────────
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';
        $id = trim($data['id'] ?? '');

        if (!$id || !in_array($action, ['approve', 'reject'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid parameters']);
            exit;
        }

        $status = ($action === 'approve') ? 'approved' : 'rejected';

        // Provision savings_plans table
        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS savings_plans (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    plan_type VARCHAR(50) DEFAULT 'double_up',
                    savings_plan_id VARCHAR(50) DEFAULT 'SP-1',
                    total_saved DECIMAL(12,2) DEFAULT 0,
                    weeks_completed INT DEFAULT 0,
                    weekly_amount DECIMAL(12,2) DEFAULT 1300.00,
                    total_weeks INT DEFAULT 50,
                    status VARCHAR(50) DEFAULT 'active',
                    start_date DATE NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            ");
        } catch (Exception $e) {}

        // Match payment
        $numericId = is_numeric($id) ? (int)$id : 0;
        if (str_starts_with($id, 'PAY-') && is_numeric(substr($id, 4))) {
            $numericId = (int)substr($id, 4);
        }

        $stmt = $db->prepare("
            SELECT * FROM payments 
            WHERE payment_ref = ? OR CONCAT('PAY-', id) = ? OR id = ?
            ORDER BY id DESC
            LIMIT 1
        ");
        $stmt->execute([$id, $id, $numericId]);
        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$payment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => "Payment not found for identifier: $id"]);
            exit;
        }

        $dbPaymentId = (int)$payment['id'];
        $userId      = (int)($payment['user_id'] ?? 0);
        $memberId    = $payment['member_id'] ?? '';
        $amount      = (float)$payment['amount'];
        $paymentType = $payment['payment_type'] ?? 'registration_fee';
        $memberName  = $payment['member_name'] ?? '';

        // Resolve user accurately
        $targetUser = null;
        if ($userId > 0) {
            $uStmt = $db->prepare('SELECT id, member_id, name, email FROM users WHERE id = ? LIMIT 1');
            $uStmt->execute([$userId]);
            $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
        }
        if (!$targetUser && !empty($memberId)) {
            $uStmt = $db->prepare('SELECT id, member_id, name, email FROM users WHERE member_id = ? OR referral_code = ? LIMIT 1');
            $uStmt->execute([$memberId, $memberId]);
            $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
        }
        if (!$targetUser && !empty($memberName)) {
            $uStmt = $db->prepare('SELECT id, member_id, name, email FROM users WHERE name = ? OR email = ? LIMIT 1');
            $uStmt->execute([$memberName, $memberName]);
            $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
        }

        if ($targetUser) {
            $userId = (int)$targetUser['id'];
            $memberId = $targetUser['member_id'] ?: ('DA-' . $userId);
        }

        $db->beginTransaction();

        try {
            // 1. Update target payment status
            $db->prepare("
                UPDATE payments 
                SET status = ?, paid_at = NOW(), user_id = ?, member_id = ?
                WHERE id = ?
            ")->execute([$status, $userId ?: null, $memberId ?: null, $dbPaymentId]);

            // Safely sync payment_status column if exists
            try {
                $db->prepare("UPDATE payments SET payment_status = ? WHERE id = ?")->execute([$status, $dbPaymentId]);
            } catch (Exception $e) {}

            if ($status === 'approved') {
                // 2. Activate user account in users table
                if ($userId > 0) {
                    $db->prepare("
                        UPDATE users 
                        SET status = 'active', registration_fee_paid = 1 
                        WHERE id = ?
                    ")->execute([$userId]);
                }
                if (!empty($memberId)) {
                    $db->prepare("
                        UPDATE users 
                        SET status = 'active', registration_fee_paid = 1 
                        WHERE member_id = ?
                    ")->execute([$memberId]);
                }
                if (!empty($memberName)) {
                    $db->prepare("
                        UPDATE users 
                        SET status = 'active', registration_fee_paid = 1 
                        WHERE name = ?
                    ")->execute([$memberName]);
                }

                // 3. Auto-clear any duplicate pending registration payments for this member
                if ($amount == 2000 || $paymentType === 'registration_fee' || str_contains(strtolower($payment['purpose'] ?? ''), 'registration')) {
                    if ($userId > 0) {
                        $db->prepare("
                            UPDATE payments 
                            SET status = 'approved', paid_at = NOW() 
                            WHERE user_id = ? AND status = 'pending' AND amount = 2000
                        ")->execute([$userId]);
                    }
                }

                // 4. Activate referral record
                if ($userId > 0) {
                    try {
                        $db->prepare("
                            UPDATE referrals 
                            SET status = 'active', updated_at = NOW() 
                            WHERE referee_id = ?
                        ")->execute([$userId]);
                    } catch (Exception $e) {}
                }

                // 5. Ensure savings plan exists for the member
                if ($userId > 0) {
                    try {
                        $spCheck = $db->prepare("SELECT id FROM savings_plans WHERE user_id = ? LIMIT 1");
                        $spCheck->execute([$userId]);
                        $existingSp = $spCheck->fetch();

                        if (!$existingSp) {
                            $planIdStr = 'SP-' . substr(md5((string)$userId), 0, 6);
                            $db->prepare("
                                INSERT INTO savings_plans 
                                    (user_id, plan_type, savings_plan_id, total_saved, weeks_completed, status)
                                VALUES 
                                    (?, 'double_up', ?, 0.00, 0, 'active')
                            ")->execute([$userId, $planIdStr]);
                        }
                    } catch (Exception $e) {}
                }

                // 6. If weekly contribution, update savings balance
                if ($userId > 0 && ($paymentType === 'weekly_contribution' || str_contains(strtolower($payment['purpose'] ?? ''), 'contribution') || str_contains(strtolower($payment['purpose'] ?? ''), 'savings'))) {
                    try {
                        $weeksAdded = max(1, (int)($payment['weeks_covered'] ?? 1));
                        $db->prepare("
                            UPDATE savings_plans 
                            SET total_saved = total_saved + ?, weeks_completed = weeks_completed + ?
                            WHERE user_id = ?
                        ")->execute([$amount, $weeksAdded, $userId]);

                        $db->prepare("
                            UPDATE users 
                            SET saved = COALESCE(saved, 0) + ?, weeks = COALESCE(weeks, 0) + ?
                            WHERE id = ?
                        ")->execute([$amount, $weeksAdded, $userId]);
                    } catch (Exception $e) {}
                }

                // 7. Send approval notification
                if ($userId > 0) {
                    try {
                        $db->prepare("
                            INSERT INTO notifications (user_id, member_id, title, message, type)
                            VALUES (?, ?, 'Payment Approved', ?, 'success')
                        ")->execute([
                            $userId,
                            $memberId,
                            "Your payment of ₦" . number_format($amount, 2) . " (Ref: {$payment['payment_ref']}) has been confirmed and approved!"
                        ]);
                    } catch (Exception $e) {}
                }
            }

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Payment ' . $status . ' successfully',
                'paymentId' => $payment['payment_ref'] ?: ('PAY-' . $dbPaymentId)
            ]);
            exit;

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
            exit;
        }
    }

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

