<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            payment_ref VARCHAR(100),
            amount DECIMAL(12,2) NOT NULL,
            channel VARCHAR(50),
            status VARCHAR(50) DEFAULT 'pending',
            purpose VARCHAR(255),
            member_name VARCHAR(100),
            member_id VARCHAR(50),
            paid_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    if ($method === 'GET') {
        $stmt = $db->query("
            SELECT 
                p.id as _dbId,
                p.payment_ref as id,
                p.member_name as member,
                p.member_id as memberId,
                p.amount,
                DATE_FORMAT(p.created_at, '%d %b %Y, %h:%i %p') as date,
                p.payment_ref as reference,
                p.channel,
                p.status,
                p.purpose,
                p.payment_type
            FROM payments p
            ORDER BY p.created_at DESC
        ");
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Map channels and build a human-readable purpose label
        foreach ($payments as &$p) {
            $p['amount'] = (float)$p['amount'];

            // Format channel
            if ($p['channel'] === 'bank_transfer') {
                $p['channel'] = 'Bank transfer';
            } else if ($p['channel'] === 'card') {
                $p['channel'] = 'Card';
            } else if ($p['channel'] === 'ussd') {
                $p['channel'] = 'USSD';
            }

            // Ensure purpose always has a readable label
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

        echo json_encode([
            'success' => true,
            'payments' => $payments
        ]);
        exit;
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';
        $id = $data['id'] ?? '';

        if (!$id || !in_array($action, ['approve', 'reject'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid parameters']);
            exit;
        }

        $status = $action === 'approve' ? 'approved' : 'rejected';

        $db->beginTransaction();

        $stmt = $db->prepare("SELECT * FROM payments WHERE payment_ref = ? FOR UPDATE");
        $stmt->execute([$id]);
        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$payment) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Payment not found']);
            exit;
        }

        if ($payment['status'] !== 'pending') {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Payment is already processed']);
            exit;
        }

        // Update payment status
        $stmt = $db->prepare("UPDATE payments SET status = ?, payment_status = ?, paid_at = NOW() WHERE payment_ref = ?");
        $stmt->execute([$status, $status, $id]);

        if ($status === 'approved') {
            $userId = $payment['user_id'];
            $amount = (float)$payment['amount'];
            $paymentType = $payment['payment_type'];

            // Activate user if still pending verification
            $stmt = $db->prepare("UPDATE users SET status = 'active' WHERE id = ? AND status = 'pending_verification'");
            $stmt->execute([$userId]);

            // ── Activate referral when registration fee is approved ───────────
            if ($paymentType === 'registration_fee') {
                // Update referral record from pending → active
                $db->prepare("
                    UPDATE referrals SET status = 'active', updated_at = NOW()
                    WHERE referee_id = ? AND status = 'pending'
                ")->execute([$userId]);

                // Notify the referrer
                try {
                    $refStmt = $db->prepare("
                        SELECT r.referrer_id, u.member_id as referrer_member_id, u.name as referrer_name,
                               referee.name as referee_name
                        FROM referrals r
                        JOIN users u ON u.id = r.referrer_id
                        JOIN users referee ON referee.id = r.referee_id
                        WHERE r.referee_id = ?
                        LIMIT 1
                    ");
                    $refStmt->execute([$userId]);
                    $refRow = $refStmt->fetch(PDO::FETCH_ASSOC);
                    if ($refRow) {
                        $db->prepare("
                            INSERT INTO notifications (user_id, member_id, title, message, type)
                            VALUES (?, ?, 'Referral Activated!', ?, 'success')
                        ")->execute([
                            $refRow['referrer_id'],
                            $refRow['referrer_member_id'],
                            "Great news! {$refRow['referee_name']} joined DigiAjo using your referral link. Your ₦1,000 commission is now active!"
                        ]);
                    }
                } catch (PDOException $e) { /* non-fatal */ }
            }

            // ── Handle weekly contribution ────────────────────────────────────
            if ($paymentType === 'weekly_contribution') {
                $weeksAdded = max(1, (int)($payment['weeks_covered'] ?? 1));
                if ($weeksAdded <= 1 && $amount >= 1300 && $amount < 50000) {
                    $weeksAdded = (int)round($amount / 1300);
                }
                if ($weeksAdded <= 0) $weeksAdded = 1;

                // Check if a savings plan exists
                $spStmt = $db->prepare("SELECT id FROM savings_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
                $spStmt->execute([$userId]);
                $sp = $spStmt->fetch(PDO::FETCH_ASSOC);

                if ($sp) {
                    // Update existing plan with correct weeks count
                    $db->prepare("
                        UPDATE savings_plans
                        SET total_saved = total_saved + ?,
                            weeks_completed = weeks_completed + ?,
                            updated_at = NOW()
                        WHERE id = ?
                    ")->execute([$amount, $weeksAdded, $sp['id']]);
                } else {
                    // No plan exists — create one and record contribution weeks
                    $db->prepare("
                        INSERT INTO savings_plans
                            (user_id, plan_type, weekly_amount, total_weeks, weeks_completed,
                             total_saved, start_date, status)
                        VALUES (?, 'double_up', 1300.00, 50, ?, ?, CURDATE(), 'active')
                    ")->execute([$userId, $weeksAdded, $amount]);
                }
            }

            // ── Handle registration fee (bank transfer) ───────────────────────
            if ($paymentType === 'registration_fee') {
                // Determine plan type from user record
                $userStmt = $db->prepare("SELECT plan_type FROM users WHERE id = ? LIMIT 1");
                $userStmt->execute([$userId]);
                $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
                $planType = ($userRow && $userRow['plan_type']) ? $userRow['plan_type'] : 'double_up';

                // Create savings plan if it doesn't exist
                $spStmt = $db->prepare("SELECT id FROM savings_plans WHERE user_id = ? LIMIT 1");
                $spStmt->execute([$userId]);
                if (!$spStmt->fetch()) {
                    $db->prepare("
                        INSERT INTO savings_plans
                            (user_id, plan_type, weekly_amount, total_weeks, weeks_completed,
                             total_saved, start_date, status)
                        VALUES (?, ?, 1300.00, 50, 0, 0.00, CURDATE(), 'active')
                    ")->execute([$userId, $planType]);
                }
            }

            // Send notification to user about payment approval
            try {
                $db->prepare("
                    INSERT INTO notifications (user_id, member_id, title, message, type)
                    SELECT u.id, u.member_id,
                        'Payment Approved',
                        CONCAT('Your payment of ₦', FORMAT(?, 2), ' (Ref: ?) has been confirmed.'),
                        'success'
                    FROM users u WHERE u.id = ?
                ")->execute([$amount, $id, $userId]);
            } catch (PDOException $e) { /* non-fatal */ }
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Payment ' . $status . ' successfully'
        ]);
        exit;
    }

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
