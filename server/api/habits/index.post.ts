import type { RowDataPacket } from 'mysql2/promise'
import { createError, defineEventHandler, readBody } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface CreateHabitBody {
  profileId?: string
  id?: string
  title?: string
  completed?: boolean
  type?: 'daily' | 'once'
  alarmMode?: 'once' | 'repeat'
  reminderTime?: string
}

interface MaxOrderRow extends RowDataPacket {
  max_order: number | null
}

/**
 * CREATE — POST /api/habits
 * Menambahkan 1 target kebiasaan baru langsung ke tabel `twilights_habits`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const body = await readBody<CreateHabitBody>(event)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Judul habit wajib diisi' })
  }

  const profileId = sanitizeProfileId(body?.profileId)
  const id = (typeof body?.id === 'string' && body.id.trim())
    ? body.id.trim().slice(0, 80)
    : `habit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const reminderTime = typeof body?.reminderTime === 'string' && body.reminderTime.trim()
    ? body.reminderTime.trim().slice(0, 10)
    : null

  const habitType = body?.type === 'once' ? 'once' : 'daily'
  const alarmMode = body?.alarmMode === 'repeat' ? 'repeat' : 'once'

  const pool = await getTidbPool()
  const [maxRows] = await pool.query<MaxOrderRow[]>(
    'SELECT MAX(sort_order) AS max_order FROM twilights_habits WHERE profile_id = ?',
    [profileId],
  )
  const nextOrder = (maxRows[0]?.max_order ?? -1) + 1

  await pool.query(
    `INSERT INTO twilights_habits (id, profile_id, title, completed, habit_type, alarm_mode, reminder_time, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), completed = VALUES(completed), habit_type = VALUES(habit_type), alarm_mode = VALUES(alarm_mode), reminder_time = VALUES(reminder_time)`,
    [id, profileId, title.slice(0, 200), body?.completed ? 1 : 0, habitType, alarmMode, reminderTime, nextOrder],
  )

  return {
    ok: true,
    item: {
      id,
      title: title.slice(0, 200),
      completed: Boolean(body?.completed),
      type: habitType,
      alarmMode,
      reminderTime: reminderTime || undefined,
    },
  }
})
