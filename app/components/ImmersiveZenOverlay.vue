<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  COZY_THEMES,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  isImmersiveZenOpen,
  isPomodoroRunning,
  isPomodoroPaused,
  activeTimerMode,
  activeTimerRemainingSeconds,
  ambientMixerSettings,
  activeCozyTheme,
  triggerPomodoroShortcutToggle,
  triggerPomodoroReset,
} = useTwilightStorage()

// Jam digital besar waktu nyata & sapaan suasana waktu
const clockHHMM = ref<string>('--:--')
const clockHour = ref<number>(20)
let zenClockInterval: ReturnType<typeof setInterval> | null = null

function updateZenClock() {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  clockHour.value = h
  clockHHMM.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const skyGreeting = computed<{ icon: string; text: string }>(() => {
  const h = clockHour.value
  if (h >= 5 && h < 11) return { icon: '🌅', text: 'Selamat Pagi, Semangat Belajar!' }
  if (h >= 11 && h < 15) return { icon: '☀️', text: 'Siang Cerah, Tetap Fokus~' }
  if (h >= 15 && h < 18) return { icon: '🌇', text: 'Senja Tiba, Teruskan Langkahmu ✨' }
  return { icon: '🌙', text: 'Malam Tenang, Waktunya Lo-Fi' }
})

const activeSessionName = computed<string>(() => {
  if (activeTimerMode.value === 'shortBreak') return '☕ Istirahat Singkat'
  if (activeTimerMode.value === 'longBreak') return '🌙 Istirahat Panjang'
  return '🎯 Sesi Fokus'
})

// Format sisa waktu adaptif (JJ:MM:DD jika >= 1 jam, MM:DD jika < 1 jam)
const formattedRemaining = computed<string>(() => {
  const sec = Math.max(0, activeTimerRemainingSeconds.value)
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// Daftar indikator suara alam yang sedang menyala dari Ambient Sound Mixer
const activeAmbientIndicators = computed<{ id: string; label: string }[]>(() => {
  const s = ambientMixerSettings.value
  const list: { id: string; label: string }[] = []
  if (s.rain.enabled) list.push({ id: 'rain', label: `🌧️ Hujan ${s.rain.volume}%` })
  if (s.brown.enabled) list.push({ id: 'brown', label: `🌊 Ombak ${s.brown.volume}%` })
  if (s.campfire.enabled) list.push({ id: 'campfire', label: `🔥 Api Unggun ${s.campfire.volume}%` })
  if (s.nightWind.enabled) list.push({ id: 'nightWind', label: `🌙 Angin Malam ${s.nightWind.volume}%` })
  if (s.stream.enabled) list.push({ id: 'stream', label: `💧 Gemericik Air ${s.stream.volume}%` })
  return list
})

const currentThemeLabel = computed<string>(() => {
  const found = COZY_THEMES.find(t => t.id === activeCozyTheme.value)
  return found ? `${found.icon} ${found.name}` : '💜 Twilight Klasik'
})

function closeZenMode() {
  isImmersiveZenOpen.value = false
}

onMounted(() => {
  updateZenClock()
  zenClockInterval = setInterval(updateZenClock, 10000)
})

onUnmounted(() => {
  if (zenClockInterval) clearInterval(zenClockInterval)
})
</script>

<template>
  <!-- TWILIGHT FOCUS (MODE LAYAR PENUH / MEJA BELAJAR IMERSIF): Transparan penuh di atas latar tema beranimasi -->
  <Transition
    enter-active-class="transition duration-350 ease-out"
    enter-from-class="opacity-0 scale-[0.98]"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-250 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-[0.98]"
  >
    <div
      v-if="isImmersiveZenOpen"
      role="dialog"
      data-transparent-dialog="true"
      aria-modal="true"
      aria-label="Twilight Focus Layar Penuh"
      class="fixed inset-0 z-30 flex flex-col items-center justify-between overflow-y-auto px-5 py-6 sm:px-8 sm:py-8"
    >
      <!-- Baris Atas: Label Tema Aktif + Tombol Keluar Twilight Focus (T / Esc) -->
      <div class="flex w-full max-w-4xl items-center justify-between gap-3">
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3.5 py-1.5 text-xs font-semibold text-pink-100/90 backdrop-blur-md"
        >
          <span>{{ currentThemeLabel }}</span>
          <span class="text-purple-200/70">• Twilight Focus</span>
        </span>

        <button
          type="button"
          title="Kembali ke dashboard normal (T atau Esc)"
          class="btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-4 py-1.5 text-xs font-bold text-pink-100 shadow-lg backdrop-blur-md transition hover:border-pink-300/70 hover:bg-pink-400/25"
          @click="closeZenMode"
        >
          <span>✕ Keluar Twilight Focus</span>
          <span class="hidden rounded bg-white/15 px-1.5 py-0.5 text-[9px] text-pink-100/80 sm:inline">
            Esc
          </span>
        </button>
      </div>

      <!-- Konten Tengah Proporsional: Jam Besar + Timer Minimalis + Panggung Kedua Kucing Co-Working -->
      <div class="my-auto flex w-full max-w-3xl flex-col items-center gap-6 py-6 text-center">
        <!-- 1. Jam Digital Besar & Sapaan Suasana Waktu -->
        <div class="flex flex-col items-center">
          <div
            class="font-display select-none text-6xl font-bold tracking-wider text-white tabular-nums drop-shadow-[0_6px_28px_rgba(249,168,212,0.45)] sm:text-7xl md:text-8xl"
          >
            {{ clockHHMM }}
          </div>
          <p
            class="mt-1.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-1 text-xs font-semibold text-pink-100 backdrop-blur-md sm:text-sm"
          >
            <span>{{ skyGreeting.icon }}</span>
            <span>{{ skyGreeting.text }}</span>
          </p>
        </div>

        <!-- 2. Kartu Minimalis Sisa Waktu Timer, Nama Sesi, Kontrol Play/Pause/Reset & Indikator Suara Alam -->
        <div
          class="glass-card flex w-full max-w-md flex-col items-center gap-3 px-6 py-4"
        >
          <div class="flex items-center gap-2">
            <span
              class="h-2 w-2 rounded-full"
              :class="
                isPomodoroRunning
                  ? 'animate-pulse bg-pink-300 shadow-[0_0_8px_#f9a8d4]'
                  : isPomodoroPaused
                    ? 'bg-purple-300'
                    : 'bg-purple-200/50'
              "
            />
            <span class="text-xs font-bold uppercase tracking-widest text-pink-200">
              {{ activeSessionName }}
            </span>
          </div>

          <div
            class="font-display select-none text-4xl font-bold tracking-wider text-white tabular-nums drop-shadow-[0_2px_14px_rgba(249,168,212,0.4)] sm:text-5xl"
          >
            {{ formattedRemaining }}
          </div>

          <!-- Tombol Kontrol Minimalis: Play / Pause & Reset -->
          <div class="flex items-center justify-center gap-2.5">
            <button
              type="button"
              class="btn-bouncy font-display inline-flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold shadow-lg transition"
              :class="
                isPomodoroRunning
                  ? 'bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa] text-[#1e1b4b]'
                  : 'bg-gradient-to-r from-[#f9a8d4] to-[#f472b6] text-[#311042]'
              "
              @click="triggerPomodoroShortcutToggle"
            >
              <span>{{ isPomodoroRunning ? '⏸ Pause' : '▶ Play' }}</span>
            </button>

            <button
              type="button"
              class="btn-bouncy font-display cursor-pointer rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-purple-100 hover:bg-white/20"
              @click="triggerPomodoroReset"
            >
              ↺ Reset
            </button>
          </div>

          <!-- Indikator Suara Alam yang Sedang Aktif -->
          <div
            v-if="activeAmbientIndicators.length > 0"
            class="mt-0.5 flex flex-wrap items-center justify-center gap-1.5"
          >
            <span
              v-for="amb in activeAmbientIndicators"
              :key="amb.id"
              class="rounded-full border border-emerald-200/35 bg-emerald-400/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-100"
            >
              {{ amb.label }}
            </span>
          </div>
          <p v-else class="text-[10.5px] font-medium text-purple-200/70">
            Suara alam: senyap • Tekan [Spasi] untuk Play/Pause
          </p>
        </div>

        <!-- 3. Panggung Kedua Kucing Co-Working (Kucing Putih & Kucing Mini Abu-abu tetap bisa diklik & di-pat-pat!) -->
        <div class="flex flex-wrap items-end justify-center gap-6 sm:gap-10">
          <MascotCompanion :is-zen-stage="true" />
          <div class="pb-4">
            <FloatingPetCat :inline-mode="true" />
          </div>
        </div>
      </div>

      <!-- Footer Tip Ringkas -->
      <p class="text-[11px] font-medium text-pink-100/70">
        ✦ Klik atau usap kedua kucing kapan saja untuk semangat &amp; purring~ ✦
      </p>
    </div>
  </Transition>
</template>
