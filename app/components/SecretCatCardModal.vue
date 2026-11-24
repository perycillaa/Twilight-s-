<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  SECRET_CARD_CATEGORIES,
  SECRET_CARD_GACHA_COST,
  SECRET_CAT_CARDS,
  type SecretCardCategoryId,
  type SecretCatCard,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  treatCoins,
  collectedSecretCards,
  isSecretCardModalOpen,
  secretCardModalMode,
  lastDrawnCardResult,
  drawSecretCatCard,
} = useTwilightStorage()

// State animasi 3D flip card reveal & kilau bintang
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

const filteredAlbumCards = computed<SecretCatCard[]>(() => {
  if (activeAlbumFilter.value === 'all') return SECRET_CAT_CARDS
  return SECRET_CAT_CARDS.filter(card => card.category === activeAlbumFilter.value)
})

const revealSparkOffsets = [
  { tx: '-110px', ty: '-85px', symbol: '✨' },
  { tx: '115px', ty: '-78px', symbol: '⭐' },
  { tx: '-125px', ty: '15px', symbol: '💖' },
  { tx: '128px', ty: '22px', symbol: '✦' },
  { tx: '-88px', ty: '96px', symbol: '⭐' },
  { tx: '92px', ty: '90px', symbol: '✨' },
  { tx: '0px', ty: '-115px', symbol: '💌' },
  { tx: '0px', ty: '112px', symbol: '💖' },
]

