import type { CatBreedId, CozyThemeId, ThemeName } from '~/composables/useTwilightStorage'

export interface CatBreedPalette {
  id: CatBreedId
  headFill: string
  bodyFill: string
  bellyFill: string
  earOuterFill: string
  earOuterStroke: string
  earInnerOverride?: string
  tailFill: string
  tailTipFill: string
  pawFill: string
  pawStroke: string
  eyeInk: string
  noseFill: string
  foreheadStripe: string
  cheekStripeColor?: string
  muzzleFill?: string
  siameseMaskFill?: string
  calicoPatch1?: string
  calicoPatch2?: string
  tuxedoChestFill?: string
  isDarkFur?: boolean
}

export const CAT_BREED_PALETTES: Record<CatBreedId, CatBreedPalette> = {
  'snowy-white': {
    id: 'snowy-white',
    headFill: '#fff7fb',
    bodyFill: '#f5ecff',
    bellyFill: '#ffffff',
    earOuterFill: '#fff7fb',
    earOuterStroke: '#e9d5ff',
    tailFill: '#f3e8ff',
    tailTipFill: '#e9d5ff',
    pawFill: '#fff7fb',
    pawStroke: '#e9d5ff',
    eyeInk: '#3b215c',
    noseFill: '#f472b6',
    foreheadStripe: '#d8b4fe',
  },
  'misty-tabby': {
    id: 'misty-tabby',
    headFill: '#e7e5e4',
    bodyFill: '#d6d3d1',
    bellyFill: '#fef3c7',
    earOuterFill: '#cbd5e1',
    earOuterStroke: '#94a3b8',
    tailFill: '#cbd5e1',
    tailTipFill: '#94a3b8',
    pawFill: '#f5f5f4',
    pawStroke: '#cbd5e1',
    eyeInk: '#334155',
    noseFill: '#f472b6',
    foreheadStripe: '#94a3b8',
    cheekStripeColor: '#94a3b8',
  },
  'marmalade-ginger': {
    id: 'marmalade-ginger',
    headFill: '#fdba74',
    bodyFill: '#fb923c',
    bellyFill: '#ffedd5',
    earOuterFill: '#fb923c',
    earOuterStroke: '#c2410c',
    earInnerOverride: '#fed7aa',
    tailFill: '#fb923c',
    tailTipFill: '#fff7ed',
    pawFill: '#ffedd5',
    pawStroke: '#ea580c',
    eyeInk: '#431407',
    noseFill: '#fb7185',
    foreheadStripe: '#c2410c',
    cheekStripeColor: '#c2410c',
  },
  'matcha-calico': {
    id: 'matcha-calico',
    headFill: '#fffbf2',
    bodyFill: '#fef9ee',
    bellyFill: '#ffffff',
    earOuterFill: '#ea580c',
    earOuterStroke: '#78350f',
    earInnerOverride: '#fed7aa',
    tailFill: '#5c3317',
    tailTipFill: '#f59e0b',
    pawFill: '#fffbf2',
    pawStroke: '#d6b48c',
    eyeInk: '#3b1d0b',
    noseFill: '#f472b6',
    foreheadStripe: '#78350f',
    calicoPatch1: '#f59e0b',
    calicoPatch2: '#451a03',
  },
  'midnight-tuxedo': {
    id: 'midnight-tuxedo',
    headFill: '#1f2937',
    bodyFill: '#111827',
    bellyFill: '#f8fafc',
    earOuterFill: '#111827',
    earOuterStroke: '#475569',
    earInnerOverride: '#fda4af',
    tailFill: '#111827',
    tailTipFill: '#f8fafc',
    pawFill: '#f8fafc',
    pawStroke: '#94a3b8',
    eyeInk: '#111827',
    noseFill: '#fb7185',
    foreheadStripe: '#475569',
    muzzleFill: '#f8fafc',
    tuxedoChestFill: '#f8fafc',
    isDarkFur: true,
  },
  'mocha-siamese': {
    id: 'mocha-siamese',
    headFill: '#f6ebd8',
    bodyFill: '#efe0c6',
    bellyFill: '#fcf6ea',
    earOuterFill: '#5c3a21',
    earOuterStroke: '#3d2412',
    earInnerOverride: '#a98265',
    tailFill: '#5c3a21',
    tailTipFill: '#3d2412',
    pawFill: '#5c3a21',
    pawStroke: '#3d2412',
    eyeInk: '#1d4ed8',
    noseFill: '#3d2412',
    foreheadStripe: '#7c5132',
    siameseMaskFill: '#6b4426',
  },
  'twilight-lilac': {
    id: 'twilight-lilac',
    headFill: '#faf5ff',
    bodyFill: '#f3e8ff',
    bellyFill: '#ffffff',
    earOuterFill: '#c084fc',
    earOuterStroke: '#9333ea',
    earInnerOverride: '#f5d0fe',
    tailFill: '#c084fc',
    tailTipFill: '#a855f7',
    pawFill: '#faf5ff',
    pawStroke: '#c084fc',
    eyeInk: '#3b0764',
    noseFill: '#ec4899',
    foreheadStripe: '#a855f7',
    cheekStripeColor: '#c084fc',
  },
}

