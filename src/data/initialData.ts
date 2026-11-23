import { 
  Teacher, 
  Material, 
  ActivityEvent, 
  AttendanceRecord, 
  Announcement, 
  ForumPost, 
  GalleryItem, 
  DocumentItem,
  FinancialTransaction,
  CashPayment,
  Webinar
} from '../types';

export const INITIAL_WEBINARS: Webinar[] = [
  {
    id: 'w1',
    title: 'Penguatan Kode Etik Guru & Perlindungan Profesi PGRI (LKBH)',
    speaker: 'Pengurus PGRI Cabang Sumberbaru',
    date: '2025-05-20',
    time: '14.00 - 16.00 WIB',
    platform: 'Zoom',
    link: 'https://zoom.us/j/1234567890',
    description: 'Sosialisasi pemahaman kode etik guru Indonesia serta mekanisme pendampingan hukum dan profesi melalui LKBH PGRI.',
    status: 'Akan Datang'
  },
  {
    id: 'w2',
    title: 'Sosialisasi Kebijakan Kesejahteraan Guru PNS, PPPK, dan Honorer',
    speaker: 'Tim Advokasi PGRI Jember',
    date: '2025-05-25',
    time: '19.00 - 21.00 WIB',
    platform: 'Google Meet',
    link: 'https://meet.google.com/abc-defg-hij',
    description: 'Pembahasan regulasi terbaru tunjangan profesi, pengembangan karier, serta pendataan KTA Digital PGRI.',
    status: 'Akan Datang'
  }
];

export const INITIAL_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [
  { id: 'tx-1', date: '2026-08-15', type: 'Pemasukan', amount: 1540000, description: 'Dana Masuk Pada Pertemuan Bulan Agustus' },
  { id: 'tx-2', date: '2026-08-15', type: 'Pengeluaran', amount: 30000, description: 'Membeli ID Card Pengurus 6 Pcs' },
  { id: 'tx-3', date: '2026-08-15', type: 'Pengeluaran', amount: 110000, description: 'Membeli Roti 1 Dus' },
  { id: 'tx-4', date: '2026-08-15', type: 'Pengeluaran', amount: 48000, description: 'Membeli Air Minum Global 3 Dus' },
  { id: 'tx-5', date: '2026-08-15', type: 'Pengeluaran', amount: 9000, description: 'Membeli Air Mineral Aqua 3 Botol' },
  { id: 'tx-6', date: '2026-08-15', type: 'Pengeluaran', amount: 110000, description: 'Membeli Banner Pertemuan 1 Buah' },
  { id: 'tx-7', date: '2026-08-15', type: 'Pengeluaran', amount: 10000, description: 'Fotocopy Laporan Hasil Pertemuan' },
  { id: 'tx-8', date: '2026-08-15', type: 'Pengeluaran', amount: 100000, description: 'Jasa Kebersihan, Sound Dan Proyektor' },
  { id: 'tx-9', date: '2026-08-25', type: 'Pengeluaran', amount: 275000, description: 'Membeli ID Card Anggota 55 Pcs' },
  { id: 'tx-10', date: '2026-08-25', type: 'Pengeluaran', amount: 35000, description: 'Membeli Kertas Foto ID Card Anggota' },
  { id: 'tx-11', date: '2026-09-24', type: 'Pemasukan', amount: 1155000, description: 'Dana Masuk Pada Pertemuan Bulan September' },
];

export const INITIAL_CASH_PAYMENTS: CashPayment[] = [
  { teacherId: 't1', status: 'Lunas', datePaid: '2025-05-01' },
  { teacherId: 't2', status: 'Lunas', datePaid: '2025-05-02' },
  { teacherId: 't3', status: 'Lunas', datePaid: '2025-05-02' },
  { teacherId: 't4', status: 'Belum Bayar' },
];

