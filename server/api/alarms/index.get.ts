import type { RowDataPacket } from 'mysql2/promise'
import { createError, defineEventHandler, getQuery } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface AlarmRow extends RowDataPacket {
  id: string
  mode: string
  label: string
  target_timestamp: number
  clock_time: string | null
  created_at: string
}

/**
 * READ — GET /api/alarms?profileId=default
 * Mengambil seluruh alarm terjadwal dari tabel `twilights_alarms`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const query = getQuery(event)
  const profileId = sanitizeProfileId(query.profileId)

  const pool = await getTidbPool()
  const [rows] = await pool.query<AlarmRow[]>(
    'SELECT id, mode, label, target_timestamp, clock_time, created_at FROM twilights_alarms WHERE profile_id = ? ORDER BY target_timestamp ASC',
    [profileId],
  )

  return {
    ok: true,
    items: rows.map(r => ({
      id: r.id,
      mode: r.mode,
      label: r.label,
      targetTimestamp: Number(r.target_timestamp),
      clockTime: r.clock_time || undefined,
      createdAt: r.created_at,
    })),
  }
})
