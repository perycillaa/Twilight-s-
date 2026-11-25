<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import { ALARM_SOUND_OPTIONS, useSoundEffects } from '~/composables/useSoundEffects'
import {
  type KawaiiAlarmItem,
  VIBRATION_PATTERNS,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  isAlarmOpen,
  alarms,
  selectedAlarmSound,
  activeAlarmBadge,
  addCountdownAlarm,
  addClockAlarm,
  removeAlarm,
  setAlarmSound,
  triggerMascotReaction,
  triggerVibration,
} = useTwilightStorage()

const { playAlarmMelody } = useSoundEffects()
const { kirimNotifikasiSistem } = useBackgroundResilience()

const DEFAULT_TAB_TITLE = "Twilight's — Cheer your day with me!"

// Preset sekali klik untuk Mode Pengingat Cepat (dalam menit)
const COUNTDOWN_PRESETS = [2, 5, 10, 15, 30]

// State modal Kawaii Alarm
const activeMode = ref<'countdown' | 'clock'>('countdown')
const customMinutes = ref<number>(5)
const countdownLabel = ref<string>('')
const clockTimeInput = ref<string>('15:00')
const clockLabel = ref<string>('')

// Timestamp sekarang (diperbarui tiap detik agar tampilan sisa waktu real-time)
const nowTimestamp = ref<number>(Date.now())

// State ketika alarm sedang berbunyi (Ringing Alert Pop-up)
const ringingAlarm = ref<KawaiiAlarmItem | null>(null)

let checkerInterval: ReturnType<typeof setInterval> | null = null
let ringAudioInterval: ReturnType<typeof setInterval> | null = null
let tabBlinkInterval: ReturnType<typeof setInterval> | null = null
let blinkToggle = false