export function getCatBreedPalette(breedId: CatBreedId): CatBreedPalette {
  return CAT_BREED_PALETTES[breedId] ?? CAT_BREED_PALETTES['snowy-white']
}

export interface CatMascotThemePalette {
  /** Warna pendaran aura lingkaran di belakang kucing utama */
  auraInner: string
  auraOuter: string
  /** Warna headphone bawaan Kucing Utama */
  hpBand: string
  hpBandHighlight: string
  hpCupOuter: string
  hpCupInner: string
  hpLed: string
  /** Warna syal / kalung & lonceng bawaan kedua kucing */
  collarFill: string
  collarStroke: string
  bellFill: string
  /** Warna telinga bagian dalam, garis dahi, kumis & pipi */
  earStroke: string
  earInner: string
  foreheadMark: string
  whiskerColor: string
  cheekColor: string
  /** Warna aksen gelembung dialog, gelembung zzz & tombol mini kucing */
  bubbleBg: string
  bubbleBorder: string
  bubbleText: string
  /** Warna not musik & hati elusan */
  notePrimary: string
  noteSecondary: string
  /** Warna properti co-working (kacamata fokus, cangkang laptop, cangkir teh) */
  focusGlassesStroke: string
  laptopShell: string
  cupBody: string
  cupStroke: string
  /** Simbol percikan partikel saat diklik sesuai tema */
  burstSymbols: string[]
  /** Badge / penanda tema spesial */
  specialMode: 'none' | 'astral' | 'neon'
  /** Efek atmosfer mini halus untuk tema non-spesial */
  ambientAccent: 'none' | 'matcha' | 'ocean' | 'autumn' | 'frost' | 'honey' | 'sakura'
}

const DEFAULT_TWILIGHT_PALETTE: CatMascotThemePalette = {
  auraInner: '#f9a8d4',
  auraOuter: '#c084fc',
  hpBand: '#f9a8d4',
  hpBandHighlight: '#fdf2f8',
  hpCupOuter: '#c084fc',
  hpCupInner: '#f9a8d4',
  hpLed: '#fef9c3',
  collarFill: '#c4b5fd',
  collarStroke: '#e9d5ff',
  bellFill: '#fde68a',
  earStroke: '#e9d5ff',
  earInner: '#fbcfe8',
  foreheadMark: '#e9d5ff',
  whiskerColor: '#c4b5fd',
  cheekColor: '#f9a8d4',
  bubbleBg: 'rgba(58, 36, 92, 0.92)',
  bubbleBorder: 'rgba(249, 168, 212, 0.45)',
  bubbleText: '#fdf2f8',
  notePrimary: '#f9a8d4',
  noteSecondary: '#d8b4fe',
  focusGlassesStroke: '#a78bfa',
  laptopShell: '#4c1d95',
  cupBody: '#fbcfe8',
  cupStroke: '#f472b6',
  burstSymbols: ['💖', '✨', '⭐', '💗', '🎵', '♥'],
  specialMode: 'none',
  ambientAccent: 'none',
}

