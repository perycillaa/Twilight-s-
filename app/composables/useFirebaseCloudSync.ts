import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'

// Konfigurasi proyek Firebase Twilight's (Authentication + Cloud Firestore Offline Persistence)
const firebaseConfig = {
  apiKey: 'AIzaSyDIP8DGx4InB3T8Y7VyE6wTCEiAxlUWj7w',
  authDomain: 'twilights-focus.firebaseapp.com',
  projectId: 'twilights-focus',
  storageBucket: 'twilights-focus.firebasestorage.app',
  messagingSenderId: '781267255580',
  appId: '1:781267255580:web:99ef702cd3ad82d66b7ad9',
}

export interface FirebaseProfileUser {
  uid: string
  displayName: string
  email: string
  photoURL: string
}

export type FirebaseSyncState = 'guest' | 'syncing' | 'synced' | 'offline' | 'error'

interface RemoteSyncCallbacks {
  getLocalSnapshot: () => Record<string, unknown>
  applyRemoteSnapshot: (data: Record<string, unknown>, remoteUser: FirebaseProfileUser) => void
  onToast?: (msg: string) => void
}

interface FirestoreStateEnvelope {
  data?: Record<string, unknown>
  updatedAtMs?: number
  updatedAt?: { toMillis?: () => number }
  updatedBySession?: string
}

// --- Singleton module instances (hanya diinisialisasi sekali di sisi client) ---
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let authListenerUnsub: Unsubscribe | null = null
let docSnapshotUnsub: Unsubscribe | null = null
let lifecycleListenersAttached = false
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let registeredCallbacks: RemoteSyncCallbacks | null = null
let lastAppliedRemoteTimestamp = 0
let isInitialCloudSyncReady = false
let isInitialPullInFlight = false
let lastVisibilityPullMs = 0

// ID sesi perangkat unik agar onSnapshot tidak menimpa balik perubahan yang baru ditulis oleh tab ini sendiri
const CLIENT_SESSION_ID = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

function mapFirebaseUser(user: User | null): FirebaseProfileUser | null {
  if (!user) return null
  return {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Teman Twilight',
    email: user.email || '',
    photoURL: user.photoURL || '',
  }
}

/** Bersihkan seluruh properti `undefined` secara rekursif agar Firestore `setDoc()` tidak pernah menolak data */
function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined)
      .map(item => stripUndefinedDeep(item)) as unknown as T
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      result[k] = stripUndefinedDeep(v)
    }
  }
  return result as T
}

