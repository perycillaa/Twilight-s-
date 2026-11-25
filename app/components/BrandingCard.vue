<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CAT_AFFINITY_MAX_LEVEL,
  CAT_AFFINITY_MILESTONE_LV10,
  HEART_CHEST_FISH_REWARD,
  HEART_CHEST_XP_GOAL,
  SECRET_CARD_GACHA_COST,
  SECRET_CAT_CARDS,
  getCatAffinityXpNeeded,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Ambil statistik sesi fokus, persentase habit, streak, koin, kasih sayang kucing, gacha kartu & Starlight Focus ✨
const {
  todayFocusSessions,
  todayCompletionRate,
  dailyStreak,
  treatCoins,
  collectedSecretCards,
  catAffinityLevel,
  catAffinityXp,
  catHeartChestXp,
  catAffinityPassiveFishBonus,
  catAffinityLevelUpMessage,
  isZenMode,
  isStudyCardModalOpen,
  openSecretCardGacha,
  openSecretCardAlbum,
} = useTwilightStorage()

// Tab mini ringkas di bagian bawah Kolom Kiri agar tinggi 3 kolom sejajar rapi
const activeLeftTab = ref<'notes' | 'accessories'>('notes')

// Daftar Kutipan Inspiratif Harian (Daily Spark Quote) yang bisa di-shuffle saat diklik
const DAILY_SPARK_QUOTES = [
  'Langkah kecil hari ini adalah lompatan besar esok hari 🚀',
  'Fokus pada progres, bukan kesempurnaan ✨',
  'Ide brilian lahir dari pikiran yang tenang 💡',
  'Satu sesi Pomodoro lagi menuju targetmu! 🎯',
  'Jangan terburu-buru, bunga pun mekar pada waktunya 🌸',
  'Konsistensi kecil setiap hari menciptakan keajaiban 🌟',
]

const quoteIndex = ref<number>(0)
const currentQuote = computed(() => DAILY_SPARK_QUOTES[quoteIndex.value] ?? DAILY_SPARK_QUOTES[0]!)

function shuffleQuote() {
  quoteIndex.value = (quoteIndex.value + 1) % DAILY_SPARK_QUOTES.length
}

// --- Widget 1: Jam & Suasana Langit (Twilight Clock & Sky Pill) ---
const currentClockHHMM = ref<string>('--:--')
const currentHour = ref<number>(20)
let skyClockInterval: ReturnType<typeof setInterval> | null = null