export const INITIAL_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Siti Aminah, S.Pd.', nip: '19850412 201001 2 015', school: 'SDN Gelang 01', role: 'Ketua Ranting', avatar: '', phone: '0812-3456-7890', email: 'siti.aminah@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't2', name: 'Budi Santoso, S.Pd.', nip: '19880920 201202 1 008', school: 'SDN Gelang 03', role: 'Sekretaris', avatar: '', phone: '0813-9876-5432', email: 'budi.santoso@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't3', name: 'Rina Wijaya, S.Pd.SD', nip: '19910315 201503 2 004', school: 'SDN Gelang 03', role: 'Bendahara', avatar: '', phone: '0821-1122-3344', email: 'rina.wijaya@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't4', name: 'Ahmad Fauzi, S.Pd.', nip: '19870105 201101 1 003', school: 'SDN Gelang 04', role: 'Koord. Bidang Organisasi', avatar: '', phone: '0852-3344-5566', email: 'ahmad.fauzi@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't5', name: 'Dewi Kartika, S.Pd.', nip: '19931210 201903 2 011', school: 'SDN Gelang 05', role: 'Anggota Aktif', avatar: '', phone: '0819-8877-6655', email: 'dewi.kartika@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't6', name: 'Hendra Gunawan, S.Pd.', nip: '19890708 201402 1 005', school: 'SDN Gelang 06', role: 'Anggota Aktif', avatar: '', phone: '0812-9988-7711', email: 'hendra.g@guru.sd.belajar.id', subjectSpecialty: 'PJOK' },
  { id: 't7', name: 'Sri Utami, S.Pd.', nip: '19900214 201502 2 009', school: 'SDN Gelang 07', role: 'Anggota Aktif', avatar: '', phone: '0813-5566-7788', email: 'sri.utami@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't8', name: 'Eko Prasetyo, S.Pd.', nip: '19861118 201001 1 009', school: 'SDN Kaliglagah 02', role: 'Anggota Aktif', avatar: '', phone: '0857-1122-3399', email: 'eko.prasetyo@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't9', name: 'Nurul Hidayah, S.Pd.I', nip: '19920501 201701 2 006', school: 'SDN Gelang 01', role: 'Anggota Aktif', avatar: '', phone: '0812-4455-6677', email: 'nurul.hidayah@guru.sd.belajar.id', subjectSpecialty: 'PAI' },
  { id: 't10', name: 'Bambang Hermanto, S.Pd.', nip: '19840822 200902 1 004', school: 'SDN Gelang 04', role: 'Anggota Aktif', avatar: '', phone: '0813-2233-4455', email: 'bambang.h@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't11', name: 'Fitriani, S.Pd.', nip: '19940612 202012 2 018', school: 'SD NU 21 Miftahul Ulum', role: 'Anggota Aktif', avatar: '', phone: '0852-6677-8899', email: 'fitriani@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't12', name: 'Dedi Kurniawan, S.Pd.', nip: '19880330 201201 1 002', school: 'SDN Gelang 05', role: 'Anggota Aktif', avatar: '', phone: '0812-7788-9900', email: 'dedi.kurniawan@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't13', name: 'Lilik Rahmawati, S.Pd.', nip: '19910804 201602 2 003', school: 'SDN Gelang 06', role: 'Anggota Aktif', avatar: '', phone: '0822-3344-5566', email: 'lilik.r@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't14', name: 'Agus Setiawan, S.Pd.', nip: '19860210 201102 1 007', school: 'SDN Gelang 07', role: 'Anggota Aktif', avatar: '', phone: '0813-8899-0011', email: 'agus.setiawan@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't15', name: 'Maya Indah, S.Pd.', nip: '19950125 202203 2 012', school: 'SDN Kaliglagah 02', role: 'Anggota Aktif', avatar: '', phone: '0857-4455-6677', email: 'maya.indah@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't16', name: 'Hardi Supriyadi, S.Pd.', nip: '19830911 200801 1 001', school: 'SDN Gelang 01', role: 'Anggota Aktif', avatar: '', phone: '0812-1133-5577', email: 'hardi.s@guru.sd.belajar.id', subjectSpecialty: 'PJOK' },
  { id: 't17', name: 'Anisa Maharani, S.Pd.', nip: '19930418 201802 2 010', school: 'SDN Gelang 03', role: 'Anggota Aktif', avatar: '', phone: '0819-2244-6688', email: 'anisa.m@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't18', name: 'Tri Wahyudi, S.Pd.', nip: '19870505 201101 1 004', school: 'SDN Gelang 04', role: 'Anggota Aktif', avatar: '', phone: '0813-3355-7799', email: 'tri.wahyudi@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't19', name: 'Yulia Kusumawati, S.Pd.', nip: '19901122 201601 2 007', school: 'SDN Gelang 05', role: 'Anggota Aktif', avatar: '', phone: '0852-5577-9911', email: 'yulia.k@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't20', name: 'Sugeng Riyadi, S.Pd.', nip: '19851230 200903 1 002', school: 'SDN Gelang 04', role: 'Anggota Aktif', avatar: '', phone: '0812-6688-0022', email: 'sugeng.r@guru.sd.belajar.id', subjectSpecialty: 'PAI' },
  { id: 't21', name: 'Titin Sumarni, S.Pd.', nip: '19920208 201702 2 014', school: 'SDN Gelang 06', role: 'Anggota Aktif', avatar: '', phone: '0813-7799-1133', email: 'titin.s@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't22', name: 'Rahmat Hidayat, S.Pd.', nip: '19881015 201301 1 006', school: 'SDN Gelang 07', role: 'Anggota Aktif', avatar: '', phone: '0857-8800-2244', email: 'rahmat.h@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't23', name: 'Dwi Lestari, S.Pd.', nip: '19940321 202102 2 005', school: 'SDN Kaliglagah 02', role: 'Anggota Aktif', avatar: '', phone: '0812-9911-3355', email: 'dwi.lestari@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't24', name: 'Joko Susilo, S.Pd.', nip: '19860614 201002 1 003', school: 'SD NU 21 Miftahul Ulum', role: 'Anggota Aktif', avatar: '', phone: '0813-1133-5577', email: 'joko.s@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't25', name: 'Neni Triana, S.Pd.', nip: '19910909 201503 2 016', school: 'SDN Gelang 01', role: 'Anggota Aktif', avatar: '', phone: '0852-2244-6688', email: 'neni.t@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't26', name: 'Aris Munandar, S.Pd.', nip: '19891201 201401 1 008', school: 'SDN Gelang 03', role: 'Anggota Aktif', avatar: '', phone: '0812-3355-7799', email: 'aris.m@guru.sd.belajar.id', subjectSpecialty: 'PJOK' },
  { id: 't27', name: 'Ratna Dewi, S.Pd.', nip: '19930717 201901 2 013', school: 'SDN Gelang 03', role: 'Anggota Aktif', avatar: '', phone: '0813-4466-8800', email: 'ratna.dewi@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
  { id: 't28', name: 'Surya Pratama, S.Pd.', nip: '19870428 201103 1 005', school: 'SDN Gelang 05', role: 'Anggota Aktif', avatar: '', phone: '0857-5577-9911', email: 'surya.p@guru.sd.belajar.id', subjectSpecialty: 'Guru Kelas' },
];

export const INITIAL_MATERIALS: Material[] = [
  {
    id: 'm1',
    title: 'Pedoman AD/ART Persatuan Guru Republik Indonesia (PGRI)',
    subject: 'AD/ART & Organisasi PGRI',
    category: 'Pedoman PGRI',
    description: 'Dokumen resmi Anggaran Dasar dan Anggaran Rumah Tangga PGRI sebagai acuan tata kelola pengurus ranting dan cabang.',
    author: 'Pengurus PGRI Ranting Gelang',
    school: 'SDN Gelang 01',
    date: '10 Mei 2025',
    fileSize: '3.4 MB',
    fileType: 'pdf',
    downloadCount: 142,
    driveUrl: 'https://drive.google.com'
  },
  {
    id: 'm2',
    title: 'Surat Edaran Pendataan KTA Digital PGRI Kecamatan Sumberbaru',
    subject: 'Edaran Cabang/Kabupaten',
    category: 'SK & Edaran Resmi',
    description: 'Panduan pemutakhiran data NPA, NIP, dan status kepegawaian anggota PGRI pada portal KTA Digital.',
    author: 'Sekretariat PGRI Gelang',
    school: 'SDN Gelang 03',
    date: '8 Mei 2025',
    fileSize: '1.8 MB',
    fileType: 'pdf',
    downloadCount: 98,
    driveUrl: 'https://drive.google.com'
  },
  {
    id: 'm3',
    title: 'Materi Sosialisasi Perlindungan Hukum & Kode Etik Guru (LKBH PGRI)',
    subject: 'Advokasi & LKBH',
    category: 'Materi Pembinaan',
    description: 'Paparan mekanisme pendampingan profesi, pencegahan sengketa pembelajaran, serta layanan bantuan hukum guru.',
    author: 'Bidang Advokasi PGRI',
    school: 'SDN Gelang 04',
    date: '5 Mei 2025',
    fileSize: '5.2 MB',
    fileType: 'ppt',
    downloadCount: 115,
    driveUrl: 'https://drive.google.com'
  },
  {
    id: 'm4',
    title: 'Panduan Pengusulan Kenaikan Pangkat & Kinerja Guru ASN/PPPK',
    subject: 'Pengembangan Profesi',
    category: 'Materi Pembinaan',
    description: 'Alur pemberkasan usulan kenaikan pangkat, SKP tahunan, serta dokumen penunjang karier guru di Kecamatan Sumberbaru.',
    author: 'Tim Pengembangan Profesi',
    school: 'SDN Gelang 05',
    date: '3 Mei 2025',
    fileSize: '2.9 MB',
    fileType: 'doc',
    downloadCount: 87,
    driveUrl: 'https://drive.google.com'
  }
];

export const INITIAL_EVENTS: ActivityEvent[] = [
  {
    id: 'e-2026-09-24',
    title: 'Rapat Koordinasi & Konsolidasi Anggota PGRI Ranting Gelang',
    date: '24 SEP',
    fullDate: 'Kamis, 24 September 2026',
    time: '10.00 WIB - 12.00 WIB',
    location: 'Gedung Serbaguna (GSG) Sumberbaru',
    category: 'Rapat',
    categoryColor: 'purple',
    description: 'Pelaporan Keuangan Organisasi, Pendataan KTA PGRI & Evaluasi Program Kerja',
    presenters: [
      'Hanifatul Susmiyah, S.Pd',
      'Christian Dri Firman Widodo, S.Pd',
      'Risky Firmansyah, S.Pd',
      'Adi Saiful Rizal, S.Pd'
    ],
    attendanceOpen: true,
    uploadDeadline: '01/10/2026'
  },
  {
    id: 'e-2026-08-15',
    title: 'Sosialisasi Program Kerja PGRI Ranting Gelang',
    date: '15 AGU',
    fullDate: 'Sabtu, 15 Agustus 2026',
    time: '09.00 - 11.45',
    location: 'Gedung Serba Guna (GSG) Kecamatan Sumberbaru',
    category: 'Diskusi',
    categoryColor: 'green',
    description: 'Rencana Anggaran Organisasi • Pembagian Seksi Kerja • Panduan Portal Digital PGRI',
    presenters: [
      'Lukman Hadi, S.Pd',
      'Christian Dri Firman Widodo, S.Pd',
      'Risky Firmansyah, S.Pd',
      'Siska Wahyu Purwati, S.Pd',
      'Ninik Dwi Sunanti, S.Pd',
      'Adi Saiful Rizal, S.Pd'
    ],
    attendanceOpen: true,
    uploadDeadline: '31/08/2026'
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    eventId: 'e-2026-08-15',
    eventTitle: 'Sosialisasi Program Kerja PGRI Ranting Gelang',
    teacherId: 't1',
    teacherName: 'Siti Aminah, S.Pd.',
    nip: '19850412 201001 2 015',
    school: 'SDN Gelang 01',
    status: 'Hadir',
    timestamp: '15 Agu 2026 08:50 WIB',
    notes: 'Pengurus PGRI Ranting Gelang'
  },
  {
    id: 'att-2',
    eventId: 'e-2026-08-15',
    eventTitle: 'Sosialisasi Program Kerja PGRI Ranting Gelang',
    teacherId: 't2',
    teacherName: 'Budi Santoso, S.Pd.',
    nip: '19880920 201202 1 008',
    school: 'SDN Gelang 03',
    status: 'Hadir',
    timestamp: '15 Agu 2026 08:55 WIB',
    notes: 'Hadir tepat waktu'
  },
  {
    id: 'att-3',
    eventId: 'e-2026-08-15',
    eventTitle: 'Sosialisasi Program Kerja PGRI Ranting Gelang',
    teacherId: 't3',
    teacherName: 'Rina Wijaya, S.Pd.SD',
    nip: '19910315 201503 2 004',
    school: 'SDN Gelang 03',
    status: 'Hadir',
    timestamp: '15 Agu 2026 09:02 WIB',
    notes: 'Hadir lengkap'
  },
  {
    id: 'att-4',
    eventId: 'e-2026-08-15',
    eventTitle: 'Sosialisasi Program Kerja PGRI Ranting Gelang',
    teacherId: 't5',
    teacherName: 'Dewi Kartika, S.Pd.',
    nip: '19931210 201903 2 011',
    school: 'SDN Gelang 05',
    status: 'Izin',
    timestamp: '15 Agu 2026 08:30 WIB',
    notes: 'Mendampingi kegiatan lomba tingkat kecamatan'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Pemutakhiran Data KTA Digital & NPA Anggota PGRI',
    description: 'Seluruh anggota PGRI Ranting Gelang dimohon melengkapi data NPA, unit sekolah, dan status kepegawaian pada menu Daftar Anggota.',
    date: '9 Mei 2025',
    author: 'Pengurus PGRI Ranting Gelang',
    iconType: 'people',
    isImportant: true
  },
  {
    id: 'a2',
    title: 'Laporan Transparansi Kas & Dana Sosial PGRI Tersedia',
    description: 'Rekapitulasi pemasukan, pengeluaran, serta laporan penyaluran dana sosial dapat diakses secara terbuka pada menu Catatan Keuangan dan Sosial & Aspirasi.',
    date: '8 Mei 2025',
    author: 'Bendahara Ranting',
    iconType: 'folder'
  },
  {
    id: 'a3',
    title: 'Rapat Koordinasi Pengurus & Anggota Ranting Gelang',
    description: 'Rapat rutin PGRI Ranting Gelang akan dilaksanakan sesuai agenda terjadwal. Dimohon kehadiran perwakilan setiap unit sekolah binaan.',
    date: '7 Mei 2025',
    author: 'Sekretariat Ranting',
    iconType: 'star'
  }
];

export const INITIAL_FORUM_POSTS: ForumPost[] = [
  {
    id: 'fp1',
    title: 'Mekanisme Pengajuan Pembaruan Data KTA PGRI bagi Guru PPPK',
    content: 'Bapak/Ibu rekan pengurus, bagi guru PPPK yang baru menerima SK penempatan di wilayah Gelang, dokumen apa saja yang perlu disiapkan untuk sinkronisasi KTA Digital PGRI?',
    author: 'Siti Aminah, S.Pd.',
    school: 'SDN Gelang 01',
    avatar: '',
    date: '9 Mei 2025',
    tag: 'PPPK & Kepegawaian',
    likes: 12,
    isSolved: true,
    replies: [
      {
        id: 'fr1',
        author: 'Budi Santoso, S.Pd.',
        school: 'SDN Gelang 03',
        avatar: '',
        content: 'Cukup menyiapkan SK Pengangkatan PPPK, pas foto berseragam batik PGRI, dan surat keterangan aktif dari kepala sekolah untuk diverifikasi sekretariat ranting.',
        date: '9 Mei 2025',
        likes: 8
      }
    ]
  },
  {
    id: 'fp2',
    title: 'Persiapan Peringatan Hari Guru Nasional (HGN) & HUT PGRI Tingkat Cabang',
    content: 'Mari kita koordinasikan perwakilan kontingen lomba olahraga, seni, serta upacara HGN untuk PGRI Ranting Gelang tahun ini.',
    author: 'Ahmad Fauzi, S.Pd.',
    school: 'SDN Gelang 04',
    avatar: '',
    date: '8 Mei 2025',
    tag: 'Organisasi PGRI',
    likes: 9,
    replies: [
      {
        id: 'fr3',
        author: 'Dewi Kartika, S.Pd.',
        school: 'SDN Gelang 05',
        avatar: '',
        content: 'Siap mendukung, rincian cabang lomba dan jadwal latihan bersama dapat kita matangkan pada rapat ranting berikutnya.',
        date: '8 Mei 2025',
        likes: 6
      }
    ]
  }
];

export const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'g1',
    title: 'Rapat Koordinasi Pengurus PGRI Ranting Gelang',
    category: 'Kegiatan',
    date: '28 April 2025',
    imageUrl: '',
    description: 'Koordinasi program kerja tahunan serta konsolidasi pengurus PGRI Ranting Gelang Kecamatan Sumberbaru.'
  },
  {
    id: 'g2',
    title: 'Penyerahan Tali Asih Purna Tugas & Anggota Sakit',
    category: 'Pendampingan',
    date: '15 April 2025',
    imageUrl: '',
    description: 'Wujud solidaritas dan kepedulian sosial keluarga besar PGRI Ranting Gelang.'
  },
  {
    id: 'g3',
    title: 'Semarak HUT PGRI & Hari Guru Nasional Sumberbaru',
    category: 'Lomba',
    date: '25 November 2025',
    imageUrl: '',
    description: 'Partisipasi aktif anggota PGRI Ranting Gelang dalam kegiatan peringatan HUT PGRI.'
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'd1',
    title: 'SK Pengurus PGRI Ranting Gelang Kecamatan Sumberbaru Masa Bakti 2025-2030',
    category: 'SK Kombel',
    fileSize: '1.4 MB',
    fileType: 'PDF',
    date: '15 Jan 2025',
    downloadUrl: '#'
  },
  {
    id: 'd2',
    title: 'Format Rekapitulasi Kehadiran & Notulen Rapat Organisasi PGRI',
    category: 'Jurnal Kegiatan',
    fileSize: '850 KB',
    fileType: 'DOCX',
    date: '2 Feb 2025',
    downloadUrl: '#'
  },
  {
    id: 'd3',
    title: 'Materi Pembinaan Kode Etik Guru & Perlindungan Profesi PGRI',
    category: 'Materi Workshop',
    fileSize: '4.2 MB',
    fileType: 'PDF',
    date: '24 Apr 2025',
    downloadUrl: '#'
  }
];
