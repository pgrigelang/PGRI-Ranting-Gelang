import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  ChevronRight, 
  Star, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Cpu, 
  ExternalLink, 
  UserX, 
  CheckCircle2, 
  User, 
  UserCheck,
  Award,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { ActiveTab, ActivityEvent, Teacher, Material, CashPayment, AttendanceRecord } from '../../types';

interface BerandaViewProps {
  onNavigate: (tab: ActiveTab) => void;
  events: ActivityEvent[];
  announcements?: any[];
  onOpenAttendance: (event: ActivityEvent) => void;
  theme?: 'light' | 'dark';
  teachers?: Teacher[];
  materials?: Material[];
  forumPosts?: any[];
  discussions?: any[];
  totalDiscussionCount?: number;
  cashPayments?: CashPayment[];
  attendanceList?: AttendanceRecord[];
  activeRole?: 'guru' | 'admin';
  isEntryReady?: boolean;
}

// Data sampel cadangan jika props dari App.tsx belum terhubung
const DEFAULT_TEACHERS_SAMPLE: Partial<Teacher>[] = [
  { id: 't1', name: 'Adi Saiful Rizal, S.Pd', nip: '198905202022211005', gender: 'L', school: 'SDN GELANG 03', role: 'Anggota Aktif' },
  { id: 't2', name: 'Siti Nurul, S.Pd', nip: '199104122023212008', gender: 'P', school: 'SDN GELANG 01', role: 'Anggota Aktif' },
  { id: 't3', name: 'Dwi Rahayu, S.Pd', nip: '198703152020122004', gender: 'P', school: 'SDN GELANG 02', role: 'Anggota Aktif' },
  { id: 't4', name: 'Budi Santoso, S.Pd', nip: '198506102019031002', gender: 'L', school: 'SDN JAMBESARI 01', role: 'Anggota Aktif' },
  { id: 't5', name: 'Ahmad Fauzi, S.Pd', nip: '199308252024211003', gender: 'L', school: 'SDN JATIROTO 01', role: 'Anggota Aktif' },
];

const DEFAULT_MATERIALS_SAMPLE: Partial<Material>[] = [
  { id: 'm1', title: 'Panduan Organisasi PGRI Ranting' },
  { id: 'm2', title: 'Agenda Kerja PGRI Ranting Gelang' },
  { id: 'm3', title: 'Tata Tertib Rapat Anggota' },
];

const useCountUp = (target: number, duration = 500, isActive = true): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startValue + (target - startValue) * easeOut));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration, isActive]);

  return count;
};

