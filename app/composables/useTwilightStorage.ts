import { computed, onMounted, watch } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import {
  type FirebaseProfileUser,
  useFirebaseCloudSync,
} from '~/composables/useFirebaseCloudSync'
import { type AlarmSoundId, useSoundEffects } from '~/composables/useSoundEffects'

// Tipe tema warna website (disimpan di localStorage)
export type ThemeName = 'twilight' | 'sakura' | 'ocean'

// Tipe Pengaturan Kualitas Grafik bergaya game: Ringan (Low), Sedang (Medium), Tinggi (High)
export type GraphicsQuality = 'low' | 'medium' | 'high'

export interface GraphicsQualityMeta {
  id: GraphicsQuality
  label: string
  icon: string
  maxDpr: number
  targetFps: number
  particleScale: number
  enableCursorDust: boolean
  toastText: string
}

export const GRAPHICS_QUALITY_OPTIONS: Record<GraphicsQuality, GraphicsQualityMeta> = {
  low: {
    id: 'low',
    label: 'Low',
    icon: '🍃',
    maxDpr: 1,
    targetFps: 0,
    particleScale: 0,
    enableCursorDust: false,
    toastText: '⚙️ Grafik: 🍃 Low (Rendah) — Canvas jeda, tanpa blur/jejak kursor, hemat CPU/GPU',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    icon: '⚖️',
    maxDpr: 1.25,
    targetFps: 30,
    particleScale: 0.5,
    enableCursorDust: false,
    toastText: '⚙️ Grafik: ⚖️ Medium (Sedang) — Seimbang & ringan (30 FPS, 50% partikel)',
  },
  high: {
    id: 'high',
    label: 'High',
    icon: '✨',
    maxDpr: 2,
    targetFps: 60,
    particleScale: 1,
    enableCursorDust: true,
    toastText: '⚙️ Grafik: ✨ High (Tinggi) — Visual maksimal penuh (60 FPS, 100% efek & kilau)',
  },
}

function isValidGraphicsQuality(val: unknown): val is GraphicsQuality {
  return val === 'low' || val === 'medium' || val === 'high'
}

export interface ThemeOption {
  id: ThemeName
  name: string
  dotClass: string
  ringClass: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'twilight',
    name: 'Twilight Purple',
    dotClass: 'bg-gradient-to-br from-[#6366f1] via-[#9333ea] to-[#f9a8d4]',
    ringClass: 'ring-[#f9a8d4]',
  },
  {
    id: 'sakura',
    name: 'Pastel Berry Sunset',
    dotClass: 'bg-gradient-to-br from-[#f472b6] via-[#fb7185] to-[#fdba74]',
    ringClass: 'ring-[#fda4af]',
  },
  {
    id: 'ocean',
    name: 'Ocean Night',
    dotClass: 'bg-gradient-to-br from-[#1d4ed8] via-[#0284c7] to-[#7dd3fc]',
    ringClass: 'ring-[#7dd3fc]',
  },
]

// Tipe target kebiasaan: 'daily' (berulang tiap hari) atau 'once' (tugas sekali pakai)
export type HabitType = 'daily' | 'once'

// Mode bunyi alarm pada pengingat target: 'once' (🔔 Sekali) atau 'repeat' (⏰ Berkali-kali)
export type HabitAlarmMode = 'once' | 'repeat'

// Tipe data untuk setiap target kebiasaan (habit) + waktu pengingat opsional + mode dering
export interface HabitItem {
  id: string
  title: string
  completed: boolean
  type: HabitType
  reminderTime?: string // Format HH:MM opsional, misal "09:00"
  alarmMode: HabitAlarmMode // 'once' = 🔔 Dering Sekali, 'repeat' = ⏰ Dering Berkali-kali
}

// Tipe mode ekspresi maskot kucing interaktif
export type MascotMood = 'idle' | 'focus' | 'happy' | 'reminder' | 'celebrate'

// Tipe aksesoris maskot kucing (toko koin 🐟 + eksklusif milestone Kasih Sayang Lv. 10 & Lv. 20 MAX)
export type MascotAccessoryId =
  | 'none'
  | 'round-glasses'
  | 'leaf-sprout'
  | 'open-book'
  | 'pink-bow'
  | 'lofi-headphones'
  | 'knit-scarf'
  | 'witch-hat'
  | 'beret-hat'
  | 'star-halo'
  | 'star-crown'
  | 'soulmate-collar'
  | 'angel-wings'

export interface AccessoryItem {
  id: Exclude<MascotAccessoryId, 'none'>
  name: string
  icon: string
  cost: number | null // null = eksklusif hadiah Milestone Kasih Sayang (tidak dibeli dengan koin)
  milestoneLevel?: 10 | 20
}

export const MASCOT_ACCESSORIES: AccessoryItem[] = [
  { id: 'round-glasses', name: 'Kacamata Bulat', icon: '👓', cost: 12 },
  { id: 'leaf-sprout', name: 'Tunas Daun', icon: '🌱', cost: 15 },
  { id: 'open-book', name: 'Buku Terbuka', icon: '📖', cost: 18 },
  { id: 'pink-bow', name: 'Pita Pink', icon: '🎀', cost: 20 },
  { id: 'lofi-headphones', name: 'Headphone Lo-Fi', icon: '🎧', cost: 22 },
  { id: 'knit-scarf', name: 'Syal Rajut', icon: '🧣', cost: 25 },
  { id: 'witch-hat', name: 'Topi Penyihir', icon: '🧙', cost: 30 },
  { id: 'beret-hat', name: 'Topi Baret', icon: '🎨', cost: 30 },
  { id: 'star-halo', name: 'Halo Bintang', icon: '😇', cost: 45 },
  { id: 'star-crown', name: 'Mahkota Bintang', icon: '👑', cost: 50 },
  { id: 'soulmate-collar', name: 'Kalung Hati Bintang', icon: '💖', cost: null, milestoneLevel: 10 },
  { id: 'angel-wings', name: 'Sayap Malaikat', icon: '✨', cost: null, milestoneLevel: 20 },
]

export const SHOP_PURCHASABLE_ACCESSORY_IDS: Exclude<MascotAccessoryId, 'none'>[] =
  MASCOT_ACCESSORIES.filter(item => item.cost !== null).map(item => item.id)

const VALID_ACCESSORY_IDS = new Set<string>(['none', ...MASCOT_ACCESSORIES.map(a => a.id)])

function isValidAccessoryId(val: unknown): val is MascotAccessoryId {
  return typeof val === 'string' && VALID_ACCESSORY_IDS.has(val)
}

function sanitizeOwnedAccessories(raw: unknown): MascotAccessoryId[] {
  const unique = new Set<MascotAccessoryId>()
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isValidAccessoryId(item) && item !== 'none') {
        unique.add(item)
      }
    }
  }
  return Array.from(unique)
}

// --- Sistem Toko Koleksi Kucing (7 Ras/Warna Kucing + Kustomisasi 2 Kucing) ---
export type CatBreedId =
  | 'snowy-white'
  | 'misty-tabby'
  | 'marmalade-ginger'
  | 'matcha-calico'
  | 'midnight-tuxedo'
  | 'mocha-siamese'
  | 'twilight-lilac'

export type CatTargetSlot = 'main' | 'mini' | 'both'

export interface CatBreedItem {
  id: CatBreedId
  name: string
  subtitle: string
  cost: number // 0 = Gratis / Bawaan Awal
  description: string
}

export const CAT_BREEDS: CatBreedItem[] = [
  {
    id: 'snowy-white',
    name: 'Kucing Putih Salju',
    subtitle: 'Snowy White',
    cost: 0,
    description: 'Bawaan awal • Putih salju lembut menenangkan',
  },
  {
    id: 'misty-tabby',
    name: 'Kucing Abu Tabby',
    subtitle: 'Misty Tabby',
    cost: 0,
    description: 'Bawaan awal • Abu krem hangat dengan corak tabby',
  },
  {
    id: 'marmalade-ginger',
    name: 'Kucing Oren',
    subtitle: 'Marmalade Ginger',
    cost: 40,
    description: 'Oranye hangat ceria dengan belang pipi khas',
  },
  {
    id: 'matcha-calico',
    name: 'Kucing Calico',
    subtitle: 'Matcha & Caramel Calico',
    cost: 60,
    description: 'Putih krem dengan bercak oranye & cokelat gelap',
  },
  {
    id: 'midnight-tuxedo',
    name: 'Kucing Tuxedo',
    subtitle: 'Midnight Tuxedo',
    cost: 75,
    description: 'Hitam pekat elegan dengan dada & kaus kaki putih',
  },
  {
    id: 'mocha-siamese',
    name: 'Kucing Siamese',
    subtitle: 'Mocha Siamese',
    cost: 90,
    description: 'Krem lembut dengan telinga, wajah & ekor cokelat tua',
  },
  {
    id: 'twilight-lilac',
    name: 'Kucing Ragdoll / Lavender',
    subtitle: 'Twilight Lilac',
    cost: 120,
    description: 'Putih mutiara dengan gradasi telinga & ekor ungu pastel',
  },
]

const VALID_CAT_BREED_IDS = new Set<string>(CAT_BREEDS.map(c => c.id))

function isValidCatBreedId(val: unknown): val is CatBreedId {
  return typeof val === 'string' && VALID_CAT_BREED_IDS.has(val)
}

function sanitizeOwnedCats(raw: unknown): CatBreedId[] {
  const set = new Set<CatBreedId>(['snowy-white', 'misty-tabby'])
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isValidCatBreedId(item)) {
        set.add(item)
      }
    }
  }
  return Array.from(set)
}

interface CatCustomizationRecord {
  ownedCats: CatBreedId[]
  mainCatType: CatBreedId
  miniCatType: CatBreedId
  syncCatAccessories: boolean
  mainCatAccessory: MascotAccessoryId
  miniCatAccessory: MascotAccessoryId
}

// Tipe 11 Tema Latar Belakang Beranimasi (Cozy Themes) di Toko Aksesoris
export type CozyThemeId =
  | 'classic'
  | 'midnight-rain'
  | 'autumn-cafe'
  | 'matcha-garden'
  | 'sakura-lantern'
  | 'biolum-ocean'
  | 'honey-library'
  | 'pastel-cloudland'
  | 'winter-frost'
  | 'astral-palace'
  | 'neon-night-city'

export interface CozyThemeOption {
  id: CozyThemeId
  name: string
  icon: string
  cost: number | null // null = eksklusif hadiah 7-Day Full Goal Streak atau Koleksi 100% Toko
  description: string
  swatchClass: string
  streakRequired?: number
  isUltimateCollection?: boolean
}

export const ASTRAL_PALACE_STREAK_GOAL = 7
export const ASTRAL_PALACE_STREAK_FISH_REWARD = 15

// Pola getaran lembut Web Vibration API (hanya aktif di perangkat yang mendukung `navigator.vibrate`)
export const VIBRATION_PATTERNS = {
  pomodoroDone: [250, 120, 250, 120, 450] as number[],
  habitReminder: [200, 100, 200] as number[],
  microHaptic: 25,
} as const

export const COZY_THEMES: CozyThemeOption[] = [
  {
    id: 'classic',
    name: 'Twilight Klasik',
    icon: '💜',
    cost: 0,
    description: 'Gradasi ungu-pink senja & kerlip bintang halus',
    swatchClass: 'bg-gradient-to-br from-[#261647] via-[#6d28d9] to-[#f9a8d4]',
  },
  {
    id: 'midnight-rain',
    name: 'Midnight Rainy Window',
    icon: '🌧️',
    cost: 20,
    description: 'Langit malam indigo, hujan miring & bokeh lampu kota',
    swatchClass: 'bg-gradient-to-br from-[#0b102c] via-[#1d3461] to-[#facc15]',
  },
  {
    id: 'autumn-cafe',
    name: 'Cozy Autumn Cafe',
    icon: '🍂',
    cost: 30,
    description: 'Karamel hangat, daun gugur berputar & cahaya kafe sore',
    swatchClass: 'bg-gradient-to-br from-[#3b1f14] via-[#9a4a24] to-[#fbbf24]',
  },
  {
    id: 'matcha-garden',
    name: 'Matcha Garden',
    icon: '🍵',
    cost: 35,
    description: 'Hijau matcha & sage tenang dengan daun teh melayang pelan',
    swatchClass: 'bg-gradient-to-br from-[#1b2e25] via-[#2d4739] to-[#86efac]',
  },
  {
    id: 'sakura-lantern',
    name: 'Sakura Lantern Festival',
    icon: '🌸',
    cost: 40,
    description: 'Langit ungu-magenta, kelopak sakura & lentera emas',
    swatchClass: 'bg-gradient-to-br from-[#3b124d] via-[#be3a7a] to-[#fde68a]',
  },
  {
    id: 'biolum-ocean',
    name: 'Bioluminescent Ocean',
    icon: '🌊',
    cost: 45,
    description: 'Biru laut dalam dengan gelembung cahaya cyan naik perlahan',
    swatchClass: 'bg-gradient-to-br from-[#091e2c] via-[#11384a] to-[#22d3ee]',
  },
  {
    id: 'honey-library',
    name: 'Honey Library',
    icon: '🍯',
    cost: 50,
    description: 'Cokelat perpustakaan hangat & amber dengan debu emas berkilau',
    swatchClass: 'bg-gradient-to-br from-[#241710] via-[#3d2618] to-[#fbbf24]',
  },
  {
    id: 'pastel-cloudland',
    name: 'Pastel Cloudland',
    icon: '☁️',
    cost: 55,
    description: 'Langit lavender-biru lembut dengan awan bergerak & kilau bintang',
    swatchClass: 'bg-gradient-to-br from-[#27294a] via-[#433e6e] to-[#f9a8d4]',
  },
  {
    id: 'winter-frost',
    name: 'Winter Frost',
    icon: '❄️',
    cost: 60,
    description: 'Biru es sejuk menenangkan dengan salju halus turun perlahan',
    swatchClass: 'bg-gradient-to-br from-[#152536] via-[#26415e] to-[#bae6fd]',
  },
  {
    id: 'astral-palace',
    name: 'Astral Crystal Palace',
    icon: '👑',
    cost: null,
    streakRequired: ASTRAL_PALACE_STREAK_GOAL,
    description: 'Aurora Borealis, bulan perak, bintang jatuh & debu emas',
    swatchClass: 'bg-gradient-to-br from-[#08102d] via-[#10b981] to-[#fde047]',
  },
  {
    id: 'neon-night-city',
    name: 'Neon Night City',
    icon: '🌃',
    cost: null,
    isUltimateCollection: true,
    description: 'Skyline kota neon malam, gerimis Cyan-Magenta & pendaran ganda',
    swatchClass: 'bg-gradient-to-br from-[#090514] via-[#00f5d4] to-[#ff2a85]',
  },
]

export const NEON_CITY_REQUIRED_THEME_IDS: CozyThemeId[] = COZY_THEMES.filter(
  t => t.id !== 'classic' && t.id !== 'neon-night-city',
).map(t => t.id)

// --- Sistem 12 Kursor Bertema Dinamis (+ Default / Mati) yang Terbuka Otomatis Sesuai Tema Dimiliki ---
export type CursorStyleId =
  | 'off'
  | 'starlight-wand'
  | 'cat-paw'
  | 'raindrop-ripple'
  | 'maple-leaf'
  | 'sakura-petal'
  | 'matcha-leaf'
  | 'jellyfish-glow'
  | 'golden-quill'
  | 'fluffy-cloud'
  | 'ice-crystal'
  | 'astral-prism'
  | 'cyber-neon-bolt'

export interface CursorStyleOption {
  id: CursorStyleId
  name: string
  icon: string
  description: string
  requiredTheme?: Exclude<CozyThemeId, 'classic'>
  requiredThemeName?: string
  accentColor: string
  secondaryColor: string
}

export const CURSOR_OPTIONS: CursorStyleOption[] = [
  {
    id: 'off',
    name: 'Default / Mati',
    icon: '🖱️',
    description: 'Gunakan kursor standar perangkat tanpa efek',
    accentColor: '#94a3b8',
    secondaryColor: '#cbd5e1',
  },
  {
    id: 'starlight-wand',
    name: 'Starlight Wand',
    icon: '✦',
    description: 'Bintang twilight dengan jejak kilau ungu-pink lembut',
    accentColor: '#f9a8d4',
    secondaryColor: '#c084fc',
  },
  {
    id: 'cat-paw',
    name: 'Cat Paw',
    icon: '🐾',
    description: 'Telapak kaki kucing imut dengan jejak tapak memudar',
    accentColor: '#fda4af',
    secondaryColor: '#fbcfe8',
  },
  {
    id: 'raindrop-ripple',
    name: 'Raindrop Ripple',
    icon: '🌧️',
    description: 'Tetes hujan bercahaya dengan riak air lembut',
    requiredTheme: 'midnight-rain',
    requiredThemeName: 'Midnight Rainy',
    accentColor: '#60a5fa',
    secondaryColor: '#bae6fd',
  },
  {
    id: 'maple-leaf',
    name: 'Maple Leaf',
    icon: '🍂',
    description: 'Daun maple musim gugur yang melayang hangat',
    requiredTheme: 'autumn-cafe',
    requiredThemeName: 'Cozy Autumn Cafe',
    accentColor: '#fb923c',
    secondaryColor: '#fbbf24',
  },
  {
    id: 'sakura-petal',
    name: 'Sakura Petal',
    icon: '🌸',
    description: 'Kelopak bunga sakura dengan kilau lentera emas',
    requiredTheme: 'sakura-lantern',
    requiredThemeName: 'Sakura Lantern',
    accentColor: '#f472b6',
    secondaryColor: '#fde68a',
  },
  {
    id: 'matcha-leaf',
    name: 'Matcha Whisk / Leaf',
    icon: '🍵',
    description: 'Daun teh hijau segar dengan serpihan matcha lembut',
    requiredTheme: 'matcha-garden',
    requiredThemeName: 'Matcha Garden',
    accentColor: '#4ade80',
    secondaryColor: '#bbf7d0',
  },
  {
    id: 'jellyfish-glow',
    name: 'Jellyfish Glow',
    icon: '🪼',
    description: 'Ubur-ubur pendar laut dalam dengan gelembung cyan',
    requiredTheme: 'biolum-ocean',
    requiredThemeName: 'Bioluminescent Ocean',
    accentColor: '#00f5d4',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'golden-quill',
    name: 'Golden Quill',
    icon: '✒️',
    description: 'Pena bulu emas perpustakaan dengan debu tinta berkilau',
    requiredTheme: 'honey-library',
    requiredThemeName: 'Honey Library',
    accentColor: '#fcd34d',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'fluffy-cloud',
    name: 'Fluffy Cloud',
    icon: '☁️',
    description: 'Awan pastel empuk dengan jejak bintang langit',
    requiredTheme: 'pastel-cloudland',
    requiredThemeName: 'Pastel Cloudland',
    accentColor: '#93c5fd',
    secondaryColor: '#c4b5fd',
  },
  {
    id: 'ice-crystal',
    name: 'Ice Crystal',
    icon: '❄️',
    description: 'Kristal es bersinar dengan serpihan salju dingin',
    requiredTheme: 'winter-frost',
    requiredThemeName: 'Winter Frost',
    accentColor: '#7dd3fc',
    secondaryColor: '#e0f2fe',
  },
  {
    id: 'astral-prism',
    name: 'Astral Prism',
    icon: '💎',
    description: 'Prisma kristal aurora dengan jejak konstelasi emas',
    requiredTheme: 'astral-palace',
    requiredThemeName: 'Astral Crystal',
    accentColor: '#34d399',
    secondaryColor: '#fde047',
  },
  {
    id: 'cyber-neon-bolt',
    name: 'Cyber Neon Bolt',
    icon: '⚡',
    description: 'Kilat neon cyberpunk dengan jejak ganda Cyan & Magenta',
    requiredTheme: 'neon-night-city',
    requiredThemeName: 'Neon Night City',
    accentColor: '#00f5d4',
    secondaryColor: '#ff2a85',
  },
]

const VALID_CURSOR_IDS = new Set<string>(CURSOR_OPTIONS.map(c => c.id))

function isValidCursorId(val: unknown): val is CursorStyleId {
  return typeof val === 'string' && VALID_CURSOR_IDS.has(val)
}

export function getCursorOptionByTheme(cozyId: CozyThemeId): CursorStyleOption | null {
  if (cozyId === 'classic') return null
  return CURSOR_OPTIONS.find(c => c.requiredTheme === cozyId) ?? null
}

interface CozyThemeRecord {
  owned: CozyThemeId[]
  active: CozyThemeId
}

interface FullGoalStreakRecord {
  count: number
  lastFullDate: string
  lastRewardClaimedDate?: string
}

// --- Tipe & Kolam 36 Kartu Gacha "💌 Pesan Rahasia Kucing" (2 🐟 / tarik + Auto-Drop Bar Kasih Sayang) ---
export type SecretCardCategoryId = 'encourage' | 'fact' | 'dad-joke' | 'flirt'

export interface SecretCardCategoryMeta {
  id: SecretCardCategoryId
  label: string
  shortLabel: string
  icon: string
  badgeClass: string
}

export interface SecretCatCard {
  id: string
  number: number
  name: string
  category: SecretCardCategoryId
  emoji: string
  text: string
}

export interface SecretCardDrawResult {
  card: SecretCatCard
  isNew: boolean
  bonusAffinity: number
  bonusFish?: number
  source?: 'gacha' | 'affinity-drop'
  drawId: number
}

export const SECRET_CARD_GACHA_COST = 2
export const AFFINITY_DROP_DUPLICATE_FISH_BONUS = 5

export const SECRET_CARD_CATEGORIES: Record<SecretCardCategoryId, SecretCardCategoryMeta> = {
  encourage: {
    id: 'encourage',
    label: 'Penyemangat',
    shortLabel: 'Penyemangat',
    icon: '💖',
    badgeClass: 'cozy-badge',
  },
  fact: {
    id: 'fact',
    label: 'Fakta Kucing',
    shortLabel: 'Fakta Kucing',
    icon: '🐾',
    badgeClass: 'cozy-badge',
  },
  'dad-joke': {
    id: 'dad-joke',
    label: 'Jokes Bapak Kucing',
    shortLabel: 'Jokes Bapak Kucing',
    icon: '🤣',
    badgeClass: 'cozy-badge',
  },
  flirt: {
    id: 'flirt',
    label: 'Gombalan Kucing',
    shortLabel: 'Gombalan Kucing',
    icon: '💘',
    badgeClass: 'cozy-badge',
  },
}

