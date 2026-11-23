import { safeDownloadBlob } from '../../lib/download';
import { syncToFirebase, mutateCloudCollection } from '../../lib/sync';
import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  UserCheck,
  Users,
  Plus,
  CheckCircle2,
  X,
  Download,
  Trash2,
  UploadCloud,
  Pencil,
  Copy,
  AlertCircle,
  FileSpreadsheet,
  User,
  FileText,
  QrCode,
  Camera,
  RefreshCw,
  Check,
  SwitchCamera,
  Share2,
  School
} from 'lucide-react';
import { ActivityEvent, AttendanceRecord, Teacher } from '../../types';
import { openWhatsAppShare } from '../../lib/orgConfig';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw_DBWKRMkn0IP5vdSpoUjtTd8nc6RrOxUdaCv2bmVl2ZL1viMT_2Hd7nFiqJCcRvM/exec';

export interface TaskSubmission {
  id: string;
  eventId?: string;
  teacherId?: string;
  teacherName?: string;
  school?: string;
  title?: string;
  fileUrl?: string;
  link?: string;
  submittedAt?: string;
  status?: string;
  [key: string]: any;
}

interface JadwalViewProps {
  events?: ActivityEvent[];
  onEventsChange?: React.Dispatch<React.SetStateAction<ActivityEvent[]>>;
  attendanceList?: AttendanceRecord[];
  onAttendanceListChange?: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  teachers?: Teacher[];
  onAddAttendance: (rec: Omit<AttendanceRecord, 'id' | 'timestamp'>) => void;
  onAddBulkAttendance?: (recs: Omit<AttendanceRecord, 'id' | 'timestamp'>[]) => void;
  onUpdateAttendance?: (updated: AttendanceRecord) => void;
  onDeleteAttendance?: (id: string) => void | Promise<boolean | void>;
  onAddEvent: (evt: Omit<ActivityEvent, 'id' | 'attendanceOpen'>) => void;
  onUpdateEvent?: (updated: ActivityEvent) => void;
  onDeleteEvent?: (id: string) => void | Promise<boolean | void>;
  currentUser?: { name: string; school: string; role: string };
  activeRole?: 'guru' | 'admin';
  selectedEventForAbsensi?: ActivityEvent | null;
  taskSubmissions?: TaskSubmission[];
  onUpdateTaskSubmissions?: React.Dispatch<React.SetStateAction<TaskSubmission[]>>;
}

// Helper untuk memvalidasi status aktif anggota
const isMemberActive = (t: Teacher): boolean => {
  if (!t) return false;
  if ((t as any).isActive !== undefined && (t as any).isActive !== null) {
    if (typeof (t as any).isActive === 'boolean') return (t as any).isActive;
    if (typeof (t as any).isActive === 'string') return (t as any).isActive.toLowerCase() === 'true' || (t as any).isActive === '1' || (t as any).isActive.toLowerCase() === 'aktif';
    if (typeof (t as any).isActive === 'number') return (t as any).isActive === 1;
  }
  if ((t as any).activeStatus !== undefined && (t as any).activeStatus !== null) {
    return String((t as any).activeStatus).trim().toLowerCase() === 'aktif';
  }
  return true;
};

