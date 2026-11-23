import { collection, doc, getDocs, setDoc, deleteDoc, getDoc, getDocFromServer, getDocsFromServer, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from './firebase';

function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue?: T): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(fallbackValue);
      } else {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export interface SyncStatusEvent {
  type: 'success' | 'error' | 'warning';
  message: string;
  collectionName?: string;
}

type SyncStatusListener = (event: SyncStatusEvent) => void;
const syncStatusListeners = new Set<SyncStatusListener>();

export function subscribeSyncStatus(listener: SyncStatusListener): () => void {
  syncStatusListeners.add(listener);
  return () => {
    syncStatusListeners.delete(listener);
  };
}

export function emitSyncStatus(event: SyncStatusEvent) {
  syncStatusListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (e) {}
  });
}

export interface SyncResult {
  success: boolean;
  error?: string;
  quotaExceeded?: boolean;
}

function isQuotaError(error: any): boolean {
  if (!error) return false;
  return Boolean(
    (error.message && (error.message.includes('Quota limit exceeded') || error.message.includes('RESOURCE_EXHAUSTED'))) ||
    error.code === 'resource-exhausted'
  );
}

export async function syncToFirebaseWithStatus(collectionName: string, items: any[]): Promise<SyncResult> {
  try {
    // Deep clone & bersihkan nilai undefined agar Firestore menerima data 100% tanpa error
    const jsonStr = JSON.stringify(items);
    const byteSize = new Blob([jsonStr]).size;
    if (byteSize > 950 * 1024) {
      return {
        success: false,
        error: `Ukuran data ${collectionName} (${Math.round(byteSize / 1024)} KB) melebihi batas dokumen Firestore (1 MB). Data tersimpan secara lokal.`
      };
    }
    const cleanData = JSON.parse(jsonStr);
    // Batas timeout 15 detik agar pengiriman lebih stabil di jaringan seluler lambat
    await withTimeout(setDoc(doc(db, 'kombel_data', collectionName), { data: cleanData }), 15000);
    if ((SYNC_VERSION_KEYS as readonly string[]).includes(collectionName)) {
      void bumpCloudVersion(collectionName as SyncVersionKey);
    }
    return { success: true };
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.log('Firebase Quota Exceeded (Sync). Disimpan secara lokal saja.');
      return {
        success: false,
        quotaExceeded: true,
        error: 'Kuota harian Firebase tercapai. Perubahan disimpan di memori lokal perangkat ini.'
      };
    }
    console.info(`Gagal menyinkronkan ${collectionName} ke Firebase:`, error);
    return {
      success: false,
      error: `Gagal menyimpan ${collectionName} ke Cloud (${error?.message || 'periksa koneksi internet'}). Tersimpan lokal.`
    };
  }
}

export async function syncToFirebase(collectionName: string, items: any[]): Promise<boolean> {
  const result = await syncToFirebaseWithStatus(collectionName, items);
  return result.success;
}

export async function syncFromFirebase(collectionName: string) {
  try {
    const docRef = doc(db, 'kombel_data', collectionName);
    let docSnap;
    try {
      // Ambil langsung dari server dengan batas timeout 12 detik agar tidak putus di koneksi lambat
      docSnap = await withTimeout(getDocFromServer(docRef), 12000);
    } catch (serverErr: any) {
      if (isQuotaError(serverErr)) {
        throw serverErr;
      }
      // Fallback ke getDoc hanya jika offline
      docSnap = await getDoc(docRef);
    }
    if (docSnap && docSnap.exists()) {
      return docSnap.data().data;
    }
    return null;
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.log('Firebase Quota Exceeded. Menggunakan data lokal (localStorage).');
      throw new Error('QUOTA_LIMIT_EXCEEDED');
    } else {
      console.info(`Gagal mengambil ${collectionName} dari Firebase:`, error);
    }

    return null;
  }
}

const syncQueueMap = new Map<string, Promise<any>>();

export async function mutateCloudCollection<T>(
  collectionName: string,
  localStorageKeys: string[],
  mutator: (latestItems: T[]) => T[],
  fallbackItems: T[] = [],
  label?: string
): Promise<{ items: T[]; success: boolean; error?: string; quotaExceeded?: boolean }> {
  const previousTask = syncQueueMap.get(collectionName) || Promise.resolve();

  const currentTask = previousTask.then(async () => {
    let baseItems: T[] = Array.isArray(fallbackItems) ? [...fallbackItems] : [];

    let loadedFromCloud = false;

    // 1. Fetch-Before-Write: tarik data terbaru dari Cloud (1 Read) agar perubahan perangkat lain tidak tertimpa
    try {
      const cloudData = await syncFromFirebase(collectionName);
      if (Array.isArray(cloudData)) {
        baseItems = cloudData;
        loadedFromCloud = true;
      } else if (cloudData && typeof cloudData === 'object') {
        baseItems = Object.keys(cloudData).map((key) => ({
          id: key,
          ...(cloudData as Record<string, any>)[key]
        })) as T[];
        loadedFromCloud = true;
      }
    } catch {
      loadedFromCloud = false;
    }

    // Jika Cloud kosong / gagal dibaca / kuota habis, prioritaskan data terbaru dari localStorage sebelum fallbackItems
    if (!loadedFromCloud) {
      for (const key of localStorageKeys) {
        try {
          const saved = localStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              baseItems = parsed;
              break;
            }
          }
        } catch (e) {}
      }
    }

    // 2. Terapkan mutasi (Tambah / Edit / Hapus) di atas snapshot terbaru
    const mergedItems = mutator(baseItems);

    // 3. Simpan ke semua key localStorage terkait
    localStorageKeys.forEach((key) => {
      try {
        localStorage.setItem(key, JSON.stringify(mergedItems));
      } catch (e) {}
    });

    if (collectionName === 'events') {
      try {
        const dlMap: Record<string, string> = {};
        const smMap: Record<string, string[]> = {};
        mergedItems.forEach((evt: any) => {
          if (evt && evt.id) {
            if (evt.uploadDeadline) dlMap[evt.id] = evt.uploadDeadline;
            if (Array.isArray(evt.selectedMemberIds)) smMap[evt.id] = evt.selectedMemberIds;
          }
        });
        localStorage.setItem('kombel-event-deadlines', JSON.stringify(dlMap));
        if (Object.keys(smMap).length > 0) {
          const currentSm = localStorage.getItem('kombel-event-selected-members');
          const parsedSm = currentSm ? JSON.parse(currentSm) : {};
          localStorage.setItem('kombel-event-selected-members', JSON.stringify({ ...parsedSm, ...smMap }));
        }
      } catch (e) {}
    }

    // 4. Kirim hasil gabungan ke Firestore dengan verifikasi status
    const writeResult = await syncToFirebaseWithStatus(collectionName, mergedItems);
    if (writeResult.success) {
      emitSyncStatus({
        type: 'success',
        collectionName,
        message: `${label || 'Data'} berhasil disimpan ke Cloud.`
      });
    } else {
      emitSyncStatus({
        type: writeResult.quotaExceeded ? 'warning' : 'error',
        collectionName,
        message: writeResult.error || `Gagal menyimpan ${label || collectionName} ke Cloud.`
      });
    }

    return {
      items: mergedItems,
      success: writeResult.success,
      error: writeResult.error,
      quotaExceeded: writeResult.quotaExceeded
    };
  });

  syncQueueMap.set(collectionName, currentTask.catch(() => undefined));
  return currentTask;
}

