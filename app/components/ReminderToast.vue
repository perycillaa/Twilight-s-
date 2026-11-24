<script setup lang="ts">
import { useTwilightStorage } from '~/composables/useTwilightStorage'

const {
  activeReminder,
  miniToastMessage,
  dailyRewardCardMessage,
  dismissReminder,
  completeActiveReminder,
  snoozeActiveReminder,
  dismissDailyRewardCard,
} = useTwilightStorage()
</script>

<template>
  <!-- 1. Banner Kontrol Alarm Pengingat Target (tampil di pojok kanan atas / tengah atas di HP) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="-translate-y-4 opacity-0 scale-95"
    enter-to-class="translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100 scale-100"
    leave-to-class="-translate-y-4 opacity-0 scale-95"
  >
    <div
      v-if="activeReminder"
      role="alert"
      class="fixed left-1/2 top-5 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-3xl border bg-[#261447]/95 p-4 shadow-2xl backdrop-blur-lg sm:left-auto sm:right-5 sm:translate-x-0"
      :class="
        activeReminder.alarmMode === 'repeat'
          ? 'border-pink-300/75 shadow-pink-500/35 ring-2 ring-pink-300/40'
          : 'border-pink-200/45 shadow-pink-500/20'
      "
    >
      <div class="flex items-start gap-3">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300/30 to-purple-300/25 text-2xl"
          :class="{ 'animate-bounce': activeReminder.alarmMode === 'repeat' }"
        >
          {{ activeReminder.alarmMode === 'repeat' ? '⏰' : '🔔' }}
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-1.5">
            <span class="font-display text-[11px] font-bold uppercase tracking-wider text-pink-200">
              {{ activeReminder.isSnoozed ? '💤 Tunda Selesai •' : '✦' }}
              {{ activeReminder.alarmMode === 'repeat' ? 'Alarm Berulang' : 'Dering Lembut' }}
            </span>

            <span
              class="rounded-full border border-amber-200/40 bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold text-amber-100"
            >
              ⏰ {{ activeReminder.time }}
            </span>
          </div>

          <p class="mt-1 text-sm font-bold leading-snug text-white">
            ⏰ Pengingat: {{ activeReminder.habitTitle }} ({{ activeReminder.time }})
          </p>

          <!-- 3 Tombol Kontrol Alarm Interaktif -->
          <div class="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="btn-bouncy cursor-pointer rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-purple-100 hover:bg-white/20"
              @click="dismissReminder"
            >
              🔕 Matikan
            </button>

            <button
              type="button"
              class="btn-bouncy cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] px-3.5 py-1.5 text-xs font-bold text-[#311042] shadow-md shadow-pink-500/20"
              @click="completeActiveReminder"
            >
              ✓ Tandai Selesai
            </button>

            <button
              type="button"
              class="btn-bouncy cursor-pointer rounded-full border border-purple-200/40 bg-purple-400/20 px-3 py-1.5 text-xs font-bold text-purple-100 hover:bg-purple-400/35"
              @click="snoozeActiveReminder(5)"
            >
              💤 Tunda 5m
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- 2. Kartu Pop-up Hadiah Harian +5 Ikan Kering saat 100% Target Tuntas (1x/hari) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="-translate-y-4 opacity-0 scale-95"
    enter-to-class="translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100 scale-100"
    leave-to-class="-translate-y-4 opacity-0 scale-95"
  >
    <div
      v-if="dailyRewardCardMessage"
      role="status"
      class="fixed left-1/2 top-5 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-3xl border-2 border-amber-200/70 bg-gradient-to-r from-[#3b1557]/95 via-[#4c1d95]/95 to-[#6d285c]/95 px-4 py-3.5 shadow-2xl shadow-pink-500/30 backdrop-blur-lg"
    >
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 shrink-0 animate-bounce items-center justify-center rounded-2xl bg-amber-300/25 text-2xl">
          🐟
        </span>

        <div class="min-w-0 flex-1">
          <p class="font-display text-[11px] font-bold uppercase tracking-wider text-amber-200">
            ✦ Hadiah Harian Twilight's ✦
          </p>
          <p class="mt-0.5 text-xs font-bold leading-snug text-white sm:text-sm">
            {{ dailyRewardCardMessage }}
          </p>
        </div>

        <button
          type="button"
          aria-label="Tutup notifikasi hadiah"
          class="cursor-pointer rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-pink-100 transition hover:bg-white/25"
          @click="dismissDailyRewardCard"
        >
          ✕
        </button>
      </div>
    </div>
  </Transition>

  <!-- 3. Toast Mini Penyemangat setiap kali pengguna mencentang target -->
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="-translate-y-3 opacity-0 scale-95"
    enter-to-class="translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100 scale-100"
    leave-to-class="-translate-y-3 opacity-0 scale-95"
  >
    <div
      v-if="miniToastMessage && !dailyRewardCardMessage"
      role="status"
      class="pointer-events-none fixed left-1/2 top-5 z-40 -translate-x-1/2 rounded-full border border-pink-200/40 bg-[#2b184f]/95 px-4 py-2 text-xs font-bold text-pink-100 shadow-lg shadow-pink-500/20 backdrop-blur-md sm:text-sm"
    >
      {{ miniToastMessage }}
    </div>
  </Transition>
</template>
