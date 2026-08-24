<?php
// ─── DigiAjo Global — Admin Fines & Missed Payments Management ──────────────
// GET  /api/admin/fines.php?member_id=DA-XXXXX  — get missed weeks and fines
// POST /api/admin/fines.php                     — issue, waive, or update fine

require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

try {
    // Ensure fines table exists
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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_member (member_id),
            INDEX idx_user (user_id)
        )
    ");

    // ── GET: Calculate missed weeks & fetch existing fines ──────────────────────
    if ($method === 'GET') {
        $memberId = trim($_GET['member_id'] ?? $_GET['id'] ?? '');

        if (!$memberId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing member_id']);
            exit;
        }

        // Fetch user
        $uStmt = $db->prepare("
            SELECT u.id, u.member_id, u.name, u.email, u.phone, u.created_at, u.plan_type,
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
                   ), 0) as weeks_completed,
                   IFNULL((SELECT start_date FROM savings_plans WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1), u.created_at) as plan_start_date
            FROM users u
            WHERE u.member_id = ? OR u.id = ?
            LIMIT 1
        ");
        $uStmt->execute([$memberId, $memberId]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        $userId = (int)$user['id'];
        $actualMemberId = $user['member_id'] ?: "DA-{$userId}";

        $weeksCompleted = (int)$user['weeks_completed'];
        $userSavedAmount = (float)($user['saved'] ?? 0);

        // Fetch user active hands & weekly rate for 100% default penalty calculation
        $payHandsStmt = $db->prepare("
            SELECT MAX(COALESCE(NULLIF(hands, 0), ROUND(amount / 1300), 1)) as max_hands
            FROM payments
            WHERE ((user_id = ?) OR (member_id IS NOT NULL AND member_id != '' AND member_id = ?)) 
              AND status IN ('approved', 'confirmed', 'success')
              AND amount != 2000
        ");
        $payHandsStmt->execute([$userId, $actualMemberId]);
        $handsRow = $payHandsStmt->fetch(PDO::FETCH_ASSOC);
        $activeHands = max(1, (int)($handsRow['max_hands'] ?? 1));
        $weeklyRate = $activeHands * 1300.00;
        $defaultFineAmount = $weeklyRate; // 100% Default Penalty per policy

        if ($weeksCompleted <= 0 && $userSavedAmount <= 0) {
            $weeksElapsed = 0;
            $missedWeeksCount = 0;
            $timeline = [];
        } else {
            // Calculate weeks elapsed since start date
            $startDateStr = $user['plan_start_date'] ?: $user['created_at'];
            $startTimestamp = strtotime($startDateStr);
            $nowTimestamp = time();
            $secondsDiff = max(0, $nowTimestamp - $startTimestamp);
            $weeksElapsed = max(1, min(50, (int)ceil($secondsDiff / (7 * 86400))));

            // Build week-by-week timeline
            $timeline = [];
            for ($w = 1; $w <= $weeksElapsed; $w++) {
                $weekStart = $startTimestamp + (($w - 1) * 7 * 86400);
                $weekEnd   = $weekStart + (6 * 86400);
                $monthName = date('F Y', $weekStart);
                $dateRange = date('d M', $weekStart) . ' - ' . date('d M Y', $weekEnd);

                $isPaid = ($w <= $weeksCompleted);
                $timeline[] = [
                    'week'        => $w,
                    'month'       => $monthName,
                    'dateRange'   => $dateRange,
                    'status'      => $isPaid ? 'paid' : 'missed',
                    'hands'       => $activeHands,
                    'defaultFine' => $defaultFineAmount,
                ];
            }

            $missedWeeksCount = max(0, $weeksElapsed - $weeksCompleted);
        }

        // Fetch fines for this user
        $fStmt = $db->prepare("
            SELECT id, amount, week_number, missed_period, reason, status,
                   DATE_FORMAT(created_at, '%d %b %Y, %h:%i %p') as created_at_formatted,
                   created_at
            FROM fines
            WHERE user_id = ? OR member_id = ?
            ORDER BY id DESC
        ");
        $fStmt->execute([$userId, $actualMemberId]);
        $fines = $fStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($fines as &$f) {
            $f['amount'] = (float)$f['amount'];
            $f['week_number'] = $f['week_number'] ? (int)$f['week_number'] : null;
        }
        unset($f);

        $isSuspensionEligible = ($missedWeeksCount >= 4);

        echo json_encode([
            'success'            => true,
            'user'               => [
                'id'                 => $actualMemberId,
                'name'               => $user['name'],
                'weeksCompleted'     => $weeksCompleted,
                'weeksElapsed'       => $weeksElapsed,
                'missedWeeks'        => $missedWeeksCount,
                'activeHands'        => $activeHands,
                'weeklyRate'         => $weeklyRate,
                'defaultFineAmount'  => $defaultFineAmount,
                'suspensionEligible' => $isSuspensionEligible,
            ],
            'timeline'           => $timeline,
            'fines'              => $fines,
        ]);
        exit;
    }

    // ── POST: Issue, waive, or update fine ────────────────────────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $body['action'] ?? 'create'; // 'create' | 'waive' | 'pay' | 'delete' | 'suspend'

        if ($action === 'create') {
            $memberId     = trim($body['member_id'] ?? $body['id'] ?? '');
            $amount       = (float)($body['amount'] ?? 1300);
            $weekNumber   = !empty($body['week_number']) ? (int)$body['week_number'] : null;
            $missedPeriod = trim($body['missed_period'] ?? ($weekNumber ? "Week {$weekNumber}" : 'Missed Weekly Payment'));
            $reason       = trim($body['reason'] ?? '100% Default Penalty (Missed Saturday Contribution)');

            if (!$memberId || $amount <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Missing member_id or invalid amount']);
                exit;
            }

            // Find user
            $uStmt = $db->prepare("SELECT id, member_id, name, email FROM users WHERE member_id = ? OR id = ? LIMIT 1");
            $uStmt->execute([$memberId, $memberId]);
            $user = $uStmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                exit;
            }

            $userId = (int)$user['id'];
            $actualMemberId = $user['member_id'] ?: "DA-{$userId}";

            // Insert fine
            $ins = $db->prepare("
                INSERT INTO fines (user_id, member_id, amount, week_number, missed_period, reason, status)
                VALUES (?, ?, ?, ?, ?, ?, 'unpaid')
            ");
            $ins->execute([$userId, $actualMemberId, $amount, $weekNumber, $missedPeriod, $reason]);
            $fineId = $db->lastInsertId();

            // Send notification to member
            try {
                $notifMsg = "A fine of ₦" . number_format($amount, 2) . " has been issued for {$missedPeriod} ({$reason}). Please clear this fine to keep your account in good standing.";
                insert_notification($db, [
                    'user_id'     => $userId,
                    'member_id'   => $actualMemberId,
                    'target_user' => $userId,
                    'audience'    => 'specific_user',
                    'title'       => 'Late Payment Fine Issued',
                    'body'        => $notifMsg,
                    'message'     => $notifMsg,
                    'kind'        => 'warning',
                    'type'        => 'warning',
                    'sent_at'     => date('Y-m-d H:i:s'),
                ]);
            } catch (Exception $e) {}

            echo json_encode([
                'success' => true,
                'message' => 'Fine issued successfully',
                'fine_id' => $fineId,
            ]);
            exit;
        }

        if ($action === 'waive' || $action === 'pay') {
            $fineId = (int)($body['fine_id'] ?? 0);
            $newStatus = ($action === 'waive') ? 'waived' : 'paid';

            if (!$fineId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Missing fine_id']);
                exit;
            }

            $stmt = $db->prepare("UPDATE fines SET status = ? WHERE id = ?");
            $stmt->execute([$newStatus, $fineId]);

            echo json_encode([
                'success' => true,
                'message' => "Fine marked as {$newStatus}",
            ]);
            exit;
        }

        if ($action === 'delete') {
            $fineId = (int)($body['fine_id'] ?? 0);
            if (!$fineId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Missing fine_id']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM fines WHERE id = ?");
            $stmt->execute([$fineId]);

            echo json_encode([
                'success' => true,
                'message' => 'Fine record deleted',
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        exit;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