export const SECRET_CAT_CARDS: SecretCatCard[] = [
  // Kategori 1: 💖 Penyemangat (9 Kartu: #01–#06 + #19–#21)
  {
    id: 'card-01',
    number: 1,
    name: 'Langkah 1% Lebih Hebat',
    category: 'encourage',
    emoji: '😻',
    text: 'Meow~ Kamu nggak harus langsung hebat hari ini, cukup lebih maju 1% dari kemarin saja kucing sudah bangga!',
  },
  {
    id: 'card-02',
    number: 2,
    name: 'Pelan-Pelan Mengejar Mimpi',
    category: 'encourage',
    emoji: '🐱',
    text: 'Pelan-pelan asal jalan, bahkan kucing pun butuh 16 jam tidur buat siap lari kencang mengejar mimpi~',
  },
  {
    id: 'card-03',
    number: 3,
    name: 'Tarik Napas 3 Detik',
    category: 'encourage',
    emoji: '😽',
    text: 'Kalau kepalamu mulai penuh, tarik napas 3 detik, elus aku sebentar, lalu kita lanjut lagi bareng-bareng!',
  },
  {
    id: 'card-04',
    number: 4,
    name: 'Bintang di Langit Gelap',
    category: 'encourage',
    emoji: '🐈‍⬛',
    text: 'Bintang paling terang cuma kelihatan pas langit gelap. Jadi wajar kalau proses belajarmu terasa menantang!',
  },
  {
    id: 'card-05',
    number: 5,
    name: 'Hadiah untuk Masa Depan',
    category: 'encourage',
    emoji: '😸',
    text: 'Satu sesi fokus yang selesai hari ini adalah hadiah terbaik buat dirimu di masa depan. Semangat terus ya~',
  },
  {
    id: 'card-06',
    number: 6,
    name: 'Halamanmu Sendiri',
    category: 'encourage',
    emoji: '🐾',
    text: 'Jangan bandingkan bab 1-mu dengan bab 20 orang lain. Fokus saja sama halamanmu sekarang!',
  },

  // Kategori 2: 🐾 Fakta Kucing (9 Kartu: #07–#12 + #22–#24)
  {
    id: 'card-07',
    number: 7,
    name: 'Tulus Tanpa Rasa Manis',
    category: 'fact',
    emoji: '🙀',
    text: 'Fakta Kucing: Kucing tidak bisa merasakan rasa manis! Jadi mereka suka kamu bukan karena kamu manis, tapi tulus dari hati~',
  },
  {
    id: 'card-08',
    number: 8,
    name: 'Atlet Rebahan Profesional',
    category: 'fact',
    emoji: '😼',
    text: 'Fakta Kucing: Kucing menghabiskan sekitar 70% hidupnya untuk tidur. Secara teknis mereka adalah atlet rebahan profesional.',
  },
  {
    id: 'card-09',
    number: 9,
    name: 'Sidik Hidung Spesial',
    category: 'fact',
    emoji: '🐱',
    text: 'Fakta Kucing: Sidik hidung setiap kucing itu unik seperti sidik jari manusia—tidak ada dua kucing dengan pola hidung sama!',
  },
  {
    id: 'card-10',
    number: 10,
    name: 'Bahasa Khusus Manusia',
    category: 'fact',
    emoji: '😻',
    text: 'Fakta Kucing: Kucing dewasa jarang mengeong ke sesama kucing; mereka mengeong khusus hanya untuk berkomunikasi dengan manusia!',
  },
  {
    id: 'card-11',
    number: 11,
    name: 'Dengkuran Menenangkan',
    category: 'fact',
    emoji: '😽',
    text: 'Fakta Kucing: Dengkuran kucing berfrekuensi 25–150 Hz, yang secara ilmiah terbukti membantu menurunkan stres dan menenangkan jantung.',
  },
  {
    id: 'card-12',
    number: 12,
    name: 'Lompatan Super 6 Kali',
    category: 'fact',
    emoji: '🐈‍⬛',
    text: 'Fakta Kucing: Kucing bisa melompat hingga 6 kali tinggi tubuhnya sendiri dalam sekali lompatan tanpa pemanasan!',
  },

  // Kategori 3: 🤣 Jokes Bapak Kucing (9 Kartu: #13–#18 + #25–#27)
  {
    id: 'card-13',
    number: 13,
    name: 'Kucing vs Kucoba-Coba',
    category: 'dad-joke',
    emoji: '😹',
    text: 'Kenapa kucing kalau lagi jalan suka berhenti tiba-tiba? ... Soalnya kalau jalan terus namanya bukan kucing, tapi kucoba-coba~',
  },
  {
    id: 'card-14',
    number: 14,
    name: 'Kucing Paling Romantis',
    category: 'dad-joke',
    emoji: '😼',
    text: 'Kucing apa yang paling romantis dan bikin baper? ... Kucing-ta padamu selamanya~',
  },
  {
    id: 'card-15',
    number: 15,
    name: 'Hewan Paling Pendiam',
    category: 'dad-joke',
    emoji: '😹',
    text: 'Hewan apa yang paling pendiam dan nggak pernah protes? ... Semut. Soalnya kalau berisik namanya se-sound system!',
  },
  {
    id: 'card-16',
    number: 16,
    name: 'Rahasia Air Laut Asin',
    category: 'dad-joke',
    emoji: '🙀',
    text: 'Kenapa air laut rasanya asin? ... Soalnya ikannya pada keringetan habis dikejar-kejar kucing!',
  },
  {
    id: 'card-17',
    number: 17,
    name: 'Kucing Tukang Genteng',
    category: 'dad-joke',
    emoji: '😹',
    text: 'Kucing apa yang sering dipakai bapak-bapak buat benerin genteng? ... Kucing-kucing inggris (kunci inggris)!',
  },
  {
    id: 'card-18',
    number: 18,
    name: 'Beda Kamu & Jam Dinding',
    category: 'dad-joke',
    emoji: '😸',
    text: 'Apa bedanya kamu sama jam dinding? ... Kalau jam dinding muter-muter di tembok, kalau kamu muter-muter di pikiran terus~',
  },

  // Tambahan Kategori 💖 Penyemangat (#19–#21)
  {
    id: 'card-19',
    number: 19,
    name: 'Tidur Siang Bukan Malas',
    category: 'encourage',
    emoji: '😴',
    text: 'Meow~ Kucing saja butuh mengisi ulang energi sebelum melompat tinggi. Istirahatmu hari ini adalah bagian dari progres!',
  },
  {
    id: 'card-20',
    number: 20,
    name: 'Fokus Tajam Mata Kucing',
    category: 'encourage',
    emoji: '😼',
    text: 'Sekali mengunci target, kucing tidak akan berkedip. Kamu juga pasti bisa menuntaskan satu tugas ini sampai tuntas!',
  },
  {
    id: 'card-21',
    number: 21,
    name: 'Cakar Kecil, Langkah Besar',
    category: 'encourage',
    emoji: '🐾',
    text: 'Tidak apa-apa melangkah pelan dengan cakar kecil, yang penting arahmu tetap maju menuju impianmu, purr~',
  },

  // Tambahan Kategori 🐾 Fakta Kucing (#22–#24)
  {
    id: 'card-22',
    number: 22,
    name: 'Kumis Radar Super',
    category: 'fact',
    emoji: '🐱',
    text: 'Fakta Kucing: Kumis kucing (vibrissae) terhubung langsung ke sistem saraf dan bisa mendeteksi perubahan arah angin sekecil apa pun!',
  },
  {
    id: 'card-23',
    number: 23,
    name: 'Sidik Hidung Unik',
    category: 'fact',
    emoji: '👃',
    text: 'Fakta Kucing: Pola tekstur pada hidung setiap kucing berbeda-beda dan seunik sidik jari manusia.',
  },
  {
    id: 'card-24',
    number: 24,
    name: 'Frekuensi Dengkuran Penyembuh',
    category: 'fact',
    emoji: '💗',
    text: 'Fakta Kucing: Suara dengkuran (purring) kucing berada di frekuensi 25–150 Hz yang membantu menenangkan stres dan merelaksasi otot.',
  },

  // Tambahan Kategori 🤣 Jokes Bapak Kucing (#25–#27)
  {
    id: 'card-25',
    number: 25,
    name: 'Kucing Apa yang Suka Ngitung?',
    category: 'dad-joke',
    emoji: '🧮',
    text: 'Kucing apa yang jago matematika? Kucing-kalikan cintaku padamu... eh, maksudnya Kalku-meong! Purr~',
  },
  {
    id: 'card-26',
    number: 26,
    name: 'Kucing Apa yang Bikin Kaget?',
    category: 'dad-joke',
    emoji: '🙀',
    text: 'Kucing apa yang sering muncul tiba-tiba di depan pintu? Kucing-gakan napas lihat deadline! Meow~',
  },
  {
    id: 'card-27',
    number: 27,
    name: 'Kucing Apa yang Anti Nyasar?',
    category: 'dad-joke',
    emoji: '🗺️',
    text: 'Kucing apa yang nggak pernah tersesat pas jalan-jalan? Kucing-peta (GPS)! Bapak-bapak anabul approve!',
  },

  // Kategori Baru: 💘 Gombalan Kucing (#28–#36, 9 Kartu Penuh)
  {
    id: 'card-28',
    number: 28,
    name: 'Sembilan Nyawa',
    category: 'flirt',
    emoji: '💘',
    text: 'Katanya kucing punya 9 nyawa, tapi kesembilan nyawaku semuanya habis cuma buat nungguin kamu fokus bareng aku, meow~',
  },
  {
    id: 'card-29',
    number: 29,
    name: 'Lebih Manis dari Ikan',
    category: 'flirt',
    emoji: '😻',
    text: 'Aku memang nggak bisa ngerasain rasa manis, tapi tiap lihat kamu nyelesaiin target harian, hatiku langsung meleleh!',
  },
  {
    id: 'card-30',
    number: 30,
    name: 'Kotak Kardus',
    category: 'flirt',
    emoji: '📦',
    text: 'Kucing memang paling suka masuk kotak kardus, tapi tempat paling nyaman buatku tetap di sudut layar nemenin kamu!',
  },
  {
    id: 'card-31',
    number: 31,
    name: 'Gravitasi Meja',
    category: 'flirt',
    emoji: '😽',
    text: 'Hobi kucing itu menjatuhkan barang dari atas meja, kalau kamu hobinya menjatuhkan hatiku setiap hari, purr~',
  },
  {
    id: 'card-32',
    number: 32,
    name: 'Dengkuran Rindu',
    category: 'flirt',
    emoji: '💞',
    text: 'Tahu nggak kenapa aku mendengkur kencang tiap kamu elus? Soalnya frekuensi detak jantungku ikut irama namamu!',
  },
  {
    id: 'card-33',
    number: 33,
    name: 'Cakar Pencuri',
    category: 'flirt',
    emoji: '🐾',
    text: 'Hati-hati sama cakar kecilku ya, soalnya diam-diam sudah berhasil mencuri perhatianmu sejak sesi fokus pertama!',
  },
  {
    id: 'card-34',
    number: 34,
    name: 'Bulu Halus',
    category: 'flirt',
    emoji: '✨',
    text: 'Boleh pegang buluku sepuasnya, asal jangan pernah lepasin semangatmu buat ngejar mimpi ya, Sayang-meong!',
  },
  {
    id: 'card-35',
    number: 35,
    name: 'Lampu Senter Malam',
    category: 'flirt',
    emoji: '🌟',
    text: 'Mata kucing bisa bersinar di tempat gelap, persis kayak senyummu yang selalu menerangi hari-hariku yang capek!',
  },
  {
    id: 'card-36',
    number: 36,
    name: 'Majikan Sejati',
    category: 'flirt',
    emoji: '👑',
    text: 'Di rumah mungkin aku yang jadi majikan, tapi di hati ini kamu pemilik satu-satunya. Semangat terus ya!',
  },
  // Tambahan Kategori 1: 💖 Penyemangat (7 Kartu Baru: #37–#43, Total 16)
  {
    id: 'card-37',
    number: 37,
    name: 'Sembilan Kali Bangkit',
    category: 'encourage',
    emoji: '🐾',
    text: 'Kucing selalu mendarat dengan keempat kakinya. Kalau rencanamu sempat meleset hari ini, atur napas dan lompat lagi lebih tinggi, meow~',
  },
  {
    id: 'card-38',
    number: 38,
    name: 'Sabar Menunggu Ikan',
    category: 'encourage',
    emoji: '🎣',
    text: 'Lihat kucing yang duduk tenang di depan kolam—kesabaran dan fokus kecilmu hari ini pasti membuahkan hasil besar!',
  },
  {
    id: 'card-39',
    number: 39,
    name: 'Peregangan Dulu',
    category: 'encourage',
    emoji: '🐱',
    text: 'Jangan lupa meregangkan punggung seperti kucing bangun tidur ya! Tubuh yang rileks bikin pikiranmu makin jernih.',
  },
  {
    id: 'card-40',
    number: 40,
    name: 'Raja di Teritori Sendiri',
    category: 'encourage',
    emoji: '👑',
    text: 'Setiap kucing adalah penguasa di ruangannya. Di meja belajarmu hari ini, kamulah kapten yang memegang kendali penuh!',
  },
  {
    id: 'card-41',
    number: 41,
    name: 'Satu Sesi Lagi',
    category: 'encourage',
    emoji: '⏳',
    text: 'Cukup selesaikan satu sesi timer ini dulu. Tidak perlu memikirkan semuanya sekaligus, satu tapak kecil saja sudah hebat, purr~',
  },
  {
    id: 'card-42',
    number: 42,
    name: 'Hangat di Bawah Mentari',
    category: 'encourage',
    emoji: '☀️',
    text: 'Seperti kucing yang berjemur di dekat jendela, izinkan dirimu merasa bangga atas setiap usaha kecil yang sudah kamu lakukan.',
  },
  {
    id: 'card-43',
    number: 43,
    name: 'Misi Selesai dengan Elegan',
    category: 'encourage',
    emoji: '✨',
    text: 'Kucing tidak pernah panik saat mengejar target—tetap tenang, nikmati prosesnya, dan tuntaskan tugasmu dengan elegan!',
  },
  // Tambahan Kategori 2: 🐾 Fakta Kucing (7 Kartu Baru: #44–#50, Total 16)
  {
    id: 'card-44',
    number: 44,
    name: 'Telinga Radar 180 Derajat',
    category: 'fact',
    emoji: '📡',
    text: 'Fakta Kucing: Kucing memiliki 32 otot di setiap telinganya sehingga mampu memutar daun telinga hingga 180 derajat ke arah sumber suara.',
  },
  {
    id: 'card-45',
    number: 45,
    name: 'Pintu Rahasia di Langit-Langit Mulut',
    category: 'fact',
    emoji: '😮',
    text: 'Fakta Kucing: Kucing punya organ Jacobson di langit-langit mulutnya—itulah sebabnya mulut mereka suka terbuka sedikit saat mencium bau unik!',
  },
  {
    id: 'card-46',
    number: 46,
    name: 'Tulang Selangka Fleksibel',
    category: 'fact',
    emoji: '📦',
    text: 'Fakta Kucing: Kucing tidak memiliki tulang selangka yang kaku, sehingga tubuhnya bisa masuk ke celah sempit selebar kepalanya.',
  },
  {
    id: 'card-47',
    number: 47,
    name: 'Berjalan dengan Ujung Jari',
    category: 'fact',
    emoji: '🤫',
    text: 'Fakta Kucing: Kucing termasuk hewan digitigrade—artinya mereka berjalan menggunakan ujung jari kaki sehingga langkahnya nyaris tanpa suara.',
  },
  {
    id: 'card-48',
    number: 48,
    name: 'Keringat di Bantalan Kaki',
    category: 'fact',
    emoji: '🐾',
    text: 'Fakta Kucing: Kucing tidak berkeringat lewat bulu, melainkan lewat kelenjar keringat kecil di bantalan telapak kakinya (toe beans)!',
  },
  {
    id: 'card-49',
    number: 49,
    name: 'Kedipan Mata Cinta',
    category: 'fact',
    emoji: '😽',
    text: "Fakta Kucing: Ketika kucing menatapmu lalu berkedip perlahan (slow blink), itu adalah cara mereka bilang 'aku percaya dan sayang padamu'.",
  },
  {
    id: 'card-50',
    number: 50,
    name: 'Pelompat Kelas Olimpiade',
    category: 'fact',
    emoji: '🏅',
    text: 'Fakta Kucing: Kucing rumahan bisa melompat vertikal hingga 5 sampai 6 kali tinggi tubuhnya hanya dalam satu kali tolakan!',
  },
  // Tambahan Kategori 3: 🤣 Jokes Bapak Kucing (7 Kartu Baru: #51–#57, Total 16)
  {
    id: 'card-51',
    number: 51,
    name: 'Kucing yang Jadi Musisi',
    category: 'dad-joke',
    emoji: '🎶',
    text: 'Kucing apa yang jago main alat musik tiup? Kucing-krong sama seruling bambu... eh, itu keroncong ya? Meow~',
  },
  {
    id: 'card-52',
    number: 52,
    name: 'Kucing yang Suka Belanja',
    category: 'dad-joke',
    emoji: '🛒',
    text: 'Kucing apa yang paling rajin ke pasar pagi-pagi? Kucing-tawar harga ikan tongkol sampai diskon 50%!',
  },
  {
    id: 'card-53',
    number: 53,
    name: 'Kucing yang Masuk Angin',
    category: 'dad-joke',
    emoji: '🌀',
    text: 'Kenapa kucing kalau tidur badannya selalu melingkar? Soalnya kalau lurus memanjang nanti dikira lontong sayur!',
  },
  {
    id: 'card-54',
    number: 54,
    name: 'Kucing yang Suka Fotografi',
    category: 'dad-joke',
    emoji: '📸',
    text: 'Kucing apa yang paling jago motret? Kucing-jepret (cekrek)! Sekali pose langsung estetik!',
  },
  {
    id: 'card-55',
    number: 55,
    name: 'Kucing yang Bikin Terharu',
    category: 'dad-joke',
    emoji: '🥹',
    text: 'Kucing apa yang bikin mata berkaca-kaca? Kucing-tai kamu apa adanya... eaaak, bapak-bapak anabul lewat dulu!',
  },
  {
    id: 'card-56',
    number: 56,
    name: 'Kucing yang Suka Olahraga',
    category: 'dad-joke',
    emoji: '🏃',
    text: 'Kucing apa yang napasnya paling kuat lari maraton? Kucing-lari dari kenyataan tugas yang numpuk!',
  },
  {
    id: 'card-57',
    number: 57,
    name: 'Kucing yang Jadi Detektif',
    category: 'dad-joke',
    emoji: '🕵️',
    text: 'Kucing apa yang paling jago memecahkan misteri? Kucing-curigai camilan di meja makan yang tiba-tiba hilang!',
  },
  // Tambahan Kategori 4: 💘 Gombalan Kucing (7 Kartu Baru: #58–#64, Total 16)
  {
    id: 'card-58',
    number: 58,
    name: 'Kedipan Pelan untukmu',
    category: 'flirt',
    emoji: '😻',
    text: 'Kalau aku berkedip pelan setiap kamu menatap layar, itu tandanya aku nyaman banget ada di dekatmu hari ini, meow~',
  },
  {
    id: 'card-59',
    number: 59,
    name: 'Hangat di Dekatmu',
    category: 'flirt',
    emoji: '🧡',
    text: 'Kucing memang suka mencari sudut ruangan paling hangat, dan buatku tempat terhangat itu selalu di sebelahmu!',
  },
  {
    id: 'card-60',
    number: 60,
    name: 'Buntut Berbentuk Tanda Tanya',
    category: 'flirt',
    emoji: '❓',
    text: 'Setiap kali kamu buka web ini, ekorku langsung tegak melengkung kayak tanda tanya—penasaran mau lihat senyum semangatmu!',
  },
  {
    id: 'card-61',
    number: 61,
    name: 'Kalah Sama Kamu',
    category: 'flirt',
    emoji: '🐟',
    text: 'Disuruh milih ikan salmon segar atau nemenin kamu nugas sampai malam? Tanpa mikir dua kali pasti aku pilih nemenin kamu, purr~',
  },
  {
    id: 'card-62',
    number: 62,
    name: 'Jejak Kaki di Hati',
    category: 'flirt',
    emoji: '🐾',
    text: 'Maaf ya kalau tapak kaki kecilku ninggalin jejak di layar, soalnya jejak senyummu juga udah telanjur membekas di hatiku!',
  },
  {
    id: 'card-63',
    number: 63,
    name: 'Elusan Favorit',
    category: 'flirt',
    emoji: '💖',
    text: 'Dari semua sudut di layar ini, bagian favoritku cuma satu: saat kursor kamu mampir dan ngelus kepalaku sebentar!',
  },
  {
    id: 'card-64',
    number: 64,
    name: 'Teman Seumur Hidup',
    category: 'flirt',
    emoji: '🌟',
    text: 'Semoga sesi fokus kita hari ini berjalan lancar ya, karena aku siap nemenin setiap target dan impian besarmu satu per satu!',
  },
]

/** Pengurutan stabil daftar target: belum selesai di atas, sudah dicentang di bawah */
function sortHabitsByCompletion(list: HabitItem[]): HabitItem[] {
  const active: HabitItem[] = []
  const done: HabitItem[] = []
  for (const item of list) {
    if (item.completed) done.push(item)
    else active.push(item)
  }
  return [...active, ...done]
}

const VALID_SECRET_CARD_IDS = new Set<string>(SECRET_CAT_CARDS.map(c => c.id))

function sanitizeCollectedSecretCards(raw: unknown): string[] {
  const unique = new Set<string>()
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && VALID_SECRET_CARD_IDS.has(item)) {
        unique.add(item)
      }
    }
  }
  return Array.from(unique)
}

const VALID_COZY_THEME_IDS = new Set<string>(COZY_THEMES.map(t => t.id))

function isValidCozyThemeId(val: unknown): val is CozyThemeId {
  return typeof val === 'string' && VALID_COZY_THEME_IDS.has(val)
}

function sanitizeOwnedCozyThemes(raw: unknown): CozyThemeId[] {
  const set = new Set<CozyThemeId>(['classic'])
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isValidCozyThemeId(item)) {
        set.add(item)
      }
    }
  }
  return Array.from(set)
}

// Tipe Mood Check-in Harian di bagian atas Catatan Cepat
export type DailyMoodId = 'happy' | 'calm' | 'sleepy' | 'motivated' | 'tired'

export interface DailyMoodOption {
  id: DailyMoodId
  emoji: string
  label: string
  mascotReply: string
}

export const DAILY_MOOD_OPTIONS: DailyMoodOption[] = [
  { id: 'happy', emoji: '😄', label: 'Senang', mascotReply: 'Yeay! Senang ikut merasakan energi bahagiamu! 💖' },
  { id: 'calm', emoji: '😌', label: 'Tenang', mascotReply: 'Hati yang tenang bikin ide mengalir lancar~ 🌙' },
  { id: 'sleepy', emoji: '🥱', label: 'Mengantuk', mascotReply: 'Pelan-pelan aja ya, jangan lupa minum air putih~ ☕' },
  { id: 'motivated', emoji: '🔥', label: 'Semangat', mascotReply: 'Api semangat membara! Ayo taklukkan target hari ini! 🚀' },
  { id: 'tired', emoji: '🌧️', label: 'Lelah', mascotReply: 'Tidak apa-apa istirahat sejenak, kamu sudah berusaha hebat 💗' },
]

interface TreatRecord {
  coins: number
  owned: MascotAccessoryId[]
  equipped: MascotAccessoryId
}

interface DailyMoodRecord {
  date: string
  mood: DailyMoodId | null
}

// --- Tipe Data Kawaii Notebook (disimpan di localStorage: twilights_notebooks) ---
export type NotebookPaperTheme =
  | 'lavender-lined'
  | 'sakura-grid'
  | 'starry-night'
  | 'cream-dotted'

export type NotebookTagId = 'study' | 'idea' | 'journal' | 'general'

export interface NotebookEntry {
  id: string
  title: string
  content: string
  tag: NotebookTagId
  paperTheme: NotebookPaperTheme
  createdAt: string
  updatedAt: string
}

export const NOTEBOOK_TAGS: { id: NotebookTagId; label: string; icon: string }[] = [
  { id: 'study', label: 'Belajar', icon: '📖' },
  { id: 'idea', label: 'Ide', icon: '💡' },
  { id: 'journal', label: 'Jurnal', icon: '🌙' },
  { id: 'general', label: 'Umum', icon: '✨' },
]

export const NOTEBOOK_PAPER_THEMES: {
  id: NotebookPaperTheme
  name: string
  swatchClass: string
}[] = [
  { id: 'lavender-lined', name: 'Lavender Lined', swatchClass: 'bg-[#ede9fe] border-purple-300' },
  { id: 'sakura-grid', name: 'Sakura Grid', swatchClass: 'bg-[#ffe4ef] border-pink-300' },
  { id: 'starry-night', name: 'Starry Night', swatchClass: 'bg-[#17143b] border-indigo-400' },
  { id: 'cream-dotted', name: 'Cream Dotted', swatchClass: 'bg-[#fef3c7] border-amber-300' },
]

// --- Tipe Data Kawaii Alarm (disimpan di localStorage: twilights_alarms) ---
export type AlarmMode = 'countdown' | 'clock'

export interface KawaiiAlarmItem {
  id: string
  mode: AlarmMode
  label: string
  targetTimestamp: number // Timestamp (ms) untuk akurasi penuh via Date.now()
  clockTime?: string // Format HH:MM untuk alarm jam tertentu
  createdAt: string
}

// Tipe pop-up banner alarm pengingat jadwal cerdas
export interface ActiveReminder {
  id: string
  habitId: string
  habitTitle: string
  time: string
  message: string
  alarmMode: HabitAlarmMode
  isSnoozed?: boolean
}

// Tipe data catatan sesi fokus & streak harian
interface FocusSessionRecord {
  date: string
  todayCount: number
  totalCount: number
  todaySeconds?: number
}

interface StreakRecord {
  count: number
  lastCompletedDate: string
}

// Daftar nama hari (Senin - Minggu) untuk Grafik Progres Harian
export const DAYS_LABEL = [
  { short: 'S', full: 'Senin' },
  { short: 'S', full: 'Selasa' },
  { short: 'R', full: 'Rabu' },
  { short: 'K', full: 'Kamis' },
  { short: 'J', full: 'Jumat' },
  { short: 'S', full: 'Sabtu' },
  { short: 'M', full: 'Minggu' },
] as const

// Tipe mode & durasi kustom Pomodoro Timer (disimpan dalam detik di localStorage & Backup/Restore JSON)
export type TimerModeKey = 'focus' | 'shortBreak' | 'longBreak'
export type CustomTimerDurations = Record<TimerModeKey, number>

export const DEFAULT_TIMER_DURATIONS_SECONDS: CustomTimerDurations = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

// Tipe & default pengaturan 5 saluran Ambient Sound Mixer (100% offline Web Audio API)
export type AmbientChannelId = 'rain' | 'brown' | 'campfire' | 'nightWind' | 'stream'

export interface AmbientChannelSetting {
  enabled: boolean
  volume: number // 0 - 100
}

export type AmbientMixerSettings = Record<AmbientChannelId, AmbientChannelSetting>

export const DEFAULT_AMBIENT_MIXER_SETTINGS: AmbientMixerSettings = {
  rain: { enabled: false, volume: 45 },
  brown: { enabled: false, volume: 35 },
  campfire: { enabled: false, volume: 35 },
  nightWind: { enabled: false, volume: 30 },
  stream: { enabled: false, volume: 35 },
}

function cloneDefaultAmbientMixer(): AmbientMixerSettings {
  return {
    rain: { ...DEFAULT_AMBIENT_MIXER_SETTINGS.rain },
    brown: { ...DEFAULT_AMBIENT_MIXER_SETTINGS.brown },
    campfire: { ...DEFAULT_AMBIENT_MIXER_SETTINGS.campfire },
    nightWind: { ...DEFAULT_AMBIENT_MIXER_SETTINGS.nightWind },
    stream: { ...DEFAULT_AMBIENT_MIXER_SETTINGS.stream },
  }
}

function sanitizeAmbientMixerSettings(raw: unknown): AmbientMixerSettings {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<
    Record<AmbientChannelId, Partial<AmbientChannelSetting>>
  >
  const cleanChannel = (
    ch: Partial<AmbientChannelSetting> | undefined,
    fallback: AmbientChannelSetting,
  ): AmbientChannelSetting => {
    const rawVol = Number(ch?.volume)
    const volume = Number.isFinite(rawVol)
      ? Math.max(0, Math.min(100, Math.round(rawVol)))
      : fallback.volume
    return {
      enabled: typeof ch?.enabled === 'boolean' ? ch.enabled : fallback.enabled,
      volume,
    }
  }
  return {
    rain: cleanChannel(obj.rain, DEFAULT_AMBIENT_MIXER_SETTINGS.rain),
    brown: cleanChannel(obj.brown, DEFAULT_AMBIENT_MIXER_SETTINGS.brown),
    campfire: cleanChannel(obj.campfire, DEFAULT_AMBIENT_MIXER_SETTINGS.campfire),
    nightWind: cleanChannel(obj.nightWind, DEFAULT_AMBIENT_MIXER_SETTINGS.nightWind),
    stream: cleanChannel(obj.stream, DEFAULT_AMBIENT_MIXER_SETTINGS.stream),
  }
}

const MAX_TIMER_DURATION_SECONDS = 99 * 3600 + 59 * 60 + 59

function sanitizeTimerDurations(raw: unknown): CustomTimerDurations {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<TimerModeKey, unknown>>
  const clamp = (val: unknown, fallback: number): number => {
    const n = Number(val)
    if (!Number.isFinite(n) || n < 1) return fallback
    return Math.min(MAX_TIMER_DURATION_SECONDS, Math.floor(n))
  }
  return {
    focus: clamp(obj.focus, DEFAULT_TIMER_DURATIONS_SECONDS.focus),
    shortBreak: clamp(obj.shortBreak, DEFAULT_TIMER_DURATIONS_SECONDS.shortBreak),
    longBreak: clamp(obj.longBreak, DEFAULT_TIMER_DURATIONS_SECONDS.longBreak),
  }
}

// Kunci penyimpanan di localStorage browser
const STORAGE_KEYS = {
  THEME: 'twilights_theme_v1',
  DARK_THEME: 'twilights_dark_theme_v2',
  HABITS: 'twilights_habits',
  TIMER_DURATIONS: 'twilights_timer_durations_v1',
  AMBIENT_MIXER: 'twilights_ambient_mixer_v1',
  WEEKLY_PROGRESS: 'twilight_star_weekly_progress_v1',
  FOCUS_SESSIONS: 'twilight_star_focus_sessions_v1',
  LAST_ACTIVE_DATE: 'twilights_habits_last_date',
  QUICK_NOTES: 'twilights_quick_notes_v1',
  STREAK: 'twilights_streak_v1',
  STAR_CURSOR: 'twilights_star_cursor_v1',
  ACTIVE_CURSOR: 'twilights_active_cursor_v1',
  TREATS: 'twilights_treats_v1',
  CAT_CUSTOMIZATION: 'twilights_cat_customization_v1',
  COZY_THEMES: 'twilights_cozy_themes_v1',
  FULL_GOAL_STREAK: 'twilights_full_goal_streak_v1',
  SECRET_CARDS: 'twilights_secret_cards_v1',
  CAT_AFFINITY: 'twilights_cat_affinity_v1',
  DAILY_MOOD: 'twilights_daily_mood_v1',
  USER_NAME: 'twilights_user_name_v1',
  BATTERY_SAVER: 'twilights_battery_saver_v1',
  GRAPHICS_QUALITY: 'twilights_graphics_quality_v1',
  VIBRATION_ENABLED: 'twilights_vibration_enabled_v1',
  DAILY_REWARD_DATE: 'twilights_daily_reward_date',
  NOTEBOOKS: 'twilights_notebooks',
  ALARMS: 'twilights_alarms',
  ALARM_SOUND: 'twilights_alarm_sound_v1',
  GAME_HIGHSCORE: 'twilights_game_highscore',
  GAME_DAILY_CLAIMS: 'twilights_game_daily_claims_v1',
}

// Kunci lama (untuk migrasi satu kali agar data pengguna lama tidak hilang)
const LEGACY_STORAGE_KEYS = {
  HABITS: 'twilight_star_habits_v1',
  LAST_ACTIVE_DATE: 'twilight_star_last_date_v1',
}

export type MiniGameId = 'catcher' | 'fishing'

interface GameDailyClaimRecord {
  date: string
  count: number
  playCount?: number
  catcherPlayCount?: number
  fishingPlayCount?: number
  catcherRewardCount?: number
  fishingRewardCount?: number
  fishingHighScore?: number
}

export const MAX_GAME_DAILY_REWARDS = 3
export const MAX_GAME_DAILY_PLAYS = 3
export const GAME_COMPLETION_BASE_COINS = 5
export const GAME_ROUND_DURATION_SECONDS = 50
export const CAT_AFFINITY_MAX_LEVEL = 20
export const CAT_AFFINITY_MILESTONE_LV10 = 10
export const CAT_AFFINITY_XP_PER_LEVEL = 10
export const CAT_AFFINITY_HIGH_XP_PER_LEVEL = 15
export const CAT_AFFINITY_LEVELUP_FISH_REWARD = 2
export const CAT_AFFINITY_LV10_MILESTONE_FISH = 20
export const CAT_AFFINITY_LV20_MILESTONE_FISH = 40
export const HEART_CHEST_XP_GOAL = 10
export const HEART_CHEST_FISH_REWARD = 3