export async function syncSettingsToCloud(
  updates: Record<string, string>,
  label = 'Pengaturan & Profil PGRI'
): Promise<SyncResult> {
  Object.entries(updates).forEach(([k, v]) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  });
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kombel-settings-updated'));
    }
  } catch (e) {}

  try {
    await withTimeout(setDoc(doc(db, 'settings', 'global'), updates, { merge: true }), 15000);
    void bumpCloudVersion('settings');
    emitSyncStatus({
      type: 'success',
      collectionName: 'settings',
      message: `${label} berhasil disimpan ke Cloud.`
    });
    return { success: true };
  } catch (error: any) {
    const quotaExceeded = isQuotaError(error);
    const errorMsg = quotaExceeded
      ? 'Kuota harian Firebase tercapai. Perubahan disimpan di memori lokal perangkat ini.'
      : `Gagal menyimpan ${label} ke Cloud (${error?.message || 'periksa koneksi internet'}). Tersimpan lokal.`;
    emitSyncStatus({
      type: quotaExceeded ? 'warning' : 'error',
      collectionName: 'settings',
      message: errorMsg
    });
    return { success: false, quotaExceeded, error: errorMsg };
  }
}

export async function backupAllFirebaseData() {
  try {
    const backupData: Record<string, any> = {
      kombel_data: {},
      settings: {},
      local_extras: {},
      per_doc_collections: {},
      pengurus_roles: [],
      audit_logs: []
    };

    let kombelCloudReadOk = false;
    let settingsCloudReadOk = false;

    // 1. Ambil data dari server Firebase
    try {
      let kombelSnapshot;
      try {
        kombelSnapshot = await withTimeout(getDocsFromServer(collection(db, 'kombel_data')), 15000);
      } catch {
        kombelSnapshot = await withTimeout(getDocs(collection(db, 'kombel_data')), 15000);
      }
      kombelSnapshot.forEach((docSnap) => {
        backupData.kombel_data[docSnap.id] = docSnap.data().data;
      });
      kombelCloudReadOk = true;
    } catch (e) {
      console.warn('Gagal membaca cloud kombel_data untuk backup, menggunakan data lokal:', e);
    }

    try {
      let settingsSnapshot;
      try {
        settingsSnapshot = await withTimeout(getDocsFromServer(collection(db, 'settings')), 15000);
      } catch {
        settingsSnapshot = await withTimeout(getDocs(collection(db, 'settings')), 15000);
      }
      settingsSnapshot.forEach((docSnap) => {
        // Lewati metadata versi cache sinkronisasi agar tidak mencemari file backup / localStorage saat restore
        if (docSnap.id === 'versions') return;
        backupData.settings[docSnap.id] = docSnap.data();
      });
      settingsCloudReadOk = true;
    } catch (e) {
      console.warn('Gagal membaca cloud settings untuk backup, menggunakan data lokal:', e);
    }

    // 2. Hybrid Merge: Pastikan seluruh data yang ada di LocalStorage ikut ter-backup 100%
    const localKeysMap: Record<string, string[]> = {
      teachers: ['kombel-teachers'],
      events: ['kombel-events'],
      attendanceList: ['kombel-attendance', 'kombel-attendance-list'],
      financialTransactions: ['kombel-financialTransactions', 'kombel-transactions'],
      cashPayments: ['kombel-cashPayments', 'kombel-cash-payments'],
      announcements: ['kombel-announcements'],
      invitations: ['kombel-invitations'],
      suratAgenda: ['pgri-surat-agenda'],
      notulen: ['pgri-notulen-rapat'],
      kontakFeedback: ['pgri-kontak-feedback']
    };

    Object.entries(localKeysMap).forEach(([collectionName, localKeys]) => {
      try {
        let localParsed: any[] | null = null;
        for (const key of localKeys) {
          const localVal = localStorage.getItem(key);
          if (localVal) {
            const parsed = JSON.parse(localVal);
            if (Array.isArray(parsed)) {
              localParsed = parsed;
              break;
            }
          }
        }
        if (localParsed !== null) {
          const cloudVal = backupData.kombel_data[collectionName];
          const cloudEmpty = !Array.isArray(cloudVal) || cloudVal.length === 0;
          if ((!kombelCloudReadOk && cloudVal === undefined) || (cloudEmpty && localParsed.length > 0)) {
            backupData.kombel_data[collectionName] = localParsed;
          }
        }
      } catch (err) {}
    });

    // 2b. Backup koleksi per-dokumen PGRI (Program Kerja, Dana Sosial, & Aspirasi Anggota)
    const perDocSpecs: { collectionName: string; localKey: string }[] = [
      { collectionName: 'proker_items', localKey: 'pgri-proker-items' },
      { collectionName: 'dana_sosial', localKey: 'pgri-dana-sosial' },
      { collectionName: 'aspirasi_items', localKey: 'pgri-aspirasi-local' }
    ];
    for (const spec of perDocSpecs) {
      let items: any[] | null = null;
      try {
        // aspirasi_items hanya boleh diakses jika user terverifikasi (atau pengurus untuk seluruh list)
        if (spec.collectionName !== 'aspirasi_items' || (auth.currentUser && auth.currentUser.emailVerified)) {
          const cloudList = await fetchPerDocCollection<any>(spec.collectionName);
          if (Array.isArray(cloudList)) {
            items = cloudList;
          }
        }
      } catch {}
      if (!items || items.length === 0) {
        try {
          const rawLocal = localStorage.getItem(spec.localKey);
          if (rawLocal) {
            const parsedLocal = JSON.parse(rawLocal);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              items = parsedLocal;
            }
          }
        } catch {}
      }
      if (Array.isArray(items)) {
        backupData.per_doc_collections[spec.collectionName] = items;
      }
    }

    // 2c. Backup daftar Hak Akses Pengurus (RBAC: pengurus_roles)
    try {
      let rolesList: any[] | null = null;
      if (auth.currentUser && auth.currentUser.emailVerified) {
        const cloudRoles = await fetchPerDocCollection<any>('pengurus_roles');
        if (Array.isArray(cloudRoles)) {
          rolesList = cloudRoles;
        }
      }
      if (!rolesList || rolesList.length === 0) {
        const localRoles = localStorage.getItem('pgri-pengurus-roles');
        if (localRoles) {
          const parsedRoles = JSON.parse(localRoles);
          if (Array.isArray(parsedRoles)) rolesList = parsedRoles;
        }
      }
      if (Array.isArray(rolesList)) {
        backupData.pengurus_roles = rolesList;
      }
    } catch {}

    // 2d. Backup Riwayat Audit Aktivitas (audit_logs, maks 200 terbaru)
    try {
      let auditList: any[] | null = null;
      if (auth.currentUser && auth.currentUser.emailVerified) {
        try {
          const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
          const snap = await withTimeout(getDocsFromServer(q), 12000).catch(() => getDocs(q));
          const rows: any[] = [];
          snap.forEach((d) => rows.push(d.data()));
          auditList = rows;
        } catch {}
      }
      if (!auditList || auditList.length === 0) {
        const localLogs = localStorage.getItem('pgri-audit-logs');
        if (localLogs) {
          const parsedLogs = JSON.parse(localLogs);
          if (Array.isArray(parsedLogs)) auditList = parsedLogs;
        }
      }
      if (Array.isArray(auditList)) {
        backupData.audit_logs = auditList;
      }
    } catch {}

    // Masukkan seluruh setting lokal terbaru (logo PGRI, TTD + ukuran, stempel, org-config, profil PGRI, dll.) ke settings.global
    const settingKeys = [
      'org-config',
      'logo-pgri',
      'logo-kombel',
      'ttd-pengawas',
      'ttd-pengawas-size',
      'ttd-ketua',
      'ttd-ketua-size',
      'ttd-sekretaris',
      'ttd-sekretaris-size',
      'ttd-bendahara',
      'ttd-bendahara-size',
      'logo-stempel',
      'logo-stempel-size',
      'logo-stempel-rotation',
      'kombel-visi',
      'kombel-misi',
      'kombel-pembina',
      'kombel-penanggungjawab',
      'kombel-pengurus',
      'pgri-verified-pengurus-names',
      'kombel-undangan-npa'
    ];
    if (!backupData.settings.global) backupData.settings.global = {};
    settingKeys.forEach((k) => {
      try {
        const localS = localStorage.getItem(k);
        if (localS !== null && localS !== undefined) {
          if (!settingsCloudReadOk || backupData.settings.global[k] === undefined || localS !== '') {
            backupData.settings.global[k] = localS;
          }
        }
      } catch {}
    });

    try {
      const localLocked = localStorage.getItem('kombel-locked-menus');
      if (localLocked && (!backupData.settings['locked-menus'] || Object.keys(backupData.settings['locked-menus']).length === 0)) {
        backupData.settings['locked-menus'] = JSON.parse(localLocked);
      }
    } catch (e) {}

    // 3. Simpan data pendukung yang tersimpan di LocalStorage
    const extraLocalKeys = [
      'kombel-undangan-npa',
      'kombel-event-selected-members',
      'kombel-event-invitations',
      'kombel-event-deadlines',
      'pgri-verified-pengurus-names',
      'pgri-kontak-feedback',
      'pgri-proker-items',
      'pgri-dana-sosial',
      'pgri-aspirasi-local',
      'pgri-surat-agenda',
      'pgri-notulen-rapat',
      'pgri-pengurus-roles',
      'pgri-audit-logs'
    ];
    extraLocalKeys.forEach((k) => {
      try {
        const val = localStorage.getItem(k);
        if (val !== null && val !== undefined) {
          backupData.local_extras[k] = val;
        }
      } catch (e) {}
    });

    return backupData;
  } catch (error) {
    console.warn('Error backing up data:', error);
    return null;
  }
}

