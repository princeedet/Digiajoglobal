<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils/email.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['member_id']) || empty($body['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id and amount are required']);
    exit;
}

$memberId  = trim($body['member_id']);
$amount    = (float)$body['amount'];
$planId    = !empty($body['savings_plan_id']) ? (int)$body['savings_plan_id'] : null;
$channel   = trim($body['channel'] ?? 'bank_transfer');
$reference = trim($body['reference'] ?? '');
$purpose   = trim($body['purpose'] ?? 'Savings contribution');

// ── Business rule: 1 hand = ₦1,300/week ─────────────────────────────────────
$hands        = max(1, (int)($body['hands'] ?? 1));
$weeksCovered = max(1, (int)($body['weeks_covered'] ?? 1));
$scope        = 'weekly';

$db = getDB();

try {
    $userEmail = trim($body['email'] ?? '');
    $userName  = trim($body['name'] ?? '');

    // Look up the user by member_id, numeric id, email, or name
    $cleanId = is_numeric($memberId) ? (int)$memberId : (int)preg_replace('/\D/', '', $memberId);
    $stmt = $db->prepare('
        SELECT id, name, email, member_id FROM users 
        WHERE (member_id = ? AND member_id != "") 
           OR (email = ? AND email != "") 
           OR (email = ? AND email != "") 
           OR (name = ? AND name != "")
           OR (id = ? AND ? > 0) 
        LIMIT 1
    ');
    $stmt->execute([$memberId, $memberId, $userEmail, $userName, $cleanId, $cleanId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $officialMemberId = $user['member_id'] ?: ('DA-' . $user['id']);

    // Generate reference if not provided
    if (empty($reference)) {
        $reference = 'TXN-' . strtoupper(bin2hex(random_bytes(6)));
    }

    // ── Auto-add columns if they don't exist yet ─────────────────────────────
    $cols = $db->query("SHOW COLUMNS FROM payments LIKE 'hands'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE payments
            ADD COLUMN hands        SMALLINT NOT NULL DEFAULT 1        AFTER purpose,
            ADD COLUMN payment_scope VARCHAR(20) NOT NULL DEFAULT 'weekly' AFTER hands,
            ADD COLUMN weeks_covered SMALLINT NOT NULL DEFAULT 1        AFTER payment_scope
        ");
    }

    // ── Insert the single payment record ─────────────────────────────────────
    $stmt = $db->prepare("
        INSERT INTO payments
            (payment_ref, user_id, member_id, member_name, amount, channel,
             payment_type, status, payment_status, purpose, hands, payment_scope,
             weeks_covered, savings_plan_id, created_at)
        VALUES
            (?, ?, ?, ?, ?, ?, 'weekly_contribution', 'pending', 'pending', ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $reference,
        $user['id'],
        $officialMemberId,
        $user['name'],
        $amount,
        $channel,
        $purpose,
        $hands,
        $scope,
        $weeksCovered,
        $planId
    ]);

    // ── Emails ────────────────────────────────────────────────────────────────
    $handsLabel = $hands . ' ' . ($hands === 1 ? 'hand' : 'hands');
    $weeksLabel = $weeksCovered . ' ' . ($weeksCovered === 1 ? 'week' : 'weeks');
    $rateNote   = $weeksCovered > 1
        ? "This covers {$weeksLabel} — ₦" . number_format(1300 * $hands / $weeksCovered, 2) . " per week spread across {$weeksLabel} once approved."
        : "This covers 1 weekly slot.";

    // ── Insert In-App Notification for Member ────────────────────────────────
    try {
        $notifTitle = "Savings Payment Submitted";
        $notifBody = "Your contribution of ₦" . number_format($amount, 2) . " ({$handsLabel}, {$weeksLabel}, Ref: {$reference}) has been received and is pending admin verification.";
        insert_notification($db, [
            'user_id'     => $user['id'],
            'member_id'   => $memberId,
            'target_user' => $user['id'],
            'audience'    => 'specific_user',
            'title'       => $notifTitle,
            'body'        => $notifBody,
            'message'     => $notifBody,
            'kind'        => 'info',
            'type'        => 'info',
            'sent_at'     => date('Y-m-d H:i:s'),
        ]);
    } catch (Exception $e) {}

    $subjectUser = "Payment Submission Received — Pending Confirmation";
    $msgUser = "<p>Hi {$user['name']},</p>
    <p>We received your payment of <strong>₦" . number_format($amount, 2) . "</strong> via Bank Transfer.</p>
    <p><strong>Hands:</strong> {$handsLabel} &nbsp;|&nbsp; <strong>Weeks covered:</strong> {$weeksLabel}</p>
    <p><strong>Reference:</strong> {$reference}</p>
    <p>{$rateNote}</p>
    <p>Our admin will verify your transfer and your savings history will update once approved.</p>";
    send_email($user['email'], $subjectUser, $msgUser);

    $subjectAdmin = "New Payment Submitted — {$user['name']} ({$memberId})";
    $msgAdmin = "<p><strong>{$user['name']}</strong> ({$memberId}) submitted a payment.</p>
    <p><strong>Amount:</strong> ₦" . number_format($amount, 2) . "</p>
    <p><strong>Hands:</strong> {$handsLabel} &nbsp;|&nbsp; <strong>Weeks:</strong> {$weeksLabel}</p>
    <p><strong>Reference:</strong> {$reference}</p>
    <p>Please approve or reject it in the admin command centre.</p>";
    send_email('admin@digiajoglobal.com', $subjectAdmin, $msgAdmin);

    if ($weeksCovered > 1 && $hands > 1) {
        $weeklyTotal = 1300 * $hands;
        $msg = "Payment of ₦" . number_format($amount, 2) . " received for {$handsLabel} across {$weeksLabel}. Once approved, ₦" . number_format($weeklyTotal, 2) . " will be allocated across each of your {$weeksLabel} (₦1,300.00 per hand/week).";
    } elseif ($hands > 1) {
        $msg = "Payment of ₦" . number_format($amount, 2) . " received for {$handsLabel} (Week " . max(1, $weeksCovered) . "). Once approved, ₦1,300.00 will be allocated to each of your {$handsLabel}.";
    } elseif ($weeksCovered > 1) {
        $msg = "Payment of ₦" . number_format($amount, 2) . " received for {$weeksLabel} (1 hand). Once approved, ₦1,300.00 will be credited across each of your {$weeksLabel}.";
    } else {
        $msg = "Weekly payment of ₦" . number_format($amount, 2) . " received. Once approved, ₦1,300.00 will be credited to your savings.";
    }

    echo json_encode([
        'success'   => true,
        'reference' => $reference,
        'message'   => $msg,
        'hands'     => $hands,
        'weeks'     => $weeksCovered,
        'amount'    => $amount,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
