<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

// Note: In production, verify admin session token here.
// For now, we return the stats for the frontend dashboard.

try {
    // Active members
    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
    $activeMembers = (int)$stmt->fetch()['count'];

    // Total Savings collected (sum of all total_saved in savings_plans)
    $stmt = $db->query("SELECT SUM(total_saved) as total FROM savings_plans");
    $totalSavings = (float)$stmt->fetch()['total'] ?? 0;

    // Transfer approvals (pending payments count)
    $stmt = $db->query("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'");
    $pendingTransfers = (int)$stmt->fetch()['count'];

    // Outgoing payouts (sum of amount where status is pending or processing)
    $stmt = $db->query("SELECT SUM(amount) as total FROM payouts WHERE status IN ('pending', 'processing')");
    $outgoingPayouts = (float)$stmt->fetch()['total'] ?? 0;
    
    // Recent payments (for ledger)
    $stmt = $db->query("
            SELECT 
                p.payment_ref as id, 
                p.payment_ref as reference, 
                p.amount, 
            p.channel, 
            p.status, 
            p.purpose, 
            DATE_FORMAT(p.paid_at, '%d %b %Y, %h:%i %p') as date,
            p.member_name as member,
            p.member_id as memberId
        FROM payments p
        ORDER BY p.created_at DESC
        LIMIT 5
    ");
    $recentPayments = $stmt->fetchAll();

    foreach ($recentPayments as &$rp) {
        $rp['amount'] = (float)$rp['amount'];
        if ($rp['channel'] === 'bank_transfer') {
            $rp['channel'] = 'Bank transfer';
        } else if ($rp['channel'] === 'card') {
            $rp['channel'] = 'Card';
        } else if ($rp['channel'] === 'ussd') {
            $rp['channel'] = 'USSD';
        }
    }

    echo json_encode([
        'success' => true,
        'stats' => [
            'activeMembers' => $activeMembers,
            'totalSavings' => $totalSavings,
            'pendingTransfers' => $pendingTransfers,
            'outgoingPayouts' => $outgoingPayouts
        ],
        'recentPayments' => $recentPayments
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