export interface RestoreResult {
  success: boolean;
  cloudSynced: boolean;
  warnings: string[];
}

const VALID_DOC_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

async function replacePerDocCollection(
  collectionName: string,
  validDocs: { docId: string; payload: Record<string, any> }[],
  label: string
): Promise<SyncResult> {
  const validIdSet = new Set(validDocs.map((d) => d.docId));

  // 1. Upsert seluruh dokumen dari file backup
  if (validDocs.length > 0) {
    const upsertRes = await saveBatchPerDocItems(collectionName, validDocs, label);
    if (!upsertRes.success) {
      return upsertRes;
    }
  }

  // 2. Hapus dokumen sisa lama di Firestore yang tidak ada pada file backup
  try {
    const existingCloud = await fetchPerDocCollection<{ id: string }>(collectionName);
    if (Array.isArray(existingCloud)) {
      const staleIds = existingCloud
        .map((item) => String(item.id || ''))
        .filter((id) => VALID_DOC_ID_RE.test(id) && !validIdSet.has(id));

      const CHUNK_SIZE = 450;
      for (let i = 0; i < staleIds.length; i += CHUNK_SIZE) {
        const chunk = staleIds.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((staleId) => {
          batch.delete(doc(db, collectionName, staleId));
          removeFromOfflineQueue(collectionName, staleId);
        });
        await withTimeout(batch.commit(), 15000);
      }
      if (
        staleIds.length > 0 &&
        (collectionName === 'proker_items' ||
          collectionName === 'dana_sosial' ||
          collectionName === 'aspirasi_items')
      ) {
        void bumpCloudVersion(collectionName);
      }
    }
  } catch (err: any) {
    console.warn(`Gagal membersihkan dokumen sisa pada ${collectionName}:`, err);
  }

  return { success: true };
}

