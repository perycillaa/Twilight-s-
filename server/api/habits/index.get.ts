import type { RowDataPacket } from 'mysql2/promise'
import { createError, defineEventHandler, getQuery } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface HabitRow extends RowDataPacket {
  id: string
  title: string
  completed: number
  habit_type?: string | null
  alarm_mode?: string | null
  reminder_time: string | null
  sort_order: number
}

/**
 * READ — GET /api/habits?profileId=default
 * Mengambil seluruh daftar habit dari tabel `twilights_habits`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const query = getQuery(event)
  const profileId = sanitizeProfileId(query.profileId)

  const pool = await getTidbPool()
  const [rows] = await pool.query<HabitRow[]>(
    'SELECT id, title, completed, habit_type, alarm_mode, reminder_time, sort_order FROM twilights_habits WHERE profile_id = ? ORDER BY sort_order ASC',
    [profileId],
  )

  return {
    ok: true,
    items: rows.map(r => ({
      id: r.id,
      title: r.title,
      completed: Boolean(r.completed),
      type: r.habit_type === 'once' ? 'once' : 'daily',
      alarmMode: r.alarm_mode === 'repeat' ? 'repeat' : 'once',
      reminderTime: r.reminder_time || undefined,
    })),
  }
})
