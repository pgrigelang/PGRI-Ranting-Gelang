import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Target,
  Printer,
  Share2,
  X,
  ExternalLink,
  Search,
  Layers,
  Wallet
} from 'lucide-react';
import { ProkerItem, PengurusRole } from '../../types';
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
import { logAuditEvent } from '../../lib/auth';
import { openWhatsAppShare } from '../../lib/orgConfig';

interface ProkerViewProps {
  activeRole: 'guru' | 'admin';
  pengurusRole?: PengurusRole;
  theme?: 'light' | 'dark';
}

const PROKER_STORAGE_KEY = 'pgri-proker-items';

const SEKSI_OPTIONS = [
  'Pengurus Harian (Ketua/Sekretaris/Bendahara)',
  'Seksi Pembinaan Olahraga & Seni',
  'Seksi Pemberdayaan Perempuan',
  'Seksi Pengembangan Profesi & Kurikulum',
  'Seksi Advokasi, LKBH & Kesejahteraan',
  'Seksi Kerohanian & Sosial Kemasyarakatan',
  'Seksi Komunikasi & Informasi'
];

const INITIAL_PROKER: ProkerItem[] = [
  {
    id: 'pk-1',
    title: 'Peringatan Hari Guru Nasional (HGN) & HUT PGRI 2026',
    seksi: 'Seksi Pembinaan Olahraga & Seni',
    penanggungJawab: 'Saiful Arif, S.Pd',
    periode: '2026',
    targetDate: 'November 2026',
    budget: 3500000,
    status: 'Berjalan',
    progress: 65,
    description: 'Penyelenggaraan lomba bola voli antar ranting, upacara HGN, dan tasyakuran guru se-Ranting Gelang.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pk-2',
    title: 'Pendataan & Pemutakhiran NPA / E-KTA Anggota PGRI Ranting Gelang',
    seksi: 'Pengurus Harian (Ketua/Sekretaris/Bendahara)',
    penanggungJawab: 'Adi Saiful Rizal, S.Pd',
    periode: '2026',
    targetDate: 'Desember 2026',
    budget: 250000,
    status: 'Berjalan',
    progress: 80,
    description: 'Digitalisasi database anggota, verifikasi status PNS/PPPK/GTY/GTT, serta penerbitan QR Code & E-KTA Ranting.',
    updatedAt: new Date().toISOString()
  }
];

