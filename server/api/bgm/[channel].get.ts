import { createError, defineEventHandler, getRouterParam, sendStream, setHeader } from 'h3'

// Daftar resmi channel radio lo-fi online (whitelist agar aman)
// Aliran SomaFM menolak header Referer dari localhost (HTTP 403), sehingga
// diteruskan melalui endpoint Nuxt server ini tanpa Referer agar bisa diputar mulus.
const STREAM_SOURCES: Record<string, string> = {
  'groove-salad': 'https://ice1.somafm.com/groovesalad-128-mp3',
  'drone-zone': 'https://ice1.somafm.com/dronezone-128-mp3',
  'lush': 'https://ice1.somafm.com/lush-128-mp3',
  'vaporwaves': 'https://ice1.somafm.com/vaporwaves-128-mp3',
  'bossa': 'https://ice1.somafm.com/bossa-128-mp3',
  'fluid': 'https://ice1.somafm.com/fluid-128-mp3',
  'beat-blender': 'https://ice1.somafm.com/beatblender-128-mp3',
  'deep-space': 'https://ice1.somafm.com/deepspaceone-128-mp3',
  'secret-agent': 'https://ice1.somafm.com/secretagent-128-mp3',
  'space-station': 'https://ice1.somafm.com/spacestation-128-mp3',
}

export default defineEventHandler(async (event) => {
  const channel = getRouterParam(event, 'channel') ?? ''
  const targetUrl = STREAM_SOURCES[channel]

  if (!targetUrl) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Channel BGM tidak ditemukan',
    })
  }

  // Putus koneksi ke server radio otomatis saat pengguna menekan Pause atau menutup tab
  const controller = new AbortController()
  event.node.req.on('close', () => {
    controller.abort()
  })

  try {
    // Ambil aliran audio tanpa header Referer dengan User-Agent standar browser
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8',
      },
      signal: controller.signal,
    })

    if (!upstream.ok || !upstream.body) {
      throw createError({
        statusCode: 502,
        statusMessage: `Server radio mengembalikan status HTTP ${upstream.status}`,
      })
    }

    setHeader(event, 'Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')

    // Kirim Web ReadableStream langsung melalui sendStream H3 (tanpa perlu import node:stream)
    return sendStream(event, upstream.body)
  } catch (err: unknown) {
    // Abaikan error AbortError normal ketika pengguna berhenti memutar musik
    if (err instanceof Error && err.name === 'AbortError') {
      return
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'Gagal terhubung ke aliran radio SomaFM',
    })
  }
})