export async function restoreAllFirebaseData(backupData: Record<string, any>): Promise<RestoreResult> {
  const warnings: string[] = [];
  try {
    if (!backupData || typeof backupData !== 'object' || Array.isArray(backupData)) {
      return { success: false, cloudSynced: false, warnings: ['Format file backup tidak valid.'] };
    }

    const hasKnownStructure = Boolean(
      (backupData.kombel_data && typeof backupData.kombel_data === 'object') ||
        (backupData.settings && typeof backupData.settings === 'object') ||
        (backupData.local_extras && typeof backupData.local_extras === 'object') ||
        (backupData.per_doc_collections && typeof backupData.per_doc_collections === 'object') ||
        Array.isArray(backupData.pengurus_roles) ||
        Array.isArray(backupData.audit_logs)
    );

    if (!hasKnownStructure) {
      return { success: false, cloudSynced: false, warnings: ['Struktur data backup tidak dikenali.'] };
    }

    // Helper map untuk menyuntikkan data langsung ke seluruh alias LocalStorage yang dibaca tiap menu
    const localKeysMap: Record<string, string[]> = {
      teachers: ['kombel-teachers'],
      events: ['kombel-events'],
      attendanceList: ['kombel-attendance', 'kombel-attendance-list'],
      materials: ['kombel-materials', 'kombel_materi_list'],
      financialTransactions: ['kombel-financialTransactions', 'kombel-transactions'],
      cashPayments: ['kombel-cashPayments', 'kombel-cash-payments'],
      announcements: ['kombel-announcements'],
      forumPosts: ['kombel-forumPosts'],
      taskSubmissions: ['kombel-task-submissions'],
      webinars: ['kombel-webinars'],
      invitations: ['kombel-invitations'],
      suratAgenda: ['pgri-surat-agenda'],
      notulen: ['pgri-notulen-rapat'],
      kontakFeedback: ['pgri-kontak-feedback']
    };

    // 1. Restore kombel_data
    const kombelObj = backupData.kombel_data;
    if (kombelObj && typeof kombelObj === 'object' && !Array.isArray(kombelObj)) {
      // Bersihkan sisa data lama di localStorage untuk koleksi yang tidak ada di file backup
      Object.entries(localKeysMap).forEach(([collectionName, keys]) => {
        if (!(collectionName in kombelObj)) {
          keys.forEach((key) => {
            try {
              localStorage.setItem(key, '[]');
            } catch (e) {}
          });
        }
      });

      // Reset data turunan event sebelum diisi ulang dari backup
      try {
        localStorage.removeItem('kombel-event-deadlines');
        localStorage.removeItem('kombel-event-selected-members');
        localStorage.removeItem('kombel-event-invitations');
      } catch (e) {}

      for (const [collectionName, data] of Object.entries(kombelObj)) {
        if (Array.isArray(data)) {
          // Tulis ke semua alias LocalStorage agar langsung tampil setelah reload
          const localKeys = localKeysMap[collectionName] || [`kombel-${collectionName}`];
          localKeys.forEach((key) => {
            try {
              localStorage.setItem(key, JSON.stringify(data));
            } catch (e) {}
          });

          // Ekstrak data turunan khusus events (deadlines, selected members, undangan per kegiatan)
          if (collectionName === 'events') {
            try {
              const dlMap: Record<string, string> = {};
              const smMap: Record<string, string[]> = {};
              const invMap: Record<string, { url: string; fileName: string }> = {};
              data.forEach((evt: any) => {
                if (evt && evt.id) {
                  if (evt.uploadDeadline) dlMap[evt.id] = evt.uploadDeadline;
                  if (Array.isArray(evt.selectedMemberIds)) {
                    smMap[evt.id] = evt.selectedMemberIds;
                  }
                  if (evt.invitationUrl) {
                    invMap[evt.id] = {
                      url: evt.invitationUrl,
                      fileName: evt.invitationName || `Undangan - ${evt.title || evt.id}.pdf`
                    };
                  }
                }
              });
              localStorage.setItem('kombel-event-deadlines', JSON.stringify(dlMap));
              if (Object.keys(smMap).length > 0) {
                localStorage.setItem('kombel-event-selected-members', JSON.stringify(smMap));
              }
              if (Object.keys(invMap).length > 0) {
                localStorage.setItem('kombel-event-invitations', JSON.stringify(invMap));
              }
            } catch (e) {}
          }

          // Kirim ke Cloud Firestore dengan pengecekan status
          const syncRes = await syncToFirebaseWithStatus(collectionName, data);
          if (!syncRes.success) {
            warnings.push(syncRes.error || `Koleksi ${collectionName} hanya tersimpan lokal.`);
          }

          // Sinkronisasi ulang koleksi mirror per-dokumen agar konsisten dengan hasil restore
          if (collectionName === 'suratAgenda') {
            const validDirections = new Set(['Masuk', 'Keluar']);
            const validSuratDocs = data
              .filter((item: any) => item && VALID_DOC_ID_RE.test(String(item.id || '')))
              .map((item: any) => {
                const payload: Record<string, any> = {
                  id: String(item.id),
                  direction: validDirections.has(item.direction) ? item.direction : 'Keluar',
                  nomorSurat: String(item.nomorSurat || '-').slice(0, 120),
                  tanggalSurat: String(item.tanggalSurat || '').slice(0, 32),
                  asalTujuan: String(item.asalTujuan || '-').slice(0, 200),
                  perihal: String(item.perihal || '-').slice(0, 300)
                };
                if (typeof item.lampiranUrl === 'string') payload.lampiranUrl = item.lampiranUrl.slice(0, 600);
                if (typeof item.catatan === 'string') payload.catatan = item.catatan.slice(0, 500);
                return { docId: payload.id, payload };
              });
            await replacePerDocCollection('surat_agenda', validSuratDocs, 'Buku Agenda Surat');
          } else if (collectionName === 'financialTransactions') {
            const validTypes = new Set(['Pemasukan', 'Pengeluaran']);
            const validTxDocs = data
              .filter((item: any) => item && VALID_DOC_ID_RE.test(String(item.id || '')))
              .map((item: any) => {
                const payload: Record<string, any> = {
                  id: String(item.id),
                  date: String(item.date || '').slice(0, 32),
                  type: validTypes.has(item.type) ? item.type : 'Pemasukan',
                  amount: Math.max(0, Number(item.amount) || 0),
                  description: String(item.description || '-').slice(0, 400)
                };
                if (typeof item.category === 'string') payload.category = item.category.slice(0, 80);
                if (typeof item.receiptImage === 'string' && item.receiptImage.length <= 350000) {
                  payload.receiptImage = item.receiptImage;
                }
                return { docId: payload.id, payload };
              });
            await replacePerDocCollection('transaction_docs', validTxDocs, 'Catatan Keuangan');
          } else if (collectionName === 'attendanceList') {
            const validStatuses = new Set(['Hadir', 'Izin', 'Sakit', 'Tugas Luar', 'Verifikasi', 'Alpha']);
            const validAttDocs = data
              .filter((item: any) => item && VALID_DOC_ID_RE.test(String(item.id || '')))
              .map((item: any) => {
                const payload: Record<string, any> = {
                  id: String(item.id),
                  eventId: String(item.eventId || 'evt').slice(0, 128),
                  eventTitle: String(item.eventTitle || '').slice(0, 240),
                  teacherName: String(item.teacherName || '-').slice(0, 160),
                  school: String(item.school || '').slice(0, 160),
                  status: validStatuses.has(item.status) ? item.status : 'Hadir',
                  timestamp: String(item.timestamp || new Date().toISOString()).slice(0, 64)
                };
                if (typeof item.teacherId === 'string') payload.teacherId = item.teacherId.slice(0, 128);
                if (typeof item.nip === 'string') payload.nip = item.nip.slice(0, 40);
                if (typeof item.notes === 'string') payload.notes = item.notes.slice(0, 500);
                if (typeof item.signature === 'string' && item.signature.length <= 200000) {
                  payload.signature = item.signature;
                }
                return { docId: payload.id, payload };
              });
            await replacePerDocCollection('attendance_docs', validAttDocs, 'Daftar Hadir');
          }
        }
      }
    }

    // 2. Restore settings
    if (backupData.settings && typeof backupData.settings === 'object') {
      let settingsCloudUpdated = false;
      for (const [docId, data] of Object.entries(backupData.settings)) {
        // Abaikan dokumen 'versions' (hanya metadata cache timestamp, bukan data pengaturan)
        if (docId === 'versions') continue;

        if (data && typeof data === 'object') {
          if (docId === 'locked-menus') {
            try {
              localStorage.setItem('kombel-locked-menus', JSON.stringify(data));
            } catch (e) {}
          } else {
            const normalizedData = { ...(data as Record<string, any>) };
            // Kompatibilitas file backup lama: salin logo-kombel ke logo-pgri bila logo-pgri belum ada
            if (docId === 'global' && !normalizedData['logo-pgri'] && normalizedData['logo-kombel']) {
              normalizedData['logo-pgri'] = normalizedData['logo-kombel'];
            }
            Object.entries(normalizedData).forEach(([k, v]) => {
              if (v !== undefined && v !== null) {
                try {
                  localStorage.setItem(k, String(v));
                } catch (e) {}
              }
            });
          }

          // Kirim ke Cloud Firestore dengan pengecekan batas 950 KB & error reporting
          try {
            const payloadToUpload =
              docId === 'global' && !(data as Record<string, any>)['logo-pgri'] && (data as Record<string, any>)['logo-kombel']
                ? { ...(data as Record<string, any>), 'logo-pgri': (data as Record<string, any>)['logo-kombel'] }
                : data;
            const byteSize = new Blob([JSON.stringify(payloadToUpload)]).size;
            if (byteSize > 950 * 1024) {
              warnings.push(
                `Pengaturan (${docId}: ${Math.round(byteSize / 1024)} KB) melebihi batas 950 KB Firestore, hanya dipulihkan ke perangkat ini.`
              );
            } else {
              await withTimeout(setDoc(doc(db, 'settings', docId), payloadToUpload), 15000);
              settingsCloudUpdated = true;
            }
          } catch (e: any) {
            const msg = isQuotaError(e)
              ? `Kuota Firebase tercapai saat memulihkan pengaturan (${docId}). Tersimpan lokal.`
              : `Pengaturan (${docId}) gagal dikirim ke Cloud (${e?.message || 'periksa koneksi'}). Tersimpan lokal.`;
            warnings.push(msg);
          }
        }
      }
      if (settingsCloudUpdated) {
        await bumpCloudVersion('settings');
      }
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('kombel-settings-updated'));
          window.dispatchEvent(new Event('kombel-locked-menus-updated'));
        }
      } catch (e) {}
    }

    // 3. Restore data pendukung lokal (local_extras)
    if (backupData.local_extras && typeof backupData.local_extras === 'object') {
      Object.entries(backupData.local_extras as Record<string, any>).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          try {
            if (k === 'kombel-event-selected-members' || k === 'kombel-event-invitations' || k === 'kombel-event-deadlines') {
              const existingRaw = localStorage.getItem(k);
              const existingObj = existingRaw ? JSON.parse(existingRaw) : {};
              const incomingObj = typeof v === 'string' ? JSON.parse(v) : v;
              if (existingObj && typeof existingObj === 'object' && incomingObj && typeof incomingObj === 'object') {
                localStorage.setItem(k, JSON.stringify({ ...incomingObj, ...existingObj }));
                return;
              }
            }
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          } catch (e) {}
        }
      });
    }

    // 4. Restore koleksi per-dokumen PGRI (Program Kerja, Dana Sosial, & Aspirasi) termasuk pembersihan dokumen sisa lama
    if (backupData.per_doc_collections && typeof backupData.per_doc_collections === 'object') {
      const perDoc = backupData.per_doc_collections as Record<string, any>;

      if (Array.isArray(perDoc.proker_items)) {
        try {
          localStorage.setItem('pgri-proker-items', JSON.stringify(perDoc.proker_items));
          window.dispatchEvent(new Event('pgri-proker-synced'));
        } catch {}
        const validStatuses = new Set(['Direncanakan', 'Berjalan', 'Terlaksana']);
        const validDocs = perDoc.proker_items
          .filter((item: any) => item && VALID_DOC_ID_RE.test(String(item.id || '')))
          .map((item: any) => {
            const payload: Record<string, any> = {
              id: String(item.id),
              title: String(item.title || 'Program Kerja').slice(0, 200),
              seksi: String(item.seksi || 'Umum').slice(0, 120),
              status: validStatuses.has(item.status) ? item.status : 'Direncanakan',
              progress: Math.min(100, Math.max(0, Number(item.progress) || 0)),
              updatedAt: String(item.updatedAt || new Date().toISOString()).slice(0, 64)
            };
            if (typeof item.penanggungJawab === 'string') payload.penanggungJawab = item.penanggungJawab.slice(0, 120);
            if (typeof item.periode === 'string') payload.periode = item.periode.slice(0, 64);
            if (typeof item.targetDate === 'string') payload.targetDate = item.targetDate.slice(0, 64);
            if (typeof item.budget === 'number' && !isNaN(item.budget)) payload.budget = Math.max(0, item.budget);
            if (typeof item.description === 'string') payload.description = item.description.slice(0, 1000);
            if (typeof item.documentationUrl === 'string') payload.documentationUrl = item.documentationUrl.slice(0, 500);
            return { docId: payload.id, payload };
          });
        const res = await replacePerDocCollection('proker_items', validDocs, 'Program Kerja');
        if (!res.success && res.error) warnings.push(`Program Kerja: ${res.error}`);
      }

      if (Array.isArray(perDoc.dana_sosial)) {
        try {
          localStorage.setItem('pgri-dana-sosial', JSON.stringify(perDoc.dana_sosial));
          window.dispatchEvent(new Event('pgri-sosial-synced'));
        } catch {}
        const validTypes = new Set(['Penggalangan', 'Penyaluran']);
        const validCategories = new Set([
          'Sakit / Rawat Inap',
          'Duka Cita',
          'Purna Tugas / Pensiun',
          'Pernikahan / Kelahiran',
          'Bencana / Lainnya'
        ]);
        const validStatuses = new Set(['Terkumpul', 'Tersalurkan', 'Proses']);
        const validDocs = perDoc.dana_sosial
          .filter((item: any) => item && VALID_DOC_ID_RE.test(String(item.id || '')))
          .map((item: any) => {
            const payload: Record<string, any> = {
              id: String(item.id),
              type: validTypes.has(item.type) ? item.type : 'Penyaluran',
              category: validCategories.has(item.category) ? item.category : 'Bencana / Lainnya',
              recipientName: String(item.recipientName || '-').slice(0, 160),
              amount: Math.max(0, Number(item.amount) || 0),
              date: String(item.date || '').slice(0, 32),
              status: validStatuses.has(item.status) ? item.status : 'Tersalurkan'
            };
            if (typeof item.recipientSchool === 'string') payload.recipientSchool = item.recipientSchool.slice(0, 160);
            if (typeof item.notes === 'string') payload.notes = item.notes.slice(0, 600);
            return { docId: payload.id, payload };
          });
        const res = await replacePerDocCollection('dana_sosial', validDocs, 'Dana Sosial');
        if (!res.success && res.error) warnings.push(`Dana Sosial: ${res.error}`);
      }

      if (Array.isArray(perDoc.aspirasi_items)) {
        try {
          localStorage.setItem('pgri-aspirasi-local', JSON.stringify(perDoc.aspirasi_items));
          window.dispatchEvent(new Event('pgri-sosial-synced'));
        } catch {}
        const validCategories = new Set([
          'Aspirasi Organisasi',
          'Advokasi / LKBH',
          'Administrasi PPPK/PNS',
          'Kesejahteraan & Tunjangan',
          'Lainnya'
        ]);
        const validStatuses = new Set(['Diterima', 'Ditindaklanjuti', 'Selesai']);
        const validDocs = perDoc.aspirasi_items
          .filter((item: any) => item && VALID_DOC_ID_RE.test(String(item.id || '')))
          .map((item: any) => {
            const payload: Record<string, any> = {
              id: String(item.id),
              authorUid: String(item.authorUid || auth.currentUser?.uid || 'restored-user').slice(0, 128),
              senderName: String(item.senderName || 'Anggota PGRI').slice(0, 140),
              category: validCategories.has(item.category) ? item.category : 'Lainnya',
              subject: String(item.subject || '-').slice(0, 200),
              message: String(item.message || '-').slice(0, 2000),
              status: validStatuses.has(item.status) ? item.status : 'Diterima',
              createdAt: String(item.createdAt || new Date().toISOString()).slice(0, 64)
            };
            if (typeof item.senderSchool === 'string') payload.senderSchool = item.senderSchool.slice(0, 140);
            if (typeof item.senderPhone === 'string') payload.senderPhone = item.senderPhone.slice(0, 40);
            if (typeof item.isAnonymous === 'boolean') payload.isAnonymous = item.isAnonymous;
            if (typeof item.response === 'string') payload.response = item.response.slice(0, 1500);
            return { docId: payload.id, payload };
          });
        const res = await replacePerDocCollection('aspirasi_items', validDocs, 'Aspirasi Anggota');
        if (!res.success && res.error) warnings.push(`Aspirasi Anggota: ${res.error}`);
      }
    }

    // 5. Restore daftar Hak Akses Pengurus (pengurus_roles)
    if (Array.isArray(backupData.pengurus_roles)) {
      try {
        localStorage.setItem('pgri-pengurus-roles', JSON.stringify(backupData.pengurus_roles));
      } catch {}
      const validRoleValues = new Set(['ketua', 'sekretaris', 'bendahara', 'seksi', 'guru']);
      const validRoles = backupData.pengurus_roles
        .filter((item: any) => item && typeof item.email === 'string' && item.email.trim().length >= 3)
        .map((item: any) => {
          const cleanEmail = String(item.email).trim().toLowerCase().slice(0, 160);
          const docId = cleanEmail.replace(/[^a-z0-9]/g, '_');
          const payload: Record<string, any> = {
            email: cleanEmail,
            name: String(item.name || cleanEmail).trim().slice(0, 120),
            role: validRoleValues.has(item.role) ? item.role : 'guru',
            updatedAt: String(item.updatedAt || new Date().toISOString()).slice(0, 64)
          };
          if (typeof item.positionLabel === 'string') payload.positionLabel = item.positionLabel.slice(0, 120);
          if (typeof item.assignedBy === 'string') payload.assignedBy = item.assignedBy.slice(0, 160);
          return { docId, payload };
        })
        .filter((item) => VALID_DOC_ID_RE.test(item.docId));

      const res = await replacePerDocCollection('pengurus_roles', validRoles, 'Hak Akses Pengurus');
      if (!res.success && res.error) warnings.push(`Hak Akses Pengurus: ${res.error}`);
    }

    // 6. Restore Riwayat Audit Aktivitas ke penyimpanan lokal (audit_logs di Firestore bersifat immutable)
    if (Array.isArray(backupData.audit_logs)) {
      try {
        localStorage.setItem('pgri-audit-logs', JSON.stringify(backupData.audit_logs.slice(0, 100)));
        window.dispatchEvent(new Event('pgri-audit-updated'));
      } catch {}
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pgri-eoffice-synced'));
        window.dispatchEvent(new Event('pgri-kontak-synced'));
      }
    } catch {}

    return {
      success: true,
      cloudSynced: warnings.length === 0,
      warnings
    };
  } catch (error) {
    console.warn('Error restoring data:', error);
    return {
      success: false,
      cloudSynced: false,
      warnings: ['Terjadi kesalahan tak terduga saat memulihkan data.']
    };
  }
}

