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
$planId    = (int)$body['savings_plan_id'];
$channel   = trim($body['channel'] ?? 'bank_transfer');
$reference = trim($body['reference'] ?? '');
$purpose   = trim($body['purpose'] ?? 'Savings contribution');

// ── Business rule: 1 hand = ₦1,300 ─────────────────────────────────────────
$hands        = max(1, (int)($body['hands'] ?? 1));
$weeksCovered = max(1, (int)($body['weeks_covered'] ?? 1));
$scope        = 'weekly'; // always weekly for hands

$db = getDB();

try {
    // Look up the user
    $stmt = $db->prepare('SELECT id, name, email FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$memberId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

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
    // The admin approves this one record, and savings_history.php expands it
    // into `weeks_covered` individual week slots when displaying to the user.
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
        $memberId,
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

    $msg = $hands > 1
        ? "Payment received for {$handsLabel} ({$weeksLabel}). Once approved, ₦" . number_format(1300, 2) . " will be allocated to each of your {$weeksLabel}."
        : "Weekly payment received. Admin will verify your transfer shortly.";

    echo json_encode([
        'success'   => true,
        'reference' => $reference,
        'message'   => $msg,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
