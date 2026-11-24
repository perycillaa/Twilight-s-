import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'

// Pool koneksi TiDB Cloud tunggal (singleton) agar koneksi tetap efisien di server Nitro
let poolInstance: Pool | null = null
let initPromise: Promise<Pool> | null = null

// Daftar schema sistem yang dilarang keras dipakai menyimpan tabel aplikasi
const FORBIDDEN_SYSTEM_DATABASES = new Set([
  'sys',
  'mysql',
  'information_schema',
  'performance_schema',
  'metrics_schema',
])

interface TidbEnvConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

/** Mengamankan profileId agar hanya mengandung karakter aman */
export function sanitizeProfileId(raw: unknown): string {
  const val = typeof raw === 'string' ? raw.trim() : 'default'
  return /^[a-zA-Z0-9_-]{1,64}$/.test(val) ? val : 'default'
}

/** Mengambil konfigurasi TiDB Cloud dari runtimeConfig Nuxt atau .env (otomatis menolak schema `sys`) */
export function getTidbConfig(): TidbEnvConfig {
  const runtime = useRuntimeConfig()
  const host = String(runtime.tidbHost || process.env.TIDB_HOST || '').trim()
  const port = Number(runtime.tidbPort || process.env.TIDB_PORT || 4000) || 4000
  const user = String(runtime.tidbUser || process.env.TIDB_USER || '').trim()
  const password = String(runtime.tidbPassword || process.env.TIDB_PASSWORD || '').trim()
  const rawDb = String(runtime.tidbDatabase || process.env.TIDB_DATABASE || 'twilights').trim()

  // Pastikan nama database valid dan BUKAN database sistem seperti `sys`
  const isSafeName = /^[a-zA-Z0-9_]+$/.test(rawDb)
  const isSystemDb = FORBIDDEN_SYSTEM_DATABASES.has(rawDb.toLowerCase())
  const database = isSafeName && !isSystemDb ? rawDb : 'twilights'

  return { host, port, user, password, database }
}

/** Cek apakah kredensial TiDB Cloud sudah terisi di .env */
export function isTidbConfigured(): boolean {
  const cfg = getTidbConfig()
  return Boolean(cfg.host && cfg.user && cfg.password)
}

/**
 * Menginisialisasi database baru `twilights` (BUKAN `sys`) dan 4 tabel SQL CRUD di TiDB Cloud:
 * 1. twilights_profiles  -> profil pengguna, tema, streak, koin 🐟, aksesori, catatan cepat, mood, grafik mingguan
 * 2. twilights_habits    -> CRUD Daily Habit Tracker + jam pengingat
 * 3. twilights_notebooks -> CRUD halaman Kawaii Notebook
 * 4. twilights_alarms    -> CRUD jadwal Kawaii Alarm
 */
async function initTidbPool(): Promise<Pool> {
  const cfg = getTidbConfig()
  if (!cfg.host || !cfg.user || !cfg.password) {
    throw new Error('Kredensial TiDB Cloud belum lengkap di file .env')
  }

  // Konfigurasi TLS wajib untuk TiDB Cloud Serverless
  const sslConfig = {
    minVersion: 'TLSv1.2' as const,
    rejectUnauthorized: true,
  }

  // 1. Buat database baru `twilights` jika belum ada (tidak pernah menggunakan `sys`)
  const bootstrapConn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    ssl: sslConfig,
  })

  try {
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
  } finally {
    await bootstrapConn.end()
  }

  // 2. Buat connection pool yang terhubung langsung ke database baru `twilights`
  const pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
  })

  // 3. Buat 4 tabel baru untuk seluruh operasi CRUD jika belum ada
  await pool.query(`
    CREATE TABLE IF NOT EXISTS twilights_profiles (
      profile_id VARCHAR(64) PRIMARY KEY,
      user_name VARCHAR(64) NOT NULL DEFAULT 'Teman Twilight',
      theme VARCHAR(24) NOT NULL DEFAULT 'twilight',
      weekly_progress JSON NOT NULL,
      today_focus_sessions INT NOT NULL DEFAULT 0,
      total_focus_sessions INT NOT NULL DEFAULT 0,
      daily_streak INT NOT NULL DEFAULT 1,
      streak_last_date VARCHAR(16) NOT NULL DEFAULT '',
      treat_coins INT NOT NULL DEFAULT 10,
      owned_accessories JSON NOT NULL,
      equipped_accessory VARCHAR(32) NOT NULL DEFAULT 'none',
      quick_notes TEXT NOT NULL,
      daily_mood VARCHAR(24) NULL,
      daily_reward_claimed_date VARCHAR(16) NOT NULL DEFAULT '',
      is_star_cursor_enabled TINYINT(1) NOT NULL DEFAULT 1,
      is_battery_saver_mode TINYINT(1) NOT NULL DEFAULT 0,
      selected_alarm_sound VARCHAR(32) NOT NULL DEFAULT 'music-box',
      last_active_date VARCHAR(16) NOT NULL DEFAULT '',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS twilights_habits (
      id VARCHAR(80) NOT NULL,
      profile_id VARCHAR(64) NOT NULL,
      title VARCHAR(200) NOT NULL,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      habit_type VARCHAR(16) NOT NULL DEFAULT 'daily',
      alarm_mode VARCHAR(16) NOT NULL DEFAULT 'once',
      reminder_time VARCHAR(10) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (profile_id, id),
      INDEX idx_habits_profile (profile_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Migrasi aman jika tabel twilights_habits lama belum memiliki kolom habit_type / alarm_mode
  try {
    await pool.query(
      `ALTER TABLE twilights_habits ADD COLUMN IF NOT EXISTS habit_type VARCHAR(16) NOT NULL DEFAULT 'daily'`,
    )
    await pool.query(
      `ALTER TABLE twilights_habits ADD COLUMN IF NOT EXISTS alarm_mode VARCHAR(16) NOT NULL DEFAULT 'once'`,
    )
  } catch {
    // Abaikan jika kolom sudah ada
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS twilights_notebooks (
      id VARCHAR(80) NOT NULL,
      profile_id VARCHAR(64) NOT NULL,
      title VARCHAR(200) NOT NULL,
      content LONGTEXT NOT NULL,
      tag VARCHAR(24) NOT NULL DEFAULT 'general',
      paper_theme VARCHAR(32) NOT NULL DEFAULT 'lavender-lined',
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (profile_id, id),
      INDEX idx_notebooks_profile (profile_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS twilights_alarms (
      id VARCHAR(80) NOT NULL,
      profile_id VARCHAR(64) NOT NULL,
      mode VARCHAR(24) NOT NULL DEFAULT 'countdown',
      label VARCHAR(200) NOT NULL,
      target_timestamp BIGINT NOT NULL,
      clock_time VARCHAR(10) NULL,
      created_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (profile_id, id),
      INDEX idx_alarms_profile (profile_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  poolInstance = pool
  return pool
}

/** Mengembalikan TiDB connection pool yang siap pakai */
export async function getTidbPool(): Promise<Pool> {
  if (poolInstance) return poolInstance
  if (!initPromise) {
    initPromise = initTidbPool().catch((err) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}
