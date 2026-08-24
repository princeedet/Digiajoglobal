-- =============================================================
--  DigiAjo Global -- Complete MySQL Database Schema
--  Platform: Savings & Investment (Double Up + DigiMart)
--  Created: 2026-07-15
--  Import:  mysql -u root -p < digiajoglobal.sql
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE DATABASE IF NOT EXISTS `digiajoglobal`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `digiajoglobal`;

-- =============================================================
--  TABLE: admins
-- =============================================================
CREATE TABLE IF NOT EXISTS `admins` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(120)   NOT NULL,
  `email`         VARCHAR(180)   NOT NULL UNIQUE,
  `password_hash` VARCHAR(255)   NOT NULL,
  `role`          ENUM('super_admin', 'support') NOT NULL DEFAULT 'support',
  `is_active`     TINYINT(1)     NOT NULL DEFAULT 1,
  `last_login_at` DATETIME       NULL,
  `created_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: users (members)
-- =============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `member_id`             VARCHAR(12)  NOT NULL UNIQUE    COMMENT 'e.g. DA-01824',
  `name`                  VARCHAR(120) NOT NULL,
  `email`                 VARCHAR(180) NOT NULL UNIQUE,
  `email_verified`        TINYINT(1)   NOT NULL DEFAULT 0,
  `phone`                 VARCHAR(25)  NOT NULL,
  `password_hash`         VARCHAR(255) NOT NULL,
  `status`                ENUM('active','suspended','pending_verification') NOT NULL DEFAULT 'pending_verification',
  `referral_code`         VARCHAR(20)  NOT NULL UNIQUE    COMMENT 'Users own shareable code',
  `referred_by`           INT UNSIGNED NULL               COMMENT 'FK to users.id of referrer',
  `registration_fee_paid` TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_name` (`name`),
  CONSTRAINT `fk_users_referrer` FOREIGN KEY (`referred_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: bank_accounts (payout bank details per user)
-- =============================================================
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT UNSIGNED  NOT NULL,
  `bank_name`      VARCHAR(120)  NOT NULL,
  `account_number` VARCHAR(20)   NOT NULL,
  `account_name`   VARCHAR(120)  NOT NULL,
  `is_primary`     TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bank_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: savings_plans (one active plan per member enrolment)
-- =============================================================
CREATE TABLE IF NOT EXISTS `savings_plans` (
  `id`                    INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  `user_id`               INT UNSIGNED   NOT NULL,
  `plan_type`             ENUM('double_up','digimart') NOT NULL DEFAULT 'double_up',
  `weekly_amount`         DECIMAL(12,2)  NOT NULL DEFAULT 1300.00,
  `total_weeks`           TINYINT        NOT NULL DEFAULT 50,
  `weeks_completed`       TINYINT        NOT NULL DEFAULT 0,
  `total_saved`           DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `total_fines`           DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `payout_amount`         DECIMAL(12,2)  NULL              COMMENT 'Set on completion = total_saved * 2',
  `start_date`            DATE           NOT NULL,
  `target_cashout_date`   DATE           NULL              COMMENT 'Auto-computed: start_date + (total_weeks * 7) days',
  `actual_cashout_date`   DATE           NULL,
  `status`                ENUM('active','completed','suspended','forfeited') NOT NULL DEFAULT 'active',
  `created_at`            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_savings_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: savings_records (one row per weekly payment slot)
-- =============================================================
CREATE TABLE IF NOT EXISTS `savings_records` (
  `id`          INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  `plan_id`     INT UNSIGNED   NOT NULL,
  `user_id`     INT UNSIGNED   NOT NULL,
  `week`        TINYINT        NOT NULL    COMMENT '1 to 50',
  `due_date`    DATE           NOT NULL,
  `paid_date`   DATE           NULL,
  `amount`      DECIMAL(12,2)  NOT NULL DEFAULT 1300.00,
  `fine_amount` DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  `fine_paid`   TINYINT(1)     NOT NULL DEFAULT 0,
  `status`      ENUM('paid','late','upcoming','missed') NOT NULL DEFAULT 'upcoming',
  `payment_id`  INT UNSIGNED   NULL        COMMENT 'FK to payments.id when paid',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_plan_week` (`plan_id`, `week`),
  CONSTRAINT `fk_savings_records_plan` FOREIGN KEY (`plan_id`) REFERENCES `savings_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_savings_records_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: digimart_investments (co-ownership units)
-- =============================================================
CREATE TABLE IF NOT EXISTS `digimart_investments` (
  `id`              INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT UNSIGNED   NOT NULL,
  `units`           TINYINT        NOT NULL DEFAULT 1,
  `unit_price`      DECIMAL(12,2)  NOT NULL DEFAULT 100000.00,
  `total_invested`  DECIMAL(12,2)  NOT NULL,
  `expected_return` DECIMAL(5,2)   NOT NULL DEFAULT 50.00   COMMENT 'Percentage e.g. 50.00 = 50%',
  `payout_amount`   DECIMAL(12,2)  NULL                     COMMENT 'Auto-computed by trigger',
  `investment_date` DATE           NOT NULL,
  `maturity_date`   DATE           NOT NULL                  COMMENT 'Auto-computed: investment_date + 12 months',
  `status`          ENUM('active','matured','paid_out') NOT NULL DEFAULT 'active',
  `certificate_ref` VARCHAR(60)    NULL UNIQUE               COMMENT 'Legal Investment Certificate reference',
  `payment_id`      INT UNSIGNED   NULL                      COMMENT 'FK to payments.id',
  `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_digimart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: payments (all inbound member transactions)
-- =============================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id`               INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  `payment_ref`      VARCHAR(40)    NOT NULL UNIQUE  COMMENT 'e.g. PAY-2419 or DGA/0712/824',
  `user_id`          INT UNSIGNED   NOT NULL,
  `amount`           DECIMAL(12,2)  NOT NULL,
  `channel`          ENUM('bank_transfer','card','ussd') NOT NULL,
  `purpose`          VARCHAR(200)   NOT NULL          COMMENT 'e.g. Week 32 contribution, DigiMart Unit 1',
  `payment_type`     ENUM('registration_fee','weekly_contribution','fine_payment','digimart_unit','other') NOT NULL,
  `status`           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `proof_url`        VARCHAR(500)   NULL              COMMENT 'URL to uploaded payment proof image',
  `reviewed_by`      INT UNSIGNED   NULL              COMMENT 'FK to admins.id',
  `reviewed_at`      DATETIME       NULL,
  `rejection_reason` VARCHAR(255)   NULL,
  `paid_at`          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_user`     FOREIGN KEY (`user_id`)     REFERENCES `users`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: payouts (admin-initiated disbursements to members)
-- =============================================================
CREATE TABLE IF NOT EXISTS `payouts` (
  `id`              INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  `payout_ref`      VARCHAR(40)    NOT NULL UNIQUE,
  `user_id`         INT UNSIGNED   NOT NULL,
  `plan_id`         INT UNSIGNED   NULL       COMMENT 'Linked savings plan (Double Up)',
  `digimart_id`     INT UNSIGNED   NULL       COMMENT 'Linked DigiMart investment',
  `amount`          DECIMAL(12,2)  NOT NULL,
  `payout_type`     ENUM('double_up_cashout','digimart_return','referral_commission','food_reward','manual') NOT NULL,
  `status`          ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `bank_account_id` INT UNSIGNED   NULL,
  `processed_by`    INT UNSIGNED   NULL       COMMENT 'FK to admins.id',
  `completed_at`    DATETIME       NULL,
  `notes`           TEXT           NULL,
  `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payouts_user`     FOREIGN KEY (`user_id`)         REFERENCES `users`                (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payouts_plan`     FOREIGN KEY (`plan_id`)         REFERENCES `savings_plans`        (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payouts_digimart` FOREIGN KEY (`digimart_id`)     REFERENCES `digimart_investments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payouts_bank`     FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`        (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payouts_admin`    FOREIGN KEY (`processed_by`)    REFERENCES `admins`               (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: referrals
-- =============================================================
CREATE TABLE IF NOT EXISTS `referrals` (
  `id`                  INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  `referrer_id`         INT UNSIGNED   NOT NULL  COMMENT 'User who shared their code',
  `referee_id`          INT UNSIGNED   NOT NULL  COMMENT 'User who joined using the code',
  `commission`          DECIMAL(10,2)  NOT NULL DEFAULT 1000.00,
  `status`              ENUM('pending','active','paid') NOT NULL DEFAULT 'pending',
  `milestone_bonus_paid` TINYINT(1)   NOT NULL DEFAULT 0,
  `paid_at`             DATETIME       NULL,
  `created_at`          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_referral_pair` (`referrer_id`, `referee_id`),
  CONSTRAINT `fk_referrals_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referrals_referee`  FOREIGN KEY (`referee_id`)  REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: notifications (admin-broadcast messages)
-- =============================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`          INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  `title`       VARCHAR(200)   NOT NULL,
  `body`        TEXT           NOT NULL,
  `kind`        ENUM('payment','referral','update','alert','payout') NOT NULL DEFAULT 'update',
  `audience`    ENUM('all','specific_user','plan_type') NOT NULL DEFAULT 'all',
  `target_user` INT UNSIGNED   NULL  COMMENT 'Populated when audience = specific_user',
  `target_plan` ENUM('double_up','digimart') NULL COMMENT 'Populated when audience = plan_type',
  `sent_by`     INT UNSIGNED   NULL  COMMENT 'FK to admins.id',
  `sent_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notif_user`  FOREIGN KEY (`target_user`) REFERENCES `users`  (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notif_admin` FOREIGN KEY (`sent_by`)     REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: user_notification_reads (tracks per-user read state)
-- =============================================================
CREATE TABLE IF NOT EXISTS `user_notification_reads` (
  `user_id`         INT UNSIGNED NOT NULL,
  `notification_id` INT UNSIGNED NOT NULL,
  `read_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `notification_id`),
  CONSTRAINT `fk_unr_user`  FOREIGN KEY (`user_id`)         REFERENCES `users`         (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_unr_notif` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: activity_logs (member-facing activity feed)
-- =============================================================
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT UNSIGNED NOT NULL,
  `title`      VARCHAR(200) NOT NULL,
  `body`       TEXT         NOT NULL,
  `kind`       ENUM('payment','referral','update','alert','payout','savings') NOT NULL,
  `reference`  VARCHAR(60)  NULL  COMMENT 'e.g. payment_ref or payout_ref',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLE: audit_log (admin action trail)
-- =============================================================
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `admin_id`    INT UNSIGNED NULL,
  `action`      VARCHAR(100) NOT NULL  COMMENT 'e.g. APPROVE_PAYMENT, SUSPEND_USER',
  `target_type` VARCHAR(50)  NULL      COMMENT 'e.g. payments, users',
  `target_id`   INT UNSIGNED NULL,
  `details`     JSON         NULL,
  `ip_address`  VARCHAR(45)  NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  INDEXES
-- =============================================================
CREATE INDEX `idx_users_phone`            ON `users`             (`phone`);
CREATE INDEX `idx_users_status`           ON `users`             (`status`);
CREATE INDEX `idx_payments_status`        ON `payments`          (`status`);
CREATE INDEX `idx_payments_user`          ON `payments`          (`user_id`);
CREATE INDEX `idx_payments_paid_at`       ON `payments`          (`paid_at`);
CREATE INDEX `idx_savings_records_user`   ON `savings_records`   (`user_id`, `week`);
CREATE INDEX `idx_savings_records_due`    ON `savings_records`   (`due_date`, `status`);
CREATE INDEX `idx_referrals_referrer`     ON `referrals`         (`referrer_id`, `status`);
CREATE INDEX `idx_payouts_user`           ON `payouts`           (`user_id`, `status`);
CREATE INDEX `idx_activity_user`          ON `activity_logs`     (`user_id`, `created_at`);
CREATE INDEX `idx_notifications_sent_at`  ON `notifications`     (`sent_at`);

-- =============================================================
--  TRIGGERS
-- =============================================================
DELIMITER $$

-- Auto-compute DigiMart payout_amount and maturity_date
CREATE TRIGGER `trg_digimart_payout_calc`
BEFORE INSERT ON `digimart_investments`
FOR EACH ROW
BEGIN
  IF NEW.payout_amount IS NULL THEN
    SET NEW.payout_amount = NEW.total_invested * (1 + NEW.expected_return / 100);
  END IF;
END$$

-- Auto-compute savings_plan target_cashout_date
CREATE TRIGGER `trg_savings_plan_dates`
BEFORE INSERT ON `savings_plans`
FOR EACH ROW
BEGIN
  IF NEW.target_cashout_date IS NULL THEN
    SET NEW.target_cashout_date = DATE_ADD(NEW.start_date, INTERVAL (NEW.total_weeks * 7) DAY);
  END IF;
END$$

-- Sync weeks_completed, total_saved, total_fines on savings_record update
CREATE TRIGGER `trg_savings_record_paid`
AFTER UPDATE ON `savings_records`
FOR EACH ROW
BEGIN
  IF NEW.status IN ('paid','late') AND OLD.status NOT IN ('paid','late') THEN
    UPDATE `savings_plans`
    SET
      weeks_completed = (
        SELECT COUNT(*) FROM `savings_records`
        WHERE plan_id = NEW.plan_id AND status IN ('paid','late')
      ),
      total_saved = (
        SELECT COALESCE(SUM(amount), 0) FROM `savings_records`
        WHERE plan_id = NEW.plan_id AND status IN ('paid','late')
      ),
      total_fines = (
        SELECT COALESCE(SUM(fine_amount), 0) FROM `savings_records`
        WHERE plan_id = NEW.plan_id AND fine_paid = 1
      )
    WHERE id = NEW.plan_id;
  END IF;
END$$

DELIMITER ;

-- =============================================================
--  VIEWS
-- =============================================================

-- Admin: member list with plan summary
CREATE OR REPLACE VIEW `v_member_summary` AS
SELECT
  u.id,
  u.member_id,
  u.name,
  u.email,
  u.phone,
  u.status,
  u.created_at          AS joined,
  sp.plan_type,
  sp.weeks_completed,
  sp.total_saved,
  sp.total_fines,
  sp.status             AS plan_status,
  sp.target_cashout_date,
  (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.status = 'active') AS active_referrals
FROM `users` u
LEFT JOIN `savings_plans` sp ON sp.user_id = u.id AND sp.status IN ('active','suspended');

-- Admin: payment list enriched with member and reviewer info
CREATE OR REPLACE VIEW `v_payment_summary` AS
SELECT
  p.id,
  p.payment_ref,
  u.name          AS member_name,
  u.member_id,
  p.amount,
  p.channel,
  p.purpose,
  p.payment_type,
  p.status,
  p.paid_at,
  p.reviewed_at,
  a.name          AS reviewed_by_name
FROM `payments` p
JOIN  `users`  u  ON u.id = p.user_id
LEFT JOIN `admins` a ON a.id = p.reviewed_by;

-- Member: referral earnings summary
CREATE OR REPLACE VIEW `v_referral_earnings` AS
SELECT
  r.referrer_id,
  u.name        AS referee_name,
  u.phone       AS referee_phone,
  r.created_at  AS joined,
  r.status,
  r.commission  AS earnings
FROM `referrals` r
JOIN `users` u ON u.id = r.referee_id;

-- Admin: payout queue with member and bank info
CREATE OR REPLACE VIEW `v_payout_queue` AS
SELECT
  po.id,
  po.payout_ref,
  u.name          AS member_name,
  u.member_id,
  po.amount,
  po.payout_type,
  po.status,
  ba.bank_name,
  ba.account_number,
  ba.account_name,
  po.created_at,
  po.completed_at
FROM `payouts` po
JOIN  `users`         u  ON u.id  = po.user_id
LEFT JOIN `bank_accounts` ba ON ba.id = po.bank_account_id;

-- =============================================================
--  SEED DATA
-- =============================================================

-- Admins
INSERT INTO `admins` (`name`, `email`, `password_hash`, `role`) VALUES
('Tosin Adewale',  'admin@digiajoglobal.com',   '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'super_admin'),
('Support Agent',  'support@digiajoglobal.com', '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'support');

-- Users / Members (ordered by join date so IDs match foreign keys below)
INSERT INTO `users` (`member_id`, `name`, `email`, `phone`, `password_hash`, `status`, `referral_code`, `registration_fee_paid`, `created_at`) VALUES
('DA-01647', 'Oluwaseun Balogun', 'seun@example.com',     '08024221190', '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'active',    'SEUN647',     1, '2025-10-24 08:00:00'),
('DA-01792', 'Kunle Adebayo',     'kunle@example.com',    '08165554382', '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'active',    'KUNLE792',    1, '2025-11-19 09:00:00'),
('DA-01824', 'Adebimpe Adeyemi',  'adebimpe@example.com', '08032348182', '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'active',    'ADEBIMPE824', 1, '2025-12-02 10:00:00'),
('DA-01904', 'David Nwosu',       'david@example.com',    '08103900028', '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'suspended', 'DAVID904',    1, '2026-01-22 11:00:00'),
('DA-02018', 'Chiamaka Okafor',   'chiamaka@example.com', '08096631902', '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'active',    'CHIAMAKA018', 1, '2026-04-12 12:00:00'),
('DA-02101', 'Maryam Bello',      'maryam@example.com',   '08087122931', '$2y$12$REPLACE_WITH_BCRYPT_HASH', 'active',    'MARYAM101',   1, '2026-05-18 13:00:00');
-- user_id: 1=Seun, 2=Kunle, 3=Adebimpe, 4=David, 5=Chiamaka, 6=Maryam

-- Bank Accounts
INSERT INTO `bank_accounts` (`user_id`, `bank_name`, `account_number`, `account_name`) VALUES
(1, 'First Bank',    '2045678901', 'Oluwaseun Balogun'),
(2, 'Access Bank',   '3012345678', 'Kunle Adebayo'),
(3, 'GTBank',        '0123456789', 'Adebimpe Adeyemi'),
(4, 'Zenith Bank',   '4056789012', 'David Nwosu'),
(5, 'UBA',           '5023456789', 'Chiamaka Okafor'),
(6, 'Stanbic IBTC',  '6078901234', 'Maryam Bello');

-- Savings Plans (Double Up)
-- plan_id: 1=Seun(w27), 2=Kunle(w19), 3=Adebimpe(w32), 4=David(suspended,w14), 5=Chiamaka(w12)
INSERT INTO `savings_plans` (`user_id`, `plan_type`, `weekly_amount`, `total_weeks`, `weeks_completed`, `total_saved`, `total_fines`, `start_date`, `status`) VALUES
(1, 'double_up', 1300, 50, 27, 35100,    0, '2025-10-25', 'active'),
(2, 'double_up', 1300, 50, 19, 24700,    0, '2025-11-22', 'active'),
(3, 'double_up', 1300, 50, 32, 41600, 1300, '2025-12-06', 'active'),
(4, 'double_up', 1300, 50, 14, 18200, 2600, '2026-01-24', 'suspended'),
(5, 'double_up', 1300, 50, 12, 15600,    0, '2026-04-18', 'active');

-- DigiMart Investment (Maryam, user_id=6)
INSERT INTO `digimart_investments` (`user_id`, `units`, `unit_price`, `total_invested`, `expected_return`, `investment_date`, `maturity_date`, `status`, `certificate_ref`, `payout_amount`) VALUES
(6, 1, 100000.00, 100000.00, 50.00, '2026-05-18', '2027-05-18', 'active', 'DGM-CERT-2101', 150000.00);

-- Payments (approved/rejected/pending)
-- payment_id sequence: 1=PAY-2260, 2=PAY-2298, 3=PAY-2348, 4=PAY-2387, 5=PAY-2408,
--                      6=PAY-2419, 7=PAY-2431, 8=PAY-2444, 9=PAY-2448, 10=PAY-2450, 11=PAY-2451
INSERT INTO `payments` (`payment_ref`, `user_id`, `amount`, `channel`, `purpose`, `payment_type`, `status`, `paid_at`, `reviewed_by`, `reviewed_at`) VALUES
('PAY-2260', 3,      1300, 'card',          'Week 28 contribution',     'weekly_contribution', 'approved', '2026-06-14 10:00:00', 1, '2026-06-14 11:00:00'),
('PAY-2298', 3,      1300, 'bank_transfer', 'Week 29 contribution',     'weekly_contribution', 'approved', '2026-06-21 08:00:00', 1, '2026-06-21 09:00:00'),
('PAY-2348', 3,      1300, 'ussd',          'Week 30 contribution',     'weekly_contribution', 'approved', '2026-06-30 11:00:00', 1, '2026-06-30 12:00:00'),
('PAY-2387', 3,      1300, 'card',          'Week 31 contribution',     'weekly_contribution', 'approved', '2026-07-05 09:00:00', 1, '2026-07-05 10:00:00'),
('PAY-2408', 4,      1300, 'ussd',          'Week 14 contribution',     'weekly_contribution', 'rejected', '2026-07-11 18:04:00', 1, '2026-07-11 19:00:00'),
('PAY-2419', 3,      1300, 'bank_transfer', 'Week 32 contribution',     'weekly_contribution', 'approved', '2026-07-12 07:23:00', 1, '2026-07-12 08:00:00'),
('PAY-2431', 6, 100000.00, 'bank_transfer', 'DigiMart Unit 1',          'digimart_unit',       'approved', '2026-07-12 13:13:00', 1, '2026-07-12 14:00:00'),
('PAY-2444', 1,      1300, 'bank_transfer', 'Week 27 contribution',     'weekly_contribution', 'pending',  '2026-07-13 16:31:00', NULL, NULL),
('PAY-2448', 3,      1300, 'card',          'Week 35 contribution',     'weekly_contribution', 'approved', '2026-07-14 08:55:00', 1, '2026-07-14 09:30:00'),
('PAY-2450', 2,      2600, 'bank_transfer', 'Weeks 19-20 contribution', 'weekly_contribution', 'pending',  '2026-07-14 09:18:00', NULL, NULL),
('PAY-2451', 5,      1300, 'bank_transfer', 'Week 12 contribution',     'weekly_contribution', 'pending',  '2026-07-14 10:42:00', NULL, NULL);

-- Savings Records for Adebimpe (user_id=3, plan_id=3)
INSERT INTO `savings_records` (`plan_id`, `user_id`, `week`, `due_date`, `paid_date`, `amount`, `fine_amount`, `fine_paid`, `status`, `payment_id`) VALUES
(3, 3, 28, '2026-06-14', '2026-06-14', 1300,    0, 0, 'paid',     1),
(3, 3, 29, '2026-06-21', '2026-06-21', 1300,    0, 0, 'paid',     2),
(3, 3, 30, '2026-06-28', '2026-06-30', 1300, 1300, 1, 'late',     3),
(3, 3, 31, '2026-07-05', '2026-07-05', 1300,    0, 0, 'paid',     4),
(3, 3, 32, '2026-07-12', '2026-07-12', 1300,    0, 0, 'paid',     6),
(3, 3, 33, '2026-07-19', NULL,          1300,   0, 0, 'upcoming', NULL);

-- Referrals (Adebimpe user_id=3 is the referrer)
INSERT INTO `referrals` (`referrer_id`, `referee_id`, `commission`, `status`, `paid_at`) VALUES
(3, 1, 1000, 'active',  '2026-06-28 12:00:00'),
(3, 2, 1000, 'active',  '2026-07-04 09:00:00'),
(3, 4, 1000, 'active',  '2026-07-10 14:00:00'),
(3, 5,    0, 'pending', NULL);

-- Notifications (admin broadcasts)
INSERT INTO `notifications` (`title`, `body`, `kind`, `audience`, `sent_by`, `sent_at`) VALUES
('Welcome to DigiAjo Global!',
 'Your account has been successfully activated. Start saving with DigiAjo Double Up today!',
 'update', 'all', 1, '2026-01-01 08:00:00'),

('Contribution Reminder',
 'All weekly contributions of N1,300 are due by 11:59 PM every Saturday. Avoid fines by paying on time.',
 'update', 'all', 1, '2026-07-10 09:00:00'),

('Your Week 32 contribution was confirmed',
 'N1,300 received via bank transfer. Thank you for staying consistent!',
 'payment', 'specific_user', 1, '2026-07-12 08:05:00');

-- Activity Logs (member feed for Adebimpe, user_id=3)
INSERT INTO `activity_logs` (`user_id`, `title`, `body`, `kind`, `reference`, `created_at`) VALUES
(3, 'Your Week 32 contribution was confirmed', 'N1,300 received via bank transfer.',              'payment',  'PAY-2419', '2026-07-12 08:05:00'),
(3, 'New referral joined using your code',     'Amarachi Eze is awaiting activation.',           'referral', NULL,       '2026-07-14 10:20:00'),
(3, 'Company update: payment reminders',       'Contributions are due by 11:59 PM every Saturday.', 'update', NULL,       '2026-07-10 09:00:00');

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
--  USAGE NOTES
--  1. Import:  mysql -u root -p < digiajoglobal.sql
--  2. Replace all '$2y$12$REPLACE_WITH_BCRYPT_HASH' values with
--     real bcrypt hashes before production use.
--  3. The DELIMITER $$ / DELIMITER ; blocks require the MySQL
--     CLI client. In phpMyAdmin, run triggers section separately
--     without DELIMITER statements.
-- =============================================================
