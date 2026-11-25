import { useSoundEffects } from '~/composables/useSoundEffects'

export type SystemNotificationState = NotificationPermission | 'unsupported'

const DEFAULT_APP_TITLE = "Twilight's — Cheer your day with me!"

// Tipe tambahan agar opsi `vibrate` & `renotify` pada ServiceWorkerRegistration.showNotification aman secara TypeScript
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[]
  renotify?: boolean
}

export interface MediaTimerStatus {
  isRunning: boolean
  isPaused: boolean
  modeLabel: string
  totalSeconds: number
  remainingSeconds: number
  targetEndTimeMs: number | null
}

export interface MediaBgmStatus {
  isRadioPlaying: boolean
  radioTitle: string
  radioSubtitle: string
  activeAmbientLabels: string[]
  isMuted: boolean
}

export interface MediaSessionActionHandlers {
  onToggleRadio?: () => void
  onNextRadio?: () => void
  onPrevRadio?: () => void
  onToggleTimer?: () => void
}

const RUNNING_TIMER_NOTIF_TAG = 'twilights-timer-running'

// Tipe event resmi browser untuk dialog instalasi PWA (`beforeinstallprompt`)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// --- Singleton module state (berbagi lintas komponen agar tidak ganda) ---
let keepAliveOsc: OscillatorNode | null = null
let keepAliveGain: GainNode | null = null
let isKeepAliveWanted = false

// Anchor HTML <audio> senyap (WAV 1 detik in-memory) agar Android Chrome & iOS Safari mengenali
// sesi Web Audio (Ambient Mixer) / Timer sebagai Foreground Media Player saat kembali ke Home Screen
let mediaAnchorAudio: HTMLAudioElement | null = null
let mediaAnchorBlobUrl: string | null = null
let isMediaAnchorWanted = false

// Referensi notifikasi langsung (Desktop Windows Action Center) agar bisa ditutup otomatis saat user kembali ke tab
let activeRunningDirectNotif: Notification | null = null
let isRunningTimerNotifShown = false

// State gabungan untuk Kartu Media Session (Lock Screen / Status Bar HP & Windows Media Overlay)
let mediaTimerState: MediaTimerStatus = {
  isRunning: false,
  isPaused: false,
  modeLabel: 'Fokus',
  totalSeconds: 1500,
  remainingSeconds: 1500,
  targetEndTimeMs: null,
}

let mediaBgmState: MediaBgmStatus = {
  isRadioPlaying: false,
  radioTitle: '',
  radioSubtitle: '',
  activeAmbientLabels: [],
  isMuted: false,
}

const mediaActionHandlers: MediaSessionActionHandlers = {}
let mediaHandlersRegistered = false

let wakeLockSentinel: WakeLockSentinel | null = null
let isWakeLockWanted = false

let titleBlinkInterval: ReturnType<typeof setInterval> | null = null
let titleBlinkShowingAlert = false
let titleBeforeBlink = DEFAULT_APP_TITLE

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
let pwaListenersAttached = false

/** Buat file WAV PCM mono 8kHz berdurasi 2 detik nyaris hening untuk menjaga Foreground Audio di HP */
function createSilentWavBlobUrl(): string | null {
  if (typeof window === 'undefined' || typeof Blob === 'undefined') return null
  if (mediaAnchorBlobUrl) return mediaAnchorBlobUrl

  try {
    const sampleRate = 8000
    const numSamples = sampleRate * 2 // 2 detik
    const dataSize = numSamples * 2 // 16-bit mono
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // PCM chunk size
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, 1, true) // Mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // Byte rate
    view.setUint16(32, 2, true) // Block align
    view.setUint16(34, 16, true) // Bits per sample
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    // Isi amplitudo 1 LSB agar sebagian OS tidak menganggap stream benar-benar kosong/mati,
    // namun tetap 100% tidak terdengar oleh telinga manusia (~ -90 dBFS)
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(44 + i * 2, i % 2 === 0 ? 1 : -1, true)
    }

    const blob = new Blob([buffer], { type: 'audio/wav' })
    mediaAnchorBlobUrl = URL.createObjectURL(blob)
    return mediaAnchorBlobUrl
  } catch {
    return null
  }
}