const BASE_THEME_PALETTES: Record<ThemeName, CatMascotThemePalette> = {
  twilight: DEFAULT_TWILIGHT_PALETTE,
  sakura: {
    ...DEFAULT_TWILIGHT_PALETTE,
    auraInner: '#fda4af',
    auraOuter: '#fdba74',
    hpBand: '#fda4af',
    hpBandHighlight: '#fff1f2',
    hpCupOuter: '#fb7185',
    hpCupInner: '#fed7aa',
    hpLed: '#fef08a',
    collarFill: '#fda4af',
    collarStroke: '#fed7aa',
    bellFill: '#fde68a',
    earStroke: '#fecdd3',
    earInner: '#fecdd3',
    foreheadMark: '#fed7aa',
    whiskerColor: '#fda4af',
    cheekColor: '#fda4af',
    bubbleBg: 'rgba(90, 34, 72, 0.92)',
    bubbleBorder: 'rgba(254, 215, 170, 0.5)',
    bubbleText: '#fff1f2',
    notePrimary: '#fda4af',
    noteSecondary: '#fed7aa',
    focusGlassesStroke: '#fb7185',
    laptopShell: '#7f1d4a',
    cupBody: '#ffe4e6',
    cupStroke: '#fb7185',
    burstSymbols: ['🍑', '✨', '💖', '⭐', '🎵', '♥'],
  },
  ocean: {
    ...DEFAULT_TWILIGHT_PALETTE,
    auraInner: '#38bdf8',
    auraOuter: '#0284c7',
    hpBand: '#7dd3fc',
    hpBandHighlight: '#f0f9ff',
    hpCupOuter: '#0284c7',
    hpCupInner: '#7dd3fc',
    hpLed: '#fef9c3',
    collarFill: '#38bdf8',
    collarStroke: '#bae6fd',
    bellFill: '#fde68a',
    earStroke: '#bae6fd',
    earInner: '#e0f2fe',
    foreheadMark: '#bae6fd',
    whiskerColor: '#7dd3fc',
    cheekColor: '#93c5fd',
    bubbleBg: 'rgba(14, 38, 66, 0.94)',
    bubbleBorder: 'rgba(125, 211, 252, 0.5)',
    bubbleText: '#f0f9ff',
    notePrimary: '#7dd3fc',
    noteSecondary: '#38bdf8',
    focusGlassesStroke: '#38bdf8',
    laptopShell: '#0c365c',
    cupBody: '#e0f2fe',
    cupStroke: '#38bdf8',
    burstSymbols: ['💧', '✨', '⭐', '🌊', '🎵', '💙'],
  },
}

