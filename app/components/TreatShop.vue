<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ASTRAL_PALACE_STREAK_GOAL,
  COZY_THEMES,
  type CozyThemeId,
  MASCOT_ACCESSORIES,
  type MascotAccessoryId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Ambil saldo koin 🐟, aksesoris kucing, & toko Tema Latar Belakang (Cozy Themes)
const {
  treatCoins,
  ownedAccessories,
  equippedAccessory,
  ownedCozyThemes,
  activeCozyTheme,
  fullGoalStreak,
  catAffinityLevel,
  neonCityCollectionProgress,
  buyOrEquipAccessory,
  buyOrEquipCozyTheme,
} = useTwilightStorage()

const feedbackText = ref<string>('')
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const clampedFullStreak = computed(() =>
  Math.min(fullGoalStreak.value, ASTRAL_PALACE_STREAK_GOAL),
)

const astralStreakPercent = computed(() =>
  Math.round((clampedFullStreak.value / ASTRAL_PALACE_STREAK_GOAL) * 100),
)

function showFeedback(message: string) {
  feedbackText.value = message
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    feedbackText.value = ''
  }, 3200)
}

function isAccessoryOwned(id: Exclude<MascotAccessoryId, 'none'>, milestoneLevel?: 10 | 20): boolean {
  if (ownedAccessories.value.includes(id)) return true
  if (milestoneLevel === 10 && catAffinityLevel.value >= 10) return true
  if (milestoneLevel === 20 && catAffinityLevel.value >= 20) return true
  return false
}

function handleSelectAccessory(id: MascotAccessoryId) {
  const result = buyOrEquipAccessory(id)
  showFeedback(result.message)
}

function isCozyThemeOwned(id: CozyThemeId): boolean {
  if (ownedCozyThemes.value.includes(id)) return true
  if (id === 'astral-palace' && fullGoalStreak.value >= ASTRAL_PALACE_STREAK_GOAL) return true
  if (id === 'neon-night-city' && neonCityCollectionProgress.value.isComplete) return true
  return false
}

function handleSelectCozyTheme(id: CozyThemeId) {
  const result = buyOrEquipCozyTheme(id)
  showFeedback(result.message)
}
</script>

