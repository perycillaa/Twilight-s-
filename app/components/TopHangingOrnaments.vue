<script setup lang="ts">
import { computed } from 'vue'
import { useTwilightStorage } from '~/composables/useTwilightStorage'

const { theme, isDarkTheme, activeCozyTheme, graphicsQuality } = useTwilightStorage()

type OrnamentShape =
  | 'crescent-moon'
  | 'four-star'
  | 'sparkle-star'
  | 'star-five'
  | 'pastel-heart'
  | 'sakura-star'
  | 'pink-bow'
  | 'fluffy-cloud'
  | 'sky-cloud'
  | 'ice-crystal'
  | 'rain-cloud'
  | 'mini-umbrella'
  | 'raindrop'
  | 'furin-bell'
  | 'matcha-leaf'
  | 'white-blossom'
  | 'sakura-lantern'
  | 'sakura-petal'
  | 'tassel-charm'
  | 'maple-leaf'
  | 'acorn'
  | 'mini-coffee'
  | 'honey-drop'
  | 'honey-pot'
  | 'honeycomb-hex'
  | 'honey-dipper'
  | 'antique-key'
  | 'jellyfish'
  | 'pearl-shell'
  | 'starfish'
  | 'snowflake'
  | 'silver-bell'
  | 'prism-crystal'
  | 'constellation'
  | 'cyber-star'
  | 'rainbow-cloud'

interface OrnamentPalette {
  primary: string
  secondary: string
  tertiary: string
  stroke: string
  stringColor: string
  glow: string
}

interface HangingItem {
  id: string
  shape: OrnamentShape
  stringPx: number
  sizePx: number
  swayDuration: string
  swayDelay: string
  tone: 'primary' | 'secondary' | 'tertiary'
  hideOnMobile?: boolean
  hideOnTablet?: boolean
}

/**
 * Palet warna gantungan per tema & mode:
 * - Vibe Terang (Light Mode): isi pastel lembut, outline tipis harmonis, tali semi-transparan halus.
 * - Vibe Gelap (Dark Mode): isi cerah berkilau dengan efek glow khas tema.
 */
const palette = computed<OrnamentPalette>(() => {
  const dark = isDarkTheme.value
  const cozy = activeCozyTheme.value
  const base = theme.value

  if (cozy === 'midnight-rain') {
    return dark
      ? {
          primary: '#60a5fa',
          secondary: '#93c5fd',
          tertiary: '#bae6fd',
          stroke: '#e0f2fe',
          stringColor: 'rgba(147, 197, 253, 0.72)',
          glow: 'rgba(96, 165, 250, 0.65)',
        }
      : {
          primary: '#bfdbfe',
          secondary: '#bae6fd',
          tertiary: '#e0f2fe',
          stroke: '#3b82f6',
          stringColor: 'rgba(59, 130, 246, 0.42)',
          glow: 'rgba(255, 255, 255, 0.85)',
        }
  }

  if (cozy === 'matcha-garden') {
    return dark
      ? {
          primary: '#86efac',
          secondary: '#4ade80',
          tertiary: '#fef3c7',
          stroke: '#dcfce7',
          stringColor: 'rgba(134, 239, 172, 0.72)',
          glow: 'rgba(74, 222, 128, 0.58)',
        }
      : {
          primary: '#bbf7d0',
          secondary: '#dcfce7',
          tertiary: '#fef9c3',
          stroke: '#15803d',
          stringColor: 'rgba(21, 128, 61, 0.38)',
          glow: 'rgba(255, 255, 255, 0.85)',
        }
  }

  if (cozy === 'sakura-lantern') {
    return dark
      ? {
          primary: '#f472b6',
          secondary: '#fbcfe8',
          tertiary: '#fde68a',
          stroke: '#fff1f2',
          stringColor: 'rgba(251, 207, 232, 0.75)',
          glow: 'rgba(244, 114, 182, 0.65)',
        }
      : {
          primary: '#fbcfe8',
          secondary: '#ffe4e6',
          tertiary: '#fef3c7',
          stroke: '#be185d',
          stringColor: 'rgba(190, 24, 93, 0.38)',
          glow: 'rgba(255, 255, 255, 0.85)',
        }
  }

  if (cozy === 'autumn-cafe') {
    return dark
      ? {
          primary: '#fb923c',
          secondary: '#fbbf24',
          tertiary: '#fed7aa',
          stroke: '#fef3c7',
          stringColor: 'rgba(253, 186, 116, 0.74)',
          glow: 'rgba(251, 146, 60, 0.62)',
        }
      : {
          primary: '#fed7aa',
          secondary: '#fde68a',
          tertiary: '#ffedd5',
          stroke: '#c2410c',
          stringColor: 'rgba(194, 65, 12, 0.38)',
          glow: 'rgba(255, 255, 255, 0.85)',
        }
  }

  if (cozy === 'honey-library') {
    return dark
      ? {
          primary: '#fcd34d',
          secondary: '#fde68a',
          tertiary: '#fbbf24',
          stroke: '#fffbeb',
          stringColor: 'rgba(252, 211, 77, 0.74)',
          glow: 'rgba(251, 191, 36, 0.65)',
        }
      : {
          primary: '#fef08a',
          secondary: '#fde68a',
          tertiary: '#ffedd5',
          stroke: '#b45309',
          stringColor: 'rgba(180, 83, 9, 0.38)',
          glow: 'rgba(255, 255, 255, 0.85)',
        }
  }

  if (cozy === 'biolum-ocean') {
    return dark
      ? {
          primary: '#5eead4',
          secondary: '#67e8f9',
          tertiary: '#ccfbf1',
          stroke: '#ecfeff',
          stringColor: 'rgba(94, 234, 212, 0.75)',
          glow: 'rgba(0, 245, 212, 0.7)',
        }
      : {
          primary: '#99f6e4',
          secondary: '#bae6fd',
          tertiary: '#f0fdfa',
          stroke: '#0f766e',
          stringColor: 'rgba(15, 118, 110, 0.38)',
          glow: 'rgba(255, 255, 255, 0.85)',
        }
  }

  if (cozy === 'winter-frost') {
    return dark
      ? {
          primary: '#bae6fd',
          secondary: '#e0f2fe',
          tertiary: '#c7d2fe',
          stroke: '#ffffff',
          stringColor: 'rgba(186, 230, 253, 0.75)',
          glow: 'rgba(125, 211, 252, 0.68)',
        }
      : {
          primary: '#e0f2fe',
          secondary: '#bae6fd',
          tertiary: '#f1f5f9',
          stroke: '#0284c7',
          stringColor: 'rgba(2, 132, 199, 0.38)',
          glow: 'rgba(255, 255, 255, 0.88)',
        }
  }

  if (cozy === 'astral-palace') {
    return dark
      ? {
          primary: '#c4b5fd',
          secondary: '#6ee7b7',
          tertiary: '#fde68a',
          stroke: '#f5f3ff',
          stringColor: 'rgba(196, 181, 253, 0.76)',
          glow: 'rgba(167, 139, 250, 0.72)',
        }
      : {
          primary: '#ddd6fe',
          secondary: '#a7f3d0',
          tertiary: '#fef08a',
          stroke: '#6d28d9',
          stringColor: 'rgba(109, 40, 217, 0.38)',
          glow: 'rgba(255, 255, 255, 0.88)',
        }
  }

  if (cozy === 'neon-night-city') {
    return dark
      ? {
          primary: '#00f5d4',
          secondary: '#ff66b2',
          tertiary: '#a78bfa',
          stroke: '#f0fdfa',
          stringColor: 'rgba(0, 245, 212, 0.75)',
          glow: 'rgba(0, 245, 212, 0.75)',
        }
      : {
          primary: '#f5d0fe',
          secondary: '#a5f3fc',
          tertiary: '#ddd6fe',
          stroke: '#a21caf',
          stringColor: 'rgba(162, 28, 175, 0.38)',
          glow: 'rgba(255, 255, 255, 0.88)',
        }
  }

  if (cozy === 'pastel-cloudland') {
    return dark
      ? {
          primary: '#ffffff',
          secondary: '#fbcfe8',
          tertiary: '#bae6fd',
          stroke: '#bfdbfe',
          stringColor: 'rgba(191, 219, 254, 0.76)',
          glow: 'rgba(147, 197, 253, 0.65)',
        }
      : {
          primary: '#ffffff',
          secondary: '#fbcfe8',
          tertiary: '#bae6fd',
          stroke: '#60a5fa',
          stringColor: 'rgba(96, 165, 250, 0.42)',
          glow: 'rgba(255, 255, 255, 0.9)',
        }
  }

  // 3 Pilihan Palet Tema Default Twilight (Pink Berry / Biru / Ungu)
  if (base === 'sakura') {
    return dark
      ? {
          primary: '#fbcfe8',
          secondary: '#fed7aa',
          tertiary: '#fda4af',
          stroke: '#fff1f2',
          stringColor: 'rgba(251, 207, 232, 0.75)',
          glow: 'rgba(253, 164, 175, 0.65)',
        }
      : {
          primary: '#fbcfe8',
          secondary: '#fed7aa',
          tertiary: '#ffe4e6',
          stroke: '#be185d',
          stringColor: 'rgba(190, 24, 93, 0.36)',
          glow: 'rgba(255, 255, 255, 0.88)',
        }
  }

  if (base === 'ocean') {
    return dark
      ? {
          primary: '#bae6fd',
          secondary: '#7dd3fc',
          tertiary: '#f0f9ff',
          stroke: '#e0f2fe',
          stringColor: 'rgba(186, 230, 253, 0.75)',
          glow: 'rgba(56, 189, 248, 0.68)',
        }
      : {
          primary: '#bae6fd',
          secondary: '#ffffff',
          tertiary: '#e0f2fe',
          stroke: '#0284c7',
          stringColor: 'rgba(2, 132, 199, 0.36)',
          glow: 'rgba(255, 255, 255, 0.9)',
        }
  }

  // Default Twilight — Palet Ungu
  return dark
    ? {
        primary: '#ddd6fe',
        secondary: '#fde68a',
        tertiary: '#f9a8d4',
        stroke: '#f5f3ff',
        stringColor: 'rgba(221, 214, 254, 0.75)',
        glow: 'rgba(192, 132, 252, 0.68)',
      }
    : {
        primary: '#ddd6fe',
        secondary: '#fde68a',
        tertiary: '#ede9fe',
        stroke: '#6d28d9',
        stringColor: 'rgba(109, 40, 217, 0.36)',
        glow: 'rgba(255, 255, 255, 0.88)',
      }
})