/** Format selisih milidetik menjadi MM:SS atau JJ:MM:DD */
function formatRemaining(targetTimestamp: number): string {
  const diffSec = Math.max(0, Math.ceil((targetTimestamp - nowTimestamp.value) / 1000))
  const hours = Math.floor(diffSec / 3600)
  const mins = Math.floor((diffSec % 3600) / 60)
  const secs = diffSec % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Mulai membunyikan melodi berulang & berkedip judul tab browser saat alarm tiba */
function startRingingAlert(alarm: KawaiiAlarmItem) {
  stopRingingEffects()
  ringingAlarm.value = alarm

  // Putar melodi terpilih segera lalu ulangi setiap 2.3 detik hingga dimatikan/snooze
  playAlarmMelody(selectedAlarmSound.value)
  ringAudioInterval = setInterval(() => {
    playAlarmMelody(selectedAlarmSound.value)
  }, 2300)

  // Berkedip judul tab browser agar terlihat meski sedang di tab lain
  if (import.meta.client) {
    blinkToggle = false
    document.title = `⏰ ALARM! ${alarm.label}`
    tabBlinkInterval = setInterval(() => {
      blinkToggle = !blinkToggle
      document.title = blinkToggle
        ? `🔔 Waktunya! | Twilight's`
        : `⏰ ALARM! ${alarm.label}`
    }, 950)
  }

  triggerMascotReaction('reminder', `⏰ ${alarm.label}`, 10000)
}

/** Hentikan bunyi dering berulang & kembalikan judul tab browser */
function stopRingingEffects() {
  if (ringAudioInterval) {
    clearInterval(ringAudioInterval)
    ringAudioInterval = null
  }
  if (tabBlinkInterval) {
    clearInterval(tabBlinkInterval)
    tabBlinkInterval = null
  }
  if (import.meta.client) {
    document.title = DEFAULT_TAB_TITLE
  }
}

/** Tombol "Matikan Alarm ✨" */
function dismissRingingAlarm() {
  stopRingingEffects()
  ringingAlarm.value = null
}

/** Tombol "Tunda 5 Menit (Snooze) 💤" */
function snoozeRingingAlarm() {
  const label = ringingAlarm.value?.label || 'Waktunya berdiri & peregangan! 🧘‍♀️'
  stopRingingEffects()
  ringingAlarm.value = null
  addCountdownAlarm(5, label)
}

/**
 * LOGIKA PENGECEKAN ALARM BERBASIS Date.now():
 * Membandingkan Date.now() dengan targetTimestamp setiap detik agar tetap akurat
 * meskipun tab browser sempat tidak aktif / tidur di latar belakang.
 */
function tickAlarmChecker() {
  // Hemat CPU: saat tidak ada alarm aktif dan modal alarm tertutup, lewati update state reaktif tiap detik
  if (alarms.value.length === 0 && !isAlarmOpen.value) {
    if (activeAlarmBadge.value) activeAlarmBadge.value = ''
    return
  }

  const now = Date.now()
  nowTimestamp.value = now

  // Cari alarm yang waktunya sudah tiba
  const dueAlarm = alarms.value.find(a => now >= a.targetTimestamp)
  if (dueAlarm) {
    removeAlarm(dueAlarm.id)
    startRingingAlert(dueAlarm)
  }

  // Perbarui badge sisa waktu di tombol header (ambil alarm terdekat)
  const nearest = alarms.value[0]
  if (nearest && nearest.targetTimestamp > now) {
    activeAlarmBadge.value = formatRemaining(nearest.targetTimestamp)
  } else {
    activeAlarmBadge.value = ''
  }
}

/** Pasang preset countdown cepat (2, 5, 10, 15, atau 30 menit) */
function handleQuickPreset(minutes: number) {
  addCountdownAlarm(minutes, countdownLabel.value)
  countdownLabel.value = ''
  tickAlarmChecker()
}

/** Pasang countdown dengan angka menit bebas */
function handleCustomCountdownSubmit() {
  if (!customMinutes.value || customMinutes.value <= 0) return
  addCountdownAlarm(customMinutes.value, countdownLabel.value)
  countdownLabel.value = ''
  tickAlarmChecker()
}

/** Pasang alarm untuk jam tertentu (Clock Alarm) */
function handleClockAlarmSubmit() {
  if (!clockTimeInput.value) return
  addClockAlarm(clockTimeInput.value, clockLabel.value)
  clockLabel.value = ''
  tickAlarmChecker()
}

/** Tombol "🔔 Tes Suara" sekaligus menguji getar HP & mengirim 1 contoh notifikasi layar sistem */
function handleTestAlarmSound() {
  playAlarmMelody(selectedAlarmSound.value)
  triggerVibration(VIBRATION_PATTERNS.pomodoroDone)
  void kirimNotifikasiSistem(
    "✨ Tes Alarm & Notifikasi Layar — Twilight's",
    'Suara alarm, getar HP & notifikasi sistem siap menjagamu tetap on-track 🐾',
    true,
    `twilights-alarm-test-${Date.now()}`,
  )
}

function closeAlarmModal() {
  isAlarmOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isAlarmOpen.value) {
    closeAlarmModal()
  }
}

