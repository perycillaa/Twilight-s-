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
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
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

// --- Singleton module instances (hanya diinisialisasi sekali di sisi client) ---
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let authListenerUnsub: Unsubscribe | null = null
let docSnapshotUnsub: Unsubscribe | null = null
let onlineListenersAttached = false
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let registeredCallbacks: RemoteSyncCallbacks | null = null
let lastAppliedRemoteTimestamp = 0

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
      // Aktifkan Offline Persistence resmi Firebase v10+ berbasis IndexedDB + dukungan multi-tab
      firebaseDb = initializeFirestore(firebaseApp, {
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
 * - Login 1 klik dengan akun Google (popup + fallback redirect untuk browser HP ketat)
 * - Penyimpanan offline otomatis berbasis IndexedDB (perubahan saat offline otomatis terunggah saat online lagi)
 * - Sinkronisasi real-time antar PC & HP lewat Firestore `onSnapshot` pada dokumen `users/{uid}/twilights/state`
 */
export function useFirebaseCloudSync() {
  const firebaseUser = useState<FirebaseProfileUser | null>('twilights-fb-user', () => null)
  const isFirebaseAuthReady = useState<boolean>('twilights-fb-auth-ready', () => false)
  const isFirebaseAuthBusy = useState<boolean>('twilights-fb-auth-busy', () => false)
  const firebaseSyncStatus = useState<FirebaseSyncState>('twilights-fb-sync-status', () => 'guest')
  const firebaseLastSyncedAt = useState<string>('twilights-fb-last-synced', () => '')
  const firebaseErrorMessage = useState<string>('twilights-fb-error', () => '')
  const isBrowserOnline = useState<boolean>('twilights-browser-online', () => true)

  function getUserStateDocRef(uid: string) {
    const client = ensureFirebaseClient()
    if (!client) return null
    return doc(client.db, 'users', uid, 'twilights', 'state')
  }

  function detachDocListener() {
    if (docSnapshotUnsub) {
      docSnapshotUnsub()
      docSnapshotUnsub = null
    }
  }

  /** Tulis snapshot state saat ini ke Cloud Firestore (tetap berhasil masuk antrean offline IndexedDB!) */
  async function writeSnapshotToFirestore(
    snapshot: Record<string, unknown>,
    manualTrigger = false,
  ): Promise<boolean> {
    if (!import.meta.client) return false
    const user = firebaseUser.value
    if (!user) return false

    const ref = getUserStateDocRef(user.uid)
    if (!ref) return false

    firebaseErrorMessage.value = ''
    firebaseSyncStatus.value = isBrowserOnline.value ? 'syncing' : 'offline'

    try {
      const nowMs = Date.now()
      await setDoc(
        ref,
        {
          data: snapshot,
          updatedAtMs: nowMs,
          updatedBySession: CLIENT_SESSION_ID,
          updatedAt: serverTimestamp(),
          profileEmail: user.email,
          profileName: user.displayName,
          appVersion: 2,
        },
        { merge: true },
      )

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
      const msg = err instanceof Error ? err.message : 'Gagal menyinkronkan ke Firestore'
      firebaseErrorMessage.value = msg
      firebaseSyncStatus.value = navigator.onLine ? 'error' : 'offline'
      if (manualTrigger) {
        registeredCallbacks?.onToast?.(
          navigator.onLine
            ? '⚠️ Sinkronisasi cloud tertunda — cek aturan Firestore atau koneksi internet.'
            : '📡 Mode Offline: progres tetap tersimpan lokal & akan sync otomatis saat online!',
        )
      }
      return false
    }
  }

  /** Jadwalkan auto-sync (debounce 650ms) setiap kali pengguna mengubah progres saat sudah login Google */
  function scheduleFirestoreSync(snapshotProvider?: () => Record<string, unknown>) {
    if (!import.meta.client || !firebaseUser.value) return
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
    syncDebounceTimer = setTimeout(() => {
      syncDebounceTimer = null
      const snapshot = snapshotProvider?.() ?? registeredCallbacks?.getLocalSnapshot()
      if (snapshot) {
        void writeSnapshotToFirestore(snapshot, false)
      }
    }, 650)
  }

  /** Mulai sinkronisasi awal & listener real-time PC <-> HP untuk akun Google yang aktif */
  async function startUserCloudSync(profile: FirebaseProfileUser) {
    detachDocListener()
    const ref = getUserStateDocRef(profile.uid)
    if (!ref) return

    firebaseSyncStatus.value = navigator.onLine ? 'syncing' : 'offline'

    // 1. Cek dokumen awal di Firestore (atau cache offline IndexedDB jika sedang offline)
    try {
      const initialSnap = await getDoc(ref)
      if (initialSnap.exists()) {
        const raw = initialSnap.data() as {
          data?: Record<string, unknown>
          updatedAtMs?: number
        }
        if (raw?.data && typeof raw.data === 'object') {
          lastAppliedRemoteTimestamp = Number(raw.updatedAtMs) || Date.now()
          registeredCallbacks?.applyRemoteSnapshot(raw.data, profile)
          firebaseLastSyncedAt.value = new Date(lastAppliedRemoteTimestamp).toISOString()
          firebaseSyncStatus.value = navigator.onLine ? 'synced' : 'offline'
        }
      } else {
        // Akun Google pertama kali masuk -> langsung unggah progres lokal agar tidak ada data hilang
        const localSnap = registeredCallbacks?.getLocalSnapshot()
        if (localSnap) {
          await writeSnapshotToFirestore(localSnap, false)
        }
      }
    } catch {
      // Tetap lanjutkan pasang onSnapshot agar langsung sinkron saat koneksi pulih
      firebaseSyncStatus.value = navigator.onLine ? 'error' : 'offline'
    }

    // 2. Pasang listener real-time Firestore (otomatis menarik perubahan terbaru dari HP/PC lain!)
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

        firebaseSyncStatus.value = fromCache && !navigator.onLine ? 'offline' : 'synced'

        const raw = snap.data() as {
          data?: Record<string, unknown>
          updatedAtMs?: number
          updatedBySession?: string
        }

        // Abaikan echo dari tab ini sendiri
        if (raw.updatedBySession === CLIENT_SESSION_ID) {
          if (raw.updatedAtMs) {
            firebaseLastSyncedAt.value = new Date(raw.updatedAtMs).toISOString()
          }
          return
        }

        const remoteTs = Number(raw.updatedAtMs) || 0
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
  }

  /** Daftarkan callback penyimpanan & mulai memantau status Login Google (idempoten, aman dipanggil berulang) */
  function initFirebaseSync(callbacks: RemoteSyncCallbacks) {
    registeredCallbacks = callbacks
    if (!import.meta.client) return

    isBrowserOnline.value = navigator.onLine
    if (!onlineListenersAttached) {
      onlineListenersAttached = true
      window.addEventListener('online', () => {
        isBrowserOnline.value = true
        if (firebaseUser.value) {
          firebaseSyncStatus.value = 'syncing'
          scheduleFirestoreSync()
        }
      })
      window.addEventListener('offline', () => {
        isBrowserOnline.value = false
        if (firebaseUser.value) {
          firebaseSyncStatus.value = 'offline'
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
        if (mapped.uid !== prevUid) {
          void startUserCloudSync(mapped)
        }
      } else {
        detachDocListener()
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
        firebaseUser.value = mapped
        registeredCallbacks?.onToast?.(
          `Halo ${mapped.displayName}! Cloud Sync Google aktif ✨☁️`,
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
        // Pengguna menutup popup sendiri — jangan tampilkan pesan error yang mengganggu
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
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer)
        syncDebounceTimer = null
      }
      detachDocListener()
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

  /** Paksa sinkronisasi manual sekarang juga */
  async function syncNowWithFirebase(): Promise<boolean> {
    if (!firebaseUser.value) return false
    const snapshot = registeredCallbacks?.getLocalSnapshot()
    if (!snapshot) return false
    return await writeSnapshotToFirestore(snapshot, true)
  }

  return {
    firebaseUser,
    isFirebaseAuthReady,
    isFirebaseAuthBusy,
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
