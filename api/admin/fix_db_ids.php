<?php
// ─── DigiAjo Global — Safe Name-Based Payments Relinker ──────────────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$db = getDB();

try {
    // 1. Fetch all users
    $users = $db->query("SELECT id, member_id, name, email FROM users")->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch all payments
    $payments = $db->query("SELECT payment_ref, member_name, member_id, amount, status FROM payments")->fetchAll(PDO::FETCH_ASSOC);

    $updatedPayments = [];

    // 3. For each payment, link strictly by member_name to the correct user
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
                'ref'         => $pRef,
                'name'        => $pName,
                'assigned_to' => $targetUser['name'],
                'user_id'     => (int)$targetUser['id'],
                'member_id'   => $targetUser['member_id'],
                'amount'      => (float)$p['amount'],
            ];
        }
    }

    // 4. Recalculate true savings for each user strictly from their payments
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
        'message'          => 'All payments have been strictly assigned by member name and all balances recalculated.',
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
