import { computed, onMounted, watch } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import { type AlarmSoundId, useSoundEffects } from '~/composables/useSoundEffects'

// Tipe tema warna website (disimpan di localStorage)
export type ThemeName = 'twilight' | 'sakura' | 'ocean'

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
    name: 'Sakura Dusk',
    dotClass: 'bg-gradient-to-br from-[#c026d3] via-[#f472b6] to-[#fda4af]',
    ringClass: 'ring-[#fda4af]',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
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

// Tipe aksesori kepala maskot kucing yang bisa ditukar dengan koin ikan kering (🐟)
export type MascotAccessoryId = 'none' | 'pink-bow' | 'witch-hat' | 'star-crown'

export interface AccessoryItem {
  id: Exclude<MascotAccessoryId, 'none'>
  name: string
  icon: string
  cost: number
}

export const MASCOT_ACCESSORIES: AccessoryItem[] = [
  { id: 'pink-bow', name: 'Pita Pink', icon: '🎀', cost: 20 },
  { id: 'witch-hat', name: 'Topi Penyihir', icon: '🧙', cost: 30 },
  { id: 'star-crown', name: 'Mahkota Bintang', icon: '👑', cost: 50 },
]

// Tipe 5 Tema Latar Belakang Beranimasi (Cozy Themes) di Toko Aksesori
export type CozyThemeId =
  | 'classic'
  | 'midnight-rain'
  | 'autumn-cafe'
  | 'sakura-lantern'
  | 'astral-palace'

export interface CozyThemeOption {
  id: CozyThemeId
  name: string
  icon: string
  cost: number | null // null = eksklusif hadiah 7-Day Full Goal Streak (tidak bisa dibeli koin)
  description: string
  swatchClass: string
  streakRequired?: number
}

export const ASTRAL_PALACE_STREAK_GOAL = 7
export const ASTRAL_PALACE_STREAK_FISH_REWARD = 15

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
    id: 'sakura-lantern',
    name: 'Sakura Lantern Festival',
    icon: '🌸',
    cost: 40,
    description: 'Langit ungu-magenta, kelopak sakura & lentera emas',
    swatchClass: 'bg-gradient-to-br from-[#3b124d] via-[#be3a7a] to-[#fde68a]',
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
]

interface CozyThemeRecord {
  owned: CozyThemeId[]
  active: CozyThemeId
}

interface FullGoalStreakRecord {
  count: number
  lastFullDate: string
  lastRewardClaimedDate?: string
}

// --- Tipe & Kolam 18 Kartu Gacha "💌 Pesan Rahasia Kucing" (2 🐟 / tarik) ---
export type SecretCardCategoryId = 'encourage' | 'fact' | 'dad-joke'

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
  drawId: number
}

export const SECRET_CARD_GACHA_COST = 2

export const SECRET_CARD_CATEGORIES: Record<SecretCardCategoryId, SecretCardCategoryMeta> = {
  encourage: {
    id: 'encourage',
    label: 'Kutipan Penyemangat Spesial',
    shortLabel: 'Penyemangat',
    icon: '💖',
    badgeClass: 'border-pink-300/60 bg-pink-400/25 text-pink-100',
  },
  fact: {
    id: 'fact',
    label: 'Fakta Lucu Kucing',
    shortLabel: 'Fakta Kucing',
    icon: '🐾',
    badgeClass: 'border-sky-300/60 bg-sky-400/25 text-sky-100',
  },
  'dad-joke': {
    id: 'dad-joke',
    label: 'Jokes Bapak-Bapak Garing',
    shortLabel: 'Jokes Garing',
    icon: '🤣',
    badgeClass: 'border-amber-300/60 bg-amber-400/25 text-amber-100',
  },
}

export const SECRET_CAT_CARDS: SecretCatCard[] = [
  // Kategori 1: 💖 Kutipan Penyemangat Spesial (6 Kartu)
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

  // Kategori 2: 🐾 Fakta Lucu Kucing (6 Kartu)
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
    name: 'Sidik Hidung Unik',
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
    name: 'Frekuensi Dengkuran Penyembuh',
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

  // Kategori 3: 🤣 Jokes Bapak-Bapak Garing (6 Kartu)
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
]

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