/** Susunan kombinasi bentuk gantungan (Kiri 4, Tengah-Atas 3 mini, Kanan 4) khas setiap tema & palet */
const ornamentSet = computed<{
  left: HangingItem[]
  topCenter: Array<HangingItem & { posClass: string }>
  right: HangingItem[]
}>(() => {
  const cozy = activeCozyTheme.value
  const base = theme.value

  type ThemeShapes = {
    L: [OrnamentShape, OrnamentShape, OrnamentShape, OrnamentShape]
    C: [OrnamentShape, OrnamentShape, OrnamentShape]
    R: [OrnamentShape, OrnamentShape, OrnamentShape, OrnamentShape]
  }

  const shapeMap: Record<string, ThemeShapes> = {
    'classic-twilight': {
      L: ['crescent-moon', 'four-star', 'sparkle-star', 'star-five'],
      C: ['four-star', 'sparkle-star', 'four-star'],
      R: ['star-five', 'sparkle-star', 'four-star', 'crescent-moon'],
    },
    'classic-sakura': {
      L: ['pastel-heart', 'sakura-star', 'pink-bow', 'fluffy-cloud'],
      C: ['sakura-star', 'pastel-heart', 'sakura-star'],
      R: ['fluffy-cloud', 'pink-bow', 'sakura-star', 'pastel-heart'],
    },
    'classic-ocean': {
      L: ['sky-cloud', 'crescent-moon', 'ice-crystal', 'four-star'],
      C: ['four-star', 'ice-crystal', 'four-star'],
      R: ['four-star', 'ice-crystal', 'crescent-moon', 'sky-cloud'],
    },
    'midnight-rain': {
      L: ['rain-cloud', 'mini-umbrella', 'raindrop', 'four-star'],
      C: ['raindrop', 'four-star', 'raindrop'],
      R: ['four-star', 'raindrop', 'mini-umbrella', 'rain-cloud'],
    },
    'matcha-garden': {
      L: ['furin-bell', 'matcha-leaf', 'white-blossom', 'sparkle-star'],
      C: ['white-blossom', 'matcha-leaf', 'white-blossom'],
      R: ['sparkle-star', 'white-blossom', 'matcha-leaf', 'furin-bell'],
    },
    'sakura-lantern': {
      L: ['sakura-lantern', 'sakura-petal', 'tassel-charm', 'white-blossom'],
      C: ['sakura-petal', 'white-blossom', 'sakura-petal'],
      R: ['white-blossom', 'tassel-charm', 'sakura-petal', 'sakura-lantern'],
    },
    'autumn-cafe': {
      L: ['maple-leaf', 'acorn', 'mini-coffee', 'sparkle-star'],
      C: ['maple-leaf', 'sparkle-star', 'maple-leaf'],
      R: ['sparkle-star', 'mini-coffee', 'acorn', 'maple-leaf'],
    },
    'honey-library': {
      L: ['honey-pot', 'honeycomb-hex', 'honey-dipper', 'honey-drop'],
      C: ['honey-drop', 'honeycomb-hex', 'honey-drop'],
      R: ['honey-drop', 'honey-dipper', 'honeycomb-hex', 'honey-pot'],
    },
    'biolum-ocean': {
      L: ['jellyfish', 'pearl-shell', 'starfish', 'raindrop'],
      C: ['starfish', 'raindrop', 'starfish'],
      R: ['raindrop', 'starfish', 'pearl-shell', 'jellyfish'],
    },
    'winter-frost': {
      L: ['snowflake', 'ice-crystal', 'silver-bell', 'four-star'],
      C: ['snowflake', 'four-star', 'snowflake'],
      R: ['four-star', 'silver-bell', 'ice-crystal', 'snowflake'],
    },
    'astral-palace': {
      L: ['prism-crystal', 'constellation', 'crescent-moon', 'four-star'],
      C: ['four-star', 'prism-crystal', 'four-star'],
      R: ['four-star', 'crescent-moon', 'constellation', 'prism-crystal'],
    },
    'neon-night-city': {
      L: ['cyber-star', 'prism-crystal', 'sparkle-star', 'four-star'],
      C: ['four-star', 'cyber-star', 'four-star'],
      R: ['four-star', 'sparkle-star', 'prism-crystal', 'cyber-star'],
    },
    'pastel-cloudland': {
      L: ['rainbow-cloud', 'fluffy-cloud', 'pastel-heart', 'four-star'],
      C: ['four-star', 'pastel-heart', 'four-star'],
      R: ['four-star', 'pastel-heart', 'fluffy-cloud', 'rainbow-cloud'],
    },
  }

  const key = cozy === 'classic' ? `classic-${base}` : cozy
  const chosen = shapeMap[key] ?? shapeMap['classic-twilight']!

  // Garland pojok kiri (panjang tali bervariasi: panjang → sedang → pendek → mini)
  const left: HangingItem[] = [
    { id: 'L1', shape: chosen.L[0], stringPx: 38, sizePx: 38, swayDuration: '5.8s', swayDelay: '0.1s', tone: 'primary' },
    { id: 'L2', shape: chosen.L[1], stringPx: 26, sizePx: 30, swayDuration: '4.9s', swayDelay: '0.8s', tone: 'secondary' },
    { id: 'L3', shape: chosen.L[2], stringPx: 18, sizePx: 26, swayDuration: '5.4s', swayDelay: '1.4s', tone: 'tertiary', hideOnMobile: true },
    { id: 'L4', shape: chosen.L[3], stringPx: 11, sizePx: 20, swayDuration: '4.4s', swayDelay: '0.4s', tone: 'secondary', hideOnTablet: true },
  ]

  // 3 gantungan kecil bertali pendek di sepanjang tepi tengah atas (tidak menutupi teks/tombol header)
  const topCenter: Array<HangingItem & { posClass: string }> = [
    {
      id: 'C1',
      shape: chosen.C[0],
      stringPx: 10,
      sizePx: 18,
      swayDuration: '4.7s',
      swayDelay: '0.3s',
      tone: 'secondary',
      posClass: 'left-[24%] hidden md:flex',
    },
    {
      id: 'C2',
      shape: chosen.C[1],
      stringPx: 7,
      sizePx: 16,
      swayDuration: '5.3s',
      swayDelay: '1.1s',
      tone: 'primary',
      posClass: 'left-1/2 -translate-x-1/2 hidden lg:flex',
    },
    {
      id: 'C3',
      shape: chosen.C[2],
      stringPx: 10,
      sizePx: 18,
      swayDuration: '4.5s',
      swayDelay: '0.7s',
      tone: 'tertiary',
      posClass: 'right-[24%] hidden md:flex',
    },
  ]

  // Garland pojok kanan (cermin melengkung: mini → pendek → sedang → panjang)
  const right: HangingItem[] = [
    { id: 'R1', shape: chosen.R[0], stringPx: 11, sizePx: 20, swayDuration: '4.6s', swayDelay: '0.9s', tone: 'secondary', hideOnTablet: true },
    { id: 'R2', shape: chosen.R[1], stringPx: 18, sizePx: 26, swayDuration: '5.5s', swayDelay: '0.3s', tone: 'tertiary', hideOnMobile: true },
    { id: 'R3', shape: chosen.R[2], stringPx: 27, sizePx: 30, swayDuration: '5.0s', swayDelay: '1.2s', tone: 'secondary' },
    { id: 'R4', shape: chosen.R[3], stringPx: 38, sizePx: 38, swayDuration: '6.1s', swayDelay: '0.2s', tone: 'primary' },
  ]

  return { left, topCenter, right }
})