const COZY_THEME_PALETTES: Partial<Record<CozyThemeId, CatMascotThemePalette>> = {
  'matcha-garden': {
    auraInner: '#4ade80',
    auraOuter: '#15803d',
    hpBand: '#86efac',
    hpBandHighlight: '#f0fdf4',
    hpCupOuter: '#166534',
    hpCupInner: '#86efac',
    hpLed: '#fef08a',
    collarFill: '#4ade80',
    collarStroke: '#bbf7d0',
    bellFill: '#fde68a',
    earStroke: '#bbf7d0',
    earInner: '#dcfce7',
    foreheadMark: '#a7f3d0',
    whiskerColor: '#86efac',
    cheekColor: '#fca5a5',
    bubbleBg: 'rgba(20, 44, 32, 0.94)',
    bubbleBorder: 'rgba(134, 239, 172, 0.52)',
    bubbleText: '#ecfdf5',
    notePrimary: '#86efac',
    noteSecondary: '#fde68a',
    focusGlassesStroke: '#4ade80',
    laptopShell: '#14532d',
    cupBody: '#dcfce7',
    cupStroke: '#22c55e',
    burstSymbols: ['🍵', '🍃', '✨', '🌱', '🎵', '💚'],
    specialMode: 'none',
    ambientAccent: 'matcha',
  },
  'autumn-cafe': {
    auraInner: '#fbbf24',
    auraOuter: '#c2410c',
    hpBand: '#fbbf24',
    hpBandHighlight: '#fffbeb',
    hpCupOuter: '#9a3412',
    hpCupInner: '#fdba74',
    hpLed: '#fef08a',
    collarFill: '#ea580c',
    collarStroke: '#fde68a',
    bellFill: '#fcd34d',
    earStroke: '#fed7aa',
    earInner: '#ffedd5',
    foreheadMark: '#fdba74',
    whiskerColor: '#fbbf24',
    cheekColor: '#fb923c',
    bubbleBg: 'rgba(56, 26, 14, 0.95)',
    bubbleBorder: 'rgba(251, 191, 36, 0.54)',
    bubbleText: '#fffbeb',
    notePrimary: '#fbbf24',
    noteSecondary: '#fb923c',
    focusGlassesStroke: '#f59e0b',
    laptopShell: '#7c2d12',
    cupBody: '#fef3c7',
    cupStroke: '#ea580c',
    burstSymbols: ['🍂', '☕', '✨', '🍁', '🎵', '🧡'],
    specialMode: 'none',
    ambientAccent: 'autumn',
  },
  'biolum-ocean': {
    auraInner: '#00f5d4',
    auraOuter: '#0891b2',
    hpBand: '#2dd4bf',
    hpBandHighlight: '#ecfeff',
    hpCupOuter: '#0e4c60',
    hpCupInner: '#5eead4',
    hpLed: '#00f5d4',
    collarFill: '#0d9488',
    collarStroke: '#5eead4',
    bellFill: '#67e8f9',
    earStroke: '#99f6e4',
    earInner: '#ccfbf1',
    foreheadMark: '#5eead4',
    whiskerColor: '#2dd4bf',
    cheekColor: '#67e8f9',
    bubbleBg: 'rgba(4, 30, 40, 0.95)',
    bubbleBorder: 'rgba(45, 212, 191, 0.56)',
    bubbleText: '#ecfeff',
    notePrimary: '#2dd4bf',
    noteSecondary: '#22d3ee',
    focusGlassesStroke: '#2dd4bf',
    laptopShell: '#083d4f',
    cupBody: '#ccfbf1',
    cupStroke: '#0d9488',
    burstSymbols: ['🫧', '🪼', '✨', '💎', '🎵', '🩵'],
    specialMode: 'none',
    ambientAccent: 'ocean',
  },
  'honey-library': {
    auraInner: '#fcd34d',
    auraOuter: '#b45309',
    hpBand: '#fcd34d',
    hpBandHighlight: '#fffbeb',
    hpCupOuter: '#78350f',
    hpCupInner: '#fde68a',
    hpLed: '#fef9c3',
    collarFill: '#d97706',
    collarStroke: '#fde68a',
    bellFill: '#fef08a',
    earStroke: '#fde68a',
    earInner: '#fef3c7',
    foreheadMark: '#fcd34d',
    whiskerColor: '#f59e0b',
    cheekColor: '#fbbf24',
    bubbleBg: 'rgba(48, 28, 16, 0.95)',
    bubbleBorder: 'rgba(252, 211, 77, 0.52)',
    bubbleText: '#fffbeb',
    notePrimary: '#fcd34d',
    noteSecondary: '#f59e0b',
    focusGlassesStroke: '#d97706',
    laptopShell: '#6b3410',
    cupBody: '#fef9c3',
    cupStroke: '#d97706',
    burstSymbols: ['🍯', '📖', '✨', '⭐', '🎵', '💛'],
    specialMode: 'none',
    ambientAccent: 'honey',
  },
  'pastel-cloudland': {
    auraInner: '#93c5fd',
    auraOuter: '#a5b4fc',
    hpBand: '#93c5fd',
    hpBandHighlight: '#f8fafc',
    hpCupOuter: '#4f46e5',
    hpCupInner: '#bfdbfe',
    hpLed: '#fef9c3',
    collarFill: '#818cf8',
    collarStroke: '#dbeafe',
    bellFill: '#fde68a',
    earStroke: '#dbeafe',
    earInner: '#e0e7ff',
    foreheadMark: '#bfdbfe',
    whiskerColor: '#93c5fd',
    cheekColor: '#fbcfe8',
    bubbleBg: 'rgba(42, 46, 88, 0.94)',
    bubbleBorder: 'rgba(147, 197, 253, 0.55)',
    bubbleText: '#f8fafc',
    notePrimary: '#93c5fd',
    noteSecondary: '#c7d2fe',
    focusGlassesStroke: '#60a5fa',
    laptopShell: '#312e81',
    cupBody: '#e0f2fe',
    cupStroke: '#60a5fa',
    burstSymbols: ['☁️', '✨', '⭐', '🩵', '🎵', '💫'],
    specialMode: 'none',
    ambientAccent: 'none',
  },
  'winter-frost': {
    auraInner: '#bae6fd',
    auraOuter: '#0284c7',
    hpBand: '#bae6fd',
    hpBandHighlight: '#ffffff',
    hpCupOuter: '#0369a1',
    hpCupInner: '#e0f2fe',
    hpLed: '#ffffff',
    collarFill: '#38bdf8',
    collarStroke: '#e0f2fe',
    bellFill: '#e0f2fe',
    earStroke: '#e0f2fe',
    earInner: '#dbeafe',
    foreheadMark: '#bae6fd',
    whiskerColor: '#7dd3fc',
    cheekColor: '#93c5fd',
    bubbleBg: 'rgba(20, 38, 58, 0.95)',
    bubbleBorder: 'rgba(186, 230, 253, 0.55)',
    bubbleText: '#f0f9ff',
    notePrimary: '#bae6fd',
    noteSecondary: '#ffffff',
    focusGlassesStroke: '#7dd3fc',
    laptopShell: '#0c4a6e',
    cupBody: '#f0f9ff',
    cupStroke: '#38bdf8',
    burstSymbols: ['❄️', '✨', '💎', '⭐', '🎵', '🤍'],
    specialMode: 'none',
    ambientAccent: 'frost',
  },
  'midnight-rain': {
    auraInner: '#60a5fa',
    auraOuter: '#1e3a8a',
    hpBand: '#60a5fa',
    hpBandHighlight: '#eff6ff',
    hpCupOuter: '#1e3a8a',
    hpCupInner: '#93c5fd',
    hpLed: '#fde68a',
    collarFill: '#2563eb',
    collarStroke: '#bfdbfe',
    bellFill: '#fde68a',
    earStroke: '#bfdbfe',
    earInner: '#dbeafe',
    foreheadMark: '#93c5fd',
    whiskerColor: '#60a5fa',
    cheekColor: '#93c5fd',
    bubbleBg: 'rgba(12, 22, 54, 0.95)',
    bubbleBorder: 'rgba(147, 197, 253, 0.52)',
    bubbleText: '#eff6ff',
    notePrimary: '#93c5fd',
    noteSecondary: '#fde68a',
    focusGlassesStroke: '#60a5fa',
    laptopShell: '#172554',
    cupBody: '#dbeafe',
    cupStroke: '#3b82f6',
    burstSymbols: ['🌧️', '✨', '🌙', '💧', '🎵', '💙'],
    specialMode: 'none',
    ambientAccent: 'none',
  },
  'sakura-lantern': {
    auraInner: '#f472b6',
    auraOuter: '#be185d',
    hpBand: '#f9a8d4',
    hpBandHighlight: '#fff1f2',
    hpCupOuter: '#9d174d',
    hpCupInner: '#fda4af',
    hpLed: '#fde68a',
    collarFill: '#ec4899',
    collarStroke: '#fce7f3',
    bellFill: '#fde68a',
    earStroke: '#fbcfe8',
    earInner: '#fbcfe8',
    foreheadMark: '#f9a8d4',
    whiskerColor: '#f472b6',
    cheekColor: '#f472b6',
    bubbleBg: 'rgba(54, 16, 60, 0.95)',
    bubbleBorder: 'rgba(244, 114, 182, 0.55)',
    bubbleText: '#fff1f2',
    notePrimary: '#f9a8d4',
    noteSecondary: '#fde68a',
    focusGlassesStroke: '#f472b6',
    laptopShell: '#831843',
    cupBody: '#fce7f3',
    cupStroke: '#ec4899',
    burstSymbols: ['🌸', '🏮', '✨', '💖', '🎵', '🎀'],
    specialMode: 'none',
    ambientAccent: 'sakura',
  },
  // === TEMA SPESIAL 1: 👑 ASTRAL CRYSTAL PALACE (STREAK 7 HARI) ===
  'astral-palace': {
    auraInner: '#34d399',
    auraOuter: '#fde047',
    hpBand: '#fde047',
    hpBandHighlight: '#fefce8',
    hpCupOuter: '#0f2759',
    hpCupInner: '#34d399',
    hpLed: '#fef08a',
    collarFill: '#1e3a8a',
    collarStroke: '#fde047',
    bellFill: '#34d399',
    earStroke: '#a7f3d0',
    earInner: '#d1fae5',
    foreheadMark: '#fde047',
    whiskerColor: '#6ee7b7',
    cheekColor: '#a7f3d0',
    bubbleBg: 'rgba(11, 20, 56, 0.96)',
    bubbleBorder: 'rgba(253, 224, 71, 0.68)',
    bubbleText: '#ecfdf5',
    notePrimary: '#fde047',
    noteSecondary: '#34d399',
    focusGlassesStroke: '#fde047',
    laptopShell: '#0f1f4d',
    cupBody: '#ecfdf5',
    cupStroke: '#34d399',
    burstSymbols: ['👑', '💎', '✨', '🌟', '🌙', '💚'],
    specialMode: 'astral',
    ambientAccent: 'none',
  },
  // === TEMA SPESIAL 2: 🌃 NEON NIGHT CITY (100% KOLEKSI TOKO ULTIMATE) ===
  'neon-night-city': {
    auraInner: '#00f5d4',
    auraOuter: '#ff2a85',
    hpBand: '#00f5d4',
    hpBandHighlight: '#ccfbf1',
    hpCupOuter: '#0e0724',
    hpCupInner: '#ff2a85',
    hpLed: '#00f5d4',
    collarFill: '#0e0724',
    collarStroke: '#00f5d4',
    bellFill: '#ff2a85',
    earStroke: '#00f5d4',
    earInner: '#ff8ec4',
    foreheadMark: '#00f5d4',
    whiskerColor: '#00f5d4',
    cheekColor: '#ff2a85',
    bubbleBg: 'rgba(9, 5, 22, 0.96)',
    bubbleBorder: 'rgba(0, 245, 212, 0.72)',
    bubbleText: '#f0fdfa',
    notePrimary: '#00f5d4',
    noteSecondary: '#ff2a85',
    focusGlassesStroke: '#00f5d4',
    laptopShell: '#0c0521',
    cupBody: '#ccfbf1',
    cupStroke: '#ff2a85',
    burstSymbols: ['⚡', '💠', '✨', '🌃', '🎵', '💜'],
    specialMode: 'neon',
    ambientAccent: 'none',
  },
}

