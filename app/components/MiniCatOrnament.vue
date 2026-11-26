<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useSoundEffects } from '~/composables/useSoundEffects'
import { type CozyThemeId, type ThemeName, useTwilightStorage } from '~/composables/useTwilightStorage'

export type MiniCatPose =
  | 'peek'
  | 'loaf'
  | 'stretch'
  | 'nap'
  | 'sit-tail'
  | 'wave'
  | 'hang'
  | 'curled'

const props = withDefaults(
  defineProps<{
    pose: MiniCatPose
    voiceIndex?: number
    flip?: boolean
    sizeClass?: string
  }>(),
  {
    voiceIndex: 0,
    flip: false,
    sizeClass: 'h-7 w-10',
  },
)

const { activeCozyTheme, theme, isDarkTheme, isMasterAudioMuted, masterAudioVolume } =
  useTwilightStorage()
const { playOrnamentCatMeow } = useSoundEffects()

const isBoinging = ref(false)
let boingTimer: ReturnType<typeof setTimeout> | null = null

interface OrnamentPalette {
  body: string
  bodyShadow: string
  stroke: string
  earInner: string
  eye: string
  blush: string
  accent: string
  glow: string
}

/**
 * Palet kontras tinggi adaptif seluruh Tema (11 Cozy Themes + 3 Tema Dasar)
 * dan Mode Pastel (Terang) / Mode Cozy (Gelap) agar outline selalu tajam & jelas!
 */
