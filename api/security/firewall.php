<?php
// ─── DigiAjo Global — Enterprise Web Application Firewall (WAF) ───────────────
// Detects, blocks, logs, and alerts on SQLi, XSS, RCE, LFI, Scanners & Brute-force.

require_once __DIR__ . '/alerts.php';

class DigiAjoFirewall {

    /** Malicious Scanner & Hacker Tool User-Agents */
    private static array $maliciousAgents = [
        'sqlmap', 'nikto', 'dirbuster', 'gobuster', 'wpscan', 'masscan', 'nmap',
        'acunetix', 'havij', 'netsparker', 'burpsuite', 'zaproxy', 'hydra', 'medusa',
        'paros', 'pangolin', 'arachni', 'qualys', 'openvas', 'nessus', 'cgiscan',
        'morfeus', 'webinspect', 'fimap', 'sqlninja', 'whatweb'
    ];

    /** SQL Injection Signatures */
    private static array $sqliPatterns = [
        '/\b(union\s+all\s+select|union\s+select)\b/i',
        '/\b(select\s+.+\s+from\s+[\w`]+|insert\s+into\s+[\w`]+|delete\s+from\s+[\w`]+|drop\s+table\s+[\w`]+|alter\s+table\s+[\w`]+)\b/i',
        '/\b(benchmark\s*\(\s*\d+\s*,|sleep\s*\(\s*\d+\s*\))/i',
        '/\b(load_file\s*\(|into\s+outfile|into\s+dumpfile)\b/i',
        '/(\'|\")\s*(\bOR\b|\bAND\b)\s*(\'|\")?[a-z0-9]+(\'|\")?\s*=\s*(\'|\")?[a-z0-9]+/i',
        '/(\'|\%27)\s*;\s*(drop|delete|insert|update|alter)/i',
        '/(;|%3B)\s*(select|drop|insert|update|delete|grant|revoke)\b/i',
        '/(--\s+|\/\*.*?\*\/)/i'
    ];

    /** Cross-Site Scripting (XSS) Signatures */
    private static array $xssPatterns = [
        '/<\s*script\b[^>]*>/i',
        '/<\s*\/\s*script\s*>/i',
        '/javascript\s*:\s*/i',
        '/\bon(load|error|click|focus|blur|change|submit|mouseover|mouseenter|mouseleave|keydown|keyup)\s*=/i',
        '/<\s*(iframe|embed|object|applet|meta|link|style)\b[^>]*>/i',
        '/document\s*\.\s*(cookie|location|write|domain)/i',
        '/\beval\s*\(|expression\s*\(|window\s*\[/i',
        '/<\s*img[^>]+src\s*=\s*[\'"]?javascript:/i',
        '/<\s*svg[^>]+onload\s*=/i',
    ];

    /** Remote Code Execution (RCE) / System Command Injections */
    private static array $rcePatterns = [
        '/\b(system|exec|passthru|shell_exec|proc_open|popen)\s*\(/i',
        '/\b(base64_decode|gzinflate|str_rot13)\s*\(/i',
        '/\b(phpinfo|assert|file_get_contents|file_put_contents)\s*\(\s*[\'"]http/i',
        '/(;|\||`|\$\()\s*(cat\s+\/|nc\s+-e|bash\s+-i|sh\s+-i|curl\s+|wget\s+|chmod\s+|rm\s+-rf)/i',
        '/\b(php:\/\/input|php:\/\/filter|data:\/\/text\/html)/i',
        '/(\/bin\/sh|\/bin\/bash|cmd\.exe|powershell\.exe)/i'
    ];

    /** Path Traversal / Local File Inclusion (LFI) Signatures */
    private static array $lfiPatterns = [
        '/(\.\.[\/\\\\])+/i',
        '/(\/etc\/(passwd|shadow|hosts|group|issue|crontab))/i',
        '/(\/proc\/self\/(environ|cmdline|fd))/i',
        '/(c:[\/\\\\]windows[\/\\\\](system32|win\.ini|boot\.ini))/i',
        '/(\.git|\.env|\.htaccess|\.htpasswd|\.conf)$/i'
    ];

    /** Attach High-Grade Security HTTP Headers */
    public static function applySecurityHeaders() {
        if (!headers_sent()) {
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: SAMEORIGIN');
            header('X-XSS-Protection: 1; mode=block');
            header('Referrer-Policy: strict-origin-when-cross-origin');
            header('Permissions-Policy: geolocation=(), camera=(), microphone=()');
        }
    }

    /** Retrieve Real Client IP Address */
    public static function getClientIp(): string {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR'
        ];
        foreach ($headers as $h) {
            if (!empty($_SERVER[$h])) {
                $ips = explode(',', $_SERVER[$h]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /** Inspect raw string against threat patterns */
    private static function inspectValue(string $value, string $key = ''): ?array {
        if (empty($value) || is_numeric($value)) {
            return null;
        }

        // 1. SQL Injection Check
        foreach (self::$sqliPatterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return ['type' => 'SQL Injection (SQLi) Attempt', 'pattern' => $pattern];
            }
        }

        // 2. Cross-Site Scripting Check
        foreach (self::$xssPatterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return ['type' => 'Cross-Site Scripting (XSS) Attack', 'pattern' => $pattern];
            }
        }

        // 3. Remote Code Execution Check
        foreach (self::$rcePatterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return ['type' => 'Remote Code Execution (RCE) / Command Injection', 'pattern' => $pattern];
            }
        }

        // 4. Path Traversal / LFI Check
        foreach (self::$lfiPatterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return ['type' => 'Directory Traversal / Local File Inclusion (LFI)', 'pattern' => $pattern];
            }
        }

