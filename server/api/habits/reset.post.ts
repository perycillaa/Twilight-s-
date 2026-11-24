import { createError, defineEventHandler, readBody } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

/**
 * UPDATE (RESET HARIAN) — POST /api/habits/reset
 * Mengosongkan semua centang habit (completed = 0) tanpa menghapus nama tugasnya.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const body = await readBody<{ profileId?: string }>(event).catch(() => ({ profileId: 'default' }))
  const profileId = sanitizeProfileId(body?.profileId)

  const pool = await getTidbPool()
  // Hapus target 1x Sekali yang sudah selesai, dan reset centang semua target Harian
  await pool.query(
    `DELETE FROM twilights_habits WHERE profile_id = ? AND habit_type = 'once' AND completed = 1`,
    [profileId],
  )
  await pool.query(
    `UPDATE twilights_habits SET completed = 0 WHERE profile_id = ? AND habit_type = 'daily'`,
    [profileId],
  )

  return { ok: true }
})
