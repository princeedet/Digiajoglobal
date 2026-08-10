<?php
// ─── DigiAjo Global — Member + Admin Login ──────────────────────────────────
// POST /api/login.php
// Body (JSON): { email, password, role }
// Returns:     { success, role, user }

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
    exit;
}

$email    = strtolower(trim($body['email']    ?? ''));
$password = trim($body['password'] ?? '');
$role     = $body['role'] ?? 'member';

if (!$email || !$password) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

$db = getDB();

// ─── Admin Login ──────────────────────────────────────────────────────────────
if ($role === 'admin') {
    $stmt = $db->prepare('SELECT * FROM admins WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    if (!$admin) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Admin account not found.']);
        exit;
    }

    if (!password_verify($password, $admin['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Incorrect password.']);
        exit;
    }

    // Update last login
    try {
        $db->prepare('UPDATE admins SET last_login = NOW(), last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);
    } catch (PDOException $e) { /* non-fatal */ }

    $adminName = $admin['full_name'] ?: $admin['name'];
    $nameParts = preg_split('/\s+/', trim($adminName));
    $initials  = strtoupper(implode('', array_map(fn($p) => $p[0] ?? '', array_slice($nameParts, 0, 2))));

    echo json_encode([
        'success' => true,
        'role'    => 'admin',
        'user'    => [
            'id'        => 'ADMIN-' . str_pad((string)$admin['id'], 3, '0', STR_PAD_LEFT),
            'name'      => $adminName,
            'email'     => $admin['email'],
            'phone'     => $admin['phone'] ?? '',
            'initials'  => $initials,
            'role'      => 'admin',
            'adminRole' => $admin['role'],
        ],
    ]);
    exit;
}

// ─── Member Login ─────────────────────────────────────────────────────────────
$stmt = $db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Account not found. Please register to get started.']);
    exit;
}

// ─── Password Check ─────────────────────────────────────────────────────────
$passwordOk = false;
if ($user['password_hash'] && password_verify($password, $user['password_hash'])) {
    $passwordOk = true;
} else {
    // Fallback: last 6 digits of phone
    $cleanPhone = preg_replace('/\D/', '', $user['phone']);
    if ($password === substr($cleanPhone, -6)) {
        $passwordOk = true;
    }
}

if (!$passwordOk) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Incorrect password. For new accounts, use the last 6 digits of your phone number.']);
    exit;
}

// ─── Status Checks ───────────────────────────────────────────────────────────
if ($user['status'] === 'pending_verification') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'Your account is pending confirmation of your registration payment. Please check back shortly once admin reviews your transfer.',
    ]);
    exit;
}

if ($user['status'] === 'suspended') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'Your account has been suspended. Please contact administrator support.',
    ]);
    exit;
}

// ─── Fetch Savings Data ───────────────────────────────────────────────────────
$saved = 0;
$weeks = 0;
try {
    $spStmt = $db->prepare('SELECT total_saved, weeks_completed FROM savings_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $spStmt->execute([$user['id']]);
    $sp = $spStmt->fetch();
    if ($sp) { $saved = $sp['total_saved']; $weeks = $sp['weeks_completed']; }
} catch (PDOException $e) { /* non-fatal */ }

// ─── Update last login ─────────────────────────────────────────────────────
try {
    $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);
} catch (PDOException $e) { /* non-fatal */ }

// ─── Response ─────────────────────────────────────────────────────────────────
echo json_encode([
    'success' => true,
    'role'    => 'member',
    'user'    => [
        'id'                  => $user['member_id'],
        'name'                => $user['name'],
        'email'               => $user['email'],
        'phone'               => $user['phone'],
        'initials'            => $user['initials'] ?: strtoupper(substr($user['name'], 0, 2)),
        'joined'              => date('d M Y', strtotime($user['created_at'])),
        'saved'               => (int)$saved,
        'status'              => $user['status'],
        'plan'                => $user['plan_type'] ?? 'Double Up',
        'weeks'               => (int)$weeks,
        'role'                => 'member',
        'needsSecurityUpdate' => (bool)($user['needs_security_update'] ?? 1),
    ],
]);