export const JadwalView: React.FC<JadwalViewProps> = ({
  events = [],
  onEventsChange,
  attendanceList = [],
  onAttendanceListChange,
  teachers = [],
  onAddAttendance,
  onAddBulkAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  currentUser = { name: '', school: '', role: 'guru' },
  activeRole = 'guru',
  selectedEventForAbsensi
}) => {
  const isAdmin = activeRole === 'admin' || currentUser.role === 'admin';

  // Real-time current time for countdown & validation
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Helper konversi URL Drive untuk Direct Download
  const getDownloadUrl = (url: string): string => {
    if (!url) return '';
    const match = url.match(/[-\w]{25,}/);
    if (match && url.includes('drive.google.com')) {
      return `https://drive.google.com/uc?export=download&id=${match[0]}`;
    }
    return url;
  };

  // Handler eksekusi unduh file secara langsung
  const handleDownloadFile = (url: string, defaultFileName?: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', defaultFileName || 'dokumen.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        return;
      } catch (e) {
        console.warn('Gagal mengunduh file data url:', e);
      }
    }
    const downloadUrl = getDownloadUrl(url);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', defaultFileName || 'download');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper untuk memisahkan Tanggal dan Bulan untuk Badge 3D
  const getBadgeDateParts = (evt: ActivityEvent) => {
    if (!evt || !evt.date) return { dayNum: '--', monthName: '' };
    const cleanDate = evt.date.trim();
    const parts = cleanDate.split(/\s+/);
    if (parts.length >= 2) {
      return { dayNum: parts[0], monthName: parts[1].toUpperCase() };
    }
    return { dayNum: cleanDate, monthName: '' };
  };

  // Helper konversi tanggal event ke objek Date untuk keperluan sorting & komparasi
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

  // Helper untuk mendapatkan waktu mulai kegiatan
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

    let hours = 0;
    let minutes = 0;
    if (evt.time) {
      const timeMatches = Array.from(evt.time.matchAll(/(\d{1,2})[:.](\d{2})/g));
      if (timeMatches.length > 0) {
        const firstMatch = timeMatches[0];
        hours = parseInt(firstMatch[1], 10);
        minutes = parseInt(firstMatch[2], 10);
      }
    }

    const startDate = new Date(year, month, day, hours, minutes, 0);
    return isNaN(startDate.getTime()) ? null : startDate;
  };

  // Helper untuk mendapatkan batas waktu selesai kegiatan
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

    let hours = 23;
    let minutes = 59;
    if (evt.time) {
      const tLow = evt.time.toLowerCase();
      if (tLow.includes('selesai')) {
        hours = 23;
        minutes = 59;
      } else {
        const timeMatches = Array.from(evt.time.matchAll(/(\d{1,2})[:.](\d{2})/g));
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

  // Helper konversi string format tanggal/bulan/tahun (DD/MM/YYYY) ke objek Date
  const parseDeadlineDate = (deadlineStr: string): Date | null => {
    if (!deadlineStr) return null;
    const cleanStr = deadlineStr.trim();
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        const d = new Date(`${year}-${month}-${day}T23:59:59`);
        return isNaN(d.getTime()) ? null : d;
      }
    } else if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        let year = parts[0], month = parts[1], day = parts[2];
        if (parts[0].length === 2 && parts[2].length === 4) {
          day = parts[0];
          month = parts[1];
          year = parts[2];
        }
        const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59`);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    const fallbackDate = new Date(cleanStr + 'T23:59:59');
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
  };

  // Helper memastikan format tampilan selalu tanggal/bulan/tahun
  const formatToDDMMYYYY = (str: string): string => {
    if (!str) return '';
    const clean = str.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) return clean;
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-');
      return `${d}/${m}/${y}`;
    }
    return clean;
  };

  // Helper countdown menuju batas deadline (Format: 00.00.00)
  const getCountdownText = (deadlineStr: string) => {
    if (!deadlineStr) return '00.00.00';

    const deadlineDate = parseDeadlineDate(deadlineStr);
    if (!deadlineDate) return '00.00.00';

    const diff = deadlineDate.getTime() - currentTime.getTime();

    if (isNaN(diff) || diff <= 0) {
      return '00.00.00';
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}.${pad(minutes)}.${pad(seconds)}`;
  };

  // Helper status urgensi deadline untuk visual countdown adaptif
  const getCountdownUrgency = (deadlineStr: string) => {
    if (!deadlineStr) return 'expired';
    const deadlineDate = parseDeadlineDate(deadlineStr);
    if (!deadlineDate) return 'expired';
    const diff = deadlineDate.getTime() - currentTime.getTime();
    if (isNaN(diff) || diff <= 0) return 'expired';

    const totalHours = diff / (1000 * 60 * 60);
    if (totalHours <= 1) return 'critical';
    if (totalHours <= 12) return 'warning';
    return 'safe';
  };

  // Helper warna badge kategori kegiatan secara dinamis
  const getCategoryBadgeStyle = (category: string, isDarkMode: boolean) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('diskusi')) {
      return isDarkMode 
        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' 
        : 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (cat.includes('workshop') || cat.includes('pelatihan')) {
      return isDarkMode 
        ? 'bg-amber-950/80 text-amber-300 border-amber-800/60' 
        : 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (cat.includes('rapat')) {
      return isDarkMode 
        ? 'bg-rose-950/80 text-rose-300 border-rose-800/60' 
        : 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (cat.includes('berbagi')) {
      return isDarkMode 
        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' 
        : 'bg-cyan-100 text-cyan-800 border-cyan-200';
    }
    if (cat.includes('apel')) {
      return isDarkMode 
        ? 'bg-sky-950/80 text-sky-300 border-sky-800/60' 
        : 'bg-sky-100 text-sky-800 border-sky-200';
    }
    if (cat.includes('upacara')) {
      return isDarkMode 
        ? 'bg-red-950/80 text-red-300 border-red-800/60' 
        : 'bg-red-100 text-red-800 border-red-200';
    }
    return isDarkMode 
      ? 'bg-red-950/80 text-amber-300 border-red-800/60' 
      : 'bg-red-50 text-red-800 border-red-200';
  };

  // Helper for gender resolution
  const getGender = (t?: Teacher | null): 'L' | 'P' => {
    if (!t) return 'L';
    if (t.gender) return t.gender;
    const femaleNames = ['Siti', 'Rina', 'Dewi', 'Sri', 'Nurul', 'Fitriani', 'Lilik', 'Maya', 'Anisa', 'Yulia', 'Titin', 'Dwi', 'Neni', 'Ratna', 'Ika', 'Indah'];
    return femaleNames.some(n => t.name && t.name.includes(n)) ? 'P' : 'L';
  };

  // Helper for file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Mendeteksi mode gelap dari tag <html> secara real-time
  const [isDark, setIsDark] = useState<boolean>(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // State File Undangan Kegiatan (Tersimpan per Event ID)
  const [invitationFiles, setInvitationFiles] = useState<Record<string, { url: string; fileName: string }>>(() => {
    try {
      const saved = localStorage.getItem('kombel-event-invitations');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kombel-event-invitations', JSON.stringify(invitationFiles));
    } catch (e) {}
  }, [invitationFiles]);

  // Sinkronkan undangan dari properti events (hasil Cloud Sync)
  useEffect(() => {
    if (!events || events.length === 0) return;

    setInvitationFiles(prev => {
      let changed = false;
      const next = { ...prev };
      events.forEach((evt: any) => {
        if (evt && evt.id && evt.invitationUrl) {
          const fileName = evt.invitationName || `Undangan - ${evt.title}.pdf`;
          if (!next[evt.id] || next[evt.id].url !== evt.invitationUrl || next[evt.id].fileName !== fileName) {
            next[evt.id] = { url: evt.invitationUrl, fileName };
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [events]);

  // State Anggota Terpilih Per Pertemuan (Tersimpan per Event ID)
  const [selectedMembersByEvent, setSelectedMembersByEvent] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('kombel-event-selected-members');
      const parsed: Record<string, string[]> = saved ? JSON.parse(saved) : {};
      if (events && events.length > 0) {
        events.forEach(evt => {
          if ((evt as any).selectedMemberIds && Array.isArray((evt as any).selectedMemberIds)) {
            if (!parsed[evt.id]) {
              parsed[evt.id] = (evt as any).selectedMemberIds;
            }
          }
        });
      }
      return parsed;
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kombel-event-selected-members', JSON.stringify(selectedMembersByEvent));
    } catch (e) {}
  }, [selectedMembersByEvent]);

  // Sinkronkan selectedMembersByEvent secara otomatis saat prop events diperbarui dari Cloud/Props
  useEffect(() => {
    if (events && events.length > 0) {
      setSelectedMembersByEvent(prev => {
        let changed = false;
        const next = { ...prev };
        events.forEach(evt => {
          if ((evt as any).selectedMemberIds && Array.isArray((evt as any).selectedMemberIds)) {
            const newIds = (evt as any).selectedMemberIds;
            const currentIds = next[evt.id];
            if (!currentIds || JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
              next[evt.id] = newIds;
              changed = true;
            }
          }
        });
        if (changed) {
          try {
            localStorage.setItem('kombel-event-selected-members', JSON.stringify(next));
          } catch (e) {}
          return next;
        }
        return prev;
      });
    }
  }, [events]);

  // Modal Pilih Anggota State
  const [showSelectMembersModal, setShowSelectMembersModal] = useState<boolean>(false);
  const [isClosingSelectMembersModal, setIsClosingSelectMembersModal] = useState<boolean>(false);
  const [selectedEventForMembers, setSelectedEventForMembers] = useState<ActivityEvent | null>(null);
  const [tempSelectedMemberIds, setTempSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  // Modal D3 Rekap Partisipasi Kehadiran per Unit Sekolah
  const [showSchoolParticipationModal, setShowSchoolParticipationModal] = useState<boolean>(false);
  const [selectedSchoolStatsEventId, setSelectedSchoolStatsEventId] = useState<string>('');

  // Helper untuk mendapatkan seluruh daftar calon anggota (Kombinasi Profil Kombel Teratas A-Z + Daftar Anggota A-Z)
  const getAllCandidateMembers = (): Teacher[] => {
    // 1. Data Profil Kombel (Pembina, Penanggung Jawab, Pengurus)
    let pembinaData = {
      name: 'Hanifatul Susmiyah, S.Pd',
      nip: '197306022002122005',
      school: 'Pengawas Bina Kecamatan Sumberbaru',
      role: 'Pengawas Bina',
      phone: '6285859083645'
    };
    try {
      const saved = localStorage.getItem('kombel-pembina');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          pembinaData = {
            name: parsed.name,
            nip: parsed.nip || pembinaData.nip,
            school: parsed.instansi || parsed.school || pembinaData.school,
            role: parsed.role || pembinaData.role,
            phone: parsed.wa || parsed.phone || pembinaData.phone
          };
        }
      }
    } catch (e) {}

    let pjData = [
      {
        name: 'Ghufron Atok Urrohman, S.Pd',
        nip: '197805192014121003',
        school: 'Ketua Kelompok Kerja Kepala Sekolah',
        role: 'Ketua K3S',
        phone: '6285859342500'
      },
      {
        name: 'Christian Dri Firman Widodo, S.Pd',
        nip: '198012262014121002',
        school: 'Penanggungjawab PGRI Cabang Sumberbaru',
        role: 'Penanggungjawab',
        phone: '6281217910263'
      }
    ];
    try {
      const saved = localStorage.getItem('kombel-penanggungjawab');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          pjData = parsed.map((p: any) => ({
            name: p.name || '',
            nip: p.nip || '-',
            school: p.instansi || p.school || '-',
            role: p.role || 'Penanggung Jawab',
            phone: p.wa || p.phone || '-'
          }));
        }
      }
    } catch (e) {}

    let pengurusData = [
      {
        name: 'Risky Firmansyah, S.Pd',
        nip: '199202152022211002',
        school: 'SDN Kaliglagah 01',
        role: 'Ketua PGRI Ranting Gelang',
        phone: '6282245942601'
      },
      {
        name: 'Adi Saiful Rizal, S.Pd',
        nip: '199401162025211089',
        school: 'SDN Gelang 03',
        role: 'Sekretaris',
        phone: '6282292232649'
      },
      {
        name: 'Devy Eka Safitri, S.Pd',
        nip: '199703232025212059',
        school: 'SDN Sumberagung 03',
        role: 'Bendahara',
        phone: '6282247613463'
      },
      {
        name: 'Ninik Dwi Sunanti, S.Pd',
        nip: '199005122019032023',
        school: 'SDN Rowotengah 04',
        role: 'Koord. Bid. Perencanaan & Pelaksanaan Program',
        phone: '6288219851338'
      },
      {
        name: 'Dewi Utami, S.Pd',
        nip: '198501072022212002',
        school: 'SDN Jatiroto 03',
        role: 'Koord. Bid. Pengembangan Organisasi, Sarana & Prasarana',
        phone: '6285856483220'
      },
      {
        name: 'Siska Wahyu Purwati, S.Pd',
        nip: '199110162025212094',
        school: 'SDN Pringgowirawan 01',
        role: 'Koord. Bid. Humas & Kerjasama',
        phone: '6281355629322'
      }
    ];
    try {
      const saved = localStorage.getItem('kombel-pengurus');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          pengurusData = parsed.map((p: any) => ({
            name: p.name || '',
            nip: p.nip || '-',
            school: p.instansi || p.school || '-',
            role: p.role || 'Pengurus PGRI Ranting',
            phone: p.wa || p.phone || '-'
          }));
        }
      }
    } catch (e) {}

    const rawProfilKombel = [pembinaData, ...pjData, ...pengurusData];
    const seenNames = new Set<string>();
    const profilMembers: Teacher[] = [];

    rawProfilKombel.forEach((p, idx) => {
      const cleanName = (p.name || '').trim();
      const lower = cleanName.toLowerCase();
      if (!cleanName || seenNames.has(lower)) return;
      seenNames.add(lower);

      const matchInTeachers = (teachers || []).find(t => 
        (t.name && t.name.trim().toLowerCase() === lower) ||
        (p.nip && p.nip !== '-' && t.nip && String(t.nip).trim() === String(p.nip).trim())
      );

      profilMembers.push({
        id: matchInTeachers ? String(matchInTeachers.id) : `profil-kombel-${idx}-${p.nip && p.nip !== '-' ? p.nip : cleanName.replace(/\s+/g, '-').toLowerCase()}`,
        name: cleanName,
        school: String(matchInTeachers ? matchInTeachers.school : (p.school || '-')).toUpperCase(),
        nip: matchInTeachers ? (matchInTeachers.nip || p.nip) : (p.nip || '-'),
        role: p.role || (matchInTeachers ? matchInTeachers.role : 'Pengurus PGRI'),
        phone: matchInTeachers ? (matchInTeachers.phone || p.phone) : (p.phone || '-'),
        email: matchInTeachers ? (matchInTeachers.email || '') : '',
        avatar: matchInTeachers ? (matchInTeachers.avatar || '') : ''
      });
    });

    // Urutkan data Profil Kombel sesuai urutan hierarki resmi (1 s/d 9)
    const profilOrder = [
      'hanifatul susmiyah',
      'ghufron atok urrohman',
      'christian dri firman widodo',
      'risky firmansyah',
      'adi saiful rizal',
      'devy eka safitri',
      'ninik dwi sunanti',
      'dewi utami',
      'siska wahyu purwati'
    ];

    profilMembers.sort((a, b) => {
      const aLower = (a.name || '').toLowerCase();
      const bLower = (b.name || '').toLowerCase();
      const aIndex = profilOrder.findIndex(name => aLower.includes(name));
      const bIndex = profilOrder.findIndex(name => bLower.includes(name));

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' });
    });

    // 2. Data Anggota dari Menu Daftar Anggota yang belum ada di Profil Kombel
    const regularMembers: Teacher[] = [];

    (teachers || []).forEach(t => {
      const lower = (t.name || '').trim().toLowerCase();
      if (!seenNames.has(lower)) {
        regularMembers.push(t);
      }
    });

    // Urutkan data Daftar Anggota secara alfabetis (A-Z)
    regularMembers.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));

    // Gabungkan: Profil Kombel teratas (urutan resmi 1-9), disusul Daftar Anggota (A-Z)
    return [...profilMembers, ...regularMembers];
  };
  
  // Helper untuk mendapatkan data anggota terpilih pada suatu pertemuan (Profil Kombel + Daftar Anggota)
  const getSelectedTeachersForEvent = (eventId: string, evtObj?: ActivityEvent): Teacher[] => {
    const allCandidates = getAllCandidateMembers();
    if (!eventId) return allCandidates;

    let selectedIds: string[] | null = null;
    const foundEvt = evtObj || (events || []).find(e => String(e.id) === String(eventId));
    if (foundEvt && (foundEvt as any).selectedMemberIds && Array.isArray((foundEvt as any).selectedMemberIds)) {
      selectedIds = (foundEvt as any).selectedMemberIds;
    } else if (selectedMembersByEvent[eventId] !== undefined) {
      selectedIds = selectedMembersByEvent[eventId];
    }

    if (selectedIds === null) {
      // Default: jika belum pernah diatur khusus untuk pertemuan ini, ambil semua calon anggota
      return allCandidates;
    }

    const idSet = new Set(selectedIds.map(id => String(id).trim()));
    return allCandidates.filter(t => 
      idSet.has(String(t.id).trim()) || 
      (t.name && idSet.has(t.name.trim().toLowerCase()))
    );
  };

  const handleOpenSelectMembers = (evt: ActivityEvent) => {
    setSelectedEventForMembers(evt);
    const allCandidates = getAllCandidateMembers();
    let initialIds: string[] | null = null;

    if (evt && (evt as any).selectedMemberIds && Array.isArray((evt as any).selectedMemberIds)) {
      initialIds = (evt as any).selectedMemberIds;
    } else if (selectedMembersByEvent[evt.id] !== undefined) {
      initialIds = selectedMembersByEvent[evt.id];
    }

    if (initialIds !== null) {
      setTempSelectedMemberIds([...initialIds]);
    } else {
      setTempSelectedMemberIds(allCandidates.map(t => String(t.id)));
    }
    setMemberSearchQuery('');
    setIsClosingSelectMembersModal(false);
    setShowSelectMembersModal(true);
  };

  const handleCloseSelectMembers = () => {
    setIsClosingSelectMembersModal(true);
    setTimeout(() => {
      setShowSelectMembersModal(false);
      setIsClosingSelectMembersModal(false);
      setSelectedEventForMembers(null);
    }, 200);
  };

  const handleSaveSelectedMembers = () => {
    if (!selectedEventForMembers) return;
    const eventId = selectedEventForMembers.id;
    const updated = {
      ...selectedMembersByEvent,
      [eventId]: tempSelectedMemberIds
    };
    setSelectedMembersByEvent(updated);
    try {
      localStorage.setItem('kombel-event-selected-members', JSON.stringify(updated));
    } catch (e) {}

    if (onUpdateEvent) {
      onUpdateEvent({
        ...selectedEventForMembers,
        selectedMemberIds: tempSelectedMemberIds
      } as any);
    }

    handleCloseSelectMembers();
    setToastMessage(`Daftar anggota untuk "${selectedEventForMembers.title}" berhasil disimpan (${tempSelectedMemberIds.length} anggota terpilih)!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectAllMembers = () => {
    const allCandidates = getAllCandidateMembers();
    setTempSelectedMemberIds(allCandidates.map(t => String(t.id)));
  };

  const handleDeselectAllMembers = () => {
    setTempSelectedMemberIds([]);
  };

  const handleToggleMember = (teacherId: string) => {
    setTempSelectedMemberIds(prev => {
      const idStr = String(teacherId);
      if (prev.includes(idStr)) {
        return prev.filter(id => id !== idStr);
      } else {
        return [...prev, idStr];
      }
    });
  };

  // Modal Upload Undangan
  const [showUploadUndanganModal, setShowUploadUndanganModal] = useState<boolean>(false);
  const [isClosingUploadUndanganModal, setIsClosingUploadUndanganModal] = useState<boolean>(false);
  const [selectedEventForUndangan, setSelectedEventForUndangan] = useState<ActivityEvent | null>(null);
  const [undanganFile, setUndanganFile] = useState<File | null>(null);
  const [isUploadingUndangan, setIsUploadingUndangan] = useState<boolean>(false);

  // Persistent Event Deadlines State
  const [eventDeadlines, setEventDeadlines] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('kombel-event-deadlines');
      const parsed: Record<string, string> = saved ? JSON.parse(saved) : {};
      if (events && events.length > 0) {
        events.forEach(evt => {
          if (evt.uploadDeadline) {
            parsed[evt.id] = formatToDDMMYYYY(evt.uploadDeadline);
          }
        });
      }
      return parsed;
    } catch (e) {
      console.warn('Gagal membaca event deadlines:', e);
      return {};
    }
  });

  // Sinkronkan eventDeadlines dengan data events yang masuk
  useEffect(() => {
    if (events && events.length > 0) {
      setEventDeadlines(prev => {
        let changed = false;
        const next = { ...prev };
        events.forEach(evt => {
          if (evt.uploadDeadline) {
            const formatted = formatToDDMMYYYY(evt.uploadDeadline);
            if (next[evt.id] !== formatted) {
              next[evt.id] = formatted;
              changed = true;
            }
          }
        });
        if (changed) {
          try {
            localStorage.setItem('kombel-event-deadlines', JSON.stringify(next));
          } catch (e) {}
          return next;
        }
        return prev;
      });
    }
  }, [events]);

  // Muat data mutakhir kegiatan & tugas dari Cloud saat menu Jadwal dibuka (dengan cooldown 60 detik)
  useEffect(() => {
    let isMounted = true;
    const fetchLatestJadwalData = async () => {
      try {
        const lastJadwalSync = sessionStorage.getItem('kombel_jadwal_sync_ts');
        if (lastJadwalSync && (Date.now() - Number(lastJadwalSync)) < 60000) {
          return;
        }
      } catch (e) {}

      try {
        const { syncFromFirebase, fetchCloudVersions, shouldFetchByVersion, markLocalVersionSynced } = await import('../../lib/sync');
        const cloudVersions = await fetchCloudVersions(45000);
        if (!isMounted) return;

        const fetchEvents = shouldFetchByVersion('events', cloudVersions);
        const fetchAtt = shouldFetchByVersion('attendanceList', cloudVersions);

        if (!fetchEvents && !fetchAtt) {
          try {
            sessionStorage.setItem('kombel_jadwal_sync_ts', String(Date.now()));
          } catch (e) {}
          return;
        }

        const [cloudEventsRes, cloudAttRes] = await Promise.allSettled([
          fetchEvents ? syncFromFirebase('events') : Promise.resolve(null),
          fetchAtt ? syncFromFirebase('attendanceList') : Promise.resolve(null)
        ]);
        if (!isMounted) return;

        if (fetchEvents && cloudEventsRes.status === 'fulfilled' && Array.isArray(cloudEventsRes.value)) {
          const cloudEvents = cloudEventsRes.value;
          try {
            localStorage.setItem('kombel-events', JSON.stringify(cloudEvents));
          } catch (e) {}
          setEventDeadlines(prev => {
            const next = { ...prev };
            cloudEvents.forEach(evt => {
              if (evt.uploadDeadline) next[evt.id] = formatToDDMMYYYY(evt.uploadDeadline);
            });
            try {
              localStorage.setItem('kombel-event-deadlines', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
          setSelectedMembersByEvent(prev => {
            const next = { ...prev };
            let hasSm = false;
            cloudEvents.forEach(evt => {
              if ((evt as any).selectedMemberIds && Array.isArray((evt as any).selectedMemberIds)) {
                next[evt.id] = (evt as any).selectedMemberIds;
                hasSm = true;
              }
            });
            if (hasSm) {
              try {
                localStorage.setItem('kombel-event-selected-members', JSON.stringify(next));
              } catch (e) {}
            }
            return next;
          });
          if (onEventsChange) {
            onEventsChange(cloudEvents);
          } else if (onUpdateEvent) {
            cloudEvents.forEach(evt => onUpdateEvent(evt));
          }
          markLocalVersionSynced('events', cloudVersions);
        }
       
        if (fetchAtt && cloudAttRes.status === 'fulfilled' && Array.isArray(cloudAttRes.value)) {
          const cloudAtt = cloudAttRes.value;
          try {
            localStorage.setItem('kombel-attendance', JSON.stringify(cloudAtt));
            localStorage.setItem('kombel-attendance-list', JSON.stringify(cloudAtt));
          } catch (e) {}
          if (onAttendanceListChange) {
            onAttendanceListChange(cloudAtt);
          }
          markLocalVersionSynced('attendanceList', cloudVersions);
        }

        try {
          sessionStorage.setItem('kombel_jadwal_sync_ts', String(Date.now()));
        } catch (e) {}
      } catch (err) {
        console.warn('Auto sync data jadwal error:', err);
      }
    };
    fetchLatestJadwalData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('kombel-event-deadlines', JSON.stringify(eventDeadlines));
    } catch (e) {
      console.warn('Gagal menyimpan event deadlines:', e);
    }
  }, [eventDeadlines]);

  // Attendance Form Modal
  const [showAbsensiModal, setShowAbsensiModal] = useState<boolean>(!!selectedEventForAbsensi);
  const [isClosingAbsensiModal, setIsClosingAbsensiModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(selectedEventForAbsensi || (events && events[0]) || null);

  // State Scanner Barcode Absensi
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [isClosingScannerModal, setIsClosingScannerModal] = useState<boolean>(false);
  const [scannedSuccessTeacher, setScannedSuccessTeacher] = useState<Teacher | null>(null);
  const [scannedAlreadyTeacher, setScannedAlreadyTeacher] = useState<{ teacher: Teacher; status: string } | null>(null);
  const [scannedErrorBarcode, setScannedErrorBarcode] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Modal Exit Handler Helpers
  const handleCloseScannerModal = () => {
    setIsClosingScannerModal(true);
    setTimeout(() => {
      setShowScannerModal(false);
      setIsClosingScannerModal(false);
      setScannedSuccessTeacher(null);
      setScannedAlreadyTeacher(null);
      setScannedErrorBarcode(null);
    }, 250);
  };

  const handleCloseAbsensiModal = () => {
    setIsClosingAbsensiModal(true);
    setTimeout(() => {
      setShowAbsensiModal(false);
      setIsClosingAbsensiModal(false);
    }, 250);
  };
  
  const handleCloseUploadUndanganModal = () => {
    setIsClosingUploadUndanganModal(true);
    setTimeout(() => {
      setShowUploadUndanganModal(false);
      setIsClosingUploadUndanganModal(false);
    }, 250);
  };
  const [cameraRetryCount, setCameraRetryCount] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingScanRef = useRef<boolean>(false);
  const lastScanTimestampRef = useRef<number>(0);
  const barcodeDetectorInstanceRef = useRef<any>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const recentlyScannedTeacherIdsRef = useRef<Set<string>>(new Set());

  // Inisialisasi satu kali BarcodeDetector native API
  useEffect(() => {
    if (!zxingReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE, 
        BarcodeFormat.DATA_MATRIX, 
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13
      ]);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints);
    }
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorInstanceRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a', 'upc_e', 'data_matrix']
        });
      } catch (e) {
        barcodeDetectorInstanceRef.current = null;
      }
    }
  }, []);

  // Popup Event Expired / Alert Absensi
  const [expiredEventAlert, setExpiredEventAlert] = useState<{ title: string; message: string; eventTitle: string } | null>(null);

  // View Attendance List Modal
  const [viewEventAttendance, setViewEventAttendance] = useState<ActivityEvent | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpha'>('Hadir');

  // New Event Modal State
  const [showNewEventModal, setShowNewEventModal] = useState<boolean>(false);

  // Form Fields for New & Edit Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<ActivityEvent['category'] | ''>('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventPresenter, setEventPresenter] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // Edit Event Modal State
  const [showEditEventModal, setShowEditEventModal] = useState<boolean>(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<ActivityEvent | null>(null);

  // Rekap Kehadiran Modal State
  const [showPrintAttendanceModal, setShowPrintAttendanceModal] = useState<boolean>(false);
  const [selectedPrintAttendanceEventId, setSelectedPrintAttendanceEventId] = useState<string>('');

  const [deleteEventTarget, setDeleteEventTarget] = useState<ActivityEvent | null>(null);
  const [deleteAttendanceTarget, setDeleteAttendanceTarget] = useState<{ id: string; teacherName: string; teacherId?: string; school?: string; isImplicit?: boolean } | null>(null);
  const [editAttendanceTarget, setEditAttendanceTarget] = useState<AttendanceRecord | null>(null);
  const [editAttendanceStatus, setEditAttendanceStatus] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpha'>('Izin');
  const [editAttendanceNotes, setEditAttendanceNotes] = useState<string>('');

  const existingTeachers = teachers || [];
  const activeTeachers = existingTeachers.filter(isMemberActive);

  // Filter guru yang belum absen di event yang dipilih dan urutkan A-Z (Sesuai Anggota Terpilih Pertemuan Ini)
  const availableAbsensiTeachers = (
    selectedEvent 
      ? getSelectedTeachersForEvent(selectedEvent.id, selectedEvent) 
      : activeTeachers
  )
    .filter(t => {
      if (!selectedEvent) return true;
      const tId = String(t.id || '').trim();
      const tName = (t.name || '').trim().toLowerCase();
      const alreadyAttended = (attendanceList || []).some(rec => 
        String(rec.eventId || '').trim() === String(selectedEvent.id || '').trim() && 
        (
          (tId !== '' && rec.teacherId && String(rec.teacherId).trim() === tId) ||
          (tName !== '' && rec.teacherName && rec.teacherName.trim().toLowerCase() === tName)
        ) &&
        ['Hadir', 'Sakit', 'Izin', 'Verifikasi', 'Tugas Luar'].includes(rec.status)
      );
      return !alreadyAttended;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields for Absensi
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>(currentUser.school || '');
  const [attendanceStatus, setAttendanceStatus] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Tugas Luar'>('Izin');
  const [notes, setNotes] = useState<string>('');
  const [confirmHadirSemua, setConfirmHadirSemua] = useState<boolean>(false);

  useEffect(() => {
    if (availableAbsensiTeachers.length > 0) {
      if (!selectedTeacherId || !availableAbsensiTeachers.some(t => String(t.id) === String(selectedTeacherId))) {
        setSelectedTeacherId(String(availableAbsensiTeachers[0].id));
        setSchoolName(availableAbsensiTeachers[0].school || currentUser.school);
      }
    } else {
      setSelectedTeacherId('');
      setSchoolName(currentUser.school);
    }
  }, [selectedEvent, attendanceList, activeTeachers, availableAbsensiTeachers, selectedTeacherId, currentUser.school]);

  // Removed jsQR dynamic loading in favor of @zxing/browser

  // Handler eksekusi hasil barcode yang cocok dengan validasi rentang waktu (1 jam sebelum s/d 1 jam setelah)
  const handleBarcodeScanned = (scannedRaw: string) => {
    if (isProcessingScanRef.current || !selectedEvent) return;
    let cleanRaw = (scannedRaw || '').trim();
    if (!cleanRaw) return;

    let parsedId = '';
    let parsedNip = '';
    let parsedName = '';
    let parsedSchool = '';

    try {
      if (cleanRaw.startsWith('{') && cleanRaw.endsWith('}')) {
        const parsed = JSON.parse(cleanRaw);
        parsedId = String(parsed.id || parsed.teacherId || '').trim();
        parsedNip = String(parsed.nip || '').trim();
        parsedName = String(parsed.name || parsed.teacherName || '').trim().toLowerCase();
        parsedSchool = String(parsed.school || '').trim().toLowerCase();
      }
    } catch (e) {}

    const cleanLower = cleanRaw.toLowerCase();

    isProcessingScanRef.current = true;

    // 2. Cari guru yang barcode-nya cocok secara komprehensif
    const matchedTeacher = (teachers || []).find(t => {
      const safeName = (t?.name || '').trim().toLowerCase();
      const safeSchool = (t?.school || '').trim().toLowerCase();
      const safeNip = (t?.nip ? String(t.nip).trim().toLowerCase() : '');
      const safeId = (t?.id ? String(t.id).trim().toLowerCase() : '');
      const expectedBarcode = `${safeName}_${safeSchool}`;

      if (cleanLower === expectedBarcode || cleanLower === safeName || cleanLower === safeNip || cleanLower === safeId) return true;

      if (parsedId && safeId && parsedId.toLowerCase() === safeId) return true;
      if (parsedNip && safeNip && parsedNip.toLowerCase() === safeNip) return true;
      if (parsedName && safeName && parsedName === safeName) return true;

      if (safeNip && safeNip.length >= 6 && cleanLower.includes(safeNip)) return true;
      if (safeId && safeId.length >= 4 && cleanLower === safeId) return true;

      return false;
    });

    if (!matchedTeacher) {
      setScannedErrorBarcode(cleanRaw);
      setToastMessage('Barcode tidak terdaftar dalam data guru!');
      setTimeout(() => {
        setScannedErrorBarcode(null);
        setToastMessage(null);
        isProcessingScanRef.current = false;
      }, 2500);
      return;
    }

    // Cek apakah guru termasuk dalam daftar anggota terpilih untuk pertemuan ini
    if (selectedEvent) {
      const allowedEventTeachers = getSelectedTeachersForEvent(selectedEvent.id, selectedEvent);
      const isMemberAllowed = allowedEventTeachers.some(t => 
        String(t.id).trim() === String(matchedTeacher.id).trim() ||
        (t.name && matchedTeacher.name && t.name.trim().toLowerCase() === matchedTeacher.name.trim().toLowerCase())
      );
      if (!isMemberAllowed) {
        setScannedErrorBarcode(cleanRaw);
        setToastMessage(`Guru ${matchedTeacher.name} tidak terdaftar dalam daftar anggota kegiatan ini!`);
        setTimeout(() => {
          setScannedErrorBarcode(null);
          setToastMessage(null);
          isProcessingScanRef.current = false;
        }, 2500);
        return;
      }
    }

    // 3. Cek apakah guru sudah melakukan absensi pada jadwal kegiatan ini
    const teacherKey = String(matchedTeacher.id).trim();
    const eventTeacherKey = `${selectedEvent.id}___${teacherKey}`;
    const existingAttendance = (attendanceList || []).find(rec => 
      String(rec.eventId).trim() === String(selectedEvent.id).trim() && 
      (
        (rec.teacherId && String(rec.teacherId).trim() === teacherKey) ||
        (rec.teacherName && matchedTeacher.name && rec.teacherName.trim().toLowerCase() === matchedTeacher.name.trim().toLowerCase())
      ) &&
      ['Hadir', 'Sakit', 'Izin', 'Verifikasi', 'Tugas Luar'].includes(rec.status)
    );

    if (existingAttendance || recentlyScannedTeacherIdsRef.current.has(eventTeacherKey)) {
      setScannedAlreadyTeacher({
        teacher: matchedTeacher,
        status: existingAttendance ? existingAttendance.status : 'Hadir'
      });
      setToastMessage(`${matchedTeacher.name} sudah melakukan absensi pada kegiatan ini!`);
      setTimeout(() => {
        setScannedAlreadyTeacher(null);
        setToastMessage(null);
        isProcessingScanRef.current = false;
      }, 2500);
      return;
    }

    recentlyScannedTeacherIdsRef.current.add(eventTeacherKey);

    // 4. Masukkan data ke daftar kehadiran dengan status "Hadir"
    onAddAttendance({
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      teacherId: String(matchedTeacher.id),
      teacherName: matchedTeacher.name,
      nip: matchedTeacher.nip || '-',
      school: matchedTeacher.school,
      status: 'Hadir',
      notes: 'Presensi via Scan Barcode'
    });

    setScannedSuccessTeacher(matchedTeacher);
    setToastMessage(`Presensi ${matchedTeacher.name} berhasil dicatat sebagai Hadir!`);

    setTimeout(() => {
      setScannedSuccessTeacher(null);
      setToastMessage(null);
      isProcessingScanRef.current = false;
    }, 2500);
  };
  
  // Lifecycle pengoperasian video kamera scanner ultra-responsif (Real-time dual decoder)
  useEffect(() => {
    if (!showScannerModal) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    setScannerError(null);
    isProcessingScanRef.current = false;
    let isActive = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('API Kamera tidak didukung di browser ini atau koneksi tidak aman (HTTPS diperlukan).');
        }

        // Hentikan track stream aktif sebelumnya sebelum beralih kamera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 }
            }
          });
        } catch (firstErr) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: facingMode } }
            });
          } catch (secondErr) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
              });
            } catch (thirdErr) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true
              });
            }
          }
        }

        if (!isActive) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();
        }

        const scanFrame = async (timestamp: number) => {
          if (!isActive) return;

          if (!isProcessingScanRef.current && timestamp - lastScanTimestampRef.current > 150) {
            lastScanTimestampRef.current = timestamp;
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (video && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
              let detectedCode: string | null = null;

              if (barcodeDetectorInstanceRef.current) {
                try {
                  const barcodes = await barcodeDetectorInstanceRef.current.detect(video);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    detectedCode = barcodes[0].rawValue;
                  }
                } catch (e) {}
              }

              if (!detectedCode && canvas && zxingReaderRef.current) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                  const vw = video.videoWidth;
                  const vh = video.videoHeight;
                  
                  if (canvas.width !== vw || canvas.height !== vh) {
                    canvas.width = vw;
                    canvas.height = vh;
                  }

                  ctx.drawImage(video, 0, 0, vw, vh);
                  
                  try {
                    const result = zxingReaderRef.current.decodeFromCanvas(canvas);
                    if (result && result.getText()) {
                      detectedCode = result.getText();
                    }
                  } catch (e) {
                    // ignore NotFoundException
                  }
                }
              }

              if (detectedCode && isActive && !isProcessingScanRef.current) {
                handleBarcodeScanned(detectedCode);
              }
            }
          }

          if (isActive) {
            animationFrameRef.current = requestAnimationFrame(scanFrame);
          }
        };

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        console.warn('Gagal akses kamera:', err);
        setScannerError('Tidak dapat membuka kamera. Pastikan izin kamera aktif pada browser.');
      }
    };

    startCamera();

    return () => {
      isActive = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [showScannerModal, cameraRetryCount, facingMode]);

  const handleOpenAbsensi = (evt: ActivityEvent) => {
    const eventStart = getEventStartDateTime(evt);
    if (!isAdmin && eventStart && currentTime.getTime() < eventStart.getTime()) {
      setExpiredEventAlert({
        title: "Absensi Belum Dimulai",
        message: "Pengisian absensi hanya dapat dilakukan setelah jam kegiatan dimulai.",
        eventTitle: evt.title
      });
      return;
    }

    const currentDeadline = (eventDeadlines[evt.id] && eventDeadlines[evt.id].trim() !== '') ? eventDeadlines[evt.id] : formatToDDMMYYYY(evt.uploadDeadline || '');
    const countdown = getCountdownText(currentDeadline);
    const deadlineEnd = parseDeadlineDate(currentDeadline) || getEventEndDateTime(evt);

    if (!isAdmin && deadlineEnd && (countdown === '00.00.00' || currentTime.getTime() > deadlineEnd.getTime())) {
      setExpiredEventAlert({
        title: "Absensi Ditutup",
        message: "Batas waktu pengisian absensi untuk kegiatan ini telah berakhir.",
        eventTitle: evt.title
      });
      return; 
    }

    setSelectedEvent(evt);
    setAttendanceStatus(isAdmin ? 'Hadir' : 'Izin');
    setShowAbsensiModal(true);
  };

  const handleOpenScanner = () => {
    if (!selectedEvent) return;

    const eventStart = getEventStartDateTime(selectedEvent);
    const eventEnd = getEventEndDateTime(selectedEvent);

    if (eventStart) {
      const allowedScanStart = new Date(eventStart.getTime() - 60 * 60 * 1000);
      if (currentTime.getTime() < allowedScanStart.getTime()) {
        setExpiredEventAlert({
          title: "Scan Barcode Belum Dimulai",
          message: "Scan barcode presensi baru dapat dilakukan 1 jam sebelum kegiatan dimulai.",
          eventTitle: selectedEvent.title
        });
        return;
      }
    }

    if (eventEnd) {
      const allowedScanEnd = new Date(eventEnd.getTime() + 60 * 60 * 1000);
      if (currentTime.getTime() > allowedScanEnd.getTime()) {
        setExpiredEventAlert({
          title: "Scan Barcode Ditutup",
          message: "Batas waktu scan barcode presensi telah berakhir (melewati 1 jam setelah kegiatan selesai).",
          eventTitle: selectedEvent.title
        });
        return;
      }
    }

    setShowScannerModal(true);
  };

  const handleAbsensiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    let teacherName = '';
    let nip = '';

    const eventCandidateTeachers = selectedEvent ? getSelectedTeachersForEvent(selectedEvent.id, selectedEvent) : getAllCandidateMembers();
    const cleanSelectedId = String(selectedTeacherId || '').trim();
    const cleanSelectedIdLower = cleanSelectedId.toLowerCase();

    const foundTeacher = 
      availableAbsensiTeachers.find(t => String(t.id || '').trim() === cleanSelectedId) ||
      eventCandidateTeachers.find(t => String(t.id || '').trim() === cleanSelectedId) ||
      (teachers || []).find(t => String(t.id || '').trim() === cleanSelectedId) ||
      availableAbsensiTeachers.find(t => t.name && t.name.trim().toLowerCase() === cleanSelectedIdLower) ||
      eventCandidateTeachers.find(t => t.name && t.name.trim().toLowerCase() === cleanSelectedIdLower) ||
      (teachers || []).find(t => t.name && t.name.trim().toLowerCase() === cleanSelectedIdLower);

    let targetTeacherId = '';
    if (foundTeacher) {
      targetTeacherId = String(foundTeacher.id || '').trim();
      teacherName = foundTeacher.name;
      nip = foundTeacher.nip || '';
      if (!schoolName) setSchoolName(foundTeacher.school);
    } else if (cleanSelectedId !== '') {
      targetTeacherId = cleanSelectedId;
      teacherName = cleanSelectedId;
    } else {
      teacherName = currentUser.name;
    }

    const cleanTargetName = (teacherName || '').trim().toLowerCase();

    const hasAttended = (attendanceList || []).some(rec => 
      String(rec.eventId || '').trim() === String(selectedEvent.id || '').trim() && 
      (
        (targetTeacherId !== '' && rec.teacherId && String(rec.teacherId).trim() === targetTeacherId) ||
        (rec.teacherName && cleanTargetName !== '' && rec.teacherName.trim().toLowerCase() === cleanTargetName)
      ) &&
      ['Hadir', 'Sakit', 'Izin', 'Verifikasi', 'Tugas Luar'].includes(rec.status)
    );
    if (hasAttended) {
      setToastMessage('Anda sudah melakukan absensi untuk kegiatan ini!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    onAddAttendance({
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      teacherId: targetTeacherId || undefined,
      teacherName: teacherName || foundTeacher?.name || currentUser.name,
      nip: foundTeacher?.nip || nip || '-',
      school: foundTeacher?.school || schoolName || currentUser.school,
      status: attendanceStatus,
      notes
    });

    setShowAbsensiModal(false);
    setNotes('');

    setToastMessage(`Presensi ${teacherName} untuk ${selectedEvent.title} berhasil dicatat!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleHadirSemuaSubmit = () => {
    if (!selectedEvent || !isAdmin || availableAbsensiTeachers.length === 0) return;

    const recordsToAdd: Omit<AttendanceRecord, 'id' | 'timestamp'>[] = [];
    const noteText = notes.trim();

    availableAbsensiTeachers.forEach((teacher) => {
      const targetTeacherId = String(teacher.id || '').trim();
      const cleanTargetName = (teacher.name || '').trim().toLowerCase();

      const hasAttended = (attendanceList || []).some(rec =>
        String(rec.eventId || '').trim() === String(selectedEvent.id || '').trim() &&
        (
          (targetTeacherId !== '' && rec.teacherId && String(rec.teacherId).trim() === targetTeacherId) ||
          (rec.teacherName && cleanTargetName !== '' && rec.teacherName.trim().toLowerCase() === cleanTargetName)
        ) &&
        ['Hadir', 'Sakit', 'Izin', 'Verifikasi', 'Tugas Luar'].includes(rec.status)
      );

      if (!hasAttended) {
        recordsToAdd.push({
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          teacherId: targetTeacherId || undefined,
          teacherName: teacher.name,
          nip: teacher.nip || '-',
          school: teacher.school || currentUser.school,
          status: 'Hadir',
          notes: noteText
        });
      }
    });

    if (recordsToAdd.length > 0) {
      if (onAddBulkAttendance) {
        onAddBulkAttendance(recordsToAdd);
      } else {
        recordsToAdd.forEach((rec) => onAddAttendance(rec));
      }
    }

    setConfirmHadirSemua(false);
    setShowAbsensiModal(false);
    setNotes('');

    setToastMessage(`Presensi ${recordsToAdd.length} anggota berhasil dicatat sebagai Hadir semua!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenNewEventModal = () => {
    setEventTitle('');
    setEventCategory('');
    setEventDate('');
    setEventStartTime('');
    setEventEndTime('');
    setEventPresenter('');
    setEventLocation('');
    setEventDesc('');
    setShowNewEventModal(true);
  };

  const isNewEventFormValid = Boolean(
    eventTitle.trim() &&
    eventCategory &&
    eventDate.trim() &&
    eventStartTime.trim() &&
    eventEndTime.trim() &&
    eventLocation.trim() &&
    eventDesc.trim()
  );

  const handleNewEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNewEventFormValid) return;

    let eventDateStrFormatted = eventDate;
    let eventFullDateFormatted = eventDate;

    if (eventDate) {
      const dateObj = new Date(eventDate + 'T00:00:00');
      if (!isNaN(dateObj.getTime())) {
        eventDateStrFormatted = `${dateObj.getDate()} ${dateObj.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()}`;
        eventFullDateFormatted = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    const eventTimeFormatted = `${eventStartTime} - ${eventEndTime}`;

    onAddEvent({
      title: eventTitle,
      date: eventDateStrFormatted,
      fullDate: eventFullDateFormatted,
      time: eventTimeFormatted,
      location: eventLocation,
      category: (eventCategory as ActivityEvent['category']) || 'Pertemuan Rutin',
      categoryColor: (eventCategory === 'Pertemuan Rutin' || eventCategory === 'Belajar Bersama') ? 'purple' : eventCategory === 'Diskusi' ? 'green' : 'blue',
      description: eventDesc,
      presenters: eventPresenter.trim() ? [eventPresenter.trim()] : []
    });

    setShowNewEventModal(false);
    setToastMessage('Kegiatan baru berhasil dijadwalkan!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteClick = (evt: ActivityEvent) => {
    setDeleteEventTarget(evt);
  };

  const handleCopyClick = (evt: ActivityEvent) => {
    let copiedPresenters: string[] = [];
    if (evt.presenters) {
      if (Array.isArray(evt.presenters)) {
        copiedPresenters = [...evt.presenters];
      } else {
        copiedPresenters = [String(evt.presenters)];
      }
    }

    onAddEvent({
      title: `${evt.title || ''} (Salinan)`,
      date: evt.date,
      fullDate: evt.fullDate,
      time: evt.time,
      location: evt.location,
      category: evt.category,
      categoryColor: evt.categoryColor,
      description: evt.description,
      presenters: copiedPresenters
    });
    setToastMessage('Kegiatan berhasil disalin!');
    setTimeout(() => setToastMessage(null), 3500);
  };
  
  const handleEditClick = (evt: ActivityEvent) => {
    setSelectedEventForEdit(evt);
    setEventTitle(evt.title || '');
    setEventCategory(evt.category || '');
    
    let presenterText = '';
    if (evt.presenters) {
      if (Array.isArray(evt.presenters)) {
        presenterText = evt.presenters.join(', ');
      } else {
        presenterText = String(evt.presenters);
      }
    }
    setEventPresenter(presenterText);
    setEventLocation(evt.location || '');
    setEventDesc(evt.description || '');

    if (evt.time) {
      const timeParts = evt.time.split(/[-–]/);
      if (timeParts.length >= 2) {
        setEventStartTime(timeParts[0].trim());
        setEventEndTime(timeParts[1].trim());
      } else {
        setEventStartTime(evt.time);
        setEventEndTime('');
      }
    } else {
      setEventStartTime('');
      setEventEndTime('');
    }

    const dObj = getEventDateObj(evt);
    if (dObj && !isNaN(dObj.getTime())) {
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dObj.getDate()).padStart(2, '0');
      setEventDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setEventDate('');
    }

    setShowEditEventModal(true);
  };

  const handleEditEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !selectedEventForEdit || !onUpdateEvent) return;

    let eventDateStrFormatted = selectedEventForEdit.date;
    let eventFullDateFormatted = selectedEventForEdit.fullDate;

    if (eventDate) {
      const dateObj = new Date(eventDate + 'T00:00:00');
      if (!isNaN(dateObj.getTime())) {
        eventDateStrFormatted = `${dateObj.getDate()} ${dateObj.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()}`;
        eventFullDateFormatted = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    const eventTimeFormatted = eventStartTime && eventEndTime ? `${eventStartTime} - ${eventEndTime}` : (eventStartTime || selectedEventForEdit.time);

    onUpdateEvent({
      ...selectedEventForEdit,
      title: eventTitle,
      date: eventDateStrFormatted,
      fullDate: eventFullDateFormatted,
      time: eventTimeFormatted,
      location: eventLocation,
      category: (eventCategory as ActivityEvent['category']) || selectedEventForEdit.category,
      categoryColor: (eventCategory === 'Pertemuan Rutin' || eventCategory === 'Belajar Bersama') ? 'purple' : eventCategory === 'Diskusi' ? 'green' : 'blue',
      description: eventDesc,
      presenters: eventPresenter.trim() ? [eventPresenter.trim()] : []
    });

    setShowEditEventModal(false);
    setSelectedEventForEdit(null);
    setEventTitle('');
    setEventDesc('');

    setToastMessage('Jadwal kegiatan berhasil diperbarui!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper cek apakah pengguna mengakses dari perangkat mobile (Ponsel / Tablet)
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Helper memuat library html2pdf khusus saat di ponsel
  const getHtml2Pdf = async (): Promise<any> => {
    if (typeof window !== 'undefined' && (window as any).html2pdf) {
      return (window as any).html2pdf;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => reject(new Error('Gagal memuat library html2pdf.'));
      document.head.appendChild(script);
    });
  };

  const handlePrintRekapKehadiran = async () => {
    const targetEvt = events.find(e => String(e.id) === String(selectedPrintAttendanceEventId));
    if (!targetEvt) return;

    const logoPgri = localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel') || '';
    const ttdKetua = localStorage.getItem('ttd-ketua') || '';
    const stempel = localStorage.getItem('logo-stempel') || '';
    const stempelSize = localStorage.getItem('logo-stempel-size') || '100';
    const stempelRotation = localStorage.getItem('logo-stempel-rotation') || '0';

    // Tanggal saat ini dinamis (selalu menyesuaikan tanggal hari ini)
    const todayFormatted = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const eventRecords = (attendanceList || []).filter(a => String(a.eventId).trim() === String(targetEvt.id).trim());
    
    // Grouping
    const hadirList: any[] = [];
    const sakitList: any[] = [];
    const izinList: any[] = [];
    const alphaList: any[] = [];

    const activeTeachers = getSelectedTeachersForEvent(targetEvt.id, targetEvt);
    
    activeTeachers.forEach(t => {
      const record = eventRecords.find(r => 
        (r.teacherId && String(r.teacherId).trim() === String(t.id).trim()) ||
        (r.teacherName && t.name && r.teacherName.trim().toLowerCase() === t.name.trim().toLowerCase())
      );
      
      const formatTitleCaseSchool = (str: string) => {
        if (!str || str === '-') return '-';
        const acronyms = new Set(['SDN', 'SDI', 'SDS', 'SMPN', 'SMAN', 'SMKN', 'MIN', 'MTSN', 'MAN', 'TK', 'KB', 'PAUD', 'KKG', 'K3S', 'PGRI', 'UPTD', 'KORWIL']);
        return str
          .trim()
          .split(/\s+/)
          .map(word => {
            const cleanUpper = word.toUpperCase();
            if (acronyms.has(cleanUpper)) return cleanUpper;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
      };

      const teacherData = {
        name: t.name,
        nip: t.nip || '-',
        gender: getGender(t),
        school: formatTitleCaseSchool(t.school || '-'),
        phone: t.phone || '-'
      };

      if (record) {
        if (record.status === 'Hadir' || record.status === 'Verifikasi') hadirList.push(teacherData);
        else if (record.status === 'Sakit') sakitList.push(teacherData);
        else if (record.status === 'Izin') izinList.push(teacherData);
        else if (record.status === 'Alpha') alphaList.push(teacherData);
        else alphaList.push(teacherData);
      } else {
        // No record means Alpha
        alphaList.push(teacherData);
      }
    });

    // Sort all lists: Profil Kombel teratas (1-9), disusul data anggota umum (A-Z)
    const profilOrder = [
      'hanifatul susmiyah',
      'ghufron atok urrohman',
      'christian dri firman widodo',
      'risky firmansyah',
      'adi saiful rizal',
      'devy eka safitri',
      'ninik dwi sunanti',
      'dewi utami',
      'siska wahyu purwati'
    ];

    const sortHierarchical = (a: any, b: any) => {
      const aLower = (a.name || '').toLowerCase();
      const bLower = (b.name || '').toLowerCase();
      const aIdx = profilOrder.findIndex(p => aLower.includes(p));
      const bIdx = profilOrder.findIndex(p => bLower.includes(p));

      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' });
    };

    hadirList.sort(sortHierarchical);
    sakitList.sort(sortHierarchical);
    izinList.sort(sortHierarchical);
    alphaList.sort(sortHierarchical);

    const renderRows = (items: any[]) => {
      if (items.length === 0) {
        return `<tr><td colspan="6" style="text-align: center; padding: 6px; font-style: italic; color: #666; border: 1px solid #000;">Tidak ada data</td></tr>`;
      }
      return items.map((item, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${item.name}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${item.nip}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${item.gender}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${item.school}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${item.phone}</td>
        </tr>
      `).join('');
    };

    // JIKA DI PONSEL: Gunakan html2pdf untuk direct download PDF presisi
    if (isMobileDevice()) {
      let container: HTMLDivElement | null = null;
      try {
        const html2pdf = await getHtml2Pdf();
        container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '1050px';
        container.style.backgroundColor = '#ffffff';
        container.style.color = '#000000';
        container.style.fontFamily = "'Times New Roman', Times, serif";
        container.style.padding = '0';
        container.style.margin = '0';

        container.innerHTML = `
          <style>
            * { box-sizing: border-box; font-family: 'Times New Roman', Times, serif; }
            .kop-container { display: flex; align-items: center; gap: 14px; padding-bottom: 6px; position: relative; z-index: 2; }
            .kop-logo-wrapper { width: 94px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
            .kop-logo { width: 92px; height: 92px; object-fit: contain; display: block; }
            .kop-text-container { flex: 1; text-align: center; line-height: 1.18; color: #000000; padding-left: 8px; }
            .kop-org { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; }
            .kop-sub-org { font-size: 10.5pt; font-weight: bold; font-style: italic; margin-top: 1px; }
            .kop-ranting { font-size: 16.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
            .kop-wilayah { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
            .kop-sekretariat { font-size: 8.5pt; font-style: italic; margin-top: 2px; }
            .kop-divider { border-top: 2px solid #000000; border-bottom: 1px solid #000000; height: 4px; margin-bottom: 12px; position: relative; z-index: 2; }
            .title-container { text-align: center; margin-top: 16px; margin-bottom: 20px; position: relative; z-index: 2; }
            .title-box { display: inline-block; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px; }
            .title-box h2 { font-size: 14pt; font-weight: bold; margin: 0; }
            .event-info { margin-top: 4px; font-size: 11pt; }
            .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; font-size: 11pt; position: relative; z-index: 2; }
            table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 12px; position: relative; z-index: 2; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; border: 1px solid #000; padding: 5px; font-size: 9pt; }
            .signature-container { margin-top: 20px; display: flex; justify-content: flex-end; page-break-inside: avoid; position: relative; z-index: 2; }
            .signature-box { width: 250px; text-align: center; font-size: 10pt; line-height: 1.3; }
            .signature-space { height: 55px; position: relative; display: flex; align-items: center; justify-content: center; }
            .signature-img { max-height: 50px; object-fit: contain; position: relative; z-index: 1; }
            .signature-name { font-weight: bold; text-decoration: underline; }
          </style>

          <div style="position: relative; min-height: 650px;">
            <div class="kop-container">
              <div class="kop-logo-wrapper">
                ${logoPgri
                  ? `<img src="${logoPgri}" alt="Logo PGRI" class="kop-logo" />`
                  : `<div style="width: 92px; height: 92px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #64748b; text-align: center;">Logo<br/>PGRI</div>`}
              </div>
              <div class="kop-text-container">
                <div class="kop-org">PERSATUAN GURU REPUBLIK INDONESIA</div>
                <div class="kop-sub-org">(Teachers Association Of Republic Indonesia)</div>
                <div class="kop-ranting">RANTING GELANG</div>
                <div class="kop-wilayah">KECAMATAN SUMBERBARU - KABUPATEN JEMBER</div>
                <div class="kop-sekretariat">Sekretariat : Jl. PTPN XII Gunung Gambir Desa Gelang, Kecamatan Sumberbaru - Kabupaten Jember 68156</div>
              </div>
              <div style="width: 94px; flex-shrink: 0;"></div>
            </div>
            <div class="kop-divider"></div>
            <div class="title-container">
              <div class="title-box">
                <h2>REKAPITULASI KEHADIRAN PESERTA</h2>
              </div>
              <div class="event-info">
                <strong>Kegiatan:</strong> ${targetEvt.title} &nbsp;|&nbsp; <strong>Tanggal:</strong> ${targetEvt.fullDate || targetEvt.date}
              </div>
            </div>

            <!-- 1. HADIR -->
            <div class="section-title">
              <span>1. Hadir (${hadirList.length} Guru)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 4%;">No</th>
                  <th style="width: 28%;">Nama Lengkap</th>
                  <th style="width: 18%;">NIP</th>
                  <th style="width: 5%;">L/P</th>
                  <th style="width: 32%;">Asal Sekolah</th>
                  <th style="width: 13%;">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                ${renderRows(hadirList)}
              </tbody>
            </table>

            <!-- 2. SAKIT -->
            <div class="section-title">
              <span>2. Sakit (${sakitList.length} Guru)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 4%;">No</th>
                  <th style="width: 28%;">Nama Lengkap</th>
                  <th style="width: 18%;">NIP</th>
                  <th style="width: 5%;">L/P</th>
                  <th style="width: 32%;">Asal Sekolah</th>
                  <th style="width: 13%;">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                ${renderRows(sakitList)}
              </tbody>
            </table>

            <!-- 3. IZIN -->
            <div class="section-title">
              <span>3. Izin (${izinList.length} Guru)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 4%;">No</th>
                  <th style="width: 28%;">Nama Lengkap</th>
                  <th style="width: 18%;">NIP</th>
                  <th style="width: 5%;">L/P</th>
                  <th style="width: 32%;">Asal Sekolah</th>
                  <th style="width: 13%;">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                ${renderRows(izinList)}
              </tbody>
            </table>

            <!-- 4. ALPHA -->
            <div class="section-title">
              <span>4. Alpha (${alphaList.length} Guru)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 4%;">No</th>
                  <th style="width: 28%;">Nama Lengkap</th>
                  <th style="width: 18%;">NIP</th>
                  <th style="width: 5%;">L/P</th>
                  <th style="width: 32%;">Asal Sekolah</th>
                  <th style="width: 13%;">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                ${renderRows(alphaList)}
              </tbody>
            </table>

            <div class="signature-container">
              <div class="signature-box">
                <p style="margin: 0;">Jember, ${todayFormatted}</p>
                <p style="margin: 0;">Ketua PGRI Ranting Gelang</p>
                <p style="margin: 0;">Kecamatan Sumberbaru</p>
                <div class="signature-space">
                  ${stempel ? `
                    <img src="${stempel}" alt="Stempel" style="position: absolute; top: 50%; right: 50%; transform: translateY(-50%) rotate(${stempelRotation}deg); width: 3.5cm; max-height: none; opacity: 0.9; z-index: 0; pointer-events: none;" />
                  ` : ''}
                  ${ttdKetua ? `<img src="${ttdKetua}" alt="TTD Ketua" class="signature-img" style="position: relative; z-index: 1;" />` : ''}
                </div>
                <p style="margin: 0;" class="signature-name">Umar Ali Kusuma</p>
                <p style="margin: 0;">NPA. 13301500431</p>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(container);

        const opt = {
          margin: [10, 12, 10, 12],
          filename: `Rekap_Kehadiran_${targetEvt.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        await safeDownloadBlob(pdfBlob, opt.filename);
      } catch (err) {
        console.error('Gagal mengunduh PDF di ponsel:', err);
      } finally {
        if (container && document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
      setShowPrintAttendanceModal(false);
      return;
    }

    // JIKA DI PC / LAPTOP: Gunakan pratinjau cetak bawaan browser
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Rekapitulasi Kehadiran - ${targetEvt.title}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm 15mm; }
          body, table, th, td, div, p, h1, h2, h3, span { font-family: 'Times New Roman', Times, serif; }
          body { color: #000; margin: 0; padding: 0; font-size: 10pt; position: relative; }
          .kop-container { display: flex; align-items: center; gap: 14px; padding-bottom: 6px; position: relative; z-index: 2; }
          .kop-logo-wrapper { width: 94px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .kop-logo { width: 92px; height: 92px; object-fit: contain; display: block; }
          .kop-text-container { flex: 1; text-align: center; line-height: 1.18; color: #000000; padding-left: 8px; }
          .kop-org { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; }
          .kop-sub-org { font-size: 10.5pt; font-weight: bold; font-style: italic; margin-top: 1px; }
          .kop-ranting { font-size: 16.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
          .kop-wilayah { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
          .kop-sekretariat { font-size: 8.5pt; font-style: italic; margin-top: 2px; }
          .kop-divider { border-top: 2px solid #000000; border-bottom: 1px solid #000000; height: 4px; margin-bottom: 12px; position: relative; z-index: 2; }
          .title-container { text-align: center; margin-top: 20px; margin-bottom: 24px; position: relative; z-index: 2; }
          .title-box { display: inline-block; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px; }
          .title-box h2 { font-size: 14pt; font-weight: bold; margin: 0; }
          .event-info { margin-top: 4px; font-size: 11pt; }
          .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; font-size: 11pt; position: relative; z-index: 2; }
          table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 12px; position: relative; z-index: 2; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; border: 1px solid #000; padding: 5px; font-size: 9pt; }
          .signature-container { margin-top: 20px; display: flex; justify-content: flex-end; page-break-inside: avoid; position: relative; z-index: 2; }
          .signature-box { width: 250px; text-align: center; font-size: 10pt; line-height: 1.3; }
          .signature-space { height: 55px; position: relative; display: flex; align-items: center; justify-content: center; }
          .signature-img { max-height: 50px; object-fit: contain; position: relative; z-index: 1; } .signature-name { font-weight: bold; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="kop-container">
          <div class="kop-logo-wrapper">
            ${logoPgri
              ? `<img src="${logoPgri}" alt="Logo PGRI" class="kop-logo" />`
              : `<div style="width: 92px; height: 92px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #64748b; text-align: center;">Logo<br/>PGRI</div>`}
          </div>
          <div class="kop-text-container">
            <div class="kop-org">PERSATUAN GURU REPUBLIK INDONESIA</div>
            <div class="kop-sub-org">(Teachers Association Of Republic Indonesia)</div>
            <div class="kop-ranting">RANTING GELANG</div>
            <div class="kop-wilayah">KECAMATAN SUMBERBARU - KABUPATEN JEMBER</div>
            <div class="kop-sekretariat">Sekretariat : Jl. PTPN XII Gunung Gambir Desa Gelang, Kecamatan Sumberbaru - Kabupaten Jember 68156</div>
          </div>
          <div style="width: 94px; flex-shrink: 0;"></div>
        </div>
        <div class="kop-divider"></div>
        <div class="title-container">
          <div class="title-box">
            <h2>REKAPITULASI KEHADIRAN PESERTA</h2>
          </div>
          <div class="event-info">
            <strong>Kegiatan:</strong> ${targetEvt.title} &nbsp;|&nbsp; <strong>Tanggal:</strong> ${targetEvt.fullDate || targetEvt.date}
          </div>
        </div>

        <!-- 1. HADIR -->
        <div class="section-title">
          <span>1. Hadir (${hadirList.length} Guru)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 4%;">No</th>
              <th style="width: 28%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 13%;">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(hadirList)}
          </tbody>
        </table>

        <!-- 2. SAKIT -->
        <div class="section-title">
          <span>2. Sakit (${sakitList.length} Guru)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 4%;">No</th>
              <th style="width: 28%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 13%;">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(sakitList)}
          </tbody>
        </table>

        <!-- 3. IZIN -->
        <div class="section-title">
          <span>3. Izin (${izinList.length} Guru)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 4%;">No</th>
              <th style="width: 28%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 13%;">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(izinList)}
          </tbody>
        </table>

        <!-- 4. ALPHA -->
        <div class="section-title">
          <span>4. Alpha (${alphaList.length} Guru)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 4%;">No</th>
              <th style="width: 28%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 13%;">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(alphaList)}
          </tbody>
        </table>

        <div class="signature-container">
          <div class="signature-box">
            <p style="margin: 0;">Jember, ${todayFormatted}</p>
            <p style="margin: 0;">Ketua PGRI Ranting Gelang</p>
            <p style="margin: 0;">Kecamatan Sumberbaru</p>
            <div class="signature-space">
              ${stempel ? `
                <img src="${stempel}" alt="Stempel" style="position: absolute; top: 50%; right: 50%; transform: translateY(-50%) rotate(${stempelRotation}deg); width: 4.03cm; max-height: none; opacity: 0.9; z-index: 0; pointer-events: none;" />
              ` : ''}
              ${ttdKetua ? `<img src="${ttdKetua}" alt="TTD Ketua" class="signature-img" style="position: relative; z-index: 1;" />` : ''}
            </div>
            <p style="margin: 0;" class="signature-name">Umar Ali Kusuma</p>
            <p style="margin: 0;">NPA. 13301500431</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            const images = document.querySelectorAll('img');
            let loaded = 0;
            const total = images.length;
            function triggerPrint() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 150);
            }
            if (total === 0) {
              triggerPrint();
            } else {
              images.forEach(img => {
                if (img.complete) {
                  loaded++;
                  if (loaded === total) triggerPrint();
                } else {
                  img.onload = img.onerror = () => {
                    loaded++;
                    if (loaded === total) triggerPrint();
                  };
                }
              });
            }
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setShowPrintAttendanceModal(false);
  };
  
  const getAttendanceSummaryForEvent = (eventId: string) => {
    // 1. Filter absensi murni PER KEGIATAN yang dipilih (berdasarkan eventId)
    const rawRecords = (attendanceList || []).filter(a => a.eventId && String(a.eventId).trim() === String(eventId).trim());

    // 2. Deduplikasi per guru: 1 guru hanya dihitung 1 kali per kegiatan
    // Jika ada duplikasi data absensi untuk kegiatan ini, utamakan status terbaik
    const teacherMap = new Map<string, AttendanceRecord>();
    for (const rec of rawRecords) {
      const key = (rec.teacherId ? String(rec.teacherId).trim() : (rec.teacherName || '').trim().toLowerCase());
      if (!key) continue;

      if (!teacherMap.has(key)) {
        teacherMap.set(key, rec);
      } else {
        const existing = teacherMap.get(key)!;
        const priorityOrder: Record<string, number> = {
          'Hadir': 5,
          'Sakit': 4,
          'Izin': 3,
          'Verifikasi': 2,
          'Tugas Luar': 2,
          'Alpha': 1
        };
        const currentScore = priorityOrder[rec.status] || 0;
        const existingScore = priorityOrder[existing.status] || 0;
        if (currentScore > existingScore) {
          teacherMap.set(key, rec);
        }
      }
    }

    const eventEvt = (events || []).find(e => String(e.id) === String(eventId));
    const eventTargetMembers = getSelectedTeachersForEvent(eventId, eventEvt);
    const eventMemberKeys = new Set([
      ...eventTargetMembers.map(t => String(t.id).trim()),
      ...eventTargetMembers.map(t => t.name.trim().toLowerCase())
    ]);

    const allDeduplicated = Array.from(teacherMap.values());
    const records = allDeduplicated.filter(r => 
      (r.teacherId && eventMemberKeys.has(String(r.teacherId).trim())) ||
      (r.teacherName && eventMemberKeys.has(r.teacherName.trim().toLowerCase()))
    );

    const hadir = records.filter(a => a.status === 'Hadir').length;
    const izin = records.filter(a => a.status === 'Izin').length;
    const sakit = records.filter(a => a.status === 'Sakit').length;
    const verifikasi = records.filter(a => a.status === 'Verifikasi').length;
    
    // Perhitungan Alpha yang sinkron dengan data list: guru terpilih yang belum hadir/absen di kegiatan ini
    const submittedTeacherKeys = new Set<string>();
    records.forEach(r => {
      if (r.teacherId) submittedTeacherKeys.add(String(r.teacherId).trim());
      if (r.teacherName) submittedTeacherKeys.add(r.teacherName.trim().toLowerCase());
    });

    const implicitAlphasCount = eventTargetMembers.filter(t => 
      !submittedTeacherKeys.has(String(t.id).trim()) &&
      !submittedTeacherKeys.has((t.name || '').trim().toLowerCase())
    ).length;
    const explicitAlphasCount = records.filter(r => r.status === 'Alpha').length;
    const alpha = implicitAlphasCount + explicitAlphasCount;

    return { total: records.length, hadir, izin, sakit, alpha, verifikasi, records };
  };

  const sortedEvents = [...(events || [])].sort((a, b) => {
    const timeA = getEventDateObj(a).getTime();
    const timeB = getEventDateObj(b).getTime();
    return timeB - timeA;
  });

  return (
    <div className="font-sans space-y-6 relative">

      {/* Keyframes Animasi Popup Masuk & Keluar Smooth */}
      <style>{`
        @keyframes backdropFade {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); }
        }
        @keyframes smoothBackdropOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes modalPopIn {
          0% { opacity: 0; transform: scale(0.88) translateY(12px); }
          70% { transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
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
        .animate-backdrop-fade,
        .modal-backdrop-enter {
          animation: backdropFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .modal-backdrop-exit {
          animation: smoothBackdropOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-modal-pop,
        .modal-content-enter {
          animation: modalPopIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .modal-content-exit {
          animation: smoothModalOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes scanLaserMove {
          0%, 100% {
            top: 8%;
            opacity: 0.7;
          }
          50% {
            top: 92%;
            opacity: 1;
          }
        }
        .scan-laser {
          position: absolute;
          left: 0;
          right: 0;
          animation: scanLaserMove 2.2s ease-in-out infinite;
        }
      `}</style>

      
      
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom duration-200 ${
          isDark ? 'bg-stone-900 text-stone-100 border-stone-700' : 'bg-stone-900 text-white border-stone-800'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

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
            <CalendarIcon className="w-3.5 h-3.5" />
            Agenda &amp; Presensi Resmi
          </p>
          <h1 className={`font-display text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}>
            Jadwal Kegiatan &amp; Absensi Guru
          </h1>
          <p className={`text-xs sm:text-sm font-medium mt-1 max-w-xl ${
            isDark ? 'text-stone-400' : 'text-stone-600'
          }`}>
            Sistem jadwal kegiatan beserta fitur pengisian absensi dan rekap kehadiran
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {isAdmin && (
            <button
              onClick={handleOpenNewEventModal}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
              <span className="tracking-wide">Buat Agenda Baru</span>
            </button>
          )}

          <button
            onClick={() => {
              if (sortedEvents && sortedEvents.length > 0) {
                setSelectedPrintAttendanceEventId(String(sortedEvents[0].id));
              }
              setShowPrintAttendanceModal(true);
            }}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl border font-semibold text-xs sm:text-sm active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shadow-sm text-center ${
              isDark
                ? 'bg-stone-800 border-stone-700 hover:border-amber-500/40 text-stone-200 hover:bg-stone-700'
                : 'bg-white border-stone-300 hover:border-red-300 text-stone-800 hover:bg-stone-50'
            }`}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-800 dark:text-amber-400 shrink-0" />
            <span className="truncate sm:whitespace-nowrap">Rekap Kehadiran</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (sortedEvents && sortedEvents.length > 0 && !selectedSchoolStatsEventId) {
                setSelectedSchoolStatsEventId(String(sortedEvents[0].id));
              }
              setShowSchoolParticipationModal(true);
            }}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl border font-semibold text-xs sm:text-sm active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shadow-sm text-center ${
              isDark
                ? 'bg-stone-800 border-stone-700 hover:border-emerald-500/40 text-stone-200 hover:bg-stone-700'
                : 'bg-white border-stone-300 hover:border-emerald-400 text-stone-800 hover:bg-stone-50'
            }`}
          >
            <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate sm:whitespace-nowrap">Rekap Sekolah</span>
          </button>
        </div>
      </div>

      {/* DAFTAR JADWAL KEGIATAN */}
      <div className="space-y-4">
        {sortedEvents.map((evt) => {
            const summary = getAttendanceSummaryForEvent(evt.id);
            const currentDeadline = (eventDeadlines[evt.id] && eventDeadlines[evt.id].trim() !== '') ? eventDeadlines[evt.id] : formatToDDMMYYYY(evt.uploadDeadline || '');
            const badgeParts = getBadgeDateParts(evt);
            const urgency = getCountdownUrgency(currentDeadline);
            const eventInvitation = invitationFiles[evt.id] || ((evt as any).invitationUrl ? { url: (evt as any).invitationUrl, fileName: (evt as any).invitationName || 'Undangan.pdf' } : null);
            const hasUploadedInvitation = Boolean(eventInvitation && eventInvitation.url);

            const rawPresenterString = (() => {
              if (!evt.presenters) return '';
              if (Array.isArray(evt.presenters)) return evt.presenters.map(p => String(p || '').trim()).filter(Boolean).join(' ');
              return String(evt.presenters).trim();
            })();

            const hasPresenterFormatSeparator = rawPresenterString.includes(':') || rawPresenterString.includes('|');
            
            const presentersList = (() => {
              if (!rawPresenterString.trim()) return [];
              if (!hasPresenterFormatSeparator) return [rawPresenterString.trim()].filter(Boolean);
              const parts = rawPresenterString.split(/[:|]/);
              return parts.map(p => p.trim()).filter(Boolean);
            })();

            const urgencyStyles = {
              critical: isDark 
                ? 'bg-red-950/80 border-red-800 text-red-400 animate-pulse' 
                : 'bg-red-50 border-red-300 text-red-700 animate-pulse',
              warning: isDark 
                ? 'bg-amber-950/80 border-amber-800/80 text-amber-400' 
                : 'bg-amber-50 border-amber-200 text-amber-700',
              safe: isDark 
                ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-400' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700',
              expired: isDark 
                ? 'bg-stone-800/90 border-stone-700 text-stone-400' 
                : 'bg-stone-100 border-stone-200 text-stone-500'
            };

            const clockUrgencyStyles = {
              critical: 'text-red-500 animate-ping',
              warning: 'text-amber-400 animate-pulse',
              safe: 'text-emerald-500',
              expired: 'text-stone-400'
            };

            return (
              <div key={evt.id} className="flex flex-col md:flex-row items-stretch justify-between gap-4">
                
                {/* Kotak 1: Info Nama & Detail Kegiatan */}
                <div className={`flex-1 ${
                  isDark 
                    ? 'bg-stone-900 border-stone-800 hover:border-red-900/60' 
                    : 'bg-white border-stone-200/90 hover:border-red-200'
                } rounded-2xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md flex flex-col justify-between relative min-h-[240px]`}>
                  
                  {/* BAGIAN ATAS */}
                  <div className="flex items-start justify-between gap-4 w-full">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-900 to-red-700 text-amber-100 border border-red-700/60 flex flex-col items-center justify-center font-black shadow-md shrink-0 transition-transform duration-300 hover:scale-105 cursor-default">
                        <span className="font-display text-xl leading-none text-white">{badgeParts.dayNum}</span>
                        {badgeParts.monthName && (
                          <span className="text-[10px] uppercase font-extrabold tracking-wider mt-0.5 text-amber-300">{badgeParts.monthName}</span>
                        )}
                      </div>

                      <div className="flex flex-col items-start pt-1">
                        <span className={`px-3 py-0.5 rounded-lg border font-bold text-[10px] uppercase mb-1 shadow-sm ${getCategoryBadgeStyle(evt.category, isDark)}`}>
                          {evt.category}
                        </span>
                        <span className={`pl-0.5 text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'} font-medium`}>
                          {evt.fullDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {/* Tombol Pilih Anggota (Hanya Admin) */}
                      {isAdmin && (
                        <button 
                          onClick={() => handleOpenSelectMembers(evt)}
                          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                            isDark 
                              ? 'border-stone-700 text-amber-300 bg-stone-800/80 hover:bg-stone-700 hover:border-amber-500/40' 
                              : 'border-stone-300 text-red-900 bg-[#faf8f5] hover:bg-stone-100 hover:border-red-300'
                          } active:scale-95 transition-all duration-200 cursor-pointer shadow-sm`}
                          title="Pilih Anggota untuk Pertemuan Ini"
                        >
                          <Users className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-red-800'}`} />
                          <span>Pilih Anggota</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const msg =
                            `📢 *UNDANGAN / AGENDA PGRI RANTING GELANG*\n` +
                            `Kecamatan Sumberbaru - Kabupaten Jember\n\n` +
                            `📌 *Kegiatan:* ${evt.title}\n` +
                            `📅 *Tanggal:* ${evt.fullDate || evt.date}\n` +
                            `⏰ *Waktu:* ${evt.time || '-'}\n` +
                            `📍 *Lokasi:* ${evt.location || '-'}\n` +
                            `${presentersList.length > 0 ? `👤 *Narasumber:* ${presentersList.join(', ')}\n` : ''}` +
                            `${evt.description ? `\n📝 *Keterangan:* ${evt.description}\n` : ''}` +
                            `\nMohon kehadiran Bapak/Ibu tepat waktu & mengisi presensi. Terima kasih.`;
                          openWhatsAppShare(msg);
                        }}
                        className={`flex items-center gap-1 px-2.5 h-8 rounded-xl border text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                          isDark
                            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-500/20'
                            : 'border-emerald-500/40 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                        title="Bagikan jadwal kegiatan ke grup WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WA</span>
                      </button>

                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleEditClick(evt)}
                            className={`w-8 h-8 rounded-xl border ${isDark ? 'border-stone-700 bg-stone-800/60 text-amber-400 hover:bg-stone-700 hover:border-amber-500/40' : 'border-stone-200 bg-[#faf8f5] text-red-800 hover:bg-red-50 hover:border-red-300'} active:scale-90 flex items-center justify-center transition-all duration-200 cursor-pointer`}
                            title="Edit Kegiatan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleCopyClick(evt)}
                            className={`w-8 h-8 rounded-xl border ${isDark ? 'border-stone-700 bg-stone-800/60 text-stone-300 hover:bg-stone-700 hover:text-amber-300' : 'border-stone-200 bg-[#faf8f5] text-amber-700 hover:bg-amber-50 hover:border-amber-300'} active:scale-90 flex items-center justify-center transition-all duration-200 cursor-pointer`}
                            title="Salin / Duplikat Kegiatan"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(evt)}
                            className={`w-8 h-8 rounded-xl border ${isDark ? 'border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-950/70' : 'border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100'} active:scale-90 flex items-center justify-center transition-all duration-200 cursor-pointer`}
                            title="Hapus Kegiatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* BAGIAN TENGAH */}
                  <div className="mt-4 flex flex-col items-start text-left w-full space-y-3 flex-1">
                    <div className="w-full">
                      <h3 className={`font-display text-base sm:text-lg font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'} leading-snug mb-1`}>
                        {evt.title}
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'} font-normal leading-relaxed`}>
                        {evt.description}
                      </p>
                    </div>

                    {presentersList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 w-full">
                        <span className={`text-[11px] font-bold ${isDark ? 'text-amber-400' : 'text-red-800'} flex items-center gap-1 mr-1 shrink-0`}>
                          <User className="w-3 h-3" /> Narasumber :
                        </span>
                        {hasPresenterFormatSeparator ? (
                          presentersList.map((pName, idx) => (
                            <span 
                              key={idx} 
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                                isDark 
                                  ? 'bg-stone-800/80 border-stone-700/80 text-stone-200' 
                                  : 'bg-[#faf8f5] border-stone-200 text-stone-700'
                              }`}
                            >
                              {pName}
                            </span>
                          ))
                        ) : (
                          <span className={`text-[11px] font-medium ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                            {presentersList.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`w-full border-t ${isDark ? 'border-stone-800' : 'border-stone-200/70'} my-3`} />

                  {/* BAGIAN BAWAH */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs w-full sm:w-auto">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-medium ${
                        isDark ? 'bg-stone-800/60 border-stone-700/70 text-stone-300' : 'bg-[#faf8f5] border-stone-200/80 text-stone-700'
                      }`}>
                        <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-red-800'}`} />
                        <span>{evt.time}</span>
                      </div>

                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-medium ${
                        isDark ? 'bg-stone-800/60 border-stone-700/70 text-stone-300' : 'bg-[#faf8f5] border-stone-200/80 text-stone-700'
                      }`}>
                        <MapPin className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-red-800'}`} />
                        <span>{evt.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center sm:items-end self-center sm:self-end shrink-0 w-full sm:w-auto">
                      {/* Penataan Responsif */}
                      <div className="flex flex-col items-center w-full sm:w-auto">
                        <span className="text-[10px] uppercase font-extrabold text-stone-400 tracking-wider mb-1 flex items-center justify-center w-full gap-1 text-center">
                          <Clock className={`w-3 h-3 ${clockUrgencyStyles[urgency]}`} />
                          Batas Pengisian Absensi
                        </span>

                        <div className="flex flex-col items-center sm:flex-row sm:justify-end gap-2 w-full">
                          {/* Kotak Countdown */}
                          <div className={`px-3 py-1.5 rounded-xl border font-mono font-black text-xs sm:text-sm tracking-wider shadow-sm text-center transition-colors duration-300 order-1 sm:order-2 ${urgencyStyles[urgency]}`}>
                            {getCountdownText(currentDeadline)}
                          </div>

                          {/* Baris Tombol Undangan & Pilih Anggota di Ponsel */}
                          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto order-2 sm:order-1">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEventForUndangan(evt);
                                  setUndanganFile(null);
                                  setShowUploadUndanganModal(true);
                                }}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 ${
                                  hasUploadedInvitation
                                    ? (isDark ? 'bg-stone-800/90 border-stone-700 text-stone-400 hover:bg-stone-700/70' : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200/70')
                                    : (isDark ? 'bg-stone-800/80 border-stone-700 text-amber-300 hover:bg-stone-700 hover:border-amber-500/40' : 'bg-[#faf8f5] border-stone-300 text-red-900 hover:bg-red-50 hover:border-red-300')
                                }`}
                                title={hasUploadedInvitation ? "Undangan sudah diunggah (Klik untuk ganti file)" : "Upload Surat Undangan Kegiatan (PDF)"}
                              >
                                <UploadCloud className={`w-3.5 h-3.5 ${hasUploadedInvitation ? (isDark ? 'text-stone-400' : 'text-stone-500') : (isDark ? 'text-amber-400' : 'text-red-800')}`} />
                                <span>{hasUploadedInvitation ? 'Ganti Undangan' : 'Upload Undangan'}</span>
                              </button>
                            )}

                            {hasUploadedInvitation && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleDownloadFile(eventInvitation.url, eventInvitation.fileName || 'Undangan.pdf');
                                }}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 ${
                                  isDark 
                                    ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/60' 
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                }`}
                                title="Unduh Langsung Surat Undangan"
                              >
                                <Download className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                <span>Unduh Undangan</span>
                              </button>
                            )}

                            {/* Tombol Pilih Anggota Khusus Ponsel (Hanya Admin) */}
                            {isAdmin && (
                              <button 
                                onClick={() => handleOpenSelectMembers(evt)}
                                className={`flex sm:hidden items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                                  isDark 
                                    ? 'border-stone-700 text-amber-300 bg-stone-800/80 hover:bg-stone-700' 
                                    : 'border-stone-300 text-red-900 bg-[#faf8f5] hover:bg-stone-100'
                                } active:scale-95 transition-all duration-200 cursor-pointer shadow-sm`}
                                title="Pilih Anggota untuk Pertemuan Ini"
                              >
                                <Users className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-red-800'}`} />
                                <span>Pilih Anggota</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kotak 2: Panel Tombol & Status */}
                <div className={`w-full md:w-[320px] ${
                  isDark 
                    ? 'bg-stone-900 border-stone-800 hover:border-red-900/60' 
                    : 'bg-white border-stone-200/90 hover:border-red-200'
                } rounded-2xl p-5 shadow-sm border transition-all duration-300 hover:shadow-md flex flex-col items-stretch justify-center gap-3.5 shrink-0`}>
                  
                  {/* Absensi Section */}
                  <div className="flex flex-col gap-2.5">
                    <div className={`${isDark ? 'bg-stone-800/70 border-stone-700/70' : 'bg-[#faf8f5] border-stone-200/80'} px-3.5 py-2.5 rounded-xl border text-center`}>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-0.5">Status Kehadiran</p>
                      <p className={`text-[11px] font-bold ${isDark ? 'text-stone-200' : 'text-stone-800'}`}>
                        <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-extrabold`}>{summary.hadir} Hadir</span>  •  {summary.sakit} Sakit  •  {summary.izin} Izin  •  {summary.alpha} Alpha
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenAbsensi(evt)}
                        className="w-full px-3 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Isi Absensi</span>
                      </button>

                      <button
                        onClick={() => { setViewEventAttendance(evt); setAttendanceFilter('Hadir'); }}
                        className="w-full px-3 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs shadow-sm active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Daftar Hadir</span>
                      </button>
                    </div>
                  </div>

                  <div className={`border-t ${isDark ? 'border-stone-800' : 'border-stone-200/70'} -my-0.5`} />

                  {/* Batas Waktu Absensi Section */}
                  <div className={`${isDark ? 'bg-stone-800/70 border-stone-700/70' : 'bg-[#faf8f5] border-stone-200/80'} px-3.5 py-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5`}>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Batas Waktu Absensi</p>
                    <input 
                      type="text"
                      placeholder="14/08/2026"
                      disabled={!isAdmin}
                      value={currentDeadline}
                      onChange={(e) => {
                        if (!isAdmin) return;
                        const newDeadline = e.target.value;
                        setEventDeadlines(prev => ({ ...prev, [evt.id]: newDeadline }));
                      }}
                      onBlur={() => {
                        if (!isAdmin) return;
                        const targetDl = eventDeadlines[evt.id] || currentDeadline;
                        if (targetDl && onUpdateEvent) {
                          try {
                            localStorage.setItem('kombel-event-deadlines', JSON.stringify({ ...eventDeadlines, [evt.id]: targetDl }));
                          } catch (e) {}
                          onUpdateEvent({ ...evt, uploadDeadline: targetDl });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className={`bg-transparent border-none text-xs font-bold font-mono focus:ring-0 ${isDark ? 'text-stone-100' : 'text-stone-800'} text-center w-full max-w-[150px] p-0 m-0 ${!isAdmin ? 'cursor-not-allowed opacity-80' : ''} placeholder-stone-400`}
                      title={!isAdmin ? "Hanya Admin yang dapat mengubah batas waktu absensi" : "Atur batas waktu absensi (format: tanggal/bulan/tahun, contoh: 14/08/2026)"}
                    />
                  </div>

                </div>

              </div>
            );
        })}
      </div>

      {/* MODAL SCANNER BARCODE ABSENSI (Hanya Admin) */}
      {showScannerModal && selectedEvent && (
        <div className={`fixed inset-0 z-[80] bg-black flex flex-col justify-between overflow-hidden ${isClosingScannerModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`relative w-full h-full flex flex-col justify-between overflow-hidden ${isClosingScannerModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>

            {/* Video Kamera Penuh Satu Layar */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              muted
              autoPlay
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Header Scanner Melayang di Atas Kamera */}
            <div className={`relative z-30 w-full flex items-center justify-between px-4 sm:px-6 py-4 border-b shadow-lg shrink-0 ${
              isDark
                ? 'bg-stone-900 border-stone-800'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-red-950/70 text-amber-400 border border-red-800/60'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-stone-900'}`}>
                    Scan Barcode Presensi
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                    Arahkan kamera ke Barcode / QR Code Guru
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-amber-400'
                      : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-red-800'
                  }`}
                  title={facingMode === 'environment' ? 'Ubah ke Kamera Depan' : 'Ubah ke Kamera Belakang'}
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseScannerModal}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-200 hover:text-white'
                      : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Area Tengah Bingkai Fokus & Animasi Scan */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pointer-events-none overflow-hidden">
              {/* Badge Mode Kamera */}
              <div className="relative z-20 mb-4">
                <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-900/90 text-white backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-lg">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
                </span>
              </div>

              {/* Kotak Target Barcode & Animasi Laser */}
              {!scannerError && (
                <div className="relative z-10 w-64 h-64 sm:w-80 sm:h-80 border-2 border-dashed border-amber-400/80 rounded-2xl overflow-hidden shadow-[0_0_0_9999px_rgba(12,10,9,0.55)]">
                  {/* Sudut Bingkai Fokus */}
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                  {/* Sinar Laser Scanning Naik-Turun */}
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent scan-laser shadow-[0_0_16px_rgba(239,68,68,0.95)]" />
                </div>
              )}
            </div>

            {/* Tampilan Error Kamera Fullscreen */}
            {scannerError && (
              <div className="absolute inset-0 z-20 bg-stone-950/95 p-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-stone-200 leading-relaxed px-2 max-w-sm">
                  {scannerError}
                </p>
                <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScannerError(null);
                      setCameraRetryCount(c => c + 1);
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Hubungkan Kamera</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Kontrol Kamera & Info Kegiatan */}
            <div className={`relative z-30 w-full flex flex-col items-center gap-2.5 px-4 py-4 border-t shadow-lg shrink-0 ${
              isDark
                ? 'bg-stone-900 border-stone-800'
                : 'bg-white border-stone-200'
            }`}>
              <button
                type="button"
                onClick={toggleFacingMode}
                className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 shadow-sm ${
                  isDark
                    ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-amber-300'
                    : 'bg-[#faf8f5] hover:bg-stone-100 border-stone-300 text-red-900'
                }`}
                title="Klik untuk ubah kamera depan atau belakang"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span>Ubah Kamera ({facingMode === 'environment' ? 'Depan' : 'Belakang'})</span>
              </button>

              <p className={`text-xs font-medium text-center ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                Kegiatan: <strong className={isDark ? 'text-white' : 'text-stone-900'}>{selectedEvent.title}</strong>
              </p>
            </div>

            {/* POPUP NOTIFIKASI SUKSES SCAN 2.5 DETIK */}
            {scannedSuccessTeacher && (
              <div className="absolute inset-0 z-40 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
                {/* Icon Sesuai Jenis Kelamin */}
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 mb-4 animate-bounce ${
                  getGender(scannedSuccessTeacher) === 'P'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                    : 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                }`}>
                  <User className="w-10 h-10" />
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-sm tracking-wider">
                    Kehadiran Tercatat!
                  </span>
                  {/* Nama Lengkap */}
                  <h4 className="font-display font-black text-lg text-white pt-1 leading-snug">
                    {scannedSuccessTeacher.name}
                  </h4>
                  {/* NIP */}
                  <p className="font-mono text-xs font-bold text-stone-300">
                    NIP. {scannedSuccessTeacher.nip || '-'}
                  </p>
                  {/* Nama Sekolah */}
                  <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{scannedSuccessTeacher.school}</span>
                  </p>
                </div>
              </div>
            )}

            {/* POPUP NOTIFIKASI SUDAH ABSEN (HADIR / SAKIT / IZIN) 2.5 DETIK */}
            {scannedAlreadyTeacher && (
              <div className="absolute inset-0 z-40 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
                {/* Icon Sesuai Jenis Kelamin */}
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 mb-4 animate-bounce ${
                  getGender(scannedAlreadyTeacher.teacher) === 'P'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                    : 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                }`}>
                  <User className="w-10 h-10" />
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-600 text-white shadow-sm tracking-wider">
                    Sudah Melakukan Absensi ({scannedAlreadyTeacher.status})
                  </span>
                  {/* Nama Lengkap */}
                  <h4 className="font-display font-black text-lg text-white pt-1 leading-snug">
                    {scannedAlreadyTeacher.teacher.name}
                  </h4>
                  {/* NIP */}
                  <p className="font-mono text-xs font-bold text-stone-300">
                    NIP. {scannedAlreadyTeacher.teacher.nip || '-'}
                  </p>
                  {/* Nama Sekolah */}
                  <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{scannedAlreadyTeacher.teacher.school}</span>
                  </p>
                  <p className="text-[11px] font-medium text-stone-300 pt-1">
                    Guru ini sudah tercatat absensi dengan keterangan <strong className="text-white">{scannedAlreadyTeacher.status}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* POPUP NOTIFIKASI BARCODE TIDAK TERDAFTAR 2.5 DETIK */}
            {scannedErrorBarcode && (
              <div className="absolute inset-0 z-40 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 mb-4 animate-bounce bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700">
                  <X className="w-10 h-10" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-700 text-white shadow-sm tracking-wider">
                    Barcode Tidak Terdaftar
                  </span>
                  <p className="font-mono text-xs font-bold text-stone-300 pt-2 break-all px-4">
                    {scannedErrorBarcode}
                  </p>
                  <p className="text-[11px] font-medium text-stone-300 pt-1">
                    Data tidak ditemukan pada daftar guru untuk barcode ini.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
      
      {/* MODAL PILIH ANGGOTA PERTEMUAN (HANYA ADMIN) */}
      {showSelectMembersModal && selectedEventForMembers && (
        <div className={`fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto custom-scrollbar ${isClosingSelectMembersModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border my-8 max-h-[90vh] flex flex-col ${isClosingSelectMembersModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            {/* Header Modal */}
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'} shrink-0`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
                    Pilih Anggota Pertemuan
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    {selectedEventForMembers.title} • {selectedEventForMembers.fullDate}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleCloseSelectMembers} 
                className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Search Bar */}
            <div className="py-3 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Search */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Cari nama guru atau sekolah..."
                    className={`w-full pl-3.5 pr-8 py-2 rounded-xl text-xs ${
                      isDark 
                        ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' 
                        : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'
                    } border focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  />
                  {memberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMemberSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Counter & Action Buttons */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${
                    isDark ? 'bg-red-950/60 text-amber-300 border border-red-800/60' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {tempSelectedMemberIds.length} Dipilih
                  </span>

                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                  >
                    Pilih Semua
                  </button>

                  <button
                    type="button"
                    onClick={handleDeselectAllMembers}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-red-400 border border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-red-700 border border-stone-200'
                    }`}
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border text-[11px] ${
                isDark ? 'bg-amber-950/25 border-amber-900/40 text-amber-300/90' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                Anggota yang diceklist akan muncul pada <strong>Isi Absensi</strong> dan <strong>Daftar Hadir</strong> untuk pertemuan ini.
              </div>
            </div>

            {/* List / Tabel Data Anggota */}
            <div className="flex-1 overflow-y-auto pr-1 pb-2 custom-scrollbar min-h-[220px]">
              {(() => {
                const allCandidates = getAllCandidateMembers();
                const filtered = allCandidates.filter(t => {
                  if (!memberSearchQuery.trim()) return true;
                  const q = memberSearchQuery.toLowerCase();
                  return (
                    (t.name && t.name.toLowerCase().includes(q)) ||
                    (t.school && t.school.toLowerCase().includes(q)) ||
                    (t.nip && String(t.nip).includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className={`py-12 text-center text-xs ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                      Tidak ada data anggota yang cocok dengan pencarian &quot;{memberSearchQuery}&quot;.
                    </div>
                  );
                }

                return (
                  <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-stone-800 bg-stone-900/60' : 'border-stone-200 bg-white'}`}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className={isDark ? 'bg-stone-800/90 text-stone-300 border-b border-stone-800' : 'bg-[#faf8f5] text-stone-700 border-b border-stone-200'}>
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">
                            {(() => {
                              const isAllSelected = filtered.length > 0 && filtered.every(t => tempSelectedMemberIds.includes(String(t.id)));
                              return (
                                <div
                                  onClick={() => {
                                    if (isAllSelected) {
                                      const removeIds = new Set(filtered.map(t => String(t.id)));
                                      setTempSelectedMemberIds(prev => prev.filter(id => !removeIds.has(id)));
                                    } else {
                                      const addIds = filtered.map(t => String(t.id));
                                      setTempSelectedMemberIds(prev => Array.from(new Set([...prev, ...addIds])));
                                    }
                                  }}
                                  className={`w-4 h-4 mx-auto rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 select-none ${
                                    isAllSelected
                                      ? 'bg-red-800 text-white shadow-sm'
                                      : isDark
                                      ? 'border border-stone-600 bg-stone-800 hover:border-amber-400'
                                      : 'border border-stone-300 bg-white hover:border-red-700'
                                  }`}
                                >
                                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              );
                            })()}
                          </th>
                          <th className="py-2.5 px-2.5 w-12 text-center font-bold">No.</th>
                          <th className="py-2.5 px-3 font-bold">Nama Lengkap</th>
                          <th className="py-2.5 px-3 font-bold">Nama Sekolah</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-stone-800/80' : 'divide-stone-100'}`}>
                        {filtered.map((t, idx) => {
                          const isChecked = tempSelectedMemberIds.includes(String(t.id));
                          return (
                            <tr
                              key={t.id}
                              onClick={() => handleToggleMember(t.id)}
                              className={`cursor-pointer transition-colors ${
                                isChecked
                                  ? (isDark ? 'bg-red-950/35 hover:bg-red-950/55' : 'bg-red-50/70 hover:bg-red-50')
                                  : (isDark ? 'hover:bg-stone-800/50' : 'hover:bg-[#faf8f5]')
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => { e.stopPropagation(); handleToggleMember(t.id); }}>
                                <div
                                  className={`w-4 h-4 mx-auto rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 select-none ${
                                    isChecked
                                      ? 'bg-red-800 text-white shadow-sm'
                                      : isDark
                                      ? 'border border-stone-600 bg-stone-800 hover:border-amber-400'
                                      : 'border border-stone-300 bg-white hover:border-red-700'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </td>
                              <td className={`py-2.5 px-2.5 text-center font-semibold ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`font-bold block ${isDark ? 'text-stone-200' : 'text-stone-800'}`}>
                                  {t.name}
                                </span>
                                {t.nip && t.nip !== '-' && (
                                  <span className={`text-[10px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                                    NIP. {t.nip}
                                  </span>
                                )}
                              </td>
                              <td className={`py-2.5 px-3 font-medium uppercase ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                                {(t.school || '-').toUpperCase()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer Modal */}
            <div className={`pt-4 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'} flex items-center justify-between gap-3 shrink-0`}>
              <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                {tempSelectedMemberIds.length} anggota akan disimpan untuk pertemuan ini.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseSelectMembers}
                  className={`px-4 py-2 rounded-xl border ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'} font-bold text-xs transition-colors cursor-pointer`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveSelectedMembers}
                  className="px-5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Simpan Pilihan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL UPLOAD UNDANGAN KEGIATAN */}
      {showUploadUndanganModal && selectedEventForUndangan && (
        <div className={`fixed inset-0 z-[65] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto custom-scrollbar ${isClosingUploadUndanganModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-8 ${isClosingUploadUndanganModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Upload Undangan Kegiatan</h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Unggah file surat undangan resmi (PDF)</p>
                </div>
              </div>
              <button onClick={() => setShowUploadUndanganModal(false)} className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-red-950/35 border-red-900/50' : 'bg-[#faf8f5] border-stone-200'}`}>
                <p className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-red-900'}`}>{selectedEventForUndangan.title}</p>
                <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'} mt-1`}>{selectedEventForUndangan.fullDate}</p>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-2`}>Pilih File Surat Undangan (PDF)</label>
                <div className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                  undanganFile 
                    ? (isDark ? 'border-emerald-500/50 bg-emerald-500/5 shadow-inner' : 'border-emerald-500 bg-emerald-50 shadow-inner') 
                    : (isDark ? 'border-stone-700 hover:border-amber-500/60 hover:bg-stone-800/50 animated-dropzone' : 'border-stone-300 hover:border-red-400 hover:bg-[#faf8f5] animated-dropzone')
                }`}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const fileNameLower = file.name.toLowerCase();
                        const isPdf = fileNameLower.endsWith('.pdf') || file.type === 'application/pdf';

                        if (!isPdf) {
                          e.target.value = '';
                          setToastMessage('Hanya file berformat PDF yang dapat diunggah!');
                          setTimeout(() => setToastMessage(null), 3000);
                          return;
                        }

                        const maxSizeBytes = 5 * 1024 * 1024;
                        if (file.size > maxSizeBytes) {
                          e.target.value = '';
                          setToastMessage('Ukuran file melebihi batas 5 MB!');
                          setTimeout(() => setToastMessage(null), 3000);
                          return;
                        }

                        setUndanganFile(file);
                      }
                    }}
                  />
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 ${undanganFile ? (isDark ? 'bg-emerald-500/20 text-emerald-400 scale-110' : 'bg-emerald-100 text-emerald-600 scale-110') : (isDark ? 'bg-stone-800 text-amber-400' : 'bg-red-50 text-red-800')}`}>
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${isDark ? 'text-stone-200' : 'text-stone-800'}`}>
                      {undanganFile ? undanganFile.name : 'Klik atau seret file PDF ke sini'}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                      {undanganFile ? formatFileSize(undanganFile.size) : 'File PDF Surat Undangan (Maksimal 5 MB)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`pt-4 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'} flex justify-end gap-2`}>
              <button
                type="button"
                onClick={() => setShowUploadUndanganModal(false)}
                className={`px-4 py-2 rounded-xl border ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'} font-bold text-xs transition-colors cursor-pointer`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!undanganFile || isUploadingUndangan}
                onClick={() => {
                  if (!undanganFile || !selectedEventForUndangan) return;
                  setIsUploadingUndangan(true);

                  const fileNameToSave = `Undangan - ${selectedEventForUndangan.title}.pdf`;
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    try {
                      const fullDataUrl = reader.result as string;
                      const base64String = fullDataUrl.split(',')[1];
                      const payload = {
                        base64: base64String,
                        fileName: fileNameToSave,
                        mimeType: undanganFile.type || 'application/pdf'
                      };

                      let finalDriveUrl = '';
                      try {
                        const response = await fetch(GAS_WEB_APP_URL, {
                          method: 'POST',
                          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                          body: JSON.stringify(payload)
                        });
                        const textRes = await response.text();
                        const result = JSON.parse(textRes);
                        if (result.status === 'success' || result.result === 'success' || result.success === true || result.status === 'ok') {
                          finalDriveUrl = result.downloadUrl || result.driveUrl || result.url || result.fileUrl || '';
                        }
                      } catch (gasErr) {
                        console.warn('GAS upload undangan fallback check:', gasErr);
                      }

                      // Jika Google Drive gagal namun ukuran file <= 350 KB, gunakan Data URL yang aman bagi kuota 1MB Firestore
                      if (!finalDriveUrl && undanganFile.size <= 350 * 1024) {
                        finalDriveUrl = fullDataUrl;
                      }

                      if (finalDriveUrl) {
                        setInvitationFiles(prev => ({
                          ...prev,
                          [selectedEventForUndangan.id]: {
                            url: finalDriveUrl,
                            fileName: fileNameToSave
                          }
                        }));

                        if (onUpdateEvent) {
                          onUpdateEvent({
                            ...selectedEventForUndangan,
                            invitationUrl: finalDriveUrl,
                            invitationName: fileNameToSave
                          } as any);
                        }

                        setToastMessage('Surat undangan berhasil diunggah!');
                      } else {
                        setToastMessage('Ukuran surat undangan terlalu besar untuk disimpan langsung tanpa Google Drive (maks 350 KB) atau koneksi gagal.');
                      }
                    } catch (err) {
                      setToastMessage('Terjadi kesalahan saat mengunggah undangan.');
                    } finally {
                      setIsUploadingUndangan(false);
                      setShowUploadUndanganModal(false);
                      setUndanganFile(null);
                      setTimeout(() => setToastMessage(null), 3500);
                    }
                  };
                  reader.readAsDataURL(undanganFile);
                }}
                className={`px-5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 ${
                  (!undanganFile || isUploadingUndangan) ? 'opacity-40 cursor-not-allowed shadow-none' : 'active:scale-95 cursor-pointer'
                }`}
              >
                <span>{isUploadingUndangan ? 'Mengunggah...' : 'Simpan Undangan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* POPUP PILIH JADWAL REKAP KEHADIRAN */}
      {showPrintAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-modal-pop`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Unduh Rekap Kehadiran</h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Pilih jadwal kegiatan untuk diunduh</p>
                </div>
              </div>
              <button onClick={() => setShowPrintAttendanceModal(false)} className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1.5`}>
                  Pilih Jadwal Kegiatan <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPrintAttendanceEventId}
                  onChange={(e) => setSelectedPrintAttendanceEventId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-[#faf8f5] border-stone-200 text-stone-800'} border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                >
                  {(sortedEvents || []).map(evt => (
                    <option key={evt.id} value={evt.id} className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>
                      {evt.title} ({evt.date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`pt-4 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'} flex items-center justify-end gap-2`}>
              <button
                type="button"
                onClick={() => setShowPrintAttendanceModal(false)}
                className={`px-4 py-2.5 rounded-xl border ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'} font-bold text-xs transition-colors cursor-pointer`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedPrintAttendanceEventId}
                onClick={handlePrintRekapKehadiran}
                className="px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Unduh Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL FILL ATTENDANCE */}
      {showAbsensiModal && selectedEvent && (
        <div className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto custom-scrollbar ${isClosingAbsensiModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-8 ${isClosingAbsensiModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Form Ketidakhadiran Anggota</h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>{selectedEvent.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAbsensiModal(false)}
                className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAbsensiSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                      Pilih Guru
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={availableAbsensiTeachers.length === 0}
                        onClick={() => setConfirmHadirSemua(true)}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all ${
                          availableAbsensiTeachers.length === 0
                            ? 'opacity-40 cursor-not-allowed border-stone-700 bg-stone-800/40 text-stone-500'
                            : isDark
                            ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300 hover:bg-emerald-900/70 cursor-pointer active:scale-95'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer active:scale-95'
                        }`}
                        title="Tandai semua guru yang tersisa di daftar sebagai Hadir"
                      >
                        Hadir Semua ({availableAbsensiTeachers.length})
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value);
                      const found = availableAbsensiTeachers.find(t => String(t.id) === String(e.target.value));
                      if (found) setSchoolName(found.school);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-[#faf8f5] border-stone-200 text-stone-800'} border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  >
                    {availableAbsensiTeachers.length > 0 ? (
                      availableAbsensiTeachers.map(t => (
                        <option key={t.id} value={t.id} className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>
                          {t.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled className={isDark ? "bg-stone-800 text-stone-400" : "bg-white text-stone-400"}>
                        Semua anggota sudah absen
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    NIP
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={availableAbsensiTeachers.find(t => String(t.id) === String(selectedTeacherId))?.nip || '-'}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800/50 border-stone-700/50 text-stone-400' : 'bg-stone-100 border-stone-200 text-stone-500'} border text-xs font-medium cursor-not-allowed`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>Jenis Kelamin</label>
                  <input
                    type="text"
                    readOnly
                    value={getGender(availableAbsensiTeachers.find(t => String(t.id) === String(selectedTeacherId))) === 'L' ? 'Laki - Laki' : 'Perempuan'}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800/50 border-stone-700/50 text-stone-400' : 'bg-stone-100 border-stone-200 text-stone-500'} border text-xs font-medium cursor-not-allowed`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>Asal Sekolah</label>
                  <input
                    type="text"
                    readOnly
                    value={availableAbsensiTeachers.find(t => String(t.id) === String(selectedTeacherId))?.school || '-'}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800/50 border-stone-700/50 text-stone-400' : 'bg-stone-100 border-stone-200 text-stone-500'} border text-xs font-medium cursor-not-allowed`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Status Kehadiran <span className="text-red-500">*</span>
                </label>
                <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                  {(isAdmin ? ['Hadir', 'Sakit', 'Izin'] : ['Sakit', 'Izin']).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAttendanceStatus(status as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        attendanceStatus === status
                          ? 'bg-red-800 text-white border-red-800 shadow-sm'
                          : isDark
                          ? 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
                          : 'bg-[#faf8f5] text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>Catatan / Alasan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Masukkan keterangan tambahan (${attendanceStatus})...`}
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div className={`p-3 rounded-xl ${isDark ? 'bg-red-950/35 border-red-900/50 text-amber-200' : 'bg-[#faf8f5] border-stone-200 text-stone-700'} border flex items-start gap-2 text-xs font-medium`}>
                <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-red-800'} shrink-0 mt-0.5`} />
                <span>
                  Presensi ini dicatat secara digital dan tersimpan dalam sistem
                </span>
              </div>

              <div className={`pt-3 flex items-center justify-between gap-3 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
                {/* Tombol Scan Barcode di Pojok Kiri (Hanya Akses Admin) */}
                <div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenScanner}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 shadow-sm ${
                        isDark
                          ? 'bg-stone-800 border-stone-700 text-amber-300 hover:bg-stone-700'
                          : 'bg-[#faf8f5] border-stone-300 text-red-900 hover:bg-stone-100'
                      }`}
                      title="Scan Barcode / QR Code Presensi (Khusus Admin)"
                    >
                      <QrCode className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-red-800'}`} />
                      <span>Scan Barcode</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAbsensiModal(false)}
                    className={`px-4 py-2.5 rounded-xl border ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'} font-bold text-xs transition-colors cursor-pointer`}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={availableAbsensiTeachers.length === 0}
                    className={`px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all ${
                      availableAbsensiTeachers.length === 0 ? 'opacity-50 cursor-not-allowed shadow-none' : 'active:scale-95 cursor-pointer'
                    }`}
                  >
                    Kirim Presensi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HADIR SEMUA */}
      {isAdmin && confirmHadirSemua && selectedEvent && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-modal-pop`}>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                isDark ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Konfirmasi Hadir Semua
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                  {selectedEvent.title}
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
              Apakah Anda yakin ingin mencatat seluruh <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{availableAbsensiTeachers.length} guru</strong> yang tersisa pada kolom pilihan menjadi berstatus <strong className={isDark ? 'text-white' : 'text-stone-900'}>Hadir</strong>?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmHadirSemua(false)}
                className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                  isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleHadirSemuaSubmit}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Ya, Hadir Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALERT: PERINGATAN / ABSENSI KADALUARSA */}
      {expiredEventAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-sm w-full p-6 shadow-2xl border space-y-4 animate-modal-pop text-center`}>
            <div className={`w-16 h-16 mx-auto rounded-2xl border ${isDark ? 'bg-amber-900/40 border-amber-800/60' : 'bg-amber-100 border-amber-200'} flex items-center justify-center`}>
              <Clock className={`w-8 h-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className={`font-display font-black text-lg ${isDark ? 'text-white' : 'text-stone-900'}`}>
                {expiredEventAlert.title}
              </h3>
              <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                {expiredEventAlert.eventTitle && (
                  <>Kegiatan: <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-red-800'}`}>"{expiredEventAlert.eventTitle}"</span><br/><br/></>
                )}
                {expiredEventAlert.message}
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

      {/* MODAL HAPUS KEHADIRAN */}
      {deleteAttendanceTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-modal-pop`}>
            <div className={`flex items-center gap-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              <div className={`w-10 h-10 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60' : 'bg-red-50 border-red-200'} flex items-center justify-center shrink-0`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display font-bold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Konfirmasi Hapus Data
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                  Apakah Anda yakin ingin menghapus data kehadiran <strong className="underline">{deleteAttendanceTarget.teacherName}</strong>?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteAttendanceTarget(null)}
                className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'}`}
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!deleteAttendanceTarget) return;
                  const { id, teacherId, teacherName } = deleteAttendanceTarget;
                  setDeleteAttendanceTarget(null);

                  let allOk = true;
                  if (onDeleteAttendance) {
                    const matchingRecords = (attendanceList || []).filter(a => 
                      String(a.eventId).trim() === String(viewEventAttendance?.id).trim() &&
                      (
                        (teacherId && a.teacherId && String(a.teacherId).trim() === String(teacherId).trim()) ||
                        (teacherName && a.teacherName && a.teacherName.trim().toLowerCase() === teacherName.trim().toLowerCase()) ||
                        a.id === id
                      )
                    );
                    if (matchingRecords.length > 0) {
                      const results = await Promise.all(matchingRecords.map(m => onDeleteAttendance(m.id)));
                      if (results.some(r => r === false)) allOk = false;
                    } else {
                      const res = await onDeleteAttendance(id);
                      if (res === false) allOk = false;
                    }
                  }
                  setToastMessage(
                    allOk
                      ? `Data kehadiran ${teacherName} berhasil dihapus!`
                      : `Data kehadiran ${teacherName} terhapus lokal, namun gagal sinkron ke Cloud.`
                  );
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 stroke-[3]" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT KEHADIRAN (KHUSUS ADMIN DI TAB SAKIT & IZIN) */}
      {isAdmin && editAttendanceTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-modal-pop`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/60 border-amber-800/60 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                    Edit Data Kehadiran
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    Perbarui status dan catatan anggota
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditAttendanceTarget(null)}
                className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editAttendanceTarget) return;

                if (onUpdateAttendance) {
                  onUpdateAttendance({
                    ...editAttendanceTarget,
                    status: editAttendanceStatus,
                    notes: editAttendanceNotes.trim()
                  });
                }

                setToastMessage(`Data kehadiran ${editAttendanceTarget.teacherName} berhasil diperbarui!`);
                setEditAttendanceTarget(null);
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="space-y-4"
            >
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-stone-800/60 border-stone-700/80' : 'bg-[#faf8f5] border-stone-200/80'}`}>
                <p className={`text-sm font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
                  {editAttendanceTarget.teacherName}
                </p>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                  {editAttendanceTarget.school}
                </p>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1.5`}>
                  Status Kehadiran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Hadir', 'Sakit', 'Izin', 'Alpha'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setEditAttendanceStatus(status);
                        const originalNotes = (editAttendanceTarget?.notes || '').trim();
                        if (status === 'Hadir' || status === 'Alpha') {
                          if (editAttendanceNotes.trim() === originalNotes) {
                            setEditAttendanceNotes('');
                          }
                        } else if ((status === 'Sakit' || status === 'Izin') && !editAttendanceNotes.trim() && originalNotes) {
                          setEditAttendanceNotes(originalNotes);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        editAttendanceStatus === status
                          ? 'bg-red-800 text-white border-red-800 shadow-sm'
                          : isDark
                          ? 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
                          : 'bg-[#faf8f5] text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1.5`}>
                  Catatan / Alasan
                </label>
                <textarea
                  rows={3}
                  value={editAttendanceNotes}
                  onChange={(e) => setEditAttendanceNotes(e.target.value)}
                  placeholder={`Masukkan keterangan tambahan (${editAttendanceStatus})...`}
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div className={`flex gap-3 pt-2 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
                <button
                  type="button"
                  onClick={() => setEditAttendanceTarget(null)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW EVENT ATTENDANCE LIST */}
      {viewEventAttendance && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border animate-modal-pop max-h-[90vh] flex flex-col`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <div>
                <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Daftar Kehadiran Kegiatan</h3>
                <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>{viewEventAttendance.title} • {viewEventAttendance.fullDate}</p>
              </div>
              <button
                onClick={() => setViewEventAttendance(null)}
                className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs dengan Jumlah Data */}
            {(() => {
              const summary = getAttendanceSummaryForEvent(viewEventAttendance.id);
              const filterCounts: Record<string, number> = {
                Hadir: summary.hadir,
                Sakit: summary.sakit,
                Izin: summary.izin,
                Alpha: summary.alpha
              };

              return (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {(['Hadir', 'Sakit', 'Izin', 'Alpha'] as const).map((filter) => {
                    const count = filterCounts[filter] || 0;
                    return (
                      <button
                        key={filter}
                        onClick={() => setAttendanceFilter(filter)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                          attendanceFilter === filter
                            ? 'bg-red-800 text-white shadow-sm'
                            : isDark
                            ? 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-700 hover:text-stone-200'
                            : 'bg-[#faf8f5] text-stone-600 border border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                      >
                        <span>{filter}</span>
                        <span className={`text-[11px] font-extrabold ${attendanceFilter === filter ? 'text-amber-300' : isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            <div className="mt-4 h-[380px] overflow-y-auto space-y-2.5 pr-4 pl-1 pb-4 custom-scrollbar">
              {(() => {
                const summary = getAttendanceSummaryForEvent(viewEventAttendance.id);
                let displayRecords = [];
                if (attendanceFilter === 'Alpha') {
                  const eventTargetMembers = getSelectedTeachersForEvent(viewEventAttendance.id, viewEventAttendance);
                  const submittedTeacherKeys = new Set<string>();
                  summary.records.forEach(r => {
                    if (r.teacherId) submittedTeacherKeys.add(String(r.teacherId).trim());
                    if (r.teacherName) submittedTeacherKeys.add(r.teacherName.trim().toLowerCase());
                  });

                  const implicitAlphas = eventTargetMembers
                    .filter(t => 
                      !submittedTeacherKeys.has(String(t.id).trim()) &&
                      !submittedTeacherKeys.has((t.name || '').trim().toLowerCase())
                    )
                    .map(t => ({
                      id: `implicit-alpha-${t.id}`,
                      eventId: viewEventAttendance.id,
                      eventTitle: viewEventAttendance.title,
                      teacherId: String(t.id),
                      teacherName: t.name,
                      school: t.school,
                      status: 'Alpha' as const,
                      timestamp: '-',
                    }));
                  const explicitAlphas = summary.records.filter(r => r.status === 'Alpha');
                  displayRecords = [...explicitAlphas, ...implicitAlphas];
                } else {
                  displayRecords = summary.records.filter(r => r.status === attendanceFilter);
                }

                const getTeacherDisplayName = (rec: any): string => {
                  const matched = (teachers || []).find(t => 
                    (rec.teacherId && String(t.id) === String(rec.teacherId)) || 
                    (rec.teacherName && t.name && t.name.trim().toLowerCase() === rec.teacherName.trim().toLowerCase())
                  );
                  return (matched ? matched.name : rec.teacherName) || '';
                };

                displayRecords.sort((a, b) => 
                  getTeacherDisplayName(a).localeCompare(getTeacherDisplayName(b), 'id', { sensitivity: 'base' })
                );

                if (displayRecords.length === 0) {
                  return (
                    <div className={`h-full flex flex-col items-center justify-center p-8 text-center ${isDark ? 'text-stone-500' : 'text-stone-400'} text-xs`}>
                      <Users className={`w-12 h-12 mb-3 opacity-20`} />
                      Tidak ada data guru untuk filter ini.
                    </div>
                  );
                }

                return displayRecords.map((rec) => {
                  const matchedTeacher = (teachers || []).find(t => 
                    (rec.teacherId && String(t.id) === String(rec.teacherId)) || 
                    (rec.teacherName && t.name && t.name.trim().toLowerCase() === rec.teacherName.trim().toLowerCase())
                  );

                  const displayName = matchedTeacher ? matchedTeacher.name : rec.teacherName;
                  const displaySchool = matchedTeacher ? matchedTeacher.school : rec.school;

                  return (
                    <div key={rec.id} className={`p-3.5 rounded-xl ${isDark ? 'bg-stone-800/60 border-stone-700/70' : 'bg-[#faf8f5] border-stone-200/80'} border flex items-center justify-between gap-3 text-xs`}>
                      <div>
                        <p className={`font-bold ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>{displayName}</p>
                        <p className={`text-[10px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>{displaySchool} {Boolean(rec.timestamp && rec.timestamp !== '-') && `• ${rec.timestamp}`}</p>
                        {rec.notes && <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-600'} italic mt-0.5`}>&ldquo;{rec.notes}&rdquo;</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full font-bold text-[10px] ${
                          rec.status === 'Verifikasi' 
                            ? (isDark ? 'bg-amber-950/60 text-amber-300' : 'bg-amber-100 text-amber-800') 
                            : rec.status === 'Alpha'
                            ? (isDark ? 'bg-red-950/70 text-red-300' : 'bg-red-100 text-red-800')
                            : (isDark ? 'bg-emerald-950/60 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                        }`}>
                          {rec.status === 'Verifikasi' ? 'Belum Diverifikasi' : rec.status}
                        </span>
                        
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {rec.status === 'Verifikasi' && (
                              <>
                                <button
                                  onClick={() => {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Hadir'});
                                    setToastMessage('Kehadiran diterima');
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm hover:bg-emerald-700 hover:scale-105 active:scale-95 cursor-pointer`}
                                  title="Terima Kehadiran"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Terima</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Alpha'});
                                    setToastMessage('Kehadiran ditolak');
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm hover:bg-amber-700 hover:scale-105 active:scale-95 cursor-pointer`}
                                  title="Tolak Kehadiran"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            )}
                            
                            {(attendanceFilter === 'Sakit' || attendanceFilter === 'Izin') && (
                              <button
                                onClick={() => {
                                  setEditAttendanceTarget({
                                    ...rec,
                                    teacherName: displayName,
                                    school: displaySchool
                                  });
                                  setEditAttendanceStatus((rec.status === 'Hadir' || rec.status === 'Sakit' || rec.status === 'Izin') ? rec.status : 'Izin');
                                  setEditAttendanceNotes(rec.notes || '');
                                }}
                                className={`px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm hover:bg-amber-700 cursor-pointer`}
                                title="Edit Data Kehadiran"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            )}

                            {attendanceFilter !== 'Alpha' && !String(rec.id).startsWith('implicit-alpha') && (
                              <button
                                onClick={() => {
                                  setDeleteAttendanceTarget({
                                    id: rec.id,
                                    teacherName: displayName,
                                    teacherId: rec.teacherId,
                                    school: displaySchool,
                                    isImplicit: false
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                                title="Hapus Data Kehadiran"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className={`pt-4 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'} flex items-center justify-end`}>
              <button
                onClick={() => setViewEventAttendance(null)}
                className="px-5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE NEW EVENT */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto custom-scrollbar animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-lg w-full p-6 shadow-2xl border animate-modal-pop my-8`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Buat Agenda Kegiatan Baru</h3>
              <button onClick={() => setShowNewEventModal(false)} className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNewEventSubmit} className="mt-4 space-y-3">
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Nama Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Rapat Koordinasi PGRI Ranting Gelang"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Kategori Kegiatan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-[#faf8f5] border-stone-200 text-stone-800'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  >
                    <option value="" disabled className={isDark ? "bg-stone-800 text-stone-400" : "bg-white text-stone-400"}>
                      -- Pilih Kategori --
                    </option>
                    <option value="Pertemuan Rutin" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Pertemuan Rutin</option>
                    <option value="Rapat" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Rapat</option>
                    <option value="Sosialisasi" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Sosialisasi</option>
                    <option value="Workshop" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Workshop</option>
                    <option value="Diskusi" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Diskusi</option>
                    <option value="Berbagi" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Berbagi</option>
                    <option value="Apel" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Apel</option>
                    <option value="Upacara" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Upacara</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Tanggal Kegiatan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500 [color-scheme:dark]' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Dari Jam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    placeholder="Contoh: 08.00"
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Sampai Jam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    placeholder="Contoh: 11.00 WIB"
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Nama Pengisi / Narasumber
                </label>
                <input
                  type="text"
                  value={eventPresenter}
                  onChange={(e) => setEventPresenter(e.target.value)}
                  placeholder="Risky Firmansyah, S.Pd"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Tempat / Lokasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Gedung Serbaguna (GSG) Sumberbaru"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Deskripsi Kegiatan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Sosialisasi Program Kerja & Panduan Penggunaan Aplikasi Ruang Digital"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div className={`pt-3 flex items-center justify-end gap-2 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className={`px-4 py-2 rounded-xl border ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'} font-bold text-xs transition-colors cursor-pointer`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isNewEventFormValid}
                  className={`px-6 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all ${
                    !isNewEventFormValid ? 'opacity-40 cursor-not-allowed shadow-none' : 'active:scale-95 cursor-pointer'
                  }`}
                >
                  Jadwalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT EVENT */}
      {showEditEventModal && selectedEventForEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto custom-scrollbar animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-lg w-full p-6 shadow-2xl border animate-modal-pop my-8`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <h3 className={`font-display font-extrabold text-base ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>Edit Agenda Kegiatan</h3>
              <button onClick={() => setShowEditEventModal(false)} className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-stone-100 text-stone-400 hover:text-stone-600'} transition-colors cursor-pointer`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditEventSubmit} className="mt-4 space-y-3">
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Nama Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Rapat Koordinasi PGRI Ranting Gelang"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Kategori Kegiatan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-[#faf8f5] border-stone-200 text-stone-800'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  >
                    <option value="" disabled className={isDark ? "bg-stone-800 text-stone-400" : "bg-white text-stone-400"}>
                      -- Pilih Kategori --
                    </option>
                    {eventCategory === 'Belajar Bersama' && (
                      <option value="Belajar Bersama" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Belajar Bersama</option>
                    )}
                    <option value="Pertemuan Rutin" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Pertemuan Rutin</option>
                    <option value="Rapat" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Rapat</option>
                    <option value="Sosialisasi" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Sosialisasi</option>
                    <option value="Workshop" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Workshop</option>
                    <option value="Diskusi" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Diskusi</option>
                    <option value="Berbagi" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Berbagi</option>
                    <option value="Apel" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Apel</option>
                    <option value="Upacara" className={isDark ? "bg-stone-800 text-stone-100" : "bg-white text-stone-800"}>Upacara</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Tanggal Kegiatan
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500 [color-scheme:dark]' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Dari Jam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    placeholder="Contoh: 08.00"
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                    Sampai Jam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    placeholder="Contoh: 11.00 WIB"
                    className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Nama Pengisi / Narasumber
                </label>
                <input
                  type="text"
                  value={eventPresenter}
                  onChange={(e) => setEventPresenter(e.target.value)}
                  placeholder="Contoh: Narasumber 1 : Narasumber 2 | Narasumber 3"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Tempat / Lokasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Gedung Serbaguna (GSG) Sumberbaru"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'} mb-1`}>
                  Deskripsi Kegiatan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Sosialisasi Program Kerja & Panduan Penggunaan Aplikasi Ruang Digital"
                  className={`w-full px-3.5 py-2.5 rounded-xl ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-[#faf8f5] border-stone-200 text-stone-800 placeholder:text-stone-400'} border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700`}
                />
              </div>

              <div className={`pt-3 flex items-center justify-end gap-2 border-t ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
                <button
                  type="button"
                  onClick={() => setShowEditEventModal(false)}
                  className={`px-4 py-2 rounded-xl border ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'} font-bold text-xs transition-colors cursor-pointer`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HAPUS EVENT */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-modal-pop`}>
            <div className={`flex items-center gap-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              <div className={`w-10 h-10 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60' : 'bg-red-50 border-red-200'} flex items-center justify-center shrink-0`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display font-bold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Konfirmasi Hapus
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
              Apakah Anda yakin ingin menghapus jadwal kegiatan <span className="font-bold">{deleteEventTarget.title}</span>?
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteEventTarget(null)}
                className={`px-4 py-2 rounded-xl border ${isDark ? 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700' : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'} font-bold text-xs transition-colors cursor-pointer`}
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!deleteEventTarget) return;
                  const targetId = deleteEventTarget.id;

                  setEventDeadlines(prev => {
                    const next = { ...prev };
                    delete next[targetId];
                    return next;
                  });
                  setDeleteEventTarget(null);

                  const cloudOk = onDeleteEvent ? await onDeleteEvent(targetId) : true;
                  setToastMessage(
                    cloudOk === false
                      ? 'Jadwal terhapus lokal, namun gagal sinkron ke Cloud.'
                      : 'Jadwal kegiatan berhasil dihapus!'
                  );
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 stroke-[3]" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL D3: REKAP PARTISIPASI KEHADIRAN PER UNIT SEKOLAH */}
      {showSchoolParticipationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-backdrop-fade">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200/90'} rounded-2xl max-w-3xl w-full p-6 shadow-2xl border space-y-4 max-h-[88vh] flex flex-col animate-modal-pop`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isDark ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                    Rekap Partisipasi Kehadiran per Sekolah
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    Pantau tingkat kehadiran tiap sekolah binaan &amp; kirim pengingat WA koordinator.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSchoolParticipationModal(false)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${isDark ? 'hover:bg-stone-800 text-stone-400' : 'hover:bg-stone-100 text-stone-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sortedEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                Belum ada agenda kegiatan yang tercatat.
              </div>
            ) : (() => {
              const activeEvent =
                sortedEvents.find((e) => String(e.id) === String(selectedSchoolStatsEventId)) || sortedEvents[0];
              const targetMembers = activeEvent
                ? getSelectedTeachersForEvent(activeEvent.id, activeEvent)
                : [];
              const eventRecords = (attendanceList || []).filter(
                (r) => String(r.eventId) === String(activeEvent.id)
              );

              const schoolStatsMap: Record<
                string,
                {
                  school: string;
                  total: number;
                  hadir: number;
                  izinSakit: number;
                  belum: number;
                  missingNames: string[];
                }
              > = {};

              targetMembers.forEach((member) => {
                const schoolKey = (member.school || 'LAINNYA').trim().toUpperCase();
                if (!schoolStatsMap[schoolKey]) {
                  schoolStatsMap[schoolKey] = {
                    school: schoolKey,
                    total: 0,
                    hadir: 0,
                    izinSakit: 0,
                    belum: 0,
                    missingNames: []
                  };
                }
                schoolStatsMap[schoolKey].total += 1;

                const rec = eventRecords.find(
                  (r) =>
                    (r.teacherId && String(r.teacherId).trim() === String(member.id).trim()) ||
                    (r.teacherName &&
                      member.name &&
                      r.teacherName.trim().toLowerCase() === member.name.trim().toLowerCase())
                );

                if (rec?.status === 'Hadir') {
                  schoolStatsMap[schoolKey].hadir += 1;
                } else if (
                  rec?.status === 'Izin' ||
                  rec?.status === 'Sakit' ||
                  rec?.status === 'Tugas Luar' ||
                  rec?.status === 'Verifikasi'
                ) {
                  schoolStatsMap[schoolKey].izinSakit += 1;
                } else {
                  schoolStatsMap[schoolKey].belum += 1;
                  schoolStatsMap[schoolKey].missingNames.push(member.name);
                }
              });

              const schoolStats = Object.values(schoolStatsMap).sort((a, b) =>
                a.school.localeCompare(b.school, 'id')
              );
              const totalAll = schoolStats.reduce((s, x) => s + x.total, 0);
              const totalHadir = schoolStats.reduce((s, x) => s + x.hadir, 0);
              const totalIzin = schoolStats.reduce((s, x) => s + x.izinSakit, 0);
              const totalBelum = schoolStats.reduce((s, x) => s + x.belum, 0);

              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                        Pilih Agenda Kegiatan
                      </label>
                      <select
                        value={String(activeEvent.id)}
                        onChange={(e) => setSelectedSchoolStatsEventId(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-red-700 cursor-pointer ${isDark ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                      >
                        {sortedEvents.map((ev) => (
                          <option key={ev.id} value={String(ev.id)} className={isDark ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'}>
                            {ev.title} ({ev.fullDate || ev.date})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span className={`px-2.5 py-1 rounded-md border ${isDark ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                        Hadir: {totalHadir}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md border ${isDark ? 'bg-amber-950/60 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                        Izin/Sakit: {totalIzin}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md border ${isDark ? 'bg-red-950/60 border-red-800/50 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        Belum: {totalBelum} / {totalAll}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                    {schoolStats.map((grp) => {
                      const pct = grp.total > 0 ? Math.round((grp.hadir / grp.total) * 100) : 0;
                      return (
                        <div
                          key={grp.school}
                          className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-stone-800/50 border-stone-800' : 'bg-[#faf8f5] border-stone-200/80'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-stone-900'}`}>
                                  {grp.school}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  pct >= 80
                                    ? isDark ? 'bg-emerald-950/70 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                                    : pct >= 50
                                    ? isDark ? 'bg-amber-950/70 text-amber-300' : 'bg-amber-100 text-amber-800'
                                    : isDark ? 'bg-red-950/70 text-red-300' : 'bg-red-100 text-red-800'
                                }`}>
                                  {pct}% Hadir
                                </span>
                              </div>
                              <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                                Hadir: <strong className="text-emerald-600 dark:text-emerald-400">{grp.hadir}</strong> • Izin/Sakit: <strong className="text-amber-600 dark:text-amber-400">{grp.izinSakit}</strong> • Belum Absen: <strong className="text-red-600 dark:text-red-400">{grp.belum}</strong> dari {grp.total} peserta
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const missingText =
                                  grp.missingNames.length > 0
                                    ? grp.missingNames.map((n, i) => `${i + 1}. ${n}`).join('\n')
                                    : 'Semua peserta dari unit sekolah ini telah mengisi presensi.';
                                const msg =
                                  `📋 *REKAP KEHADIRAN PGRI RANTING GELANG*\n` +
                                  `Kegiatan: *${activeEvent.title}*\n` +
                                  `Tanggal: ${activeEvent.fullDate || activeEvent.date}\n` +
                                  `Unit Sekolah: *${grp.school}*\n` +
                                  `Partisipasi: *${grp.hadir}/${grp.total} Hadir (${pct}%)* | Izin/Sakit: ${grp.izinSakit} | Belum: ${grp.belum}\n\n` +
                                  `${grp.missingNames.length > 0 ? `*Belum mengisi daftar hadir (${grp.missingNames.length} orang):*\n${missingText}\n\n` : `${missingText}\n\n`}` +
                                  `_Mohon bantuannya untuk pengingat kehadiran rekan guru di sekolah. Terima kasih._`;
                                openWhatsAppShare(msg);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Kirim Rekap WA</span>
                            </button>
                          </div>

                          {grp.missingNames.length > 0 && (
                            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-red-400/90' : 'text-red-700/90'}`}>
                              Belum absen: {grp.missingNames.join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};