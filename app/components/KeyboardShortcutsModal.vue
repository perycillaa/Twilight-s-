<script setup lang="ts">
import { useTwilightStorage } from '~/composables/useTwilightStorage'

const { isShortcutsModalOpen } = useTwilightStorage()

interface ShortcutItem {
  keys: string[]
  label: string
  category: 'timer' | 'focus' | 'audio' | 'tools'
}

const SHORTCUT_ITEMS: ShortcutItem[] = [
  { keys: ['Spasi'], label: 'Start / Pause Pomodoro Timer', category: 'timer' },
  { keys: ['R'], label: 'Reset Pomodoro Timer', category: 'timer' },
  { keys: ['1', '2', '3'], label: 'Pindah tab: Fokus / Istirahat Singkat / Panjang', category: 'timer' },
  { keys: ['T'], label: 'Masuk / keluar Twilight Focus (layar penuh)', category: 'focus' },
  { keys: ['Z'], label: 'Masuk / keluar Starlight Focus ✨', category: 'focus' },
  { keys: ['M'], label: 'Mute / Unmute seluruh suara (BGM & Ambient)', category: 'audio' },
  { keys: ['P'], label: 'Play / Pause musik pada BGM Player', category: 'audio' },
  { keys: ['N'], label: 'Buka / tutup Notebook', category: 'tools' },
  { keys: ['G'], label: 'Buka / tutup Break Game', category: 'tools' },
  { keys: ['C'], label: 'Elus / sapa Kucing Putih (+Kasih Sayang 💖)', category: 'tools' },
  { keys: ['Esc'], label: 'Keluar mode fokus / tutup popup / lepas ketikan', category: 'tools' },
  { keys: ['?'], label: 'Buka / tutup panduan Keyboard Shortcuts ini', category: 'tools' },
]

function closeModal() {
  isShortcutsModalOpen.value = false
}
</script>

<template>
  <!-- Popup Estetik Ungu-Pink Daftar Panduan Keyboard Shortcuts (PC / Laptop) -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isShortcutsModalOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Keyboard Shortcuts Twilight's"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d071c]/75 p-4 backdrop-blur-md"
      @click.self="closeModal"
    >
      <div
        class="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-pink-300/45 bg-gradient-to-br from-[#231340]/98 via-[#2d184f]/98 to-[#1c1033]/98 shadow-2xl shadow-pink-500/20"
      >
        <!-- Header Modal -->
        <div class="flex items-center justify-between gap-2 border-b border-white/15 px-5 py-3.5">
          <div class="flex items-center gap-2">
            <span class="text-lg">⌨️</span>
            <div>
              <h2 class="font-display text-base font-bold text-pink-100">
                Keyboard Shortcuts
              </h2>
              <p class="text-[11px] font-medium text-purple-200/80">
                Pintasan cepat pengguna PC &amp; laptop
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup panduan Keyboard Shortcuts"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-pink-100 transition hover:bg-pink-400 hover:text-[#1e1b4b]"
            @click="closeModal"
          >
            ✕
          </button>
        </div>

        <!-- Daftar Pintasan -->
        <div class="flex flex-col gap-1.5 overflow-y-auto px-5 py-4">
          <div
            v-for="item in SHORTCUT_ITEMS"
            :key="item.keys.join('-')"
            class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
          >
            <span class="font-medium leading-snug text-pink-50/95">
              {{ item.label }}
            </span>

            <div class="flex shrink-0 items-center gap-1">
              <kbd
                v-for="keyLabel in item.keys"
                :key="keyLabel"
                class="font-display inline-flex min-w-[26px] items-center justify-center rounded-lg border border-pink-200/45 bg-gradient-to-b from-white/20 to-white/5 px-2 py-0.5 text-[11px] font-bold text-pink-100 shadow-sm"
              >
                {{ keyLabel }}
              </kbd>
            </div>
          </div>
        </div>

        <!-- Catatan Keamanan Input -->
        <div class="border-t border-white/15 bg-black/20 px-5 py-3 text-center text-[11px] font-medium text-purple-200/80">
          ✦ Pintasan otomatis nonaktif saat mengetik di kolom input atau Notebook (tekan <strong class="text-pink-200">Esc</strong> untuk melepas fokus).
        </div>
      </div>
    </div>
  </Transition>
</template>
