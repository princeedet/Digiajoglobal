<?php
// ─── DigiAjo Global — Fetch & Mark Member Notifications ─────────────────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $memberId = $_GET['member_id'] ?? '';
    $email = $_GET['email'] ?? '';
    $nameParam = $_GET['name'] ?? '';

    if (!$memberId && !$email && !$nameParam) {
        echo json_encode(['success' => false, 'error' => 'Missing member identifier']);
        exit;
    }

    $db = getDB();
    try {
        ensure_notifications_schema($db);

        // 1. Get user record safely without assuming fixed schema
        $cleanNumId = (int)preg_replace('/\D/', '', $memberId);
        $user = null;

        if ($memberId || $email) {
            $stmt = $db->prepare('SELECT * FROM users WHERE (member_id = ? AND member_id != "") OR (email = ? AND email != "") LIMIT 1');
            $stmt->execute([$memberId, $email ?: $memberId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        if (!$user && $cleanNumId > 0) {
            $stmt = $db->prepare('SELECT * FROM users WHERE id = ? OR member_id = ? LIMIT 1');
            $stmt->execute([$cleanNumId, "DA-{$cleanNumId}"]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        if (!$user && $nameParam) {
            $stmt = $db->prepare('SELECT * FROM users WHERE name = ? OR name LIKE ? LIMIT 1');
            $stmt->execute([$nameParam, "%{$nameParam}%"]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        $userId = $user ? (int)$user['id'] : $cleanNumId;
        $userName = $user ? ($user['name'] ?? '') : $nameParam;
        $officialMemberId = $user ? ($user['member_id'] ?: ("DA-" . $userId)) : ($memberId ?: ($cleanNumId > 0 ? "DA-" . $cleanNumId : ''));
        $status = $user ? ($user['status'] ?? 'active') : 'active';
        
        $planType = $user['plan_type'] ?? '';
        if (!$planType && $userId > 0) {
            try {
                $spStmt = $db->prepare("SELECT plan_type FROM savings_plans WHERE user_id = ? ORDER BY id DESC LIMIT 1");
                $spStmt->execute([$userId]);
                $sp = $spStmt->fetch(PDO::FETCH_ASSOC);
                if ($sp && !empty($sp['plan_type'])) {
                    $planType = $sp['plan_type'] === 'double_up' ? 'Double Up' : ($sp['plan_type'] === 'digimart' ? 'DigiMart' : $sp['plan_type']);
                }
            } catch (Exception $e) {}
        }
        if (!$planType) {
            $planType = 'Double Up';
        }

        // Fetch relevant notifications (general + user-specific, excluding deleted)
        $query = "
            SELECT 
                n.id, 
                n.title, 
                COALESCE(NULLIF(n.body, ''), n.message, '') AS body,
                COALESCE(NULLIF(n.message, ''), n.body, '') AS message,
                COALESCE(NULLIF(n.kind, ''), n.type, 'info') AS kind,
                COALESCE(NULLIF(n.type, ''), n.kind, 'info') AS type,
                COALESCE(n.audience, 'all') AS audience,
                n.target_user,
                n.member_id,
                COALESCE(n.sent_at, n.created_at, NOW()) AS sent_at,
                IF(r.notification_id IS NULL, 1, 0) AS is_unread
            FROM notifications n
            LEFT JOIN user_notification_reads r 
                   ON (CAST(n.id AS CHAR) = r.notification_id OR n.id = r.notification_id) 
                  AND (r.user_id = ? OR r.user_id = ?)
            LEFT JOIN user_notification_deletions d 
                   ON (CAST(n.id AS CHAR) = d.notification_id OR n.id = d.notification_id) 
                  AND (d.user_id = ? OR d.user_id = ?)
            WHERE d.notification_id IS NULL
              AND (
                   n.audience = 'all'
                OR n.audience IS NULL
                OR n.audience = ''
                OR n.audience = 'general'
                OR (n.audience = 'active_members' AND ? = 'active')
                OR (n.audience = 'plan_type' AND ? != '' AND n.target_plan = ?)
                OR (? > 0 AND n.target_user = ?)
                OR (? > 0 AND n.user_id = ?)
                OR (n.member_id IS NOT NULL AND n.member_id != '' AND (
                    n.member_id = ? OR n.member_id = ? OR n.member_id = ? OR n.member_id = ?
                   ))
                OR (? != '' AND n.target_name IS NOT NULL AND n.target_name != '' AND n.target_name LIKE ?)
              )
            ORDER BY COALESCE(n.sent_at, n.created_at, NOW()) DESC, n.id DESC
            LIMIT 200
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute([
            $userId,
            $cleanNumId,
            $userId,
            $cleanNumId,
            $status,
            $planType,
            $planType,
            $userId,
            $userId,
            $userId,
            $userId,
            $memberId,
            $officialMemberId,
            "DA-{$userId}",
            (string)$userId,
            $userName,
            "%{$userName}%"
        ]);
        
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Count unread
        $unreadCount = 0;
        foreach ($notifications as $n) {
            if ($n['is_unread'] == 1) $unreadCount++;
        }

        echo json_encode([
            'success' => true,
            'unreadCount' => $unreadCount,
            'notifications' => $notifications
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $memberId = $input['member_id'] ?? '';
    $action = $input['action'] ?? '';
    $notificationId = $input['notification_id'] ?? $input['delete_id'] ?? null;

    if (!$memberId) {
        echo json_encode(['success' => false, 'error' => 'Missing member_id']);
        exit;
    }

    $db = getDB();
    try {
        ensure_notifications_schema($db);
        $cleanNumId = (int)preg_replace('/\D/', '', $memberId);
        $stmt = $db->prepare('SELECT id FROM users WHERE member_id = ? OR id = ? OR member_id = ? OR email = ? LIMIT 1');
        $stmt->execute([$memberId, $cleanNumId, "DA-{$cleanNumId}", $memberId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $userId = $user ? (int)$user['id'] : $cleanNumId;

        // Hard reset for member: clear all reads and deletions for this user
        if ($action === 'hard_reset') {
            try {
                $db->prepare("DELETE FROM user_notification_reads WHERE user_id = ? OR user_id = ?")->execute([$userId, $cleanNumId]);
                $db->prepare("DELETE FROM user_notification_deletions WHERE user_id = ? OR user_id = ?")->execute([$userId, $cleanNumId]);
            } catch (Exception $e) {}
            echo json_encode(['success' => true, 'message' => 'Member notification feed reset successfully.']);
            exit;
        }

        if ($action === 'delete' || !empty($input['delete_id'])) {
            if ($notificationId) {
                $stmt = $db->prepare('INSERT IGNORE INTO user_notification_deletions (user_id, notification_id) VALUES (?, ?)');
                $stmt->execute([$userId, (string)$notificationId]);
            }
        } elseif ($action === 'clear_all' || (!empty($input['clear_all']) && empty($notificationId))) {
            $stmt = $db->prepare("
                INSERT IGNORE INTO user_notification_deletions (user_id, notification_id)
                SELECT ?, CAST(id AS CHAR) FROM notifications
            ");
            $stmt->execute([$userId]);
        } else {
            // Mark as read
            if ($notificationId) {
                $stmt = $db->prepare('INSERT IGNORE INTO user_notification_reads (user_id, notification_id) VALUES (?, ?)');
                $stmt->execute([$userId, (string)$notificationId]);
            } else {
                $stmt = $db->prepare("
                    INSERT IGNORE INTO user_notification_reads (user_id, notification_id)
                    SELECT ?, CAST(id AS CHAR) FROM notifications
                ");
                $stmt->execute([$userId]);
            }
        }

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}
