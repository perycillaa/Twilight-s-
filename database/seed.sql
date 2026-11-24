-- =====================================================================
-- Data Awal (Seed) untuk Database `twilights` di TiDB Cloud
-- Jalankan setelah database/schema.sql
-- =====================================================================

USE `twilights`;

INSERT INTO `twilights_profiles` (
  `profile_id`, `user_name`, `theme`, `weekly_progress`,
  `today_focus_sessions`, `total_focus_sessions`, `daily_streak`, `streak_last_date`,
  `treat_coins`, `owned_accessories`, `equipped_accessory`, `quick_notes`,
  `daily_mood`, `daily_reward_claimed_date`, `is_star_cursor_enabled`,
  `is_battery_saver_mode`, `selected_alarm_sound`, `last_active_date`
) VALUES (
  'default', 'Teman Twilight', 'twilight', '[25, 0, 0, 0, 0, 0, 0]',
  1, 1, 1, CURDATE(),
  20, '[]', 'none', 'Database TiDB Cloud Twilight''s aktif! ✨',
  'calm', '', 1,
  0, 'music-box', CURDATE()
) ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `twilights_habits` (`id`, `profile_id`, `title`, `completed`, `reminder_time`, `sort_order`) VALUES
  ('habit-1', 'default', 'Minum air putih & stretching ringan', 1, '09:00', 0),
  ('habit-2', 'default', 'Fokus 1 sesi Pomodoro (25 menit)', 0, '14:00', 1),
  ('habit-3', 'default', 'Baca buku atau catatan 15 menit', 0, '20:00', 2),
  ('habit-4', 'default', 'Rapikan meja sebelum tidur', 0, NULL, 3)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `twilights_notebooks` (`id`, `profile_id`, `title`, `content`, `tag`, `paper_theme`, `created_at`, `updated_at`, `sort_order`) VALUES (
  'note-welcome-1',
  'default',
  'Selamat Datang di Twilight''s Notebook ✨',
  'Database TiDB Cloud sudah terhubung! Semua catatan, habit, alarm, dan koin ikan kering tersimpan otomatis di cloud.',
  'journal',
  'lavender-lined',
  NOW(),
  NOW(),
  0
) ON DUPLICATE KEY UPDATE `updated_at` = VALUES(`updated_at`);
