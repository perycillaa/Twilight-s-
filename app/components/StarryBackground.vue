<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  type CozyThemeId,
  type ThemeName,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Ambil tema header, Mode Gelap, Tema Latar Belakang Beranimasi, status Hujan Lembut, & Kualitas Grafik
const {
  theme,
  isDarkTheme,
  activeCozyTheme,
  isRainAmbientOn,
  graphicsQuality,
  graphicsConfig,
} = useTwilightStorage()

const isLowGraphics = computed<boolean>(() => graphicsQuality.value === 'low')

/** Helper memangkas jumlah partikel sesuai kualitas grafik: Ringan=0%, Sedang=50%, Tinggi=100% */
function scaleParticles<T>(items: T[]): T[] {
  const scale = graphicsConfig.value.particleScale
  if (scale <= 0) return []
  if (scale >= 1) return items
  return items.slice(0, Math.max(1, Math.ceil(items.length * scale)))
}

interface BgPalette {
  gradient: string
  orb1: string
  orb2: string
  orb3: string
  moon: string
  charmAccent: string
  cloudFill: string
  tailGradient: string
}

const themeBgConfig: Record<ThemeName, BgPalette> = {
  twilight: {
    gradient: 'from-[#1e1b4b] via-[#261647] to-[#311042]',
    orb1: 'bg-pink-400/20',
    orb2: 'bg-purple-500/20',
    orb3: 'bg-indigo-400/15',
    moon: '#fef08a',
    charmAccent: '#f9a8d4',
    cloudFill: '#e9d5ff',
    tailGradient: 'from-white via-pink-200 to-transparent',
  },
  // Tema Pink Default: Pastel Berry / Cotton Candy Sunset (gradasi pink pastel lembut ke peach-rose, tanpa sakura)
  sakura: {
    gradient: 'from-[#5a2248] via-[#8f3d67] to-[#c26d75]',
    orb1: 'bg-pink-300/25',
    orb2: 'bg-orange-200/20',
    orb3: 'bg-rose-300/20',
    moon: '#fef3c7',
    charmAccent: '#fda4af',
    cloudFill: '#ffe4e6',
    tailGradient: 'from-white via-orange-100 to-transparent',
  },
  // Tema Biru Default: Ocean Night (#13243A -> #1E3A5F)
  ocean: {
    gradient: 'from-[#13243a] via-[#182f4d] to-[#1e3a5f]',
    orb1: 'bg-sky-400/20',
    orb2: 'bg-cyan-400/18',
    orb3: 'bg-blue-400/15',
    moon: '#e0f2fe',
    charmAccent: '#7dd3fc',
    cloudFill: '#bae6fd',
    tailGradient: 'from-[#f0f9ff] via-sky-300 to-transparent',
  },
}

// Varian Mode Gelap (🌙 Midnight / Dark Variant) untuk ketiga tema warna utama
const themeDarkBgConfig: Record<ThemeName, BgPalette> = {
  twilight: {
    gradient: 'from-[#120b1e] via-[#170e27] to-[#1d1230]',
    orb1: 'bg-purple-500/15',
    orb2: 'bg-fuchsia-500/12',
    orb3: 'bg-indigo-500/12',
    moon: '#fef08a',
    charmAccent: '#f9a8d4',
    cloudFill: '#c4b5fd',
    tailGradient: 'from-white via-purple-200 to-transparent',
  },
  sakura: {
    gradient: 'from-[#1a0d16] via-[#22101c] to-[#2b1422]',
    orb1: 'bg-rose-400/15',
    orb2: 'bg-orange-300/12',
    orb3: 'bg-pink-400/12',
    moon: '#fde68a',
    charmAccent: '#fda4af',
    cloudFill: '#fecdd3',
    tailGradient: 'from-white via-rose-200 to-transparent',
  },
  ocean: {
    gradient: 'from-[#09111e] via-[#0d1729] to-[#101e33]',
    orb1: 'bg-sky-500/14',
    orb2: 'bg-cyan-500/12',
    orb3: 'bg-blue-500/12',
    moon: '#e0f2fe',
    charmAccent: '#7dd3fc',
    cloudFill: '#7dd3fc',
    tailGradient: 'from-[#f0f9ff] via-sky-300 to-transparent',
  },
}

const cozyBgConfig: Record<Exclude<CozyThemeId, 'classic'>, BgPalette> = {
  'midnight-rain': {
    gradient: 'from-[#070b22] via-[#10183d] to-[#1a224d]',
    orb1: 'bg-indigo-500/20',
    orb2: 'bg-sky-500/15',
    orb3: 'bg-amber-400/10',
    moon: '#e0f2fe',
    charmAccent: '#93c5fd',
    cloudFill: '#94a3b8',
    tailGradient: 'from-white via-sky-200 to-transparent',
  },
  'autumn-cafe': {
    gradient: 'from-[#28150d] via-[#4a2617] to-[#7c3d1e]',
    orb1: 'bg-amber-500/20',
    orb2: 'bg-orange-400/20',
    orb3: 'bg-yellow-300/15',
    moon: '#fde68a',
    charmAccent: '#fdba74',
    cloudFill: '#fed7aa',
    tailGradient: 'from-[#fff7ed] via-amber-200 to-transparent',
  },
  'sakura-lantern': {
    gradient: 'from-[#240e38] via-[#4b174d] to-[#7a2356]',
    orb1: 'bg-fuchsia-400/20',
    orb2: 'bg-pink-400/20',
    orb3: 'bg-amber-300/18',
    moon: '#fef08a',
    charmAccent: '#f9a8d4',
    cloudFill: '#fbcfe8',
    tailGradient: 'from-white via-pink-200 to-transparent',
  },
  'astral-palace': {
    gradient: 'from-[#04071a] via-[#0b1336] to-[#1b1042]',
    orb1: 'bg-emerald-400/15',
    orb2: 'bg-cyan-400/15',
    orb3: 'bg-amber-300/15',
    moon: '#f1f5f9',
    charmAccent: '#fde047',
    cloudFill: '#cbd5e1',
    tailGradient: 'from-[#fef9c3] via-amber-200 to-transparent',
  },
  'matcha-garden': {
    gradient: 'from-[#16261e] via-[#1d3228] to-[#253d31]',
    orb1: 'bg-emerald-300/14',
    orb2: 'bg-lime-200/12',
    orb3: 'bg-teal-300/12',
    moon: '#ecfdf5',
    charmAccent: '#86efac',
    cloudFill: '#bbf7d0',
    tailGradient: 'from-[#f7fee7] via-emerald-200 to-transparent',
  },
  'biolum-ocean': {
    gradient: 'from-[#020f14] via-[#062833] to-[#0a3d4c]',
    orb1: 'bg-[#00f5d4]/14',
    orb2: 'bg-[#22d3ee]/14',
    orb3: 'bg-teal-400/12',
    moon: '#5eead4',
    charmAccent: '#2dd4bf',
    cloudFill: '#67e8f9',
    tailGradient: 'from-[#00f5d4] via-cyan-300 to-transparent',
  },
  'honey-library': {
    gradient: 'from-[#241710] via-[#311f14] to-[#3d2618]',
    orb1: 'bg-amber-400/18',
    orb2: 'bg-yellow-300/14',
    orb3: 'bg-orange-400/12',
    moon: '#fef3c7',
    charmAccent: '#fbbf24',
    cloudFill: '#fde68a',
    tailGradient: 'from-[#fffbeb] via-amber-300 to-transparent',
  },
  'pastel-cloudland': {
    gradient: 'from-[#27294a] via-[#35345c] to-[#433e6e]',
    orb1: 'bg-pink-300/20',
    orb2: 'bg-indigo-300/18',
    orb3: 'bg-sky-300/16',
    moon: '#fdf2f8',
    charmAccent: '#f9a8d4',
    cloudFill: '#f5d0fe',
    tailGradient: 'from-[#ffffff] via-pink-200 to-transparent',
  },
  'winter-frost': {
    gradient: 'from-[#152536] via-[#1d334a] to-[#26415e]',
    orb1: 'bg-sky-300/16',
    orb2: 'bg-cyan-200/14',
    orb3: 'bg-blue-300/15',
    moon: '#f0f9ff',
    charmAccent: '#bae6fd',
    cloudFill: '#e0f2fe',
    tailGradient: 'from-[#ffffff] via-sky-200 to-transparent',
  },
  'neon-night-city': {
    gradient: 'from-[#090514] via-[#110824] to-[#170b2e]',
    orb1: 'bg-[#00f5d4]/15',
    orb2: 'bg-[#ff2a85]/16',
    orb3: 'bg-purple-500/16',
    moon: '#e0f2fe',
    charmAccent: '#00f5d4',
    cloudFill: '#a855f7',
    tailGradient: 'from-[#00f5d4] via-[#ff2a85] to-transparent',
  },
}

// Varian Mode Terang Pastel (☀️ Daylight / Pastel Vibe — lembut & tidak silau) untuk 3 tema dasar
const themeLightBgConfig: Record<ThemeName, BgPalette> = {
  twilight: {
    gradient: 'from-[#f3e8ff] via-[#f8eafb] to-[#fce7f3]',
    orb1: 'bg-purple-300/35',
    orb2: 'bg-pink-300/35',
    orb3: 'bg-indigo-200/35',
    moon: '#7c3aed',
    charmAccent: '#a855f7',
    cloudFill: '#ffffff',
    tailGradient: 'from-[#7c3aed] via-pink-400 to-transparent',
  },
  sakura: {
    gradient: 'from-[#ffe4e6] via-[#ffedd5] to-[#fed7aa]',
    orb1: 'bg-rose-300/35',
    orb2: 'bg-orange-200/40',
    orb3: 'bg-pink-200/35',
    moon: '#be123c',
    charmAccent: '#f43f5e',
    cloudFill: '#fff7ed',
    tailGradient: 'from-[#be123c] via-orange-400 to-transparent',
  },
  ocean: {
    gradient: 'from-[#e0f2fe] via-[#d0ecfe] to-[#bae6fd]',
    orb1: 'bg-sky-300/35',
    orb2: 'bg-cyan-200/35',
    orb3: 'bg-blue-200/35',
    moon: '#0284c7',
    charmAccent: '#0ea5e9',
    cloudFill: '#ffffff',
    tailGradient: 'from-[#0284c7] via-sky-400 to-transparent',
  },
}

