import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  theme?: 'light' | 'dark';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ theme = 'light' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
          theme === 'dark'
            ? 'bg-red-900/25 text-amber-300 hover:bg-red-900/40 border-red-800/50'
            : 'bg-red-50 text-red-800 hover:bg-red-100 border-red-200'
        }`}
        title="Pasang Aplikasi PGRI Gelang di Layar Utama HP"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className="hidden md:inline">Pasang Aplikasi</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
            theme === 'dark'
              ? 'bg-red-900/25 text-amber-300 hover:bg-red-900/40 border-red-800/50'
              : 'bg-red-50 text-red-800 hover:bg-red-100 border-red-200'
          }`}
          title="Panduan Pasang Aplikasi di iPhone / iPad"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Pasang iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/65 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${
                theme === 'dark'
                  ? 'bg-stone-900 border-stone-700 text-stone-100'
                  : 'bg-white border-stone-200 text-stone-800'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base">Pasang di iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs leading-relaxed text-stone-500 dark:text-stone-300 list-decimal pl-4">
                <li>
                  Ketuk tombol <strong>Bagikan (Share)</strong> pada bilah Safari di bagian bawah layar.
                </li>
                <li>
                  Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                </li>
                <li>
                  Ketuk <strong>Tambah</strong> untuk memasang aplikasi PGRI Ranting Gelang.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
