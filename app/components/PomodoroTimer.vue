<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import { useSoundEffects } from '~/composables/useSoundEffects'
import {
  DEFAULT_TIMER_DURATIONS_SECONDS,
  type TimerModeKey,
  VIBRATION_PATTERNS,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Definisi 3 mode Pomodoro beserta durasi preset bawaannya (dalam menit)
interface TimerModeConfig {
  key: TimerModeKey
  baseLabel: string
  shortLabel: string
  defaultMinutes: number
}

const TIMER_MODES: TimerModeConfig[] = [
  { key: 'focus', baseLabel: 'Fokus', shortLabel: 'Fokus', defaultMinutes: 25 },
  { key: 'shortBreak', baseLabel: 'Istirahat Singkat', shortLabel: 'Istirahat', defaultMinutes: 5 },
  { key: 'longBreak', baseLabel: 'Istirahat Panjang', shortLabel: 'Santai', defaultMinutes: 15 },
]

const MAX_DURATION_SECONDS = 99 * 3600 + 59 * 60 + 59
const DEFAULT_TAB_TITLE = "Twilight's — Cheer your day with me!"

const {
  customTimerDurations,
  timerDurationsVersion,
  todayFocusSessions,
  isPomodoroRunning,
  isPomodoroPaused,
  activeTimerMode,
  activeTimerRemainingSeconds,
  isZenMode,
  isImmersiveZenOpen,
  isVibrationEnabled,
  twilightFocusIcon,
  pomodoroToggleSignal,
  pomodoroResetSignal,
  pomodoroModeSignal,
  setCustomTimerDuration,
  incrementFocusSession,
  toggleZenMode,
  exitZenMode,
  toggleVibrationEnabled,
  triggerVibration,
  triggerMascotReaction,
  loadFromStorage,
} = useTwilightStorage()
const { playBellChime } = useSoundEffects()
const {
  isTabTitleBlinking,
  requestNotificationPermission,
  kirimNotifikasiSistem,
  showRunningTimerNotification,
  closeRunningTimerNotification,
  updateMediaSessionTimer,
  registerMediaSessionHandlers,
  acquireScreenWakeLock,
  releaseScreenWakeLock,
  reacquireWakeLockIfNeeded,
} = useBackgroundResilience()

// State timer reaktif (durasi kustom tersimpan terpusat di localStorage + ikut Backup/Restore JSON)
const currentMode = ref<TimerModeKey>('focus')
const remainingSeconds = ref<number>(customTimerDurations.value.focus)
const isRunning = ref<boolean>(false)
const isPaused = ref<boolean>(false)
const isBellEnabled = ref<boolean>(true)
const customStatus = ref<string>('')

// State mode edit durasi bebas (JAM / MENIT / DETIK)
const isEditingDuration = ref<boolean>(false)
const editHours = ref<number>(0)
const editMinutes = ref<number>(25)
const editSeconds = ref<number>(0)
const hoursInputRef = ref<HTMLInputElement | null>(null)

let timerInterval: ReturnType<typeof setInterval> | null = null
let blurNotifTimeout: ReturnType<typeof setTimeout> | null = null
// Waktu target eksak (Date.now() + sisaDetik * 1000) agar akurat 100% meski tab diminimize atau layar HP dikunci
let targetEndTimeMs: number | null = null

const activeModeConfig = computed<TimerModeConfig>(() => {
  return TIMER_MODES.find(m => m.key === currentMode.value) ?? TIMER_MODES[0]!
})

// Total durasi target aktif (selalu mengikuti durasi kustom terakhir pengguna pada mode ini)
const totalSeconds = computed<number>(() => customTimerDurations.value[currentMode.value])

// Apakah sisa waktu >= 1 jam (menentukan format adaptif JJ:MM:DD vs MM:DD)
const isHourDisplayMode = computed<boolean>(() => remainingSeconds.value >= 3600)

/**
 * Format Adaptif Standar pada angka timer utama (detik selalu berdetak turun setiap detik):
 * - Sisa waktu >= 1 jam (>= 3600 dtk) : JJ:MM:DD (contoh: 02:30:00 -> 02:29:59)
 * - Sisa waktu <  1 jam (<  3600 dtk) : MM:DD    (contoh: 59:59 -> 00:00)
 */
const formattedTime = computed<string>(() => {
  if (isHourDisplayMode.value) {
    const hours = Math.floor(remainingSeconds.value / 3600)
    const mins = Math.floor((remainingSeconds.value % 3600) / 60)
    const secs = remainingSeconds.value % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  const mins = Math.floor(remainingSeconds.value / 60)
  const secs = remainingSeconds.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// Label indikator unit di bawah angka timer
const timeUnitIndicator = computed<string>(() => {
  return isHourDisplayMode.value ? 'JAM : MENIT : DETIK' : 'MENIT : DETIK'
})

/** Format ringkas durasi untuk label tab di atas (contoh: "2j 30m", "45m", "30d") */
function formatTabDuration(seconds: number): string {
  const safe = Math.max(1, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60

  if (h > 0) {
    if (m > 0) return `${h}j ${m}m`
    if (s > 0) return `${h}j ${s}d`
    return `${h}j`
  }
  if (m > 0) {
    return s > 0 ? `${m}m ${s}d` : `${m}m`
  }
  return `${s}d`
}

/** Label tab dinamis sesuai pengaturan durasi kustom masing-masing mode */
function getModeTabLabel(mode: TimerModeConfig): string {
  return `${mode.baseLabel} (${formatTabDuration(customTimerDurations.value[mode.key])})`
}

// Persentase progres untuk progress bar mini (menyesuaikan durasi kustom aktif)
const progressPercent = computed<number>(() => {
  if (totalSeconds.value <= 0) return 0
  const raw = ((totalSeconds.value - remainingSeconds.value) / totalSeconds.value) * 100
  return Math.max(0, Math.min(100, Math.round(raw)))
})

// Pesan kontekstual penyemangat di bawah angka timer
const statusMessage = computed<string>(() => {
  if (customStatus.value) return customStatus.value
  if (isRunning.value) {
    return currentMode.value === 'focus'
      ? 'Mode jenius aktif! Satu langkah lebih dekat ✨'
      : 'Waktunya meregangkan badan dan tersenyum ☕'
  }
  return currentMode.value === 'focus'
    ? 'Siap menyalakan mode fokus yang tenang? ✨'
    : 'Waktunya meregangkan badan dan tersenyum ☕'
})

// Sinkronkan angka timer saat durasi dimuat dari localStorage atau dipulihkan lewat Restore JSON
watch(timerDurationsVersion, () => {
  if (!isRunning.value && !isPaused.value) {
    remainingSeconds.value = customTimerDurations.value[currentMode.value]
  }
})

/** Buka mode edit durasi bebas (hanya saat timer sedang Idle atau Paused) */
async function openEditMode() {
  if (isRunning.value) return
  const sourceSec = remainingSeconds.value > 0 ? remainingSeconds.value : totalSeconds.value
  editHours.value = Math.floor(sourceSec / 3600)
  editMinutes.value = Math.floor((sourceSec % 3600) / 60)
  editSeconds.value = sourceSec % 60
  isEditingDuration.value = true

  await nextTick()
  hoursInputRef.value?.focus()
  hoursInputRef.value?.select()
}

/** Tutup mode edit tanpa mengubah durasi */
function cancelEditMode() {
  isEditingDuration.value = false
}

/** Terapkan durasi kustom (JAM, MENIT, DETIK) lalu simpan ke localStorage & Backup state */
function applyCustomDuration() {
  const h = Math.max(0, Math.min(99, Math.floor(Number(editHours.value) || 0)))
  const m = Math.max(0, Math.min(599, Math.floor(Number(editMinutes.value) || 0)))
  const s = Math.max(0, Math.min(599, Math.floor(Number(editSeconds.value) || 0)))
  const computedTotal = Math.min(MAX_DURATION_SECONDS, h * 3600 + m * 60 + s)

  // Jika semua kotak diisi 0, fallback aman ke 1 menit agar timer tetap valid
  const finalSeconds = computedTotal > 0 ? computedTotal : 60

  setCustomTimerDuration(currentMode.value, finalSeconds)
  remainingSeconds.value = finalSeconds
  isPaused.value = false
  isEditingDuration.value = false
  customStatus.value = computedTotal > 0
    ? `Durasi ${activeModeConfig.value.baseLabel} diatur ke ${formatTabDuration(finalSeconds)} ✨`
    : 'Durasi minimal 1 detik, disetel ke 1 menit ya~ ✨'
}

/** Kembalikan preset bawaan (25m / 5m / 15m) untuk mode yang sedang aktif */
function restoreDefaultPreset() {
  const presetSeconds = DEFAULT_TIMER_DURATIONS_SECONDS[currentMode.value]
  setCustomTimerDuration(currentMode.value, presetSeconds)
  remainingSeconds.value = presetSeconds
  isPaused.value = false
  isEditingDuration.value = false
  customStatus.value = `Durasi ${activeModeConfig.value.baseLabel} kembali ke default (${activeModeConfig.value.defaultMinutes}m) ✨`
}

// Sinkronkan status berjalan, mode aktif, sisa detik dengan maskot Co-Working, Mode Zen & judul tab browser
watch(
  [formattedTime, remainingSeconds, isRunning, isPaused, currentMode, isTabTitleBlinking],
  () => {
    isPomodoroRunning.value = isRunning.value
    isPomodoroPaused.value = isPaused.value
    activeTimerMode.value = currentMode.value
    activeTimerRemainingSeconds.value = remainingSeconds.value
    if (!import.meta.client || isTabTitleBlinking.value) return

    if (isRunning.value) {
      document.title = `${formattedTime.value} • ${activeModeConfig.value.shortLabel} | Twilight's`
    } else {
      document.title = DEFAULT_TAB_TITLE
    }
  },
  { immediate: true },
)

// Dengarkan pintasan keyboard [Space] atau tombol Play/Pause dari Mode Zen layar penuh
watch(pomodoroToggleSignal, () => {
  if (isEditingDuration.value) return
  if (isRunning.value) {
    pauseTimer()
  } else {
    startTimer()
  }
})

// Dengarkan tombol Reset dari Twilight Focus atau pintasan tombol R
watch(pomodoroResetSignal, () => {
  resetTimer()
})

// Dengarkan pindah cepat tab timer via tombol 1 (Fokus), 2 (Istirahat Singkat), 3 (Istirahat Panjang)
watch(
  () => pomodoroModeSignal.value.seq,
  () => {
    selectMode(pomodoroModeSignal.value.mode)
  },
)

/** Toggle aktif/nonaktif suara Bell notifikasi (sekalian preview saat dinyalakan) */
function toggleBell() {
  isBellEnabled.value = !isBellEnabled.value
  if (isBellEnabled.value) {
    playBellChime()
  }
}

/** Ganti mode timer (Fokus / Istirahat Singkat / Istirahat Panjang) menggunakan durasi tersimpan */
function selectMode(modeKey: TimerModeKey) {
  isEditingDuration.value = false
  pauseTimer(false)
  isPaused.value = false
  currentMode.value = modeKey
  remainingSeconds.value = customTimerDurations.value[modeKey]
  customStatus.value = ''
}

/** Sinkronkan status Pomodoro Timer ke Kartu Media Session (Lock Screen HP & Windows Media Control) */
function syncTimerMediaSession() {
  updateMediaSessionTimer({
    isRunning: isRunning.value,
    isPaused: isPaused.value,
    modeLabel: activeModeConfig.value.baseLabel,
    totalSeconds: totalSeconds.value,
    remainingSeconds: remainingSeconds.value,
    targetEndTimeMs,
  })
}

/** Munculkan notifikasi status timer berjalan di Windows Action Center (PC) & Bilah Atas HP */
function notifyBackgroundRunningTimer() {
  if (!isRunning.value) return
  void showRunningTimerNotification({
    modeLabel: activeModeConfig.value.baseLabel,
    remainingSeconds: remainingSeconds.value,
    targetEndTimeMs,
  })
}

/** Selesaikan sesi timer saat targetEndTimeMs tercapai */
function handleTimerCompleted() {
  targetEndTimeMs = null
  remainingSeconds.value = 0
  pauseTimer(false)
  exitZenMode()
  void closeRunningTimerNotification()
  syncTimerMediaSession()

  if (isBellEnabled.value) {
    playBellChime()
  }
  // Getaran ritmis ceria di HP saat Timer Fokus / Istirahat selesai ([250, 120, 250, 120, 450])
  triggerVibration(VIBRATION_PATTERNS.pomodoroDone)

  if (currentMode.value === 'focus') {
    incrementFocusSession(totalSeconds.value)
    customStatus.value = 'Yey! 1 sesi fokus selesai 🎉 Waktunya meregangkan badan ☕'
    void kirimNotifikasiSistem(
      "✨ Sesi Fokus Selesai! — Twilight's",
      'Hebat! Kamu mendapatkan +10 Koin Ikan 🐟. Waktunya istirahat sejenak bersama kucing~',
      true,
      'twilights-pomodoro-done',
    )
  } else {
    customStatus.value = 'Istirahat selesai! Siap lanjut fokus lagi ✨'
    void kirimNotifikasiSistem(
      "☕ Waktu Istirahat Selesai! — Twilight's",
      'Istirahat selesai! Siap lanjut fokus lagi bersama kucing~ ✨',
      true,
      'twilights-pomodoro-done',
    )
  }
}

/** Hitung sisa waktu eksak terhadap jam sistem Date.now() (tahan throttle background & kunci layar HP) */
function syncRemainingFromClock() {
  if (!isRunning.value || targetEndTimeMs === null) return
  const diffMs = targetEndTimeMs - Date.now()
  if (diffMs <= 0) {
    handleTimerCompleted()
    return
  }
  const nextRemaining = Math.ceil(diffMs / 1000)
  if (nextRemaining !== remainingSeconds.value) {
    remainingSeconds.value = nextRemaining
  }
}

/** Saat pengguna keluar ke Home/Alt-Tab tampilkan notifikasi status; saat kembali, tutup & sinkronkan waktu */
function handleVisibilityChange() {
  if (document.hidden) {
    if (isRunning.value) {
      syncRemainingFromClock()
      syncTimerMediaSession()
      notifyBackgroundRunningTimer()
    }
    return
  }

  void closeRunningTimerNotification()
  if (isRunning.value) {
    syncRemainingFromClock()
    syncTimerMediaSession()
    void reacquireWakeLockIfNeeded()
  }
}

/** Di PC: saat pengguna Alt-Tab ke jendela lain (bukan klik iframe YouTube), munculkan notifikasi Windows Action Center */
function handleWindowBlur() {
  if (!isRunning.value) return
  if (blurNotifTimeout) clearTimeout(blurNotifTimeout)
  blurNotifTimeout = setTimeout(() => {
    blurNotifTimeout = null
    if (!isRunning.value) return
    if (document.hasFocus()) return
    // Jangan munculkan notifikasi jika fokus hanya berpindah ke dalam iframe YouTube Lo-Fi di halaman yang sama
    if (document.activeElement?.tagName === 'IFRAME') return
    syncRemainingFromClock()
    notifyBackgroundRunningTimer()
  }, 320)
}

function handleWindowFocus() {
  if (blurNotifTimeout) {
    clearTimeout(blurNotifTimeout)
    blurNotifTimeout = null
  }
  void closeRunningTimerNotification()
  if (isRunning.value) {
    syncRemainingFromClock()
    syncTimerMediaSession()
  }
}

/** Tombol START: mulai hitung mundur berbasis Date.now() + aktifkan Media Session & izin notifikasi */
function startTimer() {
  if (isRunning.value) return
  isEditingDuration.value = false

  if (remainingSeconds.value <= 0) {
    remainingSeconds.value = totalSeconds.value
  }

  customStatus.value = ''
  isRunning.value = true
  isPaused.value = false
  targetEndTimeMs = Date.now() + remainingSeconds.value * 1000
  void acquireScreenWakeLock()
  // Minta izin notifikasi sekali saja jika masih 'default' agar notifikasi timer HP & Windows PC bisa muncul
  void requestNotificationPermission(true)
  syncTimerMediaSession()

  if (currentMode.value === 'focus') {
    triggerMascotReaction('focus', 'Mode jenius aktif! Yuk fokus bareng~ 👓✨', 2600)
  } else {
    triggerMascotReaction('happy', 'Waktunya istirahat dan minum air~ ☕', 2600)
  }

  // Interval 500ms hanya sebagai pemicu baca ulang Date.now() sehingga tidak meleset
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(syncRemainingFromClock, 500)
}

/** Tombol PAUSE: jeda hitung mundur, tutup notifikasi status berjalan & lepaskan Screen Wake Lock */
function pauseTimer(showPausedNote = true) {
  if (isRunning.value && targetEndTimeMs !== null) {
    remainingSeconds.value = Math.max(0, Math.ceil((targetEndTimeMs - Date.now()) / 1000))
  }
  targetEndTimeMs = null
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (blurNotifTimeout) {
    clearTimeout(blurNotifTimeout)
    blurNotifTimeout = null
  }
  void releaseScreenWakeLock()
  void closeRunningTimerNotification()

  if (isRunning.value) {
    isRunning.value = false
    isPaused.value = showPausedNote
    if (showPausedNote) {
      customStatus.value = 'Timer dijeda sebentar~ Tarik napas pelan ⏸️'
    }
  } else if (!showPausedNote) {
    isPaused.value = false
  }
  syncTimerMediaSession()
}

/**
 * Tombol RESET utama:
 * Menghentikan timer dan mengembalikan waktu + progress bar ke durasi kustom terakhir
 * yang disetel pengguna pada mode aktif (tidak ke 00:00 dan tidak menimpa preset kustom).
 */
function resetTimer() {
  isEditingDuration.value = false
  pauseTimer(false)
  isPaused.value = false
  remainingSeconds.value = totalSeconds.value
  customStatus.value = ''
  syncTimerMediaSession()
}

onMounted(() => {
  loadFromStorage()
  if (!isRunning.value && !isPaused.value) {
    remainingSeconds.value = customTimerDurations.value[currentMode.value]
  }
  if (import.meta.client) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    registerMediaSessionHandlers({
      onToggleTimer: () => {
        if (isRunning.value) {
          pauseTimer(true)
        } else {
          startTimer()
        }
      },
    })
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (blurNotifTimeout) clearTimeout(blurNotifTimeout)
  targetEndTimeMs = null
  void releaseScreenWakeLock()
  void closeRunningTimerNotification()
  updateMediaSessionTimer({ isRunning: false, isPaused: false, targetEndTimeMs: null })
  isPomodoroRunning.value = false
  if (import.meta.client) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('blur', handleWindowBlur)
    window.removeEventListener('focus', handleWindowFocus)
    if (!isTabTitleBlinking.value) {
      document.title = DEFAULT_TAB_TITLE
    }
  }
})
</script>

<template>
  <!-- Kolom Tengah Atas: Pomodoro Timer (tetap terang dengan pendar cahaya halus saat Starlight Focus ✨ aktif) -->
  <section
    class="glass-card flex flex-col justify-between p-5 transition-all duration-500 sm:p-6"
    :class="
      isZenMode
        ? 'ring-2 ring-pink-200/65 shadow-[0_0_45px_rgba(249,168,212,0.34),0_0_90px_rgba(167,139,250,0.24)]'
        : ''
    "
  >
    <!-- Header Kartu -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-lg">🌙</span>
        <h2 class="font-display text-lg font-semibold text-pink-200 sm:text-xl">
          Pomodoro Timer
        </h2>
      </div>

      <!-- Tombol Twilight Focus Layar Penuh + Starlight Focus ✨ + Toggle Bell Notifikasi + Counter Sesi Fokus -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-1.5">
        <button
          type="button"
          title="Masuk ke Twilight Focus (layar penuh meja belajar) — Pintasan [T]"
          class="cozy-pill-btn btn-bouncy inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-purple-200/45 bg-gradient-to-r from-purple-400/25 via-indigo-400/25 to-pink-400/25 px-3 py-2 text-xs font-semibold text-pink-50 shadow-sm sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
          @click="isImmersiveZenOpen = true"
        >
          <span>{{ twilightFocusIcon }} Twilight Focus</span>
          <span
            class="hidden rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-pink-100/85 md:inline"
          >
            T
          </span>
        </button>

        <button
          type="button"
          :title="
            isZenMode
              ? 'Matikan Starlight Focus ✨'
              : 'Aktifkan Starlight Focus ✨ — redupkan distraksi & kunci Break Game'
          "
          class="btn-bouncy inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-300 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-[11px]"
          :class="
            isZenMode
              ? 'cozy-active-btn border-amber-200/80 bg-gradient-to-r from-amber-300/35 via-pink-300/30 to-purple-300/35 text-amber-50 shadow-md ring-1 ring-amber-200/50'
              : 'border-white/15 bg-white/10 text-purple-100 hover:bg-white/20'
          "
          @click="toggleZenMode"
        >
          <span>{{ isZenMode ? '✦ Starlight Focus ✨' : 'Starlight Focus ✨' }}</span>
          <span
            class="hidden rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-pink-100/85 md:inline"
          >
            Z
          </span>
        </button>

        <button
          type="button"
          :title="isBellEnabled ? 'Suara bell aktif (klik untuk matikan)' : 'Suara bell mati (klik untuk aktifkan)'"
          class="btn-bouncy cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          :class="
            isBellEnabled
              ? 'cozy-pill-btn border-pink-200/40 bg-pink-300/20 text-pink-100'
              : 'border-white/15 bg-white/5 text-purple-200/60'
          "
          @click="toggleBell"
        >
          {{ isBellEnabled ? '🔔 Bell' : '🔕 Mute' }}
        </button>

        <!-- Sakelar Getar HP (hanya tampil di HP / perangkat sentuh < 768px) -->
        <button
          type="button"
          :title="
            isVibrationEnabled
              ? 'Getaran HP aktif saat timer & pengingat berbunyi (klik untuk matikan)'
              : 'Getaran HP mati (klik untuk aktifkan)'
          "
          class="mobile-only-control btn-bouncy cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          :class="
            isVibrationEnabled
              ? 'cozy-pill-btn border-purple-200/50 bg-purple-300/25 text-purple-50'
              : 'border-white/15 bg-white/5 text-purple-200/60'
          "
          @click="toggleVibrationEnabled"
        >
          📳 Getar HP: {{ isVibrationEnabled ? 'ON' : 'OFF' }}
        </button>

        <span
          class="cozy-badge rounded-full border border-pink-300/30 bg-pink-400/15 px-2.5 py-1 text-[11px] font-semibold text-pink-200"
        >
          ✦ {{ todayFocusSessions }} Sesi
        </span>
      </div>
    </div>

    <!-- Pilihan Mode Timer (label otomatis sinkron dengan durasi kustom pengguna) -->
    <div class="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-black/20 p-1.5">
      <button
        v-for="mode in TIMER_MODES"
        :key="mode.key"
        type="button"
        class="cursor-pointer rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-200"
        :class="
          currentMode === mode.key
            ? 'ocean-active-btn bg-gradient-to-r from-[#f9a8d4]/95 to-[#c4b5fd]/95 text-[#1e1b4b] shadow-md'
            : 'cozy-tab-inactive'
        "
        @click="selectMode(mode.key)"
      >
        {{ getModeTabLabel(mode) }}
      </button>
    </div>

    <!-- Angka Timer Besar Berhias Bintang Kecil + Pesan Kontekstual -->
    <div class="relative my-5 flex flex-col items-center justify-center py-2">
      <span
        class="cozy-sparkle animate-twinkle pointer-events-none absolute left-4 top-1 text-base text-pink-300 sm:left-10"
        style="--twinkle-duration: 2.8s"
      >
        ✦
      </span>
      <span
        class="cozy-sparkle-alt animate-twinkle pointer-events-none absolute right-5 top-0 text-sm text-amber-200 sm:right-12"
        style="--twinkle-duration: 3.4s; --twinkle-delay: 0.7s"
      >
        ✧
      </span>
      <span
        class="cozy-sparkle-alt animate-twinkle pointer-events-none absolute bottom-3 left-8 text-xs text-purple-200 sm:left-16"
        style="--twinkle-duration: 3.1s; --twinkle-delay: 1.2s"
      >
        ★
      </span>
      <span
        class="cozy-sparkle animate-twinkle pointer-events-none absolute bottom-2 right-8 text-base text-pink-200 sm:right-14"
        style="--twinkle-duration: 3.8s; --twinkle-delay: 0.4s"
      >
        ✦
      </span>

      <!-- Indikator Status Timer yang Jelas (Berjalan / Terjeda / Siap) -->
      <div
        class="mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-all duration-300"
        :class="
          isRunning
            ? 'cozy-pill-btn border-pink-200/70 bg-pink-400/25 text-pink-100 shadow-sm'
            : isPaused
              ? 'cozy-badge border-purple-200/70 bg-purple-400/25 text-purple-100 shadow-sm'
              : 'border-white/15 bg-white/10 text-purple-200/80'
        "
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="
            isRunning
              ? 'cozy-dot animate-pulse bg-pink-300'
              : isPaused
                ? 'cozy-dot bg-purple-300'
                : 'cozy-dot-idle bg-purple-200/60'
          "
        />
        <span>{{ isRunning ? 'Sedang Berjalan' : isPaused ? 'Terjeda' : 'Siap Mulai' }}</span>
      </div>

      <!-- MODE EDIT DURASI BEBAS (JAM : MENIT : DETIK) -->
      <form
        v-if="isEditingDuration"
        class="mt-1 flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-pink-200/35 bg-black/25 px-4 py-3.5 shadow-inner backdrop-blur-sm"
        @submit.prevent="applyCustomDuration"
        @keydown.esc.prevent="cancelEditMode"
      >
        <div class="flex items-end justify-center gap-1.5 sm:gap-2">
          <!-- Input JAM -->
          <label class="flex flex-col items-center gap-1">
            <span class="text-[10px] font-bold tracking-widest text-pink-200/90">JAM</span>
            <input
              ref="hoursInputRef"
              v-model.number="editHours"
              type="number"
              min="0"
              max="99"
              inputmode="numeric"
              aria-label="Jam"
              class="font-display w-16 rounded-xl border border-pink-200/40 bg-white/15 py-1.5 text-center text-2xl font-bold text-white outline-none transition focus:border-pink-300 focus:bg-white/20 focus:ring-2 focus:ring-pink-300/40 sm:w-18"
            >
          </label>

          <span class="font-display pb-2 text-2xl font-bold text-pink-200/70">:</span>

          <!-- Input MENIT -->
          <label class="flex flex-col items-center gap-1">
            <span class="text-[10px] font-bold tracking-widest text-purple-200/90">MENIT</span>
            <input
              v-model.number="editMinutes"
              type="number"
              min="0"
              max="59"
              inputmode="numeric"
              aria-label="Menit"
              class="font-display w-16 rounded-xl border border-purple-200/40 bg-white/15 py-1.5 text-center text-2xl font-bold text-white outline-none transition focus:border-purple-300 focus:bg-white/20 focus:ring-2 focus:ring-purple-300/40 sm:w-18"
            >
          </label>

          <span class="font-display pb-2 text-2xl font-bold text-pink-200/70">:</span>

          <!-- Input DETIK -->
          <label class="flex flex-col items-center gap-1">
            <span class="text-[10px] font-bold tracking-widest text-sky-200/90">DETIK</span>
            <input
              v-model.number="editSeconds"
              type="number"
              min="0"
              max="59"
              inputmode="numeric"
              aria-label="Detik"
              class="font-display w-16 rounded-xl border border-sky-200/40 bg-white/15 py-1.5 text-center text-2xl font-bold text-white outline-none transition focus:border-sky-300 focus:bg-white/20 focus:ring-2 focus:ring-sky-300/40 sm:w-18"
            >
          </label>
        </div>

        <!-- Tombol Aksi Edit: Terapkan (Enter), Kembalikan Default, & Batal -->
        <div class="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="submit"
            class="cozy-active-btn btn-bouncy cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] px-3.5 py-1.5 text-xs font-bold text-[#1e1b4b] shadow-md shadow-pink-500/20"
          >
            ✓ Terapkan
          </button>

          <button
            type="button"
            :title="`Kembalikan preset bawaan ${activeModeConfig.baseLabel} (${activeModeConfig.defaultMinutes} menit)`"
            class="btn-bouncy cursor-pointer rounded-full border border-purple-200/35 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-purple-100 hover:bg-white/20"
            @click="restoreDefaultPreset"
          >
            Default ({{ activeModeConfig.defaultMinutes }}m)
          </button>

          <button
            type="button"
            title="Batal edit durasi (Esc)"
            class="cursor-pointer rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-purple-200/80 hover:bg-white/15 hover:text-white"
            @click="cancelEditMode"
          >
            ✕
          </button>
        </div>
      </form>

      <!-- TAMPILAN FORMAT ADAPTIF STANDAR (JJ:MM:DD jika >= 1 jam, MM:DD jika < 1 jam) -->
      <button
        v-else
        type="button"
        :disabled="isRunning"
        :title="isRunning ? 'Jeda timer dulu untuk mengubah durasi' : 'Klik untuk atur Jam, Menit & Detik'"
        class="group relative flex flex-col items-center rounded-2xl px-4 py-1 transition-all duration-200 focus:outline-none"
        :class="
          isRunning
            ? 'cursor-default'
            : 'cursor-pointer hover:scale-[1.03] hover:bg-white/10 hover:ring-1 hover:ring-pink-200/40'
        "
        @click="openEditMode"
      >
        <div
          class="font-display select-none font-bold tracking-wider text-white tabular-nums transition-all duration-300"
          :class="isHourDisplayMode ? 'text-5xl sm:text-6xl' : 'text-6xl sm:text-7xl'"
          style="text-shadow: 0 4px 18px var(--title-glow, rgba(249, 168, 212, 0.45))"
        >
          {{ formattedTime }}
        </div>

        <!-- Indikator Unit (JAM : MENIT atau MENIT : DETIK) + Petunjuk Klik Saat Berhenti -->
        <div class="mt-0.5 flex flex-wrap items-center justify-center gap-2">
          <span
            class="rounded-full border border-white/15 bg-black/20 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.2em] text-pink-200/90"
          >
            {{ timeUnitIndicator }}
          </span>
          <span
            v-if="!isRunning"
            class="text-[10px] font-semibold text-purple-200/75 transition group-hover:text-pink-100"
          >
            ✎ Klik untuk atur Jam &amp; Menit
          </span>
        </div>
      </button>

      <!-- Pesan Kontekstual Penyemangat -->
      <p class="mt-2 text-center text-xs font-semibold text-pink-100/90">
        {{ statusMessage }}
      </p>

      <!-- Progress Bar Mini -->
      <div class="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
        <div
          class="ocean-progress-fill h-full rounded-full bg-gradient-to-r from-[#f9a8d4] via-[#d8b4fe] to-[#a78bfa] transition-all duration-500"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- 3 Tombol Membulat Pastel: blok cahaya selalu mengikuti status aktif (START=berjalan, PAUSE=terjeda) -->
    <div class="grid grid-cols-3 gap-3">
      <button
        type="button"
        class="btn-bouncy font-display inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 focus:outline-none"
        :class="
          isRunning
            ? 'ocean-active-btn cursor-default bg-gradient-to-r from-[#f9a8d4] to-[#f472b6] text-[#311042] ring-2 ring-pink-200/90 shadow-lg shadow-pink-500/45'
            : 'ocean-active-btn cursor-pointer border border-pink-200/45 bg-pink-300/20 text-pink-100 hover:bg-[#f9a8d4] hover:text-[#311042] hover:shadow-md hover:shadow-pink-500/25'
        "
        :disabled="isRunning"
        @click="startTimer"
      >
        <span
          v-if="isRunning"
          class="h-2 w-2 animate-pulse rounded-full bg-current"
        />
        <span>START</span>
      </button>

      <button
        type="button"
        class="btn-bouncy font-display inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 focus:outline-none"
        :class="
          isPaused
            ? 'cozy-pause-active cursor-default bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa] text-[#1e1b4b] ring-2 ring-white/55 shadow-lg'
            : isRunning
              ? 'cozy-secondary-btn cursor-pointer'
              : 'cozy-secondary-btn cursor-not-allowed'
        "
        :disabled="!isRunning"
        @click="pauseTimer()"
      >
        <span
          v-if="isPaused"
          class="h-2 w-2 rounded-full bg-current"
        />
        <span>PAUSE</span>
      </button>

      <button
        type="button"
        class="cozy-reset-btn btn-bouncy font-display cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide focus:outline-none"
        @click="resetTimer"
      >
        RESET
      </button>
    </div>
  </section>
</template>