function extractEnvelopeTimestampMs(raw?: FirestoreStateEnvelope): number {
  if (!raw) return 0
  const numericMs = typeof raw.updatedAtMs === 'number' && Number.isFinite(raw.updatedAtMs) ? raw.updatedAtMs : 0
  const serverMs =
    typeof raw.updatedAt?.toMillis === 'function' ? Number(raw.updatedAt.toMillis()) || 0 : 0
  return Math.max(numericMs, serverMs)
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function toSafeNum(val: unknown, fallback = 0): number {
  const n = Number(val)
  return Number.isFinite(n) ? Math.max(0, n) : fallback
}

/** Cek apakah data lokal perangkat ini masih kondisi bawaan kosong (belum pernah dipakai) */
function isBrandNewLocalSnapshot(local: Record<string, unknown>): boolean {
  const habits = Array.isArray(local.habits) ? local.habits : []
  const cards = toStringArray(local.collectedSecretCards ?? local.unlockedCards)
  const accessories = toStringArray(local.ownedAccessories)
  const cats = toStringArray(local.ownedCats)
  const themes = toStringArray(local.ownedCozyThemes)
  const coins = toSafeNum(local.treatCoins ?? local.coins, 0)
  const totalSessions = toSafeNum(local.totalFocusSessions, 0)
  const streak = toSafeNum(local.dailyStreak, 0)
  const highScore = toSafeNum(local.gameHighScore, 0)
  const fishHighScore = toSafeNum(local.fishingHighScore, 0)
  const affinity = (local.catAffinity ?? {}) as { level?: unknown; xp?: unknown; heartChestXp?: unknown }
  const level = toSafeNum(affinity.level, 1)
  const xp = toSafeNum(affinity.xp, 0)
  const chestXp = toSafeNum(affinity.heartChestXp, 0)
  const notes = typeof local.quickNotes === 'string' ? local.quickNotes.trim() : ''

  return (
    habits.length === 0 &&
    cards.length === 0 &&
    accessories.length === 0 &&
    cats.length <= 2 &&
    themes.length <= 1 &&
    coins <= 5 &&
    totalSessions === 0 &&
    streak === 0 &&
    highScore === 0 &&
    fishHighScore === 0 &&
    level <= 1 &&
    xp === 0 &&
    chestXp === 0 &&
    notes.length === 0
  )
}

/**
 * Smart Merge Cloud + Lokal saat initial login:
 * - Jika perangkat baru masih kosong -> gunakan 100% data Cloud (tanpa menulis balik!).
 * - Jika perangkat lokal punya progres offline -> gabungkan tanpa menghilangkan progres mana pun:
 *   • Koin, sesi fokus, streak, high score, & level/XP kasih sayang -> ambil nilai maksimum.
 *   • Kartu rahasia terbuka, aksesoris, koleksi kucing, & tema toko -> gabungkan himpunan (Set union).
 *   • Preferensi UI, daftar habit, catatan, alarm -> prioritaskan data Cloud (fallback lokal bila Cloud kosong).
 */
function smartMergeCloudWithLocal(
  cloudData: Record<string, unknown>,
  localData: Record<string, unknown>,
): { merged: Record<string, unknown>; localContributedNewProgress: boolean } {
  if (isBrandNewLocalSnapshot(localData)) {
    return { merged: cloudData, localContributedNewProgress: false }
  }

  const merged: Record<string, unknown> = { ...cloudData }
  let localAdded = false

  // 1. Nilai progres numerik -> ambil maksimum agar tidak pernah turun/hilang
  const cloudCoins = toSafeNum(cloudData.treatCoins ?? cloudData.coins, 0)
  const localCoins = toSafeNum(localData.treatCoins ?? localData.coins, 0)
  const maxCoins = Math.max(cloudCoins, localCoins)
  if (maxCoins > cloudCoins) localAdded = true
  merged.treatCoins = maxCoins
  merged.coins = maxCoins

  const numericMaxFields = [
    'todayFocusSessions',
    'totalFocusSessions',
    'todayFocusSeconds',
    'dailyStreak',
    'fullGoalStreak',
    'gameHighScore',
    'fishingHighScore',
  ] as const
  for (const field of numericMaxFields) {
    const cVal = toSafeNum(cloudData[field], 0)
    const lVal = toSafeNum(localData[field], 0)
    const best = Math.max(cVal, lVal)
    if (best > cVal) localAdded = true
    merged[field] = best
  }

  // 2. Kasih Sayang Kucing (Level, XP, Peti Cinta, & Milestone) -> pilih progres lebih tinggi + OR milestone
  const cAff = (cloudData.catAffinity ?? {}) as Record<string, unknown>
  const lAff = (localData.catAffinity ?? {}) as Record<string, unknown>
  const cLv = toSafeNum(cAff.level, 1)
  const lLv = toSafeNum(lAff.level, 1)
  const cXp = toSafeNum(cAff.xp, 0)
  const lXp = toSafeNum(lAff.xp, 0)
  const cChest = toSafeNum(cAff.heartChestXp, 0)
  const lChest = toSafeNum(lAff.heartChestXp, 0)

  const localHigherAffinity =
    lLv > cLv || (lLv === cLv && lXp > cXp) || (lLv === cLv && lXp === cXp && lChest > cChest)
  if (localHigherAffinity) localAdded = true

  const claimed10 = Boolean(cAff.claimedLv10Reward) || Boolean(lAff.claimedLv10Reward)
  const claimed20 = Boolean(cAff.claimedLv20Reward) || Boolean(lAff.claimedLv20Reward)
  if (claimed10 !== Boolean(cAff.claimedLv10Reward) || claimed20 !== Boolean(cAff.claimedLv20Reward)) {
    localAdded = true
  }

  const bestAffinity = {
    level: localHigherAffinity ? lLv : cLv,
    xp: localHigherAffinity ? lXp : cXp,
    heartChestXp: localHigherAffinity ? lChest : cChest,
    claimedLv10Reward: claimed10,
    claimedLv20Reward: claimed20,
  }
  merged.catAffinity = bestAffinity
  merged.affectionPoints = bestAffinity.xp

  // 3. Koleksi terbuka (Kartu Rahasia, Aksesoris, Kucing, Tema) -> Set Union agar semua item tetap aman
  const unionField = (cloudRaw: unknown, localRaw: unknown): string[] => {
    const cArr = toStringArray(cloudRaw)
    const lArr = toStringArray(localRaw)
    const set = new Set<string>([...cArr, ...lArr])
    if (set.size > cArr.length) localAdded = true
    return Array.from(set)
  }

  const mergedCards = unionField(
    cloudData.collectedSecretCards ?? cloudData.unlockedCards,
    localData.collectedSecretCards ?? localData.unlockedCards,
  )
  merged.collectedSecretCards = mergedCards
  merged.unlockedCards = mergedCards

  merged.ownedAccessories = unionField(cloudData.ownedAccessories, localData.ownedAccessories)
  merged.ownedCats = unionField(cloudData.ownedCats, localData.ownedCats)
  merged.ownedCozyThemes = unionField(cloudData.ownedCozyThemes, localData.ownedCozyThemes)

  // 4. Jika cloud belum punya habits namun lokal punya, pertahankan habits lokal
  const cloudHabits = Array.isArray(cloudData.habits) ? cloudData.habits : []
  const localHabits = Array.isArray(localData.habits) ? localData.habits : []
  if (cloudHabits.length === 0 && localHabits.length > 0) {
    merged.habits = localHabits
    localAdded = true
  }

  return { merged, localContributedNewProgress: localAdded }
}

/** Baca dokumen terbaru dari server Firestore (fallback cache IndexedDB bila sedang offline) */
async function readDocPreferServer(ref: DocumentReference): Promise<DocumentSnapshot> {
  if (navigator.onLine) {
    try {
      return await getDocFromServer(ref)
    } catch (serverErr) {
      const code = (serverErr as { code?: string })?.code ?? ''
      // Jika error izin Firestore, lempar langsung agar tercatat jelas
      if (code === 'permission-denied') throw serverErr
      // Selain itu fallback ke getDoc (cache offline)
    }
  }
  return await getDoc(ref)
}

/** Inisialisasi Firebase App, Auth (browserLocalPersistence) & Firestore (IndexedDB Offline Multi-Tab Cache) */
function ensureFirebaseClient(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  if (!import.meta.client) return null

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp)
    // Pertahankan sesi login Google di browser/PWA meskipun offline atau ditutup
    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {})
  }

  if (!firebaseDb) {
    try {
      // Aktifkan Offline Persistence resmi Firebase v10+ berbasis IndexedDB + abaikan field undefined
      firebaseDb = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      })
    } catch {
      // Fallback aman bila Firestore sudah terinisialisasi sebelumnya atau mode private browser membatasi IndexedDB
      firebaseDb = getFirestore(firebaseApp)
    }
  }

  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb }
}

