<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import { useSoundEffects } from '~/composables/useSoundEffects'
import {
  type HabitAlarmMode,
  type HabitType,
  getLocalTodayDate,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  habits,
  completedHabitCount,
  todayCompletionRate,
  isAllHabitsCompleted,
  isDailyRewardClaimedToday,
  isMasterAudioMuted,
  masterAudioVolume,
  habitResetVersion,
  addHabit,
  duplicateHabit,
  updateHabitReminderTime,
  toggleHabit,
  toggleHabitType,
  toggleHabitAlarmMode,
  removeHabit,
  resetDailyHabits,
  loadFromStorage,
  checkAndAutoResetDaily,
  triggerScheduleReminder,
} = useTwilightStorage()
const { playNotebookCatMew } = useSoundEffects()
const {
  notificationPermission,
  syncNotificationPermission,
  requestNotificationPermission,
  kirimNotifikasiSistem,
} = useBackgroundResilience()

/** Tombol status notifikasi elegan di header kartu Daily Habit Tracker */
async function handleEnableScreenNotifications() {
  const current = syncNotificationPermission()
  if (current === 'granted') {
    await kirimNotifikasiSistem(
      "⏰ Twilight's — Pengingat Target",
      'Notifikasi layar aktif! Pengingat targetmu akan muncul walau tab diminimize ✨',
      false,
      'twilights-notif-test',
    )
    return
  }
  const result = await requestNotificationPermission(false)
  if (result === 'granted') {
    await kirimNotifikasiSistem(
      "⏰ Twilight's — Pengingat Target",
      'Hore! Notifikasi layar berhasil diaktifkan untuk pengingat targetmu ✨',
      false,
      'twilights-notif-welcome',
    )
  }
}

// State interaksi Maskot Buku Catatan Kucing (sudut kanan atas kartu Daily Habit Tracker):
// - Idle: berkedip alami & tersenyum ramah (• ᴗ •)
// - Diklik: wiggle + wajah berbinar (★ ᴗ ★ / ^ ω ^) selama ~1.8 dtk + ucapan cerdas sesuai progres + suara kertas & "Mew!"
// - Saat target dicentang: lompat kecil senang (^ o ^ + ✨ / ♥) sebagai apresiasi
type NotebookCatFace = 'idle' | 'click-star' | 'click-happy' | 'check-joy'
const notebookCatFace = ref<NotebookCatFace>('idle')
const notebookCatMotion = ref<'none' | 'wiggle' | 'hop'>('none')
const notebookCatSpeech = ref<string>('')
const notebookCatSparkle = ref<string>('')
let notebookClickToggle = false
let notebookFaceTimer: ReturnType<typeof setTimeout> | null = null
let notebookMotionTimer: ReturnType<typeof setTimeout> | null = null
let notebookSpeechTimer: ReturnType<typeof setTimeout> | null = null

/** Buat pesan penyemangat kontekstual berdasarkan progres Daily Habit Tracker saat ini */
function buildNotebookSpeech(): string {
  const total = habits.value.length
  if (total === 0) {
    return 'Yuk tulis target pertamamu hari ini! 🌱'
  }
  const remaining = Math.max(0, total - completedHabitCount.value)
  if (remaining === 0) {
    return 'Yeay! Semua target hari ini beres! ✨'
  }
  return `Sisa ${remaining} target lagi, pasti bisa! ✨`
}

/** Saat Maskot Buku Catatan Kucing diklik: suara kertas + "Mew!", wiggle, wajah berbinar & speech bubble */
function handleNotebookCatClick() {
  const effectiveVol = isMasterAudioMuted.value ? 0 : masterAudioVolume.value
  playNotebookCatMew(effectiveVol)

  notebookClickToggle = !notebookClickToggle
  notebookCatFace.value = notebookClickToggle ? 'click-star' : 'click-happy'
  notebookCatSparkle.value = notebookClickToggle ? '✨' : '♥'
  notebookCatSpeech.value = buildNotebookSpeech()

  notebookCatMotion.value = 'none'
  requestAnimationFrame(() => {
    notebookCatMotion.value = 'wiggle'
  })

  if (notebookMotionTimer) clearTimeout(notebookMotionTimer)
  notebookMotionTimer = setTimeout(() => {
    notebookCatMotion.value = 'none'
  }, 600)

  if (notebookFaceTimer) clearTimeout(notebookFaceTimer)
  notebookFaceTimer = setTimeout(() => {
    notebookCatFace.value = 'idle'
    notebookCatSparkle.value = ''
  }, 1800)

  if (notebookSpeechTimer) clearTimeout(notebookSpeechTimer)
  notebookSpeechTimer = setTimeout(() => {
    notebookCatSpeech.value = ''
  }, 2600)
}