// Varian Mode Terang Pastel (☀️ Daylight / Pastel Vibe) untuk SELURUH 10 Tema Toko & Milestone
const cozyLightBgConfig: Record<Exclude<CozyThemeId, 'classic'>, BgPalette> = {
  'matcha-garden': {
    gradient: 'from-[#dcfce7] via-[#ccf7dc] to-[#bbf7d0]',
    orb1: 'bg-emerald-300/35',
    orb2: 'bg-lime-200/40',
    orb3: 'bg-teal-200/30',
    moon: '#15803d',
    charmAccent: '#16a34a',
    cloudFill: '#ffffff',
    tailGradient: 'from-[#15803d] via-emerald-400 to-transparent',
  },
  'biolum-ocean': {
    gradient: 'from-[#cffafe] via-[#b7f5fc] to-[#a5f3fc]',
    orb1: 'bg-cyan-300/35',
    orb2: 'bg-teal-200/40',
    orb3: 'bg-sky-200/35',
    moon: '#0e7490',
    charmAccent: '#0d9488',
    cloudFill: '#ecfeff',
    tailGradient: 'from-[#0e7490] via-teal-400 to-transparent',
  },
  'sakura-lantern': {
    gradient: 'from-[#fce7f3] via-[#fbd8ec] to-[#fbcfe8]',
    orb1: 'bg-pink-300/35',
    orb2: 'bg-rose-200/40',
    orb3: 'bg-amber-200/30',
    moon: '#be185d',
    charmAccent: '#db2777',
    cloudFill: '#fff1f2',
    tailGradient: 'from-[#be185d] via-pink-400 to-transparent',
  },
  'autumn-cafe': {
    gradient: 'from-[#fef3c7] via-[#fdeab1] to-[#fde68a]',
    orb1: 'bg-amber-300/35',
    orb2: 'bg-orange-200/40',
    orb3: 'bg-yellow-200/35',
    moon: '#b45309',
    charmAccent: '#d97706',
    cloudFill: '#fffbeb',
    tailGradient: 'from-[#b45309] via-amber-500 to-transparent',
  },
  'honey-library': {
    gradient: 'from-[#fef3c7] via-[#feefc0] to-[#fde68a]',
    orb1: 'bg-amber-300/35',
    orb2: 'bg-yellow-200/40',
    orb3: 'bg-orange-200/30',
    moon: '#b45309',
    charmAccent: '#d97706',
    cloudFill: '#fffbeb',
    tailGradient: 'from-[#b45309] via-yellow-500 to-transparent',
  },
  'pastel-cloudland': {
    gradient: 'from-[#e0f2fe] via-[#ddeafe] to-[#dbeafe]',
    orb1: 'bg-sky-300/35',
    orb2: 'bg-indigo-200/35',
    orb3: 'bg-pink-200/30',
    moon: '#1d4ed8',
    charmAccent: '#3b82f6',
    cloudFill: '#ffffff',
    tailGradient: 'from-[#1d4ed8] via-sky-400 to-transparent',
  },
  'winter-frost': {
    gradient: 'from-[#e0f2fe] via-[#e4f1fe] to-[#dbeafe]',
    orb1: 'bg-sky-200/40',
    orb2: 'bg-cyan-200/35',
    orb3: 'bg-blue-200/35',
    moon: '#1d4ed8',
    charmAccent: '#0284c7',
    cloudFill: '#ffffff',
    tailGradient: 'from-[#1d4ed8] via-cyan-400 to-transparent',
  },
  'midnight-rain': {
    gradient: 'from-[#dbeafe] via-[#dfe7fd] to-[#e0e7ff]',
    orb1: 'bg-blue-300/35',
    orb2: 'bg-indigo-200/35',
    orb3: 'bg-sky-200/35',
    moon: '#1d4ed8',
    charmAccent: '#2563eb',
    cloudFill: '#f8fafc',
    tailGradient: 'from-[#1d4ed8] via-blue-400 to-transparent',
  },
  'astral-palace': {
    gradient: 'from-[#ede9fe] via-[#e0effe] to-[#cffafe]',
    orb1: 'bg-purple-300/35',
    orb2: 'bg-emerald-200/35',
    orb3: 'bg-cyan-200/35',
    moon: '#7e22ce',
    charmAccent: '#059669',
    cloudFill: '#ffffff',
    tailGradient: 'from-[#7e22ce] via-emerald-400 to-transparent',
  },
  'neon-night-city': {
    gradient: 'from-[#ede9fe] via-[#e8e7fe] to-[#cffafe]',
    orb1: 'bg-fuchsia-300/35',
    orb2: 'bg-cyan-300/35',
    orb3: 'bg-violet-200/35',
    moon: '#7e22ce',
    charmAccent: '#db2777',
    cloudFill: '#f5f3ff',
    tailGradient: 'from-[#7e22ce] via-cyan-400 to-transparent',
  },
}

const activeBg = computed<BgPalette>(() => {
  if (activeCozyTheme.value !== 'classic') {
    return isDarkTheme.value
      ? cozyBgConfig[activeCozyTheme.value]
      : cozyLightBgConfig[activeCozyTheme.value]
  }
  const map = isDarkTheme.value ? themeBgConfig : themeLightBgConfig
  return map[theme.value] ?? map.twilight
})

// Cahaya bokeh lembut khusus tema Pastel Berry / Cotton Candy Sunset (tanpa kelopak sakura)
const pastelBerryBokeh = [
  { top: '14%', left: '12%', size: 46, color: 'bg-pink-200/25', opacity: 0.3, duration: '7.4s', delay: '0s', dx: '8px' },
  { top: '26%', left: '78%', size: 58, color: 'bg-orange-200/25', opacity: 0.28, duration: '8.2s', delay: '1.1s', dx: '-10px' },
  { top: '52%', left: '8%', size: 40, color: 'bg-rose-200/25', opacity: 0.28, duration: '6.8s', delay: '0.6s', dx: '7px' },
  { top: '66%', left: '86%', size: 52, color: 'bg-amber-100/25', opacity: 0.26, duration: '7.9s', delay: '1.8s', dx: '-8px' },
  { top: '80%', left: '24%', size: 64, color: 'bg-pink-300/20', opacity: 0.25, duration: '8.6s', delay: '0.4s', dx: '10px' },
  { top: '74%', left: '62%', size: 36, color: 'bg-orange-100/30', opacity: 0.28, duration: '6.5s', delay: '2.1s', dx: '-6px' },
  { top: '38%', left: '48%', size: 44, color: 'bg-rose-100/20', opacity: 0.24, duration: '7.2s', delay: '1.4s', dx: '9px' },
  { top: '18%', left: '54%', size: 32, color: 'bg-amber-200/25', opacity: 0.26, duration: '6.9s', delay: '2.4s', dx: '-7px' },
]

const displayedPastelBerryBokeh = computed(() => scaleParticles(pastelBerryBokeh))

// Tampilkan awan langit hanya pada tema yang cocok (sembunyikan di laut dalam, kafe, perpustakaan indoor, kota neon & matcha)
const showSkyClouds = computed<boolean>(() => {
  const c = activeCozyTheme.value
  return (
    c === 'classic' ||
    c === 'midnight-rain' ||
    c === 'sakura-lantern' ||
    c === 'pastel-cloudland' ||
    c === 'winter-frost' ||
    c === 'astral-palace'
  )
})

// Sembunyikan bintang langit & bintang jatuh pada latar bawah laut, ruang dalam perpustakaan, dan kebun matcha
const showSkyStarsAndMeteors = computed<boolean>(() => {
  const c = activeCozyTheme.value
  return c !== 'biolum-ocean' && c !== 'honey-library' && c !== 'matcha-garden'
})

// Tampilkan hujan apabila tema Midnight Rainy Window aktif ATAU sakelar Hujan Lembut di BGM Player menyala (nonaktif di Grafik Ringan)
const showRainLayer = computed<boolean>(() => {
  if (isLowGraphics.value) return false
  return activeCozyTheme.value === 'midnight-rain' || isRainAmbientOn.value
})

// Daftar bintang kecil berkedip statis (aman untuk SSR tanpa hydration mismatch)
const tinyStars = [
  { top: '6%', left: '8%', size: 3, duration: '3.2s', delay: '0.2s' },
  { top: '12%', left: '24%', size: 2, duration: '4.1s', delay: '1.1s' },
  { top: '8%', left: '42%', size: 3, duration: '3.7s', delay: '0.5s' },
  { top: '16%', left: '61%', size: 2, duration: '4.5s', delay: '1.7s' },
  { top: '9%', left: '78%', size: 3, duration: '3.4s', delay: '0.8s' },
  { top: '19%', left: '91%', size: 2, duration: '4.0s', delay: '2.0s' },
  { top: '28%', left: '14%', size: 2, duration: '3.9s', delay: '1.4s' },
  { top: '34%', left: '36%', size: 3, duration: '4.8s', delay: '0.3s' },
  { top: '31%', left: '53%', size: 2, duration: '3.3s', delay: '2.2s' },
  { top: '27%', left: '84%', size: 3, duration: '4.2s', delay: '0.9s' },
  { top: '46%', left: '6%', size: 2, duration: '3.6s', delay: '1.6s' },
  { top: '52%', left: '95%', size: 3, duration: '4.4s', delay: '0.4s' },
  { top: '63%', left: '18%', size: 2, duration: '3.8s', delay: '1.9s' },
  { top: '71%', left: '44%', size: 2, duration: '4.6s', delay: '0.7s' },
  { top: '68%', left: '75%', size: 3, duration: '3.5s', delay: '1.3s' },
  { top: '82%', left: '10%', size: 3, duration: '4.3s', delay: '2.1s' },
  { top: '88%', left: '31%', size: 2, duration: '3.1s', delay: '0.6s' },
  { top: '85%', left: '66%', size: 2, duration: '4.7s', delay: '1.5s' },
  { top: '91%', left: '88%', size: 3, duration: '3.9s', delay: '1.0s' },
  { top: '42%', left: '70%', size: 2, duration: '4.1s', delay: '2.4s' },
  { top: '22%', left: '48%', size: 2, duration: '3.5s', delay: '1.1s' },
  { top: '58%', left: '82%', size: 3, duration: '4.2s', delay: '0.7s' },
]

// Bintang sparkle 4-sisi menggemaskan
const sparkles = [
  { top: '11%', left: '17%', size: 16, delay: '0.4s', color: '#fbcfe8' },
  { top: '14%', left: '72%', size: 18, delay: '1.2s', color: '#e9d5ff' },
  { top: '39%', left: '92%', size: 14, delay: '0.9s', color: '#fde68a' },
  { top: '77%', left: '5%', size: 16, delay: '1.8s', color: '#f9a8d4' },
  { top: '89%', left: '52%', size: 15, delay: '0.2s', color: '#bae6fd' },
]

// Bintang Jatuh (Shooting Stars) — lebih sering & dramatis saat tema Astral Crystal Palace aktif
const baseShootingStars = [
  { top: '6%', left: '32%', width: '150px', duration: '6.2s', delay: '0.3s' },
  { top: '12%', left: '74%', width: '175px', duration: '7.4s', delay: '1.8s' },
  { top: '26%', left: '92%', width: '160px', duration: '6.8s', delay: '3.2s' },
  { top: '44%', left: '58%', width: '140px', duration: '8.2s', delay: '4.5s' },
  { top: '18%', left: '52%', width: '155px', duration: '7.8s', delay: '5.7s' },
  { top: '58%', left: '88%', width: '145px', duration: '9.0s', delay: '2.6s' },
]

const astralExtraShootingStars = [
  { top: '9%', left: '86%', width: '190px', duration: '5.2s', delay: '0.9s' },
  { top: '21%', left: '64%', width: '170px', duration: '5.8s', delay: '2.4s' },
  { top: '34%', left: '82%', width: '165px', duration: '6.0s', delay: '3.9s' },
]

const displayedShootingStars = computed(() => {
  const pool =
    activeCozyTheme.value === 'astral-palace'
      ? [...baseShootingStars, ...astralExtraShootingStars]
      : baseShootingStars
  return scaleParticles(pool)
})

const displayedTinyStars = computed(() =>
  isLowGraphics.value ? tinyStars.slice(0, 10) : scaleParticles(tinyStars),
)
const displayedRainDrops = computed(() => scaleParticles(rainDrops))
const displayedCityBokeh = computed(() => scaleParticles(cityBokehLights))
const displayedAutumnLeaves = computed(() => scaleParticles(autumnLeaves))
const displayedCafeMotes = computed(() => scaleParticles(cafeWarmMotes))
const displayedSakuraPetals = computed(() => scaleParticles(sakuraPetals))
const displayedSkyLanterns = computed(() => scaleParticles(skyLanterns))
const displayedMatchaLeaves = computed(() => scaleParticles(matchaTeaLeaves))
const displayedBiolumBubbles = computed(() => scaleParticles(biolumBubbles))
const displayedBiolumPlankton = computed(() => scaleParticles(biolumPlankton))
const displayedSakuraFireflies = computed(() => scaleParticles(sakuraFireflies))
const displayedHoneyDust = computed(() => scaleParticles(honeyLibraryDust))
const displayedWinterFlakes = computed(() => scaleParticles(winterSnowflakes))
const displayedNeonDrizzle = computed(() => scaleParticles(neonCityDrizzle))

// 24 Titik Plankton Bercahaya Cyan (#00F5D4) & Aqua (#22D3EE) khusus 🌊 Bioluminescent Ocean
const biolumPlankton = Array.from({ length: 24 }, (_, idx) => ({
  top: `${10 + (idx * 8.3) % 82}%`,
  left: `${5 + (idx * 7.4) % 90}%`,
  size: 3 + (idx % 4) * 2,
  isCyan: idx % 2 === 0,
  duration: `${4.2 + (idx % 5) * 1.1}s`,
  delay: `${(idx % 8) * 0.65}s`,
  dx: `${(idx % 2 === 0 ? 1 : -1) * (8 + (idx % 4) * 4)}px`,
}))

// 14 Kunang-Kunang Cahaya Hangat khusus 🌸 Sakura Lantern Festival
const sakuraFireflies = Array.from({ length: 14 }, (_, idx) => ({
  top: `${16 + (idx * 7.5) % 74}%`,
  left: `${8 + (idx * 8.7) % 84}%`,
  size: 4 + (idx % 3) * 2,
  duration: `${5.2 + (idx % 4) * 1.2}s`,
  delay: `${(idx % 7) * 0.8}s`,
  dx: `${(idx % 2 === 0 ? 1 : -1) * (10 + (idx % 3) * 6)}px`,
}))

