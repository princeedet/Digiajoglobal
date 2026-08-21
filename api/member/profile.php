<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$userParam  = trim($_GET['member_id'] ?? $_GET['id'] ?? '');
$emailParam = trim($_GET['email'] ?? '');
$nameParam  = trim($_GET['name'] ?? '');
$userCleanId = preg_replace('/\D/', '', $userParam);

try {
    $stmt = $db->prepare('
        SELECT * FROM users 
        WHERE (NULLIF(?, "") IS NOT NULL AND member_id = ?) 
           OR (NULLIF(?, "") IS NOT NULL AND email = ?) 
           OR (NULLIF(?, "") IS NOT NULL AND email = ?)
           OR (NULLIF(?, "") IS NOT NULL AND id = ?)
           OR (NULLIF(?, "") IS NOT NULL AND name = ?)
        LIMIT 1
    ');
    $stmt->execute([
        $userParam, $userParam,
        $userParam, $userParam,
        $emailParam, $emailParam,
        $userCleanId, $userCleanId,
        $nameParam, $nameParam
    ]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        if ($nameParam) {
            $stmt = $db->prepare('SELECT * FROM users WHERE name LIKE ? LIMIT 1');
            $stmt->execute(['%' . $nameParam . '%']);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    }

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    // Fetch latest savings plan info & sync weeks dynamically from approved payments
    $saved = 0;
    $weeks = 0;
    $activeHands = 1;
    try {
        $payStmt = $db->prepare("
            SELECT 
                COUNT(*) as count_payments,
                COALESCE(SUM(COALESCE(weeks_covered, 1)), 0) as calc_weeks,
                COALESCE(SUM(amount), 0) as calc_saved,
                MAX(COALESCE(NULLIF(hands, 0), ROUND(amount / 1300), 1)) as calc_hands
            FROM payments
            WHERE (user_id = ? OR member_id = ?) 
              AND status IN ('approved', 'confirmed', 'success')
              AND (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine'))
              AND (purpose IS NULL OR (
                  LOWER(purpose) NOT LIKE '%registration%' 
                  AND LOWER(purpose) NOT LIKE '%reg fee%' 
                  AND LOWER(purpose) NOT LIKE '%one-time%'
                  AND LOWER(purpose) NOT LIKE '%fine%'
              ))
              AND amount != 2000
        ");
        $payStmt->execute([$user['id'], $user['member_id']]);
        $calc = $payStmt->fetch(PDO::FETCH_ASSOC);

        $calcWeeks = (int)($calc['calc_weeks'] ?? 0);
        $calcSaved = (float)($calc['calc_saved'] ?? 0);
        $calcHands = max(1, (int)($calc['calc_hands'] ?? 1));

        $lastPayStmt = $db->prepare("
            SELECT hands, amount, created_at, paid_at 
            FROM payments 
            WHERE (user_id = ? OR member_id = ?)
              AND status IN ('approved', 'confirmed', 'success')
              AND (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine'))
              AND (purpose IS NULL OR (
                  LOWER(purpose) NOT LIKE '%registration%' 
                  AND LOWER(purpose) NOT LIKE '%reg fee%' 
                  AND LOWER(purpose) NOT LIKE '%one-time%'
                  AND LOWER(purpose) NOT LIKE '%fine%'
              ))
              AND amount != 2000
            ORDER BY created_at DESC LIMIT 1
        ");
        $lastPayStmt->execute([$user['id'], $user['member_id']]);
        $lastPay = $lastPayStmt->fetch(PDO::FETCH_ASSOC);
        if ($lastPay) {
            $amt = (float)$lastPay['amount'];
            $h = (int)($lastPay['hands'] ?? 1);
            if ($h <= 1 && $amt > 1300 && fmod($amt, 1300) == 0) {
                $h = (int)round($amt / 1300);
            }
            $activeHands = max(1, $h);
        } else {
            $activeHands = $calcHands;
        }

        $saved = $calcSaved;
        $weeks = $calcWeeks;
        if ($weeks === 0 && $saved > 0 && $activeHands > 0) {
            $weeks = max(1, (int)round($saved / ($activeHands * 1300)));
        }

        $startDateStr = !empty($user['created_at']) ? $user['created_at'] : date('Y-m-d H:i:s');
        $startTimestamp = strtotime($startDateStr);
        $secondsDiff = max(0, time() - $startTimestamp);
        $weeksElapsed = max(1, min(50, (int)ceil($secondsDiff / (7 * 86400))));
        $missedWeeks = max(0, $weeksElapsed - $weeks);

        // Auto-suspend if missed 4 weeks
        if ($missedWeeks >= 4 && $user['status'] !== 'suspended' && $user['status'] !== 'pending_verification') {
            try {
                $db->prepare("UPDATE users SET status = 'suspended' WHERE id = ?")->execute([$user['id']]);
                $user['status'] = 'suspended';
                // Insert notification
                $db->prepare("
                    INSERT INTO notifications (user_id, member_id, title, message, type)
                    VALUES (?, ?, 'Account Suspended (4 Weeks Defaulted)', ?, 'warning')
                ")->execute([
                    $user['id'],
                    $user['member_id'],
                    "Your account has been automatically suspended due to 4 weeks of defaulted weekly contributions. Under policy rules, your Double-Up cash bonus has been forfeited. Your saved principal (₦" . number_format($saved, 2) . ") will be available for withdrawal after the 50-week cycle."
                ]);
            } catch (Exception $e) {}
        }

        $startDateObj = new DateTime($startDateStr);
        $nextDueObj = clone $startDateObj;
        $nextDueObj->modify('+' . ($weeks * 7) . ' days');
        $nextDueDate = $nextDueObj->format('l, j M');
    } catch (PDOException $e) {
        $nextDueDate = 'Saturday, 18 Jul';
        $activeHands = 1;
        $missedWeeks = 0;
    }

    $isSuspended = ($user['status'] === 'suspended');

    echo json_encode([
        'success' => true,
        'user' => [
            'id'                  => $user['member_id'],
            'name'                => $user['name'],
            'email'               => $user['email'],
            'phone'               => $user['phone'],
            'initials'            => $user['initials'] ?: strtoupper(substr($user['name'], 0, 2)),
            'joined'              => date('d M Y', strtotime($user['created_at'])),
            'saved'               => (int)$saved,
            'status'              => $user['status'],
            'plan'                => $user['plan_type'] ?? 'Double Up',
            'weeks'               => (int)$weeks,
            'activeHands'         => (int)$activeHands,
            'missedWeeks'         => (int)($missedWeeks ?? 0),
            'isSuspended'         => $isSuspended,
            'nextDueDate'         => $nextDueDate,
            'role'                => 'member',
            'needsSecurityUpdate' => (bool)($user['needs_security_update'] ?? 1),
            'isFirstPayment'      => ($calcWeeks == 0 && $calcSaved == 0 && (int)($calc['count_payments'] ?? 0) == 0),
            'hasEstablishedHands' => ($calcWeeks > 0 || $calcSaved > 0 || (int)($calc['count_payments'] ?? 0) > 0),
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
