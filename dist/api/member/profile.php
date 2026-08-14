<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$memberId = $_GET['member_id'] ?? '';
if (!$memberId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id is required']);
    exit;
}

try {
    $stmt = $db->prepare('SELECT * FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$memberId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    // Fetch latest savings plan info & sync weeks dynamically from approved payments
    $saved = 0;
    $weeks = 0;
    try {
        $calcStmt = $db->prepare("
            SELECT COALESCE(SUM(
                CASE 
                    WHEN weeks_covered > 1 THEN weeks_covered
                    WHEN amount >= 1300 AND amount < 50000 THEN ROUND(amount / 1300)
                    ELSE 1
                END
            ), 0) AS calc_weeks,
            COALESCE(SUM(amount), 0) AS calc_saved
            FROM payments
            WHERE user_id = ? AND status = 'approved' AND payment_type = 'weekly_contribution'
        ");
        $calcStmt->execute([$user['id']]);
        $calc = $calcStmt->fetch(PDO::FETCH_ASSOC);

        $spStmt = $db->prepare('SELECT SUM(total_saved) as all_saved, SUM(weeks_completed) as all_weeks, MAX(start_date) as last_start_date, COUNT(*) as hands_count FROM savings_plans WHERE user_id = ? AND status = "active"');
        $spStmt->execute([$user['id']]);
        $sp = $spStmt->fetch();
        $startDateStr = ($sp && !empty($sp['last_start_date'])) ? $sp['last_start_date'] : $user['created_at'];

        $handsCount = 1;
        if ($sp) {
            $saved = (float)$sp['all_saved'];
            $weeks = (int)$sp['all_weeks'];
            $handsCount = (int)$sp['hands_count'] ?: 1;
        }

        $startDateObj = new DateTime($startDateStr);
        $nextDueObj = clone $startDateObj;
        $nextDueObj->modify('+' . ($weeks * 7) . ' days');
        $nextDueDate = $nextDueObj->format('l, j M');
    } catch (PDOException $e) {
        $nextDueDate = 'Saturday, 18 Jul';
        $handsCount = 1;
    }

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
            'activeHands'         => (int)$handsCount,
            'nextDueDate'         => $nextDueDate,
            'role'                => 'member',
            'needsSecurityUpdate' => (bool)($user['needs_security_update'] ?? 1),
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
