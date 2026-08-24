<?php
// ─── DigiAjo Global — Database Configuration ────────────────────────────────
// If live credentials exist in persistent db_config.php, load them
if (file_exists(__DIR__ . '/db_config.php')) {
    require_once __DIR__ . '/db_config.php';
}

if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: 'digiajoglobal');
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: 'root');
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $socketPath = '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';
        $dsns = [];
        if (file_exists($socketPath)) {
            $dsns[] = 'mysql:unix_socket=' . $socketPath . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        }
        $dsns[] = 'mysql:host=127.0.0.1;port=3306;dbname=' . DB_NAME . ';charset=utf8mb4';
        $dsns[] = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

        $lastEx = null;
        foreach ($dsns as $dsn) {
            try {
                $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::ATTR_TIMEOUT            => 3,
                ]);
                break;
            } catch (PDOException $e) {
                $lastEx = $e;
            }
        }

        if (!$pdo) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . ($lastEx ? $lastEx->getMessage() : 'Unknown error')]);
            exit;
        }
    }
    return $pdo;
}

// ─── CORS Headers (allow React dev server + same origin) ────────────────────
header('Content-Type: application/json');
$allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && (in_array($origin, $allowedOrigins, true) || preg_match('/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i', $origin))) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Global Web Application Firewall (WAF) & Intrusion Alert Gateway ─────────
require_once __DIR__ . '/security/firewall.php';

// ─── Global Notifications Schema Migration & Safe Inserter ───────────────────
function ensure_notifications_schema(PDO $db): void {
    static $schemaChecked = false;
    if ($schemaChecked || $db->inTransaction()) return;
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                member_id VARCHAR(50) NULL,
                title VARCHAR(255) NOT NULL,
                body TEXT NULL,
                message TEXT NULL,
                kind VARCHAR(50) DEFAULT 'info',
                type VARCHAR(50) DEFAULT 'info',
                audience VARCHAR(50) DEFAULT 'all',
                target_user INT NULL,
                target_name VARCHAR(100) NULL,
                target_plan VARCHAR(50) NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        $cols = $db->query("SHOW COLUMNS FROM notifications")->fetchAll(PDO::FETCH_COLUMN);
        $colNames = array_map('strtolower', $cols);

        if (!in_array('message', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN message TEXT NULL"); } catch (Exception $e) {}
        }
        if (!in_array('body', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN body TEXT NULL"); } catch (Exception $e) {}
        }
        if (!in_array('type', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN type VARCHAR(50) DEFAULT 'info'"); } catch (Exception $e) {}
        }
        if (!in_array('kind', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN kind VARCHAR(50) DEFAULT 'info'"); } catch (Exception $e) {}
        }
        if (!in_array('audience', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN audience VARCHAR(50) DEFAULT 'all'"); } catch (Exception $e) {}
        }
        if (!in_array('target_user', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN target_user INT NULL"); } catch (Exception $e) {}
        }
        if (!in_array('target_name', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN target_name VARCHAR(100) NULL"); } catch (Exception $e) {}
        }
        if (!in_array('target_plan', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN target_plan VARCHAR(50) NULL"); } catch (Exception $e) {}
        }
        if (!in_array('user_id', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN user_id INT NULL"); } catch (Exception $e) {}
        }
        if (!in_array('member_id', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN member_id VARCHAR(50) NULL"); } catch (Exception $e) {}
        }
        if (!in_array('sent_at', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN sent_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch (Exception $e) {}
        }
        if (!in_array('created_at', $colNames)) {
            try { $db->exec("ALTER TABLE notifications ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch (Exception $e) {}
        }

        // Alter ENUM columns to VARCHAR(50) so they don't reject new audience/kind types
        try { $db->exec("ALTER TABLE notifications MODIFY COLUMN audience VARCHAR(50) DEFAULT 'all'"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE notifications MODIFY COLUMN kind VARCHAR(50) DEFAULT 'info'"); } catch (Exception $e) {}
        try { $db->exec("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) DEFAULT 'info'"); } catch (Exception $e) {}

        $db->exec("
            CREATE TABLE IF NOT EXISTS user_notification_reads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                notification_id VARCHAR(100) NOT NULL,
                read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY user_notif (user_id, notification_id)
            )
        ");
        $db->exec("
            CREATE TABLE IF NOT EXISTS user_notification_deletions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                notification_id VARCHAR(100) NOT NULL,
                deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY user_notif_del (user_id, notification_id)
            )
        ");

        $schemaChecked = true;
    } catch (Exception $e) {}
}

function insert_notification(PDO $db, array $data): bool {
    ensure_notifications_schema($db);
    try {
        $cols = $db->query("SHOW COLUMNS FROM notifications")->fetchAll(PDO::FETCH_COLUMN);
        $colNames = array_map('strtolower', $cols);

        $fields = [];
        $placeholders = [];
        $values = [];

        $map = [
            'user_id'     => $data['user_id'] ?? null,
            'member_id'   => $data['member_id'] ?? null,
            'target_user' => $data['target_user'] ?? ($data['user_id'] ?? null),
            'target_name' => $data['target_name'] ?? null,
            'target_plan' => $data['target_plan'] ?? null,
            'audience'    => $data['audience'] ?? 'all',
            'title'       => $data['title'] ?? '',
            'body'        => $data['body'] ?? ($data['message'] ?? ''),
            'message'     => $data['message'] ?? ($data['body'] ?? ''),
            'kind'        => $data['kind'] ?? ($data['type'] ?? 'info'),
            'type'        => $data['type'] ?? ($data['kind'] ?? 'info'),
            'sent_at'     => $data['sent_at'] ?? date('Y-m-d H:i:s'),
        ];

        foreach ($map as $col => $val) {
            if (in_array($col, $colNames)) {
                $fields[] = "`$col`";
                $placeholders[] = '?';
                $values[] = $val;
            }
        }

        if (empty($fields)) return false;

        $sql = "INSERT INTO notifications (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $db->prepare($sql);
        return $stmt->execute($values);
    } catch (Exception $e) {
        return false;
    }
}

