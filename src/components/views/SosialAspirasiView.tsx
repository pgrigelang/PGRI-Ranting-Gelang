import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  ShieldAlert,
  Plus,
  Send,
  Lock,
  CheckCircle2,
  Trash2,
  Share2,
  X,
  MessageSquareHeart,
  LogIn
} from 'lucide-react';
import { AspirasiItem, DanaSosialItem, PengurusRole } from '../../types';
import { auth } from '../../lib/firebase';
import {
  fetchPerDocCollection,
  savePerDocItem,
  deletePerDocItem,
  removeFromOfflineQueue,
  mutateCloudCollection,
  fetchCloudVersions,
  shouldFetchByVersion,
  markLocalVersionSynced
} from '../../lib/sync';
import { canManageConfidentialAspirasi, logAuditEvent, signInPengurusWithGoogle } from '../../lib/auth';
import { openWhatsAppShare } from '../../lib/orgConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface SosialAspirasiViewProps {
  activeRole: 'guru' | 'admin';
  pengurusRole?: PengurusRole;
  theme?: 'light' | 'dark';
}

const DANA_SOSIAL_KEY = 'pgri-dana-sosial';
const ASPIRASI_KEY = 'pgri-aspirasi-local';

export const SosialAspirasiView: React.FC<SosialAspirasiViewProps> = ({
  activeRole,
  pengurusRole = 'guru' as PengurusRole,
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const effectiveRole: PengurusRole = pengurusRole;
  const canManageDana =
    activeRole === 'admin' || ['ketua', 'sekretaris', 'bendahara'].includes(effectiveRole);
  const canDeleteDana =
    activeRole === 'admin' && (effectiveRole === 'ketua' || effectiveRole === 'bendahara');
  const canReadAllAspirasi =
    canManageConfidentialAspirasi(effectiveRole) || (activeRole === 'admin' && effectiveRole === 'ketua');

  const [activeSubTab, setActiveSubTab] = useState<'dana' | 'aspirasi'>('dana');

  // --- DANA SOSIAL STATE ---
  const [danaList, setDanaList] = useState<DanaSosialItem[]>(() => {
    try {
      const saved = localStorage.getItem(DANA_SOSIAL_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [showDanaModal, setShowDanaModal] = useState(false);
  const [danaForm, setDanaForm] = useState<Omit<DanaSosialItem, 'id'>>({
    type: 'Penyaluran',
    category: 'Sakit / Rawat Inap',
    recipientName: '',
    recipientSchool: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'Tersalurkan'
  });

  // --- ASPIRASI / ADVOKASI LKBH STATE ---
  const [aspirasiList, setAspirasiList] = useState<AspirasiItem[]>(() => {
    try {
      const saved = localStorage.getItem(ASPIRASI_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [aspForm, setAspForm] = useState({
    senderName: auth.currentUser?.displayName || '',
    senderSchool: '',
    senderPhone: '',
    isAnonymous: false,
    category: 'Aspirasi Organisasi' as AspirasiItem['category'],
    subject: '',
    message: ''
  });
  const [aspNotice, setAspNotice] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<AspirasiItem | null>(null);
  const [replyStatus, setReplyStatus] = useState<AspirasiItem['status']>('Ditindaklanjuti');
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadDanaSosial = async () => {
      try {
        const lastSync = sessionStorage.getItem('pgri_dana_sosial_sync_ts');
        if (lastSync && Date.now() - Number(lastSync) < 120000) {
          return;
        }
      } catch {}

      try {
        const cloudVersions = await fetchCloudVersions(45000);
        if (!mounted) return;
        if (!shouldFetchByVersion('dana_sosial', cloudVersions)) {
          try {
            sessionStorage.setItem('pgri_dana_sosial_sync_ts', String(Date.now()));
          } catch {}
          return;
        }

        const cloud = await fetchPerDocCollection<DanaSosialItem>('dana_sosial');
        if (!mounted) return;
        if (Array.isArray(cloud)) {
          const hasCloudVersion = Boolean(cloudVersions && Number(cloudVersions.dana_sosial || 0) > 0);
          if (cloud.length > 0 || hasCloudVersion) {
            setDanaList(cloud);
            try {
              localStorage.setItem(DANA_SOSIAL_KEY, JSON.stringify(cloud));
            } catch {}
          }
          markLocalVersionSynced('dana_sosial', cloudVersions);
          try {
            sessionStorage.setItem('pgri_dana_sosial_sync_ts', String(Date.now()));
          } catch {}
        }
      } catch {}
    };
    loadDanaSosial();
    const handleExternalSync = () => {
      try {
        const savedDana = localStorage.getItem(DANA_SOSIAL_KEY);
        if (savedDana) {
          const parsed = JSON.parse(savedDana);
          if (Array.isArray(parsed)) setDanaList(parsed);
        }
        const savedAsp = localStorage.getItem(ASPIRASI_KEY);
        if (savedAsp) {
          const parsedAsp = JSON.parse(savedAsp);
          if (Array.isArray(parsedAsp)) setAspirasiList(parsedAsp);
        }
      } catch {}
    };
    window.addEventListener('pgri-sosial-synced', handleExternalSync);
    return () => {
      mounted = false;
      window.removeEventListener('pgri-sosial-synced', handleExternalSync);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAspirasi = async () => {
      if (activeSubTab !== 'aspirasi') return;
      const user = auth.currentUser;
      if (!user || !user.emailVerified) return;

      const scopeKey = `${user.uid}_${canReadAllAspirasi ? 'all' : 'own'}`;
      const tsKey = `pgri_aspirasi_sync_ts_${scopeKey}`;
      try {
        const lastSync = sessionStorage.getItem(tsKey);
        if (lastSync && Date.now() - Number(lastSync) < 90000) {
          return;
        }
      } catch {}

      try {
        const cloudVersions = await fetchCloudVersions(45000);
        if (!mounted) return;
        const prevScope = sessionStorage.getItem('pgri_aspirasi_last_scope');
        const scopeChanged = prevScope !== scopeKey;
        if (!scopeChanged && !shouldFetchByVersion('aspirasi_items', cloudVersions)) {
          try {
            sessionStorage.setItem(tsKey, String(Date.now()));
          } catch {}
          return;
        }

        const q = canReadAllAspirasi
          ? collection(db, 'aspirasi_items')
          : query(collection(db, 'aspirasi_items'), where('authorUid', '==', user.uid));
        const snap = await getDocs(q);
        const rows: AspirasiItem[] = [];
        snap.forEach((d) => rows.push(d.data() as AspirasiItem));
        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        if (mounted) {
          setAspirasiList(rows);
          try {
            localStorage.setItem(ASPIRASI_KEY, JSON.stringify(rows));
            sessionStorage.setItem('pgri_aspirasi_last_scope', scopeKey);
            sessionStorage.setItem(tsKey, String(Date.now()));
          } catch {}
          markLocalVersionSynced('aspirasi_items', cloudVersions);
        }
      } catch (e) {
        console.info('Memuat aspirasi dari penyimpanan lokal.');
      }
    };
    loadAspirasi();
    return () => {
      mounted = false;
    };
  }, [canReadAllAspirasi, activeSubTab]);

  const danaStats = useMemo(() => {
    const masuk = danaList
      .filter((d) => d.type === 'Penggalangan')
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const keluar = danaList
      .filter((d) => d.type === 'Penyaluran')
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);
    return { masuk, keluar, saldo: masuk - keluar };
  }, [danaList]);

  const handleSaveDana = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!danaForm.recipientName.trim()) return;
    const item: DanaSosialItem = {
      id: `ds-${Date.now()}`,
      ...danaForm,
      recipientName: danaForm.recipientName.trim().slice(0, 160),
      recipientSchool: danaForm.recipientSchool.trim().slice(0, 160),
      amount: Math.max(0, Number(danaForm.amount) || 0),
      notes: danaForm.notes.trim().slice(0, 600)
    };
    const next = [item, ...danaList];
    setDanaList(next);
    try {
      localStorage.setItem(DANA_SOSIAL_KEY, JSON.stringify(next));
    } catch {}
    setShowDanaModal(false);

    await savePerDocItem('dana_sosial', item.id, item, 'Dana Sosial');
    try {
      sessionStorage.setItem('pgri_dana_sosial_sync_ts', String(Date.now()));
    } catch {}
    mutateCloudCollection<DanaSosialItem>(
      'danaSosial',
      [DANA_SOSIAL_KEY],
      (latest) => [item, ...latest.filter((d) => d.id !== item.id)],
      next,
      'Dana Sosial & Tali Asih'
    );
    logAuditEvent(
      'Dana Sosial',
      `Catat ${item.type}`,
      `${item.type} ${item.category} a.n. ${item.recipientName} sebesar Rp ${item.amount.toLocaleString('id-ID')}.`
    );
  };

  const handleDeleteDana = async (item: DanaSosialItem) => {
    const prevList = [...danaList];
    const next = danaList.filter((d) => d.id !== item.id);
    setDanaList(next);
    try {
      localStorage.setItem(DANA_SOSIAL_KEY, JSON.stringify(next));
    } catch {}
    removeFromOfflineQueue('dana_sosial', item.id);
    const perDocRes = await deletePerDocItem('dana_sosial', item.id, 'Dana Sosial');
    if (perDocRes.success) {
      try {
        sessionStorage.setItem('pgri_dana_sosial_sync_ts', String(Date.now()));
      } catch {}
    } else if (perDocRes.error?.toLowerCase().includes('permission')) {
      setDanaList(prevList);
      try {
        localStorage.setItem(DANA_SOSIAL_KEY, JSON.stringify(prevList));
      } catch {}
      return;
    }
    await mutateCloudCollection<DanaSosialItem>(
      'danaSosial',
      [DANA_SOSIAL_KEY],
      (latest) => latest.filter((d) => d.id !== item.id),
      next,
      'Dana Sosial & Tali Asih'
    );
  };

  const handleSubmitAspirasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aspForm.subject.trim() || !aspForm.message.trim()) return;

    let user = auth.currentUser;
    if (!user) {
      try {
        const res = await signInPengurusWithGoogle();
        user = res.user;
      } catch {
        setAspNotice('Silakan masuk dengan akun Google terlebih dahulu agar aspirasi tersimpan secara rahasia.');
        return;
      }
    }

    const record: AspirasiItem = {
      id: `asp-${Date.now()}`,
      authorUid: user.uid,
      senderName: aspForm.isAnonymous
        ? 'Anggota Anonim'
        : (aspForm.senderName.trim() || user.displayName || 'Anggota PGRI').slice(0, 140),
      senderSchool: aspForm.senderSchool.trim().slice(0, 140),
      senderPhone: aspForm.senderPhone.trim().slice(0, 40),
      isAnonymous: aspForm.isAnonymous,
      category: aspForm.category,
      subject: aspForm.subject.trim().slice(0, 200),
      message: aspForm.message.trim().slice(0, 2000),
      status: 'Diterima',
      response: '',
      createdAt: new Date().toISOString()
    };

    const next = [record, ...aspirasiList];
    setAspirasiList(next);
    try {
      localStorage.setItem(ASPIRASI_KEY, JSON.stringify(next));
    } catch {}

    await savePerDocItem('aspirasi_items', record.id, record, 'Aspirasi Anggota');
    setAspForm({
      ...aspForm,
      subject: '',
      message: ''
    });
    setAspNotice('Aspirasi/laporan Anda berhasil dikirim secara rahasia kepada Ketua & Sekretaris PGRI Ranting Gelang.');
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget) return;
    const updated: AspirasiItem = {
      ...replyTarget,
      status: replyStatus,
      response: replyText.trim().slice(0, 1500)
    };
    const next = aspirasiList.map((a) => (a.id === updated.id ? updated : a));
    setAspirasiList(next);
    try {
      localStorage.setItem(ASPIRASI_KEY, JSON.stringify(next));
    } catch {}
    await savePerDocItem('aspirasi_items', updated.id, {
      status: updated.status,
      response: updated.response
    }, 'Tindak Lanjut Aspirasi');
    logAuditEvent(
      'Aspirasi & Advokasi',
      'Tindak Lanjut',
      `Memperbarui status aspirasi "${updated.subject}" menjadi ${updated.status}.`
    );
    setReplyTarget(null);
  };

  const cardClass = isDark
    ? 'bg-stone-900 border-stone-800 text-stone-100'
    : 'bg-white border-stone-200/90 text-stone-800';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner — Wibawa Kusuma Bangsa */}
      <div
        className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isDark
            ? 'bg-gradient-to-br from-[#231214] via-stone-900 to-[#1a1112] border-red-900/40 text-stone-100 pgri-batik-pattern-dark'
            : 'bg-gradient-to-br from-[#fdfbf7] via-white to-red-50/50 border-stone-200/90 text-stone-900 pgri-batik-pattern'
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent pointer-events-none" />
        <div className="relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-red-800 dark:text-amber-400 mb-1.5">
            <HeartHandshake className="w-3.5 h-3.5" />
            Solidaritas &amp; Perlindungan Profesi
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dana Sosial &amp; Kanal Aspirasi
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            Transparansi Tali Asih anggota dan layanan pengaduan/advokasi (LKBH) PGRI Ranting Gelang.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div
          className={`relative z-10 flex p-1 rounded-xl border ${
            isDark ? 'bg-stone-950/80 border-stone-800' : 'bg-white/90 border-stone-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('dana')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === 'dana'
                ? 'bg-red-800 text-white shadow-sm'
                : isDark
                ? 'text-stone-400 hover:text-stone-100'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            Dana Sosial &amp; Tali Asih
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('aspirasi')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === 'aspirasi'
                ? 'bg-amber-700 text-white shadow-sm'
                : isDark
                ? 'text-stone-400 hover:text-stone-100'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Aspirasi &amp; Advokasi (LKBH)
          </button>
        </div>
      </div>

      {/* TAB 1: DANA SOSIAL & TALI ASIH */}
      {activeSubTab === 'dana' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold text-stone-400">Total Penggalangan</span>
              <p className="text-xl font-black font-display text-emerald-500 mt-1">
                Rp {danaStats.masuk.toLocaleString('id-ID')}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold text-stone-400">Total Santunan Tersalurkan</span>
              <p className="text-xl font-black font-display text-red-600 dark:text-red-400 mt-1">
                Rp {danaStats.keluar.toLocaleString('id-ID')}
              </p>
            </div>
            <div className={`p-4 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold text-stone-400">Saldo Dana Sosial</span>
              <p className="text-xl font-black font-display text-amber-600 dark:text-amber-400 mt-1">
                Rp {danaStats.saldo.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-base">Riwayat Dana Sosial & Tali Asih</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = `*LAPORAN DANA SOSIAL & TALI ASIH PGRI RANTING GELANG*\n\nTotal Penggalangan: Rp ${danaStats.masuk.toLocaleString('id-ID')}\nTotal Tersalurkan: Rp ${danaStats.keluar.toLocaleString('id-ID')}\nSaldo Dana Sosial: Rp ${danaStats.saldo.toLocaleString('id-ID')}\n\nTerima kasih atas solidaritas seluruh anggota PGRI Ranting Gelang.`;
                  openWhatsAppShare(text);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Bagikan WA
              </button>
              {canManageDana && (
                <button
                  type="button"
                  onClick={() => setShowDanaModal(true)}
                  className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Catat Santunan / Penggalangan
                </button>
              )}
            </div>
          </div>

          {danaList.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${cardClass}`}>
              <HeartHandshake className="w-10 h-10 text-red-700 dark:text-amber-400 mx-auto mb-2 opacity-75" />
              <p className="text-sm font-semibold">Belum ada catatan dana sosial / tali asih.</p>
              <p className="text-xs text-stone-400 mt-1">
                Pengurus dapat mencatat penggalangan dan penyaluran santunan anggota sakit, duka cita, maupun purna tugas di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {danaList.map((item) => (
                <div key={item.id} className={`p-4 rounded-2xl border space-y-2 ${cardClass}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          item.type === 'Penggalangan'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/15 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {item.type}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        {item.category}
                      </span>
                    </div>
                    {canDeleteDana && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDana(item)}
                        className="p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-bold text-sm">
                    {item.recipientName}{' '}
                    {item.recipientSchool && (
                      <span className="text-xs font-normal text-stone-400">({item.recipientSchool})</span>
                    )}
                  </h3>
                  <p className="text-lg font-black font-display text-amber-500">
                    Rp {(item.amount || 0).toLocaleString('id-ID')}
                  </p>
                  {item.notes && <p className="text-xs text-stone-400">{item.notes}</p>}
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-500/15">
                    <span>Tanggal: {item.date}</span>
                    <span className="font-bold text-emerald-500">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KOTAK ASPIRASI & ADVOKASI LKBH */}
      {activeSubTab === 'aspirasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Kirim Aspirasi */}
          <div className={`lg:col-span-5 p-6 rounded-2xl border space-y-4 ${cardClass}`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-red-800/15 text-red-800 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base">Kirim Aspirasi / Advokasi</h2>
                <p className="text-[11px] text-stone-400">
                  Bersifat rahasia — hanya dapat dibaca oleh Ketua & Sekretaris PGRI Ranting.
                </p>
              </div>
            </div>

            {aspNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{aspNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAspirasi} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Kategori</label>
                <select
                  value={aspForm.category}
                  onChange={(e) => setAspForm({ ...aspForm, category: e.target.value as AspirasiItem['category'] })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                >
                  <option value="Aspirasi Organisasi">Aspirasi Organisasi</option>
                  <option value="Advokasi / LKBH">Advokasi / Perlindungan Hukum (LKBH)</option>
                  <option value="Administrasi PPPK/PNS">Administrasi PPPK / PNS / GTK</option>
                  <option value="Kesejahteraan & Tunjangan">Kesejahteraan & Tunjangan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Nama Pengirim</label>
                  <input
                    type="text"
                    disabled={aspForm.isAnonymous}
                    placeholder="Nama lengkap"
                    value={aspForm.isAnonymous ? 'Anonim (Dirahasiakan)' : aspForm.senderName}
                    onChange={(e) => setAspForm({ ...aspForm, senderName: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Unit Kerja / Sekolah</label>
                  <input
                    type="text"
                    placeholder="SDN Gelang ..."
                    value={aspForm.senderSchool}
                    onChange={(e) => setAspForm({ ...aspForm, senderSchool: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={aspForm.isAnonymous}
                  onChange={(e) => setAspForm({ ...aspForm, isAnonymous: e.target.checked })}
                  className="rounded accent-red-800 dark:accent-amber-500"
                />
                <span>Sembunyikan nama saya (Kirim sebagai Anonim)</span>
              </label>

              <div>
                <label className="block text-xs font-bold mb-1">Perihal / Judul *</label>
                <input
                  type="text"
                  required
                  placeholder="Ringkasan aspirasi atau kendala..."
                  value={aspForm.subject}
                  onChange={(e) => setAspForm({ ...aspForm, subject: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Isi Aspirasi / Laporan *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan aspirasi, saran, atau permohonan pendampingan organisasi secara jelas..."
                  value={aspForm.message}
                  onChange={(e) => setAspForm({ ...aspForm, message: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Kirim Secara Rahasia
              </button>
            </form>
          </div>

          {/* Daftar Aspirasi (Ketua/Sekretaris: Semua, Anggota: Miliknya Sendiri) */}
          <div className={`lg:col-span-7 p-6 rounded-2xl border space-y-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-base">
                  {canReadAllAspirasi ? 'Kotak Masuk Aspirasi (Ketua & Sekretaris)' : 'Riwayat Aspirasi Saya'}
                </h2>
                <p className="text-xs text-stone-400">
                  {canReadAllAspirasi
                    ? 'Seluruh aspirasi anggota terproteksi dan hanya terlihat oleh Ketua & Sekretaris.'
                    : 'Hanya menampilkan aspirasi yang Anda kirim menggunakan akun Google Anda.'}
                </p>
              </div>
              {!auth.currentUser && (
                <button
                  type="button"
                  onClick={() => signInPengurusWithGoogle()}
                  className="px-3 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Masuk Google
                </button>
              )}
            </div>

            {aspirasiList.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs">
                Belum ada aspirasi yang tercatat untuk akun ini.
              </div>
            ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {aspirasiList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-stone-800/50 border-stone-700/70' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-800/15 text-red-800 dark:text-amber-400">
                        {item.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          item.status === 'Selesai'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'Ditindaklanjuti'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-stone-500/20 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm">{item.subject}</h4>
                    <p className="text-xs leading-relaxed opacity-85">{item.message}</p>
                    <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1">
                      <span>
                        Pengirim: <strong>{item.senderName}</strong> {item.senderSchool ? `(${item.senderSchool})` : ''}
                      </span>
                      <span>{new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>

                    {item.response && (
                      <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Tanggapan Pengurus:</span>
                        <span>{item.response}</span>
                      </div>
                    )}

                    {canReadAllAspirasi && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTarget(item);
                            setReplyStatus(item.status);
                            setReplyText(item.response || '');
                          }}
                          className="text-xs font-bold text-red-800 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          Tindak Lanjuti / Beri Tanggapan
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Catat Dana Sosial */}
      {showDanaModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm"
          onClick={() => setShowDanaModal(false)}
        >
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${cardClass}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-500/20">
              <h3 className="font-display font-bold text-base">Catat Dana Sosial / Tali Asih</h3>
              <button type="button" onClick={() => setShowDanaModal(false)} className="p-1 text-stone-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDana} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Jenis</label>
                  <select
                    value={danaForm.type}
                    onChange={(e) =>
                      setDanaForm({ ...danaForm, type: e.target.value as DanaSosialItem['type'] })
                    }
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  >
                    <option value="Penggalangan">Penggalangan</option>
                    <option value="Penyaluran">Penyaluran</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Kategori</label>
                  <select
                    value={danaForm.category}
                    onChange={(e) =>
                      setDanaForm({ ...danaForm, category: e.target.value as DanaSosialItem['category'] })
                    }
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  >
                    <option value="Sakit / Rawat Inap">Sakit / Rawat Inap</option>
                    <option value="Duka Cita">Duka Cita</option>
                    <option value="Purna Tugas / Pensiun">Purna Tugas / Pensiun</option>
                    <option value="Pernikahan / Kelahiran">Pernikahan / Kelahiran</option>
                    <option value="Bencana / Lainnya">Bencana / Lainnya</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Nama Penerima / Kegiatan *</label>
                <input
                  type="text"
                  required
                  value={danaForm.recipientName}
                  onChange={(e) => setDanaForm({ ...danaForm, recipientName: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Sekolah / Unit Kerja</label>
                  <input
                    type="text"
                    value={danaForm.recipientSchool}
                    onChange={(e) => setDanaForm({ ...danaForm, recipientSchool: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={danaForm.amount}
                    onChange={(e) => setDanaForm({ ...danaForm, amount: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={danaForm.date}
                    onChange={(e) => setDanaForm({ ...danaForm, date: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Status</label>
                  <select
                    value={danaForm.status}
                    onChange={(e) =>
                      setDanaForm({ ...danaForm, status: e.target.value as DanaSosialItem['status'] })
                    }
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  >
                    <option value="Terkumpul">Terkumpul</option>
                    <option value="Proses">Proses</option>
                    <option value="Tersalurkan">Tersalurkan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Keterangan</label>
                <textarea
                  rows={2}
                  value={danaForm.notes}
                  onChange={(e) => setDanaForm({ ...danaForm, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDanaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-500/15 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-800 hover:bg-red-700 text-white cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tanggapi Aspirasi */}
      {replyTarget && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm"
          onClick={() => setReplyTarget(null)}
        >
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${cardClass}`} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-base mb-1">Tindak Lanjut Aspirasi</h3>
            <p className="text-xs text-stone-400 mb-4">{replyTarget.subject}</p>
            <form onSubmit={handleSaveReply} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Status Penanganan</label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as AspirasiItem['status'])}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                >
                  <option value="Diterima">Diterima</option>
                  <option value="Ditindaklanjuti">Ditindaklanjuti</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Tanggapan Resmi Pengurus</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-500/15 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-800 hover:bg-red-700 text-white cursor-pointer"
                >
                  Simpan Tanggapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
