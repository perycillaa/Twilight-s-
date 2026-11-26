<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  AFFINITY_DROP_DUPLICATE_FISH_BONUS,
  MAX_DAILY_LOVE_CARDS,
  SECRET_CARD_CATEGORIES,
  SECRET_CARD_GACHA_COST,
  SECRET_CARD_RARITIES,
  SECRET_CAT_CARDS,
  resolveCardRarity,
  type SecretCardCategoryId,
  type SecretCatCard,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  treatCoins,
  collectedSecretCards,
  dailyLoveCardCount,
  isDarkTheme,
  isSecretCardModalOpen,
  secretCardModalMode,
  lastDrawnCardResult,
  activeCozyTheme,
  drawSecretCatCard,
  showMiniToast,
} = useTwilightStorage()

// State animasi 3D flip card reveal & kilau partikel bertema
const isCardFlipped = ref<boolean>(false)
const showRevealSparks = ref<boolean>(false)
const activeAlbumFilter = ref<'all' | SecretCardCategoryId>('all')
const inspectingAlbumCard = ref<SecretCatCard | null>(null)
const gachaErrorText = ref<string>('')

let flipRevealTimer: ReturnType<typeof setTimeout> | null = null
let sparkHideTimer: ReturnType<typeof setTimeout> | null = null
let errorHideTimer: ReturnType<typeof setTimeout> | null = null

const totalCardsCount = SECRET_CAT_CARDS.length
const collectedCount = computed<number>(() => collectedSecretCards.value.length)
const collectionPercent = computed<number>(() =>
  Math.round((collectedCount.value / totalCardsCount) * 100),
)

const isAffinityAutoDrop = computed<boolean>(
  () => lastDrawnCardResult.value?.source === 'affinity-drop',
)

const categoryTotalCounts = computed<Record<SecretCardCategoryId, number>>(() => {
  const counts: Record<SecretCardCategoryId, number> = {
    encourage: 0,
    fact: 0,
    'dad-joke': 0,
    flirt: 0,
  }
  for (const card of SECRET_CAT_CARDS) {
    counts[card.category] += 1
  }
  return counts
})

const filteredAlbumCards = computed<SecretCatCard[]>(() => {
  if (activeAlbumFilter.value === 'all') return SECRET_CAT_CARDS
  return SECRET_CAT_CARDS.filter(card => card.category === activeAlbumFilter.value)
})

const themeSparkSymbols = computed<string[]>(() => {
  switch (activeCozyTheme.value) {
    case 'midnight-rain':
      return ['💧', '🌧️', '✨', '💙', '⭐', '💌', '✦', '💧']
    case 'autumn-cafe':
      return ['🍂', '🍁', '☕', '✨', '🧡', '💌', '⭐', '🍂']
    case 'matcha-garden':
      return ['🍃', '🍵', '✨', '💚', '🌿', '💌', '✦', '🍃']
    case 'sakura-lantern':
      return ['🌸', '🏮', '✨', '💖', '🌸', '💌', '⭐', '🌸']
    case 'biolum-ocean':
      return ['🫧', '🪼', '✨', '🩵', '🌊', '💌', '✦', '🫧']
    case 'honey-library':
      return ['🍯', '📖', '✨', '💛', '⭐', '💌', '✦', '🍯']
    case 'pastel-cloudland':
      return ['☁️', '🌈', '✨', '💖', '⭐', '💌', '✦', '☁️']
    case 'winter-frost':
      return ['❄️', '🧊', '✨', '🩵', '⭐', '💌', '✦', '❄️']
    case 'astral-palace':
      return ['💎', '👑', '✨', '🌌', '⭐', '💌', '✦', '💎']
    case 'neon-night-city':
      return ['⚡', '🌃', '✨', '💜', '🩵', '💌', '✦', '⚡']
    default:
      return ['✨', '⭐', '💖', '✦', '⭐', '✨', '💌', '💖']
  }
})

