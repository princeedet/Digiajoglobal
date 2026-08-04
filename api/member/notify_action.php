<?php
// ─── DigiAjo Global — Action Notification Utility ──────────────────────────────
// POST /api/member/notify_action.php
// Body: { userId, email, name, action }
require_once __DIR__ . '/../utils/email.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['email']) || empty($body['name']) || empty($body['action'])) {
    http_response_code(400);
    exit;
}

$email = $body['email'];
$name = $body['name'];
$action = $body['action'];

$adminEmail = "admin@digiajoglobal.com";

// Determine the message based on the action
if ($action === 'update_profile') {
    $subject = "Profile Updated Successfully";
    $msg = "<p>Hi $name,</p><p>You have successfully updated your profile settings on DigiAjo Global.</p>";
    $adminMsg = "<p>Member $name ($email) updated their profile details.</p>";
} elseif ($action === 'update_password') {
    $subject = "Password Changed Successfully";
    $msg = "<p>Hi $name,</p><p>You have successfully changed your password. If this wasn't you, please contact support immediately.</p>";
    $adminMsg = "<p>Member $name ($email) changed their password.</p>";
} elseif ($action === 'make_payment') {
    $subject = "Payment Initiated";
    $amount = isset($body['amount']) ? $body['amount'] : '';
    $msg = "<p>Hi $name,</p><p>Your payment attempt/demo for $amount has been recorded.</p>";
    $adminMsg = "<p>Member $name ($email) initiated a payment demo for $amount.</p>";
} else {
    // Unknown action
    echo json_encode(['success' => true]);
    exit;
}

// Send to user
send_email($email, $subject, $msg);

// Send to admin
send_email($adminEmail, "Member Activity: $subject", $adminMsg);

echo json_encode(['success' => true]);
