<?php
// ─── DigiAjo Global — Fetch Member Referrals ──────────────────────────────────
// GET /api/member/referrals.php?member_id=...
// Returns: { success: true, count, earned, activeCount, list: [...] }

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$memberId = $_GET['member_id'] ?? '';
if (!$memberId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing member_id']);
    exit;
}

$db = getDB();

try {
    // 1. Get the internal user ID for this member_id
    $stmt = $db->prepare('SELECT id, referral_code FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$memberId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $userId = (int)$user['id'];
    $referralCode = $user['referral_code'];

    // 2. Fetch referrals where referrer_id = $userId
    $stmt = $db->prepare("
        SELECT 
            r.id,
            u.name,
            u.phone,
            DATE_FORMAT(u.created_at, '%d %b %Y') as joined,
            r.status,
            r.commission
        FROM referrals r
        JOIN users u ON r.referee_id = u.id
        WHERE r.referrer_id = ?
        ORDER BY r.created_at DESC
    ");
    $stmt->execute([$userId]);
    $referrals = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $count = count($referrals);
    $activeCount = 0;
    $earned = 0;
    $list = [];

    foreach ($referrals as $ref) {
        if ($ref['status'] === 'active' || $ref['status'] === 'paid') {
            $activeCount++;
            $earned += (float)$ref['commission'];
        }

        $list[] = [
            'name' => $ref['name'],
            'phone' => substr($ref['phone'], 0, 4) . '***' . substr($ref['phone'], -3), // mask phone
            'joined' => $ref['joined'],
            'status' => $ref['status'], // 'pending', 'active', 'paid'
            'earnings' => ($ref['status'] === 'active' || $ref['status'] === 'paid') ? (float)$ref['commission'] : 0
        ];
    }

    echo json_encode([
        'success' => true,
        'referralCode' => $referralCode,
        'count' => $count,
        'activeCount' => $activeCount,
        'earned' => $earned,
        'list' => $list
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
