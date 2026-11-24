import tailwindcss from '@tailwindcss/vite'

// Konfigurasi utama Nuxt 4 untuk proyek Twilight's
export default defineNuxtConfig({
  // Tanggal kompatibilitas Nuxt 4 (mengaktifkan struktur folder app/ secara otomatis)
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  // Daftarkan file CSS utama yang memuat Tailwind CSS, tema warna, dan animasi kawaii
  css: ['~/assets/css/main.css'],

  // Plugin Vite untuk mengaktifkan Tailwind CSS v4 dengan cepat
  vite: {
    plugins: [tailwindcss()],
  },

  // Runtime config server-only untuk koneksi database TiDB Cloud (dibaca otomatis dari .env)
  runtimeConfig: {
    tidbHost: process.env.TIDB_HOST || '',
    tidbPort: process.env.TIDB_PORT || '4000',
    tidbUser: process.env.TIDB_USER || '',
    tidbPassword: process.env.TIDB_PASSWORD || '',
    tidbDatabase: process.env.TIDB_DATABASE || 'twilights',
  },

  // Pengaturan tag <head> HTML (judul, deskripsi, favicon, dan Google Fonts)
  app: {
    head: {
      htmlAttrs: {
        lang: 'id',
      },
      title: "Twilight's — Cheer your day with me!",
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            "Twilight's — Website produktivitas kawaii lo-fi dengan maskot kucing interaktif, Pomodoro Timer, BGM Suara Alam/YouTube/Radio, Daily Habit Tracker dengan pengingat jadwal, dan Grafik Progres Harian.",
        },
        { name: 'theme-color', content: '#261c42' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: "Twilight's" },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '192x192', href: '/icons/icon-192.png' },
        { rel: 'manifest', href: '/manifest.json' },
        // Muat Google Fonts: Fredoka (bulat/bubble untuk judul) & Quicksand (lembut untuk teks isi)
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },
})
