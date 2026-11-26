<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { useSoundEffects } from '~/composables/useSoundEffects'
import {
  COZY_CAT_BUDDIES,
  type CozyBuddyId,
  type CozyCatBuddyItem,
  type CozyThemeId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const props = withDefaults(
  defineProps<{
    slot: CozyBuddyId
    placement?: 'inline' | 'edge-top-left' | 'edge-top-right'
  }>(),
  {
    placement: 'inline',
  },
)

const {
  activeBuddies,
  buddyCustomNames,
  activeCozyTheme,
  isDarkTheme,
  isPomodoroRunning,
  isZenMode,
  todayCompletionRate,
  graphicsQuality,
  isMasterAudioMuted,
  masterAudioVolume,
  setCozyBuddyName,
} = useTwilightStorage()
const { playOrnamentCatMeow } = useSoundEffects()

const buddy = computed<CozyCatBuddyItem>(
  () => COZY_CAT_BUDDIES.find(b => b.id === props.slot) ?? COZY_CAT_BUDDIES[0]!,
)

const isVisible = computed<boolean>(() => activeBuddies.value.includes(props.slot))

const displayName = computed<string>(
  () => buddyCustomNames.value[props.slot]?.trim() || buddy.value.name,
)

// Inline editor ganti nama kucing oleh user
const isEditingName = ref(false)
const nameDraft = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

async function startEditingName() {
  nameDraft.value = displayName.value
  isEditingName.value = true
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
}

function commitNameEdit() {
  if (!isEditingName.value) return
  isEditingName.value = false
  const trimmed = nameDraft.value.trim()
  if (trimmed && trimmed !== displayName.value) {
    setCozyBuddyName(props.slot, trimmed)
  }
}

function cancelNameEdit() {
  isEditingName.value = false
}

// State interaksi unik per slot (animasi, partikel emote, & gelembung ucapan)
const isReacting = ref(false)
const speechText = ref('')
const showBurst = ref(false)
let speechIdx = 0
let reactTimer: ReturnType<typeof setTimeout> | null = null
let speechTimer: ReturnType<typeof setTimeout> | null = null
let burstTimer: ReturnType<typeof setTimeout> | null = null

interface BuddyThemeVisual {
  cushionFill: string
  cushionStroke: string
  cushionSeam: string
  auraGlow: string
  ambientSymbols: [string, string]
}

const themeVisual = computed<BuddyThemeVisual>(() => {
  const cozy: CozyThemeId = activeCozyTheme.value
  const dark = isDarkTheme.value
  switch (cozy) {
    case 'matcha-garden':
      return {
        cushionFill: dark ? 'rgba(74, 222, 128, 0.28)' : 'rgba(187, 247, 208, 0.85)',
        cushionStroke: dark ? '#4ade80' : '#15803d',
        cushionSeam: dark ? '#86efac' : '#16a34a',
        auraGlow: 'rgba(74, 222, 128, 0.32)',
        ambientSymbols: ['🍃', '🍵'],
      }
    case 'biolum-ocean':
      return {
        cushionFill: dark ? 'rgba(34, 211, 238, 0.28)' : 'rgba(165, 243, 252, 0.85)',
        cushionStroke: dark ? '#22d3ee' : '#0e7490',
        cushionSeam: dark ? '#67e8f9' : '#0891b2',
        auraGlow: 'rgba(34, 211, 238, 0.38)',
        ambientSymbols: ['🫧', '🐚'],
      }
    case 'autumn-cafe':
      return {
        cushionFill: dark ? 'rgba(251, 146, 60, 0.28)' : 'rgba(254, 215, 170, 0.88)',
        cushionStroke: dark ? '#fb923c' : '#9a3412',
        cushionSeam: dark ? '#fdba74' : '#c2410c',
        auraGlow: 'rgba(251, 146, 60, 0.34)',
        ambientSymbols: ['🍂', '🍁'],
      }
    case 'sakura-lantern':
      return {
        cushionFill: dark ? 'rgba(244, 114, 182, 0.3)' : 'rgba(251, 207, 232, 0.88)',
        cushionStroke: dark ? '#f472b6' : '#be185d',
        cushionSeam: dark ? '#f9a8d4' : '#db2777',
        auraGlow: 'rgba(244, 114, 182, 0.38)',
        ambientSymbols: ['🌸', '✨'],
      }
    case 'honey-library':
      return {
        cushionFill: dark ? 'rgba(251, 191, 36, 0.28)' : 'rgba(253, 230, 138, 0.9)',
        cushionStroke: dark ? '#fbbf24' : '#b45309',
        cushionSeam: dark ? '#fde68a' : '#d97706',
        auraGlow: 'rgba(251, 191, 36, 0.36)',
        ambientSymbols: ['🍯', '✨'],
      }
    case 'pastel-cloudland':
      return {
        cushionFill: dark ? 'rgba(147, 197, 253, 0.3)' : 'rgba(224, 231, 255, 0.92)',
        cushionStroke: dark ? '#93c5fd' : '#4f46e5',
        cushionSeam: dark ? '#c4b5fd' : '#6366f1',
        auraGlow: 'rgba(147, 197, 253, 0.38)',
        ambientSymbols: ['☁️', '🌈'],
      }
    case 'winter-frost':
      return {
        cushionFill: dark ? 'rgba(125, 211, 252, 0.28)' : 'rgba(224, 242, 254, 0.92)',
        cushionStroke: dark ? '#7dd3fc' : '#0369a1',
        cushionSeam: dark ? '#bae6fd' : '#0284c7',
        auraGlow: 'rgba(125, 211, 252, 0.38)',
        ambientSymbols: ['❄️', '✦'],
      }
    case 'astral-palace':
      return {
        cushionFill: dark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(233, 213, 255, 0.9)',
        cushionStroke: dark ? '#fde047' : '#6d28d9',
        cushionSeam: dark ? '#34d399' : '#7c3aed',
        auraGlow: 'rgba(253, 224, 71, 0.36)',
        ambientSymbols: ['💎', '⭐'],
      }
    case 'neon-night-city':
      return {
        cushionFill: dark ? 'rgba(0, 245, 212, 0.2)' : 'rgba(233, 213, 255, 0.9)',
        cushionStroke: dark ? '#00f5d4' : '#7c3aed',
        cushionSeam: dark ? '#ff2a85' : '#db2777',
        auraGlow: 'rgba(0, 245, 212, 0.42)',
        ambientSymbols: ['⚡', '✦'],
      }
    case 'midnight-rain':
      return {
        cushionFill: dark ? 'rgba(125, 211, 252, 0.24)' : 'rgba(219, 234, 254, 0.9)',
        cushionStroke: dark ? '#7dd3fc' : '#1d4ed8',
        cushionSeam: dark ? '#93c5fd' : '#2563eb',
        auraGlow: 'rgba(125, 211, 252, 0.34)',
        ambientSymbols: ['💧', '✨'],
      }
    default:
      return {
        cushionFill: dark ? 'rgba(196, 181, 253, 0.28)' : 'rgba(243, 232, 255, 0.92)',
        cushionStroke: dark ? '#c4b5fd' : '#7e22ce',
        cushionSeam: dark ? '#f9a8d4' : '#a855f7',
        auraGlow: 'rgba(249, 168, 212, 0.35)',
        ambientSymbols: ['✦', '⭐'],
      }
  }
})

// Emote reaksi berbeda tiap slot
const slotEmotes = computed<[string, string, string]>(() => {
  if (props.slot === 'mochi') return ['💕', '🐾', '✨']
  if (props.slot === 'kuro') return ['⏳', '🔥', '✨']
  return ['🌟', '📈', '✨']
})

const slotReactionAnimClass = computed<string>(() => {
  if (!isReacting.value) return 'buddy-calm-breathe'
  if (props.slot === 'mochi') return 'buddy-cuddle-roll'
  if (props.slot === 'kuro') return 'buddy-timer-peek'
  return 'buddy-tail-cheer'
})

function buildDynamicSpeech(): string {
  const custom = displayName.value
  const pool = buddy.value.speeches

  if (props.slot === 'kuro' && isPomodoroRunning.value) {
    const focusLines = [
      `${custom} jagain timer-nya! Fokus sebentar lagi sampai bel berbunyi~ ⏳🔥`,
      `Jangan lengah ya! ${custom} ikut menghitung detik fokusmu dari sini~ ⏳✨`,
    ]
    const pick = focusLines[speechIdx % focusLines.length]!
    speechIdx += 1
    return pick
  }

  if (props.slot === 'latte' && todayCompletionRate.value >= 75) {
    const chartLines = [
      `Hebat! Progresmu hari ini sudah ${todayCompletionRate.value}% — ${custom} bangga banget! 🌟📈`,
      `Grafikmu bersinar di ${todayCompletionRate.value}%! Ekor ${custom} ikut goyang ceria~ 🌟✨`,
    ]
    const pick = chartLines[speechIdx % chartLines.length]!
    speechIdx += 1
    return pick
  }

  const raw = pool[speechIdx % pool.length] ?? buddy.value.focusMoodText
  speechIdx += 1
  return `${custom}: ${raw}`
}

function handleBuddyTap() {
  const vol = isMasterAudioMuted.value ? 0 : Math.max(0.2, masterAudioVolume.value * 0.78)
  if (vol > 0) {
    const voiceBySlot: Record<CozyBuddyId, number> = { mochi: 1, kuro: 6, latte: 0 }
    playOrnamentCatMeow(voiceBySlot[props.slot], vol)
  }

  isReacting.value = false
  showBurst.value = false
  requestAnimationFrame(() => {
    isReacting.value = true
    showBurst.value = true
  })

  speechText.value = buildDynamicSpeech()

  if (reactTimer) clearTimeout(reactTimer)
  reactTimer = setTimeout(() => {
    isReacting.value = false
  }, 680)

  if (burstTimer) clearTimeout(burstTimer)
  burstTimer = setTimeout(() => {
    showBurst.value = false
  }, 850)

  if (speechTimer) clearTimeout(speechTimer)
  speechTimer = setTimeout(() => {
    speechText.value = ''
  }, 3800)
}

onUnmounted(() => {
  if (reactTimer) clearTimeout(reactTimer)
  if (speechTimer) clearTimeout(speechTimer)
  if (burstTimer) clearTimeout(burstTimer)
})
</script>

<template>
  <!-- Slot Kucing Peramai Adaptif Tema (11 Cozy Themes) + Ganti Nama Kustom + Interaksi Unik per Sudut -->
  <div
    v-if="isVisible"
    class="z-20 flex flex-col items-center transition-opacity duration-500"
    :class="[
      isZenMode && placement !== 'edge-top-left' ? 'opacity-65 hover:opacity-100' : 'opacity-100',
      placement === 'inline'
        ? 'relative mt-1.5 w-full'
        : placement === 'edge-top-left'
          ? 'pointer-events-auto absolute -top-[52px] left-3 sm:-top-[56px] sm:left-4'
          : 'pointer-events-auto absolute -top-[52px] right-3 sm:-top-[56px] sm:right-4',
    ]"
  >
    <!-- Gelembung Bicara Interaktif Unik per Sudut -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="translate-y-1 opacity-0 scale-95"
    >
      <div
        v-if="speechText"
        role="status"
        class="pointer-events-none absolute bottom-full z-40 mb-1.5 w-52 max-w-[72vw] rounded-2xl border px-3 py-1.5 text-center text-[10.5px] font-bold leading-snug shadow-lg backdrop-blur-md"
        :class="
          placement === 'edge-top-left'
            ? 'left-0'
            : placement === 'edge-top-right'
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2'
        "
        style="
          background: var(--card-bg-solid);
          border-color: var(--border-strong);
          color: var(--text-primary);
        "
      >
        {{ speechText }}
      </div>
    </Transition>

    <!-- Tombol Interaktif Karakter Kucing + Efek Partikel Tema & Emote Klik -->
    <button
      type="button"
      :aria-label="`Sapa ${displayName} (${buddy.subtitle})`"
      class="group relative flex cursor-pointer flex-col items-center focus:outline-none"
      @click="handleBuddyTap"
    >
      <!-- Partikel Ambient Lembut Mengikuti Tema Aktif (non-low graphics) -->
      <template v-if="graphicsQuality !== 'low'">
        <span
          aria-hidden="true"
          class="buddy-ambient-left pointer-events-none absolute -left-2.5 top-1 text-[10px] opacity-80"
        >
          {{ themeVisual.ambientSymbols[0] }}
        </span>
        <span
          aria-hidden="true"
          class="buddy-ambient-right pointer-events-none absolute -right-2.5 top-0 text-[10px] opacity-80"
        >
          {{ themeVisual.ambientSymbols[1] }}
        </span>
      </template>

      <!-- Burst Emote Spesial Saat Diklik (berbeda tiap slot: 💕🐾 / ⏳🔥 / 🌟📈) -->
      <template v-if="showBurst">
        <span
          aria-hidden="true"
          class="buddy-burst-left pointer-events-none absolute -top-2 left-1 text-xs font-bold"
        >
          {{ slotEmotes[0] }}
        </span>
        <span
          aria-hidden="true"
          class="buddy-burst-right pointer-events-none absolute -top-3 right-1 text-xs font-bold"
        >
          {{ slotEmotes[1] }}
        </span>
        <span
          aria-hidden="true"
          class="buddy-burst-top pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-[11px]"
        >
          {{ slotEmotes[2] }}
        </span>
      </template>

      <!-- Indikator Fokus Tenang Saat Pomodoro Berjalan -->
      <span
        v-else-if="isPomodoroRunning"
        aria-hidden="true"
        class="buddy-focus-float pointer-events-none absolute -top-2 right-0 text-[10px] opacity-90"
      >
        {{ slot === 'mochi' ? '💤' : slot === 'kuro' ? '⏳' : '📈' }}
      </span>

      <!-- Karakter SVG + Bantal Empuk + Aksesori Dinamis Mengikuti Tema Aktif -->
      <div
        class="relative flex flex-col items-center transition-transform duration-200 group-hover:-translate-y-0.5"
        :class="slotReactionAnimClass"
        :style="{ filter: `drop-shadow(0 3px 8px ${themeVisual.auraGlow})` }"
      >
        <!-- === SLOT 1: MOCHI — Scottish Fold Abu-Biru Bertelinga Lipat === -->
        <svg
          v-if="slot === 'mochi'"
          class="h-[60px] w-[74px]"
          viewBox="0 0 84 70"
          fill="none"
          aria-hidden="true"
        >
          <!-- Bantal Empuk Adaptif Tema -->
          <ellipse cx="42" cy="58" rx="34" ry="9.5" :fill="themeVisual.cushionFill" :stroke="themeVisual.cushionStroke" stroke-width="1.7" />
          <path d="M18 57 Q42 62 66 57" :stroke="themeVisual.cushionSeam" stroke-width="1.1" stroke-linecap="round" opacity="0.55" />
          <!-- Ekor -->
          <path d="M62 49 C70 46, 73 37, 67 34 C63 32, 61 37, 63 41" stroke="#7e94b8" stroke-width="4.8" stroke-linecap="round" />
          <!-- Badan -->
          <ellipse cx="44" cy="47" rx="18" ry="11.5" fill="#9eb2d1" stroke="#475c7d" stroke-width="1.4" />
          <ellipse cx="46" cy="50" rx="10" ry="6" fill="#d7e2f2" opacity="0.78" />
          <!-- Kepala Scottish Fold -->
          <ellipse cx="33" cy="33.5" rx="14" ry="11.5" fill="#9eb2d1" stroke="#475c7d" stroke-width="1.4" />
          <!-- Telinga Lipat Bulat -->
          <path d="M20 29 C19 21, 27 20, 30 25 C26 25.5, 22.5 27, 20 29 Z" fill="#8298bd" stroke="#475c7d" stroke-width="1.3" stroke-linejoin="round" />
          <path d="M46 29 C47 21, 39 20, 36 25 C40 25.5, 43.5 27, 46 29 Z" fill="#8298bd" stroke="#475c7d" stroke-width="1.3" stroke-linejoin="round" />
          <ellipse cx="33" cy="37" rx="7" ry="4.5" fill="#d7e2f2" opacity="0.9" />
          <!-- Mata -->
          <template v-if="isPomodoroRunning && !isReacting">
            <path d="M26.2 33.5 Q28.8 35.8 31.4 33.5" stroke="#334155" stroke-width="1.6" stroke-linecap="round" />
            <path d="M34.8 33.5 Q37.4 35.8 40 33.5" stroke="#334155" stroke-width="1.6" stroke-linecap="round" />
          </template>
          <template v-else>
            <circle cx="28.8" cy="33" r="2.4" fill="#fbbf24" />
            <circle cx="37.4" cy="33" r="2.4" fill="#fbbf24" />
            <circle cx="28.9" cy="33" r="1.2" fill="#1e293b" />
            <circle cx="37.5" cy="33" r="1.2" fill="#1e293b" />
            <circle cx="28.1" cy="32.1" r="0.75" fill="#ffffff" />
            <circle cx="36.7" cy="32.1" r="0.75" fill="#ffffff" />
          </template>
          <ellipse cx="24.4" cy="36.2" rx="2.3" ry="1.3" fill="#fda4af" opacity="0.78" />
          <ellipse cx="41.8" cy="36.2" rx="2.3" ry="1.3" fill="#fda4af" opacity="0.78" />
          <path d="M32 35.5 L34 35.5 L33 36.7 Z" fill="#64748b" />
          <path d="M31 37.8 Q33 39.2 35 37.8" stroke="#475569" stroke-width="1.2" stroke-linecap="round" />
          <!-- Cakar -->
          <ellipse cx="25" cy="50.5" rx="4.2" ry="2.9" fill="#d7e2f2" stroke="#475c7d" stroke-width="1.1" />
          <ellipse cx="35" cy="52" rx="4.2" ry="2.9" fill="#d7e2f2" stroke="#475c7d" stroke-width="1.1" />

          <!-- === AKSESORI OTOMATIS MENGIKUTI TEMA AKTIF (Kepala di x=33, y=22, Leher di x=33, y=44) === -->
          <g transform="translate(33, 22)">
            <!-- Matcha Garden: Tunas daun teh & syal hijau -->
            <template v-if="activeCozyTheme === 'matcha-garden'">
              <path d="M0 0 Q0 -6 1 -9" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" />
              <ellipse cx="-3.5" cy="-7" rx="4" ry="2.2" transform="rotate(-24 -3.5 -7)" fill="#4ade80" stroke="#14532d" stroke-width="0.8" />
              <ellipse cx="4" cy="-8" rx="3.8" ry="2" transform="rotate(22 4 -8)" fill="#22c55e" stroke="#14532d" stroke-width="0.8" />
              <path d="M-9 21 Q0 24.5 9 21" stroke="#22c55e" stroke-width="3" stroke-linecap="round" />
            </template>
            <!-- Biolum Ocean: Kerang mutiara & gelembung cyan -->
            <template v-else-if="activeCozyTheme === 'biolum-ocean'">
              <path d="M4 -1 C7 -6, 13 -4, 11 1 C9 3, 5 2, 4 -1 Z" fill="#67e8f9" stroke="#0e7490" stroke-width="0.9" />
              <circle cx="8" cy="-1.5" r="1.5" fill="#ffffff" />
              <circle cx="-13" cy="-5" r="2.1" fill="rgba(103,232,249,0.4)" stroke="#67e8f9" stroke-width="0.9" />
            </template>
            <!-- Autumn Cafe: Baret cokelat & syal rajut -->
            <template v-else-if="activeCozyTheme === 'autumn-cafe'">
              <ellipse cx="0" cy="-2" rx="10" ry="4" fill="#92400e" stroke="#fed7aa" stroke-width="1" />
              <path d="M0 -6 L2 -9" stroke="#78350f" stroke-width="1.6" stroke-linecap="round" />
              <path d="M-9 21 Q0 24.5 9 21" stroke="#ea580c" stroke-width="3.2" stroke-linecap="round" />
            </template>
            <!-- Sakura Lantern: Jepit bunga sakura -->
            <template v-else-if="activeCozyTheme === 'sakura-lantern'">
              <circle cx="9" cy="-1" r="2.6" fill="#f9a8d4" />
              <circle cx="12" cy="1" r="2.6" fill="#fbcfe8" />
              <circle cx="8" cy="2.2" r="2.6" fill="#f472b6" />
              <circle cx="9.8" cy="0.8" r="1.5" fill="#fde047" />
            </template>
            <!-- Honey Library: Kacamata baca & dasi kupu-kupu emas -->
            <template v-else-if="activeCozyTheme === 'honey-library'">
              <circle cx="-4.2" cy="11" r="3.6" fill="rgba(255,251,235,0.22)" stroke="#f59e0b" stroke-width="1.2" />
              <circle cx="4.4" cy="11" r="3.6" fill="rgba(255,251,235,0.22)" stroke="#f59e0b" stroke-width="1.2" />
              <line x1="-0.6" y1="11" x2="0.8" y2="11" stroke="#f59e0b" stroke-width="1.2" />
              <path d="M-4.5 20.5 L0 22.5 L4.5 20.5 L4.5 24.5 L0 22.5 L-4.5 24.5 Z" fill="#fbbf24" stroke="#92400e" stroke-width="0.7" />
            </template>
            <!-- Pastel Cloudland: Awan kapas empuk -->
            <template v-else-if="activeCozyTheme === 'pastel-cloudland'">
              <circle cx="-4" cy="-4.5" r="3.4" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
              <circle cx="0.5" cy="-6" r="4" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
              <circle cx="5" cy="-4.5" r="3.2" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
            </template>
            <!-- Winter Frost: Syal biru es & kristal salju -->
            <template v-else-if="activeCozyTheme === 'winter-frost'">
              <path d="M-9 21 Q0 24.5 9 21" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round" />
              <path d="M0 -10 V-3 M-3.5 -6.5 H3.5 M-2.5 -9 L2.5 -4 M2.5 -9 L-2.5 -4" stroke="#bae6fd" stroke-width="1.2" stroke-linecap="round" />
            </template>
            <!-- Astral Palace: Mahkota kristal & bintang -->
            <template v-else-if="activeCozyTheme === 'astral-palace'">
              <path d="M-6 0 L-4 -7 L0 -3 L4 -7 L6 0 Z" fill="#fde047" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round" />
              <circle cx="0" cy="-8" r="1.7" fill="#34d399" />
            </template>
            <!-- Neon Night City: Kacamata neon siber -->
            <template v-else-if="activeCozyTheme === 'neon-night-city'">
              <rect x="-9" y="8.4" width="18" height="5" rx="2.5" fill="rgba(0,245,212,0.3)" stroke="#00f5d4" stroke-width="1.3" />
              <circle cx="0" cy="-5" r="2" fill="#ff2a85" />
            </template>
            <!-- Midnight Rain: Tetesan hujan berkilau -->
            <template v-else-if="activeCozyTheme === 'midnight-rain'">
              <path d="M0 -9 C3 -5, 3.5 -2, 0 -2 C-3.5 -2, -3 -5, 0 -9 Z" fill="#7dd3fc" stroke="#ffffff" stroke-width="0.8" />
            </template>
            <!-- Classic: Pita lembut & kilau bintang kecil -->
            <template v-else>
              <path d="M-8 21 Q0 24 8 21" stroke="#c4b5fd" stroke-width="2.4" stroke-linecap="round" />
              <path d="M0 -9 L1.2 -5.8 L4.4 -4.6 L1.2 -3.4 L0 -0.2 L-1.2 -3.4 L-4.4 -4.6 L-1.2 -5.8 Z" fill="#fde047" />
            </template>
          </g>
        </svg>

        <!-- === SLOT 2: KURO — Kucing Hitam Penjaga Timer Berlonceng Emas === -->
        <svg
          v-else-if="slot === 'kuro'"
          class="h-[60px] w-[74px]"
          viewBox="0 0 84 70"
          fill="none"
          aria-hidden="true"
        >
          <!-- Bantal Empuk Adaptif Tema -->
          <ellipse cx="42" cy="58" rx="34" ry="9.5" :fill="themeVisual.cushionFill" :stroke="themeVisual.cushionStroke" stroke-width="1.7" />
          <path d="M18 57 Q42 62 66 57" :stroke="themeVisual.cushionSeam" stroke-width="1.1" stroke-linecap="round" opacity="0.55" />
          <!-- Ekor Hitam Mengayun -->
          <path d="M57 49 C67 48, 70 39, 65 35" stroke="#181624" stroke-width="4.4" stroke-linecap="round" />
          <!-- Badan Duduk Rapi Hitam Elegan -->
          <ellipse cx="42" cy="46" rx="14.5" ry="11.5" fill="#1e1b2c" stroke="#474166" stroke-width="1.3" />
          <!-- Kalung Ruby & Lonceng Emas -->
          <path d="M31 39 Q42 43.5 53 39" stroke="#e11d48" stroke-width="3" stroke-linecap="round" />
          <circle cx="42" cy="43.5" r="3.3" fill="#fbbf24" stroke="#b45309" stroke-width="1" />
          <circle cx="41.2" cy="42.6" r="0.95" fill="#fef3c7" />
          <!-- Kepala Hitam Rapi -->
          <ellipse cx="42" cy="29.5" rx="13.5" ry="11.5" fill="#1e1b2c" stroke="#474166" stroke-width="1.3" />
          <!-- Telinga -->
          <path d="M31 23 L29 12 L38 18.5 Z" fill="#1e1b2c" stroke="#474166" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M53 23 L55 12 L46 18.5 Z" fill="#1e1b2c" stroke="#474166" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M32 21.5 L31 15.5 L36.5 19 Z" fill="#f472b6" opacity="0.55" />
          <path d="M52 21.5 L53 15.5 L47.5 19 Z" fill="#f472b6" opacity="0.55" />
          <!-- Mata Emas Terang -->
          <template v-if="isPomodoroRunning && !isReacting">
            <path d="M34.5 30 Q37 31.8 39.5 30" stroke="#fde68a" stroke-width="1.7" stroke-linecap="round" />
            <path d="M44.5 30 Q47 31.8 49.5 30" stroke="#fde68a" stroke-width="1.7" stroke-linecap="round" />
          </template>
          <template v-else>
            <circle cx="37" cy="29.5" r="2.3" fill="#fde047" />
            <circle cx="47" cy="29.5" r="2.3" fill="#fde047" />
            <circle cx="37.3" cy="29.5" r="1.05" fill="#181624" />
            <circle cx="47.3" cy="29.5" r="1.05" fill="#181624" />
            <circle cx="36.2" cy="28.6" r="0.7" fill="#ffffff" />
            <circle cx="46.2" cy="28.6" r="0.7" fill="#ffffff" />
          </template>
          <ellipse cx="33" cy="32.8" rx="2.1" ry="1.2" fill="#fb7185" opacity="0.55" />
          <ellipse cx="51" cy="32.8" rx="2.1" ry="1.2" fill="#fb7185" opacity="0.55" />
          <path d="M41 32.2 L43 32.2 L42 33.3 Z" fill="#fda4af" />
          <!-- Cakar Kecil Mengintip Tepi Timer -->
          <ellipse cx="35" cy="54" rx="4.2" ry="2.8" fill="#1e1b2c" stroke="#474166" stroke-width="1.1" />
          <ellipse cx="49" cy="54" rx="4.2" ry="2.8" fill="#1e1b2c" stroke="#474166" stroke-width="1.1" />

          <!-- === AKSESORI OTOMATIS MENGIKUTI TEMA AKTIF (Kepala x=42, y=18) === -->
          <g transform="translate(42, 18)">
            <template v-if="activeCozyTheme === 'matcha-garden'">
              <path d="M0 0 Q0 -6 1 -9" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round" />
              <ellipse cx="-3.5" cy="-7" rx="4" ry="2.2" transform="rotate(-24 -3.5 -7)" fill="#4ade80" />
              <ellipse cx="4" cy="-8" rx="3.8" ry="2" transform="rotate(22 4 -8)" fill="#22c55e" />
            </template>
            <template v-else-if="activeCozyTheme === 'biolum-ocean'">
              <path d="M5 0 C8 -5, 14 -3, 12 2 C10 4, 6 3, 5 0 Z" fill="#67e8f9" stroke="#ffffff" stroke-width="0.8" />
              <circle cx="9" cy="-0.5" r="1.4" fill="#ffffff" />
            </template>
            <template v-else-if="activeCozyTheme === 'autumn-cafe'">
              <ellipse cx="0" cy="-1.5" rx="10" ry="3.8" fill="#b45309" stroke="#fde68a" stroke-width="1" />
              <path d="M0 -5.5 L2 -8.5" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round" />
            </template>
            <template v-else-if="activeCozyTheme === 'sakura-lantern'">
              <circle cx="9.5" cy="0" r="2.5" fill="#f9a8d4" />
              <circle cx="12.5" cy="2" r="2.5" fill="#fbcfe8" />
              <circle cx="8.5" cy="3.2" r="2.5" fill="#f472b6" />
              <circle cx="10.2" cy="1.8" r="1.4" fill="#fde047" />
            </template>
            <template v-else-if="activeCozyTheme === 'honey-library'">
              <circle cx="-4.8" cy="11.5" r="3.6" fill="rgba(255,251,235,0.18)" stroke="#fbbf24" stroke-width="1.2" />
              <circle cx="4.8" cy="11.5" r="3.6" fill="rgba(255,251,235,0.18)" stroke="#fbbf24" stroke-width="1.2" />
              <line x1="-1.2" y1="11.5" x2="1.2" y2="11.5" stroke="#fbbf24" stroke-width="1.2" />
            </template>
            <template v-else-if="activeCozyTheme === 'pastel-cloudland'">
              <circle cx="-4" cy="-4.5" r="3.2" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
              <circle cx="0.5" cy="-6" r="3.8" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
              <circle cx="5" cy="-4.5" r="3" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
            </template>
            <template v-else-if="activeCozyTheme === 'winter-frost'">
              <path d="M0 -10 V-3 M-3.5 -6.5 H3.5 M-2.5 -9 L2.5 -4 M2.5 -9 L-2.5 -4" stroke="#7dd3fc" stroke-width="1.3" stroke-linecap="round" />
            </template>
            <template v-else-if="activeCozyTheme === 'astral-palace'">
              <path d="M-6 0 L-4 -7 L0 -3 L4 -7 L6 0 Z" fill="#fde047" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round" />
              <circle cx="0" cy="-8" r="1.7" fill="#34d399" />
            </template>
            <template v-else-if="activeCozyTheme === 'neon-night-city'">
              <rect x="-9.5" y="9" width="19" height="5" rx="2.5" fill="rgba(0,245,212,0.34)" stroke="#00f5d4" stroke-width="1.4" />
            </template>
            <template v-else-if="activeCozyTheme === 'midnight-rain'">
              <path d="M0 -9 C3 -5, 3.5 -2, 0 -2 C-3.5 -2, -3 -5, 0 -9 Z" fill="#7dd3fc" stroke="#ffffff" stroke-width="0.8" />
            </template>
            <template v-else>
              <path d="M0 -9 L1.2 -5.8 L4.4 -4.6 L1.2 -3.4 L0 -0.2 L-1.2 -3.4 L-4.4 -4.6 L-1.2 -5.8 Z" fill="#fde047" />
            </template>
          </g>
        </svg>

        <!-- === SLOT 3: LATTE — Tabby Karamel-Madu Penjaga Grafik Progres === -->
        <svg
          v-else
          class="h-[60px] w-[74px]"
          viewBox="0 0 84 70"
          fill="none"
          aria-hidden="true"
        >
          <!-- Bantal Empuk Adaptif Tema -->
          <ellipse cx="42" cy="58" rx="34" ry="9.5" :fill="themeVisual.cushionFill" :stroke="themeVisual.cushionStroke" stroke-width="1.7" />
          <path d="M18 57 Q42 62 66 57" :stroke="themeVisual.cushionSeam" stroke-width="1.1" stroke-linecap="round" opacity="0.55" />
          <!-- Ekor Tabby Bergaris Melambai -->
          <g class="buddy-tail-wag-origin">
            <path d="M57 49 C68 46, 71 34, 64 31" stroke="#ecc489" stroke-width="5.6" stroke-linecap="round" />
            <path d="M64 38 L68 39.5 M62 43 L66 44.5" stroke="#b87639" stroke-width="1.8" stroke-linecap="round" />
          </g>
          <!-- Badan Karamel-Madu -->
          <ellipse cx="42" cy="47" rx="16.5" ry="11.5" fill="#f5d5a3" stroke="#b57a40" stroke-width="1.3" />
          <path d="M34 41 Q42 48 50 41 Q46 51 42 52 Q38 51 34 41 Z" fill="#fffdf7" opacity="0.95" />
          <!-- Kepala Bulat -->
          <ellipse cx="42" cy="30" rx="14.2" ry="11.8" fill="#f5d5a3" stroke="#b57a40" stroke-width="1.3" />
          <!-- Telinga -->
          <path d="M30.5 23.5 L28 12 L38.5 18.5 Z" fill="#e6b873" stroke="#b57a40" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M53.5 23.5 L56 12 L45.5 18.5 Z" fill="#e6b873" stroke="#b57a40" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M31.8 21.5 L30.5 15.8 L36.8 19 Z" fill="#fecdd3" opacity="0.82" />
          <path d="M52.2 21.5 L53.5 15.8 L47.2 19 Z" fill="#fecdd3" opacity="0.82" />
          <!-- Garis Tabby Dahi & Pipi -->
          <path d="M42 19.5 V23.5 M38.8 20.2 L39.8 23.5 M45.2 20.2 L44.2 23.5" stroke="#b87639" stroke-width="1.5" stroke-linecap="round" />
          <path d="M28.5 30.5 L31.5 31 M55.5 30.5 L52.5 31" stroke="#b87639" stroke-width="1.3" stroke-linecap="round" opacity="0.8" />
          <!-- Mata Biru-Toska Ceria -->
          <template v-if="isPomodoroRunning && !isReacting">
            <path d="M34.2 30 Q36.6 27.8 39 30" stroke="#7c4f26" stroke-width="1.6" stroke-linecap="round" />
            <path d="M45 30 Q47.4 27.8 49.8 30" stroke="#7c4f26" stroke-width="1.6" stroke-linecap="round" />
          </template>
          <template v-else>
            <circle cx="36.6" cy="29.8" r="2.2" fill="#14b8a6" />
            <circle cx="47.4" cy="29.8" r="2.2" fill="#14b8a6" />
            <circle cx="36.8" cy="29.8" r="1.1" fill="#134e4a" />
            <circle cx="47.6" cy="29.8" r="1.1" fill="#134e4a" />
            <circle cx="35.9" cy="29" r="0.7" fill="#ffffff" />
            <circle cx="46.7" cy="29" r="0.7" fill="#ffffff" />
          </template>
          <ellipse cx="31.8" cy="33.2" rx="2.5" ry="1.3" fill="#fda4af" opacity="0.82" />
          <ellipse cx="52.2" cy="33.2" rx="2.5" ry="1.3" fill="#fda4af" opacity="0.82" />
          <path d="M40.9 32.2 L43.1 32.2 L42 33.4 Z" fill="#fb7185" />
          <path d="M39.5 34.8 Q42 36.8 44.5 34.8" stroke="#8d5a2b" stroke-width="1.2" stroke-linecap="round" />
          <ellipse cx="35" cy="55" rx="4.2" ry="2.8" fill="#fffdf7" stroke="#b57a40" stroke-width="1" />
          <ellipse cx="49" cy="55" rx="4.2" ry="2.8" fill="#fffdf7" stroke="#b57a40" stroke-width="1" />

          <!-- === AKSESORI OTOMATIS MENGIKUTI TEMA AKTIF (Kepala x=42, y=18) === -->
          <g transform="translate(42, 18)">
            <template v-if="activeCozyTheme === 'matcha-garden'">
              <path d="M0 0 Q0 -6 1 -9" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" />
              <ellipse cx="-3.5" cy="-7" rx="4" ry="2.2" transform="rotate(-24 -3.5 -7)" fill="#4ade80" stroke="#14532d" stroke-width="0.8" />
              <ellipse cx="4" cy="-8" rx="3.8" ry="2" transform="rotate(22 4 -8)" fill="#22c55e" stroke="#14532d" stroke-width="0.8" />
              <path d="M-9 23 Q0 26.5 9 23" stroke="#22c55e" stroke-width="3" stroke-linecap="round" />
            </template>
            <template v-else-if="activeCozyTheme === 'biolum-ocean'">
              <path d="M5 0 C8 -5, 14 -3, 12 2 C10 4, 6 3, 5 0 Z" fill="#67e8f9" stroke="#0e7490" stroke-width="0.9" />
              <circle cx="9" cy="-0.5" r="1.4" fill="#ffffff" />
            </template>
            <template v-else-if="activeCozyTheme === 'autumn-cafe'">
              <ellipse cx="0" cy="-1.5" rx="10" ry="3.8" fill="#92400e" stroke="#fed7aa" stroke-width="1" />
              <path d="M-9 23 Q0 26.5 9 23" stroke="#ea580c" stroke-width="3" stroke-linecap="round" />
            </template>
            <template v-else-if="activeCozyTheme === 'sakura-lantern'">
              <circle cx="9.5" cy="0" r="2.6" fill="#f9a8d4" />
              <circle cx="12.5" cy="2" r="2.6" fill="#fbcfe8" />
              <circle cx="8.5" cy="3.2" r="2.6" fill="#f472b6" />
              <circle cx="10.2" cy="1.8" r="1.4" fill="#fde047" />
            </template>
            <template v-else-if="activeCozyTheme === 'honey-library'">
              <circle cx="-5.4" cy="11.8" r="3.6" fill="rgba(255,251,235,0.22)" stroke="#d97706" stroke-width="1.2" />
              <circle cx="5.4" cy="11.8" r="3.6" fill="rgba(255,251,235,0.22)" stroke="#d97706" stroke-width="1.2" />
              <line x1="-1.8" y1="11.8" x2="1.8" y2="11.8" stroke="#d97706" stroke-width="1.2" />
              <path d="M-4.5 22 L0 24 L4.5 22 L4.5 26 L0 24 L-4.5 26 Z" fill="#fbbf24" stroke="#92400e" stroke-width="0.7" />
            </template>
            <template v-else-if="activeCozyTheme === 'pastel-cloudland'">
              <circle cx="-4" cy="-4.5" r="3.2" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
              <circle cx="0.5" cy="-6" r="3.8" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
              <circle cx="5" cy="-4.5" r="3" fill="#ffffff" stroke="#93c5fd" stroke-width="0.9" />
            </template>
            <template v-else-if="activeCozyTheme === 'winter-frost'">
              <path d="M-9 23 Q0 26.5 9 23" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
              <path d="M0 -10 V-3 M-3.5 -6.5 H3.5" stroke="#bae6fd" stroke-width="1.3" stroke-linecap="round" />
            </template>
            <template v-else-if="activeCozyTheme === 'astral-palace'">
              <path d="M-6 0 L-4 -7 L0 -3 L4 -7 L6 0 Z" fill="#fde047" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round" />
              <circle cx="0" cy="-8" r="1.7" fill="#34d399" />
            </template>
            <template v-else-if="activeCozyTheme === 'neon-night-city'">
              <rect x="-9.5" y="9" width="19" height="5" rx="2.5" fill="rgba(0,245,212,0.34)" stroke="#00f5d4" stroke-width="1.4" />
            </template>
            <template v-else-if="activeCozyTheme === 'midnight-rain'">
              <path d="M0 -9 C3 -5, 3.5 -2, 0 -2 C-3.5 -2, -3 -5, 0 -9 Z" fill="#7dd3fc" stroke="#ffffff" stroke-width="0.8" />
            </template>
            <template v-else>
              <circle cx="9.5" cy="0.5" r="2.2" fill="#f9a8d4" />
              <circle cx="12" cy="2.2" r="2.2" fill="#fbcfe8" />
              <circle cx="9" cy="3.2" r="2.2" fill="#f9a8d4" />
              <circle cx="10.2" cy="2" r="1.3" fill="#fde047" />
            </template>
          </g>
        </svg>
      </div>
    </button>

    <!-- Label Nama Interaktif + Ikon Edit (✏️) untuk Ganti Nama Kustom User -->
    <div class="-mt-1.5 flex items-center justify-center">
      <form
        v-if="isEditingName"
        class="flex items-center gap-1 rounded-full border px-1.5 py-0.5 shadow-md"
        style="
          background: var(--card-bg-solid);
          border-color: var(--accent-primary);
          color: var(--text-primary);
        "
        @submit.prevent="commitNameEdit"
      >
        <input
          ref="nameInputRef"
          v-model="nameDraft"
          type="text"
          maxlength="16"
          aria-label="Ganti nama kucing"
          class="w-20 bg-transparent px-1 text-center text-[10px] font-bold outline-none"
          style="color: var(--text-primary)"
          @blur="commitNameEdit"
          @keydown.esc.prevent="cancelNameEdit"
        >
        <button
          type="submit"
          aria-label="Simpan nama"
          class="cursor-pointer text-[10px] font-bold"
          style="color: var(--accent-primary)"
        >
          ✓
        </button>
      </form>

      <button
        v-else
        type="button"
        aria-label="Klik untuk ganti nama kucing"
        class="inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-[1px] text-[9.5px] font-bold shadow-xs transition hover:scale-105"
        style="
          background: var(--card-bg-solid);
          border-color: var(--border-strong);
          color: var(--text-primary);
        "
        @click.stop="startEditingName"
      >
        <span class="max-w-[78px] truncate">{{ displayName }}</span>
        <span aria-hidden="true" class="text-[8.5px] opacity-75">✏️</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes buddyCalmBreathe {
  0%,
  100% {
    transform: translateY(0) scaleY(1);
  }
  50% {
    transform: translateY(-1.5px) scaleY(1.02);
  }
}

