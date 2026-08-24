<?php
// ─── DigiAjo Global — Safe Database & Payments Relinker ──────────────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$db = getDB();

try {
    // 1. Fetch all users
    $users = $db->query("SELECT id, member_id, name, email FROM users")->fetchAll(PDO::FETCH_ASSOC);

    // 2. Relink each payment to the matching user by Name or Email or Member ID
    foreach ($users as $u) {
        $uid  = (int)$u['id'];
        $mid  = trim($u['member_id']);
        $name = trim($u['name']);
        $email = trim($u['email']);

        // Update payments matching this user's name or email
        $updatePay = $db->prepare("
            UPDATE payments 
            SET user_id = ?, member_id = ?
            WHERE (member_name = ? OR member_name LIKE ? OR member_email = ? OR member_id = ?)
        ");
        $updatePay->execute([$uid, $mid, $name, '%' . $name . '%', $email, $mid]);
    }

    // 3. Recalculate true savings and weeks for each user strictly from their payments
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

        // Fetch matched payments for report
        $mPayStmt = $db->prepare("SELECT id, payment_ref, member_name, amount, purpose, weeks_covered, status FROM payments WHERE user_id = ? OR member_id = ?");
        $mPayStmt->execute([$uid, $mid]);
        $userPayments = $mPayStmt->fetchAll(PDO::FETCH_ASSOC);

        $report[] = [
            'id'        => $mid,
            'user_id'   => $uid,
            'name'      => $u['name'],
            'email'     => $u['email'],
            'saved'     => $saved,
            'weeks'     => $weeks,
            'payments'  => $userPayments,
        ];
    }

    echo json_encode([
        'success'  => true,
        'message'  => 'All payments have been safely relinked and user savings have been recalibrated.',
        'members'  => $report,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