/** Kebutuhan XP Kasih Sayang per level: 10 poin (Lv. 1–9), 15 poin (Lv. 10–19) */
export function getCatAffinityXpNeeded(level: number): number {
  return level >= CAT_AFFINITY_MILESTONE_LV10
    ? CAT_AFFINITY_HIGH_XP_PER_LEVEL
    : CAT_AFFINITY_XP_PER_LEVEL
}

interface CatAffinityRecord {
  level: number
  xp: number
  heartChestXp?: number
  claimedLv10Reward?: boolean
  claimedLv20Reward?: boolean
}

function sanitizeCatAffinity(raw: unknown): Required<CatAffinityRecord> {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<CatAffinityRecord>
  const level = Math.max(1, Math.min(CAT_AFFINITY_MAX_LEVEL, Math.floor(Number(obj.level) || 1)))
  const needed = getCatAffinityXpNeeded(level)
  const rawXp = Math.max(0, Math.floor(Number(obj.xp) || 0))
  const claimedLv10Reward = Boolean(obj.claimedLv10Reward)
  const claimedLv20Reward = Boolean(obj.claimedLv20Reward)
  // Data lama di Lv. 10 tersimpan dengan xp=10 (batas MAX lama) -> reset ke 0 agar mulus menuju Lv. 11 (0/15)
  const xp =
    level >= CAT_AFFINITY_MAX_LEVEL
      ? CAT_AFFINITY_HIGH_XP_PER_LEVEL
      : level === CAT_AFFINITY_MILESTONE_LV10 && !claimedLv10Reward && rawXp >= CAT_AFFINITY_XP_PER_LEVEL
        ? 0
        : Math.min(needed - 1, rawXp)
  const heartChestXp =
    level >= CAT_AFFINITY_MAX_LEVEL
      ? Math.max(0, Math.min(HEART_CHEST_XP_GOAL - 1, Math.floor(Number(obj.heartChestXp) || 0)))
      : 0
  return {
    level,
    xp,
    heartChestXp,
    claimedLv10Reward,
    claimedLv20Reward,
  }
}

// Cooldown anti-spam XP Kasih Sayang Kucing (klik 2 dtk, elusan 1.5 dtk)
let lastCatClickXpAt = 0
let lastCatPetXpAt = 0
let catAffinityToastTimer: ReturnType<typeof setTimeout> | null = null

// Daftar catatan awal kosong bagi pengguna baru (tidak memuat catatan pribadi siapa pun)
const DEFAULT_NOTEBOOKS: NotebookEntry[] = []

// Daftar habit awal kosong bagi pengguna baru (localStorage lama pengguna tetap dipertahankan)
const DEFAULT_HABITS: HabitItem[] = []

/** Normalisasi item habit agar data lama tanpa field `type` / `alarmMode` otomatis rapi */
function normalizeHabitItem(raw: Partial<HabitItem>, fallbackId: string): HabitItem {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId,
    title: typeof raw.title === 'string' ? raw.title : 'Target Baru',
    completed: Boolean(raw.completed),
    type: raw.type === 'once' ? 'once' : 'daily',
    reminderTime: typeof raw.reminderTime === 'string' && raw.reminderTime ? raw.reminderTime : undefined,
    alarmMode: raw.alarmMode === 'repeat' ? 'repeat' : 'once',
  }
}

// Timer penghapusan otomatis 1.2 detik untuk target bertipe 'once' (1x Sekali) yang baru dicentang
const pendingOnceRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Kontrol suara alarm pengingat habit (repeat setiap ~3 detik + batas pengaman 2 menit + snooze 5 menit)
let habitAlarmRepeatInterval: ReturnType<typeof setInterval> | null = null
let habitAlarmSafetyTimeout: ReturnType<typeof setTimeout> | null = null
const habitSnoozeTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Daftar ucapan acak saat mencentang 1 target
const MINI_TOAST_MESSAGES = [
  'Satu langkah selesai! Keren! ⭐',
  'Mantap! Progresmu makin berkilau ✨',
  'Yay! Kamu hebat banget hari ini 💖',
  'Langkah kecil yang luar biasa! 🚀',
]

/**
 * Mengambil tanggal LOKAL perangkat dalam format YYYY-MM-DD
 * menggunakan getFullYear(), getMonth() + 1, dan getDate() (bukan toISOString() yang berbasis UTC).
 */
export function getLocalTodayDate(offsetDays = 0): string {
  const now = new Date()
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays)
  }
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Alias kompatibilitas untuk getLocalTodayDate() */
export function getTodayDateString(offsetDays = 0): string {
  return getLocalTodayDate(offsetDays)
}

/**
 * Mengubah index hari JavaScript (Minggu=0..Sabtu=6)
 * menjadi index Senin=0..Minggu=6 sesuai label S, S, R, K, J, S, M
 */
export function getTodayWeekdayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

// Timer untuk mengembalikan ekspresi sementara maskot, toast mini, kartu hadiah harian & debounce CRUD
let mascotResetTimer: ReturnType<typeof setTimeout> | null = null
let miniToastTimer: ReturnType<typeof setTimeout> | null = null
let dailyRewardCardTimer: ReturnType<typeof setTimeout> | null = null
let cloudSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let notebookPatchTimer: ReturnType<typeof setTimeout> | null = null

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline'

/**
 * Composable state bersama (shared state) untuk seluruh aplikasi Twilight's
 */