        return null;
    }

    /** Recursively inspect arrays/objects */
    private static function scanData(mixed $data, string $prefix = ''): ?array {
        if (is_array($data)) {
            foreach ($data as $key => $val) {
                $currentKey = $prefix ? "{$prefix}.{$key}" : (string)$key;
                $hit = self::scanData($val, $currentKey);
                if ($hit) return $hit;
            }
        } elseif (is_string($data)) {
            $hit = self::inspectValue($data, $prefix);
            if ($hit) {
                return [
                    'vector'  => $hit['type'],
                    'field'   => $prefix,
                    'payload' => $data
                ];
            }
        }
        return null;
    }

    /** Anti-Brute-Force & Flood Rate Limiter (max 1200 requests/minute per IP) */
    private static function checkRateLimit(string $ip): bool {
        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === 'localhost') {
            return true;
        }

        $tempDir = sys_get_temp_dir();
        $rateFile = $tempDir . '/digiajo_rl_' . md5($ip) . '.json';
        $now = time();
        $window = 60; // 1 minute
        $maxRequests = 1200; // Generous ceiling to prevent false positives during dashboard usage

        $record = ['count' => 1, 'start' => $now];
        if (file_exists($rateFile)) {
            $content = @file_get_contents($rateFile);
            if ($content) {
                $stored = json_decode($content, true);
                if ($stored && ($now - $stored['start']) < $window) {
                    if ($stored['count'] >= $maxRequests) {
                        return false; // Rate limit exceeded!
                    }
                    $record = ['count' => $stored['count'] + 1, 'start' => $stored['start']];
                }
            }
        }
        @file_put_contents($rateFile, json_encode($record));
        return true;
    }

    /** Main Firewall Execution Entry Point */
    public static function run() {
        self::applySecurityHeaders();

        $clientIp      = self::getClientIp();
        $userAgent     = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $requestUri    = $_SERVER['REQUEST_URI'] ?? '/';
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // 1. Check Malicious Automated Scanners & Attack Tools
        $lowerUa = strtolower($userAgent);
        foreach (self::$maliciousAgents as $agent) {
            if (str_contains($lowerUa, $agent)) {
                self::blockThreat(
                    'Automated Exploit Scanner Detected (' . $agent . ')',
                    "User-Agent: {$userAgent}",
                    $clientIp,
                    $userAgent,
                    $requestUri,
                    $requestMethod
                );
            }
        }

        // 2. Check Rate Limiter
        if (!self::checkRateLimit($clientIp)) {
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error'   => 'Too Many Requests. Please slow down.',
                'ref_id'  => 'SEC-RATE-LIMIT'
            ]);
            exit;
        }

        // 3. Scan URL Query String
        $hit = self::scanData($_GET);
        if ($hit) {
            self::blockThreat(
                $hit['vector'],
                "GET Parameter [{$hit['field']}]: {$hit['payload']}",
                $clientIp,
                $userAgent,
                $requestUri,
                $requestMethod
            );
        }

        // 4. Scan POST Body
        if (!empty($_POST)) {
            $hit = self::scanData($_POST);
            if ($hit) {
                self::blockThreat(
                    $hit['vector'],
                    "POST Field [{$hit['field']}]: {$hit['payload']}",
                    $clientIp,
                    $userAgent,
                    $requestUri,
                    $requestMethod
                );
            }
        }

        // 5. Scan JSON Raw Request Body
        $rawInput = file_get_contents('php://input');
        if (!empty($rawInput)) {
            $decoded = json_decode($rawInput, true);
            if (is_array($decoded)) {
                $hit = self::scanData($decoded);
                if ($hit) {
                    self::blockThreat(
                        $hit['vector'],
                        "JSON Body [{$hit['field']}]: {$hit['payload']}",
                        $clientIp,
                        $userAgent,
                        $requestUri,
                        $requestMethod
                    );
                }
            } else {
                $hit = self::inspectValue($rawInput);
                if ($hit) {
                    self::blockThreat(
                        $hit['type'],
                        "Raw Body: {$rawInput}",
                        $clientIp,
                        $userAgent,
                        $requestUri,
                        $requestMethod
                    );
                }
            }
        }
    }

    /** Intercept, Alert, and Terminate Threat with HTTP 403 */
    private static function blockThreat(
        string $vector,
        string $payload,
        string $clientIp,
        string $userAgent,
        string $requestUri,
        string $requestMethod,
        int $statusCode = 403,
        string $publicError = 'Access denied by DigiAjo Security Firewall.'
    ) {
        // Trigger real-time incident alert email and DB logging
        trigger_security_alert($vector, $payload, $clientIp, $userAgent, $requestUri, $requestMethod);

        // Immediate termination
        http_response_code($statusCode);
        echo json_encode([
            'success' => false,
            'error'   => $publicError,
            'ref_id'  => 'SEC-' . strtoupper(substr(md5($clientIp . time()), 0, 8))
        ]);
        exit;
    }
}

// ─── Auto-trigger on inclusion ────────────────────────────────────────────────
DigiajoFirewall::run();
