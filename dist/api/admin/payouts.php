<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/email.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['member_id'] ?? $input['member'] ?? null;
$amount = (float)($input['amount'] ?? 0);
$reason = $input['reason'] ?? '';
$notes = $input['notes'] ?? '';

if (!$userId || $amount <= 0) {
    echo json_encode(['success' => false, 'error' => 'Valid member and amount are required.']);
    exit;
}

$payoutType = 'manual';
if (strpos($reason, 'Double Up') !== false) {
    $payoutType = 'double_up_cashout';
} elseif (strpos($reason, 'Referral') !== false) {
    $payoutType = 'referral_commission';
} elseif (strpos($reason, 'DigiMart') !== false) {
    $payoutType = 'digimart_return';
}

$db = getDB();

try {
    $stmt = $db->prepare('SELECT id, name, email FROM users WHERE member_id = ? OR id = ? LIMIT 1');
    $stmt->execute([$userId, is_numeric($userId) ? (int)$userId : 0]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'error' => 'User not found.']);
        exit;
    }

    $internalUserId = $user['id'];

    $payoutRef = 'PO-' . strtoupper(uniqid());

    // Insert payout
    $stmt = $db->prepare("INSERT INTO payouts (payout_ref, user_id, amount, payout_type, status, notes) VALUES (?, ?, ?, ?, 'pending', ?)");
    $stmt->execute([$payoutRef, $internalUserId, $amount, $payoutType, $notes]);
    $payoutId = $db->lastInsertId();

    // Insert notification
    $notifTitle = "Payout Scheduled";
    $notifBody = "A payout of ₦" . number_format($amount) . " has been scheduled for your account. Reason: $reason.";
    if ($notes) {
        $notifBody .= "\n\nNote: $notes";
    }

    $stmt = $db->prepare("INSERT INTO notifications (title, body, kind, audience, target_user) VALUES (?, ?, 'payout', 'specific_user', ?)");
    $stmt->execute([$notifTitle, $notifBody, $internalUserId]);

    // Send email
    $emailBody = "<p>Hi {$user['name']},</p><p>" . nl2br($notifBody) . "</p>";
    try {
        send_email($user['email'], $notifTitle, $emailBody);
    } catch (Exception $e) {}

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
