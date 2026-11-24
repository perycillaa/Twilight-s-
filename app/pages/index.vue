<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import { THEME_OPTIONS, useTwilightStorage } from '~/composables/useTwilightStorage'

// Ambil seluruh kontrol global dari composable penyimpanan bersama
const {
  theme,
  userName,
  habits,
  alarms,
  isPomodoroRunning,
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
  setTheme,
  setUserName,
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
} = useTwilightStorage()

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
    if (isShortcutsModalOpen.value) {
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

function handleBackgroundResumeGesture() {
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
  window.addEventListener('pointerdown', handleBackgroundResumeGesture, { passive: true })
  document.addEventListener('visibilitychange', handleBackgroundResumeGesture)
  initPwaInstallListeners()
  void registerServiceWorker()
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (import.meta.client) {
    window.removeEventListener('resize', updateDeviceDetection)
    coarsePointerMql?.removeEventListener?.('change', updateDeviceDetection)
    window.removeEventListener('keydown', handleGlobalShortcut)
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
            class="font-display inline-flex items-center gap-1.5 rounded-full border border-pink-200/35 bg-white/15 px-3 py-1 text-sm font-bold text-pink-200 shadow-sm"
          >
            <span class="h-2 w-2 animate-pulse rounded-full bg-pink-300 shadow-[0_0_8px_#f9a8d4]" />
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
              class="btn-bouncy cursor-pointer rounded-full bg-[#f9a8d4] px-2.5 py-1 text-[11px] font-bold text-[#311042]"
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
              class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border border-pink-300/65 bg-gradient-to-r from-[#f9a8d4]/30 to-[#c084fc]/30 px-2.5 py-1 text-[11px] font-bold text-pink-50 shadow-sm shadow-pink-500/20 hover:from-[#f9a8d4]/45 hover:to-[#c084fc]/45"
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
              class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border border-indigo-200/45 bg-gradient-to-r from-indigo-400/25 via-purple-400/25 to-pink-400/25 px-2.5 py-1 text-[11px] font-bold text-pink-50 hover:from-indigo-400/40 hover:to-pink-400/40"
              @click="isImmersiveZenOpen = true"
            >
              <span>{{ twilightFocusIcon }}</span>
              <span>Twilight Focus</span>
            </button>

            <!-- Tombol Akses Kawaii Notebook -->
            <button
              type="button"
              title="Buka Kawaii Notebook (buku catatan digital)"
              class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border border-pink-200/35 bg-pink-300/15 px-2.5 py-1 text-[11px] font-semibold text-pink-100 hover:bg-pink-300/30"
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
                  : 'border-purple-200/35 bg-purple-300/15 text-purple-100 hover:bg-purple-300/30'
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
                  : 'btn-bouncy cursor-pointer border-sky-200/35 bg-sky-300/15 text-sky-100 hover:bg-sky-300/30'
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
            <!-- Pengaturan Kualitas Grafik Bergaya Game: 🍃 Ringan / ⚖️ Sedang / ✨ Tinggi -->
            <button
              type="button"
              :title="`Kualitas Grafik: ${graphicsConfig.label} — Klik untuk ganti antara 🍃 Ringan, ⚖️ Sedang, dan ✨ Tinggi`"
              class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
              :class="
                graphicsQuality === 'low'
                  ? 'border-emerald-300/70 bg-emerald-400/25 text-emerald-100 shadow-sm'
                  : graphicsQuality === 'medium'
                    ? 'border-amber-200/60 bg-amber-300/20 text-amber-100 shadow-sm'
                    : 'border-pink-200/50 bg-pink-300/20 text-pink-100 shadow-sm'
              "
              @click="cycleGraphicsQuality"
            >
              <span>⚙️</span>
              <span>Grafik: {{ graphicsConfig.icon }} {{ graphicsConfig.label }}</span>
            </button>

            <!-- Tombol Toggle Kursor Bintang Kustom (khusus PC/Laptop — otomatis tersembunyi di HP/Mobile) -->
            <button
              type="button"
              :title="
                isStarCursorEnabled
                  ? 'Matikan kursor bintang kustom'
                  : 'Nyalakan kursor bintang kustom'
              "
              class="desktop-only-control btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              :class="
                isStarCursorEnabled
                  ? 'border-pink-200/45 bg-pink-300/20 text-pink-100 shadow-sm'
                  : 'border-white/15 bg-white/5 text-purple-200/70 hover:bg-white/15 hover:text-white'
              "
              @click="toggleStarCursor"
            >
              <span>{{ isStarCursorEnabled ? '✦' : '✧' }}</span>
              <span>Kursor</span>
            </button>

            <!-- Tombol Panduan Keyboard Shortcuts (⌨️) khusus PC/Laptop — tersembunyi otomatis di HP/Mobile -->
            <button
              type="button"
              title="Panduan Keyboard Shortcuts (Tekan ?)"
              aria-label="Buka panduan Keyboard Shortcuts"
              class="desktop-only-control btn-bouncy inline-flex cursor-pointer items-center justify-center rounded-full border border-pink-200/35 bg-white/10 px-2.5 py-1 text-xs font-semibold text-pink-100 shadow-sm transition hover:border-pink-300/65 hover:bg-pink-300/25"
              @click="isShortcutsModalOpen = true"
            >
              ⌨️
            </button>

            <!-- Theme Switcher: 3 Tombol Bulatan Warna Kecil -->
            <div class="flex items-center gap-2">
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
            type="button"
            title="Klik untuk sinkronisasi manual ke TiDB Cloud"
            class="btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            :class="
              cloudSyncStatus === 'synced'
                ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
                : cloudSyncStatus === 'syncing'
                  ? 'border-amber-300/40 bg-amber-400/15 text-amber-100'
                  : 'border-white/20 bg-white/10 text-purple-200'
            "
            @click="pushStateToCloud(false)"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-300'
                  : cloudSyncStatus === 'syncing'
                    ? 'animate-ping bg-amber-300'
                    : 'bg-purple-300/60'
              "
            />
            <span>
              {{
                cloudSyncStatus === 'synced'
                  ? '☁️ TiDB Cloud Terhubung'
                  : cloudSyncStatus === 'syncing'
                    ? '☁️ Menyimpan...'
                    : '☁️ Sinkronkan TiDB'
              }}
            </span>
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
