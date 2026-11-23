export type ActiveTab = 
  | 'beranda' 
  | 'profil' 
  | 'anggota' 
  | 'jadwal' 
  | 'keuangan' 
  | 'galeri' 
  | 'dokumen' 
  | 'undangan'
  | 'proker'
  | 'sosial'
  | 'pengaturan'
  | 'kontak';

export type PengaturanSubTab = 'logo' | 'pengurus' | 'organisasi' | 'hak-akses' | 'data';

export type PengurusRole = 'guru' | 'ketua' | 'sekretaris' | 'bendahara' | 'seksi';

export interface PengurusAssignment {
  email: string;
  name: string;
  role: PengurusRole;
  positionLabel?: string;
  assignedBy?: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  module: string;
  action: string;
  summary: string;
  timestamp: string;
}

export interface OrgConfig {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bendaharaWa: string;
  monthlyDuesAmount: number;
  schools: string[];
  kopOrganisasi: string;
  kopRanting: string;
  kopWilayah: string;
  kopSekretariat: string;
  letterCodePrefix: string;
  qrisImage?: string;
}

export interface Teacher {
  id: string;
  name: string;
  nickname?: string;
  gender?: 'L' | 'P';
  nip?: string;
  npa?: string;
  school: string;
  role: string;
  avatar: string;
  phone: string;
  email: string;
  subjectSpecialty?: string;
  employmentStatus?: 'PNS' | 'PPPK' | 'GTY' | 'GTT' | 'Tendik';
  certificationStatus?: 'Sudah Sertifikasi' | 'Belum Sertifikasi';
  retirementYear?: string;
  ktaStatus?: 'Aktif' | 'Proses' | 'Belum Punya';
}

export interface Material {
  id: string;
  title: string;
  subject:
    | 'IPAS'
    | 'Bahasa Indonesia'
    | 'Matematika'
    | 'Seni Budaya'
    | 'PJOK'
    | 'Agama'
    | 'Pancasila'
    | 'AD/ART & Organisasi PGRI'
    | 'Edaran Cabang/Kabupaten'
    | 'Advokasi & LKBH'
    | 'Pengembangan Profesi';
  category:
    | 'Modul Ajar'
    | 'LKPD'
    | 'RPP'
    | 'Media Pembelajaran'
    | 'Soal Evaluasi'
    | 'Pedoman PGRI'
    | 'SK & Edaran Resmi'
    | 'Materi Pembinaan';
  description: string;
  author: string;
  school: string;
  date: string;
  fileSize: string;
  fileType: 'pdf' | 'doc' | 'ppt' | 'zip';
  downloadCount: number;
  driveUrl?: string;
}

export interface ActivityEvent {
  id: string;
  title: string;
  date: string; // e.g. "12 MEI" or "2025-05-12"
  fullDate: string; // e.g. "Senin, 12 Mei 2025"
  time: string; // e.g. "08.00 - 10.00 WIB"
  location: string;
  category: 'Pertemuan Rutin' | 'Belajar Bersama' | 'Diskusi' | 'Berbagi' | 'Rapat' | 'Workshop' | 'Apel' | 'Upacara' | 'Sosialisasi';
  categoryColor: string; // e.g. 'purple', 'green', 'blue'
  description: string;
  presenters?: string[];
  attendanceOpen: boolean;
  uploadDeadline?: string;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  teacherId?: string;
  teacherName: string;
  nip?: string;
  school: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Tugas Luar' | 'Verifikasi' | 'Alpha';
  timestamp: string;
  notes?: string;
  signature?: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  author: string;
  iconType: 'leaf' | 'folder' | 'people' | 'star';
  isImportant?: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  school: string;
  avatar: string;
  date: string;
  tag:
    | 'Kurikulum Merdeka'
    | 'IPAS'
    | 'Modul Ajar'
    | 'Asesmen'
    | 'Organisasi PGRI'
    | 'PPPK & Kepegawaian'
    | 'Advokasi & Kesejahteraan'
    | 'Umum';
  likes: number;
  replies: ForumReply[];
  isSolved?: boolean;
}

export interface ForumReply {
  id: string;
  author: string;
  school: string;
  avatar: string;
  content: string;
  date: string;
  likes: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Kegiatan' | 'Pendampingan' | 'Workshop' | 'Lomba';
  date: string;
  imageUrl: string;
  description: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'Perangkat Ajar' | 'SK Kombel' | 'Jurnal Kegiatan' | 'Materi Workshop';
  fileSize: string;
  fileType: string;
  date: string;
  downloadUrl: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran';
  amount: number;
  description: string;
  category?: string;
  receiptImage?: string;
}

export interface Webinar {
  id: string;
  title: string;
  speaker: string;
  date: string;
  time: string;
  platform: 'Zoom' | 'Google Meet' | 'YouTube Live' | 'Lainnya';
  link: string;
  description: string;
  status: 'Akan Datang' | 'Selesai';
}

export interface CashPayment {
  teacherId: string;
  status: 'Lunas' | 'Belum Bayar';
  datePaid?: string;
}

export interface ProkerItem {
  id: string;
  title: string;
  seksi: string;
  penanggungJawab: string;
  periode: string;
  targetDate: string;
  budget: number;
  status: 'Direncanakan' | 'Berjalan' | 'Terlaksana';
  progress: number;
  description: string;
  documentationUrl?: string;
  updatedAt: string;
}

export interface DanaSosialItem {
  id: string;
  type: 'Penggalangan' | 'Penyaluran';
  category: 'Sakit / Rawat Inap' | 'Duka Cita' | 'Purna Tugas / Pensiun' | 'Pernikahan / Kelahiran' | 'Bencana / Lainnya';
  recipientName: string;
  recipientSchool: string;
  amount: number;
  date: string;
  notes: string;
  status: 'Terkumpul' | 'Tersalurkan' | 'Proses';
}

export interface AspirasiItem {
  id: string;
  authorUid: string;
  senderName: string;
  senderSchool: string;
  senderPhone?: string;
  isAnonymous: boolean;
  category: 'Aspirasi Organisasi' | 'Advokasi / LKBH' | 'Administrasi PPPK/PNS' | 'Kesejahteraan & Tunjangan' | 'Lainnya';
  subject: string;
  message: string;
  status: 'Diterima' | 'Ditindaklanjuti' | 'Selesai';
  response?: string;
  createdAt: string;
}

export interface SuratAgendaItem {
  id: string;
  direction: 'Masuk' | 'Keluar';
  nomorSurat: string;
  tanggalSurat: string;
  asalTujuan: string;
  perihal: string;
  lampiranUrl?: string;
  catatan?: string;
}

export interface NotulenItem {
  id: string;
  eventId?: string;
  eventTitle: string;
  tanggal: string;
  waktu: string;
  tempat: string;
  pimpinanRapat: string;
  notulis: string;
  jumlahHadir: number;
  agenda: string;
  keputusan: string;
  tindakLanjut: string;
  updatedAt: string;
}
