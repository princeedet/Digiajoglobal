<?php
// ─── DigiAjo Global — Real-Time Security Incident Dispatcher ─────────────────
// Dispatches immediate alert emails to admin@digiajoglobal.com and logs to DB.

require_once __DIR__ . '/../utils/email.php';

function trigger_security_alert(string $vector, string $offendingPayload, string $clientIp, string $userAgent, string $requestUri, string $requestMethod) {
    $timestamp = date('Y-m-d H:i:s');
    $adminEmail = 'admin@digiajoglobal.com';

    // 1. Log into Database table `security_incidents`
    try {
        if (function_exists('getDB')) {
            $db = getDB();
            $db->exec("
                CREATE TABLE IF NOT EXISTS security_incidents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    attack_vector VARCHAR(100) NOT NULL,
                    client_ip VARCHAR(50) NOT NULL,
                    user_agent TEXT,
                    request_uri TEXT,
                    request_method VARCHAR(10),
                    offending_payload TEXT,
                    action_taken VARCHAR(50) DEFAULT 'BLOCKED',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");

            $stmt = $db->prepare("
                INSERT INTO security_incidents
                    (attack_vector, client_ip, user_agent, request_uri, request_method, offending_payload, action_taken)
                VALUES
                    (?, ?, ?, ?, ?, ?, 'BLOCKED')
            ");
            $stmt->execute([
                $vector,
                $clientIp,
                substr($userAgent, 0, 500),
                substr($requestUri, 0, 500),
                $requestMethod,
                substr($offendingPayload, 0, 1000)
            ]);
        }
    } catch (Exception $e) {
        // Non-fatal database logging failure fallback
    }

    // 2. Append to persistent file audit log
    $logLine = sprintf(
        "[%s] [SECURITY BLOCK] Vector: %s | IP: %s | Method: %s | URI: %s | Payload: %s | UA: %s\n",
        $timestamp,
        $vector,
        $clientIp,
        $requestMethod,
        $requestUri,
        addslashes(substr($offendingPayload, 0, 300)),
        $userAgent
    );
    @file_put_contents(__DIR__ . '/../../security_audit.log', $logLine, FILE_APPEND);

    // 3. Send Urgent Alert Email to admin@digiajoglobal.com
    $emailSubject = "🚨 [URGENT SECURITY ALERT] Blocked Intrusion Attempt on DigiAjo Global";
    
    $cleanPayload = htmlspecialchars($offendingPayload, ENT_QUOTES, 'UTF-8');
    $cleanUri     = htmlspecialchars($requestUri, ENT_QUOTES, 'UTF-8');
    $cleanUa      = htmlspecialchars($userAgent, ENT_QUOTES, 'UTF-8');

    $htmlBody = "
    <div style='font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 10px; overflow: hidden; background-color: #ffffff;'>
        <div style='background-color: #dc2626; color: #ffffff; padding: 18px 24px;'>
            <h2 style='margin: 0; font-size: 20px; display: flex; align-items: center;'>
                🛡️ Threat Neutralized: Intrusion Attempt Blocked
            </h2>
        </div>
        <div style='padding: 24px; color: #1f2937; line-height: 1.6;'>
            <p style='font-size: 15px; margin-top: 0;'>
                The DigiAjo Global Web Application Firewall (WAF) detected and immediately <strong>BLOCKED</strong> a suspicious hacking attempt targeting the platform.
            </p>

            <table style='width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;'>
                <tr style='background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 10px 14px; font-weight: bold; width: 140px; color: #4b5563;'>Attack Vector</td>
                    <td style='padding: 10px 14px; color: #dc2626; font-weight: bold;'>{$vector}</td>
                </tr>
                <tr style='border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 10px 14px; font-weight: bold; color: #4b5563;'>Attacker IP</td>
                    <td style='padding: 10px 14px; font-family: monospace; font-weight: bold;'>{$clientIp}</td>
                </tr>
                <tr style='background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 10px 14px; font-weight: bold; color: #4b5563;'>Request Target</td>
                    <td style='padding: 10px 14px; font-family: monospace;'>{$requestMethod} {$cleanUri}</td>
                </tr>
                <tr style='border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 10px 14px; font-weight: bold; color: #4b5563;'>Timestamp</td>
                    <td style='padding: 10px 14px;'>{$timestamp} (WAT)</td>
                </tr>
                <tr style='background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 10px 14px; font-weight: bold; color: #4b5563;'>Action Taken</td>
                    <td style='padding: 10px 14px;'><span style='background-color: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: bold;'>BLOCKED (HTTP 403)</span></td>
                </tr>
                <tr style='border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 10px 14px; font-weight: bold; color: #4b5563;'>User-Agent</td>
                    <td style='padding: 10px 14px; font-size: 12px; color: #6b7280; word-break: break-all;'>{$cleanUa}</td>
                </tr>
            </table>

            <div style='background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; margin: 18px 0;'>
                <strong style='color: #991b1b;'>Captured Offending Payload:</strong><br>
                <code style='color: #b91c1c; font-size: 13px; word-break: break-all; display: block; margin-top: 6px; font-family: monospace; background: #fff; padding: 8px; border: 1px solid #fecaca; border-radius: 4px;'>{$cleanPayload}</code>
            </div>

            <p style='font-size: 13px; color: #6b7280; margin-bottom: 0;'>
                This is an automated real-time alert dispatched by the DigiAjo Defense System. No system integrity was compromised.
            </p>
        </div>
    </div>
    ";

    send_email($adminEmail, $emailSubject, $htmlBody);
}
