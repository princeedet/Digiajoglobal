<?php
// ─── DigiAjo Global — Admin Payments Management & Approval Endpoint ─────────
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/email.php';
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
                COALESCE(NULLIF(p.member_name, ''), u.name, 'Member') as member,
                COALESCE(NULLIF(p.member_id, ''), u.member_id, CONCAT('DA-', p.user_id)) as memberId,
                p.amount,
                DATE_FORMAT(COALESCE(p.created_at, NOW()), '%d %b %Y, %h:%i %p') as date,
                COALESCE(NULLIF(p.payment_ref, ''), CONCAT('PAY-', p.id)) as reference,
                COALESCE(p.channel, 'bank_transfer') as channel,
                COALESCE(p.status, 'pending') as status,
                COALESCE(p.purpose, 'Registration Fee') as purpose,
                COALESCE(p.payment_type, 'registration_fee') as payment_type
            FROM payments p
            LEFT JOIN users u ON (p.user_id IS NOT NULL AND p.user_id > 0 AND u.id = p.user_id)
            ORDER BY p.created_at DESC, p.id DESC
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
        if (!empty($memberId)) {
            $uStmt = $db->prepare('SELECT id, member_id, name, email FROM users WHERE member_id = ? LIMIT 1');
            $uStmt->execute([$memberId]);
            $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
        }
        if (!$targetUser && $userId > 0) {
            $uStmt = $db->prepare('SELECT id, member_id, name, email FROM users WHERE id = ? LIMIT 1');
            $uStmt->execute([$userId]);
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
                // 2. Activate user account in users table (only the resolved user)
                if ($userId > 0) {
                    $db->prepare("
                        UPDATE users 
                        SET status = 'active', registration_fee_paid = 1 
                        WHERE id = ?
                    ")->execute([$userId]);
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
                if ($userId > 0 && $amount != 2000 && ($paymentType === 'weekly_contribution' || $paymentType === 'weekly' || str_contains(strtolower($payment['purpose'] ?? ''), 'contribution') || str_contains(strtolower($payment['purpose'] ?? ''), 'savings'))) {
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

                // 7. Send approval email & notification
                try {
                    $userStmt = $db->prepare("SELECT id, name, email, member_id, phone, saved, weeks FROM users WHERE id = ? OR member_id = ? LIMIT 1");
                    $userStmt->execute([$userId, $memberId ?: '']);
                    $userData = $userStmt->fetch(PDO::FETCH_ASSOC);

                    $recipientEmail = !empty($userData['email']) ? $userData['email'] : ($payment['member_email'] ?? '');
                    $recipientName = !empty($userData['name']) ? $userData['name'] : ($memberName ?: 'Valued Member');
                    $recipientMemberId = !empty($userData['member_id']) ? $userData['member_id'] : ($memberId ?: '');
                    $curSaved = (float)($userData['saved'] ?? 0);
                    $curWeeks = (int)($userData['weeks'] ?? 0);
                    $payRef = $payment['payment_ref'] ?: ('PAY-' . $dbPaymentId);

                    $notifTitle = "Savings Payment Approved!";
                    $notifMsg = "Your contribution of ₦" . number_format($amount, 2) . " (Ref: {$payRef}) has been approved! Total saved: ₦" . number_format($curSaved, 2) . " (Week {$curWeeks} of 50).";

                    insert_notification($db, [
                        'user_id'     => $userId,
                        'member_id'   => $recipientMemberId,
                        'target_user' => $userId,
                        'audience'    => 'specific_user',
                        'title'       => $notifTitle,
                        'body'        => $notifMsg,
                        'message'     => $notifMsg,
                        'kind'        => 'success',
                        'type'        => 'success',
                        'sent_at'     => date('Y-m-d H:i:s'),
                    ]);

                    // Send approval confirmation email
                    if (!empty($recipientEmail)) {
                        $emailSubject = "Payment Approved — ₦" . number_format($amount, 2) . " Confirmed ({$payRef})";
                        $isReg = ($amount == 2000 || $paymentType === 'registration_fee' || str_contains(strtolower($payment['purpose'] ?? ''), 'registration'));
                        $purposeText = $isReg ? 'Registration Fee & Account Activation' : ($payment['purpose'] ?? 'Weekly Savings Contribution');

                        $emailBody = "
                            <p>Dear <strong>{$recipientName}</strong>,</p>
                            <p>Great news! Your payment on <strong>DigiAjo Global</strong> has been confirmed and <strong style='color:#164f29;'>Approved</strong>.</p>
                            <table style='width:100%; border-collapse:collapse; margin:20px 0;'>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Member ID:</td><td style='padding:8px 0; font-weight:bold;'>{$recipientMemberId}</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Payment Reference:</td><td style='padding:8px 0; font-weight:bold; color:#164f29;'>{$payRef}</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Amount Confirmed:</td><td style='padding:8px 0; font-weight:bold; font-size:18px; color:#164f29;'>₦" . number_format($amount, 2) . "</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Purpose:</td><td style='padding:8px 0; font-weight:bold;'>{$purposeText}</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Total Saved:</td><td style='padding:8px 0; font-weight:bold; color:#164f29;'>₦" . number_format($curSaved, 2) . "</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Weeks Completed:</td><td style='padding:8px 0; font-weight:bold;'>Week {$curWeeks} of 50</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Status:</td><td style='padding:8px 0; font-weight:bold; color:#164f29;'>Confirmed / Approved</td></tr>
                            </table>
                            <p>Your dashboard and savings timeline have been updated automatically.</p>
                            <p><a href='https://digiajoglobal.com/user' style='display:inline-block; background-color:#164f29; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;'>View Your Dashboard</a></p>
                        ";
                        send_email($recipientEmail, $emailSubject, $emailBody);
                    }
                } catch (Exception $e) {}
            } elseif ($status === 'rejected' || $status === 'declined') {
                // Handle declined payment notification & email
                try {
                    $userStmt = $db->prepare("SELECT id, name, email, member_id FROM users WHERE id = ? OR member_id = ? LIMIT 1");
                    $userStmt->execute([$userId, $memberId ?: '']);
                    $userData = $userStmt->fetch(PDO::FETCH_ASSOC);

                    $recipientEmail = !empty($userData['email']) ? $userData['email'] : ($payment['member_email'] ?? '');
                    $recipientName = !empty($userData['name']) ? $userData['name'] : ($memberName ?: 'Valued Member');
                    $recipientMemberId = !empty($userData['member_id']) ? $userData['member_id'] : ($memberId ?: '');
                    $payRef = $payment['payment_ref'] ?: ('PAY-' . $dbPaymentId);

                    $notifTitle = "Payment Verification Declined";
                    $notifMsg = "Your payment submission of ₦" . number_format($amount, 2) . " (Ref: {$payRef}) was declined. Please verify your transaction receipt or re-submit.";

                    insert_notification($db, [
                        'user_id'     => $userId,
                        'member_id'   => $recipientMemberId,
                        'target_user' => $userId,
                        'audience'    => 'specific_user',
                        'title'       => $notifTitle,
                        'body'        => $notifMsg,
                        'message'     => $notifMsg,
                        'kind'        => 'error',
                        'type'        => 'error',
                        'sent_at'     => date('Y-m-d H:i:s'),
                    ]);

                    if (!empty($recipientEmail)) {
                        $emailSubject = "Payment Update — Verification Declined ({$payRef})";
                        $emailBody = "
                            <p>Dear <strong>{$recipientName}</strong>,</p>
                            <p>We are writing to inform you that your payment transfer submission on <strong>DigiAjo Global</strong> could not be verified by the admin team.</p>
                            <table style='width:100%; border-collapse:collapse; margin:20px 0;'>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Member ID:</td><td style='padding:8px 0; font-weight:bold;'>{$recipientMemberId}</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Payment Reference:</td><td style='padding:8px 0; font-weight:bold; color:#b91c1c;'>{$payRef}</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Amount:</td><td style='padding:8px 0; font-weight:bold;'>₦" . number_format($amount, 2) . "</td></tr>
                                <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Status:</td><td style='padding:8px 0; font-weight:bold; color:#b91c1c;'>Declined</td></tr>
                            </table>
                            <p>If you have made this transfer, please ensure your payment receipt is clear and re-submit via your payment portal or contact support.</p>
                            <p><a href='https://digiajoglobal.com/user/payments' style='display:inline-block; background-color:#164f29; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;'>Go to Payment Portal</a></p>
                        ";
                        send_email($recipientEmail, $emailSubject, $emailBody);
                    }
                } catch (Exception $e) {}
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