<template>
  <!-- Panel Tab "Aksesori": Aksesori Kepala Kucing (tersinkron ke kedua kucing) + Toko Tema Latar Belakang -->
  <div class="w-full text-left">
    <!-- Baris Saldo Koin Ikan & Tombol Lepas Aksesori -->
    <div class="mb-2.5 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <span
          class="inline-flex items-center gap-1 rounded-full border border-amber-200/35 bg-amber-300/15 px-2.5 py-0.5 text-xs font-bold text-amber-100"
          title="Dapatkan +10 🐟 tiap selesai 1 sesi Pomodoro atau centang 1 habit!"
        >
          🐟 {{ treatCoins }} Koin
        </span>
      </div>

      <button
        v-if="equippedAccessory !== 'none'"
        type="button"
        class="cursor-pointer rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-200 transition hover:bg-white/20"
        @click="handleSelectAccessory('none')"
      >
        Lepas Aksesoris
      </button>
      <span v-else class="text-[10px] font-medium text-purple-200/75">
        +10 🐟 / target
      </span>
    </div>

    <!-- 1. Daftar 12 Aksesoris Kucing (10 Toko Koin + 2 Milestone Eksklusif Lv. 10 & Lv. 20 MAX) -->
    <div class="mb-1.5 flex items-center justify-between gap-2">
      <h3 class="text-[11px] font-bold uppercase tracking-wider text-pink-200">
        🎀 Toko Aksesoris
      </h3>
      <span class="text-[10px] text-purple-200/70">2 Kucing Sinkron</span>
    </div>

    <div class="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto pr-0.5">
      <button
        v-for="item in MASCOT_ACCESSORIES"
        :key="item.id"
        type="button"
        class="btn-bouncy flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
        :class="
          equippedAccessory === item.id
            ? 'border-pink-300/80 bg-pink-300/25 text-white'
            : isAccessoryOwned(item.id, item.milestoneLevel)
              ? 'border-purple-200/30 bg-white/10 text-purple-100 hover:bg-white/20'
              : item.cost === null
                ? 'border-amber-200/25 bg-gradient-to-r from-pink-950/45 via-purple-950/45 to-amber-950/35 text-amber-100/90 hover:bg-white/10'
                : 'border-white/15 bg-black/20 text-purple-100/85 hover:bg-white/15'
        "
        @click="handleSelectAccessory(item.id)"
      >
        <span class="flex items-center gap-2 truncate">
          <span class="text-sm">{{ item.icon }}</span>
          <span class="truncate">{{ item.name }}</span>
        </span>

        <span
          v-if="equippedAccessory === item.id"
          class="cozy-active-btn shrink-0 rounded-full bg-[#f9a8d4] px-2 py-0.5 text-[10px] font-bold text-[#311042]"
        >
          Dipakai
        </span>
        <span
          v-else-if="isAccessoryOwned(item.id, item.milestoneLevel)"
          class="shrink-0 rounded-full bg-purple-300/25 px-2 py-0.5 text-[10px] font-semibold text-purple-100"
        >
          Pasang
        </span>
        <span
          v-else-if="item.cost === null"
          class="shrink-0 rounded-full border border-amber-200/35 bg-amber-300/15 px-2 py-0.5 text-[9.5px] font-bold text-amber-100"
        >
          🔒 Lv. {{ item.milestoneLevel }}{{ item.milestoneLevel === 20 ? ' MAX' : '' }}
        </span>
        <span
          v-else
          class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
          :class="
            treatCoins >= item.cost
              ? 'bg-amber-300/25 text-amber-100'
              : 'bg-white/10 text-purple-200/60'
          "
        >
          🐟 {{ item.cost }}
        </span>
      </button>
    </div>

    <!-- Pemisah halus -->
    <div class="my-3 border-t border-white/15" />

    <!-- 2. Sub-Bagian: Toko Tema Latar Belakang Beranimasi (Cozy Themes) -->
    <div>
      <div class="mb-2 flex items-center justify-between gap-2">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-pink-200">
          🎨 Tema Latar Belakang
        </h3>
        <span class="text-[10px] text-purple-200/70">Beranimasi</span>
      </div>

      <div class="flex max-h-[255px] flex-col gap-1.5 overflow-y-auto pr-0.5">
        <div
          v-for="themeItem in COZY_THEMES"
          :key="themeItem.id"
          class="rounded-xl border px-2.5 py-2 transition"
          :class="
            activeCozyTheme === themeItem.id
              ? themeItem.id === 'neon-night-city'
                ? 'border-[#00f5d4]/80 bg-gradient-to-r from-[#090514]/85 via-[#00f5d4]/15 to-[#ff2a85]/20 shadow-[0_0_14px_rgba(0,245,212,0.28)]'
                : themeItem.id === 'astral-palace'
                  ? 'border-amber-300/80 bg-gradient-to-r from-indigo-500/25 via-emerald-400/15 to-amber-300/20 shadow-[0_0_12px_rgba(253,224,71,0.2)]'
                  : 'border-pink-300/80 bg-pink-300/20'
              : themeItem.id === 'neon-night-city' && !isCozyThemeOwned(themeItem.id)
                ? 'border-[#00f5d4]/30 bg-gradient-to-r from-[#090514]/75 via-[#170b2e]/70 to-[#2b0c26]/60'
                : themeItem.id === 'astral-palace' && !isCozyThemeOwned(themeItem.id)
                  ? 'border-amber-200/25 bg-gradient-to-r from-indigo-950/55 via-purple-950/45 to-amber-950/30'
                  : 'border-white/15 bg-black/20 hover:bg-white/10'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <!-- Swatch & Nama Tema -->
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/35 text-xs shadow-inner"
                :class="themeItem.swatchClass"
              >
                {{ themeItem.icon }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-[11px] font-bold text-white">
                  {{ themeItem.name }}
                </p>
                <p class="truncate text-[9.5px] leading-tight text-purple-200/75">
                  {{ themeItem.description }}
                </p>
              </div>
            </div>

            <!-- Tombol Aksi: Dipakai / Pakai / Beli (X 🐟) / Terkunci Streak / Koleksi 100% Toko -->
            <span
              v-if="activeCozyTheme === themeItem.id"
              class="cozy-active-btn shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              :class="
                themeItem.id === 'neon-night-city'
                  ? 'bg-gradient-to-r from-[#00f5d4] to-[#ff2a85] text-[#090514]'
                  : themeItem.id === 'astral-palace'
                    ? 'bg-amber-300 text-[#1e1038]'
                    : 'bg-[#f9a8d4] text-[#311042]'
              "
            >
              Dipakai
            </span>

            <button
              v-else-if="isCozyThemeOwned(themeItem.id)"
              type="button"
              class="btn-bouncy shrink-0 cursor-pointer rounded-full bg-purple-300/25 px-2.5 py-0.5 text-[10px] font-semibold text-purple-100 hover:bg-purple-300/40"
              @click="handleSelectCozyTheme(themeItem.id)"
            >
              Pakai
            </button>

            <button
              v-else-if="themeItem.cost !== null"
              type="button"
              :disabled="treatCoins < themeItem.cost"
              :title="
                treatCoins < themeItem.cost
                  ? `Koin ikan kurang (butuh ${themeItem.cost} 🐟, saldomu ${treatCoins} 🐟)`
                  : `Beli tema ${themeItem.name} seharga ${themeItem.cost} 🐟`
              "
              class="btn-bouncy shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition"
              :class="
                treatCoins >= themeItem.cost
                  ? 'cursor-pointer bg-amber-300/25 text-amber-100 hover:bg-amber-300/40'
                  : 'cursor-not-allowed bg-white/10 text-purple-200/45 opacity-60'
              "
              @click="handleSelectCozyTheme(themeItem.id)"
            >
              Beli ({{ themeItem.cost }} 🐟)
            </button>

            <span
              v-else-if="themeItem.id === 'neon-night-city'"
              class="shrink-0 rounded-full border border-[#00f5d4]/45 bg-[#00f5d4]/10 px-2 py-0.5 text-[9.5px] font-bold text-[#a5f3fc]"
            >
              🔒 100% Toko
            </span>

            <span
              v-else
              class="shrink-0 rounded-full border border-amber-200/35 bg-amber-300/15 px-2 py-0.5 text-[9.5px] font-bold text-amber-100"
            >
              🔒 Streak
            </span>
          </div>

          <!-- Status progres 7-Day Full Goal Streak khusus Astral Crystal Palace (+15 🐟 & Tema Eksklusif) -->
          <div
            v-if="themeItem.id === 'astral-palace' && !isCozyThemeOwned(themeItem.id)"
            class="mt-2 rounded-lg border border-amber-200/20 bg-black/25 px-2 py-1.5"
          >
            <p class="text-[9.5px] font-semibold leading-snug text-amber-100/90">
              🔒 Selesaikan semua goal 7 hari penuh (Progres: {{ clampedFullStreak }}/{{ ASTRAL_PALACE_STREAK_GOAL }} hari) • Hadiah +15 🐟 &amp; Tema 👑
            </p>
            <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 transition-all duration-500"
                :style="{ width: `${astralStreakPercent}%` }"
              />
            </div>
          </div>

          <!-- Status progres Koleksi 100% Toko khusus Tema Rahasia Ultimate 🌃 Neon Night City -->
          <div
            v-if="themeItem.id === 'neon-night-city' && !isCozyThemeOwned(themeItem.id)"
            class="mt-2 rounded-lg border border-[#00f5d4]/25 bg-black/35 px-2 py-1.5"
          >
            <p class="text-[9.5px] font-semibold leading-snug text-[#cffafe]">
              🔒 Koleksi 100% Toko ({{ neonCityCollectionProgress.current }}/{{ neonCityCollectionProgress.total }} Koleksi) • Miliki seluruh aksesoris toko &amp; tema lainnya 🌃
            </p>
            <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-gradient-to-r from-[#00f5d4] via-purple-400 to-[#ff2a85] transition-all duration-500"
                :style="{ width: `${neonCityCollectionProgress.percent}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <p
      v-if="feedbackText"
      class="mt-2 text-center text-[11px] font-semibold text-pink-200"
    >
      {{ feedbackText }}
    </p>
  </div>
</template>
