<?php
// ─── DigiAjo Global — Member Savings History ─────────────────────────────────
// GET /api/member/savings_history.php?member_id=DA-XXXXX
// Auto-triggers fine check on every load for all active hands.

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

    // Get all savings plans (Hands)
    $spStmt = $db->prepare('
        SELECT id, plan_type, weekly_amount, total_weeks, weeks_completed,
               total_saved, total_fines, start_date, status
        FROM savings_plans
        WHERE user_id = ?
        ORDER BY created_at ASC
    ');
    $spStmt->execute([$userId]);
    $plans = $spStmt->fetchAll(PDO::FETCH_ASSOC);

    $handsData = [];

    foreach ($plans as $index => $plan) {
        $planId      = $plan['id'];
        $startDate   = new DateTime($plan['start_date']);
        $totalWeeks  = (int)$plan['total_weeks'];
        $fineAmount  = (float)($plan['weekly_amount'] ?? 1300.00);
        
        $getSaturdayDeadline = function(DateTime $start, int $wk) {
            $d = clone $start;
            if ((int)$d->format('N') !== 6) {
                $d->modify('next Saturday');
            }
            if ($wk > 1) {
                $d->modify('+' . ($wk - 1) . ' weeks');
            }
            $d->setTime(23, 55, 0);
            return $d;
        };

        // ── Auto-trigger fine check for this plan ──────────────────────────────
        $paidCountStmt = $db->prepare("
            SELECT COALESCE(SUM(weeks_covered), 0) AS cnt
            FROM payments
            WHERE user_id = ? AND savings_plan_id = ?
              AND payment_type = 'weekly_contribution'
              AND status IN ('approved','pending')
        ");
        $paidCountStmt->execute([$userId, $planId]);
        $paidWeeks = (int)$paidCountStmt->fetch(PDO::FETCH_ASSOC)['cnt'];

        for ($wk = 1; $wk <= $totalWeeks; $wk++) {
            $dueDate = $getSaturdayDeadline($startDate, $wk);
            if (time() <= $dueDate->getTimestamp()) break;
            if ($wk <= $paidWeeks) continue;

            $fineExistsStmt = $db->prepare('SELECT id FROM fines WHERE user_id = ? AND savings_plan_id = ? AND week_number = ?');
            $fineExistsStmt->execute([$userId, $planId, $wk]);
            if ($fineExistsStmt->fetch()) continue;

            try {
                $db->beginTransaction();
                $db->prepare("INSERT INTO fines (user_id, member_id, savings_plan_id, week_number, amount, reason) VALUES (?,?,?,?,?,?)")
                   ->execute([$userId, $memberId, $planId, $wk, $fineAmount, "Week {$wk} missed — 100% fine (₦" . number_format($fineAmount, 0) . ") applied after 5hr grace"]);
                $db->prepare("UPDATE savings_plans SET total_fines = total_fines + ? WHERE id = ?")
                   ->execute([$fineAmount, $planId]);
                try {
                    $formattedFine = number_format($fineAmount, 0);
                    $db->prepare("INSERT INTO notifications (user_id, member_id, title, message, type) VALUES (?,?,'Late Payment Fine',?,?)")
                       ->execute([$userId, $memberId, "A 100% fine (₦{$formattedFine}) has been applied for Hand " . ($index + 1) . " Week {$wk} payment.", 'warning']);
                } catch (PDOException $e) {}
                $db->commit();
            } catch (PDOException $e) {
                if ($db->inTransaction()) $db->rollBack();
            }
        }

        // ── Fetch payments for this plan ───────────────────────────────────────
        $payStmt = $db->prepare("
            SELECT payment_ref, amount, created_at, paid_at, status, purpose,
                   COALESCE(hands, 1)         AS hands,
                   COALESCE(payment_scope, 'weekly') AS payment_scope,
                   COALESCE(weeks_covered, 1) AS weeks_covered
            FROM payments
            WHERE user_id = ? AND savings_plan_id = ?
              AND payment_type = 'weekly_contribution'
              AND status IN ('approved', 'pending')
            ORDER BY created_at ASC
        ");
        $payStmt->execute([$userId, $planId]);
        $allPayments = $payStmt->fetchAll(PDO::FETCH_ASSOC);

        // ── Fetch fines for this plan ──────────────────────────────────────────
        $finesStmt = $db->prepare('SELECT week_number, amount FROM fines WHERE user_id = ? AND savings_plan_id = ? ORDER BY week_number ASC');
        $finesStmt->execute([$userId, $planId]);
        $finesByWeek = [];
        foreach ($finesStmt->fetchAll(PDO::FETCH_ASSOC) as $f) {
            $finesByWeek[(int)$f['week_number']] = (float)$f['amount'];
        }

        // ── Build week rows ────────────────────────────────────────────────────
        $weeks   = [];
        $weekNum = 1;
        $weeklyRate = (float)$plan['weekly_amount'];

        foreach ($allPayments as $p) {
            $amount       = (float)$p['amount'];
            $weeksCovered = max(1, (int)$p['weeks_covered']);
            
            // Fallback calculation
            if ($weeksCovered <= 1 && $weeklyRate > 0 && $amount >= $weeklyRate && $amount < 50000) {
                $weeksCovered = (int)round($amount / $weeklyRate);
            }

            $handsCount = max(1, (int)$p['hands']);
            if ($handsCount < $weeksCovered) {
                $handsCount = $weeksCovered;
            }

            $isMonthly     = $weeksCovered > 1;
            $paidDate = $p['paid_at'] ? date('d M Y', strtotime($p['paid_at'])) : date('d M Y', strtotime($p['created_at']));

            for ($wi = 0; $wi < $weeksCovered; $wi++) {
                $dueDate = $getSaturdayDeadline($startDate, $weekNum);

                $weeks[] = [
                    'week'         => $weekNum,
                    'dueDate'      => $dueDate->format('d M Y'),
                    'paidDate'     => $p['status'] === 'approved' ? $paidDate : null,
                    'amount'       => $weeklyRate,
                    'hands'        => $handsCount,
                    'fine'         => $finesByWeek[$weekNum] ?? 0,
                    'status'       => $p['status'],
                    'reference'    => $p['payment_ref'],
                    'isMonthly'    => $isMonthly,
                    'weekInBatch'  => $wi + 1,
                    'totalInBatch' => $weeksCovered,
                ];
                $weekNum++;
            }
        }

        // Add missed weeks
        foreach ($finesByWeek as $wk => $fineAmt) {
            $alreadyIn = false;
            foreach ($weeks as $w) {
                if ($w['week'] === $wk) { $alreadyIn = true; break; }
            }
            if ($alreadyIn) continue;

            $dueDate = $getSaturdayDeadline($startDate, $wk);
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

        $totalSaved = array_sum(array_map(fn($w) => $w['status'] === 'approved' ? $w['amount'] : 0, $weeks));

        $summary = [
            'planId'         => $planId,
            'handName'       => "Hand " . ($index + 1),
            'planType'       => $plan['plan_type'],
            'weeksCompleted' => (int)$plan['weeks_completed'],
            'totalWeeks'     => (int)$plan['total_weeks'],
            'totalSaved'     => $totalSaved,
            'totalFines'     => array_sum($finesByWeek), // Better accurate fine sum
            'startDate'      => $plan['start_date'],
            'status'         => $plan['status'],
            'weeklyAmount'   => (float)$plan['weekly_amount'],
        ];

        $handsData[] = [
            'summary' => $summary,
            'weeks'   => $weeks
        ];
    }

    echo json_encode([
        'success' => true,
        'hands'   => $handsData,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