onMounted(() => {
  // Set nilai default input jam ke 15 menit dari sekarang agar praktis
  const soon = new Date(Date.now() + 15 * 60 * 1000)
  clockTimeInput.value = `${String(soon.getHours()).padStart(2, '0')}:${String(
    soon.getMinutes(),
  ).padStart(2, '0')}`

  tickAlarmChecker()
  checkerInterval = setInterval(tickAlarmChecker, 1000)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (checkerInterval) clearInterval(checkerInterval)
  stopRingingEffects()
  activeAlarmBadge.value = ''
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <!-- 1. MODAL PENGATURAN KAWAII ALARM (2 Mode: Pengingat Cepat & Jam Tertentu) -->
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isAlarmOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Kawaii Alarm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0822]/75 p-4 backdrop-blur-sm"
      @click.self="closeAlarmModal"
    >
      <div
        class="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/25 bg-[#231545]/95 shadow-2xl shadow-pink-500/20 backdrop-blur-xl"
      >
        <!-- Header Modal -->
        <div class="flex items-center justify-between border-b border-white/15 bg-white/5 px-5 py-4">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">⏰</span>
            <div>
              <h2 class="font-display text-lg font-bold text-pink-200">
                Kawaii Alarm
              </h2>
              <p class="text-[11px] font-semibold text-purple-200/80">
                Pengingat cepat &amp; alarm jam lembut ✨
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup Kawaii Alarm"
            class="btn-bouncy flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-pink-100 hover:bg-pink-400 hover:text-[#1e1b4b]"
            @click="closeAlarmModal"
          >
            ✕
          </button>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-5">
          <!-- Pilihan 2 Mode: Pengingat Cepat vs Jam Tertentu -->
          <div class="grid grid-cols-2 gap-1.5 rounded-2xl bg-black/25 p-1.5 text-xs">
            <button
              type="button"
              class="cursor-pointer rounded-xl py-2 font-bold transition"
              :class="
                activeMode === 'countdown'
                  ? 'bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] text-[#1e1b4b] shadow'
                  : 'text-purple-100/80 hover:bg-white/10 hover:text-white'
              "
              @click="activeMode = 'countdown'"
            >
              ⏱️ Pengingat Cepat
            </button>

            <button
              type="button"
              class="cursor-pointer rounded-xl py-2 font-bold transition"
              :class="
                activeMode === 'clock'
                  ? 'bg-gradient-to-r from-[#c4b5fd] to-[#7dd3fc] text-[#1e1b4b] shadow'
                  : 'text-purple-100/80 hover:bg-white/10 hover:text-white'
              "
              @click="activeMode = 'clock'"
            >
              🕒 Jam Tertentu
            </button>
          </div>

          <!-- MODE A: PENGINGAT CEPAT (COUNTDOWN ALARM) -->
          <div v-if="activeMode === 'countdown'" class="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
            <!-- Label opsional -->
            <div>
              <label class="mb-1 block text-[11px] font-semibold text-purple-200/85">
                Pesan Pengingat (opsional):
              </label>
              <input
                v-model="countdownLabel"
                type="text"
                maxlength="60"
                placeholder="Waktunya berdiri & peregangan! 🧘‍♀️"
                class="w-full rounded-xl border border-white/20 bg-black/25 px-3.5 py-2 text-xs text-white placeholder-purple-200/55 outline-none focus:border-pink-300/70"
              >
            </div>

            <!-- Tombol Preset Sekali Klik (2, 5, 10, 15, 30 Menit) -->
            <div>
              <p class="mb-1.5 text-[11px] font-semibold text-pink-200/90">
                ⚡ Preset Sekali Klik:
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="mins in COUNTDOWN_PRESETS"
                  :key="mins"
                  type="button"
                  class="btn-bouncy cursor-pointer rounded-full border border-pink-200/40 bg-pink-300/20 px-3 py-1.5 text-xs font-bold text-pink-100 hover:bg-[#f9a8d4] hover:text-[#311042]"
                  @click="handleQuickPreset(mins)"
                >
                  + {{ mins }} Menit
                </button>
              </div>
            </div>

            <!-- Input Angka Bebas dalam Menit -->
            <form class="flex items-center gap-2 pt-1" @submit.prevent="handleCustomCountdownSubmit">
              <input
                v-model.number="customMinutes"
                type="number"
                min="1"
                max="360"
                class="w-24 rounded-full border border-white/20 bg-black/25 px-3.5 py-2 text-center text-xs font-bold text-white outline-none focus:border-pink-300/70"
              >
              <span class="text-xs font-semibold text-purple-200/80">menit</span>
              <button
                type="submit"
                class="btn-bouncy font-display ml-auto cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] px-4 py-2 text-xs font-bold text-[#311042]"
              >
                ✨ Pasang
              </button>
            </form>
          </div>

          <!-- MODE B: JAM TERTENTU (CLOCK ALARM) -->
          <form
            v-else
            class="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4"
            @submit.prevent="handleClockAlarmSubmit"
          >
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-[11px] font-semibold text-purple-200/85">
                  Pilih Jam Alarm:
                </label>
                <input
                  v-model="clockTimeInput"
                  type="time"
                  required
                  class="w-full rounded-xl border border-white/20 bg-black/25 px-3.5 py-2 text-sm font-bold text-pink-100 outline-none focus:border-pink-300/70"
                >
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold text-purple-200/85">
                  Label Pesan:
                </label>
                <input
                  v-model="clockLabel"
                  type="text"
                  maxlength="60"
                  placeholder="Istirahat sejenak ✨"
                  class="w-full rounded-xl border border-white/20 bg-black/25 px-3.5 py-2 text-xs text-white placeholder-purple-200/55 outline-none focus:border-pink-300/70"
                >
              </div>
            </div>

            <button
              type="submit"
              class="btn-bouncy font-display w-full cursor-pointer rounded-full bg-gradient-to-r from-[#c4b5fd] to-[#7dd3fc] py-2.5 text-xs font-bold text-[#1e1b4b]"
            >
              ⏰ Pasang Alarm Jam {{ clockTimeInput }}
            </button>
          </form>

          <!-- Pilihan 3 Nada Dering Lembut + Tombol Tes Suara -->
          <div class="rounded-2xl border border-white/15 bg-black/20 p-3.5">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-pink-200">
                🎶 Pilihan Nada Dering
              </span>
              <button
                type="button"
                class="btn-bouncy cursor-pointer rounded-full border border-amber-200/40 bg-amber-300/20 px-3 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-300/35"
                @click="handleTestAlarmSound"
              >
                🔔 Tes Suara
              </button>
            </div>

            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="sound in ALARM_SOUND_OPTIONS"
                :key="sound.id"
                type="button"
                class="btn-bouncy cursor-pointer rounded-xl border px-2 py-2 text-xs font-semibold"
                :class="
                  selectedAlarmSound === sound.id
                    ? 'border-pink-300/80 bg-pink-300/25 text-white'
                    : 'border-white/15 bg-white/5 text-purple-200/80 hover:bg-white/15'
                "
                @click="setAlarmSound(sound.id)"
              >
                {{ sound.icon }} {{ sound.label }}
              </button>
            </div>
          </div>

          <!-- Daftar Alarm Aktif -->
          <div>
            <div class="mb-2 flex items-center justify-between">
              <h3 class="font-display text-sm font-semibold text-pink-200">
                Daftar Alarm Aktif ({{ alarms.length }})
              </h3>
            </div>

            <ul class="flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
              <li
                v-if="alarms.length === 0"
                class="rounded-2xl border border-dashed border-white/20 px-4 py-4 text-center text-xs text-purple-200/75"
              >
                Belum ada alarm aktif. Pilih preset di atas untuk membuat pengingat cepat! ✨
              </li>

              <li
                v-for="alarm in alarms"
                :key="alarm.id"
                class="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-display rounded-full bg-pink-300/25 px-2.5 py-0.5 text-xs font-bold text-pink-100">
                      ⏰ {{ formatRemaining(alarm.targetTimestamp) }}
                    </span>
                    <span v-if="alarm.clockTime" class="text-[11px] font-semibold text-purple-200/75">
                      ({{ alarm.clockTime }})
                    </span>
                  </div>
                  <p class="mt-1 truncate text-xs font-semibold text-white">
                    {{ alarm.label }}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Hapus alarm"
                  class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-xs font-bold text-pink-200 transition hover:bg-rose-400/35 hover:text-white"
                  @click="removeAlarm(alarm.id)"
                >
                  ✕
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 2. POP-UP SAAT ALARM BERBUNYI (Ringing Alert dengan Kucing Memegang Lonceng!) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-90"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-90"
  >
    <div
      v-if="ringingAlarm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Alarm Berbunyi"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-[#0d0822]/80 p-4 backdrop-blur-md"
    >
      <div
        class="w-full max-w-sm rounded-3xl border-2 border-pink-300/60 bg-gradient-to-b from-[#2f1857] to-[#1e1b4b] p-6 text-center shadow-2xl shadow-pink-500/30"
      >
        <!-- Ilustrasi SVG Kucing Imut Memegang Lonceng Berbunyi -->
        <div class="mx-auto flex justify-center">
          <svg
            class="animate-pet-shake h-28 w-28 drop-shadow-[0_8px_18px_rgba(249,168,212,0.45)]"
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Ilustrasi kucing imut memegang lonceng alarm"
          >
            <!-- Gelombang suara lonceng -->
            <path d="M22 34 Q15 44 22 54" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round" />
            <path d="M98 34 Q105 44 98 54" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round" />

            <!-- Telinga & Kepala Kucing -->
            <path d="M36 42 L32 20 L52 32 Z" fill="#fff7fb" stroke="#e9d5ff" stroke-width="2" />
            <path d="M84 42 L88 20 L68 32 Z" fill="#fff7fb" stroke="#e9d5ff" stroke-width="2" />
            <path d="M38 38 L36 26 L48 33 Z" fill="#fbcfe8" />
            <path d="M82 38 L84 26 L72 33 Z" fill="#fbcfe8" />
            <ellipse cx="60" cy="54" rx="30" ry="25" fill="#fff7fb" />

            <!-- Mata Bahagia & Pipi Merona -->
            <path d="M44 52 Q49 46 54 52" stroke="#3b215c" stroke-width="2.8" stroke-linecap="round" />
            <path d="M66 52 Q71 46 76 52" stroke="#3b215c" stroke-width="2.8" stroke-linecap="round" />
            <ellipse cx="42" cy="59" rx="5" ry="3" fill="#f9a8d4" opacity="0.75" />
            <ellipse cx="78" cy="59" rx="5" ry="3" fill="#f9a8d4" opacity="0.75" />
            <path d="M55 60 Q60 65 65 60" stroke="#3b215c" stroke-width="2.2" stroke-linecap="round" />

            <!-- Lonceng Emas yang Dipegang Kucing -->
            <g transform="translate(60, 89)">
              <path
                d="M-14 4 C-14 -8, -8 -15, 0 -15 C8 -15, 14 -8, 14 4 L18 10 H-18 Z"
                fill="#fde68a"
                stroke="#f59e0b"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <circle cx="0" cy="13" r="4" fill="#f59e0b" />
              <circle cx="0" cy="-17" r="3" fill="#f9a8d4" />
            </g>

            <!-- Cakar Kiri & Kanan Memegang Lonceng -->
            <ellipse cx="43" cy="86" rx="8" ry="6" fill="#fff7fb" stroke="#e9d5ff" stroke-width="1.5" />
            <ellipse cx="77" cy="86" rx="8" ry="6" fill="#fff7fb" stroke="#e9d5ff" stroke-width="1.5" />
          </svg>
        </div>

        <p class="font-display mt-2 text-xs font-bold uppercase tracking-widest text-amber-200">
          ⏰ Waktunya Tiba!
        </p>

        <h3 class="font-display mt-1.5 text-xl font-bold leading-snug text-white">
          {{ ringingAlarm.label }}
        </h3>

        <p class="mt-1 text-xs font-medium text-purple-200/80">
          Kucing Twilight's mengingatkanmu dengan lembut~ 🔔✨
        </p>

        <!-- 2 Tombol Besar: Matikan Alarm & Snooze 5 Menit -->
        <div class="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            class="btn-bouncy font-display w-full cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] py-3 text-sm font-bold text-[#311042] shadow-lg shadow-pink-500/30"
            @click="dismissRingingAlarm"
          >
            Matikan Alarm ✨
          </button>

          <button
            type="button"
            class="btn-bouncy font-display w-full cursor-pointer rounded-full border border-white/25 bg-white/10 py-2.5 text-xs font-bold text-pink-100 hover:bg-white/20"
            @click="snoozeRingingAlarm"
          >
            Tunda 5 Menit (Snooze) 💤
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