/** Reaksi otomatis saat pengguna mencentang salah satu target: lompat kecil senang (^ o ^ + ✨/♥) */
function triggerNotebookCheckJoy() {
  notebookCatFace.value = 'check-joy'
  notebookCatSparkle.value = Math.random() > 0.5 ? '✨' : '♥'

  notebookCatMotion.value = 'none'
  requestAnimationFrame(() => {
    notebookCatMotion.value = 'hop'
  })

  if (notebookMotionTimer) clearTimeout(notebookMotionTimer)
  notebookMotionTimer = setTimeout(() => {
    notebookCatMotion.value = 'none'
  }, 520)

  if (notebookFaceTimer) clearTimeout(notebookFaceTimer)
  notebookFaceTimer = setTimeout(() => {
    notebookCatFace.value = 'idle'
    notebookCatSparkle.value = ''
  }, 1200)
}

// Input teks target baru + jam pengingat opsional + tipe target + mode dering alarm
const newHabitTitle = ref('')
const newReminderTime = ref('')
const newHabitType = ref<HabitType>('daily')
const newAlarmMode = ref<HabitAlarmMode>('once')

// State edit jam pengingat langsung pada item di daftar (dipakai saat klik jam atau klik 📋 Duplikat)
const editingTimeHabitId = ref<string | null>(null)
const editingTimeDraft = ref<string>('')
const timeInputRefs = new Map<string, HTMLInputElement>()

function setTimeInputRef(habitId: string, el: unknown) {
  if (el instanceof HTMLInputElement) {
    timeInputRefs.set(habitId, el)
  } else {
    timeInputRefs.delete(habitId)
  }
}

// State percikan bintang/hati mini di sekitar item yang baru dicentang
interface ItemSpark {
  id: number
  symbol: string
  tx: string
  ty: string
}
const itemSparks = ref<Record<string, ItemSpark[]>>({})

// Catatan pengingat yang sudah berbunyi agar tidak berbunyi berulang di menit yang sama
const firedReminders = new Set<string>()
let lastCheckedDateStr = ''
let reminderCheckInterval: ReturnType<typeof setInterval> | null = null

// Saat reset harian otomatis (ganti hari) atau reset manual terjadi, kosongkan catatan alarm
// sehingga pengingat jadwal siap berbunyi lagi di hari baru!
watch(habitResetVersion, () => {
  firedReminders.clear()
})

/** Bersihkan catatan alarm lama untuk 1 target ketika jam pengingatnya diubah */
function clearFiredKeysForHabit(habitId: string) {
  for (const key of Array.from(firedReminders)) {
    if (key.includes(`_${habitId}_`)) {
      firedReminders.delete(key)
    }
  }
}

/** Tambah target baru beserta jam pengingat opsional, tipe (🔁 Harian / 1x Sekali) & mode dering */
function handleAddHabit() {
  if (!newHabitTitle.value.trim()) return
  addHabit(newHabitTitle.value, newReminderTime.value, newHabitType.value, newAlarmMode.value)
  newHabitTitle.value = ''
  newReminderTime.value = ''
}

