import { safeDownloadBlob } from '../../lib/download';
import { mutateCloudCollection } from '../../lib/sync';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  School, 
  Pencil, 
  Trash2, 
  UserCheck, 
  ChevronDown, 
  Plus, 
  Award,
  X, 
  Check, 
  User, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  UserX, 
  Phone, 
  ShieldCheck, 
  MessageCircle,
  SearchX,
  QrCode,
  Archive,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { Teacher, ActivityEvent, AttendanceRecord } from '../../types';
import { getOrgConfig } from '../../lib/orgConfig';
import { logAuditEvent } from '../../lib/auth';

// Daftar lengkap 45 Sekolah Dasar
const MASTER_SCHOOLS_LIST = [
  'SDN GELANG 01', 'SDN GELANG 03', 'SDN GELANG 04', 'SDN GELANG 05', 'SDN GELANG 06',
  'SDN KALIGLAGAH 02', 'SD NU 21 MIFTAHUL ULUM'
];

interface AnggotaViewProps {
  teachers: Teacher[];
  onTeachersChange?: (updatedTeachers: Teacher[]) => void;
  activeRole: 'guru' | 'admin';
  events?: ActivityEvent[];
  attendanceList?: AttendanceRecord[];
}

// Helper konversi tanggal event ke objek Date untuk komparasi jadwal terbaru
const getEventDateObj = (evt: ActivityEvent): Date => {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  let day = new Date().getDate();

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

export const AnggotaView: React.FC<AnggotaViewProps> = ({ 
  teachers: initialTeachers, 
  onTeachersChange, 
  activeRole,
  events = [],
  attendanceList = [] 
}) => {
  const [teachersList, setTeachersList] = useState<Teacher[]>(Array.isArray(initialTeachers) ? initialTeachers : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActiveStatus, setSelectedActiveStatus] = useState('Semua');
  const [selectedGender, setSelectedGender] = useState('Semua');
  const [selectedSchool, setSelectedSchool] = useState('Semua');

  // Deteksi status dark mode dari DOM class (tanpa flicker awal)
  const [isDark, setIsDark] = useState<boolean>(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
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

  // Sinkronisasi data saat props initialTeachers berubah dari parent / database
  useEffect(() => {
    if (Array.isArray(initialTeachers)) {
      setTeachersList([...initialTeachers]);
    }
  }, [initialTeachers]);

  // Fallback State untuk data Jadwal & Kehadiran dari LocalStorage jika props kosong
  const [actualEvents, setActualEvents] = useState<ActivityEvent[]>(() => {
    if (events && events.length > 0) return events;
    try { return JSON.parse(localStorage.getItem('kombel-events') || '[]'); } catch { return []; }
  });

  const [actualAttendance, setActualAttendance] = useState<AttendanceRecord[]>(() => {
    if (attendanceList && attendanceList.length > 0) return attendanceList;
    try { return JSON.parse(localStorage.getItem('kombel-attendance') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (events && events.length > 0) setActualEvents(events);
  }, [events]);

  useEffect(() => {
    if (attendanceList && attendanceList.length > 0) setActualAttendance(attendanceList);
  }, [attendanceList]);

  // Modal States & Exit Anim States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  const [isPresentModalOpen, setIsPresentModalOpen] = useState(false);
  const [isClosingPresentModal, setIsClosingPresentModal] = useState(false);

  const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);
  const [isClosingInactiveModal, setIsClosingInactiveModal] = useState(false);

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isClosingDeleteModal, setIsClosingDeleteModal] = useState(false);

  const [warningModalMessage, setWarningModalMessage] = useState<string | null>(null);
  const [isClosingWarningModal, setIsClosingWarningModal] = useState(false);

  // State Modal Barcode & Preview E-KTA Mini
  const [selectedBarcodeTeacher, setSelectedBarcodeTeacher] = useState<Teacher | null>(null);
  const [barcodeModalTab, setBarcodeModalTab] = useState<'qr' | 'ekta'>('qr');
  const [isClosingBarcodeModal, setIsClosingBarcodeModal] = useState(false);
  const [isDownloadingBarcode, setIsDownloadingBarcode] = useState(false);
  const [isDownloadingAllBarcodes, setIsDownloadingAllBarcodes] = useState(false);

  // State & Ref untuk Import / Export Excel Anggota
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingTeachers, setIsImportingTeachers] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{
    fileName: string;
    teachers: Teacher[];
  } | null>(null);
  const [isClosingImportConfirmModal, setIsClosingImportConfirmModal] = useState(false);

  // Helper memuat library SheetJS (XLSX) secara dinamis
  const getXLSX = async (): Promise<any> => {
    if (typeof window !== 'undefined' && (window as any).XLSX) {
      return (window as any).XLSX;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => resolve((window as any).XLSX);
      script.onerror = () => reject(new Error('Gagal memuat library XLSX.'));
      document.head.appendChild(script);
    });
  };

  // Handler Unduh Template Excel (.xlsx)
  const handleDownloadTemplateExcel = async () => {
    if (activeRole !== 'admin') {
      handleOpenWarning('Maaf, hanya pengurus/admin yang dapat mengunduh template.');
      return;
    }
    try {
      const XLSX = await getXLSX();
      const templateRows = [
        {
          'Nama Lengkap & Gelar': 'Adi Saiful Rizal, S.Pd',
          'Nama Panggilan': 'Rizal',
          'NIP': '199401162025211089',
          'NPA (11 Digit)': '13301500431',
          'Jenis Kelamin (L/P)': 'L',
          'No. WhatsApp': '082292232649',
          'Nama Sekolah': 'SDN GELANG 03',
          'Status Pegawai': 'PPPK',
          'Sertifikasi': 'Sudah Sertifikasi',
          'Status KTA': 'Aktif',
          'Tahun Pensiun': '2054',
          'Status Keaktifan': 'Aktif'
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(templateRows);
      worksheet['!cols'] = [
        { wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 16 },
        { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 16 },
        { wch: 20 }, { wch: 14 }, { wch: 15 }, { wch: 18 }
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Anggota');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      triggerDirectFileDownload(blob, 'Template_Import_Anggota_PGRI.xlsx');
    } catch (error) {
      console.error('Gagal mengunduh template:', error);
      handleOpenWarning('Gagal mengunduh file template Excel. Periksa koneksi internet Anda.');
    }
  };

  // Handler Import Data Anggota dari File Excel (.xlsx / .xls / .csv)
  const handleImportTeachersFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeRole !== 'admin') {
      handleOpenWarning('Maaf, hanya pengurus/admin yang dapat mengimpor data anggota.');
      e.target.value = '';
      return;
    }

    setIsImportingTeachers(true);
    try {
      const XLSX = await getXLSX();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        handleOpenWarning('File Excel kosong atau tidak memiliki baris data yang valid.');
        return;
      }

      const importedTeachers: Teacher[] = [];
      rawRows.forEach((row, idx) => {
        const name = String(
          row['Nama Lengkap & Gelar'] || row['Nama Lengkap'] || row['Nama'] || row['name'] || ''
        ).trim();
        if (!name) return;

        const rawGender = String(
          row['Jenis Kelamin (L/P)'] || row['Jenis Kelamin'] || row['L/P'] || row['gender'] || 'L'
        ).trim().toUpperCase();
        const gender: 'L' | 'P' = rawGender.startsWith('P') ? 'P' : 'L';

        const rawNpa = String(row['NPA (11 Digit)'] || row['NPA'] || row['npa'] || '').replace(/\D/g, '').slice(0, 11);
        const rawNip = String(row['NIP'] || row['nip'] || '').trim();
        const rawNickname = String(row['Nama Panggilan'] || row['Panggilan'] || row['nickname'] || '').trim();
        const rawPhone = String(row['No. WhatsApp'] || row['WhatsApp'] || row['phone'] || '').trim();
        const rawSchool = String(row['Nama Sekolah'] || row['Sekolah'] || row['school'] || dynamicSchoolsList[0] || MASTER_SCHOOLS_LIST[0]).trim();
        const rawStatus = String(row['Status Keaktifan'] || row['Keterangan'] || 'Aktif').trim().toLowerCase();
        const isActive = rawStatus !== 'tidak aktif' && rawStatus !== 'non aktif' && rawStatus !== 'false' && rawStatus !== '0';

        const empStatus = String(row['Status Pegawai'] || '').trim();
        const certStatus = String(row['Sertifikasi'] || '').trim();
        const ktaStatus = String(row['Status KTA'] || 'Aktif').trim();
        const retYear = String(row['Tahun Pensiun'] || '').replace(/\D/g, '').slice(0, 4);

        importedTeachers.push({
          id: `t_${Date.now()}_${idx}`,
          name,
          nickname: rawNickname || name.split(' ')[0],
          gender,
          school: rawSchool,
          nip: rawNip || undefined,
          npa: rawNpa,
          role: 'Anggota Aktif',
          avatar: gender === 'P'
            ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          phone: rawPhone || '-',
          email: 'guru@guru.sd.belajar.id',
          employmentStatus: (empStatus || undefined) as Teacher['employmentStatus'],
          certificationStatus: (certStatus || undefined) as Teacher['certificationStatus'],
          ktaStatus: (ktaStatus || 'Aktif') as Teacher['ktaStatus'],
          retirementYear: retYear,
          isActive,
          activeStatus: isActive ? 'Aktif' : 'Tidak Aktif'
        } as Teacher);
      });

      if (importedTeachers.length === 0) {
        handleOpenWarning('Tidak ditemukan kolom "Nama Lengkap & Gelar" atau "Nama Lengkap" yang valid pada file.');
        return;
      }

      // Simpan sementara data hasil parsing dan tampilkan popup konfirmasi persetujuan
      setIsClosingImportConfirmModal(false);
      setPendingImportData({
        fileName: file.name,
        teachers: importedTeachers
      });
    } catch (error) {
      console.error('Gagal mengimpor data anggota:', error);
      handleOpenWarning('Gagal membaca file Excel. Pastikan format file (.xlsx / .xls / .csv) sesuai template.');
    } finally {
      setIsImportingTeachers(false);
      e.target.value = '';
    }
  };

  // Handler menutup popup konfirmasi import
  const handleCloseImportConfirmModal = () => {
    setIsClosingImportConfirmModal(true);
    setTimeout(() => {
      setPendingImportData(null);
      setIsClosingImportConfirmModal(false);
    }, 250);
  };

  // Handler eksekusi menimpa (replace) seluruh data lama dengan data hasil import
  const handleConfirmImportOverwrite = () => {
    if (!pendingImportData) return;
    const { fileName, teachers: newTeachersData } = pendingImportData;

    setTeachersList(newTeachersData);
    if (onTeachersChange) onTeachersChange(newTeachersData);
    logAuditEvent(
      'Daftar Anggota',
      'Import Anggota (Timpa Data)',
      `Menimpa seluruh daftar anggota dengan ${newTeachersData.length} data baru dari file ${fileName}.`
    );

    handleCloseImportConfirmModal();

    mutateCloudCollection<Teacher>(
      'teachers',
      ['kombel-teachers'],
      () => newTeachersData,
      newTeachersData,
      'Daftar Anggota'
    ).then(res => {
      setTeachersList(res.items);
      if (onTeachersChange) onTeachersChange(res.items);
    });

    handleOpenWarning(`Berhasil menimpa data anggota dengan ${newTeachersData.length} data baru.`);
  };

  // Handler Export Data Anggota ke Excel (.xlsx)
  const handleExportTeachersExcel = async () => {
    if (activeRole !== 'admin') {
      handleOpenWarning('Maaf, hanya pengurus/admin yang dapat mengekspor data anggota.');
      return;
    }
    if (filteredTeachers.length === 0) {
      handleOpenWarning('Tidak ada data anggota untuk diekspor.');
      return;
    }
    try {
      const XLSX = await getXLSX();
      const exportRows = filteredTeachers.map((t, idx) => ({
        'No': idx + 1,
        'Nama Lengkap & Gelar': t.name,
        'Nama Panggilan': getNickname(t),
        'NIP': t.nip || '-',
        'NPA (11 Digit)': (t as any).npa || '-',
        'Jenis Kelamin (L/P)': getGender(t),
        'No. WhatsApp': t.phone || '-',
        'Nama Sekolah': t.school,
        'Status Pegawai': t.employmentStatus || '-',
        'Sertifikasi': t.certificationStatus || '-',
        'Status KTA': t.ktaStatus || 'Aktif',
        'Tahun Pensiun': t.retirementYear || '-',
        'Status Keaktifan': isMemberActive(t) ? 'Aktif' : 'Tidak Aktif'
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 30 }, { wch: 16 }, { wch: 22 }, { wch: 16 },
        { wch: 20 }, { wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 20 },
        { wch: 14 }, { wch: 15 }, { wch: 18 }
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar_Anggota');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      triggerDirectFileDownload(blob, `Export_Daftar_Anggota_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Gagal mengekspor data anggota:', error);
      handleOpenWarning('Gagal mengekspor data anggota ke Excel.');
    }
  };

  // Helper memuat library JSZip secara dinamis
  const getJSZip = async (): Promise<any> => {
    if (typeof window !== 'undefined' && (window as any).JSZip) {
      return (window as any).JSZip;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve((window as any).JSZip);
      script.onerror = () => reject(new Error('Gagal memuat library JSZip.'));
      document.head.appendChild(script);
    });
  };

  // Helper internal untuk memicu direct download file tanpa memanggil dialog Share OS
  const triggerDirectFileDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // Helper konversi URL QR code ke Base64 PNG murni menggunakan Fetch + Canvas
  const fetchQrBase64 = async (barcodeValue: string): Promise<string> => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&data=${encodeURIComponent(barcodeValue)}`;
    const response = await fetch(qrApiUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Gagal mengambil gambar barcode');
    const rawBlob = await response.blob();
    try {
      const imageBitmap = await createImageBitmap(rawBlob);
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageBitmap, 0, 0, 600, 600);
        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl.split(',')[1];
      }
    } catch {}
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || '');
        resolve(res.includes(',') ? res.split(',')[1] : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(rawBlob);
    });
  };

  // Handler Download Semua Barcode ke Format ZIP
  const handleDownloadAllBarcodesZIP = async () => {
    if (activeRole !== 'admin') {
      handleOpenWarning('Maaf, hanya pengurus/admin yang dapat mengunduh semua barcode.');
      return;
    }
    if (teachersList.length === 0) {
      handleOpenWarning('Tidak ada data anggota guru untuk diunduh barcodenya.');
      return;
    }

    setIsDownloadingAllBarcodes(true);
    try {
      const JSZip = await getJSZip();
      const zip = new JSZip();
      const folder = zip.folder('Barcode_Anggota_Guru');

      for (let i = 0; i < teachersList.length; i++) {
        const teacher = teachersList[i];
        if (!teacher) continue;
        const barcodeVal = getBarcodeValue(teacher);
        const base64Data = await fetchQrBase64(barcodeVal);
        const safeName = (teacher.name || `Guru_${i + 1}`).replace(/[/\\?%*:|"<>]/g, '_');
        folder.file(`Barcode_${safeName}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `Semua_Barcode_Anggota_${new Date().toISOString().split('T')[0]}.zip`;
      triggerDirectFileDownload(content, fileName);
    } catch (error) {
      console.error('Gagal mengunduh kumpulan barcode:', error);
      handleOpenWarning('Terjadi kesalahan saat memproses pengunduhan berkas ZIP barcode.');
    } finally {
      setIsDownloadingAllBarcodes(false);
    }
  };

  // Filter Kehadiran di Popup Hadir
  const [presenceFilter, setPresenceFilter] = useState<'Semua' | 'Hadir' | 'Sakit' | 'Izin' | 'Alpha'>('Semua');

  // Daftar sekolah dinamis dari Konfigurasi Organisasi PGRI
  const [dynamicSchoolsList, setDynamicSchoolsList] = useState<string[]>(() =>
    Array.from(new Set([...getOrgConfig().schools, ...MASTER_SCHOOLS_LIST]))
  );
  const [isDownloadingEKTA, setIsDownloadingEKTA] = useState(false);

  useEffect(() => {
    const syncSchools = () => {
      setDynamicSchoolsList(Array.from(new Set([...getOrgConfig().schools, ...MASTER_SCHOOLS_LIST])));
    };
    window.addEventListener('storage', syncSchools);
    window.addEventListener('kombel-settings-updated', syncSchools);
    return () => {
      window.removeEventListener('storage', syncSchools);
      window.removeEventListener('kombel-settings-updated', syncSchools);
    };
  }, []);

  const [formData, setFormData] = useState<Partial<Teacher> & { npa?: string }>({
    name: '',
    nickname: '',
    gender: '' as 'L' | 'P',
    school: '',
    nip: '',
    npa: '',
    role: 'Anggota Aktif',
    phone: '',
    email: '',
    employmentStatus: undefined,
    certificationStatus: undefined,
    ktaStatus: 'Aktif',
    retirementYear: ''
  });

  // Unique list untuk dropdown filter
  const filterSchoolsList = ['Semua', ...Array.from(new Set([...dynamicSchoolsList, ...teachersList.map(t => t?.school?.trim()).filter(Boolean)]))];

  // Modal Handlers with Smooth Closing
  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      nickname: '',
      gender: '' as 'L' | 'P',
      school: '',
      nip: '',
      npa: '',
      role: 'Anggota Aktif',
      phone: '',
      email: '',
      employmentStatus: undefined,
      certificationStatus: undefined,
      ktaStatus: 'Aktif',
      retirementYear: ''
    });
    setIsClosingModal(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    if (activeRole !== 'admin') {
      handleOpenWarning('Maaf, hanya pengurus yang dapat mengedit data anggota.');
      return;
    }
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      nickname: getNickname(teacher),
      gender: getGender(teacher),
      school: teacher.school,
      nip: teacher.nip || '',
      npa: (teacher as any).npa || '',
      role: teacher.role,
      phone: teacher.phone || '',
      email: teacher.email,
      employmentStatus: teacher.employmentStatus,
      certificationStatus: teacher.certificationStatus,
      ktaStatus: teacher.ktaStatus || 'Aktif',
      retirementYear: teacher.retirementYear || ''
    });
    setIsClosingModal(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosingModal(false);
    }, 250);
  };

  const handleOpenBarcode = (teacher: Teacher) => {
    setIsClosingBarcodeModal(false);
    setBarcodeModalTab('qr');
    setSelectedBarcodeTeacher(teacher);
  };

  const handleCloseBarcode = () => {
    setIsClosingBarcodeModal(true);
    setTimeout(() => {
      setSelectedBarcodeTeacher(null);
      setIsClosingBarcodeModal(false);
    }, 250);
  };

  const handleOpenPresentModal = () => {
    setIsClosingPresentModal(false);
    setIsPresentModalOpen(true);
  };

  const handleClosePresentModal = () => {
    setIsClosingPresentModal(true);
    setTimeout(() => {
      setIsPresentModalOpen(false);
      setIsClosingPresentModal(false);
    }, 250);
  };

  const handleOpenInactiveModal = () => {
    setIsClosingInactiveModal(false);
    setIsInactiveModalOpen(true);
  };

  const handleCloseInactiveModal = () => {
    setIsClosingInactiveModal(true);
    setTimeout(() => {
      setIsInactiveModalOpen(false);
      setIsClosingInactiveModal(false);
    }, 250);
  };

  const handleDelete = (id: string, name: string) => {
    if (activeRole !== 'admin') {
      handleOpenWarning('Maaf, hanya pengurus yang dapat menghapus data anggota.');
      return;
    }
    setIsClosingDeleteModal(false);
    setDeleteTarget({ id, name });
  };

  const handleCloseDeleteModal = () => {
    setIsClosingDeleteModal(true);
    setTimeout(() => {
      setDeleteTarget(null);
      setIsClosingDeleteModal(false);
    }, 250);
  };

  const handleOpenWarning = (msg: string) => {
    setIsClosingWarningModal(false);
    setWarningModalMessage(msg);
  };

  const handleCloseWarning = () => {
    setIsClosingWarningModal(true);
    setTimeout(() => {
      setWarningModalMessage(null);
      setIsClosingWarningModal(false);
    }, 250);
  };

  // Helper status keaktifan anggota
  const isMemberActive = (t: any): boolean => {
    if (!t) return false;
    if (t.isActive !== undefined && t.isActive !== null) {
      if (typeof t.isActive === 'boolean') return t.isActive;
      if (typeof t.isActive === 'string') return t.isActive.toLowerCase() === 'true' || t.isActive === '1' || t.isActive.toLowerCase() === 'aktif';
      if (typeof t.isActive === 'number') return t.isActive === 1;
    }
    if (t.activeStatus !== undefined && t.activeStatus !== null) {
      return String(t.activeStatus).trim().toLowerCase() === 'aktif';
    }
    if (t.statusKeaktifan !== undefined && t.statusKeaktifan !== null) {
      return String(t.statusKeaktifan).trim().toLowerCase() === 'aktif';
    }
    return true;
  };

  // Helper for gender resolution
  const getGender = (t: Teacher): 'L' | 'P' => {
    if (t.gender) {
      const g = String(t.gender).toUpperCase().trim();
      if (g.startsWith('P') || g === 'PEREMPUAN') return 'P';
      if (g.startsWith('L') || g === 'LAKI-LAKI' || g === 'PRIA') return 'L';
    }
    if (!t.name) return 'L';
    const femaleNames = ['Siti', 'Rina', 'Dewi', 'Sri', 'Nurul', 'Fitriani', 'Lilik', 'Maya', 'Anisa', 'Yulia', 'Titin', 'Dwi', 'Neni', 'Ratna', 'Ika', 'Indah'];
    return femaleNames.some(n => t.name && t.name.includes(n)) ? 'P' : 'L';
  };

  // Helper for nickname resolution
  const getNickname = (t: Teacher): string => {
    if (t.nickname) return t.nickname;
    if (!t.name) return '-';
    const cleanName = t.name.replace(/^(H\.|Hj\.|Drs\.|Dra\.|Ir\.|Hj\s|H\s)/i, '').trim();
    return cleanName.split(' ')[0].replace(/,/g, '');
  };

  // Helper format nilai barcode (nama lengkap_nama sekolah)
  const getBarcodeValue = (t: Teacher): string => {
    const safeName = (t?.name || '').trim();
    const safeSchool = (t?.school || '').trim();
    return `${safeName}_${safeSchool}`;
  };

  // 1. Dapatkan Jadwal Kegiatan Terbaru Berdasarkan Tanggal
  const latestEvent = React.useMemo(() => {
    if (!actualEvents || actualEvents.length === 0) return null;
    return [...actualEvents].sort((a, b) => {
      const timeA = getEventDateObj(a).getTime();
      const timeB = getEventDateObj(b).getTime();
      return timeB - timeA;
    })[0];
  }, [actualEvents]);

  // 2. Dapatkan Status Kehadiran Guru berdasarkan Kegiatan Terbaru
  const getTeacherAttendanceStatus = React.useCallback((t: Teacher) => {
    if (!latestEvent) return 'Hadir';
    if (!actualAttendance || actualAttendance.length === 0) return 'Alpha'; 
    
    const record = actualAttendance.find(a => 
      a.eventId === latestEvent.id && 
      (a.teacherId === t.id || a.teacherName === t.name)
    );
    
    if (!record) return 'Alpha';
    return record.status === 'Verifikasi' ? 'Hadir' : record.status;
  }, [latestEvent, actualAttendance]);

  const filteredTeachers = teachersList
    .filter((t) => {
      if (!t) return false;
      const teacherName = t.name || '';
      const teacherNickname = getNickname(t) || '';
      const teacherSchool = t.school || '';
      const teacherNip = t.nip ? String(t.nip) : '';
      const teacherNpa = (t as any).npa ? String((t as any).npa) : '';
      const teacherPhone = t.phone ? String(t.phone) : '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = query === '' ||
                            teacherName.toLowerCase().includes(query) ||
                            teacherNickname.toLowerCase().includes(query) ||
                            teacherSchool.toLowerCase().includes(query) ||
                            teacherNip.includes(query) ||
                            teacherNpa.includes(query) ||
                            teacherPhone.includes(query);
      
      const activeState = isMemberActive(t);
      const matchesActive = selectedActiveStatus === 'Semua' || 
                            (selectedActiveStatus === 'Aktif' && activeState) || 
                            (selectedActiveStatus === 'Tidak Aktif' && !activeState);

      const matchesGender = selectedGender === 'Semua' || getGender(t) === selectedGender;
      const matchesSchool = selectedSchool === 'Semua' || teacherSchool.trim().toUpperCase() === selectedSchool.trim().toUpperCase();
      
      return matchesSearch && matchesActive && matchesGender && matchesSchool;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));

  // Filter daftar anggota yang tidak hadir & hadir
  const absentTeachers = teachersList.filter((t: any) => {
    if (!t) return false;
    const status = getTeacherAttendanceStatus(t);
    return status === 'Sakit' || status === 'Izin' || status === 'Alpha';
  });

  const presentTeachers = teachersList.filter((t: any) => {
    if (!t) return false;
    const status = getTeacherAttendanceStatus(t);
    return status === 'Hadir';
  });

  // Filter daftar anggota aktif & tidak aktif
  const activeTeachers = teachersList.filter((t: any) => t && isMemberActive(t));
  const inactiveTeachers = teachersList.filter((t: any) => t && !isMemberActive(t));

  const handleToggleActiveStatus = (teacher: Teacher, targetStatus: boolean) => {
    if (activeRole !== 'admin') {
      handleOpenWarning('Maaf, hanya pengurus yang dapat mengubah status keaktifan anggota.');
      return;
    }
    const updated = teachersList.map(t => {
      if (t.id === teacher.id) {
        return {
          ...t,
          isActive: targetStatus,
          activeStatus: targetStatus ? 'Aktif' : 'Tidak Aktif'
        } as Teacher;
      }
      return t;
    });
    setTeachersList(updated);
    if (onTeachersChange) onTeachersChange(updated);
    mutateCloudCollection<Teacher>(
      'teachers',
      ['kombel-teachers'],
      (latest) => latest.map(t => t.id === teacher.id ? {
        ...t,
        isActive: targetStatus,
        activeStatus: targetStatus ? 'Aktif' : 'Tidak Aktif'
      } as Teacher : t),
      updated,
      'Daftar Anggota'
    ).then(res => {
      setTeachersList(res.items);
      if (onTeachersChange) onTeachersChange(res.items);
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const updated = teachersList.filter(t => t.id !== targetId);
    setTeachersList(updated);
    if (onTeachersChange) onTeachersChange(updated);
    handleCloseDeleteModal();
    const res = await mutateCloudCollection<Teacher>(
      'teachers',
      ['kombel-teachers'],
      (latest) => latest.filter(t => t.id !== targetId),
      updated,
      'Daftar Anggota'
    );
    setTeachersList(res.items);
    if (onTeachersChange) onTeachersChange(res.items);
    if (!res.success) {
      handleOpenWarning(
        res.error || 'Data anggota terhapus di perangkat ini, namun gagal sinkron ke Cloud. Periksa koneksi atau hak akses akun Anda.'
      );
    }
  };

  // Handler untuk membuka WhatsApp
  const handleOpenWhatsApp = (phone?: string) => {
    if (!phone || phone === '-' || String(phone).trim() === '') {
      handleOpenWarning('Nomor WhatsApp anggota tidak tersedia.');
      return;
    }
    let cleanedPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = '62' + cleanedPhone.slice(1);
    }
    window.open(`https://wa.me/${cleanedPhone}`, '_blank');
  };

  // Handler Download Barcode PNG (Langsung Download File PNG & Tutup Popup)
  const handleDownloadBarcodePNG = async () => {
    if (!selectedBarcodeTeacher) return;
    setIsDownloadingBarcode(true);
    try {
      const barcodeValue = getBarcodeValue(selectedBarcodeTeacher);
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&data=${encodeURIComponent(barcodeValue)}`;
      const safeFileName = (selectedBarcodeTeacher.name || 'guru').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Barcode_${safeFileName}.png`;

      const response = await fetch(qrApiUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Gagal mengambil gambar barcode');

      const rawBlob = await response.blob();
      const imageBitmap = await createImageBitmap(rawBlob);

      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak didukung');

      // Background Putih Bersih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imageBitmap, 0, 0, 600, 600);

      const finalBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || rawBlob), 'image/png');
      });

      triggerDirectFileDownload(finalBlob, fileName);
      handleCloseBarcode();
    } catch (error) {
      console.warn('Gagal memproses canvas, mencoba unduhan langsung:', error);
      try {
        const barcodeValue = getBarcodeValue(selectedBarcodeTeacher);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&data=${encodeURIComponent(barcodeValue)}`;
        const safeFileName = (selectedBarcodeTeacher.name || 'guru').replace(/[^a-zA-Z0-9]/g, '_');
        const response = await fetch(qrApiUrl);
        const blob = await response.blob();
        triggerDirectFileDownload(blob, `Barcode_${safeFileName}.png`);
        handleCloseBarcode();
      } catch (fallbackError) {
        console.error('Gagal mengunduh barcode:', fallbackError);
        handleOpenWarning('Gagal mengunduh file barcode PNG. Periksa koneksi internet Anda.');
      }
    } finally {
      setIsDownloadingBarcode(false);
    }
  };

  // Handler Download E-KTA Digital PGRI Ranting Gelang (PNG)
  const handleDownloadEKTAPNG = async () => {
    if (!selectedBarcodeTeacher) return;
    setIsDownloadingEKTA(true);
    try {
      const barcodeValue = getBarcodeValue(selectedBarcodeTeacher);
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&format=png&data=${encodeURIComponent(barcodeValue)}`;
      const safeFileName = (selectedBarcodeTeacher.name || 'anggota').replace(/[^a-zA-Z0-9]/g, '_');

      const response = await fetch(qrApiUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Gagal memuat QR Code');
      const qrBlob = await response.blob();
      const qrBitmap = await createImageBitmap(qrBlob);

      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 580;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak didukung');

      // Background Kartu Elegan
      const bgGrad = ctx.createLinearGradient(0, 0, 960, 580);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(1, '#f8fafc');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 960, 580);

      // Header Banner Merah Maroon - Navy PGRI
      const hdrGrad = ctx.createLinearGradient(0, 0, 960, 145);
      hdrGrad.addColorStop(0, '#991b1b');
      hdrGrad.addColorStop(0.55, '#be123c');
      hdrGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = hdrGrad;
      ctx.fillRect(0, 0, 960, 145);

      // Garis Emas Aksen
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 145, 960, 8);

      // Logo PGRI (jika tersedia di localStorage)
      const logoSrc = localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel');
      if (logoSrc) {
        try {
          const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = logoSrc;
          });
          ctx.save();
          ctx.beginPath();
          ctx.arc(82, 72, 46, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.clip();
          ctx.drawImage(logoImg, 38, 28, 88, 88);
          ctx.restore();
        } catch {}
      }

      // Teks Header KTA
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('KARTU TANDA ANGGOTA DIGITAL (E-KTA)', 152, 58);
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('PGRI RANTING GELANG', 152, 95);
      ctx.fillStyle = '#fde68a';
      ctx.font = '600 16px sans-serif';
      ctx.fillText('KECAMATAN SUMBERBARU - KABUPATEN JEMBER', 152, 124);

      // Identitas Anggota (Kiri)
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('NAMA LENGKAP', 48, 210);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText((selectedBarcodeTeacher.name || '-').slice(0, 34), 48, 246);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('NPA PGRI', 48, 294);
      ctx.fillStyle = '#be123c';
      ctx.font = 'bold 24px monospace';
      ctx.fillText((selectedBarcodeTeacher as any).npa || '-', 48, 326);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('NIP / UNIT KERJA', 48, 372);
      ctx.fillStyle = '#1e293b';
      ctx.font = '600 20px monospace';
      ctx.fillText(`NIP. ${selectedBarcodeTeacher.nip || '-'}`, 48, 402);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(selectedBarcodeTeacher.school || '-', 48, 434);

      const statusBits = [
        selectedBarcodeTeacher.employmentStatus ? `Status: ${selectedBarcodeTeacher.employmentStatus}` : null,
        selectedBarcodeTeacher.certificationStatus ? selectedBarcodeTeacher.certificationStatus : null,
        `KTA: ${selectedBarcodeTeacher.ktaStatus || 'Aktif'}`
      ].filter(Boolean).join('  •  ');
      ctx.fillStyle = '#475569';
      ctx.font = '600 15px sans-serif';
      ctx.fillText(statusBits, 48, 478);

      // Kotak QR Code (Kanan)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.fillRect(664, 192, 244, 244);
      ctx.strokeRect(664, 192, 244, 244);
      ctx.drawImage(qrBitmap, 680, 208, 212, 212);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN QR PRESENSI PGRI', 786, 462);
      ctx.textAlign = 'left';

      // Footer
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 524, 960, 56);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Hidup Guru! Hidup PGRI! Solidaritas, Yes!', 48, 558);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Dokumen Digital Resmi PGRI Ranting Gelang', 912, 558);

      const finalBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (finalBlob) {
        triggerDirectFileDownload(finalBlob, `EKTA_PGRI_${safeFileName}.png`);
      }
    } catch (error) {
      console.error('Gagal membuat E-KTA Digital:', error);
      handleOpenWarning('Gagal mengunduh E-KTA Digital. Pastikan koneksi internet aktif untuk memuat QR Code.');
    } finally {
      setIsDownloadingEKTA(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const cleanNpa = (formData.npa || '').trim();
    if (cleanNpa.length !== 11 || !/^\d{11}$/.test(cleanNpa)) {
      handleOpenWarning('NPA wajib diisi tepat 11 digit angka (tidak boleh kurang atau lebih).');
      return;
    }

    let updated: Teacher[];
    let editedObj: Teacher | null = null;
    let newTeacher: Teacher | null = null;
    const targetEditId = editingTeacher?.id;

    if (editingTeacher) {
      editedObj = {
        ...editingTeacher,
        name: formData.name || editingTeacher.name,
        nickname: formData.nickname || getNickname(editingTeacher),
        gender: (formData.gender as 'L' | 'P') || getGender(editingTeacher),
        school: formData.school || editingTeacher.school,
        nip: formData.nip,
        npa: cleanNpa,
        role: formData.role || editingTeacher.role,
        phone: formData.phone || editingTeacher.phone,
        email: formData.email || editingTeacher.email,
        employmentStatus: formData.employmentStatus,
        certificationStatus: formData.certificationStatus,
        ktaStatus: formData.ktaStatus || 'Aktif',
        retirementYear: (formData.retirementYear || '').replace(/\D/g, '').slice(0, 4)
      } as Teacher;
      updated = teachersList.map(t => t.id === editingTeacher.id ? editedObj! : t);
      logAuditEvent('Daftar Anggota', 'Edit Anggota', `Memperbarui profil anggota ${editedObj.name} (${editedObj.school}).`);
    } else {
      const safeName = formData.name || '';
      newTeacher = {
        id: `t_${Date.now()}`,
        name: safeName,
        nickname: formData.nickname || safeName.split(' ')[0],
        gender: (formData.gender as 'L' | 'P') || 'L',
        school: formData.school || dynamicSchoolsList[0] || MASTER_SCHOOLS_LIST[0],
        nip: formData.nip,
        npa: cleanNpa,
        role: formData.role || 'Anggota Aktif',
        avatar: formData.gender === 'P' 
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        phone: formData.phone || '-',
        email: formData.email || 'guru@guru.sd.belajar.id',
        employmentStatus: formData.employmentStatus,
        certificationStatus: formData.certificationStatus,
        ktaStatus: formData.ktaStatus || 'Aktif',
        retirementYear: (formData.retirementYear || '').replace(/\D/g, '').slice(0, 4),
        isActive: false, // Pendaftaran anggota baru otomatis "Tidak aktif"
        activeStatus: 'Tidak Aktif'
      } as Teacher;
      updated = [newTeacher, ...teachersList];
      logAuditEvent('Daftar Anggota', 'Tambah Anggota', `Mendaftarkan anggota baru ${newTeacher.name} (${newTeacher.school}).`);
    }

    setTeachersList(updated);
    if (onTeachersChange) onTeachersChange(updated);
    handleCloseModal();

    mutateCloudCollection<Teacher>(
      'teachers',
      ['kombel-teachers'],
      (latest) => {
        if (targetEditId && editedObj) {
          return latest.some(t => t.id === targetEditId)
            ? latest.map(t => t.id === targetEditId ? { ...t, ...editedObj } : t)
            : [editedObj, ...latest];
        }
        if (newTeacher) {
          return [newTeacher, ...latest.filter(t => t.id !== newTeacher!.id)];
        }
        return latest;
      },
      updated,
      'Daftar Anggota'
    ).then(res => {
      setTeachersList(res.items);
      if (onTeachersChange) onTeachersChange(res.items);
    });
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

  // Handler untuk Unduh PDF (PC: Jendela Cetak | Ponsel: Auto Download PDF)
  const handleDownloadPDF = async () => {
    // 1. Pengambilan Data Pengaturan (Logo, TTD, & Stempel)
    let settingsData: Record<string, string> = {};
    try {
      if (typeof window !== 'undefined') {
        const keys = [
          'logo-pgri', 'logo-kombel',
          'ttd-ketua', 'logo-stempel', 'logo-stempel-rotation'
        ];
        keys.forEach(k => {
          const val = localStorage.getItem(k);
          if (val) settingsData[k] = val;
        });
      }
    } catch (e) {
      console.warn('Gagal memuat setting:', e);
    }

    // 2. Pengambilan Data Nama & NIP Ketua dari Profil Kombel
    let ketuaName = 'Umar Ali Kusuma';
    let ketuaNip = '198912092025211092';
    try {
      const savedPengurus = localStorage.getItem('kombel-pengurus');
      if (savedPengurus) {
        const parsed = JSON.parse(savedPengurus);
        const ketua = parsed.find((p: any) => p.role && p.role.toLowerCase().includes('ketua'));
        if (ketua) {
          ketuaName = ketua.name || ketuaName;
          ketuaNip = ketua.nip || ketuaNip;
        }
      }
    } catch (e) {
      console.warn('Gagal memuat profil ketua:', e);
    }

    // 3. Konfigurasi Parameter Gambar Logo & Stempel
    const logoPgri = settingsData['logo-pgri'] || settingsData['logo-kombel'] || '';

    const ttdKetua = settingsData['ttd-ketua'] || '';
    const logoStempel = settingsData['logo-stempel'] || '';
    const stempelRotation = settingsData['logo-stempel-rotation'] ? Number(settingsData['logo-stempel-rotation']) : 0;

    // Tanggal saat ini dinamis (Contoh: 22 November 2026)
    const todayFormatted = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // 4. Perhitungan Data Jumlah Anggota untuk Kotak Keterangan
    const maleCount = filteredTeachers.filter(t => getGender(t) === 'L').length;
    const femaleCount = filteredTeachers.filter(t => getGender(t) === 'P').length;
    const totalCount = filteredTeachers.length;
    const activeCount = filteredTeachers.filter(t => isMemberActive(t)).length;
    const inactiveCount = filteredTeachers.filter(t => !isMemberActive(t)).length;

    // 5. Mapping Baris Data Tabel Guru
    const rows = filteredTeachers.map((t, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="font-weight: bold; text-align: left;">${t.name}</td>
        <td style="text-align: center;">${getNickname(t)}</td>
        <td style="text-align: center; font-family: monospace;">${t.nip || '-'}</td>
        <td style="text-align: center; font-family: monospace;">${(t as any).npa || '-'}</td>
        <td style="text-align: center; font-weight: bold;">${getGender(t)}</td>
        <td style="text-align: center; font-family: monospace;">${t.phone || '-'}</td>
        <td style="text-align: left;">${t.school}</td>
        <td style="text-align: center; font-weight: bold; color: ${isMemberActive(t) ? '#059669' : '#e11d48'};">
          ${isMemberActive(t) ? 'Aktif' : 'Tidak Aktif'}
        </td>
      </tr>
    `).join('');

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
            .kop-container {
              display: flex;
              align-items: center;
              gap: 14px;
              padding-bottom: 6px;
              position: relative;
              z-index: 2;
            }
            .kop-logo-wrapper {
              width: 94px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .kop-logo {
              width: 92px;
              height: 92px;
              object-fit: contain;
              display: block;
            }
            .kop-text-container {
              flex: 1;
              text-align: center;
              line-height: 1.18;
              color: #000000;
              padding-left: 8px;
            }
            .kop-org {
              font-size: 13pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .kop-sub-org {
              font-size: 10.5pt;
              font-weight: bold;
              font-style: italic;
              margin-top: 1px;
            }
            .kop-ranting {
              font-size: 16.5pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 1px;
            }
            .kop-wilayah {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-top: 1px;
            }
            .kop-sekretariat {
              font-size: 8.5pt;
              font-style: italic;
              margin-top: 2px;
            }
            .kop-divider {
              border-top: 2px solid #000000;
              border-bottom: 1px solid #000000;
              height: 4px;
              margin-bottom: 12px;
              position: relative;
              z-index: 2;
            }
            .document-title {
              text-align: center;
              margin-top: 6px;
              margin-bottom: 4px;
              position: relative;
              z-index: 1;
            }
            .document-title-container {
              display: inline-block;
              text-align: center;
            }
            .document-title h3 {
              margin: 0 0 2px 0;
              font-size: 11.5pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-divider {
              width: 100%;
              border-top: 1px solid #000;
              margin: 2px 0 3px 0;
            }
            .document-title p {
              margin: 0;
              font-size: 8.5pt;
              font-weight: bold;
            }
            .double-thin-line { 
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              height: 3px;
              margin: 6px 0 10px 0; 
              position: relative;
              z-index: 1;
            }
            table.data-table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 8pt;
              position: relative;
              z-index: 1;
            }
            table.data-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            table.data-table th, table.data-table td { 
              padding: 4px 6px; 
              border: 1px solid #333; 
              white-space: nowrap;
            }
            table.data-table th { 
              background-color: #f1f5f9; 
              color: #000; 
              text-align: center; 
              font-weight: bold; 
              font-size: 8pt; 
              text-transform: uppercase;
            }
            table.data-table tr:nth-child(even) { 
              background-color: #fafafa; 
            }
            .footer-section {
              margin-top: 14px;
              width: 100%;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: table;
              position: relative;
              z-index: 1;
            }
            .footer-row {
              display: table-row;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .keterangan-col {
              display: table-cell;
              width: 38%;
              vertical-align: top;
            }
            .keterangan-box {
              border: 1.5px solid #000;
              padding: 6px 10px;
              font-size: 8.5pt;
              background-color: rgba(255, 255, 255, 0.9);
              display: inline-block;
              min-width: 200px;
            }
            .keterangan-title {
              margin: 0 0 4px 0;
              font-weight: bold;
              text-decoration: underline;
            }
            .keterangan-table {
              border-collapse: collapse;
              width: 100%;
              font-size: 8pt;
            }
            .keterangan-table td {
              border: none !important;
              padding: 0.5px 2px !important;
              line-height: 1.15;
              white-space: nowrap;
            }
            .keterangan-table td.label-col { width: 90px; }
            .keterangan-table td.colon-col { width: 10px; text-align: center; }
            .keterangan-table td.val-col { font-weight: bold; text-align: left; }
            .spacer-col {
              display: table-cell;
              width: 27%;
            }
            .ttd-col {
              display: table-cell;
              width: 35%;
              text-align: center;
              position: relative;
              font-size: 8.8pt;
              vertical-align: top;
            }
            .ttd-col p {
              margin: 1px 0;
              line-height: 1.25;
            }
            .ttd-signature-area {
              height: 75px;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .ttd-img {
              position: absolute;
              max-height: 65px;
              max-width: 120px;
              object-fit: contain;
              z-index: 2;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
            }
            .stempel-img {
              position: absolute;
              width: 3.5cm;
              height: 3.5cm;
              object-fit: contain;
              z-index: 1;
              left: 10%;
              top: 50%;
              transform: translateY(-50%) rotate(${stempelRotation}deg);
              opacity: 0.9;
              pointer-events: none;
            }
            .ttd-name {
              font-weight: bold;
              text-decoration: underline;
              color: #000;
              margin-top: 2px;
            }
            .ttd-nip {
              font-size: 8pt;
              color: #111;
            }
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

            <div class="document-title" style="margin-top: 16px; margin-bottom: 20px;">
              <div class="document-title-container">
                <h3>DAFTAR ANGGOTA PGRI RANTING GELANG</h3>
                <div class="title-divider"></div>
                <p>Periode : 2026-2027</p>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 30px;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 80px;">Panggilan</th>
                  <th style="width: 130px;">NIP</th>
                  <th style="width: 100px;">NPA</th>
                  <th style="width: 40px;">L/P</th>
                  <th style="width: 110px;">WhatsApp</th>
                  <th>Nama Sekolah</th>
                  <th style="width: 80px;">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="footer-section">
              <div class="footer-row">
                <div class="keterangan-col">
                  <div class="keterangan-box">
                    <p class="keterangan-title" style="margin-bottom: 3px;">Keterangan :</p>
                    <table class="keterangan-table">
                      <tr>
                        <td class="label-col">Laki - Laki</td>
                        <td class="colon-col">:</td>
                        <td class="val-col">${maleCount}</td>
                      </tr>
                      <tr>
                        <td class="label-col">Perempuan</td>
                        <td class="colon-col">:</td>
                        <td class="val-col">${femaleCount}</td>
                      </tr>
                      <tr>
                        <td class="label-col">Total Anggota</td>
                        <td class="colon-col">:</td>
                        <td class="val-col">${totalCount}</td>
                      </tr>
                      <tr style="height: 3px;"><td colspan="3"></td></tr>
                      <tr>
                        <td class="label-col">Anggota Aktif</td>
                        <td class="colon-col">:</td>
                        <td class="val-col">${activeCount}</td>
                      </tr>
                      <tr>
                        <td class="label-col">Anggota Non Aktif</td>
                        <td class="colon-col">:</td>
                        <td class="val-col">${inactiveCount}</td>
                      </tr>
                    </table>
                  </div>
                </div>

                <div class="spacer-col"></div>

                <div class="ttd-col">
                  <p>Jember, ${todayFormatted}</p>
                  <p>Ketua PGRI Ranting Gelang</p>
                  <p>Kecamatan Sumberbaru</p>
                  
                  <div class="ttd-signature-area">
                    ${logoStempel ? `<img src="${logoStempel}" class="stempel-img" alt="Stempel" />` : ''}
                    ${ttdKetua ? `<img src="${ttdKetua}" class="ttd-img" alt="Tanda Tangan" />` : ''}
                  </div>

                  <p class="ttd-name">${ketuaName}</p>
                  <p class="ttd-nip">NPA. 13301500431</p>
                </div>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(container);

        const opt = {
          margin: [10, 12, 10, 12],
          filename: `Daftar_Anggota_PGRI_Ranting_Gelang_${new Date().toISOString().split('T')[0]}.pdf`,
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
      return;
    }

    // JIKA DI PC / LAPTOP: Gunakan pratinjau cetak bawaan browser
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daftar Anggota PGRI Ranting Gelang</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 1.2cm 1.5cm; 
            }
            * {
              box-sizing: border-box;
              font-family: 'Times New Roman', Times, serif;
            }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              margin: 0; 
              padding: 0; 
              color: #000; 
              position: relative;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            /* Kop Surat PGRI Ranting Gelang */
            .kop-container {
              display: flex;
              align-items: center;
              gap: 14px;
              padding-bottom: 6px;
              position: relative;
              z-index: 2;
            }
            .kop-logo-wrapper {
              width: 94px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .kop-logo {
              width: 92px;
              height: 92px;
              object-fit: contain;
              display: block;
            }
            .kop-text-container {
              flex: 1;
              text-align: center;
              line-height: 1.18;
              color: #000000;
              padding-left: 8px;
            }
            .kop-org {
              font-size: 13pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .kop-sub-org {
              font-size: 10.5pt;
              font-weight: bold;
              font-style: italic;
              margin-top: 1px;
            }
            .kop-ranting {
              font-size: 16.5pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 1px;
            }
            .kop-wilayah {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-top: 1px;
            }
            .kop-sekretariat {
              font-size: 8.5pt;
              font-style: italic;
              margin-top: 2px;
            }
            .kop-divider {
              border-top: 2px solid #000000;
              border-bottom: 1px solid #000000;
              height: 4px;
              margin-bottom: 12px;
              position: relative;
              z-index: 2;
            }

            /* Judul Dokumen */
            .document-title {
              text-align: center;
              margin-top: 10px;
              margin-bottom: 6px;
            }
            .document-title-container {
              display: inline-block;
              text-align: center;
            }
            .document-title h3 {
              margin: 0 0 3px 0;
              font-size: 13pt;
              font-weight: bold;
              text-transform: uppercase;
              text-decoration: none;
              letter-spacing: 0.5px;
            }
            .title-divider {
              width: 100%;
              border-top: 1px solid #000;
              margin: 3px 0 4px 0;
            }
            .document-title p {
              margin: 0;
              font-size: 9.5pt;
              font-weight: bold;
            }

            /* 2 Garis Horizontal Tipis */
            .double-thin-line { 
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              height: 3px;
              margin: 8px 0 14px 0; 
            }

            /* Tabel */
            table.data-table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 9pt;
              page-break-inside: auto;
            }
            table.data-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            table.data-table th, table.data-table td { 
              padding: 5px 7px; 
              border: 1px solid #333; 
              white-space: nowrap;
            }
            table.data-table th { 
              background-color: #f1f5f9 !important; 
              color: #000 !important; 
              text-align: center; 
              font-weight: bold; 
              font-size: 8.5pt; 
              text-transform: uppercase;
            }
            table.data-table tr:nth-child(even) { 
              background-color: #fafafa !important; 
            }

            /* Area Bawah: Kotak Keterangan di Kiri & TTD di Kanan dengan Proteksi Pemisahan Halaman (Page Break Avoid) */
            .footer-section {
              margin-top: 20px;
              width: 100%;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-before: auto;
              display: table;
            }
            .footer-row {
              display: table-row;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            /* Kotak Keterangan Pojok Kiri Bawah */
            .keterangan-col {
              display: table-cell;
              width: 38%;
              vertical-align: top;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .keterangan-box {
              border: 1.5px solid #000;
              padding: 8px 12px;
              font-size: 9.5pt;
              background-color: rgba(255, 255, 255, 0.85);
              display: inline-block;
              min-width: 210px;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .keterangan-title {
              margin: 0 0 6px 0;
              font-weight: bold;
              text-decoration: underline;
            }
            .keterangan-table {
              border-collapse: collapse;
              width: 100%;
              font-size: 9pt;
            }
            .keterangan-table td {
              border: none !important;
              padding: 0.5px 3px !important;
              line-height: 1.15;
              white-space: nowrap;
            }
            .keterangan-table td.label-col {
              width: 95px;
            }
            .keterangan-table td.colon-col {
              width: 10px;
              text-align: center;
            }
            .keterangan-table td.val-col {
              font-weight: bold;
              text-align: left;
            }

            /* Spacer Tengah */
            .spacer-col {
              display: table-cell;
              width: 27%;
            }

            /* Kotak Tanda Tangan Pojok Kanan Bawah */
            .ttd-col {
              display: table-cell;
              width: 35%;
              text-align: center;
              position: relative;
              font-size: 10pt;
              vertical-align: top;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .ttd-col p {
              margin: 1px 0;
              line-height: 1.35;
            }
            .ttd-signature-area {
              height: 85px;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .ttd-img {
              position: absolute;
              max-height: 75px;
              max-width: 130px;
              object-fit: contain;
              z-index: 2;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
            }
            /* Posisi Stempel: Batas atas & bawah tepat di tengah-tengah area TTD */
            .stempel-img {
              position: absolute;
              width: 4.03cm;
              height: 4.03cm;
              object-fit: contain;
              z-index: 1;
              left: 10%;
              top: 50%;
              transform: translateY(-50%) rotate(${stempelRotation}deg);
              opacity: 0.9;
              pointer-events: none;
            }
            .ttd-name {
              font-weight: bold;
              text-decoration: underline;
              color: #000;
              margin-top: 4px;
            }
            .ttd-nip {
              font-size: 9pt;
              color: #111;
            }
          </style>
        </head>
        <body>

          <!-- Kop Surat PGRI Ranting Gelang -->
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

          <!-- Judul Dokumen -->
          <div class="document-title" style="margin-top: 20px; margin-bottom: 24px;">
            <div class="document-title-container">
              <h3>DAFTAR ANGGOTA PGRI RANTING GELANG</h3>
              <div class="title-divider"></div>
              <p>Periode : 2026-2027</p>
            </div>
          </div>

          <!-- Tabel Data Anggota -->
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama Lengkap</th>
                <th style="width: 80px;">Panggilan</th>
                <th style="width: 130px;">NIP</th>
                <th style="width: 100px;">NPA</th>
                <th style="width: 40px;">L/P</th>
                <th style="width: 110px;">WhatsApp</th>
                <th>Nama Sekolah</th>
                <th style="width: 80px;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <!-- Area Bawah: Kotak Keterangan (Kiri) & TTD (Kanan) -->
          <div class="footer-section">
            <div class="footer-row">
              
              <!-- Kotak Keterangan Pojok Kiri Bawah -->
              <div class="keterangan-col">
                <div class="keterangan-box">
                  <p class="keterangan-title" style="margin-bottom: 3px;">Keterangan :</p>
                  <table class="keterangan-table">
                    <tr>
                      <td class="label-col">Laki - Laki</td>
                      <td class="colon-col">:</td>
                      <td class="val-col">${maleCount}</td>
                    </tr>
                    <tr>
                      <td class="label-col">Perempuan</td>
                      <td class="colon-col">:</td>
                      <td class="val-col">${femaleCount}</td>
                    </tr>
                    <tr>
                      <td class="label-col">Total Anggota</td>
                      <td class="colon-col">:</td>
                      <td class="val-col">${totalCount}</td>
                    </tr>
                    <tr style="height: 3px;">
                      <td colspan="3"></td>
                    </tr>
                    <tr>
                      <td class="label-col">Anggota Aktif</td>
                      <td class="colon-col">:</td>
                      <td class="val-col">${activeCount}</td>
                    </tr>
                    <tr>
                      <td class="label-col">Anggota Non Aktif</td>
                      <td class="colon-col">:</td>
                      <td class="val-col">${inactiveCount}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- Spacer Tengah -->
              <div class="spacer-col"></div>

              <!-- Kotak Tanda Tangan Pojok Kanan Bawah -->
              <div class="ttd-col">
                <p>Jember, ${todayFormatted}</p>
                <p>Ketua PGRI Ranting Gelang</p>
                <p>Kecamatan Sumberbaru</p>
                
                <div class="ttd-signature-area">
                  ${logoStempel ? `<img src="${logoStempel}" class="stempel-img" alt="Stempel" />` : ''}
                  ${ttdKetua ? `<img src="${ttdKetua}" class="ttd-img" alt="Tanda Tangan" />` : ''}
                </div>

                <p class="ttd-name">${ketuaName}</p>
                <p class="ttd-nip">NPA. 13301500431</p>
              </div>

            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
            window.onafterprint = function() { 
              window.close(); 
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Filter daftar anggota untuk Popup Kehadiran
  const modalPresenceList = teachersList.filter((t: any) => {
    if (!t) return false;
    const status = getTeacherAttendanceStatus(t);

    if (presenceFilter === 'Semua') return true;
    if (presenceFilter === 'Hadir') return status === 'Hadir';
    if (presenceFilter === 'Sakit') return status === 'Sakit';
    if (presenceFilter === 'Izin') return status === 'Izin';
    if (presenceFilter === 'Alpha') return status === 'Alpha';
    return true;
  });

  return (
    <div className="font-sans w-full space-y-6 relative">
      
      {/* CSS Animasi, Modal Transitions & Kustomisasi Scrollbar Ramping */}
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
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? '#44403c transparent' : '#d6d3d1 transparent'};
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDark ? '#1c1917' : '#faf8f5'};
        }
        .table-scroll-wrapper {
          overflow-y: auto;
          overflow-y: overlay;
          overflow-x: auto;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${isDark ? 'rgba(68, 64, 60, 0.85)' : 'rgba(214, 211, 209, 0.9)'};
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: ${isDark ? 'rgba(120, 113, 108, 1)' : 'rgba(168, 162, 158, 1)'};
        }
      `}</style>
      
      {/* Header Banner — Wibawa Kusuma Bangsa */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 sm:p-7 shadow-sm ${
        isDark
          ? 'bg-gradient-to-br from-[#231214] via-stone-900 to-[#1a1112] border-red-900/40 text-stone-100 pgri-batik-pattern-dark'
          : 'bg-gradient-to-br from-[#fdfbf7] via-white to-red-50/50 border-stone-200/90 text-stone-900 pgri-batik-pattern'
      }`}>
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-red-950/70 border-red-800/60 text-amber-400'
                : 'bg-red-50 border-red-200/90 text-red-800'
            }`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-1 ${
                activeRole === 'admin'
                  ? 'text-red-800 dark:text-amber-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
                Direktori Anggota • {activeRole === 'admin' ? 'Mode Admin / Pengurus' : 'Mode Baca Guru'}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Daftar Anggota</h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                Kelola direktori anggota PGRI Ranting Gelang
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-800 hover:bg-red-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Daftar Sebagai Anggota
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              title="Unduh Daftar Anggota (PDF)"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border shadow-sm transition-colors cursor-pointer ${
                isDark
                  ? 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-100'
                  : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-800'
              }`}
            >
              <Download className="w-4 h-4 text-red-800 dark:text-amber-400" />
              Unduh PDF
            </button>
          </div>
        </div>
      </div>

      {/* Kotak Aksi Admin Tanpa Nama (Template, Import, Export, Unduh Barcode) */}
      {activeRole === 'admin' && (
        <div
          className={`rounded-2xl border px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark
              ? 'bg-stone-900 border-stone-800 text-stone-100'
              : 'bg-white border-stone-200/90 text-stone-900'
          }`}
        >
          {/* Teks Keterangan di Sisi Kiri */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <FileSpreadsheet className="w-4 h-4 text-red-800 dark:text-amber-400 shrink-0" />
            <p className={isDark ? 'text-stone-300' : 'text-stone-600'}>
              Kelola data massal anggota melalui berkas Excel atau unduh arsip kode QR presensi.
            </p>
          </div>

          {/* Kumpulan Tombol di Sisi Kanan */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:ml-auto">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportTeachersFile}
              className="hidden"
            />

            {/* Tombol Template */}
            <button
              type="button"
              onClick={handleDownloadTemplateExcel}
              title="Unduh Template Excel Anggota"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-amber-950/40 border-amber-700/50 text-amber-300 hover:bg-amber-900/50'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template</span>
            </button>

            {/* Tombol Import */}
            <button
              type="button"
              disabled={isImportingTeachers}
              onClick={() => importInputRef.current?.click()}
              title="Import Data Anggota dari Excel"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer disabled:opacity-60 ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {isImportingTeachers ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isImportingTeachers ? 'Mengimpor...' : 'Import'}</span>
            </button>

            {/* Tombol Export */}
            <button
              type="button"
              onClick={handleExportTeachersExcel}
              title="Export Data Anggota ke Excel"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'
                  : 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {/* Tombol Unduh Barcode */}
            <button
              type="button"
              onClick={handleDownloadAllBarcodesZIP}
              disabled={isDownloadingAllBarcodes}
              title="Unduh Semua Barcode Anggota (.ZIP)"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer disabled:opacity-60 ${
                isDark
                  ? 'bg-red-950/50 border-red-800/60 text-amber-300 hover:bg-red-900/50'
                  : 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'
              }`}
            >
              {isDownloadingAllBarcodes ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>{isDownloadingAllBarcodes ? 'Mengompres...' : 'Unduh Barcode'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3 Kotak Statistik */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
        
        {/* Kotak 1: JUMLAH ANGGOTA */}
        <div className="w-full bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-row items-center gap-2.5 sm:gap-5 relative overflow-hidden">
          <div className="w-10 sm:w-14 h-10 sm:h-14 rounded-xl bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60 flex items-center justify-center shrink-0">
            <Users className="w-5 sm:w-7 h-5 sm:h-7 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400" />
          </div>
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <p className="text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400">
              <span className="sm:hidden">JUMLAH</span>
              <span className="hidden sm:inline">JUMLAH ANGGOTA</span>
            </p>
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 [.dark_&]:text-white dark:text-white leading-none">
              {teachersList.length}
            </p>
            <p className="text-[10px] sm:text-[11px] font-semibold text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400 pt-0.5 truncate">
              100% Terdaftar
            </p>
          </div>
        </div>

        {/* Kotak 2: KEHADIRAN ANGGOTA */}
        <div 
          onClick={handleOpenPresentModal}
          className="w-full bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 hover:border-emerald-300 [.dark_&]:hover:border-emerald-700/60 dark:hover:border-emerald-700/60 rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-row items-center gap-2.5 sm:gap-5 relative overflow-hidden cursor-pointer active:scale-95 group transition-colors"
          title="Klik untuk melihat detail kehadiran"
        >
          <div className="w-10 sm:w-14 h-10 sm:h-14 rounded-xl bg-emerald-50 [.dark_&]:bg-emerald-950/60 dark:bg-emerald-950/60 border border-emerald-200 [.dark_&]:border-emerald-800/50 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 sm:w-7 h-5 sm:h-7 text-emerald-700 [.dark_&]:text-emerald-400 dark:text-emerald-400" />
          </div>
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <p className="text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase text-emerald-700 [.dark_&]:text-emerald-400 dark:text-emerald-400 flex items-center gap-1 sm:gap-1.5">
              <span className="sm:hidden">KEHADIRAN</span>
              <span className="hidden sm:inline">KEHADIRAN ANGGOTA</span>
              <span className="text-[8px] sm:text-[9px] bg-emerald-100 [.dark_&]:bg-emerald-950/80 dark:bg-emerald-950/80 text-emerald-700 [.dark_&]:text-emerald-300 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-md font-bold">Detail</span>
            </p>
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 [.dark_&]:text-white dark:text-white leading-none">
              {teachersList.length > 0 ? `${Math.round(((teachersList.length - absentTeachers.length) / teachersList.length) * 100)}%` : '100%'}
            </p>
            <p className="text-[10px] sm:text-[11px] font-semibold text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400 pt-0.5 truncate max-w-full">
              <span className="sm:hidden">{presentTeachers.length} Hadir</span>
              <span className="hidden sm:inline">{presentTeachers.length} Hadir • {absentTeachers.filter((t: any) => getTeacherAttendanceStatus(t) === 'Sakit').length} Sakit • {absentTeachers.filter((t: any) => getTeacherAttendanceStatus(t) === 'Izin').length} Izin • {absentTeachers.filter((t: any) => getTeacherAttendanceStatus(t) === 'Alpha').length} Alpha</span>
            </p>
          </div>
        </div>

        {/* Kotak 3: KEAKTIFAN ANGGOTA */}
        <div 
          onClick={handleOpenInactiveModal}
          className="hidden md:flex w-full bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 hover:border-amber-400 [.dark_&]:hover:border-amber-700/60 dark:hover:border-amber-700/60 rounded-2xl p-6 shadow-sm items-center gap-5 relative overflow-hidden cursor-pointer active:scale-95 group transition-colors"
          title="Klik untuk melihat detail keaktifan"
        >
          <div className="w-14 h-14 rounded-xl bg-amber-50 [.dark_&]:bg-amber-950/60 dark:bg-amber-950/60 border border-amber-200 [.dark_&]:border-amber-800/50 dark:border-amber-800/50 flex items-center justify-center shrink-0">
            <UserX className="w-7 h-7 text-amber-700 [.dark_&]:text-amber-400 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-extrabold tracking-widest uppercase text-amber-700 [.dark_&]:text-amber-400 dark:text-amber-400 flex items-center gap-1.5">
              KEAKTIFAN ANGGOTA
              <span className="text-[9px] bg-amber-100 [.dark_&]:bg-amber-950/80 dark:bg-amber-950/80 text-amber-800 [.dark_&]:text-amber-300 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold">Detail</span>
            </p>
            <p className="font-display text-3xl font-extrabold text-stone-900 [.dark_&]:text-white dark:text-white leading-none">
              {activeTeachers.length}
            </p>
            <p className="text-[11px] font-semibold text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400 pt-0.5">
              {activeTeachers.length} Aktif • {inactiveTeachers.length} Tidak Aktif
            </p>
          </div>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="w-full bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-[2] w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari data guru ..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
          />
        </div>

        {/* Filter Keaktifan (Hidden on Mobile) */}
        <div className="hidden sm:block flex-1 w-full sm:w-auto relative">
          <ShieldCheck className="w-4 h-4 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedActiveStatus}
            onChange={(e) => setSelectedActiveStatus(e.target.value)}
            className="w-full pl-11 pr-8 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700 appearance-none cursor-pointer text-center"
          >
            <option value="Semua" className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-center">
              Semua Keaktifan
            </option>
            <option value="Aktif" className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-center">
              Aktif
            </option>
            <option value="Tidak Aktif" className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-center">
              Tidak Aktif
            </option>
          </select>
          <ChevronDown className="w-4 h-4 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter Gender (Hidden on Mobile) */}
        <div className="hidden sm:block flex-1 w-full sm:w-auto relative">
          <User className="w-4 h-4 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="w-full pl-11 pr-8 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700 appearance-none cursor-pointer text-center"
          >
            <option value="Semua" className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-center">
              Semua Jenis Kelamin
            </option>
            <option value="L" className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-center">
              Laki - Laki
            </option>
            <option value="P" className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-center">
              Perempuan
            </option>
          </select>
          <ChevronDown className="w-4 h-4 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter School (Hidden on Mobile) */}
        <div className="hidden sm:block flex-1 w-full sm:w-auto relative">
          <School className="w-4 h-4 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full pl-11 pr-8 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700 appearance-none cursor-pointer text-center"
          >
            {filterSchoolsList.map((sch) => (
              <option key={sch} value={sch} className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 text-center">
                {sch === 'Semua' ? 'Semua Sekolah' : sch}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Tabel Data Anggota */}
      <div className="w-full bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 overflow-hidden">
        <div className="w-full max-h-[600px] table-scroll-wrapper custom-scrollbar rounded-t-2xl">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-stone-200 [.dark_&]:border-stone-800 dark:border-stone-800 bg-[#faf8f5] [.dark_&]:bg-stone-800/90 dark:bg-stone-800/90 text-stone-600 [.dark_&]:text-stone-400 dark:text-stone-400 font-bold text-xs whitespace-nowrap">
                <th className="py-4 px-4 text-center w-12 rounded-tl-2xl">No</th>
                <th className="py-4 px-4 text-left">Nama Lengkap</th>
                <th className="py-4 px-4 text-center">Nama Panggilan</th>
                <th className="py-4 px-4 text-center">NIP</th>
                <th className="py-4 px-4 text-center">NPA</th>
                <th className="py-4 px-4 text-center w-16">L/P</th>
                <th className="py-4 px-4 text-center">WhatsApp</th>
                <th className="py-4 px-4 text-center">Nama Sekolah</th>
                <th className="py-4 px-4 text-center w-28">Barcode</th>
                <th className="py-4 px-4 text-center w-36">Keterangan</th>
                <th className="py-4 px-4 text-center w-28 rounded-tr-2xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 [.dark_&]:divide-stone-800/70 dark:divide-stone-800/70 text-xs sm:text-sm">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                        <SearchX className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 text-sm">Tidak Ada Data Guru</p>
                      <p className="text-xs text-stone-400 max-w-xs">Tidak ada data anggota guru yang sesuai dengan kriteria pencarian atau filter saat ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const gender = getGender(teacher);
                  const nickname = getNickname(teacher);
                  const actualNumber = index + 1;
                  const active = isMemberActive(teacher);

                  return (
                    <tr 
                      key={teacher.id || index} 
                      className="hover:bg-stone-50/80 [.dark_&]:hover:bg-stone-800/40 dark:hover:bg-stone-800/40 transition-colors group whitespace-nowrap"
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-bold text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400">
                        {actualNumber}
                      </td>

                      {/* Nama Guru */}
                      <td className="py-3.5 px-4 font-semibold text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                            gender === 'L' 
                              ? 'bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-700 [.dark_&]:text-amber-300 dark:text-amber-300 border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700' 
                              : 'bg-red-50 [.dark_&]:bg-red-950/60 dark:bg-red-950/60 text-red-800 [.dark_&]:text-red-300 dark:text-red-300 border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60'
                          }`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 [.dark_&]:text-white dark:text-white leading-snug whitespace-nowrap">{teacher.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Nama Panggilan */}
                      <td className="py-3.5 px-4 text-center font-bold text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400">
                        {nickname}
                      </td>

                      {/* NIP */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-stone-600 [.dark_&]:text-stone-400 dark:text-stone-400">
                        {teacher.nip || '-'}
                      </td>

                      {/* NPA */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-stone-600 [.dark_&]:text-stone-400 dark:text-stone-400">
                        {(teacher as any).npa || '-'}
                      </td>

                      {/* L/P */}
                      <td className="py-3.5 px-4 text-center font-medium text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300">
                        {gender}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300">
                        <div className="flex items-center justify-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{teacher.phone || '-'}</span>
                        </div>
                      </td>

                      {/* Nama Sekolah */}
                      <td className="py-3.5 px-4 text-center font-medium text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300">
                        <div className="flex items-center justify-center gap-2">
                          <School className="w-3.5 h-3.5 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 shrink-0" />
                          <span>{teacher.school}</span>
                        </div>
                      </td>

                      {/* Kolom Barcode (Tombol Lihat Barcode) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenBarcode(teacher)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 [.dark_&]:bg-red-950/50 [.dark_&]:hover:bg-red-900/50 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-800 [.dark_&]:text-amber-300 dark:text-amber-300 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60 text-xs font-bold transition-colors duration-200 active:scale-95 cursor-pointer"
                          title="Lihat Barcode Guru"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Barcode</span>
                        </button>
                      </td>

                      {/* Kolom Keterangan Status Keaktifan */}
                      <td className="py-3.5 px-4 text-center">
                        {activeRole === 'admin' ? (
                          <div className="inline-flex rounded-xl p-1 bg-stone-200/80 [.dark_&]:bg-stone-950/80 dark:bg-stone-950/80 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleActiveStatus(teacher, true)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                                active
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-stone-500 hover:text-stone-800 [.dark_&]:text-stone-400 [.dark_&]:hover:text-stone-200'
                              }`}
                            >
                              Aktif
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActiveStatus(teacher, false)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                                !active
                                  ? 'bg-red-700 text-white shadow-sm'
                                  : 'text-stone-500 hover:text-stone-800 [.dark_&]:text-stone-400 [.dark_&]:hover:text-stone-200'
                              }`}
                            >
                              Tidak aktif
                            </button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 [.dark_&]:bg-emerald-950/60 dark:bg-emerald-950/60 [.dark_&]:text-emerald-300 dark:text-emerald-300 border border-emerald-200 [.dark_&]:border-emerald-800/60 dark:border-emerald-800/60'
                              : 'bg-red-50 text-red-700 [.dark_&]:bg-red-950/60 dark:bg-red-950/60 [.dark_&]:text-red-300 dark:text-red-300 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60'
                          }`}>
                            {active ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {activeRole === "admin" && (
                            <button
                              onClick={() => handleOpenEdit(teacher)}
                              className="w-8 h-8 rounded-lg border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 bg-white [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 hover:bg-red-50 [.dark_&]:hover:bg-red-950/60 dark:hover:bg-red-950/60 active:scale-95 flex items-center justify-center transition-colors duration-200 cursor-pointer"
                              title="Edit Data Guru"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {activeRole === "admin" && (
                            <button
                              onClick={() => handleDelete(teacher.id, teacher.name)}
                              className="w-8 h-8 rounded-lg border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 bg-white [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 text-red-600 [.dark_&]:text-red-400 dark:text-red-400 hover:bg-red-50 [.dark_&]:hover:bg-red-950/60 dark:hover:bg-red-950/60 active:scale-95 flex items-center justify-center transition-colors duration-200 cursor-pointer"
                              title="Hapus Data Guru"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenWhatsApp(teacher.phone)}
                            className="w-8 h-8 rounded-lg border border-emerald-200 [.dark_&]:border-emerald-800/60 dark:border-emerald-800/60 bg-emerald-50/70 [.dark_&]:bg-emerald-950/40 dark:bg-emerald-950/40 text-emerald-600 [.dark_&]:text-emerald-400 dark:text-emerald-400 hover:bg-emerald-100 [.dark_&]:hover:bg-emerald-900/50 dark:hover:bg-emerald-900/50 active:scale-95 flex items-center justify-center transition-colors duration-200 cursor-pointer"
                            title="Hubungi via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup Barcode & Preview E-KTA Mini Anggota */}
      {selectedBarcodeTeacher && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${isClosingBarcodeModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 space-y-4 transition-all ${isClosingBarcodeModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            
            {/* Header Modal Barcode */}
            <div className="flex items-center justify-between border-b border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400">
                <div className="w-8 h-8 rounded-xl bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60 flex items-center justify-center font-bold">
                  {barcodeModalTab === 'ekta' ? <CreditCard className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                </div>
                <h3 className="font-display font-bold text-base text-stone-900 [.dark_&]:text-white dark:text-white">
                  {barcodeModalTab === 'ekta' ? 'Kartu Anggota Digital (E-KTA)' : 'Barcode Anggota'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseBarcode}
                className="p-1.5 rounded-xl hover:bg-stone-100 [.dark_&]:hover:bg-stone-800 dark:hover:bg-stone-800 text-stone-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Switcher Tab QR vs Preview E-KTA Mini */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 border border-stone-200/80 [.dark_&]:border-stone-700/60 dark:border-stone-700/60">
              <button
                type="button"
                onClick={() => setBarcodeModalTab('qr')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  barcodeModalTab === 'qr'
                    ? 'bg-red-800 text-white shadow-sm'
                    : 'text-stone-600 [.dark_&]:text-stone-300 dark:text-stone-300 hover:bg-stone-200/60 [.dark_&]:hover:bg-stone-700/60 dark:hover:bg-stone-700/60'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Presensi</span>
              </button>
              <button
                type="button"
                onClick={() => setBarcodeModalTab('ekta')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  barcodeModalTab === 'ekta'
                    ? 'bg-red-800 text-white shadow-sm'
                    : 'text-stone-600 [.dark_&]:text-stone-300 dark:text-stone-300 hover:bg-stone-200/60 [.dark_&]:hover:bg-stone-700/60 dark:hover:bg-stone-700/60'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Preview E-KTA</span>
              </button>
            </div>

            {barcodeModalTab === 'qr' ? (
              /* Konten Kartu Barcode (Nama, NIP, Nama Sekolah, & Barcode) */
              <div className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-[#faf8f5] [.dark_&]:bg-stone-800/60 dark:bg-stone-800/60 border border-stone-200/80 [.dark_&]:border-stone-700/60 dark:border-stone-700/60 space-y-3">
                
                {/* Info Guru di Atas Barcode */}
                <div className="space-y-1 w-full">
                  <h4 className="font-bold text-base text-stone-900 [.dark_&]:text-white dark:text-white leading-tight">
                    {selectedBarcodeTeacher.name}
                  </h4>
                  <p className="font-mono text-xs font-semibold text-stone-600 [.dark_&]:text-stone-300 dark:text-stone-300">
                    NIP. {selectedBarcodeTeacher.nip || '-'}
                  </p>
                  <p className="text-xs font-bold text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 flex items-center justify-center gap-1.5">
                    <School className="w-3.5 h-3.5 shrink-0" />
                    <span>{selectedBarcodeTeacher.school}</span>
                  </p>
                </div>

                {/* Tampilan Gambar Barcode / QR Code */}
                <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-sm inline-block">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(getBarcodeValue(selectedBarcodeTeacher))}`}
                    alt={`Barcode ${selectedBarcodeTeacher.name}`}
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                </div>

                {/* Data String Barcode */}
                <p className="text-[10px] font-mono text-stone-400 dark:text-stone-500 break-all px-2">
                  {getBarcodeValue(selectedBarcodeTeacher)}
                </p>
              </div>
            ) : (
              /* Preview Visual E-KTA Mini PGRI Ranting Gelang */
              (() => {
                const logoPreview = typeof window !== 'undefined' ? (localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel')) : null;
                return (
                  <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-lg bg-white text-stone-900">
                    <div className="bg-gradient-to-r from-red-900 via-red-800 to-stone-900 px-4 py-3 flex items-center gap-3 border-b-4 border-amber-500">
                      <div className="w-10 h-10 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo PGRI" className="w-full h-full object-contain" />
                        ) : (
                          <ShieldCheck className="w-5 h-5 text-red-800" />
                        )}
                      </div>
                      <div className="min-w-0 text-white">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-amber-200">
                          Kartu Tanda Anggota Digital
                        </p>
                        <p className="font-display font-extrabold text-sm leading-tight truncate">
                          PGRI RANTING GELANG
                        </p>
                        <p className="text-[10px] text-stone-200 truncate">
                          Kec. Sumberbaru - Kab. Jember
                        </p>
                      </div>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-3 bg-gradient-to-br from-white to-stone-50">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Nama Lengkap</p>
                          <p className="font-display font-extrabold text-sm text-stone-900 leading-snug break-words">
                            {selectedBarcodeTeacher.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">NPA PGRI</p>
                          <p className="font-mono font-extrabold text-xs text-red-800">
                            {(selectedBarcodeTeacher as any).npa || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">NIP &amp; Unit Kerja</p>
                          <p className="font-mono text-[11px] font-semibold text-stone-700">
                            NIP. {selectedBarcodeTeacher.nip || '-'}
                          </p>
                          <p className="text-[11px] font-bold text-stone-800 truncate">
                            {selectedBarcodeTeacher.school || '-'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold">
                            KTA: {selectedBarcodeTeacher.ktaStatus || 'Aktif'}
                          </span>
                          {selectedBarcodeTeacher.employmentStatus && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold">
                              {selectedBarcodeTeacher.employmentStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <div className="p-1.5 bg-white rounded-xl border border-stone-200 shadow-sm">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getBarcodeValue(selectedBarcodeTeacher))}`}
                            alt={`QR ${selectedBarcodeTeacher.name}`}
                            className="w-20 h-20 object-contain"
                          />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-stone-500">
                          QR Presensi
                        </span>
                      </div>
                    </div>

                    <div className="bg-stone-900 px-4 py-2 flex items-center justify-between text-[9px] text-stone-300">
                      <span className="font-bold text-amber-300">Solidaritas, Yes!</span>
                      <span>PGRI Ranting Gelang</span>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Tombol Aksi Unduh Barcode & E-KTA Digital PNG */}
            <div className="pt-2 border-t border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 flex flex-col gap-2">
              {barcodeModalTab === 'ekta' ? (
                <button
                  type="button"
                  disabled={isDownloadingEKTA}
                  onClick={handleDownloadEKTAPNG}
                  className="w-full px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isDownloadingEKTA ? 'Membuat E-KTA...' : 'Unduh E-KTA Digital (PNG)'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isDownloadingBarcode}
                  onClick={handleDownloadBarcodePNG}
                  className="w-full px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isDownloadingBarcode ? 'Mengunduh...' : 'Unduh Barcode Saja (PNG)'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal Popup Daftar Anggota HADIR dengan Filter Status */}
      {isPresentModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${isClosingPresentModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 space-y-4 ${isClosingPresentModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className="flex items-center justify-between border-b border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400">
                <div className="w-9 h-9 rounded-xl bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-stone-900 [.dark_&]:text-stone-100 dark:text-stone-100">
                    Daftar Kehadiran Anggota
                  </h3>
                  <p className="text-xs text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400">
                    {latestEvent ? `Berdasarkan kegiatan terbaru: ${latestEvent.title} • ${latestEvent.fullDate || latestEvent.date}` : 'Detail status kehadiran anggota hari ini'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePresentModal}
                className="p-1.5 rounded-xl hover:bg-stone-100 [.dark_&]:hover:bg-stone-800 dark:hover:bg-stone-800 text-stone-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Filter Status Kehadiran */}
            <div className="flex items-center gap-1.5 bg-[#faf8f5] [.dark_&]:bg-stone-800/80 dark:bg-stone-800/80 border border-stone-200/80 [.dark_&]:border-stone-700/60 dark:border-stone-700/60 p-1.5 rounded-xl overflow-x-auto text-xs">
              {(['Semua', 'Hadir', 'Sakit', 'Izin', 'Alpha'] as const).map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setPresenceFilter(statusKey)}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all duration-200 cursor-pointer whitespace-nowrap text-center ${
                    presenceFilter === statusKey
                      ? 'bg-red-800 text-white shadow-sm'
                      : 'text-stone-500 hover:text-stone-800 [.dark_&]:text-stone-400 [.dark_&]:hover:text-stone-200'
                  }`}
                >
                  {statusKey}
                </button>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-2 custom-scrollbar dark:[color-scheme:dark] [.dark_&]:[color-scheme:dark]">
              {modalPresenceList.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-400 font-medium">Tidak ada data anggota dengan status {presenceFilter}.</p>
                </div>
              ) : (
                modalPresenceList.map((teacher: any, idx: number) => {
                  const status = getTeacherAttendanceStatus(teacher);

                  return (
                    <div key={teacher.id || idx} className="p-3 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800/70 dark:bg-stone-800/70 border border-stone-200/80 [.dark_&]:border-stone-700/60 dark:border-stone-700/60 flex items-center justify-between gap-3 hover:border-red-800/40 dark:hover:border-amber-500/40 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 border border-red-200/80 [.dark_&]:border-red-800/50 dark:border-red-800/50 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-stone-900 [.dark_&]:text-stone-100 dark:text-stone-100">{teacher.name}</p>
                          <p className="text-[11px] text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400">{teacher.school}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                        status === 'Hadir' 
                          ? 'bg-emerald-100 text-emerald-700 [.dark_&]:bg-emerald-900/40 dark:bg-emerald-900/40 [.dark_&]:text-emerald-300 dark:text-emerald-300'
                          : status === 'Sakit' 
                          ? 'bg-amber-100 text-amber-700 [.dark_&]:bg-amber-900/40 dark:bg-amber-900/40 [.dark_&]:text-amber-300 dark:text-amber-300'
                          : status === 'Izin' 
                          ? 'bg-stone-200 text-stone-700 [.dark_&]:bg-stone-700 dark:bg-stone-700 [.dark_&]:text-stone-200 dark:text-stone-200'
                          : 'bg-red-100 text-red-700 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 [.dark_&]:text-red-300 dark:text-red-300'
                      }`}>
                        {status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={handleClosePresentModal}
                className="px-6 py-2.5 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-800 [.dark_&]:text-stone-200 dark:text-stone-200 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 font-bold text-xs uppercase tracking-wider hover:bg-stone-200 [.dark_&]:hover:bg-stone-700 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Daftar Anggota TIDAK AKTIF */}
      {isInactiveModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${isClosingInactiveModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 space-y-4 ${isClosingInactiveModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className="flex items-center justify-between border-b border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-red-700 [.dark_&]:text-red-400 dark:text-red-400">
                <div className="w-9 h-9 rounded-xl bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60 flex items-center justify-center font-bold">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-stone-900 [.dark_&]:text-stone-100 dark:text-stone-100">
                    Daftar Anggota Tidak Aktif
                  </h3>
                  <p className="text-xs text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400">
                    Total {inactiveTeachers.length} anggota dengan status Tidak Aktif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseInactiveModal}
                className="p-1.5 rounded-xl hover:bg-stone-100 [.dark_&]:hover:bg-stone-800 dark:hover:bg-stone-800 text-stone-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-2 custom-scrollbar dark:[color-scheme:dark] [.dark_&]:[color-scheme:dark]">
              {inactiveTeachers.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 [.dark_&]:bg-emerald-900/30 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-400 font-medium">Semua anggota saat ini berstatus Aktif!</p>
                </div>
              ) : (
                inactiveTeachers.map((teacher: any, idx: number) => (
                  <div key={teacher.id || idx} className="p-3 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800/70 dark:bg-stone-800/70 border border-stone-200/80 [.dark_&]:border-stone-700/60 dark:border-stone-700/60 flex items-center justify-between gap-3 hover:border-red-300/60 dark:hover:border-red-800/60 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 text-red-700 [.dark_&]:text-red-400 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-stone-900 [.dark_&]:text-stone-100 dark:text-stone-100">{teacher.name}</p>
                        <p className="text-[11px] text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400">{teacher.school}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 [.dark_&]:text-red-300 dark:text-red-300 border border-red-200 [.dark_&]:border-red-800/70">
                      Tidak Aktif
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseInactiveModal}
                className="px-6 py-2.5 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-800 [.dark_&]:text-stone-200 dark:text-stone-200 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 font-bold text-xs uppercase tracking-wider hover:bg-stone-200 [.dark_&]:hover:bg-stone-700 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Anggota Guru */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${isClosingModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 space-y-5 ${isClosingModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className="flex items-center justify-between border-b border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60 text-red-800 [.dark_&]:text-amber-400 dark:text-amber-400 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-stone-900 [.dark_&]:text-white dark:text-white">
                  {editingTeacher ? 'Edit Data Guru' : 'Tambah Anggota Guru Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl hover:bg-stone-100 [.dark_&]:hover:bg-stone-800 dark:hover:bg-stone-800 text-stone-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Adi Saiful Rizal, S.Pd"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    NIP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="199401162025211089"
                    className="w-full px-4 py-2.5 rounded-xl font-mono bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    NPA (11 Angka) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    minLength={11}
                    maxLength={11}
                    pattern="\d{11}"
                    title="NPA harus terdiri dari tepat 11 digit angka"
                    value={formData.npa || ''}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setFormData({ ...formData, npa: onlyDigits });
                    }}
                    placeholder="13301500431"
                    className="w-full px-4 py-2.5 rounded-xl font-mono bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Nama Panggilan
                  </label>
                  <input
                    type="text"
                    value={formData.nickname || ''}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="Rizal"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Jenis Kelamin (L/P)
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  >
                    <option value="" disabled>-- Pilih Jenis Kelamin --</option>
                    <option value="L" className="bg-white [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100">L (Laki-laki)</option>
                    <option value="P" className="bg-white [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100">P (Perempuan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="082292232649"
                    className="w-full px-4 py-2.5 rounded-xl font-mono bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Nama Sekolah
                  </label>
                  <select
                    value={formData.school || ''}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  >
                    <option value="" disabled>-- Pilih Sekolah --</option>
                    {dynamicSchoolsList.map((sch) => (
                      <option key={sch} value={sch} className="bg-white [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100">
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informasi Kepegawaian & Keanggotaan PGRI (Opsional) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Status Pegawai
                  </label>
                  <select
                    value={formData.employmentStatus || ''}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: (e.target.value || undefined) as Teacher['employmentStatus'] })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  >
                    <option value="">- Pilih -</option>
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="GTY">GTY</option>
                    <option value="GTT">GTT</option>
                    <option value="Tendik">Tendik</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Sertifikasi
                  </label>
                  <select
                    value={formData.certificationStatus || ''}
                    onChange={(e) => setFormData({ ...formData, certificationStatus: (e.target.value || undefined) as Teacher['certificationStatus'] })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  >
                    <option value="">- Pilih -</option>
                    <option value="Sudah Sertifikasi">Sudah</option>
                    <option value="Belum Sertifikasi">Belum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Status KTA
                  </label>
                  <select
                    value={formData.ktaStatus || 'Aktif'}
                    onChange={(e) => setFormData({ ...formData, ktaStatus: e.target.value as Teacher['ktaStatus'] })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Proses">Proses</option>
                    <option value="Belum Punya">Belum Punya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 mb-1">
                    Tahun Pensiun
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={formData.retirementYear || ''}
                    onChange={(e) => setFormData({ ...formData, retirementYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="2028"
                    className="w-full px-3 py-2.5 rounded-xl font-mono bg-[#faf8f5] [.dark_&]:bg-stone-800 dark:bg-stone-800 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 font-bold text-xs uppercase tracking-wider hover:bg-stone-200 [.dark_&]:hover:bg-stone-700 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Data */}
      {deleteTarget && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${isClosingDeleteModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 space-y-4 ${isClosingDeleteModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className="flex items-center gap-3 text-red-700 [.dark_&]:text-red-400 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-50 [.dark_&]:bg-red-950/70 dark:bg-red-950/70 border border-red-200 [.dark_&]:border-red-800/60 dark:border-red-800/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-stone-900 [.dark_&]:text-white dark:text-white">
                  Konfirmasi Hapus
                </h3>
                <p className="text-xs text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 [.dark_&]:text-stone-300 dark:text-stone-300">
              Apakah Anda yakin ingin menghapus data guru <span className="font-bold text-stone-900 [.dark_&]:text-white dark:text-white">{deleteTarget.name}</span>?
            </p>

            <div className="pt-3 border-t border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="px-5 py-2.5 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 font-bold text-xs uppercase tracking-wider hover:bg-stone-200 [.dark_&]:hover:bg-stone-700 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 stroke-[3]" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Persetujuan Import (Menimpa Data Lama) */}
      {pendingImportData && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${isClosingImportConfirmModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 space-y-4 ${isClosingImportConfirmModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className="flex items-center gap-3 text-amber-600 [.dark_&]:text-amber-400 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-100 [.dark_&]:bg-amber-900/40 dark:bg-amber-900/40 border border-amber-200 [.dark_&]:border-amber-800/60 dark:border-amber-800/60 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-stone-900 [.dark_&]:text-white dark:text-white">
                  Konfirmasi Timpa Data Anggota
                </h3>
                <p className="text-xs text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400">
                  Berkas: {pendingImportData.fileName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 [.dark_&]:bg-amber-950/30 dark:bg-amber-950/30 border border-amber-200/80 [.dark_&]:border-amber-800/50 dark:border-amber-800/50 space-y-1.5 text-xs sm:text-sm text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300">
              <p>
                Ditemukan <span className="font-bold text-emerald-700 [.dark_&]:text-emerald-400 dark:text-emerald-400">{pendingImportData.teachers.length} data anggota</span> di dalam berkas yang diunggah.
              </p>
              <p className="text-xs text-red-700 [.dark_&]:text-red-400 dark:text-red-400 font-semibold">
                Perhatian: Jika Anda menyetujui proses ini, seluruh {teachersList.length} data anggota yang ada saat ini akan dihapus dan digantikan (tertimpa) sepenuhnya oleh data baru tersebut.
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseImportConfirmModal}
                className="px-5 py-2.5 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-700 [.dark_&]:text-stone-300 dark:text-stone-300 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 font-bold text-xs uppercase tracking-wider hover:bg-stone-200 [.dark_&]:hover:bg-stone-700 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmImportOverwrite}
                className="px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Setuju & Timpa Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Peringatan Akses Ditolak / Informasi */}
      {warningModalMessage && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${isClosingWarningModal ? 'modal-backdrop-exit' : 'animate-backdrop-fade'}`}>
          <div className={`bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 space-y-4 text-center ${isClosingWarningModal ? 'modal-content-exit' : 'animate-modal-pop'}`}>
            <div className="w-16 h-16 rounded-2xl bg-amber-100 [.dark_&]:bg-amber-900/40 dark:bg-amber-900/40 border border-amber-200 [.dark_&]:border-amber-800/60 dark:border-amber-800/60 flex items-center justify-center mx-auto mb-2">
              <X className="w-8 h-8 text-amber-600 [.dark_&]:text-amber-400 dark:text-amber-400" />
            </div>
            
            <h3 className="font-display font-bold text-lg text-stone-900 [.dark_&]:text-white dark:text-white">
              Pemberitahuan
            </h3>
            
            <p className="text-sm text-stone-600 [.dark_&]:text-stone-300 dark:text-stone-300">
              {warningModalMessage}
            </p>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleCloseWarning}
                className="w-full px-6 py-3 rounded-xl bg-stone-100 [.dark_&]:bg-stone-800 dark:bg-stone-800 text-stone-800 [.dark_&]:text-stone-100 dark:text-stone-100 border border-stone-200 [.dark_&]:border-stone-700 dark:border-stone-700 font-bold text-sm uppercase tracking-wider hover:bg-stone-200 [.dark_&]:hover:bg-stone-700 dark:hover:bg-stone-700 transition-colors cursor-pointer"
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