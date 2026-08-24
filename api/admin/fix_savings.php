<?php
// ─── DigiAjo Global — Database Savings Balance Recalibrator ──────────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$db = getDB();

try {
    // 1. Fetch all users
    $users = $db->query("SELECT id, member_id, name, email, saved, weeks FROM users")->fetchAll(PDO::FETCH_ASSOC);

    $results = [];

    foreach ($users as $u) {
        $userId   = (int)$u['id'];
        $memberId = trim($u['member_id'] ?? '');

        // Calculate true approved weekly contributions
        $stmt = $db->prepare("
            SELECT 
                COALESCE(SUM(amount), 0) as true_saved,
                COALESCE(SUM(COALESCE(weeks_covered, 1)), 0) as true_weeks
            FROM payments
            WHERE (user_id = ? OR (member_id IS NOT NULL AND member_id != '' AND member_id = ?))
              AND status IN ('approved', 'confirmed', 'success')
              AND amount != 2000
              AND (payment_scope = 'weekly' OR (
                  (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine', 'digimart_unit'))
                  AND (purpose IS NULL OR (
                      LOWER(purpose) NOT LIKE '%registration%' 
                      AND LOWER(purpose) NOT LIKE '%reg fee%' 
                      AND LOWER(purpose) NOT LIKE '%one-time%'
                      AND LOWER(purpose) NOT LIKE '%fine%'
                      AND LOWER(purpose) NOT LIKE '%digimart%'
                  ))
              ))
        ");
        $stmt->execute([$userId, $memberId]);
        $calc = $stmt->fetch(PDO::FETCH_ASSOC);

        $trueSaved = (float)($calc['true_saved'] ?? 0);
        $trueWeeks = (int)($calc['true_weeks'] ?? 0);

        // Update user record with true calculated values
        $updateStmt = $db->prepare("UPDATE users SET saved = ?, weeks = ? WHERE id = ?");
        $updateStmt->execute([$trueSaved, $trueWeeks, $userId]);

        // Update savings_plans table
        try {
            $db->prepare("UPDATE savings_plans SET total_saved = ?, weeks_completed = ? WHERE user_id = ?")->execute([$trueSaved, $trueWeeks, $userId]);
        } catch (Exception $e) {}

        $results[] = [
            'id'             => $u['member_id'] ?: 'DA-' . $userId,
            'name'           => $u['name'],
            'previous_saved' => (float)$u['saved'],
            'new_saved'      => $trueSaved,
            'new_weeks'      => $trueWeeks,
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => 'All member savings balances have been verified and recalibrated strictly from approved weekly payments.',
        'updated_members' => $results,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
