import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  MessageSquare, 
  X, 
  Check,
  Building,
  Lock,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Teacher } from '../../types';
import { getOrgConfig, openWhatsAppShare } from '../../lib/orgConfig';
import {
  syncFromFirebase,
  mutateCloudCollection,
  fetchCloudVersions,
  shouldFetchByVersion,
  markLocalVersionSynced
} from '../../lib/sync';

const KONTAK_FEEDBACK_KEY = 'pgri-kontak-feedback';

export interface FeedbackMessage {
  id: string;
  name: string;
  school: string;
  phone: string;
  message: string;
  createdAt?: string;
}

interface KontakViewProps {
  teachers?: Teacher[];
  activeRole?: 'guru' | 'admin';
}

export const KontakView: React.FC<KontakViewProps> = ({ 
  teachers = [], 
  activeRole = 'guru' 
}) => {
  // Mendeteksi mode gelap dari tag <html> secara real-time
  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  // Data Sekretariat Dinamis dari Pengaturan & Kepengurusan
  const [sekretariatInfo, setSekretariatInfo] = useState(() => {
    const cfg = getOrgConfig();
    let contactName = 'Umar Ali Kusuma';
    let contactWa = '6288235537431';
    try {
      const savedPengurus = localStorage.getItem('kombel-pengurus');
      if (savedPengurus) {
        const parsed = JSON.parse(savedPengurus);
        if (Array.isArray(parsed)) {
          const ketua = parsed.find((p: any) => p?.role && p.role.toLowerCase().includes('ketua') && !p.role.toLowerCase().includes('wakil'));
          if (ketua) {
            if (ketua.name && ketua.name !== '-') contactName = ketua.name;
            const digits = String(ketua.wa || '').replace(/[^0-9]/g, '');
            if (digits.length >= 9) contactWa = digits.startsWith('08') ? `62${digits.slice(1)}` : digits;
          }
        }
      }
    } catch {}
    const alamat = (cfg.kopSekretariat || 'Jl. PTPN XII Gunung Gambir Desa Gelang, Kec. Sumberbaru - Kab. Jember')
      .replace(/^Sekretariat\s*:\s*/i, '')
      .trim();
    return {
      rantingTitle: cfg.kopRanting ? `Sekretariat PGRI ${cfg.kopRanting.replace(/^RANTING\s+/i, 'Ranting ')}` : 'Sekretariat PGRI Ranting Gelang',
      contactName,
      contactWa,
      email: 'pgrigelang@gmail.com',
      alamat
    };
  });

  useEffect(() => {
    const refreshSekretariat = () => {
      const cfg = getOrgConfig();
      let contactName = 'Umar Ali Kusuma';
      let contactWa = '6288235537431';
      try {
        const savedPengurus = localStorage.getItem('kombel-pengurus');
        if (savedPengurus) {
          const parsed = JSON.parse(savedPengurus);
          if (Array.isArray(parsed)) {
            const ketua = parsed.find((p: any) => p?.role && p.role.toLowerCase().includes('ketua') && !p.role.toLowerCase().includes('wakil'));
            if (ketua) {
              if (ketua.name && ketua.name !== '-') contactName = ketua.name;
              const digits = String(ketua.wa || '').replace(/[^0-9]/g, '');
              if (digits.length >= 9) contactWa = digits.startsWith('08') ? `62${digits.slice(1)}` : digits;
            }
          }
        }
      } catch {}
      const alamat = (cfg.kopSekretariat || 'Jl. PTPN XII Gunung Gambir Desa Gelang, Kec. Sumberbaru - Kab. Jember')
        .replace(/^Sekretariat\s*:\s*/i, '')
        .trim();
      setSekretariatInfo({
        rantingTitle: cfg.kopRanting ? `Sekretariat PGRI ${cfg.kopRanting.replace(/^RANTING\s+/i, 'Ranting ')}` : 'Sekretariat PGRI Ranting Gelang',
        contactName,
        contactWa,
        email: 'pgrigelang@gmail.com',
        alamat
      });
    };

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    window.addEventListener('kombel-settings-updated', refreshSekretariat);
    window.addEventListener('storage', refreshSekretariat);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('kombel-settings-updated', refreshSekretariat);
      window.removeEventListener('storage', refreshSekretariat);
    };
  }, []);

  // Helper keaktifan anggota yang disempurnakan
  const isMemberActive = (t: any): boolean => {
    if (t.activeStatus === 'Aktif') return true;
    if (t.isActive === true) return true;
    if (t.activeStatus === 'Tidak Aktif' || t.isActive === false) return false;
    return true;
  };

  // Filter hanya anggota yang berstatus AKTIF
  const activeTeachers = teachers.filter(t => isMemberActive(t));

  // Form State
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [message, setMessage] = useState('');

  // State Daftar Pengisi (Tersimpan lokal & disinkronkan ke Firestore)
  const [feedbackList, setFeedbackList] = useState<FeedbackMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(KONTAK_FEEDBACK_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    let mounted = true;
    const loadFeedbackFromCloud = async () => {
      try {
        const lastSync = sessionStorage.getItem('pgri_kontak_sync_ts');
        if (lastSync && Date.now() - Number(lastSync) < 90000) {
          return;
        }
      } catch {}

      try {
        const cloudVersions = await fetchCloudVersions(45000);
        if (!mounted) return;
        if (!shouldFetchByVersion('kontakFeedback', cloudVersions)) {
          try {
            sessionStorage.setItem('pgri_kontak_sync_ts', String(Date.now()));
          } catch {}
          return;
        }
        const cloudData = await syncFromFirebase('kontakFeedback');
        if (!mounted) return;
        if (Array.isArray(cloudData)) {
          setFeedbackList(cloudData);
          try {
            localStorage.setItem(KONTAK_FEEDBACK_KEY, JSON.stringify(cloudData));
            sessionStorage.setItem('pgri_kontak_sync_ts', String(Date.now()));
          } catch {}
          markLocalVersionSynced('kontakFeedback', cloudVersions);
        }
      } catch {}
    };

    loadFeedbackFromCloud();

    const handleExternalKontakSync = () => {
      try {
        const saved = localStorage.getItem(KONTAK_FEEDBACK_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setFeedbackList(parsed);
        }
      } catch {}
    };
    window.addEventListener('pgri-kontak-synced', handleExternalKontakSync);
    window.addEventListener('storage', handleExternalKontakSync);
    return () => {
      mounted = false;
      window.removeEventListener('pgri-kontak-synced', handleExternalKontakSync);
      window.removeEventListener('storage', handleExternalKontakSync);
    };
  }, []);

  // Modal State untuk Edit & Hapus Pesan
  const [editingFeedback, setEditingFeedback] = useState<FeedbackMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackMessage | null>(null);
  const [editMessageText, setEditMessageText] = useState('');

  // Helper Inisial Nama untuk Avatar Pengisi
  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Saat nama guru dipilih, otomatis isi asal sekolah, NIP, & nomor WA
  const handleTeacherSelect = (selectedName: string) => {
    setName(selectedName);
    const selectedTeacher = activeTeachers.find(t => t.name === selectedName);
    if (selectedTeacher) {
      setNip((selectedTeacher as any).nip || '-');
      setSchool(selectedTeacher.school || '');
      setPhone(selectedTeacher.phone || '-');
    } else {
      setNip('');
      setSchool('');
      setPhone('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message.trim()) return;

    const newFeedback: FeedbackMessage = {
      id: `fb_${Date.now()}`,
      name,
      school,
      phone,
      message: message.trim(),
      createdAt: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    };

    const nextList = [newFeedback, ...feedbackList];
    setFeedbackList(nextList);
    try {
      localStorage.setItem(KONTAK_FEEDBACK_KEY, JSON.stringify(nextList));
    } catch {}
    void mutateCloudCollection<FeedbackMessage>(
      'kontakFeedback',
      [KONTAK_FEEDBACK_KEY],
      (latest) => [newFeedback, ...latest.filter((item) => item.id !== newFeedback.id)],
      nextList,
      'Pesan & Masukan'
    ).then((res) => {
      if (Array.isArray(res.items)) setFeedbackList(res.items);
    });

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);

    // Reset Form
    setName('');
    setNip('');
    setPhone('');
    setSchool('');
    setMessage('');
  };

  // Handler Edit Pesan (Hanya Admin)
  const handleOpenEdit = (item: FeedbackMessage) => {
    if (activeRole !== 'admin') return;
    setEditingFeedback(item);
    setEditMessageText(item.message);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeedback) return;

    const targetId = editingFeedback.id;
    const trimmed = editMessageText;
    const nextList = feedbackList.map(item => item.id === targetId ? { ...item, message: trimmed } : item);
    setFeedbackList(nextList);
    try {
      localStorage.setItem(KONTAK_FEEDBACK_KEY, JSON.stringify(nextList));
    } catch {}
    void mutateCloudCollection<FeedbackMessage>(
      'kontakFeedback',
      [KONTAK_FEEDBACK_KEY],
      (latest) => latest.map((item) => (item.id === targetId ? { ...item, message: trimmed } : item)),
      nextList,
      'Pesan & Masukan'
    ).then((res) => {
      if (Array.isArray(res.items)) setFeedbackList(res.items);
    });
    setEditingFeedback(null);
  };

  // Handler Hapus Pesan (Hanya Admin)
  const handleConfirmDelete = () => {
    if (!deleteTarget || activeRole !== 'admin') return;
    const targetId = deleteTarget.id;
    const nextList = feedbackList.filter(item => item.id !== targetId);
    setFeedbackList(nextList);
    try {
      localStorage.setItem(KONTAK_FEEDBACK_KEY, JSON.stringify(nextList));
    } catch {}
    void mutateCloudCollection<FeedbackMessage>(
      'kontakFeedback',
      [KONTAK_FEEDBACK_KEY],
      (latest) => latest.filter((item) => item.id !== targetId),
      nextList,
      'Pesan & Masukan'
    ).then((res) => {
      if (Array.isArray(res.items)) setFeedbackList(res.items);
    });
    setDeleteTarget(null);
  };

  return (
    <div className="font-sans space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner — Wibawa Kusuma Bangsa */}
      <div className={`relative overflow-hidden w-full min-h-[164px] rounded-2xl p-6 sm:p-8 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-colors duration-200 ${
        isDark
          ? 'bg-gradient-to-br from-[#231214] via-stone-900 to-[#1a1112] border-red-900/40 text-stone-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] pgri-batik-pattern-dark'
          : 'bg-gradient-to-br from-[#fdfbf7] via-white to-red-50/50 border-stone-200/90 text-stone-900 shadow-[0_6px_20px_rgba(127,29,29,0.06)] pgri-batik-pattern'
      }`}>
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent pointer-events-none" />

        {/* Banner Content */}
        <div className="relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-red-800 dark:text-amber-400 mb-1.5">
            <Phone className="w-3.5 h-3.5" />
            Hubungi Pengurus
          </p>
          <h1 className={`font-display text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}>
            Kontak &amp; Layanan Informasi
          </h1>
          <p className={`text-xs sm:text-sm font-medium mt-1 max-w-xl ${
            isDark ? 'text-stone-400' : 'text-stone-600'
          }`}>
            Sampaikan saran, masukan, dan pertanyaan seputar kegiatan
          </p>
        </div>
      </div>

      {/* Grid Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri: Sekretariat & Form Kirim Pesan */}
        <div className="order-1 lg:col-span-6 space-y-6">
          
          {/* 1. Sekretariat */}
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl p-6 shadow-sm border space-y-4 transition-colors`}>
            <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100 border-stone-800' : 'text-stone-900 border-stone-200/80'} border-b pb-3`}>
              {sekretariatInfo.rantingTitle}
            </h3>

            {/* Telepon / WhatsApp */}
            <button
              type="button"
              onClick={() => openWhatsAppShare(`Halo ${sekretariatInfo.contactName}, saya ingin menanyakan informasi kegiatan PGRI Ranting Gelang.`, sekretariatInfo.contactWa)}
              className={`w-full text-left flex items-start gap-3 text-xs rounded-xl p-1.5 -m-1.5 transition-colors cursor-pointer ${
                isDark ? 'text-stone-400 hover:bg-stone-800/60' : 'text-stone-600 hover:bg-stone-50'
              }`}
              title="Klik untuk menghubungi via WhatsApp"
            >
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'} shrink-0`}>
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className={`font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Telepon / WhatsApp</p>
                <p className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-mono mt-0.5 font-semibold`}>
                  +{sekretariatInfo.contactWa} ({sekretariatInfo.contactName})
                </p>
              </div>
            </button>

            {/* Email Resmi */}
            <a
              href={`mailto:${sekretariatInfo.email}`}
              className={`w-full flex items-start gap-3 text-xs rounded-xl p-1.5 -m-1.5 transition-colors ${
                isDark ? 'text-stone-400 hover:bg-stone-800/60' : 'text-stone-600 hover:bg-stone-50'
              }`}
              title="Klik untuk mengirim email"
            >
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-red-950/60 text-amber-400 border border-red-800/40' : 'bg-red-50 text-red-800 border border-red-200/80'} shrink-0`}>
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className={`font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Alamat Email Resmi</p>
                <p className={`${isDark ? 'text-amber-400' : 'text-red-800'} mt-0.5 font-medium`}>{sekretariatInfo.email}</p>
              </div>
            </a>

            {/* Alamat Kesekretariatan */}
            <div className={`flex items-start gap-3 text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-stone-800 text-amber-400 border border-stone-700' : 'bg-stone-100 text-red-800 border border-stone-200'} shrink-0`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className={`font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Alamat Sekretariat</p>
                <p className={`${isDark ? 'text-stone-400' : 'text-stone-500'} mt-0.5`}>{sekretariatInfo.alamat}</p>
              </div>
            </div>
          </div>

          {/* 2. Kirim Pesan atau Masukan */}
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl p-6 shadow-sm border space-y-4 transition-colors`}>
            <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100 border-stone-800' : 'text-stone-900 border-stone-200/80'} border-b pb-3`}>
              Kirim Pesan atau Masukan
            </h3>

            {submitted ? (
              <div className={`p-8 rounded-2xl ${isDark ? 'bg-emerald-950/30 border-emerald-800/50' : 'bg-emerald-50/80 border-emerald-200'} border text-center space-y-3 animate-in fade-in zoom-in-95 duration-300`}>
                <div className="relative inline-flex items-center justify-center">
                  <div className={`absolute w-14 h-14 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-200/50'} animate-ping [animation-duration:2s]`} />
                  <CheckCircle2 className={`w-12 h-12 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} relative z-10`} />
                </div>
                <p className={`font-display font-bold text-base ${isDark ? 'text-emerald-200' : 'text-emerald-900'}`}>Pesan Berhasil Terkirim!</p>
                <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
                  Terima kasih, pesan Anda telah tersimpan dan disampaikan ke pengurus PGRI Ranting Gelang Sumberbaru.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4 animate-in fade-in duration-300">
                
                {/* Baris 1: Nama Lengkap & NIP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1.5`}>
                      Nama Lengkap *
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={name}
                        onChange={(e) => handleTeacherSelect(e.target.value)}
                        className={`w-full px-3.5 py-2.5 pr-8 rounded-xl transition-all duration-200 ${
                          isDark 
                            ? 'bg-stone-800/70 border-stone-700 text-stone-100 hover:border-stone-600' 
                            : 'bg-[#faf8f5] border-stone-200 text-stone-800 hover:border-stone-300'
                        } border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700 appearance-none cursor-pointer`}
                      >
                        <option value="" disabled className={isDark ? 'bg-stone-900 text-stone-400' : 'bg-white text-stone-400'}>
                          {activeTeachers.length > 0 
                            ? '-- Pilih Anggota Aktif --' 
                            : '-- Data Anggota Aktif Belum Dimuat --'}
                        </option>
                        {activeTeachers.map((t) => (
                          <option 
                            key={t.id} 
                            value={t.name}
                            className={isDark ? 'bg-stone-900 text-stone-100' : 'bg-white text-stone-800'}
                          >
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                        NIP
                      </label>
                      <span className={`text-[10px] inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border ${
                        isDark ? 'bg-stone-800 border-stone-700 text-stone-400' : 'bg-stone-100 border-stone-200 text-stone-500'
                      }`}>
                        <Lock className="w-2.5 h-2.5" /> Otomatis
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={nip}
                      placeholder="Terisi otomatis sesuai nama"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-mono border-dashed ${
                        isDark 
                          ? 'bg-stone-950/60 border-stone-800 text-stone-400 cursor-not-allowed' 
                          : 'bg-[#faf8f5] border-stone-200 text-stone-500 cursor-not-allowed'
                      } border text-xs font-medium select-none focus:outline-none`}
                    />
                  </div>
                </div>

                {/* Baris 2: Asal Sekolah & Kontak WA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                        Asal Sekolah
                      </label>
                      <span className={`text-[10px] inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border ${
                        isDark ? 'bg-stone-800 border-stone-700 text-stone-400' : 'bg-stone-100 border-stone-200 text-stone-500'
                      }`}>
                        <Lock className="w-2.5 h-2.5" /> Otomatis
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      required
                      value={school}
                      placeholder="Terisi otomatis sesuai nama"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-mono border-dashed ${
                        isDark 
                          ? 'bg-stone-950/60 border-stone-800 text-stone-400 cursor-not-allowed' 
                          : 'bg-[#faf8f5] border-stone-200 text-stone-500 cursor-not-allowed'
                      } border text-xs font-medium select-none focus:outline-none`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                        WhatsApp
                      </label>
                      <span className={`text-[10px] inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border ${
                        isDark ? 'bg-stone-800 border-stone-700 text-stone-400' : 'bg-stone-100 border-stone-200 text-stone-500'
                      }`}>
                        <Lock className="w-2.5 h-2.5" /> Otomatis
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      required
                      value={phone}
                      placeholder="Terisi otomatis sesuai nama"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-mono border-dashed ${
                        isDark 
                          ? 'bg-stone-950/60 border-stone-800 text-stone-400 cursor-not-allowed' 
                          : 'bg-[#faf8f5] border-stone-200 text-stone-500 cursor-not-allowed'
                      } border text-xs font-medium select-none focus:outline-none`}
                    />
                  </div>
                </div>

                {/* 5. Isi Pesan */}
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1.5`}>
                    Isi Pesan / Masukan *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan pertanyaan, masukan, atau usulan topik kegiatan..."
                    className={`w-full px-3.5 py-2.5 rounded-xl font-mono ${
                      isDark 
                        ? 'bg-stone-800/70 border-stone-700 text-stone-100 placeholder:text-stone-500' 
                        : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'
                    } border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700 transition-colors`}
                  />
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="submit"
                    className="group w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
                  >
                    <Send className="w-4 h-4 stroke-[2.25] transition-transform duration-200 group-hover:translate-x-0.5" />
                    <span className="tracking-wide">Kirim Pesan</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Daftar Pengisi */}
        <div className="order-2 lg:col-span-6">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl p-6 shadow-sm border space-y-4 transition-colors`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'} pb-3`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-red-950/60 border-red-800/50 text-amber-400' : 'bg-red-50 border-red-200/80 text-red-800'}`}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
                  Daftar Pengisi
                </h3>
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold border ${isDark ? 'bg-stone-800 border-stone-700 text-stone-300' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>
                {feedbackList.length} Pengisi
              </span>
            </div>

            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1 mt-4 custom-scrollbar">
              {feedbackList.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2.5">
                  <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center border ${isDark ? 'bg-stone-800/80 border-stone-700 text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-400'}`}>
                    <Sparkles className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className={`font-semibold text-xs ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                    Belum ada pesan atau masukan
                  </p>
                  <p className={`text-[11px] ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                    Masukan yang dikirim melalui formulir akan muncul di sini.
                  </p>
                </div>
              ) : (
                feedbackList.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm animate-in fade-in slide-in-from-top-2 ${
                      isDark 
                        ? 'bg-stone-800/40 border-stone-800 hover:border-stone-700 hover:bg-stone-800/60' 
                        : 'bg-[#faf8f5] border-stone-200/80 hover:border-stone-300'
                    } space-y-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar Inisial & Info Guru */}
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 border ${
                          isDark 
                            ? 'bg-red-950/70 text-amber-300 border-red-800/60' 
                            : 'bg-red-800 text-white border-red-900/20'
                        }`}>
                          {getInitials(item.name)}
                        </div>

                        <div>
                          <p className={`font-display font-bold text-xs sm:text-sm ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
                            {item.name}
                          </p>
                          <p className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                            <Building className="w-3 h-3 text-red-700 dark:text-amber-400 shrink-0" />
                            <span>{item.school}</span>
                          </p>
                          <p className={`text-[11px] flex items-center gap-1.5 font-mono ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                            <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{item.phone}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {item.createdAt && (
                          <span className={`text-[10px] flex items-center gap-1 font-medium ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                            <Calendar className="w-3 h-3" />
                            {item.createdAt}
                          </span>
                        )}

                        {activeRole === 'admin' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Pesan"
                              className={`w-8 h-8 rounded-lg border ${
                                isDark 
                                  ? 'border-stone-700 bg-stone-800/80 text-amber-400 hover:bg-red-900/50 hover:border-red-800' 
                                  : 'border-stone-200 bg-white text-red-800 hover:bg-red-50 hover:border-red-200'
                              } active:scale-95 flex items-center justify-center transition-colors duration-200 cursor-pointer`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              title="Hapus Pesan"
                              className={`w-8 h-8 rounded-lg border ${
                                isDark 
                                  ? 'border-stone-700 bg-stone-800/80 text-red-400 hover:bg-red-950 hover:border-red-800' 
                                  : 'border-stone-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-200'
                              } active:scale-95 flex items-center justify-center transition-colors duration-200 cursor-pointer`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl text-xs leading-relaxed ${isDark ? 'bg-stone-900/80 text-stone-300 border border-stone-800' : 'bg-white text-stone-700 border border-stone-200/80'}`}>
                      "{item.message}"
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Edit Pesan (Hanya Admin) */}
      {editingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-800'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-stone-800' : 'border-stone-200'} pb-3`}>
              <div className={`flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-red-800'}`}>
                <Pencil className="w-4 h-4" />
                <h3 className={`font-display font-bold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Edit Pesan Masukan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFeedback(null)}
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-700'} transition-colors cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs mt-2">
              <div>
                <p className={`font-display font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>{editingFeedback.name}</p>
                <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>{editingFeedback.school} • <span className="font-mono">{editingFeedback.phone}</span></p>
              </div>

              <div>
                <label className={`block font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Isi Pesan
                </label>
                <textarea
                  required
                  rows={4}
                  value={editMessageText}
                  onChange={(e) => setEditMessageText(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    isDark 
                      ? 'bg-stone-800 border-stone-700 text-stone-100' 
                      : 'bg-[#faf8f5] border-stone-200 text-stone-800'
                  } focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700 font-medium`}
                />
              </div>

              <div className={`pt-3 border-t ${isDark ? 'border-stone-800' : 'border-stone-200'} flex justify-end gap-2`}>
                <button
                  type="button"
                  onClick={() => setEditingFeedback(null)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                    isDark ? 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700' : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pesan (Hanya Admin) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-800'} rounded-2xl max-w-sm w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200 text-center`}>
            
            <div className="inline-flex items-center justify-center mx-auto">
              <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-red-950/70 text-red-400 border border-red-800/50' : 'bg-red-50 text-red-700 border border-red-200'} flex items-center justify-center`}>
                <Trash2 className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1 mt-2">
              <h3 className={`font-display font-bold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Konfirmasi Hapus
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                Pesan dari <span className={`font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>{deleteTarget.name}</span> akan dihapus dari daftar pengisi.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                  isDark ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300' : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};