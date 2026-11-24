import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

/**
 * DELETE — DELETE /api/alarms/:id?profileId=default
 * Menghapus 1 alarm dari tabel `twilights_alarms`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const id = getRouterParam(event, 'id')?.trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID alarm tidak valid' })
  }

  const query = getQuery(event)
  const profileId = sanitizeProfileId(query.profileId)

  const pool = await getTidbPool()
  await pool.query(
    'DELETE FROM twilights_alarms WHERE profile_id = ? AND id = ?',
    [profileId, id.slice(0, 80)],
  )

  return { ok: true, deletedId: id }
})
