<?php
// ─── DigiAjo Global — Admin User Management ───────────────────────────────────
// GET    /api/admin/members.php              — list all users
// POST   /api/admin/members.php action=status  — update single user status
// PUT    /api/admin/members.php              — edit user details
// DELETE /api/admin/members.php              — delete user(s)

require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

try {
    // ── GET: list all members ─────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $db->query("
            SELECT
                u.member_id as id,
                u.name,
                u.email,
                u.phone,
                u.initials,
                DATE_FORMAT(u.created_at, '%d %b %Y') as joined,
                u.status,
                u.referral_code,
                IFNULL((SELECT plan_type FROM savings_plans WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1), 'Double Up') as plan,
                IFNULL((SELECT total_saved FROM savings_plans WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1), 0) as saved,
                IFNULL((SELECT weeks_completed FROM savings_plans WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1), 0) as weeks,
                (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id) as referral_count,
                (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.status = 'active') as active_referrals,
                (SELECT r_user.name FROM users r_user WHERE r_user.id = u.referred_by) as referred_by_name,
                (SELECT bank_name FROM bank_accounts WHERE user_id = u.id AND is_primary = 1 LIMIT 1) as bank_name,
                (SELECT account_number FROM bank_accounts WHERE user_id = u.id AND is_primary = 1 LIMIT 1) as account_number,
                (SELECT account_name FROM bank_accounts WHERE user_id = u.id AND is_primary = 1 LIMIT 1) as account_name
            FROM users u
            ORDER BY u.created_at DESC
        ");
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($members as &$m) {
            $m['saved']           = (float)$m['saved'];
            $m['weeks']           = (int)$m['weeks'];
            $m['referral_count']  = (int)$m['referral_count'];
            $m['active_referrals']= (int)$m['active_referrals'];
            if ($m['plan'] === 'double_up') {
                $m['plan'] = 'Double Up';
            } else if ($m['plan'] === 'digimart') {
                $m['plan'] = 'DigiMart';
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
        $id     = $data['id'] ?? '';
        $status = $data['status'] ?? '';

        if (!$id || !$status) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing ID or status']);
            exit;
        }
        $stmt = $db->prepare("UPDATE users SET status = ? WHERE member_id = ?");
        $stmt->execute([$status, $id]);
        echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
        exit;
    }

    // ── PUT: edit user details ────────────────────────────────────────────────
    if ($method === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = $data['id'] ?? '';          // member_id like DA-XXXXX

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing user ID']);
            exit;
        }

        $fields = [];
        $params = [];

        if (!empty($data['name'])) {
            $fields[] = 'name = ?';
            $params[] = trim($data['name']);
            // Also update initials
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
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No fields to update']);
            exit;
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE member_id = ?";
        $db->prepare($sql)->execute($params);

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

        // Safety: never allow deleting accounts whose email appears in the admins table
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $db->beginTransaction();

        // Get numeric IDs, excluding any email that matches an admin account
        $idStmt = $db->prepare("
            SELECT u.id FROM users u
            WHERE u.member_id IN ($placeholders)
              AND u.email NOT IN (SELECT email FROM admins)
        ");
        $idStmt->execute($ids);
        $numericIds = array_column($idStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

        if (empty($numericIds)) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No eligible users found (admins cannot be deleted)']);
            exit;
        }

        $np = implode(',', array_fill(0, count($numericIds), '?'));

        // Delete related records — each wrapped so optional tables don't abort the whole delete
        $cascades = [
            ["DELETE FROM payments WHERE user_id IN ($np)", $numericIds],
            ["DELETE FROM savings_plans WHERE user_id IN ($np)", $numericIds],
            ["DELETE FROM referrals WHERE referrer_id IN ($np) OR referee_id IN ($np)", array_merge($numericIds, $numericIds)],
            ["DELETE FROM fines WHERE user_id IN ($np)", $numericIds],
            ["DELETE FROM notifications WHERE user_id IN ($np)", $numericIds],
        ];
        foreach ($cascades as [$sql, $params]) {
            try { $db->prepare($sql)->execute($params); } catch (PDOException $e) { /* table may not exist yet */ }
        }
        $db->prepare("DELETE FROM users WHERE id IN ($np)")->execute($numericIds);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => count($numericIds) . ' user(s) deleted successfully',
            'deleted' => count($numericIds),
        ]);
        exit;
    }

} catch (PDOException $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