function fillForTone(tone: 'primary' | 'secondary' | 'tertiary'): string {
  const p = palette.value
  if (tone === 'secondary') return p.secondary
  if (tone === 'tertiary') return p.tertiary
  return p.primary
}

const iconFilterStyle = computed<string>(() => {
  // Mode Low: matikan filter drop-shadow berat demi hemat GPU/baterai
  if (graphicsQuality.value === 'low') return 'none'
  // Mode Medium: bayangan / glow ringan
  if (graphicsQuality.value === 'medium') {
    return isDarkTheme.value ? `drop-shadow(0 0 4px ${palette.value.glow})` : 'none'
  }
  // Mode High: visual maksimal penuh
  if (isDarkTheme.value) {
    return `drop-shadow(0 0 8px ${palette.value.glow})`
  }
  return `drop-shadow(0 1.5px 3px ${palette.value.glow}) drop-shadow(0 1px 2px rgba(15, 23, 42, 0.08))`
})

const strokeW = computed<number>(() => (isDarkTheme.value ? 1.5 : 1.35))
</script>

<template>
  <!-- Aksen Lelehan Madu Halus (Cozy Honey Drip Border) khusus Tema Honey Library di tepi paling atas layar -->
  <div
    v-if="activeCozyTheme === 'honey-library'"
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
  >
    <svg
      class="block h-5 w-full sm:h-6"
      viewBox="0 0 1440 36"
      preserveAspectRatio="none"
      fill="none"
      :style="{
        filter:
          graphicsQuality === 'high' && isDarkTheme
            ? 'drop-shadow(0 2px 8px rgba(251, 191, 36, 0.45))'
            : 'none',
      }"
    >
      <defs>
        <linearGradient id="cozyHoneyDripGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="isDarkTheme ? '#fcd34d' : '#fde68a'" :stop-opacity="isDarkTheme ? 0.85 : 0.82" />
          <stop offset="100%" :stop-color="isDarkTheme ? '#d97706' : '#f59e0b'" :stop-opacity="isDarkTheme ? 0.72 : 0.62" />
        </linearGradient>
      </defs>
      <path
        d="M0 0 H1440 V9 C1398 9 1388 26 1364 26 C1340 26 1332 10 1288 10 C1246 10 1236 22 1214 22 C1192 22 1184 9 1138 9 C1094 9 1084 30 1060 30 C1036 30 1028 10 980 10 C936 10 924 20 902 20 C880 20 872 8 824 8 C778 8 768 25 744 25 C720 25 712 9 664 9 C618 9 608 21 586 21 C564 21 556 9 510 9 C466 9 456 29 432 29 C408 29 400 10 352 10 C306 10 296 22 274 22 C252 22 244 9 196 9 C152 9 142 27 118 27 C94 27 86 10 42 10 C18 10 8 15 0 15 Z"
        fill="url(#cozyHoneyDripGrad)"
        :stroke="isDarkTheme ? 'rgba(254, 243, 199, 0.5)' : 'rgba(180, 83, 9, 0.35)'"
        stroke-width="1.2"
      />
    </svg>
  </div>

  <!-- Gantungan Pojok Kiri (3–4 item melengkung / garland) -->
  <div class="pointer-events-none absolute left-1.5 top-0 flex items-start gap-2.5 sm:left-4 sm:gap-3.5 md:gap-4">
    <div
      v-for="item in ornamentSet.left"
      :key="item.id"
      class="animate-gentle-sway flex-col items-center"
      :class="
        item.hideOnTablet
          ? 'hidden lg:flex'
          : item.hideOnMobile
            ? 'hidden sm:flex'
            : 'flex'
      "
      :style="{ '--sway-duration': item.swayDuration, '--sway-delay': item.swayDelay }"
    >
      <div
        class="w-[1.5px] rounded-full"
        :style="{ height: `${item.stringPx}px`, backgroundColor: palette.stringColor }"
      />
      <svg
        class="-mt-0.5 shrink-0"
        :style="{ width: `${item.sizePx}px`, height: `${item.sizePx}px`, filter: iconFilterStyle }"
        viewBox="0 0 40 40"
        fill="none"
      >
        <g v-if="item.shape === 'crescent-moon'">
          <path d="M26 6 C18 7.5 12 14 12 21.5 C12 28.5 17 34 23.5 35.5 C15 36.2 7.5 29.8 6.8 21.8 C6 13.2 12.6 5.8 21.5 5.2 C23.2 5.1 24.7 5.4 26 6 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M27.5 17 L28.7 20.3 L32 21.5 L28.7 22.7 L27.5 26 L26.3 22.7 L23 21.5 L26.3 20.3 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'four-star'">
          <path d="M20 4 L23.5 16.5 L36 20 L23.5 23.5 L20 36 L16.5 23.5 L4 20 L16.5 16.5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="20" r="2.2" fill="#ffffff" opacity="0.9" />
        </g>

        <g v-else-if="item.shape === 'sparkle-star'">
          <path d="M20 5 L22.8 14.5 L32 17 L22.8 19.5 L20 29 L17.2 19.5 L8 17 L17.2 14.5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="30" cy="10" r="2" :fill="palette.secondary" />
          <circle cx="10" cy="28" r="1.8" :fill="palette.tertiary" />
        </g>

        <g v-else-if="item.shape === 'star-five'">
          <path d="M20 4 L24.2 14.4 L35.2 15.2 L26.8 22.4 L29.4 33.4 L20 27.6 L10.6 33.4 L13.2 22.4 L4.8 15.2 L15.8 14.4 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="17.5" cy="17.5" r="2" fill="#ffffff" opacity="0.88" />
        </g>

        <g v-else-if="item.shape === 'pastel-heart'">
          <path d="M20 34 C20 34 6 24.5 6 15.2 C6 10.2 9.8 7 14.2 7 C17 7 19 8.6 20 10.6 C21 8.6 23 7 25.8 7 C30.2 7 34 10.2 34 15.2 C34 24.5 20 34 20 34 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <ellipse cx="14" cy="14" rx="2.8" ry="1.6" transform="rotate(-25 14 14)" fill="#ffffff" opacity="0.85" />
        </g>

        <g v-else-if="item.shape === 'sakura-star'">
          <circle cx="20" cy="10.5" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="29" cy="17.2" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="25.5" cy="28" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="14.5" cy="28" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="11" cy="17.2" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="20" cy="20" r="3.6" :fill="palette.secondary" />
        </g>

        <g v-else-if="item.shape === 'pink-bow'">
          <path d="M20 20 L8 12 C5 16 5 24 8 28 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 20 L32 12 C35 16 35 24 32 28 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M18 22 L13 34 M22 22 L27 34" :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="20" cy="20" r="3.8" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'fluffy-cloud' || item.shape === 'sky-cloud'">
          <path d="M11 28 H29 C33 28 36 25.2 36 21.5 C36 18 33.4 15.2 30 14.8 C28.6 10.4 24.4 7.5 19.6 8 C14.6 8.5 11 12.4 10.6 17 C7.4 17.8 5 20.2 5 23 C5 25.8 7.5 28 11 28 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="16.5" cy="20" r="1.2" :fill="palette.stroke" opacity="0.65" />
          <circle cx="23.5" cy="20" r="1.2" :fill="palette.stroke" opacity="0.65" />
        </g>

        <g v-else-if="item.shape === 'ice-crystal'">
          <g :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round">
            <line x1="20" y1="5" x2="20" y2="35" />
            <line x1="7" y1="12.5" x2="33" y2="27.5" />
            <line x1="33" y1="12.5" x2="7" y2="27.5" />
          </g>
          <polygon points="20,12 26,20 20,28 14,20" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.3" />
        </g>

        <g v-else-if="item.shape === 'rain-cloud'">
          <path d="M10 22 H30 C33.5 22 36 19.5 36 16.5 C36 13.5 33.6 11 30.5 10.8 C29.2 7 25.5 5 21.2 5.6 C17 6 14 9 13.5 12.6 C10.2 13 7.5 15 7.5 17.6 C7.5 20.2 8.6 22 10 22 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M14 27 C14 27 11.8 30.8 11.8 32.3 A2.2 2.2 0 0 0 16.2 32.3 C16.2 30.8 14 27 14 27 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
          <path d="M21 29 C21 29 18.8 32.8 18.8 34.3 A2.2 2.2 0 0 0 23.2 34.3 C23.2 32.8 21 29 21 29 Z" :fill="palette.primary" :stroke="palette.stroke" stroke-width="0.9" />
          <path d="M28 27 C28 27 25.8 30.8 25.8 32.3 A2.2 2.2 0 0 0 30.2 32.3 C30.2 30.8 28 27 28 27 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'mini-umbrella'">
          <path d="M6 21 C6 11 34 11 34 21 Q29 17.5 24.5 21 Q20 17.5 15.5 21 Q11 17.5 6 21 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 20 V32 C20 35 15.5 35 15.5 32.5" :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round" />
          <line x1="20" y1="8" x2="20" y2="11.5" :stroke="palette.stroke" stroke-width="1.6" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'raindrop'">
          <path d="M20 5 C20 5 30 17.5 30 24.5 C30 30.5 25.5 35 20 35 C14.5 35 10 30.5 10 24.5 C10 17.5 20 5 20 5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M15.5 24 C15.5 20.8 17.2 18.2 18.5 16" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
        </g>

        <g v-else-if="item.shape === 'furin-bell'">
          <path d="M11 18 C11 9 29 9 29 18 C29 21.5 27 23 20 23 C13 23 11 21.5 11 18 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <circle cx="20" cy="20" r="2" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="0.9" />
          <line x1="20" y1="22" x2="20" y2="27" :stroke="palette.stroke" stroke-width="1.2" />
          <rect x="16" y="27" width="8" height="11" rx="1.8" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'matcha-leaf'">
          <path d="M9 31 C11 14 21 8 32 8 C31 20 24 32 9 31 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M9 31 Q20 20 29 11" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" opacity="0.7" />
        </g>

        <g v-else-if="item.shape === 'white-blossom'">
          <circle cx="20" cy="11" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="28.5" cy="17.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="25.2" cy="27.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="14.8" cy="27.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="11.5" cy="17.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="20" cy="20" r="3.4" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'sakura-lantern'">
          <ellipse cx="20" cy="19" rx="11" ry="12.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <ellipse cx="20" cy="20" rx="5.2" ry="6.5" :fill="palette.tertiary" opacity="0.85" />
          <line x1="14" y1="7" x2="26" y2="7" :stroke="palette.stroke" stroke-width="2.2" stroke-linecap="round" />
          <line x1="14" y1="31" x2="26" y2="31" :stroke="palette.stroke" stroke-width="2.2" stroke-linecap="round" />
          <line x1="20" y1="32" x2="20" y2="38" :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'sakura-petal'">
          <path d="M20 7 C27 9 31 18 26 27 C23 31 20 34 20 34 C20 34 17 31 14 27 C9 18 13 9 20 7 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M20 7 L18.3 11.2 L20 10 L21.7 11.2 Z" fill="#ffffff" />
        </g>

        <g v-else-if="item.shape === 'tassel-charm'">
          <circle cx="20" cy="11" r="4.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M16 16 H24 L27 34 H13 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.2" stroke-linejoin="round" />
          <line x1="18" y1="18" x2="17" y2="33" :stroke="palette.stroke" stroke-width="1" opacity="0.55" />
          <line x1="22" y1="18" x2="23" y2="33" :stroke="palette.stroke" stroke-width="1" opacity="0.55" />
        </g>

        <g v-else-if="item.shape === 'maple-leaf'">
          <path d="M20 4 L23 13 L32 11 L26 19 L33 24 L23 26 L20 34 L17 26 L7 24 L14 19 L8 11 L17 13 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 11 V36" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'acorn'">
          <path d="M20 5 V10" :stroke="palette.stroke" stroke-width="2" stroke-linecap="round" />
          <path d="M9 17 C9 10 31 10 31 17 Z" :fill="palette.secondary" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M11 17 H29 C29 27 25 33 20 36 C15 33 11 27 11 17 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
        </g>

        <g v-else-if="item.shape === 'mini-coffee'">
          <path d="M15 8 Q14 11 16 13 M22 7 Q21 10 23 12" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" opacity="0.7" />
          <path d="M10 16 H27 V27 C27 31 24 34 18.5 34 C13 34 10 31 10 27 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M27 19 H30 C32.5 19 33.5 21 33.5 23 C33.5 25 32.5 27 30 27 H27" :stroke="palette.stroke" stroke-width="1.7" />
        </g>

        <g v-else-if="item.shape === 'honey-drop'">
          <path d="M20 5 C20 5 30 18 30 25 C30 30.8 25.5 35 20 35 C14.5 35 10 30.8 10 25 C10 18 20 5 20 5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <ellipse cx="16" cy="24" rx="2" ry="4" fill="#ffffff" opacity="0.78" />
        </g>

        <g v-else-if="item.shape === 'honey-pot'">
          <!-- Pot Madu Mungil dengan Bibir Lelehan Madu -->
          <rect x="13" y="8" width="14" height="4.5" rx="2.2" :fill="palette.secondary" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M11 14 H29 C32.5 18 33 27 28.5 32.5 C26.5 34.5 23.5 35.5 20 35.5 C16.5 35.5 13.5 34.5 11.5 32.5 C7 27 7.5 18 11 14 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M11.5 14 H28.5 V18.5 C26.5 18.5 25.5 22 23.5 22 C21.5 22 21 18.5 19 18.5 C17 18.5 16.5 21 14.8 21 C13 21 12.5 18 11.5 18 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1" />
          <ellipse cx="14.5" cy="26" rx="1.8" ry="3.4" fill="#ffffff" opacity="0.72" />
        </g>

        <g v-else-if="item.shape === 'honeycomb-hex'">
          <!-- Segienam Sarang Lebah Manis -->
          <polygon points="20,5 32,12 32,26 20,33 8,26 8,12" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <polygon points="20,11 26.5,14.8 26.5,23.2 20,27 13.5,23.2 13.5,14.8" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.1" opacity="0.85" />
        </g>

        <g v-else-if="item.shape === 'honey-dipper'">
          <!-- Sendok Madu (Honey Dipper) -->
          <line x1="20" y1="5" x2="20" y2="18" :stroke="palette.stroke" stroke-width="2.2" stroke-linecap="round" />
          <ellipse cx="20" cy="24.5" rx="7.5" ry="9" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <line x1="13.5" y1="21" x2="26.5" y2="21" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
          <line x1="13" y1="24.5" x2="27" y2="24.5" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
          <line x1="13.8" y1="28" x2="26.2" y2="28" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
          <path d="M20 33.5 C20 33.5 22 36 22 37.2 A2 2 0 0 1 18 37.2 C18 36 20 33.5 20 33.5 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'antique-key'">
          <circle cx="20" cy="12" r="6.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <circle cx="20" cy="12" r="2.4" fill="#ffffff" :stroke="palette.stroke" stroke-width="1" />
          <path d="M20 18.5 V34 M20 27 H26 M20 31.5 H25" :stroke="palette.stroke" stroke-width="2" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'jellyfish'">
          <path d="M8 19 C8 9 32 9 32 19 C28 22 12 22 8 19 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M13 21 Q11 28 14 35 M20 22 Q22 29 19 36 M27 21 Q29 28 26 35" :stroke="palette.stroke" stroke-width="1.5" stroke-linecap="round" />
          <ellipse cx="16" cy="14.5" rx="3" ry="1.5" fill="#ffffff" opacity="0.8" />
        </g>

        <g v-else-if="item.shape === 'pearl-shell'">
          <path d="M6 24 C6 11 34 11 34 24 L27 32 H13 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="22" r="4.2" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'starfish'">
          <path d="M20 5 L23.8 14.8 L34 15.6 L26 22.2 L28.6 32.5 L20 26.8 L11.4 32.5 L14 22.2 L6 15.6 L16.2 14.8 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="19.5" r="2.2" fill="#ffffff" opacity="0.85" />
        </g>

        <g v-else-if="item.shape === 'snowflake'">
          <g :stroke="palette.stroke" stroke-width="1.7" stroke-linecap="round">
            <line x1="20" y1="5" x2="20" y2="35" />
            <line x1="5" y1="20" x2="35" y2="20" />
            <line x1="9.5" y1="9.5" x2="30.5" y2="30.5" />
            <line x1="30.5" y1="9.5" x2="9.5" y2="30.5" />
          </g>
          <circle cx="20" cy="20" r="4.2" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'silver-bell'">
          <path d="M11 27 C11 16 14 10 20 10 C26 10 29 16 29 27 L32 30 H8 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="32.5" r="2.6" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'prism-crystal'">
          <polygon points="20,4 31,18 20,36 9,18" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <polyline points="9,18 20,21 31,18" :stroke="palette.stroke" stroke-width="1.1" opacity="0.7" />
          <line x1="20" y1="4" x2="20" y2="36" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />
        </g>

        <g v-else-if="item.shape === 'constellation'">
          <polyline points="8,24 16,13 25,18 33,10" :stroke="palette.stroke" stroke-width="1.3" stroke-dasharray="2 2" />
          <circle cx="8" cy="24" r="3" :fill="palette.primary" :stroke="palette.stroke" stroke-width="1.1" />
          <circle cx="16" cy="13" r="3.4" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.1" />
          <circle cx="25" cy="18" r="2.8" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="1.1" />
          <circle cx="33" cy="10" r="3.2" :fill="palette.primary" :stroke="palette.stroke" stroke-width="1.1" />
        </g>

        <g v-else-if="item.shape === 'cyber-star'">
          <path d="M20 4 L24 15 L36 16 L26 23 L29 35 L20 27.5 L11 35 L14 23 L4 16 L16 15 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 11 L22 18 L28 20 L22 22 L20 29 L18 22 L12 20 L18 18 Z" :fill="palette.secondary" />
        </g>

        <g v-else-if="item.shape === 'rainbow-cloud'">
          <path d="M9 26 A11 11 0 0 1 31 26" stroke="#f9a8d4" stroke-width="2.6" stroke-linecap="round" />
          <path d="M12.5 26 A7.5 7.5 0 0 1 27.5 26" stroke="#fde68a" stroke-width="2.4" stroke-linecap="round" />
          <path d="M16 26 A4 4 0 0 1 24 26" stroke="#93c5fd" stroke-width="2.2" stroke-linecap="round" />
          <path d="M7 31 H19 C21 31 22 29.5 22 27.8 C22 26 20.5 24.8 18.8 24.8 C17.8 22.8 15.2 22.2 13.5 23.5 C11.5 22.8 9 24.2 8.8 26.5 C7 27 6 28.2 6 29.4 C6 30.4 6.5 31 7 31 Z" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.2" />
          <path d="M21 31 H33 C34.5 31 35.5 29.8 35.5 28.2 C35.5 26.5 34.2 25.2 32.5 25.2 C31.5 23.2 29 22.6 27.2 23.8 C25.2 23.2 22.8 24.6 22.6 26.8 C21 27.2 20 28.5 20 29.6 C20 30.5 20.5 31 21 31 Z" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.2" />
        </g>
      </svg>
    </div>
  </div>

  <!-- 3 Gantungan Mini Bertali Pendek di Area Tengah Atas (tidak menutupi teks / tombol header) -->
  <div
    v-for="item in ornamentSet.topCenter"
    :key="item.id"
    class="animate-gentle-sway pointer-events-none absolute top-0 flex-col items-center opacity-90"
    :class="item.posClass"
    :style="{ '--sway-duration': item.swayDuration, '--sway-delay': item.swayDelay }"
  >
    <div
      class="w-[1.2px] rounded-full"
      :style="{ height: `${item.stringPx}px`, backgroundColor: palette.stringColor }"
    />
    <svg
      class="-mt-0.5 shrink-0"
      :style="{ width: `${item.sizePx}px`, height: `${item.sizePx}px`, filter: iconFilterStyle }"
      viewBox="0 0 40 40"
      fill="none"
    >
      <path
        v-if="item.shape === 'pastel-heart'"
        d="M20 34 C20 34 6 24.5 6 15.2 C6 10.2 9.8 7 14.2 7 C17 7 19 8.6 20 10.6 C21 8.6 23 7 25.8 7 C30.2 7 34 10.2 34 15.2 C34 24.5 20 34 20 34 Z"
        :fill="fillForTone(item.tone)"
        :stroke="palette.stroke"
        :stroke-width="strokeW"
      />
      <path
        v-else-if="item.shape === 'raindrop' || item.shape === 'honey-drop'"
        d="M20 5 C20 5 30 18 30 25 C30 30.8 25.5 35 20 35 C14.5 35 10 30.8 10 25 C10 18 20 5 20 5 Z"
        :fill="fillForTone(item.tone)"
        :stroke="palette.stroke"
        :stroke-width="strokeW"
      />
      <path
        v-else-if="item.shape === 'matcha-leaf' || item.shape === 'sakura-petal'"
        d="M10 30 C12 14 22 8 31 8 C30 20 23 31 10 30 Z"
        :fill="fillForTone(item.tone)"
        :stroke="palette.stroke"
        :stroke-width="strokeW"
      />
      <path
        v-else-if="item.shape === 'maple-leaf'"
        d="M20 5 L23 13 L32 11 L26 19 L33 24 L23 26 L20 34 L17 26 L7 24 L14 19 L8 11 L17 13 Z"
        :fill="fillForTone(item.tone)"
        :stroke="palette.stroke"
        :stroke-width="strokeW"
      />
      <polygon
        v-else-if="item.shape === 'honeycomb-hex'"
        points="20,5 32,12 32,26 20,33 8,26 8,12"
        :fill="fillForTone(item.tone)"
        :stroke="palette.stroke"
        :stroke-width="strokeW"
        stroke-linejoin="round"
      />
      <polygon
        v-else-if="item.shape === 'prism-crystal'"
        points="20,4 31,18 20,36 9,18"
        :fill="fillForTone(item.tone)"
        :stroke="palette.stroke"
        :stroke-width="strokeW"
      />
      <path
        v-else
        d="M20 4 L23.8 16.2 L36 20 L23.8 23.8 L20 36 L16.2 23.8 L4 20 L16.2 16.2 Z"
        :fill="fillForTone(item.tone)"
        :stroke="palette.stroke"
        :stroke-width="strokeW"
        stroke-linejoin="round"
      />
    </svg>
  </div>

  <!-- Gantungan Pojok Kanan (3–4 item melengkung / garland) -->
  <div class="pointer-events-none absolute right-1.5 top-0 flex items-start gap-2.5 sm:right-4 sm:gap-3.5 md:gap-4">
    <div
      v-for="item in ornamentSet.right"
      :key="item.id"
      class="animate-gentle-sway flex-col items-center"
      :class="
        item.hideOnTablet
          ? 'hidden lg:flex'
          : item.hideOnMobile
            ? 'hidden sm:flex'
            : 'flex'
      "
      :style="{ '--sway-duration': item.swayDuration, '--sway-delay': item.swayDelay }"
    >
      <div
        class="w-[1.5px] rounded-full"
        :style="{ height: `${item.stringPx}px`, backgroundColor: palette.stringColor }"
      />
      <svg
        class="-mt-0.5 shrink-0"
        :style="{ width: `${item.sizePx}px`, height: `${item.sizePx}px`, filter: iconFilterStyle }"
        viewBox="0 0 40 40"
        fill="none"
      >
        <g v-if="item.shape === 'crescent-moon'">
          <path d="M14 6 C22 7.5 28 14 28 21.5 C28 28.5 23 34 16.5 35.5 C25 36.2 32.5 29.8 33.2 21.8 C34 13.2 27.4 5.8 18.5 5.2 C16.8 5.1 15.3 5.4 14 6 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M12.5 17 L13.7 20.3 L17 21.5 L13.7 22.7 L12.5 26 L11.3 22.7 L8 21.5 L11.3 20.3 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'four-star'">
          <path d="M20 4 L23.5 16.5 L36 20 L23.5 23.5 L20 36 L16.5 23.5 L4 20 L16.5 16.5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="20" r="2.2" fill="#ffffff" opacity="0.9" />
        </g>

        <g v-else-if="item.shape === 'sparkle-star'">
          <path d="M20 5 L22.8 14.5 L32 17 L22.8 19.5 L20 29 L17.2 19.5 L8 17 L17.2 14.5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="10" cy="10" r="2" :fill="palette.secondary" />
          <circle cx="30" cy="28" r="1.8" :fill="palette.tertiary" />
        </g>

        <g v-else-if="item.shape === 'star-five'">
          <path d="M20 4 L24.2 14.4 L35.2 15.2 L26.8 22.4 L29.4 33.4 L20 27.6 L10.6 33.4 L13.2 22.4 L4.8 15.2 L15.8 14.4 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="17.5" cy="17.5" r="2" fill="#ffffff" opacity="0.88" />
        </g>

        <g v-else-if="item.shape === 'pastel-heart'">
          <path d="M20 34 C20 34 6 24.5 6 15.2 C6 10.2 9.8 7 14.2 7 C17 7 19 8.6 20 10.6 C21 8.6 23 7 25.8 7 C30.2 7 34 10.2 34 15.2 C34 24.5 20 34 20 34 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <ellipse cx="14" cy="14" rx="2.8" ry="1.6" transform="rotate(-25 14 14)" fill="#ffffff" opacity="0.85" />
        </g>

        <g v-else-if="item.shape === 'sakura-star'">
          <circle cx="20" cy="10.5" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="29" cy="17.2" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="25.5" cy="28" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="14.5" cy="28" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="11" cy="17.2" r="5.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
          <circle cx="20" cy="20" r="3.6" :fill="palette.secondary" />
        </g>

        <g v-else-if="item.shape === 'pink-bow'">
          <path d="M20 20 L8 12 C5 16 5 24 8 28 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 20 L32 12 C35 16 35 24 32 28 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M18 22 L13 34 M22 22 L27 34" :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="20" cy="20" r="3.8" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'fluffy-cloud' || item.shape === 'sky-cloud'">
          <path d="M11 28 H29 C33 28 36 25.2 36 21.5 C36 18 33.4 15.2 30 14.8 C28.6 10.4 24.4 7.5 19.6 8 C14.6 8.5 11 12.4 10.6 17 C7.4 17.8 5 20.2 5 23 C5 25.8 7.5 28 11 28 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="16.5" cy="20" r="1.2" :fill="palette.stroke" opacity="0.65" />
          <circle cx="23.5" cy="20" r="1.2" :fill="palette.stroke" opacity="0.65" />
        </g>

        <g v-else-if="item.shape === 'ice-crystal'">
          <g :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round">
            <line x1="20" y1="5" x2="20" y2="35" />
            <line x1="7" y1="12.5" x2="33" y2="27.5" />
            <line x1="33" y1="12.5" x2="7" y2="27.5" />
          </g>
          <polygon points="20,12 26,20 20,28 14,20" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.3" />
        </g>

        <g v-else-if="item.shape === 'rain-cloud'">
          <path d="M10 22 H30 C33.5 22 36 19.5 36 16.5 C36 13.5 33.6 11 30.5 10.8 C29.2 7 25.5 5 21.2 5.6 C17 6 14 9 13.5 12.6 C10.2 13 7.5 15 7.5 17.6 C7.5 20.2 8.6 22 10 22 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M14 27 C14 27 11.8 30.8 11.8 32.3 A2.2 2.2 0 0 0 16.2 32.3 C16.2 30.8 14 27 14 27 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
          <path d="M21 29 C21 29 18.8 32.8 18.8 34.3 A2.2 2.2 0 0 0 23.2 34.3 C23.2 32.8 21 29 21 29 Z" :fill="palette.primary" :stroke="palette.stroke" stroke-width="0.9" />
          <path d="M28 27 C28 27 25.8 30.8 25.8 32.3 A2.2 2.2 0 0 0 30.2 32.3 C30.2 30.8 28 27 28 27 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'mini-umbrella'">
          <path d="M6 21 C6 11 34 11 34 21 Q29 17.5 24.5 21 Q20 17.5 15.5 21 Q11 17.5 6 21 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 20 V32 C20 35 24.5 35 24.5 32.5" :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round" />
          <line x1="20" y1="8" x2="20" y2="11.5" :stroke="palette.stroke" stroke-width="1.6" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'raindrop'">
          <path d="M20 5 C20 5 30 17.5 30 24.5 C30 30.5 25.5 35 20 35 C14.5 35 10 30.5 10 24.5 C10 17.5 20 5 20 5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M15.5 24 C15.5 20.8 17.2 18.2 18.5 16" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
        </g>

        <g v-else-if="item.shape === 'furin-bell'">
          <path d="M11 18 C11 9 29 9 29 18 C29 21.5 27 23 20 23 C13 23 11 21.5 11 18 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <circle cx="20" cy="20" r="2" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="0.9" />
          <line x1="20" y1="22" x2="20" y2="27" :stroke="palette.stroke" stroke-width="1.2" />
          <rect x="16" y="27" width="8" height="11" rx="1.8" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'matcha-leaf'">
          <path d="M31 31 C29 14 19 8 8 8 C9 20 16 32 31 31 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M31 31 Q20 20 11 11" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" opacity="0.7" />
        </g>

        <g v-else-if="item.shape === 'white-blossom'">
          <circle cx="20" cy="11" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="28.5" cy="17.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="25.2" cy="27.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="14.8" cy="27.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="11.5" cy="17.5" r="5" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.15" />
          <circle cx="20" cy="20" r="3.4" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'sakura-lantern'">
          <ellipse cx="20" cy="19" rx="11" ry="12.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <ellipse cx="20" cy="20" rx="5.2" ry="6.5" :fill="palette.tertiary" opacity="0.85" />
          <line x1="14" y1="7" x2="26" y2="7" :stroke="palette.stroke" stroke-width="2.2" stroke-linecap="round" />
          <line x1="14" y1="31" x2="26" y2="31" :stroke="palette.stroke" stroke-width="2.2" stroke-linecap="round" />
          <line x1="20" y1="32" x2="20" y2="38" :stroke="palette.stroke" stroke-width="1.8" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'sakura-petal'">
          <path d="M20 7 C27 9 31 18 26 27 C23 31 20 34 20 34 C20 34 17 31 14 27 C9 18 13 9 20 7 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M20 7 L18.3 11.2 L20 10 L21.7 11.2 Z" fill="#ffffff" />
        </g>

        <g v-else-if="item.shape === 'tassel-charm'">
          <circle cx="20" cy="11" r="4.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M16 16 H24 L27 34 H13 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.2" stroke-linejoin="round" />
          <line x1="18" y1="18" x2="17" y2="33" :stroke="palette.stroke" stroke-width="1" opacity="0.55" />
          <line x1="22" y1="18" x2="23" y2="33" :stroke="palette.stroke" stroke-width="1" opacity="0.55" />
        </g>

        <g v-else-if="item.shape === 'maple-leaf'">
          <path d="M20 4 L23 13 L32 11 L26 19 L33 24 L23 26 L20 34 L17 26 L7 24 L14 19 L8 11 L17 13 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 11 V36" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'acorn'">
          <path d="M20 5 V10" :stroke="palette.stroke" stroke-width="2" stroke-linecap="round" />
          <path d="M9 17 C9 10 31 10 31 17 Z" :fill="palette.secondary" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M11 17 H29 C29 27 25 33 20 36 C15 33 11 27 11 17 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
        </g>

        <g v-else-if="item.shape === 'mini-coffee'">
          <path d="M15 8 Q14 11 16 13 M22 7 Q21 10 23 12" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" opacity="0.7" />
          <path d="M10 16 H27 V27 C27 31 24 34 18.5 34 C13 34 10 31 10 27 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M27 19 H30 C32.5 19 33.5 21 33.5 23 C33.5 25 32.5 27 30 27 H27" :stroke="palette.stroke" stroke-width="1.7" />
        </g>

        <g v-else-if="item.shape === 'honey-drop'">
          <path d="M20 5 C20 5 30 18 30 25 C30 30.8 25.5 35 20 35 C14.5 35 10 30.8 10 25 C10 18 20 5 20 5 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <ellipse cx="16" cy="24" rx="2" ry="4" fill="#ffffff" opacity="0.78" />
        </g>

        <g v-else-if="item.shape === 'honey-pot'">
          <!-- Pot Madu Mungil dengan Bibir Lelehan Madu -->
          <rect x="13" y="8" width="14" height="4.5" rx="2.2" :fill="palette.secondary" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M11 14 H29 C32.5 18 33 27 28.5 32.5 C26.5 34.5 23.5 35.5 20 35.5 C16.5 35.5 13.5 34.5 11.5 32.5 C7 27 7.5 18 11 14 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M11.5 14 H28.5 V18.5 C26.5 18.5 25.5 22 23.5 22 C21.5 22 21 18.5 19 18.5 C17 18.5 16.5 21 14.8 21 C13 21 12.5 18 11.5 18 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1" />
          <ellipse cx="14.5" cy="26" rx="1.8" ry="3.4" fill="#ffffff" opacity="0.72" />
        </g>

        <g v-else-if="item.shape === 'honeycomb-hex'">
          <!-- Segienam Sarang Lebah Manis -->
          <polygon points="20,5 32,12 32,26 20,33 8,26 8,12" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <polygon points="20,11 26.5,14.8 26.5,23.2 20,27 13.5,23.2 13.5,14.8" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.1" opacity="0.85" />
        </g>

        <g v-else-if="item.shape === 'honey-dipper'">
          <!-- Sendok Madu (Honey Dipper) -->
          <line x1="20" y1="5" x2="20" y2="18" :stroke="palette.stroke" stroke-width="2.2" stroke-linecap="round" />
          <ellipse cx="20" cy="24.5" rx="7.5" ry="9" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <line x1="13.5" y1="21" x2="26.5" y2="21" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
          <line x1="13" y1="24.5" x2="27" y2="24.5" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
          <line x1="13.8" y1="28" x2="26.2" y2="28" :stroke="palette.stroke" stroke-width="1.3" stroke-linecap="round" />
          <path d="M20 33.5 C20 33.5 22 36 22 37.2 A2 2 0 0 1 18 37.2 C18 36 20 33.5 20 33.5 Z" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="0.9" />
        </g>

        <g v-else-if="item.shape === 'antique-key'">
          <circle cx="20" cy="12" r="6.5" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <circle cx="20" cy="12" r="2.4" fill="#ffffff" :stroke="palette.stroke" stroke-width="1" />
          <path d="M20 18.5 V34 M20 27 H14 M20 31.5 H15" :stroke="palette.stroke" stroke-width="2" stroke-linecap="round" />
        </g>

        <g v-else-if="item.shape === 'jellyfish'">
          <path d="M8 19 C8 9 32 9 32 19 C28 22 12 22 8 19 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" />
          <path d="M13 21 Q11 28 14 35 M20 22 Q22 29 19 36 M27 21 Q29 28 26 35" :stroke="palette.stroke" stroke-width="1.5" stroke-linecap="round" />
          <ellipse cx="16" cy="14.5" rx="3" ry="1.5" fill="#ffffff" opacity="0.8" />
        </g>

        <g v-else-if="item.shape === 'pearl-shell'">
          <path d="M6 24 C6 11 34 11 34 24 L27 32 H13 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="22" r="4.2" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'starfish'">
          <path d="M20 5 L23.8 14.8 L34 15.6 L26 22.2 L28.6 32.5 L20 26.8 L11.4 32.5 L14 22.2 L6 15.6 L16.2 14.8 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="19.5" r="2.2" fill="#ffffff" opacity="0.85" />
        </g>

        <g v-else-if="item.shape === 'snowflake'">
          <g :stroke="palette.stroke" stroke-width="1.7" stroke-linecap="round">
            <line x1="20" y1="5" x2="20" y2="35" />
            <line x1="5" y1="20" x2="35" y2="20" />
            <line x1="9.5" y1="9.5" x2="30.5" y2="30.5" />
            <line x1="30.5" y1="9.5" x2="9.5" y2="30.5" />
          </g>
          <circle cx="20" cy="20" r="4.2" :fill="fillForTone(item.tone)" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'silver-bell'">
          <path d="M11 27 C11 16 14 10 20 10 C26 10 29 16 29 27 L32 30 H8 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <circle cx="20" cy="32.5" r="2.6" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.2" />
        </g>

        <g v-else-if="item.shape === 'prism-crystal'">
          <polygon points="20,4 31,18 20,36 9,18" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <polyline points="9,18 20,21 31,18" :stroke="palette.stroke" stroke-width="1.1" opacity="0.7" />
          <line x1="20" y1="4" x2="20" y2="36" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />
        </g>

        <g v-else-if="item.shape === 'constellation'">
          <polyline points="32,24 24,13 15,18 7,10" :stroke="palette.stroke" stroke-width="1.3" stroke-dasharray="2 2" />
          <circle cx="32" cy="24" r="3" :fill="palette.primary" :stroke="palette.stroke" stroke-width="1.1" />
          <circle cx="24" cy="13" r="3.4" :fill="palette.secondary" :stroke="palette.stroke" stroke-width="1.1" />
          <circle cx="15" cy="18" r="2.8" :fill="palette.tertiary" :stroke="palette.stroke" stroke-width="1.1" />
          <circle cx="7" cy="10" r="3.2" :fill="palette.primary" :stroke="palette.stroke" stroke-width="1.1" />
        </g>

        <g v-else-if="item.shape === 'cyber-star'">
          <path d="M20 4 L24 15 L36 16 L26 23 L29 35 L20 27.5 L11 35 L14 23 L4 16 L16 15 Z" :fill="fillForTone(item.tone)" :stroke="palette.stroke" :stroke-width="strokeW" stroke-linejoin="round" />
          <path d="M20 11 L22 18 L28 20 L22 22 L20 29 L18 22 L12 20 L18 18 Z" :fill="palette.secondary" />
        </g>

        <g v-else-if="item.shape === 'rainbow-cloud'">
          <path d="M9 26 A11 11 0 0 1 31 26" stroke="#f9a8d4" stroke-width="2.6" stroke-linecap="round" />
          <path d="M12.5 26 A7.5 7.5 0 0 1 27.5 26" stroke="#fde68a" stroke-width="2.4" stroke-linecap="round" />
          <path d="M16 26 A4 4 0 0 1 24 26" stroke="#93c5fd" stroke-width="2.2" stroke-linecap="round" />
          <path d="M7 31 H19 C21 31 22 29.5 22 27.8 C22 26 20.5 24.8 18.8 24.8 C17.8 22.8 15.2 22.2 13.5 23.5 C11.5 22.8 9 24.2 8.8 26.5 C7 27 6 28.2 6 29.4 C6 30.4 6.5 31 7 31 Z" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.2" />
          <path d="M21 31 H33 C34.5 31 35.5 29.8 35.5 28.2 C35.5 26.5 34.2 25.2 32.5 25.2 C31.5 23.2 29 22.6 27.2 23.8 C25.2 23.2 22.8 24.6 22.6 26.8 C21 27.2 20 28.5 20 29.6 C20 30.5 20.5 31 21 31 Z" fill="#ffffff" :stroke="palette.stroke" stroke-width="1.2" />
        </g>
      </svg>
    </div>
  </div>
</template>
