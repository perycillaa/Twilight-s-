<script setup lang="ts">
import { computed, ref } from 'vue'
import { getCatBreedPalette } from '~/composables/useCatThemeStyle'
import {
  ASTRAL_PALACE_STREAK_GOAL,
  CAT_BREEDS,
  COZY_CAT_BUDDIES,
  type CatBreedId,
  type CatTargetSlot,
  type CozyBuddyId,
  COZY_THEMES,
  type CozyThemeId,
  MASCOT_ACCESSORIES,
  type MascotAccessoryId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Ambil saldo koin 🐟, aksesoris 2 kucing (sinkron/terpisah), Toko Kucing (7 ras + 3 Cozy Cat Buddies), & Toko Tema Latar Belakang
const {
  treatCoins,
  ownedAccessories,
  ownedCats,
  ownedBuddies,
  activeBuddies,
  mainCatType,
  miniCatType,
  syncCatAccessories,
  mainCatAccessory,
  miniCatAccessory,
  ownedCozyThemes,
  activeCozyTheme,
  fullGoalStreak,
  catAffinityLevel,
  neonCityCollectionProgress,
  toggleSyncCatAccessories,
  buyOrEquipAccessory,
  buyOrEquipCatBreed,
  buyOrToggleCozyBuddy,
  buyOrEquipCozyTheme,
} = useTwilightStorage()

const activeShopSubTab = ref<'accessories' | 'cats'>('accessories')
const selectedAccessoryTarget = ref<'main' | 'mini'>('main')
const feedbackText = ref<string>('')
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const clampedFullStreak = computed(() =>
  Math.min(fullGoalStreak.value, ASTRAL_PALACE_STREAK_GOAL),
)

const astralStreakPercent = computed(() =>
  Math.round((clampedFullStreak.value / ASTRAL_PALACE_STREAK_GOAL) * 100),
)

const currentTargetAccessory = computed<MascotAccessoryId>(() => {
  if (syncCatAccessories.value) return mainCatAccessory.value
  return selectedAccessoryTarget.value === 'mini'
    ? miniCatAccessory.value
    : mainCatAccessory.value
})

function showFeedback(message: string) {
  feedbackText.value = message
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    feedbackText.value = ''
  }, 3200)
}

function isAccessoryOwned(
  id: Exclude<MascotAccessoryId, 'none'>,
  milestoneLevel?: 10 | 20 | 30,
): boolean {
  if (ownedAccessories.value.includes(id)) return true
  if (milestoneLevel === 10 && catAffinityLevel.value >= 10) return true
  if (milestoneLevel === 20 && catAffinityLevel.value >= 20) return true
  if (milestoneLevel === 30 && catAffinityLevel.value >= 30) return true
  return false
}

function handleSelectAccessory(id: MascotAccessoryId) {
  const target: CatTargetSlot = syncCatAccessories.value
    ? 'both'
    : selectedAccessoryTarget.value
  const result = buyOrEquipAccessory(id, target)
  showFeedback(result.message)
}

function isCatOwned(breedId: CatBreedId, cost: number): boolean {
  return cost === 0 || ownedCats.value.includes(breedId)
}

function handleSelectCatBreed(breedId: CatBreedId, target: CatTargetSlot) {
  const result = buyOrEquipCatBreed(breedId, target)
  showFeedback(result.message)
}

function isBuddyOwned(buddyId: CozyBuddyId): boolean {
  return ownedBuddies.value.includes(buddyId)
}

function isBuddyActive(buddyId: CozyBuddyId): boolean {
  return activeBuddies.value.includes(buddyId)
}

