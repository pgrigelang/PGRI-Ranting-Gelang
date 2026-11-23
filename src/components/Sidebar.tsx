import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Info,
  Users,
  Calendar,
  Wallet,
  Bell,
  Phone,
  Settings,
  X,
  Lock,
  Unlock,
  Check,
  ChevronDown,
  UserCheck,
  User,
  AlertCircle,
  RefreshCw,
  FileText,
  ClipboardList,
  HeartHandshake,
  ShieldCheck,
  LogOut,
  Image as ImageIcon,
  Building2,
  Database
} from 'lucide-react';
import { ActiveTab, PengaturanSubTab, PengurusRole } from '../types';
import { doc, getDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { emitSyncStatus } from '../lib/sync';
import {
  canAccessAdminForTab,
  isPengurusRole,
  logAuditEvent,
  PENGURUS_ROLE_LABELS,
  signInPengurusWithGoogle,
  signOutPengurus
} from '../lib/auth';
import batikKusumaBangsaBg from '../assets/images/batik_kusuma_bangsa_1795456604040.jpg';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  theme: 'light' | 'dark';
  activeRole?: 'guru' | 'admin';
  onChangeRole?: (role: 'guru' | 'admin') => void;
  pengurusRole?: PengurusRole;
  onChangePengurusRole?: (role: PengurusRole) => void;
  authEmail?: string | null;
  currentUser?: { name: string; school: string; role: string };
  pengaturanSubTab?: PengaturanSubTab;
  onPengaturanSubTabChange?: (subTab: PengaturanSubTab) => void;
}