// 16 Daun Teh Hijau lembut khusus 🍵 Matcha Garden
const matchaTeaLeaves = Array.from({ length: 16 }, (_, idx) => {
  const colors = ['#86efac', '#4ade80', '#bbf7d0', '#34d399']
  return {
    left: `${(idx * 6.3 + (idx % 3) * 1.9) % 96}%`,
    size: 14 + (idx % 4) * 4,
    color: colors[idx % colors.length] ?? '#86efac',
    duration: `${12 + (idx % 5) * 2.2}s`,
    delay: `${(idx % 8) * 1.3}s`,
    sway: `${(idx % 2 === 0 ? 1 : -1) * (24 + (idx % 4) * 10)}px`,
    endX: `${(idx % 2 === 0 ? -1 : 1) * (18 + (idx % 3) * 12)}px`,
  }
})

// 18 Gelembung Cahaya Cyan naik perlahan khusus 🌊 Bioluminescent Ocean
const biolumBubbles = Array.from({ length: 18 }, (_, idx) => ({
  left: `${(idx * 5.6 + (idx % 4) * 1.5) % 96}%`,
  size: 8 + (idx % 5) * 6,
  duration: `${10 + (idx % 5) * 2.4}s`,
  delay: `${(idx % 9) * 1.2}s`,
  sway: `${(idx % 2 === 0 ? 1 : -1) * (14 + (idx % 4) * 7)}px`,
}))

// 22 Partikel Debu Emas Berkilau khusus 🍯 Honey Library
const honeyLibraryDust = Array.from({ length: 22 }, (_, idx) => ({
  top: `${8 + (idx * 7.8) % 82}%`,
  left: `${4 + (idx * 6.9) % 92}%`,
  size: 3 + (idx % 4) * 2.5,
  duration: `${5.4 + (idx % 5) * 1.3}s`,
  delay: `${(idx % 7) * 0.75}s`,
}))

// 28 Salju Halus turun perlahan khusus ❄️ Winter Frost
const winterSnowflakes = Array.from({ length: 28 }, (_, idx) => ({
  left: `${(idx * 3.7 + (idx % 4) * 1.1) % 98}%`,
  size: 4 + (idx % 4) * 2.5,
  duration: `${8.5 + (idx % 5) * 2}s`,
  delay: `${(idx % 10) * 0.9}s`,
  sway: `${(idx % 2 === 0 ? 1 : -1) * (18 + (idx % 4) * 9)}px`,
}))

// 28 Gerimis Cahaya Neon Cyan (#00F5D4) & Magenta (#FF2A85) khusus 🌃 Neon Night City
const neonCityDrizzle = Array.from({ length: 28 }, (_, idx) => ({
  left: `${(idx * 3.6 + (idx % 5) * 1.3) % 99}%`,
  height: `${18 + (idx % 4) * 10}px`,
  isCyan: idx % 2 === 0,
  duration: `${1.35 + (idx % 5) * 0.25}s`,
  delay: `${(idx % 10) * 0.22}s`,
}))

// Jendela neon berkedip pada siluet gedung pencakar langit 🌃 Neon Night City
const neonSkylineWindows = [
  { x: 18, y: 120, color: '#00f5d4', dur: '3.6s', delay: '0.2s' },
  { x: 34, y: 144, color: '#ff2a85', dur: '4.4s', delay: '1.1s' },
  { x: 102, y: 84, color: '#00f5d4', dur: '3.8s', delay: '0.7s' },
  { x: 122, y: 112, color: '#ff2a85', dur: '5.1s', delay: '1.5s' },
  { x: 102, y: 140, color: '#a855f7', dur: '4.2s', delay: '0.4s' },
  { x: 214, y: 66, color: '#ff2a85', dur: '3.5s', delay: '0.9s' },
  { x: 234, y: 96, color: '#00f5d4', dur: '4.8s', delay: '2.0s' },
  { x: 214, y: 132, color: '#00f5d4', dur: '3.9s', delay: '1.3s' },
  { x: 332, y: 102, color: '#ff2a85', dur: '4.1s', delay: '0.5s' },
  { x: 356, y: 128, color: '#00f5d4', dur: '3.7s', delay: '1.8s' },
  { x: 468, y: 54, color: '#00f5d4', dur: '4.6s', delay: '0.3s' },
  { x: 488, y: 88, color: '#ff2a85', dur: '3.4s', delay: '1.2s' },
  { x: 468, y: 124, color: '#ff2a85', dur: '5.0s', delay: '2.1s' },
  { x: 604, y: 92, color: '#00f5d4', dur: '4.0s', delay: '0.8s' },
  { x: 626, y: 126, color: '#a855f7', dur: '4.7s', delay: '1.6s' },
  { x: 734, y: 74, color: '#ff2a85', dur: '3.9s', delay: '0.4s' },
  { x: 754, y: 106, color: '#00f5d4', dur: '4.5s', delay: '1.4s' },
  { x: 874, y: 62, color: '#00f5d4', dur: '3.6s', delay: '1.0s' },
  { x: 896, y: 98, color: '#ff2a85', dur: '4.9s', delay: '0.2s' },
  { x: 874, y: 136, color: '#00f5d4', dur: '4.3s', delay: '1.9s' },
  { x: 1018, y: 88, color: '#ff2a85', dur: '3.8s', delay: '0.6s' },
  { x: 1042, y: 122, color: '#00f5d4', dur: '4.4s', delay: '1.7s' },
  { x: 1138, y: 104, color: '#00f5d4', dur: '4.1s', delay: '0.9s' },
  { x: 1162, y: 138, color: '#ff2a85', dur: '3.7s', delay: '1.3s' },
]

// 44 Rintik Hujan Miring Halus (untuk Midnight Rainy Window & sakelar Hujan BGM)
const rainDrops = Array.from({ length: 44 }, (_, idx) => ({
  left: `${(idx * 2.4 + (idx % 5) * 1.2) % 100}%`,
  height: `${18 + (idx % 4) * 10}px`,
  duration: `${0.95 + (idx % 5) * 0.2}s`,
  delay: `${(idx % 11) * 0.18}s`,
}))

// 14 Titik Lampu Kota Blur (Bokeh Emas & Biru Lembut) khusus Midnight Rainy Window
const cityBokehLights = [
  { bottom: '8%', left: '6%', size: 58, color: 'bg-amber-300/35', opacity: 0.34, duration: '6.8s', delay: '0s', dx: '10px' },
  { bottom: '18%', left: '14%', size: 34, color: 'bg-sky-300/35', opacity: 0.3, duration: '7.5s', delay: '1.1s', dx: '-8px' },
  { bottom: '12%', left: '25%', size: 72, color: 'bg-yellow-200/30', opacity: 0.28, duration: '8.4s', delay: '0.6s', dx: '12px' },
  { bottom: '28%', left: '31%', size: 28, color: 'bg-blue-300/40', opacity: 0.35, duration: '6.2s', delay: '2.0s', dx: '-6px' },
  { bottom: '9%', left: '42%', size: 46, color: 'bg-amber-400/35', opacity: 0.32, duration: '7.1s', delay: '1.5s', dx: '9px' },
  { bottom: '22%', left: '53%', size: 64, color: 'bg-sky-400/25', opacity: 0.28, duration: '9.0s', delay: '0.4s', dx: '-10px' },
  { bottom: '14%', left: '62%', size: 38, color: 'bg-amber-200/40', opacity: 0.36, duration: '6.5s', delay: '2.4s', dx: '7px' },
  { bottom: '32%', left: '71%', size: 50, color: 'bg-indigo-300/30', opacity: 0.3, duration: '7.9s', delay: '0.9s', dx: '-9px' },
  { bottom: '10%', left: '78%', size: 78, color: 'bg-amber-300/30', opacity: 0.3, duration: '8.6s', delay: '1.7s', dx: '11px' },
  { bottom: '24%', left: '88%', size: 42, color: 'bg-cyan-300/35', opacity: 0.34, duration: '6.9s', delay: '0.3s', dx: '-7px' },
  { bottom: '6%', left: '93%', size: 56, color: 'bg-yellow-300/30', opacity: 0.32, duration: '7.7s', delay: '2.2s', dx: '8px' },
  { bottom: '38%', left: '19%', size: 26, color: 'bg-amber-200/35', opacity: 0.26, duration: '8.2s', delay: '1.3s', dx: '6px' },
  { bottom: '42%', left: '84%', size: 30, color: 'bg-sky-200/35', opacity: 0.28, duration: '7.3s', delay: '2.6s', dx: '-8px' },
  { bottom: '16%', left: '4%', size: 32, color: 'bg-blue-400/30', opacity: 0.28, duration: '6.4s', delay: '1.8s', dx: '9px' },
]

// 16 Daun Musim Gugur (Oranye, Karamel & Emas) khusus Cozy Autumn Cafe
const autumnLeaves = Array.from({ length: 16 }, (_, idx) => {
  const colors = ['#fb923c', '#f59e0b', '#fde047', '#ea580c', '#fdba74']
  return {
    left: `${(idx * 6.4 + (idx % 3) * 2.1) % 96}%`,
    size: 16 + (idx % 4) * 5,
    color: colors[idx % colors.length] ?? '#fb923c',
    duration: `${11.5 + (idx % 5) * 2.1}s`,
    delay: `${(idx % 8) * 1.4}s`,
    sway: `${(idx % 2 === 0 ? 1 : -1) * (28 + (idx % 4) * 12)}px`,
    endX: `${(idx % 2 === 0 ? -1 : 1) * (20 + (idx % 3) * 14)}px`,
  }
})

// 14 Partikel Cahaya Sore Hangat khusus Cozy Autumn Cafe
const cafeWarmMotes = Array.from({ length: 14 }, (_, idx) => ({
  top: `${12 + (idx * 7.2) % 78}%`,
  left: `${6 + (idx * 8.1) % 88}%`,
  size: 4 + (idx % 4) * 3,
  duration: `${6.2 + (idx % 5) * 1.4}s`,
  delay: `${(idx % 7) * 0.9}s`,
}))

// 18 Kelopak Bunga Sakura Pink Melayang Berputar khusus Sakura Lantern Festival
const sakuraPetals = Array.from({ length: 18 }, (_, idx) => {
  const fills = ['#fbcfe8', '#f9a8d4', '#fda4af', '#fce7f3']
  return {
    left: `${(idx * 5.7 + (idx % 4) * 1.8) % 98}%`,
    size: 12 + (idx % 3) * 4,
    fill: fills[idx % fills.length] ?? '#f9a8d4',
    duration: `${9.8 + (idx % 5) * 1.9}s`,
    delay: `${(idx % 9) * 1.15}s`,
    sway: `${(idx % 2 === 0 ? -1 : 1) * (34 + (idx % 4) * 10)}px`,
    endX: `${-40 - (idx % 4) * 18}px`,
  }
})

// 10 Lentera Kertas Emas Bercahaya Melayang ke Atas khusus Sakura Lantern Festival
const skyLanterns = Array.from({ length: 10 }, (_, idx) => ({
  left: `${6 + (idx * 9.6) % 88}%`,
  size: 24 + (idx % 3) * 8,
  duration: `${16 + (idx % 4) * 3.2}s`,
  delay: `${(idx % 5) * 2.8}s`,
  sway: `${(idx % 2 === 0 ? 1 : -1) * (16 + (idx % 3) * 8)}px`,
}))

// Partikel Debu Bintang Emas (Golden Stardust) mengikuti kursor khusus 👑 Astral Crystal Palace
interface GoldenDustParticle {
  id: number
  x: number
  y: number
  size: number
  gdx: string
  gdy: string
  isStar: boolean
}

const goldenDustTrail = ref<GoldenDustParticle[]>([])
let dustCounter = 0
let lastDustSpawnAt = 0

function handleAstralMouseMove(event: MouseEvent) {
  // Partikel debu emas kursor hanya aktif pada kualitas Grafik Tinggi (High)
  if (activeCozyTheme.value !== 'astral-palace' || !graphicsConfig.value.enableCursorDust) return
  const now = performance.now()
  if (now - lastDustSpawnAt < 42) return
  lastDustSpawnAt = now

  const id = ++dustCounter
  const gdx = `${Math.round((Math.random() - 0.5) * 26)}px`
  const gdy = `${Math.round(10 + Math.random() * 20)}px`
  const size = id % 3 === 0 ? 12 : 6 + (id % 3) * 2

  goldenDustTrail.value = [
    ...goldenDustTrail.value.slice(-16),
    {
      id,
      x: event.clientX,
      y: event.clientY,
      size,
      gdx,
      gdy,
      isStar: id % 3 === 0,
    },
  ]

  setTimeout(() => {
    goldenDustTrail.value = goldenDustTrail.value.filter(p => p.id !== id)
  }, 920)
}

