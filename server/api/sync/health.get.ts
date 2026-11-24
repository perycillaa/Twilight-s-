import type { RowDataPacket } from 'mysql2/promise'
import { createError, defineEventHandler } from 'h3'
import { getTidbPool, isTidbConfigured } from '../../utils/db'

interface VersionRow extends RowDataPacket {
  version: string
  current_db: string
}

/**
 * GET /api/sync/health
 * Mengecek koneksi aktif ke TiDB Cloud Serverless dan memastikan 4 tabel sudah dibuat.
 */
export default defineEventHandler(async () => {
  if (!isTidbConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'TiDB Cloud belum dikonfigurasi di .env',
    })
  }

  try {
    const pool = await getTidbPool()
    const [rows] = await pool.query<VersionRow[]>(
      'SELECT VERSION() AS version, DATABASE() AS current_db',
    )
    const info = rows[0]

    return {
      ok: true,
      database: info?.current_db ?? 'twilights',
      version: info?.version ?? 'TiDB',
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal terhubung ke TiDB Cloud'
    throw createError({
      statusCode: 502,
      statusMessage: message,
    })
  }
})
