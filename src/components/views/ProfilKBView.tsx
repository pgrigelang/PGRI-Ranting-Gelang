import React, { useState, useEffect, useRef } from 'react';
import { Info, Target, Award, CheckCircle2, MessageCircle, Building2, Contact2, Pencil, X, Check, Plus, Trash2 } from 'lucide-react';
import { syncSettingsToCloud } from '../../lib/sync';

// Subkomponen Kartu Interaktif dengan Efek Spotlight Mouse Berbasis CSS Variables
const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
}> = ({ children, className = '', isDark }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    divRef.current.style.setProperty('--mouse-x', `${x}px`);
    divRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Spotlight Hover Glow Layer */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${
            isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.09)'
          }, transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
};

export const ProfilKBView: React.FC<{ activeRole?: 'guru' | 'admin' }> = ({ activeRole }) => {
  // Mendeteksi status dark mode langsung dari tag <html>
  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  // Status Hak Akses Admin (Sinkronisasi dari props dan localStorage)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (activeRole) return activeRole === 'admin';
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeRole') === 'admin';
    }
    return false;
  });

  useEffect(() => {
    if (activeRole) {
      setIsAdmin(activeRole === 'admin');
    }
  }, [activeRole]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedRole = localStorage.getItem('activeRole');
      setIsAdmin(storedRole === 'admin');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('kombel-settings-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('kombel-settings-updated', handleStorageChange);
    };
  }, []);

  // State Animasi Pembuka Khusus Menu Kepengurusan
  const [entryPhase, setEntryPhase] = useState<'intro' | 'revealing' | 'done'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'done';
    }
    return 'intro';
  });

  useEffect(() => {
    if (entryPhase === 'done') return;
    const revealTimer = setTimeout(() => {
      setEntryPhase('revealing');
    }, 360);
    const doneTimer = setTimeout(() => {
      setEntryPhase('done');
    }, 820);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    // Memantau perubahan tema secara real-time saat tombol ditekan
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Helper untuk mengekstrak inisial nama tanpa gelar
  const getInitials = (name: string) => {
    const cleanName = (name || '')
      .replace(/\b(Hj?|Drs?|Dra|Prof)\.?\s+/gi, '')
      .replace(/(,?\s*(S\.Pd\.I|S\.Pd|M\.Pd|S\.Kom|M\.Si|S\.Ag|S\.E|M\.M|S\.Sos|S\.Si|S\.H|Dr|Dra|Drs)\.?)/gi, '')
      .trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Helper normalisasi nomor WhatsApp (mengembalikan string kosong jika tidak valid / '-')
  const normalizeWaNumber = (raw?: string): string => {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length < 8) return '';
    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
    if (digits.startsWith('8')) return `62${digits}`;
    return digits;
  };

  // Mode Gelap: bg-stone-900 | Mode Terang: bg-white
  const cardBg = isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90';
  const textPrimary = isDark ? 'text-stone-100' : 'text-stone-900';
  const textSecondary = isDark ? 'text-stone-400' : 'text-stone-600';
  const textMuted = isDark ? 'text-stone-500' : 'text-stone-400';

  const defaultVisi =
    'Terwujudnya PGRI Ranting Gelang sebagai organisasi profesi guru yang solid, profesional, sejahtera, bermartabat, dan terlindungi di Kecamatan Sumberbaru Kabupaten Jember.';

  const defaultMisi = [
    'Memperjuangkan peningkatan profesionalisme, kesejahteraan, serta perlindungan hukum dan profesi anggota PGRI Ranting Gelang.',
    'Memperkuat solidaritas, kekeluargaan, dan sinergi antar guru, kepala sekolah, serta tenaga kependidikan di wilayah Guslah Gelang.',
    'Menyelenggarakan tata kelola administrasi, keuangan, dan kegiatan organisasi yang transparan, akuntabel, dan berbasis digital.'
  ];

  const defaultPembina = {
    role: 'Pengawas Bina',
    name: 'Hanifatul Susmiyah, S.Pd',
    nip: '197306022002122005',
    instansi: 'Pengawas Bina Kecamatan Sumberbaru',
    wa: '6285859083645'
  };

  const defaultPenanggungJawab = [
    {
      role: 'Ketua K3S',
      name: 'Ghufron Atok Urrohman, S.Pd',
      nip: '197805192014121003',
      instansi: 'Ketua Kelompok Kerja Kepala Sekolah',
      wa: '6285859342500'
    },
    {
      role: 'Ketua PGRI Cabang',
      name: 'Christian Dri Firman Widodo, S.Pd',
      nip: '198012262014121002',
      instansi: 'Ketua PGRI Cabang Kecamatan Sumberbaru',
      wa: '6281217910263'
    }
  ];

  const getPengurusStyle = (idx: number) => {
    const styles = [
      {
        badgeColor: isDark ? 'bg-red-950/80 text-amber-300 border-red-800/60' : 'bg-red-50 text-red-800 border-red-200',
        avatarBg: isDark ? 'bg-red-950/90 text-amber-300 border-red-800/70' : 'bg-red-800 text-white border-red-900/20',
        borderAccent: 'border-l-red-800 dark:border-l-red-700'
      },
      {
        badgeColor: isDark ? 'bg-amber-950/70 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-800 border-amber-200',
        avatarBg: isDark ? 'bg-amber-950/80 text-amber-300 border-amber-800/70' : 'bg-amber-100 text-amber-900 border-amber-300',
        borderAccent: 'border-l-amber-600 dark:border-l-amber-500'
      },
      {
        badgeColor: isDark ? 'bg-stone-800 text-amber-300 border-stone-700' : 'bg-stone-100 text-stone-800 border-stone-300',
        avatarBg: isDark ? 'bg-stone-800 text-stone-200 border-stone-700' : 'bg-stone-200 text-stone-800 border-stone-300',
        borderAccent: 'border-l-stone-600 dark:border-l-stone-500'
      },
      {
        badgeColor: isDark ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
        avatarBg: isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        borderAccent: 'border-l-emerald-700 dark:border-l-emerald-500'
      },
      {
        badgeColor: isDark ? 'bg-orange-950/70 text-orange-300 border-orange-800/60' : 'bg-orange-50 text-orange-800 border-orange-200',
        avatarBg: isDark ? 'bg-orange-950/80 text-orange-300 border-orange-800/70' : 'bg-orange-100 text-orange-800 border-orange-200',
        borderAccent: 'border-l-orange-700 dark:border-l-orange-500'
      },
      {
        badgeColor: isDark ? 'bg-red-950/60 text-red-300 border-red-800/50' : 'bg-red-50 text-red-900 border-red-200',
        avatarBg: isDark ? 'bg-red-950/70 text-red-200 border-red-800/60' : 'bg-red-100 text-red-900 border-red-200',
        borderAccent: 'border-l-red-700 dark:border-l-red-600'
      },
      {
        badgeColor: isDark ? 'bg-teal-950/70 text-teal-300 border-teal-800/60' : 'bg-teal-50 text-teal-800 border-teal-200',
        avatarBg: isDark ? 'bg-teal-950/80 text-teal-300 border-teal-800/70' : 'bg-teal-100 text-teal-800 border-teal-200',
        borderAccent: 'border-l-teal-700 dark:border-l-teal-500'
      },
      {
        badgeColor: isDark ? 'bg-yellow-950/70 text-yellow-300 border-yellow-800/60' : 'bg-yellow-50 text-yellow-800 border-yellow-200',
        avatarBg: isDark ? 'bg-yellow-950/80 text-yellow-300 border-yellow-800/70' : 'bg-yellow-100 text-yellow-900 border-yellow-300',
        borderAccent: 'border-l-yellow-600 dark:border-l-yellow-500'
      }
    ];
    return styles[idx % styles.length];
  };

  const defaultPengurusBase = [
    {
      role: 'Penasehat',
      name: 'Semua Kepala Sekolah',
      nip: '-',
      instansi: '-',
      wa: '-'
    },
    {
      role: 'Ketua PGRI Ranting Gelang',
      name: 'Umar Ali Kusuma',
      nip: '198912092025211092',
      instansi: 'SDN GELANG 03',
      wa: '6288235537431'
    },
    {
      role: 'Wakil Ketua',
      name: 'Hartatik, S.Pd',
      nip: '198301072022212001',
      instansi: 'SDN KALIGLAGAH 02',
      wa: '6282245380232'
    },
    {
      role: 'Sekretaris',
      name: 'Adi Saiful Rizal, S.Pd',
      nip: '199401162025211089',
      instansi: 'SDN GELANG 03',
      wa: '6282292232649'
    },
    {
      role: 'Bendahara',
      name: 'Atik Andriyati, S.Pd',
      nip: '197701142014122002',
      instansi: 'SDN GELANG 06',
      wa: '6281515786365'
    },
    {
      role: 'Seksi Pembinaan Olahraga',
      name: 'Saiful Arif, S.Pd',
      nip: '198604122022211003',
      instansi: 'SDN GELANG 07',
      wa: '62881026888955'
    },
    {
      role: 'Seksi Pemberdayaan Perempuan',
      name: 'Siti Oktavia, S.Pd',
      nip: '197910072022212001',
      instansi: 'SDN GELANG 04',
      wa: '6285697890959'
    },
    {
      role: 'Seksi Pengembangan Profesi & Karir',
      name: 'Rohman, S.Pd',
      nip: '198904202022211002',
      instansi: 'SDN KALIGLAGAH 02',
      wa: '6282332910923'
    },
    {
      role: 'Seksi Humas',
      name: 'Jasuri Budianto, S.Pd',
      nip: '196918082022211001',
      instansi: 'SDN GELANG 01',
      wa: '6285314904015'
    },
    {
      role: 'Seksi Keagamaan',
      name: 'Muhammad Jupri, S.Pd.I',
      nip: '-',
      instansi: 'SD NU 21 MIFTAHUL ULUM',
      wa: '628817159553'
    }
  ];

  const attachPengurusStyles = (list: any[]) =>
    list.map((item, idx) => ({
      ...item,
      ...getPengurusStyle(idx)
    }));

  // Data State Visi & Misi
  const [visi, setVisi] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('kombel-visi');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed === 'string') return parsed;
        } catch {
          return saved;
        }
      }
    } catch (e) {}
    return defaultVisi;
  });

  const [misi, setMisi] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kombel-misi');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return defaultMisi;
  });

  // Data State Pembina dan Penanggung Jawab
  const [pembina, setPembina] = useState(() => {
    try {
      const saved = localStorage.getItem('kombel-pembina');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return defaultPembina;
  });

  const [penanggungJawab, setPenanggungJawab] = useState(() => {
    try {
      const saved = localStorage.getItem('kombel-penanggungjawab');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return defaultPenanggungJawab;
  });

  // Data State Struktur Kepengurusan
  const [pengurus, setPengurus] = useState(() => {
    try {
      const saved = localStorage.getItem('kombel-pengurus');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return attachPengurusStyles(parsed);
        }
      }
    } catch (e) {}
    return attachPengurusStyles(defaultPengurusBase);
  });

  const loadFromLocalStorage = () => {
    try {
      const sVisi = localStorage.getItem('kombel-visi');
      if (sVisi) {
        try {
          const p = JSON.parse(sVisi);
          if (typeof p === 'string') setVisi(p);
        } catch {
          setVisi(sVisi);
        }
      }
      const sMisi = localStorage.getItem('kombel-misi');
      if (sMisi) {
        const p = JSON.parse(sMisi);
        if (Array.isArray(p)) setMisi(p);
      }
      const sPembina = localStorage.getItem('kombel-pembina');
      if (sPembina) {
        const p = JSON.parse(sPembina);
        if (p && typeof p === 'object') setPembina(p);
      }
      const sPj = localStorage.getItem('kombel-penanggungjawab');
      if (sPj) {
        const p = JSON.parse(sPj);
        if (Array.isArray(p)) setPenanggungJawab(p);
      }
      const sPengurus = localStorage.getItem('kombel-pengurus');
      if (sPengurus) {
        const p = JSON.parse(sPengurus);
        if (Array.isArray(p)) {
          setPengurus(attachPengurusStyles(p));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadFromLocalStorage();

    const handleSettingsUpdate = () => loadFromLocalStorage();
    window.addEventListener('storage', handleSettingsUpdate);
    window.addEventListener('kombel-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('storage', handleSettingsUpdate);
      window.removeEventListener('kombel-settings-updated', handleSettingsUpdate);
    };
  }, [isDark]);

  // State Modal Edit Data Khusus Admin
  const [editingData, setEditingData] = useState<{
    type: 'pembina' | 'penanggungJawab' | 'pengurus' | 'visi' | 'misi';
    index?: number;
    role?: string;
    name?: string;
    nip?: string;
    instansi?: string;
    wa?: string;
    visiText?: string;
    misiList?: string[];
  } | null>(null);

  const handleOpenEdit = (type: 'pembina' | 'penanggungJawab' | 'pengurus', data: any, index?: number) => {
    if (!isAdmin) return;
    setEditingData({
      type,
      index,
      role: data.role,
      name: data.name,
      nip: data.nip,
      instansi: data.instansi,
      wa: data.wa
    });
  };

  const handleOpenEditVisi = () => {
    if (!isAdmin) return;
    setEditingData({
      type: 'visi',
      visiText: visi
    });
  };

  const handleOpenEditMisi = () => {
    if (!isAdmin) return;
    setEditingData({
      type: 'misi',
      misiList: [...misi]
    });
  };

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showSaveNotice = (type: 'success' | 'error', text: string) => {
    setSaveNotice({ type, text });
    window.setTimeout(() => {
      setSaveNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingData || isSavingEdit) return;

    setIsSavingEdit(true);
    let syncRes: { success: boolean; error?: string } = { success: true };

    try {
      if (editingData.type === 'visi' && typeof editingData.visiText === 'string') {
        const nextVisi = editingData.visiText.trim();
        setVisi(nextVisi);
        syncRes = await syncSettingsToCloud({ 'kombel-visi': JSON.stringify(nextVisi) }, 'Visi PGRI Ranting Gelang');
      } else if (editingData.type === 'misi' && editingData.misiList) {
        const nextMisi = editingData.misiList.map((item) => item.trim()).filter(Boolean);
        setMisi(nextMisi);
        syncRes = await syncSettingsToCloud({ 'kombel-misi': JSON.stringify(nextMisi) }, 'Misi PGRI Ranting Gelang');
      } else if (editingData.type === 'pembina') {
        const nextPembina = {
          ...pembina,
          role: (editingData.role ?? '').trim() || pembina.role,
          name: (editingData.name ?? '').trim() || pembina.name,
          nip: (editingData.nip ?? '').trim() || '-',
          instansi: (editingData.instansi ?? '').trim() || '-',
          wa: (editingData.wa ?? '').trim() || '-'
        };
        setPembina(nextPembina);
        syncRes = await syncSettingsToCloud({ 'kombel-pembina': JSON.stringify(nextPembina) }, 'Data Pembina');
      } else if (editingData.type === 'penanggungJawab' && typeof editingData.index === 'number') {
        const updated = [...penanggungJawab];
        updated[editingData.index!] = {
          ...updated[editingData.index!],
          role: (editingData.role ?? '').trim() || updated[editingData.index!].role,
          name: (editingData.name ?? '').trim() || updated[editingData.index!].name,
          nip: (editingData.nip ?? '').trim() || '-',
          instansi: (editingData.instansi ?? '').trim() || '-',
          wa: (editingData.wa ?? '').trim() || '-'
        };
        setPenanggungJawab(updated);
        syncRes = await syncSettingsToCloud({ 'kombel-penanggungjawab': JSON.stringify(updated) }, 'Data Penanggung Jawab');
      } else if (editingData.type === 'pengurus' && typeof editingData.index === 'number') {
        const updated = [...pengurus];
        updated[editingData.index!] = {
          ...updated[editingData.index!],
          role: (editingData.role ?? '').trim() || updated[editingData.index!].role,
          name: (editingData.name ?? '').trim() || updated[editingData.index!].name,
          nip: (editingData.nip ?? '').trim() || '-',
          instansi: (editingData.instansi ?? '').trim() || '-',
          wa: (editingData.wa ?? '').trim() || '-'
        };
        setPengurus(updated);
        const cleanPengurus = updated.map(({ role, name, nip, instansi, wa }) => ({ role, name, nip, instansi, wa }));
        syncRes = await syncSettingsToCloud({ 'kombel-pengurus': JSON.stringify(cleanPengurus) }, 'Struktur Kepengurusan');
      }

      setEditingData(null);
      if (syncRes.success) {
        showSaveNotice('success', 'Perubahan data kepengurusan berhasil disimpan dan disinkronkan ke Cloud.');
      } else {
        showSaveNotice('error', syncRes.error || 'Tersimpan lokal, namun gagal menyinkronkan ke Cloud.');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="relative font-sans space-y-6 transition-colors duration-500 ease-in-out">
      <style>{`
        @keyframes kepengurusanTopSweep {
          0% {
            transform: scaleX(0);
            opacity: 1;
          }
          70% {
            transform: scaleX(1);
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            opacity: 0;
          }
        }
        @keyframes kepengurusanCurtainIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes kepengurusanCurtainOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
          to {
            opacity: 0;
            transform: translateY(-14px) scale(0.96);
            filter: blur(4px);
          }
        }
        @keyframes kepengurusanWipeSweep {
          0% {
            transform: translateX(-100%);
            opacity: 0.7;
          }
          50% {
            opacity: 0.95;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        @keyframes kepengurusanSectionEnter {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.988);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .kepengurusan-top-sweep {
          transform-origin: left center;
          animation: kepengurusanTopSweep 0.78s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .kepengurusan-curtain-enter {
          animation: kepengurusanCurtainIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .kepengurusan-curtain-exit {
          animation: kepengurusanCurtainOut 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .kepengurusan-wipe-bar {
          animation: kepengurusanWipeSweep 0.52s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .kepengurusan-waiting .kepengurusan-stagger-1,
        .kepengurusan-waiting .kepengurusan-stagger-2,
        .kepengurusan-waiting .kepengurusan-stagger-3,
        .kepengurusan-waiting .kepengurusan-stagger-4 {
          opacity: 0;
          transform: translateY(14px) scale(0.988);
        }
        .kepengurusan-ready .kepengurusan-stagger-1 {
          animation: kepengurusanSectionEnter 0.42s cubic-bezier(0.16, 1, 0.3, 1) 0ms both;
        }
        .kepengurusan-ready .kepengurusan-stagger-2 {
          animation: kepengurusanSectionEnter 0.44s cubic-bezier(0.16, 1, 0.3, 1) 70ms both;
        }
        .kepengurusan-ready .kepengurusan-stagger-3 {
          animation: kepengurusanSectionEnter 0.44s cubic-bezier(0.16, 1, 0.3, 1) 140ms both;
        }
        .kepengurusan-ready .kepengurusan-stagger-4 {
          animation: kepengurusanSectionEnter 0.44s cubic-bezier(0.16, 1, 0.3, 1) 210ms both;
        }
        @media (prefers-reduced-motion: reduce) {
          .kepengurusan-top-sweep,
          .kepengurusan-curtain-enter,
          .kepengurusan-curtain-exit,
          .kepengurusan-wipe-bar,
          .kepengurusan-stagger-1,
          .kepengurusan-stagger-2,
          .kepengurusan-stagger-3,
          .kepengurusan-stagger-4 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className={`space-y-6 ${entryPhase === 'intro' ? 'kepengurusan-waiting' : 'kepengurusan-ready'}`}>

      {/* Header Banner — Wibawa Kusuma Bangsa */}
      <div className={`kepengurusan-stagger-1 relative overflow-hidden w-full min-h-[164px] rounded-2xl p-6 sm:p-8 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-colors duration-200 ${
        isDark
          ? 'bg-gradient-to-br from-[#231214] via-stone-900 to-[#1a1112] border-red-900/40 text-stone-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] pgri-batik-pattern-dark'
          : 'bg-gradient-to-br from-[#fdfbf7] via-white to-red-50/50 border-stone-200/90 text-stone-900 shadow-[0_6px_20px_rgba(127,29,29,0.06)] pgri-batik-pattern'
      }`}>
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent pointer-events-none" />

        {/* Banner Content */}
        <div className="relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-red-800 dark:text-amber-400 mb-1.5">
            <Info className="w-3.5 h-3.5" />
            Profil Organisasi
          </p>
          <h1 className={`font-display text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}>
            Daftar Kepengurusan
          </h1>
          <p className={`text-xs sm:text-sm font-medium mt-1 max-w-xl ${
            isDark ? 'text-stone-400' : 'text-stone-600'
          }`}>
            PGRI Ranting Gelang Sumberbaru
          </p>
        </div>
      </div>

      {saveNotice && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold border flex items-center justify-between gap-3 ${
            saveNotice.type === 'success'
              ? isDark
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : isDark
              ? 'bg-amber-950/60 border-amber-800 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span>{saveNotice.text}</span>
          <button
            type="button"
            onClick={() => setSaveNotice(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Vision & Mission */}
      <div className="kepengurusan-stagger-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kotak Visi */}
        <SpotlightCard isDark={isDark} className={`group relative ${cardBg} rounded-2xl p-6 border shadow-sm transition-all duration-200 hover:shadow-md`}>
          {/* Tombol Edit Visi (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenEditVisi}
              className="absolute top-5 right-5 p-2 rounded-lg bg-red-800/10 text-red-800 dark:text-amber-400 hover:bg-red-800 hover:text-white active:scale-95 transition-colors cursor-pointer z-10"
              title="Edit Visi (Admin)"
              aria-label="Edit Visi"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <Target className="w-6 h-6" />
          </div>
          <h3 className={`font-display font-extrabold text-lg ${textPrimary} mb-2`}>Visi PGRI Ranting Gelang</h3>
          <p className={`text-xs ${textSecondary} leading-relaxed font-medium`}>
            &ldquo;{visi}&rdquo;
          </p>
        </SpotlightCard>

        {/* Kotak Misi */}
        <SpotlightCard isDark={isDark} className={`group relative ${cardBg} rounded-2xl p-6 border shadow-sm transition-all duration-200 hover:shadow-md`}>
          {/* Tombol Edit Misi (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenEditMisi}
              className="absolute top-5 right-5 p-2 rounded-lg bg-red-800/10 text-red-800 dark:text-amber-400 hover:bg-red-800 hover:text-white active:scale-95 transition-colors cursor-pointer z-10"
              title="Edit Misi (Admin)"
              aria-label="Edit Misi"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${isDark ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <Award className="w-6 h-6" />
          </div>
          <h3 className={`font-display font-extrabold text-lg ${textPrimary} mb-2`}>Misi Utama</h3>
          <ul className={`space-y-2.5 text-xs ${textSecondary} font-medium`}>
            {misi.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SpotlightCard>
      </div>

      {/* Pembina dan Penanggung Jawab */}
      <div className={`kepengurusan-stagger-3 ${cardBg} rounded-2xl p-6 border shadow-sm space-y-4 transition-colors duration-200`}>
        <h3 className={`font-display font-extrabold text-lg ${textPrimary} border-b ${isDark ? 'border-stone-800' : 'border-stone-200'} pb-3`}>
          Pembina dan Penanggung Jawab
        </h3>

        {/* 1 Kotak di Atas (Pengawas Bina) */}
        <div className="grid grid-cols-1 gap-4">
          <SpotlightCard isDark={isDark} className={`group relative p-5 rounded-2xl border text-center w-full md:w-1/2 md:mx-auto transition-all duration-200 hover:shadow-md ${isDark ? 'bg-stone-800/50 border-stone-700/70' : 'bg-[#faf8f5] border-stone-200'}`}>
            
            {/* Action Buttons Top Right: Edit (Admin Only) & WhatsApp */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenEdit('pembina', pembina)}
                  className="p-2 rounded-lg bg-red-800/15 text-red-800 dark:text-amber-400 hover:bg-red-800 hover:text-white active:scale-95 transition-colors duration-200 cursor-pointer"
                  title="Edit Data (Admin)"
                  aria-label="Edit Data"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {normalizeWaNumber(pembina.wa) && (
                <a 
                  href={`https://wa.me/${normalizeWaNumber(pembina.wa)}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white active:scale-95 transition-colors duration-200"
                  title="Hubungi via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Avatar Inisial */}
            <div className={`mx-auto w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs border mb-2.5 shadow-sm ${
              isDark ? 'bg-red-950/80 text-amber-300 border-red-800/60' : 'bg-red-800 text-white border-red-900/20'
            }`}>
              {getInitials(pembina.name)}
            </div>
            
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border mb-1.5 ${isDark ? 'bg-red-950/60 text-amber-300 border-red-800/50' : 'bg-red-50 text-red-800 border-red-200'}`}>
              {pembina.role}
            </span>
            <p className={`font-extrabold text-sm ${textPrimary}`}>{pembina.name}</p>
            
            {/* NIP */}
            <div className="mt-1 flex justify-center">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium font-mono ${textMuted}`}>
                <Contact2 className="w-3.5 h-3.5 shrink-0" />
                NIP. {pembina.nip}
              </span>
            </div>

            {/* Garis Horizontal di Bawah NIP */}
            <div className={`mt-2.5 pt-2.5 border-t ${isDark ? 'border-stone-700/60' : 'border-stone-200/80'} flex flex-col items-center gap-1`}>
              <span className={`inline-flex items-center gap-1.5 text-[11px] ${textSecondary}`}>
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {pembina.instansi}
              </span>
            </div>
          </SpotlightCard>
        </div>

        {/* 2 Kotak di Bawah (K3S & Penanggung Jawab) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {penanggungJawab.map((item, idx) => (
            <SpotlightCard 
              key={idx} 
              isDark={isDark}
              className={`group relative p-5 rounded-2xl border text-center transition-all duration-200 hover:shadow-md ${isDark ? 'bg-stone-800/50 border-stone-700/70' : 'bg-[#faf8f5] border-stone-200'}`}
            >
              {/* Action Buttons Top Right: Edit (Admin Only) & WhatsApp */}
              <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit('penanggungJawab', item, idx)}
                    className="p-2 rounded-lg bg-red-800/15 text-red-800 dark:text-amber-400 hover:bg-red-800 hover:text-white active:scale-95 transition-colors duration-200 cursor-pointer"
                    title="Edit Data (Admin)"
                    aria-label="Edit Data"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {normalizeWaNumber(item.wa) && (
                  <a 
                    href={`https://wa.me/${normalizeWaNumber(item.wa)}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white active:scale-95 transition-colors duration-200"
                    title="Hubungi via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Avatar Inisial */}
              <div className={`mx-auto w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs border mb-2.5 shadow-sm ${
                isDark ? 'bg-stone-800 text-amber-300 border-stone-700' : 'bg-stone-200/80 text-stone-800 border-stone-300'
              }`}>
                {getInitials(item.name)}
              </div>
              
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border mb-1.5 ${isDark ? 'bg-stone-900/70 text-stone-300 border-stone-700' : 'bg-white text-stone-700 border-stone-200'}`}>
                {item.role}
              </span>
              <p className={`font-extrabold text-sm ${textPrimary}`}>{item.name}</p>
              
              {/* NIP */}
              <div className="mt-1 flex justify-center">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium font-mono ${textMuted}`}>
                  <Contact2 className="w-3.5 h-3.5 shrink-0" />
                  NIP. {item.nip}
                </span>
              </div>

              {/* Garis Horizontal di Bawah NIP */}
              <div className={`mt-2.5 pt-2.5 border-t ${isDark ? 'border-stone-700/60' : 'border-stone-200/80'} flex flex-col items-center gap-1`}>
                <span className={`inline-flex items-center gap-1.5 text-[11px] ${textSecondary}`}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {item.instansi}
                </span>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>

      {/* Struktur Kepengurusan Kombel */}
      <div className={`kepengurusan-stagger-4 ${cardBg} rounded-2xl p-6 border shadow-sm space-y-4 transition-colors duration-200`}>
        <h3 className={`font-display font-extrabold text-lg ${textPrimary} border-b ${isDark ? 'border-stone-800' : 'border-stone-200'} pb-3`}>
          Struktur Kepengurusan
        </h3>

        {/* Grid 2 Kolom per Baris */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pengurus.map((item, idx) => (
            <SpotlightCard 
              key={idx}
              isDark={isDark}
              className={`group relative p-5 rounded-2xl border border-l-4 ${item.borderAccent} text-center transition-all duration-200 hover:shadow-md ${isDark ? 'bg-stone-800/50 border-stone-700/70' : 'bg-[#faf8f5] border-stone-200'}`}
            >
              {/* Action Buttons Top Right: Edit (Admin Only) & WhatsApp */}
              <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit('pengurus', item, idx)}
                    className="p-2 rounded-lg bg-red-800/15 text-red-800 dark:text-amber-400 hover:bg-red-800 hover:text-white active:scale-95 transition-colors duration-200 cursor-pointer"
                    title="Edit Data (Admin)"
                    aria-label="Edit Data"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {normalizeWaNumber(item.wa) && (
                  <a 
                    href={`https://wa.me/${normalizeWaNumber(item.wa)}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white active:scale-95 transition-colors duration-200"
                    title="Hubungi via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Avatar Inisial */}
              <div className={`mx-auto w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs border mb-2.5 shadow-sm ${item.avatarBg}`}>
                {getInitials(item.name)}
              </div>

              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border mb-1.5 ${item.badgeColor}`}>
                {item.role}
              </span>
              
              <p className={`font-extrabold text-sm ${textPrimary}`}>{item.name}</p>
              
              {/* NIP */}
              <div className="mt-1 flex justify-center">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium font-mono ${textMuted}`}>
                  <Contact2 className="w-3.5 h-3.5 shrink-0" />
                  NIP. {item.nip}
                </span>
              </div>

              {/* Garis Horizontal di Bawah NIP */}
              <div className={`mt-2.5 pt-2.5 border-t ${isDark ? 'border-stone-700/60' : 'border-stone-200/80'} flex flex-col items-center gap-1`}>
                <span className={`inline-flex items-center gap-1.5 text-[11px] ${textSecondary}`}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {item.instansi}
                </span>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
      </div>

      {/* Modal Edit Data - Hanya Aktif & Tampil untuk Admin */}
      {editingData && isAdmin && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingData(null)}
        >
          <div 
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${
              isDark ? 'bg-stone-900 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingData.type === 'visi' ? 'Edit Visi PGRI Ranting Gelang' : editingData.type === 'misi' ? 'Edit Misi Utama' : 'Edit Data Kepengurusan'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    {editingData.type === 'visi' ? 'Perbarui deskripsi visi organisasi' : editingData.type === 'misi' ? 'Perbarui poin-poin misi utama' : 'Ubah data identitas & kontak'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingData(null)}
                className={`p-1 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              
              {/* Form Khusus Edit Visi */}
              {editingData.type === 'visi' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Teks Visi</label>
                  <textarea 
                    rows={4}
                    required
                    value={editingData.visiText || ''}
                    onChange={(e) => setEditingData({ ...editingData, visiText: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none resize-none transition-all leading-relaxed ${
                      isDark ? 'bg-stone-800 border-stone-700 text-white focus:border-red-700' : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
                    }`}
                  />
                </div>
              )}

              {/* Form Khusus Edit Misi */}
              {editingData.type === 'misi' && (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  <label className="block text-xs font-semibold text-stone-400">Daftar Poin Misi</label>
                  {(editingData.misiList || []).map((misiItem, mIdx) => (
                    <div key={mIdx} className="flex items-center gap-2">
                      <input 
                        type="text"
                        required
                        value={misiItem}
                        onChange={(e) => {
                          const updated = [...(editingData.misiList || [])];
                          updated[mIdx] = e.target.value;
                          setEditingData({ ...editingData, misiList: updated });
                        }}
                        className={`flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                          isDark ? 'bg-stone-800 border-stone-700 text-white focus:border-red-700' : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
                        }`}
                      />
                      {(editingData.misiList || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingData.misiList || []).filter((_, i) => i !== mIdx);
                            setEditingData({ ...editingData, misiList: updated });
                          }}
                          className="p-2 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingData({
                        ...editingData,
                        misiList: [...(editingData.misiList || []), '']
                      });
                    }}
                    className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isDark ? 'border-stone-700 text-amber-400 hover:bg-red-950/30' : 'border-stone-300 text-red-800 hover:bg-red-50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Poin Misi
                  </button>
                </div>
              )}

              {/* Form Edit Kepengurusan & Pembina */}
              {(editingData.type === 'pembina' || editingData.type === 'penanggungJawab' || editingData.type === 'pengurus') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Jabatan / Peran</label>
                    <input 
                      type="text"
                      required
                      value={editingData.role || ''}
                      onChange={(e) => setEditingData({ ...editingData, role: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                        isDark ? 'bg-stone-800 border-stone-700 text-white focus:border-red-700' : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Nama Lengkap & Gelar</label>
                    <input 
                      type="text"
                      required
                      value={editingData.name || ''}
                      onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                        isDark ? 'bg-stone-800 border-stone-700 text-white focus:border-red-700' : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-400 mb-1">NIP (Opsional)</label>
                      <input 
                        type="text"
                        placeholder="Kosongkan atau isi -"
                        value={editingData.nip || ''}
                        onChange={(e) => setEditingData({ ...editingData, nip: e.target.value })}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                          isDark ? 'bg-stone-800 border-stone-700 text-white focus:border-red-700' : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-400 mb-1">Nomor WA (Opsional)</label>
                      <input 
                        type="text"
                        placeholder="Contoh: 62812... atau -"
                        value={editingData.wa || ''}
                        onChange={(e) => setEditingData({ ...editingData, wa: e.target.value })}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                          isDark ? 'bg-stone-800 border-stone-700 text-white focus:border-red-700' : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">Unit Kerja / Instansi (Opsional)</label>
                    <input 
                      type="text"
                      placeholder="Contoh: SDN GELANG 03 atau -"
                      value={editingData.instansi || ''}
                      onChange={(e) => setEditingData({ ...editingData, instansi: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                        isDark ? 'bg-stone-800 border-stone-700 text-white focus:border-red-700' : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
                      }`}
                    />
                  </div>
                </>
              )}

              <div className={`mt-5 pt-3 border-t ${isDark ? 'border-stone-800' : 'border-stone-200'} flex items-center justify-end gap-2.5`}>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingData(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all disabled:opacity-50 ${
                    isDark ? 'border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-300' : 'border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-800 hover:bg-red-700 shadow-sm cursor-pointer transition-colors active:scale-95 disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};