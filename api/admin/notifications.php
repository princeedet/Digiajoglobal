<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/email.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = getDB();

    // Silently run milestone check on every poll
    require_once __DIR__ . '/referral_milestone_check.php';
    check_referral_milestones($db);

    try {
        $stmt = $db->prepare("
            SELECT
                n.id, n.title, n.body, n.audience, n.kind, n.sent_at,
                u.name   AS target_name,
                u.member_id AS target_member_id,
                IF(r.notification_id IS NULL, 1, 0) AS is_unread
            FROM notifications n
            LEFT JOIN users u ON n.target_user = u.id
            LEFT JOIN user_notification_reads r
                   ON n.id = r.notification_id AND r.user_id = 0
            ORDER BY n.sent_at DESC
            LIMIT 100
        ");
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $unreadCount = 0;
        foreach ($notifications as $n) {
            if ($n['is_unread'] == 1) $unreadCount++;
        }

        echo json_encode([
            'success'       => true,
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    // ── Mark all admin notifications as read ─────────────────────────────────
    if ($action === 'mark_read') {
        $db = getDB();
        $notifId = isset($input['notification_id']) ? (int)$input['notification_id'] : null;
        try {
            if ($notifId) {
                // Mark a single notification as read
                $db->prepare("
                    INSERT IGNORE INTO user_notification_reads (user_id, notification_id)
                    VALUES (0, ?)
                ")->execute([$notifId]);
            } else {
                // Mark all admin notifications as read
                $db->exec("
                    INSERT IGNORE INTO user_notification_reads (user_id, notification_id)
                    SELECT 0, id FROM notifications WHERE audience IN ('all', 'admin')
                ");
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    // ── Send announcement ─────────────────────────────────────────────────────
    $title    = $input['title'] ?? '';
    $body     = $input['message'] ?? '';
    $audience = $input['audience'] ?? 'all';

    if (!$title || !$body) {
        echo json_encode(['success' => false, 'error' => 'Title and message are required.']);
        exit;
    }

    $db = getDB();
    try {
        // Insert into notifications
        $stmt = $db->prepare("INSERT INTO notifications (title, body, kind, audience) VALUES (?, ?, 'alert', ?)");
        $stmt->execute([$title, $body, $audience]);

        // Send emails
        $query = "SELECT email, name FROM users";
        if ($audience === 'active_members') {
            $query .= " WHERE status = 'active'";
        }
        $userStmt = $db->query($query);
        $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($users as $user) {
            $msg = "<p>Hi {$user['name']},</p><p>" . nl2br(htmlspecialchars($body)) . "</p>";
            try {
                send_email($user['email'], $title, $msg);
            } catch (Exception $e) {}
        }

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}
