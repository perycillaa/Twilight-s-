import type { RowDataPacket } from 'mysql2/promise'
import { createError, defineEventHandler, getQuery } from 'h3'
import { getTidbPool, isTidbConfigured } from '../../utils/db'

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

interface HabitRow extends RowDataPacket {
  id: string
  title: string
  completed: number
  habit_type?: string | null
  alarm_mode?: string | null
  reminder_time: string | null
}

interface NotebookRow extends RowDataPacket {
  id: string
  title: string
  content: string
  tag: string
  paper_theme: string
  created_at: string
  updated_at: string
}

interface AlarmRow extends RowDataPacket {
  id: string
  mode: string
  label: string
  target_timestamp: number
  clock_time: string | null
  created_at: string
}

function parseJsonColumn<T>(value: T | string, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value ?? fallback
}

/**
 * GET /api/sync/state?profileId=default
 * Mengambil seluruh data produktivitas Twilight's dari TiDB Cloud.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    return { ok: false, exists: false, reason: 'not_configured' }
  }

  const query = getQuery(event)
  const rawId = typeof query.profileId === 'string' ? query.profileId.trim() : 'default'
  const profileId = /^[a-zA-Z0-9_-]{1,64}$/.test(rawId) ? rawId : 'default'

  try {
    const pool = await getTidbPool()

    const [profileRows] = await pool.query<ProfileRow[]>(
      'SELECT * FROM twilights_profiles WHERE profile_id = ? LIMIT 1',
      [profileId],
    )

    const profile = profileRows[0]
    if (!profile) {
      return { ok: true, exists: false }
    }

    const [habitRows] = await pool.query<HabitRow[]>(
      'SELECT id, title, completed, habit_type, alarm_mode, reminder_time FROM twilights_habits WHERE profile_id = ? ORDER BY sort_order ASC',
      [profileId],
    )

    const [notebookRows] = await pool.query<NotebookRow[]>(
      'SELECT id, title, content, tag, paper_theme, created_at, updated_at FROM twilights_notebooks WHERE profile_id = ? ORDER BY sort_order ASC',
      [profileId],
    )

    const [alarmRows] = await pool.query<AlarmRow[]>(
      'SELECT id, mode, label, target_timestamp, clock_time, created_at FROM twilights_alarms WHERE profile_id = ? ORDER BY target_timestamp ASC',
      [profileId],
    )

    return {
      ok: true,
      exists: true,
      data: {
        userName: profile.user_name,
        theme: profile.theme,
        weeklyProgress: parseJsonColumn<number[]>(profile.weekly_progress, [0, 0, 0, 0, 0, 0, 0]),
        todayFocusSessions: Number(profile.today_focus_sessions) || 0,
        totalFocusSessions: Number(profile.total_focus_sessions) || 0,
        dailyStreak: Number(profile.daily_streak) || 0,
        streakLastDate: profile.streak_last_date || '',
        treatCoins: Number(profile.treat_coins) || 0,
        ownedAccessories: parseJsonColumn<string[]>(profile.owned_accessories, []),
        equippedAccessory: profile.equipped_accessory || 'none',
        quickNotes: profile.quick_notes || '',
        dailyMood: profile.daily_mood || null,
        dailyRewardClaimedDate: profile.daily_reward_claimed_date || '',
        isStarCursorEnabled: Boolean(profile.is_star_cursor_enabled),
        isBatterySaverMode: Boolean(profile.is_battery_saver_mode),
        selectedAlarmSound: profile.selected_alarm_sound || 'music-box',
        lastActiveDate: profile.last_active_date || '',
        habits: habitRows.map(h => ({
          id: h.id,
          title: h.title,
          completed: Boolean(h.completed),
          type: h.habit_type === 'once' ? 'once' : 'daily',
          alarmMode: h.alarm_mode === 'repeat' ? 'repeat' : 'once',
          reminderTime: h.reminder_time || undefined,
        })),
        twilights_notebooks: notebookRows.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tag: n.tag,
          paperTheme: n.paper_theme,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
        })),
        twilights_alarms: alarmRows.map(a => ({
          id: a.id,
          mode: a.mode,
          label: a.label,
          targetTimestamp: Number(a.target_timestamp),
          clockTime: a.clock_time || undefined,
          createdAt: a.created_at,
        })),
      },
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membaca data dari TiDB Cloud'
    throw createError({
      statusCode: 502,
      statusMessage: message,
    })
  }
})
