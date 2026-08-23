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
    
    // Parse permissions if role is support (staff)
    $permissions = [];
    if ($admin['role'] === 'support' && !empty($admin['permissions'])) {
        $permissions = json_decode($admin['permissions'], true) ?: [];
    }

    echo json_encode([
        'success' => true,
        'role'    => 'admin',
        'user'    => [
            'id'          => 'ADMIN-' . str_pad((string)$admin['id'], 3, '0', STR_PAD_LEFT),
            'name'        => $adminName,
            'email'       => $admin['email'],
            'phone'       => $admin['phone'] ?? '',
            'initials'    => $initials,
            'role'        => 'admin',
            'adminRole'   => $admin['role'], // 'super_admin' or 'support'
            'permissions' => $permissions
        ],
    ]);
    exit;
}

// ─── Member Login ─────────────────────────────────────────────────────────────
$stmt = $db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    // Fallback: Check if they are actually an admin who forgot to select the Admin role
    $stmtAdmin = $db->prepare('SELECT * FROM admins WHERE email = ? LIMIT 1');
    $stmtAdmin->execute([$email]);
    $admin = $stmtAdmin->fetch();
    
    if ($admin) {
        if (!password_verify($password, $admin['password_hash'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Incorrect password.']);
            exit;
        }

        try {
            $db->prepare('UPDATE admins SET last_login = NOW(), last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);
        } catch (PDOException $e) { /* non-fatal */ }

        $adminName = $admin['full_name'] ?: $admin['name'];
        $nameParts = preg_split('/\s+/', trim($adminName));
        $initials  = strtoupper(implode('', array_map(fn($p) => $p[0] ?? '', array_slice($nameParts, 0, 2))));
        
        $permissions = [];
        if ($admin['role'] === 'support' && !empty($admin['permissions'])) {
            $permissions = json_decode($admin['permissions'], true) ?: [];
        }

        echo json_encode([
            'success' => true,
            'role'    => 'admin',
            'user'    => [
                'id'          => 'ADMIN-' . str_pad((string)$admin['id'], 3, '0', STR_PAD_LEFT),
                'name'        => $adminName,
                'email'       => $admin['email'],
                'phone'       => $admin['phone'] ?? '',
                'initials'    => $initials,
                'role'        => 'admin',
                'adminRole'   => $admin['role'],
                'permissions' => $permissions
            ],
        ]);
        exit;
    }

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

// ─── Status Checks & Auto-Healing ───────────────────────────────────────────
if ($user['status'] === 'pending_verification') {
    // Check if user has an approved payment in payments table
    try {
        $payCheck = $db->prepare("
            SELECT id FROM payments 
            WHERE (user_id = ? OR member_id = ? OR member_name = ? OR user_id = (SELECT id FROM users WHERE email = ? LIMIT 1)) 
              AND status IN ('approved', 'confirmed', 'success')
            LIMIT 1
        ");
        $payCheck->execute([$user['id'], $user['member_id'], $user['name'], $email]);
        $hasApproved = $payCheck->fetch();

        if ($hasApproved) {
            // Auto-heal status to active
            $db->prepare("UPDATE users SET status = 'active', registration_fee_paid = 1 WHERE id = ?")->execute([$user['id']]);
            $user['status'] = 'active';
            $user['registration_fee_paid'] = 1;
        }
    } catch (Exception $e) {}

    if ($user['status'] === 'pending_verification') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => 'Your account is pending confirmation of your registration payment. Please check back shortly once admin reviews your transfer.',
        ]);
        exit;
    }
}

$userDbSavedCheck = (float)($user['saved'] ?? 0);
$userDbWeeksCheck = (int)($user['weeks'] ?? 0);

if ($user['status'] === 'suspended' && $userDbSavedCheck <= 0 && $userDbWeeksCheck <= 0) {
    try {
        $db->prepare("UPDATE users SET status = 'active' WHERE id = ? AND (saved = 0 OR saved IS NULL)")->execute([$user['id']]);
        $user['status'] = 'active';
    } catch (Exception $e) {}
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
$userId = (int)$user['id'];
$officialMemberId = $user['member_id'] ?: ('DA-' . $userId);

$userDbSaved = (float)($user['saved'] ?? 0);
$userDbWeeks = (int)($user['weeks'] ?? 0);
$spSaved     = 0.0;
$spWeeks     = 0;
$calcSaved   = 0.0;
$calcWeeks   = 0;
$activeHands = 1;

// 1. Check savings_plans table
try {
    $spStmt = $db->prepare('SELECT plan_type, total_saved, weeks_completed, start_date FROM savings_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $spStmt->execute([$userId]);
    $sp = $spStmt->fetch(PDO::FETCH_ASSOC);
    if ($sp) {
        $spSaved = (float)($sp['total_saved'] ?? 0);
        $spWeeks = (int)($sp['weeks_completed'] ?? 0);
    }
} catch (PDOException $e) {}

// 2. Calculate from approved payments
try {
    $payStmt = $db->prepare("
        SELECT 
            COUNT(*) as count_payments,
            COALESCE(SUM(COALESCE(weeks_covered, 1)), 0) as calc_weeks,
            COALESCE(SUM(amount), 0) as calc_saved,
            MAX(COALESCE(NULLIF(hands, 0), ROUND(amount / 1300), 1)) as calc_hands
        FROM payments
        WHERE (user_id = ? OR member_id = ? OR member_name = ?) 
          AND status IN ('approved', 'confirmed', 'success')
          AND (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine'))
          AND (purpose IS NULL OR (
              LOWER(purpose) NOT LIKE '%registration%' 
              AND LOWER(purpose) NOT LIKE '%reg fee%' 
              AND LOWER(purpose) NOT LIKE '%one-time%'
              AND LOWER(purpose) NOT LIKE '%fine%'
          ))
          AND amount != 2000
    ");
    $payStmt->execute([$userId, $officialMemberId, $user['name']]);
    $calc = $payStmt->fetch(PDO::FETCH_ASSOC);

    $calcWeeks = (int)($calc['calc_weeks'] ?? 0);
    $calcSaved = (float)($calc['calc_saved'] ?? 0);
    $calcHands = max(1, (int)($calc['calc_hands'] ?? 1));

    $lastPayStmt = $db->prepare("
        SELECT hands, amount FROM payments 
        WHERE (user_id = ? OR member_id = ? OR member_name = ?)
          AND (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine'))
          AND (purpose IS NULL OR (
              LOWER(purpose) NOT LIKE '%registration%' 
              AND LOWER(purpose) NOT LIKE '%reg fee%' 
              AND LOWER(purpose) NOT LIKE '%one-time%'
              AND LOWER(purpose) NOT LIKE '%fine%'
          ))
          AND amount != 2000
        ORDER BY id DESC LIMIT 1
    ");
    $lastPayStmt->execute([$userId, $officialMemberId, $user['name']]);
    $lastPay = $lastPayStmt->fetch(PDO::FETCH_ASSOC);
    if ($lastPay) {
        $amt = (float)$lastPay['amount'];
        $h = (int)($lastPay['hands'] ?? 1);
        if ($h <= 1 && $amt > 1300 && fmod($amt, 1300) == 0) {
            $h = (int)round($amt / 1300);
        }
        $activeHands = max(1, $h);
    } else {
        $activeHands = $calcHands;
    }
} catch (PDOException $e) { /* non-fatal */ }

$saved = max($calcSaved, $userDbSaved, $spSaved);
$weeks = max($calcWeeks, $userDbWeeks, $spWeeks);

if ($weeks === 0 && $saved > 0 && $activeHands > 0) {
    $weeks = max(1, (int)round($saved / ($activeHands * 1300)));
}

// ─── Update last login ─────────────────────────────────────────────────────
try {
    $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);
} catch (PDOException $e) { /* non-fatal */ }

// ─── Response ─────────────────────────────────────────────────────────────────
echo json_encode([
    'success' => true,
    'role'    => 'member',
    'user'    => [
        'id'                  => $officialMemberId,
        'name'                => $user['name'],
        'email'               => $user['email'],
        'phone'               => $user['phone'],
        'initials'            => $user['initials'] ?: strtoupper(substr($user['name'], 0, 2)),
        'joined'              => date('d M Y', strtotime($user['created_at'])),
        'saved'               => (float)$saved,
        'status'              => $user['status'],
        'plan'                => $user['plan_type'] ?? 'Double Up',
        'weeks'               => (int)$weeks,
        'activeHands'         => (int)$activeHands,
        'role'                => 'member',
        'needsSecurityUpdate' => (bool)($user['needs_security_update'] ?? 1),
    ],
]);
