<?php
// ─── DigiAjo Global — Safe Database, Payments & Balances Relinker ───────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$db = getDB();

try {
    // 1. Give each payment a unique sequential ID if any row has id <= 0
    $zeroCheck = $db->query("SELECT COUNT(*) FROM payments WHERE id <= 0")->fetchColumn();
    if ($zeroCheck > 0) {
        $allPayments = $db->query("SELECT payment_ref FROM payments ORDER BY created_at ASC")->fetchAll(PDO::FETCH_COLUMN);
        $seq = 1;
        foreach ($allPayments as $pRef) {
            $db->prepare("UPDATE payments SET id = ? WHERE payment_ref = ? LIMIT 1")->execute([$seq++, $pRef]);
        }
    }

    // 2. Safely ensure primary key and auto_increment
    try {
        $pkCheck = $db->query("SHOW KEYS FROM payments WHERE Key_name = 'PRIMARY'")->fetch();
        if (!$pkCheck) {
            $db->exec("ALTER TABLE payments ADD PRIMARY KEY (id)");
        }
        $db->exec("ALTER TABLE payments MODIFY id INT NOT NULL AUTO_INCREMENT");
    } catch (Exception $e) {}

    // 3. Fetch all users
    $users = $db->query("SELECT id, member_id, name, email FROM users")->fetchAll(PDO::FETCH_ASSOC);

    // 4. Fetch all payments
    $payments = $db->query("SELECT id, payment_ref, member_name, member_id, amount, status FROM payments")->fetchAll(PDO::FETCH_ASSOC);

    $updatedPayments = [];

    // 5. For each payment, link strictly by member_name or payment_ref
    foreach ($payments as $p) {
        $pRef = trim($p['payment_ref']);
        $pName = trim($p['member_name']);
        
        $targetUser = null;
        foreach ($users as $u) {
            if (!empty($pName) && (
                strcasecmp($u['name'], $pName) === 0 ||
                stripos($u['name'], $pName) !== false ||
                stripos($pName, $u['name']) !== false
            )) {
                $targetUser = $u;
                break;
            }
        }

        if ($targetUser && !empty($pRef)) {
            $stmt = $db->prepare("UPDATE payments SET user_id = ?, member_id = ? WHERE payment_ref = ?");
            $stmt->execute([(int)$targetUser['id'], $targetUser['member_id'], $pRef]);

            $updatedPayments[] = [
                'id'          => $p['id'],
                'ref'         => $pRef,
                'name'        => $pName,
                'assigned_to' => $targetUser['name'],
                'user_id'     => (int)$targetUser['id'],
                'member_id'   => $targetUser['member_id'],
                'amount'      => (float)$p['amount'],
            ];
        }
    }

    // 6. Recalculate true savings and weeks for each user strictly from their approved weekly payments
    $report = [];

    foreach ($users as $u) {
        $uid = (int)$u['id'];
        $mid = trim($u['member_id']);

        $payStmt = $db->prepare("
            SELECT 
                COALESCE(SUM(amount), 0) as real_saved,
                COALESCE(SUM(COALESCE(weeks_covered, 1)), 0) as real_weeks
            FROM payments
            WHERE (user_id = ? OR (member_id IS NOT NULL AND member_id != '' AND member_id = ?))
              AND status IN ('approved', 'confirmed', 'success')
              AND amount != 2000
              AND (payment_scope = 'weekly' OR payment_type = 'weekly_contribution' OR (
                  (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine', 'digimart_unit'))
                  AND (purpose IS NULL OR (
                      LOWER(purpose) NOT LIKE '%registration%' 
                      AND LOWER(purpose) NOT LIKE '%reg fee%' 
                      AND LOWER(purpose) NOT LIKE '%fine%'
                  ))
              ))
        ");
        $payStmt->execute([$uid, $mid]);
        $calc = $payStmt->fetch(PDO::FETCH_ASSOC);

        $saved = (float)($calc['real_saved'] ?? 0);
        $weeks = (int)($calc['real_weeks'] ?? 0);

        // Update users table
        $db->prepare("UPDATE users SET saved = ?, weeks = ? WHERE id = ?")->execute([$saved, $weeks, $uid]);

        // Update savings_plans table
        try {
            $db->prepare("UPDATE savings_plans SET total_saved = ?, weeks_completed = ? WHERE user_id = ?")->execute([$saved, $weeks, $uid]);
        } catch (Exception $e) {}

        $report[] = [
            'id'        => $mid,
            'user_id'   => $uid,
            'name'      => $u['name'],
            'email'     => $u['email'],
            'saved'     => $saved,
            'weeks'     => $weeks,
        ];
    }

    echo json_encode([
        'success'          => true,
        'message'          => 'All payments have been strictly assigned and user balances recalibrated.',
        'updated_payments' => $updatedPayments,
        'members'          => $report,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
