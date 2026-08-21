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
            LEFT JOIN users u ON u.id = p.user_id
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
        $id = trim($data['id'] ?? '');

        if (!$id || !in_array($action, ['approve', 'reject'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid parameters']);
            exit;
        }

        $status = $action === 'approve' ? 'approved' : 'rejected';

        // Ensure tables and columns exist
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

        // Match payment by payment_ref or numeric id or formatted PAY-id
        $numericId = is_numeric($id) ? (int)$id : 0;
        $stmt = $db->prepare("
            SELECT * FROM payments 
            WHERE payment_ref = ? OR CONCAT('PAY-', id) = ? OR id = ?
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
        $userId      = (int)$payment['user_id'];
        $memberId    = $payment['member_id'];
        $amount      = (float)$payment['amount'];
        $paymentType = $payment['payment_type'] ?? 'registration_fee';

        $db->beginTransaction();

        try {
            // 1. Update payment status
            $db->prepare("
                UPDATE payments 
                SET status = ?, payment_status = ?, paid_at = NOW() 
                WHERE id = ?
            ")->execute([$status, $status, $dbPaymentId]);

            if ($status === 'approved') {
                // 2. Activate user and mark registration fee paid
                $db->prepare("
                    UPDATE users 
                    SET status = 'active', registration_fee_paid = 1 
                    WHERE id = ? OR member_id = ?
                ")->execute([$userId, $memberId]);

                // 3. Activate referral record
                try {
                    $db->prepare("
                        UPDATE referrals 
                        SET status = 'active', updated_at = NOW() 
                        WHERE (referee_id = ? OR referee_id = (SELECT id FROM users WHERE member_id = ? LIMIT 1))
                    ")->execute([$userId, $memberId]);
                } catch (Exception $e) {}

                // 4. Ensure savings plan exists for the member
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
                                (?, 'Double Up', ?, 0.00, 0, 'active')
                        ")->execute([$userId, $planIdStr]);
                    }
                } catch (Exception $e) {}

                // 5. If weekly contribution, update savings balance
                if ($paymentType === 'weekly_contribution' || str_contains(strtolower($payment['purpose'] ?? ''), 'contribution')) {
                    try {
                        $weeksAdded = max(1, (int)($payment['weeks_covered'] ?? 1));
                        $db->prepare("
                            UPDATE savings_plans 
                            SET total_saved = total_saved + ?, weeks_completed = weeks_completed + ?
                            WHERE user_id = ?
                        ")->execute([$amount, $weeksAdded, $userId]);
                    } catch (Exception $e) {}
                }

                // 6. Send approval notification
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
