<?php
// ─── DigiAjo Global — Fetch & Mark Member Notifications ─────────────────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $memberId = $_GET['member_id'] ?? '';
    if (!$memberId) {
        echo json_encode(['success' => false, 'error' => 'Missing member_id']);
        exit;
    }

    $db = getDB();
    try {
        // 1. Get internal user ID
        $stmt = $db->prepare('SELECT id, status, plan_type FROM users WHERE member_id = ? LIMIT 1');
        $stmt->execute([$memberId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }
        
        $userId = (int)$user['id'];
        $status = $user['status'];
        $planType = $user['plan_type'];

        // 2. Fetch relevant notifications
        // Match: audience = 'all' OR (audience = 'active_members' and status = 'active') OR target_user = userId OR target_plan = planType
        $query = "
            SELECT n.id, n.title, n.body, n.kind, n.sent_at,
                   IF(r.read_at IS NULL, 1, 0) as is_unread
            FROM notifications n
            LEFT JOIN user_notification_reads r ON n.id = r.notification_id AND r.user_id = ?
            WHERE n.audience = 'all'
               OR (n.audience = 'active_members' AND ? = 'active')
               OR (n.audience = 'specific_user' AND n.target_user = ?)
               OR (n.audience = 'plan_type' AND n.target_plan = ?)
            ORDER BY n.sent_at DESC
            LIMIT 50
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute([
            $userId,
            $status,
            $userId,
            $planType
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
    $notificationId = $input['notification_id'] ?? null; // if null, mark all as read

    if (!$memberId) {
        echo json_encode(['success' => false, 'error' => 'Missing member_id']);
        exit;
    }

    $db = getDB();
    try {
        $stmt = $db->prepare('SELECT id FROM users WHERE member_id = ? LIMIT 1');
        $stmt->execute([$memberId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }
        $userId = (int)$user['id'];

        if ($notificationId) {
            $stmt = $db->prepare('INSERT IGNORE INTO user_notification_reads (user_id, notification_id) VALUES (?, ?)');
            $stmt->execute([$userId, $notificationId]);
        } else {
            // Mark all as read (find all unread valid notifications and insert)
            // Simplified: we could just insert for all valid notifications, but the subquery works too.
            $stmt = $db->prepare("
                INSERT IGNORE INTO user_notification_reads (user_id, notification_id)
                SELECT ?, id FROM notifications
            ");
            $stmt->execute([$userId]);
        }

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Database error']);
    }
    exit;
}
