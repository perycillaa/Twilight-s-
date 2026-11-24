import type { RowDataPacket } from 'mysql2/promise'
import { createError, defineEventHandler, getQuery } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface NotebookRow extends RowDataPacket {
  id: string
  title: string
  content: string
  tag: string
  paper_theme: string
  created_at: string
  updated_at: string
}

/**
 * READ — GET /api/notebooks?profileId=default
 * Mengambil seluruh daftar catatan dari tabel `twilights_notebooks`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const query = getQuery(event)
  const profileId = sanitizeProfileId(query.profileId)

  const pool = await getTidbPool()
  const [rows] = await pool.query<NotebookRow[]>(
    'SELECT id, title, content, tag, paper_theme, created_at, updated_at FROM twilights_notebooks WHERE profile_id = ? ORDER BY sort_order ASC, updated_at DESC',
    [profileId],
  )

  return {
    ok: true,
    items: rows.map(r => ({
      id: r.id,
      title: r.title,
      content: r.content,
      tag: r.tag,
      paperTheme: r.paper_theme,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  }
})