const palette = computed<OrnamentPalette>(() => {
  const cozy: CozyThemeId = activeCozyTheme.value
  const base: ThemeName = theme.value
  const dark = isDarkTheme.value

  if (cozy === 'matcha-garden') {
    return dark
      ? {
          body: '#ecfdf5',
          bodyShadow: '#bbf7d0',
          stroke: '#4ade80',
          earInner: '#f9a8d4',
          eye: '#14532d',
          blush: '#fda4af',
          accent: '#86efac',
          glow: 'rgba(74, 222, 128, 0.45)',
        }
      : {
          body: '#f0fdf4',
          bodyShadow: '#dcfce7',
          stroke: '#166534',
          earInner: '#f472b6',
          eye: '#14532d',
          blush: '#fb7185',
          accent: '#22c55e',
          glow: 'rgba(22, 101, 52, 0.18)',
        }
  }

  if (cozy === 'biolum-ocean') {
    return dark
      ? {
          body: '#e0f7ff',
          bodyShadow: '#a5f3fc',
          stroke: '#22d3ee',
          earInner: '#67e8f9',
          eye: '#083344',
          blush: '#f472b6',
          accent: '#00f5d4',
          glow: 'rgba(34, 211, 238, 0.5)',
        }
      : {
          body: '#f0f9ff',
          bodyShadow: '#cffafe',
          stroke: '#0e7490',
          earInner: '#38bdf8',
          eye: '#083344',
          blush: '#fb7185',
          accent: '#06b6d4',
          glow: 'rgba(14, 116, 144, 0.2)',
        }
  }

  if (cozy === 'autumn-cafe') {
    return dark
      ? {
          body: '#fff7ed',
          bodyShadow: '#fed7aa',
          stroke: '#fb923c',
          earInner: '#fda4af',
          eye: '#431407',
          blush: '#fb7185',
          accent: '#f59e0b',
          glow: 'rgba(251, 146, 60, 0.45)',
        }
      : {
          body: '#fffbeb',
          bodyShadow: '#fde68a',
          stroke: '#9a3412',
          earInner: '#fb7185',
          eye: '#431407',
          blush: '#f97316',
          accent: '#d97706',
          glow: 'rgba(154, 52, 18, 0.18)',
        }
  }

  if (cozy === 'sakura-lantern') {
    return dark
      ? {
          body: '#fff1f5',
          bodyShadow: '#fbcfe8',
          stroke: '#f472b6',
          earInner: '#f9a8d4',
          eye: '#500724',
          blush: '#fb7185',
          accent: '#fde68a',
          glow: 'rgba(244, 114, 182, 0.5)',
        }
      : {
          body: '#fff5f8',
          bodyShadow: '#fce7f3',
          stroke: '#9d174d',
          earInner: '#f472b6',
          eye: '#500724',
          blush: '#ec4899',
          accent: '#f59e0b',
          glow: 'rgba(157, 23, 77, 0.18)',
        }
  }

  if (cozy === 'honey-library') {
    return dark
      ? {
          body: '#fffbeb',
          bodyShadow: '#fde68a',
          stroke: '#fbbf24',
          earInner: '#fda4af',
          eye: '#451a03',
          blush: '#fb923c',
          accent: '#f59e0b',
          glow: 'rgba(251, 191, 36, 0.48)',
        }
      : {
          body: '#fffdf5',
          bodyShadow: '#fef3c7',
          stroke: '#92400e',
          earInner: '#fb7185',
          eye: '#451a03',
          blush: '#f59e0b',
          accent: '#d97706',
          glow: 'rgba(146, 64, 14, 0.18)',
        }
  }

  if (cozy === 'pastel-cloudland') {
    return dark
      ? {
          body: '#f5f3ff',
          bodyShadow: '#ddd6fe',
          stroke: '#93c5fd',
          earInner: '#f9a8d4',
          eye: '#1e1b4b',
          blush: '#f9a8d4',
          accent: '#c4b5fd',
          glow: 'rgba(147, 197, 253, 0.5)',
        }
      : {
          body: '#ffffff',
          bodyShadow: '#e0e7ff',
          stroke: '#4338ca',
          earInner: '#f472b6',
          eye: '#1e1b4b',
          blush: '#f472b6',
          accent: '#818cf8',
          glow: 'rgba(67, 56, 202, 0.16)',
        }
  }

  if (cozy === 'winter-frost') {
    return dark
      ? {
          body: '#f0f9ff',
          bodyShadow: '#bae6fd',
          stroke: '#7dd3fc',
          earInner: '#f9a8d4',
          eye: '#0c4a6e',
          blush: '#fda4af',
          accent: '#38bdf8',
          glow: 'rgba(125, 211, 252, 0.5)',
        }
      : {
          body: '#f8fafc',
          bodyShadow: '#e0f2fe',
          stroke: '#0369a1',
          earInner: '#f472b6',
          eye: '#0c4a6e',
          blush: '#fb7185',
          accent: '#0284c7',
          glow: 'rgba(3, 105, 161, 0.18)',
        }
  }

  if (cozy === 'astral-palace') {
    return dark
      ? {
          body: '#f5f3ff',
          bodyShadow: '#c7d2fe',
          stroke: '#fde047',
          earInner: '#34d399',
          eye: '#1e1b4b',
          blush: '#f9a8d4',
          accent: '#fde047',
          glow: 'rgba(253, 224, 71, 0.5)',
        }
      : {
          body: '#faf5ff',
          bodyShadow: '#e0e7ff',
          stroke: '#4338ca',
          earInner: '#10b981',
          eye: '#1e1b4b',
          blush: '#ec4899',
          accent: '#d97706',
          glow: 'rgba(67, 56, 202, 0.2)',
        }
  }

  if (cozy === 'neon-night-city') {
    return dark
      ? {
          body: '#1e1038',
          bodyShadow: '#2e1654',
          stroke: '#00f5d4',
          earInner: '#ff2a85',
          eye: '#00f5d4',
          blush: '#ff2a85',
          accent: '#ff2a85',
          glow: 'rgba(0, 245, 212, 0.58)',
        }
      : {
          body: '#faf5ff',
          bodyShadow: '#e9d5ff',
          stroke: '#6d28d9',
          earInner: '#ec4899',
          eye: '#3b0764',
          blush: '#ec4899',
          accent: '#0891b2',
          glow: 'rgba(109, 40, 217, 0.22)',
        }
  }

  if (cozy === 'midnight-rain') {
    return dark
      ? {
          body: '#e2e8f0',
          bodyShadow: '#cbd5e1',
          stroke: '#7dd3fc',
          earInner: '#f9a8d4',
          eye: '#0f172a',
          blush: '#fda4af',
          accent: '#38bdf8',
          glow: 'rgba(125, 211, 252, 0.45)',
        }
      : {
          body: '#f8fafc',
          bodyShadow: '#dbeafe',
          stroke: '#1d4ed8',
          earInner: '#f472b6',
          eye: '#0f172a',
          blush: '#fb7185',
          accent: '#2563eb',
          glow: 'rgba(29, 78, 216, 0.18)',
        }
  }

  // Classic / 3 tema dasar (twilight / sakura / ocean)
  if (base === 'sakura') {
    return dark
      ? {
          body: '#fff1f5',
          bodyShadow: '#fbcfe8',
          stroke: '#f472b6',
          earInner: '#f9a8d4',
          eye: '#500724',
          blush: '#fb7185',
          accent: '#f9a8d4',
          glow: 'rgba(244, 114, 182, 0.48)',
        }
      : {
          body: '#fff7fa',
          bodyShadow: '#fce7f3',
          stroke: '#9d174d',
          earInner: '#f472b6',
          eye: '#500724',
          blush: '#ec4899',
          accent: '#db2777',
          glow: 'rgba(157, 23, 77, 0.18)',
        }
  }

  if (base === 'ocean') {
    return dark
      ? {
          body: '#e0f2fe',
          bodyShadow: '#bae6fd',
          stroke: '#38bdf8',
          earInner: '#f9a8d4',
          eye: '#0c4a6e',
          blush: '#fda4af',
          accent: '#7dd3fc',
          glow: 'rgba(56, 189, 248, 0.48)',
        }
      : {
          body: '#f0f9ff',
          bodyShadow: '#dbeafe',
          stroke: '#0369a1',
          earInner: '#f472b6',
          eye: '#0c4a6e',
          blush: '#fb7185',
          accent: '#0284c7',
          glow: 'rgba(3, 105, 161, 0.18)',
        }
  }

  return dark
    ? {
        body: '#faf5ff',
        bodyShadow: '#e9d5ff',
        stroke: '#f9a8d4',
        earInner: '#f472b6',
        eye: '#3b0764',
        blush: '#f9a8d4',
        accent: '#c4b5fd',
        glow: 'rgba(249, 168, 212, 0.48)',
      }
    : {
        body: '#ffffff',
        bodyShadow: '#f3e8ff',
        stroke: '#581c87',
        earInner: '#ec4899',
        eye: '#3b0764',
        blush: '#f472b6',
        accent: '#9333ea',
        glow: 'rgba(88, 28, 135, 0.18)',
      }
})

