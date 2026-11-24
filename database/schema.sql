-- =====================================================================
-- Skema Database TiDB Cloud untuk Proyek Produktivitas "Twilight's"
-- PENTING: Menggunakan database baru `twilights` (TIDAK memakai `sys`!)
-- Skrip ini juga dijalankan otomatis oleh server/utils/db.ts saat server aktif.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `twilights`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `twilights`;

-- 1. Tabel Profil, Pengaturan, Statistik, Koin Ikan & Catatan Cepat
CREATE TABLE IF NOT EXISTS `twilights_profiles` (
  `profile_id` VARCHAR(64) PRIMARY KEY,
  `user_name` VARCHAR(64) NOT NULL DEFAULT 'Teman Twilight',
  `theme` VARCHAR(24) NOT NULL DEFAULT 'twilight',
  `weekly_progress` JSON NOT NULL,
  `today_focus_sessions` INT NOT NULL DEFAULT 0,
  `total_focus_sessions` INT NOT NULL DEFAULT 0,
  `daily_streak` INT NOT NULL DEFAULT 1,
  `streak_last_date` VARCHAR(16) NOT NULL DEFAULT '',
  `treat_coins` INT NOT NULL DEFAULT 10,
  `owned_accessories` JSON NOT NULL,
  `equipped_accessory` VARCHAR(32) NOT NULL DEFAULT 'none',
  `quick_notes` TEXT NOT NULL,
  `daily_mood` VARCHAR(24) NULL,
  `daily_reward_claimed_date` VARCHAR(16) NOT NULL DEFAULT '',
  `is_star_cursor_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `is_battery_saver_mode` TINYINT(1) NOT NULL DEFAULT 0,
  `selected_alarm_sound` VARCHAR(32) NOT NULL DEFAULT 'music-box',
  `last_active_date` VARCHAR(16) NOT NULL DEFAULT '',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Daily Habit Tracker (CRUD: GET, POST, PATCH, DELETE, RESET)
CREATE TABLE IF NOT EXISTS `twilights_habits` (
  `id` VARCHAR(80) NOT NULL,
  `profile_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `habit_type` VARCHAR(16) NOT NULL DEFAULT 'daily',
  `alarm_mode` VARCHAR(16) NOT NULL DEFAULT 'once',
  `reminder_time` VARCHAR(10) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`profile_id`, `id`),
  INDEX `idx_habits_profile` (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Kawaii Notebook (CRUD: GET, POST, PATCH, DELETE)
CREATE TABLE IF NOT EXISTS `twilights_notebooks` (
  `id` VARCHAR(80) NOT NULL,
  `profile_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `tag` VARCHAR(24) NOT NULL DEFAULT 'general',
  `paper_theme` VARCHAR(32) NOT NULL DEFAULT 'lavender-lined',
  `created_at` VARCHAR(40) NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`profile_id`, `id`),
  INDEX `idx_notebooks_profile` (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Kawaii Alarm (CRUD: GET, POST, DELETE)
CREATE TABLE IF NOT EXISTS `twilights_alarms` (
  `id` VARCHAR(80) NOT NULL,
  `profile_id` VARCHAR(64) NOT NULL,
  `mode` VARCHAR(24) NOT NULL DEFAULT 'countdown',
  `label` VARCHAR(200) NOT NULL,
  `target_timestamp` BIGINT NOT NULL,
  `clock_time` VARCHAR(10) NULL,
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`profile_id`, `id`),
  INDEX `idx_alarms_profile` (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