// ============================================================================
// OFFLINE-FIRST QUEUE & SCALABLE PER-DOCUMENT FIRESTORE HELPERS
// ============================================================================

const OFFLINE_QUEUE_KEY = 'pgri-offline-sync-queue';

export interface OfflineQueueItem {
  id: string;
  collectionName: string;
  docId: string;
  payload: Record<string, any>;
  createdAt: string;
}

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length;
}

export function enqueueOfflineDoc(
  collectionName: string,
  docId: string,
  payload: Record<string, any>
) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter(
      (item) => !(item.collectionName === collectionName && item.docId === docId)
    );
    filtered.push({
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      collectionName,
      docId,
      payload,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered.slice(-200)));
    window.dispatchEvent(new Event('pgri-offline-queue-updated'));
  } catch {}
}

export async function savePerDocItem(
  collectionName: string,
  docId: string,
  payload: Record<string, any>,
  label?: string
): Promise<SyncResult> {
  const cleanPayload = JSON.parse(JSON.stringify(payload));
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOfflineDoc(collectionName, docId, cleanPayload);
    emitSyncStatus({
      type: 'warning',
      collectionName,
      message: `${label || 'Data'} disimpan ke antrean offline dan akan otomatis terkirim saat sinyal kembali.`,
    });
    return { success: false, error: 'Offline — disimpan di antrean lokal.' };
  }

  try {
    await withTimeout(setDoc(doc(db, collectionName, docId), cleanPayload, { merge: true }), 12000);
    if (
      collectionName === 'proker_items' ||
      collectionName === 'dana_sosial' ||
      collectionName === 'aspirasi_items'
    ) {
      void bumpCloudVersion(collectionName);
    }
    return { success: true };
  } catch (error: any) {
    enqueueOfflineDoc(collectionName, docId, cleanPayload);
    if (isQuotaError(error)) {
      return { success: false, quotaExceeded: true, error: 'Kuota harian tercapai. Disimpan lokal.' };
    }
    return { success: false, error: error?.message || 'Gagal sinkronisasi, masuk antrean offline.' };
  }
}

