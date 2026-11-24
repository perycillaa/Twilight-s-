// Service Worker PWA Twilight's:
// 1. Offline Cache (menyimpan halaman utama, CSS, JS, dan ikon di Cache Storage agar berjalan offline)
// 2. Notifikasi Sistem (menangani klik pop-up notifikasi di Windows Action Center & bilah atas HP)

const CACHE_NAME = 'twilights-pwa-v1'
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-cat-moon.svg',
]

// Simpan aset inti web ke Cache Storage saat Service Worker pertama kali terpasang
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

// Bersihkan cache versi lama & langsung ambil alih kontrol tab yang terbuka
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Strategi Offline Cache:
// - Lewati request non-GET, endpoint API (/api/*), dan stream radio/YouTube lintas domain
// - Navigasi halaman (index.html /): Network-First dengan fallback Cache agar selalu bisa dibuka offline
// - Aset statis JS/CSS/ikon (/_nuxt/*, /icons/*, dll.): Cache-First / Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // 1. Halaman utama / navigasi HTML (Network-First + fallback ke cache '/' saat offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    )
    return
  }

  // 2. Aset statis aplikasi (JS, CSS, ikon, font lokal): sajikan dari cache lalu perbarui diam-diam
  const isStaticAsset =
    url.pathname.startsWith('/_nuxt/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.json' ||
    /\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
            }
            return response
          })
          .catch(() => cached)

        return cached || networkFetch
      }),
    )
  }
})

// Tangani klik pada pop-up notifikasi sistem (Windows maupun bilah atas HP):
// Tutup notifikasi lalu fokuskan atau buka kembali jendela/tab Twilight's.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const fallbackUrl = (self.registration && self.registration.scope) || '/'
  const targetUrl = (event.notification.data && event.notification.data.url) || fallbackUrl

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
