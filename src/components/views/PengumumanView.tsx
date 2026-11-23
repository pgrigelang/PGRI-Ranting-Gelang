import React, { useState, useEffect } from 'react';
import { Bell, Megaphone, Plus, Edit, Copy, Trash2, X, AlertTriangle, Share2 } from 'lucide-react';
import { openWhatsAppShare } from '../../lib/orgConfig';

export interface AnnouncementItem {
  id: string | number;
  category: string;
  title: string;
  content: string;
  date: string;
  author?: string;
}

interface PengumumanViewProps {
  announcements?: AnnouncementItem[];
  isAdmin?: boolean; 
  onAdd?: (item: Omit<AnnouncementItem, 'id'>) => void;
  onEdit?: (item: AnnouncementItem) => void;
  onCopy?: (item: AnnouncementItem) => void;
  onDelete?: (id: string | number) => void;
}

export const PengumumanView: React.FC<PengumumanViewProps> = ({ 
  announcements = [], 
  isAdmin = false,
  onAdd,
  onEdit,
  onCopy,
  onDelete
}) => {
  // State Internal untuk Real-time Update di UI (Optimistic Update)
  const [localAnnouncements, setLocalAnnouncements] = useState<AnnouncementItem[]>(announcements);

  useEffect(() => {
    setLocalAnnouncements(announcements);
  }, [announcements]);

  // State untuk deteksi dark mode (diinisialisasi langsung untuk mencegah flicker)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // State untuk Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [isClosingForm, setIsClosingForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isClosingDelete, setIsClosingDelete] = useState(false);
  const [activeItem, setActiveItem] = useState<AnnouncementItem | null>(null);

  // Daftar Penulis / Pembuat (Sinkronisasi dengan data ProfilKBView di localStorage)
  const [authorOptions, setAuthorOptions] = useState<{ name: string; role: string }[]>([]);

  useEffect(() => {
    const loadAuthorsFromProfile = () => {
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
      } catch (e) {}

      const combined = [pembinaData, ...pjData, ...pengurusData]
        .filter((item) => item && item.name && item.name.trim() !== '' && item.name !== '-')
        .map((item) => ({ name: item.name, role: item.role || '' }));

      setAuthorOptions(combined);
    };

    loadAuthorsFromProfile();
    window.addEventListener('storage', loadAuthorsFromProfile);
    window.addEventListener('kombel-settings-updated', loadAuthorsFromProfile);
    return () => {
      window.removeEventListener('storage', loadAuthorsFromProfile);
      window.removeEventListener('kombel-settings-updated', loadAuthorsFromProfile);
    };
  }, []);

  // State untuk Form Data
  const initialFormState = {
    category: 'Informasi Umum',
    title: '',
    date: new Date().toISOString().split('T')[0],
    author: '',
    content: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Setup Observer untuk Dark Mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      return () => observer.disconnect();
    }
  }, []);

  // Handlers untuk Modal
  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setActiveItem(null);
    setIsClosingForm(false);
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: AnnouncementItem) => {
    setFormData({
      category: item.category,
      title: item.title,
      date: item.date,
      author: item.author || '',
      content: item.content
    });
    setActiveItem(item);
    setIsClosingForm(false);
    setShowFormModal(true);
  };

  const handleCloseForm = () => {
    setIsClosingForm(true);
    setTimeout(() => {
      setShowFormModal(false);
      setIsClosingForm(false);
    }, 250);
  };

  const handleOpenDelete = (item: AnnouncementItem) => {
    setActiveItem(item);
    setIsClosingDelete(false);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setIsClosingDelete(true);
    setTimeout(() => {
      setShowDeleteModal(false);
      setIsClosingDelete(false);
      setActiveItem(null);
    }, 250);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeItem) {
      // Mode Edit
      const updatedItem = { ...formData, id: activeItem.id };
      onEdit?.(updatedItem);
      // Optimistic update UI
      setLocalAnnouncements(prev => prev.map(a => a.id === activeItem.id ? updatedItem : a));
    } else {
      // Mode Tambah
      const newItem = { ...formData, id: Date.now().toString() };
      onAdd?.(formData);
      // Optimistic update UI
      setLocalAnnouncements(prev => [newItem, ...prev]);
    }
    handleCloseForm();
  };

  const handleConfirmDelete = () => {
    if (activeItem) {
      onDelete?.(activeItem.id);
      // Optimistic update
      setLocalAnnouncements(prev => prev.filter(item => item.id !== activeItem.id));
    }
    handleCloseDelete();
  };

  // Utility classes untuk input
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-800/20 ${
    isDark 
      ? 'bg-stone-800 border-stone-700 text-white focus:border-amber-500' 
      : 'bg-[#faf8f5] border-stone-200 text-stone-800 focus:border-red-700'
  }`;

  const labelClass = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`;

  return (
    <div className="font-sans space-y-6 relative">
      
      {/* CSS Keyframes untuk transisi buka dan tutup popup yang sangat halus */}
      <style>{`
        @keyframes smoothBackdropIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes smoothBackdropOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes smoothModalIn {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(16px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes smoothModalOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.92) translateY(16px);
          }
        }
        .modal-backdrop-enter {
          animation: smoothBackdropIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .modal-backdrop-exit {
          animation: smoothBackdropOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .modal-content-enter {
          animation: smoothModalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .modal-content-exit {
          animation: smoothModalOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header Banner — Wibawa Kusuma Bangsa */}
      <div className={`relative overflow-hidden w-full min-h-[164px] rounded-2xl p-6 sm:p-8 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
        isDark
          ? 'bg-gradient-to-br from-[#231214] via-stone-900 to-[#1a1112] border-red-900/40 text-stone-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] pgri-batik-pattern-dark'
          : 'bg-gradient-to-br from-[#fdfbf7] via-white to-red-50/50 border-stone-200/90 text-stone-900 shadow-[0_6px_20px_rgba(127,29,29,0.06)] pgri-batik-pattern'
      }`}>
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent pointer-events-none" />

        <div className="relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-red-800 dark:text-amber-400 mb-1.5">
            <Bell className="w-3.5 h-3.5" />
            Papan Informasi Resmi
          </p>
          <h1 className={`font-display text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}>
            Pengumuman PGRI Ranting Gelang
          </h1>
          <p className={`text-xs sm:text-sm font-medium mt-1 max-w-xl ${
            isDark ? 'text-stone-400' : 'text-stone-600'
          }`}>
            Informasi terbaru, jadwal kegiatan, dan pemberitahuan penting
          </p>
        </div>

        {/* Tombol Tambah Pengumuman */}
        {isAdmin && (
          <div className="relative z-10 flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
              <span className="tracking-wide">Tambah Pengumuman</span>
            </button>
          </div>
        )}
      </div>

      {/* Announcement List */}
      <div className="grid grid-cols-1 gap-4">
        {localAnnouncements.map((item) => (
          <div
            key={item.id}
            className={`${
              isDark 
                ? 'bg-stone-900 border-stone-800 hover:border-red-800/70' 
                : 'bg-white border-stone-200/90 hover:border-red-300'
            } rounded-2xl p-5 shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors`}
          >
            <div className="flex items-start sm:items-center gap-4 flex-1 w-full">
              <div className={`w-12 h-12 rounded-xl border ${isDark ? 'bg-red-950/60 border-red-800/50 text-amber-400' : 'bg-red-50 border-red-200/80 text-red-800'} font-bold flex items-center justify-center shrink-0 mt-1 sm:mt-0`}>
                <Megaphone className="w-6 h-6" />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-900 border border-amber-200/80'} text-[10px] font-bold uppercase tracking-wider`}>
                    {item.category}
                  </span>
                  <span className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'} font-medium`}>
                    {item.date} {item.author ? `• ${item.author}` : ''}
                  </span>
                </div>
                <h3 className={`font-display font-bold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'} mb-1`}>
                  {item.title}
                </h3>
                <p className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-600'} line-clamp-2`}>
                  {item.content}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const msg =
                    `📢 *PENGUMUMAN PGRI RANTING GELANG*\n` +
                    `[${item.category}] — ${item.date}\n\n` +
                    `*${item.title}*\n` +
                    `${item.content}\n\n` +
                    `${item.author ? `Sumber: ${item.author}\n` : ''}` +
                    `_PGRI Ranting Gelang - Kecamatan Sumberbaru_`;
                  openWhatsAppShare(msg);
                }}
                className={`px-3 h-8 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isDark
                    ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                    : 'border-emerald-600/35 text-emerald-700 hover:bg-emerald-500/15'
                }`}
                title="Bagikan ke WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WA</span>
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => { e.preventDefault(); handleOpenEdit(item); }}
                    className={`w-8 h-8 rounded-lg border ${
                      isDark 
                        ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/20' 
                        : 'border-amber-600/35 text-amber-700 hover:bg-amber-500/15'
                    } active:scale-90 flex items-center justify-center cursor-pointer`}
                    title="Edit Pengumuman"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); onCopy?.(item); }}
                    className={`w-8 h-8 rounded-lg border ${
                      isDark 
                        ? 'border-stone-600 text-stone-300 hover:bg-stone-700/60' 
                        : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                    } active:scale-90 flex items-center justify-center cursor-pointer`}
                    title="Salin / Duplikat Pengumuman"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); handleOpenDelete(item); }}
                    className={`w-8 h-8 rounded-lg border ${
                      isDark 
                        ? 'border-red-500/40 text-red-400 hover:bg-red-500/20' 
                        : 'border-red-600/35 text-red-700 hover:bg-red-500/15'
                    } active:scale-90 flex items-center justify-center cursor-pointer`}
                    title="Hapus Pengumuman"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {localAnnouncements.length === 0 && (
          <div className={`w-full p-8 text-center rounded-2xl border ${isDark ? 'border-stone-800 bg-stone-900/50' : 'border-stone-200 bg-[#faf8f5]'}`}>
            <p className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Belum ada pengumuman saat ini.</p>
          </div>
        )}
      </div>

      {/* MODAL: Form Tambah/Edit Pengumuman */}
      {showFormModal && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm ${isClosingForm ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}>
          <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-stone-900 border border-stone-800' : 'bg-white border border-stone-200'} ${isClosingForm ? 'modal-content-exit' : 'modal-content-enter'}`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-100'} mb-4`}>
              <h2 className={`font-display text-base font-extrabold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                {activeItem ? 'Edit Pengumuman' : 'Tambah Pengumuman Baru'}
              </h2>
              <button 
                type="button"
                onClick={handleCloseForm}
                className={`p-1 rounded-lg cursor-pointer ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-white' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-700'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Kategori</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className={inputClass}
                    required
                  >
                    <option value="Informasi Umum">Informasi Umum</option>
                    <option value="Agenda Kegiatan">Agenda Kegiatan</option>
                    <option value="Edaran Organisasi">Edaran Organisasi</option>
                    <option value="Kegiatan Ranting">Kegiatan Ranting</option>
                    <option value="Laporan & Transparansi">Laporan &amp; Transparansi</option>
                    {formData.category &&
                      ![
                        'Informasi Umum',
                        'Agenda Kegiatan',
                        'Edaran Organisasi',
                        'Kegiatan Ranting',
                        'Laporan & Transparansi',
                      ].includes(formData.category) && (
                        <option value={formData.category}>{formData.category}</option>
                      )}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tanggal</label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Judul Pengumuman</label>
                <input 
                  type="text"
                  placeholder="Contoh: Jadwal Rapat Koordinasi Ranting Gelang"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Nama Penulis / Pembuat</label>
                <select 
                  value={formData.author}
                  onChange={(e) => setFormData({...formData, author: e.target.value})}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>-- Pilih Penulis / Pembuat --</option>
                  {formData.author && !authorOptions.some((opt) => opt.name === formData.author) && (
                    <option value={formData.author}>{formData.author}</option>
                  )}
                  {authorOptions.map((opt, idx) => (
                    <option key={idx} value={opt.name}>
                      {opt.role ? `${opt.name} (${opt.role})` : opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Isi Pengumuman</label>
                <textarea 
                  rows={4}
                  placeholder="Tuliskan detail pengumuman untuk anggota PGRI Ranting Gelang di sini..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>

              {/* Tombol Simpan */}
              <div className={`pt-3 flex items-center justify-end gap-2 border-t ${isDark ? 'border-stone-800' : 'border-stone-100'}`}>
                <button 
                  type="button"
                  onClick={handleCloseForm}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                    isDark ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm active:scale-95 cursor-pointer"
                >
                  {activeItem ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus */}
      {showDeleteModal && activeItem && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm ${isClosingDelete ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}>
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 ${isClosingDelete ? 'modal-content-exit' : 'modal-content-enter'}`}>
            
            <div className={`flex items-center gap-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-red-900/40' : 'bg-red-100'} flex items-center justify-center shrink-0`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display font-bold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Konfirmasi Hapus
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400/80' : 'text-red-700/80'}`}>
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            
            <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
              Apakah Anda yakin ingin menghapus pengumuman <span className="font-bold">&quot;{activeItem.title}&quot;</span>?
            </p>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseDelete}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                  isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 stroke-[3]" />
                <span>Ya, Hapus</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};