const revealSparkOffsets = computed(() => {
  const syms = themeSparkSymbols.value
  const coords = [
    { tx: '-112px', ty: '-84px' },
    { tx: '116px', ty: '-78px' },
    { tx: '-128px', ty: '14px' },
    { tx: '128px', ty: '22px' },
    { tx: '-90px', ty: '96px' },
    { tx: '94px', ty: '90px' },
    { tx: '0px', ty: '-116px' },
    { tx: '0px', ty: '112px' },
  ]
  return coords.map((coord, idx) => ({
    ...coord,
    symbol: syms[idx % syms.length] ?? '✨',
  }))
})

function formatCardNumber(num: number): string {
  return `#${String(num).padStart(2, '0')}`
}

function getCardRarityMeta(card: SecretCatCard) {
  return SECRET_CARD_RARITIES[resolveCardRarity(card)]
}

function getRarityPillStyle(card: SecretCatCard) {
  const meta = getCardRarityMeta(card)
  return isDarkTheme.value
    ? {
        background: meta.darkBg,
        borderColor: meta.darkBorder,
        color: meta.darkText,
      }
    : {
        background: meta.lightBg,
        borderColor: meta.lightBorder,
        color: meta.lightText,
      }
}

function isCardCollected(cardId: string): boolean {
  return collectedSecretCards.value.includes(cardId)
}

function triggerFlipAnimation() {
  if (flipRevealTimer) clearTimeout(flipRevealTimer)
  if (sparkHideTimer) clearTimeout(sparkHideTimer)

  isCardFlipped.value = false
  showRevealSparks.value = false

  flipRevealTimer = setTimeout(() => {
    isCardFlipped.value = true
    showRevealSparks.value = true
    sparkHideTimer = setTimeout(() => {
      showRevealSparks.value = false
    }, 950)
  }, 260)
}

function handleDrawAgain() {
  const res = drawSecretCatCard()
  if (!res.ok) {
    gachaErrorText.value = res.message
    if (errorHideTimer) clearTimeout(errorHideTimer)
    errorHideTimer = setTimeout(() => {
      gachaErrorText.value = ''
    }, 2800)
    return
  }
  gachaErrorText.value = ''
  secretCardModalMode.value = 'gacha'
  inspectingAlbumCard.value = null
  triggerFlipAnimation()
}

function handleSaveToAlbum() {
  const currentCard = lastDrawnCardResult.value?.card
  if (currentCard) {
    activeAlbumFilter.value = 'all'
    inspectingAlbumCard.value = currentCard
    showMiniToast(`Kartu ${formatCardNumber(currentCard.number)} "${currentCard.name}" tersimpan di Album! 💌`)
  }
  secretCardModalMode.value = 'album'
}

function openAlbumCardDetail(card: SecretCatCard) {
  if (!isCardCollected(card.id)) return
  inspectingAlbumCard.value = card
}

function closeModal() {
  isSecretCardModalOpen.value = false
  inspectingAlbumCard.value = null
  gachaErrorText.value = ''
}

watch(
  [isSecretCardModalOpen, () => lastDrawnCardResult.value?.drawId, secretCardModalMode],
  ([open, , mode]) => {
    if (open && mode === 'gacha' && lastDrawnCardResult.value) {
      inspectingAlbumCard.value = null
      triggerFlipAnimation()
    }
  },
)