export const ProkerView: React.FC<ProkerViewProps> = ({
  activeRole,
  pengurusRole = 'guru',
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const canEdit = activeRole === 'admin' || ['ketua', 'sekretaris', 'seksi'].includes(pengurusRole);
  const canDelete = activeRole === 'admin' && (pengurusRole === 'ketua' || pengurusRole === 'sekretaris');

  const [items, setItems] = useState<ProkerItem[]>(() => {
    try {
      const saved = localStorage.getItem(PROKER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_PROKER;
  });

  const [search, setSearch] = useState('');
  const [filterSeksi, setFilterSeksi] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const [penanggungJawabOptions, setPenanggungJawabOptions] = useState<{ name: string; role: string }[]>([]);

  useEffect(() => {
    const loadPenanggungJawabFromProfile = () => {
      const defaultPembina = {
        role: 'Pengawas Bina',
        name: 'Hanifatul Susmiyah, S.Pd'
      };

      const defaultPenanggungJawab = [
        { role: 'Ketua K3S', name: 'Ghufron Atok Urrohman, S.Pd' },
        { role: 'Ketua PGRI Cabang', name: 'Christian Dri Firman Widodo, S.Pd' }
      ];

      const defaultPengurus = [
        { role: 'Penasehat', name: 'Semua Kepala Sekolah' },
        { role: 'Ketua PGRI Ranting Gelang', name: 'Umar Ali Kusuma' },
        { role: 'Wakil Ketua', name: 'Hartatik, S.Pd' },
        { role: 'Sekretaris', name: 'Adi Saiful Rizal, S.Pd' },
        { role: 'Bendahara', name: 'Atik Andriyati, S.Pd' },
        { role: 'Seksi Pembinaan Olahraga', name: 'Saiful Arif, S.Pd' },
        { role: 'Seksi Pemberdayaan Perempuan', name: 'Siti Oktavia, S.Pd' },
        { role: 'Seksi Pengembangan Profesi & Karir', name: 'Rohman, S.Pd' },
        { role: 'Seksi Humas', name: 'Jasuri Budianto, S.Pd' },
        { role: 'Seksi Keagamaan', name: 'Muhammad Jupri, S.Pd.I' }
      ];

      let pembinaData = defaultPembina;
      let pjData = defaultPenanggungJawab;
      let pengurusData = defaultPengurus;

      try {
        const sPembina = localStorage.getItem('kombel-pembina');
        if (sPembina) {
          const parsed = JSON.parse(sPembina);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            pembinaData = parsed;
          }
        }

        const sPj = localStorage.getItem('kombel-penanggungjawab');
        if (sPj) {
          const parsed = JSON.parse(sPj);
          if (Array.isArray(parsed) && parsed.length > 0) {
            pjData = parsed;
          }
        }

        const sPengurus = localStorage.getItem('kombel-pengurus');
        if (sPengurus) {
          const parsed = JSON.parse(sPengurus);
          if (Array.isArray(parsed) && parsed.length > 0) {
            pengurusData = parsed;
          }
        }
      } catch {}

      const combined = [pembinaData, ...pjData, ...pengurusData]
        .filter((item) => item && item.name && item.name.trim() !== '' && item.name !== '-')
        .map((item) => ({ name: item.name, role: item.role || '' }));

      setPenanggungJawabOptions(combined);
    };

    loadPenanggungJawabFromProfile();
    window.addEventListener('storage', loadPenanggungJawabFromProfile);
    window.addEventListener('kombel-settings-updated', loadPenanggungJawabFromProfile);
    return () => {
      window.removeEventListener('storage', loadPenanggungJawabFromProfile);
      window.removeEventListener('kombel-settings-updated', loadPenanggungJawabFromProfile);
    };
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProkerItem | null>(null);
  const [form, setForm] = useState<Omit<ProkerItem, 'id' | 'updatedAt'>>({
    title: '',
    seksi: SEKSI_OPTIONS[0],
    penanggungJawab: '',
    periode: String(new Date().getFullYear()),
    targetDate: '',
    budget: 0,
    status: 'Direncanakan',
    progress: 0,
    description: '',
    documentationUrl: ''
  });

  useEffect(() => {
    let mounted = true;
    const loadProker = async () => {
      try {
        const lastSync = sessionStorage.getItem('pgri_proker_sync_ts');
        if (lastSync && Date.now() - Number(lastSync) < 120000) {
          return;
        }
      } catch {}

      try {
        const cloudVersions = await fetchCloudVersions(45000);
        if (!mounted) return;
        if (!shouldFetchByVersion('proker_items', cloudVersions)) {
          try {
            sessionStorage.setItem('pgri_proker_sync_ts', String(Date.now()));
          } catch {}
          return;
        }

        const cloudItems = await fetchPerDocCollection<ProkerItem>('proker_items');
        if (!mounted) return;
        if (Array.isArray(cloudItems)) {
          const hasCloudVersion = Boolean(cloudVersions && Number(cloudVersions.proker_items || 0) > 0);
          if (cloudItems.length > 0 || hasCloudVersion) {
            setItems(cloudItems);
            try {
              localStorage.setItem(PROKER_STORAGE_KEY, JSON.stringify(cloudItems));
            } catch {}
          }
          markLocalVersionSynced('proker_items', cloudVersions);
          try {
            sessionStorage.setItem('pgri_proker_sync_ts', String(Date.now()));
          } catch {}
        }
      } catch {}
    };
    loadProker();
    const handleExternalSync = () => {
      try {
        const saved = localStorage.getItem(PROKER_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch {}
    };
    window.addEventListener('pgri-proker-synced', handleExternalSync);
    return () => {
      mounted = false;
      window.removeEventListener('pgri-proker-synced', handleExternalSync);
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSeksi = filterSeksi === 'Semua' || item.seksi === filterSeksi;
      const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.penanggungJawab.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchSeksi && matchStatus && matchSearch;
    });
  }, [items, filterSeksi, filterStatus, search]);

  const stats = useMemo(() => {
    const total = items.length;
    const terlaksana = items.filter((i) => i.status === 'Terlaksana').length;
    const berjalan = items.filter((i) => i.status === 'Berjalan').length;
    const totalBudget = items.reduce((sum, i) => sum + (Number(i.budget) || 0), 0);
    const avgProgress = total > 0 ? Math.round(items.reduce((s, i) => s + (Number(i.progress) || 0), 0) / total) : 0;
    return { total, terlaksana, berjalan, totalBudget, avgProgress };
  }, [items]);

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      title: '',
      seksi: SEKSI_OPTIONS[0],
      penanggungJawab: '',
      periode: String(new Date().getFullYear()),
      targetDate: '',
      budget: 0,
      status: 'Direncanakan',
      progress: 0,
      description: '',
      documentationUrl: ''
    });
    setShowModal(true);
  };

  const openEdit = (item: ProkerItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      seksi: item.seksi,
      penanggungJawab: item.penanggungJawab,
      periode: item.periode,
      targetDate: item.targetDate,
      budget: item.budget || 0,
      status: item.status,
      progress: item.progress || 0,
      description: item.description || '',
      documentationUrl: item.documentationUrl || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const record: ProkerItem = {
      id: editingItem ? editingItem.id : `pk-${Date.now()}`,
      title: form.title.trim().slice(0, 200),
      seksi: form.seksi.trim().slice(0, 120),
      penanggungJawab: form.penanggungJawab.trim().slice(0, 120),
      periode: form.periode.trim().slice(0, 64),
      targetDate: form.targetDate.trim().slice(0, 64),
      budget: Math.max(0, Number(form.budget) || 0),
      status: form.status,
      progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
      description: form.description.trim().slice(0, 1000),
      documentationUrl: form.documentationUrl?.trim().slice(0, 500) || '',
      updatedAt: new Date().toISOString()
    };

    const next = editingItem
      ? items.map((i) => (i.id === record.id ? record : i))
      : [record, ...items];

    setItems(next);
    try {
      localStorage.setItem(PROKER_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setShowModal(false);

    await savePerDocItem('proker_items', record.id, record, 'Program Kerja');
    try {
      sessionStorage.setItem('pgri_proker_sync_ts', String(Date.now()));
    } catch {}
    mutateCloudCollection<ProkerItem>(
      'proker',
      [PROKER_STORAGE_KEY],
      (latest) => [record, ...latest.filter((i) => i.id !== record.id)],
      next,
      'Program Kerja'
    );
    logAuditEvent(
      'Program Kerja',
      editingItem ? 'Edit Proker' : 'Tambah Proker',
      `${editingItem ? 'Memperbarui' : 'Menambahkan'} program kerja "${record.title}" (${record.status} - ${record.progress}%).`
    );
  };

  const handleDelete = async (item: ProkerItem) => {
    const prevItems = [...items];
    const next = items.filter((i) => i.id !== item.id);
    setItems(next);
    try {
      localStorage.setItem(PROKER_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    removeFromOfflineQueue('proker_items', item.id);
    const perDocRes = await deletePerDocItem('proker_items', item.id, 'Program Kerja');
    if (perDocRes.success) {
      try {
        sessionStorage.setItem('pgri_proker_sync_ts', String(Date.now()));
      } catch {}
    } else if (perDocRes.error?.toLowerCase().includes('permission')) {
      setItems(prevItems);
      try {
        localStorage.setItem(PROKER_STORAGE_KEY, JSON.stringify(prevItems));
      } catch {}
      return;
    }
    const listRes = await mutateCloudCollection<ProkerItem>(
      'proker',
      [PROKER_STORAGE_KEY],
      (latest) => latest.filter((i) => i.id !== item.id),
      next,
      'Program Kerja'
    );
    if (perDocRes.success && listRes.success) {
      logAuditEvent('Program Kerja', 'Hapus Proker', `Menghapus program kerja "${item.title}".`);
    }
  };

  const handleShareProkerWA = () => {
    const lines = [
      '*REKAP PROGRAM KERJA PGRI RANTING GELANG*',
      `Total Program: ${stats.total} | Terlaksana: ${stats.terlaksana} | Berjalan: ${stats.berjalan}`,
      `Rata-rata Capaian: ${stats.avgProgress}%`,
      '',
      ...filteredItems.map(
        (p, idx) =>
          `${idx + 1}. *${p.title}*\n   Seksi: ${p.seksi}\n   Status: ${p.status} (${p.progress}%) | Target: ${p.targetDate || '-'}`
      )
    ];
    openWhatsAppShare(lines.join('\n'));
  };

  const handlePrintProker = () => {
    const printWin = window.open('', '_blank', 'width=960,height=720');
    if (!printWin) return;
    const rows = filteredItems
      .map(
        (p, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${p.title}</strong><br/><span style="font-size:11px;color:#475569;">${p.description || ''}</span></td>
        <td>${p.seksi}</td>
        <td>${p.penanggungJawab || '-'}</td>
        <td style="text-align:center;">${p.targetDate || '-'}</td>
        <td style="text-align:right;">Rp ${(p.budget || 0).toLocaleString('id-ID')}</td>
        <td style="text-align:center;">${p.status} (${p.progress}%)</td>
      </tr>`
      )
      .join('');

    printWin.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Rekap Program Kerja PGRI Ranting Gelang</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
            h2, h3 { margin: 0; text-align: center; }
            .sub { text-align: center; font-size: 12px; color: #475569; margin: 4px 0 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>MATRIKS PROGRAM KERJA & REALISASI</h2>
          <h3>PGRI RANTING GELANG — KECAMATAN SUMBERBARU</h3>
          <p class="sub">Dicetak pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | Total Anggaran Rencana: Rp ${stats.totalBudget.toLocaleString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Program Kerja</th>
                <th>Seksi</th>
                <th>Penanggung Jawab</th>
                <th>Target</th>
                <th>Anggaran</th>
                <th>Realisasi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
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
            <ClipboardList className="w-3.5 h-3.5" />
            Monitoring Kinerja Organisasi
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Program Kerja PGRI Ranting
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            Perencanaan, progres realisasi per seksi, dan bahan LPJ Rapat Kerja Ranting Gelang.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleShareProkerWA}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            Bagikan WA
          </button>
          <button
            type="button"
            onClick={handlePrintProker}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
              isDark
                ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
                : 'bg-white border-stone-300 text-stone-800 hover:bg-stone-50'
            }`}
          >
            <Printer className="w-4 h-4" />
            Cetak Matriks LPJ
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={openAdd}
              className="px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Program
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
            <span>Total Program</span>
            <Layers className="w-4 h-4 text-red-800 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold font-display font-mono">{stats.total}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
            <span>Terlaksana</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold font-display font-mono text-emerald-600 dark:text-emerald-400">{stats.terlaksana}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
            <span>Rata-Rata Capaian</span>
            <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold font-display font-mono text-amber-700 dark:text-amber-400">{stats.avgProgress}%</p>
        </div>
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">
            <span>Estimasi Anggaran</span>
            <Wallet className="w-4 h-4 text-red-700 dark:text-red-400" />
          </div>
          <p className="text-lg sm:text-xl font-black font-display text-amber-500 truncate">
            Rp {stats.totalBudget.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 ${cardClass}`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari program kerja atau penanggung jawab..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border outline-none ${
              isDark
                ? 'bg-stone-800 border-stone-700 text-stone-100 focus:border-amber-500'
                : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
            }`}
          />
        </div>
        <select
          value={filterSeksi}
          onChange={(e) => setFilterSeksi(e.target.value)}
          className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none ${
            isDark
              ? 'bg-stone-800 border-stone-700 text-stone-100'
              : 'bg-[#faf8f5] border-stone-200 text-stone-800'
          }`}
        >
          <option value="Semua">Semua Seksi</option>
          {SEKSI_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none ${
            isDark
              ? 'bg-stone-800 border-stone-700 text-stone-100'
              : 'bg-[#faf8f5] border-stone-200 text-stone-800'
          }`}
        >
          <option value="Semua">Semua Status</option>
          <option value="Direncanakan">Direncanakan</option>
          <option value="Berjalan">Berjalan</option>
          <option value="Terlaksana">Terlaksana</option>
        </select>
      </div>

      {/* Program List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${cardClass}`}>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    item.status === 'Terlaksana'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : item.status === 'Berjalan'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      : 'bg-stone-500/15 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {item.status}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                      title="Edit Program"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        title="Hapus Program"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <h3 className="font-display font-bold text-base leading-snug">{item.title}</h3>
              <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-red-800'} font-semibold`}>
                {item.seksi}
              </p>
              {item.description && (
                <p className={`text-xs leading-relaxed ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                  {item.description}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-stone-500/15">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-400 block">Penanggung Jawab</span>
                  <span className="font-semibold">{item.penanggungJawab || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Target & Anggaran</span>
                  <span className="font-semibold">
                    {item.targetDate || '-'} • Rp {(item.budget || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Progres Realisasi
                  </span>
                  <span>{item.progress}%</span>
                </div>
                <div className={`w-full h-2 rounded-lg overflow-hidden ${isDark ? 'bg-stone-800' : 'bg-stone-200'}`}>
                  <div
                    className={`h-full rounded-lg transition-all ${
                      item.progress >= 100
                        ? 'bg-emerald-600'
                        : item.progress >= 50
                        ? 'bg-red-700'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>

              {item.documentationUrl && /^https?:\/\//i.test(item.documentationUrl) && (
                <a
                  href={item.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 dark:text-amber-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Lihat Dokumentasi / Laporan
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl p-6 border shadow-2xl max-h-[90vh] overflow-y-auto ${cardClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-500/20">
              <h3 className="font-display font-bold text-base">
                {editingItem ? 'Edit Program Kerja' : 'Tambah Program Kerja Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Nama Program Kerja *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Seksi Pelaksana</label>
                  <select
                    value={form.seksi}
                    onChange={(e) => setForm({ ...form, seksi: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  >
                    {SEKSI_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Penanggung Jawab</label>
                  <select
                    value={form.penanggungJawab}
                    onChange={(e) => setForm({ ...form, penanggungJawab: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  >
                    <option value="">-- Pilih Penanggung Jawab --</option>
                    {form.penanggungJawab &&
                      !penanggungJawabOptions.some((opt) => opt.name === form.penanggungJawab) && (
                        <option value={form.penanggungJawab}>{form.penanggungJawab}</option>
                      )}
                    {penanggungJawabOptions.map((opt, idx) => (
                      <option key={idx} value={opt.name}>
                        {opt.role ? `${opt.name} (${opt.role})` : opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Target Waktu</label>
                  <input
                    type="text"
                    placeholder="Nov 2026"
                    value={form.targetDate}
                    onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Anggaran (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ProkerItem['status'] })}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                    }`}
                  >
                    <option value="Direncanakan">Direncanakan</option>
                    <option value="Berjalan">Berjalan</option>
                    <option value="Terlaksana">Terlaksana</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Progres Realisasi: {form.progress}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                  className="w-full accent-red-800 dark:accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Uraian Kegiatan</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Tautan Dokumentasi / Drive (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={form.documentationUrl}
                  onChange={(e) => setForm({ ...form, documentationUrl: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none ${
                    isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                    isDark ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