/** Buka & fokuskan pemilih jam (<input type="time">) langsung pada item tertentu */
async function openInlineTimeEditor(habitId: string, currentTime?: string, tryOpenPicker = false) {
  editingTimeHabitId.value = habitId
  editingTimeDraft.value = currentTime ?? ''

  await nextTick()
  const inputEl = timeInputRefs.get(habitId)
  if (!inputEl) return
  inputEl.focus()
  if (tryOpenPicker) {
    try {
      ;(inputEl as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
    } catch {
      // Beberapa browser membatasi showPicker() jika tidak dipicu gesture langsung; focus() tetap aktif
    }
  }
}

/** Simpan jam pengingat baru secara otomatis ke localStorage & TiDB saat diubah */
function handleInlineTimeChange(habitId: string, nextValue: string) {
  editingTimeDraft.value = nextValue
  clearFiredKeysForHabit(habitId)
  updateHabitReminderTime(habitId, nextValue)
}

/** Tutup editor jam inline */
function closeInlineTimeEditor() {
  editingTimeHabitId.value = null
}

/** Hapus jam pengingat pada item yang sedang diedit */
function clearInlineTime(habitId: string) {
  editingTimeDraft.value = ''
  clearFiredKeysForHabit(habitId)
  updateHabitReminderTime(habitId, '')
  editingTimeHabitId.value = null
}

/**
 * Tombol Duplikat (📋):
 * Gandakan item persis di bawahnya (tanpa ubah interval menit paksa) lalu langsung
 * buka & fokuskan pemilih jam pada item baru agar pengguna bebas menyetel jam & menitnya.
 */
async function handleDuplicateHabit(habitId: string) {
  const cloned = duplicateHabit(habitId)
  if (!cloned) return
  await openInlineTimeEditor(cloned.id, cloned.reminderTime, true)
}

/** Centang target & munculkan mini-selebrasi percikan bintang/hati di sekitar item */
function handleToggleHabit(habitId: string) {
  const becameCompleted = toggleHabit(habitId)

  if (becameCompleted) {
    // Maskot Buku Catatan Kucing ikut melompat senang (^ o ^ + ✨/♥) sebagai apresiasi
    triggerNotebookCheckJoy()

    const symbols = ['⭐', '💖', '✨', '🌸']
    const baseId = Date.now()
    const burst: ItemSpark[] = symbols.map((symbol, i) => {
      const angle = -Math.PI * 0.85 + (Math.PI * 0.7 * i) / (symbols.length - 1)
      const dist = 26 + (i % 2) * 10
      return {
        id: baseId + i,
        symbol,
        tx: `${Math.round(Math.cos(angle) * dist)}px`,
        ty: `${Math.round(Math.sin(angle) * dist)}px`,
      }
    })

    itemSparks.value = {
      ...itemSparks.value,
      [habitId]: burst,
    }

    setTimeout(() => {
      const updated = { ...itemSparks.value }
      delete updated[habitId]
      itemSparks.value = updated
    }, 800)
  }
}

/**
 * Sistem Pemantauan Jam Pengingat Berbasis Jam Sistem (Date.now()):
 * Tidak bergantung murni pada interval — membandingkan Date.now() terhadap timestamp eksak
 * jam pengingat hari ini (termasuk ketika tab baru kembali dari background / layar terkunci
 * dalam jendela aman 3 menit agar pengingat tidak terlewat).
 */
function checkScheduleReminders() {
  const nowMs = Date.now()
  const now = new Date(nowMs)
  const todayStr = getLocalTodayDate()

  // Deteksi pergantian hari lokal (lewat tengah malam saat halaman dibiarkan terbuka)
  if (lastCheckedDateStr && lastCheckedDateStr !== todayStr) {
    lastCheckedDateStr = todayStr
    firedReminders.clear()
    checkAndAutoResetDaily()
  }

  for (const habit of habits.value) {
    if (habit.completed || !habit.reminderTime) continue

    const [hourStr, minuteStr] = habit.reminderTime.split(':')
    const targetHour = Number(hourStr)
    const targetMinute = Number(minuteStr)
    if (Number.isNaN(targetHour) || Number.isNaN(targetMinute)) continue

    // Hitung timestamp eksak target untuk hari ini lalu bandingkan dengan Date.now()
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      targetHour,
      targetMinute,
      0,
      0,
    )
    const elapsedSinceTargetMs = nowMs - targetDate.getTime()

    // Bunyikan jika tepat waktu (0 dtk) hingga maksimal 3 menit setelah jadwal (jika tab baru bangun)
    if (elapsedSinceTargetMs >= 0 && elapsedSinceTargetMs <= 3 * 60 * 1000) {
      const keyNow = `${todayStr}_${habit.id}_now_${habit.reminderTime}`
      if (!firedReminders.has(keyNow)) {
        firedReminders.add(keyNow)
        triggerScheduleReminder({
          id: keyNow,
          habitId: habit.id,
          habitTitle: habit.title,
          time: habit.reminderTime,
          message: `⏰ Pengingat: ${habit.title} (${habit.reminderTime})`,
          alarmMode: habit.alarmMode,
        })
      }
    }
  }
}

/** Cek ulang jadwal segera ketika tab kembali aktif dari background / layar HP dibuka */
function handleHabitVisibilityChange() {
  if (document.visibilityState === 'visible') {
    syncNotificationPermission()
    checkScheduleReminders()
  }
}

onMounted(() => {
  // Pastikan data localStorage dimuat lebih dulu (tanpa mengisi ulang default jika sudah pernah disimpan)
  loadFromStorage()
  syncNotificationPermission()

  // Bandingkan tanggal lokal hari ini (YYYY-MM-DD) dengan tanggal tersimpan di localStorage;
  // hanya reset centang jika hari benar-benar berganti.
  lastCheckedDateStr = getLocalTodayDate()
  if (checkAndAutoResetDaily()) {
    firedReminders.clear()
  }

  checkScheduleReminders()
  // Cek berkala setiap 1 detik berbasis Date.now() + langsung saat visibilitychange
  reminderCheckInterval = setInterval(checkScheduleReminders, 1000)
  if (import.meta.client) {
    document.addEventListener('visibilitychange', handleHabitVisibilityChange)
  }
})

