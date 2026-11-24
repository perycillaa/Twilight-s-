-- =====================================================================
-- Data Awal (Seed) Bersih untuk Database `twilights` di TiDB Cloud
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
  'default', 'Teman Twilight', 'twilight', '[0, 0, 0, 0, 0, 0, 0]',
  0, 0, 0, '',
  5, '[]', 'none', '',
  NULL, '', 1,
  0, 'music-box', CURDATE()
) ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