export async function saveBatchPerDocItems(
  collectionName: string,
  items: { docId: string; payload: Record<string, any> }[],
  label?: string
): Promise<SyncResult> {
  if (!items || items.length === 0) return { success: true };

  const cleanedItems = items.map((item) => ({
    docId: item.docId,
    payload: JSON.parse(JSON.stringify(item.payload)),
  }));

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    cleanedItems.forEach((item) => enqueueOfflineDoc(collectionName, item.docId, item.payload));
    emitSyncStatus({
      type: 'warning',
      collectionName,
      message: `${label || 'Data massal'} disimpan ke antrean offline dan akan otomatis terkirim saat sinyal kembali.`,
    });
    return { success: false, error: 'Offline — disimpan di antrean lokal.' };
  }

  try {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < cleanedItems.length; i += CHUNK_SIZE) {
      const chunk = cleanedItems.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        batch.set(doc(db, collectionName, item.docId), item.payload, { merge: true });
      });
      await withTimeout(batch.commit(), 15000);
      chunk.forEach((item) => removeFromOfflineQueue(collectionName, item.docId));
    }
    if (
      collectionName === 'proker_items' ||
      collectionName === 'dana_sosial' ||
      collectionName === 'aspirasi_items'
    ) {
      void bumpCloudVersion(collectionName);
    }
    return { success: true };
  } catch (error: any) {
    cleanedItems.forEach((item) => enqueueOfflineDoc(collectionName, item.docId, item.payload));
    const quotaExceeded = isQuotaError(error);
    const errorMsg = quotaExceeded
      ? 'Kuota harian Firebase tercapai. Data massal disimpan ke memori lokal & antrean offline.'
      : error?.message || 'Gagal sinkronisasi massal, masuk antrean offline.';
    emitSyncStatus({
      type: quotaExceeded ? 'warning' : 'error',
      collectionName,
      message: errorMsg,
    });
    return { success: false, quotaExceeded, error: errorMsg };
  }
}

