import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface UpdateHabitBody {
  profileId?: string
  title?: string
  completed?: boolean
  type?: 'daily' | 'once'
  alarmMode?: 'once' | 'repeat'
  reminderTime?: string | null
}

/**
 * UPDATE — PATCH /api/habits/:id
 * Memperbarui status centang, judul, atau jam pengingat habit di `twilights_habits`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const id = getRouterParam(event, 'id')?.trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID habit tidak valid' })
  }

  const body = await readBody<UpdateHabitBody>(event)
  const profileId = sanitizeProfileId(body?.profileId)

  const fields: string[] = []
  const values: Array<string | number | null> = []

  if (typeof body?.title === 'string') {
    fields.push('title = ?')
    values.push(body.title.trim().slice(0, 200))
  }
  if (typeof body?.completed === 'boolean') {
    fields.push('completed = ?')
    values.push(body.completed ? 1 : 0)
  }
  if (body?.type === 'daily' || body?.type === 'once') {
    fields.push('habit_type = ?')
    values.push(body.type)
  }
  if (body?.alarmMode === 'once' || body?.alarmMode === 'repeat') {
    fields.push('alarm_mode = ?')
    values.push(body.alarmMode)
  }
  if (body?.reminderTime !== undefined) {
    fields.push('reminder_time = ?')
    values.push(body.reminderTime ? String(body.reminderTime).slice(0, 10) : null)
  }

  if (fields.length === 0) {
    return { ok: true, updated: false }
  }

  values.push(profileId, id.slice(0, 80))

  const pool = await getTidbPool()
  await pool.query(
    `UPDATE twilights_habits SET ${fields.join(', ')} WHERE profile_id = ? AND id = ?`,
    values,
  )

  return { ok: true, updated: true, id }
})
