<?php
// ─── DigiAjo Global — Referral Milestone Check (Function) ────────────────────
// Called by admin/notifications.php on every poll.
// Checks for users who have 10+ active/paid referrals with milestone_bonus_paid=0
// and fires a single admin notification + email for each qualifying user.

require_once __DIR__ . '/../utils/email.php';

function check_referral_milestones(PDO $db): void {
    try {
        $stmt = $db->query("
            SELECT
                r.referrer_id,
                u.name     AS referrer_name,
                u.email    AS referrer_email,
                u.member_id,
                COUNT(r.id) AS active_count
            FROM referrals r
            JOIN users u ON r.referrer_id = u.id
            WHERE r.status IN ('active', 'paid')
              AND r.milestone_bonus_paid = 0
            GROUP BY r.referrer_id, u.name, u.email, u.member_id
            HAVING COUNT(r.id) >= 10
        ");
        $milestoneUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($milestoneUsers as $mu) {
            $referrerId   = (int)$mu['referrer_id'];
            $referrerName = $mu['referrer_name'];
            $referrerEmail = $mu['referrer_email'];
            $memberIdStr  = $mu['member_id'];
            $activeCount  = (int)$mu['active_count'];

            // Mark their active referrals milestone_bonus_paid = 1 to prevent re-trigger
            $upd = $db->prepare("
                UPDATE referrals
                SET milestone_bonus_paid = 1
                WHERE referrer_id = ?
                  AND status IN ('active', 'paid')
            ");
            $upd->execute([$referrerId]);

            // Insert admin-facing notification
            $notifTitle = "🎉 Referral Milestone: $referrerName";
            $notifBody  = "$referrerName ($memberIdStr) has reached $activeCount completed referrals and qualifies for a food item milestone bonus reward. Please process the reward.";

            insert_notification($db, [
                'audience' => 'admin',
                'title'    => $notifTitle,
                'body'     => $notifBody,
                'message'  => $notifBody,
                'kind'     => 'referral',
                'type'     => 'referral',
                'sent_at'  => date('Y-m-d H:i:s'),
            ]);

            // Also notify the member themselves
            $memberNotifTitle = "🎁 Milestone Bonus Unlocked!";
            $memberNotifBody  = "Congratulations! You've reached $activeCount completed referrals. Your food item bonus reward is being processed. Our team will reach out to you soon!";
            
            insert_notification($db, [
                'target_user' => $referrerId,
                'user_id'     => $referrerId,
                'audience'    => 'specific_user',
                'title'       => $memberNotifTitle,
                'body'        => $memberNotifBody,
                'message'     => $memberNotifBody,
                'kind'        => 'referral',
                'type'        => 'referral',
                'sent_at'     => date('Y-m-d H:i:s'),
            ]);

            // Email the admin
            $adminEmail = 'admin@digiajoglobal.com';
            $emailBody  = "
                <p>Hi Admin,</p>
                <p><strong>$referrerName</strong> (<em>$memberIdStr</em>) has reached <strong>$activeCount completed referrals</strong> and qualifies for the <strong>food item milestone bonus</strong>.</p>
                <p>Please log in to the <a href='https://digiajoglobal.com/admin'>admin dashboard</a> to process the reward.</p>
            ";
            try { send_email($adminEmail, $notifTitle, $emailBody); } catch (Exception $e) {}

            // Email the member too
            $memberEmailBody = "
                <p>Hi $referrerName,</p>
                <p>Congratulations! 🎉 You've reached <strong>$activeCount completed referrals</strong>.</p>
                <p>Your <strong>food item bonus reward</strong> has been unlocked and our team will be in touch shortly to deliver it.</p>
                <p>Keep referring to earn more!</p>
            ";
            try { send_email($referrerEmail, $memberNotifTitle, $memberEmailBody); } catch (Exception $e) {}
        }
    } catch (PDOException $e) {
        // Silently fail — don't break the main response
    }
}
