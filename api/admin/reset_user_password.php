<?php
// ─── DigiAjo Global — Admin Reset User Password ───────────────────────────────
// POST /api/admin/reset_user_password.php
// Body (JSON): { user_id, new_password }
//   user_id can be the numeric DB id OR the member_id string (e.g. "DA-46147")
// Returns:     { success, message }

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/email.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['user_id']) || empty($body['new_password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'user_id and new_password are required']);
    exit;
}

$userIdRaw   = trim($body['user_id']);
$newPassword = $body['new_password'];

$db = getDB();

// Support both numeric DB id and string member_id (e.g. "DA-46147")
if (ctype_digit($userIdRaw)) {
    // Numeric — query by primary key
    $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$userIdRaw]);
} else {
    // String member_id — query by member_id column
    $stmt = $db->prepare('SELECT id, name, email FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$userIdRaw]);
}

$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'User not found. Please check the member ID and try again.']);
    exit;
}

$passHash = password_hash($newPassword, PASSWORD_BCRYPT);

// Update password in database using the numeric primary key
$update = $db->prepare('UPDATE users SET password_hash = ?, needs_security_update = 1 WHERE id = ?');
$update->execute([$passHash, $user['id']]);

// Notify user by email
$subject = "Your DigiAjo Password Has Been Reset";
$msg = "<p>Hi {$user['name']},</p>
<p>An administrator has reset your DigiAjo account password.</p>
<p>Your new temporary password is: <strong>$newPassword</strong></p>
<p>Please log in and update your password in your account settings.</p>
<p>If you did not request this change, please contact support immediately.</p>";

send_email($user['email'], $subject, $msg);

echo json_encode(['success' => true, 'message' => "Password reset successfully for {$user['name']}. They have been notified by email."]);
