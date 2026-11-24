import { createError, defineEventHandler, readBody } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface CreateAlarmBody {
  profileId?: string
  id?: string
  mode?: string
  label?: string
  targetTimestamp?: number
  clockTime?: string
  createdAt?: string
}

/**
 * CREATE — POST /api/alarms
 * Menambahkan alarm baru ke tabel `twilights_alarms`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const body = await readBody<CreateAlarmBody>(event)
  if (typeof body?.targetTimestamp !== 'number' || Number.isNaN(body.targetTimestamp)) {
    throw createError({ statusCode: 400, statusMessage: 'targetTimestamp alarm tidak valid' })
  }

  const profileId = sanitizeProfileId(body?.profileId)
  const id = (typeof body?.id === 'string' && body.id.trim())
    ? body.id.trim().slice(0, 80)
    : `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const mode = body.mode === 'clock' ? 'clock' : 'countdown'
  const label = String(body.label || 'Pengingat Twilight\'s ⏰').slice(0, 200)
  const targetTimestamp = Math.round(body.targetTimestamp)
  const clockTime = body.clockTime ? String(body.clockTime).slice(0, 10) : null
  const createdAt = String(body.createdAt || new Date().toISOString()).slice(0, 40)

  const pool = await getTidbPool()
  await pool.query(
    `INSERT INTO twilights_alarms (id, profile_id, mode, label, target_timestamp, clock_time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE label = VALUES(label), target_timestamp = VALUES(target_timestamp), clock_time = VALUES(clock_time)`,
    [id, profileId, mode, label, targetTimestamp, clockTime, createdAt],
  )

  return {
    ok: true,
    item: {
      id,
      mode,
      label,
      targetTimestamp,
      clockTime: clockTime || undefined,
      createdAt,
    },
  }
})