/**
 * Composable Firebase Auth (Login Google) & Cloud Firestore Auto-Sync + Offline Persistence:
 * - Cloud-First Pull on Auth: selalu `getDoc(users/{uid})` terlebih dahulu sebelum mengizinkan auto-save `setDoc`
 * - Smart Merge aman saat login di perangkat baru agar data Cloud tidak pernah tertimpa data lokal kosong
 * - Guard `isInitialCloudSyncDone`: memblokir seluruh auto-save sampai initial pull selesai sukses
 * - Real-time `onSnapshot` + re-sync otomatis saat `visibilitychange` (pindah HP <-> Laptop)
 */
export function useFirebaseCloudSync() {
  const firebaseUser = useState<FirebaseProfileUser | null>('twilights-fb-user', () => null)
  const isFirebaseAuthReady = useState<boolean>('twilights-fb-auth-ready', () => false)
  const isFirebaseAuthBusy = useState<boolean>('twilights-fb-auth-busy', () => false)
  const isInitialCloudSyncDone = useState<boolean>('twilights-fb-initial-sync-done', () => false)
  const firebaseSyncStatus = useState<FirebaseSyncState>('twilights-fb-sync-status', () => 'guest')
  const firebaseLastSyncedAt = useState<string>('twilights-fb-last-synced', () => '')
  const firebaseErrorMessage = useState<string>('twilights-fb-error', () => '')
  const isBrowserOnline = useState<boolean>('twilights-browser-online', () => true)

  /** Dokumen utama pengguna: `users/{uid}` (cocok dengan aturan Firestore `match /users/{userId}`) */
  function getUserStateDocRef(uid: string) {
    const client = ensureFirebaseClient()
    if (!client) return null
    return doc(client.db, 'users', uid)
  }

  /** Dokumen legacy opsional (migrasi aman jika akun sebelumnya sempat menyimpan di subkoleksi) */
  function getLegacyUserStateDocRef(uid: string) {
    const client = ensureFirebaseClient()
    if (!client) return null
    return doc(client.db, 'users', uid, 'twilights', 'state')
  }

  function clearPendingSyncTimer() {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
      syncDebounceTimer = null
    }
  }

  function detachDocListener() {
    if (docSnapshotUnsub) {
      docSnapshotUnsub()
      docSnapshotUnsub = null
    }
  }

  function setInitialSyncFlag(done: boolean) {
    isInitialCloudSyncReady = done
    isInitialCloudSyncDone.value = done
  }

  /** Tulis snapshot state saat ini ke Cloud Firestore (hanya diizinkan setelah initial pull selesai!) */
  async function writeSnapshotToFirestore(
    snapshot: Record<string, unknown>,
    manualTrigger = false,
    allowInitialBootstrap = false,
  ): Promise<boolean> {
    if (!import.meta.client) return false
    const user = firebaseUser.value
    if (!user) return false

    // KUNCI ANTI-TIMPA: blokir seluruh penulisan sebelum initial pull (`getDoc`) selesai!
    if (!isInitialCloudSyncReady && !allowInitialBootstrap) {
      return false
    }

    const ref = getUserStateDocRef(user.uid)
    if (!ref) return false

    firebaseErrorMessage.value = ''
    firebaseSyncStatus.value = isBrowserOnline.value ? 'syncing' : 'offline'

    try {
      const nowMs = Date.now()
      const cleanSnapshot = stripUndefinedDeep(snapshot)
      await setDoc(
        ref,
        {
          data: cleanSnapshot,
          updatedAtMs: nowMs,
          updatedBySession: CLIENT_SESSION_ID,
          updatedAt: serverTimestamp(),
          profileEmail: user.email,
          profileName: user.displayName,
          appVersion: 2,
        },
        { merge: true },
      )

      lastAppliedRemoteTimestamp = Math.max(lastAppliedRemoteTimestamp, nowMs)
      firebaseLastSyncedAt.value = new Date(nowMs).toISOString()
      firebaseSyncStatus.value = navigator.onLine ? 'synced' : 'offline'
      if (manualTrigger) {
        registeredCallbacks?.onToast?.(
          navigator.onLine
            ? '☁️ Progres berhasil disinkronkan ke Google Cloud!'
            : '📡 Sedang offline — data tersimpan aman di cache & otomatis sync saat online!',
        )
      }
      return true
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      const msg = err instanceof Error ? err.message : 'Gagal menyinkronkan ke Firestore'
      console.warn('[Twilight Firebase Sync] Gagal menulis ke Firestore:', code, msg, err)
      firebaseErrorMessage.value = code ? `${code}: ${msg}` : msg
      firebaseSyncStatus.value = navigator.onLine ? 'error' : 'offline'
      if (manualTrigger) {
        if (!navigator.onLine) {
          registeredCallbacks?.onToast?.(
            '📡 Mode Offline: progres tetap tersimpan lokal & akan sync otomatis saat online!',
          )
        } else if (code === 'permission-denied') {
          registeredCallbacks?.onToast?.(
            '🔒 Izin Firestore ditolak (permission-denied) — pastikan Rules mengizinkan users/{uid} untuk user login.',
          )
        } else {
          registeredCallbacks?.onToast?.(
            `⚠️ Sinkronisasi cloud gagal (${code || 'error'}) — cek koneksi atau Rules Firestore.`,
          )
        }
      }
      return false
    }
  }

  /** Jadwalkan auto-sync (debounce 650ms) — HANYA berjalan jika `isInitialCloudSyncDone === true` */
  function scheduleFirestoreSync(snapshotProvider?: () => Record<string, unknown>) {
    if (!import.meta.client || !firebaseUser.value || !isInitialCloudSyncReady) return
    clearPendingSyncTimer()
    syncDebounceTimer = setTimeout(() => {
      syncDebounceTimer = null
      if (!isInitialCloudSyncReady || !firebaseUser.value) return
      const snapshot = snapshotProvider?.() ?? registeredCallbacks?.getLocalSnapshot()
      if (snapshot) {
        void writeSnapshotToFirestore(snapshot, false)
      }
    }, 650)
  }

  /** Tarik pembaruan terbaru dari Cloud saat tab kembali aktif (`visibilitychange`) berdasarkan `updatedAt` */
  async function pullLatestFromCloudIfNewer(profile: FirebaseProfileUser) {
    if (!import.meta.client || !navigator.onLine) return
    const now = Date.now()
    if (now - lastVisibilityPullMs < 2500) return
    lastVisibilityPullMs = now

    if (!isInitialCloudSyncReady) {
      await startUserCloudSync(profile)
      return
    }

    const ref = getUserStateDocRef(profile.uid)
    if (!ref) return

    try {
      const snap = await readDocPreferServer(ref)
      if (!snap.exists()) return
      const raw = snap.data() as FirestoreStateEnvelope
      const remoteTs = extractEnvelopeTimestampMs(raw)

      if (
        raw?.data &&
        typeof raw.data === 'object' &&
        raw.updatedBySession !== CLIENT_SESSION_ID &&
        remoteTs > lastAppliedRemoteTimestamp
      ) {
        lastAppliedRemoteTimestamp = remoteTs
        registeredCallbacks?.applyRemoteSnapshot(raw.data, profile)
        firebaseLastSyncedAt.value = new Date(remoteTs).toISOString()
      }
      firebaseSyncStatus.value = 'synced'
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      console.warn('[Twilight Firebase Sync] Re-sync saat tab aktif gagal:', code, err)
    }
  }

  /**
   * Cloud-First Initial Pull & Real-Time Listener (`users/{uid}`):
   * 1. Blokir seluruh auto-save (`isInitialCloudSyncDone = false`) dan batalkan timer pending.
   * 2. Jalankan `getDoc` terlebih dahulu:
   *    - Jika dokumen cloud ADA -> terapkan ke aplikasi + `localStorage` (dengan Smart Merge aman).
   *    - Jika dokumen cloud BELUM ADA -> barulah unggah data lokal saat ini sebagai data awal.
   * 3. Tandai `isInitialCloudSyncDone = true` setelah pull berhasil, lalu pasang `onSnapshot`.
   */
  async function startUserCloudSync(profile: FirebaseProfileUser): Promise<boolean> {
    if (isInitialPullInFlight) return false
    isInitialPullInFlight = true

    clearPendingSyncTimer()
    detachDocListener()
    setInitialSyncFlag(false)

    const ref = getUserStateDocRef(profile.uid)
    if (!ref) {
      isInitialPullInFlight = false
      return false
    }

    firebaseSyncStatus.value = navigator.onLine ? 'syncing' : 'offline'

    let pullSucceeded = false
    try {
      const initialSnap = await readDocPreferServer(ref)

      if (initialSnap.exists()) {
        const raw = initialSnap.data() as FirestoreStateEnvelope
        if (raw?.data && typeof raw.data === 'object') {
          const remoteTs = extractEnvelopeTimestampMs(raw) || Date.now()
          const localSnap = registeredCallbacks?.getLocalSnapshot() ?? {}
          const { merged, localContributedNewProgress } = smartMergeCloudWithLocal(
            raw.data,
            localSnap,
          )

          lastAppliedRemoteTimestamp = remoteTs
          registeredCallbacks?.applyRemoteSnapshot(merged, profile)
          firebaseLastSyncedAt.value = new Date(remoteTs).toISOString()
          setInitialSyncFlag(true)
          pullSucceeded = true

          // Hanya tulis balik ke Cloud jika perangkat lokal benar-benar punya progres tambahan (offline)
          if (localContributedNewProgress) {
            await writeSnapshotToFirestore(merged, false)
          } else {
            firebaseSyncStatus.value = navigator.onLine ? 'synced' : 'offline'
          }
        } else {
          // Dokumen ada tapi belum memiliki field `data` -> unggah snapshot lokal sebagai inisialisasi
          const localSnap = registeredCallbacks?.getLocalSnapshot()
          if (localSnap) {
            const wrote = await writeSnapshotToFirestore(localSnap, false, true)
            if (wrote) {
              setInitialSyncFlag(true)
              pullSucceeded = true
            }
          }
        }
      } else {
        // Cek dokumen legacy `users/{uid}/twilights/state` secara aman sebelum menganggap akun baru
        let migratedFromLegacy = false
        try {
          const legacyRef = getLegacyUserStateDocRef(profile.uid)
          if (legacyRef) {
            const legacySnap = await readDocPreferServer(legacyRef)
            if (legacySnap.exists()) {
              const legacyRaw = legacySnap.data() as FirestoreStateEnvelope
              if (legacyRaw?.data && typeof legacyRaw.data === 'object') {
                const remoteTs = extractEnvelopeTimestampMs(legacyRaw) || Date.now()
                const localSnap = registeredCallbacks?.getLocalSnapshot() ?? {}
                const { merged } = smartMergeCloudWithLocal(legacyRaw.data, localSnap)
                lastAppliedRemoteTimestamp = remoteTs
                registeredCallbacks?.applyRemoteSnapshot(merged, profile)
                await writeSnapshotToFirestore(merged, false, true)
                setInitialSyncFlag(true)
                migratedFromLegacy = true
                pullSucceeded = true
              }
            }
          }
        } catch {
          // Abaikan bila Rules hanya membuka `users/{uid}` tanpa subkoleksi
        }

        if (!migratedFromLegacy) {
          // Dokumen Cloud benar-benar belum ada -> barulah unggah localStorage saat ini sebagai data awal!
          const localSnap = registeredCallbacks?.getLocalSnapshot()
          if (localSnap) {
            const wrote = await writeSnapshotToFirestore(localSnap, false, true)
            if (wrote) {
              setInitialSyncFlag(true)
              pullSucceeded = true
            }
          }
        }
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[Twilight Firebase Sync] Initial pull gagal — auto-save tetap dikunci:', code, msg)
      firebaseErrorMessage.value = code ? `${code}: ${msg}` : msg
      firebaseSyncStatus.value = navigator.onLine ? 'error' : 'offline'
      // TETAP biarkan `isInitialCloudSyncDone = false` agar tidak pernah menimpa Cloud secara buta!
    } finally {
      isInitialPullInFlight = false
    }

    // Pasang listener real-time Firestore (otomatis menarik perubahan terbaru dari HP/PC lain!)
    docSnapshotUnsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) return
        const fromCache = snap.metadata.fromCache
        const pendingWrites = snap.metadata.hasPendingWrites

        if (pendingWrites) {
          firebaseSyncStatus.value = navigator.onLine ? 'syncing' : 'offline'
          return
        }

        const raw = snap.data() as FirestoreStateEnvelope
        const remoteTs = extractEnvelopeTimestampMs(raw)

        // Jika sebelumnya initial pull sempat tertunda offline lalu snapshot server masuk, buka kunci aman!
        if (!isInitialCloudSyncReady && raw?.data && typeof raw.data === 'object') {
          const localSnap = registeredCallbacks?.getLocalSnapshot() ?? {}
          const { merged } = smartMergeCloudWithLocal(raw.data, localSnap)
          lastAppliedRemoteTimestamp = remoteTs || Date.now()
          registeredCallbacks?.applyRemoteSnapshot(merged, profile)
          firebaseLastSyncedAt.value = new Date(lastAppliedRemoteTimestamp).toISOString()
          setInitialSyncFlag(true)
          firebaseSyncStatus.value = fromCache && !navigator.onLine ? 'offline' : 'synced'
          return
        }

        firebaseSyncStatus.value = fromCache && !navigator.onLine ? 'offline' : 'synced'

        // Abaikan echo dari tab ini sendiri
        if (raw.updatedBySession === CLIENT_SESSION_ID) {
          if (remoteTs > 0) {
            lastAppliedRemoteTimestamp = Math.max(lastAppliedRemoteTimestamp, remoteTs)
            firebaseLastSyncedAt.value = new Date(remoteTs).toISOString()
          }
          return
        }

        if (raw.data && typeof raw.data === 'object' && remoteTs > lastAppliedRemoteTimestamp) {
          lastAppliedRemoteTimestamp = remoteTs
          registeredCallbacks?.applyRemoteSnapshot(raw.data, profile)
          firebaseLastSyncedAt.value = new Date(remoteTs).toISOString()
        }
      },
      (err) => {
        firebaseErrorMessage.value = err.message
        firebaseSyncStatus.value = navigator.onLine ? 'error' : 'offline'
      },
    )

    return pullSucceeded
  }

  /** Daftarkan callback penyimpanan & mulai memantau status Login Google (idempoten, aman dipanggil berulang) */
  function initFirebaseSync(callbacks: RemoteSyncCallbacks) {
    registeredCallbacks = callbacks
    if (!import.meta.client) return

    isBrowserOnline.value = navigator.onLine
    if (!lifecycleListenersAttached) {
      lifecycleListenersAttached = true
      window.addEventListener('online', () => {
        isBrowserOnline.value = true
        const currentUser = firebaseUser.value
        if (!currentUser) return
        if (!isInitialCloudSyncReady) {
          void startUserCloudSync(currentUser)
        } else {
          void pullLatestFromCloudIfNewer(currentUser)
        }
      })
      window.addEventListener('offline', () => {
        isBrowserOnline.value = false
        if (firebaseUser.value) {
          firebaseSyncStatus.value = 'offline'
        }
      })
      // Saat user berpindah dari HP kembali ke Laptop (tab aktif lagi), tarik snapshot terbaru jika `updatedAt` lebih baru
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && firebaseUser.value) {
          void pullLatestFromCloudIfNewer(firebaseUser.value)
        }
      })
    }

    const client = ensureFirebaseClient()
    if (!client) return

    // Tangkap hasil login redirect bila browser HP memakai fallback redirect
    getRedirectResult(client.auth).catch(() => {})

    if (authListenerUnsub) return

    authListenerUnsub = onAuthStateChanged(client.auth, (user) => {
      const mapped = mapFirebaseUser(user)
      const prevUid = firebaseUser.value?.uid ?? null
      firebaseUser.value = mapped
      isFirebaseAuthReady.value = true

      if (mapped) {
        if (mapped.uid !== prevUid || !isInitialCloudSyncReady) {
          // PENTING: JANGAN pernah langsung setDoc — selalu tarik Cloud dulu via startUserCloudSync!
          void startUserCloudSync(mapped)
        }
      } else {
        clearPendingSyncTimer()
        detachDocListener()
        setInitialSyncFlag(false)
        lastAppliedRemoteTimestamp = 0
        firebaseSyncStatus.value = 'guest'
        firebaseLastSyncedAt.value = ''
      }
    })
  }

  /** Login dengan Google (Popup di PC/HP modern + fallback Redirect otomatis jika popup diblokir) */
  async function signInWithGoogle(): Promise<boolean> {
    if (!import.meta.client) return false
    const client = ensureFirebaseClient()
    if (!client) return false

    isFirebaseAuthBusy.value = true
    firebaseErrorMessage.value = ''

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      const result = await signInWithPopup(client.auth, provider)
      const mapped = mapFirebaseUser(result.user)
      if (mapped) {
        // Kunci auto-save sebelum `onAuthStateChanged` / `startUserCloudSync` menyelesaikan Cloud-First Pull
        clearPendingSyncTimer()
        setInitialSyncFlag(false)
        firebaseUser.value = mapped
        void startUserCloudSync(mapped)
        registeredCallbacks?.onToast?.(
          `Halo ${mapped.displayName}! Mengambil data Cloud Google-mu... ☁️✨`,
        )
      }
      return true
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(client.auth, provider)
          return true
        } catch (redirErr) {
          firebaseErrorMessage.value =
            redirErr instanceof Error ? redirErr.message : 'Gagal login redirect Google'
        }
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return false
      } else if (code === 'auth/unauthorized-domain') {
        const msg =
          'Domain ini belum didaftarkan di Firebase Console (Authentication → Settings → Authorized domains).'
        firebaseErrorMessage.value = msg
        registeredCallbacks?.onToast?.(`⚠️ ${msg}`)
        return false
      } else {
        const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.'
        firebaseErrorMessage.value = msg
        registeredCallbacks?.onToast?.('⚠️ Gagal login Google. Coba lagi ya~')
      }
      return false
    } finally {
      isFirebaseAuthBusy.value = false
    }
  }

  /** Keluar dari akun Google (data lokal di browser tetap aman!) */
  async function signOutGoogle(): Promise<void> {
    if (!import.meta.client) return
    const client = ensureFirebaseClient()
    if (!client) return

    isFirebaseAuthBusy.value = true
    try {
      clearPendingSyncTimer()
      detachDocListener()
      setInitialSyncFlag(false)
      lastAppliedRemoteTimestamp = 0
      await signOut(client.auth)
      firebaseUser.value = null
      firebaseSyncStatus.value = 'guest'
      firebaseLastSyncedAt.value = ''
      registeredCallbacks?.onToast?.('Kamu keluar dari akun Google. Data lokal tetap tersimpan 💾')
    } catch {
      registeredCallbacks?.onToast?.('Gagal keluar akun. Coba lagi sebentar~')
    } finally {
      isFirebaseAuthBusy.value = false
    }
  }

  /** Paksa sinkronisasi manual — jika initial pull belum selesai, tarik Cloud dulu agar tidak menimpa data! */
  async function syncNowWithFirebase(): Promise<boolean> {
    const user = firebaseUser.value
    if (!user) return false

    if (!isInitialCloudSyncReady) {
      const pulled = await startUserCloudSync(user)
      if (pulled) {
        registeredCallbacks?.onToast?.('☁️ Data Cloud berhasil dimuat & disinkronkan!')
      }
      return pulled
    }

    const snapshot = registeredCallbacks?.getLocalSnapshot()
    if (!snapshot) return false
    return await writeSnapshotToFirestore(snapshot, true)
  }

  return {
    firebaseUser,
    isFirebaseAuthReady,
    isFirebaseAuthBusy,
    isInitialCloudSyncDone,
    firebaseSyncStatus,
    firebaseLastSyncedAt,
    firebaseErrorMessage,
    isBrowserOnline,
    initFirebaseSync,
    signInWithGoogle,
    signOutGoogle,
    scheduleFirestoreSync,
    syncNowWithFirebase,
  }
}
