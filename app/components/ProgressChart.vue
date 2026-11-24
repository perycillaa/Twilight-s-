<script setup lang="ts">
import { computed } from 'vue'
import { DAYS_LABEL, useTwilightStorage } from '~/composables/useTwilightStorage'

// Ambil riwayat progres 7 hari, index hari ini, dan pemicu modal Struk Hari Ini
const { weeklyProgress, todayIndex, todayCompletionRate, isReceiptModalOpen } = useTwilightStorage()

/**
 * Memilih emoji ekspresi wajah lucu berdasarkan persentase progres harian
 */
function getMoodEmoji(percent: number): string {
  if (percent >= 100) return '🤩'
  if (percent >= 75) return '🥰'
  if (percent >= 45) return '😊'
  if (percent >= 1) return '🙂'
  return '😴'
}

/**
 * Menentukan tinggi visual batang grafik (minimal 10% agar batang tetap terlihat manis)
 */
function getBarHeightStyle(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent))
  const visualHeight = clamped === 0 ? 10 : Math.max(16, clamped)
  return `${visualHeight}%`
}

/**
 * Teks tooltip detail saat kursor diarahkan ke batang / emoji hari tertentu
 */
function getDayTooltipText(dayFullName: string, percent: number): string {
  if (percent <= 0) {
    return `${dayFullName}: Belum ada aktivitas 🌱`
  }
  return `${dayFullName}: ${percent}% selesai`
}

// Hitung Rata-rata Mingguan (dari 7 hari dalam seminggu)
const weeklyAverage = computed<number>(() => {
  const total = weeklyProgress.value.reduce((acc, val) => acc + (val ?? 0), 0)
  return Math.round(total / 7)
})

// Temukan Hari Terbaik (hari dengan persentase penyelesaian tertinggi minggu ini)
const bestDaySummary = computed<string>(() => {
  let maxVal = -1
  let bestIdx = -1

  weeklyProgress.value.forEach((val, idx) => {
    const score = val ?? 0
    if (score > maxVal) {
      maxVal = score
      bestIdx = idx
    }
  })

  if (maxVal <= 0 || bestIdx < 0) {
    return 'Belum ada 🌱'
  }

  const dayName = DAYS_LABEL[bestIdx]?.full ?? 'Hari ini'
  return `${dayName} (${maxVal}%)`
})

// Komentar penyemangat dinamis dari Twilight's berdasarkan performa minggu ini
const weeklyMotivation = computed<string>(() => {
  const avg = weeklyAverage.value
  const today = todayCompletionRate.value

  if (avg >= 80 || today >= 100) {
    return 'Luar biasa! Minggumu bersinar terang seperti bintang ✨🐱'
  }
  if (avg >= 45 || today >= 60) {
    return 'Progres minggumu makin keren! Pertahankan ritme hangat ini 🌸'
  }
  if (avg >= 1 || today >= 1) {
    return 'Langkah awal yang manis! Pelan-pelan asal konsisten ya~ 💫'
  }
  return 'Minggu baru menanti! Yuk centang 1 target kecil untuk memulai 🌱'
})
</script>