export function useTwilightStorage() {
  const { playBellChime, playPopTing, playVictoryMelody, playAlarmMelody } = useSoundEffects()
  const {
    kirimNotifikasiSistem,
    requestNotificationPermission,
    startTabTitleBlink,
    stopTabTitleBlink,
  } = useBackgroundResilience()
  const {
    firebaseUser,
    isFirebaseAuthReady,
    isFirebaseAuthBusy,
    firebaseSyncStatus,
    firebaseLastSyncedAt,
    firebaseErrorMessage,
    isBrowserOnline,
    initFirebaseSync,
    signInWithGoogle,
    signOutGoogle,
    scheduleFirestoreSync,
    syncNowWithFirebase,
    forceUploadSnapshotToFirestore,
  } = useFirebaseCloudSync()

  // --- Data tersimpan di localStorage ---
  const theme = useState<ThemeName>('twilights-theme', () => 'twilight')
  // Default Mode Gelap (🌙 Cozy Night Vibe); pengguna dapat beralih ke Mode Terang Pastel (☀️) di semua tema
  const isDarkTheme = useState<boolean>('twilights-is-dark-theme', () => true)
  // Mulai kosong agar daftar default tidak muncul sekilas/mengisi ulang sebelum localStorage dicek di onMounted
  const habits = useState<HabitItem[]>('twilight-habits', () => [])
  const hadLocalHabits = useState<boolean>('twilights-had-local-habits', () => false)
  const customTimerDurations = useState<CustomTimerDurations>('twilights-timer-durations', () => ({
    ...DEFAULT_TIMER_DURATIONS_SECONDS,
  }))
  const timerDurationsVersion = useState<number>('twilights-timer-durations-ver', () => 0)
  // Pengaturan 5 saluran Ambient Sound Mixer (ON/OFF + volume %, tersimpan di localStorage & Backup/Restore)
  const ambientMixerSettings = useState<AmbientMixerSettings>('twilights-ambient-mixer', () =>
    cloneDefaultAmbientMixer(),
  )
  const ambientMixerVersion = useState<number>('twilights-ambient-mixer-ver', () => 0)
  const weeklyProgress = useState<number[]>('twilight-weekly-progress', () => [
    0, 0, 0, 0, 0, 0, 0,
  ])
  const todayFocusSessions = useState<number>('twilight-today-focus', () => 0)
  const totalFocusSessions = useState<number>('twilight-total-focus', () => 0)
  const todayFocusSeconds = useState<number>('twilights-today-focus-seconds', () => 0)
  const dailyStreak = useState<number>('twilights-streak', () => 0)
  const streakLastDate = useState<string>('twilights-streak-date', () => '')
  const quickNotes = useState<string>('twilights-quick-notes', () => '')
  const userName = useState<string>('twilights-user-name', () => 'Teman Twilight')
  const activeCursor = useState<CursorStyleId>('twilights-active-cursor', () => 'starlight-wand')
  const isStarCursorEnabled = useState<boolean>('twilights-star-cursor', () => true)
  const graphicsQuality = useState<GraphicsQuality>('twilights-graphics-quality', () => 'high')
  const isBatterySaverMode = useState<boolean>('twilights-battery-saver', () => false)
  // Preferensi getaran HP (Web Vibration API) — default ON & tersimpan di localStorage
  const isVibrationEnabled = useState<boolean>('twilights-vibration-enabled', () => true)
  const graphicsConfig = computed<GraphicsQualityMeta>(
    () => GRAPHICS_QUALITY_OPTIONS[graphicsQuality.value] ?? GRAPHICS_QUALITY_OPTIONS.high,
  )
  const isZenMode = useState<boolean>('twilights-zen-mode', () => false)
  // Hadiah selamat datang 5 🐟 untuk pengguna baru (data pengguna lama di localStorage tetap dipertahankan)
  const treatCoins = useState<number>('twilights-treat-coins', () => 5)
  const ownedAccessories = useState<MascotAccessoryId[]>('twilights-owned-accessories', () => [])
  const equippedAccessory = useState<MascotAccessoryId>('twilights-equipped-accessory', () => 'none')
  // Toko Koleksi Kucing & Kustomisasi 2 Kucing (Sinkron vs Terpisah)
  const ownedCats = useState<CatBreedId[]>('twilights-owned-cats', () => [
    'snowy-white',
    'misty-tabby',
  ])
  const mainCatType = useState<CatBreedId>('twilights-main-cat-type', () => 'snowy-white')
  const miniCatType = useState<CatBreedId>('twilights-mini-cat-type', () => 'misty-tabby')
  const syncCatAccessories = useState<boolean>('twilights-sync-cat-accessories', () => true)
  const mainCatAccessory = useState<MascotAccessoryId>('twilights-main-cat-accessory', () => 'none')
  const miniCatAccessory = useState<MascotAccessoryId>('twilights-mini-cat-accessory', () => 'none')
  // Tema Latar Belakang Beranimasi (Cozy Themes) & 7-Day Full Goal Streak
  const ownedCozyThemes = useState<CozyThemeId[]>('twilights-owned-cozy-themes', () => ['classic'])
  const activeCozyTheme = useState<CozyThemeId>('twilights-active-cozy-theme', () => 'classic')
  const fullGoalStreak = useState<number>('twilights-full-goal-streak', () => 0)
  const fullGoalStreakLastDate = useState<string>('twilights-full-goal-streak-date', () => '')
  const fullGoalStreakRewardClaimedDate = useState<string>(
    'twilights-full-goal-streak-reward-date',
    () => '',
  )
  // Koleksi & Modal Gacha Kartu "💌 Pesan Rahasia Kucing" (18 kartu)
  const collectedSecretCards = useState<string[]>('twilights-secret-cards', () => [])
  const isSecretCardModalOpen = useState<boolean>('twilights-secret-card-modal-open', () => false)
  const secretCardModalMode = useState<'gacha' | 'album'>(
    'twilights-secret-card-modal-mode',
    () => 'gacha',
  )
  const lastDrawnCardResult = useState<SecretCardDrawResult | null>(
    'twilights-last-drawn-card',
    () => null,
  )
  // Level & poin XP Bilah Kasih Sayang Kucing (Lv. 1 .. Lv. 20 MAX + Peti Cinta 0/10 + Milestone Lv. 10 & Lv. 20)
  const catAffinityLevel = useState<number>('twilights-cat-affinity-level', () => 1)
  const catAffinityXp = useState<number>('twilights-cat-affinity-xp', () => 0)
  const catHeartChestXp = useState<number>('twilights-cat-heart-chest-xp', () => 0)
  const claimedLv10Reward = useState<boolean>('twilights-claimed-lv10-reward', () => false)
  const claimedLv20Reward = useState<boolean>('twilights-claimed-lv20-reward', () => false)
  const catAffinityLevelUpMessage = useState<string>('twilights-cat-affinity-levelup', () => '')

  // Bonus pasif Koin Ikan tiap selesai 1 sesi Pomodoro Fokus (+1 🐟 di Lv. 10–19, +2 🐟 di Lv. 20 MAX)
  const catAffinityPassiveFishBonus = computed<number>(() => {
    if (catAffinityLevel.value >= CAT_AFFINITY_MAX_LEVEL) return 2
    if (catAffinityLevel.value >= CAT_AFFINITY_MILESTONE_LV10) return 1
    return 0
  })

  // Progres Koleksi 100% Toko untuk membuka Tema Rahasia Ultimate: 🌃 Neon Night City
  const neonCityCollectionProgress = computed<{
    current: number
    total: number
    percent: number
    isComplete: boolean
  }>(() => {
    const ownedAccCount = SHOP_PURCHASABLE_ACCESSORY_IDS.filter(id =>
      ownedAccessories.value.includes(id),
    ).length
    const ownedThemeCount = NEON_CITY_REQUIRED_THEME_IDS.filter(
      id =>
        ownedCozyThemes.value.includes(id) ||
        (id === 'astral-palace' && fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL),
    ).length
    const current = ownedAccCount + ownedThemeCount
    const total = SHOP_PURCHASABLE_ACCESSORY_IDS.length + NEON_CITY_REQUIRED_THEME_IDS.length
    const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
    return {
      current,
      total,
      percent,
      isComplete: current >= total,
    }
  })
  const dailyMood = useState<DailyMoodId | null>('twilights-daily-mood', () => null)
  const dailyRewardClaimedDate = useState<string>('twilights-daily-reward-date', () => '')
  const dailyRewardCardMessage = useState<string>('twilights-daily-reward-card', () => '')
  const habitResetVersion = useState<number>('twilights-habit-reset-ver', () => 0)
  const todayIndex = useState<number>('twilight-today-index', () => 0)
  const isHydrated = useState<boolean>('twilight-storage-hydrated', () => false)

  // --- State interaksi antar komponen (maskot, timer, BGM, pengingat, confetti, Mode Zen & Kartu Progres) ---
  const isPomodoroRunning = useState<boolean>('twilights-pomo-running', () => false)
  const isPomodoroPaused = useState<boolean>('twilights-pomo-paused', () => false)
  const activeTimerMode = useState<TimerModeKey>('twilights-active-timer-mode', () => 'focus')
  const activeTimerRemainingSeconds = useState<number>(
    'twilights-active-timer-remaining',
    () => DEFAULT_TIMER_DURATIONS_SECONDS.focus,
  )
  const isImmersiveZenOpen = useState<boolean>('twilights-immersive-zen-open', () => false)
  const isStudyCardModalOpen = useState<boolean>('twilights-study-card-open', () => false)
  const isShortcutsModalOpen = useState<boolean>('twilights-shortcuts-modal-open', () => false)
  // Deteksi perangkat adaptif (HP/Mobile vs PC/Laptop) untuk ikon Twilight Focus (📱 vs 🖥️)
  const isMobileDevice = useState<boolean>('twilights-is-mobile-device', () => false)
  const twilightFocusIcon = computed<string>(() => (isMobileDevice.value ? '📱' : '🖥️'))
  const isBgmPlaying = useState<boolean>('twilights-bgm-playing', () => false)
  const isRainAmbientOn = useState<boolean>('twilights-rain-ambient', () => false)
  // Sinkronisasi volume & mute utama (dari BGM Player) agar suara kedua kucing ikut hening saat di-mute
  const isMasterAudioMuted = useState<boolean>('twilights-master-muted', () => false)
  const masterAudioVolume = useState<number>('twilights-master-volume', () => 0.6)
  const isReceiptModalOpen = useState<boolean>('twilights-receipt-open', () => false)
  const isNotebookOpen = useState<boolean>('twilights-notebook-open', () => false)
  const isAlarmOpen = useState<boolean>('twilights-alarm-open', () => false)
  const isMiniGameOpen = useState<boolean>('twilights-minigame-open', () => false)
  const pomodoroToggleSignal = useState<number>('twilights-pomo-toggle-signal', () => 0)
  const pomodoroResetSignal = useState<number>('twilights-pomo-reset-signal', () => 0)
  const pomodoroModeSignal = useState<{ mode: TimerModeKey; seq: number }>(
    'twilights-pomo-mode-signal',
    () => ({ mode: 'focus', seq: 0 }),
  )
  const bgmPlayToggleSignal = useState<number>('twilights-bgm-play-signal', () => 0)
  const bgmMuteToggleSignal = useState<number>('twilights-bgm-mute-signal', () => 0)
  const catKeyboardInteractSignal = useState<number>('twilights-cat-kb-signal', () => 0)
  const gameHighScore = useState<number>('twilights-game-highscore', () => 0)
  const fishingHighScore = useState<number>('twilights-fishing-highscore', () => 0)
  const gameDailyClaimCount = useState<number>('twilights-game-daily-claims', () => 0)
  const gameDailyPlayCount = useState<number>('twilights-game-daily-plays', () => 0)
  const catcherPlayCount = useState<number>('twilights-catcher-play-count', () => 0)
  const fishingPlayCount = useState<number>('twilights-fishing-play-count', () => 0)
  const catcherRewardCount = useState<number>('twilights-catcher-reward-count', () => 0)
  const fishingRewardCount = useState<number>('twilights-fishing-reward-count', () => 0)
  const gameDailyClaimDate = useState<string>('twilights-game-daily-date', () => '')
  const notebooks = useState<NotebookEntry[]>('twilights-notebooks-list', () =>
    DEFAULT_NOTEBOOKS.map(n => ({ ...n })),
  )
  const alarms = useState<KawaiiAlarmItem[]>('twilights-alarms-list', () => [])
  const selectedAlarmSound = useState<AlarmSoundId>('twilights-alarm-sound', () => 'music-box')
  const activeAlarmBadge = useState<string>('twilights-alarm-badge', () => '')
  const cloudSyncStatus = useState<CloudSyncStatus>('twilights-cloud-status', () => 'idle')
  const cloudLastSyncedAt = useState<string>('twilights-cloud-synced-at', () => '')
  const isCloudHydrated = useState<boolean>('twilights-cloud-hydrated', () => false)
  const mascotOverrideMood = useState<MascotMood | null>('twilights-mascot-override', () => null)
  const mascotSpeech = useState<string>('twilights-mascot-speech', () => 'Cheer your day with me! 🎵')
  const celebrationCount = useState<number>('twilights-celebration-count', () => 0)
  const activeReminder = useState<ActiveReminder | null>('twilights-active-reminder', () => null)
  const miniToastMessage = useState<string>('twilights-mini-toast', () => '')

  // Hitung persentase habit yang sudah selesai hari ini (0 - 100)
  const todayCompletionRate = computed<number>(() => {
    if (habits.value.length === 0) return 0
    const completedCount = habits.value.filter(h => h.completed).length
    return Math.round((completedCount / habits.value.length) * 100)
  })

  // Hitung jumlah habit yang sudah selesai hari ini
  const completedHabitCount = computed<number>(() => {
    return habits.value.filter(h => h.completed).length
  })

  // Cek apakah semua target hari ini sudah 100% tuntas (dan minimal ada 1 target)
  const isAllHabitsCompleted = computed<boolean>(() => {
    return habits.value.length > 0 && completedHabitCount.value === habits.value.length
  })

  // Cek apakah bonus harian +5 Ikan Kering sudah diklaim hari ini (anti-spam 1x/hari)
  const isDailyRewardClaimedToday = computed<boolean>(() => {
    return dailyRewardClaimedDate.value === getTodayDateString()
  })

  // Mode aktif maskot kucing (prioritas: override event > pengingat aktif > 100% tuntas > fokus > idle)
  const currentMascotMood = computed<MascotMood>(() => {
    if (mascotOverrideMood.value) return mascotOverrideMood.value
    if (activeReminder.value) return 'reminder'
    if (isAllHabitsCompleted.value) return 'celebrate'
    if (isPomodoroRunning.value || isBgmPlaying.value) return 'focus'
    return 'idle'
  })

  /** Terapkan atribut data-theme & data-theme-mode (dark/light) ke elemen <html> untuk SEMUA tema */
  function applyThemeToDocument(themeId: ThemeName, darkMode = isDarkTheme.value) {
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-theme', themeId)
    document.documentElement.setAttribute('data-theme-mode', darkMode ? 'dark' : 'light')
    document.documentElement.classList.toggle('theme-dark', darkMode)
    document.documentElement.classList.toggle('theme-light', !darkMode)
  }

  /** Terapkan atribut data-cozy-theme ke elemen <html> (termasuk aksen glow kristal emas Astral Palace) */
  function applyCozyThemeToDocument(cozyId: CozyThemeId) {
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-cozy-theme', cozyId)
  }

  /** Terapkan atribut data-graphics-quality & class mode ringan pada <html> */
  function applyGraphicsQualityToDocument(quality: GraphicsQuality) {
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-graphics-quality', quality)
    document.documentElement.classList.toggle('battery-saver-mode', quality === 'low')
  }

  /** Terapkan class mode hemat baterai (tetap kompatibel dengan kode lama) */
  function applyBatterySaverClass(enabled: boolean) {
    applyGraphicsQualityToDocument(enabled ? 'low' : graphicsQuality.value)
  }

  /**
   * Fungsi Getaran Aman (Web Vibration API):
   * Memeriksa `'vibrate' in navigator` agar aman 100% tanpa error di PC & iOS/Safari.
   */
  function triggerVibration(pattern: number | number[]) {
    if (!import.meta.client || !isVibrationEnabled.value) return
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
    if (typeof navigator.vibrate !== 'function') return
    try {
      navigator.vibrate(pattern)
    } catch {
      // Abaikan secara aman jika browser memblokir getaran tanpa gestur
    }
  }

  /** Hentikan segera segala getaran HP yang sedang berjalan via navigator.vibrate(0) */
  function stopVibration() {
    if (!import.meta.client) return
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
    if (typeof navigator.vibrate !== 'function') return
    try {
      navigator.vibrate(0)
    } catch {
      // Abaikan
    }
  }

  /** Sakelar ON/OFF Getar HP & simpan ke localStorage */
  function toggleVibrationEnabled() {
    isVibrationEnabled.value = !isVibrationEnabled.value
    persistAll()
    if (isVibrationEnabled.value) {
      triggerVibration(VIBRATION_PATTERNS.microHaptic)
      showMiniToast('📳 Getar HP: ON')
    } else {
      stopVibration()
      showMiniToast('📳 Getar HP: OFF')
    }
  }

  /** Simpan seluruh data penting ke localStorage secara aman */
  function persistAll(syncCloud = true) {
    if (!import.meta.client) return

    try {
      const todayStr = getTodayDateString()
      localStorage.setItem(STORAGE_KEYS.THEME, theme.value)
      localStorage.setItem(STORAGE_KEYS.DARK_THEME, String(isDarkTheme.value))
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits.value))
      localStorage.setItem(
        STORAGE_KEYS.TIMER_DURATIONS,
        JSON.stringify(customTimerDurations.value),
      )
      localStorage.setItem(
        STORAGE_KEYS.AMBIENT_MIXER,
        JSON.stringify(ambientMixerSettings.value),
      )
      localStorage.setItem(
        STORAGE_KEYS.WEEKLY_PROGRESS,
        JSON.stringify(weeklyProgress.value),
      )
      localStorage.setItem(STORAGE_KEYS.QUICK_NOTES, quickNotes.value)
      localStorage.setItem(STORAGE_KEYS.USER_NAME, userName.value)
      localStorage.setItem(STORAGE_KEYS.STAR_CURSOR, String(isStarCursorEnabled.value))
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CURSOR, activeCursor.value)
      localStorage.setItem(STORAGE_KEYS.GRAPHICS_QUALITY, graphicsQuality.value)
      localStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, String(isVibrationEnabled.value))
      localStorage.setItem(STORAGE_KEYS.BATTERY_SAVER, String(isBatterySaverMode.value))

      const treatData: TreatRecord = {
        coins: treatCoins.value,
        owned: ownedAccessories.value,
        equipped: equippedAccessory.value,
      }
      localStorage.setItem(STORAGE_KEYS.TREATS, JSON.stringify(treatData))

      const catCustomData: CatCustomizationRecord = {
        ownedCats: ownedCats.value,
        mainCatType: mainCatType.value,
        miniCatType: miniCatType.value,
        syncCatAccessories: syncCatAccessories.value,
        mainCatAccessory: mainCatAccessory.value,
        miniCatAccessory: miniCatAccessory.value,
      }
      localStorage.setItem(STORAGE_KEYS.CAT_CUSTOMIZATION, JSON.stringify(catCustomData))

      const cozyThemeData: CozyThemeRecord = {
        owned: ownedCozyThemes.value,
        active: activeCozyTheme.value,
      }
      localStorage.setItem(STORAGE_KEYS.COZY_THEMES, JSON.stringify(cozyThemeData))

      const fullStreakData: FullGoalStreakRecord = {
        count: fullGoalStreak.value,
        lastFullDate: fullGoalStreakLastDate.value,
        lastRewardClaimedDate: fullGoalStreakRewardClaimedDate.value,
      }
      localStorage.setItem(STORAGE_KEYS.FULL_GOAL_STREAK, JSON.stringify(fullStreakData))
      localStorage.setItem(STORAGE_KEYS.SECRET_CARDS, JSON.stringify(collectedSecretCards.value))

      const affinityData: CatAffinityRecord = {
        level: catAffinityLevel.value,
        xp: catAffinityXp.value,
        heartChestXp: catHeartChestXp.value,
        claimedLv10Reward: claimedLv10Reward.value,
        claimedLv20Reward: claimedLv20Reward.value,
      }
      localStorage.setItem(STORAGE_KEYS.CAT_AFFINITY, JSON.stringify(affinityData))

      const moodData: DailyMoodRecord = {
        date: todayStr,
        mood: dailyMood.value,
      }
      localStorage.setItem(STORAGE_KEYS.DAILY_MOOD, JSON.stringify(moodData))
      if (dailyRewardClaimedDate.value) {
        localStorage.setItem(STORAGE_KEYS.DAILY_REWARD_DATE, dailyRewardClaimedDate.value)
      }
      localStorage.setItem(STORAGE_KEYS.NOTEBOOKS, JSON.stringify(notebooks.value))
      localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms.value))
      localStorage.setItem(STORAGE_KEYS.ALARM_SOUND, selectedAlarmSound.value)
      localStorage.setItem(STORAGE_KEYS.GAME_HIGHSCORE, String(gameHighScore.value))
      const claimRecord: GameDailyClaimRecord = {
        date: gameDailyClaimDate.value || todayStr,
        count: catcherRewardCount.value,
        playCount: catcherPlayCount.value,
        catcherPlayCount: catcherPlayCount.value,
        fishingPlayCount: fishingPlayCount.value,
        catcherRewardCount: catcherRewardCount.value,
        fishingRewardCount: fishingRewardCount.value,
        fishingHighScore: fishingHighScore.value,
      }
      localStorage.setItem(STORAGE_KEYS.GAME_DAILY_CLAIMS, JSON.stringify(claimRecord))

      const sessionData: FocusSessionRecord = {
        date: todayStr,
        todayCount: todayFocusSessions.value,
        totalCount: totalFocusSessions.value,
        todaySeconds: todayFocusSeconds.value,
      }
      localStorage.setItem(STORAGE_KEYS.FOCUS_SESSIONS, JSON.stringify(sessionData))

      const streakData: StreakRecord = {
        count: dailyStreak.value,
        lastCompletedDate: streakLastDate.value,
      }
      localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streakData))
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr)
    } catch (err) {
      console.warn('Gagal menyimpan data ke localStorage:', err)
    }

    // Jadwalkan sinkronisasi otomatis ke Firebase Firestore (jika login Google) & TiDB Cloud di latar belakang
    if (syncCloud && isHydrated.value) {
      scheduleCloudSync()
      scheduleFirestoreSync(() => buildStateSnapshot())
    }
  }

  /** Kumpulkan snapshot seluruh data pengguna untuk Cloud Sync (Firebase Firestore & TiDB Cloud) */
  function buildStateSnapshot() {
    return {
      userName: userName.value,
      theme: theme.value,
      isDarkTheme: isDarkTheme.value,
      habits: habits.value,
      customTimerDurations: customTimerDurations.value,
      weeklyProgress: weeklyProgress.value,
      todayFocusSessions: todayFocusSessions.value,
      totalFocusSessions: totalFocusSessions.value,
      todayFocusSeconds: todayFocusSeconds.value,
      dailyStreak: dailyStreak.value,
      streakLastDate: streakLastDate.value,
      treatCoins: treatCoins.value,
      coins: treatCoins.value,
      ownedAccessories: ownedAccessories.value,
      equippedAccessory: equippedAccessory.value,
      ownedCats: ownedCats.value,
      mainCatType: mainCatType.value,
      miniCatType: miniCatType.value,
      syncCatAccessories: syncCatAccessories.value,
      mainCatAccessory: mainCatAccessory.value,
      miniCatAccessory: miniCatAccessory.value,
      ownedCozyThemes: ownedCozyThemes.value,
      activeCozyTheme: activeCozyTheme.value,
      fullGoalStreak: fullGoalStreak.value,
      fullGoalStreakLastDate: fullGoalStreakLastDate.value,
      fullGoalStreakRewardClaimedDate: fullGoalStreakRewardClaimedDate.value,
      collectedSecretCards: collectedSecretCards.value,
      unlockedCards: collectedSecretCards.value,
      affectionPoints: catAffinityXp.value,
      catAffinity: {
        level: catAffinityLevel.value,
        xp: catAffinityXp.value,
        heartChestXp: catHeartChestXp.value,
        claimedLv10Reward: claimedLv10Reward.value,
        claimedLv20Reward: claimedLv20Reward.value,
      },
      ambientMixerSettings: ambientMixerSettings.value,
      quickNotes: quickNotes.value,
      dailyMood: dailyMood.value,
      dailyRewardClaimedDate: dailyRewardClaimedDate.value,
      twilights_notebooks: notebooks.value,
      twilights_alarms: alarms.value,
      selectedAlarmSound: selectedAlarmSound.value,
      gameHighScore: gameHighScore.value,
      fishingHighScore: fishingHighScore.value,
      gameDate: gameDailyClaimDate.value || getLocalTodayDate(),
      catcherPlayCount: catcherPlayCount.value,
      fishingPlayCount: fishingPlayCount.value,
      catcherRewardCount: catcherRewardCount.value,
      fishingRewardCount: fishingRewardCount.value,
      gameDailyClaims: {
        date: gameDailyClaimDate.value || getLocalTodayDate(),
        count: catcherRewardCount.value,
        playCount: catcherPlayCount.value,
        catcherPlayCount: catcherPlayCount.value,
        fishingPlayCount: fishingPlayCount.value,
        catcherRewardCount: catcherRewardCount.value,
        fishingRewardCount: fishingRewardCount.value,
        fishingHighScore: fishingHighScore.value,
      },
      isStarCursorEnabled: isStarCursorEnabled.value,
      activeCursor: activeCursor.value,
      graphicsQuality: graphicsQuality.value,
      isVibrationEnabled: isVibrationEnabled.value,
      isBatterySaverMode: isBatterySaverMode.value,
      lastActiveDate: getLocalTodayDate(),
    }
  }

  /** Kirim seluruh state ke TiDB Cloud via POST /api/sync/state */
  async function pushStateToCloud(silent = true): Promise<boolean> {
    if (!import.meta.client) return false

    cloudSyncStatus.value = 'syncing'
    try {
      const response = await $fetch<{ ok: boolean; savedAt?: string }>('/api/sync/state', {
        method: 'POST',
        body: {
          profileId: 'default',
          data: buildStateSnapshot(),
        },
      })
      if (response?.ok) {
        cloudSyncStatus.value = 'synced'
        cloudLastSyncedAt.value = response.savedAt ?? new Date().toISOString()
        if (!silent) {
          showMiniToast('Tersinkron ke TiDB Cloud! ☁️✨')
        }
        return true
      }
      cloudSyncStatus.value = 'offline'
      return false
    } catch {
      cloudSyncStatus.value = 'offline'
      if (!silent) {
        showMiniToast('TiDB Cloud sedang offline — data aman di browser lokal 💾')
      }
      return false
    }
  }

  /** Debounce update profil ke TiDB Cloud (PUT /api/profile) agar hemat query saat mengetik cepat */
  function scheduleCloudSync() {
    if (!import.meta.client) return
    if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer)
    cloudSyncDebounceTimer = setTimeout(() => {
      syncProfileToDb()
    }, 650)
  }

  /** Helper ringan untuk menjalankan request CRUD ke TiDB Cloud & memperbarui indikator status */
  async function runDbCrud(requestFn: () => Promise<unknown>) {
    if (!import.meta.client) return
    cloudSyncStatus.value = 'syncing'
    try {
      await requestFn()
      cloudSyncStatus.value = 'synced'
      cloudLastSyncedAt.value = new Date().toISOString()
    } catch {
      cloudSyncStatus.value = 'offline'
    }
  }

  /** UPDATE profil & statistik langsung ke tabel `twilights_profiles` via PUT /api/profile */
  async function syncProfileToDb() {
    await runDbCrud(() =>
      $fetch('/api/profile', {
        method: 'PUT',
        body: {
          profileId: 'default',
          ...buildStateSnapshot(),
        },
      }),
    )
  }

  /**
   * Sinkronisasi awal dengan TiDB Cloud:
   * - Pengguna baru (localStorage masih kosong / `hadLocalHabits === false`) selalu memulai
   *   dari kondisi bersih (tidak menarik data profil pribadi dari cloud).
   * - Pengguna lama yang sudah memiliki data lokal tetap mempertahankan datanya dan
   *   menyinkronkannya secara aman ke cloud bila backend tersedia.
   */
  async function hydrateFromCloud() {
    if (!import.meta.client || isCloudHydrated.value) return
    isCloudHydrated.value = true

    if (!hadLocalHabits.value) {
      cloudSyncStatus.value = 'idle'
      return
    }

    cloudSyncStatus.value = 'syncing'
    try {
      await pushStateToCloud(true)
    } catch {
      cloudSyncStatus.value = 'offline'
    }
  }

  /** Helper internal untuk menerapkan payload dari Cloud Sync (Firebase Firestore / TiDB) ke state lokal */
  function applyImportedDataSilently(
    d: Record<string, unknown>,
    remoteUser?: FirebaseProfileUser,
  ) {
    if (typeof d.userName === 'string' && d.userName.trim()) {
      userName.value = d.userName.trim()
    } else if (remoteUser && userName.value === 'Teman Twilight') {
      const firstName = remoteUser.displayName.split(' ')[0] || remoteUser.displayName
      if (firstName) userName.value = firstName
    }
    if (typeof d.isDarkTheme === 'boolean') {
      isDarkTheme.value = d.isDarkTheme
    }
    if (d.theme === 'twilight' || d.theme === 'sakura' || d.theme === 'ocean') {
      theme.value = d.theme
      applyThemeToDocument(d.theme, isDarkTheme.value)
    } else {
      applyThemeToDocument(theme.value, isDarkTheme.value)
    }
    if (Array.isArray(d.habits)) {
      habits.value = sortHabitsByCompletion(
        d.habits
          .filter((item): item is HabitItem => Boolean(item) && typeof item === 'object' && typeof (item as HabitItem).title === 'string')
          .map((item, idx) => normalizeHabitItem(item, `cloud-h-${idx}`)),
      )
      hadLocalHabits.value = true
    }
    const cloudTimerDurations = d.twilights_timer_durations ?? d.customTimerDurations
    if (cloudTimerDurations && typeof cloudTimerDurations === 'object') {
      customTimerDurations.value = sanitizeTimerDurations(cloudTimerDurations)
      timerDurationsVersion.value += 1
    }
    if (Array.isArray(d.weeklyProgress) && d.weeklyProgress.length === 7) {
      weeklyProgress.value = d.weeklyProgress.map(n => Math.max(0, Math.min(100, Number(n) || 0)))
    }
    if (typeof d.todayFocusSessions === 'number') todayFocusSessions.value = Math.max(0, d.todayFocusSessions)
    if (typeof d.totalFocusSessions === 'number') totalFocusSessions.value = Math.max(0, d.totalFocusSessions)
    if (typeof d.todayFocusSeconds === 'number') todayFocusSeconds.value = Math.max(0, d.todayFocusSeconds)
    if (typeof d.dailyStreak === 'number') dailyStreak.value = Math.max(0, d.dailyStreak)
    if (typeof d.streakLastDate === 'string') streakLastDate.value = d.streakLastDate
    if (typeof d.treatCoins === 'number') treatCoins.value = Math.max(0, d.treatCoins)
    if (Array.isArray(d.ownedAccessories)) {
      ownedAccessories.value = sanitizeOwnedAccessories(d.ownedAccessories)
    }
    if (isValidAccessoryId(d.equippedAccessory)) {
      equippedAccessory.value = d.equippedAccessory
    }
    if (Array.isArray(d.ownedCats)) {
      ownedCats.value = sanitizeOwnedCats(d.ownedCats)
    }
    if (isValidCatBreedId(d.mainCatType) && ownedCats.value.includes(d.mainCatType)) {
      mainCatType.value = d.mainCatType
    }
    if (isValidCatBreedId(d.miniCatType) && ownedCats.value.includes(d.miniCatType)) {
      miniCatType.value = d.miniCatType
    }
    if (typeof d.syncCatAccessories === 'boolean') {
      syncCatAccessories.value = d.syncCatAccessories
    }
    if (isValidAccessoryId(d.mainCatAccessory)) {
      mainCatAccessory.value = d.mainCatAccessory
      equippedAccessory.value = d.mainCatAccessory
    } else if (isValidAccessoryId(d.equippedAccessory)) {
      mainCatAccessory.value = d.equippedAccessory
    }
    if (isValidAccessoryId(d.miniCatAccessory)) {
      miniCatAccessory.value = syncCatAccessories.value ? mainCatAccessory.value : d.miniCatAccessory
    } else if (isValidAccessoryId(d.equippedAccessory)) {
      miniCatAccessory.value = d.equippedAccessory
    }
    const cloudAffinity = d.twilights_cat_affinity ?? d.catAffinity
    if (cloudAffinity && typeof cloudAffinity === 'object') {
      const cleanAffinity = sanitizeCatAffinity(cloudAffinity)
      catAffinityLevel.value = cleanAffinity.level
      catAffinityXp.value = cleanAffinity.xp
      catHeartChestXp.value = cleanAffinity.heartChestXp
      claimedLv10Reward.value = cleanAffinity.claimedLv10Reward
      claimedLv20Reward.value = cleanAffinity.claimedLv20Reward
    }
    if (Array.isArray(d.ownedCozyThemes)) {
      ownedCozyThemes.value = sanitizeOwnedCozyThemes(d.ownedCozyThemes)
    }
    if (isValidCozyThemeId(d.activeCozyTheme) && ownedCozyThemes.value.includes(d.activeCozyTheme)) {
      activeCozyTheme.value = d.activeCozyTheme
      applyCozyThemeToDocument(d.activeCozyTheme)
    }
    if (typeof d.fullGoalStreak === 'number') {
      fullGoalStreak.value = Math.max(0, Math.floor(d.fullGoalStreak))
    }
    if (typeof d.fullGoalStreakLastDate === 'string') {
      fullGoalStreakLastDate.value = d.fullGoalStreakLastDate
    }
    if (typeof d.fullGoalStreakRewardClaimedDate === 'string') {
      fullGoalStreakRewardClaimedDate.value = d.fullGoalStreakRewardClaimedDate
    }
    const cloudCards = d.twilights_secret_cards ?? d.unlockedCards ?? d.collectedSecretCards
    if (Array.isArray(cloudCards)) {
      collectedSecretCards.value = sanitizeCollectedSecretCards(cloudCards)
    }
    const cloudAmbient = d.twilights_ambient_mixer ?? d.ambientMixerSettings
    if (cloudAmbient && typeof cloudAmbient === 'object') {
      ambientMixerSettings.value = sanitizeAmbientMixerSettings(cloudAmbient)
      isRainAmbientOn.value = ambientMixerSettings.value.rain.enabled
      ambientMixerVersion.value += 1
    }
    if (typeof d.quickNotes === 'string') quickNotes.value = d.quickNotes
    if (
      d.dailyMood === null ||
      d.dailyMood === 'happy' ||
      d.dailyMood === 'calm' ||
      d.dailyMood === 'sleepy' ||
      d.dailyMood === 'motivated' ||
      d.dailyMood === 'tired'
    ) {
      dailyMood.value = d.dailyMood
    }
    if (typeof d.dailyRewardClaimedDate === 'string') {
      dailyRewardClaimedDate.value = d.dailyRewardClaimedDate
    }
    const cloudNotes = d.twilights_notebooks ?? d.notebooks
    if (Array.isArray(cloudNotes) && cloudNotes.length > 0) {
      notebooks.value = cloudNotes as NotebookEntry[]
    }
    const cloudAlarms = d.twilights_alarms ?? d.alarms
    if (Array.isArray(cloudAlarms)) {
      const nowMs = Date.now()
      alarms.value = (cloudAlarms as KawaiiAlarmItem[]).filter(
        a => typeof a?.targetTimestamp === 'number' && a.targetTimestamp > nowMs - 60000,
      )
    }
    if (
      d.selectedAlarmSound === 'music-box' ||
      d.selectedAlarmSound === 'morning-chime' ||
      d.selectedAlarmSound === 'cute-beep'
    ) {
      selectedAlarmSound.value = d.selectedAlarmSound
    }
    const cloudHighScore = d.twilights_game_highscore ?? d.gameHighScore
    if (typeof cloudHighScore === 'number') {
      gameHighScore.value = Math.max(0, Math.round(cloudHighScore))
    }
    if (typeof d.fishingHighScore === 'number') {
      fishingHighScore.value = Math.max(0, Math.round(d.fishingHighScore))
    }
    const cloudGameClaims = (d.twilights_game_daily_claims ?? d.gameDailyClaims) as
      | Partial<GameDailyClaimRecord>
      | undefined
    const cloudGameDate =
      (typeof d.gameDate === 'string' && d.gameDate) || cloudGameClaims?.date || ''
    if (cloudGameDate || cloudGameClaims) {
      const localToday = getLocalTodayDate()
      if (typeof cloudGameClaims?.fishingHighScore === 'number') {
        fishingHighScore.value = Math.max(0, Math.round(cloudGameClaims.fishingHighScore))
      }
      if (cloudGameDate === localToday) {
        gameDailyClaimDate.value = localToday
        const cReward = Math.max(
          0,
          Math.min(
            MAX_GAME_DAILY_REWARDS,
            Math.floor(Number(d.catcherRewardCount ?? cloudGameClaims?.catcherRewardCount ?? cloudGameClaims?.count) || 0),
          ),
        )
        const cPlay = Math.max(
          0,
          Math.min(
            MAX_GAME_DAILY_PLAYS,
            Math.floor(Number(d.catcherPlayCount ?? cloudGameClaims?.catcherPlayCount ?? cloudGameClaims?.playCount) || 0),
          ),
        )
        const fReward = Math.max(
          0,
          Math.min(
            MAX_GAME_DAILY_REWARDS,
            Math.floor(Number(d.fishingRewardCount ?? cloudGameClaims?.fishingRewardCount) || 0),
          ),
        )
        const fPlay = Math.max(
          0,
          Math.min(
            MAX_GAME_DAILY_PLAYS,
            Math.floor(Number(d.fishingPlayCount ?? cloudGameClaims?.fishingPlayCount) || 0),
          ),
        )
        catcherRewardCount.value = cReward
        catcherPlayCount.value = cPlay
        fishingRewardCount.value = fReward
        fishingPlayCount.value = fPlay
        gameDailyClaimCount.value = cReward
        gameDailyPlayCount.value = cPlay
      }
    }
    if (typeof d.isVibrationEnabled === 'boolean') {
      isVibrationEnabled.value = d.isVibrationEnabled
    }
    if (isValidCursorId(d.activeCursor)) {
      activeCursor.value = isCursorUnlocked(d.activeCursor) ? d.activeCursor : 'starlight-wand'
      isStarCursorEnabled.value = activeCursor.value !== 'off'
    } else if (typeof d.isStarCursorEnabled === 'boolean') {
      isStarCursorEnabled.value = d.isStarCursorEnabled
      activeCursor.value = d.isStarCursorEnabled ? 'starlight-wand' : 'off'
    }
    if (isValidGraphicsQuality(d.graphicsQuality)) {
      graphicsQuality.value = d.graphicsQuality
      isBatterySaverMode.value = d.graphicsQuality === 'low'
      applyGraphicsQualityToDocument(d.graphicsQuality)
    } else if (typeof d.isBatterySaverMode === 'boolean') {
      isBatterySaverMode.value = d.isBatterySaverMode
      graphicsQuality.value = d.isBatterySaverMode ? 'low' : 'high'
      applyGraphicsQualityToDocument(graphicsQuality.value)
    }

    habitResetVersion.value += 1
    // Simpan seluruh perubahan dari Cloud ke localStorage secara senyap tanpa memicu tulis balik ke Firestore
    persistAll(false)
  }

  /** Memicu ekspresi & gelembung ucapan sementara pada maskot kucing */
  function triggerMascotReaction(
    mood: MascotMood,
    speech: string,
    durationMs = 3600,
  ) {
    mascotOverrideMood.value = mood
    mascotSpeech.value = speech

    if (mascotResetTimer) clearTimeout(mascotResetTimer)
    mascotResetTimer = setTimeout(() => {
      mascotOverrideMood.value = null
    }, durationMs)
  }

  /** Menampilkan pesan toast penyemangat mini sebentar */
  function showMiniToast(message: string) {
    miniToastMessage.value = message
    if (miniToastTimer) clearTimeout(miniToastTimer)
    miniToastTimer = setTimeout(() => {
      miniToastMessage.value = ''
    }, 2600)
  }

  /** Menampilkan kartu pop-up notifikasi hadiah harian +5 Ikan Kering */
  function showDailyRewardCard(message: string) {
    dailyRewardCardMessage.value = message
    if (dailyRewardCardTimer) clearTimeout(dailyRewardCardTimer)
    dailyRewardCardTimer = setTimeout(() => {
      dailyRewardCardMessage.value = ''
    }, 6000)
  }

  function dismissDailyRewardCard() {
    dailyRewardCardMessage.value = ''
  }

  // --- Aksi CRUD untuk Kawaii Notebook (`twilights_notebooks`) ---

  /** CREATE: Buat halaman catatan baru di UI & langsung INSERT ke TiDB (`POST /api/notebooks`) */
  function createNotebookEntry(): NotebookEntry {
    const nowIso = new Date().toISOString()
    const newEntry: NotebookEntry = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: 'Catatan Baru ✨',
      content: '',
      tag: 'general',
      paperTheme: 'lavender-lined',
      createdAt: nowIso,
      updatedAt: nowIso,
    }
    notebooks.value = [newEntry, ...notebooks.value]
    persistAll()
    runDbCrud(() =>
      $fetch('/api/notebooks', {
        method: 'POST',
        body: { profileId: 'default', ...newEntry },
      }),
    )
    return newEntry
  }

  /** UPDATE: Perbarui catatan di UI & debounce PATCH ke TiDB (`PATCH /api/notebooks/:id`) */
  function updateNotebookEntry(
    id: string,
    patch: Partial<Pick<NotebookEntry, 'title' | 'content' | 'tag' | 'paperTheme'>>,
  ) {
    notebooks.value = notebooks.value.map(entry =>
      entry.id === id
        ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
        : entry,
    )
    persistAll()

    if (notebookPatchTimer) clearTimeout(notebookPatchTimer)
    notebookPatchTimer = setTimeout(() => {
      const latest = notebooks.value.find(n => n.id === id)
      if (!latest) return
      runDbCrud(() =>
        $fetch(`/api/notebooks/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: {
            profileId: 'default',
            title: latest.title,
            content: latest.content,
            tag: latest.tag,
            paperTheme: latest.paperTheme,
          },
        }),
      )
    }, 450)
  }

  /** DELETE: Hapus satu catatan dari UI & TiDB (`DELETE /api/notebooks/:id`) */
  function deleteNotebookEntry(id: string) {
    notebooks.value = notebooks.value.filter(entry => entry.id !== id)
    persistAll()
    runDbCrud(() =>
      $fetch(`/api/notebooks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        query: { profileId: 'default' },
      }),
    )
  }

  // --- Aksi CRUD untuk Kawaii Alarm (`twilights_alarms`) ---

  /** CREATE: Tambah alarm countdown & langsung INSERT ke TiDB (`POST /api/alarms`) */
  function addCountdownAlarm(minutes: number, label?: string): KawaiiAlarmItem | null {
    const safeMinutes = Math.max(0.5, Number(minutes) || 0)
    if (safeMinutes <= 0) return null

    const targetTimestamp = Date.now() + Math.round(safeMinutes * 60 * 1000)
    const targetDate = new Date(targetTimestamp)
    const clockTime = `${String(targetDate.getHours()).padStart(2, '0')}:${String(
      targetDate.getMinutes(),
    ).padStart(2, '0')}`

    const item: KawaiiAlarmItem = {
      id: `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode: 'countdown',
      label: label?.trim() || 'Waktunya berdiri & peregangan! 🧘‍♀️',
      targetTimestamp,
      clockTime,
      createdAt: new Date().toISOString(),
    }

    alarms.value = [...alarms.value, item].sort((a, b) => a.targetTimestamp - b.targetTimestamp)
    persistAll()
    runDbCrud(() =>
      $fetch('/api/alarms', {
        method: 'POST',
        body: { profileId: 'default', ...item },
      }),
    )
    playPopTing()
    showMiniToast(`Alarm dipasang untuk ${safeMinutes} menit lagi ⏰✨`)
    return item
  }

  /** CREATE: Tambah alarm jam tertentu & langsung INSERT ke TiDB (`POST /api/alarms`) */
  function addClockAlarm(timeStr: string, label?: string): KawaiiAlarmItem | null {
    const [hStr, mStr] = timeStr.split(':')
    const hours = Number(hStr)
    const minutes = Number(mStr)
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

    const target = new Date()
    target.setHours(hours, minutes, 0, 0)
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1)
    }

    const item: KawaiiAlarmItem = {
      id: `alarm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode: 'clock',
      label: label?.trim() || 'Istirahat sejenak ✨',
      targetTimestamp: target.getTime(),
      clockTime: timeStr,
      createdAt: new Date().toISOString(),
    }

    alarms.value = [...alarms.value, item].sort((a, b) => a.targetTimestamp - b.targetTimestamp)
    persistAll()
    runDbCrud(() =>
      $fetch('/api/alarms', {
        method: 'POST',
        body: { profileId: 'default', ...item },
      }),
    )
    playPopTing()
    showMiniToast(`Alarm jam ${timeStr} berhasil dipasang ⏰✨`)
    return item
  }

  /** DELETE: Hapus alarm dari UI & TiDB (`DELETE /api/alarms/:id`) */
  function removeAlarm(id: string) {
    alarms.value = alarms.value.filter(a => a.id !== id)
    persistAll()
    runDbCrud(() =>
      $fetch(`/api/alarms/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        query: { profileId: 'default' },
      }),
    )
  }

  /** Ubah pilihan nada dering Kawaii Alarm */
  function setAlarmSound(soundId: AlarmSoundId) {
    selectedAlarmSound.value = soundId
    persistAll()
  }

  /** Pastikan kuota bermain & hadiah harian kedua Break Game selalu sinkron dengan tanggal lokal perangkat (00:00) */
  function syncMiniGameDailyQuota(): string {
    const todayStr = getLocalTodayDate()
    if (gameDailyClaimDate.value !== todayStr) {
      gameDailyClaimDate.value = todayStr
      catcherPlayCount.value = 0
      fishingPlayCount.value = 0
      catcherRewardCount.value = 0
      fishingRewardCount.value = 0
      gameDailyClaimCount.value = 0
      gameDailyPlayCount.value = 0
      persistAll()
    }
    return todayStr
  }

  /**
   * Konsumsi 1 kuota bermain harian untuk jenis game tertentu ('catcher' atau 'fishing', maks 3x/hari per game).
   */
  function consumeMiniGamePlayFor(gameId: MiniGameId): boolean {
    syncMiniGameDailyQuota()
    if (gameId === 'fishing') {
      if (fishingPlayCount.value >= MAX_GAME_DAILY_PLAYS) return false
      fishingPlayCount.value = Math.min(MAX_GAME_DAILY_PLAYS, fishingPlayCount.value + 1)
    } else {
      if (catcherPlayCount.value >= MAX_GAME_DAILY_PLAYS) return false
      catcherPlayCount.value = Math.min(MAX_GAME_DAILY_PLAYS, catcherPlayCount.value + 1)
      gameDailyPlayCount.value = catcherPlayCount.value
    }
    persistAll()
    return true
  }

  /** Alias kompatibilitas untuk game Starlight Catcher */
  function consumeMiniGamePlay(): boolean {
    return consumeMiniGamePlayFor('catcher')
  }

  /**
   * Catat hasil ronde untuk KEDUA Mini-Game ('catcher' & 'fishing'):
   * 1. Hadiah Penyelesaian Ronde (+5 🐟) bila kuota hadiah game tersebut < 3/3 (maks 15 🐟/game/hari).
   * 2. Konversi Ikan Tangkapan: 1 Ikan = +1 Koin Ikan langsung ke saldo.
   * 3. Bintang / Bintang Laut / Kerang: +1 Poin Kasih Sayang setiap 3 item terkumpul (memicu auto-drop kartu jika penuh!).
   */
  function recordMiniGameRoundResult(payload: {
    gameId: MiniGameId
    score: number
    fishCaught: number
    starsCollected: number
  }): {
    isNewRecord: boolean
    baseRewardCoins: number
    fishBonusCoins: number
    totalCoinsAwarded: number
    affectionGained: number
    claimsUsed: number
    maxClaims: number
    playsUsed: number
    maxPlays: number
    highScore: number
  } {
    const cleanScore = Math.max(0, Math.round(payload.score))
    const cleanFish = Math.max(0, Math.floor(payload.fishCaught))
    const cleanStars = Math.max(0, Math.floor(payload.starsCollected))
    syncMiniGameDailyQuota()

    let isNewRecord = false
    let currentHigh = 0
    if (payload.gameId === 'fishing') {
      if (cleanScore > fishingHighScore.value) {
        fishingHighScore.value = cleanScore
        isNewRecord = true
      }
      currentHigh = fishingHighScore.value
    } else {
      if (cleanScore > gameHighScore.value) {
        gameHighScore.value = cleanScore
        isNewRecord = true
      }
      currentHigh = gameHighScore.value
    }

    // 1. Tambah kuota main (+1) & hadiah dasar (+5 🐟) HANYA saat ronde selesai penuh 50 detik!
    let baseRewardCoins = 0
    if (payload.gameId === 'fishing') {
      if (fishingPlayCount.value >= MAX_GAME_DAILY_PLAYS) {
        return {
          isNewRecord: false,
          baseRewardCoins: 0,
          fishBonusCoins: 0,
          totalCoinsAwarded: 0,
          affectionGained: 0,
          claimsUsed: fishingRewardCount.value,
          maxClaims: MAX_GAME_DAILY_REWARDS,
          playsUsed: fishingPlayCount.value,
          maxPlays: MAX_GAME_DAILY_PLAYS,
          highScore: fishingHighScore.value,
        }
      }
      fishingPlayCount.value = Math.min(MAX_GAME_DAILY_PLAYS, fishingPlayCount.value + 1)
      if (fishingRewardCount.value < MAX_GAME_DAILY_REWARDS) {
        baseRewardCoins = GAME_COMPLETION_BASE_COINS
        fishingRewardCount.value = Math.min(MAX_GAME_DAILY_REWARDS, fishingRewardCount.value + 1)
      }
    } else {
      if (catcherPlayCount.value >= MAX_GAME_DAILY_PLAYS) {
        return {
          isNewRecord: false,
          baseRewardCoins: 0,
          fishBonusCoins: 0,
          totalCoinsAwarded: 0,
          affectionGained: 0,
          claimsUsed: catcherRewardCount.value,
          maxClaims: MAX_GAME_DAILY_REWARDS,
          playsUsed: catcherPlayCount.value,
          maxPlays: MAX_GAME_DAILY_PLAYS,
          highScore: gameHighScore.value,
        }
      }
      catcherPlayCount.value = Math.min(MAX_GAME_DAILY_PLAYS, catcherPlayCount.value + 1)
      gameDailyPlayCount.value = catcherPlayCount.value
      if (catcherRewardCount.value < MAX_GAME_DAILY_REWARDS) {
        baseRewardCoins = GAME_COMPLETION_BASE_COINS
        catcherRewardCount.value = Math.min(MAX_GAME_DAILY_REWARDS, catcherRewardCount.value + 1)
        gameDailyClaimCount.value = catcherRewardCount.value
      }
    }

    // 2. Konversi Ikan Tangkapan (1 Ikan = +1 Koin Ikan)
    const fishBonusCoins = cleanFish
    const totalCoinsAwarded = baseRewardCoins + fishBonusCoins
    if (totalCoinsAwarded > 0) {
      treatCoins.value += totalCoinsAwarded
      playVictoryMelody()
    }

    // 3. Poin Kasih Sayang (+1 💖 setiap 3 bintang / bintang laut / kerang)
    const affectionGained = Math.floor(cleanStars / 3)
    if (affectionGained > 0) {
      addCatAffinityXp(affectionGained, 'game')
    }

    const claimsUsed =
      payload.gameId === 'fishing' ? fishingRewardCount.value : catcherRewardCount.value
    const playsUsed =
      payload.gameId === 'fishing' ? fishingPlayCount.value : catcherPlayCount.value

    if (totalCoinsAwarded > 0 || affectionGained > 0) {
      const parts: string[] = []
      if (totalCoinsAwarded > 0) parts.push(`+${totalCoinsAwarded} 🐟`)
      if (affectionGained > 0) parts.push(`+${affectionGained} 💖`)
      showMiniToast(`🎮 Ronde selesai! Hadiah ${parts.join(' & ')} diterima ✨`)
      triggerMascotReaction(
        'happy',
        `Seru banget mainnya! Hadiah ${parts.join(' & ')} buatmu~ 🎮💖`,
        3200,
      )
    }

    persistAll()

    return {
      isNewRecord,
      baseRewardCoins,
      fishBonusCoins,
      totalCoinsAwarded,
      affectionGained,
      claimsUsed,
      maxClaims: MAX_GAME_DAILY_REWARDS,
      playsUsed,
      maxPlays: MAX_GAME_DAILY_PLAYS,
      highScore: currentHigh,
    }
  }

  /** Alias kompatibilitas untuk fungsi lama */
  function recordMiniGameResult(score: number) {
    const res = recordMiniGameRoundResult({
      gameId: 'catcher',
      score,
      fishCaught: 0,
      starsCollected: 0,
    })
    return {
      isNewRecord: res.isNewRecord,
      coinsAwarded: res.totalCoinsAwarded,
      claimsUsed: res.claimsUsed,
      maxClaims: res.maxClaims,
      playsUsed: res.playsUsed,
      maxPlays: res.maxPlays,
    }
  }

  /** Pemicu pintasan keyboard Space atau tombol Mode Zen untuk Start/Pause Pomodoro Timer */
  function triggerPomodoroShortcutToggle() {
    pomodoroToggleSignal.value += 1
  }

  /** Pemicu reset Pomodoro Timer dari Twilight Focus atau pintasan tombol R */
  function triggerPomodoroReset() {
    pomodoroResetSignal.value += 1
  }

  /** Pemicu pindah cepat tab mode timer via tombol 1 (Fokus), 2 (Istirahat Singkat), 3 (Istirahat Panjang) */
  function triggerPomodoroModeSwitch(mode: TimerModeKey) {
    pomodoroModeSignal.value = {
      mode,
      seq: pomodoroModeSignal.value.seq + 1,
    }
  }

  /** Pemicu Play / Pause musik BGM Player via tombol P */
  function triggerBgmPlayToggle() {
    bgmPlayToggleSignal.value += 1
  }

  /** Pemicu Mute / Unmute seluruh audio (BGM + Ambient Mixer) via tombol M */
  function triggerBgmMuteToggle() {
    bgmMuteToggleSignal.value += 1
  }

  /** Pemicu interaksi / elus Kucing Putih dari keyboard via tombol C */
  function triggerCatKeyboardInteract() {
    catKeyboardInteractSignal.value += 1
  }

  /** Perbarui hitungan Streak Harian (🔥) saat pengguna menyelesaikan target hari ini */
  function updateDailyStreak() {
    const todayStr = getTodayDateString()
    const yesterdayStr = getTodayDateString(-1)

    // Streak bertambah ketika minimal ada 1 target selesai hari ini dan belum tercatat untuk hari ini
    if (completedHabitCount.value > 0 && streakLastDate.value !== todayStr) {
      if (streakLastDate.value === yesterdayStr) {
        dailyStreak.value += 1
      } else {
        dailyStreak.value = Math.max(1, dailyStreak.value === 0 ? 1 : 1)
      }
      streakLastDate.value = todayStr
    }
  }

  /**
   * Perbarui hitungan 7-Day Full Goal Streak (100% semua target Daily Habit Tracker selesai berturut-turut).
   * Saat mencapai hari ke-7 (dan tiap kelipatan siklus 7 hari penuh, anti-klaim ganda di hari yang sama):
   * 1. Bonus +15 🐟 langsung ke saldo koin ikan.
   * 2. Membuka tema eksklusif 👑 Astral Crystal Palace secara permanen.
   * 3. Memunculkan popup & toast perayaan spesial!
   */
  function updateFullGoalStreak(): boolean {
    if (!isAllHabitsCompleted.value) return false
    const todayStr = getTodayDateString()
    const yesterdayStr = getTodayDateString(-1)

    if (fullGoalStreakLastDate.value === todayStr) return false

    if (fullGoalStreakLastDate.value === yesterdayStr) {
      fullGoalStreak.value += 1
    } else {
      fullGoalStreak.value = 1
    }
    fullGoalStreakLastDate.value = todayStr

    const reachedSevenDayCycle =
      fullGoalStreak.value > 0 && fullGoalStreak.value % ASTRAL_PALACE_STREAK_GOAL === 0
    const alreadyClaimedRewardToday = fullGoalStreakRewardClaimedDate.value === todayStr

    if (reachedSevenDayCycle && !alreadyClaimedRewardToday) {
      const unlockedAstralNow = !ownedCozyThemes.value.includes('astral-palace')
      if (unlockedAstralNow) {
        ownedCozyThemes.value = [...ownedCozyThemes.value, 'astral-palace']
      }
      treatCoins.value += ASTRAL_PALACE_STREAK_FISH_REWARD
      fullGoalStreakRewardClaimedDate.value = todayStr
      checkAndUnlockNeonCity(false)

      const celebrationMsg = unlockedAstralNow
        ? '🎉 Luar Biasa! 7-Day Full Goal Streak Tercapai! Hadiah +15 🐟, Tema 👑 Astral Crystal Palace & Kursor 💎 Astral Prism terbuka!'
        : `🎉 Luar Biasa! ${fullGoalStreak.value}-Day Full Goal Streak Tercapai! Hadiah +${ASTRAL_PALACE_STREAK_FISH_REWARD} 🐟 diterima!`

      celebrationCount.value += 1
      playVictoryMelody()
      showDailyRewardCard(celebrationMsg)
      showMiniToast(celebrationMsg)
      triggerMascotReaction('celebrate', celebrationMsg, 6800)
      return true
    }

    // Pengaman ekstra jika streak >= 7 namun tema belum tercatat di ownedCozyThemes
    if (
      fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL &&
      !ownedCozyThemes.value.includes('astral-palace')
    ) {
      ownedCozyThemes.value = [...ownedCozyThemes.value, 'astral-palace']
      checkAndUnlockNeonCity(true)
    }

    return false
  }

  /** Memperbarui grafik batang hari ini setiap kali daftar habit berubah */
  function syncTodayProgress(): boolean {
    const idx = todayIndex.value
    const updated = [...weeklyProgress.value]
    updated[idx] = todayCompletionRate.value
    weeklyProgress.value = updated
    updateDailyStreak()
    const triggeredSevenDayReward = updateFullGoalStreak()
    persistAll()
    return triggeredSevenDayReward
  }

  /** Ganti tema warna website secara instan & simpan ke localStorage */
  function setTheme(newTheme: ThemeName) {
    theme.value = newTheme
    if (activeCozyTheme.value !== 'classic') {
      activeCozyTheme.value = 'classic'
      applyCozyThemeToDocument('classic')
    }
    applyThemeToDocument(newTheme, isDarkTheme.value)
    persistAll()

    const themeGreeting: Record<ThemeName, string> = {
      twilight: 'Suasana Twilight Purple yang syahdu~ 💜',
      sakura: 'Nuansa Pastel Berry Cotton Candy yang hangat manis! 🍓☁️',
      ocean: 'Tenangnya Ocean Night malam ini~ 🌊✨',
    }
    triggerMascotReaction('happy', themeGreeting[newTheme], 2800)
  }

  /** Sakelar Mode Gelap (🌙 Cozy Night) / Mode Terang (☀️ Daylight Pastel) universal untuk SEMUA tema */
  function toggleDarkTheme() {
    isDarkTheme.value = !isDarkTheme.value
    applyThemeToDocument(theme.value, isDarkTheme.value)
    persistAll()

    const modeSuffix = isDarkTheme.value ? 'Mode Gelap 🌙' : 'Mode Terang ☀️'
    if (activeCozyTheme.value !== 'classic') {
      const cozyMeta = COZY_THEMES.find(t => t.id === activeCozyTheme.value)
      const cozyName = cozyMeta?.name ?? 'Tema Toko'
      showMiniToast(`${isDarkTheme.value ? '🌙' : '☀️'} ${cozyName} — ${modeSuffix}`)
      return
    }

    const baseLabel: Record<ThemeName, string> = {
      twilight: 'Twilight Purple',
      sakura: 'Pastel Berry Sunset',
      ocean: 'Ocean Night',
    }
    showMiniToast(`${isDarkTheme.value ? '🌙' : '☀️'} ${baseLabel[theme.value]} — ${modeSuffix}`)
  }

  /** Perbarui isi catatan cepat & simpan otomatis */
  function updateQuickNotes(value: string) {
    quickNotes.value = value
    persistAll()
  }

  /** Cek apakah kursor tertentu sudah terbuka (bawaan selalu terbuka, kursor tema otomatis terbuka jika temanya dimiliki) */
  function isCursorUnlocked(cursorId: CursorStyleId): boolean {
    const meta = CURSOR_OPTIONS.find(c => c.id === cursorId)
    if (!meta) return false
    if (!meta.requiredTheme) return true
    if (meta.requiredTheme === 'astral-palace' && fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL) {
      return true
    }
    return ownedCozyThemes.value.includes(meta.requiredTheme)
  }

  /** Pilih kursor kustom bertema (tervalidasi kepemilikan tema & tersimpan di localStorage) */
  function setActiveCursor(cursorId: CursorStyleId): { ok: boolean; message: string } {
    const meta = CURSOR_OPTIONS.find(c => c.id === cursorId)
    if (!meta) return { ok: false, message: 'Kursor tidak ditemukan.' }

    if (!isCursorUnlocked(cursorId)) {
      const lockMsg = `🔒 Buka tema ${meta.requiredThemeName ?? 'terkait'} di Toko untuk memakai kursor ${meta.icon} ${meta.name}!`
      showMiniToast(lockMsg)
      return { ok: false, message: lockMsg }
    }

    activeCursor.value = cursorId
    isStarCursorEnabled.value = cursorId !== 'off'
    persistAll()
    playPopTing()
    const okMsg =
      cursorId === 'off'
        ? '🖱️ Kursor dikembalikan ke Default perangkat'
        : `Kursor ${meta.icon} ${meta.name} aktif! ✨`
    showMiniToast(okMsg)
    return { ok: true, message: okMsg }
  }

  /** Nyalakan atau matikan kursor kustom & simpan ke localStorage (kompatibilitas cepat) */
  function toggleStarCursor() {
    if (activeCursor.value === 'off') {
      setActiveCursor('starlight-wand')
    } else {
      setActiveCursor('off')
    }
  }

  /** Atur Kualitas Grafik (Ringan / Sedang / Tinggi), terapkan ke DOM & simpan ke localStorage */
  function setGraphicsQuality(quality: GraphicsQuality, showToast = true) {
    graphicsQuality.value = quality
    isBatterySaverMode.value = quality === 'low'
    applyGraphicsQualityToDocument(quality)
    persistAll()
    if (showToast) {
      showMiniToast(GRAPHICS_QUALITY_OPTIONS[quality].toastText)
    }
  }

  /** Berpindah berurutan antar 3 tingkatan kualitas grafik: Ringan -> Sedang -> Tinggi -> Ringan */
  function cycleGraphicsQuality() {
    const order: GraphicsQuality[] = ['low', 'medium', 'high']
    const idx = order.indexOf(graphicsQuality.value)
    const next = order[(idx + 1) % order.length] ?? 'medium'
    setGraphicsQuality(next, true)
  }

  /** Alias kompatibilitas sakelar Mode Hemat Baterai (toggle antara Ringan & Tinggi) */
  function toggleBatterySaverMode() {
    setGraphicsQuality(graphicsQuality.value === 'low' ? 'high' : 'low', true)
  }

  /** Simpan nama panggilan kustom pengguna ke localStorage */
  function setUserName(newName: string) {
    const clean = newName.trim()
    userName.value = clean || 'Teman Twilight'
    persistAll()
    triggerMascotReaction('happy', `Halo ${userName.value}! Senang menemanimu hari ini~ 💖`, 3000)
  }

  /**
   * Auto-Reset Harian Otomatis (berbasis tanggal LOKAL perangkat `getLocalTodayDate()`):
   * - Jika tanggal belum pernah disimpan (`null`), simpan tanggal lokal hari ini tanpa mereset centang.
   * - Hanya reset centang (`completed = false`) jika tanggal tersimpan benar-benar berbeda dari hari ini.
   */
  function checkAndAutoResetDaily(): boolean {
    if (!import.meta.client) return false

    const todayStr = getLocalTodayDate()
    const savedDate = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE)
    todayIndex.value = getTodayWeekdayIndex()

    // Inisialisasi pertama kali: simpan tanggal hari ini saja, jangan reset centang
    if (savedDate === null) {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr)
      return false
    }

    // Hanya lakukan auto-reset jika tanggal tersimpan benar-benar berbeda dari tanggal lokal hari ini
    if (savedDate !== todayStr) {
      // Pertahankan target 'daily' (reset centang ke false),
      // hapus target 'once' yang sudah selesai, & biarkan target 'once' yg belum selesai tetap ada
      habits.value = habits.value
        .filter(item => !(item.type === 'once' && item.completed))
        .map(item => (item.type === 'daily' ? { ...item, completed: false } : item))
      todayFocusSessions.value = 0
      todayFocusSeconds.value = 0
      dailyMood.value = null
      habitResetVersion.value += 1

      const syncedWeekly = [...weeklyProgress.value]
      syncedWeekly[todayIndex.value] = 0
      weeklyProgress.value = syncedWeekly

      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr)
      persistAll()
      runDbCrud(() =>
        $fetch('/api/habits/reset', {
          method: 'POST',
          body: { profileId: 'default' },
        }),
      )
      showMiniToast('Hari baru dimulai! Target Harian otomatis direset ✨')
      return true
    }

    return false
  }

  /**
   * Backup Data (Export JSON):
   * Mengunduh file `twilights-backup.json` berisi seluruh data pengguna dari localStorage
   */
  function exportBackupData() {
    if (!import.meta.client) return

    const backupPayload = {
      app: "Twilight's",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        userName: userName.value,
        theme: theme.value,
        isDarkTheme: isDarkTheme.value,
        habits: habits.value,
        twilights_timer_durations: customTimerDurations.value,
        twilights_ambient_mixer: ambientMixerSettings.value,
        weeklyProgress: weeklyProgress.value,
        todayFocusSessions: todayFocusSessions.value,
        totalFocusSessions: totalFocusSessions.value,
        todayFocusSeconds: todayFocusSeconds.value,
        dailyStreak: dailyStreak.value,
        streakLastDate: streakLastDate.value,
        treatCoins: treatCoins.value,
        coins: treatCoins.value,
        ownedAccessories: ownedAccessories.value,
        equippedAccessory: equippedAccessory.value,
        ownedCats: ownedCats.value,
        mainCatType: mainCatType.value,
        miniCatType: miniCatType.value,
        syncCatAccessories: syncCatAccessories.value,
        mainCatAccessory: mainCatAccessory.value,
        miniCatAccessory: miniCatAccessory.value,
        twilights_cozy_themes: {
          owned: ownedCozyThemes.value,
          active: activeCozyTheme.value,
        },
        twilights_full_goal_streak: {
          count: fullGoalStreak.value,
          lastFullDate: fullGoalStreakLastDate.value,
          lastRewardClaimedDate: fullGoalStreakRewardClaimedDate.value,
        },
        twilights_secret_cards: collectedSecretCards.value,
        unlockedCards: collectedSecretCards.value,
        affectionPoints: catAffinityXp.value,
        twilights_cat_affinity: {
          level: catAffinityLevel.value,
          xp: catAffinityXp.value,
          heartChestXp: catHeartChestXp.value,
          claimedLv10Reward: claimedLv10Reward.value,
          claimedLv20Reward: claimedLv20Reward.value,
        },
        quickNotes: quickNotes.value,
        dailyMood: dailyMood.value,
        dailyRewardClaimedDate: dailyRewardClaimedDate.value,
        twilights_notebooks: notebooks.value,
        twilights_alarms: alarms.value,
        selectedAlarmSound: selectedAlarmSound.value,
        twilights_game_highscore: gameHighScore.value,
        fishingHighScore: fishingHighScore.value,
        gameDate: gameDailyClaimDate.value || getLocalTodayDate(),
        catcherPlayCount: catcherPlayCount.value,
        fishingPlayCount: fishingPlayCount.value,
        catcherRewardCount: catcherRewardCount.value,
        fishingRewardCount: fishingRewardCount.value,
        twilights_game_daily_claims: {
          date: gameDailyClaimDate.value || getLocalTodayDate(),
          count: catcherRewardCount.value,
          playCount: catcherPlayCount.value,
          catcherPlayCount: catcherPlayCount.value,
          fishingPlayCount: fishingPlayCount.value,
          catcherRewardCount: catcherRewardCount.value,
          fishingRewardCount: fishingRewardCount.value,
          fishingHighScore: fishingHighScore.value,
        },
        isStarCursorEnabled: isStarCursorEnabled.value,
        activeCursor: activeCursor.value,
        twilights_graphics_quality: graphicsQuality.value,
        twilights_vibration_enabled: isVibrationEnabled.value,
        isBatterySaverMode: isBatterySaverMode.value,
        lastActiveDate: getTodayDateString(),
      },
    }

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'twilights-backup.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    playPopTing()
    showMiniToast('File twilights-backup.json berhasil diunduh! 💾✨')
  }

  /**
   * Restore Data (Import JSON):
   * Memulihkan seluruh data pengguna dari file backup `.json` ke state & localStorage
   */
  function importBackupData(rawJson: string): { ok: boolean; message: string } {
    try {
      const parsed = JSON.parse(rawJson) as { data?: Record<string, unknown> }
      const d = parsed?.data ?? (parsed as unknown as Record<string, unknown>)
      if (!d || typeof d !== 'object') {
        return { ok: false, message: 'Format file backup tidak valid.' }
      }

      if (typeof d.userName === 'string' && d.userName.trim()) {
        userName.value = d.userName.trim()
      }
      if (typeof d.isDarkTheme === 'boolean') {
        isDarkTheme.value = d.isDarkTheme
      }
      if (d.theme === 'twilight' || d.theme === 'sakura' || d.theme === 'ocean') {
        theme.value = d.theme
        applyThemeToDocument(d.theme, isDarkTheme.value)
      }
      if (Array.isArray(d.habits)) {
        habits.value = sortHabitsByCompletion(
          d.habits
            .filter(
              (item): item is HabitItem =>
                Boolean(item) &&
                typeof item === 'object' &&
                typeof (item as HabitItem).title === 'string',
            )
            .map((item, idx) => normalizeHabitItem(item, `restored-${Date.now()}-${idx}`)),
        )
      }
      if (Array.isArray(d.weeklyProgress) && d.weeklyProgress.length === 7) {
        weeklyProgress.value = d.weeklyProgress.map(n =>
          Math.max(0, Math.min(100, Number(n) || 0)),
        )
      }
      if (typeof d.todayFocusSessions === 'number') {
        todayFocusSessions.value = Math.max(0, d.todayFocusSessions)
      }
      if (typeof d.totalFocusSessions === 'number') {
        totalFocusSessions.value = Math.max(0, d.totalFocusSessions)
      }
      if (typeof d.todayFocusSeconds === 'number') {
        todayFocusSeconds.value = Math.max(0, Math.floor(d.todayFocusSeconds))
      }
      if (typeof d.dailyStreak === 'number') {
        dailyStreak.value = Math.max(0, d.dailyStreak)
      }
      if (typeof d.streakLastDate === 'string') {
        streakLastDate.value = d.streakLastDate
      }
      if (typeof d.treatCoins === 'number') {
        treatCoins.value = Math.max(0, d.treatCoins)
      }
      // Pulihkan Level, Poin, Peti Cinta & Flag Milestone Kasih Sayang Kucing
      const importedAffinity = d.twilights_cat_affinity ?? d.catAffinity
      if (importedAffinity && typeof importedAffinity === 'object') {
        const cleanAffinity = sanitizeCatAffinity(importedAffinity)
        catAffinityLevel.value = cleanAffinity.level
        catAffinityXp.value = cleanAffinity.xp
        catHeartChestXp.value = cleanAffinity.heartChestXp
        claimedLv10Reward.value = cleanAffinity.claimedLv10Reward
        claimedLv20Reward.value = cleanAffinity.claimedLv20Reward
      }
      if (Array.isArray(d.ownedAccessories)) {
        ownedAccessories.value = sanitizeOwnedAccessories(d.ownedAccessories)
      }
      if (isValidAccessoryId(d.equippedAccessory)) {
        equippedAccessory.value = d.equippedAccessory
      }
      if (Array.isArray(d.ownedCats)) {
        ownedCats.value = sanitizeOwnedCats(d.ownedCats)
      }
      if (isValidCatBreedId(d.mainCatType) && ownedCats.value.includes(d.mainCatType)) {
        mainCatType.value = d.mainCatType
      }
      if (isValidCatBreedId(d.miniCatType) && ownedCats.value.includes(d.miniCatType)) {
        miniCatType.value = d.miniCatType
      }
      if (typeof d.syncCatAccessories === 'boolean') {
        syncCatAccessories.value = d.syncCatAccessories
      }
      if (isValidAccessoryId(d.mainCatAccessory)) {
        mainCatAccessory.value = d.mainCatAccessory
        equippedAccessory.value = d.mainCatAccessory
      } else if (isValidAccessoryId(d.equippedAccessory)) {
        mainCatAccessory.value = d.equippedAccessory
      }
      if (isValidAccessoryId(d.miniCatAccessory)) {
        miniCatAccessory.value = syncCatAccessories.value ? mainCatAccessory.value : d.miniCatAccessory
      } else if (isValidAccessoryId(d.equippedAccessory)) {
        miniCatAccessory.value = d.equippedAccessory
      }
      // Pulihkan Tema Latar Belakang Beranimasi (Cozy Themes) & 7-Day Full Goal Streak
      const importedCozy = (d.twilights_cozy_themes ?? d.cozyThemes) as Partial<CozyThemeRecord> | undefined
      if (importedCozy && typeof importedCozy === 'object') {
        ownedCozyThemes.value = sanitizeOwnedCozyThemes(importedCozy.owned)
        if (
          isValidCozyThemeId(importedCozy.active) &&
          ownedCozyThemes.value.includes(importedCozy.active)
        ) {
          activeCozyTheme.value = importedCozy.active
          applyCozyThemeToDocument(importedCozy.active)
        } else {
          activeCozyTheme.value = 'classic'
          applyCozyThemeToDocument('classic')
        }
      }
      const importedFullStreak = (d.twilights_full_goal_streak ?? d.fullGoalStreakData) as
        | Partial<FullGoalStreakRecord>
        | undefined
      if (importedFullStreak && typeof importedFullStreak === 'object') {
        fullGoalStreak.value = Math.max(0, Math.floor(Number(importedFullStreak.count) || 0))
        fullGoalStreakLastDate.value =
          typeof importedFullStreak.lastFullDate === 'string' ? importedFullStreak.lastFullDate : ''
        fullGoalStreakRewardClaimedDate.value =
          typeof importedFullStreak.lastRewardClaimedDate === 'string'
            ? importedFullStreak.lastRewardClaimedDate
            : ''
        if (
          fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL &&
          !ownedCozyThemes.value.includes('astral-palace')
        ) {
          ownedCozyThemes.value = [...ownedCozyThemes.value, 'astral-palace']
        }
      }
      // Pulihkan koleksi kartu Gacha "💌 Pesan Rahasia Kucing"
      const importedSecretCards =
        d.twilights_secret_cards ?? d.unlockedCards ?? d.collectedSecretCards
      if (Array.isArray(importedSecretCards)) {
        collectedSecretCards.value = sanitizeCollectedSecretCards(importedSecretCards)
      }
      if (typeof d.quickNotes === 'string') {
        quickNotes.value = d.quickNotes
      }
      if (
        d.dailyMood === null ||
        d.dailyMood === 'happy' ||
        d.dailyMood === 'calm' ||
        d.dailyMood === 'sleepy' ||
        d.dailyMood === 'motivated' ||
        d.dailyMood === 'tired'
      ) {
        dailyMood.value = d.dailyMood
      }
      if (typeof d.dailyRewardClaimedDate === 'string') {
        dailyRewardClaimedDate.value = d.dailyRewardClaimedDate
      }
      // Pulihkan Kawaii Notebook (twilights_notebooks)
      const importedNotebooks = d.twilights_notebooks ?? d.notebooks
      if (Array.isArray(importedNotebooks)) {
        notebooks.value = importedNotebooks
          .filter((item): item is NotebookEntry => Boolean(item) && typeof item === 'object')
          .map((item, idx) => ({
            id: typeof item.id === 'string' ? item.id : `note-restored-${Date.now()}-${idx}`,
            title: typeof item.title === 'string' ? item.title : 'Catatan Tanpa Judul',
            content: typeof item.content === 'string' ? item.content : '',
            tag:
              item.tag === 'study' ||
              item.tag === 'idea' ||
              item.tag === 'journal' ||
              item.tag === 'general'
                ? item.tag
                : 'general',
            paperTheme:
              item.paperTheme === 'lavender-lined' ||
              item.paperTheme === 'sakura-grid' ||
              item.paperTheme === 'starry-night' ||
              item.paperTheme === 'cream-dotted'
                ? item.paperTheme
                : 'lavender-lined',
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
            updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
          }))
      }
      // Pulihkan Kawaii Alarm (twilights_alarms)
      const importedAlarms = d.twilights_alarms ?? d.alarms
      if (Array.isArray(importedAlarms)) {
        const nowMs = Date.now()
        alarms.value = importedAlarms
          .filter(
            (item): item is KawaiiAlarmItem =>
              Boolean(item) &&
              typeof item === 'object' &&
              typeof (item as KawaiiAlarmItem).targetTimestamp === 'number' &&
              (item as KawaiiAlarmItem).targetTimestamp > nowMs,
          )
          .map((item, idx) => ({
            id: typeof item.id === 'string' ? item.id : `alarm-restored-${Date.now()}-${idx}`,
            mode: item.mode === 'clock' ? 'clock' : 'countdown',
            label: typeof item.label === 'string' ? item.label : 'Pengingat Twilight\'s ⏰',
            targetTimestamp: item.targetTimestamp,
            clockTime: typeof item.clockTime === 'string' ? item.clockTime : undefined,
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          }))
      }
      if (
        d.selectedAlarmSound === 'music-box' ||
        d.selectedAlarmSound === 'morning-chime' ||
        d.selectedAlarmSound === 'cute-beep'
      ) {
        selectedAlarmSound.value = d.selectedAlarmSound
      }
      const importedHighScore = d.twilights_game_highscore ?? d.gameHighScore
      if (typeof importedHighScore === 'number') {
        gameHighScore.value = Math.max(0, Math.round(importedHighScore))
      }
      if (typeof d.fishingHighScore === 'number') {
        fishingHighScore.value = Math.max(0, Math.round(d.fishingHighScore))
      }
      const importedGameDaily = (d.twilights_game_daily_claims ?? d.gameDailyClaims) as
        | Partial<GameDailyClaimRecord>
        | undefined
      const importedGameDate =
        (typeof d.gameDate === 'string' && d.gameDate) || importedGameDaily?.date || ''
      if (importedGameDate || importedGameDaily) {
        const localToday = getLocalTodayDate()
        if (typeof importedGameDaily?.fishingHighScore === 'number') {
          fishingHighScore.value = Math.max(0, Math.round(importedGameDaily.fishingHighScore))
        }
        if (importedGameDate === localToday) {
          gameDailyClaimDate.value = localToday
          catcherRewardCount.value = Math.max(
            0,
            Math.min(
              MAX_GAME_DAILY_REWARDS,
              Math.floor(Number(d.catcherRewardCount ?? importedGameDaily?.catcherRewardCount ?? importedGameDaily?.count) || 0),
            ),
          )
          catcherPlayCount.value = Math.max(
            0,
            Math.min(
              MAX_GAME_DAILY_PLAYS,
              Math.floor(Number(d.catcherPlayCount ?? importedGameDaily?.catcherPlayCount ?? importedGameDaily?.playCount) || 0),
            ),
          )
          fishingRewardCount.value = Math.max(
            0,
            Math.min(
              MAX_GAME_DAILY_REWARDS,
              Math.floor(Number(d.fishingRewardCount ?? importedGameDaily?.fishingRewardCount) || 0),
            ),
          )
          fishingPlayCount.value = Math.max(
            0,
            Math.min(
              MAX_GAME_DAILY_PLAYS,
              Math.floor(Number(d.fishingPlayCount ?? importedGameDaily?.fishingPlayCount) || 0),
            ),
          )
          gameDailyClaimCount.value = catcherRewardCount.value
          gameDailyPlayCount.value = catcherPlayCount.value
        } else {
          gameDailyClaimDate.value = localToday
          catcherRewardCount.value = 0
          catcherPlayCount.value = 0
          fishingRewardCount.value = 0
          fishingPlayCount.value = 0
          gameDailyClaimCount.value = 0
          gameDailyPlayCount.value = 0
        }
      }
      // Pulihkan durasi kustom Timer Utama (Fokus / Istirahat Singkat / Istirahat Panjang)
      const importedTimerDurations =
        d.twilights_timer_durations ?? d.customTimerDurations ?? d.timerDurations
      if (importedTimerDurations && typeof importedTimerDurations === 'object') {
        customTimerDurations.value = sanitizeTimerDurations(importedTimerDurations)
        timerDurationsVersion.value += 1
      }
      // Pulihkan pengaturan 5 saluran Ambient Sound Mixer (ON/OFF + volume %)
      const importedAmbientMixer = d.twilights_ambient_mixer ?? d.ambientMixerSettings
      if (importedAmbientMixer && typeof importedAmbientMixer === 'object') {
        ambientMixerSettings.value = sanitizeAmbientMixerSettings(importedAmbientMixer)
        isRainAmbientOn.value = ambientMixerSettings.value.rain.enabled
        ambientMixerVersion.value += 1
      }
      if (typeof d.twilights_vibration_enabled === 'boolean') {
        isVibrationEnabled.value = d.twilights_vibration_enabled
      }
      if (typeof d.isStarCursorEnabled === 'boolean') {
        isStarCursorEnabled.value = d.isStarCursorEnabled
      }
      if (isValidCursorId(d.activeCursor)) {
        activeCursor.value = isCursorUnlocked(d.activeCursor) ? d.activeCursor : 'starlight-wand'
        isStarCursorEnabled.value = activeCursor.value !== 'off'
      } else if (typeof d.isStarCursorEnabled === 'boolean') {
        activeCursor.value = d.isStarCursorEnabled ? 'starlight-wand' : 'off'
      }
      const importedGraphics = d.twilights_graphics_quality ?? d.graphicsQuality
      if (isValidGraphicsQuality(importedGraphics)) {
        graphicsQuality.value = importedGraphics
        isBatterySaverMode.value = importedGraphics === 'low'
        applyGraphicsQualityToDocument(importedGraphics)
      } else if (typeof d.isBatterySaverMode === 'boolean') {
        isBatterySaverMode.value = d.isBatterySaverMode
        graphicsQuality.value = d.isBatterySaverMode ? 'low' : 'high'
        applyGraphicsQualityToDocument(graphicsQuality.value)
      }

      habitResetVersion.value += 1
      grantPendingCatAffinityMilestones(false)
      checkAndUnlockNeonCity(false)
      syncTodayProgress()
      void pushStateToCloud(true)
      playVictoryMelody()
      showMiniToast('Semua data berhasil dipulihkan dari backup! 📂✨')
      return { ok: true, message: 'Data berhasil dipulihkan!' }
    } catch {
      showMiniToast('Gagal membaca file JSON backup. Pastikan file valid ya~')
      return { ok: false, message: 'File JSON rusak atau format tidak sesuai.' }
    }
  }

  /**
   * Nyalakan atau matikan Starlight Focus ✨ (spotlight fokus & mengunci mini-game sementara).
   * Jika modal Break Game sedang terbuka saat diaktifkan, otomatis tutup modal tersebut.
   */
  function toggleZenMode() {
    isZenMode.value = !isZenMode.value
    if (isZenMode.value) {
      isMiniGameOpen.value = false
      triggerMascotReaction(
        'focus',
        'Starlight Focus ✨ aktif! Fokus penuh tanpa distraksi~ 🌙',
        3000,
      )
    }
  }

  /** Matikan Starlight Focus ✨ (misalnya otomatis saat timer Pomodoro selesai) */
  function exitZenMode() {
    isZenMode.value = false
  }

  /** Catat Mood Check-in Harian dan simpan otomatis per hari di localStorage */
  function setDailyMood(moodId: DailyMoodId) {
    dailyMood.value = moodId
    persistAll()
    const found = DAILY_MOOD_OPTIONS.find(m => m.id === moodId)
    if (found) {
      triggerMascotReaction('happy', found.mascotReply, 3200)
    }
  }

  /**
   * Cek apakah seluruh aksesoris toko (10 item) & seluruh tema latar belakang lainnya (9 item)
   * sudah dimiliki/terbuka. Jika ya, buka otomatis Tema Rahasia Ultimate 🌃 Neon Night City!
   */
  function checkAndUnlockNeonCity(showCelebration = true): boolean {
    if (ownedCozyThemes.value.includes('neon-night-city')) return false
    if (!neonCityCollectionProgress.value.isComplete) return false

    ownedCozyThemes.value = [...ownedCozyThemes.value, 'neon-night-city']
    if (showCelebration) {
      const unlockMsg =
        '🌃 ULTIMATE UNLOCK! Koleksi 100% Toko tercapai — Tema Neon Night City & Kursor ⚡ Cyber Neon Bolt terbuka! ✨'
      celebrationCount.value += 1
      playVictoryMelody()
      showDailyRewardCard(unlockMsg)
      showMiniToast(unlockMsg)
      triggerMascotReaction('celebrate', unlockMsg, 6800)
    }
    return true
  }

  /**
   * Berikan hadiah Milestone Kasih Sayang Kucing Lv. 10 & Lv. 20 MAX (anti-klaim ganda via flag):
   * - Lv. 10 (Sahabat Sejati): +20 🐟 + aksesori eksklusif 💖 Kalung Hati Bintang + bonus pasif +1 🐟/sesi
   * - Lv. 20 (MAX ✨): +40 🐟 + aksesori legendaris ✨ Sayap Malaikat + gelar 👑 Soulmate MAX + bonus pasif +2 🐟/sesi + Peti Cinta
   */
  function grantPendingCatAffinityMilestones(showCelebration = true): string[] {
    const messages: string[] = []

    if (catAffinityLevel.value >= CAT_AFFINITY_MILESTONE_LV10 && !claimedLv10Reward.value) {
      claimedLv10Reward.value = true
      treatCoins.value += CAT_AFFINITY_LV10_MILESTONE_FISH
      if (!ownedAccessories.value.includes('soulmate-collar')) {
        ownedAccessories.value = [...ownedAccessories.value, 'soulmate-collar']
      }
      messages.push(
        '💖 Milestone Lv. 10 Sahabat Sejati! Hadiah +20 🐟, aksesoris 💖 Kalung Hati Bintang terbuka, & bonus pasif +1 🐟/sesi fokus!',
      )
    }

    if (catAffinityLevel.value >= CAT_AFFINITY_MAX_LEVEL && !claimedLv20Reward.value) {
      claimedLv20Reward.value = true
      treatCoins.value += CAT_AFFINITY_LV20_MILESTONE_FISH
      if (!ownedAccessories.value.includes('angel-wings')) {
        ownedAccessories.value = [...ownedAccessories.value, 'angel-wings']
      }
      messages.push(
        '👑 MILESTONE Lv. 20 MAX ✨! Hadiah 2x: +40 🐟, ✨ Sayap Malaikat, gelar 👑 Soulmate MAX, bonus pasif +2 🐟/sesi & 💖 Peti Cinta terbuka!',
      )
    }

    if (messages.length > 0 && showCelebration) {
      const topMsg = messages[messages.length - 1]!
      catAffinityLevelUpMessage.value = topMsg
      if (catAffinityToastTimer) clearTimeout(catAffinityToastTimer)
      catAffinityToastTimer = setTimeout(() => {
        catAffinityLevelUpMessage.value = ''
      }, 6500)

      celebrationCount.value += 1
      playVictoryMelody()
      showDailyRewardCard(topMsg)
      showMiniToast(topMsg)
      triggerMascotReaction('celebrate', topMsg, 6500)
    }

    return messages
  }

  /**
   * Sakelar Mode Aksesoris 2 Kucing:
   * - ON (`🔗 2 Kucing Sinkron`): aksesoris Kucing Utama & Kucing Pendamping selalu serentak.
   * - OFF (`✂️ Aksesoris Terpisah`): pengguna bebas memasang aksesoris berbeda pada masing-masing kucing!
   */
  function toggleSyncCatAccessories() {
    syncCatAccessories.value = !syncCatAccessories.value
    if (syncCatAccessories.value) {
      miniCatAccessory.value = mainCatAccessory.value
      equippedAccessory.value = mainCatAccessory.value
    }
    persistAll()
    playPopTing()
    showMiniToast(
      syncCatAccessories.value
        ? '🔗 Mode 2 Kucing Sinkron aktif — aksesoris otomatis kembar!'
        : '✂️ Mode Aksesoris Terpisah aktif — atur gaya Kucing Utama & Pendamping sesukamu!',
    )
  }

  /**
   * Sistem Koin Hadiah & Aksesoris Maskot (mendukung Mode Sinkron & Mode Terpisah):
   * - Jika aksesoris sudah dimiliki: pasang / lepas langsung ke target (keduanya, utama, atau pendamping).
   * - Jika aksesoris eksklusif Milestone (cost === null): tampilkan syarat levelnya.
   * - Jika belum dimiliki dan koin cukup: tukar koin 🐟 lalu pasang langsung!
   */
  function buyOrEquipAccessory(
    accessoryId: MascotAccessoryId,
    target?: CatTargetSlot,
  ): { ok: boolean; message: string } {
    const effectiveTarget: CatTargetSlot = syncCatAccessories.value
      ? 'both'
      : target ?? 'main'

    const applyAccessoryToSlot = (nextId: MascotAccessoryId) => {
      if (effectiveTarget === 'both') {
        mainCatAccessory.value = nextId
        miniCatAccessory.value = nextId
        equippedAccessory.value = nextId
      } else if (effectiveTarget === 'mini') {
        miniCatAccessory.value = nextId
      } else {
        mainCatAccessory.value = nextId
        equippedAccessory.value = nextId
      }
    }

    const currentForTarget =
      effectiveTarget === 'mini' ? miniCatAccessory.value : mainCatAccessory.value

    if (accessoryId === 'none') {
      applyAccessoryToSlot('none')
      persistAll()
      const label =
        effectiveTarget === 'mini'
          ? 'Aksesoris Kucing Pendamping dilepas~'
          : effectiveTarget === 'main'
            ? 'Aksesoris Kucing Utama dilepas~'
            : 'Aksesoris kedua kucing dilepas~'
      return { ok: true, message: label }
    }

    const item = MASCOT_ACCESSORIES.find(a => a.id === accessoryId)
    if (!item) return { ok: false, message: 'Aksesoris tidak ditemukan.' }

    const isUnlockedByMilestone =
      (item.milestoneLevel === 10 && catAffinityLevel.value >= CAT_AFFINITY_MILESTONE_LV10) ||
      (item.milestoneLevel === 20 && catAffinityLevel.value >= CAT_AFFINITY_MAX_LEVEL)

    // Jika sudah dimiliki (atau sudah memenuhi milestone), cukup pasang atau lepas pada target aktif
    if (ownedAccessories.value.includes(accessoryId) || isUnlockedByMilestone) {
      if (!ownedAccessories.value.includes(accessoryId)) {
        ownedAccessories.value = [...ownedAccessories.value, accessoryId]
      }
      const nextEquipped = currentForTarget === accessoryId ? 'none' : accessoryId
      applyAccessoryToSlot(nextEquipped)
      persistAll()
      if (nextEquipped !== 'none') {
        playPopTing()
        triggerMascotReaction('happy', `Yay! Aku pakai ${item.name} ${item.icon}`, 2800)
      }
      const slotNote =
        effectiveTarget === 'mini'
          ? ' (Pendamping)'
          : effectiveTarget === 'main'
            ? ' (Utama)'
            : ''
      return {
        ok: true,
        message:
          nextEquipped === 'none'
            ? `${item.name}${slotNote} dilepas`
            : `${item.name}${slotNote} dipasang!`,
      }
    }

    // Item eksklusif milestone Kasih Sayang (tidak dibeli dengan koin)
    if (item.cost === null) {
      const reqLv = item.milestoneLevel ?? 10
      return {
        ok: false,
        message: `🔒 Eksklusif Milestone Kasih Sayang Lv. ${reqLv}${reqLv === 20 ? ' MAX' : ''} (Saat ini Lv. ${catAffinityLevel.value})`,
      }
    }

    // Jika belum dimiliki, cek apakah koin 🐟 cukup
    if (treatCoins.value < item.cost) {
      return {
        ok: false,
        message: `Butuh ${item.cost} 🐟 (kurang ${item.cost - treatCoins.value} 🐟 lagi!)`,
      }
    }

    // Tukar koin dan langsung pasang aksesoris!
    treatCoins.value -= item.cost
    ownedAccessories.value = [...ownedAccessories.value, accessoryId]
    applyAccessoryToSlot(accessoryId)
    const unlockedNeon = checkAndUnlockNeonCity(true)
    persistAll()

    if (!unlockedNeon) {
      playVictoryMelody()
      triggerMascotReaction('celebrate', `Makasih! ${item.name} ini lucu banget! ${item.icon}✨`, 3800)
      showMiniToast(`Berhasil menukar ${item.name} ${item.icon}!`)
    }
    return { ok: true, message: `${item.name} berhasil dibuka & dipakai!` }
  }

  /**
   * Toko Koleksi Kucing (7 Ras/Warna Kucing):
   * - Beli ras kucing baru dengan Koin Ikan 🐟, lalu pasang ke Kucing Utama, Pendamping, atau Keduanya.
   */
  function buyOrEquipCatBreed(
    breedId: CatBreedId,
    target: CatTargetSlot = 'both',
  ): { ok: boolean; message: string } {
    const item = CAT_BREEDS.find(c => c.id === breedId)
    if (!item) return { ok: false, message: 'Jenis kucing tidak ditemukan.' }

    const applyBreed = () => {
      if (target === 'main') {
        mainCatType.value = breedId
      } else if (target === 'mini') {
        miniCatType.value = breedId
      } else {
        mainCatType.value = breedId
        miniCatType.value = breedId
      }
    }

    const slotLabel =
      target === 'main'
        ? 'Kucing Utama'
        : target === 'mini'
          ? 'Kucing Pendamping'
          : 'Kedua Kucing'

    if (ownedCats.value.includes(breedId) || item.cost === 0) {
      if (!ownedCats.value.includes(breedId)) {
        ownedCats.value = [...ownedCats.value, breedId]
      }
      applyBreed()
      persistAll()
      playPopTing()
      triggerMascotReaction('happy', `Meow~ ${item.name} siap menemani fokusmu! 🐱✨`, 3000)
      return { ok: true, message: `${item.name} dipasang ke ${slotLabel}!` }
    }

    if (treatCoins.value < item.cost) {
      return {
        ok: false,
        message: `Butuh ${item.cost} 🐟 (kurang ${item.cost - treatCoins.value} 🐟 lagi!)`,
      }
    }

    treatCoins.value -= item.cost
    ownedCats.value = [...ownedCats.value, breedId]
    applyBreed()
    persistAll()
    playVictoryMelody()
    triggerMascotReaction('celebrate', `Yeay! ${item.name} resmi bergabung di sudut fokusmu! 🐱💖`, 4000)
    showMiniToast(`🐱 ${item.name} (${item.subtitle}) berhasil diadopsi & dipasang!`)
    return { ok: true, message: `${item.name} berhasil dibeli & dipasang ke ${slotLabel}!` }
  }

  /**
   * Toko Tema Latar Belakang Beranimasi (11 Cozy Themes):
   * - Twilight Klasik selalu terbuka (default).
   * - 8 tema berbayar koin 🐟: beli lalu langsung dipakai.
   * - Astral Crystal Palace: hadiah 7-Day Full Goal Streak.
   * - Neon Night City: Ultimate Completion Reward (koleksi 100% aksesoris toko & tema lainnya).
   */
  function buyOrEquipCozyTheme(cozyId: CozyThemeId): { ok: boolean; message: string } {
    const item = COZY_THEMES.find(t => t.id === cozyId)
    if (!item) return { ok: false, message: 'Tema latar tidak ditemukan.' }

    const isUnlocked =
      ownedCozyThemes.value.includes(cozyId) ||
      (cozyId === 'astral-palace' && fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL) ||
      (cozyId === 'neon-night-city' && neonCityCollectionProgress.value.isComplete)

    if (cozyId === 'astral-palace' && !isUnlocked) {
      const progress = Math.min(fullGoalStreak.value, ASTRAL_PALACE_STREAK_GOAL)
      return {
        ok: false,
        message: `🔒 Selesaikan semua goal 7 hari penuh (Progres: ${progress}/${ASTRAL_PALACE_STREAK_GOAL} hari)`,
      }
    }

    if (cozyId === 'neon-night-city' && !isUnlocked) {
      const prog = neonCityCollectionProgress.value
      return {
        ok: false,
        message: `🔒 Koleksi 100% Toko (${prog.current}/${prog.total} Koleksi) untuk membuka Neon Night City!`,
      }
    }

    const themeReactions: Record<CozyThemeId, string> = {
      classic: 'Kembali ke suasana Twilight Klasik yang hangat~ 💜✨',
      'midnight-rain': 'Rintik hujan malam & lampu kota blur bikin fokus makin tenang~ 🌧️✨',
      'autumn-cafe': 'Aroma kopi & daun gugur musim gugur yang cozy banget~ 🍂☕',
      'matcha-garden': 'Taman hijau matcha yang sejuk & menenangkan pikiran~ 🍵🍃',
      'sakura-lantern': 'Indahnya kelopak sakura & lentera malam berkilau~ 🌸🏮',
      'biolum-ocean': 'Gelembung cahaya cyan di lautan malam yang magis~ 🌊✨',
      'honey-library': 'Hangatnya perpustakaan madu & debu emas berkilau~ 🍯📖',
      'pastel-cloudland': 'Melayang di langit awan pastel berbintang lembut~ ☁️✨',
      'winter-frost': 'Salju lembut musim dingin yang damai untuk fokus~ ❄️✨',
      'astral-palace': 'Megahnya Aurora Borealis di Istana Kristal Astral! 👑✨',
      'neon-night-city':
        '🎉 Selamat Kolektor Sejati! Neon Night City aktif — cocok banget sambil putar radio 🌃 Nightride / Synthwave! ✨',
    }

    if (isUnlocked) {
      if (!ownedCozyThemes.value.includes(cozyId)) {
        ownedCozyThemes.value = [...ownedCozyThemes.value, cozyId]
      }
      activeCozyTheme.value = cozyId
      applyCozyThemeToDocument(cozyId)
      persistAll()

      if (cozyId === 'neon-night-city') {
        playVictoryMelody()
        showMiniToast(
          '🎉 Selamat! Tema 🌃 Neon Night City aktif — coba putar stasiun 🌃 Nightride / Synthwave di BGM Player! 🎧✨',
        )
        triggerMascotReaction('celebrate', themeReactions[cozyId], 5200)
        return {
          ok: true,
          message: '🌃 Neon Night City aktif! Coba putar radio 🌃 Nightride / Synthwave~',
        }
      }

      playPopTing()
      triggerMascotReaction('happy', themeReactions[cozyId], 3200)
      return { ok: true, message: `Tema ${item.name} ${item.icon} dipasang!` }
    }

    const cost = item.cost ?? 0
    if (treatCoins.value < cost) {
      return {
        ok: false,
        message: `Butuh ${cost} 🐟 (kurang ${cost - treatCoins.value} 🐟 lagi!)`,
      }
    }

    treatCoins.value -= cost
    ownedCozyThemes.value = [...ownedCozyThemes.value, cozyId]
    activeCozyTheme.value = cozyId
    applyCozyThemeToDocument(cozyId)
    const unlockedNeon = checkAndUnlockNeonCity(true)
    persistAll()

    if (!unlockedNeon) {
      const unlockedCursor = getCursorOptionByTheme(cozyId)
      const cursorNote = unlockedCursor
        ? ` Kursor ${unlockedCursor.icon} ${unlockedCursor.name} juga terbuka di menu ✦ Kursor!`
        : ''
      playVictoryMelody()
      triggerMascotReaction('celebrate', themeReactions[cozyId], 4200)
      showMiniToast(`Tema ${item.name} ${item.icon} dibeli & dipakai!${cursorNote} ✨`)
    }
    return { ok: true, message: `${item.name} berhasil dibeli & dipakai!` }
  }

  /**
   * Hadiah Kartu Random Otomatis Saat Bar Kasih Sayang Penuh (Naik Level atau Peti Cinta Penuh):
   * - Memprioritaskan kartu yang belum terbuka dari koleksi 36 kartu.
   * - Jika seluruh 36/36 kartu sudah terbuka, berikan kartu acak + bonus +5 Koin Ikan!
   * - Otomatis membuka pop-up animasi kartu hadiah & menyimpannya ke localStorage + Firestore.
   */
  function triggerAffinityRewardCardDrop(): SecretCardDrawResult {
    const uncollected = SECRET_CAT_CARDS.filter(
      card => !collectedSecretCards.value.includes(card.id),
    )

    let droppedCard: SecretCatCard
    let isNew = false
    let bonusFish = 0

    if (uncollected.length > 0) {
      droppedCard =
        uncollected[Math.floor(Math.random() * uncollected.length)] ?? SECRET_CAT_CARDS[0]!
      collectedSecretCards.value = [...collectedSecretCards.value, droppedCard.id]
      isNew = true
    } else {
      droppedCard =
        SECRET_CAT_CARDS[Math.floor(Math.random() * SECRET_CAT_CARDS.length)] ??
        SECRET_CAT_CARDS[0]!
      isNew = false
      bonusFish = AFFINITY_DROP_DUPLICATE_FISH_BONUS
      treatCoins.value += bonusFish
    }

    const result: SecretCardDrawResult = {
      card: droppedCard,
      isNew,
      bonusAffinity: 0,
      bonusFish,
      source: 'affinity-drop',
      drawId: Date.now() + Math.floor(Math.random() * 1000),
    }

    lastDrawnCardResult.value = result
    secretCardModalMode.value = 'gacha'
    isSecretCardModalOpen.value = true
    persistAll()
    return result
  }

  /**
   * Gacha Kartu "💌 Pesan Rahasia Kucing" (Biaya: 2 🐟):
   * - Selama koleksi < 36/36: prioritaskan mengacak kartu yang belum dikoleksi (label ✨ BARU!).
   * - Jika seluruh 36/36 kartu sudah terkoleksi: acak dari 36 kartu & beri bonus +1 💖 Kasih Sayang Kucing.
   */
  function drawSecretCatCard(): { ok: boolean; message: string; result?: SecretCardDrawResult } {
    if (treatCoins.value < SECRET_CARD_GACHA_COST) {
      const msg = 'Koin ikan belum cukup, yuk fokus lagi~ 🐟'
      showMiniToast(msg)
      return { ok: false, message: msg }
    }

    treatCoins.value -= SECRET_CARD_GACHA_COST
    // Sentuhan mikro (haptic feedback ringan 25ms) saat membuka kartu gacha di HP
    triggerVibration(VIBRATION_PATTERNS.microHaptic)

    const uncollected = SECRET_CAT_CARDS.filter(
      card => !collectedSecretCards.value.includes(card.id),
    )

    let drawnCard: SecretCatCard
    let isNew = false
    let bonusAffinity = 0

    if (uncollected.length > 0) {
      drawnCard =
        uncollected[Math.floor(Math.random() * uncollected.length)] ?? SECRET_CAT_CARDS[0]!
      collectedSecretCards.value = [...collectedSecretCards.value, drawnCard.id]
      isNew = true
      playVictoryMelody()
      const totalNow = collectedSecretCards.value.length
      if (totalNow >= SECRET_CAT_CARDS.length) {
        triggerMascotReaction(
          'celebrate',
          `Yeay! Semua ${SECRET_CAT_CARDS.length}/${SECRET_CAT_CARDS.length} Kartu Rahasia Kucing berhasil kamu koleksi! 💌✨`,
          4600,
        )
      } else {
        triggerMascotReaction(
          'happy',
          `Kartu baru #${String(drawnCard.number).padStart(2, '0')} "${drawnCard.name}" ditemukan! 💌✨`,
          3400,
        )
      }
    } else {
      drawnCard =
        SECRET_CAT_CARDS[Math.floor(Math.random() * SECRET_CAT_CARDS.length)] ??
        SECRET_CAT_CARDS[0]!
      isNew = false
      bonusAffinity = 1
      addCatAffinityXp(1, 'gacha')
      playPopTing()
      triggerMascotReaction(
        'happy',
        `Kartu #${String(drawnCard.number).padStart(2, '0')} duplikat — bonus +1 💖 Kasih Sayang!`,
        3000,
      )
    }

    const result: SecretCardDrawResult = {
      card: drawnCard,
      isNew,
      bonusAffinity,
      source: 'gacha',
      drawId: Date.now() + Math.floor(Math.random() * 1000),
    }

    lastDrawnCardResult.value = result
    persistAll()

    return {
      ok: true,
      message: isNew
        ? `✨ BARU! Kartu #${String(drawnCard.number).padStart(2, '0')} terkoleksi!`
        : '♻️ Duplikat (+1 💖 Kasih Sayang Kucing)',
      result,
    }
  }

  /** Buka modal Gacha dan langsung tarik 1 Kartu Rahasia Kucing (2 🐟) */
  function openSecretCardGacha(): boolean {
    const draw = drawSecretCatCard()
    if (!draw.ok) return false
    secretCardModalMode.value = 'gacha'
    isSecretCardModalOpen.value = true
    return true
  }

  /** Buka modal Album Koleksi Kartu (X/18) */
  function openSecretCardAlbum() {
    secretCardModalMode.value = 'album'
    isSecretCardModalOpen.value = true
  }

  /**
   * Beri makan ikan (🐟 5) ke teman kucing mengambang di layar
   */
  function feedPetCat(cost = 5): { ok: boolean; message: string } {
    if (treatCoins.value < cost) {
      return {
        ok: false,
        message: `Butuh ${cost} 🐟 (koinmu ${treatCoins.value} 🐟)`,
      }
    }

    treatCoins.value -= cost
    persistAll()
    playPopTing()
    showMiniToast(`Nyam nyam~ Teman kucing senang sekali! (-${cost} 🐟) 💖`)
    return { ok: true, message: 'Nyam nyam~ Makasih ikannya! 💖' }
  }

  /** Memuat seluruh data tersimpan dari localStorage saat halaman siap di browser */
  function loadFromStorage() {
    if (!import.meta.client || isHydrated.value) return

    todayIndex.value = getTodayWeekdayIndex()
    const todayStr = getLocalTodayDate()
    const yesterdayStr = getLocalTodayDate(-1)

    try {
      // 1. Muat tema warna & status Mode Gelap (Normal / Midnight)
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeName | null
      if (savedTheme === 'twilight' || savedTheme === 'sakura' || savedTheme === 'ocean') {
        theme.value = savedTheme
      }
      const savedDark = localStorage.getItem(STORAGE_KEYS.DARK_THEME)
      if (savedDark === 'true' || savedDark === 'false') {
        isDarkTheme.value = savedDark === 'true'
      }
      applyThemeToDocument(theme.value, isDarkTheme.value)

      // 2. Muat tanggal terakhir & daftar habit (cek === null vs array kosong [])
      const rawCurrentDate = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE)
      const rawLegacyDate = localStorage.getItem(LEGACY_STORAGE_KEYS.LAST_ACTIVE_DATE)
      const savedDate = rawCurrentDate !== null ? rawCurrentDate : rawLegacyDate

      const rawCurrentHabits = localStorage.getItem(STORAGE_KEYS.HABITS)
      const rawLegacyHabits = localStorage.getItem(LEGACY_STORAGE_KEYS.HABITS)
      const effectiveRawHabits = rawCurrentHabits !== null ? rawCurrentHabits : rawLegacyHabits

      if (effectiveRawHabits === null) {
        // Pengguna baru (localStorage masih kosong): mulai bersih dengan daftar habit kosong []
        hadLocalHabits.value = false
        habits.value = []
      } else {
        // Key sudah pernah disimpan (meskipun isinya "[]" karena semua target dihapus)
        // -> JANGAN isi ulang 4 contoh habit default!
        hadLocalHabits.value = true
        try {
          const parsedHabits = JSON.parse(effectiveRawHabits)
          habits.value = Array.isArray(parsedHabits)
            ? sortHabitsByCompletion(
                parsedHabits
                  .filter((item): item is Partial<HabitItem> => Boolean(item) && typeof item === 'object')
                  .map((item, idx) => normalizeHabitItem(item, `habit-local-${idx}`)),
              )
                // Bersihkan target 'once' yang mungkin sempat selesai tepat sebelum halaman di-refresh
                .filter(item => !(item.type === 'once' && item.completed))
            : []
        } catch {
          habits.value = []
        }
        if (rawCurrentHabits === null) {
          localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits.value))
        }
      }

      // 2b. Muat durasi kustom Timer Utama (Fokus / Istirahat Singkat / Istirahat Panjang)
      const savedTimerDurations = localStorage.getItem(STORAGE_KEYS.TIMER_DURATIONS)
      if (savedTimerDurations) {
        try {
          customTimerDurations.value = sanitizeTimerDurations(JSON.parse(savedTimerDurations))
          timerDurationsVersion.value += 1
        } catch {
          customTimerDurations.value = { ...DEFAULT_TIMER_DURATIONS_SECONDS }
        }
      }

      // 2c. Muat pengaturan 5 saluran Ambient Sound Mixer (ON/OFF + volume %)
      const savedAmbientMixer = localStorage.getItem(STORAGE_KEYS.AMBIENT_MIXER)
      if (savedAmbientMixer) {
        try {
          ambientMixerSettings.value = sanitizeAmbientMixerSettings(JSON.parse(savedAmbientMixer))
          isRainAmbientOn.value = ambientMixerSettings.value.rain.enabled
          ambientMixerVersion.value += 1
        } catch {
          ambientMixerSettings.value = cloneDefaultAmbientMixer()
        }
      }

      // 3. Muat riwayat grafik 7 hari
      const savedWeekly = localStorage.getItem(STORAGE_KEYS.WEEKLY_PROGRESS)
      if (savedWeekly) {
        const parsedWeekly = JSON.parse(savedWeekly)
        if (Array.isArray(parsedWeekly) && parsedWeekly.length === 7) {
          weeklyProgress.value = parsedWeekly.map(n =>
            Math.max(0, Math.min(100, Number(n) || 0)),
          )
        }
      }

      // 4. Muat sesi fokus & total detik fokus hari ini
      const savedFocus = localStorage.getItem(STORAGE_KEYS.FOCUS_SESSIONS)
      if (savedFocus) {
        const parsedFocus = JSON.parse(savedFocus) as Partial<FocusSessionRecord>
        totalFocusSessions.value = Number(parsedFocus.totalCount) || 0
        if (parsedFocus.date === todayStr) {
          todayFocusSessions.value = Number(parsedFocus.todayCount) || 0
          todayFocusSeconds.value =
            typeof parsedFocus.todaySeconds === 'number' && parsedFocus.todaySeconds >= 0
              ? Math.floor(parsedFocus.todaySeconds)
              : todayFocusSessions.value * 25 * 60
        } else {
          todayFocusSessions.value = 0
          todayFocusSeconds.value = 0
        }
      }

      // 5. Muat Streak Harian
      const savedStreak = localStorage.getItem(STORAGE_KEYS.STREAK)
      if (savedStreak) {
        const parsedStreak = JSON.parse(savedStreak) as Partial<StreakRecord>
        const last = parsedStreak.lastCompletedDate || ''
        streakLastDate.value = last
        // Pertahankan streak jika terakhir aktif hari ini atau kemarin
        if (last === todayStr || last === yesterdayStr) {
          dailyStreak.value = Number(parsedStreak.count) || 0
        } else {
          dailyStreak.value = 0
        }
      } else {
        dailyStreak.value = 0
        streakLastDate.value = ''
      }

      // 6. Muat Catatan Cepat
      const savedNotes = localStorage.getItem(STORAGE_KEYS.QUICK_NOTES)
      if (typeof savedNotes === 'string') {
        quickNotes.value = savedNotes
      }

      // 7. Muat preferensi Kursor Kustom Bertema (activeCursor + fallback isStarCursorEnabled)
      const savedActiveCursor = localStorage.getItem(STORAGE_KEYS.ACTIVE_CURSOR)
      const savedStarCursor = localStorage.getItem(STORAGE_KEYS.STAR_CURSOR)
      if (isValidCursorId(savedActiveCursor)) {
        activeCursor.value = savedActiveCursor
        isStarCursorEnabled.value = savedActiveCursor !== 'off'
      } else if (savedStarCursor === 'true' || savedStarCursor === 'false') {
        isStarCursorEnabled.value = savedStarCursor === 'true'
        activeCursor.value = isStarCursorEnabled.value ? 'starlight-wand' : 'off'
      }

      // 8. Muat Koin Hadiah (🐟), Aksesoris Maskot & Kasih Sayang Kucing
      const savedTreats = localStorage.getItem(STORAGE_KEYS.TREATS)
      if (savedTreats) {
        const parsedTreats = JSON.parse(savedTreats) as Partial<TreatRecord>
        treatCoins.value = Math.max(0, Number(parsedTreats.coins) || 0)
        if (Array.isArray(parsedTreats.owned)) {
          ownedAccessories.value = sanitizeOwnedAccessories(parsedTreats.owned)
        }
        if (isValidAccessoryId(parsedTreats.equipped)) {
          equippedAccessory.value = parsedTreats.equipped
          mainCatAccessory.value = parsedTreats.equipped
          miniCatAccessory.value = parsedTreats.equipped
        }
      }

      // 8b. Muat Kustomisasi 2 Kucing (ownedCats, mainCatType, miniCatType, syncCatAccessories, mainCatAccessory, miniCatAccessory)
      const savedCatCustom = localStorage.getItem(STORAGE_KEYS.CAT_CUSTOMIZATION)
      if (savedCatCustom) {
        try {
          const parsedCat = JSON.parse(savedCatCustom) as Partial<CatCustomizationRecord>
          ownedCats.value = sanitizeOwnedCats(parsedCat.ownedCats)
          if (isValidCatBreedId(parsedCat.mainCatType) && ownedCats.value.includes(parsedCat.mainCatType)) {
            mainCatType.value = parsedCat.mainCatType
          }
          if (isValidCatBreedId(parsedCat.miniCatType) && ownedCats.value.includes(parsedCat.miniCatType)) {
            miniCatType.value = parsedCat.miniCatType
          }
          if (typeof parsedCat.syncCatAccessories === 'boolean') {
            syncCatAccessories.value = parsedCat.syncCatAccessories
          }
          if (isValidAccessoryId(parsedCat.mainCatAccessory)) {
            mainCatAccessory.value = parsedCat.mainCatAccessory
            equippedAccessory.value = parsedCat.mainCatAccessory
          }
          if (isValidAccessoryId(parsedCat.miniCatAccessory)) {
            miniCatAccessory.value = syncCatAccessories.value
              ? mainCatAccessory.value
              : parsedCat.miniCatAccessory
          }
        } catch {
          // Gunakan default aman bila korup
        }
      }
      const savedAffinity = localStorage.getItem(STORAGE_KEYS.CAT_AFFINITY)
      if (savedAffinity) {
        const cleanAffinity = sanitizeCatAffinity(JSON.parse(savedAffinity))
        catAffinityLevel.value = cleanAffinity.level
        catAffinityXp.value = cleanAffinity.xp
        catHeartChestXp.value = cleanAffinity.heartChestXp
        claimedLv10Reward.value = cleanAffinity.claimedLv10Reward
        claimedLv20Reward.value = cleanAffinity.claimedLv20Reward
      }

      // 8b. Muat Tema Latar Belakang Beranimasi (Cozy Themes) & 7-Day Full Goal Streak
      const savedCozyThemes = localStorage.getItem(STORAGE_KEYS.COZY_THEMES)
      if (savedCozyThemes) {
        const parsedCozy = JSON.parse(savedCozyThemes) as Partial<CozyThemeRecord>
        ownedCozyThemes.value = sanitizeOwnedCozyThemes(parsedCozy.owned)
        if (
          isValidCozyThemeId(parsedCozy.active) &&
          ownedCozyThemes.value.includes(parsedCozy.active)
        ) {
          activeCozyTheme.value = parsedCozy.active
        } else {
          activeCozyTheme.value = 'classic'
        }
      }
      const savedFullStreak = localStorage.getItem(STORAGE_KEYS.FULL_GOAL_STREAK)
      if (savedFullStreak) {
        const parsedFullStreak = JSON.parse(savedFullStreak) as Partial<FullGoalStreakRecord>
        const lastFull = parsedFullStreak.lastFullDate || ''
        fullGoalStreakLastDate.value = lastFull
        fullGoalStreakRewardClaimedDate.value = parsedFullStreak.lastRewardClaimedDate || ''
        if (lastFull === todayStr || lastFull === yesterdayStr) {
          fullGoalStreak.value = Math.max(0, Math.floor(Number(parsedFullStreak.count) || 0))
        } else {
          fullGoalStreak.value = 0
        }
        if (
          fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL &&
          !ownedCozyThemes.value.includes('astral-palace')
        ) {
          ownedCozyThemes.value = [...ownedCozyThemes.value, 'astral-palace']
        }
      }
      const savedSecretCards = localStorage.getItem(STORAGE_KEYS.SECRET_CARDS)
      if (savedSecretCards) {
        collectedSecretCards.value = sanitizeCollectedSecretCards(JSON.parse(savedSecretCards))
      }
      applyCozyThemeToDocument(activeCozyTheme.value)

      // 9. Muat Mood Check-in Harian (otomatis kosong jika berganti hari)
      const savedMood = localStorage.getItem(STORAGE_KEYS.DAILY_MOOD)
      if (savedMood) {
        const parsedMood = JSON.parse(savedMood) as Partial<DailyMoodRecord>
        dailyMood.value = parsedMood.date === todayStr ? (parsedMood.mood ?? null) : null
      }

      // 10. Muat Nama Panggilan Pengguna
      const savedUserName = localStorage.getItem(STORAGE_KEYS.USER_NAME)
      if (savedUserName && savedUserName.trim()) {
        userName.value = savedUserName.trim()
      }

      // 11. Muat Pengaturan Kualitas Grafik (atau auto-detect ramah perangkat seluler & spek rendah)
      const savedGraphics = localStorage.getItem(STORAGE_KEYS.GRAPHICS_QUALITY)
      const savedBattery = localStorage.getItem(STORAGE_KEYS.BATTERY_SAVER)
      if (isValidGraphicsQuality(savedGraphics)) {
        graphicsQuality.value = savedGraphics
      } else if (savedBattery === 'true') {
        graphicsQuality.value = 'low'
      } else {
        const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        const isMobileAuto =
          (window.matchMedia?.('(pointer: coarse)').matches ?? false) ||
          window.innerWidth < 768 ||
          /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)
        const lowCoreCount = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4
        if (prefersReduced) {
          graphicsQuality.value = 'low'
        } else if (isMobileAuto || lowCoreCount) {
          graphicsQuality.value = 'medium'
        } else {
          graphicsQuality.value = 'high'
        }
      }
      isBatterySaverMode.value = graphicsQuality.value === 'low'
      applyGraphicsQualityToDocument(graphicsQuality.value)

      // 11b. Muat preferensi Getaran HP (Web Vibration API, default ON)
      const savedVibration = localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED)
      if (savedVibration === 'true' || savedVibration === 'false') {
        isVibrationEnabled.value = savedVibration === 'true'
      } else {
        isVibrationEnabled.value = true
      }

      // 12. Muat tanggal klaim terakhir bonus harian +5 Ikan Kering (anti-spam 1x/hari)
      const savedRewardDate = localStorage.getItem(STORAGE_KEYS.DAILY_REWARD_DATE)
      if (savedRewardDate) {
        dailyRewardClaimedDate.value = savedRewardDate
      }

      // 13. Muat daftar Kawaii Notebook (twilights_notebooks)
      const savedNotebooks = localStorage.getItem(STORAGE_KEYS.NOTEBOOKS)
      if (savedNotebooks) {
        const parsedNotes = JSON.parse(savedNotebooks)
        if (Array.isArray(parsedNotes)) {
          notebooks.value = parsedNotes
        }
      }

      // 14. Muat daftar Kawaii Alarm (twilights_alarms) & pilihan nada dering
      const savedAlarms = localStorage.getItem(STORAGE_KEYS.ALARMS)
      if (savedAlarms) {
        const parsedAlarms = JSON.parse(savedAlarms)
        if (Array.isArray(parsedAlarms)) {
          // Hanya muat alarm yang waktunya belum terlewat lama
          const nowMs = Date.now()
          alarms.value = parsedAlarms.filter(
            (a: KawaiiAlarmItem) => typeof a?.targetTimestamp === 'number' && a.targetTimestamp > nowMs - 60000,
          )
        }
      }
      const savedAlarmSound = localStorage.getItem(STORAGE_KEYS.ALARM_SOUND) as AlarmSoundId | null
      if (
        savedAlarmSound === 'music-box' ||
        savedAlarmSound === 'morning-chime' ||
        savedAlarmSound === 'cute-beep'
      ) {
        selectedAlarmSound.value = savedAlarmSound
      }

      // 15. Muat High Score & jatah bermain/hadiah harian Break Game per game (maks 3x/hari masing-masing)
      const savedHighScore = localStorage.getItem(STORAGE_KEYS.GAME_HIGHSCORE)
      if (savedHighScore) {
        gameHighScore.value = Math.max(0, Number(savedHighScore) || 0)
      }
      const savedGameClaims = localStorage.getItem(STORAGE_KEYS.GAME_DAILY_CLAIMS)
      if (savedGameClaims) {
        const parsedClaims = JSON.parse(savedGameClaims) as Partial<GameDailyClaimRecord>
        if (typeof parsedClaims.fishingHighScore === 'number') {
          fishingHighScore.value = Math.max(0, Math.floor(parsedClaims.fishingHighScore))
        }
        if (parsedClaims.date === todayStr) {
          gameDailyClaimDate.value = todayStr
          const cPlay =
            typeof parsedClaims.catcherPlayCount === 'number'
              ? parsedClaims.catcherPlayCount
              : Number(parsedClaims.playCount) || 0
          const fPlay =
            typeof parsedClaims.fishingPlayCount === 'number' ? parsedClaims.fishingPlayCount : 0
          const cRew =
            typeof parsedClaims.catcherRewardCount === 'number'
              ? parsedClaims.catcherRewardCount
              : Number(parsedClaims.count) || 0
          const fRew =
            typeof parsedClaims.fishingRewardCount === 'number'
              ? parsedClaims.fishingRewardCount
              : 0

          catcherPlayCount.value = Math.max(0, Math.min(MAX_GAME_DAILY_PLAYS, Math.floor(cPlay)))
          fishingPlayCount.value = Math.max(0, Math.min(MAX_GAME_DAILY_PLAYS, Math.floor(fPlay)))
          catcherRewardCount.value = Math.max(
            0,
            Math.min(MAX_GAME_DAILY_REWARDS, Math.floor(cRew)),
          )
          fishingRewardCount.value = Math.max(
            0,
            Math.min(MAX_GAME_DAILY_REWARDS, Math.floor(fRew)),
          )
          gameDailyPlayCount.value = catcherPlayCount.value
          gameDailyClaimCount.value = catcherRewardCount.value
        } else {
          gameDailyClaimDate.value = todayStr
          catcherPlayCount.value = 0
          fishingPlayCount.value = 0
          catcherRewardCount.value = 0
          fishingRewardCount.value = 0
          gameDailyClaimCount.value = 0
          gameDailyPlayCount.value = 0
        }
      } else {
        gameDailyClaimDate.value = todayStr
        catcherPlayCount.value = 0
        fishingPlayCount.value = 0
        catcherRewardCount.value = 0
        fishingRewardCount.value = 0
        gameDailyClaimCount.value = 0
        gameDailyPlayCount.value = 0
      }

      // Cek pergantian hari lokal (YYYY-MM-DD):
      // - Jika belum ada tanggal tersimpan (null): simpan tanggal hari ini tanpa mereset centang.
      // - Hanya reset centang jika tanggal tersimpan benar-benar berbeda dari getLocalTodayDate().
      if (savedDate === null) {
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr)
      } else if (savedDate !== todayStr) {
        // Pergantian hari lokal: reset hanya target 'daily', pertahankan 'once' yang belum selesai
        habits.value = habits.value
          .filter(item => !(item.type === 'once' && item.completed))
          .map(item => (item.type === 'daily' ? { ...item, completed: false } : item))
        todayFocusSessions.value = 0
        dailyMood.value = null
        habitResetVersion.value += 1
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr)
      } else if (rawCurrentDate === null) {
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, savedDate)
      }

      // Validasi ulang kursor aktif setelah ownedCozyThemes selesai dimuat
      if (!isCursorUnlocked(activeCursor.value)) {
        activeCursor.value = 'starlight-wand'
        isStarCursorEnabled.value = true
      }

      // Sinkronkan batang hari ini di grafik
      const syncedWeekly = [...weeklyProgress.value]
      syncedWeekly[todayIndex.value] = todayCompletionRate.value
      weeklyProgress.value = syncedWeekly

      // Migrasi otomatis pengguna lama di Lv. 10 -> buka Lv. 11 & klaim hadiah Milestone Lv. 10 (+20 🐟 & Kalung) 1x!
      grantPendingCatAffinityMilestones(true)
      // Cek juga jika koleksi toko sudah 100% untuk membuka Neon Night City otomatis
      checkAndUnlockNeonCity(true)

      isHydrated.value = true
      persistAll(false)
    } catch (err) {
      console.warn('Gagal memuat data dari localStorage:', err)
      isHydrated.value = true
    }
  }

  // --- Aksi CRUD untuk Daily Habit Tracker (`twilights_habits`) ---

  /** Batalkan timer hapus otomatis 1.2 detik jika ada untuk item tertentu */
  function cancelPendingOnceRemoval(id: string) {
    const existingTimer = pendingOnceRemovalTimers.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
      pendingOnceRemovalTimers.delete(id)
    }
  }

  /** Jadwalkan penghapusan permanen 1.2 detik untuk target bertipe 'once' (1x Sekali) yang baru selesai */
  function scheduleOnceHabitRemoval(id: string) {
    cancelPendingOnceRemoval(id)
    const timer = setTimeout(() => {
      pendingOnceRemovalTimers.delete(id)
      const target = habits.value.find(item => item.id === id)
      // Hanya hapus jika item masih ada, bertipe 'once', dan masih berstatus selesai
      if (!target || target.type !== 'once' || !target.completed) return
      removeHabit(id)
    }, 1200)
    pendingOnceRemovalTimers.set(id, timer)
  }

  /** Hentikan bunyi alarm pengingat habit & getaran HP yang sedang berjalan */
  function stopHabitAlarmSound() {
    stopVibration()
    if (habitAlarmRepeatInterval) {
      clearInterval(habitAlarmRepeatInterval)
      habitAlarmRepeatInterval = null
    }
    if (habitAlarmSafetyTimeout) {
      clearTimeout(habitAlarmSafetyTimeout)
      habitAlarmSafetyTimeout = null
    }
  }

  /** Batalkan jadwal tunda (snooze) untuk target tertentu jika ada */
  function cancelHabitSnooze(habitId: string) {
    const existing = habitSnoozeTimers.get(habitId)
    if (existing) {
      clearTimeout(existing)
      habitSnoozeTimers.delete(habitId)
    }
  }

  /** CREATE: Tambah target kebiasaan baru ('daily'/'once' + jam opsional + mode dering) */
  function addHabit(
    title: string,
    reminderTime?: string,
    type: HabitType = 'daily',
    alarmMode: HabitAlarmMode = 'once',
  ) {
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    const cleanTime = reminderTime?.trim() || undefined
    const safeType: HabitType = type === 'once' ? 'once' : 'daily'
    const safeAlarmMode: HabitAlarmMode = alarmMode === 'repeat' ? 'repeat' : 'once'
    const newHabit: HabitItem = {
      id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle,
      completed: false,
      type: safeType,
      reminderTime: cleanTime,
      alarmMode: safeAlarmMode,
    }
    habits.value = sortHabitsByCompletion([...habits.value, newHabit])
    syncTodayProgress()
    // Jika pengguna menyetel jam pengingat & izin notifikasi masih 'default', tawarkan izin otomatis
    if (cleanTime) {
      void requestNotificationPermission(true)
    }
    runDbCrud(() =>
      $fetch('/api/habits', {
        method: 'POST',
        body: { profileId: 'default', ...newHabit },
      }),
    )
    triggerMascotReaction(
      'happy',
      safeType === 'once'
        ? 'Agenda sekali pakai dicatat! Semangat menyelesaikannya~ 📌✨'
        : 'Target harian baru dicatat! Semangat ya~ 🔁✨',
      2600,
    )
  }

  /**
   * DUPLIKAT TARGET (📋):
   * Gandakan item tepat di bawah aslinya dengan nama, tipe, jam awal, dan mode dering identik
   * (tanpa memaksa perubahan interval menit) dan status awal belum selesai (`false`).
   */
  function duplicateHabit(id: string): HabitItem | null {
    const index = habits.value.findIndex(item => item.id === id)
    if (index === -1) return null

    const source = habits.value[index]!
    const cloned: HabitItem = {
      id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: source.title,
      completed: false,
      type: source.type,
      reminderTime: source.reminderTime,
      alarmMode: source.alarmMode,
    }

    const nextList = [...habits.value]
    nextList.splice(index + 1, 0, cloned)
    habits.value = sortHabitsByCompletion(nextList)

    syncTodayProgress()
    runDbCrud(() =>
      $fetch('/api/habits', {
        method: 'POST',
        body: { profileId: 'default', ...cloned },
      }),
    )
    playPopTing()
    showMiniToast(`Target "${source.title}" diduplikat! Silakan atur jamnya ⏰`)
    return cloned
  }

  /** UPDATE: Ubah atau hapus jam pengingat target langsung di daftar & simpan otomatis */
  function updateHabitReminderTime(id: string, reminderTime: string) {
    const cleanTime = reminderTime.trim() || undefined
    habits.value = habits.value.map(item =>
      item.id === id ? { ...item, reminderTime: cleanTime } : item,
    )
    cancelHabitSnooze(id)
    persistAll()
    // Jika pengguna pertama kali menyetel jam pengingat & status izin masih 'default', minta izin otomatis
    if (cleanTime) {
      void requestNotificationPermission(true)
    }
    runDbCrud(() =>
      $fetch(`/api/habits/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { profileId: 'default', reminderTime: cleanTime ?? null },
      }),
    )
  }

  /** UPDATE: Ganti mode dering target antara 🔔 Sekali ('once') dan ⏰ Berkali-kali ('repeat') */
  function toggleHabitAlarmMode(id: string) {
    const existing = habits.value.find(item => item.id === id)
    if (!existing) return

    const nextMode: HabitAlarmMode = existing.alarmMode === 'repeat' ? 'once' : 'repeat'
    habits.value = habits.value.map(item =>
      item.id === id ? { ...item, alarmMode: nextMode } : item,
    )
    persistAll()
    runDbCrud(() =>
      $fetch(`/api/habits/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { profileId: 'default', alarmMode: nextMode },
      }),
    )
    showMiniToast(
      nextMode === 'repeat'
        ? 'Mode dering diubah ke ⏰ Berkali-kali (alarm berulang tiap ~3 dtk)'
        : 'Mode dering diubah ke 🔔 Sekali (denting lo-fi lembut 1x)',
    )
  }

  /** UPDATE: Ubah tipe target antara 'daily' (🔁 Harian) dan 'once' (1x Sekali) */
  function toggleHabitType(id: string) {
    let nextType: HabitType | null = null
    let isCurrentlyCompleted = false

    habits.value = habits.value.map((item) => {
      if (item.id === id) {
        nextType = item.type === 'once' ? 'daily' : 'once'
        isCurrentlyCompleted = item.completed
        return { ...item, type: nextType }
      }
      return item
    })

    if (!nextType) return

    if (nextType === 'daily') {
      // Jika berubah kembali ke Harian saat jeda 1.2 detik, batalkan penghapusan otomatis
      cancelPendingOnceRemoval(id)
    } else if (nextType === 'once' && isCurrentlyCompleted) {
      // Jika target yang sudah dicentang diubah menjadi 1x Sekali, hapus otomatis setelah 1.2 detik
      scheduleOnceHabitRemoval(id)
    }

    persistAll()
    runDbCrud(() =>
      $fetch(`/api/habits/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { profileId: 'default', type: nextType },
      }),
    )
    showMiniToast(
      nextType === 'once'
        ? 'Diubah ke target 1x Sekali (otomatis terhapus saat selesai) 📌'
        : 'Diubah ke kebiasaan 🔁 Harian (berulang tiap hari)',
    )
  }

  /** UPDATE: Centang/batal centang habit di UI & langsung PATCH ke TiDB (`PATCH /api/habits/:id`) */
  function toggleHabit(id: string): boolean {
    const existing = habits.value.find(item => item.id === id)
    if (!existing) return false

    const wasAllComplete = isAllHabitsCompleted.value
    const nextCompletedState = !existing.completed
    const becameCompleted = nextCompletedState
    const targetType: HabitType = existing.type

    habits.value = sortHabitsByCompletion(
      habits.value.map(item =>
        item.id === id ? { ...item, completed: nextCompletedState } : item,
      ),
    )

    // Jika tugas yang sedang mengingatkan baru saja dicentang, hentikan alarm, kedip tab & tutup banner
    if (becameCompleted) {
      cancelHabitSnooze(id)
      if (activeReminder.value?.habitId === id) {
        stopHabitAlarmSound()
        stopTabTitleBlink()
        activeReminder.value = null
      }
    }

    // Jika bertipe 'once' (1x Sekali): tampilkan centang selesai 1.2 detik lalu hapus permanen
    if (targetType === 'once') {
      if (nextCompletedState) {
        scheduleOnceHabitRemoval(id)
      } else {
        cancelPendingOnceRemoval(id)
      }
    }

    const triggeredSevenDayReward = syncTodayProgress()
    runDbCrud(() =>
      $fetch(`/api/habits/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { profileId: 'default', completed: nextCompletedState },
      }),
    )

    if (becameCompleted) {
      // Hadiah +10 Ikan Kering setiap mencentang 1 habit
      treatCoins.value += 10
      persistAll()

      // LOGIKA KLAIM BONUS HARIAN +5 IKAN KERING (1x SEHARI / ANTI-SPAM):
      // Jika seluruh target hari ini mencapai 100% (dan minimal ada 1 target),
      // cek apakah tanggal hari ini (YYYY-MM-DD) sudah tercatat di twilights_daily_reward_date.
      if (!wasAllComplete && isAllHabitsCompleted.value) {
        const todayStr = getTodayDateString()
        const alreadyClaimedToday = dailyRewardClaimedDate.value === todayStr

        if (!alreadyClaimedToday) {
          // Belum diklaim hari ini: beri bonus +5 🐟 & simpan tanggal hari ini agar anti-spam!
          treatCoins.value += 5
          dailyRewardClaimedDate.value = todayStr
          persistAll()

          // Jika hari ke-7 Full Goal Streak baru saja merayakan hadiah +15 🐟 & tema Astral Palace,
          // pertahankan popup perayaan besar 7-Day tersebut agar tidak tertimpa.
          if (!triggeredSevenDayReward) {
            celebrationCount.value += 1
            playVictoryMelody()
            triggerMascotReaction(
              'celebrate',
              'Yeay! Semua target tuntas! Bonus +5 Ikan Kering 🐟✨',
              6500,
            )
            showDailyRewardCard(
              'Selamat! Semua target hari ini tuntas! Bonus +5 Ikan Kering 🐟✨',
            )
          }
        } else if (!triggeredSevenDayReward) {
          // Sudah pernah diklaim hari ini: tetap rayakan ringan tanpa menggandakan bonus +5 🐟
          playPopTing()
          triggerMascotReaction(
            'celebrate',
            'Yeay! Semua target tuntas lagi hari ini! ✨',
            4000,
          )
          showMiniToast('Semua target hari ini tuntas! (Bonus +5 🐟 sudah diklaim hari ini ✓)')
        }
      } else {
        // Mini-selebrasi untuk setiap 1 item selesai
        playPopTing()
        const randomToast =
          MINI_TOAST_MESSAGES[Math.floor(Math.random() * MINI_TOAST_MESSAGES.length)] ??
          'Satu langkah selesai! Keren! ⭐'
        showMiniToast(`${randomToast} (+10 🐟)`)
        triggerMascotReaction('happy', 'Yeay! Satu langkah selesai! +10 🐟💖', 2800)
      }
    }

    return becameCompleted
  }

  /** DELETE: Hapus kebiasaan dari UI & TiDB (`DELETE /api/habits/:id`) */
  function removeHabit(id: string) {
    cancelPendingOnceRemoval(id)
    cancelHabitSnooze(id)
    habits.value = habits.value.filter(item => item.id !== id)
    if (activeReminder.value?.habitId === id) {
      stopHabitAlarmSound()
      stopTabTitleBlink()
      activeReminder.value = null
    }
    syncTodayProgress()
    runDbCrud(() =>
      $fetch(`/api/habits/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        query: { profileId: 'default' },
      }),
    )
  }

  /**
   * UPDATE (RESET HARIAN MANUAL):
   * - Reset status centang semua target 'daily' (🔁 Harian) ke belum selesai (`false`).
   * - Bersihkan target 'once' (1x Sekali) yang sudah selesai, sambil mempertahankan 'once' yang belum selesai.
   */
  function resetDailyHabits() {
    for (const item of habits.value) {
      if (item.type === 'once' && item.completed) {
        cancelPendingOnceRemoval(item.id)
      }
    }

    habits.value = habits.value
      .filter(item => !(item.type === 'once' && item.completed))
      .map(item => (item.type === 'daily' ? { ...item, completed: false } : item))
    habitResetVersion.value += 1
    syncTodayProgress()
    runDbCrud(() =>
      $fetch('/api/habits/reset', {
        method: 'POST',
        body: { profileId: 'default' },
      }),
    )
    triggerMascotReaction('idle', 'Hari baru, semangat baru! Yuk mulai~ 🌱', 2600)
  }

  // --- Aksi untuk Pomodoro Timer & Pengingat ---

  /** Simpan durasi kustom Pomodoro Timer untuk 1 mode ke localStorage secara otomatis */
  function setCustomTimerDuration(mode: TimerModeKey, seconds: number) {
    const cleanSec = Math.max(1, Math.min(MAX_TIMER_DURATION_SECONDS, Math.floor(seconds)))
    customTimerDurations.value = {
      ...customTimerDurations.value,
      [mode]: cleanSec,
    }
    timerDurationsVersion.value += 1
    persistAll()
  }

  /** Perbarui status ON/OFF atau volume (%) 1 saluran Ambient Sound Mixer & simpan otomatis */
  function updateAmbientChannel(
    channel: AmbientChannelId,
    patch: Partial<AmbientChannelSetting>,
  ) {
    const current = ambientMixerSettings.value[channel]
    const nextVolume =
      typeof patch.volume === 'number' && Number.isFinite(patch.volume)
        ? Math.max(0, Math.min(100, Math.round(patch.volume)))
        : current.volume
    const nextEnabled = typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled

    ambientMixerSettings.value = {
      ...ambientMixerSettings.value,
      [channel]: {
        enabled: nextEnabled,
        volume: nextVolume,
      },
    }
    if (channel === 'rain') {
      isRainAmbientOn.value = nextEnabled
    }
    persistAll()
  }

  /**
   * Tambah poin XP Bilah Kasih Sayang Kucing (maks Lv. 20 MAX ✨ + Peti Cinta berulang 0/10):
   * - 'pet'   : +1 XP tiap ~1.5 detik elusan nyaman
   * - 'click' : +1 XP per klik semangat (cooldown 2 detik anti-spam)
   * - 'focus' : +5 XP setiap menyelesaikan 1 sesi timer fokus penuh
   * - 'gacha' : +1 XP untuk kartu rahasia duplikat
   * Lv. 1–9 butuh 10 XP/level, Lv. 10–19 butuh 15 XP/level (+2 🐟/level).
   * Milestone Lv. 10: +20 🐟 + 💖 Kalung Hati Bintang + bonus pasif +1 🐟/sesi.
   * Milestone Lv. 20 MAX: +40 🐟 + ✨ Sayap Malaikat + gelar 👑 Soulmate MAX + bonus pasif +2 🐟/sesi.
   * Setelah Lv. 20 MAX: mengisi 💖 Peti Cinta (0/10) -> penuh memberi +3 🐟 berulang tanpa batas!
   */
  function addCatAffinityXp(
    amount: number,
    source: 'pet' | 'click' | 'focus' | 'gacha' | 'game',
  ): boolean {
    const cleanAmount = Math.max(0, Math.floor(amount))
    if (cleanAmount <= 0) return false

    const now = Date.now()
    if (source === 'click') {
      if (now - lastCatClickXpAt < 2000) return false
      lastCatClickXpAt = now
    } else if (source === 'pet') {
      if (now - lastCatPetXpAt < 1500) return false
      lastCatPetXpAt = now
    }

    // Jika sudah Lv. 20 (MAX ✨): jalankan siklus 💖 Peti Cinta (0/10 -> +3 🐟 + Auto-Drop Kartu Rahasia!) tanpa batas!
    if (catAffinityLevel.value >= CAT_AFFINITY_MAX_LEVEL) {
      catAffinityLevel.value = CAT_AFFINITY_MAX_LEVEL
      catAffinityXp.value = CAT_AFFINITY_HIGH_XP_PER_LEVEL
      grantPendingCatAffinityMilestones(true)

      let nextChestXp = catHeartChestXp.value + cleanAmount
      let chestsOpened = 0
      while (nextChestXp >= HEART_CHEST_XP_GOAL) {
        nextChestXp -= HEART_CHEST_XP_GOAL
        chestsOpened += 1
      }
      catHeartChestXp.value = nextChestXp

      if (chestsOpened > 0) {
        const chestFish = chestsOpened * HEART_CHEST_FISH_REWARD
        treatCoins.value += chestFish
        const chestMsg = `💖 Peti Cinta penuh! Hadiah +${chestFish} 🐟 & 💌 Kartu Rahasia Kucing!`
        catAffinityLevelUpMessage.value = chestMsg
        if (catAffinityToastTimer) clearTimeout(catAffinityToastTimer)
        catAffinityToastTimer = setTimeout(() => {
          catAffinityLevelUpMessage.value = ''
        }, 4500)
        playVictoryMelody()
        showMiniToast(chestMsg)
        triggerMascotReaction('celebrate', chestMsg, 4200)
        // Hadiah kartu random otomatis saat Bar Kasih Sayang / Peti Cinta penuh!
        if (source !== 'gacha') {
          triggerAffinityRewardCardDrop()
        }
      }

      persistAll()
      return true
    }

    let nextXp = catAffinityXp.value + cleanAmount
    let nextLevel = catAffinityLevel.value
    let levelsGained = 0

    while (nextLevel < CAT_AFFINITY_MAX_LEVEL) {
      const needed = getCatAffinityXpNeeded(nextLevel)
      if (nextXp < needed) break
      nextXp -= needed
      nextLevel += 1
      levelsGained += 1
    }

    catAffinityLevel.value = nextLevel
    catAffinityXp.value = nextLevel >= CAT_AFFINITY_MAX_LEVEL ? CAT_AFFINITY_HIGH_XP_PER_LEVEL : nextXp
    if (nextLevel >= CAT_AFFINITY_MAX_LEVEL && nextXp > 0) {
      catHeartChestXp.value = Math.min(HEART_CHEST_XP_GOAL - 1, nextXp)
    }

    if (levelsGained > 0) {
      const bonusFish = levelsGained * CAT_AFFINITY_LEVELUP_FISH_REWARD
      treatCoins.value += bonusFish
      const milestoneMsgs = grantPendingCatAffinityMilestones(true)

      if (milestoneMsgs.length === 0) {
        const celebrationMsg = `🎉 Level Up! Lv. ${nextLevel} — Hadiah +${bonusFish} 🐟 & 💌 Kartu Rahasia!`
        catAffinityLevelUpMessage.value = celebrationMsg

        if (catAffinityToastTimer) clearTimeout(catAffinityToastTimer)
        catAffinityToastTimer = setTimeout(() => {
          catAffinityLevelUpMessage.value = ''
        }, 4200)

        playVictoryMelody()
        showMiniToast(celebrationMsg)
        triggerMascotReaction(
          'celebrate',
          `Yeay! Kita naik ke Lv. ${nextLevel}! Ini +${bonusFish} 🐟 & kartu rahasia buatmu~ 💖`,
          4200,
        )
      }

      // Hadiah kartu random otomatis saat Bar Kasih Sayang penuh / naik level!
      if (source !== 'gacha') {
        triggerAffinityRewardCardDrop()
      }
    }

    persistAll()
    return true
  }

  /** Tambah 1 sesi fokus, total detik fokus hari ini, hadiah +10 🐟 (+bonus pasif Lv. 10/20), & +5 XP Kasih Sayang Kucing */
  function incrementFocusSession(durationSeconds?: number) {
    const addedSeconds =
      typeof durationSeconds === 'number' && durationSeconds > 0
        ? Math.floor(durationSeconds)
        : customTimerDurations.value.focus
    const passiveBonus = catAffinityPassiveFishBonus.value
    const totalFish = 10 + passiveBonus

    todayFocusSessions.value += 1
    totalFocusSessions.value += 1
    todayFocusSeconds.value += addedSeconds
    treatCoins.value += totalFish
    persistAll()

    const bonusLabel =
      passiveBonus === 2
        ? ' (+2 🐟 Bonus MAX)'
        : passiveBonus === 1
          ? ' (+1 🐟 Bonus Lv. 10+)'
          : ''
    showMiniToast(`1 sesi fokus selesai! +10 🐟${bonusLabel} & +5 💖✨`)
    triggerMascotReaction(
      'celebrate',
      `Keren! 1 sesi fokus tuntas! +${totalFish} 🐟🎉`,
      4200,
    )
    addCatAffinityXp(5, 'focus')
  }

  /**
   * Tampilkan banner kontrol alarm pengingat jadwal, kirim Notifikasi Sistem (Windows & bilah atas HP),
   * kedipkan judul tab browser tiap 1 detik, & putar suara Web Audio API sesuai mode dering target.
   */
  function triggerScheduleReminder(reminder: ActiveReminder) {
    stopHabitAlarmSound()
    activeReminder.value = reminder
    triggerMascotReaction('reminder', reminder.message, 8000)

    // 1. Kirim Pop-Up Notifikasi Sistem (Windows Action Center & Status Bar / Lockscreen HP)
    void kirimNotifikasiSistem(
      "⏰ Pengingat Target Harian — Twilight's",
      `Waktunya menyelesaikan: "${reminder.habitTitle}" 🐾`,
      true,
      reminder.id,
    )

    // 2. Kedipkan judul tab browser tiap 1 detik selama alarm belum dimatikan/ditandai selesai
    startTabTitleBlink(reminder.habitTitle)

    // 3. Bunyikan suara Web Audio API + Getaran HP [200, 100, 200] (1x atau berulang tiap ~3 detik, aman berhenti otomatis 2 menit)
    triggerVibration(VIBRATION_PATTERNS.habitReminder)
    if (reminder.alarmMode === 'repeat') {
      playAlarmMelody(selectedAlarmSound.value)
      habitAlarmRepeatInterval = setInterval(() => {
        if (!activeReminder.value || activeReminder.value.id !== reminder.id) {
          stopHabitAlarmSound()
          return
        }
        playAlarmMelody(selectedAlarmSound.value)
        triggerVibration(VIBRATION_PATTERNS.habitReminder)
      }, 3000)

      habitAlarmSafetyTimeout = setTimeout(() => {
        stopHabitAlarmSound()
      }, 2 * 60 * 1000)
    } else {
      playBellChime()
    }
  }

  /** Tombol 🔕 Matikan: hentikan bunyi alarm, hentikan kedip judul tab & tutup banner */
  function dismissReminder() {
    stopHabitAlarmSound()
    stopTabTitleBlink()
    activeReminder.value = null
  }

  /** Tombol ✓ Tandai Selesai: hentikan alarm, hentikan kedip tab & centang target */
  function completeActiveReminder() {
    const current = activeReminder.value
    stopHabitAlarmSound()
    stopTabTitleBlink()
    activeReminder.value = null
    if (!current) return

    cancelHabitSnooze(current.habitId)
    const habit = habits.value.find(item => item.id === current.habitId)
    if (habit && !habit.completed) {
      toggleHabit(habit.id)
    }
  }

  /** Tombol 💤 Tunda 5m: hentikan suara + kedip tab sementara & bunyikan ulang 5 menit kemudian */
  function snoozeActiveReminder(minutes = 5) {
    const current = activeReminder.value
    stopHabitAlarmSound()
    stopTabTitleBlink()
    activeReminder.value = null
    if (!current) return

    cancelHabitSnooze(current.habitId)
    const delayMs = Math.max(1, minutes) * 60 * 1000
    const timer = setTimeout(() => {
      habitSnoozeTimers.delete(current.habitId)
      const latestHabit = habits.value.find(item => item.id === current.habitId)
      if (!latestHabit || latestHabit.completed) return

      const now = new Date()
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      triggerScheduleReminder({
        id: `snooze_${latestHabit.id}_${Date.now()}`,
        habitId: latestHabit.id,
        habitTitle: latestHabit.title,
        time: nowHHMM,
        message: `⏰ Pengingat: ${latestHabit.title} (${nowHHMM})`,
        alarmMode: latestHabit.alarmMode,
        isSnoozed: true,
      })
    }, delayMs)

    habitSnoozeTimers.set(current.habitId, timer)
    showMiniToast(`Pengingat "${current.habitTitle}" ditunda ${minutes} menit 💤`)
  }

  // Sinkronkan tema & mode gelap ketika berubah
  watch([theme, isDarkTheme], ([val, dark]) => {
    applyThemeToDocument(val, dark)
  })
  watch(activeCozyTheme, (val) => {
    applyCozyThemeToDocument(val)
  })

  // Muat data localStorage secara aman lalu aktifkan Firebase Auth/Firestore Offline Sync & TiDB Cloud
  onMounted(() => {
    loadFromStorage()
    initFirebaseSync({
      getLocalSnapshot: buildStateSnapshot,
      applyRemoteSnapshot: (remoteData, remoteUser) => {
        applyImportedDataSilently(remoteData, remoteUser)
      },
      onToast: showMiniToast,
    })
    hydrateFromCloud()
  })

  /**
   * TEMPORARY RECOVERY HELPER:
   * Pulihkan progres akun pengguna secara 1-klik ke localStorage & paksa unggah ke Cloud Firestore (`users/{uid}`).
   */
  async function restoreMyAccountProgress(): Promise<{ ok: boolean; syncedToCloud: boolean }> {
    const todayStr = getLocalTodayDate()

    // 1. Koin Ikan: 500
    treatCoins.value = 500

    // 2. Level & XP Kucing: Level 15 (tandai Lv.10 sudah diklaim agar tidak auto-unlock aksesoris lain)
    catAffinityLevel.value = 15
    catAffinityXp.value = 0
    catHeartChestXp.value = 0
    claimedLv10Reward.value = true
    claimedLv20Reward.value = false

    // 3. Streak Fokus: 2 hari
    dailyStreak.value = 2
    streakLastDate.value = todayStr
    fullGoalStreak.value = 2
    fullGoalStreakLastDate.value = todayStr

    // 4. Kartu Pesan Rahasia Terbuka: 9 kartu pertama (#01–#09)
    collectedSecretCards.value = SECRET_CAT_CARDS.slice(0, 9).map(card => card.id)

    // 5. Tema Terbuka: urutan atas s/d Honey Library (tema setelah Honey Library tetap terkunci)
    const restoredThemes: CozyThemeId[] = [
      'classic',
      'midnight-rain',
      'autumn-cafe',
      'matcha-garden',
      'sakura-lantern',
      'biolum-ocean',
      'honey-library',
    ]
    ownedCozyThemes.value = restoredThemes
    if (!restoredThemes.includes(activeCozyTheme.value)) {
      activeCozyTheme.value = 'honey-library'
      applyCozyThemeToDocument('honey-library')
    }

    // 6. Aksesori Terbuka: hanya Pita Pink ('pink-bow') & Buku Terbuka/Terbang ('open-book')
    const restoredAccessories: Exclude<MascotAccessoryId, 'none'>[] = ['open-book', 'pink-bow']
    ownedAccessories.value = restoredAccessories
    if (
      equippedAccessory.value !== 'none' &&
      !restoredAccessories.includes(equippedAccessory.value)
    ) {
      equippedAccessory.value = 'open-book'
    }
    if (
      mainCatAccessory.value !== 'none' &&
      !restoredAccessories.includes(mainCatAccessory.value)
    ) {
      mainCatAccessory.value = 'open-book'
    }
    if (
      miniCatAccessory.value !== 'none' &&
      !restoredAccessories.includes(miniCatAccessory.value)
    ) {
      miniCatAccessory.value = syncCatAccessories.value ? mainCatAccessory.value : 'pink-bow'
    }

    // 7. Karakter Kucing: hanya 2 kucing bawaan awal
    ownedCats.value = ['snowy-white', 'misty-tabby']
    mainCatType.value = 'snowy-white'
    miniCatType.value = 'misty-tabby'

    // Validasi kursor aktif sesuai tema yang terbuka
    if (!isCursorUnlocked(activeCursor.value)) {
      activeCursor.value = 'starlight-wand'
      isStarCursorEnabled.value = true
    }

    // Simpan segera ke localStorage
    persistAll(false)

    // Paksa unggah langsung ke Cloud Firestore (`users/{uid}`) jika sedang login Google
    let syncedToCloud = false
    if (firebaseUser.value) {
      syncedToCloud = await forceUploadSnapshotToFirestore(buildStateSnapshot())
    }

    playVictoryMelody()
    triggerMascotReaction(
      'celebrate',
      'Progresmu berhasil dipulihkan! 500 🐟, Lv. 15, 9 Kartu & Tema s/d Honey Library siap kembali~ 💖✨',
      5000,
    )
    showMiniToast(
      syncedToCloud
        ? '✅ Progres berhasil dipulihkan & langsung tersimpan ke Cloud Firestore (users/{uid})! ☁️✨'
        : firebaseUser.value
          ? '✅ Progres dipulihkan ke lokal! Klik Sinkronkan jika cloud masih tertunda.'
          : '✅ Progres dipulihkan ke localStorage! Login Google agar langsung tersinkron ke Cloud.',
    )

    return { ok: true, syncedToCloud }
  }

  return {
    // State utama
    theme,
    isDarkTheme,
    habits,
    customTimerDurations,
    timerDurationsVersion,
    ambientMixerSettings,
    ambientMixerVersion,
    weeklyProgress,
    todayFocusSessions,
    totalFocusSessions,
    todayFocusSeconds,
    dailyStreak,
    quickNotes,
    userName,
    activeCursor,
    isStarCursorEnabled,
    graphicsQuality,
    graphicsConfig,
    isBatterySaverMode,
    isVibrationEnabled,
    isZenMode,
    treatCoins,
    ownedAccessories,
    equippedAccessory,
    ownedCats,
    mainCatType,
    miniCatType,
    syncCatAccessories,
    mainCatAccessory,
    miniCatAccessory,
    ownedCozyThemes,
    activeCozyTheme,
    fullGoalStreak,
    fullGoalStreakRewardClaimedDate,
    collectedSecretCards,
    isSecretCardModalOpen,
    secretCardModalMode,
    lastDrawnCardResult,
    catAffinityLevel,
    catAffinityXp,
    catHeartChestXp,
    claimedLv10Reward,
    claimedLv20Reward,
    catAffinityPassiveFishBonus,
    neonCityCollectionProgress,
    catAffinityLevelUpMessage,
    dailyMood,
    dailyRewardClaimedDate,
    isDailyRewardClaimedToday,
    dailyRewardCardMessage,
    habitResetVersion,
    todayIndex,
    todayCompletionRate,
    completedHabitCount,
    isAllHabitsCompleted,
    isHydrated,

    // State interaksi
    isPomodoroRunning,
    isPomodoroPaused,
    activeTimerMode,
    activeTimerRemainingSeconds,
    isImmersiveZenOpen,
    isStudyCardModalOpen,
    isShortcutsModalOpen,
    isMobileDevice,
    twilightFocusIcon,
    isBgmPlaying,
    isRainAmbientOn,
    isMasterAudioMuted,
    masterAudioVolume,
    isReceiptModalOpen,
    isNotebookOpen,
    isAlarmOpen,
    isMiniGameOpen,
    pomodoroToggleSignal,
    pomodoroResetSignal,
    pomodoroModeSignal,
    bgmPlayToggleSignal,
    bgmMuteToggleSignal,
    catKeyboardInteractSignal,
    gameHighScore,
    fishingHighScore,
    gameDailyClaimCount,
    gameDailyPlayCount,
    catcherPlayCount,
    fishingPlayCount,
    catcherRewardCount,
    fishingRewardCount,
    gameDailyClaimDate,
    notebooks,
    alarms,
    selectedAlarmSound,
    activeAlarmBadge,
    cloudSyncStatus,
    cloudLastSyncedAt,
    firebaseUser,
    isFirebaseAuthReady,
    isFirebaseAuthBusy,
    firebaseSyncStatus,
    firebaseLastSyncedAt,
    firebaseErrorMessage,
    isBrowserOnline,
    currentMascotMood,
    mascotSpeech,
    celebrationCount,
    activeReminder,
    miniToastMessage,

    // Aksi
    setTheme,
    toggleDarkTheme,
    updateQuickNotes,
    setUserName,
    isCursorUnlocked,
    setActiveCursor,
    toggleStarCursor,
    setGraphicsQuality,
    cycleGraphicsQuality,
    toggleBatterySaverMode,
    toggleVibrationEnabled,
    triggerVibration,
    stopVibration,
    toggleZenMode,
    exitZenMode,
    setDailyMood,
    toggleSyncCatAccessories,
    buyOrEquipAccessory,
    buyOrEquipCatBreed,
    buyOrEquipCozyTheme,
    drawSecretCatCard,
    triggerAffinityRewardCardDrop,
    openSecretCardGacha,
    openSecretCardAlbum,
    feedPetCat,
    checkAndAutoResetDaily,
    loadFromStorage,
    exportBackupData,
    importBackupData,
    addHabit,
    duplicateHabit,
    updateHabitReminderTime,
    toggleHabit,
    toggleHabitType,
    toggleHabitAlarmMode,
    removeHabit,
    resetDailyHabits,
    setCustomTimerDuration,
    updateAmbientChannel,
    addCatAffinityXp,
    incrementFocusSession,
    triggerMascotReaction,
    triggerScheduleReminder,
    dismissReminder,
    completeActiveReminder,
    snoozeActiveReminder,
    dismissDailyRewardCard,
    createNotebookEntry,
    updateNotebookEntry,
    deleteNotebookEntry,
    addCountdownAlarm,
    addClockAlarm,
    removeAlarm,
    setAlarmSound,
    syncMiniGameDailyQuota,
    consumeMiniGamePlay,
    consumeMiniGamePlayFor,
    recordMiniGameResult,
    recordMiniGameRoundResult,
    triggerPomodoroShortcutToggle,
    triggerPomodoroReset,
    triggerPomodoroModeSwitch,
    triggerBgmPlayToggle,
    triggerBgmMuteToggle,
    triggerCatKeyboardInteract,
    showMiniToast,
    pushStateToCloud,
    signInWithGoogle,
    signOutGoogle,
    syncNowWithFirebase,
    restoreMyAccountProgress,
  }
}
