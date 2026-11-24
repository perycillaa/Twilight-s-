<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  NOTEBOOK_PAPER_THEMES,
  NOTEBOOK_TAGS,
  type NotebookEntry,
  type NotebookPaperTheme,
  type NotebookTagId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  isNotebookOpen,
  notebooks,
  createNotebookEntry,
  updateNotebookEntry,
  deleteNotebookEntry,
} = useTwilightStorage()

// Pencarian cepat & ID catatan yang sedang dipilih di panel kanan
const searchQuery = ref<string>('')
const selectedNoteId = ref<string>('')
const saveStatusText = ref<string>('Tersimpan otomatis ✨')
let saveFeedbackTimer: ReturnType<typeof setTimeout> | null = null

// Pastikan selalu ada catatan yang terpilih ketika modal dibuka atau daftar berubah
watch(
  [isNotebookOpen, notebooks],
  () => {
    if (!selectedNoteId.value || !notebooks.value.some(n => n.id === selectedNoteId.value)) {
      selectedNoteId.value = notebooks.value[0]?.id ?? ''
    }
  },
  { immediate: true },
)

// Filter daftar catatan berdasarkan kata kunci pencarian (judul atau isi teks)
const filteredNotebooks = computed<NotebookEntry[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return notebooks.value
  return notebooks.value.filter(
    note =>
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q),
  )
})

// Catatan yang sedang aktif di area menulis
const activeNote = computed<NotebookEntry | null>(() => {
  return notebooks.value.find(n => n.id === selectedNoteId.value) ?? null
})

// Kelas CSS latar belakang kertas (CSS murni di main.css)
const activePaperClass = computed<string>(() => {
  const theme = activeNote.value?.paperTheme ?? 'lavender-lined'
  return `paper-${theme}`
})

// Deteksi apakah tema kertas aktif adalah kertas gelap (Starry Night) untuk kontras tombol/ikon
const isDarkPaper = computed<boolean>(() => activeNote.value?.paperTheme === 'starry-night')

function getTagMeta(tagId: NotebookTagId) {
  return NOTEBOOK_TAGS.find(t => t.id === tagId) ?? NOTEBOOK_TAGS[3]!
}

function formatNoteDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoString))
  } catch {
    return 'Hari ini'
  }
}

/** Tampilkan indikator singkat setiap kali catatan diperbarui ke localStorage */
function flashSavedIndicator() {
  saveStatusText.value = 'Menyimpan...'
  if (saveFeedbackTimer) clearTimeout(saveFeedbackTimer)
  saveFeedbackTimer = setTimeout(() => {
    saveStatusText.value = 'Tersimpan otomatis ✨'
  }, 380)
}

function handleCreateNote() {
  const created = createNotebookEntry()
  selectedNoteId.value = created.id
  searchQuery.value = ''
  flashSavedIndicator()
}

function handleTitleInput(event: Event) {
  if (!activeNote.value) return
  const value = (event.target as HTMLInputElement).value
  updateNotebookEntry(activeNote.value.id, { title: value })
  flashSavedIndicator()
}

function handleContentInput(event: Event) {
  if (!activeNote.value) return
  const value = (event.target as HTMLTextAreaElement).value
  updateNotebookEntry(activeNote.value.id, { content: value })
  flashSavedIndicator()
}

function handleSelectTag(tag: NotebookTagId) {
  if (!activeNote.value) return
  updateNotebookEntry(activeNote.value.id, { tag })
  flashSavedIndicator()
}

function handleSelectPaper(paperTheme: NotebookPaperTheme) {
  if (!activeNote.value) return
  updateNotebookEntry(activeNote.value.id, { paperTheme })
  flashSavedIndicator()
}

function handleDeleteActiveNote() {
  if (!activeNote.value) return
  const idToDelete = activeNote.value.id
  deleteNotebookEntry(idToDelete)
  selectedNoteId.value = notebooks.value[0]?.id ?? ''
}

function closeNotebook() {
  isNotebookOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isNotebookOpen.value) {
    closeNotebook()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeydown)
  }
  if (saveFeedbackTimer) clearTimeout(saveFeedbackTimer)
})
</script>

