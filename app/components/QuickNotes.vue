<script setup lang="ts">
import { computed } from 'vue'
import { DAILY_MOOD_OPTIONS, useTwilightStorage } from '~/composables/useTwilightStorage'

// Ambil state Catatan Cepat, Mood Harian, dan pemicu buka modal Kawaii Notebook
const { quickNotes, dailyMood, isNotebookOpen, updateQuickNotes, setDailyMood } = useTwilightStorage()

const selectedMoodInfo = computed(() => {
  return DAILY_MOOD_OPTIONS.find(m => m.id === dailyMood.value) ?? null
})

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  updateQuickNotes(target.value)
}

function clearNotes() {
  updateQuickNotes('')
}
</script>

<template>
  <!-- Panel Tab "Catatan & Mood": Mood Check-in Harian + Catatan Cepat -->
  <div class="w-full text-left">
    <!-- 1. Mood Check-in Harian (5 ikon ekspresi mood, tersimpan per hari di localStorage) -->
    <div class="mb-2.5 border-b border-white/15 pb-2.5">
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <span class="font-display text-xs font-semibold text-pink-200">
          💭 Mood Hari Ini
        </span>
        <span
          v-if="selectedMoodInfo"
          class="cozy-badge rounded-full bg-pink-300/20 px-2 py-0.5 text-[10px] font-bold text-pink-100"
        >
          {{ selectedMoodInfo.emoji }} {{ selectedMoodInfo.label }}
        </span>
        <span v-else class="text-[10px] font-medium text-purple-200/70">
          Pilih rasamu~
        </span>
      </div>

      <div class="grid grid-cols-5 gap-1">
        <button
          v-for="mood in DAILY_MOOD_OPTIONS"
          :key="mood.id"
          type="button"
          :title="mood.label"
          :aria-label="`Pilih mood ${mood.label}`"
          class="btn-bouncy flex cursor-pointer flex-col items-center justify-center rounded-xl border py-1 transition"
          :class="
            dailyMood === mood.id
              ? 'cozy-pill-btn border-pink-300/80 bg-pink-300/25 shadow-sm'
              : 'border-white/15 bg-black/20 opacity-80 hover:bg-white/15 hover:opacity-100'
          "
          @click="setDailyMood(mood.id)"
        >
          <span class="text-sm leading-none">{{ mood.emoji }}</span>
          <span class="mt-0.5 text-[8.5px] font-semibold text-pink-50/90">
            {{ mood.label }}
          </span>
        </button>
      </div>
    </div>

    <!-- 2. Catatan Cepat / Sticky Note + Tautan Cepat ke Kawaii Notebook -->
    <div class="mb-1.5 flex items-center justify-between gap-2">
      <span class="font-display text-xs font-semibold text-pink-200">
        📝 Catatan Cepat
      </span>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          title="Buka buku catatan penuh (Kawaii Notebook)"
          class="cozy-pill-btn cursor-pointer rounded-full border border-pink-200/35 bg-pink-300/20 px-2 py-0.5 text-[10px] font-bold text-pink-100 transition"
          @click="isNotebookOpen = true"
        >
          📔 Notebook ↗
        </button>
        <button
          v-if="quickNotes.length > 0"
          type="button"
          title="Bersihkan catatan"
          class="cursor-pointer rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-pink-200 transition hover:bg-pink-400/30"
          @click="clearNotes"
        >
          Hapus
        </button>
      </div>
    </div>

    <textarea
      :value="quickNotes"
      rows="2"
      placeholder="Tulis ide brilian atau pengingat mendadak di sini... 💡"
      class="w-full resize-none rounded-xl border border-white/15 bg-black/20 p-2 text-xs leading-relaxed text-pink-50 placeholder-purple-200/60 outline-none transition focus:border-pink-300/60 focus:bg-black/30"
      @input="handleInput"
    />
  </div>
</template>
