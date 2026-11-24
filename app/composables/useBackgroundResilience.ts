import { useSoundEffects } from '~/composables/useSoundEffects'

export type SystemNotificationState = NotificationPermission | 'unsupported'

const DEFAULT_APP_TITLE = "Twilight's — Cheer your day with me!"

// Tipe tambahan agar opsi `vibrate` & `renotify` pada ServiceWorkerRegistration.showNotification aman secara TypeScript
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[]
  renotify?: boolean
}

// Tipe event resmi browser untuk dialog instalasi PWA (`beforeinstallprompt`)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// --- Singleton module state (berbagi lintas komponen agar tidak ganda) ---
let keepAliveOsc: OscillatorNode | null = null
let keepAliveGain: GainNode | null = null
let isKeepAliveWanted = false

let wakeLockSentinel: WakeLockSentinel | null = null
let isWakeLockWanted = false

let titleBlinkInterval: ReturnType<typeof setInterval> | null = null
let titleBlinkShowingAlert = false
let titleBeforeBlink = DEFAULT_APP_TITLE

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
let pwaListenersAttached = false

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

  /** Daftarkan Service Worker (/sw.js) secara aman agar notifikasi sistem didukung di HP & PC */
  async function registerServiceWorker() {
    if (!import.meta.client) return
    syncNotificationPermission()

    if (!('serviceWorker' in navigator)) return
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
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
   * Fungsi pembantu terpadu untuk mengirim Notifikasi Sistem (Windows Action Center & bilah atas HP):
   * - Memprioritaskan `registration.showNotification(...)` via Service Worker (mendukung `vibrate` & klik fokus tab).
   * - Otomatis fallback ke `new Notification(...)` jika Service Worker belum siap.
   */
  async function kirimNotifikasiSistem(
    judul: string,
    pesan: string,
    isBerulang = false,
    tag?: string,
  ): Promise<boolean> {
    if (!import.meta.client) return false
    const perm = syncNotificationPermission()
    if (perm !== 'granted') return false

    const uniqueTag = tag || `twilights-alert-${Date.now()}`
    const options: ExtendedNotificationOptions = {
      body: pesan,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: uniqueTag,
      renotify: true,
      requireInteraction: isBerulang,
      vibrate: [300, 150, 300],
      data: { url: '/' },
    }

    // 1. Jalur utama: Service Worker (wajib untuk heads-up notification di Chrome/Edge Android & optimal di Windows)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 1200)),
        ])
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(judul, options)
          return true
        }
      } catch {
        // Lanjut ke fallback Notification standar
      }
    }

    // 2. Jalur cadangan: Notification API standar dengan handler klik untuk kembali ke tab Twilight's
    try {
      const notif = new Notification(judul, {
        body: pesan,
        icon: '/favicon.svg',
        tag: uniqueTag,
        requireInteraction: isBerulang,
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

  /** Pastikan silent keep-alive aktif kembali setelah interaksi pertama / kembali ke layar */
  function resumeKeepAliveIfNeeded() {
    if (!import.meta.client || !isKeepAliveWanted) return
    const ctx = getSharedAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    if (!keepAliveOsc) {
      startSilentKeepAlive()
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
    kirimNotifikasiSistem,
    setBackgroundAudioKeepAlive,
    resumeKeepAliveIfNeeded,
    acquireScreenWakeLock,
    releaseScreenWakeLock,
    reacquireWakeLockIfNeeded,
    startTabTitleBlink,
    stopTabTitleBlink,
  }
}
