<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$memberId = $_GET['member_id'] ?? '';
if (!$memberId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id is required']);
    exit;
}

try {
    $stmt = $db->prepare("
        SELECT 
            p.id as _dbId,
            p.payment_ref as id,
            p.member_name as member,
            p.member_id as memberId,
            p.amount,
            DATE_FORMAT(p.created_at, '%d %b %Y, %h:%i %p') as date,
            p.payment_ref as reference,
            p.channel,
            p.status,
            p.purpose
        FROM payments p
        WHERE p.member_id = ?
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([$memberId]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($payments as &$p) {
        $p['amount'] = (float)$p['amount'];
        if ($p['channel'] === 'bank_transfer') {
            $p['channel'] = 'Bank transfer';
        } else if ($p['channel'] === 'card') {
            $p['channel'] = 'Card';
        } else if ($p['channel'] === 'ussd') {
            $p['channel'] = 'USSD';
        }
    }

    echo json_encode([
        'success' => true,
        'payments' => $payments
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
