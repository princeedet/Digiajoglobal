<?php
// ─── DigiAjo Global — Fetch & Update Member Bank Account Details ──────────────
// GET  /api/member/bank.php?member_id=...[&email=...]
// POST /api/member/bank.php

require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

// Ensure bank_accounts table exists
$db->exec("
    CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(30) NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        is_primary TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

try {
    if ($method === 'GET') {
        $userParam   = trim($_GET['member_id'] ?? $_GET['id'] ?? '');
        $emailParam  = trim($_GET['email'] ?? '');
        $nameParam   = trim($_GET['name'] ?? '');
        $userCleanId = preg_replace('/\D/', '', $userParam);

        if (!$userParam && !$emailParam && !$nameParam) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User identifier is required']);
            exit;
        }

        // Find user
        $stmt = $db->prepare('
            SELECT id FROM users 
            WHERE (NULLIF(?, "") IS NOT NULL AND member_id = ?) 
               OR (NULLIF(?, "") IS NOT NULL AND email = ?) 
               OR (NULLIF(?, "") IS NOT NULL AND email = ?)
               OR (NULLIF(?, "") IS NOT NULL AND id = ?)
               OR (NULLIF(?, "") IS NOT NULL AND name = ?)
            LIMIT 1
        ');
        $stmt->execute([
            $userParam, $userParam,
            $userParam, $userParam,
            $emailParam, $emailParam,
            $userCleanId, $userCleanId,
            $nameParam, $nameParam
        ]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user && $nameParam) {
            $stmt = $db->prepare('SELECT id FROM users WHERE name LIKE ? LIMIT 1');
            $stmt->execute(['%' . $nameParam . '%']);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        $userId = (int)$user['id'];

        // Fetch primary bank account
        $stmt = $db->prepare('SELECT bank_name, account_number, account_name FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC, id DESC LIMIT 1');
        $stmt->execute([$userId]);
        $bank = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$bank) {
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
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $userParam     = trim($input['member_id'] ?? $input['id'] ?? '');
        $emailParam    = trim($input['email'] ?? '');
        $nameParam     = trim($input['name'] ?? '');
        $bankName      = trim($input['bank_name'] ?? $input['bankName'] ?? '');
        $accountNumber = trim($input['account_number'] ?? $input['accountNumber'] ?? '');
        $accountName   = trim($input['account_name'] ?? $input['accountName'] ?? '');
        $userCleanId   = preg_replace('/\D/', '', $userParam);

        if (!$bankName || !$accountNumber || !$accountName) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Bank name, account number, and account name are required']);
            exit;
        }

        // Find user
        $stmt = $db->prepare('
            SELECT id FROM users 
            WHERE (NULLIF(?, "") IS NOT NULL AND member_id = ?) 
               OR (NULLIF(?, "") IS NOT NULL AND email = ?) 
               OR (NULLIF(?, "") IS NOT NULL AND email = ?)
               OR (NULLIF(?, "") IS NOT NULL AND id = ?)
               OR (NULLIF(?, "") IS NOT NULL AND name = ?)
            LIMIT 1
        ');
        $stmt->execute([
            $userParam, $userParam,
            $userParam, $userParam,
            $emailParam, $emailParam,
            $userCleanId, $userCleanId,
            $nameParam, $nameParam
        ]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user && $nameParam) {
            $stmt = $db->prepare('SELECT id FROM users WHERE name LIKE ? LIMIT 1');
            $stmt->execute(['%' . $nameParam . '%']);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        $userId = (int)$user['id'];

        // Upsert bank account
        $stmt = $db->prepare('SELECT id FROM bank_accounts WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $exists = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($exists) {
            $stmt = $db->prepare('UPDATE bank_accounts SET bank_name = ?, account_number = ?, account_name = ?, is_primary = 1, updated_at = NOW() WHERE user_id = ?');
            $stmt->execute([$bankName, $accountNumber, $accountName, $userId]);
        } else {
            $stmt = $db->prepare('INSERT INTO bank_accounts (user_id, bank_name, account_number, account_name, is_primary) VALUES (?, ?, ?, ?, 1)');
            $stmt->execute([$userId, $bankName, $accountNumber, $accountName]);
        }

        // Clear security update flag on user
        try {
            $db->prepare('UPDATE users SET needs_security_update = 0 WHERE id = ?')->execute([$userId]);
        } catch (Exception $e) {}

        echo json_encode([
            'success' => true,
            'message' => 'Payout details saved successfully',
            'bank' => [
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
                'account_name' => $accountName
            ]
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
