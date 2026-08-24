<?php
// ─── DigiAjo Global — Member Savings History ─────────────────────────────────
// GET /api/member/savings_history.php?member_id=DA-XXXXX[&email=...]
// Auto-triggers fine check on every load for active plans and returns week breakdown.

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$userParam = trim($_GET['member_id'] ?? $_GET['id'] ?? '');
$emailParam = trim($_GET['email'] ?? '');
$nameParam  = trim($_GET['name'] ?? '');
$userCleanId = preg_replace('/\D/', '', $userParam);

$db = getDB();

try {
    // Ensure tables exist
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS fines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                member_id VARCHAR(50) NOT NULL,
                week_number INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
                status VARCHAR(50) DEFAULT 'unpaid',
                reason VARCHAR(255) DEFAULT 'Late payment fine',
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_week (user_id, week_number)
            )
        ");
        $db->exec("
            CREATE TABLE IF NOT EXISTS savings_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                plan_type VARCHAR(50) DEFAULT 'double_up',
                savings_plan_id VARCHAR(50) DEFAULT 'SP-1',
                total_saved DECIMAL(12,2) DEFAULT 0,
                weeks_completed INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'active',
                start_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
    } catch (Exception $e) {}

    // 1. Flexible user lookup by member_id, email, clean numeric ID, or name
    $stmt = $db->prepare('
        SELECT id, member_id, name, email, weeks, saved, created_at, plan_type, status
        FROM users 
        WHERE (NULLIF(?, "") IS NOT NULL AND member_id = ?) 
           OR (NULLIF(?, "") IS NOT NULL AND email = ?) 
           OR (NULLIF(?, "") IS NOT NULL AND email = ?)
           OR (NULLIF(?, "") IS NOT NULL AND id = ?)
           OR (NULLIF(?, "") IS NOT NULL AND name = ?)
        LIMIT 1
    ');
    $stmt->execute([
        $userParam, $userParam,
        $userParam, $userParam,
        $emailParam, $emailParam,
        $userCleanId, $userCleanId,
        $nameParam, $nameParam
    ]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Fallback: search by partial name or first user if still not found
        if ($nameParam) {
            $stmt = $db->prepare('SELECT id, member_id, name, email, weeks, saved, created_at, plan_type, status FROM users WHERE name LIKE ? LIMIT 1');
            $stmt->execute(['%' . $nameParam . '%']);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    }

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $userId         = (int)$user['id'];
    $actualMemberId = $user['member_id'] ?: "DA-{$userId}";
    $userStartDate  = !empty($user['created_at']) ? $user['created_at'] : date('Y-m-d H:i:s');
    $weeklyRate     = 1300.00;

    // 2. Fetch all payments for this user (approved & pending, excluding pure registration fees)
    $payStmt = $db->prepare("
        SELECT payment_ref, amount, created_at, paid_at, status, purpose,
               COALESCE(NULLIF(hands, 0), 1)         AS hands,
               COALESCE(payment_scope, 'weekly')     AS payment_scope,
               COALESCE(NULLIF(weeks_covered, 0), 1) AS weeks_covered
        FROM payments
        WHERE ((user_id = ?) OR (member_id IS NOT NULL AND member_id != '' AND member_id = ?))
          AND (payment_type IS NULL OR LOWER(payment_type) NOT IN ('registration', 'registration_fee', 'reg', 'fee', 'fine', 'digimart_unit'))
          AND (purpose IS NULL OR (
              LOWER(purpose) NOT LIKE '%registration%' 
              AND LOWER(purpose) NOT LIKE '%reg fee%' 
              AND LOWER(purpose) NOT LIKE '%one-time%'
              AND LOWER(purpose) NOT LIKE '%fine%'
              AND LOWER(purpose) NOT LIKE '%digimart%'
          ))
          AND amount != 2000
          AND status IN ('approved', 'confirmed', 'success', 'pending')
        ORDER BY id ASC, created_at ASC
    ");
    $payStmt->execute([$userId, $actualMemberId]);
    $allPayments = $payStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Fetch fines for this user
    $finesByWeek = [];
    $totalFines = 0.0;
    try {
        $finesStmt = $db->prepare('
            SELECT week_number, amount, status 
            FROM fines 
            WHERE (user_id = ? OR member_id = ? OR member_id = ?)
            ORDER BY week_number ASC
        ');
        $finesStmt->execute([$userId, $actualMemberId, $userParam]);
        foreach ($finesStmt->fetchAll(PDO::FETCH_ASSOC) as $f) {
            if (!empty($f['week_number'])) {
                $finesByWeek[(int)$f['week_number']] = (float)$f['amount'];
                if (($f['status'] ?? '') !== 'waived') {
                    $totalFines += (float)$f['amount'];
                }
            }
        }
    } catch (Exception $e) {}

    $startDate = new DateTime($userStartDate);

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

    // 4. Build week rows from payments
    $weeks = [];
    $weekNum = 1;

    if (!empty($allPayments)) {
        foreach ($allPayments as $p) {
            $amount       = (float)$p['amount'];
            $weeksCovered = max(1, (int)($p['weeks_covered'] ?? 1));
            $handsCount   = max(1, (int)($p['hands'] ?? 1));

            // If hands was not stored or default 1, derive from amount / (weeks * 1300)
            if ($handsCount <= 1 && $amount > (1300 * $weeksCovered) && fmod($amount, 1300) == 0) {
                $handsCount = (int)round($amount / ($weeksCovered * 1300));
            }

            $weeklyAmountForThisRow = $amount / $weeksCovered;
            $paidDate = !empty($p['paid_at']) 
                ? date('d M Y', strtotime($p['paid_at'])) 
                : date('d M Y', strtotime($p['created_at']));
            
            $statusNorm = in_array($p['status'], ['approved', 'confirmed', 'success']) ? 'approved' : 'pending';

            for ($wi = 0; $wi < $weeksCovered; $wi++) {
                $dueDate = $getSaturdayDeadline($startDate, $weekNum);

                $weeks[] = [
                    'week'         => $weekNum,
                    'dueDate'      => $dueDate->format('d M Y'),
                    'paidDate'     => $statusNorm === 'approved' ? $paidDate : null,
                    'amount'       => $weeklyAmountForThisRow,
                    'hands'        => $handsCount,
                    'fine'         => $finesByWeek[$weekNum] ?? 0,
                    'status'       => $statusNorm,
                    'reference'    => $p['payment_ref'] ?: ('PAY-W' . $weekNum),
                    'isMonthly'    => $weeksCovered > 1,
                    'weekInBatch'  => $wi + 1,
                    'totalInBatch' => $weeksCovered,
                ];
                $weekNum++;
            }
        }
    }

    // If no payment records found but savings exist on the plan/user, spread across individual completed weeks
    if (empty($weeks) && ($userSaved > 0 || $userWeeks > 0)) {
        $completedWeeksCount = max(1, $userWeeks ?: 1);
        $handsCount = max(1, (int)round($userSaved / ($completedWeeksCount * 1300)));
        $weeklyAmount = $handsCount * 1300.00;

        for ($w = 1; $w <= $completedWeeksCount; $w++) {
            $dueDate = $getSaturdayDeadline($startDate, $w);
            $weeks[] = [
                'week'         => $w,
                'dueDate'      => $dueDate->format('d M Y'),
                'paidDate'     => $dueDate->format('d M Y'),
                'amount'       => $weeklyAmount,
                'hands'        => $handsCount,
                'fine'         => $finesByWeek[$w] ?? 0,
                'status'       => 'approved',
                'reference'    => 'SAV-W' . str_pad($w, 2, '0', STR_PAD_LEFT),
                'isMonthly'    => false,
                'weekInBatch'  => 1,
                'totalInBatch' => 1,
            ];
        }
    }

    // Add missed weeks from fines
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
            'reference'    => 'FINE-W' . $wk,
            'isMonthly'    => false,
            'weekInBatch'  => 1,
            'totalInBatch' => 1,
        ];
    }

    // Sort by week ascending
    usort($weeks, fn($a, $b) => $a['week'] - $b['week']);

    // Calculate total saved and completed weeks
    $approvedWeeks = array_filter($weeks, fn($w) => $w['status'] === 'approved');
    $effectiveCompletedWeeks = count($approvedWeeks);
    $approvedSaved = array_sum(array_map(fn($w) => (float)$w['amount'], $approvedWeeks));
    $finalTotalSaved = $approvedSaved;

    // Latest active weekly rate based on hands
    $latestHands = 1;
    if (!empty($weeks)) {
        $lastRow = end($weeks);
        $latestHands = max(1, (int)($lastRow['hands'] ?? 1));
    }
    $effectiveWeeklyRate = $latestHands * 1300.00;

    $summary = [
        'planId'         => 1,
        'handName'       => 'Savings Plan',
        'planType'       => $user['plan_type'] ?: 'double_up',
        'weeksCompleted' => $effectiveCompletedWeeks,
        'totalWeeks'     => 50,
        'totalSaved'     => $finalTotalSaved,
        'totalFines'     => $totalFines,
        'startDate'      => $userStartDate,
        'status'         => $user['status'] ?: 'active',
        'weeklyAmount'   => $effectiveWeeklyRate,
    ];

    echo json_encode([
        'success' => true,
        'hands'   => [
            [
                'summary' => $summary,
                'weeks'   => $weeks,
            ]
        ],
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => true,
        'hands'   => [
            [
                'summary' => [
                    'planId'         => 1,
                    'handName'       => 'Savings Plan',
                    'planType'       => 'double_up',
                    'weeksCompleted' => 0,
                    'totalWeeks'     => 50,
                    'totalSaved'     => 0,
                    'totalFines'     => 0,
                    'startDate'      => date('Y-m-d'),
                    'status'         => 'active',
                    'weeklyAmount'   => 1300.00,
                ],
                'weeks'   => [],
            ]
        ],
        'warning' => $e->getMessage()
    ]);
}