// --- HTML5 CANVAS PARTIKEL SPESIFIK PER TEMA (SELALU MUNCUL & KONTRAS DI VIBE TERANG MAUPUN GELAP) ---
// Menggunakan 1 canvas terpadu hemat GPU (30-48 FPS, resolusi adaptif, 0 shadowBlur berat, otomatis pause saat Alt-Tab).
const themeCanvasRef = ref<HTMLCanvasElement | null>(null)
let canvasRafId: number | null = null
let lastCanvasFrameMs = 0

interface SteamWisp {
  xFrac: number
  phase: number
  speed: number
  swayAmp: number
  swayFreq: number
  baseWidth: number
  heightFrac: number
  yStartFrac: number
  maxOpacity: number
  progress: number
}

interface ThemeCanvasParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vRot: number
  phase: number
  alpha: number
  variant: number
  life: number
  maxLife: number
}

let steamWisps: SteamWisp[] = []
let canvasParticles: ThemeCanvasParticle[] = []
let canvasWidth = 1280
let canvasHeight = 720

function buildSteamWisps(count: number): SteamWisp[] {
  const presets: Omit<SteamWisp, 'progress'>[] = [
    { xFrac: 0.12, phase: 0.4, speed: 0.00018, swayAmp: 34, swayFreq: 2.3, baseWidth: 16, heightFrac: 0.48, yStartFrac: 1.04, maxOpacity: 0.16 },
    { xFrac: 0.28, phase: 1.8, speed: 0.00015, swayAmp: 42, swayFreq: 1.9, baseWidth: 20, heightFrac: 0.54, yStartFrac: 0.96, maxOpacity: 0.15 },
    { xFrac: 0.46, phase: 3.1, speed: 0.0002, swayAmp: 30, swayFreq: 2.5, baseWidth: 14, heightFrac: 0.46, yStartFrac: 1.02, maxOpacity: 0.14 },
    { xFrac: 0.64, phase: 4.5, speed: 0.00016, swayAmp: 38, swayFreq: 2.1, baseWidth: 18, heightFrac: 0.52, yStartFrac: 0.92, maxOpacity: 0.16 },
    { xFrac: 0.82, phase: 0.9, speed: 0.00019, swayAmp: 36, swayFreq: 2.4, baseWidth: 17, heightFrac: 0.5, yStartFrac: 1.04, maxOpacity: 0.17 },
    { xFrac: 0.92, phase: 2.6, speed: 0.00014, swayAmp: 28, swayFreq: 2.0, baseWidth: 15, heightFrac: 0.44, yStartFrac: 0.98, maxOpacity: 0.14 },
    { xFrac: 0.2, phase: 5.2, speed: 0.00017, swayAmp: 32, swayFreq: 2.2, baseWidth: 15, heightFrac: 0.45, yStartFrac: 0.82, maxOpacity: 0.13 },
  ]
  return presets.slice(0, count).map((p, idx) => ({
    ...p,
    progress: (idx * 0.17) % 1,
  }))
}

function getEffectiveCanvasTheme(): CozyThemeId | 'rain-overlay' {
  if (activeCozyTheme.value === 'classic' && isRainAmbientOn.value) return 'rain-overlay'
  return activeCozyTheme.value
}

function seedThemeParticles() {
  const scale = graphicsConfig.value.particleScale
  if (scale <= 0) {
    canvasParticles = []
    steamWisps = []
    return
  }

  const mode = getEffectiveCanvasTheme()
  const w = canvasWidth || 1280
  const h = canvasHeight || 720

  const baseCountByMode: Record<string, number> = {
    'midnight-rain': 64,
    'rain-overlay': 52,
    'matcha-garden': 26,
    'autumn-cafe': 28,
    'sakura-lantern': 32,
    'honey-library': 34,
    'biolum-ocean': 36,
    'winter-frost': 42,
    'pastel-cloudland': 24,
    'astral-palace': 34,
    'neon-night-city': 44,
    classic: 30,
  }
  const count = Math.max(8, Math.round((baseCountByMode[mode] ?? 28) * scale))

  steamWisps = mode === 'matcha-garden' ? buildSteamWisps(graphicsQuality.value === 'high' ? 7 : 4) : []

  canvasParticles = Array.from({ length: count }, (_, idx) => {
    const isRain = mode === 'midnight-rain' || mode === 'rain-overlay'
    const isRising = mode === 'biolum-ocean'
    const isHoney = mode === 'honey-library'
    const variant = idx % 4
    // Honey Library: variant 0 & 1 = tetesan madu turun sangat pelan, variant 2 = hex sarang lebah tipis melayang, variant 3 = warm amber dust naik lembut
    const honeyVy =
      variant === 0 || variant === 1
        ? 0.24 + Math.random() * 0.34
        : variant === 2
          ? 0.1 + Math.random() * 0.16
          : -(0.18 + Math.random() * 0.28)
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: isRain ? -1.4 - Math.random() * 1.1 : (Math.random() - 0.5) * 0.55,
      vy: isRain
        ? 7.5 + Math.random() * 5.2
        : mode === 'neon-night-city'
          ? 3.8 + Math.random() * 3.4
          : isHoney
            ? honeyVy
            : isRising
              ? -(0.32 + Math.random() * 0.65)
              : 0.45 + Math.random() * 0.9,
      size: isRain
        ? 14 + Math.random() * 16
        : mode === 'autumn-cafe' || mode === 'sakura-lantern'
          ? 7 + Math.random() * 7
          : isHoney
            ? variant === 2
              ? 12 + Math.random() * 12
              : 4.5 + Math.random() * 4.5
            : mode === 'winter-frost'
              ? 5 + Math.random() * 6
              : mode === 'pastel-cloudland'
                ? 8 + Math.random() * 10
                : 3.5 + Math.random() * 6.5,
      rot: Math.random() * Math.PI * 2,
      vRot: isHoney ? (Math.random() - 0.5) * 0.008 : (Math.random() - 0.5) * 0.032,
      phase: idx * 0.73 + Math.random() * 4,
      alpha: 0.45 + Math.random() * 0.35,
      variant,
      life: Math.random() * 100,
      maxLife: 70 + Math.random() * 90,
    }
  })
}

function stopThemeCanvasLoop() {
  if (canvasRafId !== null) {
    cancelAnimationFrame(canvasRafId)
    canvasRafId = null
  }
}

function resizeThemeCanvas() {
  const canvas = themeCanvasRef.value
  if (!canvas || !import.meta.client) return
  canvasWidth = window.innerWidth
  canvasHeight = window.innerHeight
  const renderScale = graphicsQuality.value === 'high' ? Math.min(window.devicePixelRatio || 1, 1.35) : 0.85
  canvas.width = Math.max(1, Math.floor(canvasWidth * renderScale))
  canvas.height = Math.max(1, Math.floor(canvasHeight * renderScale))
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0)
  }
}

function drawFourPointStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.36
    const ang = (i * Math.PI) / 4
    const px = Math.cos(ang) * rad
    const py = Math.sin(ang) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function drawSnowflake(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    const ex = Math.cos(a) * r
    const ey = Math.sin(a) * r
    ctx.moveTo(0, 0)
    ctx.lineTo(ex, ey)
    // Cabang kristal kecil di ujung
    const bx = Math.cos(a) * r * 0.62
    const by = Math.sin(a) * r * 0.62
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + Math.cos(a + 0.55) * r * 0.32, by + Math.sin(a + 0.55) * r * 0.32)
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + Math.cos(a - 0.55) * r * 0.32, by + Math.sin(a - 0.55) * r * 0.32)
  }
  ctx.stroke()
}

function drawMapleLeaf(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(r * 0.28, -r * 0.35)
  ctx.lineTo(r * 0.92, -r * 0.42)
  ctx.lineTo(r * 0.48, r * 0.08)
  ctx.lineTo(r * 0.85, r * 0.45)
  ctx.lineTo(r * 0.22, r * 0.38)
  ctx.lineTo(0, r * 0.95)
  ctx.lineTo(-r * 0.22, r * 0.38)
  ctx.lineTo(-r * 0.85, r * 0.45)
  ctx.lineTo(-r * 0.48, r * 0.08)
  ctx.lineTo(-r * 0.92, -r * 0.42)
  ctx.lineTo(-r * 0.28, -r * 0.35)
  ctx.closePath()
}

function drawSakuraPetal(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.bezierCurveTo(r * 0.72, -r * 0.45, r * 0.82, r * 0.45, 0, r * 0.88)
  ctx.bezierCurveTo(-r * 0.82, r * 0.45, -r * 0.72, -r * 0.45, 0, -r)
  ctx.closePath()
}

function drawHoneyDroplet(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.15)
  ctx.bezierCurveTo(r * 0.78, -r * 0.15, r * 0.85, r * 0.85, 0, r)
  ctx.bezierCurveTo(-r * 0.85, r * 0.85, -r * 0.78, -r * 0.15, 0, -r * 1.15)
  ctx.closePath()
}

