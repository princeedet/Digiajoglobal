<?php
// ─── DigiAjo Global — Delete Savings Hand ───────────────────────────────────
// POST /api/member/delete_hand.php
// Body: { member_id, plan_id }

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['member_id']) || empty($body['plan_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id and plan_id are required']);
    exit;
}

$memberId = trim($body['member_id']);
$planId   = (int)$body['plan_id'];

$db = getDB();

try {
    // Look up user
    $stmt = $db->prepare('SELECT id, name FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$memberId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $userId = $user['id'];

    // Verify the savings plan exists and belongs to this user
    $checkStmt = $db->prepare('SELECT id FROM savings_plans WHERE id = ? AND user_id = ? LIMIT 1');
    $checkStmt->execute([$planId, $userId]);
    $plan = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$plan) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Savings hand not found']);
        exit;
    }

    $db->beginTransaction();

    // 1. Delete associated fines
    try {
        $db->prepare('DELETE FROM fines WHERE savings_plan_id = ? AND user_id = ?')->execute([$planId, $userId]);
    } catch (PDOException $e) {}

    // 2. Delete associated savings records
    try {
        $db->prepare('DELETE FROM savings_records WHERE plan_id = ?')->execute([$planId]);
    } catch (PDOException $e) {}

    // 3. Delete payments linked to this savings plan
    try {
        $db->prepare('DELETE FROM payments WHERE savings_plan_id = ? AND user_id = ?')->execute([$planId, $userId]);
    } catch (PDOException $e) {}

    // 4. Delete the savings plan itself
    $db->prepare('DELETE FROM savings_plans WHERE id = ? AND user_id = ?')->execute([$planId, $userId]);

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Savings hand deleted successfully.'
    ]);

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
