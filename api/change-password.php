<?php
// ─── DigiAjo Global — Change Password ────────────────────────────────────────
// POST /api/change-password.php
// Body (JSON): { memberId, currentPassword, newPassword }
// Returns:     { success, message }

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$memberId        = trim($body['memberId']        ?? '');
$currentPassword = trim($body['currentPassword'] ?? '');
$newPassword     = trim($body['newPassword']     ?? '');

if (!$memberId || !$currentPassword || !$newPassword) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'All fields are required.']);
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'New password must be at least 8 characters.']);
    exit;
}

$db   = getDB();
$stmt = $db->prepare('SELECT * FROM users WHERE member_id = ? LIMIT 1');
$stmt->execute([$memberId]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'User not found.']);
    exit;
}

// Verify current password
$passwordOk = false;
if ($user['password_hash'] && password_verify($currentPassword, $user['password_hash'])) {
    $passwordOk = true;
} else {
    $cleanPhone = preg_replace('/\D/', '', $user['phone']);
    if ($currentPassword === substr($cleanPhone, -6)) {
        $passwordOk = true;
    }
}

if (!$passwordOk) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Current password is incorrect.']);
    exit;
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$db->prepare('UPDATE users SET password_hash = ?, needs_security_update = 0, updated_at = NOW() WHERE member_id = ?')
   ->execute([$newHash, $memberId]);

echo json_encode(['success' => true, 'message' => 'Password updated successfully.']);
