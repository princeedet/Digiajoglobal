<?php
// ─── DigiAjo Global — Member Savings History ─────────────────────────────────
// GET /api/member/savings_history.php?member_id=DA-XXXXX
// Auto-triggers fine check on every load.
// Monthly payments are expanded into individual week slots.

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$memberId = trim($_GET['member_id'] ?? '');
if (!$memberId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'member_id is required']);
    exit;
}

$db = getDB();

try {
    // Ensure fines table exists
    $db->exec("
        CREATE TABLE IF NOT EXISTS fines (
            id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id     INT UNSIGNED NOT NULL,
            member_id   VARCHAR(20) NOT NULL,
            week_number SMALLINT NOT NULL,
            amount      DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
            reason      VARCHAR(255) NOT NULL DEFAULT 'Late payment fine',
            applied_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_week (user_id, week_number)
        )
    ");

    // Ensure payments table has the extended columns (added by submit_payment.php)
    $cols = $db->query("SHOW COLUMNS FROM payments LIKE 'hands'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE payments
            ADD COLUMN hands TINYINT NOT NULL DEFAULT 1 AFTER purpose,
            ADD COLUMN payment_scope ENUM('weekly','monthly') NOT NULL DEFAULT 'weekly' AFTER hands,
            ADD COLUMN weeks_covered TINYINT NOT NULL DEFAULT 1 AFTER payment_scope
        ");
    }

    // Get user's DB id
    $stmt = $db->prepare('SELECT id FROM users WHERE member_id = ? LIMIT 1');
    $stmt->execute([$memberId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $userId = $user['id'];

    // ── Auto-trigger fine check ───────────────────────────────────────────────
    $spCheckStmt = $db->prepare('SELECT * FROM savings_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $spCheckStmt->execute([$userId]);
    $planCheck = $spCheckStmt->fetch(PDO::FETCH_ASSOC);

    if ($planCheck) {
        $startDate   = new DateTime($planCheck['start_date']);
        $totalWeeks  = (int)$planCheck['total_weeks'];
        $fineAmount  = (float)($planCheck['weekly_amount'] ?? 1300.00);
        $gracePeriod = 5 * 3600;

        // Count effective paid weeks (each approved payment × weeks_covered)
        $paidCountStmt = $db->prepare("
            SELECT COALESCE(SUM(weeks_covered), 0) AS cnt
            FROM payments
            WHERE user_id = ?
              AND payment_type = 'weekly_contribution'
              AND status IN ('approved','pending')
        ");
        $paidCountStmt->execute([$userId]);
        $paidWeeks = (int)$paidCountStmt->fetch(PDO::FETCH_ASSOC)['cnt'];

        for ($wk = 1; $wk <= $totalWeeks; $wk++) {
            $dueDate = clone $startDate;
            $dueDate->modify('+' . (($wk - 1) * 7) . ' days');
            if (time() <= $dueDate->getTimestamp() + $gracePeriod) break;
            if ($wk <= $paidWeeks) continue;

            $fineExistsStmt = $db->prepare('SELECT id FROM fines WHERE user_id = ? AND week_number = ?');
            $fineExistsStmt->execute([$userId, $wk]);
            if ($fineExistsStmt->fetch()) continue;

            try {
                $db->beginTransaction();
                $db->prepare("INSERT INTO fines (user_id, member_id, week_number, amount, reason) VALUES (?,?,?,?,?)")
                   ->execute([$userId, $memberId, $wk, $fineAmount, "Week {$wk} missed — 100% fine (₦" . number_format($fineAmount, 0) . ") applied after 5hr grace"]);
                $db->prepare("UPDATE savings_plans SET total_fines = total_fines + ? WHERE user_id = ?")
                   ->execute([$fineAmount, $userId]);
                try {
                    $formattedFine = number_format($fineAmount, 0);
                    $db->prepare("INSERT INTO notifications (user_id, member_id, title, message, type) VALUES (?,?,'Late Payment Fine',?,?)")
                       ->execute([$userId, $memberId, "A 100% fine (₦{$formattedFine}) has been applied for your Week {$wk} payment missed beyond the 5-hour grace period.", 'warning']);
                } catch (PDOException $e) {}
                $db->commit();
            } catch (PDOException $e) {
                if ($db->inTransaction()) $db->rollBack();
            }
        }
    }
    // ── End fine check ────────────────────────────────────────────────────────

    // Get savings plan
    $spStmt = $db->prepare('
        SELECT id, plan_type, weekly_amount, total_weeks, weeks_completed,
               total_saved, total_fines, start_date, status
        FROM savings_plans
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    ');
    $spStmt->execute([$userId]);
    $plan = $spStmt->fetch(PDO::FETCH_ASSOC);

    // ── Fetch all weekly contributions with hands/scope columns ──────────────
    $payStmt = $db->prepare("
        SELECT payment_ref, amount, created_at, paid_at, status, purpose,
               COALESCE(hands, 1)         AS hands,
               COALESCE(payment_scope, 'weekly') AS payment_scope,
               COALESCE(weeks_covered, 1) AS weeks_covered
        FROM payments
        WHERE user_id = ?
          AND payment_type = 'weekly_contribution'
          AND status IN ('approved', 'pending')
        ORDER BY created_at ASC
    ");
    $payStmt->execute([$userId]);
    $allPayments = $payStmt->fetchAll(PDO::FETCH_ASSOC);

    // Auto-heal existing fines table amounts (1000 -> 1300)
    $db->exec("UPDATE fines SET amount = 1300.00 WHERE amount = 1000.00");
    $db->exec("UPDATE savings_plans SET total_fines = (SELECT COALESCE(SUM(amount), 0) FROM fines WHERE fines.user_id = savings_plans.user_id)");

    // Get fines keyed by week number
    $finesStmt = $db->prepare('SELECT week_number, amount FROM fines WHERE user_id = ? ORDER BY week_number ASC');
    $finesStmt->execute([$userId]);
    $finesByWeek = [];
    foreach ($finesStmt->fetchAll(PDO::FETCH_ASSOC) as $f) {
        $finesByWeek[(int)$f['week_number']] = (float)$f['amount'];
    }

    // ── Build week rows — expand multi-week (monthly) payments ───────────────
    $weeks   = [];
    $weekNum = 1;
    $startDate = $plan ? new DateTime($plan['start_date']) : new DateTime();
    $weeklyRate = $plan ? (float)$plan['weekly_amount'] : 1300.0;

    foreach ($allPayments as $p) {
        $amount       = (float)$p['amount'];
        $weeksCovered = max(1, (int)$p['weeks_covered']);
        
        // Fallback calculation: if amount is ₦9,100, 9100 / 1300 = 7 weeks covered
        if ($weeksCovered <= 1 && $weeklyRate > 0 && $amount >= $weeklyRate && $amount < 50000) {
            $weeksCovered = (int)round($amount / $weeklyRate);
        }

        $handsCount = max(1, (int)$p['hands']);
        if ($handsCount < $weeksCovered) {
            $handsCount = $weeksCovered;
        }

        $amountPerWeek = $weeklyRate;   // ₦1,300 per week
        $isMonthly     = $weeksCovered > 1;

        $paidDate = $p['paid_at']
            ? date('d M Y', strtotime($p['paid_at']))
            : date('d M Y', strtotime($p['created_at']));

        for ($wi = 0; $wi < $weeksCovered; $wi++) {
            $dueDate = clone $startDate;
            $dueDate->modify('+' . ($weekNum - 1) . ' weeks');

            $weeks[] = [
                'week'         => $weekNum,
                'dueDate'      => $dueDate->format('d M Y'),
                'paidDate'     => $p['status'] === 'approved' ? $paidDate : null,
                'amount'       => $amountPerWeek,
                'hands'        => $handsCount,
                'fine'         => $finesByWeek[$weekNum] ?? 0,
                'status'       => $p['status'],
                'reference'    => $p['payment_ref'],
                'isMonthly'    => $isMonthly,
                'weekInBatch'  => $wi + 1,      // e.g. "2 of 7"
                'totalInBatch' => $weeksCovered,
            ];
            $weekNum++;
        }
    }

    // Add missed weeks (fined but no payment)
    foreach ($finesByWeek as $wk => $fineAmt) {
        $alreadyIn = false;
        foreach ($weeks as $w) {
            if ($w['week'] === $wk) { $alreadyIn = true; break; }
        }
        if ($alreadyIn) continue;

        $dueDate = clone $startDate;
        $dueDate->modify('+' . ($wk - 1) . ' weeks');
        $weeks[] = [
            'week'         => $wk,
            'dueDate'      => $dueDate->format('d M Y'),
            'paidDate'     => null,
            'amount'       => 0,
            'hands'        => 1,
            'fine'         => $fineAmt,
            'status'       => 'missed',
            'reference'    => '',
            'isMonthly'    => false,
            'weekInBatch'  => 1,
            'totalInBatch' => 1,
        ];
    }

    usort($weeks, fn($a, $b) => $a['week'] - $b['week']);

    // Re-compute totalSaved from the expanded week list
    $totalSaved = array_sum(array_map(
        fn($w) => $w['status'] === 'approved' ? $w['amount'] : 0,
        $weeks
    ));

    $summary = $plan ? [
        'planType'       => $plan['plan_type'],
        'weeksCompleted' => (int)$plan['weeks_completed'],
        'totalWeeks'     => (int)$plan['total_weeks'],
        'totalSaved'     => $totalSaved,
        'totalFines'     => (float)$plan['total_fines'],
        'startDate'      => $plan['start_date'],
        'status'         => $plan['status'],
        'weeklyAmount'   => (float)$plan['weekly_amount'],
    ] : null;

    echo json_encode([
        'success' => true,
        'summary' => $summary,
        'weeks'   => $weeks,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