function formatCardNumber(num: number): string {
  return `#${String(num).padStart(2, '0')}`
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
    }, 900)
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d071c]/75 p-4 backdrop-blur-md"
      @click.self="closeModal"
    >
      <div
        class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-pink-300/40 bg-gradient-to-br from-[#231340]/98 via-[#2d184f]/98 to-[#1c1033]/98 shadow-2xl shadow-pink-500/20"
      >
        <!-- Header Modal -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 px-5 py-3.5">
          <div class="flex items-center gap-2">
            <span class="text-xl">💌</span>
            <div>
              <h2 class="font-display text-base font-bold text-pink-100 sm:text-lg">
                Pesan Rahasia Kucing
              </h2>
              <p class="text-[11px] font-medium text-purple-200/80">
                Koleksi {{ collectedCount }}/{{ totalCardsCount }} kartu • Saldo 🐟 {{ treatCoins }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Switcher Tab Gacha / Album -->
            <div class="flex rounded-full border border-white/15 bg-black/25 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                class="cursor-pointer rounded-full px-3 py-1 transition"
                :class="
                  secretCardModalMode === 'gacha'
                    ? 'bg-[#f9a8d4] text-[#311042] shadow'
                    : 'text-purple-100/80 hover:text-white'
                "
                @click="secretCardModalMode = 'gacha'"
              >
                🎴 Gacha
              </button>
              <button
                type="button"
                class="cursor-pointer rounded-full px-3 py-1 transition"
                :class="
                  secretCardModalMode === 'album'
                    ? 'bg-[#c4b5fd] text-[#1e1b4b] shadow'
                    : 'text-purple-100/80 hover:text-white'
                "
                @click="secretCardModalMode = 'album'; inspectingAlbumCard = null"
              >
                📖 Album ({{ collectedCount }}/{{ totalCardsCount }})
              </button>
            </div>

            <button
              type="button"
              aria-label="Tutup jendela Pesan Rahasia Kucing"
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-pink-100 transition hover:bg-pink-400 hover:text-[#1e1b4b]"
              @click="closeModal"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- KONTEN 1: MODE GACHA (3D Flip Card Reveal) -->
        <div
          v-if="secretCardModalMode === 'gacha'"
          class="flex flex-col items-center justify-center overflow-y-auto px-5 py-6"
        >
          <div v-if="lastDrawnCardResult" class="relative flex w-full flex-col items-center">
            <!-- Kilau Bintang Lembut saat Kartu Terbuka -->
            <div
              v-if="showRevealSparks"
              aria-hidden="true"
              class="pointer-events-none absolute left-1/2 top-40 z-20"
            >
              <span
                v-for="(spark, idx) in revealSparkOffsets"
                :key="`gacha-spark-${idx}`"
                class="animate-spark-pop absolute text-lg drop-shadow-[0_0_8px_rgba(253,224,71,0.9)]"
                :style="{ '--tx': spark.tx, '--ty': spark.ty }"
              >
                {{ spark.symbol }}
              </span>
            </div>

            <!-- Kartu 3D Flip Container -->
            <div
              class="gacha-card-scene relative h-[320px] w-full max-w-[330px] cursor-pointer select-none sm:h-[340px]"
              title="Klik kartu untuk membalik ulang"
              @click="isCardFlipped = !isCardFlipped"
            >
              <div
                class="gacha-card-inner relative h-full w-full"
                :class="{ 'is-flipped': isCardFlipped }"
              >
                <!-- Sisi Belakang Kartu (Amplop Rahasia Kucing) -->
                <div
                  class="gacha-card-face flex flex-col items-center justify-center rounded-3xl border-2 border-pink-300/60 bg-gradient-to-br from-[#3b1c6e] via-[#5b2189] to-[#83286c] p-6 text-center shadow-xl shadow-purple-950/60"
                >
                  <div class="mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-pink-200/50 bg-white/15 text-4xl shadow-inner">
                    💌
                  </div>
                  <p class="font-display text-lg font-bold text-pink-100">
                    Pesan Rahasia Kucing
                  </p>
                  <p class="mt-1 text-xs font-medium text-purple-100/80">
                    ✦ Membuka amplop bintang... ✦
                  </p>
                </div>

                <!-- Sisi Depan Kartu (Hasil Gacha) -->
                <div
                  class="gacha-card-face gacha-card-back flex flex-col justify-between rounded-3xl border-2 p-5 text-center shadow-2xl"
                  :class="
                    lastDrawnCardResult.isNew
                      ? 'border-amber-200/80 bg-gradient-to-br from-[#2f1757] via-[#451d68] to-[#2c1545] shadow-amber-300/20'
                      : 'border-pink-300/65 bg-gradient-to-br from-[#28164a] via-[#3a1f5e] to-[#261340] shadow-pink-500/20'
                  "
                >
                  <!-- Baris Atas: Nomor Kartu + Badge BARU! / Duplikat (+1 💖) -->
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="rounded-full border border-white/20 bg-black/25 px-2.5 py-0.5 text-[11px] font-bold text-purple-100"
                    >
                      {{ formatCardNumber(lastDrawnCardResult.card.number) }} / {{ totalCardsCount }}
                    </span>

                    <span
                      v-if="lastDrawnCardResult.isNew"
                      class="animate-pulse rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-300 to-pink-300 px-2.5 py-0.5 text-[10px] font-extrabold text-[#2a103d] shadow-sm"
                    >
                      ✨ BARU!
                    </span>
                    <span
                      v-else
                      class="rounded-full border border-pink-200/55 bg-pink-400/25 px-2.5 py-0.5 text-[10px] font-bold text-pink-100"
                    >
                      ♻️ Duplikat (+1 💖)
                    </span>
                  </div>

                  <!-- Tengah: Emoji Kucing Besar, Nama Kartu & Badge Kategori -->
                  <div class="my-1 flex flex-col items-center">
                    <div
                      class="mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-pink-200/40 bg-white/10 text-4xl shadow-[0_0_24px_rgba(249,168,212,0.35)]"
                    >
                      {{ lastDrawnCardResult.card.emoji }}
                    </div>

                    <h3 class="font-display text-base font-bold text-white">
                      {{ lastDrawnCardResult.card.name }}
                    </h3>

                    <span
                      class="mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
                      :class="SECRET_CARD_CATEGORIES[lastDrawnCardResult.card.category].badgeClass"
                    >
                      <span>{{ SECRET_CARD_CATEGORIES[lastDrawnCardResult.card.category].icon }}</span>
                      <span>{{ SECRET_CARD_CATEGORIES[lastDrawnCardResult.card.category].label }}</span>
                    </span>
                  </div>

                  <!-- Isi Teks Kartu -->
                  <div
                    class="rounded-2xl border border-white/15 bg-black/25 px-3.5 py-3 text-xs font-semibold leading-relaxed text-pink-50"
                  >
                    "{{ lastDrawnCardResult.card.text }}"
                  </div>
                </div>
              </div>
            </div>

            <!-- Pesan jika koin kurang saat klik Tarik Lagi -->
            <p
              v-if="gachaErrorText"
              class="mt-3 rounded-full border border-amber-200/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-100"
            >
              {{ gachaErrorText }}
            </p>

            <!-- Tombol Aksi di Bawah Kartu -->
            <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                class="btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold shadow-lg transition"
                :class="
                  treatCoins >= SECRET_CARD_GACHA_COST
                    ? 'border-pink-200/70 bg-gradient-to-r from-[#f9a8d4] to-[#c084fc] text-[#2a103d] hover:brightness-105'
                    : 'border-white/15 bg-white/10 text-purple-200/65'
                "
                @click="handleDrawAgain"
              >
                <span>🎴</span>
                <span>Tarik Lagi ({{ SECRET_CARD_GACHA_COST }} 🐟)</span>
              </button>

              <button
                type="button"
                class="btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-purple-200/35 bg-white/10 px-4 py-2 text-xs font-semibold text-purple-100 hover:bg-white/20"
                @click="secretCardModalMode = 'album'"
              >
                <span>📖</span>
                <span>Lihat Koleksi ({{ collectedCount }}/{{ totalCardsCount }})</span>
              </button>
            </div>
          </div>

          <!-- Kondisi jika user membuka tab Gacha tanpa kartu yang baru ditarik -->
          <div v-else class="flex flex-col items-center py-8 text-center">
            <div class="mb-3 text-5xl">💌</div>
            <p class="font-display text-base font-bold text-pink-100">
              Siap menarik Pesan Rahasia Kucing?
            </p>
            <p class="mt-1 max-w-sm text-xs text-purple-200/80">
              Kumpulkan 18 kartu kawaii berisi kutipan penyemangat, fakta lucu kucing, dan jokes bapak-bapak garing!
            </p>
            <p
              v-if="gachaErrorText"
              class="mt-3 rounded-full border border-amber-200/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-100"
            >
              {{ gachaErrorText }}
            </p>
            <button
              type="button"
              class="btn-bouncy mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-pink-200/70 bg-gradient-to-r from-[#f9a8d4] to-[#c084fc] px-5 py-2 text-xs font-bold text-[#2a103d] shadow-lg"
              @click="handleDrawAgain"
            >
              <span>🎴</span>
              <span>Tarik Kartu Rahasia ({{ SECRET_CARD_GACHA_COST }} 🐟)</span>
            </button>
          </div>
        </div>

        <!-- KONTEN 2: MODE ALBUM KOLEKSI KARTU (X/18) -->
        <div v-else class="flex flex-1 flex-col overflow-hidden px-5 py-4">
          <!-- Bilah Progres Koleksi + Filter Kategori -->
          <div class="mb-3 flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-2 text-xs font-bold">
              <span class="text-pink-100">
                ✨ Progres Koleksi: {{ collectedCount }}/{{ totalCardsCount }} Kartu
              </span>
              <span class="text-amber-200">{{ collectionPercent }}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-black/30">
              <div
                class="h-full rounded-full bg-gradient-to-r from-[#f9a8d4] via-[#c084fc] to-[#fde68a] transition-all duration-500"
                :style="{ width: `${collectionPercent}%` }"
              />
            </div>

            <!-- Filter Kategori -->
            <div class="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <button
                type="button"
                class="cursor-pointer rounded-full border px-2.5 py-1 transition"
                :class="
                  activeAlbumFilter === 'all'
                    ? 'border-pink-200/80 bg-pink-300/25 text-white'
                    : 'border-white/15 bg-white/5 text-purple-200/80 hover:bg-white/15'
                "
                @click="activeAlbumFilter = 'all'"
              >
                Semua ({{ totalCardsCount }})
              </button>
              <button
                v-for="cat in Object.values(SECRET_CARD_CATEGORIES)"
                :key="cat.id"
                type="button"
                class="cursor-pointer rounded-full border px-2.5 py-1 transition"
                :class="
                  activeAlbumFilter === cat.id
                    ? cat.badgeClass
                    : 'border-white/15 bg-white/5 text-purple-200/80 hover:bg-white/15'
                "
                @click="activeAlbumFilter = cat.id"
              >
                {{ cat.icon }} {{ cat.shortLabel }}
              </button>
            </div>
          </div>

          <!-- Pratinjau Detail Kartu Terpilih dari Album -->
          <div
            v-if="inspectingAlbumCard"
            class="mb-3 rounded-2xl border border-pink-300/55 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 p-3.5 text-left shadow-inner"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-2xl">
                  {{ inspectingAlbumCard.emoji }}
                </span>
                <div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[10px] font-bold text-pink-200">
                      {{ formatCardNumber(inspectingAlbumCard.number) }}
                    </span>
                    <span class="font-display text-sm font-bold text-white">
                      {{ inspectingAlbumCard.name }}
                    </span>
                  </div>
                  <span
                    class="mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold"
                    :class="SECRET_CARD_CATEGORIES[inspectingAlbumCard.category].badgeClass"
                  >
                    {{ SECRET_CARD_CATEGORIES[inspectingAlbumCard.category].icon }}
                    {{ SECRET_CARD_CATEGORIES[inspectingAlbumCard.category].label }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="cursor-pointer rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-purple-100 hover:bg-white/20"
                @click="inspectingAlbumCard = null"
              >
                ✕
              </button>
            </div>
            <p class="mt-2.5 rounded-xl bg-black/25 px-3 py-2 text-xs font-semibold leading-relaxed text-pink-50">
              "{{ inspectingAlbumCard.text }}"
            </p>
          </div>

          <!-- Grid 18 Kartu Koleksi -->
          <div class="grid flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            <button
              v-for="card in filteredAlbumCards"
              :key="card.id"
              type="button"
              :disabled="!isCardCollected(card.id)"
              class="flex flex-col justify-between rounded-2xl border p-3 text-left transition"
              :class="
                isCardCollected(card.id)
                  ? inspectingAlbumCard?.id === card.id
                    ? 'cursor-pointer border-pink-300/85 bg-pink-300/20 shadow-md'
                    : 'cursor-pointer border-white/20 bg-white/10 hover:border-pink-200/50 hover:bg-white/15'
                  : 'cursor-default border-white/10 bg-black/30 opacity-70'
              "
              @click="openAlbumCardDetail(card)"
            >
              <!-- Kartu Sudah Terkoleksi -->
              <template v-if="isCardCollected(card.id)">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="text-xl leading-none">{{ card.emoji }}</span>
                    <div class="min-w-0">
                      <p class="truncate text-xs font-bold text-white">
                        {{ formatCardNumber(card.number) }} {{ card.name }}
                      </p>
                      <span
                        class="mt-0.5 inline-block rounded-full border px-1.5 py-0.2 text-[9px] font-semibold"
                        :class="SECRET_CARD_CATEGORIES[card.category].badgeClass"
                      >
                        {{ SECRET_CARD_CATEGORIES[card.category].icon }} {{ SECRET_CARD_CATEGORIES[card.category].shortLabel }}
                      </span>
                    </div>
                  </div>
                </div>
                <p class="mt-2 line-clamp-2 text-[11px] leading-snug text-pink-50/90">
                  "{{ card.text }}"
                </p>
              </template>

              <!-- Kartu Belum Didapat: Siluet Misteri 🔒 ??? -->
              <template v-else>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-bold text-purple-300/70">
                    {{ formatCardNumber(card.number) }}
                  </span>
                  <span
                    class="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-purple-200/70"
                  >
                    {{ SECRET_CARD_CATEGORIES[card.category].icon }} {{ SECRET_CARD_CATEGORIES[card.category].shortLabel }}
                  </span>
                </div>
                <div class="my-2 flex items-center justify-center gap-1.5 py-1 text-center">
                  <span class="font-display text-sm font-bold tracking-wider text-purple-200/65">
                    🔒 ???
                  </span>
                </div>
                <p class="text-center text-[10px] text-purple-300/55">
                  Tarik Gacha (2 🐟) untuk membuka
                </p>
              </template>
            </button>
          </div>

          <!-- Footer Album: tombol cepat tarik gacha -->
          <div class="mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-3">
            <span class="text-[11px] font-medium text-purple-200/80">
              {{
                collectedCount >= totalCardsCount
                  ? '🌟 Koleksi 18/18 lengkap! Tarikan berikutnya beri +1 💖'
                  : 'Kartu baru diprioritaskan hingga 18/18 lengkap~'
              }}
            </span>
            <button
              type="button"
              class="btn-bouncy shrink-0 cursor-pointer rounded-full border border-pink-200/70 bg-gradient-to-r from-[#f9a8d4] to-[#c084fc] px-3.5 py-1.5 text-[11px] font-bold text-[#2a103d] shadow"
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
