<?php
// ─── DigiAjo Global — Forgot Password ──────────────────────────────────────────
// POST /api/forgot_password.php
// Body (JSON): { email }
// Returns:     { success, message }

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/utils/email.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email is required']);
    exit;
}

$email = strtolower(trim($body['email']));
$db = getDB();

// Find user
$stmt = $db->prepare('SELECT id, name FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    // For security reasons, don't reveal if the email exists or not
    echo json_encode(['success' => true, 'message' => 'If an account exists with that email, a temporary password has been sent.']);
    exit;
}

// Generate an 8-character alphanumeric temporary password
$tempPassword = substr(str_shuffle('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'), 0, 8);
$passHash = password_hash($tempPassword, PASSWORD_BCRYPT);

// Update database
$update = $db->prepare('UPDATE users SET password_hash = ?, needs_security_update = 1 WHERE id = ?');
$update->execute([$passHash, $user['id']]);

// Send Email
$subject = "Your Temporary Password";
$msg = "<p>Hi {$user['name']},</p>
<p>You requested a password reset. Your temporary password is:</p>
<h3 style='background-color:#eee; padding:10px; display:inline-block; border-radius:5px;'>$tempPassword</h3>
<p>Please log in using this temporary password and update your password immediately in your account settings.</p>";

send_email($email, $subject, $msg);

echo json_encode(['success' => true, 'message' => 'If an account exists with that email, a temporary password has been sent.']);