function handleOrnamentClick() {
  const vol = isMasterAudioMuted.value ? 0 : Math.max(0.18, masterAudioVolume.value * 0.8)
  if (vol > 0) {
    playOrnamentCatMeow(props.voiceIndex, vol)
  }

  isBoinging.value = false
  requestAnimationFrame(() => {
    isBoinging.value = true
  })
  if (boingTimer) clearTimeout(boingTimer)
  boingTimer = setTimeout(() => {
    isBoinging.value = false
  }, 420)
}

onUnmounted(() => {
  if (boingTimer) clearTimeout(boingTimer)
})
</script>

<template>
  <!-- Perintilan Kucing Chibi Dekoratif: klik -> goyang telinga/memantul singkat + suara meow unik (tanpa pat-pat, partikel, atau bubble) -->
  <button
    type="button"
    aria-label="Hiasan kucing kecil"
    class="ornament-cat-btn inline-flex cursor-pointer select-none items-center justify-center p-0.5 focus:outline-none"
    :class="[{ 'ornament-boing': isBoinging }]"
    :style="{
      filter: `drop-shadow(0 2px 5px ${palette.glow})`,
    }"
    @click.stop="handleOrnamentClick"
  >
    <svg
      :class="sizeClass"
      viewBox="0 0 56 38"
      fill="none"
      aria-hidden="true"
      :style="flip ? { transform: 'scaleX(-1)' } : undefined"
    >
      <!-- POSE 1: PEEK (Mengintip lucu dari tepi atas kotak dengan dua cakar mungil) -->
      <g v-if="pose === 'peek'">
        <path d="M13 21 L10 8 L22 14 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" stroke-linejoin="round" />
        <path d="M43 21 L46 8 L34 14 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" stroke-linejoin="round" />
        <path d="M14.5 18 L13 11.5 L19.5 15 Z" :fill="palette.earInner" />
        <path d="M41.5 18 L43 11.5 L36.5 15 Z" :fill="palette.earInner" />
        <path d="M11 33 C11 19, 18 13, 28 13 C38 13, 45 19, 45 33 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" stroke-linejoin="round" />
        <circle cx="21.5" cy="24" r="2.2" :fill="palette.eye" />
        <circle cx="34.5" cy="24" r="2.2" :fill="palette.eye" />
        <circle cx="20.8" cy="23.2" r="0.7" fill="#ffffff" />
        <circle cx="33.8" cy="23.2" r="0.7" fill="#ffffff" />
        <ellipse cx="17" cy="27.2" rx="2.3" ry="1.3" :fill="palette.blush" opacity="0.75" />
        <ellipse cx="39" cy="27.2" rx="2.3" ry="1.3" :fill="palette.blush" opacity="0.75" />
        <path d="M26.5 26.8 Q28 28.4 29.5 26.8" :stroke="palette.eye" stroke-width="1.5" stroke-linecap="round" />
        <!-- Cakar bertumpu di bibir kotak -->
        <ellipse cx="15" cy="33.5" rx="5.2" ry="3.2" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="1.8" />
        <ellipse cx="41" cy="33.5" rx="5.2" ry="3.2" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="1.8" />
      </g>

      <!-- POSE 2: LOAF (Roti kucing gendut duduk santai dengan ekor melingkar) -->
      <g v-else-if="pose === 'loaf'">
        <path d="M44 29 C51 28, 53 20, 48 18" :stroke="palette.stroke" stroke-width="3.2" stroke-linecap="round" />
        <ellipse cx="29" cy="27" rx="18" ry="9" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" />
        <path d="M12 18 L11 8 L20 13 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <path d="M29 18 L31 8 L22 13 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <ellipse cx="20.5" cy="21" rx="10.5" ry="8.5" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" />
        <circle cx="17" cy="21" r="1.9" :fill="palette.eye" />
        <circle cx="24" cy="21" r="1.9" :fill="palette.eye" />
        <ellipse cx="13.5" cy="23.5" rx="2" ry="1.1" :fill="palette.blush" opacity="0.78" />
        <ellipse cx="27.5" cy="23.5" rx="2" ry="1.1" :fill="palette.blush" opacity="0.78" />
        <path d="M19.2 23.5 Q20.5 24.8 21.8 23.5" :stroke="palette.eye" stroke-width="1.4" stroke-linecap="round" />
      </g>

      <!-- POSE 3: NAP (Tiduran santai mata terpejam tenang) -->
      <g v-else-if="pose === 'nap'">
        <ellipse cx="28" cy="27" rx="20" ry="8.5" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" />
        <path d="M13 21 L12 12 L20 16 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.8" stroke-linejoin="round" />
        <path d="M27 20 L29 12 L21 16 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.8" stroke-linejoin="round" />
        <ellipse cx="20" cy="24" rx="9.5" ry="7.5" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="1.9" />
        <path d="M15.5 24 Q17.5 26 19.5 24" :stroke="palette.eye" stroke-width="1.6" stroke-linecap="round" />
        <path d="M21.5 24 Q23.5 26 25.5 24" :stroke="palette.eye" stroke-width="1.6" stroke-linecap="round" />
        <path d="M45 27 C51 26, 52 21, 47 20" :stroke="palette.stroke" stroke-width="2.6" stroke-linecap="round" />
        <ellipse cx="14" cy="26.2" rx="1.8" ry="1" :fill="palette.blush" opacity="0.75" />
      </g>

      <!-- POSE 4: CURLED (Meringkuk bulat nyaman seperti donat) -->
      <g v-else-if="pose === 'curled'">
        <ellipse cx="28" cy="24" rx="17" ry="11.5" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" />
        <path d="M15 26 C18 33, 38 33, 42 25" :stroke="palette.accent" stroke-width="3.2" stroke-linecap="round" opacity="0.6" />
        <path d="M16 17 L15 8 L23 13 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.8" stroke-linejoin="round" />
        <path d="M32 17 L34 8 L26 13 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.8" stroke-linejoin="round" />
        <ellipse cx="24" cy="20.5" rx="9.5" ry="7.2" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" />
        <path d="M19.5 20.5 Q21.3 22.3 23 20.5" :stroke="palette.eye" stroke-width="1.5" stroke-linecap="round" />
        <path d="M25.5 20.5 Q27.3 22.3 29 20.5" :stroke="palette.eye" stroke-width="1.5" stroke-linecap="round" />
        <ellipse cx="18.2" cy="22.8" rx="1.8" ry="1" :fill="palette.blush" opacity="0.75" />
        <ellipse cx="30" cy="22.8" rx="1.8" ry="1" :fill="palette.blush" opacity="0.75" />
      </g>

      <!-- POSE 5: WAVE (Duduk ceria melambaikan satu cakar kecil) -->
      <g v-else-if="pose === 'wave'">
        <ellipse cx="26" cy="28" rx="11" ry="7.5" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="2" />
        <path d="M16 16 L14 6 L24 11 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <path d="M36 16 L38 6 L28 11 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <path d="M17 14 L16 9 L21.5 11.5 Z" :fill="palette.earInner" />
        <path d="M35 14 L36 9 L30.5 11.5 Z" :fill="palette.earInner" />
        <ellipse cx="26" cy="18.5" rx="11" ry="8.8" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" />
        <circle cx="22" cy="18.2" r="2" :fill="palette.eye" />
        <circle cx="30" cy="18.2" r="2" :fill="palette.eye" />
        <ellipse cx="18.5" cy="20.8" rx="2" ry="1.1" :fill="palette.blush" opacity="0.78" />
        <ellipse cx="33.5" cy="20.8" rx="2" ry="1.1" :fill="palette.blush" opacity="0.78" />
        <path d="M24.6 21 Q26 22.5 27.4 21" :stroke="palette.eye" stroke-width="1.4" stroke-linecap="round" />
        <!-- Cakar melambai -->
        <ellipse cx="41" cy="22" rx="4.2" ry="5.2" transform="rotate(24 41 22)" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.8" />
        <circle cx="41" cy="21" r="1.4" :fill="palette.earInner" />
      </g>

      <!-- POSE 6: SIT-TAIL (Duduk tegak manis dengan ekor melengkung tanda tanya) -->
      <g v-else-if="pose === 'sit-tail'">
        <path d="M36 31 C45 30, 48 16, 42 12 C39 10, 38 14, 40 16" :stroke="palette.stroke" stroke-width="3" stroke-linecap="round" />
        <ellipse cx="24" cy="28" rx="11.5" ry="7.8" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="2" />
        <path d="M14 16 L12 6 L22 11 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <path d="M34 16 L36 6 L26 11 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <path d="M15.2 14 L14 9 L19.5 11.5 Z" :fill="palette.earInner" />
        <path d="M32.8 14 L34 9 L28.5 11.5 Z" :fill="palette.earInner" />
        <ellipse cx="24" cy="18.5" rx="11" ry="8.5" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" />
        <circle cx="20" cy="18.2" r="2" :fill="palette.eye" />
        <circle cx="28" cy="18.2" r="2" :fill="palette.eye" />
        <circle cx="19.4" cy="17.5" r="0.65" fill="#ffffff" />
        <circle cx="27.4" cy="17.5" r="0.65" fill="#ffffff" />
        <path d="M22.6 21 Q24 22.4 25.4 21" :stroke="palette.eye" stroke-width="1.4" stroke-linecap="round" />
        <path d="M18 26 Q24 29 30 26" :stroke="palette.accent" stroke-width="2.2" stroke-linecap="round" />
      </g>

      <!-- POSE 7: HANG (Bergelayut menggemaskan memegang tepi kartu) -->
      <g v-else-if="pose === 'hang'">
        <path d="M16 14 L14 5 L23 10 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <path d="M40 14 L42 5 L33 10 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.9" stroke-linejoin="round" />
        <path d="M17 12.5 L16 8 L21 10.5 Z" :fill="palette.earInner" />
        <path d="M39 12.5 L40 8 L35 10.5 Z" :fill="palette.earInner" />
        <ellipse cx="28" cy="18" rx="12" ry="9" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" />
        <circle cx="23.5" cy="17.5" r="2" :fill="palette.eye" />
        <circle cx="32.5" cy="17.5" r="2" :fill="palette.eye" />
        <ellipse cx="19.5" cy="20.5" rx="2" ry="1.1" :fill="palette.blush" opacity="0.78" />
        <ellipse cx="36.5" cy="20.5" rx="2" ry="1.1" :fill="palette.blush" opacity="0.78" />
        <path d="M26.5 20.5 Q28 22 29.5 20.5" :stroke="palette.eye" stroke-width="1.4" stroke-linecap="round" />
        <!-- Dua cakar menggantung di kiri-kanan dagu -->
        <ellipse cx="15" cy="27" rx="4.5" ry="3.2" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="1.8" />
        <ellipse cx="41" cy="27" rx="4.5" ry="3.2" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="1.8" />
      </g>

      <!-- POSE 8: STRETCH (Peregangan lucu memanjang di sudut bawah) -->
      <g v-else>
        <path d="M44 22 C49 14, 53 16, 51 22" :stroke="palette.stroke" stroke-width="2.8" stroke-linecap="round" />
        <path d="M14 29 C18 22, 26 20, 34 21 C41 21, 46 25, 45 31 L14 31 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="2" stroke-linejoin="round" />
        <path d="M11 22 L9 14 L17 18 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.8" stroke-linejoin="round" />
        <path d="M22 21 L23 13 L16 17 Z" :fill="palette.body" :stroke="palette.stroke" stroke-width="1.8" stroke-linejoin="round" />
        <ellipse cx="16.5" cy="24.5" rx="7.8" ry="6.4" :fill="palette.bodyShadow" :stroke="palette.stroke" stroke-width="1.9" />
        <circle cx="14" cy="24" r="1.6" :fill="palette.eye" />
        <circle cx="19.2" cy="24" r="1.6" :fill="palette.eye" />
        <ellipse cx="11.2" cy="26.2" rx="1.6" ry="0.9" :fill="palette.blush" opacity="0.75" />
        <path d="M6 31 H13" :stroke="palette.stroke" stroke-width="3" stroke-linecap="round" />
      </g>
    </svg>
  </button>
</template>

<style scoped>
.ornament-cat-btn {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ornament-cat-btn:hover {
  transform: translateY(-2px) scale(1.06);
}

@keyframes ornamentBoing {
  0% {
    transform: translateY(0) scale(1) rotate(0deg);
  }
  28% {
    transform: translateY(-5px) scale(1.12, 0.94) rotate(-5deg);
  }
  58% {
    transform: translateY(-1px) scale(0.96, 1.06) rotate(4deg);
  }
  100% {
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

.ornament-boing {
  animation: ornamentBoing 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
