<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useSoundEffects } from '~/composables/useSoundEffects'
import {
  COZY_CAT_BUDDIES,
  type CozyBuddyId,
  type CozyCatBuddyItem,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const { playPopTing } = useSoundEffects()
const { activeBuddies, isPomodoroRunning, isZenMode } = useTwilightStorage()

const visibleBuddies = computed<CozyCatBuddyItem[]>(() =>
  COZY_CAT_BUDDIES.filter(b => activeBuddies.value.includes(b.id)),
)

const bouncingBuddyId = ref<CozyBuddyId | null>(null)
const speechBuddyId = ref<CozyBuddyId | null>(null)
const speechText = ref<string>('')
const speechIndexByBuddy = ref<Record<CozyBuddyId, number>>({
  mochi: 0,
  kuro: 0,
  latte: 0,
})

let bounceTimer: ReturnType<typeof setTimeout> | null = null
let speechTimer: ReturnType<typeof setTimeout> | null = null

function handleBuddyTap(buddy: CozyCatBuddyItem) {
  playPopTing()
  bouncingBuddyId.value = buddy.id
  if (bounceTimer) clearTimeout(bounceTimer)
  bounceTimer = setTimeout(() => {
    bouncingBuddyId.value = null
  }, 580)

  const currentIdx = speechIndexByBuddy.value[buddy.id] ?? 0
  const nextLine = isPomodoroRunning.value
    ? buddy.focusMoodText
    : buddy.speeches[currentIdx % buddy.speeches.length] ?? buddy.focusMoodText

  speechIndexByBuddy.value = {
    ...speechIndexByBuddy.value,
    [buddy.id]: (currentIdx + 1) % buddy.speeches.length,
  }

  speechBuddyId.value = buddy.id
  speechText.value = nextLine

  if (speechTimer) clearTimeout(speechTimer)
  speechTimer = setTimeout(() => {
    speechBuddyId.value = null
  }, 3400)
}

onUnmounted(() => {
  if (bounceTimer) clearTimeout(bounceTimer)
  if (speechTimer) clearTimeout(speechTimer)
})
</script>

<template>
  <!-- 3 Kucing Peramai Unik (Scottish Fold Abu-Biru Mochi, Havana Espresso Kuro, Tabby Karamel-Madu Latte) -->
  <div
    v-if="visibleBuddies.length > 0"
    class="relative mt-1.5 flex w-full flex-col items-center transition-opacity duration-500"
    :class="isZenMode ? 'opacity-75 hover:opacity-100' : 'opacity-100'"
    aria-label="Kucing peramai sudut fokus"
  >
    <!-- Gelembung Bicara Interaktif saat Salah Satu Buddy Diklik -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="translate-y-1 opacity-0 scale-95"
    >
      <div
        v-if="speechBuddyId && speechText"
        role="status"
        class="mb-1.5 max-w-[240px] rounded-2xl border px-3 py-1.5 text-center text-[10.5px] font-bold leading-snug shadow-md backdrop-blur-md"
        style="
          background: var(--card-bg-solid);
          border-color: var(--border-strong);
          color: var(--text-primary);
        "
      >
        {{ speechText }}
      </div>
    </Transition>

    <!-- Barisan Bantal Empuk Bertema untuk Buddy Aktif -->
    <div
      class="flex w-full items-end px-1"
      :class="
        visibleBuddies.length === 1
          ? 'justify-center'
          : visibleBuddies.length === 2
            ? 'justify-between gap-3 px-2'
            : 'justify-center gap-2'
      "
    >
      <button
        v-for="buddy in visibleBuddies"
        :key="buddy.id"
        type="button"
        :aria-label="`Sapa ${buddy.name} (${buddy.subtitle})`"
        class="group relative flex cursor-pointer flex-col items-center focus:outline-none"
        @click="handleBuddyTap(buddy)"
      >
        <!-- Indikator Tenang saat Timer Pomodoro Fokus Berjalan (💤 / 📖 / 🍯) atau Sparkle saat Diklik -->
        <span
          v-if="bouncingBuddyId === buddy.id"
          aria-hidden="true"
          class="buddy-heart-pop pointer-events-none absolute -top-3.5 text-xs font-bold"
        >
          {{ buddy.id === 'kuro' ? '✨' : '💖' }}
        </span>
        <span
          v-else-if="isPomodoroRunning"
          aria-hidden="true"
          class="buddy-focus-float pointer-events-none absolute -top-2.5 right-0 text-[10px] opacity-85"
        >
          {{ buddy.id === 'mochi' ? '💤' : buddy.id === 'kuro' ? '📖' : '🍯' }}
        </span>

        <!-- Karakter Mini SVG + Bantal Empuk Bertema -->
        <div
          class="relative flex flex-col items-center transition-transform duration-200 group-hover:-translate-y-0.5"
          :class="bouncingBuddyId === buddy.id ? 'buddy-happy-hop' : 'buddy-calm-breathe'"
        >
          <!-- === 1. MOCHI: Scottish Fold Abu-Abu Kebiruan Bertelinga Lipat === -->
          <svg
            v-if="buddy.id === 'mochi'"
            class="h-[58px] w-[68px] drop-shadow-sm"
            viewBox="0 0 80 68"
            fill="none"
            aria-hidden="true"
          >
            <!-- Bantal Empuk Bertema -->
            <ellipse
              cx="40"
              cy="56"
              rx="32"
              ry="9.5"
              fill="var(--accent-soft, rgba(147,197,253,0.28))"
              stroke="var(--border-strong, rgba(147,197,253,0.55))"
              stroke-width="1.6"
            />
            <path
              d="M18 55 Q40 60 62 55"
              stroke="var(--accent-primary, #93c5fd)"
              stroke-width="1"
              stroke-linecap="round"
              opacity="0.45"
            />
            <!-- Ekor Scottish Fold Abu-Biru Tebal -->
            <path
              d="M60 47 C68 44, 71 35, 65 32 C61 30, 59 35, 61 39"
              stroke="#7e94b8"
              stroke-width="4.8"
              stroke-linecap="round"
              fill="none"
            />
            <!-- Badan Meringkuk Abu-Biru Lembut -->
            <ellipse cx="42" cy="45" rx="18" ry="11.5" fill="#9eb2d1" stroke="#53688a" stroke-width="1.3" />
            <ellipse cx="44" cy="48" rx="10" ry="6" fill="#c7d5ea" opacity="0.72" />
            <!-- Kepala Bulat Gempal Scottish Fold -->
            <ellipse cx="31" cy="31.5" rx="14" ry="11.5" fill="#9eb2d1" stroke="#53688a" stroke-width="1.3" />
            <!-- Telinga Lipat Bulat Khas Scottish Fold! -->
            <path d="M18 27 C17 19, 25 18, 28 23 C24 23.5, 20.5 25, 18 27 Z" fill="#8298bd" stroke="#53688a" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M44 27 C45 19, 37 18, 34 23 C38 23.5, 41.5 25, 44 27 Z" fill="#8298bd" stroke="#53688a" stroke-width="1.2" stroke-linejoin="round" />
            <!-- Pipi & Moncong Lembut -->
            <ellipse cx="31" cy="35" rx="7" ry="4.5" fill="#d7e2f2" opacity="0.88" />
            <!-- Pita Leher Mint Pastel -->
            <path d="M23 41 Q31 44 39 41" stroke="#5eead4" stroke-width="2.4" stroke-linecap="round" />
            <circle cx="31" cy="43" r="2" fill="#99f6e4" stroke="#0d9488" stroke-width="0.7" />
            <!-- Mata Kuning Emas Bulat Besar (Tertutup tenang saat Fokus) -->
            <template v-if="isPomodoroRunning && bouncingBuddyId !== 'mochi'">
              <path d="M24.2 31.5 Q26.8 33.8 29.4 31.5" stroke="#334155" stroke-width="1.6" stroke-linecap="round" />
              <path d="M32.8 31.5 Q35.4 33.8 38 31.5" stroke="#334155" stroke-width="1.6" stroke-linecap="round" />
            </template>
            <template v-else>
              <circle cx="26.8" cy="31" r="2.4" fill="#fbbf24" />
              <circle cx="35.4" cy="31" r="2.4" fill="#fbbf24" />
              <circle cx="26.9" cy="31" r="1.2" fill="#1e293b" />
              <circle cx="35.5" cy="31" r="1.2" fill="#1e293b" />
              <circle cx="26.1" cy="30.1" r="0.75" fill="#ffffff" />
              <circle cx="34.7" cy="30.1" r="0.75" fill="#ffffff" />
            </template>
            <!-- Pipi Merah & Mulut Mungil -->
            <ellipse cx="22.4" cy="34.2" rx="2.3" ry="1.3" fill="#fda4af" opacity="0.72" />
            <ellipse cx="39.8" cy="34.2" rx="2.3" ry="1.3" fill="#fda4af" opacity="0.72" />
            <path d="M30 33.5 L32 33.5 L31 34.7 Z" fill="#64748b" />
            <path d="M29 35.8 Q31 37.2 33 35.8" stroke="#475569" stroke-width="1.2" stroke-linecap="round" fill="none" />
            <!-- Cakar Mungil Menggapai Partikel Bintang -->
            <ellipse cx="23" cy="48.5" rx="4.2" ry="2.9" fill="#c7d5ea" stroke="#53688a" stroke-width="1.1" />
            <ellipse cx="33" cy="50" rx="4.2" ry="2.9" fill="#c7d5ea" stroke="#53688a" stroke-width="1.1" />
            <!-- Partikel Bintang Kecil yang Dikejar Mochi -->
            <circle
              v-if="!isPomodoroRunning"
              cx="11.5"
              cy="34"
              r="2.2"
              fill="#fde047"
              class="buddy-mote-dance"
            />
          </svg>

          <!-- === 2. KURO: Havana Brown Cokelat Espresso Hangat Bermata Zamrud & Lonceng Emas === -->
          <svg
            v-else-if="buddy.id === 'kuro'"
            class="h-[58px] w-[68px] drop-shadow-sm"
            viewBox="0 0 80 68"
            fill="none"
            aria-hidden="true"
          >
            <!-- Bantal Empuk Bertema -->
            <ellipse
              cx="40"
              cy="56"
              rx="32"
              ry="9.5"
              fill="var(--accent-soft, rgba(196,181,253,0.28))"
              stroke="var(--border-strong, rgba(196,181,253,0.55))"
              stroke-width="1.6"
            />
            <path
              d="M18 55 Q40 60 62 55"
              stroke="var(--accent-primary, #c4b5fd)"
              stroke-width="1"
              stroke-linecap="round"
              opacity="0.45"
            />
            <!-- Ekor Cokelat Espresso Tenang -->
            <path
              d="M55 48 C65 47, 68 38, 63 34"
              stroke="#5c3626"
              stroke-width="4.4"
              stroke-linecap="round"
              fill="none"
            />
            <!-- Badan Duduk Rapi Cokelat Espresso -->
            <ellipse cx="40" cy="44" rx="14.5" ry="12" fill="#633a28" stroke="#3d2217" stroke-width="1.2" />
            <ellipse cx="40" cy="46" rx="8" ry="6.5" fill="#7c4b36" opacity="0.65" />
            <!-- Kalung Ruby & Lonceng Emas Berkilau -->
            <path d="M29 37 Q40 41.5 51 37" stroke="#e11d48" stroke-width="3" stroke-linecap="round" fill="none" />
            <circle cx="40" cy="41.5" r="3.3" fill="#fbbf24" stroke="#b45309" stroke-width="1" />
            <circle cx="39.2" cy="40.6" r="0.95" fill="#fef3c7" />
            <!-- Kepala Cokelat Espresso Hangat -->
            <ellipse cx="40" cy="27.5" rx="13.5" ry="11.5" fill="#633a28" stroke="#3d2217" stroke-width="1.2" />
            <!-- Telinga -->
            <path d="M29 21 L27 10 L36 16.5 Z" fill="#633a28" stroke="#3d2217" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M51 21 L53 10 L44 16.5 Z" fill="#633a28" stroke="#3d2217" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M30 19.5 L29 13.5 L34.5 17 Z" fill="#d6a58d" opacity="0.7" />
            <path d="M50 19.5 L51 13.5 L45.5 17 Z" fill="#d6a58d" opacity="0.7" />
            <!-- Mata Hijau Zamrud Cerah (Fokus membaca / Berbinar) -->
            <template v-if="isPomodoroRunning && bouncingBuddyId !== 'kuro'">
              <path d="M32.5 28 Q35 29.8 37.5 28" stroke="#a7f3d0" stroke-width="1.6" stroke-linecap="round" />
              <path d="M42.5 28 Q45 29.8 47.5 28" stroke="#a7f3d0" stroke-width="1.6" stroke-linecap="round" />
            </template>
            <template v-else>
              <circle cx="35" cy="27.5" r="2.3" fill="#34d399" />
              <circle cx="45" cy="27.5" r="2.3" fill="#34d399" />
              <circle cx="35.3" cy="27.5" r="1.05" fill="#064e3b" />
              <circle cx="45.3" cy="27.5" r="1.05" fill="#064e3b" />
              <circle cx="34.2" cy="26.6" r="0.7" fill="#ffffff" />
              <circle cx="44.2" cy="26.6" r="0.7" fill="#ffffff" />
            </template>
            <!-- Pipi & Hidung -->
            <ellipse cx="31" cy="30.8" rx="2.1" ry="1.2" fill="#fb7185" opacity="0.55" />
            <ellipse cx="49" cy="30.8" rx="2.1" ry="1.2" fill="#fb7185" opacity="0.55" />
            <path d="M39 30.2 L41 30.2 L40 31.3 Z" fill="#d6a58d" />
            <!-- Buku Mini Terbuka di Depan Cakar Kuro -->
            <path d="M27 52 L39.5 49 L39.5 57.5 L27 59.5 Z" fill="#fef3c7" stroke="#b45309" stroke-width="1.1" stroke-linejoin="round" />
            <path d="M53 52 L40.5 49 L40.5 57.5 L53 59.5 Z" fill="#fffbeb" stroke="#b45309" stroke-width="1.1" stroke-linejoin="round" />
            <path d="M30 53.5 L37 51.8 M30 56 L37 54.4 M43 51.8 L50 53.5 M43 54.4 L50 56" stroke="#d97706" stroke-width="0.9" stroke-linecap="round" opacity="0.7" />
          </svg>

          <!-- === 3. LATTE: Tabby Karamel-Madu Lembut Bergaris Manis & Bunga Pastel === -->
          <svg
            v-else
            class="h-[58px] w-[68px] drop-shadow-sm"
            viewBox="0 0 80 68"
            fill="none"
            aria-hidden="true"
          >
            <!-- Bantal Empuk Bertema -->
            <ellipse
              cx="40"
              cy="56"
              rx="32"
              ry="9.5"
              fill="var(--accent-soft, rgba(253,230,138,0.28))"
              stroke="var(--border-strong, rgba(251,191,36,0.55))"
              stroke-width="1.6"
            />
            <path
              d="M18 55 Q40 60 62 55"
              stroke="var(--accent-primary, #f59e0b)"
              stroke-width="1"
              stroke-linecap="round"
              opacity="0.45"
            />
            <!-- Ekor Tabby Karamel-Madu Bergaris -->
            <path
              d="M55 47 C66 44, 69 32, 62 29"
              stroke="#ecc489"
              stroke-width="5.6"
              stroke-linecap="round"
              fill="none"
            />
            <path d="M62 36 L66 37.5 M60 41 L64 42.5" stroke="#b87639" stroke-width="1.8" stroke-linecap="round" />
            <!-- Badan Karamel-Madu Lembut -->
            <ellipse cx="40" cy="45" rx="16.5" ry="11.5" fill="#f5d5a3" stroke="#b57a40" stroke-width="1.2" />
            <!-- Bulu Dada Putih Susu -->
            <path d="M32 39 Q40 46 48 39 Q44 49 40 50 Q36 49 32 39 Z" fill="#fffdf7" opacity="0.95" />
            <!-- Kepala Bulat Karamel-Madu -->
            <ellipse cx="40" cy="28" rx="14.2" ry="11.8" fill="#f5d5a3" stroke="#b57a40" stroke-width="1.2" />
            <!-- Telinga Karamel-Madu -->
            <path d="M28.5 21.5 L26 10 L36.5 16.5 Z" fill="#e6b873" stroke="#b57a40" stroke-width="1.1" stroke-linejoin="round" />
            <path d="M51.5 21.5 L54 10 L43.5 16.5 Z" fill="#e6b873" stroke="#b57a40" stroke-width="1.1" stroke-linejoin="round" />
            <path d="M29.8 19.5 L28.5 13.8 L34.8 17 Z" fill="#fecdd3" opacity="0.8" />
            <path d="M50.2 19.5 L51.5 13.8 L45.2 17 Z" fill="#fecdd3" opacity="0.8" />
            <!-- Corak Garis Tabby Karamel Halus di Dahi & Pipi -->
            <path d="M40 17.5 V21.5 M36.8 18.2 L37.8 21.5 M43.2 18.2 L42.2 21.5" stroke="#b87639" stroke-width="1.5" stroke-linecap="round" />
            <path d="M26.5 28.5 L29.5 29 M53.5 28.5 L50.5 29" stroke="#b87639" stroke-width="1.3" stroke-linecap="round" opacity="0.8" />
            <!-- Bunga Pastel Mungil di Telinga Kanan -->
            <circle cx="51" cy="18" r="2.2" fill="#f9a8d4" />
            <circle cx="53.6" cy="19.8" r="2.2" fill="#fbcfe8" />
            <circle cx="50.2" cy="21" r="2.2" fill="#f9a8d4" />
            <circle cx="51.6" cy="19.6" r="1.4" fill="#fde047" />
            <!-- Mata Biru-Toska Lembut -->
            <template v-if="isPomodoroRunning && bouncingBuddyId !== 'latte'">
              <path d="M32.2 28 Q34.6 25.8 37 28" stroke="#7c4f26" stroke-width="1.6" stroke-linecap="round" />
              <path d="M43 28 Q45.4 25.8 47.8 28" stroke="#7c4f26" stroke-width="1.6" stroke-linecap="round" />
            </template>
            <template v-else>
              <circle cx="34.6" cy="27.8" r="2.2" fill="#14b8a6" />
              <circle cx="45.4" cy="27.8" r="2.2" fill="#14b8a6" />
              <circle cx="34.8" cy="27.8" r="1.1" fill="#134e4a" />
              <circle cx="45.6" cy="27.8" r="1.1" fill="#134e4a" />
              <circle cx="33.9" cy="27" r="0.7" fill="#ffffff" />
              <circle cx="44.7" cy="27" r="0.7" fill="#ffffff" />
            </template>
            <!-- Pipi Merah & Senyum -->
            <ellipse cx="29.8" cy="31.2" rx="2.5" ry="1.3" fill="#fda4af" opacity="0.8" />
            <ellipse cx="50.2" cy="31.2" rx="2.5" ry="1.3" fill="#fda4af" opacity="0.8" />
            <path d="M38.9 30.2 L41.1 30.2 L40 31.4 Z" fill="#fb7185" />
            <path d="M37.5 32.8 Q40 34.8 42.5 32.8" stroke="#8d5a2b" stroke-width="1.2" stroke-linecap="round" fill="none" />
            <!-- Cakar Putih Susu -->
            <ellipse cx="33" cy="53" rx="4.2" ry="2.8" fill="#fffdf7" stroke="#b57a40" stroke-width="1" />
            <ellipse cx="47" cy="53" rx="4.2" ry="2.8" fill="#fffdf7" stroke="#b57a40" stroke-width="1" />
          </svg>
        </div>

        <!-- Label Nama Mungil di Bawah Bantal -->
        <span
          class="-mt-1 rounded-full border px-2 py-[1px] text-[9.5px] font-bold shadow-xs"
          style="
            background: var(--surface-subtle);
            border-color: var(--border-subtle);
            color: var(--text-secondary);
          "
        >
          {{ buddy.name }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes buddyCalmBreathe {
  0%,
  100% {
    transform: translateY(0) scaleY(1);
  }
  50% {
    transform: translateY(-1.5px) scaleY(1.02);
  }
}

@keyframes buddyHappyHop {
  0% {
    transform: translateY(0) scale(1);
  }
  35% {
    transform: translateY(-10px) scale(1.07);
  }
  65% {
    transform: translateY(-2px) scale(0.97);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes buddyHeartPop {
  0% {
    opacity: 0;
    transform: translateY(4px) scale(0.6);
  }
  40% {
    opacity: 1;
    transform: translateY(-6px) scale(1.15);
  }
  100% {
    opacity: 0;
    transform: translateY(-16px) scale(0.9);
  }
}

@keyframes buddyFocusFloat {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.72;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@keyframes buddyMoteDance {
  0%,
  100% {
    transform: translate(0, 0);
    opacity: 0.9;
  }
  50% {
    transform: translate(3px, -4px);
    opacity: 0.45;
  }
}

.buddy-calm-breathe {
  animation: buddyCalmBreathe 3.4s ease-in-out infinite;
}

.buddy-happy-hop {
  animation: buddyHappyHop 0.56s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.buddy-heart-pop {
  animation: buddyHeartPop 0.58s ease-out forwards;
}

.buddy-focus-float {
  animation: buddyFocusFloat 2.8s ease-in-out infinite;
}

.buddy-mote-dance {
  animation: buddyMoteDance 2.2s ease-in-out infinite;
}
</style>