/** Kembalikan palet & mode spesial maskot kucing berdasarkan Tema Toko, tema dasar, & Mode Gelap/Terang */
export function getCatMascotThemePalette(
  activeCozyTheme: CozyThemeId,
  baseTheme: ThemeName,
  isDarkTheme = true,
): CatMascotThemePalette {
  const base =
    activeCozyTheme !== 'classic' && COZY_THEME_PALETTES[activeCozyTheme]
      ? COZY_THEME_PALETTES[activeCozyTheme]!
      : BASE_THEME_PALETTES[baseTheme] ?? DEFAULT_TWILIGHT_PALETTE

  if (isDarkTheme) return base

  // Mode Terang (☀️ Daylight Pastel): gelembung ucapan & zzz kucing menjadi putih-kaca lembut berteks gelap kontras tinggi
  const lightTextByTheme: Partial<Record<CozyThemeId, string>> = {
    'matcha-garden': '#064e3b',
    'biolum-ocean': '#083344',
    'sakura-lantern': '#500724',
    'autumn-cafe': '#451a03',
    'honey-library': '#451a03',
    'pastel-cloudland': '#0f172a',
    'winter-frost': '#0f172a',
    'midnight-rain': '#0f172a',
    'astral-palace': '#1e1b4b',
    'neon-night-city': '#1e1b4b',
  }
  const lightBaseText: Record<ThemeName, string> = {
    twilight: '#2e1065',
    sakura: '#4c0519',
    ocean: '#0f172a',
  }
  const darkInk =
    activeCozyTheme !== 'classic'
      ? lightTextByTheme[activeCozyTheme] ?? '#1e1b4b'
      : lightBaseText[baseTheme] ?? '#2e1065'

  return {
    ...base,
    bubbleBg: 'rgba(255, 255, 255, 0.92)',
    bubbleBorder: `${base.hpCupOuter}55`,
    bubbleText: darkInk,
  }
}