function handleBuddyAction(buddyId: CozyBuddyId) {
  const result = buyOrToggleCozyBuddy(buddyId)
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
  <!-- Panel Tab Toko: Sub-tab 🎀 Toko Aksesoris | 🐱 Toko Kucing + 🎨 Tema Latar Belakang -->
  <div class="w-full text-left">
    <!-- Baris Saldo Koin Ikan & Tombol Lepas Aksesori -->
    <div class="mb-2.5 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <span
          class="cozy-shop-price inline-flex items-center gap-1 rounded-full border border-amber-200/35 bg-amber-300/15 px-2.5 py-0.5 text-xs font-bold text-amber-100"
          title="Dapatkan +10 🐟 tiap selesai 1 sesi Pomodoro atau centang 1 habit!"
        >
          🐟 {{ treatCoins }} Koin
        </span>
      </div>

      <button
        v-if="activeShopSubTab === 'accessories' && currentTargetAccessory !== 'none'"
        type="button"
        class="cozy-secondary-btn cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition"
        @click="handleSelectAccessory('none')"
      >
        Lepas Aksesoris
      </button>
      <span v-else class="text-[10px] font-medium text-purple-200/75">
        +10 🐟 / target
      </span>
    </div>

    <!-- Sub-Tab Berdampingan: 🎀 Toko Aksesoris | 🐱 Toko Kucing -->
    <div class="mb-2.5 grid grid-cols-2 gap-1 rounded-xl border border-white/15 bg-black/25 p-1 text-[11px]">
      <button
        type="button"
        class="cursor-pointer rounded-lg px-2 py-1.5 font-bold transition"
        :class="
          activeShopSubTab === 'accessories'
            ? 'cozy-active-btn bg-[#f9a8d4] text-[#311042] shadow-sm'
            : 'cozy-tab-inactive'
        "
        @click="activeShopSubTab = 'accessories'"
      >
        🎀 Toko Aksesoris
      </button>
      <button
        type="button"
        class="cursor-pointer rounded-lg px-2 py-1.5 font-bold transition"
        :class="
          activeShopSubTab === 'cats'
            ? 'cozy-active-btn bg-[#c4b5fd] text-[#1e1b4b] shadow-sm'
            : 'cozy-tab-inactive'
        "
        @click="activeShopSubTab = 'cats'"
      >
        🐱 Toko Kucing
      </button>
    </div>

    <!-- === SUB-TAB 1: 🎀 TOKO AKSESORIS + SAKELAR 🔗 SINKRON / ✂️ TERPISAH === -->
    <template v-if="activeShopSubTab === 'accessories'">
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-pink-200">
          🎀 Aksesoris Kucing
        </h3>

        <!-- Sakelar Interaktif Mode 2 Kucing: 🔗 2 Kucing Sinkron <-> ✂️ Aksesoris Terpisah -->
        <button
          type="button"
          class="btn-bouncy cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold transition"
          :class="
            syncCatAccessories
              ? 'cozy-pill-btn'
              : 'cozy-secondary-btn'
          "
          :title="
            syncCatAccessories
              ? 'Klik untuk mengatur aksesoris Kucing Utama & Pendamping secara terpisah'
              : 'Klik untuk menyinkronkan aksesoris kedua kucing secara serentak'
          "
          @click="toggleSyncCatAccessories"
        >
          {{ syncCatAccessories ? '🔗 2 Kucing Sinkron' : '✂️ Aksesoris Terpisah' }}
        </button>
      </div>

      <!-- Pemilih Target Kecil (muncul otomatis saat Mode ✂️ Aksesoris Terpisah aktif) -->
      <div
        v-if="!syncCatAccessories"
        class="mb-2 flex items-center justify-between gap-1.5 rounded-xl border border-white/15 bg-black/20 px-2 py-1.5 text-[10px]"
      >
        <span class="shrink-0 font-bold text-purple-200/85">Target:</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="cursor-pointer rounded-full px-2 py-0.5 font-bold transition"
            :class="
              selectedAccessoryTarget === 'main'
                ? 'cozy-active-btn bg-[#f9a8d4] text-[#311042] shadow-xs'
                : 'cozy-tab-inactive'
            "
            @click="selectedAccessoryTarget = 'main'"
          >
            🐱 Kucing Utama
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-full px-2 py-0.5 font-bold transition"
            :class="
              selectedAccessoryTarget === 'mini'
                ? 'cozy-active-btn bg-[#c4b5fd] text-[#1e1b4b] shadow-xs'
                : 'cozy-tab-inactive'
            "
            @click="selectedAccessoryTarget = 'mini'"
          >
            🐾 Pendamping
          </button>
        </div>
      </div>

      <div class="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto pr-0.5">
        <button
          v-for="item in MASCOT_ACCESSORIES"
          :key="item.id"
          type="button"
          class="btn-bouncy flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
          :class="
            currentTargetAccessory === item.id
              ? 'cozy-shop-item-active border-pink-300/80 bg-pink-300/25 text-white'
              : isAccessoryOwned(item.id, item.milestoneLevel)
                ? 'cozy-shop-item border-purple-200/30 bg-white/10 text-purple-100 hover:bg-white/20'
                : item.cost === null
                  ? 'cozy-shop-item-locked border-amber-200/25 bg-gradient-to-r from-pink-950/45 via-purple-950/45 to-amber-950/35 text-amber-100/90 hover:bg-white/10'
                  : 'cozy-shop-item border-white/15 bg-black/20 text-purple-100/85 hover:bg-white/15'
          "
          @click="handleSelectAccessory(item.id)"
        >
          <span class="flex items-center gap-2 truncate">
            <span class="text-sm">{{ item.icon }}</span>
            <span class="truncate">{{ item.name }}</span>
          </span>

          <span
            v-if="currentTargetAccessory === item.id"
            class="cozy-active-btn shrink-0 rounded-full bg-[#f9a8d4] px-2 py-0.5 text-[10px] font-bold text-[#311042]"
          >
            Dipakai
          </span>
          <span
            v-else-if="isAccessoryOwned(item.id, item.milestoneLevel)"
            class="cozy-badge shrink-0 rounded-full bg-purple-300/25 px-2 py-0.5 text-[10px] font-semibold text-purple-100"
          >
            Pasang
          </span>
          <span
            v-else-if="item.cost === null"
            class="cozy-shop-price shrink-0 rounded-full border border-amber-200/35 bg-amber-300/15 px-2 py-0.5 text-[9.5px] font-bold text-amber-100"
          >
            🔒 Lv. {{ item.milestoneLevel }}{{ item.milestoneLevel === 30 ? ' MAX' : '' }}
          </span>
          <span
            v-else
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
            :class="
              treatCoins >= item.cost
                ? 'cozy-shop-price bg-amber-300/25 text-amber-100'
                : 'cozy-shop-price-locked bg-white/10 text-purple-200/60'
            "
          >
            🐟 {{ item.cost }}
          </span>
        </button>
      </div>
    </template>

    <!-- === SUB-TAB 2: 🐱 TOKO KOLEKSI KUCING (7 RAS/WARNA KUCING COZY) === -->
    <template v-else>
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-pink-200">
          🐱 Koleksi Ras Kucing
        </h3>
        <span class="text-[10px] font-semibold text-purple-200/75">
          {{ ownedCats.length }}/{{ CAT_BREEDS.length }} Dimiliki
        </span>
      </div>

      <div class="flex max-h-[250px] flex-col gap-1.5 overflow-y-auto pr-0.5">
        <div
          v-for="cat in CAT_BREEDS"
          :key="cat.id"
          class="rounded-xl border px-2.5 py-2 transition"
          :class="
            mainCatType === cat.id || miniCatType === cat.id
              ? 'cozy-shop-item-active border-pink-300/80 bg-pink-300/20'
              : 'cozy-shop-item border-white/15 bg-black/20'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <!-- Pratinjau Mini SVG Wajah Kucing sesuai Rasnya -->
            <div class="flex min-w-0 items-center gap-2">
              <svg
                class="h-8 w-8 shrink-0 drop-shadow-xs"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="20" cy="21" r="17" fill="var(--accent-soft, rgba(255,255,255,0.12))" />
                <!-- Telinga -->
                <path
                  d="M9 17 L7 7 L16 12 Z"
                  :fill="getCatBreedPalette(cat.id).earOuterFill"
                  :stroke="getCatBreedPalette(cat.id).earOuterStroke"
                  stroke-width="1.2"
                  stroke-linejoin="round"
                />
                <path
                  d="M31 17 L33 7 L24 12 Z"
                  :fill="cat.id === 'matcha-calico' ? '#451a03' : getCatBreedPalette(cat.id).earOuterFill"
                  :stroke="getCatBreedPalette(cat.id).earOuterStroke"
                  stroke-width="1.2"
                  stroke-linejoin="round"
                />
                <!-- Kepala -->
                <ellipse
                  cx="20"
                  cy="22"
                  rx="12"
                  ry="10.5"
                  :fill="getCatBreedPalette(cat.id).headFill"
                  :stroke="getCatBreedPalette(cat.id).earOuterStroke"
                  stroke-width="1"
                />
                <!-- Corak khas per ras -->
                <path
                  v-if="cat.id === 'matcha-calico'"
                  d="M20 11.5 C26 11.5, 31 15, 31 20 C27 20, 22 17, 20 11.5 Z"
                  fill="#f59e0b"
                />
                <ellipse
                  v-if="cat.id === 'mocha-siamese'"
                  cx="20"
                  cy="23.5"
                  rx="7.5"
                  ry="5.5"
                  fill="#6b4426"
                  opacity="0.88"
                />
                <ellipse
                  v-if="cat.id === 'midnight-tuxedo'"
                  cx="20"
                  cy="26.5"
                  rx="7"
                  ry="4.5"
                  fill="#f8fafc"
                />
                <!-- Mata -->
                <circle
                  cx="15.5"
                  cy="21.5"
                  r="1.9"
                  :fill="getCatBreedPalette(cat.id).isDarkFur ? '#fde68a' : getCatBreedPalette(cat.id).eyeInk"
                />
                <circle
                  cx="24.5"
                  cy="21.5"
                  r="1.9"
                  :fill="getCatBreedPalette(cat.id).isDarkFur ? '#fde68a' : getCatBreedPalette(cat.id).eyeInk"
                />
                <!-- Hidung -->
                <path d="M18.8 24 H21.2 L20 25.4 Z" :fill="getCatBreedPalette(cat.id).noseFill" />
              </svg>

              <div class="min-w-0">
                <p class="truncate text-[11px] font-bold text-white">
                  {{ cat.name }}
                </p>
                <p class="truncate text-[9.5px] leading-tight text-purple-200/75">
                  {{ cat.description }}
                </p>
              </div>
            </div>

            <!-- Tombol Beli jika belum dimiliki -->
            <button
              v-if="!isCatOwned(cat.id, cat.cost)"
              type="button"
              :disabled="treatCoins < cat.cost"
              class="btn-bouncy shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition"
              :class="
                treatCoins >= cat.cost
                  ? 'cozy-shop-price cursor-pointer bg-amber-300/25 text-amber-100 hover:bg-amber-300/40'
                  : 'cozy-shop-price-locked cursor-not-allowed bg-white/10 text-purple-200/45 opacity-65'
              "
              @click="handleSelectCatBreed(cat.id, 'both')"
            >
              🐟 {{ cat.cost }}
            </button>
            <span
              v-else
              class="cozy-badge shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold"
            >
              {{ cat.cost === 0 ? 'Bawaan' : 'Dimiliki' }}
            </span>
          </div>

          <!-- Tombol Pasang ke Kucing Utama / Kucing Pendamping / Keduanya (saat sudah dimiliki) -->
          <div
            v-if="isCatOwned(cat.id, cat.cost)"
            class="mt-2 grid grid-cols-3 gap-1 text-[9.5px]"
          >
            <button
              type="button"
              class="cursor-pointer rounded-lg px-1.5 py-1 font-bold transition"
              :class="
                mainCatType === cat.id
                  ? 'cozy-active-btn bg-[#f9a8d4] text-[#311042]'
                  : 'cozy-secondary-btn'
              "
              @click="handleSelectCatBreed(cat.id, 'main')"
            >
              {{ mainCatType === cat.id ? '✓ Utama' : '🐱 Utama' }}
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg px-1.5 py-1 font-bold transition"
              :class="
                miniCatType === cat.id
                  ? 'cozy-active-btn bg-[#c4b5fd] text-[#1e1b4b]'
                  : 'cozy-secondary-btn'
              "
              @click="handleSelectCatBreed(cat.id, 'mini')"
            >
              {{ miniCatType === cat.id ? '✓ Mini' : '🐾 Mini' }}
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg px-1.5 py-1 font-bold transition"
              :class="
                mainCatType === cat.id && miniCatType === cat.id
                  ? 'cozy-toggle-secondary'
                  : 'cozy-secondary-btn'
              "
              @click="handleSelectCatBreed(cat.id, 'both')"
            >
              ✨ Keduanya
            </button>
          </div>
        </div>
      </div>

      <!-- Sub-Bagian: 🐾 Kucing Peramai Ruangan (3 Cozy Cat Buddies: Mochi, Kuro, Latte) -->
      <div class="my-2.5 border-t border-white/15" />

      <div class="mb-1.5 flex items-center justify-between gap-2">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-pink-200">
          🐾 Kucing Peramai Ruangan
        </h3>
        <span class="text-[10px] font-semibold text-purple-200/75">
          {{ ownedBuddies.length }}/{{ COZY_CAT_BUDDIES.length }} Dimiliki
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <div
          v-for="buddy in COZY_CAT_BUDDIES"
          :key="buddy.id"
          class="rounded-xl border px-2.5 py-2 transition"
          :class="
            isBuddyActive(buddy.id)
              ? 'cozy-shop-item-active border-pink-300/80 bg-pink-300/20'
              : 'cozy-shop-item border-white/15 bg-black/20'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <!-- Pratinjau Mini SVG Wajah Cozy Cat Buddy -->
              <svg
                class="h-8 w-8 shrink-0 drop-shadow-xs"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="20" cy="21" r="17" fill="var(--accent-soft, rgba(255,255,255,0.12))" />
                <!-- Mochi (Scottish Fold Abu-Biru Bertelinga Lipat) -->
                <template v-if="buddy.id === 'mochi'">
                  <ellipse cx="20" cy="22.5" rx="12" ry="10.2" fill="#9eb2d1" stroke="#53688a" stroke-width="1" />
                  <path d="M8.5 18 C8 11, 15 10.5, 17 15 C14 15.5, 11 16.5, 8.5 18 Z" fill="#8298bd" stroke="#53688a" stroke-width="1" stroke-linejoin="round" />
                  <path d="M31.5 18 C32 11, 25 10.5, 23 15 C26 15.5, 29 16.5, 31.5 18 Z" fill="#8298bd" stroke="#53688a" stroke-width="1" stroke-linejoin="round" />
                  <ellipse cx="20" cy="25.5" rx="6" ry="3.8" fill="#d7e2f2" opacity="0.85" />
                  <circle cx="15.5" cy="21.5" r="2" fill="#fbbf24" />
                  <circle cx="24.5" cy="21.5" r="2" fill="#fbbf24" />
                  <circle cx="15.6" cy="21.5" r="0.95" fill="#1e293b" />
                  <circle cx="24.6" cy="21.5" r="0.95" fill="#1e293b" />
                  <path d="M18.8 24.4 H21.2 L20 25.6 Z" fill="#64748b" />
                </template>
                <!-- Kuro (Havana Espresso & Mata Zamrud + Lonceng Emas) -->
                <template v-else-if="buddy.id === 'kuro'">
                  <path d="M9 17 L7 7 L16 12 Z" fill="#633a28" stroke="#3d2217" stroke-width="1.1" stroke-linejoin="round" />
                  <path d="M31 17 L33 7 L24 12 Z" fill="#633a28" stroke="#3d2217" stroke-width="1.1" stroke-linejoin="round" />
                  <ellipse cx="20" cy="21.5" rx="12" ry="10.2" fill="#633a28" stroke="#3d2217" stroke-width="1" />
                  <circle cx="15.5" cy="21" r="2.1" fill="#34d399" />
                  <circle cx="24.5" cy="21" r="2.1" fill="#34d399" />
                  <circle cx="15.7" cy="21" r="0.9" fill="#064e3b" />
                  <circle cx="24.7" cy="21" r="0.9" fill="#064e3b" />
                  <path d="M18.8 23.8 H21.2 L20 25 Z" fill="#d6a58d" />
                  <path d="M13 30.5 Q20 33.5 27 30.5" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round" />
                  <circle cx="20" cy="33" r="2.5" fill="#fbbf24" stroke="#b45309" stroke-width="0.9" />
                </template>
                <!-- Latte (Tabby Karamel-Madu + Bunga Pastel) -->
                <template v-else>
                  <path d="M9 17 L7 7 L16 12 Z" fill="#e6b873" stroke="#b57a40" stroke-width="1.1" stroke-linejoin="round" />
                  <path d="M31 17 L33 7 L24 12 Z" fill="#e6b873" stroke="#b57a40" stroke-width="1.1" stroke-linejoin="round" />
                  <ellipse cx="20" cy="22" rx="12" ry="10.5" fill="#f5d5a3" stroke="#b57a40" stroke-width="1" />
                  <path d="M20 12.5 V16.2 M17 13.2 L18 16.2 M23 13.2 L22 16.2" stroke="#b87639" stroke-width="1.3" stroke-linecap="round" />
                  <circle cx="29.5" cy="14" r="2.3" fill="#f9a8d4" />
                  <circle cx="29.5" cy="14" r="1.1" fill="#fde047" />
                  <circle cx="15.5" cy="21.5" r="2" fill="#14b8a6" />
                  <circle cx="24.5" cy="21.5" r="2" fill="#14b8a6" />
                  <circle cx="15.6" cy="21.5" r="0.95" fill="#134e4a" />
                  <circle cx="24.6" cy="21.5" r="0.95" fill="#134e4a" />
                  <path d="M18.8 24.4 H21.2 L20 25.6 Z" fill="#fb7185" />
                </template>
              </svg>

              <div class="min-w-0">
                <p class="truncate text-[11px] font-bold text-white">
                  {{ buddy.name }}
                  <span class="font-normal opacity-80">• {{ buddy.subtitle }}</span>
                </p>
                <p class="truncate text-[9.5px] leading-tight text-purple-200/75">
                  {{ buddy.description }}
                </p>
              </div>
            </div>

            <!-- Tombol Beli / Toggle Tampil di Ruangan -->
            <button
              v-if="!isBuddyOwned(buddy.id)"
              type="button"
              :disabled="treatCoins < buddy.cost"
              class="btn-bouncy shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition"
              :class="
                treatCoins >= buddy.cost
                  ? 'cozy-shop-price cursor-pointer bg-amber-300/25 text-amber-100 hover:bg-amber-300/40'
                  : 'cozy-shop-price-locked cursor-not-allowed bg-white/10 text-purple-200/45 opacity-65'
              "
              @click="handleBuddyAction(buddy.id)"
            >
              🐟 {{ buddy.cost }}
            </button>
            <button
              v-else
              type="button"
              class="btn-bouncy shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-bold transition"
              :class="
                isBuddyActive(buddy.id)
                  ? 'cozy-active-btn bg-[#f9a8d4] text-[#311042]'
                  : 'cozy-secondary-btn'
              "
              @click="handleBuddyAction(buddy.id)"
            >
              {{ isBuddyActive(buddy.id) ? '✓ Di Ruangan' : '🐾 Tampilkan' }}
            </button>
          </div>
        </div>
      </div>
    </template>

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

      <div class="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto pr-0.5">
        <div
          v-for="themeItem in COZY_THEMES"
          :key="themeItem.id"
          class="rounded-xl border px-2.5 py-2 transition"
          :class="
            activeCozyTheme === themeItem.id
              ? themeItem.id === 'neon-night-city'
                ? 'cozy-shop-item-active border-[#00f5d4]/80 bg-gradient-to-r from-[#090514]/85 via-[#00f5d4]/15 to-[#ff2a85]/20 shadow-[0_0_14px_rgba(0,245,212,0.28)]'
                : themeItem.id === 'astral-palace'
                  ? 'cozy-shop-item-active border-amber-300/80 bg-gradient-to-r from-indigo-500/25 via-emerald-400/15 to-amber-300/20 shadow-[0_0_12px_rgba(253,224,71,0.2)]'
                  : 'cozy-shop-item-active cozy-habit-done border-pink-300/80 bg-pink-300/20'
              : themeItem.id === 'neon-night-city' && !isCozyThemeOwned(themeItem.id)
                ? 'cozy-shop-item-locked border-[#00f5d4]/30 bg-gradient-to-r from-[#090514]/75 via-[#170b2e]/70 to-[#2b0c26]/60'
                : themeItem.id === 'astral-palace' && !isCozyThemeOwned(themeItem.id)
                  ? 'cozy-shop-item-locked border-amber-200/25 bg-gradient-to-r from-indigo-950/55 via-purple-950/45 to-amber-950/30'
                  : 'cozy-shop-item border-white/15 bg-black/20 hover:bg-white/10'
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
              class="cozy-pill-btn btn-bouncy shrink-0 cursor-pointer rounded-full border bg-purple-300/25 px-2.5 py-0.5 text-[10px] font-semibold text-purple-100"
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
                  ? 'cozy-shop-price cursor-pointer bg-amber-300/25 text-amber-100 hover:bg-amber-300/40'
                  : 'cozy-shop-price-locked cursor-not-allowed bg-white/10 text-purple-200/45 opacity-60'
              "
              @click="handleSelectCozyTheme(themeItem.id)"
            >
              Beli ({{ themeItem.cost }} 🐟)
            </button>

            <span
              v-else-if="themeItem.id === 'neon-night-city'"
              class="cozy-shop-price-locked shrink-0 rounded-full border border-[#00f5d4]/45 bg-[#00f5d4]/10 px-2 py-0.5 text-[9.5px] font-bold text-[#a5f3fc]"
            >
              🔒 100% Toko
            </span>

            <span
              v-else
              class="cozy-shop-price shrink-0 rounded-full border border-amber-200/35 bg-amber-300/15 px-2 py-0.5 text-[9.5px] font-bold text-amber-100"
            >
              🔒 Streak
            </span>
          </div>

          <!-- Status progres 7-Day Full Goal Streak khusus Astral Crystal Palace (+15 🐟 & Tema Eksklusif) -->
          <div
            v-if="themeItem.id === 'astral-palace' && !isCozyThemeOwned(themeItem.id)"
            class="cozy-shop-subbox mt-2 rounded-lg border border-amber-200/20 bg-black/25 px-2 py-1.5"
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
            class="cozy-shop-subbox mt-2 rounded-lg border border-[#00f5d4]/25 bg-black/35 px-2 py-1.5"
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
