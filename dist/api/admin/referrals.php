<?php
// ─── DigiAjo Global — Fetch All Referrals ──────────────────────────────────────
// GET /api/admin/referrals.php

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$db = getDB();

try {
    $stmt = $db->query("
        SELECT 
            r.id,
            referrer.name as referrer_name,
            referrer.member_id as referrer_id,
            referee.name as referee_name,
            referee.phone as referee_phone,
            DATE_FORMAT(r.created_at, '%d %b %Y') as date,
            r.status,
            r.commission
        FROM referrals r
        JOIN users referrer ON r.referrer_id = referrer.id
        JOIN users referee ON r.referee_id = referee.id
        ORDER BY r.created_at DESC
    ");
    $referrals = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'referrals' => $referrals
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
