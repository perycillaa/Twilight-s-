import type { RowDataPacket } from 'mysql2/promise'
import { createError, defineEventHandler, getQuery } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface ProfileRow extends RowDataPacket {
  profile_id: string
  user_name: string
  theme: string
  weekly_progress: number[] | string
  today_focus_sessions: number
  total_focus_sessions: number
  daily_streak: number
  streak_last_date: string
  treat_coins: number
  owned_accessories: string[] | string
  equipped_accessory: string
  quick_notes: string
  daily_mood: string | null
  daily_reward_claimed_date: string
  is_star_cursor_enabled: number
  is_battery_saver_mode: number
  selected_alarm_sound: string
  last_active_date: string
}

/**
 * READ — GET /api/profile?profileId=default
 * Membaca data profil, statistik, koin 🐟, aksesori, mood, dan catatan cepat dari `twilights_profiles`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const query = getQuery(event)
  const profileId = sanitizeProfileId(query.profileId)

  const pool = await getTidbPool()
  const [rows] = await pool.query<ProfileRow[]>(
    'SELECT * FROM twilights_profiles WHERE profile_id = ? LIMIT 1',
    [profileId],
  )

  const profile = rows[0]
  if (!profile) {
    return { ok: true, exists: false }
  }

  return {
    ok: true,
    exists: true,
    profile,
  }
})