interface MenuItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  badge?: string | number;
  section?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
  theme,
  activeRole = 'guru',
  onChangeRole,
  pengurusRole = 'guru' as PengurusRole,
  onChangePengurusRole,
  authEmail = null,
  currentUser = { name: 'Anggota Guru', school: 'PGRI Ranting Gelang', role: 'Guru' },
  pengaturanSubTab = 'logo' as PengaturanSubTab,
  onPengaturanSubTabChange
}) => {
  const isDark = theme === 'dark';

  // State untuk Fitur Login & Role Switcher
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showConfirmGuruModal, setShowConfirmGuruModal] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lockedTabs, setLockedTabs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kombel-locked-menus');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedMenuName, setLockedMenuName] = useState('');
  const [pendingLockItem, setPendingLockItem] = useState<{ id: string; label: string; willLock: boolean } | null>(null);
  const [isPengaturanOpen, setIsPengaturanOpen] = useState(false);
  const [logoPgri, setLogoPgri] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('logo-pgri') : null
  );

  useEffect(() => {
    const syncLogoPgri = () => {
      setLogoPgri(localStorage.getItem('logo-pgri'));
    };
    syncLogoPgri();
    window.addEventListener('storage', syncLogoPgri);
    window.addEventListener('kombel-settings-updated', syncLogoPgri);
    return () => {
      window.removeEventListener('storage', syncLogoPgri);
      window.removeEventListener('kombel-settings-updated', syncLogoPgri);
    };
  }, []);


  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentRole, setCurrentRole] = useState<'guru' | 'admin'>(() => {
    return activeRole || (localStorage.getItem('activeRole') as 'guru' | 'admin') || 'guru';
  });

  // Sinkronisasi jika activeRole dari parent (App) berubah
  useEffect(() => {
    if (activeRole && activeRole !== currentRole) {
      setCurrentRole(activeRole);
    }
  }, [activeRole]);

  useEffect(() => {
    if (showAdminModal) {
      setError('');
    }
  }, [showAdminModal]);

  // Click outside listener untuk dropdown menu role
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const isAdminActive = currentRole === 'admin';
  const isGuruActive = !isAdminActive;
  const canSeePengaturan =
    isAdminActive &&
    Boolean(authEmail) &&
    isPengurusRole(pengurusRole) &&
    canAccessAdminForTab(pengurusRole, 'pengaturan');
  const canManageLocks =
    isAdminActive &&
    Boolean(authEmail) &&
    (pengurusRole === 'ketua' || pengurusRole === 'sekretaris');

  useEffect(() => {
    if (!canSeePengaturan) {
      setIsPengaturanOpen(false);
    } else if (activeTab === 'pengaturan') {
      setIsPengaturanOpen(true);
    }
  }, [canSeePengaturan, activeTab]);

  // Helper tarik data anggota terbaru dari Cloud saat login Admin tanpa menimpa balik data yang sudah dihapus
  const performSmartSync = async () => {
    try {
      const { syncFromFirebase } = await import('../lib/sync');
      const cloudTeachers = await syncFromFirebase('teachers');
      if (Array.isArray(cloudTeachers)) {
        localStorage.setItem('kombel-teachers', JSON.stringify(cloudTeachers));
      }
      return true;
    } catch (e) {
      console.warn('Smart sync error in login:', e);
      return false;
    }
  };

  // Handler login Pengurus menggunakan Firebase Google Authentication + RBAC
  const handleGooglePengurusLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      const { user, role } = await signInPengurusWithGoogle();
      if (!isPengurusRole(role)) {
        setError(
          `Akun ${user.email} belum terdaftar sebagai Pengurus PGRI Ranting Gelang. Hubungi Ketua untuk penetapan peran di menu Pengaturan.`
        );
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setIsLoggingIn(false);
        return;
      }

      await performSmartSync();

      setCurrentRole('admin');
      localStorage.setItem('activeRole', 'admin');
      localStorage.setItem('pgri-pengurus-role', role);
      if (onChangePengurusRole) {
        onChangePengurusRole(role);
      }
      if (onChangeRole) {
        onChangeRole('admin');
      }
      await logAuditEvent(
        'Autentikasi',
        'Login Pengurus',
        `${user.displayName || user.email} masuk sebagai ${PENGURUS_ROLE_LABELS[role]}.`,
        role
      );
      setShowAdminModal(false);
      setShowUserMenu(false);
      setError('');
      setIsLoggingIn(false);
    } catch (err: any) {
      setError(err?.message?.includes('popup-closed')
        ? 'Jendela login Google ditutup sebelum selesai.'
        : 'Gagal masuk dengan Google. Pastikan pop-up browser diizinkan dan coba lagi.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setIsLoggingIn(false);
    }
  };

  // Trigger klik opsi Guru
  const handleSelectGuru = () => {
    setShowUserMenu(false);
    if (currentRole === 'admin') {
      setShowConfirmGuruModal(true);
    }
  };

  // Konfirmasi beralih ke Guru
  const handleConfirmSwitchToGuru = async () => {
    try {
      await signOutPengurus();
    } catch {}
    setCurrentRole('guru');
    localStorage.setItem('activeRole', 'guru');
    localStorage.setItem('pgri-pengurus-role', 'guru');
    if (onChangePengurusRole) {
      onChangePengurusRole('guru');
    }
    if (onChangeRole) {
      onChangeRole('guru');
    }
    setShowConfirmGuruModal(false);
  };


  // Sinkronisasi status kunci menu (hemat kuota dengan jeda cooldown 60 detik & tersimpan di localStorage)
  useEffect(() => {
    let isMounted = true;
    const fetchLockedMenus = async () => {
      try {
        const lastLockSync = sessionStorage.getItem('kombel_locked_menus_sync_ts');
        if (lastLockSync && (Date.now() - Number(lastLockSync)) < 60000) {
          return;
        }
      } catch (e) {}

      try {
        const docRef = doc(db, 'settings', 'locked-menus');
        let snap;
        try {
          snap = await getDocFromServer(docRef);
        } catch {
          snap = await getDoc(docRef);
        }
        if (isMounted && snap && snap.exists()) {
          const data = snap.data() as Record<string, boolean>;
          setLockedTabs(data);
          try {
            localStorage.setItem('kombel-locked-menus', JSON.stringify(data));
          } catch (e) {}
        }
        try {
          sessionStorage.setItem('kombel_locked_menus_sync_ts', String(Date.now()));
        } catch (e) {}
      } catch (err: any) {
        if (err && err.message && err.message.includes('Quota')) return;
        console.info("Info status menu:", err);
      }
    };

    fetchLockedMenus();

    const syncFromLocalLocked = () => {
      try {
        const saved = localStorage.getItem('kombel-locked-menus');
        if (saved) setLockedTabs(JSON.parse(saved));
      } catch (e) {}
    };

    window.addEventListener('storage', syncFromLocalLocked);
    window.addEventListener('kombel-locked-menus-updated', syncFromLocalLocked);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncFromLocalLocked);
      window.removeEventListener('kombel-locked-menus-updated', syncFromLocalLocked);
    };
  }, []);

  const toggleLock = async (id: string) => {
    if (!canManageLocks) {
      emitSyncStatus({
        type: 'warning',
        collectionName: 'locked-menus',
        message: 'Hanya Ketua dan Sekretaris yang dapat mengubah kunci menu.'
      });
      return;
    }

    const previousLocks = { ...lockedTabs };
    const targetVal = !lockedTabs[id];
    const optimisticState = { ...lockedTabs, [id]: targetVal };
    setLockedTabs(optimisticState);
    try {
      localStorage.setItem('kombel-locked-menus', JSON.stringify(optimisticState));
      window.dispatchEvent(new Event('kombel-locked-menus-updated'));
    } catch (e) {}

    try {
      const docRef = doc(db, 'settings', 'locked-menus');
      let latestLocks: Record<string, boolean> = { ...previousLocks };
      try {
        const snap = await getDocFromServer(docRef);
        if (snap.exists()) latestLocks = snap.data() as Record<string, boolean>;
      } catch {
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) latestLocks = snap.data() as Record<string, boolean>;
        } catch {}
      }
      const mergedLocks = { ...latestLocks, [id]: targetVal };
      await setDoc(docRef, mergedLocks, { merge: true });
      setLockedTabs(mergedLocks);
      try {
        localStorage.setItem('kombel-locked-menus', JSON.stringify(mergedLocks));
        window.dispatchEvent(new Event('kombel-locked-menus-updated'));
      } catch (e) {}
      emitSyncStatus({
        type: 'success',
        collectionName: 'locked-menus',
        message: `Status kunci menu berhasil disimpan ke Cloud.`
      });
    } catch (err: any) {
      console.warn("Gagal mengunci menu:", err);
      setLockedTabs(previousLocks);
      try {
        localStorage.setItem('kombel-locked-menus', JSON.stringify(previousLocks));
        window.dispatchEvent(new Event('kombel-locked-menus-updated'));
      } catch (e) {}
      emitSyncStatus({
        type: 'error',
        collectionName: 'locked-menus',
        message: 'Gagal menyimpan kunci menu ke Cloud. Status dikembalikan.'
      });
    }
  };

  const handleCloseAdminModal = () => {
    setShowAdminModal(false);
    setError('');
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Utama',
      items: [
        { id: 'beranda', label: 'Beranda', icon: <Home size={18} />, iconColor: 'text-amber-400' },
        { id: 'profil', label: 'Kepengurusan', icon: <Info size={18} />, iconColor: 'text-amber-300' },
        { id: 'anggota', label: 'Daftar Anggota', icon: <Users size={18} />, iconColor: 'text-rose-300' },
      ]
    },
    {
      title: 'Aktivitas',
      items: [
        { id: 'proker', label: 'Program Kerja', icon: <ClipboardList size={18} />, iconColor: 'text-amber-400' },
        { id: 'jadwal', label: 'Jadwal Kegiatan', icon: <Calendar size={18} />, iconColor: 'text-emerald-400' },
        { id: 'keuangan', label: 'Catatan Keuangan', icon: <Wallet size={18} />, iconColor: 'text-amber-300' },
        { id: 'sosial', label: 'Dana Aspirasi', icon: <HeartHandshake size={18} />, iconColor: 'text-rose-400' },
        { id: 'dokumen', label: 'Pengumuman', icon: <Bell size={18} />, iconColor: 'text-amber-400' },
      ]
    },
    {
      title: 'Lainnya',
      items: [
        { id: 'undangan', label: 'Buat Undangan', icon: <FileText size={18} />, iconColor: 'text-amber-300' },
        { id: 'kontak', label: 'Layanan Informasi', icon: <Phone size={18} />, iconColor: 'text-rose-300' },
      ]
    }
  ];

  const allPengaturanSubItems: {
    id: PengaturanSubTab;
    label: string;
    icon: React.ReactNode;
    iconColor: string;
  }[] = [
    { id: 'logo', label: 'Pengaturan Logo', icon: <ImageIcon size={16} />, iconColor: 'text-amber-400' },
    { id: 'pengurus', label: 'Pengaturan Pengurus', icon: <Users size={16} />, iconColor: 'text-rose-300' },
    { id: 'organisasi', label: 'Konfigurasi Organisasi', icon: <Building2 size={16} />, iconColor: 'text-amber-300' },
    { id: 'hak-akses', label: 'Manajemen Hak Akses', icon: <ShieldCheck size={16} />, iconColor: 'text-red-400' },
    { id: 'data', label: 'Manajemen Data', icon: <Database size={16} />, iconColor: 'text-emerald-400' },
  ];

  const pengaturanSubItems =
    pengurusRole === 'bendahara'
      ? allPengaturanSubItems.filter((sub) => sub.id === 'organisasi')
      : allPengaturanSubItems;

  const handleTabClick = (id: ActiveTab, label: string) => {
    if (!isAdminActive && lockedTabs[id]) {
      setLockedMenuName(label);
      setShowLockedModal(true);
      return;
    }
    onTabChange(id);
    onCloseMobile();
  };

  return (
    <>
      <style>{`
        /* Custom Clean Scrollbar */
        .custom-sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(214, 180, 140, 0.18);
          border-radius: 9999px;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(214, 180, 140, 0.32);
        }

        /* Keyframes untuk Animasi Getar + Red Flash (Shake Error) */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }

        /* Keyframes untuk Pop-up / Modal Entrance */
        @keyframes popUp {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes modalEnter {
          0% {
            opacity: 0;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInOverlay {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes staggerItem {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-pop-up {
          animation: popUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: bottom center;
        }

        .animate-modal-enter {
          animation: modalEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-fade-in {
          animation: fadeInOverlay 0.2s ease-out forwards;
        }

        .animate-stagger-1 {
          animation: staggerItem 0.2s cubic-bezier(0.16, 1, 0.3, 1) 0.04s both;
        }

        .animate-stagger-2 {
          animation: staggerItem 0.2s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      {/* Mobile Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container — Two-Tone Executive Crimson Charcoal */}
      <aside className={`sidebar-container
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
        w-64 min-w-[16rem] max-w-[16rem] shrink-0
        ${isOpenMobile ? 'translate-x-0 transition-transform duration-300 ease-out' : '-translate-x-full lg:translate-x-0'}
        bg-[#1a1112] border-r border-stone-800/80 text-stone-200
        rounded-r-3xl overflow-hidden
        flex flex-col h-[100dvh] lg:h-screen select-none shadow-2xl lg:shadow-none
      `}>
        {/* Lapisan Aksen Gambar Batik Kusuma Bangsa Transparan */}
        <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={batikKusumaBangsaBg}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-115 opacity-[0.25] saturate-[0.9] blur-[1px] select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1112]/80 via-[#1a1112]/60 to-[#140d0e]/85" />
        </div>

        <div className="relative z-10 h-[2px] w-full pgri-top-accent shrink-0" />

        {/* Sidebar Header */}
        <div className="relative z-10 px-4 border-b border-stone-800/80 flex items-center justify-between shrink-0 h-16 box-border backdrop-blur-md bg-gradient-to-r from-[#241214]/90 to-[#1a1112]/85">
          <div
            onClick={() => handleTabClick('profil', 'Kepengurusan PGRI')}
            className="flex items-center gap-2.5 group cursor-pointer transition-opacity duration-150 active:scale-95"
            title="Buka Kepengurusan PGRI Ranting Gelang"
          >
            {/* Logo PGRI */}
            <div className="relative flex items-center justify-center shrink-0">
              <div className={`w-11 h-11 flex items-center justify-center text-amber-100 font-bold overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105 ${logoPgri
                  ? 'rounded-full p-0.5 bg-white ring-1 ring-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                  : 'rounded-xl shadow-sm bg-gradient-to-tr from-red-900 to-red-700 ring-1 ring-amber-400/35'
                }`}>
                {logoPgri ? (
                  <img src={logoPgri} alt="Logo PGRI" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="font-display text-xs font-extrabold tracking-tight">PGRI</span>
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col justify-center">
              <h2 className="font-display font-extrabold text-sm tracking-wide leading-none text-stone-100 group-hover:text-amber-300 transition-colors">
                RANTING GELANG
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1 h-1 rounded-full bg-amber-400/80 shrink-0" />
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase leading-none text-amber-400/90">
                  KEC. SUMBERBARU
                </span>
              </div>
            </div>
          </div>

          <div role="button" tabIndex={0}
            onClick={onCloseMobile}
            className="lg:hidden cursor-pointer p-1.5 rounded-lg shrink-0 transition-colors text-stone-400 hover:bg-stone-800 hover:text-stone-100"
            aria-label="Tutup Menu"
          >
            <X size={19} />
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="relative z-10 flex-1 overflow-y-auto pt-3 pb-4 px-3 space-y-4 custom-sidebar-scroll">
          {menuSections.map((section, sIndex) => (
            <div key={sIndex} className={`space-y-1 ${sIndex > 0 ? 'pt-3 border-t border-stone-800/70' : ''}`}>
              <div className="px-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                  {section.title}
                </span>
              </div>

              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const isLocked = Boolean(lockedTabs[item.id]);

                return (
                  <div role="button" tabIndex={0}
                    key={item.id}
                    onClick={() => handleTabClick(item.id, item.label)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTabClick(item.id, item.label);
                      }
                    }}
                    className={`
                      group/item w-full h-10 flex cursor-pointer items-center justify-between px-3 rounded-xl text-sm font-medium relative box-border transition-all duration-200 ease-out active:scale-[0.99]
                      ${isActive
                        ? 'bg-gradient-to-r from-red-900/55 via-red-950/35 to-transparent text-amber-100 font-semibold border border-red-500/20 shadow-sm'
                        : isLocked
                          ? 'text-stone-400/65 hover:bg-white/[0.04] hover:text-stone-200 border border-transparent'
                          : 'text-stone-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Active Indicator Bar */}
                      <span className={`w-1 rounded-full shrink-0 transition-all duration-200 ${isActive
                          ? 'h-5 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.45)] opacity-100'
                          : 'h-1.5 bg-transparent opacity-0 group-hover/item:opacity-50 group-hover/item:bg-stone-500'
                        }`} />

                      {/* Icon */}
                      <div className={`w-5 h-5 flex items-center justify-center shrink-0 transition-all duration-200 group-hover/item:scale-110 ${isActive
                          ? `${item.iconColor} opacity-100`
                          : isLocked
                            ? 'text-stone-500/75 group-hover/item:text-amber-300/75'
                            : 'text-stone-400 group-hover/item:text-amber-300/90'
                        }`}>
                        {item.icon}
                      </div>

                      {/* Label */}
                      <span className="truncate text-left select-none">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center shrink-0">
                      {item.badge && (
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${isActive
                            ? 'bg-amber-400/20 text-amber-200'
                            : 'bg-stone-800 text-stone-400'
                          }`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Padlock Icon */}
                      {(isLocked || canManageLocks) && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canManageLocks) {
                              setPendingLockItem({
                                id: item.id,
                                label: item.label,
                                willLock: !isLocked
                              });
                            } else if (isLocked) {
                              setLockedMenuName(item.label);
                              setShowLockedModal(true);
                            }
                          }}
                          className={`ml-2 p-1 rounded-md transition-all duration-200 ${!canManageLocks
                              ? 'cursor-pointer opacity-85'
                              : 'cursor-pointer hover:bg-white/10 active:scale-95'
                            } ${isLocked
                              ? 'text-rose-400/90'
                              : 'text-emerald-400/60 group-hover/item:text-emerald-400/90'
                            }`}
                          title={isLocked ? (canManageLocks ? "Buka Kunci Menu" : "Menu Terkunci") : "Kunci Menu"}
                        >
                          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pembungkus Menu Pengaturan (Hanya Terlihat untuk Admin Terdaftar di Hak Akses) */}
              {section.title === 'Lainnya' && canSeePengaturan && (
                <div className="pt-0.5">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsPengaturanOpen((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsPengaturanOpen((prev) => !prev);
                      }
                    }}
                    className={`
                      group/item w-full h-10 flex cursor-pointer items-center justify-between px-3 rounded-xl text-sm font-medium relative box-border transition-all duration-200 ease-out active:scale-[0.99]
                      ${activeTab === 'pengaturan'
                        ? 'bg-gradient-to-r from-red-900/55 via-red-950/35 to-transparent text-amber-100 font-semibold border border-red-500/20 shadow-sm'
                        : 'text-stone-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-1 rounded-full shrink-0 transition-all duration-200 ${
                          activeTab === 'pengaturan'
                            ? 'h-5 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.45)] opacity-100'
                            : 'h-1.5 bg-transparent opacity-0 group-hover/item:opacity-50 group-hover/item:bg-stone-500'
                        }`}
                      />
                      <div
                        className={`w-5 h-5 flex items-center justify-center shrink-0 transition-all duration-200 group-hover/item:scale-110 ${
                          activeTab === 'pengaturan'
                            ? 'text-amber-300 opacity-100'
                            : 'text-stone-400 group-hover/item:text-amber-300/90'
                        }`}
                      >
                        <Settings size={18} />
                      </div>
                      <span className="truncate text-left select-none">
                        Pengaturan
                      </span>
                    </div>

                    <ChevronDown
                      size={16}
                      className={`shrink-0 opacity-70 transition-transform duration-200 ${
                        isPengaturanOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>

                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      isPengaturanOpen ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-4 pl-2.5 border-l border-stone-800 space-y-1">
                        {pengaturanSubItems.map((sub) => {
                          const isSubActive = activeTab === 'pengaturan' && pengaturanSubTab === sub.id;
                          return (
                            <div
                              role="button"
                              tabIndex={isPengaturanOpen ? 0 : -1}
                              key={sub.id}
                              onClick={() => {
                                if (onPengaturanSubTabChange) {
                                  onPengaturanSubTabChange(sub.id);
                                }
                                onTabChange('pengaturan');
                                onCloseMobile();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  if (onPengaturanSubTabChange) {
                                    onPengaturanSubTabChange(sub.id);
                                  }
                                  onTabChange('pengaturan');
                                  onCloseMobile();
                                }
                              }}
                              className={`
                                group/sub w-full h-9 flex cursor-pointer items-center gap-2.5 px-2.5 rounded-lg text-xs font-medium relative box-border transition-all duration-200 ease-out
                                ${isSubActive
                                  ? 'bg-gradient-to-r from-red-900/50 to-red-950/30 text-amber-200 font-semibold border border-red-500/20'
                                  : 'text-stone-400 hover:bg-white/[0.06] hover:text-stone-100 border border-transparent'
                                }
                              `}
                            >
                              <div
                                className={`w-4 h-4 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/sub:scale-110 ${
                                  isSubActive ? `${sub.iconColor} opacity-100` : `${sub.iconColor} opacity-75 group-hover/sub:opacity-100`
                                }`}
                              >
                                {sub.icon}
                              </div>
                              <span className="truncate text-left select-none">{sub.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Login / Role Switcher Section */}
        <div className="relative z-10 p-3 px-3.5 border-t border-stone-800/90 bg-[#140d0e]/90 shrink-0" ref={dropdownRef}>
          {/* Menu Dropdown Popup ke Atas */}
          <div
            className={`absolute bottom-full left-3.5 right-3.5 mb-2 rounded-2xl shadow-2xl border p-3 z-50 backdrop-blur-xl bg-[#1f1516]/95 border-stone-700/80 text-stone-100 ring-1 ring-white/10 origin-bottom transition-all duration-200 ease-out ${showUserMenu
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
              }`}
          >
            {/* Header Profil Ringkas */}
            <div
              className={`flex items-center gap-3 p-2.5 rounded-xl mb-2.5 border ${isGuruActive
                  ? 'bg-stone-800/70 border-stone-700/60'
                  : 'bg-red-950/60 border-red-800/50'
                }`}
            >
              <div
                className={`w-9 h-9 flex items-center justify-center font-bold overflow-hidden shrink-0 ring-1 ${logoPgri
                    ? 'rounded-full ring-amber-400/35'
                    : isGuruActive
                      ? 'rounded-lg bg-stone-700 text-amber-200 ring-stone-600'
                      : 'rounded-lg bg-red-900 text-amber-200 ring-amber-400/50'
                  }`}
              >
                {logoPgri ? (
                  <img
                    src={logoPgri}
                    alt="Logo PGRI"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate text-stone-100">
                  {currentUser.name}
                </p>
                <p className="text-[11px] truncate text-stone-400">
                  {currentUser.school}
                </p>
              </div>
            </div>

            {/* Mode Akses Selector List */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 px-2 py-0.5">
                PILIH MODE AKSES:
              </p>

              {/* Option 1: Guru */}
              <div role="button" tabIndex={showUserMenu ? 0 : -1}
                onClick={handleSelectGuru}
                className={`${showUserMenu ? 'animate-stagger-1' : ''} group/role-opt w-full flex cursor-pointer items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${isGuruActive
                    ? 'bg-stone-700 text-white shadow-sm'
                    : 'text-stone-300 hover:bg-white/[0.06]'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${isGuruActive
                        ? 'bg-white/15 text-amber-200'
                        : 'bg-stone-800 text-stone-300'
                      }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Akses Semua Guru</span>
                </div>
                {isGuruActive && <Check className="w-4 h-4 text-amber-300 animate-fade-in" />}
              </div>

              {/* Option 2: Pengurus PGRI */}
              <div role="button" tabIndex={showUserMenu ? 0 : -1}
                onClick={() => {
                  setShowUserMenu(false);
                  if (!isAdminActive) {
                    setShowAdminModal(true);
                  }
                }}
                className={`${showUserMenu ? 'animate-stagger-2' : ''} group/role-opt w-full flex cursor-pointer items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${isAdminActive
                    ? 'bg-red-800 text-white shadow-sm'
                    : 'text-stone-300 hover:bg-white/[0.06]'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${isAdminActive
                        ? 'bg-white/15 text-amber-200'
                        : 'bg-red-950 text-amber-400'
                      }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <span>Akses Pengurus</span>
                </div>
                {isAdminActive && <Check className="w-4 h-4 text-amber-300 animate-fade-in" />}
              </div>
            </div>
          </div>

          {/* Trigger Button di Bagian Bawah Sidebar */}
          <div role="button" tabIndex={0}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`group/trigger w-full flex cursor-pointer items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 active:scale-[0.99] ${isGuruActive
                ? 'bg-white/[0.04] border-white/[0.08] text-stone-200 hover:bg-white/[0.08]'
                : 'bg-white/[0.04] border-white/[0.10] text-stone-100 hover:bg-white/[0.08] hover:border-amber-400/25'
              }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div
                  className={`w-8 h-8 flex items-center justify-center text-white shadow-sm overflow-hidden transition-transform duration-200 group-hover/trigger:scale-105 ${logoPgri
                      ? 'rounded-full ring-1 ring-amber-400/35'
                      : isGuruActive
                        ? 'rounded-lg bg-stone-700'
                        : 'rounded-lg bg-red-800 ring-1 ring-amber-400/40'
                    }`}
                >
                  {logoPgri ? (
                    <img
                      src={logoPgri}
                      alt="Logo PGRI"
                      className="w-full h-full object-cover"
                    />
                  ) : isGuruActive ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                </div>
              </div>

              <div className="text-left min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Status Akses</p>
                <p className={`text-xs font-bold truncate ${isGuruActive ? 'text-stone-200' : 'text-amber-300'}`}>
                  {isGuruActive ? 'Semua Guru' : PENGURUS_ROLE_LABELS[pengurusRole] || 'Pengurus PGRI'}
                </p>
              </div>
            </div>

            <ChevronDown
              className={`w-4 h-4 opacity-70 shrink-0 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : 'rotate-0'
                }`}
            />
          </div>
        </div>
      </aside>

      {/* Modal Konfirmasi Beralih ke Hak Akses Guru */}
      {showConfirmGuruModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-md animate-fade-in"
          onClick={() => setShowConfirmGuruModal(false)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border animate-modal-enter ${isDark
                ? 'bg-stone-900 border-stone-800 text-stone-100'
                : 'bg-white border-stone-200 text-stone-800'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base">Konfirmasi Akses</h3>
                <p className="text-xs text-stone-400">Peralihan Hak Akses Akun</p>
              </div>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-stone-500 dark:text-stone-300 leading-relaxed">
              Apakah Anda yakin ingin keluar dari mode <strong>Pengurus PGRI</strong> ({PENGURUS_ROLE_LABELS[pengurusRole]}) dan beralih kembali ke mode <strong>Akses Semua Guru</strong>?
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div role="button" tabIndex={0}
                onClick={() => setShowConfirmGuruModal(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border text-center cursor-pointer transition-colors ${isDark
                    ? 'border-stone-700 hover:bg-stone-800 text-stone-300'
                    : 'border-stone-200 hover:bg-stone-100 text-stone-700'
                  }`}
              >
                Batal
              </div>
              <div role="button" tabIndex={0}
                onClick={handleConfirmSwitchToGuru}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-800 hover:bg-red-700 shadow-sm text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Ya, Keluar</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Login Pengurus PGRI (Firebase Google Auth + RBAC) */}
      {showAdminModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-md animate-fade-in"
          onClick={handleCloseAdminModal}
        >
          <div
            className={`w-full max-w-sm rounded-2xl p-1 shadow-2xl border animate-modal-enter ${isShaking ? 'animate-shake ring-2 ring-red-500/40 border-red-500/50' : 'border-transparent'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-full h-full rounded-2xl overflow-hidden ${isDark
                ? 'bg-stone-900 border border-stone-800 text-stone-100'
                : 'bg-white border border-stone-200 text-stone-800'
              }`}>
              <div className="h-[3px] w-full pgri-top-accent" />
              <div className={`flex items-center justify-between p-6 pb-4 border-b ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${isDark ? 'bg-red-950/60 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base">Login Pengurus PGRI</h3>
                    <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Verifikasi Akun Google & Hak Akses RBAC</p>
                  </div>
                </div>
                <div role="button" tabIndex={0}
                  onClick={handleCloseAdminModal}
                  className={`p-1 rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <X className="w-5 h-5" />
                </div>
              </div>

              <div className="p-6 pt-4 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold animate-fade-in">
                    {error}
                  </div>
                )}

                <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${isDark ? 'bg-stone-800/70 border-stone-700/80 text-stone-300' : 'bg-[#faf8f5] border-stone-200 text-stone-600'}`}>
                  <p className="font-bold text-red-800 dark:text-amber-400">Pembagian Hak Akses Pengurus:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li><strong>Ketua</strong>: Akses penuh & penetapan peran pengurus</li>
                    <li><strong>Sekretaris</strong>: Anggota, E-Office/Undangan, Jadwal</li>
                    <li><strong>Bendahara</strong>: Catatan Keuangan, Kontribusi &amp; Dana Sosial</li>
                    <li><strong>Pengurus Seksi</strong>: Program Kerja, Jadwal & Pengumuman</li>
                  </ul>
                </div>

                {authEmail && (
                  <p className="text-[11px] text-center text-emerald-500 font-semibold">
                    Sesi Google aktif: {authEmail}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGooglePengurusLogin}
                  disabled={isLoggingIn}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-800 hover:bg-red-700 shadow-sm cursor-pointer border-none transition-colors active:scale-[0.98] disabled:opacity-75 disabled:cursor-wait flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Memverifikasi Akun Pengurus...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Masuk dengan Akun Google Pengurus</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-stone-400 text-center leading-relaxed">
                  Keamanan ditingkatkan menggunakan Firebase Auth. Ketua dapat menambahkan email Sekretaris, Bendahara, dan Pengurus Seksi di menu <strong>Pengaturan</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Menu Terkunci */}
      {showLockedModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowLockedModal(false)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border animate-modal-enter ${isDark
                ? 'bg-stone-900 border-stone-800 text-stone-100'
                : 'bg-white border-stone-200 text-stone-800'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base">Menu Terkunci</h3>
                <p className="text-xs text-stone-400">Akses Dibatasi</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-300 leading-relaxed">
              Maaf, menu <strong className="text-red-700 dark:text-amber-400">{lockedMenuName}</strong> sedang dikunci. Anda tidak memiliki akses untuk membuka menu ini.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLockedModal(false)}
                className="py-2.5 px-6 rounded-xl text-sm font-bold text-white bg-red-800 hover:bg-red-700 shadow-sm transition-colors active:scale-95 cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Buka/Tutup Gembok (Lock/Unlock) */}
      {pendingLockItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-md animate-fade-in"
          onClick={() => setPendingLockItem(null)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border animate-modal-enter ${isDark
                ? 'bg-stone-900 border-stone-800 text-stone-100'
                : 'bg-white border-stone-200 text-stone-800'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
              <div className={`p-2.5 rounded-xl ring-1 ${pendingLockItem.willLock
                  ? 'bg-red-500/10 text-red-700 dark:text-red-400 ring-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'
                }`}>
                {pendingLockItem.willLock ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-display font-bold text-base">
                  {pendingLockItem.willLock ? 'Konfirmasi Kunci Menu' : 'Konfirmasi Buka Kunci'}
                </h3>
                <p className="text-xs text-stone-400">Pengaturan Akses Menu</p>
              </div>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-stone-500 dark:text-stone-300 leading-relaxed">
              {pendingLockItem.willLock ? (
                <>
                  Apakah Anda yakin ingin <strong>mengunci</strong> menu <strong className="text-red-700 dark:text-amber-400">{pendingLockItem.label}</strong>? Menu ini tidak akan dapat diakses oleh Guru/Pengguna umum saat terkunci.
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin <strong>membuka kunci</strong> menu <strong className="text-emerald-600 dark:text-emerald-400">{pendingLockItem.label}</strong>? Seluruh pengguna akan dapat mengakses menu ini kembali.
                </>
              )}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setPendingLockItem(null)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border text-center cursor-pointer transition-colors ${isDark
                    ? 'border-stone-700 hover:bg-stone-800 text-stone-300'
                    : 'border-stone-200 hover:bg-stone-100 text-stone-700'
                  }`}
              >
                Batal
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  toggleLock(pendingLockItem.id);
                  setPendingLockItem(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm text-center cursor-pointer transition-colors ${pendingLockItem.willLock
                    ? 'bg-red-800 hover:bg-red-700'
                    : 'bg-emerald-700 hover:bg-emerald-600'
                  }`}
              >
                {pendingLockItem.willLock ? 'Ya, Kunci' : 'Ya, Buka Kunci'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
