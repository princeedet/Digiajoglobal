<?php
// ─── DigiAjo Global — Database Savings Inspector & Recalibrator ──────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$db = getDB();

try {
    // 0. If force_zero or clear_phantom is requested, zero out non-Prince Edet users immediately
    if (isset($_GET['clear_phantom']) || isset($_GET['force_zero'])) {
        $db->exec("UPDATE users SET saved = 0.00, weeks = 0 WHERE name NOT LIKE '%Prince Edet%' AND email != 'princeedet190@gmail.com'");
        $db->exec("UPDATE savings_plans SET total_saved = 0.00, weeks_completed = 0 WHERE user_id NOT IN (SELECT id FROM users WHERE name LIKE '%Prince Edet%' OR email = 'princeedet190@gmail.com')");
    }

    // 1. Fetch all raw payments to inspect what is in the table
    $allPayments = $db->query("
        SELECT id, user_id, member_id, member_name, amount, channel, payment_type, payment_scope, purpose, status, weeks_covered, created_at 
        FROM payments
    ")->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch all users
    $users = $db->query("SELECT id, member_id, name, email, saved, weeks FROM users")->fetchAll(PDO::FETCH_ASSOC);

    $results = [];

    foreach ($users as $u) {
        $userId   = (int)$u['id'];
        $memberId = trim($u['member_id'] ?? '');

        // Match payments strictly by user_id OR member_id
        $matchedPayments = array_filter($allPayments, function($p) use ($userId, $memberId) {
            $pUserId   = (int)($p['user_id'] ?? 0);
            $pMemberId = trim($p['member_id'] ?? '');
            $status    = strtolower(trim($p['status'] ?? ''));

            $isUserMatch = ($pUserId > 0 && $pUserId === $userId) || 
                           (!empty($memberId) && !empty($pMemberId) && $memberId === $pMemberId);

            $isApproved  = in_array($status, ['approved', 'confirmed', 'success'], true);
            $isWeekly    = ($p['payment_scope'] ?? '') === 'weekly' || 
                           ($p['payment_type'] ?? '') === 'weekly_contribution' ||
                           (stripos($p['purpose'] ?? '', 'Savings contribution') !== false);
            $isRegFee    = (float)$p['amount'] == 2000 || 
                           in_array(strtolower($p['payment_type'] ?? ''), ['registration', 'registration_fee', 'reg', 'fee']) ||
                           stripos($p['purpose'] ?? '', 'registration') !== false;

            return $isUserMatch && $isApproved && $isWeekly && !$isRegFee;
        });

        $trueSaved = 0.0;
        $trueWeeks = 0;

        foreach ($matchedPayments as $mp) {
            $trueSaved += (float)$mp['amount'];
            $trueWeeks += max(1, (int)($mp['weeks_covered'] ?? 1));
        }

        // Update user record with true calculated values
        $updateStmt = $db->prepare("UPDATE users SET saved = ?, weeks = ? WHERE id = ?");
        $updateStmt->execute([$trueSaved, $trueWeeks, $userId]);

        // Update savings_plans table
        try {
            $db->prepare("UPDATE savings_plans SET total_saved = ?, weeks_completed = ? WHERE user_id = ?")->execute([$trueSaved, $trueWeeks, $userId]);
        } catch (Exception $e) {}

        $results[] = [
            'id'               => $u['member_id'] ?: 'DA-' . $userId,
            'name'             => $u['name'],
            'previous_saved'   => (float)$u['saved'],
            'new_saved'        => $trueSaved,
            'new_weeks'        => $trueWeeks,
            'matched_payments' => array_values($matchedPayments),
        ];
    }

    echo json_encode([
        'success'         => true,
        'message'         => 'All member savings balances have been strictly audited and recalibrated.',
        'all_payments'    => $allPayments,
        'updated_members' => $results,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