onUnmounted(() => {
  if (reminderCheckInterval) clearInterval(reminderCheckInterval)
  if (import.meta.client) {
    document.removeEventListener('visibilitychange', handleHabitVisibilityChange)
  }
  if (notebookFaceTimer) clearTimeout(notebookFaceTimer)
  if (notebookMotionTimer) clearTimeout(notebookMotionTimer)
  if (notebookSpeechTimer) clearTimeout(notebookSpeechTimer)
})
</script>

<template>
  <!-- Kolom Kanan Atas: Daily Habit Tracker + Pengingat Jadwal Cerdas -->
  <section class="glass-card relative flex flex-col justify-between p-5 sm:p-6">
    <!-- Header + Tombol Status Notif Layar + Maskot Buku Catatan Kucing di Pojok Kanan Atas -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-display text-lg font-semibold text-pink-200 sm:text-xl">
            Daily Habit Tracker
          </h2>

          <!-- Tombol Status Elegan Notifikasi Layar (Windows Action Center & Bilah Atas HP) -->
          <button
            v-if="notificationPermission !== 'unsupported'"
            type="button"
            :title="
              notificationPermission === 'granted'
                ? 'Notifikasi layar aktif — klik untuk kirim tes notifikasi sistem'
                : notificationPermission === 'denied'
                  ? 'Notifikasi diblokir browser — izinkan lewat ikon gembok di bilah alamat'
                  : 'Aktifkan pop-up notifikasi sistem di layar Windows & bilah atas HP'
            "
            class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap transition"
            :class="
              notificationPermission === 'granted'
                ? 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'
                : notificationPermission === 'denied'
                  ? 'border-white/15 bg-white/5 text-purple-200/60'
                  : 'border-pink-200/55 bg-pink-300/20 text-pink-100 shadow-sm shadow-pink-500/20 hover:bg-pink-300/35'
            "
            @click="handleEnableScreenNotifications"
          >
            <span>
              {{
                notificationPermission === 'granted'
                  ? '🔔 Notif Aktif'
                  : notificationPermission === 'denied'
                    ? '🔕 Notif Diblokir'
                    : '🔔 Aktifkan Notif Layar'
              }}
            </span>
          </button>
        </div>

        <p class="mt-0.5 text-xs font-semibold text-purple-200/85">
          Target Hari Ini ✦ {{ completedHabitCount }}/{{ habits.length }} selesai ({{ todayCompletionRate }}%)
        </p>
      </div>

      <!-- Maskot Interaktif Buku Catatan Bertelinga Kucing (klik untuk suara kertas + "Mew!" & ucapan cerdas) -->
      <div class="relative shrink-0">
        <!-- Gelembung Ucapan Cerdas sesuai progres Daily Habit Tracker -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-1 opacity-0 scale-90"
          enter-to-class="translate-y-0 opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="translate-y-1 opacity-0 scale-90"
        >
          <div
            v-if="notebookCatSpeech"
            class="pointer-events-none absolute -top-11 right-0 z-30 whitespace-nowrap rounded-2xl border border-pink-200/50 bg-[#2a173b]/95 px-3 py-1 text-[11px] font-bold text-pink-50 shadow-lg shadow-pink-500/25"
          >
            {{ notebookCatSpeech }}
            <span
              aria-hidden="true"
              class="absolute -bottom-1 right-4 h-2 w-2 rotate-45 border-b border-r border-pink-200/50 bg-[#2a173b]/95"
            />
          </div>
        </Transition>

        <!-- Kilau ✨ / ♥ mengapung saat senang atau diklik -->
        <span
          v-if="notebookCatSparkle"
          aria-hidden="true"
          class="animate-float-note pointer-events-none absolute -left-2.5 -top-1.5 z-20 text-sm text-amber-200"
        >
          {{ notebookCatSparkle }}
        </span>
        <span
          v-if="notebookCatSparkle"
          aria-hidden="true"
          class="animate-float-note pointer-events-none absolute -right-1.5 -top-2 z-20 text-xs text-pink-300"
          style="animation-delay: 0.25s"
        >
          {{ notebookCatSparkle === '✨' ? '♥' : '✨' }}
        </span>

        <button
          type="button"
          title="Klik Maskot Buku Kucing untuk semangat progres harian!"
          class="group cursor-pointer rounded-2xl p-0.5 outline-none transition-transform duration-200 hover:scale-108 active:scale-95"
          @click="handleNotebookCatClick"
        >
          <div
            :class="
              notebookCatMotion === 'wiggle'
                ? 'animate-notebook-wiggle'
                : notebookCatMotion === 'hop'
                  ? 'animate-pet-hop'
                  : ''
            "
          >
            <svg
              class="h-12 w-12 drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
              viewBox="0 0 64 64"
              fill="none"
              role="img"
              aria-label="Maskot buku catatan bertelinga kucing interaktif"
            >
              <path d="M16 18 L19 7 L27 15 Z" fill="#f9a8d4" />
              <path d="M19 15 L20.5 10.5 L24.5 14.5 Z" fill="#fdf2f8" />
              <path d="M48 18 L45 7 L37 15 Z" fill="#f9a8d4" />
              <path d="M45 15 L43.5 10.5 L39.5 14.5 Z" fill="#fdf2f8" />

              <rect
                x="13"
                y="14"
                width="38"
                height="43"
                rx="9"
                fill="#f9a8d4"
                stroke="#fdf2f8"
                stroke-width="2"
              />
              <rect x="13" y="14" width="7" height="43" rx="4" fill="#c084fc" />
              <rect x="23" y="21" width="24" height="30" rx="5" fill="#fff7fb" />

              <!-- EKSPRESI MATA MASKOT BUKU KUCING -->
              <g v-if="notebookCatFace === 'click-star'">
                <path
                  d="M31 29.8 L31.9 31.8 L34 32 L32.4 33.4 L32.9 35.4 L31 34.3 L29.1 35.4 L29.6 33.4 L28 32 L30.1 31.8 Z"
                  fill="#f59e0b"
                />
                <path
                  d="M39 29.8 L39.9 31.8 L42 32 L40.4 33.4 L40.9 35.4 L39 34.3 L37.1 35.4 L37.6 33.4 L36 32 L38.1 31.8 Z"
                  fill="#f59e0b"
                />
              </g>
              <g v-else-if="notebookCatFace === 'click-happy' || notebookCatFace === 'check-joy'">
                <path d="M28.5 34 Q31 30.8 33.5 34" stroke="#3b215c" stroke-width="1.9" stroke-linecap="round" />
                <path d="M36.5 34 Q39 30.8 41.5 34" stroke="#3b215c" stroke-width="1.9" stroke-linecap="round" />
              </g>
              <g v-else class="animate-cat-blink">
                <circle cx="31" cy="33" r="1.9" fill="#3b215c" />
                <circle cx="30.4" cy="32.3" r="0.6" fill="#ffffff" />
                <circle cx="39" cy="33" r="1.9" fill="#3b215c" />
                <circle cx="38.4" cy="32.3" r="0.6" fill="#ffffff" />
              </g>

              <ellipse
                cx="27.5"
                cy="36.5"
                rx="2.4"
                ry="1.4"
                fill="#f9a8d4"
                :opacity="notebookCatFace === 'idle' ? 0.75 : 1"
              />
              <ellipse
                cx="42.5"
                cy="36.5"
                rx="2.4"
                ry="1.4"
                fill="#f9a8d4"
                :opacity="notebookCatFace === 'idle' ? 0.75 : 1"
              />

              <circle
                v-if="notebookCatFace === 'check-joy'"
                cx="35"
                cy="37.6"
                r="1.9"
                fill="#f472b6"
                stroke="#3b215c"
                stroke-width="1.2"
              />
              <path
                v-else-if="notebookCatFace === 'click-happy'"
                d="M32 36.8 Q33.5 39 35 36.7 Q36.5 39 38 36.8"
                stroke="#3b215c"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                v-else
                d="M32.5 36.5 Q35 39.2 37.5 36.5"
                stroke="#3b215c"
                stroke-width="1.6"
                stroke-linecap="round"
              />

              <line x1="27" y1="43" x2="43" y2="43" stroke="#d8b4fe" stroke-width="2" stroke-linecap="round" />
              <line x1="27" y1="47" x2="38" y2="47" stroke="#fbcfe8" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- Baris Progress Bar Horizontal + Tombol Reset Harian -->
    <div class="mt-3 flex items-center justify-between gap-2">
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          class="h-full rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c084fc] transition-all duration-500"
          :style="{ width: `${todayCompletionRate}%` }"
        />
      </div>

      <button
        type="button"
        title="Reset centang semua target 🔁 Harian & bersihkan target 1x Sekali yang sudah selesai"
        class="btn-bouncy cursor-pointer rounded-full border border-purple-200/30 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-purple-100 hover:bg-white/20"
        @click="resetDailyHabits"
      >
        ↻ Reset Harian
      </button>
    </div>

    <!-- Banner Motivasi Saat 100% Target Hari Ini Tuntas + Status Bonus Harian +5 🐟 -->
    <div
      v-if="isAllHabitsCompleted"
      class="mt-3 rounded-2xl border border-amber-200/40 bg-gradient-to-r from-pink-400/25 via-purple-400/25 to-amber-300/20 px-3.5 py-2 text-center text-xs font-bold text-amber-100 shadow-sm"
    >
      <p>Luar biasa! Semua target hari ini tuntas! 🎉🐱</p>
      <p v-if="isDailyRewardClaimedToday" class="mt-0.5 text-[10px] font-semibold text-pink-100/90">
        ✓ Bonus harian +5 Ikan Kering (🐟) sudah diklaim hari ini
      </p>
    </div>

    <!-- Daftar Target Kebiasaan -->
    <ul class="mt-3.5 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
      <!-- Pesan Motivasi Saat Daftar Masih Kosong -->
      <li
        v-if="habits.length === 0"
        class="rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 py-6 text-center text-xs font-semibold text-pink-100/85"
      >
        Yuk tulis 1 target kecil untuk memulai harimu! 🌱
      </li>

      <li
        v-for="habit in habits"
        :key="habit.id"
        class="group relative flex flex-col gap-2 rounded-2xl border px-3 py-2.5 transition-all duration-300"
        :class="
          habit.type === 'once' && habit.completed
            ? 'scale-[0.98] border-emerald-300/45 bg-emerald-400/15 opacity-75'
            : habit.completed
              ? 'border-pink-300/30 bg-pink-300/15'
              : 'border-white/15 bg-white/10 hover:border-white/30 hover:bg-white/15'
        "
      >
        <!-- Percikan Partikel Bintang/Hati Mini saat item ini baru dicentang -->
        <span
          v-for="spark in itemSparks[habit.id] || []"
          :key="spark.id"
          aria-hidden="true"
          class="animate-spark-pop pointer-events-none absolute left-5 top-3 z-20 text-sm"
          :style="{ '--tx': spark.tx, '--ty': spark.ty }"
        >
          {{ spark.symbol }}
        </span>

        <!-- Baris Utama Item: Checkbox Hati + Judul Target + Aksi Duplikat (📋) & Hapus (✕) -->
        <div class="flex items-start justify-between gap-2">
          <button
            type="button"
            class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
            @click="handleToggleHabit(habit.id)"
          >
            <!-- Checkbox Berbentuk Hati -->
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
              :aria-checked="habit.completed"
              role="checkbox"
            >
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 20.5C12 20.5 4 15.2 4 9.5C4 6.8 6.1 4.8 8.6 4.8C10.1 4.8 11.4 5.6 12 6.8C12.6 5.6 13.9 4.8 15.4 4.8C17.9 4.8 20 6.8 20 9.5C20 15.2 12 20.5 12 20.5Z"
                  :fill="habit.completed ? '#f9a8d4' : 'rgba(255,255,255,0.08)'"
                  :stroke="habit.completed ? '#fbcfe8' : '#e9d5ff'"
                  stroke-width="1.8"
                  stroke-linejoin="round"
                />
                <path
                  v-if="habit.completed"
                  d="M8.8 11.8L11 14L15.3 9.7"
                  stroke="#311042"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>

            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span
                class="break-words text-sm font-semibold transition-all duration-200"
                :class="
                  habit.completed
                    ? 'text-pink-100/65 line-through decoration-pink-300/80 decoration-2'
                    : 'text-white'
                "
              >
                {{ habit.title }}
              </span>

              <!-- Indikator singkat saat target 1x Sekali baru dicentang sebelum terhapus otomatis (1.2 detik) -->
              <span
                v-if="habit.type === 'once' && habit.completed"
                class="inline-flex shrink-0 items-center rounded-full border border-emerald-200/45 bg-emerald-300/20 px-2 py-0.5 text-[10px] font-bold text-emerald-100"
              >
                ✓ Selesai!
              </span>
            </div>
          </button>

          <!-- Tombol Aksi Kanan: Duplikat (📋) & Hapus (✕) -->
          <div class="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="Duplikat dan atur jam target"
              title="Duplikat & atur jam"
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs text-purple-200/80 transition hover:bg-purple-300/25 hover:text-white"
              @click.stop="handleDuplicateHabit(habit.id)"
            >
              📋
            </button>

            <button
              type="button"
              aria-label="Hapus kebiasaan"
              title="Hapus item ini"
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-purple-200/70 transition hover:bg-pink-400/25 hover:text-pink-100"
              @click.stop="removeHabit(habit.id)"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Baris Lencana Kontrol Interaktif: Tipe Target, Edit Jam Pengingat Bebas, & Mode Dering -->
        <div class="flex flex-wrap items-center gap-1.5 pl-8">
          <!-- Lencana Tipe Target yang Bisa Diklik (🔁 Harian <-> 1x Sekali) -->
          <button
            type="button"
            :title="
              habit.type === 'once'
                ? 'Tugas 1x Sekali (klik untuk ubah ke 🔁 Harian)'
                : 'Kebiasaan 🔁 Harian (klik untuk ubah ke 1x Sekali)'
            "
            class="btn-bouncy shrink-0 cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap transition"
            :class="
              habit.type === 'once'
                ? 'border-amber-200/45 bg-amber-300/15 text-amber-100 hover:bg-amber-300/30'
                : 'border-pink-200/35 bg-pink-300/15 text-pink-100 hover:bg-pink-300/30'
            "
            @click.stop="toggleHabitType(habit.id)"
          >
            {{ habit.type === 'once' ? '1x Sekali' : '🔁 Harian' }}
          </button>

          <!-- Mode Edit Jam Pengingat Langsung (<input type="time">) -->
          <div
            v-if="editingTimeHabitId === habit.id"
            class="inline-flex items-center gap-1 rounded-full border border-pink-300/60 bg-black/35 px-2 py-0.5 shadow-sm"
            @click.stop
          >
            <input
              :ref="el => setTimeInputRef(habit.id, el)"
              :value="editingTimeDraft"
              type="time"
              aria-label="Atur jam pengingat target"
              class="bg-transparent text-[11px] font-bold text-pink-100 outline-none"
              @input="handleInlineTimeChange(habit.id, ($event.target as HTMLInputElement).value)"
              @keydown.enter.prevent="closeInlineTimeEditor"
              @keydown.esc.prevent="closeInlineTimeEditor"
            >
            <button
              type="button"
              title="Selesai atur jam"
              class="cursor-pointer rounded-full bg-pink-300/30 px-1.5 py-0.2 text-[10px] font-bold text-pink-100 hover:bg-pink-300/50"
              @click="closeInlineTimeEditor"
            >
              ✓
            </button>
            <button
              v-if="editingTimeDraft"
              type="button"
              title="Hapus jam pengingat"
              class="cursor-pointer px-1 text-[10px] text-purple-200/80 hover:text-white"
              @click="clearInlineTime(habit.id)"
            >
              ✕
            </button>
          </div>

          <!-- Badge Jam Pengingat yang Bisa Diklik Kapan Saja (⏰ HH:MM atau + Atur Jam) -->
          <button
            v-else
            type="button"
            :title="habit.reminderTime ? 'Klik untuk ubah jam pengingat' : 'Klik untuk atur jam pengingat'"
            class="btn-bouncy inline-flex shrink-0 cursor-pointer items-center rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap transition"
            :class="
              habit.reminderTime
                ? 'border-amber-200/40 bg-amber-300/15 text-amber-100 hover:bg-amber-300/30'
                : 'border-white/15 bg-white/5 text-purple-200/75 hover:border-pink-200/40 hover:bg-white/15 hover:text-pink-100'
            "
            @click.stop="openInlineTimeEditor(habit.id, habit.reminderTime, true)"
          >
            {{ habit.reminderTime ? `⏰ ${habit.reminderTime}` : '+ Atur Jam' }}
          </button>

          <!-- Lencana Mode Dering (tampil saat target memiliki jam pengingat — klik untuk ganti 🔔 Sekali <-> ⏰ Berkali-kali) -->
          <button
            v-if="habit.reminderTime"
            type="button"
            :title="
              habit.alarmMode === 'repeat'
                ? 'Dering berkali-kali tiap ~3 detik (klik untuk ubah ke 🔔 Sekali)'
                : 'Dering lonceng lembut 1x saja (klik untuk ubah ke ⏰ Berkali-kali)'
            "
            class="btn-bouncy shrink-0 cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap transition"
            :class="
              habit.alarmMode === 'repeat'
                ? 'border-fuchsia-300/55 bg-fuchsia-400/20 text-fuchsia-100 hover:bg-fuchsia-400/35'
                : 'border-purple-200/35 bg-purple-300/15 text-purple-100 hover:bg-purple-300/30'
            "
            @click.stop="toggleHabitAlarmMode(habit.id)"
          >
            {{ habit.alarmMode === 'repeat' ? '⏰ Berkali-kali' : '🔔 Sekali' }}
          </button>
        </div>
      </li>
    </ul>

    <!-- Form Tambah Target + Input Waktu Pengingat Opsional -->
    <form class="mt-4 flex flex-col gap-2" @submit.prevent="handleAddHabit">
      <div class="flex items-center gap-2">
        <input
          v-model="newHabitTitle"
          type="text"
          maxlength="60"
          placeholder="Tulis target baru..."
          class="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-purple-200/60 outline-none transition focus:border-pink-300/70 focus:bg-white/15"
        >
        <button
          type="submit"
          class="btn-bouncy font-display shrink-0 cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] px-4 py-2 text-sm font-semibold text-[#311042] shadow-md shadow-pink-500/20"
        >
          + Tambah
        </button>
      </div>

      <!-- Baris Pengaturan Tipe Target (🔁 Harian vs 1x Sekali) & Jam Pengingat + Mode Dering -->
      <div class="flex flex-col gap-2 px-1">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <!-- Pemilih Tipe Target Ringkas -->
          <div
            class="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/25 p-0.5 text-[11px]"
            role="radiogroup"
            aria-label="Tipe target"
          >
            <button
              type="button"
              :aria-checked="newHabitType === 'daily'"
              role="radio"
              class="cursor-pointer rounded-full px-2.5 py-1 font-bold transition"
              :class="
                newHabitType === 'daily'
                  ? 'bg-[#f9a8d4] text-[#311042] shadow-sm'
                  : 'text-purple-100/75 hover:bg-white/10 hover:text-white'
              "
              @click="newHabitType = 'daily'"
            >
              🔁 Harian
            </button>
            <button
              type="button"
              :aria-checked="newHabitType === 'once'"
              role="radio"
              class="cursor-pointer rounded-full px-2.5 py-1 font-bold transition"
              :class="
                newHabitType === 'once'
                  ? 'bg-[#fcd34d] text-[#311042] shadow-sm'
                  : 'text-purple-100/75 hover:bg-white/10 hover:text-white'
              "
              @click="newHabitType = 'once'"
            >
              1x Sekali
            </button>
          </div>

          <!-- Input Jam Pengingat Opsional -->
          <div class="flex items-center gap-1.5">
            <label
              for="habit-reminder-time"
              class="text-[11px] font-semibold text-purple-200/80"
            >
              ⏰ Jam pengingat (opsional):
            </label>
            <input
              id="habit-reminder-time"
              v-model="newReminderTime"
              type="time"
              class="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-pink-100 outline-none transition focus:border-pink-300/70"
            >
            <button
              v-if="newReminderTime"
              type="button"
              class="cursor-pointer text-[11px] text-purple-200/70 hover:text-white"
              title="Hapus jam pengingat"
              @click="newReminderTime = ''"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Pemilih Mode Dering Alarm (🔔 Dering Sekali vs ⏰ Dering Berkali-kali) -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-[11px] font-semibold text-purple-200/80">
            🎵 Mode dering:
          </span>
          <div
            class="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/25 p-0.5 text-[11px]"
            role="radiogroup"
            aria-label="Mode dering alarm"
          >
            <button
              type="button"
              :aria-checked="newAlarmMode === 'once'"
              role="radio"
              title="Bunyikan denting lo-fi lembut 1 kali saja"
              class="cursor-pointer rounded-full px-2.5 py-1 font-bold transition"
              :class="
                newAlarmMode === 'once'
                  ? 'bg-[#c4b5fd] text-[#1e1b4b] shadow-sm'
                  : 'text-purple-100/75 hover:bg-white/10 hover:text-white'
              "
              @click="newAlarmMode = 'once'"
            >
              🔔 Sekali
            </button>
            <button
              type="button"
              :aria-checked="newAlarmMode === 'repeat'"
              role="radio"
              title="Bunyikan nada alarm berulang tiap ~3 detik hingga dimatikan"
              class="cursor-pointer rounded-full px-2.5 py-1 font-bold transition"
              :class="
                newAlarmMode === 'repeat'
                  ? 'bg-gradient-to-r from-[#f9a8d4] to-[#e879f9] text-[#311042] shadow-sm'
                  : 'text-purple-100/75 hover:bg-white/10 hover:text-white'
              "
              @click="newAlarmMode = 'repeat'"
            >
              ⏰ Berkali-kali
            </button>
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
