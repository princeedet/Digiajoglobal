<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$memberId = trim($_GET['member_id'] ?? '');
$email    = strtolower(trim($_GET['email'] ?? ''));
$name     = trim($_GET['name'] ?? '');

if (!$memberId && !$email && !$name) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id, email or name is required']);
    exit;
}

try {
    // 1. Resolve User
    $cleanId = is_numeric($memberId) ? (int)$memberId : (int)preg_replace('/\D/', '', $memberId);
    $uStmt = $db->prepare("
        SELECT id, member_id, name, email, plan_type, saved, weeks, status, registration_fee_paid, created_at
        FROM users
        WHERE (member_id = ? AND member_id != '')
           OR (id = ? AND ? > 0)
           OR (member_id = CONCAT('DA-', ?) AND ? > 0)
           OR (email = ? AND email != '')
           OR (name = ? AND name != '')
        LIMIT 1
    ");
    $uStmt->execute([$memberId, $cleanId, $cleanId, $cleanId, $cleanId, $email, $name]);
    $user = $uStmt->fetch(PDO::FETCH_ASSOC);

    $dbUserId         = $user ? (int)$user['id'] : $cleanId;
    $officialMemberId = $user ? ($user['member_id'] ?: ('DA-' . $user['id'])) : $memberId;
    $userName         = $user ? $user['name'] : $name;
    $userEmail        = $user ? $user['email'] : $email;

    // 2. Query Payments
    $stmt = $db->prepare("
        SELECT 
            p.id as _dbId,
            COALESCE(NULLIF(p.payment_ref, ''), CONCAT('PAY-', p.id)) as id,
            COALESCE(p.member_name, ?) as member,
            COALESCE(p.member_id, ?) as memberId,
            p.amount,
            DATE_FORMAT(COALESCE(p.paid_at, p.created_at, NOW()), '%d %b %Y, %h:%i %p') as date,
            COALESCE(NULLIF(p.payment_ref, ''), CONCAT('PAY-', p.id)) as reference,
            COALESCE(p.channel, 'bank_transfer') as channel,
            COALESCE(p.status, 'pending') as status,
            COALESCE(p.purpose, 'Registration Fee') as purpose,
            COALESCE(p.payment_type, 'registration_fee') as payment_type
        FROM payments p
        WHERE (p.user_id IS NOT NULL AND p.user_id > 0 AND p.user_id = ?)
           OR (p.member_id = ? AND ? != '')
           OR (p.member_id = ? AND ? != '')
           OR (p.member_id = CONCAT('DA-', ?) AND ? > 0)
           OR (p.member_name = ? AND ? != '')
        ORDER BY p.created_at DESC, p.id DESC
    ");
    $stmt->execute([
        $userName,
        $officialMemberId,
        $dbUserId,
        $officialMemberId, $officialMemberId,
        $memberId, $memberId,
        $dbUserId, $dbUserId,
        $userName, $userName
    ]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($payments as &$p) {
        $p['amount'] = (float)$p['amount'];
        $ch = strtolower($p['channel'] ?? '');
        if ($ch === 'bank_transfer' || $ch === 'bank') {
            $p['channel'] = 'Bank transfer';
        } else if ($ch === 'card' || $ch === 'paystack') {
            $p['channel'] = 'Card';
        } else if ($ch === 'flutterwave') {
            $p['channel'] = 'Flutterwave';
        } else if ($ch === 'ussd') {
            $p['channel'] = 'USSD';
        }
    }
    unset($p);

    echo json_encode([
        'success'  => true,
        'payments' => $payments
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
