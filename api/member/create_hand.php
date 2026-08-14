<?php
// ─── DigiAjo Global — Create Additional Savings Hand ───────────────────────
// POST /api/member/create_hand.php
// Body: { member_id, plan_type (optional, default 'double_up') }

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['member_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id is required']);
    exit;
}

$memberId = trim($body['member_id']);
$planType = trim($body['plan_type'] ?? 'double_up');

$db = getDB();

try {
    // Look up the user
    $stmt = $db->prepare('SELECT id, name FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$memberId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $userId = $user['id'];

    // Insert new savings plan (Hand)
    $stmt = $db->prepare("
        INSERT INTO savings_plans
            (user_id, start_date, plan_type, status)
        VALUES (?, CURDATE(), ?, 'active')
    ");
    $stmt->execute([$userId, $planType]);
    $planId = $db->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'New hand created successfully!',
        'plan_id' => $planId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
