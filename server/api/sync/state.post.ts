import { createError, defineEventHandler, readBody } from 'h3'
import { getTidbPool, isTidbConfigured } from '../../utils/db'

interface SyncPayloadBody {
  profileId?: string
  data?: {
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
    habits?: Array<{
      id: string
      title: string
      completed: boolean
      type?: 'daily' | 'once'
      alarmMode?: 'once' | 'repeat'
      reminderTime?: string
    }>
    twilights_notebooks?: Array<{
      id: string
      title: string
      content: string
      tag: string
      paperTheme: string
      createdAt: string
      updatedAt: string
    }>
    twilights_alarms?: Array<{
      id: string
      mode: string
      label: string
      targetTimestamp: number
      clockTime?: string
      createdAt: string
    }>
  }
}

/**
 * POST /api/sync/state
 * Menyimpan seluruh data produktivitas Twilight's ke 4 tabel di TiDB Cloud dalam 1 transaksi SQL.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'TiDB Cloud belum dikonfigurasi di .env',
    })
  }

  const body = await readBody<SyncPayloadBody>(event)
  const d = body?.data
  if (!d || typeof d !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payload data sinkronisasi tidak valid',
    })
  }

  const rawId = typeof body?.profileId === 'string' ? body.profileId.trim() : 'default'
  const profileId = /^[a-zA-Z0-9_-]{1,64}$/.test(rawId) ? rawId : 'default'

  const pool = await getTidbPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // 1. Upsert profil utama (twilights_profiles)
    await conn.query(
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
        String(d.userName || 'Teman Twilight').slice(0, 64),
        String(d.theme || 'twilight').slice(0, 24),
        JSON.stringify(Array.isArray(d.weeklyProgress) ? d.weeklyProgress : [0, 0, 0, 0, 0, 0, 0]),
        Math.max(0, Number(d.todayFocusSessions) || 0),
        Math.max(0, Number(d.totalFocusSessions) || 0),
        Math.max(0, Number(d.dailyStreak) || 0),
        String(d.streakLastDate || '').slice(0, 16),
        Math.max(0, Number(d.treatCoins) || 0),
        JSON.stringify(Array.isArray(d.ownedAccessories) ? d.ownedAccessories : []),
        String(d.equippedAccessory || 'none').slice(0, 32),
        String(d.quickNotes || ''),
        d.dailyMood ? String(d.dailyMood).slice(0, 24) : null,
        String(d.dailyRewardClaimedDate || '').slice(0, 16),
        d.isStarCursorEnabled === false ? 0 : 1,
        d.isBatterySaverMode ? 1 : 0,
        String(d.selectedAlarmSound || 'music-box').slice(0, 32),
        String(d.lastActiveDate || '').slice(0, 16),
      ],
    )

    // 2. Sinkronkan daftar habit (twilights_habits)
    await conn.query('DELETE FROM twilights_habits WHERE profile_id = ?', [profileId])
    const habitsList = Array.isArray(d.habits) ? d.habits : []
    for (let i = 0; i < habitsList.length; i++) {
      const h = habitsList[i]
      if (!h || typeof h.title !== 'string') continue
      await conn.query(
        'INSERT INTO twilights_habits (id, profile_id, title, completed, habit_type, alarm_mode, reminder_time, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          String(h.id || `habit-${i}`).slice(0, 80),
          profileId,
          h.title.slice(0, 200),
          h.completed ? 1 : 0,
          h.type === 'once' ? 'once' : 'daily',
          h.alarmMode === 'repeat' ? 'repeat' : 'once',
          h.reminderTime ? String(h.reminderTime).slice(0, 10) : null,
          i,
        ],
      )
    }

    // 3. Sinkronkan daftar Kawaii Notebook (twilights_notebooks)
    await conn.query('DELETE FROM twilights_notebooks WHERE profile_id = ?', [profileId])
    const notesList = Array.isArray(d.twilights_notebooks) ? d.twilights_notebooks : []
    for (let i = 0; i < notesList.length; i++) {
      const n = notesList[i]
      if (!n) continue
      await conn.query(
        'INSERT INTO twilights_notebooks (id, profile_id, title, content, tag, paper_theme, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          String(n.id || `note-${i}`).slice(0, 80),
          profileId,
          String(n.title || 'Catatan').slice(0, 200),
          String(n.content || ''),
          String(n.tag || 'general').slice(0, 24),
          String(n.paperTheme || 'lavender-lined').slice(0, 32),
          String(n.createdAt || new Date().toISOString()).slice(0, 40),
          String(n.updatedAt || new Date().toISOString()).slice(0, 40),
          i,
        ],
      )
    }

    // 4. Sinkronkan daftar Kawaii Alarm (twilights_alarms)
    await conn.query('DELETE FROM twilights_alarms WHERE profile_id = ?', [profileId])
    const alarmsList = Array.isArray(d.twilights_alarms) ? d.twilights_alarms : []
    for (let i = 0; i < alarmsList.length; i++) {
      const a = alarmsList[i]
      if (!a || typeof a.targetTimestamp !== 'number') continue
      await conn.query(
        'INSERT INTO twilights_alarms (id, profile_id, mode, label, target_timestamp, clock_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          String(a.id || `alarm-${i}`).slice(0, 80),
          profileId,
          String(a.mode || 'countdown').slice(0, 24),
          String(a.label || 'Alarm').slice(0, 200),
          Math.round(a.targetTimestamp),
          a.clockTime ? String(a.clockTime).slice(0, 10) : null,
          String(a.createdAt || new Date().toISOString()).slice(0, 40),
        ],
      )
    }

    await conn.commit()

    return {
      ok: true,
      savedAt: new Date().toISOString(),
    }
  } catch (err: unknown) {
    await conn.rollback().catch(() => {})
    const message = err instanceof Error ? err.message : 'Gagal menyimpan data ke TiDB Cloud'
    throw createError({
      statusCode: 502,
      statusMessage: message,
    })
  } finally {
    conn.release()
  }
})
