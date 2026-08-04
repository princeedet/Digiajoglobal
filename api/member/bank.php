<?php
// ─── DigiAjo Global — Fetch & Update Member Bank Account Details ──────────────
// GET  /api/member/bank.php?member_id=...
// POST /api/member/bank.php

require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $memberId = $_GET['member_id'] ?? '';
        if (!$memberId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'member_id is required']);
            exit;
        }

        // Get internal user ID
        $stmt = $db->prepare('SELECT id FROM users WHERE member_id = ? LIMIT 1');
        $stmt->execute([$memberId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        $userId = (int)$user['id'];

        // Fetch primary bank account
        $stmt = $db->prepare('SELECT bank_name, account_number, account_name FROM bank_accounts WHERE user_id = ? AND is_primary = 1 LIMIT 1');
        $stmt->execute([$userId]);
        $bank = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$bank) {
            // Return empty defaults if not set yet
            $bank = [
                'bank_name' => '',
                'account_number' => '',
                'account_name' => ''
            ];
        }

        echo json_encode(['success' => true, 'bank' => $bank]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $memberId = $input['member_id'] ?? '';
        $bankName = trim($input['bank_name'] ?? '');
        $accountNumber = trim($input['account_number'] ?? '');
        $accountName = trim($input['account_name'] ?? '');

        if (!$memberId || !$bankName || !$accountNumber || !$accountName) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'All bank details fields are required']);
            exit;
        }

        // Get internal user ID
        $stmt = $db->prepare('SELECT id FROM users WHERE member_id = ? LIMIT 1');
        $stmt->execute([$memberId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        $userId = (int)$user['id'];

        // Check if bank account already exists
        $stmt = $db->prepare('SELECT id FROM bank_accounts WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $exists = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($exists) {
            $stmt = $db->prepare('UPDATE bank_accounts SET bank_name = ?, account_number = ?, account_name = ? WHERE user_id = ?');
            $stmt->execute([$bankName, $accountNumber, $accountName, $userId]);
        } else {
            $stmt = $db->prepare('INSERT INTO bank_accounts (user_id, bank_name, account_number, account_name, is_primary) VALUES (?, ?, ?, ?, 1)');
            $stmt->execute([$userId, $bankName, $accountNumber, $accountName]);
        }

        echo json_encode(['success' => true, 'message' => 'Bank details saved successfully']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