export function removeFromOfflineQueue(collectionName: string, docId: string) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter(
      (item) => !(item.collectionName === collectionName && item.docId === docId)
    );
    if (filtered.length !== queue.length) {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new Event('pgri-offline-queue-updated'));
    }
  } catch {}
}

export async function deletePerDocItem(
  collectionName: string,
  docId: string,
  label?: string
): Promise<SyncResult> {
  removeFromOfflineQueue(collectionName, docId);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const errorMsg = `Sedang offline — penghapusan ${label || collectionName} belum tersimpan di Cloud.`;
    emitSyncStatus({
      type: 'warning',
      collectionName,
      message: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  try {
    await withTimeout(deleteDoc(doc(db, collectionName, docId)), 12000);
    if (
      collectionName === 'proker_items' ||
      collectionName === 'dana_sosial' ||
      collectionName === 'aspirasi_items'
    ) {
      void bumpCloudVersion(collectionName);
    }
    return { success: true };
  } catch (error: any) {
    const quotaExceeded = isQuotaError(error);
    const errorMsg = quotaExceeded
      ? `Kuota harian Firebase tercapai. Gagal menghapus ${label || collectionName} di Cloud.`
      : `Gagal menghapus ${label || collectionName} di Cloud (${error?.message || 'periksa hak akses atau koneksi'}).`;
    emitSyncStatus({
      type: quotaExceeded ? 'warning' : 'error',
      collectionName,
      message: errorMsg,
    });
    return { success: false, quotaExceeded, error: errorMsg };
  }
}

export async function fetchPerDocCollection<T>(collectionName: string): Promise<T[] | null> {
  try {
    let snap;
    try {
      snap = await withTimeout(getDocsFromServer(collection(db, collectionName)), 12000);
    } catch (serverErr: any) {
      if (isQuotaError(serverErr)) throw serverErr;
      snap = await getDocs(collection(db, collectionName));
    }
    const items: T[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as T);
    });
    return items;
  } catch (error) {
    console.info(`Gagal mengambil koleksi dokumen ${collectionName}:`, error);
    return null;
  }
}