/* Slot 1 (Mochi): Melompat manja & berguling ringan */
@keyframes buddyCuddleRoll {
  0% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
  28% {
    transform: translateY(-9px) rotate(-10deg) scale(1.08);
  }
  58% {
    transform: translateY(-4px) rotate(10deg) scale(1.05);
  }
  82% {
    transform: translateY(-2px) rotate(-4deg) scale(1.02);
  }
  100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
}

/* Slot 2 (Kuro): Mengangguk & mengintip timer di bawah */
@keyframes buddyTimerPeek {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  30% {
    transform: translateY(4px) rotate(6deg) scale(1.04, 0.95);
  }
  65% {
    transform: translateY(-5px) rotate(-5deg) scale(1.05);
  }
  100% {
    transform: translateY(0) rotate(0deg);
  }
}

/* Slot 3 (Latte): Lompat gembira & melambaikan ekor ceria */
@keyframes buddyTailCheer {
  0% {
    transform: translateY(0) scale(1);
  }
  25% {
    transform: translateY(-10px) scale(1.08, 0.96);
  }
  50% {
    transform: translateY(-2px) scale(0.96, 1.05);
  }
  75% {
    transform: translateY(-7px) scale(1.05);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes buddyBurstLeft {
  0% {
    opacity: 0;
    transform: translate(0, 4px) scale(0.6);
  }
  35% {
    opacity: 1;
    transform: translate(-12px, -8px) scale(1.15);
  }
  100% {
    opacity: 0;
    transform: translate(-18px, -18px) scale(0.85);
  }
}

@keyframes buddyBurstRight {
  0% {
    opacity: 0;
    transform: translate(0, 4px) scale(0.6);
  }
  35% {
    opacity: 1;
    transform: translate(12px, -10px) scale(1.15);
  }
  100% {
    opacity: 0;
    transform: translate(18px, -20px) scale(0.85);
  }
}

@keyframes buddyBurstTop {
  0% {
    opacity: 0;
    transform: translate(-50%, 4px) scale(0.6);
  }
  40% {
    opacity: 1;
    transform: translate(-50%, -10px) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -22px) scale(0.85);
  }
}

@keyframes buddyAmbientFloat {
  0%,
  100% {
    transform: translateY(0) scale(0.95);
    opacity: 0.58;
  }
  50% {
    transform: translateY(-4px) scale(1.06);
    opacity: 0.95;
  }
}

@keyframes buddyTailWag {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(7deg);
  }
}

.buddy-calm-breathe {
  animation: buddyCalmBreathe 3.4s ease-in-out infinite;
}

.buddy-cuddle-roll {
  animation: buddyCuddleRoll 0.66s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.buddy-timer-peek {
  animation: buddyTimerPeek 0.62s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.buddy-tail-cheer {
  animation: buddyTailCheer 0.66s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.buddy-burst-left {
  animation: buddyBurstLeft 0.82s ease-out forwards;
}

.buddy-burst-right {
  animation: buddyBurstRight 0.82s ease-out forwards;
}

.buddy-burst-top {
  animation: buddyBurstTop 0.82s ease-out forwards;
}

.buddy-ambient-left {
  animation: buddyAmbientFloat 3.2s ease-in-out infinite;
}

.buddy-ambient-right {
  animation: buddyAmbientFloat 3.6s ease-in-out 0.8s infinite;
}

.buddy-focus-float {
  animation: buddyAmbientFloat 2.6s ease-in-out infinite;
}

.buddy-tail-wag-origin {
  transform-origin: 57px 49px;
  animation: buddyTailWag 2.4s ease-in-out infinite;
}
</style>