function formatClockHHMM(timestampMs: number): string {
  const d = new Date(timestampMs)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatCompactDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Composable Ketahanan Latar Belakang & Notifikasi Sistem Twilight's:
 * 1. Pendaftaran Service Worker (/sw.js) & manajemen izin Notification API.
 * 2. Fungsi terpadu `kirimNotifikasiSistem(judul, pesan, isBerulang)` untuk Windows Action Center & bilah atas HP.
 * 3. Background Audio Keep-Alive (silent Web Audio API loop pada AudioContext yang sama).
 * 4. Screen Wake Lock opsional saat Pomodoro Timer sedang berjalan.
 * 5. Kedip judul tab browser (document.title) setiap 1 detik saat alarm berbunyi.
 */
export function useBackgroundResilience() {
  const { getSharedAudioContext } = useSoundEffects()

  const notificationPermission = useState<SystemNotificationState>(
    'twilights-notif-permission',
    () => 'default',
  )
  const isServiceWorkerReady = useState<boolean>('twilights-sw-ready', () => false)
  const isTabTitleBlinking = useState<boolean>('twilights-tab-title-blinking', () => false)

  // --- State Instalasi PWA (tombol "📲 Instal Aplikasi" + petunjuk khusus Safari iOS) ---
  const canInstallPwa = useState<boolean>('twilights-can-install-pwa', () => false)
  const isIosSafariInstallable = useState<boolean>('twilights-ios-installable', () => false)
  const isPwaInstalled = useState<boolean>('twilights-pwa-installed', () => false)
  const showIosInstallGuide = useState<boolean>('twilights-ios-guide-open', () => false)

  /** Cek apakah web sudah berjalan dalam mode aplikasi standalone (terinstal) */
  function checkIsStandaloneMode(): boolean {
    if (!import.meta.client) return false
    const navWithStandalone = window.navigator as Navigator & { standalone?: boolean }
    return (
      Boolean(navWithStandalone.standalone) ||
      window.matchMedia('(display-mode: standalone)').matches
    )
  }

  /**
   * Daftarkan listener `beforeinstallprompt` & `appinstalled`, serta deteksi Safari iOS
   * yang belum terinstal (`!window.navigator.standalone`).
   */
  function initPwaInstallListeners() {
    if (!import.meta.client) return

    const alreadyStandalone = checkIsStandaloneMode()
    if (alreadyStandalone) {
      isPwaInstalled.value = true
      canInstallPwa.value = false
      isIosSafariInstallable.value = false
      return
    }

    // Deteksi iPhone / iPad (iOS Safari) yang belum terinstal ke Home Screen
    const ua = window.navigator.userAgent || ''
    const isIosDevice = /iPhone|iPad|iPod/i.test(ua)
    const isSafariLike = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
    if (isIosDevice && isSafariLike) {
      isIosSafariInstallable.value = true
    }

    if (pwaListenersAttached) return
    pwaListenersAttached = true

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault()
      deferredInstallPrompt = event as BeforeInstallPromptEvent
      canInstallPwa.value = true
    })

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null
      canInstallPwa.value = false
      isIosSafariInstallable.value = false
      isPwaInstalled.value = true
      showIosInstallGuide.value = false
    })
  }

  /**
   * Dipanggil saat tombol "📲 Instal Aplikasi" diklik:
   * - Chrome/Edge/Android/Desktop: jalankan dialog resmi `deferredPrompt.prompt()`.
   * - Safari iOS: tampilkan petunjuk ringkas Add to Home Screen.
   */
  async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'ios-guide' | 'unavailable'> {
    if (!import.meta.client) return 'unavailable'

    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt()
        const choice = await deferredInstallPrompt.userChoice
        if (choice.outcome === 'accepted') {
          deferredInstallPrompt = null
          canInstallPwa.value = false
          isPwaInstalled.value = true
        }
        return choice.outcome
      } catch {
        return 'unavailable'
      }
    }

    if (isIosSafariInstallable.value) {
      showIosInstallGuide.value = !showIosInstallGuide.value
      return 'ios-guide'
    }

    return 'unavailable'
  }

  function dismissIosInstallGuide() {
    showIosInstallGuide.value = false
  }

  /** Sinkronkan status izin notifikasi terkini dari browser */
  function syncNotificationPermission(): SystemNotificationState {
    if (!import.meta.client) return 'default'
    if (!('Notification' in window)) {
      notificationPermission.value = 'unsupported'
      return 'unsupported'
    }
    notificationPermission.value = Notification.permission
    return Notification.permission
  }

  /** Daftarkan Service Worker secara aman agar notifikasi sistem didukung di HP & PC (kompatibel subpath GitHub Pages) */
  async function registerServiceWorker() {
    if (!import.meta.client) return
    syncNotificationPermission()

    if (!('serviceWorker' in navigator)) return
    try {
      const swUrl = new URL('sw.js', document.baseURI).href
      const scopeUrl = new URL('./', document.baseURI).href
      await navigator.serviceWorker.register(swUrl, { scope: scopeUrl })
      await navigator.serviceWorker.ready
      isServiceWorkerReady.value = true
    } catch {
      isServiceWorkerReady.value = false
    }
  }

  /**
   * Minta izin notifikasi sistem secara ramah:
   * - Jika `onlyWhenDefault = true`, hanya memicu prompt browser ketika status masih `'default'`.
   */
  async function requestNotificationPermission(
    onlyWhenDefault = false,
  ): Promise<SystemNotificationState> {
    const current = syncNotificationPermission()
    if (current === 'unsupported') return 'unsupported'
    if (onlyWhenDefault && current !== 'default') return current
    if (current === 'granted' || current === 'denied') return current

    try {
      const result = await Notification.requestPermission()
      notificationPermission.value = result
      return result
    } catch {
      return syncNotificationPermission()
    }
  }

  /**
   * Fungsi `sendDesktopBanner(title, body, tagName)`:
   * Memunculkan Windows System Toast Notification (pojok kanan bawah desktop) & push banner HP Android:
   * - Di PC/Desktop (Windows/Mac): langsung memanggil `new Notification(title, options)` dengan
   *   `requireInteraction: true`, `silent: false`, `icon`, & `onclick -> window.focus() + close()`,
   *   dengan fallback otomatis ke `registration.showNotification(...)` jika diperlukan.
   * - Di HP/Android: memprioritaskan `registration.showNotification(...)` lewat Service Worker
   *   agar muncul di status bar & lockscreen HP.
   */
  async function sendDesktopBanner(
    title: string,
    body: string,
    tagName?: string,
    requireInteraction = true,
  ): Promise<boolean> {
    if (!import.meta.client) return false
    const perm = syncNotificationPermission()
    if (perm !== 'granted') return false

    const iconUrl = new URL('icons/icon-192.png', document.baseURI).href
    const uniqueTag = tagName || `twilights-banner-${Date.now()}`
    const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')

    const swOptions: ExtendedNotificationOptions = {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: uniqueTag,
      renotify: true,
      requireInteraction,
      silent: false,
      vibrate: [250, 120, 250, 120, 450],
      data: { url: window.location.href },
    }

    const tryServiceWorkerNotify = async (): Promise<boolean> => {
      if (!('serviceWorker' in navigator)) return false
      try {
        if (!isServiceWorkerReady.value) {
          await registerServiceWorker()
        }
        const reg = await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 1500)),
        ])
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, swOptions)
          return true
        }
      } catch {
        // Fallback jika SW gagal
      }
      return false
    }

    const tryDesktopDirectNotify = (): boolean => {
      try {
        const notif = new Notification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag: uniqueTag,
          requireInteraction,
          silent: false,
        })
        notif.onclick = () => {
          try {
            window.focus()
          } catch {
            // Abaikan jika browser membatasi focus
          }
          notif.close()
        }
        return true
      } catch {
        return false
      }
    }

    if (isMobileUa) {
      // Di HP/Android: wajib lewat Service Worker agar muncul di status bar & lockscreen
      const swSent = await tryServiceWorkerNotify()
      if (swSent) return true
      return tryDesktopDirectNotify()
    }

    // Di PC/Windows Desktop: langsung panggil `new Notification(...)` agar Windows Toast langsung muncul,
    // lalu fallback ke Service Worker jika browser membatasi konstruktor Notification langsung.
    if (tryDesktopDirectNotify()) return true
    return await tryServiceWorkerNotify()
  }

  /**
   * Wrapper kompatibilitas `kirimNotifikasiSistem` yang meneruskan langsung ke `sendDesktopBanner`.
   */
  async function kirimNotifikasiSistem(
    judul: string,
    pesan: string,
    requireInteraction = true,
    tag?: string,
  ): Promise<boolean> {
    return await sendDesktopBanner(judul, pesan, tag, requireInteraction)
  }

  /**
   * Notifikasi Status Timer Sedang Berjalan (untuk Windows Action Center di PC seperti WA,
   * maupun bilah notifikasi atas di HP Android/iOS PWA):
   * - Bersifat sunyi (`silent: true`) agar tidak berisik saat user pindah aplikasi/Alt-Tab/Home.
   * - Klik pada notifikasi langsung membawa kembali ke tab/jendela Twilight's.
   */
  async function showRunningTimerNotification(params: {
    modeLabel: string
    remainingSeconds: number
    targetEndTimeMs: number | null
  }): Promise<boolean> {
    if (!import.meta.client) return false
    const perm = syncNotificationPermission()
    if (perm !== 'granted') return false
    if (isRunningTimerNotifShown) return true

    const iconUrl = new URL('icons/icon-192.png', document.baseURI).href
    const remainingStr = formatCompactDuration(params.remainingSeconds)
    const endClockStr = params.targetEndTimeMs ? formatClockHHMM(params.targetEndTimeMs) : ''
    const bgmSummary = mediaBgmState.isRadioPlaying
      ? ` • 🎧 ${mediaBgmState.radioTitle}`
      : mediaBgmState.activeAmbientLabels.length > 0
        ? ` • 🌿 ${mediaBgmState.activeAmbientLabels.slice(0, 2).join(', ')}`
        : ''

    const title = `⏳ ${params.modeLabel} Berjalan — Twilight's`
    const body = endClockStr
      ? `Sisa ~${remainingStr} (selesai ${endClockStr})${bgmSummary}\nKlik untuk kembali ke Twilight's 🌙`
      : `Sisa ~${remainingStr}${bgmSummary}\nKlik untuk kembali ke Twilight's 🌙`

    const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')

    const swOptions: ExtendedNotificationOptions = {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: RUNNING_TIMER_NOTIF_TAG,
      renotify: false,
      requireInteraction: true,
      silent: true,
      data: { url: window.location.href },
    }

    const trySw = async (): Promise<boolean> => {
      if (!('serviceWorker' in navigator)) return false
      try {
        if (!isServiceWorkerReady.value) {
          await registerServiceWorker()
        }
        const reg = await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 1200)),
        ])
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, swOptions)
          isRunningTimerNotifShown = true
          return true
        }
      } catch {
        // Abaikan jika SW gagal
      }
      return false
    }

    const tryDirect = (): boolean => {
      try {
        if (activeRunningDirectNotif) {
          try {
            activeRunningDirectNotif.close()
          } catch {
            // Abaikan
          }
          activeRunningDirectNotif = null
        }
        const notif = new Notification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag: RUNNING_TIMER_NOTIF_TAG,
          requireInteraction: true,
          silent: true,
        })
        notif.onclick = () => {
          try {
            window.focus()
          } catch {
            // Abaikan
          }
          notif.close()
          activeRunningDirectNotif = null
          isRunningTimerNotifShown = false
        }
        notif.onclose = () => {
          if (activeRunningDirectNotif === notif) {
            activeRunningDirectNotif = null
          }
          isRunningTimerNotifShown = false
        }
        activeRunningDirectNotif = notif
        isRunningTimerNotifShown = true
        return true
      } catch {
        return false
      }
    }

    if (isMobileUa) {
      if (await trySw()) return true
      return tryDirect()
    }
    if (tryDirect()) return true
    return await trySw()
  }

  /** Tutup notifikasi status timer berjalan saat user kembali ke Twilight's atau timer dijeda/selesai */
  async function closeRunningTimerNotification() {
    isRunningTimerNotifShown = false
    if (!import.meta.client) return

    if (activeRunningDirectNotif) {
      try {
        activeRunningDirectNotif.close()
      } catch {
        // Abaikan
      }
      activeRunningDirectNotif = null
    }

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg && typeof reg.getNotifications === 'function') {
          const list = await reg.getNotifications({ tag: RUNNING_TIMER_NOTIF_TAG })
          for (const item of list) {
            item.close()
          }
        }
      } catch {
        // Abaikan
      }
    }
  }

  /**
   * Anchor HTML `<audio>` nyaris hening agar Android Chrome & iOS Safari mengenali sesi
   * Ambient Sound Mixer (Web Audio API) & Pomodoro Timer sebagai Foreground Media Player
   * sehingga suara tetap menyala saat kembali ke Home Screen HP dan kartu Media Session muncul.
   */
  function syncMediaAnchorAudio() {
    if (!import.meta.client) return
    const needAnchor =
      !mediaBgmState.isRadioPlaying &&
      (mediaTimerState.isRunning || mediaBgmState.activeAmbientLabels.length > 0)
    isMediaAnchorWanted = needAnchor

    if (!needAnchor) {
      if (mediaAnchorAudio && !mediaAnchorAudio.paused) {
        try {
          mediaAnchorAudio.pause()
        } catch {
          // Abaikan
        }
      }
      return
    }

    const blobUrl = createSilentWavBlobUrl()
    if (!blobUrl) return

    if (!mediaAnchorAudio) {
      const el = new Audio(blobUrl)
      el.loop = true
      el.preload = 'auto'
      el.volume = 0.01
      el.setAttribute('playsinline', '')
      el.setAttribute('webkit-playsinline', '')
      mediaAnchorAudio = el
    }

    if (mediaAnchorAudio.paused) {
      mediaAnchorAudio.play().catch(() => {
        // Akan dilanjutkan otomatis setelah ketukan/interaksi pertama pengguna
      })
    }
  }

  /** Daftarkan handler tombol Play/Pause/Next/Prev dari Lock Screen HP & Windows Media Control */
  function ensureMediaSessionHandlers() {
    if (!import.meta.client || mediaHandlersRegistered) return
    if (!('mediaSession' in navigator)) return
    mediaHandlersRegistered = true

    const safeSetHandler = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, fn)
      } catch {
        // Beberapa browser belum mendukung aksi tertentu
      }
    }

    const handlePlayOrPause = () => {
      // Jika Radio sedang aktif atau tidak ada timer aktif -> kontrol Radio; jika hanya Timer aktif -> kontrol Timer
      if (mediaBgmState.isRadioPlaying || (!mediaTimerState.isRunning && !mediaTimerState.isPaused)) {
        mediaActionHandlers.onToggleRadio?.()
      } else {
        mediaActionHandlers.onToggleTimer?.()
      }
    }

    safeSetHandler('play', handlePlayOrPause)
    safeSetHandler('pause', handlePlayOrPause)
    safeSetHandler('nexttrack', () => {
      mediaActionHandlers.onNextRadio?.()
    })
    safeSetHandler('previoustrack', () => {
      mediaActionHandlers.onPrevRadio?.()
    })
  }

  function registerMediaSessionHandlers(handlers: Partial<MediaSessionActionHandlers>) {
    Object.assign(mediaActionHandlers, handlers)
    ensureMediaSessionHandlers()
  }

  /**
   * Sinkronkan Kartu Media Session (muncul otomatis di Bilah Notifikasi / Lock Screen HP
   * seperti TikTok/Spotify & Windows Media Overlay di PC) dengan info Timer & BGM terkini.
   */
  function syncMediaSession() {
    if (!import.meta.client) return
    syncMediaAnchorAudio()

    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
    ensureMediaSessionHandlers()

    const hasRadio = mediaBgmState.isRadioPlaying
    const hasAmbient = mediaBgmState.activeAmbientLabels.length > 0
    const hasTimer = mediaTimerState.isRunning || mediaTimerState.isPaused

    if (!hasRadio && !hasAmbient && !hasTimer) {
      navigator.mediaSession.playbackState = 'none'
      try {
        navigator.mediaSession.setPositionState(undefined)
      } catch {
        // Abaikan
      }
      return
    }

    const icon192 = new URL('icons/icon-192.png', document.baseURI).href
    const icon512 = new URL('icons/icon-512.png', document.baseURI).href
    const ambientText = mediaBgmState.activeAmbientLabels.slice(0, 3).join(' + ')

    let title = "Twilight's — Focus & Lo-Fi"
    let artist = 'Cozy Cat Corner'

    if (mediaTimerState.isRunning) {
      const endClock = mediaTimerState.targetEndTimeMs
        ? ` • Selesai ${formatClockHHMM(mediaTimerState.targetEndTimeMs)}`
        : ''
      title = `⏳ ${mediaTimerState.modeLabel}${endClock}`
      if (hasRadio && hasAmbient) {
        artist = `🎧 ${mediaBgmState.radioTitle} • 🌿 ${ambientText}`
      } else if (hasRadio) {
        artist = `🎧 ${mediaBgmState.radioTitle}`
      } else if (hasAmbient) {
        artist = `🌿 ${ambientText}`
      } else {
        artist = "Twilight's Focus Timer"
      }
    } else if (hasRadio) {
      title = `🎧 ${mediaBgmState.radioTitle}`
      artist = hasAmbient
        ? `${mediaBgmState.radioSubtitle} • 🌿 ${ambientText}`
        : mediaBgmState.radioSubtitle || "Twilight's Lo-Fi Radio"
    } else if (hasAmbient) {
      title = `🌿 ${ambientText}`
      artist = "Twilight's Ambient Mixer"
    } else if (mediaTimerState.isPaused) {
      title = `⏸️ ${mediaTimerState.modeLabel} Dijeda (${formatCompactDuration(mediaTimerState.remainingSeconds)})`
      artist = "Twilight's Focus Timer"
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: "Twilight's — Cozy Cat Corner",
        artwork: [
          { src: icon192, sizes: '192x192', type: 'image/png' },
          { src: icon512, sizes: '512x512', type: 'image/png' },
        ],
      })
    } catch {
      // Abaikan jika browser menolak MediaMetadata
    }

    const isActivelyPlaying = mediaTimerState.isRunning || hasRadio || hasAmbient
    navigator.mediaSession.playbackState = isActivelyPlaying ? 'playing' : 'paused'

    // Jika Timer sedang berjalan, aktifkan progress bar native pada kartu notifikasi HP/PC
    try {
      if (mediaTimerState.isRunning && mediaTimerState.totalSeconds >= 1) {
        const duration = Math.max(1, mediaTimerState.totalSeconds)
        const remaining = mediaTimerState.targetEndTimeMs
          ? Math.max(0, (mediaTimerState.targetEndTimeMs - Date.now()) / 1000)
          : Math.max(0, mediaTimerState.remainingSeconds)
        const position = Math.max(0, Math.min(duration, duration - remaining))
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position,
        })
      } else {
        navigator.mediaSession.setPositionState(undefined)
      }
    } catch {
      // Abaikan jika browser belum mendukung setPositionState
    }
  }

  function updateMediaSessionTimer(next: Partial<MediaTimerStatus>) {
    mediaTimerState = { ...mediaTimerState, ...next }
    syncMediaSession()
  }

  function updateMediaSessionBgm(next: Partial<MediaBgmStatus>) {
    mediaBgmState = { ...mediaBgmState, ...next }
    syncMediaSession()
  }

  /**
   * Penjaga Proses Latar Belakang (Background Audio Keep-Alive):
   * Menjalankan gelombang Web Audio API hampir hening (~0.00015 gain) di AudioContext yang sama
   * ketika timer sedang berjalan atau ada alarm terjadwal, agar tab HP/PC tidak dibekukan (suspended).
   */
  function startSilentKeepAlive() {
    if (!import.meta.client || keepAliveOsc) return
    try {
      const ctx = getSharedAudioContext()
      if (!ctx) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(180, ctx.currentTime)
      // Amplitudo sangat kecil (tidak terdengar telinga manusia, cukup menjaga audio thread aktif)
      gain.gain.setValueAtTime(0.00015, ctx.currentTime)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()

      keepAliveOsc = osc
      keepAliveGain = gain
    } catch {
      // Abaikan jika AudioContext belum dibuka oleh interaksi pertama pengguna
    }
  }

  function stopSilentKeepAlive() {
    if (keepAliveOsc) {
      try {
        keepAliveOsc.stop()
        keepAliveOsc.disconnect()
      } catch {
        // Abaikan jika sudah berhenti
      }
      keepAliveOsc = null
    }
    if (keepAliveGain) {
      try {
        keepAliveGain.disconnect()
      } catch {
        // Abaikan
      }
      keepAliveGain = null
    }
  }

  /** Nyalakan atau matikan silent Web Audio keep-alive sesuai apakah ada timer/alarm aktif */
  function setBackgroundAudioKeepAlive(active: boolean) {
    isKeepAliveWanted = active
    if (!import.meta.client) return
    if (active) {
      startSilentKeepAlive()
    } else {
      stopSilentKeepAlive()
    }
  }

  /** Pastikan silent keep-alive & media anchor aktif kembali setelah interaksi pertama / kembali ke layar */
  function resumeKeepAliveIfNeeded() {
    if (!import.meta.client) return
    if (isKeepAliveWanted) {
      const ctx = getSharedAudioContext()
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      if (!keepAliveOsc) {
        startSilentKeepAlive()
      }
    }
    if (isMediaAnchorWanted && mediaAnchorAudio && mediaAnchorAudio.paused) {
      mediaAnchorAudio.play().catch(() => {})
    }
  }

  /**
   * Screen Wake Lock Opsional:
   * Mencegah layar HP mati mendadak saat Pomodoro Timer sedang berjalan (aman dengan try/catch).
   */
  async function acquireScreenWakeLock() {
    isWakeLockWanted = true
    if (!import.meta.client) return
    try {
      if (!('wakeLock' in navigator) || typeof navigator.wakeLock?.request !== 'function') return
      if (wakeLockSentinel && !wakeLockSentinel.released) return
      wakeLockSentinel = await navigator.wakeLock.request('screen')
    } catch {
      // Aman diabaikan di browser/perangkat yang belum mendukung Wake Lock atau saat hemat daya
    }
  }

  async function releaseScreenWakeLock() {
    isWakeLockWanted = false
    if (!wakeLockSentinel) return
    try {
      await wakeLockSentinel.release()
    } catch {
      // Abaikan jika sudah otomatis dilepas oleh sistem
    } finally {
      wakeLockSentinel = null
    }
  }

  async function reacquireWakeLockIfNeeded() {
    if (!import.meta.client || !isWakeLockWanted) return
    if (document.visibilityState === 'visible') {
      await acquireScreenWakeLock()
    }
  }

  /**
   * Kedip Judul Tab Browser (Tab Title Alert):
   * Bergantian setiap 1 detik antara "🔔 [Nama Target] — Twilight's" dan judul normalnya
   * selama alarm berbunyi dan belum dimatikan/diselesaikan.
   */
  function startTabTitleBlink(targetLabel: string) {
    if (!import.meta.client) return
    stopTabTitleBlink(false)

    // Simpan judul saat ini jika belum dalam mode kedip
    if (!document.title.startsWith('🔔 ')) {
      titleBeforeBlink = document.title || DEFAULT_APP_TITLE
    }

    const alertTitle = `🔔 ${targetLabel} — Twilight's`
    isTabTitleBlinking.value = true
    titleBlinkShowingAlert = true
    document.title = alertTitle

    titleBlinkInterval = setInterval(() => {
      titleBlinkShowingAlert = !titleBlinkShowingAlert
      document.title = titleBlinkShowingAlert ? alertTitle : titleBeforeBlink
    }, 1000)
  }

  function stopTabTitleBlink(restoreTitle = true) {
    if (titleBlinkInterval) {
      clearInterval(titleBlinkInterval)
      titleBlinkInterval = null
    }
    isTabTitleBlinking.value = false
    titleBlinkShowingAlert = false

    if (restoreTitle && import.meta.client) {
      document.title = titleBeforeBlink || DEFAULT_APP_TITLE
    }
  }

  return {
    notificationPermission,
    isServiceWorkerReady,
    isTabTitleBlinking,
    canInstallPwa,
    isIosSafariInstallable,
    isPwaInstalled,
    showIosInstallGuide,
    initPwaInstallListeners,
    triggerPwaInstall,
    dismissIosInstallGuide,
    syncNotificationPermission,
    registerServiceWorker,
    requestNotificationPermission,
    sendDesktopBanner,
    kirimNotifikasiSistem,
    showRunningTimerNotification,
    closeRunningTimerNotification,
    updateMediaSessionTimer,
    updateMediaSessionBgm,
    registerMediaSessionHandlers,
    setBackgroundAudioKeepAlive,
    resumeKeepAliveIfNeeded,
    acquireScreenWakeLock,
    releaseScreenWakeLock,
    reacquireWakeLockIfNeeded,
    startTabTitleBlink,
    stopTabTitleBlink,
  }
}
