<?php
// ─── DigiAjo Global — Database Schema Sync & Migration ───────────────────────
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/email.php';
$db = getDB();

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

try {
    // ── GET: list all members ─────────────────────────────────────────────────
    if ($method === 'GET') {
        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS savings_plans (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    plan_type VARCHAR(50) NOT NULL DEFAULT 'double_up',
                    savings_plan_id VARCHAR(50) NOT NULL DEFAULT 'SP-1',
                    total_saved DECIMAL(12,2) DEFAULT 0,
                    weeks_completed INT DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'active',
                    start_date DATE NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS bank_accounts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    bank_name VARCHAR(100) NOT NULL,
                    account_number VARCHAR(20) NOT NULL,
                    account_name VARCHAR(100) NOT NULL,
                    is_primary TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS referrals (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    referrer_id INT NOT NULL,
                    referee_id INT NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS fines (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    member_id VARCHAR(50) NOT NULL,
                    amount DECIMAL(10,2) NOT NULL DEFAULT 500.00,
                    week_number INT NULL,
                    missed_period VARCHAR(100) NULL,
                    reason VARCHAR(255) NULL,
                    status VARCHAR(20) DEFAULT 'unpaid',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS payouts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    payout_ref VARCHAR(100) NOT NULL UNIQUE,
                    user_id INT NOT NULL,
                    amount DECIMAL(12,2) NOT NULL,
                    payout_type VARCHAR(50) DEFAULT 'double_up_cashout',
                    status VARCHAR(50) DEFAULT 'pending',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP NULL
                )
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NULL,
                    member_id VARCHAR(50) NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    type VARCHAR(50) DEFAULT 'info',
                    is_read TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");
        } catch (Exception $e) {}

        // ─── Direct Database Repair & Zero-Reset ───────────────────────────────
        // Ensures only members with actual approved weekly payments have non-zero savings
        try {
            // 1. Reset any user with zero weekly payments to 0.00 saved and 0 weeks
            $db->exec("
                UPDATE users u
                SET u.saved = 0.00, u.weeks = 0
                WHERE NOT EXISTS (
                    SELECT 1 FROM payments p
                    WHERE (p.user_id = u.id OR (p.member_id IS NOT NULL AND p.member_id != '' AND p.member_id = u.member_id))
                      AND p.status IN ('approved', 'confirmed', 'success')
                      AND p.amount != 2000
                      AND (p.payment_scope = 'weekly' OR (p.payment_type IS NULL OR LOWER(p.payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine', 'digimart_unit')))
                )
            ");

            // 2. Set accurate payment sums for users who DO have approved weekly payments
            $db->exec("
                UPDATE users u
                INNER JOIN (
                    SELECT 
                        COALESCE(NULLIF(p.user_id, 0), u2.id) as target_user_id,
                        SUM(p.amount) as real_saved,
                        SUM(COALESCE(p.weeks_covered, 1)) as real_weeks
                    FROM payments p
                    LEFT JOIN users u2 ON (p.member_id IS NOT NULL AND p.member_id != '' AND p.member_id = u2.member_id)
                    WHERE p.status IN ('approved', 'confirmed', 'success')
                      AND p.amount != 2000
                      AND (p.payment_scope = 'weekly' OR (p.payment_type IS NULL OR LOWER(p.payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine', 'digimart_unit')))
                      AND (p.purpose IS NULL OR (LOWER(p.purpose) NOT LIKE '%registration%' AND LOWER(p.purpose) NOT LIKE '%reg fee%' AND LOWER(p.purpose) NOT LIKE '%fine%'))
                    GROUP BY target_user_id
                ) actual ON actual.target_user_id = u.id
                SET 
                    u.saved = actual.real_saved,
                    u.weeks = actual.real_weeks
            ");
        } catch (Exception $e) {}
        
        try {
            $stmt = $db->query("
                SELECT
                    COALESCE(NULLIF(u.member_id, ''), CONCAT('DA-', u.id)) as id,
                    u.id as user_id,
                    u.name,
                    u.email,
                    COALESCE(u.phone, '') as phone,
                    COALESCE(NULLIF(u.initials, ''), UPPER(SUBSTRING(u.name, 1, 2)), 'U') as initials,
                    DATE_FORMAT(COALESCE(u.created_at, NOW()), '%d %b %Y') as joined,
                    COALESCE(u.status, 'active') as status,
                    u.referral_code,
                    COALESCE(
                        NULLIF((SELECT plan_type FROM savings_plans WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1), ''),
                        NULLIF(u.plan_type, ''),
                        'Double Up'
                    ) as plan,
                    COALESCE((
                        SELECT SUM(p.amount) FROM payments p
                        WHERE ((p.user_id = u.id) OR (p.member_id IS NOT NULL AND p.member_id != '' AND p.member_id = u.member_id))
                          AND p.status IN ('approved', 'confirmed', 'success')
                          AND p.amount != 2000
                          AND (p.payment_scope = 'weekly' OR (
                              (p.payment_type IS NULL OR LOWER(p.payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine', 'digimart_unit'))
                              AND (p.purpose IS NULL OR (
                                  LOWER(p.purpose) NOT LIKE '%registration%' 
                                  AND LOWER(p.purpose) NOT LIKE '%reg fee%' 
                                  AND LOWER(p.purpose) NOT LIKE '%one-time%'
                                  AND LOWER(p.purpose) NOT LIKE '%fine%'
                                  AND LOWER(p.purpose) NOT LIKE '%digimart%'
                              ))
                          ))
                    ), 0) as saved,
                    COALESCE((
                        SELECT SUM(COALESCE(p.weeks_covered, 1)) FROM payments p
                        WHERE ((p.user_id = u.id) OR (p.member_id IS NOT NULL AND p.member_id != '' AND p.member_id = u.member_id))
                          AND p.status IN ('approved', 'confirmed', 'success')
                          AND p.amount != 2000
                          AND (p.payment_scope = 'weekly' OR (
                              (p.payment_type IS NULL OR LOWER(p.payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine', 'digimart_unit'))
                              AND (p.purpose IS NULL OR (
                                  LOWER(p.purpose) NOT LIKE '%registration%' 
                                  AND LOWER(p.purpose) NOT LIKE '%reg fee%' 
                                  AND LOWER(p.purpose) NOT LIKE '%one-time%'
                                  AND LOWER(p.purpose) NOT LIKE '%fine%'
                                  AND LOWER(p.purpose) NOT LIKE '%digimart%'
                              ))
                          ))
                    ), 0) as weeks,
                    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id OR (u.member_id IS NOT NULL AND u.member_id != '' AND r.referrer_id = u.member_id)) as referral_count,
                    (SELECT COUNT(*) FROM referrals r WHERE (r.referrer_id = u.id OR (u.member_id IS NOT NULL AND u.member_id != '' AND r.referrer_id = u.member_id)) AND r.status = 'active') as active_referrals,
                    (SELECT bank_name FROM bank_accounts WHERE user_id = u.id AND is_primary = 1 LIMIT 1) as bank_name,
                    (SELECT account_number FROM bank_accounts WHERE user_id = u.id AND is_primary = 1 LIMIT 1) as account_number,
                    (SELECT account_name FROM bank_accounts WHERE user_id = u.id AND is_primary = 1 LIMIT 1) as account_name
                FROM users u
                ORDER BY u.id DESC
            ");
            $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $stmt = $db->query("
                SELECT
                    COALESCE(NULLIF(u.member_id, ''), CONCAT('DA-', u.id)) as id,
                    u.id as user_id,
                    u.name,
                    u.email,
                    COALESCE(u.phone, '') as phone,
                    COALESCE(NULLIF(u.initials, ''), UPPER(SUBSTRING(u.name, 1, 2)), 'U') as initials,
                    DATE_FORMAT(COALESCE(u.created_at, NOW()), '%d %b %Y') as joined,
                    COALESCE(u.status, 'active') as status,
                    0 as saved,
                    0 as weeks
                FROM users u
                ORDER BY u.id DESC
            ");
            $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        foreach ($members as &$m) {
            $m['saved']           = (float)($m['saved'] ?? 0);
            $m['weeks']           = (int)($m['weeks'] ?? 0);
            $m['referral_count']  = (int)($m['referral_count'] ?? 0);
            $m['active_referrals']= (int)($m['active_referrals'] ?? 0);
            $m['plan']            = $m['plan'] ?? 'Double Up';
            if ($m['plan'] === 'double_up') {
                $m['plan'] = 'Double Up';
            } else if ($m['plan'] === 'digimart') {
                $m['plan'] = 'DigiMart';
            }

            // Self-heal: ensure users table and savings_plans match the accurate payment sums
            try {
                $db->prepare("UPDATE users SET saved = ?, weeks = ? WHERE id = ?")->execute([$m['saved'], $m['weeks'], $m['user_id']]);
                $db->prepare("UPDATE savings_plans SET total_saved = ?, weeks_completed = ? WHERE user_id = ?")->execute([$m['saved'], $m['weeks'], $m['user_id']]);
            } catch (Exception $e) {}

            // Auto-suspend check: 4 missed weeks (only for members who have actually started saving)
            $joinedStr = $m['joined'] ?? 'now';
            $joinedTime = strtotime($joinedStr) ?: time();

            if ($m['weeks'] <= 0 && $m['saved'] <= 0) {
                $elapsed = 0;
                $missed = 0;
            } else {
                $elapsed = max(1, min(50, (int)ceil(max(0, time() - $joinedTime) / (7 * 86400))));
                $missed = max(0, $elapsed - $m['weeks']);
            }

            $m['missed_weeks'] = $missed;

            if ($missed >= 4 && $m['status'] === 'active') {
                $m['status'] = 'suspended';
                try {
                    $cleanId = preg_replace('/\D/', '', $m['id']);
                    $db->prepare("UPDATE users SET status = 'suspended' WHERE member_id = ? OR id = ?")->execute([$m['id'], $cleanId]);
                } catch (Exception $e) {}
            }
        }
        unset($m);

        echo json_encode(['success' => true, 'members' => $members]);
        exit;
    }

    // ── POST: update status ───────────────────────────────────────────────────
    if ($method === 'POST') {
        $data   = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'status';
        $id     = trim($data['id'] ?? '');
        $status = trim($data['status'] ?? '');

        if (!$id || !$status) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing ID or status']);
            exit;
        }

        $cleanId = is_numeric($id) ? (int)$id : (int)preg_replace('/\D/', '', $id);

        // Fetch user
        $uStmt = $db->prepare("SELECT id, member_id, name, email, phone FROM users WHERE member_id = ? OR id = ? OR member_id = CONCAT('DA-', ?) LIMIT 1");
        $uStmt->execute([$id, $cleanId, $cleanId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        $userId = (int)$user['id'];
        $memberId = $user['member_id'] ?: ('DA-' . $userId);

        if ($status === 'active') {
            $db->prepare("UPDATE users SET status = 'active', registration_fee_paid = 1 WHERE id = ?")->execute([$userId]);
        } else {
            $db->prepare("UPDATE users SET status = ? WHERE id = ?")->execute([$status, $userId]);
        }

        if ($status === 'active') {
            // Auto-approve pending registration payments
            try {
                $db->prepare("
                    UPDATE payments 
                    SET status = 'approved', paid_at = NOW() 
                    WHERE (user_id = ? OR member_id = ? OR member_id = ?) AND status = 'pending' AND amount = 2000
                ")->execute([$userId, $memberId, $id]);
            } catch (Exception $e) {}

            // Auto-activate referral
            try {
                $db->prepare("UPDATE referrals SET status = 'active', updated_at = NOW() WHERE referee_id = ?")->execute([$userId]);
            } catch (Exception $e) {}

            // Ensure savings plan exists
            try {
                $spCheck = $db->prepare("SELECT id FROM savings_plans WHERE user_id = ? LIMIT 1");
                $spCheck->execute([$userId]);
                if (!$spCheck->fetch()) {
                    $planIdStr = 'SP-' . substr(md5((string)$userId), 0, 6);
                    $db->prepare("INSERT INTO savings_plans (user_id, plan_type, savings_plan_id, total_saved, weeks_completed, status) VALUES (?, 'double_up', ?, 0.00, 0, 'active')")->execute([$userId, $planIdStr]);
                }
            } catch (Exception $e) {}

            // Send notification
            try {
                insert_notification($db, [
                    'user_id'     => $userId,
                    'member_id'   => $memberId,
                    'target_user' => $userId,
                    'audience'    => 'specific_user',
                    'title'       => 'Account Approved & Active',
                    'body'        => 'Your DigiAjo Global account has been approved. You can now log in and manage your savings.',
                    'message'     => 'Your DigiAjo Global account has been approved. You can now log in and manage your savings.',
                    'kind'        => 'success',
                    'type'        => 'success',
                    'sent_at'     => date('Y-m-d H:i:s'),
                ]);
            } catch (Exception $e) {}

            // Send confirmation email
            try {
                $cleanPhone = preg_replace('/\D/', '', $user['phone']);
                $defaultPass = substr($cleanPhone, -6);
                $subject = "Account Approved — Welcome to DigiAjo Global ({$memberId})";
                $message = "
                    <p>Dear <strong>{$user['name']}</strong>,</p>
                    <p>Great news! Your account on <strong>DigiAjo Global</strong> has been approved and is now <strong>Active</strong>.</p>
                    <table style='width:100%; border-collapse:collapse; margin:20px 0;'>
                        <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Member ID:</td><td style='padding:8px 0; font-weight:bold;'>{$memberId}</td></tr>
                        <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Email:</td><td style='padding:8px 0; font-weight:bold;'>{$user['email']}</td></tr>
                        <tr style='border-bottom:1px solid #eee;'><td style='padding:8px 0; color:#666;'>Status:</td><td style='padding:8px 0; font-weight:bold; color:#164f29;'>Active</td></tr>
                    </table>
                    <p>You can now sign in to your dashboard to view your savings plan, make weekly contributions, and track your progress.</p>
                    <p><a href='https://digiajoglobal.com/login' style='display:inline-block; background-color:#164f29; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;'>Sign In to Member Portal</a></p>
                ";
                send_email($user['email'], $subject, $message);
            } catch (Exception $e) {}
        }

        echo json_encode(['success' => true, 'message' => "User status updated to {$status} successfully"]);
        exit;
    }

    // ── PUT: edit user details ────────────────────────────────────────────────
    if ($method === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = trim($data['id'] ?? '');

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing user ID']);
            exit;
        }

        $cleanId = is_numeric($id) ? (int)$id : (int)preg_replace('/\D/', '', $id);
        $uStmt = $db->prepare("SELECT id, member_id, name, email, phone FROM users WHERE member_id = ? OR id = ? OR member_id = CONCAT('DA-', ?) LIMIT 1");
        $uStmt->execute([$id, $cleanId, $cleanId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        $userId = (int)$user['id'];
        $memberId = $user['member_id'] ?: ('DA-' . $userId);

        $fields = [];
        $params = [];

        if (!empty($data['name'])) {
            $fields[] = 'name = ?';
            $params[] = trim($data['name']);
            $parts    = preg_split('/\s+/', trim($data['name']));
            $initials = strtoupper(implode('', array_map(fn($p) => $p[0] ?? '', array_slice($parts, 0, 2))));
            $fields[] = 'initials = ?';
            $params[] = $initials;
        }
        if (!empty($data['email'])) {
            $fields[] = 'email = ?';
            $params[] = strtolower(trim($data['email']));
        }
        if (!empty($data['phone'])) {
            $fields[] = 'phone = ?';
            $params[] = trim($data['phone']);
        }
        if (!empty($data['status'])) {
            $fields[] = 'status = ?';
            $params[] = $data['status'];
            if ($data['status'] === 'active') {
                $fields[] = 'registration_fee_paid = 1';
            }
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No fields to update']);
            exit;
        }

        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $db->prepare($sql)->execute($params);

        if (($data['status'] ?? '') === 'active') {
            try {
                $db->prepare("UPDATE payments SET status = 'approved', paid_at = NOW() WHERE user_id = ? AND status = 'pending' AND amount = 2000")->execute([$userId]);
            } catch (Exception $e) {}
            try {
                $db->prepare("UPDATE referrals SET status = 'active', updated_at = NOW() WHERE referee_id = ?")->execute([$userId]);
            } catch (Exception $e) {}
        }

        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
        exit;
    }

    // ── DELETE: delete one or many users ─────────────────────────────────────
    if ($method === 'DELETE') {
        $data = json_decode(file_get_contents('php://input'), true);
        $ids  = $data['ids'] ?? [];   // array of member_ids like ['DA-XXXXX', ...]

        if (empty($ids) || !is_array($ids)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No user IDs provided']);
            exit;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $db->beginTransaction();

        try {
            // Find all matching users by member_id OR id, excluding admin accounts
            $query = "SELECT u.id, u.member_id FROM users u WHERE (u.member_id IN ($placeholders) OR u.id IN ($placeholders))";
            
            // Check if admins table exists
            $hasAdminsTable = false;
            try {
                $chk = $db->query("SELECT 1 FROM admins LIMIT 1");
                $hasAdminsTable = true;
            } catch (Exception $e) {}

            if ($hasAdminsTable) {
                $query .= " AND u.email NOT IN (SELECT email FROM admins)";
            }

            $idStmt = $db->prepare($query);
            $params = array_merge($ids, $ids);
            $idStmt->execute($params);
            $userRows = $idStmt->fetchAll(PDO::FETCH_ASSOC);
            $numericIds = array_column($userRows, 'id');

            if (empty($numericIds)) {
                $db->rollBack();
                echo json_encode(['success' => true, 'message' => 'No users to delete', 'deleted' => 0]);
                exit;
            }

            $np = implode(',', array_fill(0, count($numericIds), '?'));

            // Delete related records — each wrapped safely
            $cascades = [
                "DELETE FROM payments WHERE user_id IN ($np)",
                "DELETE FROM savings_records WHERE plan_id IN (SELECT id FROM savings_plans WHERE user_id IN ($np))",
                "DELETE FROM savings_plans WHERE user_id IN ($np)",
                "DELETE FROM referrals WHERE referrer_id IN ($np) OR referee_id IN ($np)",
                "DELETE FROM fines WHERE user_id IN ($np)",
                "DELETE FROM notifications WHERE user_id IN ($np)",
                "DELETE FROM bank_accounts WHERE user_id IN ($np)",
            ];
            foreach ($cascades as $sql) {
                try {
                    $db->prepare($sql)->execute($numericIds);
                } catch (PDOException $e) {}
            }
            $db->prepare("DELETE FROM users WHERE id IN ($np)")->execute($numericIds);

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => count($numericIds) . ' user(s) deleted successfully',
                'deleted' => count($numericIds),
            ]);
            exit;
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
            exit;
        }
    }

} catch (PDOException $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