export const BerandaView: React.FC<BerandaViewProps> = ({
  onNavigate,
  events = [],
  onOpenAttendance,
  theme = 'light',
  teachers,
  materials,
  forumPosts,
  discussions,
  totalDiscussionCount,
  cashPayments,
  attendanceList,
  isEntryReady = true
}) => {
  const isLight = theme === 'light';
  const bannerRef = useRef<HTMLDivElement>(null);

  // State Sinkronisasi Data Real-Time
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [expiredEventAlert, setExpiredEventAlert] = useState<ActivityEvent | null>(null);
  const [logoKombel, setLogoKombel] = useState<string | null>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel')) : null
  );

  useEffect(() => {
    const syncLogoKombel = () => {
      setLogoKombel(localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel'));
    };
    syncLogoKombel();
    window.addEventListener('storage', syncLogoKombel);
    window.addEventListener('kombel-settings-updated', syncLogoKombel);
    return () => {
      window.removeEventListener('storage', syncLogoKombel);
      window.removeEventListener('kombel-settings-updated', syncLogoKombel);
    };
  }, []);
  
  const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>(() => {
    if (attendanceList && attendanceList.length > 0) return attendanceList;
    try {
      const saved = localStorage.getItem('kombel-attendance') || localStorage.getItem('kombel-attendance-list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [localCashPayments, setLocalCashPayments] = useState<CashPayment[]>(() => {
    if (cashPayments && cashPayments.length > 0) return cashPayments;
    try {
      const saved = localStorage.getItem('kombel-cashPayments') || localStorage.getItem('kombel-cash-payments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sinkronisasi Data via event storage (tanpa JSON.parse berulang tiap detik) & live clock
  useEffect(() => {
    const syncLocalData = () => {
      try {
        const savedAtt = localStorage.getItem('kombel-attendance') || localStorage.getItem('kombel-attendance-list');
        if (savedAtt) setLocalAttendance(JSON.parse(savedAtt));

        const savedCash = localStorage.getItem('kombel-cashPayments') || localStorage.getItem('kombel-cash-payments');
        if (savedCash) setLocalCashPayments(JSON.parse(savedCash));
      } catch (e) {
        console.warn("Gagal melakukan sync storage", e);
      }
    };

    syncLocalData();
    window.addEventListener('storage', syncLocalData);
    window.addEventListener('kombel-settings-updated', syncLocalData);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', syncLocalData);
      window.removeEventListener('kombel-settings-updated', syncLocalData);
    };
  }, []);

  // Helper konversi tanggal event ke objek Date untuk sorting & komparasi
  const getEventDateObj = (evt: ActivityEvent): Date => {
    let year = currentTime.getFullYear();
    let month = currentTime.getMonth();
    let day = currentTime.getDate();

    const dateStr = (evt.fullDate || evt.date || '').toLowerCase();

    const matchYear = dateStr.match(/\b(20\d{2})\b/);
    if (matchYear) year = parseInt(matchYear[1], 10);

    const matchDay = dateStr.match(/\b(\d{1,2})\b/);
    if (matchDay) day = parseInt(matchDay[1], 10);

    const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
    const mIndex = months.findIndex(m => dateStr.includes(m));
    if (mIndex !== -1) {
      month = mIndex;
    } else {
      const dateParts = dateStr.split(/[-/]/);
      if (dateParts.length >= 2) {
        if (dateParts[0].length === 4) {
          year = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10) - 1;
          day = parseInt(dateParts[2], 10);
        } else {
          day = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10) - 1;
          if (dateParts.length === 3) year = parseInt(dateParts[2], 10);
        }
      }
    }

    return new Date(year, month, day);
  };

  // Helper mendapatkan waktu mulai kegiatan (Start Time)
  const getEventStartDateTime = (evt: ActivityEvent): Date | null => {
    if (!evt) return null;

    let year = currentTime.getFullYear();
    let month = currentTime.getMonth();
    let day = currentTime.getDate();

    const dateStr = (evt.fullDate || evt.date || '').toLowerCase();

    const matchYear = dateStr.match(/\b(20\d{2})\b/);
    if (matchYear) year = parseInt(matchYear[1], 10);

    const matchDay = dateStr.match(/\b(\d{1,2})\b/);
    if (matchDay) day = parseInt(matchDay[1], 10);

    const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
    const mIndex = months.findIndex(m => dateStr.includes(m));
    if (mIndex !== -1) month = mIndex;
    else {
      const dateParts = dateStr.split(/[-/]/);
      if (dateParts.length >= 2) {
        if (dateParts[0].length === 4) {
          year = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10) - 1;
          day = parseInt(dateParts[2], 10);
        } else {
          day = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10) - 1;
          if (dateParts.length === 3) year = parseInt(dateParts[2], 10);
        }
      }
    }

    let hours = 0;
    let minutes = 0;
    if (evt.time) {
      const timeMatches = Array.from(String(evt.time).matchAll(/(\d{1,2})[:.](\d{2})/g));
      if (timeMatches.length > 0) {
        hours = parseInt(timeMatches[0][1], 10);
        minutes = parseInt(timeMatches[0][2], 10);
      }
    }

    const startDate = new Date(year, month, day, hours, minutes, 0);
    return isNaN(startDate.getTime()) ? null : startDate;
  };

  // Helper mendapatkan batas waktu selesai kegiatan (End Time)
  const getEventEndDateTime = (evt: ActivityEvent): Date | null => {
    if (!evt) return null;

    let year = currentTime.getFullYear();
    let month = currentTime.getMonth();
    let day = currentTime.getDate();

    const dateStr = (evt.fullDate || evt.date || '').toLowerCase();

    const matchYear = dateStr.match(/\b(20\d{2})\b/);
    if (matchYear) year = parseInt(matchYear[1], 10);

    const matchDay = dateStr.match(/\b(\d{1,2})\b/);
    if (matchDay) day = parseInt(matchDay[1], 10);

    const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
    const mIndex = months.findIndex(m => dateStr.includes(m));
    if (mIndex !== -1) month = mIndex;
    else {
      const dateParts = dateStr.split(/[-/]/);
      if (dateParts.length >= 2) {
        if (dateParts[0].length === 4) {
          year = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10) - 1;
          day = parseInt(dateParts[2], 10);
        } else {
          day = parseInt(dateParts[0], 10);
          month = parseInt(dateParts[1], 10) - 1;
          if (dateParts.length === 3) year = parseInt(dateParts[2], 10);
        }
      }
    }

    let hours = 23;
    let minutes = 59;
    if (evt.time) {
      const tLow = String(evt.time).toLowerCase();
      if (tLow.includes('selesai')) {
        hours = 23;
        minutes = 59;
      } else {
        const timeMatches = Array.from(String(evt.time).matchAll(/(\d{1,2})[:.](\d{2})/g));
        if (timeMatches.length > 1) {
          const lastMatch = timeMatches[timeMatches.length - 1];
          hours = parseInt(lastMatch[1], 10);
          minutes = parseInt(lastMatch[2], 10);
        } else if (timeMatches.length === 1) {
          hours = 23;
          minutes = 59;
        }
      }
    }

    const endDate = new Date(year, month, day, hours, minutes, 0);
    return isNaN(endDate.getTime()) ? null : endDate;
  };

  // Helper status dan countdown kegiatan
  const getEventCountdownOrStatus = (evt: ActivityEvent) => {
    const start = getEventStartDateTime(evt);
    const end = getEventEndDateTime(evt);
    const now = currentTime.getTime();

    if (end && now > end.getTime()) {
      return { text: 'Sudah Selesai', isFinished: true, isOngoing: false, isCountdown: false };
    }

    if (start && now >= start.getTime() && (!end || now <= end.getTime())) {
      return { text: 'Sedang berlangsung', isFinished: false, isOngoing: true, isCountdown: false };
    }

    if (start && now < start.getTime()) {
      const diff = start.getTime() - now;
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n: number) => String(n).padStart(2, '0');
      return { 
        h: pad(hours),
        m: pad(minutes),
        s: pad(seconds),
        text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, 
        isFinished: false, 
        isOngoing: false, 
        isCountdown: true
      };
    }

    return { text: 'Sudah Selesai', isFinished: true, isOngoing: false, isCountdown: false };
  };

  // Handler klik Absen dengan validasi batas waktu
  const handleAttendanceClick = (evt: ActivityEvent) => {
    const eventEnd = getEventEndDateTime(evt);
    const now = new Date();

    if (eventEnd && now.getTime() > eventEnd.getTime()) {
      setExpiredEventAlert(evt);
      return;
    }

    onOpenAttendance(evt);
  };

  // Helper gender
  const getTeacherGender = (t: Partial<Teacher> & Record<string, any>): 'L' | 'P' => {
    if (!t) return 'L';
    if (t.gender) return t.gender;
    const femaleNames = ['Siti', 'Rina', 'Dewi', 'Sri', 'Nurul', 'Fitriani', 'Lilik', 'Maya', 'Anisa', 'Yulia', 'Titin', 'Dwi', 'Neni', 'Ratna', 'Ika', 'Indah'];
    return femaleNames.some(n => t.name && t.name.includes(n)) ? 'P' : 'L';
  };

  // Data Terkini yang disinkronisasi
  const effectiveTeachers = (teachers && teachers.length > 0) ? teachers : (DEFAULT_TEACHERS_SAMPLE as Teacher[]);
  const effectiveAttendanceList = (attendanceList && attendanceList.length > 0) ? attendanceList : localAttendance;
  const effectiveCashPayments = (cashPayments && cashPayments.length > 0) ? cashPayments : localCashPayments;

  // Helper status keaktifan anggota
  const isMemberActive = (t: Partial<Teacher> & Record<string, any>): boolean => {
    if (!t) return false;
    if (t.isActive !== undefined) return Boolean(t.isActive);
    if (t.activeStatus !== undefined) return t.activeStatus === 'Aktif' || t.activeStatus === true;
    if (t.status !== undefined) return t.status === 'Aktif' || t.status === 'active';
    return true;
  };

  // FILTER GLOBAL UNTUK MENGAMBIL ANGGOTA AKTIF SAJA
  const activeTeachersList = effectiveTeachers.filter(isMemberActive);

  // 1. Hitung jumlah anggota aktif
  const activeTeachersCount = activeTeachersList.length;

  // 2. Hitung jumlah anggota Laki-laki dan Perempuan dari anggota AKTIF
  const maleCount = activeTeachersList.filter(t => getTeacherGender(t) === 'L').length;
  const femaleCount = activeTeachersList.filter(t => getTeacherGender(t) === 'P').length;

  // 3. Hitung jumlah seluruh kegiatan
  const totalEventsCount = events.length;

  // Pengurutan Agenda Kegiatan Berdasarkan Tanggal Terbaru
  const sortedEvents = useMemo(() => {
    return [...(events || [])].sort((a, b) => {
      const timeA = getEventDateObj(a).getTime();
      const timeB = getEventDateObj(b).getTime();
      return timeB - timeA;
    });
  }, [events]);

  // State untuk filter jadwal pada kotak Kehadiran
  const [selectedAttendanceEventId, setSelectedAttendanceEventId] = useState<string>('');

  useEffect(() => {
    if (sortedEvents.length > 0) {
      if (!selectedAttendanceEventId || !sortedEvents.some(e => e.id === selectedAttendanceEventId)) {
        setSelectedAttendanceEventId(sortedEvents[0].id);
      }
    } else {
      setSelectedAttendanceEventId('');
    }
  }, [sortedEvents, selectedAttendanceEventId]);

  // Helper menghitung berapa kegiatan yang belum dibayar oleh anggota
  const getTeacherUnpaidCount = (teacherId: string): number => {
    if (!events || events.length === 0) {
      const payment = effectiveCashPayments.find(cp => cp.teacherId === teacherId);
      return payment?.status === 'Lunas' ? 0 : 1;
    }
    return events.filter(evt => {
      const payment = effectiveCashPayments.find(
        cp => cp.teacherId === teacherId && String((cp as any).eventId) === String(evt.id)
      );
      return payment?.status !== 'Lunas';
    }).length;
  };

  // Data guru yang BELUM BAYAR kas (Hanya Anggota Aktif yang memiliki tunggakan kegiatan)
  const unpaidTeachers = useMemo(() => {
    return [...activeTeachersList]
      .filter(t => getTeacherUnpaidCount(t.id) > 0)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [activeTeachersList, effectiveCashPayments, events]);

  const unpaidMaleTeachers = useMemo(() => {
    return unpaidTeachers.filter(t => getTeacherGender(t) === 'L');
  }, [unpaidTeachers]);

  const unpaidFemaleTeachers = useMemo(() => {
    return unpaidTeachers.filter(t => getTeacherGender(t) === 'P');
  }, [unpaidTeachers]);

  const paidTeachersCount = activeTeachersCount - unpaidTeachers.length;
  const cashPaidPercentage = activeTeachersCount > 0 ? Math.round((paidTeachersCount / activeTeachersCount) * 100) : 0;

  // Event terpilih untuk kehadiran
  const currentSelectedAttendanceEvent = useMemo(() => {
    return sortedEvents.find(e => e.id === selectedAttendanceEventId) || sortedEvents[0] || null;
  }, [sortedEvents, selectedAttendanceEventId]);

  // Data Kehadiran Anggota
  let hadirCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let alphaCount = 0;
  let attendancePercentage = 0;
  let tidakHadirPercentage = 0;

  if (currentSelectedAttendanceEvent) {
    const latestEventRecords = effectiveAttendanceList.filter(a => 
      a.eventId === currentSelectedAttendanceEvent.id || 
      (a.eventTitle && currentSelectedAttendanceEvent.title && a.eventTitle.trim().toLowerCase() === currentSelectedAttendanceEvent.title.trim().toLowerCase())
    );

    hadirCount = latestEventRecords.filter(a => a.status === 'Hadir' || a.status === 'Verifikasi').length;
    sakitCount = latestEventRecords.filter(a => a.status === 'Sakit').length;
    izinCount = latestEventRecords.filter(a => a.status === 'Izin').length;
    const explicitAlphaCount = latestEventRecords.filter(a => a.status === 'Alpha').length;

    const totalTeachersCount = activeTeachersList.length > 0 ? activeTeachersList.length : (effectiveTeachers.length || 7);
    
    alphaCount = Math.max(0, totalTeachersCount - (hadirCount + sakitCount + izinCount)) + explicitAlphaCount;

    attendancePercentage = totalTeachersCount > 0 ? Math.round((hadirCount / totalTeachersCount) * 100) : 0;
    tidakHadirPercentage = totalTeachersCount > 0 ? 100 - attendancePercentage : 0;
  }

  // Ringkasan Eksekutif PGRI Ranting: Purna Tugas & Agenda Terdekat
  const currentYearNum = currentTime.getFullYear();
  const retiringSoonTeachers = useMemo(() => {
    return activeTeachersList.filter((t) => {
      const yr = Number(t.retirementYear);
      return !isNaN(yr) && yr >= currentYearNum && yr <= currentYearNum + 1;
    });
  }, [activeTeachersList, currentYearNum]);

  // Animasi Count-Up untuk angka statistik utama (sinkron dengan pembukaan layar loading)
  const animatedActiveTeachers = useCountUp(activeTeachersCount, 550, isEntryReady);
  const animatedTotalEvents = useCountUp(totalEventsCount, 550, isEntryReady);
  const animatedMaleCount = useCountUp(maleCount, 550, isEntryReady);
  const animatedFemaleCount = useCountUp(femaleCount, 550, isEntryReady);
  const animatedCashPercentage = useCountUp(cashPaidPercentage, 550, isEntryReady);
  const animatedRetiringCount = useCountUp(retiringSoonTeachers.length, 550, isEntryReady);
  const animatedAttendancePct = useCountUp(attendancePercentage, 550, isEntryReady);
  
  // Helper Render Diagram Donut SVG dengan padding viewBox yang aman dari cropping
  const renderDonut = (pct1: number, pct2: number, stroke1Class: string, stroke2Class: string) => {
    const val1 = isEntryReady ? Math.min(100, Math.max(0, pct1)) : 0;
    const val2 = isEntryReady ? Math.min(100 - val1, Math.max(0, pct2)) : 0;

    return (
      <svg viewBox="0 0 38 38" className="w-40 h-40 sm:w-44 sm:h-44 transform -rotate-90 drop-shadow-sm overflow-visible">
        <circle
          cx="19" cy="19" r="15.9155"
          fill="none"
          className={isLight ? 'stroke-slate-100' : 'stroke-slate-800/80'}
          strokeWidth="4.5"
        />
        {val2 > 0 && (
          <circle
            cx="19" cy="19" r="15.9155"
            fill="none"
            className={`${stroke2Class} transition-all duration-700 ease-out`}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={`${val2} ${100 - val2}`}
            strokeDashoffset={`-${val1}`}
          />
        )}
        {val1 > 0 && (
          <circle
            cx="19" cy="19" r="15.9155"
            fill="none"
            className={`${stroke1Class} transition-all duration-700 ease-out`}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={`${val1} ${100 - val1}`}
            strokeDashoffset="0"
          />
        )}
      </svg>
    );
  };

  const cardBgClass = isLight 
    ? 'bg-white border-stone-200/90 text-stone-800 shadow-[0_2px_12px_rgba(28,25,23,0.04)]' 
    : 'bg-stone-900 border-stone-800 text-stone-100 shadow-[0_2px_16px_rgba(0,0,0,0.28)]';

  const itemBgClass = isLight 
    ? 'bg-[#faf8f5] hover:bg-red-50/50 border-stone-200/80' 
    : 'bg-stone-800/60 hover:bg-stone-800 border-stone-700/60';

  const buttonSubtleClass = isLight 
    ? 'bg-stone-100 hover:bg-red-50 text-red-900' 
    : 'bg-stone-800 hover:bg-stone-700 text-amber-300';

  return (
    <div className={`font-sans space-y-6 ${isEntryReady ? 'beranda-entry-ready animate-in fade-in duration-300' : 'beranda-entry-waiting'}`}>
      
      {/* CSS Animasi & Kustomisasi Scrollbar Ramping dan Modern */}
      <style>{`
        @keyframes bannerEntry {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes colonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .beranda-entry-waiting .animate-banner-entry,
        .beranda-entry-waiting .stagger-1,
        .beranda-entry-waiting .stagger-2,
        .beranda-entry-waiting .stagger-3,
        .beranda-entry-waiting .stagger-4,
        .beranda-entry-waiting .stagger-5 {
          animation: none !important;
          opacity: 0;
          transform: translateY(10px);
        }
        .animate-banner-entry {
          animation: bannerEntry 0.48s cubic-bezier(0.16, 1, 0.3, 1) 40ms both;
        }
        .animate-colon {
          animation: colonPulse 1s ease-in-out infinite;
        }
        .stagger-1 { animation: bannerEntry 0.48s cubic-bezier(0.16, 1, 0.3, 1) 100ms both; }
        .stagger-2 { animation: bannerEntry 0.48s cubic-bezier(0.16, 1, 0.3, 1) 160ms both; }
        .stagger-3 { animation: bannerEntry 0.48s cubic-bezier(0.16, 1, 0.3, 1) 220ms both; }
        .stagger-4 { animation: bannerEntry 0.48s cubic-bezier(0.16, 1, 0.3, 1) 280ms both; }
        .stagger-5 { animation: bannerEntry 0.48s cubic-bezier(0.16, 1, 0.3, 1) 340ms both; }
        @media (prefers-reduced-motion: reduce) {
          .beranda-entry-waiting .animate-banner-entry,
          .beranda-entry-waiting .stagger-1,
          .beranda-entry-waiting .stagger-2,
          .beranda-entry-waiting .stagger-3,
          .beranda-entry-waiting .stagger-4,
          .beranda-entry-waiting .stagger-5 {
            opacity: 1;
            transform: none;
          }
          .animate-banner-entry,
          .stagger-1,
          .stagger-2,
          .stagger-3,
          .stagger-4,
          .stagger-5 {
            animation: none !important;
          }
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isLight ? '#d6d3d1 transparent' : '#44403c transparent'};
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${isLight ? 'rgba(214, 211, 209, 0.85)' : 'rgba(68, 64, 60, 0.85)'};
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: ${isLight ? 'rgba(168, 162, 158, 1)' : 'rgba(87, 83, 78, 1)'};
        }
      `}</style>

      {/* 1. Hero Welcome Banner — Wibawa Kusuma Bangsa */}
      <div
        ref={bannerRef}
        id="welcome-banner"
        className={`rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group animate-banner-entry min-h-[200px] sm:min-h-[164px] border ${
          isLight
            ? 'bg-gradient-to-br from-[#fdfbf7] via-white to-red-50/60 border-stone-200/90 text-stone-900 shadow-[0_6px_24px_rgba(127,29,29,0.07)] pgri-batik-pattern'
            : 'bg-gradient-to-br from-[#231214] via-stone-900 to-[#1a1112] border-red-900/40 text-stone-100 shadow-[0_10px_28px_rgba(0,0,0,0.45)] pgri-batik-pattern-dark'
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent pointer-events-none" />

        {/* Subtle Institutional Corner Accent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl select-none">
          <div className={`absolute -right-24 -bottom-24 w-72 h-72 rounded-full blur-3xl ${
            isLight ? 'bg-amber-500/10' : 'bg-red-700/15'
          }`} />
        </div>

        {/* Bagian Kiri: Logo & Information */}
        <div className="flex gap-4 sm:gap-5 items-center relative z-10">
          <div className="relative flex items-center justify-center shrink-0">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative z-10 border backdrop-blur-md transition-transform duration-300 group-hover:scale-[1.03] ${
              isLight
                ? 'bg-white/95 border-red-200/90 ring-4 ring-amber-500/10 text-red-800 shadow-[0_8px_20px_rgba(127,29,29,0.12)]'
                : 'bg-red-950/70 border-amber-500/30 ring-4 ring-amber-500/10 text-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.5)]'
            }`}>
              {logoKombel ? (
                <img src={logoKombel} alt="Logo PGRI" className="w-full h-full object-cover" />
              ) : (
                <Sparkles className={`w-10 h-10 sm:w-12 sm:h-12 ${
                  isLight ? 'text-red-800' : 'text-amber-400'
                }`} />
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className={`text-[11px] font-bold tracking-[0.16em] mb-1 ${
              isLight ? 'text-red-800' : 'text-amber-400'
            }`}>
              Digitalisasi Organisasi Profesi Guru
            </p>
            <div className="flex items-center gap-2">
              <h1 className={`font-display font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-tight ${
                isLight ? 'text-stone-900' : 'text-white'
              }`}>
                Selamat Datang!
              </h1>
            </div>

            <h2 className="text-base sm:text-xl md:text-2xl font-extrabold mt-0.5">
              <span className={`font-display ${
                isLight ? 'text-red-800' : 'text-amber-300'
              }`}>
                di PGRI Ranting Gelang
              </span>
            </h2>

            <div className="flex items-center gap-1.5 mt-1.5">
              <Cpu className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
              <span className={`text-[10px] sm:text-xs font-bold tracking-wider block ${
                isLight ? 'text-stone-500' : 'text-stone-400'
              }`}>
                Integritas, Solidaritas, &amp; Profesionalitas
              </span>
            </div>
          </div>
        </div>

        {/* Bagian Kanan: Action Buttons */}
        <div className="flex flex-col md:flex-col items-center md:items-end justify-center gap-3 shrink-0 relative z-10 w-full sm:w-auto">
          <div className="flex flex-row md:flex-col gap-2.5 w-full sm:w-auto justify-center">
            <button
              onClick={() => onNavigate('jadwal')}
              className="flex-1 sm:flex-none sm:w-auto px-3 sm:px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <Calendar className="w-4 h-4 stroke-[2.2]" />
              <span className="tracking-wide whitespace-nowrap">Jadwal &amp; Absensi</span>
            </button>

            <a
              href="https://ruangpembelajaran.ai.studio/"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 sm:flex-none sm:w-auto px-3 sm:px-4 py-2.5 rounded-xl border font-semibold text-xs sm:text-sm active:scale-95 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-sm no-underline ${
                isLight
                  ? 'bg-white border-stone-300 hover:border-red-300 text-stone-800 hover:bg-red-50/40'
                  : 'bg-stone-800/90 border-stone-700 hover:border-amber-500/40 text-stone-200 hover:bg-stone-800'
              }`}
            >
              <ExternalLink className={`w-4 h-4 stroke-[2.2] ${isLight ? 'text-red-800' : 'text-amber-400'}`} />
              <span className="whitespace-nowrap">Ruang Pembelajaran</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Stat / Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 stagger-1">
        {/* Card 1: Anggota Aktif */}
        <div 
          onClick={() => onNavigate('anggota')}
          className={`${cardBgClass} rounded-2xl p-5 border flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md ${isLight ? 'hover:border-red-300' : 'hover:border-amber-500/40'} transition-all duration-200 cursor-pointer group`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-red-900 to-red-700 text-amber-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Anggota Aktif</p>
            <p className={`font-display font-mono tabular-nums text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline gap-1 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              {animatedActiveTeachers} <span className="text-[11px] text-stone-400 font-medium font-sans">Orang</span>
            </p>
          </div>
        </div>

        {/* Card 2: Jumlah Kegiatan */}
        <div 
          onClick={() => onNavigate('jadwal')}
          className={`${cardBgClass} rounded-2xl p-5 border flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md ${isLight ? 'hover:border-red-300' : 'hover:border-amber-500/40'} transition-all duration-200 cursor-pointer group`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Jumlah</p>
            <p className={`font-display font-mono tabular-nums text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline gap-1 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              {animatedTotalEvents} <span className="text-[11px] text-stone-400 font-medium font-sans">Kegiatan</span>
            </p>
          </div>
        </div>

        {/* Card 3: Laki - laki */}
        <div 
          onClick={() => onNavigate('anggota')}
          className={`${cardBgClass} rounded-2xl p-5 border flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md ${isLight ? 'hover:border-red-300' : 'hover:border-amber-500/40'} transition-all duration-200 cursor-pointer group`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-stone-700 to-stone-600 text-amber-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <User className="w-7 h-7" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Laki - laki</p>
            <p className={`font-display font-mono tabular-nums text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline gap-1 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              {animatedMaleCount} <span className="text-[11px] text-stone-400 font-medium font-sans">Orang</span>
            </p>
          </div>
        </div>

        {/* Card 4: Perempuan */}
        <div 
          onClick={() => onNavigate('anggota')}
          className={`${cardBgClass} rounded-2xl p-5 border flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md ${isLight ? 'hover:border-red-300' : 'hover:border-amber-500/40'} transition-all duration-200 cursor-pointer group`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <User className="w-7 h-7" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Perempuan</p>
            <p className={`font-display font-mono tabular-nums text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline gap-1 ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
              {animatedFemaleCount} <span className="text-[11px] text-stone-400 font-medium font-sans">Orang</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2.2 Ringkasan Eksekutif PGRI Ranting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-2">
        <div
          onClick={() => onNavigate('keuangan')}
          className={`${cardBgClass} rounded-2xl p-4 sm:p-5 border flex items-center justify-between gap-3 hover:-translate-y-0.5 ${isLight ? 'hover:border-red-300' : 'hover:border-amber-500/40'} transition-all duration-200 cursor-pointer group`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ${isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Pelunasan Kontribusi</p>
              <p className={`font-display tabular-nums text-xl font-black ${isLight ? 'text-stone-900' : 'text-white'}`}>{animatedCashPercentage}% <span className="text-xs font-medium text-stone-400">({paidTeachersCount}/{activeTeachersCount})</span></p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
        </div>

        <div
          onClick={() => onNavigate('anggota')}
          className={`${cardBgClass} rounded-2xl p-4 sm:p-5 border flex items-center justify-between gap-3 hover:-translate-y-0.5 ${isLight ? 'hover:border-red-300' : 'hover:border-amber-500/40'} transition-all duration-200 cursor-pointer group`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ${isLight ? 'bg-amber-50 text-amber-700 border border-amber-200/80' : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'}`}>
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Purna Tugas ({currentYearNum}-{currentYearNum + 1})</p>
              <p className={`font-display tabular-nums text-xl font-black ${isLight ? 'text-stone-900' : 'text-white'}`}>
                {animatedRetiringCount} <span className="text-xs font-medium text-stone-400">Anggota</span>
              </p>
              {retiringSoonTeachers.length > 0 && (
                <p className="text-[10px] text-amber-500 font-semibold truncate">{retiringSoonTeachers.map(t => t.name).join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Kotak Diagram Lingkaran (Pie Chart) & Jadwal Kegiatan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch stagger-3">
        
        {/* Chart: Kehadiran Anggota (Kiri) */}
        <div className={`${cardBgClass} rounded-2xl p-6 border flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-200`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 shrink-0">
              <UserCheck className={`w-4 h-4 ${isLight ? 'text-red-800' : 'text-amber-400'}`} />
              <h3 className={`text-xs font-extrabold uppercase tracking-wider ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                KEHADIRAN
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {sortedEvents.length > 0 && (
                <select
                  value={selectedAttendanceEventId}
                  onChange={(e) => setSelectedAttendanceEventId(e.target.value)}
                  className={`w-32 sm:w-44 px-2.5 py-1 rounded-xl border text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700 truncate transition-all cursor-pointer ${
                    isLight 
                      ? 'bg-[#faf8f5] border-stone-200 text-stone-800' 
                      : 'bg-stone-800 border-stone-700 text-stone-200'
                  }`}
                >
                  {sortedEvents.map(evt => (
                    <option key={evt.id} value={evt.id} className={isLight ? 'bg-white text-stone-800' : 'bg-stone-800 text-stone-100'}>
                      {evt.title} ({evt.date})
                    </option>
                  ))}
                </select>
              )}
              <button 
                onClick={() => onNavigate('jadwal')}
                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  isLight
                    ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                    : 'bg-red-950/70 text-amber-300 border-red-800/60 hover:bg-red-900/60'
                }`}
              >
                Detail
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative py-6">
            {renderDonut(attendancePercentage, tidakHadirPercentage, 'stroke-emerald-500', 'stroke-red-700')}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`font-display tabular-nums text-2xl sm:text-3xl font-black ${isLight ? 'text-stone-900' : 'text-white'} leading-none`}>{animatedAttendancePct}%</span>
              <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-widest mt-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Hadir</span>
              <span className="text-[10px] font-medium text-stone-400 mt-0.5">dari {activeTeachersCount} Anggota</span>
            </div>
          </div>
          <div className={`pt-4 border-t ${isLight ? 'border-stone-200/80' : 'border-stone-800'} flex flex-col items-center justify-center gap-2 mt-2`}>
            <p className={`text-xs font-bold tabular-nums ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>
              <span className="text-emerald-500 font-extrabold">{hadirCount} Hadir</span> • {sakitCount} Sakit • {izinCount} Izin • {alphaCount} Alpha
            </p>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
                </div>
                <span className={`text-xs font-bold tabular-nums ${isLight ? 'text-stone-600' : 'text-stone-300'}`}>Hadir ({attendancePercentage}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-700 shadow-sm"></div>
                <span className={`text-xs font-bold tabular-nums ${isLight ? 'text-stone-600' : 'text-stone-300'}`}>Belum/Tidak ({tidakHadirPercentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* A. Jadwal Kegiatan (Samping Kanan Kehadiran, Tampil Responsif di Semua Layar) */}
        <div className={`flex flex-col ${cardBgClass} rounded-2xl p-6 border hover:-translate-y-0.5 transition-all duration-200`}>
          <div className={`flex items-center justify-between pb-4 mb-4 border-b ${isLight ? 'border-stone-200/80' : 'border-stone-800'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border ${isLight ? 'bg-red-50 text-red-800 border-red-200/80' : 'bg-red-950/60 text-amber-400 border-red-800/50'}`}>
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-extrabold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>Jadwal Kegiatan</h3>
            </div>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
            {sortedEvents.map((event) => {
              const categoryBadgeMap: Record<string, string> = {
                'Pertemuan Rutin': isLight ? 'bg-red-50 text-red-800 border border-red-200/80' : 'bg-red-950/70 text-amber-300 border border-red-800/60',
                'Belajar Bersama': isLight ? 'bg-red-50 text-red-800 border border-red-200/80' : 'bg-red-950/70 text-amber-300 border border-red-800/60',
                'Diskusi': isLight ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60',
                'Berbagi': isLight ? 'bg-amber-50 text-amber-800 border border-amber-200/80' : 'bg-amber-950/70 text-amber-300 border border-amber-800/60',
                'Rapat': isLight ? 'bg-amber-50 text-amber-800 border border-amber-200/80' : 'bg-amber-950/70 text-amber-300 border border-amber-800/60',
                'Sosialisasi': isLight ? 'bg-blue-50 text-blue-800 border border-blue-200/80' : 'bg-blue-950/70 text-blue-300 border border-blue-800/60',
                'Workshop': isLight ? 'bg-stone-100 text-stone-800 border border-stone-200' : 'bg-stone-800 text-stone-200 border border-stone-700',
                'Apel': isLight ? 'bg-rose-50 text-rose-800 border border-rose-200/80' : 'bg-rose-950/70 text-rose-300 border border-rose-800/60',
                'Upacara': isLight ? 'bg-rose-50 text-rose-800 border border-rose-200/80' : 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
              };

              const dateColorMap: Record<string, string> = {
                'purple': isLight ? 'bg-gradient-to-br from-red-900 to-red-700 text-amber-200 border-red-800' : 'bg-gradient-to-br from-red-950 to-red-800 text-amber-300 border-red-800/70',
                'green': isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950/80 text-emerald-200 border-emerald-800',
                'blue': isLight ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-amber-950/80 text-amber-200 border-amber-800/70'
              };

              const statusInfo = getEventCountdownOrStatus(event);
              const dateParts = (event.date || ' -').split(' ');

              return (
                <div
                  key={event.id}
                  className={`flex flex-col xl:flex-row items-start xl:items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 gap-3 ${itemBgClass}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Date Badge Box */}
                    <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-black leading-none shadow-sm shrink-0 ${dateColorMap[event.categoryColor] || (isLight ? 'bg-gradient-to-br from-red-900 to-red-700 text-amber-200 border-red-800' : 'bg-gradient-to-br from-red-950 to-red-800 text-amber-300 border-red-800/70')}`}>
                      <span className="font-display text-base">{dateParts[0]}</span>
                      <span className="text-[9px] uppercase font-extrabold tracking-wider">{dateParts[1] || ''}</span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <h4 className={`font-bold text-sm truncate transition-colors ${isLight ? 'text-stone-900 hover:text-red-800' : 'text-stone-100 hover:text-amber-300'}`}>
                        {event.title}
                      </h4>
                      <p className="text-xs text-stone-400 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{event.time || '-'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end xl:self-center flex-wrap justify-end shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${categoryBadgeMap[event.category] || (isLight ? 'bg-stone-100 text-stone-700 border border-stone-200' : 'bg-stone-800 text-stone-300 border border-stone-700')}`}>
                      {event.category}
                    </span>

                    {/* Countdown / Status Pill */}
                    <div className={`px-2.5 py-1 rounded-lg border shadow-sm flex items-center gap-1.5 ${
                      statusInfo.isOngoing
                        ? (isLight ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-900' : 'bg-emerald-950/70 border-emerald-800/70 text-emerald-300')
                        : (isLight ? 'bg-amber-50/90 border-amber-200/80 text-amber-900' : 'bg-stone-950/80 border-stone-700/80 text-amber-300')
                    }`}>
                      {statusInfo.isOngoing ? (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      ) : (
                        <Clock className={`w-3 h-3 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                      )}
                      {statusInfo.isCountdown ? (
                        <span className={`text-[11px] font-bold font-mono tabular-nums tracking-wide ${isLight ? 'text-amber-900' : 'text-amber-300'} flex items-center`}>
                          <span>{statusInfo.h}</span>
                          <span className="animate-colon mx-0.5">:</span>
                          <span>{statusInfo.m}</span>
                          <span className="animate-colon mx-0.5">:</span>
                          <span>{statusInfo.s}</span>
                        </span>
                      ) : (
                        <span className={`text-[11px] font-bold font-mono tracking-wide ${
                          statusInfo.isOngoing
                            ? (isLight ? 'text-emerald-800' : 'text-emerald-300')
                            : (isLight ? 'text-amber-900' : 'text-amber-300')
                        }`}>
                          {statusInfo.text}
                        </span>
                      )}
                    </div>

                    {!statusInfo.isFinished && (
                      <button
                        onClick={() => handleAttendanceClick(event)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 shrink-0 bg-red-800 text-white hover:bg-red-700 cursor-pointer shadow-sm"
                      >
                        Absen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Main Dashboard Content */}
      <div className="space-y-6 stagger-4">

        {/* Kotak Status Kas Anggota */}
        <div className="grid grid-cols-1 gap-6">

          {/* Kotak 1: Belum Bayar Kas */}
          <div className={`${cardBgClass} rounded-2xl p-6 border flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-200`}>
            <div>
              <div className={`flex items-center justify-between pb-4 mb-4 border-b ${isLight ? 'border-stone-200/80' : 'border-stone-800'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${isLight ? 'bg-red-50 text-red-800 border-red-200/80' : 'bg-red-950/60 text-red-400 border-red-800/50'}`}>
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-extrabold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                      Belum Membayar Kontribusi
                    </h3>
                    <p className="text-[11px] text-stone-400 font-medium">Status pembayaran kontribusi anggota</p>
                  </div>
                </div>
                <span className={`text-xs font-black tabular-nums px-3 py-1 rounded-lg ${
                  unpaidTeachers.length > 0 
                    ? (isLight ? 'bg-red-100 text-red-800' : 'bg-red-950/80 text-red-300 border border-red-800/50')
                    : (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50')
                }`}>
                  {unpaidTeachers.length} Guru
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] font-bold tabular-nums mb-1.5">
                  <span className={isLight ? 'text-stone-500' : 'text-stone-400'}>Progres Kelunasan</span>
                  <span className={isLight ? 'text-stone-700' : 'text-stone-200'}>{paidTeachersCount}/{activeTeachersCount} Guru ({animatedCashPercentage}%)</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-stone-100' : 'bg-stone-800'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 rounded-full" 
                    style={{ width: `${cashPaidPercentage}%` }}
                  />
                </div>
              </div>

              {/* List Guru Belum Membayar Kontribusi (Kiri: Laki-laki, Kanan: Perempuan) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[290px] overflow-y-auto pr-2 custom-scrollbar items-start">
                {unpaidTeachers.length === 0 ? (
                  <div className={`md:col-span-2 py-10 px-4 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center animate-in fade-in duration-300 ${
                    isLight ? 'bg-emerald-50/40 border-emerald-200 text-stone-600' : 'bg-emerald-950/20 border-emerald-900/40 text-stone-300'
                  }`}>
                    <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500" />
                    <p className="text-xs font-black text-emerald-600">Semua Anggota Telah Lunas</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Tidak ada tanggungan kontribusi yang belum diselesaikan.</p>
                  </div>
                ) : (
                  <>
                    {/* Kolom Kiri: Laki-laki */}
                    <div className="space-y-2.5">
                      {unpaidMaleTeachers.map((teacher, index) => (
                        <div
                          key={teacher.id}
                          className={`p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between gap-3 ${itemBgClass}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                              isLight ? 'bg-stone-100 text-stone-700 border-stone-200' : 'bg-stone-800 text-stone-200 border-stone-700'
                            }`}>
                              L
                            </div>

                            <div className="min-w-0">
                              <h4 className={`font-bold text-xs sm:text-sm truncate ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                                {index + 1}. {teacher.name || 'Tanpa Nama'}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium mt-0.5">
                                <span>NIP: {teacher.nip || '-'}</span>
                                <span>•</span>
                                <span className="truncate">{teacher.school || '-'}</span>
                              </div>
                            </div>
                          </div>

                          <span 
                            title={`${getTeacherUnpaidCount(teacher.id)} kegiatan belum dibayar`}
                            className={`text-[10px] font-extrabold tabular-nums px-2.5 py-1 rounded-lg border shrink-0 ${
                              isLight 
                                ? 'bg-red-50 text-red-800 border-red-200/80' 
                                : 'bg-red-950/80 text-red-300 border-red-800/70'
                            }`}
                          >
                            Tunggakan : {getTeacherUnpaidCount(teacher.id)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Kolom Kanan: Perempuan */}
                    <div className="space-y-2.5">
                      {unpaidFemaleTeachers.map((teacher, index) => (
                        <div
                          key={teacher.id}
                          className={`p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between gap-3 ${itemBgClass}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                              isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                            }`}>
                              P
                            </div>

                            <div className="min-w-0">
                              <h4 className={`font-bold text-xs sm:text-sm truncate ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                                {index + 1}. {teacher.name || 'Tanpa Nama'}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium mt-0.5">
                                <span>NIP: {teacher.nip || '-'}</span>
                                <span>•</span>
                                <span className="truncate">{teacher.school || '-'}</span>
                              </div>
                            </div>
                          </div>

                          <span 
                            title={`${getTeacherUnpaidCount(teacher.id)} kegiatan belum dibayar`}
                            className={`text-[10px] font-extrabold tabular-nums px-2.5 py-1 rounded-lg border shrink-0 ${
                              isLight 
                                ? 'bg-red-50 text-red-800 border-red-200/80' 
                                : 'bg-red-950/80 text-red-300 border-red-800/70'
                            }`}
                          >
                            Tunggakan : {getTeacherUnpaidCount(teacher.id)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('keuangan')}
              className={`w-full mt-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 ${buttonSubtleClass}`}
            >
              Lihat di Catatan Keuangan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* 4. Bottom Banner -> Menuju Menu Catatan Keuangan */}
      <div className={`relative overflow-hidden rounded-2xl p-6 border shadow-sm stagger-5 ${
        isLight
          ? 'bg-gradient-to-r from-[#fdfbf7] via-red-50/70 to-amber-50/70 border-stone-200/90'
          : 'bg-gradient-to-r from-[#231214] via-stone-900 to-[#1f1612] border-red-900/40'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-red-900 via-red-800 to-amber-700 text-amber-200 flex items-center justify-center shadow-md shrink-0 border ${
              isLight ? 'border-red-200' : 'border-red-700/60'
            }`}>
              <Star className="w-7 h-7 text-amber-300 fill-amber-300/30" />
            </div>
            <div>
              <h3 className={`font-display text-base sm:text-lg font-black tracking-tight ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                &ldquo;Transparansi dan amanah adalah kunci kepercayaan bersama.&rdquo;
              </h3>
              <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isLight ? 'text-red-800' : 'text-amber-300/90'}`}>
                Pantau laporan buku kas umum dan status pembayaran kontribusi anggota.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('keuangan')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shrink-0"
          >
            <span className="tracking-wide">Buka Catatan Keuangan</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* POPUP ALERT: ABSENSI KADALUARSA */}
      {expiredEventAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${isLight ? 'bg-white border-stone-200/90' : 'bg-stone-900 border-stone-800'} rounded-2xl max-w-sm w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200 text-center`}>
            <div className={`w-16 h-16 mx-auto rounded-2xl border ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/60 border-amber-800/60'} flex items-center justify-center`}>
              <Clock className={`w-8 h-8 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
            </div>
            <div>
              <h3 className={`font-display font-black text-lg ${isLight ? 'text-stone-900' : 'text-white'}`}>
                Absensi Ditutup
              </h3>
              <p className={`text-sm mt-2 leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Batas waktu pengisian absensi untuk kegiatan <br/>
                <span className={`font-bold ${isLight ? 'text-red-800' : 'text-amber-400'}`}>"{expiredEventAlert.title}"</span><br/>
                telah berakhir.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => setExpiredEventAlert(null)}
                className="w-full px-4 py-3 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};