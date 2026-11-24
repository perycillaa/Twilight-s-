<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { DAILY_MOOD_OPTIONS, useTwilightStorage } from '~/composables/useTwilightStorage'

const {
  isReceiptModalOpen,
  userName,
  habits,
  completedHabitCount,
  todayCompletionRate,
  todayFocusSessions,
  dailyStreak,
  treatCoins,
  dailyMood,
} = useTwilightStorage()

// Ambil daftar target yang sudah selesai dicentang hari ini
const completedHabits = computed(() => habits.value.filter(h => h.completed))

// Cari info mood hari ini jika pengguna sudah memilih
const todayMoodLabel = computed<string>(() => {
  const found = DAILY_MOOD_OPTIONS.find(m => m.id === dailyMood.value)
  return found ? `${found.emoji} ${found.label}` : 'Belum dipilih'
})

// Format tanggal Indonesia yang rapi untuk bagian atas struk
const formattedDate = computed<string>(() => {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
})

// Nomor struk estetis berbasis tanggal hari ini
const receiptNumber = computed<string>(() => {
  const now = new Date()
  const y = String(now.getFullYear()).slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `#TW-${y}${m}${d}`
})

function closeModal() {
  isReceiptModalOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isReceiptModalOpen.value) {
    closeModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <!-- Modal Pop-up "Struk Produktivitas Hari Ini" bergaya kertas struk kasir estetis -->
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isReceiptModalOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Struk Produktivitas Hari Ini"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0822]/75 p-4 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="relative w-full max-w-sm">
        <!-- Tepi gerigi atas kertas struk -->
        <svg class="block h-3 w-full text-[#fffaf4]" viewBox="0 0 360 12" preserveAspectRatio="none">
          <path
            d="M0 12 L10 0 L20 12 L30 0 L40 12 L50 0 L60 12 L70 0 L80 12 L90 0 L100 12 L110 0 L120 12 L130 0 L140 12 L150 0 L160 12 L170 0 L180 12 L190 0 L200 12 L210 0 L220 12 L230 0 L240 12 L250 0 L260 12 L270 0 L280 12 L290 0 L300 12 L310 0 L320 12 L330 0 L340 12 L350 0 L360 12 Z"
            fill="currentColor"
          />
        </svg>

        <!-- Badan Kertas Struk Kasir Estetis -->
        <div class="max-h-[78vh] overflow-y-auto bg-[#fffaf4] px-6 py-5 text-[#2d1b4e] shadow-2xl">
          <!-- Tombol tutup pojok kanan atas -->
          <button
            type="button"
            aria-label="Tutup struk"
            class="absolute right-4 top-5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-[#4c1d95] transition hover:bg-pink-200"
            @click="closeModal"
          >
            ✕
          </button>

          <!-- Kop Struk -->
          <div class="text-center">
            <p class="font-mono text-[10px] font-semibold tracking-[0.22em] text-purple-400">
              ★ PRODUCTIVITY RECEIPT ★
            </p>
            <h2 class="font-display mt-1 text-2xl font-bold text-[#db2777]">
              Twilight's
            </h2>
            <p class="text-[11px] font-semibold italic text-purple-700/80">
              "Cheer your day with me!"
            </p>

            <div class="mt-2.5 flex items-center justify-between border-y border-dashed border-purple-300/80 py-1.5 font-mono text-[10px] text-purple-900/75">
              <span>{{ formattedDate }}</span>
              <span>{{ receiptNumber }}</span>
            </div>
          </div>

          <!-- Rincian Ringkasan Produktivitas -->
          <div class="mt-3.5 space-y-1.5 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="text-purple-900/75">Pemilik</span>
              <span class="font-bold text-[#311042]">{{ userName }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-purple-900/75">Sesi Fokus Pomodoro</span>
              <span class="font-bold text-[#311042]">{{ todayFocusSessions }} sesi</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-purple-900/75">Mood Hari Ini</span>
              <span class="font-bold text-[#311042]">{{ todayMoodLabel }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-purple-900/75">Streak Harian</span>
              <span class="font-bold text-[#311042]">🔥 {{ dailyStreak }} hari</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-purple-900/75">Koin Ikan Kering</span>
              <span class="font-bold text-[#311042]">🐟 {{ treatCoins }}</span>
            </div>
          </div>

          <!-- Daftar Target Selesai -->
          <div class="mt-4 border-t border-dashed border-purple-300/80 pt-3">
            <div class="mb-2 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-purple-900">
              <span>Target Selesai</span>
              <span>{{ completedHabitCount }}/{{ habits.length }} ({{ todayCompletionRate }}%)</span>
            </div>

            <ul v-if="completedHabits.length > 0" class="space-y-1.5 font-mono text-xs">
              <li
                v-for="(item, idx) in completedHabits"
                :key="item.id"
                class="flex items-start justify-between gap-2 text-[#2d1b4e]"
              >
                <span class="min-w-0 flex-1 break-words">
                  {{ idx + 1 }}. {{ item.title }}
                </span>
                <span class="shrink-0 font-bold text-pink-600">✓ DONE</span>
              </li>
            </ul>

            <p
              v-else
              class="rounded-xl bg-pink-50 px-3 py-2 text-center font-mono text-[11px] text-purple-800/75"
            >
              Belum ada target tuntas hari ini — yuk mulai dari 1 target kecil! 🌱
            </p>
          </div>

          <!-- Stempel Imut: Approved by Twilight's Cat 🐾 -->
          <div class="mt-5 flex flex-col items-center border-t border-dashed border-purple-300/80 pt-4">
            <div
              class="-rotate-3 rounded-2xl border-2 border-dashed border-pink-400 bg-pink-50/90 px-4 py-2 text-center shadow-sm"
            >
              <p class="font-display text-xs font-bold tracking-wide text-pink-600">
                Approved by Twilight's Cat 🐾
              </p>
              <p class="mt-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-pink-400">
                ★ Verified Good Job Today ★
              </p>
            </div>

            <!-- Barcode hiasan struk kasir -->
            <div aria-hidden="true" class="mt-4 flex h-7 items-stretch justify-center gap-[2px] opacity-65">
              <span class="w-[2px] bg-[#2d1b4e]" />
              <span class="w-[1px] bg-[#2d1b4e]" />
              <span class="w-[3px] bg-[#2d1b4e]" />
              <span class="w-[1px] bg-[#2d1b4e]" />
              <span class="w-[2px] bg-[#2d1b4e]" />
              <span class="w-[4px] bg-[#2d1b4e]" />
              <span class="w-[1px] bg-[#2d1b4e]" />
              <span class="w-[2px] bg-[#2d1b4e]" />
              <span class="w-[3px] bg-[#2d1b4e]" />
              <span class="w-[1px] bg-[#2d1b4e]" />
              <span class="w-[2px] bg-[#2d1b4e]" />
              <span class="w-[1px] bg-[#2d1b4e]" />
              <span class="w-[3px] bg-[#2d1b4e]" />
              <span class="w-[2px] bg-[#2d1b4e]" />
              <span class="w-[1px] bg-[#2d1b4e]" />
              <span class="w-[4px] bg-[#2d1b4e]" />
              <span class="w-[2px] bg-[#2d1b4e]" />
              <span class="w-[1px] bg-[#2d1b4e]" />
              <span class="w-[3px] bg-[#2d1b4e]" />
              <span class="w-[2px] bg-[#2d1b4e]" />
            </div>
            <p class="mt-1 font-mono text-[9px] tracking-[0.25em] text-purple-900/50">
              THANK YOU FOR DOING YOUR BEST
            </p>

            <button
              type="button"
              class="btn-bouncy font-display mt-4 w-full cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] py-2 text-xs font-bold text-[#311042] shadow-md"
              @click="closeModal"
            >
              Tutup Struk ✨
            </button>
          </div>
        </div>

        <!-- Tepi gerigi bawah kertas struk -->
        <svg class="block h-3 w-full text-[#fffaf4]" viewBox="0 0 360 12" preserveAspectRatio="none">
          <path
            d="M0 0 L10 12 L20 0 L30 12 L40 0 L50 12 L60 0 L70 12 L80 0 L90 12 L100 0 L110 12 L120 0 L130 12 L140 0 L150 12 L160 0 L170 12 L180 0 L190 12 L200 0 L210 12 L220 0 L230 12 L240 0 L250 12 L260 0 L270 12 L280 0 L290 12 L300 0 L310 12 L320 0 L330 12 L340 0 L350 12 L360 0 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  </Transition>
</template>
