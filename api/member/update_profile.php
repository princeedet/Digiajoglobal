<?php
// ─── DigiAjo Global — Update Member Profile & Security ────────────────────────
// POST /api/member/update_profile.php
// Body (JSON): { member_id, email, name, phone, password }

require_once __DIR__ . '/../config.php';
$db = getDB();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$data       = json_decode(file_get_contents('php://input'), true) ?? [];
$userParam  = trim($data['member_id'] ?? $data['id'] ?? '');
$emailParam = trim($data['email'] ?? '');
$nameParam  = trim($data['name'] ?? '');
$phoneParam = trim($data['phone'] ?? '');
$password   = trim($data['password'] ?? '');
$userCleanId = preg_replace('/\D/', '', $userParam);

if (!$userParam && !$emailParam && !$nameParam) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User identifier is required']);
    exit;
}

try {
    // 1. Find the user
    $stmt = $db->prepare('
        SELECT * FROM users 
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
        $stmt = $db->prepare('SELECT * FROM users WHERE name LIKE ? LIMIT 1');
        $stmt->execute(['%' . $nameParam . '%']);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $userId = (int)$user['id'];
    $finalName  = $nameParam ?: $user['name'];
    $finalEmail = $emailParam ?: $user['email'];
    $finalPhone = $phoneParam ?: $user['phone'];
    $initials   = strtoupper(substr(trim($finalName), 0, 2));

    // 2. Update user profile and clear needs_security_update
    if (!empty($password)) {
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters']);
            exit;
        }
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $upStmt = $db->prepare('
            UPDATE users 
            SET name = ?, email = ?, phone = ?, initials = ?, password_hash = ?, needs_security_update = 0, updated_at = NOW() 
            WHERE id = ?
        ');
        $upStmt->execute([$finalName, $finalEmail, $finalPhone, $initials, $passwordHash, $userId]);
    } else {
        $upStmt = $db->prepare('
            UPDATE users 
            SET name = ?, email = ?, phone = ?, initials = ?, needs_security_update = 0, updated_at = NOW() 
            WHERE id = ?
        ');
        $upStmt->execute([$finalName, $finalEmail, $finalPhone, $initials, $userId]);
    }

    try {
        insert_notification($db, [
            'user_id'     => $userId,
            'member_id'   => $user['member_id'] ?? null,
            'target_user' => $userId,
            'audience'    => 'specific_user',
            'title'       => !empty($password) ? 'Security & Profile Updated' : 'Profile Updated',
            'body'        => !empty($password) ? 'Your security password and account profile information were updated successfully.' : 'Your profile details were updated successfully.',
            'message'     => !empty($password) ? 'Your security password and account profile information were updated successfully.' : 'Your profile details were updated successfully.',
            'kind'        => 'info',
            'type'        => 'info',
            'sent_at'     => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {}

    // 3. Return updated user
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully and security check completed',
        'user' => [
            'id'                  => $user['member_id'] ?: "DA-{$userId}",
            'name'                => $finalName,
            'email'               => $finalEmail,
            'phone'               => $finalPhone,
            'initials'            => $initials,
            'joined'              => date('d M Y', strtotime($user['created_at'])),
            'saved'               => (int)($user['saved'] ?? 0),
            'status'              => $user['status'],
            'plan'                => $user['plan_type'] ?? 'Double Up',
            'weeks'               => (int)($user['weeks'] ?? 0),
            'role'                => 'member',
            'needsSecurityUpdate' => false,
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
