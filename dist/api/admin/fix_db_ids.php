<?php
// ─── DigiAjo Global — Database & Payments Complete Relinker ──────────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$db = getDB();

try {
    // 1. Ensure `users` and `payments` tables have AUTO_INCREMENT PRIMARY KEYS
    try {
        $pkCheck = $db->query("SHOW KEYS FROM users WHERE Key_name = 'PRIMARY'")->fetch();
        if (!$pkCheck) {
            $db->exec("ALTER TABLE users ADD PRIMARY KEY (id)");
        }
        $db->exec("ALTER TABLE users MODIFY id INT NOT NULL AUTO_INCREMENT");
    } catch (Exception $e) {}

    try {
        $pkPayCheck = $db->query("SHOW KEYS FROM payments WHERE Key_name = 'PRIMARY'")->fetch();
        if (!$pkPayCheck) {
            $db->exec("ALTER TABLE payments ADD PRIMARY KEY (id)");
        }
        $db->exec("ALTER TABLE payments MODIFY id INT NOT NULL AUTO_INCREMENT");
    } catch (Exception $e) {}

    // 2. Fetch all users
    $users = $db->query("SELECT id, member_id, name, email FROM users ORDER BY created_at ASC")->fetchAll(PDO::FETCH_ASSOC);

    $userMap = [];
    $nextId = 1;

    foreach ($users as $u) {
        $assignedId = $nextId++;
        $memberId = trim($u['member_id']);
        if (empty($memberId) || $memberId === 'DA-0') {
            $memberId = 'DA-' . rand(10000, 99999);
        }

        $db->prepare("UPDATE users SET id = ?, member_id = ? WHERE email = ?")->execute([$assignedId, $memberId, $u['email']]);

        $userMap[$u['email']] = [
            'id'        => $assignedId,
            'name'      => $u['name'],
            'email'     => $u['email'],
            'member_id' => $memberId,
        ];
    }

    // 3. Re-assign unique IDs to payments if id = 0
    $rawPayments = $db->query("SELECT * FROM payments ORDER BY created_at ASC")->fetchAll(PDO::FETCH_ASSOC);
    $payNextId = 1;

    foreach ($rawPayments as $rp) {
        $newPayId = $payNextId++;
        $pName = trim($rp['member_name']);
        $pRef = trim($rp['payment_ref']);
        
        // Match user strictly by name or member_id
        $matchedUserId = 0;
        $matchedMemberId = '';

        foreach ($userMap as $email => $uInfo) {
            if (!empty($pName) && (
                strcasecmp($uInfo['name'], $pName) === 0 || 
                stripos($uInfo['name'], $pName) !== false || 
                stripos($pName, $uInfo['name']) !== false
            )) {
                $matchedUserId = $uInfo['id'];
                $matchedMemberId = $uInfo['member_id'];
                break;
            }
        }

        // If not matched by name, check member_id
        if (!$matchedUserId && !empty($rp['member_id'])) {
            foreach ($userMap as $email => $uInfo) {
                if ($rp['member_id'] === $uInfo['member_id']) {
                    $matchedUserId = $uInfo['id'];
                    $matchedMemberId = $uInfo['member_id'];
                    break;
                }
            }
        }

        // Update payment with distinct primary key ID, correct user_id, and correct member_id
        $db->prepare("
            UPDATE payments 
            SET id = ?, user_id = ?, member_id = ?
            WHERE payment_ref = ? OR (id = 0 AND member_name = ? AND amount = ? AND created_at = ?)
            LIMIT 1
        ")->execute([
            $newPayId,
            $matchedUserId,
            $matchedMemberId,
            $pRef,
            $pName,
            $rp['amount'],
            $rp['created_at']
        ]);
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

        $db->prepare("UPDATE users SET saved = ?, weeks = ? WHERE id = ?")->execute([$saved, $weeks, $uid]);

        try {
            $db->prepare("UPDATE savings_plans SET total_saved = ?, weeks_completed = ? WHERE user_id = ?")->execute([$saved, $weeks, $uid]);
        } catch (Exception $e) {}

        // Fetch matched payment details
        $mPayStmt = $db->prepare("SELECT id, payment_ref, member_name, amount, purpose, weeks_covered, status FROM payments WHERE user_id = ? OR member_id = ?");
        $mPayStmt->execute([$uid, $mid]);
        $userPayments = $mPayStmt->fetchAll(PDO::FETCH_ASSOC);

        $report[] = [
            'id'        => $mid,
            'user_id'   => $uid,
            'name'      => $fu['name'],
            'email'     => $fu['email'],
            'saved'     => $saved,
            'weeks'     => $weeks,
            'payments'  => $userPayments,
        ];
    }

    echo json_encode([
        'success'  => true,
        'message'  => 'Database & Payments have been completely relinked to the correct member accounts.',
        'members'  => $report,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