<template>
  <!-- Modal Kawaii Notebook bergaya buku catatan digital glassmorphism -->
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isNotebookOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Kawaii Notebook"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0822]/75 p-3 backdrop-blur-sm sm:p-5"
      @click.self="closeNotebook"
    >
      <div
        class="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/25 bg-[#231545]/95 shadow-2xl shadow-pink-500/20 backdrop-blur-xl"
      >
        <!-- Header Modal Kawaii Notebook -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-white/5 px-5 py-3.5">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">📔</span>
            <div>
              <h2 class="font-display text-lg font-bold text-pink-200 sm:text-xl">
                Kawaii Notebook
              </h2>
              <p class="text-[11px] font-semibold text-purple-200/80">
                Jurnal digital, catatan belajar &amp; ide kreatifmu ✨
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="rounded-full border border-pink-200/30 bg-pink-300/15 px-3 py-1 text-[11px] font-semibold text-pink-100">
              {{ saveStatusText }}
            </span>

            <button
              type="button"
              aria-label="Tutup Kawaii Notebook"
              class="btn-bouncy flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-pink-100 hover:bg-pink-400 hover:text-[#1e1b4b]"
              @click="closeNotebook"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Isi 2 Panel: Kiri (Daftar Catatan) & Kanan (Lembar Menulis Kustom) -->
        <div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-12">
          <!-- PANEL KIRI: Tombol Tambah, Pencarian Cepat & Daftar Catatan -->
          <aside class="flex max-h-52 flex-col gap-3 border-b border-white/15 bg-black/20 p-4 md:col-span-4 md:max-h-none md:border-b-0 md:border-r">
            <button
              type="button"
              class="btn-bouncy font-display w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] py-2.5 text-sm font-bold text-[#311042] shadow-md shadow-pink-500/20"
              @click="handleCreateNote"
            >
              + Catatan Baru
            </button>

            <!-- Kolom Pencarian Cepat -->
            <input
              v-model="searchQuery"
              type="text"
              placeholder="🔍 Cari judul atau isi catatan..."
              class="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-purple-200/60 outline-none transition focus:border-pink-300/70 focus:bg-white/15"
            >

            <!-- Daftar Catatan Tersimpan -->
            <ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              <li
                v-if="filteredNotebooks.length === 0"
                class="rounded-2xl border border-dashed border-white/20 px-3 py-5 text-center text-xs text-purple-200/75"
              >
                Belum ada catatan yang cocok 🌱
              </li>

              <li v-for="note in filteredNotebooks" :key="note.id">
                <button
                  type="button"
                  class="flex w-full cursor-pointer flex-col items-start rounded-2xl border p-3 text-left transition"
                  :class="
                    selectedNoteId === note.id
                      ? 'border-pink-300/75 bg-pink-300/20 shadow-sm'
                      : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                  "
                  @click="selectedNoteId = note.id"
                >
                  <div class="flex w-full items-center justify-between gap-2">
                    <span class="truncate text-xs font-bold text-white">
                      {{ note.title || 'Catatan Tanpa Judul' }}
                    </span>
                    <span class="shrink-0 text-sm" :title="getTagMeta(note.tag).label">
                      {{ getTagMeta(note.tag).icon }}
                    </span>
                  </div>

                  <p class="mt-1 line-clamp-1 text-[11px] text-purple-200/75">
                    {{ note.content || 'Ketuk untuk mulai menulis...' }}
                  </p>

                  <span class="mt-1.5 text-[10px] font-semibold text-pink-200/75">
                    {{ formatNoteDate(note.createdAt) }}
                  </span>
                </button>
              </li>
            </ul>
          </aside>

          <!-- PANEL KANAN: Kustomisasi Kertas, Tag Suasana & Area Mengetik Luas -->
          <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5 md:col-span-8">
            <template v-if="activeNote">
              <!-- Baris Pilihan 4 Tema Kertas + Tombol Hapus Catatan -->
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="mr-1 text-[11px] font-semibold text-purple-200/80">
                    Kertas:
                  </span>
                  <button
                    v-for="paper in NOTEBOOK_PAPER_THEMES"
                    :key="paper.id"
                    type="button"
                    class="btn-bouncy flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                    :class="
                      activeNote.paperTheme === paper.id
                        ? 'border-pink-300 bg-pink-300/25 text-white'
                        : 'border-white/15 bg-white/5 text-purple-200/80 hover:bg-white/15'
                    "
                    @click="handleSelectPaper(paper.id)"
                  >
                    <span class="h-3 w-3 rounded-full border" :class="paper.swatchClass" />
                    <span>{{ paper.name }}</span>
                  </button>
                </div>

                <button
                  type="button"
                  class="btn-bouncy cursor-pointer rounded-full border border-rose-300/35 bg-rose-400/15 px-3 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-400/30"
                  @click="handleDeleteActiveNote"
                >
                  🗑️ Hapus Catatan
                </button>
              </div>

              <!-- Pilihan Stiker / Tag Suasana -->
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="mr-1 text-[11px] font-semibold text-purple-200/80">
                  Tag:
                </span>
                <button
                  v-for="tag in NOTEBOOK_TAGS"
                  :key="tag.id"
                  type="button"
                  class="btn-bouncy cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold"
                  :class="
                    activeNote.tag === tag.id
                      ? 'border-purple-200 bg-purple-300/30 text-white'
                      : 'border-white/15 bg-white/5 text-purple-200/80 hover:bg-white/15'
                  "
                  @click="handleSelectTag(tag.id)"
                >
                  {{ tag.icon }} {{ tag.label }}
                </button>
              </div>

              <!-- Lembar Kertas Menulis Bertema CSS Murni -->
              <div
                class="relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-3xl border-2 border-white/25 p-4 shadow-inner transition-colors duration-300 sm:p-5"
                :class="activePaperClass"
              >
                <!-- Hiasan Imut Hati / Bintang Kecil di Sudut Halaman (terutama untuk Sakura Grid & Starry Night) -->
                <span
                  aria-hidden="true"
                  class="pointer-events-none absolute right-4 top-3 select-none text-base opacity-70"
                >
                  {{ activeNote.paperTheme === 'sakura-grid' ? '💖✦' : activeNote.paperTheme === 'starry-night' ? '🌙✨' : '✦' }}
                </span>

                <!-- Judul Catatan -->
                <input
                  :value="activeNote.title"
                  type="text"
                  maxlength="80"
                  placeholder="Tulis judul catatanmu di sini..."
                  class="font-display mb-2 w-full border-b bg-transparent pb-2 pr-10 text-lg font-bold outline-none sm:text-xl"
                  :class="
                    isDarkPaper
                      ? 'border-white/20 text-pink-200 placeholder-purple-200/50'
                      : 'border-purple-300/60 text-inherit placeholder-purple-900/40'
                  "
                  @input="handleTitleInput"
                >

                <!-- Area Mengetik Luas -->
                <textarea
                  :value="activeNote.content"
                  placeholder="Tuangkan catatan belajar, ide brilian, atau cerita harimu di sini... ✨"
                  class="min-h-[200px] w-full flex-1 resize-none bg-transparent text-sm font-medium outline-none"
                  :class="
                    isDarkPaper
                      ? 'text-purple-50 placeholder-purple-200/45'
                      : 'text-inherit placeholder-purple-900/40'
                  "
                  @input="handleContentInput"
                />

                <!-- Footer Lembar Kertas -->
                <div
                  class="mt-2 flex items-center justify-between pt-1 text-[10px] font-semibold opacity-70"
                >
                  <span>{{ getTagMeta(activeNote.tag).icon }} {{ getTagMeta(activeNote.tag).label }}</span>
                  <span>{{ activeNote.content.length }} karakter</span>
                </div>
              </div>
            </template>

            <!-- Tampilan jika seluruh catatan dihapus -->
            <div
              v-else
              class="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/25 bg-white/5 p-8 text-center"
            >
              <span class="text-4xl">📔</span>
              <p class="font-display mt-3 text-base font-semibold text-pink-200">
                Buku catatanmu masih kosong~
              </p>
              <p class="mt-1 text-xs text-purple-200/80">
                Yuk buat catatan pertama untuk menyimpan ide hebatmu!
              </p>
              <button
                type="button"
                class="btn-bouncy font-display mt-4 cursor-pointer rounded-full bg-[#f9a8d4] px-5 py-2 text-xs font-bold text-[#311042]"
                @click="handleCreateNote"
              >
                + Buat Catatan Pertama
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
