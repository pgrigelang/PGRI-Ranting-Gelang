import React from 'react';
import {
  Home,
  Info,
  Users,
  ClipboardList,
  Calendar,
  Wallet,
  HeartHandshake,
  Bell,
  FileText,
  Phone,
  Image as ImageIcon,
  Building2,
  ShieldCheck,
  Database,
  Settings
} from 'lucide-react';
import { ActiveTab, PengaturanSubTab } from '../types';

interface MenuTransitionCurtainProps {
  activeTab: ActiveTab;
  pengaturanSubTab?: PengaturanSubTab;
  phase: 'intro' | 'revealing' | 'done';
  theme: 'light' | 'dark';
}

interface MenuMeta {
  category: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const PENGATURAN_META: Record<PengaturanSubTab, MenuMeta> = {
  logo: {
    category: 'Pengaturan Sistem',
    title: 'Membuka Pengaturan Logo...',
    subtitle: 'Menyiapkan identitas visual & logo resmi PGRI Ranting Gelang',
    icon: <ImageIcon className="w-6 h-6" />
  },
  pengurus: {
    category: 'Pengaturan Sistem',
    title: 'Membuka Pengaturan Pengurus...',
    subtitle: 'Menyiapkan data penandatangan & susunan kepengurusan',
    icon: <Users className="w-6 h-6" />
  },
  organisasi: {
    category: 'Pengaturan Sistem',
    title: 'Membuka Konfigurasi Organisasi...',
    subtitle: 'Menyiapkan profil wilayah, sekretariat & identitas ranting',
    icon: <Building2 className="w-6 h-6" />
  },
  'hak-akses': {
    category: 'Pengaturan Sistem',
    title: 'Membuka Manajemen Hak Akses...',
    subtitle: 'Menyiapkan peran pengurus, kunci menu & riwayat aktivitas',
    icon: <ShieldCheck className="w-6 h-6" />
  },
  data: {
    category: 'Pengaturan Sistem',
    title: 'Membuka Manajemen Data...',
    subtitle: 'Menyiapkan backup, restore & pemantauan kapasitas penyimpanan',
    icon: <Database className="w-6 h-6" />
  }
};

const MENU_META: Record<ActiveTab, MenuMeta> = {
  beranda: {
    category: 'Portal Utama',
    title: 'Membuka Beranda...',
    subtitle: 'Menyiapkan ringkasan statistik, agenda & layanan PGRI Ranting Gelang',
    icon: <Home className="w-6 h-6" />
  },
  profil: {
    category: 'Profil Organisasi',
    title: 'Membuka Kepengurusan PGRI...',
    subtitle: 'Menyiapkan struktur pengurus, visi & misi Ranting Gelang',
    icon: <Info className="w-6 h-6" />
  },
  anggota: {
    category: 'Database Anggota',
    title: 'Membuka Daftar Anggota...',
    subtitle: 'Menyiapkan direktori anggota, E-KTA & statistik pendidik',
    icon: <Users className="w-6 h-6" />
  },
  proker: {
    category: 'Perencanaan',
    title: 'Membuka Program Kerja...',
    subtitle: 'Menyiapkan daftar program kerja & capaian organisasi',
    icon: <ClipboardList className="w-6 h-6" />
  },
  jadwal: {
    category: 'Agenda & Presensi',
    title: 'Membuka Jadwal Kegiatan...',
    subtitle: 'Menyiapkan kalender agenda, daftar hadir & laporan kegiatan',
    icon: <Calendar className="w-6 h-6" />
  },
  keuangan: {
    category: 'Kas & Kontribusi',
    title: 'Membuka Catatan Keuangan...',
    subtitle: 'Menyiapkan pembukuan kas, kontribusi anggota & rekap dana',
    icon: <Wallet className="w-6 h-6" />
  },
  sosial: {
    category: 'Kepedulian & Aspirasi',
    title: 'Membuka Dana Aspirasi...',
    subtitle: 'Menyiapkan penyaluran dana sosial & kotak aspirasi anggota',
    icon: <HeartHandshake className="w-6 h-6" />
  },
  dokumen: {
    category: 'Informasi Resmi',
    title: 'Membuka Pengumuman...',
    subtitle: 'Menyiapkan pengumuman resmi & informasi organisasi',
    icon: <Bell className="w-6 h-6" />
  },
  galeri: {
    category: 'Dokumentasi',
    title: 'Membuka Galeri Kegiatan...',
    subtitle: 'Menyiapkan dokumentasi foto & arsip kegiatan organisasi',
    icon: <ImageIcon className="w-6 h-6" />
  },
  undangan: {
    category: 'Administrasi Surat',
    title: 'Membuka Buat Undangan...',
    subtitle: 'Menyiapkan surat undangan, agenda surat & notulen rapat',
    icon: <FileText className="w-6 h-6" />
  },
  kontak: {
    category: 'Pusat Bantuan',
    title: 'Membuka Layanan Informasi...',
    subtitle: 'Menyiapkan informasi sekretariat, kontak pengurus & masukan',
    icon: <Phone className="w-6 h-6" />
  },
  pengaturan: {
    category: 'Pengaturan Sistem',
    title: 'Membuka Pengaturan...',
    subtitle: 'Menyiapkan konfigurasi sistem & manajemen data aplikasi',
    icon: <Settings className="w-6 h-6" />
  }
};

export const MenuTransitionCurtain: React.FC<MenuTransitionCurtainProps> = ({
  activeTab,
  pengaturanSubTab,
  phase,
  theme
}) => {
  if (phase === 'done') return null;

  const isDark = theme === 'dark';
  const meta =
    activeTab === 'pengaturan' && pengaturanSubTab && PENGATURAN_META[pengaturanSubTab]
      ? PENGATURAN_META[pengaturanSubTab]
      : MENU_META[activeTab] || MENU_META.beranda;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-x-0 top-0 z-30 flex flex-col items-center justify-start pt-10 sm:pt-16 px-4 sm:px-6 lg:px-8 pointer-events-none ${
        phase === 'revealing' ? 'menu-curtain-exit' : ''
      }`}
    >
      {/* Garis Progres Cahaya Marun-Emas di Tepi Atas */}
      <div className="w-full h-[3px] rounded-full overflow-hidden mb-8 bg-stone-200/50 dark:bg-stone-800/60">
        <div className="w-full h-full pgri-top-accent menu-top-sweep" />
      </div>

      {/* Kartu Tirai Pembuka Kontekstual */}
      <div
        className={`relative w-full max-w-md rounded-2xl p-6 sm:p-7 border shadow-2xl text-center overflow-hidden menu-curtain-enter ${
          isDark
            ? 'bg-stone-900/95 border-red-900/50 text-stone-100 shadow-black/60 pgri-batik-pattern-dark'
            : 'bg-[#fcfbf9]/95 border-stone-200/95 text-stone-900 shadow-stone-900/15 pgri-batik-pattern'
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent" />
        <div
          className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center border mb-3.5 shadow-sm ${
            isDark
              ? 'bg-red-950/80 border-amber-500/35 text-amber-400'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {meta.icon}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-800 dark:text-amber-400">
          {meta.category}
        </p>
        <h2
          className={`font-display text-lg sm:text-xl font-extrabold tracking-tight mt-1 ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}
        >
          {meta.title}
        </h2>
        <p className={`text-xs font-medium mt-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
          {meta.subtitle}
        </p>
        <div
          className={`mt-4 w-full h-1 rounded-full overflow-hidden ${
            isDark ? 'bg-stone-800' : 'bg-stone-200'
          }`}
        >
          <div className="w-1/2 h-full pgri-top-accent rounded-full menu-wipe-bar" />
        </div>
      </div>
    </div>
  );
};
