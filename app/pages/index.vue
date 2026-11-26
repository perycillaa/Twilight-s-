<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import {
  CURSOR_OPTIONS,
  type CursorStyleId,
  THEME_OPTIONS,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Ambil seluruh kontrol global dari composable penyimpanan bersama
const {
  theme,
  isDarkTheme,
  userName,
  habits,
  alarms,
  isPomodoroRunning,
  activeCursor,
  isStarCursorEnabled,
  graphicsQuality,
  graphicsConfig,
  isZenMode,
  isImmersiveZenOpen,
  isStudyCardModalOpen,
  isShortcutsModalOpen,
  isMobileDevice,
  twilightFocusIcon,
  isNotebookOpen,
  isAlarmOpen,
  isMiniGameOpen,
  isReceiptModalOpen,
  isSecretCardModalOpen,
  activeAlarmBadge,
  cloudSyncStatus,
  firebaseUser,
  isFirebaseAuthBusy,
  firebaseSyncStatus,
  firebaseLastSyncedAt,
  isBrowserOnline,
  setTheme,
  toggleDarkTheme,
  setUserName,
  isCursorUnlocked,
  setActiveCursor,
  toggleStarCursor,
  cycleGraphicsQuality,
  toggleZenMode,
  exitZenMode,
  triggerPomodoroShortcutToggle,
  triggerPomodoroReset,
  triggerPomodoroModeSwitch,
  triggerBgmPlayToggle,
  triggerBgmMuteToggle,
  triggerCatKeyboardInteract,
  showMiniToast,
  exportBackupData,
  importBackupData,
  pushStateToCloud,
  signInWithGoogle,
  signOutGoogle,
  syncNowWithFirebase,
  restoreMyAccountProgress,
} = useTwilightStorage()

const isRestoringMyProgress = ref<boolean>(false)

async function handleRestoreMyAccountProgress() {
  if (isRestoringMyProgress.value) return
  isRestoringMyProgress.value = true
  try {
    await restoreMyAccountProgress()
  } finally {
    isRestoringMyProgress.value = false
  }
}

const {
  canInstallPwa,
  isIosSafariInstallable,
  isPwaInstalled,
  showIosInstallGuide,
  initPwaInstallListeners,
  triggerPwaInstall,
  dismissIosInstallGuide,
  registerServiceWorker,
  setBackgroundAudioKeepAlive,
  resumeKeepAliveIfNeeded,
} = useBackgroundResilience()

const showInstallAppButton = computed<boolean>(() => {
  return !isPwaInstalled.value && (canInstallPwa.value || isIosSafariInstallable.value)
})

// Aktifkan penjaga proses latar belakang (silent Web Audio keep-alive) ketika timer berjalan
// atau terdapat alarm / pengingat target terjadwal yang belum selesai.
const shouldRunBackgroundKeepAlive = computed<boolean>(() => {
  const hasScheduledHabit = habits.value.some(h => !h.completed && Boolean(h.reminderTime))
  return isPomodoroRunning.value || hasScheduledHabit || alarms.value.length > 0
})

watch(
  shouldRunBackgroundKeepAlive,
  (active) => {
    setBackgroundAudioKeepAlive(active)
  },
  { immediate: true },
)

// Jam digital & sapaan waktu dinamis di pojok kiri atas
const currentTime = ref('--:--')
const timePeriod = ref<'morning' | 'afternoon' | 'evening' | 'night'>('night')
let clockTimer: ReturnType<typeof setInterval> | null = null

// State edit nama panggilan kustom secara inline di header
const isEditingName = ref<boolean>(false)
const nameDraft = ref<string>('')
const nameInputRef = ref<HTMLInputElement | null>(null)

// Ref input file tersembunyi untuk fitur Restore JSON di footer
const restoreInputRef = ref<HTMLInputElement | null>(null)

// Popover menu pilihan 12 Kursor Bertema (terbuka otomatis sesuai tema yang dimiliki)
const isCursorMenuOpen = ref<boolean>(false)
const cursorMenuWrapRef = ref<HTMLElement | null>(null)

// Popover Akun Google & Status Cloud Sync (Firebase Auth + Firestore Offline Persistence)
const isAccountMenuOpen = ref<boolean>(false)
const accountMenuWrapRef = ref<HTMLElement | null>(null)

const googleFirstName = computed<string>(() => {
  const full = firebaseUser.value?.displayName || ''
  return full.split(' ')[0] || 'Akun'
})

const formattedFirebaseLastSync = computed<string>(() => {
  if (!firebaseLastSyncedAt.value) return 'Menunggu sinkronisasi...'
  try {
    const d = new Date(firebaseLastSyncedAt.value)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return 'Baru saja'
  }
})

async function handleGoogleLoginClick() {
  isCursorMenuOpen.value = false
  await signInWithGoogle()
}

async function handleGoogleLogoutClick() {
  isAccountMenuOpen.value = false
  await signOutGoogle()
}

async function handleManualFirebaseSync() {
  await syncNowWithFirebase()
}

const activeCursorMeta = computed(() => {
  return CURSOR_OPTIONS.find(c => c.id === activeCursor.value) ?? CURSOR_OPTIONS[1]!
})

const unlockedCursorCount = computed<number>(() => {
  return CURSOR_OPTIONS.filter(c => c.id !== 'off' && isCursorUnlocked(c.id)).length
})

const totalThemedCursorCount = CURSOR_OPTIONS.filter(c => c.id !== 'off').length

function handleSelectCursorOption(cursorId: CursorStyleId) {
  const result = setActiveCursor(cursorId)
  if (result.ok) {
    isCursorMenuOpen.value = false
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (
    isCursorMenuOpen.value &&
    cursorMenuWrapRef.value &&
    target &&
    !cursorMenuWrapRef.value.contains(target)
  ) {
    isCursorMenuOpen.value = false
  }
  if (
    isAccountMenuOpen.value &&
    accountMenuWrapRef.value &&
    target &&
    !accountMenuWrapRef.value.contains(target)
  ) {
    isAccountMenuOpen.value = false
  }
}

// Sapaan personal otomatis sesuai waktu lokal + nama panggilan pengguna
const personalizedGreeting = computed<string>(() => {
  switch (timePeriod.value) {
    case 'morning':
      return `Selamat pagi, ${userName.value}! Siap wujudkan ide hebat hari ini? ✨`
    case 'afternoon':
      return `Selamat siang, ${userName.value}! Tetap tenang dan melangkah pelan~ 🌸`
    case 'evening':
      return `Selamat sore, ${userName.value}! Sedikit lagi menuju garis finis 🌇`
    default:
      return `Selamat malam, ${userName.value}! Waktunya fokus dengan tenang 🌙`
  }
})

function updateHeaderClock() {
  const now = new Date()
  const hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${String(hours).padStart(2, '0')}:${minutes}`

  if (hours >= 5 && hours < 11) {
    timePeriod.value = 'morning'
  } else if (hours >= 11 && hours < 15) {
    timePeriod.value = 'afternoon'
  } else if (hours >= 15 && hours < 18) {
    timePeriod.value = 'evening'
  } else {
    timePeriod.value = 'night'
  }
}

/** Buka input edit nama panggilan saat teks sapaan diklik */
async function startEditingName() {
  nameDraft.value = userName.value
  isEditingName.value = true
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
}

function saveCustomName() {
  setUserName(nameDraft.value)
  isEditingName.value = false
}

function cancelEditingName() {
  isEditingName.value = false
}

/** Buka dialog pilih file .json untuk Restore data */
function triggerRestorePicker() {
  restoreInputRef.value?.click()
}

async function handleRestoreFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const text = await file.text()
  importBackupData(text)
  // Reset input agar file yang sama bisa dipilih ulang jika diperlukan
  input.value = ''
}

/**
 * Pintasan Keyboard Global khusus Pengguna PC / Laptop:
 * - [Spasi]   : Start / Pause Pomodoro Timer
 * - [T]       : Masuk / keluar Twilight Focus (layar penuh)
 * - [Z]       : Masuk / keluar Starlight Focus ✨
 * - [R]       : Reset Pomodoro Timer
 * - [1/2/3]   : Pindah cepat tab Fokus / Istirahat Singkat / Istirahat Panjang
 * - [M]       : Mute / Unmute seluruh suara (BGM + Ambient Mixer)
 * - [P]       : Play / Pause pemutar musik BGM Player
 * - [N]       : Buka / tutup Notebook
 * - [G]       : Buka / tutup Break Game
 * - [C]       : Sapa / elus Kucing Putih (+Kasih Sayang Kucing 💖)
 * - [Esc]     : Lepas fokus input, tutup modal/popup aktif, atau keluar Twilight/Starlight Focus
 * - [?]       : Buka / tutup panduan Keyboard Shortcuts
 */
function handleGlobalShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  const isTypingField =
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    Boolean(target?.isContentEditable)

  // Saat sedang mengetik di input / textarea / contenteditable:
  // Hanya izinkan Esc untuk melepas fokus (blur); abaikan SEMUA pintasan lain!
  if (isTypingField || isEditingName.value) {
    if (event.key === 'Escape' && target && typeof target.blur === 'function') {
      target.blur()
    }
    return
  }

  // Jangan ganggu pintasan bawaan browser (Ctrl+R, Ctrl+T, Ctrl+C, Cmd+P, dll.)
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return
  }

  // 1. Tombol [Esc]: tutup modal/popup yang terbuka, atau keluar dari Twilight Focus & Starlight Focus
  if (event.key === 'Escape') {
    let handled = false
    if (isAccountMenuOpen.value) {
      isAccountMenuOpen.value = false
      handled = true
    } else if (isCursorMenuOpen.value) {
      isCursorMenuOpen.value = false
      handled = true
    } else if (isShortcutsModalOpen.value) {
      isShortcutsModalOpen.value = false
      handled = true
    } else if (isStudyCardModalOpen.value) {
      isStudyCardModalOpen.value = false
      handled = true
    } else if (isSecretCardModalOpen.value) {
      isSecretCardModalOpen.value = false
      handled = true
    } else if (isReceiptModalOpen.value) {
      isReceiptModalOpen.value = false
      handled = true
    } else if (isNotebookOpen.value) {
      isNotebookOpen.value = false
      handled = true
    } else if (isAlarmOpen.value) {
      isAlarmOpen.value = false
      handled = true
    } else if (isMiniGameOpen.value) {
      isMiniGameOpen.value = false
      handled = true
    } else if (isImmersiveZenOpen.value || isZenMode.value) {
      isImmersiveZenOpen.value = false
      exitZenMode()
      handled = true
    }

    if (handled) {
      event.preventDefault()
    }
    return
  }

  if (event.repeat) return

  // 2. Tombol [?] (Shift + /): buka / tutup panduan Keyboard Shortcuts
  if (event.key === '?' || (event.shiftKey && event.code === 'Slash')) {
    event.preventDefault()
    isShortcutsModalOpen.value = !isShortcutsModalOpen.value
    return
  }

  const lowerKey = event.key.toLowerCase()

  // 3. Tombol [T]: masuk / keluar Twilight Focus (layar penuh)
  if (lowerKey === 't') {
    event.preventDefault()
    const nextOpen = !isImmersiveZenOpen.value
    if (nextOpen) {
      isShortcutsModalOpen.value = false
      isNotebookOpen.value = false
      isAlarmOpen.value = false
      isMiniGameOpen.value = false
      isReceiptModalOpen.value = false
      isSecretCardModalOpen.value = false
      isStudyCardModalOpen.value = false
    }
    isImmersiveZenOpen.value = nextOpen
    return
  }

  // 4. Tombol [Z]: masuk / keluar Starlight Focus ✨
  if (lowerKey === 'z') {
    event.preventDefault()
    toggleZenMode()
    return
  }

  // 5. Tombol [N]: buka / tutup Notebook
  if (lowerKey === 'n') {
    event.preventDefault()
    if (!isNotebookOpen.value) {
      isImmersiveZenOpen.value = false
      isShortcutsModalOpen.value = false
    }
    isNotebookOpen.value = !isNotebookOpen.value
    return
  }

  // 6. Tombol [G]: buka / tutup Break Game (tetap patuh kunci Starlight Focus ✨)
  if (lowerKey === 'g') {
    event.preventDefault()
    if (isZenMode.value) {
      showMiniToast('Break Game terkunci selama Starlight Focus ✨')
      return
    }
    if (!isMiniGameOpen.value) {
      isImmersiveZenOpen.value = false
      isShortcutsModalOpen.value = false
    }
    isMiniGameOpen.value = !isMiniGameOpen.value
    return
  }

  // 7. Tombol [M]: Mute / Unmute seluruh suara (BGM Player + Ambient Sound Mixer)
  if (lowerKey === 'm') {
    event.preventDefault()
    triggerBgmMuteToggle()
    return
  }

  // 8. Tombol [P]: Play / Pause pemutar musik BGM Player
  if (lowerKey === 'p') {
    event.preventDefault()
    triggerBgmPlayToggle()
    return
  }

  // 9. Tombol [C]: sapa / elus Kucing Putih dari keyboard
  if (lowerKey === 'c') {
    event.preventDefault()
    triggerCatKeyboardInteract()
    return
  }

  // Jangan picu kontrol timer (Spasi, R, 1/2/3) saat modal/popup sedang terbuka
  const hasBlockingModal =
    isNotebookOpen.value ||
    isAlarmOpen.value ||
    isReceiptModalOpen.value ||
    isSecretCardModalOpen.value ||
    isStudyCardModalOpen.value ||
    isShortcutsModalOpen.value ||
    isMiniGameOpen.value

  if (hasBlockingModal) return

  // 10. Tombol [R]: Reset Pomodoro Timer
  if (lowerKey === 'r') {
    event.preventDefault()
    triggerPomodoroReset()
    showMiniToast('Pomodoro Timer di-reset ↺')
    return
  }

  // 11. Tombol [1] / [2] / [3]: pindah cepat antar tab mode timer
  if (event.key === '1') {
    event.preventDefault()
    triggerPomodoroModeSwitch('focus')
    return
  }
  if (event.key === '2') {
    event.preventDefault()
    triggerPomodoroModeSwitch('shortBreak')
    return
  }
  if (event.key === '3') {
    event.preventDefault()
    triggerPomodoroModeSwitch('longBreak')
    return
  }

  // 12. Tombol [Spasi]: Start / Pause Pomodoro Timer
  if (event.code === 'Space') {
    event.preventDefault()
    if (document.activeElement instanceof HTMLButtonElement) {
      document.activeElement.blur()
    }
    triggerPomodoroShortcutToggle()
  }
}

let resumeAnimRafId: number | null = null

function syncTabVisibilityPause() {
  if (!import.meta.client) return
  if (document.hidden) {
    if (resumeAnimRafId !== null) {
      cancelAnimationFrame(resumeAnimRafId)
      resumeAnimRafId = null
    }
    document.documentElement.classList.add('app-tab-hidden')
  } else {
    // Tunggu 1 frame saat kembali dari Alt-Tab agar browser merender jendela lebih dulu tanpa freeze/stutter
    resumeAnimRafId = requestAnimationFrame(() => {
      resumeAnimRafId = null
      document.documentElement.classList.remove('app-tab-hidden')
    })
  }
}

function handleBackgroundResumeGesture() {
  syncTabVisibilityPause()
  resumeKeepAliveIfNeeded()
}

let coarsePointerMql: MediaQueryList | null = null

function updateDeviceDetection() {
  if (!import.meta.client) return
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const isSmallViewport = window.innerWidth < 768
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)
  isMobileDevice.value = isCoarsePointer || isSmallViewport || isMobileUa
}

onMounted(() => {
  updateHeaderClock()
  updateDeviceDetection()
  clockTimer = setInterval(updateHeaderClock, 15000)
  window.addEventListener('resize', updateDeviceDetection, { passive: true })
  if (window.matchMedia) {
    coarsePointerMql = window.matchMedia('(pointer: coarse)')
    coarsePointerMql.addEventListener?.('change', updateDeviceDetection)
  }
  window.addEventListener('keydown', handleGlobalShortcut)
  window.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('pointerdown', handleBackgroundResumeGesture, { passive: true })
  document.addEventListener('visibilitychange', handleBackgroundResumeGesture)
  initPwaInstallListeners()
  void registerServiceWorker()
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (resumeAnimRafId !== null) cancelAnimationFrame(resumeAnimRafId)
  if (import.meta.client) {
    document.documentElement.classList.remove('app-tab-hidden')
    window.removeEventListener('resize', updateDeviceDetection)
    coarsePointerMql?.removeEventListener?.('change', updateDeviceDetection)
    window.removeEventListener('keydown', handleGlobalShortcut)
    window.removeEventListener('pointerdown', handleDocumentPointerDown)
    window.removeEventListener('pointerdown', handleBackgroundResumeGesture)
    document.removeEventListener('visibilitychange', handleBackgroundResumeGesture)
  }
  setBackgroundAudioKeepAlive(false)
})
</script>

<template>
  <div class="relative min-h-screen w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
    <!-- Latar belakang malam lo-fi berbintang, bintang jatuh, awan & hujan dinamis -->
    <StarryBackground />

    <!-- Efek Hujan Confetti Bintang & Hati saat 100% Target Hari Ini Tercapai -->
    <CelebrationConfetti />

    <!-- Pop-up Pengingat Jadwal Cerdas & Toast Penyemangat Mini -->
    <ReminderToast />

    <!-- Kursor Bintang Kustom & Jejak Kilau (khusus desktop, otomatis nonaktif di HP) -->
    <StarCursor />

    <!-- Teman Kucing Interaktif di Layar (bisa di-drag, di-shake, diklik, diberi ikan, dan disembunyikan) -->
    <FloatingPetCat />

    <!-- Modal Pop-up "Struk Produktivitas Hari Ini" -->
    <DailyReceiptModal />

    <!-- Modal Kawaii Notebook (4 tema kertas CSS murni) -->
    <KawaiiNotebook />

    <!-- Modal & Pemantau Kawaii Alarm (Countdown, Jam Tertentu & Pop-up Berbunyi) -->
    <KawaiiAlarm />

    <!-- Modal Kawaii Mini-Game ("Starlight & Fish Catcher" 30 Detik) -->
    <KawaiiMiniGame />

    <!-- Modal Gacha Kartu "💌 Pesan Rahasia Kucing" (3D Flip Reveal & Album Koleksi 18 Kartu) -->
    <SecretCatCardModal />

    <!-- Twilight Focus (Mode Layar Penuh / Meja Belajar Imersif) -->
    <ImmersiveZenOverlay />

    <!-- Modal Pratinjau & Unduh Kartu Progres Harian (1080 × 1350 px PNG) -->
    <StudyCardModal />

    <!-- Modal Panduan Daftar Keyboard Shortcuts (PC / Laptop) -->
    <KeyboardShortcutsModal />

    <!-- Kontainer Utama Dashboard Twilight's (disembunyikan sementara saat Mode Zen layar penuh aktif agar timer & audio tetap berjalan mulus) -->
    <main
      v-show="!isImmersiveZenOpen"
      class="relative z-10 mx-auto flex max-w-7xl flex-col gap-5 pt-4 sm:pt-5"
    >
      <!-- HEADER ATAS: Meredup lembut tanpa blur saat Starlight Focus ✨ aktif agar teks tetap tajam & mudah dibaca -->
      <header
        class="relative z-30 flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-500 sm:px-6"
        :class="
          isZenMode
            ? 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            : 'border-white/20 bg-white/10'
        "
      >
        <!-- Pojok Kiri Atas: Jam Digital + Sapaan Personal yang Bisa Diklik -->
        <div
          class="flex flex-wrap items-center gap-2.5 transition-opacity duration-500"
          :class="isZenMode ? 'opacity-40 hover:opacity-100' : 'opacity-100'"
        >
          <span
            class="cozy-sub-card font-display inline-flex items-center gap-1.5 rounded-full border border-pink-200/35 bg-white/15 px-3 py-1 text-sm font-bold text-pink-200 shadow-sm"
          >
            <span class="cozy-dot h-2 w-2 animate-pulse rounded-full bg-pink-300 shadow-[0_0_8px_#f9a8d4]" />
            {{ currentTime }}
          </span>

          <!-- Mode Edit Nama Inline -->
          <form
            v-if="isEditingName"
            class="flex items-center gap-1.5"
            @submit.prevent="saveCustomName"
          >
            <input
              ref="nameInputRef"
              v-model="nameDraft"
              type="text"
              maxlength="24"
              placeholder="Nama panggilanmu..."
              class="w-36 rounded-full border border-pink-300/70 bg-white/15 px-3 py-1 text-xs font-semibold text-white placeholder-purple-200/60 outline-none sm:w-44"
              @keydown.esc="cancelEditingName"
            >
            <button
              type="submit"
              class="cozy-active-btn btn-bouncy cursor-pointer rounded-full bg-[#f9a8d4] px-2.5 py-1 text-[11px] font-bold text-[#311042]"
            >
              Simpan
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-full bg-white/10 px-2 py-1 text-[11px] text-purple-200 hover:bg-white/20"
              @click="cancelEditingName"
            >
              ✕
            </button>
          </form>

          <!-- Teks Sapaan Personal (klik untuk ubah nama panggilan) -->
          <button
            v-else
            type="button"
            title="Klik untuk mengganti nama panggilanmu"
            class="group flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-left text-xs font-semibold text-pink-50/95 transition hover:bg-white/10 sm:text-sm"
            @click="startEditingName"
          >
            <span>{{ personalizedGreeting }}</span>
            <span class="text-[11px] text-pink-200/70 opacity-65 transition group-hover:opacity-100">
              ✎
            </span>
          </button>
        </div>

        <!-- Bagian Kanan Header: Instal PWA, Notebook, Alarm (+badge), Break Game, Mode Hemat Baterai, Kursor & Theme Switcher -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <!-- Tombol Kustom Instal PWA (muncul otomatis saat browser mendukung beforeinstallprompt atau di Safari iOS) -->
          <div v-if="showInstallAppButton" class="relative inline-flex">
            <button
              type="button"
              title="Instal Twilight's ke layar utama agar terbuka layaknya aplikasi native & bisa offline"
              class="cozy-pill-btn btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border border-pink-300/65 bg-gradient-to-r from-[#f9a8d4]/30 to-[#c084fc]/30 px-2.5 py-1 text-[11px] font-bold text-pink-50 shadow-sm"
              @click="triggerPwaInstall"
            >
              <span>📲</span>
              <span>Instal Aplikasi</span>
            </button>

            <!-- Petunjuk Ringkas Khusus Pengguna Safari iOS (iPhone/iPad) -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="translate-y-1 opacity-0 scale-95"
              enter-to-class="translate-y-0 opacity-100 scale-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="translate-y-1 opacity-0 scale-95"
            >
              <div
                v-if="showIosInstallGuide"
                role="dialog"
                aria-label="Panduan instal Twilight's di iOS"
                class="absolute right-0 top-full z-50 mt-2.5 w-64 rounded-2xl border border-pink-300/50 bg-[#261c42]/98 p-3 text-left text-xs leading-relaxed text-pink-50 shadow-xl shadow-pink-500/25"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="font-semibold">
                    Ketuk ikon <strong>Share (Kotak Panah Atas)</strong> lalu pilih <strong>'Add to Home Screen'</strong> untuk menginstal Twilight's.
                  </p>
                  <button
                    type="button"
                    aria-label="Tutup panduan instal iOS"
                    class="shrink-0 cursor-pointer rounded-full px-1.5 text-purple-200/80 hover:bg-white/10 hover:text-white"
                    @click="dismissIosInstallGuide"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Kelompok Notebook & Alarm (meredup tanpa blur saat Starlight Focus ✨ aktif) -->
          <div
            class="flex flex-wrap items-center gap-2 transition-opacity duration-500 sm:gap-2.5"
            :class="isZenMode ? 'opacity-40 hover:opacity-100' : 'opacity-100'"
          >
            <!-- Tombol Akses Twilight Focus (ikon adaptif: 🖥️ di PC/Laptop, 📱 di HP/Mobile) -->
            <button
              type="button"
              title="Masuk ke Twilight Focus (tampilan layar penuh meja belajar) — Pintasan [T]"
              class="cozy-pill-btn btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border border-indigo-200/45 bg-gradient-to-r from-indigo-400/25 via-purple-400/25 to-pink-400/25 px-2.5 py-1 text-[11px] font-bold text-pink-50"
              @click="isImmersiveZenOpen = true"
            >
              <span>{{ twilightFocusIcon }}</span>
              <span>Twilight Focus</span>
            </button>

            <!-- Tombol Akses Kawaii Notebook -->
            <button
              type="button"
              title="Buka Kawaii Notebook (buku catatan digital)"
              class="cozy-pill-btn btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border border-pink-200/35 bg-pink-300/15 px-2.5 py-1 text-[11px] font-semibold text-pink-100"
              @click="isNotebookOpen = true"
            >
              <span>📔</span>
              <span>Notebook</span>
            </button>

            <!-- Tombol Akses Kawaii Alarm + Badge Sisa Waktu Berdenyut jika ada alarm aktif -->
            <button
              type="button"
              title="Buka Kawaii Alarm (pengingat cepat & jam tertentu)"
              class="btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              :class="
                activeAlarmBadge
                  ? 'border-amber-200/70 bg-amber-300/25 text-amber-100 shadow-sm shadow-amber-400/20'
                  : 'cozy-pill-btn border-purple-200/35 bg-purple-300/15 text-purple-100'
              "
              @click="isAlarmOpen = true"
            >
              <span :class="{ 'animate-pulse': Boolean(activeAlarmBadge) }">⏰</span>
              <span v-if="activeAlarmBadge" class="font-display font-bold">
                {{ activeAlarmBadge }}
              </span>
              <span v-else>Alarm</span>
            </button>
          </div>

          <!-- Tombol Akses Kawaii Break Game + Custom Kawaii Tooltip (teks 100% tajam tanpa blur parent) -->
          <div class="group relative inline-flex">
            <button
              type="button"
              :disabled="isZenMode"
              :title="
                isZenMode
                  ? undefined
                  : 'Mainkan mini-game istirahat 30 detik (Starlight & Fish Catcher)'
              "
              :aria-describedby="isZenMode ? 'break-game-lock-tooltip' : undefined"
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
              :class="
                isZenMode
                  ? 'cursor-not-allowed border-white/15 bg-white/5 text-purple-200/70 opacity-30'
                  : 'cozy-pill-btn btn-bouncy cursor-pointer border-sky-200/35 bg-sky-300/15 text-sky-100'
              "
              @click="!isZenMode && (isMiniGameOpen = true)"
            >
              <span>🎮</span>
              <span>Break Game</span>
            </button>

            <!-- Gelembung Tooltip Kawaii Kustom (tajam, kontras tinggi, bebas buram) -->
            <div
              v-if="isZenMode"
              id="break-game-lock-tooltip"
              role="tooltip"
              class="pointer-events-none absolute left-1/2 top-full z-50 mt-2.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-pink-300/60 bg-[#231136] px-3.5 py-1.5 font-sans text-xs font-semibold text-pink-50 antialiased opacity-0 shadow-lg shadow-pink-500/25 transition-opacity duration-200 group-hover:opacity-100"
            >
              <span
                aria-hidden="true"
                class="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-pink-300/60 bg-[#231136]"
              />
              Terkunci selama Starlight Focus ✨
            </div>
          </div>

          <!-- Kelompok Kontrol Kanan: Hemat Daya, Kursor & Tema (meredup tanpa blur saat Starlight Focus ✨ aktif) -->
          <div
            class="flex flex-wrap items-center gap-2 transition-opacity duration-500 sm:gap-2.5"
            :class="isZenMode ? 'opacity-40 hover:opacity-100' : 'opacity-100'"
          >
            <!-- Pengaturan Kualitas Grafik 3 Tingkat: 🍃 Low (Rendah) / ⚖️ Medium (Sedang) / ✨ High (Tinggi) -->
            <button
              type="button"
              :title="`Kualitas Grafik: ${graphicsConfig.label} — Klik untuk ganti antara 🍃 Low (Rendah), ⚖️ Medium (Sedang), dan ✨ High (Tinggi)`"
              class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
              :class="
                graphicsQuality === 'low'
                  ? 'cozy-secondary-btn shadow-sm'
                  : graphicsQuality === 'medium'
                    ? 'cozy-pill-btn shadow-sm'
                    : 'cozy-pill-btn shadow-sm'
              "
              @click="cycleGraphicsQuality"
            >
              <span>⚙️</span>
              <span>Grafik: {{ graphicsConfig.icon }} {{ graphicsConfig.label }}</span>
            </button>

            <!-- Tombol & Popover Pilihan 12 Kursor Bertema (Terbuka Otomatis Sesuai Tema Dimiliki + Tap Ripple HP) -->
            <div ref="cursorMenuWrapRef" class="relative inline-flex">
              <button
                type="button"
                :title="`Kursor aktif: ${activeCursorMeta.name} — Klik untuk pilih kursor bertema`"
                :aria-expanded="isCursorMenuOpen"
                aria-haspopup="menu"
                class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                :class="
                  activeCursor !== 'off'
                    ? 'cozy-pill-btn shadow-sm'
                    : 'cozy-tab-inactive'
                "
                @click="isCursorMenuOpen = !isCursorMenuOpen"
              >
                <span :style="{ color: 'var(--cursor-fill, var(--accent-primary))' }">{{ activeCursorMeta.icon }}</span>
                <span>Kursor</span>
                <span class="text-[9px] opacity-75">▾</span>
              </button>

              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="translate-y-1 opacity-0 scale-95"
                enter-to-class="translate-y-0 opacity-100 scale-100"
                leave-active-class="transition duration-120 ease-in"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="translate-y-1 opacity-0 scale-95"
              >
                <div
                  v-if="isCursorMenuOpen"
                  role="menu"
                  aria-label="Menu pilihan kursor bertema"
                  class="cozy-popover-menu absolute right-0 top-full z-50 mt-2.5 w-72 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl sm:w-80"
                >
                  <div class="flex items-center justify-between border-b px-3.5 py-2.5" style="border-color: var(--border-subtle)">
                    <div>
                      <p class="font-display text-xs font-bold" style="color: var(--text-primary)">
                        ✨ Pilihan Kursor Bertema
                      </p>
                      <p class="text-[10px] font-medium" style="color: var(--text-secondary)">
                        Warna otomatis ikuti tema &amp; mode • Tap ripple di HP
                      </p>
                    </div>
                    <span class="cozy-badge rounded-full border px-2 py-0.5 text-[10px] font-bold">
                      {{ unlockedCursorCount }}/{{ totalThemedCursorCount }}
                    </span>
                  </div>

                  <div class="max-h-[60vh] space-y-1 overflow-y-auto p-2">
                    <button
                      v-for="cursorOpt in CURSOR_OPTIONS"
                      :key="cursorOpt.id"
                      type="button"
                      role="menuitemradio"
                      :aria-checked="activeCursor === cursorOpt.id"
                      class="flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition"
                      :class="
                        activeCursor === cursorOpt.id
                          ? 'cozy-pill-btn cursor-pointer shadow-sm'
                          : isCursorUnlocked(cursorOpt.id)
                            ? 'cursor-pointer border-transparent hover:brightness-105'
                            : 'cursor-not-allowed border-transparent opacity-60 hover:opacity-75'
                      "
                      :style="
                        activeCursor !== cursorOpt.id
                          ? { background: isCursorUnlocked(cursorOpt.id) ? 'var(--accent-surface)' : 'var(--surface-subtle)' }
                          : undefined
                      "
                      @click="handleSelectCursorOption(cursorOpt.id)"
                    >
                      <div class="flex min-w-0 items-center gap-2">
                        <span
                          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-sm shadow-inner"
                          :style="{
                            background: 'var(--accent-soft)',
                            borderColor: 'var(--cursor-stroke, var(--border-strong))',
                          }"
                        >
                          {{ cursorOpt.icon }}
                        </span>
                        <div class="min-w-0">
                          <p class="truncate text-[11px] font-bold" style="color: var(--text-primary)">
                            {{ cursorOpt.name }}
                          </p>
                          <p
                            v-if="!isCursorUnlocked(cursorOpt.id)"
                            class="truncate text-[9.5px] font-semibold"
                            style="color: var(--accent-primary)"
                          >
                            🔒 Buka tema {{ cursorOpt.requiredThemeName }}
                          </p>
                          <p
                            v-else
                            class="truncate text-[9.5px]"
                            style="color: var(--text-secondary)"
                          >
                            {{ cursorOpt.description }}
                          </p>
                        </div>
                      </div>

                      <span
                        v-if="activeCursor === cursorOpt.id"
                        class="cozy-active-btn shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold"
                      >
                        ✓ Aktif
                      </span>
                      <span
                        v-else-if="!isCursorUnlocked(cursorOpt.id)"
                        class="shrink-0 text-xs"
                      >
                        🔒
                      </span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Tombol Panduan Keyboard Shortcuts (⌨️) khusus PC/Laptop — tersembunyi otomatis di HP/Mobile -->
            <button
              type="button"
              title="Panduan Keyboard Shortcuts (Tekan ?)"
              aria-label="Buka panduan Keyboard Shortcuts"
              class="cozy-pill-btn desktop-only-control btn-bouncy inline-flex cursor-pointer items-center justify-center rounded-full border border-pink-200/35 bg-white/10 px-2.5 py-1 text-xs font-semibold text-pink-100 shadow-sm transition"
              @click="isShortcutsModalOpen = true"
            >
              ⌨️
            </button>

            <!-- Theme Switcher: 3 Tombol Bulatan Warna + Sakelar Mode Gelap (🌙 / ☀️) -->
            <div class="flex items-center gap-1.5">
              <span class="hidden text-[11px] font-semibold text-purple-200/80 md:inline">
                Tema:
              </span>
              <div class="flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-2.5 py-1.5">
                <button
                  v-for="option in THEME_OPTIONS"
                  :key="option.id"
                  type="button"
                  :title="`Ganti tema: ${option.name}`"
                  :aria-label="`Pilih tema ${option.name}`"
                  class="btn-bouncy h-5 w-5 cursor-pointer rounded-full border border-white/60 shadow-sm"
                  :class="[
                    option.dotClass,
                    theme === option.id
                      ? `scale-115 ring-2 ring-offset-2 ring-offset-[#1e1b4b] ${option.ringClass}`
                      : 'opacity-75 hover:opacity-100',
                  ]"
                  @click="setTheme(option.id)"
                />
              </div>

              <!-- Tombol Sakelar Mode Terang Pastel (☀️) / Mode Gelap Cozy (🌙) untuk SEMUA Tema -->
              <button
                type="button"
                :title="
                  isDarkTheme
                    ? 'Saat ini Mode Gelap (🌙) — Klik untuk beralih ke Mode Terang Pastel (☀️)'
                    : 'Saat ini Mode Terang (☀️) — Klik untuk beralih ke Mode Gelap Cozy (🌙)'
                "
                :aria-label="isDarkTheme ? 'Beralih ke mode terang pastel' : 'Beralih ke mode gelap'"
                class="cozy-pill-btn btn-bouncy inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-sm shadow-sm transition"
                @click="toggleDarkTheme"
              >
                {{ isDarkTheme ? '🌙' : '☀️' }}
              </button>
            </div>

            <!-- Login dengan Google & Status Cloud Sync Otomatis (Firebase Auth + Firestore Offline Persistence) -->
            <div ref="accountMenuWrapRef" class="relative inline-flex">
              <!-- Belum Login: Tombol Masuk dengan Google -->
              <button
                v-if="!firebaseUser"
                type="button"
                :disabled="isFirebaseAuthBusy"
                title="Login dengan Google agar progres tersinkron otomatis antara PC & HP (tetap aman saat offline)"
                class="cozy-pill-btn btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-sm transition disabled:opacity-60"
                @click="handleGoogleLoginClick"
              >
                <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.86-3c-1.08.72-2.45 1.16-3.42 1.16-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <span>{{ isFirebaseAuthBusy ? 'Masuk...' : 'Masuk Google' }}</span>
              </button>

              <!-- Sudah Login: Pil Profil Google + Titik Status Cloud Sync -->
              <button
                v-else
                type="button"
                :aria-expanded="isAccountMenuOpen"
                aria-haspopup="menu"
                :title="`Akun Google: ${firebaseUser.displayName} (${firebaseUser.email}) — Klik untuk detail Cloud Sync`"
                class="cozy-pill-btn btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2.5 text-[11px] font-bold shadow-sm transition"
                @click="isAccountMenuOpen = !isAccountMenuOpen"
              >
                <span class="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-black/20 text-[10px] font-bold">
                  <img
                    v-if="firebaseUser.photoURL"
                    :src="firebaseUser.photoURL"
                    :alt="firebaseUser.displayName"
                    referrerpolicy="no-referrer"
                    class="h-full w-full object-cover"
                  >
                  <span v-else>{{ googleFirstName.slice(0, 1).toUpperCase() }}</span>
                </span>
                <span class="max-w-[72px] truncate">{{ googleFirstName }}</span>
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="
                    firebaseSyncStatus === 'synced'
                      ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                      : firebaseSyncStatus === 'syncing'
                        ? 'animate-ping bg-amber-300'
                        : firebaseSyncStatus === 'offline'
                          ? 'bg-sky-300'
                          : 'bg-rose-400'
                  "
                />
              </button>

              <!-- Popover Detail Akun Google & Cloud Sync -->
              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="translate-y-1 opacity-0 scale-95"
                enter-to-class="translate-y-0 opacity-100 scale-100"
                leave-active-class="transition duration-120 ease-in"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="translate-y-1 opacity-0 scale-95"
              >
                <div
                  v-if="isAccountMenuOpen && firebaseUser"
                  role="menu"
                  aria-label="Menu akun Google & Cloud Sync"
                  class="cozy-popover-menu absolute right-0 top-full z-50 mt-2.5 w-72 overflow-hidden rounded-2xl border p-3.5 text-left shadow-2xl backdrop-blur-xl"
                >
                  <div class="flex items-center gap-2.5 border-b border-white/15 pb-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-black/20 font-bold">
                      <img
                        v-if="firebaseUser.photoURL"
                        :src="firebaseUser.photoURL"
                        :alt="firebaseUser.displayName"
                        referrerpolicy="no-referrer"
                        class="h-full w-full object-cover"
                      >
                      <span v-else>{{ googleFirstName.slice(0, 1).toUpperCase() }}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-bold text-white">
                        {{ firebaseUser.displayName }}
                      </p>
                      <p class="truncate text-[10px] text-purple-200/75">
                        {{ firebaseUser.email }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-2.5 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-[11px]">
                    <div class="flex items-center justify-between gap-2 font-bold">
                      <span>
                        {{
                          !isBrowserOnline || firebaseSyncStatus === 'offline'
                            ? '📡 Mode Offline (Cache Lokal)'
                            : firebaseSyncStatus === 'syncing'
                              ? '🔄 Menyimpan ke Cloud...'
                              : firebaseSyncStatus === 'error'
                                ? '⚠️ Sinkronisasi Tertunda'
                                : '☁️ Cloud Sync Aktif'
                        }}
                      </span>
                      <span class="text-[10px] font-semibold opacity-75">
                        {{ formattedFirebaseLastSync }}
                      </span>
                    </div>
                    <p class="mt-1 text-[10px] leading-relaxed text-purple-200/75">
                      Progres koin, habit, tema, kursor &amp; catatan otomatis tersimpan di perangkat saat offline dan sinkron real-time antara PC &amp; HP.
                    </p>
                  </div>

                  <div class="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      class="cozy-active-btn btn-bouncy flex-1 cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-bold shadow-sm"
                      @click="handleManualFirebaseSync"
                    >
                      ☁️ Sinkronkan
                    </button>
                    <button
                      type="button"
                      :disabled="isFirebaseAuthBusy"
                      class="cozy-pill-btn btn-bouncy cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-bold"
                      @click="handleGoogleLogoutClick"
                    >
                      🚪 Keluar
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </header>

      <!-- GRID DASHBOARD 3 KOLOM RESPONSIF (3 kolom di laptop, 1 kolom vertikal di HP) -->
      <div class="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <!-- KOLOM KIRI: Branding Twilight's, Daily Spark Quote, Maskot Interaktif, Statistik & Tab Mini -->
        <div class="lg:col-span-3">
          <BrandingCard />
        </div>

        <!-- KOLOM TENGAH: Pomodoro Timer (Atas) & BGM Player + Ambient Mixer (Bawah) -->
        <div class="flex flex-col gap-5 lg:col-span-5">
          <PomodoroTimer />
          <BgmPlayer />
        </div>

        <!-- KOLOM KANAN: Daily Habit Tracker & Grafik Progres (meredup lembut tanpa blur saat Starlight Focus ✨ aktif) -->
        <div
          class="flex flex-col gap-5 transition-opacity duration-500 lg:col-span-4"
          :class="
            isZenMode
              ? 'opacity-35 hover:opacity-100'
              : 'opacity-100'
          "
        >
          <HabitTracker />
          <ProgressChart />
        </div>
      </div>

      <!-- FOOTER BAWAH: Status TiDB Cloud, Tip Keyboard Desktop + Tombol Mini Backup & Restore (meredup tanpa blur) -->
      <footer
        class="flex flex-col items-center justify-between gap-3 pb-3 pt-1 text-center text-xs font-medium text-purple-200/70 transition-opacity duration-500 sm:flex-row"
        :class="
          isZenMode
            ? 'opacity-35 hover:opacity-100'
            : 'opacity-100'
        "
      >
        <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <span>✦ Twilight's — Cheer your day with me!</span>
          <span class="hidden text-[11px] text-pink-200/75 md:inline">
            • Tip: [Spasi] Timer • [T] Twilight Focus • [Z] Starlight Focus • [?] Pintasan
          </span>
          <button
            v-if="firebaseUser"
            type="button"
            title="Klik untuk sinkronisasi manual ke Firebase Cloud Firestore"
            class="cozy-pill-btn btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            @click="handleManualFirebaseSync"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="
                firebaseSyncStatus === 'synced'
                  ? 'bg-emerald-400'
                  : firebaseSyncStatus === 'syncing'
                    ? 'animate-ping bg-amber-300'
                    : firebaseSyncStatus === 'offline'
                      ? 'bg-sky-400'
                      : 'bg-rose-400'
              "
            />
            <span>
              {{
                !isBrowserOnline || firebaseSyncStatus === 'offline'
                  ? '📡 Offline (Auto-Sync Saat Online)'
                  : firebaseSyncStatus === 'syncing'
                    ? '☁️ Menyimpan ke Firebase...'
                    : firebaseSyncStatus === 'error'
                      ? '⚠️ Coba Sinkronkan Ulang'
                      : '☁️ Google Cloud Tersinkron'
              }}
            </span>
          </button>
          <button
            v-else
            type="button"
            title="Login dengan Google untuk Cloud Sync otomatis PC & HP (tetap aman saat offline)"
            class="cozy-pill-btn btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            @click="handleGoogleLoginClick"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-400'
                  : 'bg-amber-300/80'
              "
            />
            <span>☁️ Login Google (Cloud Sync PC ↔ HP)</span>
          </button>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            title="Pratinjau & unduh gambar Kartu Progres Belajar Hari Ini (.png)"
            class="btn-bouncy cursor-pointer rounded-full border border-pink-300/40 bg-pink-400/15 px-3 py-1 text-[11px] font-semibold text-pink-100 hover:bg-pink-400/30"
            @click="isStudyCardModalOpen = true"
          >
            📸 Simpan Kartu Progres
          </button>

          <button
            type="button"
            title="Unduh file cadangan twilights-backup.json"
            class="btn-bouncy cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-pink-100 hover:bg-white/20"
            @click="exportBackupData"
          >
            💾 Backup Data
          </button>

          <button
            type="button"
            title="Pulihkan data dari file twilights-backup.json"
            class="btn-bouncy cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-purple-100 hover:bg-white/20"
            @click="triggerRestorePicker"
          >
            📂 Restore
          </button>

          <!-- TEMPORARY RECOVERY BUTTON: Pemulihan progres 1-klik ke localStorage & Cloud Firestore -->
          <button
            type="button"
            :disabled="isRestoringMyProgress"
            title="Pulihkan progres akun (500 🐟, Lv. 15, Streak 2h, 9 Kartu, Tema s/d Honey Library, Pita & Buku) lalu simpan ke Cloud Firestore"
            class="cozy-active-btn btn-bouncy cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold shadow-sm disabled:opacity-60"
            @click="handleRestoreMyAccountProgress"
          >
            {{ isRestoringMyProgress ? '⏳ Memulihkan...' : '🛠️ Pulihkan Progres Saya' }}
          </button>

          <!-- Input file tersembunyi untuk memuat file JSON backup -->
          <input
            ref="restoreInputRef"
            type="file"
            accept=".json,application/json"
            class="hidden"
            @change="handleRestoreFileChange"
          >
        </div>
      </footer>
    </main>
  </div>
</template>
