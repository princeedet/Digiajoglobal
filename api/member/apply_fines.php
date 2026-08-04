<?php
// ─── DigiAjo Global — Late Payment Fine Engine ───────────────────────────────
// Called automatically when the Savings History page loads, or can be triggered
// via a cron job: GET /api/member/apply_fines.php?member_id=DA-XXXXX
//
// Fine Rule:
//   If a user has a savings plan, each week has a due date (start_date + N*7 days).
//   If the due date has passed by more than 5 hours AND no approved or pending
//   payment exists for that week, a 100% fine (1x of weekly contribution amount) is recorded in the fines table
//   and added to savings_plans.total_fines.
//
// A fine is only applied ONCE per missed week (tracked by week_number in fines table).

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

$memberId = trim($_GET['member_id'] ?? '');
if (!$memberId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id is required']);
    exit;
}

$db = getDB();

try {
    // Create fines table if it doesn't exist
    $db->exec("
        CREATE TABLE IF NOT EXISTS fines (
            id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id     INT UNSIGNED NOT NULL,
            member_id   VARCHAR(20) NOT NULL,
            week_number TINYINT NOT NULL,
            amount      DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
            reason      VARCHAR(255) NOT NULL DEFAULT 'Late payment fine',
            applied_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_week (user_id, week_number)
        )
    ");

    // Get user
    $stmt = $db->prepare('SELECT id FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$memberId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    $userId = $user['id'];

    // Get savings plan
    $spStmt = $db->prepare('SELECT * FROM savings_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $spStmt->execute([$userId]);
    $plan = $spStmt->fetch(PDO::FETCH_ASSOC);

    if (!$plan) {
        echo json_encode(['success' => true, 'fines_applied' => 0, 'message' => 'No active plan found']);
        exit;
    }

    $startDate    = new DateTime($plan['start_date']);
    $totalWeeks   = (int)$plan['total_weeks'];
    $fineAmount   = (float)($plan['weekly_amount'] ?? 1300.00);
    $gracePeriod  = 5 * 3600; // 5 hours in seconds
    $now          = time();
    $finesApplied = 0;
    $totalFineAdded = 0.00;

    // Get all approved/pending weekly contributions for this user
    $payStmt = $db->prepare("
        SELECT COUNT(*) as cnt
        FROM payments
        WHERE user_id = ?
          AND payment_type = 'weekly_contribution'
          AND status IN ('approved', 'pending')
    ");
    $payStmt->execute([$userId]);
    $paidWeeks = (int)$payStmt->fetch(PDO::FETCH_ASSOC)['cnt'];

    // Check each week that SHOULD have been paid by now
    for ($weekNum = 1; $weekNum <= $totalWeeks; $weekNum++) {
        // Due date = start_date + (weekNum - 1) * 7 days
        $dueDate = clone $startDate;
        $dueDate->modify('+' . (($weekNum - 1) * 7) . ' days');
        $dueDateTs = $dueDate->getTimestamp();

        // Only check weeks whose due date has passed by more than 5 hours
        if ($now <= $dueDateTs + $gracePeriod) {
            break; // Future weeks — stop here
        }

        // Check if this specific week has a payment (approximate by row number)
        // We compare week number against total paid weeks to decide if it was paid
        if ($weekNum <= $paidWeeks) {
            continue; // This week was paid
        }

        // Check if fine already applied for this week
        $fineCheckStmt = $db->prepare('SELECT id FROM fines WHERE user_id = ? AND week_number = ?');
        $fineCheckStmt->execute([$userId, $weekNum]);
        if ($fineCheckStmt->fetch()) {
            continue; // Fine already recorded
        }

        // Apply fine (100% / 1x of weekly contribution)
        try {
            $db->beginTransaction();

            // Record fine
            $db->prepare("
                INSERT INTO fines (user_id, member_id, week_number, amount, reason)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([
                $userId,
                $memberId,
                $weekNum,
                $fineAmount,
                "Week {$weekNum} payment missed — 100% fine (₦" . number_format($fineAmount, 0) . ") applied after 5-hour grace"
            ]);

            // Update savings plan total_fines
            $db->prepare("
                UPDATE savings_plans
                SET total_fines = total_fines + ?
                WHERE user_id = ?
            ")->execute([$fineAmount, $userId]);

            // Add notification for user
            try {
                $formattedFine = number_format($fineAmount, 0);
                $db->prepare("
                    INSERT INTO notifications (user_id, member_id, title, message, type)
                    VALUES (?, ?, 'Late Payment Fine Applied',
                        'A 100% fine of ₦{$formattedFine} has been applied for your Week {$weekNum} payment missed beyond the 5-hour grace period.',
                        'warning')
                ")->execute([$userId, $memberId]);
            } catch (PDOException $e) { /* non-fatal */ }

            $db->commit();
            $finesApplied++;
            $totalFineAdded += $fineAmount;

        } catch (PDOException $e) {
            if ($db->inTransaction()) $db->rollBack();
            // Duplicate key = fine already exists, ignore
        }
    }

    // Re-fetch updated total_fines
    $spStmt->execute([$userId]);
    $updatedPlan = $spStmt->fetch(PDO::FETCH_ASSOC);

    $formattedTotalFine = number_format($fineAmount, 0);
    echo json_encode([
        'success'         => true,
        'fines_applied'   => $finesApplied,
        'total_fines_added' => $totalFineAdded,
        'total_fines_on_plan' => (float)($updatedPlan['total_fines'] ?? 0),
        'message'         => $finesApplied > 0
            ? "{$finesApplied} fine(s) of ₦{$formattedTotalFine} applied for missed weekly payment(s)."
            : 'No new fines to apply.',
    ]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
