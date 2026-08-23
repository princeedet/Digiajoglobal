<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/email.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = getDB();
    ensure_notifications_schema($db);



    try {
        $stmt = $db->prepare("
            SELECT
                n.id, 
                n.title, 
                COALESCE(NULLIF(n.body, ''), n.message, '') AS body,
                COALESCE(NULLIF(n.kind, ''), n.type, 'alert') AS kind,
                COALESCE(NULLIF(n.type, ''), n.kind, 'alert') AS type,
                COALESCE(n.audience, 'all') AS audience,
                COALESCE(n.sent_at, n.created_at, NOW()) AS sent_at,
                n.target_user, 
                n.member_id,
                COALESCE(u.name, n.target_name) AS target_name,
                COALESCE(NULLIF(u.member_id, ''), n.member_id, CONCAT('DA-', u.id)) AS target_member_id,
                IF(r.notification_id IS NULL, 1, 0) AS is_unread
            FROM notifications n
            LEFT JOIN users u ON (n.target_user IS NOT NULL AND n.target_user = u.id)
                              OR (n.user_id IS NOT NULL AND n.user_id = u.id)
                              OR (n.member_id IS NOT NULL AND n.member_id != '' AND (n.member_id = u.member_id OR n.member_id = CONCAT('DA-', u.id)))
            LEFT JOIN user_notification_reads r
                   ON (CAST(n.id AS CHAR) = r.notification_id OR n.id = r.notification_id) AND r.user_id = 0
            ORDER BY COALESCE(n.sent_at, n.created_at, NOW()) DESC, n.id DESC
            LIMIT 200
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
    $db = getDB();
    ensure_notifications_schema($db);

    // ── Hard Reset Notifications ─────────────────────────────────────────────
    if ($action === 'hard_reset') {
        try {
            // 1. Clean read and deletion tracking tables
            try { $db->exec("TRUNCATE TABLE user_notification_reads"); } catch (Exception $e) {
                try { $db->exec("DELETE FROM user_notification_reads"); } catch (Exception $e2) {}
            }
            try { $db->exec("TRUNCATE TABLE user_notification_deletions"); } catch (Exception $e) {
                try { $db->exec("DELETE FROM user_notification_deletions"); } catch (Exception $e2) {}
            }

            // 2. Check if notifications table has entries; if empty or less than 3, seed defaults
            $count = (int)$db->query("SELECT COUNT(*) FROM notifications")->fetchColumn();
            if ($count === 0) {
                insert_notification($db, [
                    'title'    => 'Welcome to DigiAjo Global',
                    'body'     => 'Welcome to the DigiAjo Global savings platform. Track weekly contributions, Double Up progress, and referrals right here.',
                    'kind'     => 'alert',
                    'type'     => 'alert',
                    'audience' => 'all',
                    'sent_at'  => date('Y-m-d H:i:s', time() - 86400 * 5),
                ]);
                insert_notification($db, [
                    'title'    => 'Saturday Contribution Reminder',
                    'body'     => 'All weekly contributions of ₦1,300 are due by 11:59 PM every Saturday. Please ensure your payment proof is submitted promptly to avoid fines.',
                    'kind'     => 'alert',
                    'type'     => 'alert',
                    'audience' => 'all',
                    'sent_at'  => date('Y-m-d H:i:s', time() - 86400 * 2),
                ]);
                insert_notification($db, [
                    'title'    => 'DigiMart Co-Ownership Enrolment Active',
                    'body'     => 'DigiMart store investment units are open for subscription at ₦100,000 per unit with 50% guaranteed return at 12 months maturity.',
                    'kind'     => 'update',
                    'type'     => 'update',
                    'audience' => 'all',
                    'sent_at'  => date('Y-m-d H:i:s', time() - 3600),
                ]);
            }

            echo json_encode(['success' => true, 'message' => 'Notification system has been completely hard reset and synchronized.']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    // ── Delete system notification (Admin permanent removal) ─────────────────
    if ($action === 'delete') {
        $notifId = $input['notification_id'] ?? $input['id'] ?? null;
        try {
            if ($notifId) {
                $db->prepare("DELETE FROM notifications WHERE id = ? OR CAST(id AS CHAR) = ?")->execute([$notifId, (string)$notifId]);
                try {
                    $db->prepare("DELETE FROM user_notification_reads WHERE notification_id = ? OR notification_id = ?")->execute([$notifId, (string)$notifId]);
                    $db->prepare("DELETE FROM user_notification_deletions WHERE notification_id = ? OR notification_id = ?")->execute([$notifId, (string)$notifId]);
                } catch (Exception $e) {}
            }
            echo json_encode(['success' => true, 'message' => 'Notification permanently deleted from system.']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'clear_all') {
        try {
            $db->exec("DELETE FROM notifications");
            try {
                $db->exec("TRUNCATE TABLE user_notification_reads");
                $db->exec("TRUNCATE TABLE user_notification_deletions");
            } catch (Exception $e) {}
            echo json_encode(['success' => true, 'message' => 'All system notifications cleared.']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    // ── Mark all admin notifications as read ─────────────────────────────────
    if ($action === 'mark_read') {
        $notifId = isset($input['notification_id']) ? $input['notification_id'] : null;
        try {
            if ($notifId) {
                // Mark a single notification as read
                $db->prepare("
                    INSERT IGNORE INTO user_notification_reads (user_id, notification_id)
                    VALUES (0, ?)
                ")->execute([(string)$notifId]);
            } else {
                // Mark all admin notifications as read
                $db->exec("
                    INSERT IGNORE INTO user_notification_reads (user_id, notification_id)
                    SELECT 0, CAST(id AS CHAR) FROM notifications WHERE audience IN ('all', 'admin')
                ");
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    // ── Send announcement ─────────────────────────────────────────────────────
    $title           = $input['title'] ?? '';
    $body            = $input['message'] ?? '';
    $audience        = $input['audience'] ?? 'all';
    $target_user_raw = $input['target_user'] ?? $input['user_id'] ?? null;
    $target_name_raw = $input['target_name'] ?? null;

    if (!$title || !$body) {
        echo json_encode(['success' => false, 'error' => 'Title and message are required.']);
        exit;
    }

    if ($audience === 'specific_user' && empty($target_user_raw)) {
        echo json_encode(['success' => false, 'error' => 'Please select a specific member to notify.']);
        exit;
    }

    try {
        $targetUser = null;
        if ($audience === 'specific_user' && !empty($target_user_raw)) {
            $uStmt = $db->prepare("SELECT id, name, email, member_id FROM users WHERE id = ? OR member_id = ? OR email = ? OR CONCAT('DA-', id) = ? LIMIT 1");
            $uStmt->execute([$target_user_raw, $target_user_raw, $target_user_raw, $target_user_raw]);
            $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
        }

        $targetUserId = $targetUser ? (int)$targetUser['id'] : (is_numeric($target_user_raw) ? (int)$target_user_raw : null);
        $targetMemberId = $targetUser ? ($targetUser['member_id'] ?: ('DA-' . $targetUser['id'])) : (is_string($target_user_raw) ? $target_user_raw : null);
        $targetName = $targetUser ? $targetUser['name'] : $target_name_raw;

        // Safe insert into notifications with automatic schema verification
        insert_notification($db, [
            'title'       => $title,
            'body'        => $body,
            'message'     => $body,
            'kind'        => 'alert',
            'type'        => 'alert',
            'audience'    => $audience,
            'target_user' => $targetUserId,
            'user_id'     => $targetUserId,
            'member_id'   => $targetMemberId,
            'target_name' => $targetName,
            'sent_at'     => date('Y-m-d H:i:s'),
        ]);

        // Send emails
        if ($audience === 'specific_user') {
            $users = $targetUser ? [$targetUser] : [];
        } elseif ($audience === 'active_members') {
            $query = "SELECT email, name FROM users WHERE status = 'active'";
            $userStmt = $db->query($query);
            $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $query = "SELECT email, name FROM users";
            $userStmt = $db->query($query);
            $users = $userStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        foreach ($users as $user) {
            if (empty($user['email'])) continue;
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
