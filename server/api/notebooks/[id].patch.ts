import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { getTidbPool, isTidbConfigured, sanitizeProfileId } from '../../utils/db'

interface UpdateNotebookBody {
  profileId?: string
  title?: string
  content?: string
  tag?: string
  paperTheme?: string
}

/**
 * UPDATE — PATCH /api/notebooks/:id
 * Memperbarui judul, isi teks, tag, atau tema kertas catatan di `twilights_notebooks`.
 */
export default defineEventHandler(async (event) => {
  if (!isTidbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'TiDB Cloud belum dikonfigurasi' })
  }

  const id = getRouterParam(event, 'id')?.trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID catatan tidak valid' })
  }

  const body = await readBody<UpdateNotebookBody>(event)
  const profileId = sanitizeProfileId(body?.profileId)
  const updatedAt = new Date().toISOString()

  const fields: string[] = ['updated_at = ?']
  const values: Array<string> = [updatedAt]

  if (typeof body?.title === 'string') {
    fields.push('title = ?')
    values.push(body.title.slice(0, 200))
  }
  if (typeof body?.content === 'string') {
    fields.push('content = ?')
    values.push(body.content)
  }
  if (typeof body?.tag === 'string') {
    fields.push('tag = ?')
    values.push(body.tag.slice(0, 24))
  }
  if (typeof body?.paperTheme === 'string') {
    fields.push('paper_theme = ?')
    values.push(body.paperTheme.slice(0, 32))
  }

  values.push(profileId, id.slice(0, 80))

  const pool = await getTidbPool()
  await pool.query(
    `UPDATE twilights_notebooks SET ${fields.join(', ')} WHERE profile_id = ? AND id = ?`,
    values,
  )

  return { ok: true, id, updatedAt }
})