function isValidCozyThemeId(val: unknown): val is CozyThemeId {
  return (
    val === 'classic' ||
    val === 'midnight-rain' ||
    val === 'autumn-cafe' ||
    val === 'sakura-lantern' ||
    val === 'astral-palace'
  )
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
  HABITS: 'twilights_habits',
  TIMER_DURATIONS: 'twilights_timer_durations_v1',
  AMBIENT_MIXER: 'twilights_ambient_mixer_v1',
  WEEKLY_PROGRESS: 'twilight_star_weekly_progress_v1',
  FOCUS_SESSIONS: 'twilight_star_focus_sessions_v1',
  LAST_ACTIVE_DATE: 'twilights_habits_last_date',
  QUICK_NOTES: 'twilights_quick_notes_v1',
  STREAK: 'twilights_streak_v1',
  STAR_CURSOR: 'twilights_star_cursor_v1',
  TREATS: 'twilights_treats_v1',
  COZY_THEMES: 'twilights_cozy_themes_v1',
  FULL_GOAL_STREAK: 'twilights_full_goal_streak_v1',
  SECRET_CARDS: 'twilights_secret_cards_v1',
  CAT_AFFINITY: 'twilights_cat_affinity_v1',
  DAILY_MOOD: 'twilights_daily_mood_v1',
  USER_NAME: 'twilights_user_name_v1',
  BATTERY_SAVER: 'twilights_battery_saver_v1',
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

interface GameDailyClaimRecord {
  date: string
  count: number
}

export const MAX_GAME_DAILY_REWARDS = 3
export const CAT_AFFINITY_MAX_LEVEL = 10
export const CAT_AFFINITY_XP_PER_LEVEL = 10
export const CAT_AFFINITY_LEVELUP_FISH_REWARD = 2

interface CatAffinityRecord {
  level: number
  xp: number
}

function sanitizeCatAffinity(raw: unknown): CatAffinityRecord {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<CatAffinityRecord>
  const level = Math.max(1, Math.min(CAT_AFFINITY_MAX_LEVEL, Math.floor(Number(obj.level) || 1)))
  const xp =
    level >= CAT_AFFINITY_MAX_LEVEL
      ? CAT_AFFINITY_XP_PER_LEVEL
      : Math.max(0, Math.min(CAT_AFFINITY_XP_PER_LEVEL - 1, Math.floor(Number(obj.xp) || 0)))
  return { level, xp }
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

  // --- Data tersimpan di localStorage ---
  const theme = useState<ThemeName>('twilights-theme', () => 'twilight')
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
  const isStarCursorEnabled = useState<boolean>('twilights-star-cursor', () => true)
  const isBatterySaverMode = useState<boolean>('twilights-battery-saver', () => false)
  const isZenMode = useState<boolean>('twilights-zen-mode', () => false)
  // Hadiah selamat datang 5 🐟 untuk pengguna baru (data pengguna lama di localStorage tetap dipertahankan)
  const treatCoins = useState<number>('twilights-treat-coins', () => 5)
  const ownedAccessories = useState<MascotAccessoryId[]>('twilights-owned-accessories', () => [])
  const equippedAccessory = useState<MascotAccessoryId>('twilights-equipped-accessory', () => 'none')
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
  // Level & poin XP Bilah Kasih Sayang Kucing (Lv. 1 .. Lv. 10 MAX, +2 🐟 setiap naik level)
  const catAffinityLevel = useState<number>('twilights-cat-affinity-level', () => 1)
  const catAffinityXp = useState<number>('twilights-cat-affinity-xp', () => 0)
  const catAffinityLevelUpMessage = useState<string>('twilights-cat-affinity-levelup', () => '')
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
  const gameDailyClaimCount = useState<number>('twilights-game-daily-claims', () => 0)
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

  /** Terapkan atribut data-theme ke elemen <html> agar variabel CSS aktif */
  function applyThemeToDocument(themeId: ThemeName) {
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-theme', themeId)
  }

  /** Terapkan atribut data-cozy-theme ke elemen <html> (termasuk aksen glow kristal emas Astral Palace) */
  function applyCozyThemeToDocument(cozyId: CozyThemeId) {
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-cozy-theme', cozyId)
  }

  /** Terapkan class mode hemat baterai (reduce motion) pada <html> */
  function applyBatterySaverClass(enabled: boolean) {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('battery-saver-mode', enabled)
  }

  /** Simpan seluruh data penting ke localStorage secara aman */
  function persistAll(syncCloud = true) {
    if (!import.meta.client) return

    try {
      const todayStr = getTodayDateString()
      localStorage.setItem(STORAGE_KEYS.THEME, theme.value)
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
      localStorage.setItem(STORAGE_KEYS.BATTERY_SAVER, String(isBatterySaverMode.value))

      const treatData: TreatRecord = {
        coins: treatCoins.value,
        owned: ownedAccessories.value,
        equipped: equippedAccessory.value,
      }
      localStorage.setItem(STORAGE_KEYS.TREATS, JSON.stringify(treatData))

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
        count: gameDailyClaimCount.value,
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

    // Jadwalkan sinkronisasi otomatis (debounce 700ms) ke TiDB Cloud di latar belakang
    if (syncCloud && isHydrated.value) {
      scheduleCloudSync()
    }
  }

  /** Kumpulkan snapshot seluruh data untuk dikirim ke TiDB Cloud */
  function buildStateSnapshot() {
    return {
      userName: userName.value,
      theme: theme.value,
      habits: habits.value,
      weeklyProgress: weeklyProgress.value,
      todayFocusSessions: todayFocusSessions.value,
      totalFocusSessions: totalFocusSessions.value,
      todayFocusSeconds: todayFocusSeconds.value,
      dailyStreak: dailyStreak.value,
      streakLastDate: streakLastDate.value,
      treatCoins: treatCoins.value,
      ownedAccessories: ownedAccessories.value,
      equippedAccessory: equippedAccessory.value,
      ownedCozyThemes: ownedCozyThemes.value,
      activeCozyTheme: activeCozyTheme.value,
      fullGoalStreak: fullGoalStreak.value,
      fullGoalStreakLastDate: fullGoalStreakLastDate.value,
      fullGoalStreakRewardClaimedDate: fullGoalStreakRewardClaimedDate.value,
      collectedSecretCards: collectedSecretCards.value,
      ambientMixerSettings: ambientMixerSettings.value,
      quickNotes: quickNotes.value,
      dailyMood: dailyMood.value,
      dailyRewardClaimedDate: dailyRewardClaimedDate.value,
      twilights_notebooks: notebooks.value,
      twilights_alarms: alarms.value,
      selectedAlarmSound: selectedAlarmSound.value,
      isStarCursorEnabled: isStarCursorEnabled.value,
      isBatterySaverMode: isBatterySaverMode.value,
      lastActiveDate: getTodayDateString(),
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

  /** Helper internal untuk menerapkan payload dari TiDB Cloud ke state lokal */
  function applyImportedDataSilently(d: Record<string, unknown>) {
    if (typeof d.userName === 'string' && d.userName.trim()) {
      userName.value = d.userName.trim()
    }
    if (d.theme === 'twilight' || d.theme === 'sakura' || d.theme === 'ocean') {
      theme.value = d.theme
      applyThemeToDocument(d.theme)
    }
    if (Array.isArray(d.habits)) {
      habits.value = d.habits
        .filter((item): item is HabitItem => Boolean(item) && typeof item === 'object' && typeof (item as HabitItem).title === 'string')
        .map((item, idx) => normalizeHabitItem(item, `cloud-h-${idx}`))
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
      ownedAccessories.value = d.ownedAccessories.filter(
        (id): id is MascotAccessoryId => id === 'pink-bow' || id === 'witch-hat' || id === 'star-crown',
      )
    }
    if (
      d.equippedAccessory === 'none' ||
      d.equippedAccessory === 'pink-bow' ||
      d.equippedAccessory === 'witch-hat' ||
      d.equippedAccessory === 'star-crown'
    ) {
      equippedAccessory.value = d.equippedAccessory
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
    const cloudCards = d.twilights_secret_cards ?? d.collectedSecretCards
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
    if (typeof d.isStarCursorEnabled === 'boolean') isStarCursorEnabled.value = d.isStarCursorEnabled
    if (typeof d.isBatterySaverMode === 'boolean') {
      isBatterySaverMode.value = d.isBatterySaverMode
      applyBatterySaverClass(d.isBatterySaverMode)
    }

    try {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits.value))
      localStorage.setItem(STORAGE_KEYS.WEEKLY_PROGRESS, JSON.stringify(weeklyProgress.value))
      localStorage.setItem(STORAGE_KEYS.NOTEBOOKS, JSON.stringify(notebooks.value))
      localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms.value))
      localStorage.setItem(STORAGE_KEYS.USER_NAME, userName.value)
      localStorage.setItem(STORAGE_KEYS.THEME, theme.value)
      if (typeof d.lastActiveDate === 'string' && d.lastActiveDate) {
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, d.lastActiveDate)
      }
    } catch {
      // Abaikan jika localStorage terbatas
    }
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

  /**
   * Catat hasil ronde Kawaii Mini-Game ("Starlight & Fish Catcher"):
   * - Simpan rekor tertinggi ke localStorage (`twilights_game_highscore`)
   * - Jika skor >= 100 dan klaim hari ini < 3: beri hadiah +2 Ikan Kering (🐟)
   */
  function recordMiniGameResult(score: number): {
    isNewRecord: boolean
    coinsAwarded: number
    claimsUsed: number
    maxClaims: number
  } {
    const cleanScore = Math.max(0, Math.round(score))
    const todayStr = getTodayDateString()

    // Reset otomatis kuota harian jika tanggal sudah berganti
    if (gameDailyClaimDate.value !== todayStr) {
      gameDailyClaimDate.value = todayStr
      gameDailyClaimCount.value = 0
    }

    let isNewRecord = false
    if (cleanScore > gameHighScore.value) {
      gameHighScore.value = cleanScore
      isNewRecord = true
    }

    let coinsAwarded = 0
    if (cleanScore >= 100 && gameDailyClaimCount.value < MAX_GAME_DAILY_REWARDS) {
      coinsAwarded = 2
      treatCoins.value += coinsAwarded
      gameDailyClaimCount.value += 1
      playVictoryMelody()
      showMiniToast(
        `Hore! Skor ${cleanScore} di Break Game! Hadiah +2 🐟 (${gameDailyClaimCount.value}/${MAX_GAME_DAILY_REWARDS}) ✨`,
      )
      triggerMascotReaction('happy', 'Seru banget mainnya! Ini +2 🐟 buatmu~ 🎮💖', 3200)
    }

    persistAll()

    return {
      isNewRecord,
      coinsAwarded,
      claimsUsed: gameDailyClaimCount.value,
      maxClaims: MAX_GAME_DAILY_REWARDS,
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

      const celebrationMsg = unlockedAstralNow
        ? '🎉 Luar Biasa! 7-Day Full Goal Streak Tercapai! Hadiah +15 🐟 & Tema 👑 Astral Crystal Palace terbuka!'
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
    applyThemeToDocument(newTheme)
    persistAll()

    const themeGreeting: Record<ThemeName, string> = {
      twilight: 'Suasana Twilight Purple yang syahdu~ 💜',
      sakura: 'Nuansa Sakura Dusk yang hangat! 🌸',
      ocean: 'Tenangnya Deep Ocean malam ini~ 🌊',
    }
    triggerMascotReaction('happy', themeGreeting[newTheme], 2800)
  }

  /** Perbarui isi catatan cepat & simpan otomatis */
  function updateQuickNotes(value: string) {
    quickNotes.value = value
    persistAll()
  }

  /** Nyalakan atau matikan kursor bintang kustom & simpan ke localStorage */
  function toggleStarCursor() {
    isStarCursorEnabled.value = !isStarCursorEnabled.value
    persistAll()
  }

  /** Nyalakan atau matikan Mode Hemat Baterai (menjeda animasi partikel latar belakang) */
  function toggleBatterySaverMode() {
    isBatterySaverMode.value = !isBatterySaverMode.value
    applyBatterySaverClass(isBatterySaverMode.value)
    persistAll()
    showMiniToast(
      isBatterySaverMode.value
        ? 'Mode Hemat Baterai aktif 🍃 Animasi latar dijeda'
        : 'Mode Hemat Baterai mati ✨ Animasi langit kembali menyala',
    )
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
        ownedAccessories: ownedAccessories.value,
        equippedAccessory: equippedAccessory.value,
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
        twilights_cat_affinity: {
          level: catAffinityLevel.value,
          xp: catAffinityXp.value,
        },
        quickNotes: quickNotes.value,
        dailyMood: dailyMood.value,
        dailyRewardClaimedDate: dailyRewardClaimedDate.value,
        twilights_notebooks: notebooks.value,
        twilights_alarms: alarms.value,
        selectedAlarmSound: selectedAlarmSound.value,
        twilights_game_highscore: gameHighScore.value,
        isStarCursorEnabled: isStarCursorEnabled.value,
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
      if (d.theme === 'twilight' || d.theme === 'sakura' || d.theme === 'ocean') {
        theme.value = d.theme
        applyThemeToDocument(d.theme)
      }
      if (Array.isArray(d.habits)) {
        habits.value = d.habits
          .filter(
            (item): item is HabitItem =>
              Boolean(item) &&
              typeof item === 'object' &&
              typeof (item as HabitItem).title === 'string',
          )
          .map((item, idx) => normalizeHabitItem(item, `restored-${Date.now()}-${idx}`))
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
      // Pulihkan Level & Poin Kasih Sayang Kucing
      const importedAffinity = d.twilights_cat_affinity ?? d.catAffinity
      if (importedAffinity && typeof importedAffinity === 'object') {
        const cleanAffinity = sanitizeCatAffinity(importedAffinity)
        catAffinityLevel.value = cleanAffinity.level
        catAffinityXp.value = cleanAffinity.xp
      }
      if (Array.isArray(d.ownedAccessories)) {
        ownedAccessories.value = d.ownedAccessories.filter(
          (id): id is MascotAccessoryId =>
            id === 'pink-bow' || id === 'witch-hat' || id === 'star-crown',
        )
      }
      if (
        d.equippedAccessory === 'none' ||
        d.equippedAccessory === 'pink-bow' ||
        d.equippedAccessory === 'witch-hat' ||
        d.equippedAccessory === 'star-crown'
      ) {
        equippedAccessory.value = d.equippedAccessory
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
      const importedSecretCards = d.twilights_secret_cards ?? d.collectedSecretCards
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
      if (typeof d.isStarCursorEnabled === 'boolean') {
        isStarCursorEnabled.value = d.isStarCursorEnabled
      }
      if (typeof d.isBatterySaverMode === 'boolean') {
        isBatterySaverMode.value = d.isBatterySaverMode
        applyBatterySaverClass(d.isBatterySaverMode)
      }

      habitResetVersion.value += 1
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
   * Sistem Koin Hadiah & Aksesori Maskot:
   * - Jika aksesori sudah dimiliki: pasang / lepas langsung.
   * - Jika belum dimiliki dan koin cukup: tukar koin 🐟 lalu pasang langsung!
   */
  function buyOrEquipAccessory(accessoryId: MascotAccessoryId): { ok: boolean; message: string } {
    if (accessoryId === 'none') {
      equippedAccessory.value = 'none'
      persistAll()
      return { ok: true, message: 'Aksesori dilepas~' }
    }

    const item = MASCOT_ACCESSORIES.find(a => a.id === accessoryId)
    if (!item) return { ok: false, message: 'Aksesori tidak ditemukan.' }

    // Jika sudah dimiliki, cukup pasang atau lepas
    if (ownedAccessories.value.includes(accessoryId)) {
      const nextEquipped = equippedAccessory.value === accessoryId ? 'none' : accessoryId
      equippedAccessory.value = nextEquipped
      persistAll()
      if (nextEquipped !== 'none') {
        playPopTing()
        triggerMascotReaction('happy', `Yay! Aku pakai ${item.name} ${item.icon}`, 2800)
      }
      return {
        ok: true,
        message: nextEquipped === 'none' ? `${item.name} dilepas` : `${item.name} dipasang!`,
      }
    }

    // Jika belum dimiliki, cek apakah koin 🐟 cukup
    if (treatCoins.value < item.cost) {
      return {
        ok: false,
        message: `Butuh ${item.cost} 🐟 (kurang ${item.cost - treatCoins.value} 🐟 lagi!)`,
      }
    }

    // Tukar koin dan langsung pasang aksesori di kepala maskot!
    treatCoins.value -= item.cost
    ownedAccessories.value = [...ownedAccessories.value, accessoryId]
    equippedAccessory.value = accessoryId
    persistAll()

    playVictoryMelody()
    triggerMascotReaction('celebrate', `Makasih! ${item.name} ini lucu banget! ${item.icon}✨`, 3800)
    showMiniToast(`Berhasil menukar ${item.name} ${item.icon}!`)
    return { ok: true, message: `${item.name} berhasil dibuka & dipakai!` }
  }

  /**
   * Toko Tema Latar Belakang Beranimasi (Cozy Themes):
   * - Twilight Klasik selalu terbuka (default).
   * - Midnight Rainy Window (20 🐟), Cozy Autumn Cafe (30 🐟), Sakura Lantern Festival (40 🐟): beli pakai koin lalu langsung dipakai.
   * - Astral Crystal Palace: tidak dijual, hanya terbuka setelah 7-Day Full Goal Streak (100% Daily Habit Tracker 7 hari beruntun).
   */
  function buyOrEquipCozyTheme(cozyId: CozyThemeId): { ok: boolean; message: string } {
    const item = COZY_THEMES.find(t => t.id === cozyId)
    if (!item) return { ok: false, message: 'Tema latar tidak ditemukan.' }

    const isUnlocked =
      ownedCozyThemes.value.includes(cozyId) ||
      (cozyId === 'astral-palace' && fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL)

    if (cozyId === 'astral-palace' && !isUnlocked) {
      const progress = Math.min(fullGoalStreak.value, ASTRAL_PALACE_STREAK_GOAL)
      return {
        ok: false,
        message: `🔒 Selesaikan semua goal 7 hari penuh (Progres: ${progress}/${ASTRAL_PALACE_STREAK_GOAL} hari)`,
      }
    }

    const themeReactions: Record<CozyThemeId, string> = {
      classic: 'Kembali ke suasana Twilight Klasik yang hangat~ 💜✨',
      'midnight-rain': 'Rintik hujan malam & lampu kota blur bikin fokus makin tenang~ 🌧️✨',
      'autumn-cafe': 'Aroma kopi & daun gugur musim gugur yang cozy banget~ 🍂☕',
      'sakura-lantern': 'Indahnya kelopak sakura & lentera malam berkilau~ 🌸🏮',
      'astral-palace': 'Megahnya Aurora Borealis di Istana Kristal Astral! 👑✨',
    }

    if (isUnlocked) {
      if (!ownedCozyThemes.value.includes(cozyId)) {
        ownedCozyThemes.value = [...ownedCozyThemes.value, cozyId]
      }
      activeCozyTheme.value = cozyId
      applyCozyThemeToDocument(cozyId)
      persistAll()
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
    persistAll()

    playVictoryMelody()
    triggerMascotReaction('celebrate', themeReactions[cozyId], 4200)
    showMiniToast(`Tema ${item.name} ${item.icon} berhasil dibeli & dipakai! ✨`)
    return { ok: true, message: `${item.name} berhasil dibeli & dipakai!` }
  }

  /**
   * Gacha Kartu "💌 Pesan Rahasia Kucing" (Biaya: 2 🐟):
   * - Selama koleksi < 18/18: prioritaskan mengacak kartu yang belum dikoleksi (label ✨ BARU!).
   * - Jika seluruh 18/18 kartu sudah terkoleksi: acak dari 18 kartu & beri bonus +1 💖 Kasih Sayang Kucing (label ♻️ Duplikat (+1 💖)).
   */
  function drawSecretCatCard(): { ok: boolean; message: string; result?: SecretCardDrawResult } {
    if (treatCoins.value < SECRET_CARD_GACHA_COST) {
      const msg = 'Koin ikan belum cukup, yuk fokus lagi~ 🐟'
      showMiniToast(msg)
      return { ok: false, message: msg }
    }

    treatCoins.value -= SECRET_CARD_GACHA_COST

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
          'Yeay! Semua 18/18 Kartu Rahasia Kucing berhasil kamu koleksi! 💌✨',
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
      // 1. Muat tema warna
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeName | null
      if (savedTheme === 'twilight' || savedTheme === 'sakura' || savedTheme === 'ocean') {
        theme.value = savedTheme
      }
      applyThemeToDocument(theme.value)

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
            ? parsedHabits
                .filter((item): item is Partial<HabitItem> => Boolean(item) && typeof item === 'object')
                .map((item, idx) => normalizeHabitItem(item, `habit-local-${idx}`))
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

      // 7. Muat preferensi Kursor Bintang Kustom
      const savedStarCursor = localStorage.getItem(STORAGE_KEYS.STAR_CURSOR)
      if (savedStarCursor === 'true' || savedStarCursor === 'false') {
        isStarCursorEnabled.value = savedStarCursor === 'true'
      }

      // 8. Muat Koin Hadiah (🐟), Aksesori Maskot & Kasih Sayang Kucing
      const savedTreats = localStorage.getItem(STORAGE_KEYS.TREATS)
      if (savedTreats) {
        const parsedTreats = JSON.parse(savedTreats) as Partial<TreatRecord>
        treatCoins.value = Math.max(0, Number(parsedTreats.coins) || 0)
        if (Array.isArray(parsedTreats.owned)) {
          ownedAccessories.value = parsedTreats.owned
        }
        if (parsedTreats.equipped) {
          equippedAccessory.value = parsedTreats.equipped
        }
      }
      const savedAffinity = localStorage.getItem(STORAGE_KEYS.CAT_AFFINITY)
      if (savedAffinity) {
        const cleanAffinity = sanitizeCatAffinity(JSON.parse(savedAffinity))
        catAffinityLevel.value = cleanAffinity.level
        catAffinityXp.value = cleanAffinity.xp
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

      // 11. Muat preferensi Mode Hemat Baterai (Reduce Motion)
      const savedBattery = localStorage.getItem(STORAGE_KEYS.BATTERY_SAVER)
      if (savedBattery === 'true' || savedBattery === 'false') {
        isBatterySaverMode.value = savedBattery === 'true'
      }
      applyBatterySaverClass(isBatterySaverMode.value)

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

      // 15. Muat High Score & jatah hadiah harian Kawaii Mini-Game (maks 3x/hari)
      const savedHighScore = localStorage.getItem(STORAGE_KEYS.GAME_HIGHSCORE)
      if (savedHighScore) {
        gameHighScore.value = Math.max(0, Number(savedHighScore) || 0)
      }
      const savedGameClaims = localStorage.getItem(STORAGE_KEYS.GAME_DAILY_CLAIMS)
      if (savedGameClaims) {
        const parsedClaims = JSON.parse(savedGameClaims) as Partial<GameDailyClaimRecord>
        if (parsedClaims.date === todayStr) {
          gameDailyClaimDate.value = todayStr
          gameDailyClaimCount.value = Math.max(
            0,
            Math.min(MAX_GAME_DAILY_REWARDS, Number(parsedClaims.count) || 0),
          )
        } else {
          gameDailyClaimDate.value = todayStr
          gameDailyClaimCount.value = 0
        }
      } else {
        gameDailyClaimDate.value = todayStr
        gameDailyClaimCount.value = 0
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

      // Sinkronkan batang hari ini di grafik
      const syncedWeekly = [...weeklyProgress.value]
      syncedWeekly[todayIndex.value] = todayCompletionRate.value
      weeklyProgress.value = syncedWeekly

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

  /** Hentikan bunyi alarm pengingat habit yang sedang berdering */
  function stopHabitAlarmSound() {
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
    habits.value = [...habits.value, newHabit]
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
    habits.value = nextList

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

    habits.value = habits.value.map(item =>
      item.id === id ? { ...item, completed: nextCompletedState } : item,
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
   * Tambah poin XP Bilah Kasih Sayang Kucing (maks Lv. 10):
   * - 'pet'   : +1 XP tiap ~1.5 detik elusan nyaman
   * - 'click' : +1 XP per klik semangat (cooldown 2 detik anti-spam)
   * - 'focus' : +5 XP setiap menyelesaikan 1 sesi timer fokus penuh
   * Setiap naik level (10 XP/level) otomatis memberi hadiah +2 🐟 ke saldo ikan & toast perayaan!
   */
  function addCatAffinityXp(amount: number, source: 'pet' | 'click' | 'focus' | 'gacha'): boolean {
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

    if (catAffinityLevel.value >= CAT_AFFINITY_MAX_LEVEL) {
      catAffinityLevel.value = CAT_AFFINITY_MAX_LEVEL
      catAffinityXp.value = CAT_AFFINITY_XP_PER_LEVEL
      return false
    }

    let nextXp = catAffinityXp.value + cleanAmount
    let nextLevel = catAffinityLevel.value
    let levelsGained = 0

    while (nextXp >= CAT_AFFINITY_XP_PER_LEVEL && nextLevel < CAT_AFFINITY_MAX_LEVEL) {
      nextXp -= CAT_AFFINITY_XP_PER_LEVEL
      nextLevel += 1
      levelsGained += 1
    }

    catAffinityLevel.value = nextLevel
    catAffinityXp.value = nextLevel >= CAT_AFFINITY_MAX_LEVEL ? CAT_AFFINITY_XP_PER_LEVEL : nextXp

    if (levelsGained > 0) {
      const bonusFish = levelsGained * CAT_AFFINITY_LEVELUP_FISH_REWARD
      treatCoins.value += bonusFish
      const celebrationMsg = `🎉 Level Up! Lv. ${nextLevel} — Hadiah +${bonusFish} 🐟 diterima!`
      catAffinityLevelUpMessage.value = celebrationMsg

      if (catAffinityToastTimer) clearTimeout(catAffinityToastTimer)
      catAffinityToastTimer = setTimeout(() => {
        catAffinityLevelUpMessage.value = ''
      }, 4200)

      playVictoryMelody()
      showMiniToast(celebrationMsg)
      triggerMascotReaction(
        'celebrate',
        nextLevel >= CAT_AFFINITY_MAX_LEVEL
          ? `Yeay! Kasih sayang kita MAX (Lv. 10 ✨)! +${bonusFish} 🐟 buatmu~ 💖`
          : `Yeay! Kita naik ke Lv. ${nextLevel}! Ini +${bonusFish} 🐟 buatmu~ 💖`,
        4200,
      )
    }

    persistAll()
    return true
  }

  /** Tambah 1 sesi fokus, total detik fokus hari ini, hadiah +10 🐟, & +5 XP Kasih Sayang Kucing */
  function incrementFocusSession(durationSeconds?: number) {
    const addedSeconds =
      typeof durationSeconds === 'number' && durationSeconds > 0
        ? Math.floor(durationSeconds)
        : customTimerDurations.value.focus
    todayFocusSessions.value += 1
    totalFocusSessions.value += 1
    todayFocusSeconds.value += addedSeconds
    treatCoins.value += 10
    persistAll()
    showMiniToast('1 sesi fokus selesai! +10 🐟 & +5 💖✨')
    triggerMascotReaction('celebrate', 'Keren! 1 sesi fokus tuntas! +10 🐟🎉', 4200)
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

    // 1. Kirim Pop-Up Notifikasi Sistem (Windows Action Center & Heads-Up Notification HP)
    void kirimNotifikasiSistem(
      "⏰ Twilight's — Pengingat Target",
      `Waktunya: ${reminder.habitTitle} (${reminder.time})`,
      reminder.alarmMode === 'repeat',
      reminder.id,
    )

    // 2. Kedipkan judul tab browser tiap 1 detik selama alarm belum dimatikan/ditandai selesai
    startTabTitleBlink(reminder.habitTitle)

    // 3. Bunyikan suara Web Audio API (1x atau berulang tiap ~3 detik, aman berhenti otomatis 2 menit)
    if (reminder.alarmMode === 'repeat') {
      playAlarmMelody(selectedAlarmSound.value)
      habitAlarmRepeatInterval = setInterval(() => {
        if (!activeReminder.value || activeReminder.value.id !== reminder.id) {
          stopHabitAlarmSound()
          return
        }
        playAlarmMelody(selectedAlarmSound.value)
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

  // Sinkronkan tema ketika berubah
  watch(theme, (val) => {
    applyThemeToDocument(val)
  })
  watch(activeCozyTheme, (val) => {
    applyCozyThemeToDocument(val)
  })

  // Muat data localStorage secara aman lalu sinkronkan dengan TiDB Cloud
  onMounted(() => {
    loadFromStorage()
    hydrateFromCloud()
  })

  return {
    // State utama
    theme,
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
    isStarCursorEnabled,
    isBatterySaverMode,
    isZenMode,
    treatCoins,
    ownedAccessories,
    equippedAccessory,
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
    gameDailyClaimCount,
    notebooks,
    alarms,
    selectedAlarmSound,
    activeAlarmBadge,
    cloudSyncStatus,
    cloudLastSyncedAt,
    currentMascotMood,
    mascotSpeech,
    celebrationCount,
    activeReminder,
    miniToastMessage,

    // Aksi
    setTheme,
    updateQuickNotes,
    setUserName,
    toggleStarCursor,
    toggleBatterySaverMode,
    toggleZenMode,
    exitZenMode,
    setDailyMood,
    buyOrEquipAccessory,
    buyOrEquipCozyTheme,
    drawSecretCatCard,
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
    recordMiniGameResult,
    triggerPomodoroShortcutToggle,
    triggerPomodoroReset,
    triggerPomodoroModeSwitch,
    triggerBgmPlayToggle,
    triggerBgmMuteToggle,
    triggerCatKeyboardInteract,
    showMiniToast,
    pushStateToCloud,
  }
}
