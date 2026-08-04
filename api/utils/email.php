<?php
// ─── DigiAjo Global — Email Utility ──────────────────────────────────────────

function send_email($to, $subject, $message) {
    // In a local XAMPP environment without an SMTP server configured, mail() might fail.
    // We wrap it in a try-catch and suppress warnings so the API doesn't break,
    // and ideally log it or just return the status.
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: DigiAjo Global <noreply@digiajoglobal.com>' . "\r\n";

    // Format the message with a simple HTML template
    $htmlMessage = "
    <html>
    <head>
        <title>$subject</title>
        <style>
            body { font-family: 'Inter', sans-serif; background-color: #f6f8f6; padding: 20px; }
            .container { background-color: #ffffff; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { color: #164f29; font-weight: bold; font-size: 24px; margin-bottom: 20px; }
            .content { color: #333333; font-size: 16px; line-height: 1.6; }
            .footer { margin-top: 30px; font-size: 12px; color: #999999; text-align: center; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>DigiAjo Global</div>
            <div class='content'>
                $message
            </div>
            <div class='footer'>
                &copy; " . date('Y') . " DigiAjo Global. All rights reserved.<br>
                This is an automated message. Please do not reply.
            </div>
        </div>
    </body>
    </html>
    ";

    // Send email using PHP mail()
    // Suppress errors with @ in case sendmail is not configured on local XAMPP
    $success = @mail($to, $subject, $htmlMessage, $headers);
    
    // We log the email to a file for local debugging
    $log_entry = "[" . date('Y-m-d H:i:s') . "] TO: $to | SUBJECT: $subject | STATUS: " . ($success ? "SENT" : "FAILED (Sendmail not configured)") . PHP_EOL;
    @file_put_contents(__DIR__ . '/../../email_log.txt', $log_entry, FILE_APPEND);

    return $success;
}