<template>
  <!-- Kolom Kanan Bawah: Grafik Progres Harian (7 Hari: S, S, R, K, J, S, M) -->
  <section class="glass-card flex flex-col justify-between p-5 sm:p-6">
    <!-- Header Grafik -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-lg">📊</span>
        <h2 class="font-display text-lg font-semibold text-pink-200">
          Grafik Progres Harian
        </h2>
      </div>

      <span
        class="rounded-full border border-pink-300/30 bg-pink-300/20 px-3 py-1 text-xs font-bold text-pink-100"
      >
        Hari ini: {{ todayCompletionRate }}%
      </span>
    </div>

    <!-- Area Grafik Batang Vertikal dengan Label Sumbu (100%, 50%, 0%) & Garis Target 80% -->
    <div class="relative mt-4 rounded-2xl border border-white/10 bg-black/20 px-3 pb-3 pt-7">
      <div class="flex items-stretch gap-2">
        <!-- 1. Label Sumbu Persentase Tipis di Sisi Kiri (100%, 50%, 0%) -->
        <div
          aria-hidden="true"
          class="flex h-40 w-7 shrink-0 flex-col justify-between pb-1 text-right text-[9px] font-bold text-purple-200/60"
        >
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>

        <!-- Area Plot Batang + Garis Bantu + Garis Target 80% -->
        <div class="relative flex-1">
          <!-- Garis bantu horizontal tipis (100%, 50%, 0%) -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 top-0 flex h-40 flex-col justify-between"
          >
            <div class="border-t border-dashed border-white/10" />
            <div class="border-t border-dashed border-white/10" />
            <div class="border-t border-white/15" />
          </div>

          <!-- Garis Batas Target 80% Putus-Putus Bercahaya + Label "Target ✨" -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-amber-200/80 shadow-[0_0_8px_rgba(253,230,138,0.6)]"
            style="top: 20%"
          >
            <span
              class="absolute -top-4 right-0 rounded-full bg-amber-300/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-100 backdrop-blur-xs"
            >
              Target ✨
            </span>
          </div>

          <!-- 7 Kolom Batang untuk Hari Senin - Minggu (S, S, R, K, J, S, M) -->
          <div class="relative z-20 grid grid-cols-7 gap-1.5 sm:gap-2">
            <div
              v-for="(day, index) in DAYS_LABEL"
              :key="`${day.full}-${index}`"
              class="group relative flex flex-col items-center"
            >
              <!-- 2. Tooltip Detail Melayang Saat Hover Batang / Emoji -->
              <div
                role="tooltip"
                class="pointer-events-none absolute -top-8 z-30 whitespace-nowrap rounded-xl border border-pink-200/40 bg-[#1e1b4b]/95 px-2.5 py-1 text-[10px] font-bold text-pink-100 opacity-0 shadow-lg transition-all duration-200 group-hover:-top-9 group-hover:opacity-100"
                :class="
                  index === 0
                    ? 'left-0'
                    : index === 6
                      ? 'right-0'
                      : 'left-1/2 -translate-x-1/2'
                "
              >
                {{ getDayTooltipText(day.full, weeklyProgress[index] ?? 0) }}
              </div>

              <!-- Wadah area batang + emoji di atas batang (tinggi tepat h-40 sejajar sumbu 0%-100%) -->
              <div class="flex h-40 w-full flex-col items-center justify-end pb-1">
                <!-- Emoji Ekspresi Wajah di Atas Batang -->
                <span
                  class="mb-1 select-none text-base transition-transform duration-300 group-hover:scale-125 sm:text-lg"
                  :aria-label="`Ekspresi ${day.full}`"
                >
                  {{ getMoodEmoji(weeklyProgress[index] ?? 0) }}
                </span>

                <!-- Batang Vertikal Warna Pink Pastel & Ungu -->
                <div
                  class="w-full max-w-[26px] rounded-t-full transition-all duration-500 ease-out"
                  :style="{ height: getBarHeightStyle(weeklyProgress[index] ?? 0) }"
                  :class="[
                    index % 2 === 0
                      ? 'bg-gradient-to-t from-[#f472b6] to-[#fbcfe8]'
                      : 'bg-gradient-to-t from-[#8b5cf6] to-[#d8b4fe]',
                    index === todayIndex
                      ? 'ring-2 ring-white/80 shadow-[0_0_14px_rgba(249,168,212,0.65)]'
                      : 'opacity-85 group-hover:opacity-100',
                  ]"
                />
              </div>

              <!-- Label Huruf Hari (S, S, R, K, J, S, M) -->
              <span
                class="font-display mt-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition"
                :class="
                  index === todayIndex
                    ? 'bg-[#f9a8d4] text-[#311042] shadow'
                    : 'text-purple-200/85'
                "
              >
                {{ day.short }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Baris Ringkasan Mingguan (Rata-rata, Hari Terbaik, & Komentar Penyemangat Dinamis) -->
    <div class="mt-3 rounded-2xl border border-white/15 bg-white/10 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div class="flex items-center gap-1.5">
          <span class="text-purple-200/80">Rata-rata:</span>
          <span class="font-display rounded-full bg-pink-300/20 px-2 py-0.5 font-bold text-pink-100">
            {{ weeklyAverage }}%
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-purple-200/80">Hari Terbaik:</span>
          <span class="font-display rounded-full bg-purple-300/20 px-2 py-0.5 font-bold text-purple-100">
            🏆 {{ bestDaySummary }}
          </span>
        </div>
      </div>

      <p class="mt-2 border-t border-white/10 pt-2 text-[11px] font-semibold leading-snug text-pink-100/90">
        {{ weeklyMotivation }}
      </p>
    </div>

    <!-- Tombol "🧾 Struk Hari Ini" di bagian bawah kolom kanan -->
    <div class="mt-3 flex items-center justify-between gap-2">
      <p class="text-[10px] font-medium text-purple-200/70">
        Arahkan kursor ke batang untuk detail ✦
      </p>

      <button
        type="button"
        class="btn-bouncy cursor-pointer rounded-full border border-pink-200/40 bg-pink-300/20 px-3 py-1 text-xs font-bold text-pink-100 shadow-sm hover:bg-pink-300/35"
        @click="isReceiptModalOpen = true"
      >
        🧾 Struk Hari Ini
      </button>
    </div>
  </section>
</template>