onUnmounted(() => {
  if (flipRevealTimer) clearTimeout(flipRevealTimer)
  if (sparkHideTimer) clearTimeout(sparkHideTimer)
  if (errorHideTimer) clearTimeout(errorHideTimer)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isSecretCardModalOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Gacha & Album Kartu Pesan Rahasia Kucing"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      @click.self="closeModal"
    >
      <div
        class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-[1.5px] shadow-2xl backdrop-blur-xl"
        style="
          background: var(--card-bg-solid);
          border-color: var(--border-strong);
          color: var(--text-primary);
          box-shadow: 0 24px 60px -12px var(--twilight-glow);
        "
      >
        <!-- Nuansa partikel lembut selaras tema aktif -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-25 blur-3xl"
          style="background: var(--accent-primary)"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 rounded-full opacity-20 blur-3xl"
          style="background: var(--accent-secondary)"
        />

        <!-- Header Modal -->
        <div
          class="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5"
          style="border-color: var(--border-subtle); background: var(--surface-subtle)"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-xl">💌</span>
            <div>
              <h2
                class="font-display text-base font-bold sm:text-lg"
                style="color: var(--title-color)"
              >
                Pesan Rahasia Kucing
              </h2>
              <p class="text-[11px] font-semibold" style="color: var(--text-secondary)">
                Koleksi {{ collectedCount }}/{{ totalCardsCount }} kartu • Saldo 🐟 {{ treatCoins }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Switcher Tab Gacha / Album -->
            <div
              class="flex rounded-full border p-0.5 text-[11px] font-bold"
              style="border-color: var(--border-subtle); background: var(--surface-subtle)"
            >
              <button
                type="button"
                class="cursor-pointer rounded-full px-3 py-1 transition"
                :class="secretCardModalMode === 'gacha' ? 'cozy-active-btn shadow-sm' : 'cozy-tab-inactive'"
                @click="secretCardModalMode = 'gacha'"
              >
                🎴 Gacha
              </button>
              <button
                type="button"
                class="cursor-pointer rounded-full px-3 py-1 transition"
                :class="secretCardModalMode === 'album' ? 'cozy-active-btn shadow-sm' : 'cozy-tab-inactive'"
                @click="secretCardModalMode = 'album'; inspectingAlbumCard = null"
              >
                📖 Album ({{ collectedCount }}/{{ totalCardsCount }})
              </button>
            </div>

            <button
              type="button"
              aria-label="Tutup jendela Pesan Rahasia Kucing"
              class="cozy-secondary-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold transition"
              @click="closeModal"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- KONTEN 1: MODE GACHA / HADIAH AUTO-DROP KASIH SAYANG -->
        <div
          v-if="secretCardModalMode === 'gacha'"
          class="relative z-10 flex flex-col items-center justify-center overflow-y-auto px-5 py-5"
        >
          <div v-if="lastDrawnCardResult" class="relative flex w-full flex-col items-center">
            <!-- Banner Perayaan Khusus Hadiah Otomatis Bar Kasih Sayang Penuh -->
            <div
              v-if="isAffinityAutoDrop"
              class="mb-3.5 w-full max-w-[360px] rounded-2xl border-[1.5px] px-4 py-2 text-center shadow-sm"
              style="
                background: var(--accent-soft);
                border-color: var(--border-strong);
                color: var(--text-primary);
              "
            >
              <p class="font-display text-xs font-extrabold tracking-wide" style="color: var(--accent-primary)">
                🎉 HADIAH BAR KASIH SAYANG PENUH! 🎉
              </p>
              <p class="mt-0.5 text-[11px] font-semibold" style="color: var(--text-secondary)">
                {{
                  lastDrawnCardResult.isNew
                    ? 'Kartu rahasia acak terbuka gratis & langsung tersimpan ke Albummu~'
                    : `Seluruh ${totalCardsCount}/${totalCardsCount} kartu sudah terkoleksi! Kamu dapat bonus +${lastDrawnCardResult.bonusFish ?? AFFINITY_DROP_DUPLICATE_FISH_BONUS} 🐟!`
                }}
              </p>
              <p class="mt-1 text-[10.5px] font-bold" style="color: var(--accent-primary)">
                💌 Hadiah Kartu Hari Ini: {{ dailyLoveCardCount }}/{{ MAX_DAILY_LOVE_CARDS }}
                {{ dailyLoveCardCount >= MAX_DAILY_LOVE_CARDS ? '• Batas harian tercapai, kembali besok~ 💖' : '' }}
              </p>
            </div>

            <!-- Kilau Partikel Bertema saat Kartu Terbuka -->
            <div
              v-if="showRevealSparks"
              aria-hidden="true"
              class="pointer-events-none absolute left-1/2 top-44 z-20"
            >
              <span
                v-for="(spark, idx) in revealSparkOffsets"
                :key="`gacha-spark-${idx}`"
                class="animate-spark-pop absolute text-lg"
                :style="{ '--tx': spark.tx, '--ty': spark.ty }"
              >
                {{ spark.symbol }}
              </span>
            </div>

            <!-- Kartu 3D Flip Container -->
            <div
              class="gacha-card-scene relative h-[320px] w-full max-w-[340px] cursor-pointer select-none sm:h-[340px]"
              title="Klik kartu untuk membalik ulang"
              @click="isCardFlipped = !isCardFlipped"
            >
              <div
                class="gacha-card-inner relative h-full w-full"
                :class="{ 'is-flipped': isCardFlipped }"
              >
                <!-- Sisi Belakang Kartu (Amplop Rahasia Kucing — Sinkron Tema) -->
                <div
                  class="gacha-card-face flex flex-col items-center justify-center rounded-3xl border-2 p-6 text-center shadow-xl"
                  style="
                    background: var(--accent-gradient);
                    border-color: var(--border-strong);
                    color: var(--accent-on-primary);
                  "
                >
                  <div
                    class="mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 text-4xl shadow-inner"
                    style="
                      background: rgba(255, 255, 255, 0.25);
                      border-color: rgba(255, 255, 255, 0.45);
                    "
                  >
                    💌
                  </div>
                  <p class="font-display text-lg font-bold">
                    Pesan Rahasia Kucing
                  </p>
                  <p class="mt-1 text-xs font-bold opacity-85">
                    {{ themeSparkSymbols[0] }} Membuka amplop kejutan... {{ themeSparkSymbols[1] }}
                  </p>
                </div>

                <!-- Sisi Depan Kartu (Hasil Gacha / Auto-Drop — Sinkron Tema & Mode Terang/Gelap) -->
                <div
                  class="gacha-card-face gacha-card-back flex flex-col justify-between rounded-3xl border-2 p-5 text-center shadow-2xl"
                  style="
                    background: var(--card-bg-solid);
                    border-color: var(--accent-primary);
                    color: var(--text-primary);
                    box-shadow: 0 18px 42px -12px var(--twilight-glow);
                  "
                >
                  <!-- Baris Atas: Nomor Kartu + Badge BARU! / Bonus -->
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                      style="
                        background: var(--surface-subtle);
                        border-color: var(--border-subtle);
                        color: var(--text-secondary);
                      "
                    >
                      {{ formatCardNumber(lastDrawnCardResult.card.number) }} / {{ totalCardsCount }}
                    </span>

                    <span
                      v-if="lastDrawnCardResult.isNew"
                      class="cozy-active-btn animate-pulse rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shadow-sm"
                    >
                      ✨ BARU!
                    </span>
                    <span
                      v-else-if="isAffinityAutoDrop && (lastDrawnCardResult.bonusFish ?? 0) > 0"
                      class="cozy-active-btn rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shadow-sm"
                    >
                      🐟 Bonus +{{ lastDrawnCardResult.bonusFish }} Koin Ikan!
                    </span>
                    <span
                      v-else
                      class="rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
                      style="
                        background: var(--accent-soft);
                        border-color: var(--border-strong);
                        color: var(--text-primary);
                      "
                    >
                      ♻️ Duplikat (+1 💖)
                    </span>
                  </div>

                  <!-- Tengah: Emoji Kucing Besar, Nama Kartu & Badge Kategori -->
                  <div class="my-1 flex flex-col items-center">
                    <div
                      class="mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 text-4xl shadow-md"
                      style="
                        background: var(--accent-soft);
                        border-color: var(--border-strong);
                      "
                    >
                      {{ lastDrawnCardResult.card.emoji }}
                    </div>

                    <h3
                      class="font-display text-base font-bold"
                      style="color: var(--text-primary)"
                    >
                      {{ lastDrawnCardResult.card.name }}
                    </h3>

                    <div class="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                      <span
                        class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
                        style="
                          background: var(--accent-badge-bg);
                          border-color: var(--accent-badge-border);
                          color: var(--accent-badge-text);
                        "
                      >
                        <span>{{ SECRET_CARD_CATEGORIES[lastDrawnCardResult.card.category].icon }}</span>
                        <span>{{ SECRET_CARD_CATEGORIES[lastDrawnCardResult.card.category].label }}</span>
                      </span>

                      <span
                        class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold"
                        :style="getRarityPillStyle(lastDrawnCardResult.card)"
                      >
                        <span>{{ getCardRarityMeta(lastDrawnCardResult.card).icon }}</span>
                        <span>{{ getCardRarityMeta(lastDrawnCardResult.card).label }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Isi Teks Kartu -->
                  <div
                    class="rounded-2xl border px-3.5 py-3 text-xs font-semibold leading-relaxed"
                    style="
                      background: var(--surface-subtle);
                      border-color: var(--border-subtle);
                      color: var(--text-primary);
                    "
                  >
                    "{{ lastDrawnCardResult.card.text }}"
                  </div>
                </div>
              </div>
            </div>

            <!-- Pesan jika koin kurang saat klik Tarik Lagi -->
            <p
              v-if="gachaErrorText"
              class="mt-3 rounded-full border px-3.5 py-1 text-xs font-bold"
              style="
                background: var(--accent-soft);
                border-color: var(--border-strong);
                color: var(--text-primary);
              "
            >
              {{ gachaErrorText }}
            </p>

            <!-- Tombol Aksi di Bawah Kartu -->
            <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <!-- Jika kartu berasal dari Hadiah Bar Kasih Sayang Penuh -->
              <template v-if="isAffinityAutoDrop">
                <button
                  type="button"
                  class="cozy-active-btn btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold shadow-md transition"
                  @click="handleSaveToAlbum"
                >
                  <span>💾</span>
                  <span>Simpan ke Album ({{ collectedCount }}/{{ totalCardsCount }})</span>
                </button>

                <button
                  type="button"
                  class="cozy-secondary-btn btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition"
                  @click="closeModal"
                >
                  <span>Tutup</span>
                </button>
              </template>

              <!-- Jika kartu berasal dari Gacha biasa -->
              <template v-else>
                <button
                  type="button"
                  class="btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-md transition"
                  :class="treatCoins >= SECRET_CARD_GACHA_COST ? 'cozy-active-btn' : 'cozy-secondary-btn opacity-75'"
                  @click="handleDrawAgain"
                >
                  <span>🎴</span>
                  <span>Tarik Lagi ({{ SECRET_CARD_GACHA_COST }} 🐟)</span>
                </button>

                <button
                  type="button"
                  class="cozy-secondary-btn btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition"
                  @click="secretCardModalMode = 'album'"
                >
                  <span>📖</span>
                  <span>Lihat Koleksi ({{ collectedCount }}/{{ totalCardsCount }})</span>
                </button>
              </template>
            </div>
          </div>

          <!-- Kondisi jika user membuka tab Gacha tanpa kartu yang baru ditarik -->
          <div v-else class="flex flex-col items-center py-8 text-center">
            <div class="mb-3 text-5xl">💌</div>
            <p class="font-display text-base font-bold" style="color: var(--text-primary)">
              Siap menarik Pesan Rahasia Kucing?
            </p>
            <p class="mt-1 max-w-sm text-xs font-medium" style="color: var(--text-secondary)">
              Kumpulkan {{ totalCardsCount }} kartu kawaii berisi kutipan penyemangat, fakta unik kucing, jokes bapak kucing, dan gombalan manis kucing!
            </p>
            <p
              v-if="gachaErrorText"
              class="mt-3 rounded-full border px-3.5 py-1 text-xs font-bold"
              style="
                background: var(--accent-soft);
                border-color: var(--border-strong);
                color: var(--text-primary);
              "
            >
              {{ gachaErrorText }}
            </p>
            <button
              type="button"
              class="cozy-active-btn btn-bouncy mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold shadow-md"
              @click="handleDrawAgain"
            >
              <span>🎴</span>
              <span>Tarik Kartu Rahasia ({{ SECRET_CARD_GACHA_COST }} 🐟)</span>
            </button>
          </div>
        </div>

        <!-- KONTEN 2: MODE ALBUM KOLEKSI KARTU (X/36) -->
        <div v-else class="relative z-10 flex flex-1 flex-col overflow-hidden px-5 py-4">
          <!-- Bilah Progres Koleksi + 4 Filter Kategori -->
          <div class="mb-3 flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2 text-xs font-bold">
              <span style="color: var(--text-primary)">
                ✨ Progres Koleksi: {{ collectedCount }}/{{ totalCardsCount }} Kartu
              </span>
              <span style="color: var(--accent-primary)">{{ collectionPercent }}%</span>
            </div>
            <div
              class="h-2.5 w-full overflow-hidden rounded-full border"
              style="background: var(--surface-subtle); border-color: var(--border-subtle)"
            >
              <div
                class="h-full rounded-full transition-all duration-500"
                style="background: var(--accent-gradient)"
                :style="{ width: `${collectionPercent}%` }"
              />
            </div>

            <!-- 4 Filter Kategori + Semua -->
            <div class="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <button
                type="button"
                class="cursor-pointer rounded-full border px-2.5 py-1 transition"
                :class="activeAlbumFilter === 'all' ? 'cozy-active-btn border-transparent shadow-sm' : 'cozy-tab-inactive'"
                @click="activeAlbumFilter = 'all'"
              >
                Semua ({{ totalCardsCount }})
              </button>
              <button
                v-for="cat in Object.values(SECRET_CARD_CATEGORIES)"
                :key="cat.id"
                type="button"
                class="cursor-pointer rounded-full border px-2.5 py-1 transition"
                :class="activeAlbumFilter === cat.id ? 'cozy-active-btn border-transparent shadow-sm' : 'cozy-tab-inactive'"
                @click="activeAlbumFilter = cat.id"
              >
                {{ cat.icon }} {{ cat.shortLabel }} ({{ categoryTotalCounts[cat.id] }})
              </button>
            </div>
          </div>

          <!-- Pratinjau Detail Kartu Terpilih dari Album -->
          <div
            v-if="inspectingAlbumCard"
            class="mb-3 rounded-2xl border-[1.5px] p-3.5 text-left shadow-sm"
            style="
              background: var(--accent-soft);
              border-color: var(--border-strong);
              color: var(--text-primary);
            "
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <span
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-2xl"
                  style="background: var(--card-bg-solid); border-color: var(--border-subtle)"
                >
                  {{ inspectingAlbumCard.emoji }}
                </span>
                <div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] font-extrabold" style="color: var(--accent-primary)">
                      {{ formatCardNumber(inspectingAlbumCard.number) }}
                    </span>
                    <span class="font-display text-sm font-bold" style="color: var(--text-primary)">
                      {{ inspectingAlbumCard.name }}
                    </span>
                  </div>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1">
                    <span
                      class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold"
                      style="
                        background: var(--accent-badge-bg);
                        border-color: var(--accent-badge-border);
                        color: var(--accent-badge-text);
                      "
                    >
                      {{ SECRET_CARD_CATEGORIES[inspectingAlbumCard.category].icon }}
                      {{ SECRET_CARD_CATEGORIES[inspectingAlbumCard.category].label }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-extrabold"
                      :style="getRarityPillStyle(inspectingAlbumCard)"
                    >
                      {{ getCardRarityMeta(inspectingAlbumCard).icon }}
                      {{ getCardRarityMeta(inspectingAlbumCard).label }}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="cozy-secondary-btn cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold"
                @click="inspectingAlbumCard = null"
              >
                ✕
              </button>
            </div>
            <p
              class="mt-2.5 rounded-xl border px-3 py-2 text-xs font-semibold leading-relaxed"
              style="
                background: var(--card-bg-solid);
                border-color: var(--border-subtle);
                color: var(--text-primary);
              "
            >
              "{{ inspectingAlbumCard.text }}"
            </p>
          </div>

          <!-- Grid 36 Kartu Koleksi -->
          <div class="grid flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            <button
              v-for="card in filteredAlbumCards"
              :key="card.id"
              type="button"
              :disabled="!isCardCollected(card.id)"
              class="flex flex-col justify-between rounded-2xl border p-3 text-left transition"
              :style="
                isCardCollected(card.id)
                  ? inspectingAlbumCard?.id === card.id
                    ? {
                        background: 'var(--accent-soft)',
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--text-primary)',
                      }
                    : {
                        background: 'var(--accent-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }
                  : {
                      background: 'var(--surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }
              "
              :class="isCardCollected(card.id) ? 'cursor-pointer hover:brightness-105' : 'cursor-default opacity-80'"
              @click="openAlbumCardDetail(card)"
            >
              <!-- Kartu Sudah Terkoleksi -->
              <template v-if="isCardCollected(card.id)">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="text-xl leading-none">{{ card.emoji }}</span>
                    <div class="min-w-0">
                      <p class="truncate text-xs font-bold" style="color: var(--text-primary)">
                        {{ formatCardNumber(card.number) }} {{ card.name }}
                      </p>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1">
                        <span
                          class="inline-block rounded-full border px-1.5 py-0.2 text-[9px] font-bold"
                          style="
                            background: var(--accent-badge-bg);
                            border-color: var(--accent-badge-border);
                            color: var(--accent-badge-text);
                          "
                        >
                          {{ SECRET_CARD_CATEGORIES[card.category].icon }} {{ SECRET_CARD_CATEGORIES[card.category].shortLabel }}
                        </span>
                        <span
                          class="inline-block rounded-full border px-1.5 py-0.2 text-[9px] font-extrabold"
                          :style="getRarityPillStyle(card)"
                        >
                          {{ getCardRarityMeta(card).icon }} {{ getCardRarityMeta(card).label }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p
                  class="mt-2 line-clamp-2 text-[11px] font-medium leading-snug"
                  style="color: var(--text-secondary)"
                >
                  "{{ card.text }}"
                </p>
              </template>

              <!-- Kartu Belum Didapat: Siluet Misteri 🔒 ??? -->
              <template v-else>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-bold" style="color: var(--text-secondary)">
                    {{ formatCardNumber(card.number) }}
                  </span>
                  <span
                    class="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold"
                    style="
                      background: var(--card-bg-solid);
                      border-color: var(--border-subtle);
                      color: var(--text-secondary);
                    "
                  >
                    {{ SECRET_CARD_CATEGORIES[card.category].icon }} {{ SECRET_CARD_CATEGORIES[card.category].shortLabel }}
                  </span>
                </div>
                <div class="my-2 flex items-center justify-center gap-1.5 py-1 text-center">
                  <span class="font-display text-sm font-bold tracking-wider" style="color: var(--text-secondary)">
                    🔒 ???
                  </span>
                </div>
                <p class="text-center text-[10px] font-medium" style="color: var(--text-muted)">
                  Tarik Gacha ({{ SECRET_CARD_GACHA_COST }} 🐟) atau penuhi Bar Kasih Sayang 💖
                </p>
              </template>
            </button>
          </div>

          <!-- Footer Album: tombol cepat tarik gacha -->
          <div
            class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
            style="border-color: var(--border-subtle)"
          >
            <span class="text-[11px] font-semibold" style="color: var(--text-secondary)">
              {{
                collectedCount >= totalCardsCount
                  ? `🌟 Koleksi ${totalCardsCount}/${totalCardsCount} lengkap! Gacha beri +1 💖 • Auto-drop beri +${AFFINITY_DROP_DUPLICATE_FISH_BONUS} 🐟`
                  : `Kartu baru diprioritaskan hingga ${totalCardsCount}/${totalCardsCount} lengkap~`
              }}
            </span>
            <button
              type="button"
              class="cozy-active-btn btn-bouncy shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-[11px] font-bold shadow"
              @click="handleDrawAgain"
            >
              🎴 Tarik ({{ SECRET_CARD_GACHA_COST }} 🐟)
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
