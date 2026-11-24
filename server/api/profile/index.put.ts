import { createError, defineEventHandler, readBody } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface UpdateProfileBody {
  profileId?: string
  userName?: string
  theme?: string
  weeklyProgress?: number[]
  todayFocusSessions?: number
  totalFocusSessions?: number
  dailyStreak?: number
  streakLastDate?: string
  treatCoins?: number
  ownedAccessories?: string[]
  equippedAccessory?: string
  quickNotes?: string
  dailyMood?: string | null
  dailyRewardClaimedDate?: string
  isStarCursorEnabled?: boolean
  isBatterySaverMode?: boolean
  selectedAlarmSound?: string
  lastActiveDate?: string
}

/**
 * CREATE / UPDATE — PUT /api/profile
 * Menyimpan perubahan profil, koin 🐟, aksesori, streak, mood, catatan cepat, dan grafik mingguan
 * ke tabel `twilights_profiles`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const body = await readBody<UpdateProfileBody>(event)
  const profileId = sanitizeProfileId(body?.profileId)

  const pool = await getTidbPool()
  await pool.query(
    `
    INSERT INTO twilights_profiles (
      profile_id, user_name, theme, weekly_progress,
      today_focus_sessions, total_focus_sessions,
      daily_streak, streak_last_date, treat_coins,
      owned_accessories, equipped_accessory, quick_notes,
      daily_mood, daily_reward_claimed_date,
      is_star_cursor_enabled, is_battery_saver_mode,
      selected_alarm_sound, last_active_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_name = VALUES(user_name),
      theme = VALUES(theme),
      weekly_progress = VALUES(weekly_progress),
      today_focus_sessions = VALUES(today_focus_sessions),
      total_focus_sessions = VALUES(total_focus_sessions),
      daily_streak = VALUES(daily_streak),
      streak_last_date = VALUES(streak_last_date),
      treat_coins = VALUES(treat_coins),
      owned_accessories = VALUES(owned_accessories),
      equipped_accessory = VALUES(equipped_accessory),
      quick_notes = VALUES(quick_notes),
      daily_mood = VALUES(daily_mood),
      daily_reward_claimed_date = VALUES(daily_reward_claimed_date),
      is_star_cursor_enabled = VALUES(is_star_cursor_enabled),
      is_battery_saver_mode = VALUES(is_battery_saver_mode),
      selected_alarm_sound = VALUES(selected_alarm_sound),
      last_active_date = VALUES(last_active_date)
    `,
    [
      profileId,
      String(body?.userName || 'Teman Twilight').slice(0, 64),
      String(body?.theme || 'twilight').slice(0, 24),
      JSON.stringify(Array.isArray(body?.weeklyProgress) ? body.weeklyProgress : [0, 0, 0, 0, 0, 0, 0]),
      Math.max(0, Number(body?.todayFocusSessions) || 0),
      Math.max(0, Number(body?.totalFocusSessions) || 0),
      Math.max(0, Number(body?.dailyStreak) || 0),
      String(body?.streakLastDate || '').slice(0, 16),
      Math.max(0, Number(body?.treatCoins) || 0),
      JSON.stringify(Array.isArray(body?.ownedAccessories) ? body.ownedAccessories : []),
      String(body?.equippedAccessory || 'none').slice(0, 32),
      String(body?.quickNotes || ''),
      body?.dailyMood ? String(body.dailyMood).slice(0, 24) : null,
      String(body?.dailyRewardClaimedDate || '').slice(0, 16),
      body?.isStarCursorEnabled === false ? 0 : 1,
      body?.isBatterySaverMode ? 1 : 0,
      String(body?.selectedAlarmSound || 'music-box').slice(0, 32),
      String(body?.lastActiveDate || '').slice(0, 16),
    ],
  )

  return { ok: true, savedAt: new Date().toISOString() }
})
