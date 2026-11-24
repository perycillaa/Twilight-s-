import { createError, defineEventHandler, readBody } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface CreateNotebookBody {
  profileId?: string
  id?: string
  title?: string
  content?: string
  tag?: string
  paperTheme?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * CREATE — POST /api/notebooks
 * Menyimpan halaman catatan baru ke tabel `twilights_notebooks`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const body = await readBody<CreateNotebookBody>(event)
  const profileId = sanitizeProfileId(body?.profileId)
  const nowIso = new Date().toISOString()

  const id = (typeof body?.id === 'string' && body.id.trim())
    ? body.id.trim().slice(0, 80)
    : `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const title = String(body?.title ?? 'Catatan Baru ✨').slice(0, 200)
  const content = String(body?.content ?? '')
  const tag = String(body?.tag ?? 'general').slice(0, 24)
  const paperTheme = String(body?.paperTheme ?? 'lavender-lined').slice(0, 32)
  const createdAt = String(body?.createdAt ?? nowIso).slice(0, 40)
  const updatedAt = String(body?.updatedAt ?? nowIso).slice(0, 40)

  const pool = await getTidbPool()
  await pool.query(
    `INSERT INTO twilights_notebooks (id, profile_id, title, content, tag, paper_theme, created_at, updated_at, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       content = VALUES(content),
       tag = VALUES(tag),
       paper_theme = VALUES(paper_theme),
       updated_at = VALUES(updated_at)`,
    [id, profileId, title, content, tag, paperTheme, createdAt, updatedAt],
  )

  return {
    ok: true,
    item: { id, title, content, tag, paperTheme, createdAt, updatedAt },
  }
})