function updateSkyClock() {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  currentHour.value = h
  currentClockHHMM.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const skyPhaseInfo = computed<{ icon: string; greeting: string }>(() => {
  const h = currentHour.value
  if (h >= 5 && h < 11) {
    return { icon: '🌅', greeting: 'Selamat Pagi, Semangat!' }
  }
  if (h >= 11 && h < 15) {
    return { icon: '☀️', greeting: 'Siang Cerah, Tetap Fokus~' }
  }
  if (h >= 15 && h < 18) {
    return { icon: '🌇', greeting: 'Senja Tiba, Teruskan Langkahmu✨' }
  }
  return { icon: '🌙', greeting: 'Malam Tenang, Waktunya Lo-Fi' }
})

// --- Widget 2: Bilah Kasih Sayang Kucing (Lv. 1 -> Lv. 20 MAX ✨ + Peti Cinta 0/10) ---
const isMaxAffinity = computed<boolean>(() => catAffinityLevel.value >= CAT_AFFINITY_MAX_LEVEL)
const currentLevelXpNeeded = computed<number>(() => getCatAffinityXpNeeded(catAffinityLevel.value))
const affinityProgressPercent = computed<number>(() => {
  if (isMaxAffinity.value) {
    return Math.max(0, Math.min(100, Math.round((catHeartChestXp.value / HEART_CHEST_XP_GOAL) * 100)))
  }
  return Math.max(
    0,
    Math.min(100, Math.round((catAffinityXp.value / currentLevelXpNeeded.value) * 100)),
  )
})
const nextMilestoneHint = computed<string>(() => {
  if (catAffinityLevel.value < CAT_AFFINITY_MILESTONE_LV10) {
    return 'Lv. 10: +20🐟 & Kalung'
  }
  return 'Lv. 20: +40🐟 & Sayap'
})

onMounted(() => {
  updateSkyClock()
  skyClockInterval = setInterval(updateSkyClock, 10000)
})

onUnmounted(() => {
  if (skyClockInterval) clearInterval(skyClockInterval)
})
</script>

<template>
  <!-- Kolom Kiri: Branding Twilight's, Kutipan Harian, Maskot Interaktif, Statistik & Kartu Tab Mini -->
  <aside
    class="glass-card relative flex h-full flex-col items-center justify-between gap-3.5 overflow-hidden p-5 text-center sm:p-6"
  >
    <!-- Cahaya dekorasi lembut di atas kartu -->
    <div
      aria-hidden="true"
      class="cozy-glow-orb pointer-events-none absolute -top-12 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-pink-300/20 blur-2xl"
    />

    <!-- 1. Judul Utama "Twilight's", Slogan & Daily Spark Quote -->
    <div class="relative z-10 w-full">
      <h1
        class="twilight-title-glow font-display text-4xl font-bold tracking-wide text-[#f9a8d4] sm:text-[2.75rem]"
      >
        Twilight's
      </h1>

      <p class="mt-0.5 text-sm font-semibold text-pink-100/90">
        Cheer your day with me!
      </p>

      <div class="mt-1.5 flex items-center justify-center gap-2 text-pink-200/75">
        <span class="cozy-divider-left h-[1.5px] w-10 rounded-full bg-gradient-to-r from-transparent to-pink-300/70" />
        <span class="cozy-sparkle text-xs">✦</span>
        <span class="cozy-divider-right h-[1.5px] w-10 rounded-full bg-gradient-to-l from-transparent to-pink-300/70" />
      </div>

      <!-- Daily Spark Quote (klik untuk shuffle) -->
      <button
        type="button"
        title="Klik untuk ganti kutipan inspiratif!"
        class="btn-bouncy mt-2.5 w-full cursor-pointer rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left transition hover:border-pink-200/40 hover:bg-white/15"
        @click="shuffleQuote"
      >
        <div class="mb-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-pink-200/85">
          <span>✨ Daily Spark Quote</span>
          <span class="rounded-full bg-white/10 px-2 py-0.5 text-[9px]">↻ Shuffle</span>
        </div>
        <p class="text-xs font-semibold leading-snug text-pink-50">
          "{{ currentQuote }}"
        </p>
      </button>

      <!-- GACHA KARTU "💌 PESAN RAHASIA KUCING" (2 🐟) & ALBUM KOLEKSI (X/18) -->
      <div class="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-12">
        <button
          type="button"
          :title="`Tarik 1 Kartu Pesan Rahasia Kucing secara acak (${SECRET_CARD_GACHA_COST} 🐟)`"
          class="btn-bouncy flex cursor-pointer items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[10.5px] font-bold shadow-sm transition sm:col-span-7"
          :class="
            treatCoins >= SECRET_CARD_GACHA_COST
              ? 'cozy-pill-btn border-pink-300/60 bg-gradient-to-r from-pink-400/30 via-fuchsia-400/25 to-purple-400/30 text-pink-50'
              : 'border-white/15 bg-white/5 text-purple-200/70 hover:bg-white/10'
          "
          @click="openSecretCardGacha"
        >
          <span>🎴</span>
          <span class="truncate">Tarik Kartu Rahasia ({{ SECRET_CARD_GACHA_COST }} 🐟)</span>
        </button>

        <button
          type="button"
          title="Buka Album Koleksi Kartu Rahasia Kucing"
          class="cozy-pill-btn btn-bouncy flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-purple-200/35 bg-white/10 px-2 py-1.5 text-[10.5px] font-semibold text-purple-100 sm:col-span-5"
          @click="openSecretCardAlbum"
        >
          <span>📖</span>
          <span class="truncate">Koleksi ({{ collectedSecretCards.length }}/{{ SECRET_CAT_CARDS.length }})</span>
        </button>
      </div>

      <!-- WIDGET 1: Jam & Suasana Langit (Twilight Clock & Sky Pill) -->
      <div
        class="cozy-sub-card mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-pink-200/25 bg-white/10 px-3 py-2 text-left shadow-sm backdrop-blur-md"
      >
        <div class="flex min-w-0 items-center gap-1.5">
          <span class="shrink-0 text-sm leading-none">{{ skyPhaseInfo.icon }}</span>
          <span class="truncate text-[11px] font-semibold text-pink-50/95">
            {{ skyPhaseInfo.greeting }}
          </span>
        </div>
        <span
          class="font-display shrink-0 rounded-full border border-pink-200/30 bg-black/25 px-2.5 py-0.5 text-xs font-bold tracking-wider text-pink-200 tabular-nums"
        >
          {{ currentClockHHMM }}
        </span>
      </div>

      <!-- WIDGET 2: Bilah Kasih Sayang Kucing (Lv. 1 -> Lv. 20 MAX ✨ + 💖 Peti Cinta 0/10) -->
      <div
        class="mt-2.5 rounded-2xl border border-pink-200/30 bg-white/10 px-3 py-2 text-left shadow-sm backdrop-blur-md"
      >
        <div class="flex items-center justify-between gap-1.5 text-[11px] font-bold">
          <span class="truncate text-pink-100">
            {{ isMaxAffinity ? '💖 Peti Cinta' : '💖 Kasih Sayang Kucing' }}
          </span>
          <div class="flex shrink-0 items-center gap-1">
            <span
              v-if="catAffinityPassiveFishBonus > 0"
              class="rounded-full border border-amber-200/45 bg-amber-300/20 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-100"
              :title="`Bonus pasif +${catAffinityPassiveFishBonus} 🐟 setiap menyelesaikan 1 sesi Pomodoro Fokus`"
            >
              +{{ catAffinityPassiveFishBonus }}🐟/sesi
            </span>
            <span
              v-if="isMaxAffinity"
              class="rounded-full border border-amber-200/50 bg-gradient-to-r from-amber-300/25 via-pink-300/25 to-purple-300/25 px-2 py-0.5 text-[10px] font-bold text-amber-100"
            >
              Lv. 20 MAX ✨ ({{ catHeartChestXp }}/{{ HEART_CHEST_XP_GOAL }})
            </span>
            <span
              v-else
              class="rounded-full border border-pink-200/35 bg-pink-300/15 px-2 py-0.5 text-[10px] font-bold text-pink-100"
            >
              Lv. {{ catAffinityLevel }} ({{ catAffinityXp }}/{{ currentLevelXpNeeded }})
            </span>
          </div>
        </div>

        <!-- Bilah Progres Pink-Ungu Lembut (berubah menjadi Peti Cinta berkilau emas-pink saat Lv. 20 MAX) -->
        <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/25 p-[1px]">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="
              isMaxAffinity
                ? 'cozy-progress-fill bg-gradient-to-r from-[#fde68a] via-[#f9a8d4] to-[#c084fc] shadow-[0_0_12px_rgba(249,168,212,0.85)]'
                : 'cozy-progress-fill ocean-progress-fill bg-gradient-to-r from-[#f9a8d4] via-[#e879f9] to-[#c084fc]'
            "
            :style="{ width: `${affinityProgressPercent}%` }"
          />
        </div>

        <p
          v-if="isMaxAffinity"
          class="mt-1 flex items-center justify-between text-[10px] font-semibold text-purple-200/85"
        >
          <span>👑 Soulmate MAX • Elus / fokus isi peti</span>
          <span class="text-amber-200/95">Penuh = +{{ HEART_CHEST_FISH_REWARD }} 🐟</span>
        </p>
        <p
          v-else
          class="mt-1 flex items-center justify-between text-[10px] font-semibold text-purple-200/80"
        >
          <span>{{ nextMilestoneHint }}</span>
          <span class="text-amber-200/95">Naik Lv = +2 🐟</span>
        </p>
      </div>
    </div>

    <!-- 2. Karakter Pendamping Interaktif (MascotCompanion) + Gelembung Perayaan Level Up! -->
    <div class="relative z-10 w-full flex flex-col items-center">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-2 opacity-0 scale-90"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="-translate-y-2 opacity-0 scale-90"
      >
        <div
          v-if="catAffinityLevelUpMessage"
          role="status"
          class="mb-2 rounded-full border border-amber-200/75 bg-gradient-to-r from-pink-500/40 via-purple-500/45 to-amber-400/35 px-3 py-1 text-[11px] font-bold text-amber-50 shadow-lg shadow-pink-500/30 backdrop-blur-md"
        >
          {{ catAffinityLevelUpMessage }}
        </div>
      </Transition>
      <MascotCompanion />
    </div>

    <!-- 3. Statistik Ringkas + Kartu Bertab Mini (ikut meredup tanpa blur saat Starlight Focus ✨ aktif agar teks tetap tajam) -->
    <div
      class="relative z-10 flex w-full flex-col gap-3 transition-opacity duration-500"
      :class="
        isZenMode
          ? 'opacity-35 hover:opacity-100'
          : 'opacity-100'
      "
    >
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-2xl border border-white/15 bg-white/10 px-2 py-2">
          <p class="text-[10px] font-semibold text-purple-200/80">Sesi Fokus</p>
          <p class="font-display text-lg font-bold text-pink-200">
            {{ todayFocusSessions }}
          </p>
        </div>

        <div class="rounded-2xl border border-white/15 bg-white/10 px-2 py-2">
          <p class="text-[10px] font-semibold text-purple-200/80">Habit</p>
          <p class="font-display text-lg font-bold text-purple-200">
            {{ todayCompletionRate }}%
          </p>
        </div>

        <div class="rounded-2xl border border-amber-200/25 bg-amber-300/10 px-2 py-2">
          <p class="text-[10px] font-semibold text-amber-100/90">Streak</p>
          <p class="font-display text-lg font-bold text-amber-200">
            🔥{{ dailyStreak }}
          </p>
        </div>
      </div>

      <!-- Tombol Simpan Kartu Progres Harian (1080×1350 PNG siap bagikan) -->
      <button
        type="button"
        title="Buat & simpan gambar Kartu Progres Belajar Hari Ini (.png)"
        class="cozy-pill-btn btn-bouncy flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-pink-200/40 bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-indigo-400/20 px-3 py-1.5 text-[11px] font-bold text-pink-100 shadow-sm transition"
        @click="isStudyCardModalOpen = true"
      >
        <span>📸</span>
        <span>Simpan Kartu Progres</span>
      </button>

      <!-- KARTU BERTAB MINI: Catatan & Mood | Aksesori Kucing -->
      <div class="cozy-sub-card w-full rounded-2xl border border-pink-200/25 bg-white/10 p-3 shadow-inner">
        <!-- Navigasi 2 Tab Ringkas -->
        <div class="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-1 text-[11px]">
          <button
            type="button"
            class="cursor-pointer rounded-lg px-2 py-1.5 font-semibold transition"
            :class="
              activeLeftTab === 'notes'
                ? 'ocean-active-btn bg-[#f9a8d4] text-[#311042] shadow'
                : 'text-purple-100/80 hover:bg-white/10 hover:text-white'
            "
            @click="activeLeftTab = 'notes'"
          >
            📝 Catatan &amp; Mood
          </button>

          <button
            type="button"
            class="cursor-pointer rounded-lg px-2 py-1.5 font-semibold transition"
            :class="
              activeLeftTab === 'accessories'
                ? 'ocean-active-btn bg-[#c4b5fd] text-[#1e1b4b] shadow'
                : 'text-purple-100/80 hover:bg-white/10 hover:text-white'
            "
            @click="activeLeftTab = 'accessories'"
          >
            🎀 Aksesoris (🐟{{ treatCoins }})
          </button>
        </div>

        <!-- Isi Tab Aktif -->
        <QuickNotes v-if="activeLeftTab === 'notes'" />
        <TreatShop v-else />
      </div>
    </div>
  </aside>
</template>
