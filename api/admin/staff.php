<?php
// ─── DigiAjo Global — Admin Staff Management API ───────────────────────────────
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method === 'GET') {
    // List all support/staff admins
    try {
        $stmt = $db->query("SELECT id, name, full_name, email, phone, role, is_active, created_at, last_login_at, permissions FROM admins WHERE role = 'support' ORDER BY created_at DESC");
        $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode permissions JSON
        foreach ($staff as &$s) {
            $s['permissions'] = $s['permissions'] ? json_decode($s['permissions'], true) : [];
        }
        
        echo json_encode(['success' => true, 'staff' => $staff]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    // Create new staff
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
        exit;
    }

    $name = trim($body['name'] ?? '');
    $fullName = trim($body['full_name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $phone = trim($body['phone'] ?? '');
    $password = trim($body['password'] ?? '');
    $permissions = $body['permissions'] ?? [];

    if (!$name || !$email || !$password) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'Name, email, and password are required.']);
        exit;
    }

    try {
        // Check if email exists
        $check = $db->prepare('SELECT id FROM admins WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'An admin account with this email already exists.']);
            exit;
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $permissionsJson = json_encode(is_array($permissions) ? $permissions : []);

        $stmt = $db->prepare("INSERT INTO admins (name, full_name, email, phone, password_hash, role, is_active, permissions) VALUES (?, ?, ?, ?, ?, 'support', 1, ?)");
        $stmt->execute([$name, $fullName, $email, $phone, $passwordHash, $permissionsJson]);

        // Send email to staff
        require_once __DIR__ . '/../utils/email.php';
        $subject = "Welcome to DigiAjo Global - Staff Account Created";
        $msg = "
            <p>Hello {$fullName},</p>
            <p>An admin account has been created for you on the DigiAjo Global platform.</p>
            <p>You can log in to your dashboard using the following credentials:</p>
            <ul>
                <li><strong>Email:</strong> {$email}</li>
                <li><strong>Password:</strong> {$password}</li>
            </ul>
            <p>Please log in and ensure your assigned pages are accessible.</p>
        ";
        send_email($email, $subject, $msg);

        echo json_encode(['success' => true, 'message' => 'Staff account created successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'PUT') {
    // Update existing staff
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
        exit;
    }

    $id = $body['id'] ?? null;
    $name = trim($body['name'] ?? '');
    $fullName = trim($body['full_name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $phone = trim($body['phone'] ?? '');
    $permissions = $body['permissions'] ?? [];
    $password = trim($body['password'] ?? '');
    $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

    if (!$id || !$name || !$email) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'ID, name, and email are required.']);
        exit;
    }

    try {
        $permissionsJson = json_encode(is_array($permissions) ? $permissions : []);

        if ($password) {
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE admins SET name = ?, full_name = ?, email = ?, phone = ?, password_hash = ?, is_active = ?, permissions = ? WHERE id = ? AND role = 'support'");
            $stmt->execute([$name, $fullName, $email, $phone, $passwordHash, $isActive, $permissionsJson, $id]);
        } else {
            $stmt = $db->prepare("UPDATE admins SET name = ?, full_name = ?, email = ?, phone = ?, is_active = ?, permissions = ? WHERE id = ? AND role = 'support'");
            $stmt->execute([$name, $fullName, $email, $phone, $isActive, $permissionsJson, $id]);
        }

        echo json_encode(['success' => true, 'message' => 'Staff account updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id = $_GET['id'] ?? ($body['id'] ?? null);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID is required']);
        exit;
    }

    try {
        $stmt = $db->prepare("DELETE FROM admins WHERE id = ? AND role = 'support'");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
