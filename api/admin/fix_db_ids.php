<?php
// ─── DigiAjo Global — Database Primary Key & User-ID Auto-Fixer ──────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$db = getDB();

try {
    // 1. Ensure `users` table has an AUTO_INCREMENT PRIMARY KEY
    try {
        $pkCheck = $db->query("SHOW KEYS FROM users WHERE Key_name = 'PRIMARY'")->fetch();
        if (!$pkCheck) {
            $db->exec("ALTER TABLE users ADD PRIMARY KEY (id)");
        }
        $db->exec("ALTER TABLE users MODIFY id INT NOT NULL AUTO_INCREMENT");
    } catch (Exception $e) {}

    // 2. Fetch all users
    $users = $db->query("SELECT id, member_id, name, email FROM users ORDER BY created_at ASC")->fetchAll(PDO::FETCH_ASSOC);

    // If users share id = 0 or duplicate IDs, assign unique sequential IDs
    $userMap = [];
    $nextId = 1;

    foreach ($users as $idx => $u) {
        $assignedId = $nextId++;
        $memberId = trim($u['member_id']);
        if (empty($memberId) || $memberId === 'DA-0') {
            $memberId = 'DA-' . rand(10000, 99999);
        }

        // Update user row with unique ID
        $db->prepare("UPDATE users SET id = ?, member_id = ? WHERE email = ?")->execute([$assignedId, $memberId, $u['email']]);

        $userMap[$u['email']] = [
            'id'        => $assignedId,
            'name'      => $u['name'],
            'email'     => $u['email'],
            'member_id' => $memberId,
        ];
    }

    // 3. Fix Payments: link each payment strictly to the correct user by email/name/member_id
    $payments = $db->query("SELECT id, user_id, member_id, member_name, amount, purpose, payment_type, status FROM payments")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($payments as $p) {
        $pId = (int)$p['id'];
        $pName = trim($p['member_name']);
        $matchedUserId = 0;
        $matchedMemberId = '';

        foreach ($userMap as $email => $uInfo) {
            if (strcasecmp($uInfo['name'], $pName) === 0 || 
                (!empty($p['member_id']) && $p['member_id'] === $uInfo['member_id'])) {
                $matchedUserId = $uInfo['id'];
                $matchedMemberId = $uInfo['member_id'];
                break;
            }
        }

        if ($matchedUserId > 0) {
            $db->prepare("UPDATE payments SET user_id = ?, member_id = ? WHERE id = ?")->execute([$matchedUserId, $matchedMemberId, $pId]);
        }
    }

    // 4. Recalculate true savings for each user
    $finalUsers = $db->query("SELECT id, member_id, name, email FROM users")->fetchAll(PDO::FETCH_ASSOC);
    $report = [];

    foreach ($finalUsers as $fu) {
        $uid = (int)$fu['id'];
        $mid = $fu['member_id'];

        $payStmt = $db->prepare("
            SELECT 
                COALESCE(SUM(amount), 0) as real_saved,
                COALESCE(SUM(COALESCE(weeks_covered, 1)), 0) as real_weeks
            FROM payments
            WHERE user_id = ? 
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
        $payStmt->execute([$uid]);
        $calc = $payStmt->fetch(PDO::FETCH_ASSOC);

        $saved = (float)($calc['real_saved'] ?? 0);
        $weeks = (int)($calc['real_weeks'] ?? 0);

        $db->prepare("UPDATE users SET saved = ?, weeks = ? WHERE id = ?")->execute([$saved, $weeks, $uid]);

        $report[] = [
            'id'        => $mid,
            'user_id'   => $uid,
            'name'      => $fu['name'],
            'email'     => $fu['email'],
            'saved'     => $saved,
            'weeks'     => $weeks,
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => 'Database Primary Keys, User IDs, and Savings have been completely normalized and fixed.',
        'users'   => $report,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
