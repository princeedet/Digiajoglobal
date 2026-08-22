<?php
require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

// Note: In production, verify admin session token here.
// For now, we return the stats for the frontend dashboard.

try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS payouts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    $db->exec("
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            payment_ref VARCHAR(100),
            amount DECIMAL(12,2) NOT NULL,
            channel VARCHAR(50),
            status VARCHAR(50) DEFAULT 'pending',
            purpose VARCHAR(255),
            member_name VARCHAR(100),
            member_id VARCHAR(50),
            paid_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Active members
    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
    $activeMembers = (int)($stmt->fetch()['count'] ?? 0);

    // Total Savings collected (aggregated across payments, users, and savings_plans)
    $stmt = $db->query("
        SELECT GREATEST(
            COALESCE((SELECT SUM(total_saved) FROM savings_plans), 0),
            COALESCE((SELECT SUM(saved) FROM users WHERE status = 'active'), 0),
            COALESCE((
                SELECT SUM(amount) FROM payments 
                WHERE status IN ('approved', 'confirmed', 'success') 
                  AND amount != 2000 
                  AND (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine'))
                  AND (purpose IS NULL OR (
                      LOWER(purpose) NOT LIKE '%registration%' 
                      AND LOWER(purpose) NOT LIKE '%reg fee%' 
                      AND LOWER(purpose) NOT LIKE '%one-time%'
                      AND LOWER(purpose) NOT LIKE '%fine%'
                  ))
            ), 0)
        ) as total
    ");
    $totalSavings = (float)($stmt->fetch()['total'] ?? 0);

    // Transfer approvals (pending payments count)
    $stmt = $db->query("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'");
    $pendingTransfers = (int)($stmt->fetch()['count'] ?? 0);

    // Outgoing payouts (sum of amount where status is pending or processing)
    $stmt = $db->query("SELECT COALESCE(SUM(amount), 0) as total FROM payouts WHERE status IN ('pending', 'processing')");
    $outgoingPayouts = (float)($stmt->fetch()['total'] ?? 0);
    
    // Recent payments (for ledger / dashboard)
    $stmt = $db->query("
        SELECT 
            p.id as _dbId,
            COALESCE(NULLIF(p.payment_ref, ''), CONCAT('PAY-', p.id)) as id, 
            COALESCE(NULLIF(p.payment_ref, ''), CONCAT('PAY-', p.id)) as reference, 
            p.amount, 
            COALESCE(p.channel, 'bank_transfer') as channel, 
            COALESCE(p.status, 'pending') as status, 
            COALESCE(p.purpose, 'Registration Fee') as purpose, 
            DATE_FORMAT(COALESCE(p.paid_at, p.created_at, NOW()), '%d %b %Y, %h:%i %p') as date,
            COALESCE(p.member_name, u.name, 'Member') as member,
            COALESCE(p.member_id, u.member_id, CONCAT('DA-', p.user_id)) as memberId,
            COALESCE(p.payment_type, 'registration_fee') as payment_type
        FROM payments p
        LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT 10
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