export async function flushOfflineQueue(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  const remaining: OfflineQueueItem[] = [];
  let flushedCount = 0;
  const flushedVersionKeys = new Set<SyncVersionKey>();

  for (const item of queue) {
    try {
      await withTimeout(
        setDoc(doc(db, item.collectionName, item.docId), item.payload, { merge: true }),
        12000
      );
      flushedCount += 1;
      if (
        item.collectionName === 'proker_items' ||
        item.collectionName === 'dana_sosial' ||
        item.collectionName === 'aspirasi_items'
      ) {
        flushedVersionKeys.add(item.collectionName);
      }
    } catch {
      remaining.push(item);
    }
  }

  flushedVersionKeys.forEach((key) => {
    void bumpCloudVersion(key);
  });

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new Event('pgri-offline-queue-updated'));
  } catch {}

  if (flushedCount > 0) {
    emitSyncStatus({
      type: 'success',
      message: `${flushedCount} data antrean offline berhasil disinkronkan ke Cloud.`,
    });
  }

  return flushedCount;
}

// ============================================================================
// LIGHTWEIGHT CACHE VERSIONING (1 READ CHECK UNTUK HEMAT KUOTA FIREBASE)
// ============================================================================

export type SyncVersionKey =
  | 'teachers'
  | 'events'
  | 'attendanceList'
  | 'financialTransactions'
  | 'cashPayments'
  | 'taskSubmissions'
  | 'materials'
  | 'announcements'
  | 'forumPosts'
  | 'webinars'
  | 'invitations'
  | 'suratAgenda'
  | 'notulen'
  | 'proker_items'
  | 'dana_sosial'
  | 'aspirasi_items'
  | 'kontakFeedback'
  | 'settings';

const SYNC_VERSION_KEYS: readonly SyncVersionKey[] = [
  'teachers',
  'events',
  'attendanceList',
  'financialTransactions',
  'cashPayments',
  'taskSubmissions',
  'materials',
  'announcements',
  'forumPosts',
  'webinars',
  'invitations',
  'suratAgenda',
  'notulen',
  'proker_items',
  'dana_sosial',
  'aspirasi_items',
  'kontakFeedback',
  'settings'
];

const LOCAL_VERSIONS_STORAGE_KEY = 'pgri-cloud-versions-local';
const CLOUD_VERSIONS_SESSION_KEY = 'pgri-cloud-versions-cache';
const CLOUD_VERSIONS_FETCH_TS_KEY = 'pgri-cloud-versions-fetch-ts';

let inFlightVersionsPromise: Promise<Partial<Record<SyncVersionKey, number>> | null> | null = null;

export function getLocalVersions(): Partial<Record<SyncVersionKey, number>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_VERSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return {};
}

export function getCachedCloudVersions(): Partial<Record<SyncVersionKey, number>> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CLOUD_VERSIONS_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function markLocalVersionSynced(
  key: SyncVersionKey,
  cloudVersions?: Partial<Record<SyncVersionKey, number>> | null
) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalVersions();
    const cached = cloudVersions ?? getCachedCloudVersions();
    const serverTs = cached && typeof cached[key] === 'number' ? Number(cached[key]) : 0;
    const prevTs = typeof current[key] === 'number' ? Number(current[key]) : 0;
    current[key] = serverTs > 0 ? Math.max(serverTs, prevTs) : Math.max(1, prevTs);
    localStorage.setItem(LOCAL_VERSIONS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

export function shouldFetchByVersion(
  key: SyncVersionKey,
  cloudVersions: Partial<Record<SyncVersionKey, number>> | null
): boolean {
  const localVersions = getLocalVersions();
  const localTs = typeof localVersions[key] === 'number' ? Number(localVersions[key]) : 0;
  if (localTs <= 0) return true;
  if (!cloudVersions) return false;
  const cloudTs = typeof cloudVersions[key] === 'number' ? Number(cloudVersions[key]) : 0;
  return cloudTs > localTs;
}

export async function fetchCloudVersions(
  cooldownMs = 45000
): Promise<Partial<Record<SyncVersionKey, number>> | null> {
  if (typeof window === 'undefined') return null;

  if (cooldownMs > 0) {
    try {
      const lastFetchTs = Number(sessionStorage.getItem(CLOUD_VERSIONS_FETCH_TS_KEY) || '0');
      const cached = getCachedCloudVersions();
      if (cached && lastFetchTs > 0 && Date.now() - lastFetchTs < cooldownMs) {
        return cached;
      }
    } catch {}
  }

  if (inFlightVersionsPromise) {
    return inFlightVersionsPromise;
  }

  inFlightVersionsPromise = (async () => {
    try {
      const ref = doc(db, 'settings', 'versions');
      let snap;
      try {
        snap = await withTimeout(getDocFromServer(ref), 8000);
      } catch (serverErr: any) {
        if (isQuotaError(serverErr)) {
          return getCachedCloudVersions();
        }
        snap = await getDoc(ref);
      }
      const data = snap && snap.exists()
        ? (snap.data() as Partial<Record<SyncVersionKey, number>>)
        : {};
      try {
        sessionStorage.setItem(CLOUD_VERSIONS_SESSION_KEY, JSON.stringify(data));
        sessionStorage.setItem(CLOUD_VERSIONS_FETCH_TS_KEY, String(Date.now()));
      } catch {}
      return data;
    } catch {
      return getCachedCloudVersions();
    } finally {
      inFlightVersionsPromise = null;
    }
  })();

  return inFlightVersionsPromise;
}

export async function bumpCloudVersion(key: SyncVersionKey): Promise<void> {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;

  const localVersions = getLocalVersions();
  const cached = getCachedCloudVersions();
  const prevTs = Math.max(
    typeof localVersions[key] === 'number' ? Number(localVersions[key]) : 0,
    cached && typeof cached[key] === 'number' ? Number(cached[key]) : 0
  );
  const nextTs = Math.max(Date.now(), prevTs + 1);

  try {
    await withTimeout(setDoc(doc(db, 'settings', 'versions'), { [key]: nextTs }, { merge: true }), 8000);
    try {
      const latestLocal = getLocalVersions();
      latestLocal[key] = nextTs;
      localStorage.setItem(LOCAL_VERSIONS_STORAGE_KEY, JSON.stringify(latestLocal));

      const latestCached = getCachedCloudVersions() || {};
      latestCached[key] = nextTs;
      sessionStorage.setItem(CLOUD_VERSIONS_SESSION_KEY, JSON.stringify(latestCached));
      sessionStorage.setItem(CLOUD_VERSIONS_FETCH_TS_KEY, String(Date.now()));
    } catch {}
  } catch {
    // Non-fatal: jangan gagalkan operasi utama jika bump versi gagal/kuota habis
  }
}
