import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Menu, RefreshCw, Check } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentDate: string;
  onDateChange?: (newDate: string) => void;
  currentUser?: { name: string; school: string; role: string };
  onSync?: () => void;
  isSyncing?: boolean;
  onToggleMobileSidebar: () => void;
  activeRole?: 'guru' | 'admin';
  onChangeRole?: (role: 'guru' | 'admin') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onToggleMobileSidebar,
  theme = 'light',
  onToggleTheme,
  onSync,
  isSyncing,
}) => {
  const [syncSuccess, setSyncSuccess] = useState(false);
  const prevSyncingRef = useRef<boolean | undefined>(isSyncing);
  const [logoKombel, setLogoKombel] = useState<string | null>(() => 
    typeof window !== 'undefined' ? (localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel')) : null
  );

  // Ambil logo PGRI dari localStorage serta dengarkan perubahan saat Sync Cloud / simpan pengaturan
  useEffect(() => {
    let isMounted = true;

    const syncLocalLogo = () => {
      const saved = localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel');
      if (saved && isMounted) {
        setLogoKombel(saved);
      }
    };

    syncLocalLogo();

    window.addEventListener('storage', syncLocalLogo);
    window.addEventListener('kombel-settings-updated', syncLocalLogo);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncLocalLogo);
      window.removeEventListener('kombel-settings-updated', syncLocalLogo);
    };
  }, [isSyncing]);

  // Feedback animasi sukses sinkronisasi
  useEffect(() => {
    if (prevSyncingRef.current === true && !isSyncing) {
      setSyncSuccess(true);
      const timer = setTimeout(() => setSyncSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing]);

  return (
    <header
      className={`w-full flex items-center justify-between px-4 lg:px-8 py-3 backdrop-blur-md sticky top-0 z-30 border-b transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-stone-950/90 border-stone-800/80 text-stone-100'
          : 'bg-[#fdfcfa]/90 border-stone-200/80 text-stone-800 shadow-[0_2px_12px_-4px_rgba(28,25,23,0.06)]'
      }`}
    >
      <div className="absolute top-0 inset-x-0 h-[2px] pgri-top-accent pointer-events-none" />

      {/* Mobile Toggle & App Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className={`lg:hidden p-2 rounded-xl border active:scale-95 transition-colors group cursor-pointer ${
            theme === 'dark'
              ? 'bg-stone-900 border-stone-800 text-stone-200 hover:bg-stone-800'
              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden flex items-center gap-2.5">
          {logoKombel ? (
            <img
              src={logoKombel}
              alt="Logo PGRI"
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-red-800/30 shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-900 to-red-700 flex items-center justify-center text-amber-100 font-bold text-[10px] shadow-sm">
              PGRI
            </div>
          )}
          <div>
            <h1 className={`font-display text-xs font-extrabold tracking-tight leading-tight ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'}`}>
              PGRI GELANG
            </h1>
            <p className="text-[10px] text-red-800 dark:text-amber-400 font-bold tracking-wider uppercase">SUMBERBARU</p>
          </div>
        </div>
      </div>

      {/* Right Tools: Date Display, Sync Button, & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3.5 ml-auto">
        {/* Institutional Date Display (Hidden on mobile) */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-medium text-xs sm:text-sm transition-colors ${
            theme === 'dark'
              ? 'bg-stone-900 border-stone-800 text-stone-300'
              : 'bg-white border-stone-200/90 text-stone-700'
          }`}
        >
          <Calendar className="w-4 h-4 text-red-800 dark:text-amber-400 shrink-0" />
          <span className="font-medium">{currentDate}</span>
        </div>

        {/* Sync Button (Aktif di mobile & desktop) */}
        <button
          onClick={() => onSync && onSync()}
          disabled={isSyncing}
          className={`flex px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            syncSuccess
              ? 'bg-emerald-700 text-white shadow-sm'
              : theme === 'dark'
              ? 'bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/70 border border-emerald-800/60'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90 border border-emerald-200/90'
          }`}
          title="Sync Data dengan Server"
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <RefreshCw
              className={`w-4 h-4 absolute transition-all duration-300 ${
                isSyncing ? 'animate-spin opacity-100' : syncSuccess ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
              }`}
            />
            <Check
              className={`w-4 h-4 absolute transition-all duration-300 text-white ${
                syncSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
            />
          </div>
          <span className="hidden sm:inline text-xs font-bold tracking-wide">
            {syncSuccess ? 'Tersinkron' : 'Sync Cloud'}
          </span>
        </button>

        {/* Tombol Pasang PWA */}
        <PWAInstallButton theme={theme} />

        {/* Theme Switch Toggle Button */}
        <ThemeToggle theme={theme} onToggle={() => onToggleTheme && onToggleTheme()} />
      </div>
    </header>
  );
};