function drawHoneycombHex(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawThemeCanvasFrame(nowMs: number) {
  if (isLowGraphics.value || document.hidden) {
    stopThemeCanvasLoop()
    const canvas = themeCanvasRef.value
    if (canvas && isLowGraphics.value) {
      const clearCtx = canvas.getContext('2d')
      clearCtx?.clearRect(0, 0, canvasWidth, canvasHeight)
    }
    return
  }
  canvasRafId = requestAnimationFrame(drawThemeCanvasFrame)

  // High: 60 FPS penuh | Medium: 30 FPS ringan | Low: RAF dijeda total
  const targetFps = graphicsQuality.value === 'high' ? 60 : 30
  const minInterval = 1000 / targetFps
  const dt = nowMs - lastCanvasFrameMs
  if (dt < minInterval) return
  lastCanvasFrameMs = nowMs

  const canvas = themeCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvasWidth
  const h = canvasHeight
  ctx.clearRect(0, 0, w, h)

  const clampedDt = Math.min(50, Math.max(8, dt))
  const step = clampedDt / 16.67
  const timeSec = nowMs * 0.001
  const mode = getEffectiveCanvasTheme()
  const isLight = !isDarkTheme.value

  // 1. Khusus Matcha Garden: kurva bezier uap asap teh hangat naik dari bawah
  if (mode === 'matcha-garden') {
    for (const wisp of steamWisps) {
      wisp.progress = (wisp.progress + wisp.speed * clampedDt) % 1
      const p = wisp.progress
      const fadeEnvelope = Math.sin(p * Math.PI)
      const alpha = isLight
        ? Math.max(0, Math.min(0.24, wisp.maxOpacity * 1.45 * fadeEnvelope))
        : Math.max(0, Math.min(0.14, wisp.maxOpacity * fadeEnvelope))
      if (alpha < 0.005) continue

      const baseX = wisp.xFrac * w
      const travelY = h * 0.72
      const tailY = wisp.yStartFrac * h - p * travelY
      const segLen = wisp.heightFrac * h * (0.72 + p * 0.45)
      const headY = tailY - segLen
      const lineWidth = wisp.baseWidth * (0.75 + p * 1.15)

      const wave1 = Math.sin(timeSec * 0.65 + wisp.phase) * wisp.swayAmp
      const wave2 = Math.cos(timeSec * 0.52 + wisp.phase * 1.4) * (wisp.swayAmp * 1.25)
      const wave3 = Math.sin(timeSec * 0.48 + wisp.phase * 2.1) * (wisp.swayAmp * 0.9)

      const cp1x = baseX + wave1
      const cp1y = tailY - segLen * 0.34
      const cp2x = baseX + wave2
      const cp2y = tailY - segLen * 0.68
      const endX = baseX + wave3

      const rgbOuter = isLight ? '21, 128, 61' : '236, 253, 245'
      const rgbInner = isLight ? '5, 150, 105' : '209, 250, 229'

      const outerGrad = ctx.createLinearGradient(baseX, tailY, endX, headY)
      outerGrad.addColorStop(0, `rgba(${rgbOuter}, 0)`)
      outerGrad.addColorStop(0.35, `rgba(${rgbOuter}, ${(alpha * 0.46).toFixed(3)})`)
      outerGrad.addColorStop(0.7, `rgba(${rgbInner}, ${(alpha * 0.36).toFixed(3)})`)
      outerGrad.addColorStop(1, `rgba(${rgbOuter}, 0)`)

      const innerGrad = ctx.createLinearGradient(baseX, tailY, endX, headY)
      innerGrad.addColorStop(0, `rgba(${rgbInner}, 0)`)
      innerGrad.addColorStop(0.3, `rgba(${rgbInner}, ${(alpha * 0.85).toFixed(3)})`)
      innerGrad.addColorStop(0.65, `rgba(${rgbOuter}, ${(alpha * 0.65).toFixed(3)})`)
      innerGrad.addColorStop(1, `rgba(${rgbInner}, 0)`)

      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(baseX - wave1 * 0.25, tailY)
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, headY)
      ctx.strokeStyle = outerGrad
      ctx.lineWidth = lineWidth * 2.0
      ctx.stroke()

      ctx.strokeStyle = innerGrad
      ctx.lineWidth = lineWidth * 0.9
      ctx.stroke()
    }
  }

  // 2. Render partikel khas tema aktif (dengan warna jenuh/kontras di Light Mode agar selalu terlihat jelas!)
  for (const p of canvasParticles) {
    if (mode === 'midnight-rain' || mode === 'rain-overlay') {
      if (p.variant === 3) {
        // Riak air hujan & bintang/kilau biru di Mode Terang & Gelap
        p.life += step * 0.9
        if (p.life >= p.maxLife) {
          p.life = 0
          p.x = Math.random() * w
          p.y = h * (0.72 + Math.random() * 0.26)
        }
        const prog = p.life / p.maxLife
        const rippleAlpha = Math.sin(prog * Math.PI) * (isLight ? 0.56 : 0.42)
        ctx.save()
        ctx.strokeStyle = isLight
          ? `rgba(2, 132, 199, ${rippleAlpha.toFixed(3)})`
          : `rgba(147, 197, 253, ${rippleAlpha.toFixed(3)})`
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, 4 + prog * 18, 1.8 + prog * 6, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      } else {
        // Garis hujan miring + tetesan air hujan biru
        p.x += p.vx * step
        p.y += p.vy * step
        if (p.y > h + 30 || p.x < -30) {
          p.x = Math.random() * (w + 120)
          p.y = -20 - Math.random() * 60
        }
        const dropAlpha = isLight ? Math.min(0.75, 0.46 + p.alpha * 0.32) : Math.min(0.8, 0.35 + p.alpha * 0.45)
        ctx.strokeStyle = isLight
          ? p.variant === 0
            ? `rgba(37, 99, 235, ${dropAlpha.toFixed(3)})`
            : `rgba(2, 132, 199, ${dropAlpha.toFixed(3)})`
          : `rgba(186, 230, 253, ${dropAlpha.toFixed(3)})`
        ctx.lineWidth = isLight ? 1.6 : 1.3
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + p.vx * 2.2, p.y + p.size)
        ctx.stroke()
      }
      continue
    }

    if (mode === 'matcha-garden') {
      // Serbuk & daun teh hijau tua kontras (Light: #15803D, Dark: #86EFAC)
      p.y += p.vy * 0.72 * step
      p.x += Math.sin(timeSec * 0.9 + p.phase) * 0.45 * step
      p.rot += p.vRot * step
      if (p.y > h + 20) {
        p.y = -18
        p.x = Math.random() * w
      }
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = isLight ? 0.68 : 0.62
      ctx.fillStyle = isLight
        ? p.variant % 2 === 0
          ? '#15803d'
          : '#166534'
        : p.variant % 2 === 0
          ? '#86efac'
          : '#4ade80'
      if (p.variant === 0) {
        // Serbuk daun teh halus
        ctx.beginPath()
        ctx.arc(0, 0, Math.max(2, p.size * 0.34), 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Daun teh mini
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size * 0.9, p.size * 0.42, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      continue
    }

    if (mode === 'autumn-cafe') {
      // Daun maple berguguran berputar lembut (Light: #C2410C, #B91C1C, #B45309)
      p.y += p.vy * 0.88 * step
      p.x += (Math.sin(timeSec * 0.85 + p.phase) * 0.75 + 0.18) * step
      p.rot += p.vRot * 1.15 * step
      if (p.y > h + 24) {
        p.y = -24
        p.x = Math.random() * w
      }
      if (p.x > w + 24) p.x = -24
      const lightPalette = ['#c2410c', '#b91c1c', '#b45309', '#9a3412']
      const darkPalette = ['#fb923c', '#f59e0b', '#fde047', '#ea580c']
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = isLight ? 0.78 : 0.74
      ctx.fillStyle = (isLight ? lightPalette : darkPalette)[p.variant] ?? '#c2410c'
      drawMapleLeaf(ctx, p.size)
      ctx.fill()
      ctx.restore()
      continue
    }

    if (mode === 'sakura-lantern') {
      // Kelopak bunga sakura gugur tertiup angin (Light: #DB2777 / #F43F5E)
      p.y += p.vy * 0.85 * step
      p.x += (Math.sin(timeSec * 1.1 + p.phase) * 0.9 - 0.32) * step
      p.rot += p.vRot * 1.3 * step
      if (p.y > h + 22 || p.x < -24) {
        p.y = -20
        p.x = Math.random() * (w + 80)
      }
      const lightSakura = ['#db2777', '#f43f5e', '#be185d', '#e11d48']
      const darkSakura = ['#fbcfe8', '#f9a8d4', '#fda4af', '#fce7f3']
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = isLight ? 0.72 : 0.78
      ctx.fillStyle = (isLight ? lightSakura : darkSakura)[p.variant] ?? '#db2777'
      drawSakuraPetal(ctx, p.size * 0.88)
      ctx.fill()
      ctx.restore()
      continue
    }

    if (mode === 'honey-library') {
      // Tema Honey Library yang lembut & cozy:
      // - variant 0 & 1: tetesan madu keemasan transparan (golden honey droplets) jatuh sangat pelan
      // - variant 2: segienam sarang lebah tipis (subtle honeycomb hex, opacity 0.08–0.18)
      // - variant 3: kilau debu hangat (warm amber dust) melayang pelan ke atas
      p.y += p.vy * step
      p.x += Math.sin(timeSec * 0.55 + p.phase) * 0.25 * step
      p.rot += p.vRot * step

      if (p.vy > 0 && p.y > h + 28) {
        p.y = -24
        p.x = Math.random() * w
      } else if (p.vy < 0 && p.y < -20) {
        p.y = h + 20
        p.x = Math.random() * w
      }

      const pulse = 0.55 + 0.45 * Math.sin(timeSec * 1.4 + p.phase)
      ctx.save()
      ctx.translate(p.x, p.y)

      if (p.variant === 0 || p.variant === 1) {
        // Golden honey droplet transparan lembut
        const dropR = Math.max(3.6, p.size * 0.78)
        const dropGrad = ctx.createLinearGradient(0, -dropR, 0, dropR)
        if (isLight) {
          dropGrad.addColorStop(0, 'rgba(253, 230, 138, 0.72)')
          dropGrad.addColorStop(1, 'rgba(245, 158, 11, 0.52)')
        } else {
          dropGrad.addColorStop(0, 'rgba(254, 240, 138, 0.68)')
          dropGrad.addColorStop(1, 'rgba(245, 158, 11, 0.46)')
        }
        ctx.globalAlpha = (isLight ? 0.62 : 0.68) * pulse
        ctx.fillStyle = dropGrad
        drawHoneyDroplet(ctx, dropR)
        ctx.fill()
        ctx.strokeStyle = isLight ? 'rgba(180, 83, 9, 0.32)' : 'rgba(254, 243, 199, 0.42)'
        ctx.lineWidth = 0.9
        ctx.stroke()
        // Kilau putih mungil di sisi tetesan madu
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
        ctx.beginPath()
        ctx.arc(-dropR * 0.24, dropR * 0.12, Math.max(0.9, dropR * 0.2), 0, Math.PI * 2)
        ctx.fill()
      } else if (p.variant === 2) {
        // Segienam sarang lebah sangat tipis (opacity 0.08–0.18 agar tetap elegan & tidak ramai)
        ctx.rotate(p.rot)
        const hexAlpha = 0.08 + 0.1 * (0.5 + 0.5 * Math.sin(timeSec * 0.9 + p.phase))
        ctx.globalAlpha = hexAlpha
        ctx.fillStyle = isLight ? '#f59e0b' : '#fde68a'
        ctx.strokeStyle = isLight ? '#b45309' : '#fcd34d'
        ctx.lineWidth = 1.2
        drawHoneycombHex(ctx, p.size)
        ctx.fill()
        ctx.globalAlpha = Math.min(0.18, hexAlpha * 1.25)
        ctx.stroke()
      } else {
        // Warm amber dust (kilau debu cahaya hangat perpustakaan)
        ctx.globalAlpha = (isLight ? 0.52 : 0.64) * pulse
        ctx.fillStyle = isLight ? '#d97706' : '#fde68a'
        drawFourPointStar(ctx, Math.max(3, p.size * 0.55))
        ctx.fill()
      }
      ctx.restore()
      continue
    }

    if (mode === 'biolum-ocean') {
      // Gelembung udara berkilau & partikel plankton (Light: #0369A1 / #0E7490)
      p.y += p.vy * 0.85 * step
      p.x += Math.sin(timeSec * 1.0 + p.phase) * 0.45 * step
      if (p.y < -20) {
        p.y = h + 20
        p.x = Math.random() * w
      }
      ctx.save()
      ctx.translate(p.x, p.y)
      if (p.variant === 0 || p.variant === 1) {
        // Gelembung udara berkilau dengan highlight sabit
        const rad = Math.max(3.5, p.size * 0.85)
        ctx.strokeStyle = isLight ? 'rgba(3, 105, 161, 0.68)' : 'rgba(94, 234, 212, 0.76)'
        ctx.fillStyle = isLight ? 'rgba(14, 165, 233, 0.14)' : 'rgba(0, 245, 212, 0.12)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(0, 0, rad, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(207, 250, 254, 0.9)'
        ctx.beginPath()
        ctx.arc(-rad * 0.32, -rad * 0.32, Math.max(1.2, rad * 0.22), 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Plankton pendar
        const pulse = 0.45 + 0.45 * Math.sin(timeSec * 2.2 + p.phase)
        ctx.globalAlpha = isLight ? pulse * 0.74 : pulse * 0.88
        ctx.fillStyle = isLight ? '#0369a1' : p.variant === 2 ? '#00f5d4' : '#22d3ee'
        ctx.beginPath()
        ctx.arc(0, 0, Math.max(2, p.size * 0.38), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      continue
    }

    if (mode === 'winter-frost') {
      // Kepingan salju 6-cabang biru es (Light: #3B82F6 / #0EA5E9 — bukan putih polos!)
      p.y += p.vy * 0.82 * step
      p.x += Math.sin(timeSec * 0.9 + p.phase) * 0.55 * step
      p.rot += p.vRot * 0.75 * step
      if (p.y > h + 20) {
        p.y = -20
        p.x = Math.random() * w
      }
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = isLight ? 0.74 : 0.82
      ctx.strokeStyle = isLight
        ? p.variant % 2 === 0
          ? '#3b82f6'
          : '#0ea5e9'
        : p.variant % 2 === 0
          ? '#e0f2fe'
          : '#bae6fd'
      ctx.lineWidth = isLight ? 1.45 : 1.25
      ctx.lineCap = 'round'
      drawSnowflake(ctx, p.size * 0.9)
      ctx.restore()
      continue
    }

    if (mode === 'pastel-cloudland') {
      // Bintang kecil & awan mini pastel ber-outline lembut
      p.x += (0.28 + (p.variant % 2) * 0.14) * step
      p.y += Math.sin(timeSec * 0.7 + p.phase) * 0.22 * step
      if (p.x > w + 40) {
        p.x = -40
        p.y = Math.random() * h
      }
      ctx.save()
      ctx.translate(p.x, p.y)
      if (p.variant === 0) {
        // Awan mini pastel ber-outline lembut
        const r = p.size * 0.65
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(224, 231, 255, 0.35)'
        ctx.strokeStyle = isLight ? 'rgba(37, 99, 235, 0.45)' : 'rgba(191, 219, 254, 0.65)'
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.arc(-r * 0.6, 0, r * 0.55, 0, Math.PI * 2)
        ctx.arc(0, -r * 0.28, r * 0.72, 0, Math.PI * 2)
        ctx.arc(r * 0.65, 0, r * 0.52, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
        const pulse = 0.48 + 0.42 * Math.sin(timeSec * 2 + p.phase)
        ctx.globalAlpha = pulse * (isLight ? 0.78 : 0.82)
        ctx.fillStyle = isLight
          ? p.variant === 1
            ? '#2563eb'
            : '#7c3aed'
          : p.variant === 1
            ? '#fef08a'
            : '#fbcfe8'
        drawFourPointStar(ctx, Math.max(4, p.size * 0.5))
        ctx.fill()
      }
      ctx.restore()
      continue
    }

    if (mode === 'astral-palace') {
      // Pecahan kristal berlian berkilau (Light: #7E22CE / #059669, Dark: #34D399 / #FDE047)
      p.y += Math.sin(timeSec * 0.9 + p.phase) * 0.32 * step
      p.x += Math.cos(timeSec * 0.65 + p.phase) * 0.22 * step
      p.rot += p.vRot * 0.8 * step
      const pulse = 0.5 + 0.45 * Math.sin(timeSec * 2.2 + p.phase)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = isLight ? pulse * 0.78 : pulse * 0.85
      const fill = isLight
        ? p.variant % 2 === 0
          ? '#7e22ce'
          : '#059669'
        : p.variant % 2 === 0
          ? '#34d399'
          : '#fde047'
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.moveTo(0, -p.size)
      ctx.lineTo(p.size * 0.55, 0)
      ctx.lineTo(0, p.size)
      ctx.lineTo(-p.size * 0.55, 0)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      continue
    }

    if (mode === 'neon-night-city') {
      // Garis cahaya neon Cyan & Magenta adaptif Light/Dark
      p.y += p.vy * step
      if (p.y > h + 30) {
        p.y = -28
        p.x = Math.random() * w
      }
      const isCyan = p.variant % 2 === 0
      ctx.strokeStyle = isLight
        ? isCyan
          ? 'rgba(14, 116, 144, 0.62)'
          : 'rgba(190, 24, 93, 0.62)'
        : isCyan
          ? 'rgba(0, 245, 212, 0.72)'
          : 'rgba(255, 42, 133, 0.72)'
      ctx.lineWidth = isLight ? 1.8 : 1.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x, p.y + 14 + p.size * 1.4)
      ctx.stroke()
      continue
    }

    // Default / Classic (Twilight, Pastel Berry, Ocean Night): Bintang kerlip & kilau halus adaptif Light/Dark
    p.y += Math.sin(timeSec * 0.65 + p.phase) * 0.2 * step
    const twinkle = 0.35 + 0.55 * Math.abs(Math.sin(timeSec * 1.5 + p.phase))
    const lightClassicColor =
      theme.value === 'sakura'
        ? p.variant % 2 === 0
          ? '#be123c'
          : '#ea580c'
        : theme.value === 'ocean'
          ? p.variant % 2 === 0
            ? '#0369a1'
            : '#0284c7'
          : p.variant % 2 === 0
            ? '#6d28d9'
            : '#db2777'
    const darkClassicColor =
      theme.value === 'sakura'
        ? '#fed7aa'
        : theme.value === 'ocean'
          ? '#bae6fd'
          : p.variant % 2 === 0
            ? '#fbcfe8'
            : '#fde68a'
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.globalAlpha = isLight ? twinkle * 0.64 : twinkle * 0.78
    ctx.fillStyle = isLight ? lightClassicColor : darkClassicColor
    if (p.variant === 0) {
      drawFourPointStar(ctx, Math.max(4, p.size * 0.62))
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, Math.max(1.8, p.size * 0.28), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

async function syncThemeCanvasLoop() {
  if (!import.meta.client) return
  stopThemeCanvasLoop()
  if (isLowGraphics.value || document.hidden) return
  await nextTick()
  resizeThemeCanvas()
  seedThemeParticles()
  lastCanvasFrameMs = performance.now()
  canvasRafId = requestAnimationFrame(drawThemeCanvasFrame)
}

function handleCanvasVisibilityChange() {
  if (document.hidden) {
    stopThemeCanvasLoop()
  } else {
    void syncThemeCanvasLoop()
  }
}

watch([activeCozyTheme, theme, isDarkTheme, isRainAmbientOn, graphicsQuality], () => {
  void syncThemeCanvasLoop()
})

onMounted(() => {
  if (import.meta.client && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', handleAstralMouseMove, { passive: true })
  }
  if (import.meta.client) {
    window.addEventListener('resize', resizeThemeCanvas, { passive: true })
    document.addEventListener('visibilitychange', handleCanvasVisibilityChange)
    void syncThemeCanvasLoop()
  }
})

onUnmounted(() => {
  stopThemeCanvasLoop()
  if (import.meta.client) {
    window.removeEventListener('mousemove', handleAstralMouseMove)
    window.removeEventListener('resize', resizeThemeCanvas)
    document.removeEventListener('visibilitychange', handleCanvasVisibilityChange)
  }
})
</script>

<template>
  <!-- LAPISAN 1 (z-0): Langit gradasi & efek atmosfer Cozy Themes (contain:strict mencegah reflow/repaint kartu utama) -->
  <div
    aria-hidden="true"
    style="contain: strict"
    class="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-br transition-colors duration-700"
    :class="activeBg.gradient"
  >
    <!-- Cahaya kabut pastel ringan (blur-2xl max agar GPU tidak berat saat Alt-Tab) -->
    <div
      class="absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-75 blur-2xl transition-colors duration-700"
      :class="activeBg.orb1"
    />
    <div
      class="absolute -right-24 top-1/4 h-80 w-80 rounded-full opacity-75 blur-2xl transition-colors duration-700"
      :class="activeBg.orb2"
    />
    <div
      class="absolute bottom-0 left-1/3 h-72 w-72 rounded-full opacity-75 blur-2xl transition-colors duration-700"
      :class="activeBg.orb3"
    />

    <!-- === CAHAYA BOKEH LEMBUT TEMA PINK DEFAULT: PASTEL BERRY / COTTON CANDY SUNSET (tanpa kelopak sakura) === -->
    <div
      v-if="activeCozyTheme === 'classic' && theme === 'sakura' && !isLowGraphics"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span
        v-for="(bokeh, idx) in displayedPastelBerryBokeh"
        :key="`berry-bokeh-${idx}`"
        class="animate-bokeh-float absolute rounded-full blur-lg"
        :class="bokeh.color"
        :style="{
          top: bokeh.top,
          left: bokeh.left,
          width: `${bokeh.size}px`,
          height: `${bokeh.size}px`,
          '--bokeh-opacity': bokeh.opacity,
          '--bokeh-duration': bokeh.duration,
          '--bokeh-delay': bokeh.delay,
          '--bokeh-dx': bokeh.dx,
        }"
      />
    </div>

    <!-- === EFEK KHUSUS TEMA 5: 👑 ASTRAL CRYSTAL PALACE (Aurora Borealis + Bulan Sabit Perak Besar) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'astral-palace'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <!-- Pita Aurora Borealis Hijau Zamrud, Biru Cyan, & Ungu Kristal (disembunyikan di Grafik Ringan agar ringan di GPU) -->
        <template v-if="!isLowGraphics">
          <div
            class="animate-aurora-wave absolute -left-[15%] -top-10 h-[44vh] w-[130%] rounded-full bg-gradient-to-r from-emerald-400/25 via-cyan-300/25 to-purple-500/25 blur-3xl"
            style="--aurora-duration: 14s; --aurora-delay: 0s"
          />
          <div
            v-if="graphicsQuality === 'high'"
            class="animate-aurora-wave absolute -left-[10%] top-[10%] h-[36vh] w-[120%] rounded-full bg-gradient-to-r from-purple-500/20 via-emerald-300/25 to-cyan-400/25 blur-3xl"
            style="--aurora-duration: 18s; --aurora-delay: 3.5s"
          />
          <div
            v-if="graphicsQuality === 'high'"
            class="animate-aurora-wave absolute left-[5%] top-[2%] h-[28vh] w-[90%] rounded-full bg-gradient-to-r from-cyan-300/20 via-fuchsia-400/18 to-amber-200/15 blur-2xl"
            style="--aurora-duration: 12s; --aurora-delay: 1.8s"
          />
        </template>

        <!-- Bulan Sabit Perak Bercahaya Megah di Sudut Langit Atas -->
        <div class="absolute right-[8%] top-[7%] sm:right-[11%] sm:top-[6%]">
          <div class="relative flex items-center justify-center">
            <div class="absolute h-28 w-28 rounded-full bg-sky-100/15 blur-2xl sm:h-36 sm:w-36" />
            <svg
              class="relative h-20 w-20 drop-shadow-[0_0_24px_rgba(226,232,240,0.85)] sm:h-24 sm:w-24"
              viewBox="0 0 80 80"
              fill="none"
            >
              <path
                d="M52 10C37 12.5 26 25.5 26 41C26 54 34.5 65 46.5 69.5C31 70.5 16 58 14.5 42C12.8 25 25 10 42.5 8.5C45.8 8.2 49 8.8 52 10Z"
                fill="url(#astralSilverMoon)"
              />
              <path
                d="M50 24 L51.8 29 L56.8 30.8 L51.8 32.6 L50 37.6 L48.2 32.6 L43.2 30.8 L48.2 29 Z"
                fill="#fef08a"
              />
              <circle cx="58" cy="44" r="2.2" fill="#e0f2fe" opacity="0.9" />
              <defs>
                <linearGradient id="astralSilverMoon" x1="14" y1="8" x2="52" y2="70" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#ffffff" />
                  <stop offset="0.55" stop-color="#e2e8f0" />
                  <stop offset="1" stop-color="#cbd5e1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </Transition>

    <!-- === EFEK KHUSUS TEMA 2: 🌧️ MIDNIGHT RAINY WINDOW (Lampu Kota Bokeh Emas & Biru) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'midnight-rain'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <!-- Kilau tipis kaca jendela malam di tepi atas -->
        <div class="absolute inset-0 bg-gradient-to-b from-sky-200/[0.04] via-transparent to-amber-300/[0.06]" />
        <!-- Lampu kota blur (bokeh emas & biru lembut) di kejauhan (0% di Ringan, 50% di Sedang, 100% di Tinggi) -->
        <span
          v-for="(bokeh, idx) in displayedCityBokeh"
          :key="`bokeh-${idx}`"
          class="animate-bokeh-float absolute rounded-full blur-md"
          :class="bokeh.color"
          :style="{
            bottom: bokeh.bottom,
            left: bokeh.left,
            width: `${bokeh.size}px`,
            height: `${bokeh.size}px`,
            '--bokeh-opacity': bokeh.opacity,
            '--bokeh-duration': bokeh.duration,
            '--bokeh-delay': bokeh.delay,
            '--bokeh-dx': bokeh.dx,
          }"
        />
      </div>
    </Transition>

    <!-- === EFEK KHUSUS TEMA 3: 🍂 COZY AUTUMN CAFE (Daun Gugur Berputar & Partikel Cahaya Sore) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'autumn-cafe'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <!-- Sorot sinar mentari sore hangat dari sudut kiri atas -->
        <div
          class="absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-amber-300/20 via-orange-400/10 to-transparent blur-3xl"
        />

        <!-- Partikel cahaya kafe sore lembut (0% Ringan, 50% Sedang, 100% Tinggi) -->
        <span
          v-for="(mote, idx) in displayedCafeMotes"
          :key="`mote-${idx}`"
          class="animate-warm-mote absolute rounded-full bg-amber-200/80 shadow-[0_0_10px_rgba(251,191,36,0.75)] blur-[0.5px]"
          :style="{
            top: mote.top,
            left: mote.left,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            '--mote-duration': mote.duration,
            '--mote-delay': mote.delay,
          }"
        />

        <!-- Daun musim gugur melayang berputar perlahan -->
        <template v-if="!isLowGraphics">
          <svg
            v-for="(leaf, idx) in displayedAutumnLeaves"
            :key="`leaf-${idx}`"
            class="animate-leaf-fall absolute top-0 opacity-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
            :style="{
              left: leaf.left,
              width: `${leaf.size}px`,
              height: `${leaf.size}px`,
              '--leaf-duration': leaf.duration,
              '--leaf-delay': leaf.delay,
              '--leaf-sway': leaf.sway,
              '--leaf-end-x': leaf.endX,
            }"
            viewBox="0 0 28 28"
            fill="none"
          >
            <path
              d="M14 2 C18 7, 24 10, 23 16 C22 21, 17 23, 14 25 C11 23, 6 21, 5 16 C4 10, 10 7, 14 2 Z"
              :fill="leaf.color"
            />
            <path d="M14 5 V26" stroke="#7c2d12" stroke-width="1.2" stroke-linecap="round" opacity="0.55" />
          </svg>
        </template>
      </div>
    </Transition>

    <!-- === EFEK KHUSUS TEMA 4: 🌸 SAKURA LANTERN FESTIVAL (Kelopak Sakura + Lentera Kertas Emas) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'sakura-lantern'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <template v-if="!isLowGraphics">
          <!-- Lentera kertas emas bercahaya terbang perlahan ke atas -->
          <div
            v-for="(lantern, idx) in displayedSkyLanterns"
            :key="`lantern-${idx}`"
            class="animate-lantern-rise absolute bottom-0 opacity-0"
            :style="{
              left: lantern.left,
              '--lantern-duration': lantern.duration,
              '--lantern-delay': lantern.delay,
              '--lantern-sway': lantern.sway,
            }"
          >
            <svg
              :style="{ width: `${lantern.size}px`, height: `${Math.round(lantern.size * 1.25)}px` }"
              class="drop-shadow-[0_0_14px_rgba(251,191,36,0.75)]"
              viewBox="0 0 36 46"
              fill="none"
            >
              <!-- Cahaya halo hangat di sekitar lentera -->
              <ellipse cx="18" cy="22" rx="15" ry="18" fill="#fbbf24" opacity="0.22" />
              <!-- Badan lentera kertas emas -->
              <path
                d="M9 11 C9 6, 27 6, 27 11 L29 29 C29 34, 24 37, 18 37 C12 37, 7 34, 7 29 Z"
                fill="url(#sakuraLanternGlow)"
                stroke="#fef08a"
                stroke-width="1"
              />
              <!-- Lidah api hangat di bagian bawah lentera -->
              <ellipse cx="18" cy="31" rx="4.2" ry="5" fill="#fffbeb" opacity="0.92" />
              <line x1="12" y1="37" x2="24" y2="37" stroke="#b45309" stroke-width="1.6" stroke-linecap="round" />
              <defs>
                <linearGradient id="sakuraLanternGlow" x1="18" y1="6" x2="18" y2="37" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#f59e0b" />
                  <stop offset="0.55" stop-color="#fbbf24" />
                  <stop offset="1" stop-color="#fef08a" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <!-- Kunang-kunang cahaya hangat lembut -->
          <span
            v-for="(ff, idx) in displayedSakuraFireflies"
            :key="`sakura-ff-${idx}`"
            class="animate-plankton-pulse absolute rounded-full bg-amber-200 shadow-[0_0_12px_rgba(253,224,71,0.9)]"
            :style="{
              top: ff.top,
              left: ff.left,
              width: `${ff.size}px`,
              height: `${ff.size}px`,
              '--pk-duration': ff.duration,
              '--pk-delay': ff.delay,
              '--pk-dx': ff.dx,
            }"
          />

          <!-- Kelopak bunga sakura pink melayang berputar -->
          <svg
            v-for="(petal, idx) in displayedSakuraPetals"
            :key="`petal-${idx}`"
            class="animate-petal-fall absolute top-0 opacity-0 drop-shadow-[0_0_6px_rgba(249,168,212,0.55)]"
            :style="{
              left: petal.left,
              width: `${petal.size}px`,
              height: `${petal.size}px`,
              '--petal-duration': petal.duration,
              '--petal-delay': petal.delay,
              '--petal-sway': petal.sway,
              '--petal-end-x': petal.endX,
            }"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2 C15 6, 20 11, 18 17 C16.5 21, 13.5 21.5, 12 18.8 C10.5 21.5, 7.5 21, 6 17 C4 11, 9 6, 12 2 Z"
              :fill="petal.fill"
            />
          </svg>
        </template>
      </div>
    </Transition>

    <!-- === EFEK KHUSUS TEMA 6: 🍵 MATCHA GARDEN (Uap Hangat Tipis Canvas + Daun Teh Melayang Pelan) === -->
    <div
      v-if="activeCozyTheme === 'matcha-garden'"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <!-- Pendar hangat secangkir matcha di sudut bawah -->
      <div
        class="absolute -bottom-16 left-1/4 h-64 w-80 rounded-full bg-emerald-200/10 blur-3xl"
      />
      <div
        class="absolute -bottom-12 right-[12%] h-56 w-72 rounded-full bg-lime-100/8 blur-3xl"
      />

      <!-- Lapisan Canvas Uap Hangat & Partikel Terpadu berada di root latar belakang -->

      <!-- Siluet Uap Hangat Halus di Sudut Kiri & Kanan Bawah -->
      <svg
        v-if="!isLowGraphics"
        class="absolute bottom-4 left-4 h-24 w-16 opacity-25 sm:bottom-6 sm:left-8 sm:h-28 sm:w-20"
        viewBox="0 0 64 96"
        fill="none"
      >
        <path
          class="animate-steam-rise"
          style="--steam-delay: 0s"
          d="M20 84 Q12 64 22 46 Q30 28 20 12"
          stroke="#ecfdf5"
          stroke-width="3.2"
          stroke-linecap="round"
        />
        <path
          class="animate-steam-rise"
          style="--steam-delay: 0.7s"
          d="M36 88 Q44 66 34 48 Q26 30 36 10"
          stroke="#bbf7d0"
          stroke-width="2.8"
          stroke-linecap="round"
        />
        <path
          class="animate-steam-rise"
          style="--steam-delay: 1.4s"
          d="M50 82 Q44 64 52 48 Q58 34 48 18"
          stroke="#ecfdf5"
          stroke-width="2.4"
          stroke-linecap="round"
        />
      </svg>

      <template v-if="!isLowGraphics">
        <svg
          v-for="(leaf, idx) in displayedMatchaLeaves"
          :key="`tea-${idx}`"
          class="animate-leaf-fall absolute top-0 opacity-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
          :style="{
            left: leaf.left,
            width: `${leaf.size}px`,
            height: `${leaf.size}px`,
            '--leaf-duration': leaf.duration,
            '--leaf-delay': leaf.delay,
            '--leaf-sway': leaf.sway,
            '--leaf-end-x': leaf.endX,
          }"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M12 2 C17 6, 20 11, 17 17 C15 20, 12 22, 12 22 C12 22, 9 20, 7 17 C4 11, 7 6, 12 2 Z" :fill="leaf.color" />
          <path d="M12 4 V21" stroke="#14532d" stroke-width="1.1" opacity="0.45" />
        </svg>
      </template>
    </div>

    <!-- === EFEK KHUSUS TEMA 7: 🌊 BIOLUMINESCENT OCEAN (God-Rays, Plankton Cyan/Aqua, Gelembung & Kelp Pendar) === -->
    <div
      v-if="activeCozyTheme === 'biolum-ocean'"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <!-- Berkas Cahaya Air dari Permukaan Atas (Underwater God-Rays / Light Shafts) -->
      <template v-if="!isLowGraphics">
        <div
          class="animate-god-ray absolute -top-12 left-[10%] h-[78vh] w-36 bg-gradient-to-b from-[#00f5d4]/22 via-[#22d3ee]/10 to-transparent blur-2xl sm:w-52"
          style="--ray-duration: 11s; --ray-delay: 0s"
        />
        <div
          class="animate-god-ray absolute -top-12 left-[42%] h-[84vh] w-44 bg-gradient-to-b from-[#22d3ee]/20 via-[#0d9488]/10 to-transparent blur-2xl sm:w-64"
          style="--ray-duration: 14s; --ray-delay: 2.2s"
        />
        <div
          v-if="graphicsQuality === 'high'"
          class="animate-god-ray absolute -top-12 right-[12%] h-[72vh] w-36 bg-gradient-to-b from-[#5eead4]/18 via-[#0891b2]/8 to-transparent blur-2xl sm:w-48"
          style="--ray-duration: 12.5s; --ray-delay: 1.1s"
        />
      </template>

      <!-- Siluet Rumput Laut Pendar (Bioluminescent Kelp) di Sudut Bawah -->
      <svg
        class="absolute bottom-0 left-2 h-40 w-24 opacity-45 sm:left-6 sm:h-48 sm:w-28"
        viewBox="0 0 90 160"
        fill="none"
      >
        <path
          d="M24 160 Q14 125 28 96 Q40 68 24 38 Q18 22 26 10"
          stroke="#00f5d4"
          stroke-width="3.2"
          stroke-linecap="round"
        />
        <ellipse cx="18" cy="112" rx="7" ry="3.5" transform="rotate(-30 18 112)" fill="#2dd4bf" opacity="0.7" />
        <ellipse cx="32" cy="84" rx="7.5" ry="3.5" transform="rotate(25 32 84)" fill="#22d3ee" opacity="0.7" />
        <ellipse cx="20" cy="54" rx="6.5" ry="3" transform="rotate(-28 20 54)" fill="#00f5d4" opacity="0.75" />
        <path
          d="M58 160 Q68 130 56 102 Q46 78 60 54"
          stroke="#22d3ee"
          stroke-width="2.6"
          stroke-linecap="round"
          opacity="0.75"
        />
        <circle cx="26" cy="10" r="3" fill="#99f6e4" />
        <circle cx="60" cy="54" r="2.6" fill="#67e8f9" />
      </svg>

      <svg
        class="absolute bottom-0 right-2 h-36 w-24 opacity-40 sm:right-6 sm:h-44 sm:w-28"
        viewBox="0 0 90 160"
        fill="none"
      >
        <path
          d="M64 160 Q74 125 60 94 Q48 66 64 36 Q70 20 62 12"
          stroke="#2dd4bf"
          stroke-width="3"
          stroke-linecap="round"
        />
        <ellipse cx="70" cy="110" rx="7" ry="3.5" transform="rotate(28 70 110)" fill="#00f5d4" opacity="0.65" />
        <ellipse cx="56" cy="80" rx="7" ry="3.5" transform="rotate(-24 56 80)" fill="#22d3ee" opacity="0.7" />
        <circle cx="62" cy="12" r="3" fill="#a5f3fc" />
      </svg>

      <template v-if="!isLowGraphics">
        <!-- Titik-titik Plankton Bercahaya Cyan (#00F5D4) & Aqua (#22D3EE) Berdenyut Lembut -->
        <span
          v-for="(pk, idx) in displayedBiolumPlankton"
          :key="`plankton-${idx}`"
          class="animate-plankton-pulse absolute rounded-full"
          :class="
            pk.isCyan
              ? 'bg-[#00f5d4] shadow-[0_0_12px_#00f5d4]'
              : 'bg-[#22d3ee] shadow-[0_0_12px_#22d3ee]'
          "
          :style="{
            top: pk.top,
            left: pk.left,
            width: `${pk.size}px`,
            height: `${pk.size}px`,
            '--pk-duration': pk.duration,
            '--pk-delay': pk.delay,
            '--pk-dx': pk.dx,
          }"
        />

        <!-- Gelembung Udara Naik Perlahan -->
        <span
          v-for="(bubble, idx) in displayedBiolumBubbles"
          :key="`bubble-${idx}`"
          class="animate-bubble-rise absolute bottom-0 rounded-full border border-[#5eead4]/75 bg-[#00f5d4]/12 opacity-0 shadow-[0_0_12px_rgba(0,245,212,0.5)]"
          :style="{
            left: bubble.left,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            '--bubble-duration': bubble.duration,
            '--bubble-delay': bubble.delay,
            '--bubble-sway': bubble.sway,
          }"
        />
      </template>
    </div>

    <!-- === EFEK KHUSUS TEMA 8: 🍯 HONEY LIBRARY (Lampu Baca Hangat + Partikel Debu Emas Berkilau) === -->
    <div
      v-if="activeCozyTheme === 'honey-library'"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <!-- Sorot cahaya kerucut lembut lampu gantung baca perpustakaan -->
      <div class="absolute -top-10 left-[4%] h-72 w-72 rounded-full bg-amber-300/14 blur-3xl" />
      <div class="absolute -top-10 right-[4%] h-72 w-72 rounded-full bg-amber-300/14 blur-3xl" />
      <template v-if="!isLowGraphics">
        <span
          v-for="(dust, idx) in displayedHoneyDust"
          :key="`honey-dust-${idx}`"
          class="animate-warm-mote absolute rounded-full bg-amber-200/85 shadow-[0_0_12px_rgba(251,191,36,0.85)]"
          :style="{
            top: dust.top,
            left: dust.left,
            width: `${dust.size}px`,
            height: `${dust.size}px`,
            '--mote-duration': dust.duration,
            '--mote-delay': dust.delay,
          }"
        />
      </template>
    </div>

    <!-- === EFEK KHUSUS TEMA 9: ☁️ PASTEL CLOUDLAND (Awan Lembut Ekstra & Kilau Bintang) === -->
    <div
      v-if="activeCozyTheme === 'pastel-cloudland' && !isLowGraphics"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <svg
        class="animate-cloud-drift absolute left-[18%] top-[14%] w-64 opacity-30 sm:w-80"
        style="--drift-x: 42px; --drift-duration: 19s; --drift-delay: 0.5s"
        viewBox="0 0 220 96"
        fill="none"
      >
        <path
          d="M36 78 H182 C198 78 208 67 208 54 C208 42 198 33 184 32 C178 16 160 8 144 15 C132 6 112 6 100 18 C84 10 64 19 59 35 C42 36 30 47 30 59 C30 70 33 78 36 78 Z"
          fill="#fbcfe8"
        />
      </svg>
      <svg
        class="animate-cloud-drift absolute right-[12%] top-[44%] w-56 opacity-28 sm:w-72"
        style="--drift-x: -38px; --drift-duration: 21s; --drift-delay: 2.2s"
        viewBox="0 0 200 90"
        fill="none"
      >
        <path
          d="M42 74 H158 C174 74 186 63 186 49 C186 36 176 26 162 25 C158 11 144 4 128 8 C118 2 102 2 92 12 C78 6 60 14 56 30 C40 31 28 42 28 54 C28 65 34 74 42 74 Z"
          fill="#bae6fd"
        />
      </svg>
    </div>

    <!-- === EFEK KHUSUS TEMA 10: ❄️ WINTER FROST (Salju Halus Turun Perlahan + Embun Dingin Tipis) === -->
    <div
      v-if="activeCozyTheme === 'winter-frost'"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <!-- Embun dingin tipis di tepi bawah -->
      <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-sky-100/14 via-sky-200/6 to-transparent blur-xl" />
      <template v-if="!isLowGraphics">
        <span
          v-for="(flake, idx) in displayedWinterFlakes"
          :key="`snow-${idx}`"
          class="animate-snow-fall absolute top-0 rounded-full bg-sky-50/90 opacity-0 shadow-[0_0_8px_rgba(186,230,253,0.85)]"
          :style="{
            left: flake.left,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            '--snow-duration': flake.duration,
            '--snow-delay': flake.delay,
            '--snow-sway': flake.sway,
          }"
        />
      </template>
    </div>

    <!-- === EFEK KHUSUS TEMA RAHASIA ULTIMATE 11: 🌃 NEON NIGHT CITY (City Skyline + Jendela Neon + Gerimis Cyan/Magenta) === -->
    <div
      v-if="activeCozyTheme === 'neon-night-city'"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <!-- Pendaran cakrawala kota neon Cyan & Magenta di bagian bawah -->
      <div
        class="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#ff2a85]/18 via-[#00f5d4]/10 to-transparent"
      />

      <!-- Gerimis Cahaya Neon Cyan & Magenta (0% di Ringan, 50% di Sedang, 100% di Tinggi) -->
      <template v-if="!isLowGraphics">
        <span
          v-for="(drop, idx) in displayedNeonDrizzle"
          :key="`neon-drop-${idx}`"
          class="animate-neon-drizzle absolute top-0 w-[1.8px] rounded-full opacity-0"
          :class="
            drop.isCyan
              ? 'bg-gradient-to-b from-transparent via-[#00f5d4]/80 to-[#00f5d4] shadow-[0_0_8px_#00f5d4]'
              : 'bg-gradient-to-b from-transparent via-[#ff2a85]/80 to-[#ff2a85] shadow-[0_0_8px_#ff2a85]'
          "
          :style="{
            left: drop.left,
            height: drop.height,
            '--drizzle-duration': drop.duration,
            '--drizzle-delay': drop.delay,
          }"
        />
      </template>

      <!-- Siluet Gedung Pencakar Langit (City Skyline) dengan jendela neon berkedip lembut -->
      <svg
        class="absolute inset-x-0 bottom-0 h-40 w-full sm:h-48"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 200 V106 H76 V200 M86 200 V68 H168 V200 M176 200 V124 H198 V48 H274 V200 M284 200 V116 H312 V88 H392 V200 M402 200 V126 H448 V36 H532 V200 M542 200 V112 H584 V78 H668 V200 M678 200 V128 H714 V58 H796 V200 M806 200 V110 H852 V44 H938 V200 M948 200 V118 H996 V72 H1082 V200 M1092 200 V90 H1200 V200 Z"
          fill="#070312"
          fill-opacity="0.92"
        />
        <!-- Garis puncak neon tipis pada gedung -->
        <line x1="86" y1="68" x2="168" y2="68" stroke="#00f5d4" stroke-width="2" opacity="0.65" />
        <line x1="198" y1="48" x2="274" y2="48" stroke="#ff2a85" stroke-width="2" opacity="0.7" />
        <line x1="448" y1="36" x2="532" y2="36" stroke="#00f5d4" stroke-width="2.2" opacity="0.75" />
        <line x1="714" y1="58" x2="796" y2="58" stroke="#ff2a85" stroke-width="2" opacity="0.65" />
        <line x1="852" y1="44" x2="938" y2="44" stroke="#00f5d4" stroke-width="2.2" opacity="0.7" />
        <line x1="996" y1="72" x2="1082" y2="72" stroke="#ff2a85" stroke-width="2" opacity="0.65" />
        <!-- Lampu jendela neon berkedip lembut -->
        <rect
          v-for="(win, idx) in neonSkylineWindows"
          :key="`nwin-${idx}`"
          :x="win.x"
          :y="win.y"
          width="10"
          height="14"
          rx="1.5"
          :fill="win.color"
          class="animate-neon-window"
          :style="{ '--win-duration': win.dur, '--win-delay': win.delay }"
        />
      </svg>
    </div>

    <!-- Awan Malam Lembut Mengambang (otomatis disembunyikan di laut dalam, kafe, perpustakaan, kota neon & matcha) -->
    <template v-if="showSkyClouds">
      <svg
        class="animate-cloud-drift absolute -left-8 top-[30%] w-48 opacity-25 drop-shadow-[0_4px_16px_rgba(233,213,255,0.2)] sm:w-64"
        style="--drift-x: 32px; --drift-duration: 15s; --drift-delay: 0s"
        viewBox="0 0 200 90"
        fill="none"
      >
        <path
          d="M42 74 H158 C174 74 186 63 186 49 C186 36 176 26 162 25 C158 11 144 4 128 8 C118 2 102 2 92 12 C78 6 60 14 56 30 C40 31 28 42 28 54 C28 65 34 74 42 74 Z"
          :fill="activeBg.cloudFill"
        />
        <circle cx="72" cy="48" r="2.5" fill="#ffffff" opacity="0.85" />
        <circle cx="136" cy="36" r="2" fill="#fef08a" opacity="0.9" />
      </svg>

      <svg
        class="animate-cloud-drift absolute -right-10 bottom-[10%] w-56 opacity-25 drop-shadow-[0_4px_16px_rgba(233,213,255,0.2)] sm:w-72"
        style="--drift-x: -36px; --drift-duration: 18s; --drift-delay: 2s"
        viewBox="0 0 220 96"
        fill="none"
      >
        <path
          d="M36 78 H182 C198 78 208 67 208 54 C208 42 198 33 184 32 C178 16 160 8 144 15 C132 6 112 6 100 18 C84 10 64 19 59 35 C42 36 30 47 30 59 C30 70 33 78 36 78 Z"
          :fill="activeBg.cloudFill"
        />
        <path d="M114 44 L116 49 L121 51 L116 53 L114 58 L112 53 L107 51 L112 49 Z" fill="#ffffff" opacity="0.9" />
      </svg>

      <svg
        class="animate-cloud-drift absolute bottom-[3%] left-[10%] hidden w-52 opacity-20 md:block"
        style="--drift-x: 26px; --drift-duration: 16s; --drift-delay: 4s"
        viewBox="0 0 200 84"
        fill="none"
      >
        <path
          d="M34 68 H164 C178 68 188 59 188 47 C188 36 178 27 166 26 C160 13 144 7 130 13 C118 6 101 8 92 18 C78 13 61 21 57 35 C42 36 30 45 30 55 C30 63 32 68 34 68 Z"
          :fill="activeBg.cloudFill"
        />
      </svg>
    </template>

    <!-- Efek Visual Rintik Hujan Miring Halus (aktif di Midnight Rainy Window ATAU saat Hujan BGM menyala) -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showRainLayer" class="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          v-for="(drop, idx) in displayedRainDrops"
          :key="`rain-${idx}`"
          class="animate-rain-drop absolute top-0 w-[1.5px] rounded-full bg-gradient-to-b"
          :class="
            activeCozyTheme === 'midnight-rain'
              ? 'from-transparent via-sky-200/80 to-blue-100/95'
              : 'from-transparent via-sky-100/75 to-pink-100/90'
          "
          :style="{
            left: drop.left,
            height: drop.height,
            '--rain-duration': drop.duration,
            '--rain-delay': drop.delay,
          }"
        />
      </div>
    </Transition>

    <!-- Lapisan HTML5 Canvas Partikel Spesifik per Tema (selalu muncul & adaptif kontras di Vibe Terang & Gelap) -->
    <canvas
      v-if="!isLowGraphics"
      ref="themeCanvasRef"
      class="pointer-events-none absolute inset-0 z-[5] h-full w-full"
    />

    <!-- Titik-titik bintang kecil & sparkle langit (disembunyikan pada laut dalam, perpustakaan indoor, & matcha) -->
    <template v-if="showSkyStarsAndMeteors">
      <span
        v-for="(star, index) in displayedTinyStars"
        :key="`dot-${index}`"
        class="animate-twinkle absolute rounded-full"
        :class="
          !isDarkTheme
            ? 'opacity-70'
            : activeCozyTheme === 'autumn-cafe'
              ? 'bg-white/95 opacity-45 shadow-[0_0_6px_rgba(255,255,255,0.85)]'
              : 'bg-white/95 opacity-100 shadow-[0_0_6px_rgba(255,255,255,0.85)]'
        "
        :style="{
          top: star.top,
          left: star.left,
          width: `${star.size}px`,
          height: `${star.size}px`,
          backgroundColor: !isDarkTheme ? activeBg.moon : undefined,
          '--twinkle-duration': star.duration,
          '--twinkle-delay': star.delay,
        }"
      />

      <!-- Bintang sparkle 4-sisi -->
      <svg
        v-for="(sparkle, index) in sparkles"
        :key="`sparkle-${index}`"
        class="animate-twinkle absolute"
        :style="{
          top: sparkle.top,
          left: sparkle.left,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          '--twinkle-duration': '4s',
          '--twinkle-delay': sparkle.delay,
        }"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
          :fill="!isDarkTheme ? activeBg.charmAccent : activeCozyTheme === 'astral-palace' ? '#34d399' : sparkle.color"
        />
      </svg>
    </template>
  </div>

  <!-- LAPISAN 2 (z-20, tembus klik / pointer-events-none): Ornamen Gantungan Sudut & Tepi Atas Melimpah + Bintang Jatuh -->
  <div
    aria-hidden="true"
    style="contain: strict"
    class="pointer-events-none fixed inset-0 z-20 overflow-hidden"
  >
    <!-- Ornamen Gantungan Atas Estetik (Kiri 4, Tengah-Atas 3 mini, Kanan 4 — 13 Tema & Palet, Pastel di Terang / Glow di Gelap) -->
    <TopHangingOrnaments />

    <!-- 3. EFEK BINTANG JATUH (disembunyikan pada laut dalam, perpustakaan indoor, & matcha; 0% Ringan, 50% Sedang, 100% Tinggi) -->
    <template v-if="!isLowGraphics && showSkyStarsAndMeteors">
      <div
        v-for="(meteor, idx) in displayedShootingStars"
        :key="`meteor-${idx}`"
        class="animate-shooting-star absolute flex items-center opacity-0"
        :style="{
          top: meteor.top,
          left: meteor.left,
          width: meteor.width,
          '--shoot-duration': meteor.duration,
          '--shoot-delay': meteor.delay,
        }"
      >
        <svg
          class="-mr-1 h-4 w-4 shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.95)]"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            :fill="activeCozyTheme === 'astral-palace' ? '#fef08a' : '#ffffff'"
          />
        </svg>
        <span
          class="h-[3px] flex-1 rounded-full bg-gradient-to-r shadow-[0_0_10px_rgba(249,168,212,0.8)]"
          :class="activeBg.tailGradient"
        />
      </div>
    </template>

    <!-- 4. PARTIKEL DEBU BINTANG EMAS (Golden Stardust) mengikuti kursor (hanya di Grafik Tinggi) -->
    <template v-if="activeCozyTheme === 'astral-palace' && graphicsConfig.enableCursorDust">
      <div
        v-for="dust in goldenDustTrail"
        :key="dust.id"
        class="animate-gold-dust pointer-events-none fixed"
        :style="{
          left: `${dust.x}px`,
          top: `${dust.y}px`,
          '--gdx': dust.gdx,
          '--gdy': dust.gdy,
        }"
      >
        <svg
          v-if="dust.isStar"
          :style="{ width: `${dust.size}px`, height: `${dust.size}px` }"
          class="drop-shadow-[0_0_8px_rgba(253,224,71,0.95)]"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#fde047" />
        </svg>
        <span
          v-else
          class="block rounded-full bg-amber-200 shadow-[0_0_8px_rgba(253,224,71,0.9)]"
          :style="{ width: `${dust.size}px`, height: `${dust.size}px` }"
        />
      </div>
    </template>
  </div>
</template>
