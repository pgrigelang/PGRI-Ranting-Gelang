import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Eye,
  Plus,
  Trash2,
  Users,
  Check,
  RefreshCw,
  Save,
  Copy,
  Edit3,
  Printer,
  Lock,
  Search,
  ChevronDown,
  ChevronUp,
  Archive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  FileCheck2,
  BookOpen,
  ClipboardList,
  Hash,
  ExternalLink,
  Calendar,
  MapPin
} from 'lucide-react';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import {
  mutateCloudCollection,
  syncFromFirebase,
  savePerDocItem,
  deletePerDocItem,
  syncSettingsToCloud,
  fetchCloudVersions,
  shouldFetchByVersion,
  markLocalVersionSynced
} from '../../lib/sync';
import { logAuditEvent } from '../../lib/auth';
import { safeDownloadBlob } from '../../lib/download';
import { ActivityEvent, AttendanceRecord, NotulenItem, SuratAgendaItem, Teacher } from '../../types';
import { getOrgConfig, openWhatsAppShare } from '../../lib/orgConfig';

interface BuatUndanganProps {
  activeRole?: 'guru' | 'admin';
  teachers?: Teacher[];
  events?: ActivityEvent[];
  attendanceList?: AttendanceRecord[];
  theme?: 'light' | 'dark';
}

export interface InvitationParticipant {
  id: string;
  name: string;
  school: string;
  teacherId?: string;
}

export interface InvitationData {
  id: string;
  title: string; // Judul internal arsip
  updatedAt: string;
  // Kop Surat
  kopOrganisasi: string;
  kopSubOrganisasi: string;
  kopRanting: string;
  kopWilayah: string;
  kopSekretariat: string;
  // Metadata Surat
  nomorSurat: string;
  lampiranText: string;
  perihal: string;
  tanggalSurat: string;
  kepadaList: string[];
  diTempat: string;
  // Isi Surat
  salamPembuka: string;
  paragrafPembuka: string;
  hari: string;
  tanggalAcara: string;
  pukul: string;
  tempatAcara: string;
  acara: string;
  paragrafPenutup: string;
  salamPenutup: string;
  // Penandatangan
  ketuaJabatan: string;
  ketuaSubJabatan: string;
  ketuaNama: string;
  ketuaNpa: string;
  sekretarisJabatan: string;
  sekretarisSubJabatan: string;
  sekretarisNama: string;
  sekretarisNpa: string;
  // Tembusan
  tembusanHeader: string;
  tembusanList: string[];
  // Opsi Visual
  showStempel: boolean;
  showTtdImages: boolean;
  // Halaman 2 Lampiran
  includeLampiran: boolean;
  lampiranJudul1: string;
  lampiranJudul2: string;
  kolomKiriLabel: string;
  kolomKananLabel: string;
  subKolom1Label: string;
  subKolom2Label: string;
  timPutra: InvitationParticipant[];
  timPutri: InvitationParticipant[];
  lampiranTanggal: string;
  lampiranPenandatanganJabatan: string;
}

interface OrgAssets {
  logoPgri: string | null;
  ttdKetua: string | null;
  ttdKetuaSize: number;
  ttdSekretaris: string | null;
  ttdSekretarisSize: number;
  logoStempel: string | null;
  stempelRotation: number;
  stempelSize: number;
}

const DEFAULT_KETUA_NAMA = 'UMAR ALI KUSUMA';
const DEFAULT_KETUA_NPA = '13301500431';
const DEFAULT_SEKRETARIS_NAMA = 'ADI SAIFUL RIZAL, S.Pd';
const DEFAULT_SEKRETARIS_NPA = '13301500081';

const NPA_STORAGE_KEY = 'kombel-undangan-npa';
const INVITATIONS_STORAGE_KEY = 'kombel-invitations';

const loadSavedNpa = (): { ketuaNpa: string; sekretarisNpa: string } => {
  try {
    const raw = localStorage.getItem(NPA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ketuaNpa: parsed.ketuaNpa || DEFAULT_KETUA_NPA,
        sekretarisNpa: parsed.sekretarisNpa || DEFAULT_SEKRETARIS_NPA
      };
    }
  } catch {}
  return {
    ketuaNpa: DEFAULT_KETUA_NPA,
    sekretarisNpa: DEFAULT_SEKRETARIS_NPA
  };
};

const readSignersFromKepengurusan = (): {
  ketuaNama: string;
  sekretarisNama: string;
} => {
  let ketuaNama = DEFAULT_KETUA_NAMA;
  let sekretarisNama = DEFAULT_SEKRETARIS_NAMA;
  try {
    const raw = localStorage.getItem('kombel-pengurus');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const ketuaObj = list.find((p: any) => {
          const r = String(p?.role || '').toLowerCase();
          return r.includes('ketua') && !r.includes('wakil');
        });
        const sekObj = list.find((p: any) => {
          const r = String(p?.role || '').toLowerCase();
          return r.includes('sekretaris');
        });
        if (ketuaObj?.name && ketuaObj.name !== '-') {
          ketuaNama = String(ketuaObj.name).toUpperCase();
        }
        if (sekObj?.name && sekObj.name !== '-') {
          sekretarisNama = String(sekObj.name).toUpperCase();
        }
      }
    }
  } catch {}
  return { ketuaNama, sekretarisNama };
};

const readAssetsFromSettings = (): OrgAssets => {
  const safeNum = (key: string, def: number) => {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) {
        const n = Number(v);
        if (!isNaN(n)) return n;
      }
    } catch {}
    return def;
  };
  return {
    logoPgri:
      typeof window !== 'undefined'
        ? localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel')
        : null,
    ttdKetua: typeof window !== 'undefined' ? localStorage.getItem('ttd-ketua') : null,
    ttdKetuaSize: safeNum('ttd-ketua-size', 100),
    ttdSekretaris: typeof window !== 'undefined' ? localStorage.getItem('ttd-sekretaris') : null,
    ttdSekretarisSize: safeNum('ttd-sekretaris-size', 100),
    logoStempel: typeof window !== 'undefined' ? localStorage.getItem('logo-stempel') : null,
    stempelRotation: safeNum('logo-stempel-rotation', 0),
    stempelSize: safeNum('logo-stempel-size', 100)
  };
};

const createInitialDraft = (teachers: Teacher[] = []): InvitationData => {
  const signers = readSignersFromKepengurusan();
  const savedNpa = loadSavedNpa();

  const maleDefaults: InvitationParticipant[] = teachers
    .filter((t) => t.gender === 'L')
    .slice(0, 11)
    .map((t) => ({
      id: `p-${t.id}`,
      teacherId: t.id,
      name: t.name,
      school: t.school
    }));

  const femaleDefaults: InvitationParticipant[] = teachers
    .filter((t) => t.gender === 'P')
    .slice(0, 8)
    .map((t) => ({
      id: `w-${t.id}`,
      teacherId: t.id,
      name: t.name,
      school: t.school
    }));

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const orgCfg = getOrgConfig();
  return {
    id: `inv-${Date.now()}`,
    title: 'Undangan Kegiatan PGRI Ranting Gelang',
    updatedAt: new Date().toISOString(),
    kopOrganisasi: orgCfg.kopOrganisasi || 'PERSATUAN GURU REPUBLIK INDONESIA',
    kopSubOrganisasi: '(Teachers Association Of Republic Indonesia)',
    kopRanting: orgCfg.kopRanting || 'RANTING GELANG',
    kopWilayah: orgCfg.kopWilayah || 'KECAMATAN SUMBERBARU - KABUPATEN JEMBER',
    kopSekretariat: orgCfg.kopSekretariat || 'Sekretariat : Jl. PTPN XII Gunung Gambir Desa Gelang, Kecamatan Sumberbaru - Kabupaten Jember 68156',
    nomorSurat: buildAutoLetterNumber('Und', 0),
    lampiranText: '-',
    perihal: 'Undangan',
    tanggalSurat: `Jember, ${todayFormatted}`,
    kepadaList: [
      'Kepala SD Negeri / Swasta',
      'Pengurus PGRI Ranting Gelang',
      'Anggota PGRI Ranting Gelang'
    ],
    diTempat: 'di Tempat',
    salamPembuka: 'Assalamu’alaikum Wr. Wb.',
    paragrafPembuka:
      'Sehubungan dengan akan dilaksanakannya peringatan **Hari Guru Nasional (HGN) 2026** Kecamatan Sumberbaru, kami mengundang seluruh Kepala Sekolah, Pengurus PGRI Ranting, dan Anggota PGRI Ranting (data terlampir) untuk menghadiri dan memeriahkan kegiatan yang akan dilaksanakan pada :',
    hari: 'Selasa',
    tanggalAcara: todayFormatted,
    pukul: '07.00 WIB - Selesai',
    tempatAcara: 'SDN Rowotengah 03',
    acara: 'Membawa Laptop Full Baterai',
    paragrafPenutup:
      'Demikian undangan ini kami buat, atas perhatian serta kerjasamanya kami sampaikan terimakasih.',
    salamPenutup: 'Wassalamu’alaikum Wr. Wb.',
    ketuaJabatan: 'Ketua',
    ketuaSubJabatan: 'PGRI Ranting Gelang',
    ketuaNama: signers.ketuaNama,
    ketuaNpa: savedNpa.ketuaNpa,
    sekretarisJabatan: 'Sekretaris',
    sekretarisSubJabatan: 'PGRI Ranting Gelang',
    sekretarisNama: signers.sekretarisNama,
    sekretarisNpa: savedNpa.sekretarisNpa,
    tembusanHeader: 'Tembusan disampaikan kepada :',
    tembusanList: [
      'Pengawas Bina',
      'Ketua K3S Sumberbaru',
      'Ketua PGRI Cabang Sumberbaru',
      'Arsip'
    ],
    showStempel: true,
    showTtdImages: true,
    includeLampiran: false,
    lampiranJudul1: 'Pemain Bola Voli',
    lampiranJudul2: 'PGRI Ranting Gelang',
    kolomKiriLabel: 'Tim Putra',
    kolomKananLabel: 'Tim Putri',
    subKolom1Label: 'Nama',
    subKolom2Label: 'Lembaga',
    timPutra: maleDefaults,
    timPutri: femaleDefaults,
    lampiranTanggal: `Sumberbaru, ${todayFormatted}`,
    lampiranPenandatanganJabatan: 'Ketua PGRI Ranting Gelang'
  };
};

const escapeHtml = (unsafe: string): string => {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Mendukung format **teks tebal** dengan aman setelah HTML di-escape
const formatRichInlineText = (raw: string): string => {
  const escaped = escapeHtml(raw);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />');
};

const buildKopSuratHtml = (data: InvitationData, assets: OrgAssets): string => {
  const logoHtml = assets.logoPgri
    ? `<img src="${assets.logoPgri}" alt="Logo PGRI" style="width: 92px; height: 92px; object-fit: contain; display: block;" />`
    : `<div style="width: 92px; height: 92px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #64748b; text-align: center;">Logo<br/>PGRI</div>`;

  return `
    <div style="display: flex; align-items: center; gap: 14px; padding-bottom: 6px; position: relative; z-index: 2;">
      <div style="width: 94px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
        ${logoHtml}
      </div>
      <div style="flex: 1; text-align: center; line-height: 1.18; color: #000000; padding-left: 8px;">
        <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">
          ${escapeHtml(data.kopOrganisasi)}
        </div>
        <div style="font-size: 10.5pt; font-weight: bold; font-style: italic; margin-top: 1px;">
          ${escapeHtml(data.kopSubOrganisasi)}
        </div>
        <div style="font-size: 16.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px;">
          ${escapeHtml(data.kopRanting)}
        </div>
        <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px;">
          ${escapeHtml(data.kopWilayah)}
        </div>
        <div style="font-size: 8.5pt; font-style: italic; margin-top: 2px;">
          ${escapeHtml(data.kopSekretariat)}
        </div>
      </div>
    </div>
    <div style="border-top: 2px solid #000000; border-bottom: 1px solid #000000; height: 4px; margin-bottom: 18px; position: relative; z-index: 2;"></div>
  `;
};

const buildInvitationPdfHtml = (data: InvitationData, assets: OrgAssets): string => {

  const stempelScale = Math.max(0.3, Math.min(2.5, (assets.stempelSize || 100) / 100));
  const stempelImgStyle = `width: ${Math.round(112 * stempelScale)}px; height: ${Math.round(112 * stempelScale)}px; object-fit: contain; transform: rotate(${assets.stempelRotation || 0}deg); opacity: 0.92; display: block;`;
  const ttdKetuaScale = Math.max(0.3, Math.min(2.5, (assets.ttdKetuaSize || 100) / 100));
  const ttdSekretarisScale = Math.max(0.3, Math.min(2.5, (assets.ttdSekretarisSize || 100) / 100));

  const kepadaLinesHtml = (data.kepadaList || [])
    .filter((line) => line.trim() !== '')
    .map((line, idx) => {
      if (idx === 0) {
        return `
          <div style="display: flex; align-items: flex-start;">
            <span style="width: 34px; flex-shrink: 0;">Yth.</span>
            <span>${escapeHtml(line)}</span>
          </div>
        `;
      }
      return `
        <div style="display: flex; align-items: flex-start;">
          <span style="width: 34px; flex-shrink: 0;"></span>
          <span>${escapeHtml(line)}</span>
        </div>
      `;
    })
    .join('');

  const tembusanItemsHtml = (data.tembusanList || [])
    .filter((item) => item.trim() !== '')
    .map((item, idx) => `<div>${idx + 1}. ${escapeHtml(item)}</div>`)
    .join('');

  const page1Html = `
    <div class="undangan-pdf-page" style="width: 210mm; height: 296mm; padding: 14mm 18mm 14mm 18mm; box-sizing: border-box; background-color: #ffffff; color: #000000; font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.45; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
      ${buildKopSuratHtml(data, assets)}

      <!-- Metadata & Tujuan -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 22px; position: relative; z-index: 2;">
        <div style="flex: 1; min-width: 0;">
          <table style="border-collapse: collapse; width: 100%; font-size: 11pt; line-height: 1.5; color: #000000;">
            <tr>
              <td style="width: 78px; vertical-align: top; padding: 1px 0;">Nomor</td>
              <td style="width: 14px; vertical-align: top; padding: 1px 0;">:</td>
              <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.nomorSurat)}</td>
            </tr>
            <tr>
              <td style="width: 78px; vertical-align: top; padding: 1px 0;">Lampiran</td>
              <td style="width: 14px; vertical-align: top; padding: 1px 0;">:</td>
              <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.lampiranText)}</td>
            </tr>
            <tr>
              <td style="width: 78px; vertical-align: top; padding: 1px 0;">Perihal</td>
              <td style="width: 14px; vertical-align: top; padding: 1px 0;">:</td>
              <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.perihal)}</td>
            </tr>
          </table>
        </div>

        <div style="width: fit-content; max-width: 50%; flex-shrink: 0; font-size: 11pt; line-height: 1.48; color: #000000;">
          <div style="margin-bottom: 12px;">${escapeHtml(data.tanggalSurat)}</div>
          <div>Kepada :</div>
          ${kepadaLinesHtml}
          <div style="display: flex; align-items: flex-start; margin-top: 2px;">
            <span style="width: 34px; flex-shrink: 0;"></span>
            <span style="text-decoration: underline;">${escapeHtml(data.diTempat)}</span>
          </div>
        </div>
      </div>

      <!-- Isi Surat -->
      <div style="position: relative; z-index: 2;">
        <div style="margin-bottom: 10px;">${escapeHtml(data.salamPembuka)}</div>

        <div style="text-align: justify; text-indent: 36px; margin-bottom: 14px; line-height: 1.55;">
          ${formatRichInlineText(data.paragrafPembuka)}
        </div>

        <table style="border-collapse: collapse; width: 100%; font-size: 11pt; line-height: 1.55; margin-bottom: 14px; color: #000000;">
          <tr>
            <td style="width: 92px; vertical-align: top; padding: 1px 0;">Hari</td>
            <td style="width: 16px; vertical-align: top; padding: 1px 0;">:</td>
            <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.hari)}</td>
          </tr>
          <tr>
            <td style="width: 92px; vertical-align: top; padding: 1px 0;">Tanggal</td>
            <td style="width: 16px; vertical-align: top; padding: 1px 0;">:</td>
            <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.tanggalAcara)}</td>
          </tr>
          <tr>
            <td style="width: 92px; vertical-align: top; padding: 1px 0;">Pukul</td>
            <td style="width: 16px; vertical-align: top; padding: 1px 0;">:</td>
            <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.pukul)}</td>
          </tr>
          <tr>
            <td style="width: 92px; vertical-align: top; padding: 1px 0;">Tempat</td>
            <td style="width: 16px; vertical-align: top; padding: 1px 0;">:</td>
            <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.tempatAcara)}</td>
          </tr>
          <tr>
            <td style="width: 92px; vertical-align: top; padding: 1px 0;">Catatan</td>
            <td style="width: 16px; vertical-align: top; padding: 1px 0;">:</td>
            <td style="vertical-align: top; padding: 1px 0;">${escapeHtml(data.acara)}</td>
          </tr>
        </table>

        <div style="text-align: justify; margin-bottom: 10px; line-height: 1.5;">
          ${formatRichInlineText(data.paragrafPenutup)}
        </div>

        <div style="margin-bottom: 24px;">${escapeHtml(data.salamPenutup)}</div>
      </div>

      <!-- Blok Tanda Tangan 3 Kolom (Ketua | Stempel | Sekretaris) -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 26px; position: relative; z-index: 2;">
        <div style="width: 36%; text-align: center; line-height: 1.35;">
          <div>${escapeHtml(data.ketuaJabatan)}</div>
          <div>${escapeHtml(data.ketuaSubJabatan)}</div>
          <div style="height: 66px; display: flex; align-items: center; justify-content: center; margin: 2px 0;">
            ${
              data.showTtdImages && assets.ttdKetua
                ? `<img src="${assets.ttdKetua}" alt="TTD Ketua" style="max-height: ${Math.round(62 * ttdKetuaScale)}px; max-width: ${Math.round(150 * ttdKetuaScale)}px; object-fit: contain;" />`
                : ''
            }
          </div>
          <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(data.ketuaNama)}</div>
          <div>NPA. ${escapeHtml(data.ketuaNpa || '-')}</div>
        </div>

        <div style="width: 28%; display: flex; align-items: center; justify-content: center;">
          ${
            data.showStempel && assets.logoStempel
              ? `<img src="${assets.logoStempel}" alt="Stempel Resmi" style="${stempelImgStyle}" />`
              : ''
          }
        </div>

        <div style="width: 36%; text-align: center; line-height: 1.35;">
          <div>${escapeHtml(data.sekretarisJabatan)}</div>
          <div>${escapeHtml(data.sekretarisSubJabatan)}</div>
          <div style="height: 66px; display: flex; align-items: center; justify-content: center; margin: 2px 0;">
            ${
              data.showTtdImages && assets.ttdSekretaris
                ? `<img src="${assets.ttdSekretaris}" alt="TTD Sekretaris" style="max-height: ${Math.round(62 * ttdSekretarisScale)}px; max-width: ${Math.round(150 * ttdSekretarisScale)}px; object-fit: contain;" />`
                : ''
            }
          </div>
          <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(data.sekretarisNama)}</div>
          <div>NPA. ${escapeHtml(data.sekretarisNpa || '-')}</div>
        </div>
      </div>

      </div>

      <!-- Tembusan & QR Verifikasi Keaslian Surat -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; position: relative; z-index: 2;">
        ${
          tembusanItemsHtml
            ? `
          <div style="font-size: 10.5pt; line-height: 1.45; flex: 1;">
            <div style="margin-bottom: 4px;">${escapeHtml(data.tembusanHeader)}</div>
            ${tembusanItemsHtml}
          </div>
        `
            : '<div style="flex: 1;"></div>'
        }
        <div style="width: 96px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-size: 8.5pt; color: #334155; flex-shrink: 0;">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`SURAT RESMI PGRI RANTING GELANG | No: ${data.nomorSurat} | Perihal: ${data.perihal} | Tgl: ${data.tanggalSurat}`)}"
            alt="QR Verifikasi Surat"
            style="width: 58px; height: 58px; border: 1px solid #cbd5e1; padding: 3px; background: #fff; display: block; margin: 0 auto;"
          />
          <div style="margin-top: 4px; width: 100%; text-align: center; line-height: 1.2;">Verifikasi Surat</div>
        </div>
      </div>
    </div>
  `;

  return page1Html;
};

const AGENDA_STORAGE_KEY = 'pgri-surat-agenda';
const NOTULEN_STORAGE_KEY = 'pgri-notulen-rapat';

const isSafeHttpUrl = (url?: string) => Boolean(url && /^https?:\/\//i.test(url.trim()));

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const buildAutoLetterNumber = (codeType: 'Und' | 'ST' | 'BA', existingCount: number): string => {
  const cfg = getOrgConfig();
  const now = new Date();
  const seq = String(existingCount + 1).padStart(3, '0');
  const roman = ROMAN_MONTHS[now.getMonth()] || 'I';
  return `${seq}/${codeType}/${cfg.letterCodePrefix}/${roman}/${now.getFullYear()}`;
};

interface EOfficeProps {
  mode: 'surat_tugas' | 'agenda_surat' | 'notulen';
  isAdmin: boolean;
  isDark: boolean;
  teachers: Teacher[];
  events: ActivityEvent[];
  attendanceList: AttendanceRecord[];
  onNotice: (type: 'success' | 'error', text: string) => void;
  onSaveArchiveItem?: (item: InvitationData) => Promise<void>;
  isSavingCloud?: boolean;
  archiveCount?: number;
}

export const EOfficeSubPanels: React.FC<EOfficeProps> = ({
  mode,
  isAdmin,
  isDark,
  teachers,
  events,
  attendanceList,
  onNotice,
  onSaveArchiveItem,
  isSavingCloud = false,
  archiveCount = 0
}) => {
  const orgConfig = useMemo(() => getOrgConfig(), []);
  const cardClass = isDark
    ? 'bg-stone-900 border-stone-800 text-stone-100'
    : 'bg-white border-stone-200/90 text-stone-900';
  const inputClass = isDark
    ? 'w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-700/50 focus:border-red-700'
    : 'w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-700/35 focus:border-red-700';
  const labelClass = `block text-xs font-semibold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`;

  // =========================================================================
  // 1. SURAT TUGAS / DELEGASI
  // =========================================================================
  const [stNomor, setStNomor] = useState(() => buildAutoLetterNumber('ST', 0));
  const [stDasar, setStDasar] = useState('Undangan Pengurus PGRI Cabang Kecamatan Sumberbaru tentang kegiatan pembinaan dan koordinasi organisasi.');
  const [stKeperluan, setStKeperluan] = useState('Mengikuti Rapat Koordinasi / Kegiatan Resmi PGRI mewakili PGRI Ranting Gelang.');
  const [stHari, setStHari] = useState(() =>
    new Date().toLocaleDateString('id-ID', { weekday: 'long' })
  );
  const [stTanggal, setStTanggal] = useState(() =>
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const [stTempat, setStTempat] = useState('Gedung PGRI Kecamatan Sumberbaru');
  const [stSelectedIds, setStSelectedIds] = useState<string[]>([]);
  const [stManualNama, setStManualNama] = useState('');
  const [stTembusanList, setStTembusanList] = useState<string[]>([
    'Pengawas Bina',
    'Ketua K3S Sumberbaru',
    'Ketua PGRI Cabang Sumberbaru',
    'Arsip'
  ]);

  const selectedDelegates = useMemo(
    () => teachers.filter((t) => stSelectedIds.includes(t.id)),
    [teachers, stSelectedIds]
  );

  const toggleDelegate = (id: string) => {
    setStSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const buildSuratTugasHtml = () => {
    const logoPgri = localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel') || '';
    const ttdKetua = localStorage.getItem('ttd-ketua') || '';
    const ttdKetuaScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('ttd-ketua-size')) || 100) / 100));
    const ttdSekretaris = localStorage.getItem('ttd-sekretaris') || '';
    const ttdSekretarisScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('ttd-sekretaris-size')) || 100) / 100));
    const stempel = localStorage.getItem('logo-stempel') || '';
    const stempelScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('logo-stempel-size')) || 100) / 100));
    const stempelRotation = Number(localStorage.getItem('logo-stempel-rotation')) || 0;
    const namaKetua = (orgConfig as any).ketuaName || localStorage.getItem('pgri-ketua-name') || 'UMAR ALI KUSUMA';
    const npaKetua = (orgConfig as any).ketuaNpa || localStorage.getItem('pgri-ketua-npa') || '13301500431';
    const namaSekretaris = (orgConfig as any).sekretarisName || localStorage.getItem('pgri-sekretaris-name') || 'ADI SAIFUL RIZAL, S.Pd';
    const npaSekretaris = (orgConfig as any).sekretarisNpa || localStorage.getItem('pgri-sekretaris-npa') || '13301500081';
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows = [
      ...selectedDelegates.map((t, i) => ({
        no: i + 1,
        name: t.name,
        npa: (t as any).npa || t.nip || '-',
        school: t.school || '-'
      })),
      ...(stManualNama.trim()
        ? stManualNama
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((name, idx) => ({
              no: selectedDelegates.length + idx + 1,
              name,
              npa: '-',
              school: 'PGRI Ranting Gelang'
            }))
        : [])
    ];

    const stTembusanItemsHtml = (stTembusanList || [])
      .filter((item) => item.trim() !== '')
      .map((item, idx) => `<div>${idx + 1}. ${escapeHtml(item)}</div>`)
      .join('');

    const verifyText = `SURAT TUGAS PGRI RANTING GELANG | No: ${stNomor} | Tgl: ${stHari}, ${stTanggal}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyText)}`;

    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Surat Tugas ${escapeHtml(stNomor)}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: transparent; }
        .sheet-a4 {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          color: #000000;
          padding: 14mm 18mm 14mm 18mm;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11.5pt;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
        }
        .content-body { flex: 1; }
        .kop { display: flex; align-items: center; gap: 14px; padding-bottom: 6px; position: relative; z-index: 2; font-family: 'Times New Roman', Times, serif; }
        .kop-logo-wrap { width: 94px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .kop-logo-wrap img { width: 92px; height: 92px; object-fit: contain; display: block; }
        .kop-logo-placeholder { width: 92px; height: 92px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #64748b; text-align: center; }
        .kop-text { flex: 1; text-align: center; line-height: 1.18; color: #000000; padding-left: 8px; }
        .kop-text .org-main { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; }
        .kop-text .sub-org { font-size: 10.5pt; font-weight: bold; font-style: italic; margin-top: 1px; }
        .kop-text .ranting-main { font-size: 16.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
        .kop-text .wilayah { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
        .kop-text .sekretariat { font-size: 8.5pt; font-style: italic; margin-top: 2px; }
        .kop-divider { border-top: 2px solid #000000; border-bottom: 1px solid #000000; height: 4px; margin-bottom: 18px; position: relative; z-index: 2; }
        .title { text-align: center; margin: 14px 0 16px; }
        .title h3 { margin: 0; font-size: 13pt; text-decoration: underline; letter-spacing: 1px; }
        table.delegates { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 10.5pt; }
        table.delegates th, table.delegates td { border: 1px solid #000; padding: 6px 8px; }
        table.delegates th { background: #f3f4f6; }
        .footer-wrap { margin-top: 24px; padding-top: 8px; }
        .ttd-grid { display: flex; justify-content: space-between; align-items: flex-end; position: relative; }
        .ttd-col { width: 220px; text-align: center; position: relative; }
        .ttd-space { height: 68px; position: relative; display: flex; align-items: center; justify-content: center; }
        .stempel-center { position: absolute; left: 50%; transform: translateX(-50%); bottom: 6px; width: 96px; opacity: 0.88; mix-blend-mode: multiply; pointer-events: none; }
        @media print {
          html, body { background: #ffffff; }
          .sheet-a4 { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
        }
      </style></head><body>
      <div class="sheet-a4">
        <div class="content-body">
          <div class="kop">
            <div class="kop-logo-wrap">
              ${logoPgri ? `<img src="${logoPgri}" alt="Logo PGRI" />` : `<div class="kop-logo-placeholder">Logo<br/>PGRI</div>`}
            </div>
            <div class="kop-text">
              <div class="org-main">${escapeHtml(orgConfig.kopOrganisasi)}</div>
              <div class="sub-org">(Teachers Association Of Republic Indonesia)</div>
              <div class="ranting-main">${escapeHtml(orgConfig.kopRanting)}</div>
              <div class="wilayah">${escapeHtml(orgConfig.kopWilayah)}</div>
              <div class="sekretariat">${escapeHtml(orgConfig.kopSekretariat)}</div>
            </div>
          </div>
          <div class="kop-divider"></div>
          <div class="title">
            <h3>SURAT TUGAS</h3>
            <div>Nomor : ${escapeHtml(stNomor)}</div>
          </div>
          <p><strong>Dasar :</strong> ${escapeHtml(stDasar)}</p>
          <p style="text-align:center; font-weight:bold; letter-spacing:1px; margin: 12px 0 8px;">MENUGASKAN</p>
          <p>Kepada anggota PGRI Ranting Gelang berikut ini:</p>
          <table class="delegates">
            <thead><tr><th style="width:40px">No</th><th>Nama Lengkap</th><th>NPA / NIP</th><th>Unit Kerja / Sekolah</th></tr></thead>
            <tbody>
              ${
                rows.length > 0
                  ? rows.map((r) => `<tr><td style="text-align:center">${r.no}</td><td>${escapeHtml(r.name)}</td><td style="text-align:center">${escapeHtml(r.npa)}</td><td>${escapeHtml(r.school)}</td></tr>`).join('')
                  : `<tr><td colspan="4" style="text-align:center; color:#666;">(Belum ada peserta delegasi yang dipilih)</td></tr>`
              }
            </tbody>
          </table>
          <p><strong>Untuk :</strong> ${escapeHtml(stKeperluan)}</p>
          <table style="margin: 8px 0 12px; font-size: 11pt;">
            <tr><td style="width:130px">Hari</td><td>: ${escapeHtml(stHari)}</td></tr>
            <tr><td>Tanggal</td><td>: ${escapeHtml(stTanggal)}</td></tr>
            <tr><td>Tempat</td><td>: ${escapeHtml(stTempat)}</td></tr>
          </table>
          <p>Demikian Surat Tugas ini diberikan untuk dilaksanakan dengan penuh tanggung jawab serta melaporkan hasilnya kepada Pengurus PGRI Ranting Gelang.</p>
        </div>
        <div class="footer-wrap">
          <div style="text-align:right; margin-bottom:6px; padding-right:24px;">Gelang, ${escapeHtml(todayStr)}</div>
          <div class="ttd-grid">
            <div class="ttd-col">
              <div>Ketua</div>
              <div>PGRI Ranting Gelang</div>
              <div class="ttd-space">
                ${ttdKetua ? `<img src="${ttdKetua}" style="max-height:${Math.round(62 * ttdKetuaScale)}px; max-width:${Math.round(150 * ttdKetuaScale)}px; object-fit:contain;" alt="TTD Ketua" />` : ''}
              </div>
              <div style="font-weight:bold; text-decoration:underline;">${escapeHtml(namaKetua)}</div>
              <div style="font-size:10pt;">NPA. ${escapeHtml(npaKetua)}</div>
            </div>
            ${stempel ? `<img src="${stempel}" class="stempel-center" style="width:${Math.round(112 * stempelScale)}px; height:${Math.round(112 * stempelScale)}px; object-fit:contain; transform:translateX(-50%) rotate(${stempelRotation}deg);" alt="Stempel" />` : ''}
            <div class="ttd-col">
              <div>Sekretaris</div>
              <div>PGRI Ranting Gelang</div>
              <div class="ttd-space">
                ${ttdSekretaris ? `<img src="${ttdSekretaris}" style="max-height:${Math.round(62 * ttdSekretarisScale)}px; max-width:${Math.round(150 * ttdSekretarisScale)}px; object-fit:contain;" alt="TTD Sekretaris" />` : ''}
              </div>
              <div style="font-weight:bold; text-decoration:underline;">${escapeHtml(namaSekretaris)}</div>
              <div style="font-size:10pt;">NPA. ${escapeHtml(npaSekretaris)}</div>
            </div>
          </div>
          <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end; gap:12px;">
            ${
              stTembusanItemsHtml
                ? `
              <div style="font-size: 10.5pt; line-height: 1.45; flex: 1;">
                <div style="margin-bottom: 4px;">Tembusan disampaikan kepada :</div>
                ${stTembusanItemsHtml}
              </div>
            `
                : '<div style="flex: 1;"></div>'
            }
            <div style="width:96px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:8.5pt; color:#334155; flex-shrink:0;">
              <img src="${qrUrl}" alt="QR Verifikasi" style="width:58px; height:58px; border:1px solid #cbd5e1; padding:3px; background:#fff; display:block; margin:0 auto;" />
              <div style="margin-top:4px; width:100%; text-align:center; line-height:1.2;">Verifikasi Surat</div>
            </div>
          </div>
        </div>
      </div>
      </body></html>`;
  };

  const handleExportSuratTugas = async () => {
    const html = buildSuratTugasHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    await safeDownloadBlob(blob, `Surat_Tugas_${stNomor.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
    logAuditEvent('E-Office', 'Cetak Surat Tugas', `Menerbitkan Surat Tugas No. ${stNomor} (${selectedDelegates.length} delegasi).`);
    onNotice('success', 'File Surat Tugas berhasil diunduh (buka di browser lalu Ctrl+P untuk simpan PDF).');
  };

  // =========================================================================
  // 2. BUKU AGENDA SURAT (MASUK & KELUAR)
  // =========================================================================
  const [agendaList, setAgendaList] = useState<SuratAgendaItem[]>(() => {
    try {
      const raw = localStorage.getItem(AGENDA_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [agendaFilter, setAgendaFilter] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua');
  const [agendaSearch, setAgendaSearch] = useState('');
  const [newAgenda, setNewAgenda] = useState<Omit<SuratAgendaItem, 'id'>>({
    direction: 'Keluar',
    nomorSurat: buildAutoLetterNumber('Und', 0),
    tanggalSurat: new Date().toISOString().split('T')[0],
    perihal: '',
    asalTujuan: '',
    catatan: '',
    lampiranUrl: ''
  });

  useEffect(() => {
    try {
      localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendaList));
    } catch {}
  }, [agendaList]);

  useEffect(() => {
    const syncSubPanelsFromStorage = () => {
      try {
        const rawAgenda = localStorage.getItem(AGENDA_STORAGE_KEY);
        if (rawAgenda) {
          const parsedAgenda = JSON.parse(rawAgenda);
          if (Array.isArray(parsedAgenda)) setAgendaList(parsedAgenda);
        }
      } catch {}
      try {
        const rawNotulen = localStorage.getItem(NOTULEN_STORAGE_KEY);
        if (rawNotulen) {
          const parsedNotulen = JSON.parse(rawNotulen);
          if (Array.isArray(parsedNotulen)) setNotulenList(parsedNotulen);
        }
      } catch {}
    };
    window.addEventListener('pgri-eoffice-synced', syncSubPanelsFromStorage);
    return () => window.removeEventListener('pgri-eoffice-synced', syncSubPanelsFromStorage);
  }, []);

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newAgenda.nomorSurat.trim() || !newAgenda.perihal.trim()) return;
    if (newAgenda.lampiranUrl && !isSafeHttpUrl(newAgenda.lampiranUrl)) {
      onNotice('error', 'URL lampiran harus diawali https:// atau http://');
      return;
    }

    const item: SuratAgendaItem = {
      id: `surat-${Date.now()}`,
      direction: newAgenda.direction,
      nomorSurat: newAgenda.nomorSurat.trim(),
      tanggalSurat: newAgenda.tanggalSurat,
      asalTujuan: newAgenda.asalTujuan.trim(),
      perihal: newAgenda.perihal.trim(),
      ...(newAgenda.lampiranUrl?.trim() ? { lampiranUrl: newAgenda.lampiranUrl.trim() } : {}),
      ...(newAgenda.catatan?.trim() ? { catatan: newAgenda.catatan.trim() } : {})
    };
    const updated = [item, ...agendaList];
    setAgendaList(updated);

    await mutateCloudCollection<SuratAgendaItem>(
      'suratAgenda',
      [AGENDA_STORAGE_KEY],
      (latest) => [item, ...latest.filter((x) => x.id !== item.id)],
      updated,
      'Buku Agenda Surat'
    );
    await savePerDocItem('surat_agenda', item.id, item as unknown as Record<string, unknown>);
    await logAuditEvent('Buku Agenda Surat', `Catat Surat ${item.direction}`, `${item.nomorSurat} — ${item.perihal}`);

    setNewAgenda({
      direction: 'Keluar',
      nomorSurat: buildAutoLetterNumber('Und', updated.length),
      tanggalSurat: new Date().toISOString().split('T')[0],
      perihal: '',
      asalTujuan: '',
      catatan: '',
      lampiranUrl: ''
    });
    onNotice('success', 'Surat berhasil dicatat di Buku Agenda & Cloud.');
  };

  const handleDeleteAgenda = async (id: string) => {
    if (!isAdmin) return;
    const updated = agendaList.filter((x) => x.id !== id);
    setAgendaList(updated);
    const [res, perDocRes] = await Promise.all([
      mutateCloudCollection<SuratAgendaItem>(
        'suratAgenda',
        [AGENDA_STORAGE_KEY],
        (latest) => latest.filter((x) => x.id !== id),
        updated,
        'Buku Agenda Surat'
      ),
      deletePerDocItem('surat_agenda', id, 'Buku Agenda Surat')
    ]);
    setAgendaList(res.items);
    if (res.success && perDocRes.success) {
      onNotice('success', 'Catatan surat dihapus dari Buku Agenda.');
    } else {
      onNotice('error', res.error || perDocRes.error || 'Catatan terhapus lokal, namun gagal sinkron ke Cloud.');
    }
  };

  const filteredAgenda = useMemo(() => {
    return agendaList.filter((item) => {
      const matchDir = agendaFilter === 'Semua' || item.direction === agendaFilter;
      const q = agendaSearch.toLowerCase();
      const matchQ =
        !q ||
        item.nomorSurat.toLowerCase().includes(q) ||
        item.perihal.toLowerCase().includes(q) ||
        item.asalTujuan.toLowerCase().includes(q);
      return matchDir && matchQ;
    });
  }, [agendaList, agendaFilter, agendaSearch]);

  const buildAgendaRekapHtml = () => {
    const logoPgri = localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel') || '';
    const ttdKetua = localStorage.getItem('ttd-ketua') || '';
    const ttdKetuaScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('ttd-ketua-size')) || 100) / 100));
    const ttdSekretaris = localStorage.getItem('ttd-sekretaris') || '';
    const ttdSekretarisScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('ttd-sekretaris-size')) || 100) / 100));
    const stempel = localStorage.getItem('logo-stempel') || '';
    const stempelScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('logo-stempel-size')) || 100) / 100));
    const stempelRotation = Number(localStorage.getItem('logo-stempel-rotation')) || 0;
    const namaKetua = (orgConfig as any).ketuaName || localStorage.getItem('pgri-ketua-name') || 'UMAR ALI KUSUMA';
    const npaKetua = (orgConfig as any).ketuaNpa || localStorage.getItem('pgri-ketua-npa') || '13301500431';
    const namaSekretaris = (orgConfig as any).sekretarisName || localStorage.getItem('pgri-sekretaris-name') || 'ADI SAIFUL RIZAL, S.Pd';
    const npaSekretaris = (orgConfig as any).sekretarisNpa || localStorage.getItem('pgri-sekretaris-npa') || '13301500081';
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const verifyText = `BUKU AGENDA SURAT PGRI RANTING GELANG | Filter: ${agendaFilter} | Total: ${filteredAgenda.length} | Cetak: ${todayStr}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyText)}`;
    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Buku Agenda Surat</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: transparent; }
        .sheet-a4 {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          color: #000000;
          padding: 14mm 18mm 14mm 18mm;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.45;
          display: flex;
          flex-direction: column;
        }
        .content-body { flex: 1; }
        .kop { display: flex; align-items: center; gap: 14px; padding-bottom: 6px; position: relative; z-index: 2; font-family: 'Times New Roman', Times, serif; }
        .kop-logo-wrap { width: 94px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .kop-logo-wrap img { width: 92px; height: 92px; object-fit: contain; display: block; }
        .kop-logo-placeholder { width: 92px; height: 92px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #64748b; text-align: center; }
        .kop-text { flex: 1; text-align: center; line-height: 1.18; color: #000000; padding-left: 8px; }
        .kop-text .org-main { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; }
        .kop-text .sub-org { font-size: 10.5pt; font-weight: bold; font-style: italic; margin-top: 1px; }
        .kop-text .ranting-main { font-size: 16.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
        .kop-text .wilayah { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
        .kop-text .sekretariat { font-size: 8.5pt; font-style: italic; margin-top: 2px; }
        .kop-divider { border-top: 2px solid #000000; border-bottom: 1px solid #000000; height: 4px; margin-bottom: 18px; position: relative; z-index: 2; }
        h3 { text-align: center; text-decoration: underline; margin: 12px 0 4px; font-size: 12.5pt; }
        .sub { text-align: center; font-size: 10pt; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
        th { background: #f3f4f6; text-align: center; }
        .ttd-grid { display: flex; justify-content: space-between; align-items: flex-end; position: relative; margin-top: 24px; }
        .ttd-col { width: 220px; text-align: center; position: relative; }
        .ttd-space { height: 68px; position: relative; display: flex; align-items: center; justify-content: center; }
        .stempel-center { position: absolute; left: 50%; transform: translateX(-50%); bottom: 6px; width: 96px; opacity: 0.88; mix-blend-mode: multiply; pointer-events: none; }
        @media print {
          html, body { background: #ffffff; }
          .sheet-a4 { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
        }
      </style></head><body>
      <div class="sheet-a4">
        <div class="content-body">
          <div class="kop">
            <div class="kop-logo-wrap">
              ${logoPgri ? `<img src="${logoPgri}" alt="Logo PGRI" />` : `<div class="kop-logo-placeholder">Logo<br/>PGRI</div>`}
            </div>
            <div class="kop-text">
              <div class="org-main">${escapeHtml(orgConfig.kopOrganisasi)}</div>
              <div class="sub-org">(Teachers Association Of Republic Indonesia)</div>
              <div class="ranting-main">${escapeHtml(orgConfig.kopRanting)}</div>
              <div class="wilayah">${escapeHtml(orgConfig.kopWilayah)}</div>
              <div class="sekretariat">${escapeHtml(orgConfig.kopSekretariat)}</div>
            </div>
          </div>
          <div class="kop-divider"></div>
          <h3>BUKU AGENDA SURAT (${escapeHtml(agendaFilter.toUpperCase())})</h3>
          <div class="sub">Dicetak pada: ${escapeHtml(todayStr)} • Total: ${filteredAgenda.length} Surat</div>
          <table>
            <thead>
              <tr>
                <th style="width:32px">No</th>
                <th style="width:65px">Jenis</th>
                <th style="width:90px">Tanggal</th>
                <th>Nomor Surat</th>
                <th>Asal / Tujuan</th>
                <th>Perihal</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredAgenda.length > 0
                  ? filteredAgenda
                      .map(
                        (item, idx) =>
                          `<tr><td style="text-align:center">${idx + 1}</td><td style="text-align:center">${escapeHtml(item.direction)}</td><td>${escapeHtml(item.tanggalSurat)}</td><td>${escapeHtml(item.nomorSurat)}</td><td>${escapeHtml(item.asalTujuan)}</td><td>${escapeHtml(item.perihal)}</td></tr>`
                      )
                      .join('')
                  : `<tr><td colspan="6" style="text-align:center; color:#666;">(Belum ada data surat pada filter ini)</td></tr>`
              }
            </tbody>
          </table>
        </div>
        <div>
          <div style="text-align:right; margin-bottom:6px; padding-right:24px;">Gelang, ${escapeHtml(todayStr)}</div>
          <div class="ttd-grid">
            <div class="ttd-col">
              <div>Ketua</div>
              <div>PGRI Ranting Gelang</div>
              <div class="ttd-space">
                ${ttdKetua ? `<img src="${ttdKetua}" style="max-height:${Math.round(62 * ttdKetuaScale)}px; max-width:${Math.round(150 * ttdKetuaScale)}px; object-fit:contain;" alt="TTD Ketua" />` : ''}
              </div>
              <div style="font-weight:bold; text-decoration:underline;">${escapeHtml(namaKetua)}</div>
              <div style="font-size:10pt;">NPA. ${escapeHtml(npaKetua)}</div>
            </div>
            ${stempel ? `<img src="${stempel}" class="stempel-center" style="width:${Math.round(112 * stempelScale)}px; height:${Math.round(112 * stempelScale)}px; object-fit:contain; transform:translateX(-50%) rotate(${stempelRotation}deg);" alt="Stempel" />` : ''}
            <div class="ttd-col">
              <div>Sekretaris</div>
              <div>PGRI Ranting Gelang</div>
              <div class="ttd-space">
                ${ttdSekretaris ? `<img src="${ttdSekretaris}" style="max-height:${Math.round(62 * ttdSekretarisScale)}px; max-width:${Math.round(150 * ttdSekretarisScale)}px; object-fit:contain;" alt="TTD Sekretaris" />` : ''}
              </div>
              <div style="font-weight:bold; text-decoration:underline;">${escapeHtml(namaSekretaris)}</div>
              <div style="font-size:10pt;">NPA. ${escapeHtml(npaSekretaris)}</div>
            </div>
          </div>
          <div style="margin-top:16px; display:flex; justify-content:flex-end;">
            <div style="width:96px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:8.5pt; color:#334155;">
              <img src="${qrUrl}" alt="QR Verifikasi" style="width:58px; height:58px; border:1px solid #cbd5e1; padding:3px; background:#fff; display:block; margin:0 auto;" />
              <div style="margin-top:4px; width:100%; text-align:center; line-height:1.2;">Verifikasi Surat</div>
            </div>
          </div>
        </div>
      </div>
      </body></html>`;
  };

  // =========================================================================
  // 3. NOTULEN & BERITA ACARA RAPAT
  // =========================================================================
  const [notulenList, setNotulenList] = useState<NotulenItem[]>(() => {
    try {
      const raw = localStorage.getItem(NOTULEN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [notulenForm, setNotulenForm] = useState({
    eventId: '',
    eventTitle: '',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '08.00 - Selesai WIB',
    tempat: 'SDN Gelang 03',
    pimpinanRapat: 'Ketua PGRI Ranting Gelang',
    notulis: 'Sekretaris PGRI Ranting Gelang',
    jumlahHadir: 0,
    agenda: '',
    keputusan: '',
    tindakLanjut: ''
  });

  useEffect(() => {
    try {
      localStorage.setItem(NOTULEN_STORAGE_KEY, JSON.stringify(notulenList));
    } catch {}
  }, [notulenList]);

  const handleSelectEventForNotulen = (eventId: string) => {
    const evt = events.find((e) => e.id === eventId);
    if (!evt) {
      setNotulenForm((prev) => ({ ...prev, eventId: '' }));
      return;
    }
    const hadirCount = attendanceList.filter(
      (a) =>
        (a.eventId === evt.id ||
          (a.eventTitle && evt.title && a.eventTitle.trim().toLowerCase() === evt.title.trim().toLowerCase())) &&
        (a.status === 'Hadir' || a.status === 'Verifikasi')
    ).length;

    setNotulenForm((prev) => ({
      ...prev,
      eventId: evt.id,
      eventTitle: evt.title,
      waktu: evt.time || prev.waktu,
      tempat: evt.location || prev.tempat,
      jumlahHadir: hadirCount
    }));
  };

  const handleAddNotulen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !notulenForm.eventTitle.trim() || !notulenForm.keputusan.trim()) return;

    const item: NotulenItem = {
      ...notulenForm,
      id: `notulen-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const updated = [item, ...notulenList];
    setNotulenList(updated);

    await mutateCloudCollection<NotulenItem>(
      'notulen',
      [NOTULEN_STORAGE_KEY],
      (latest) => [item, ...latest.filter((x) => x.id !== item.id)],
      updated,
      'Notulen Rapat'
    );
    await logAuditEvent('Notulen Rapat', 'Simpan Berita Acara', `Menyimpan notulen "${item.eventTitle}" (${item.jumlahHadir} hadir).`);

    setNotulenForm({
      eventId: '',
      eventTitle: '',
      tanggal: new Date().toISOString().split('T')[0],
      waktu: '08.00 - Selesai WIB',
      tempat: 'SDN Gelang 03',
      pimpinanRapat: 'Ketua PGRI Ranting Gelang',
      notulis: 'Sekretaris PGRI Ranting Gelang',
      jumlahHadir: 0,
      agenda: '',
      keputusan: '',
      tindakLanjut: ''
    });
    onNotice('success', 'Notulen & Berita Acara Rapat berhasil disimpan.');
  };

  const [previewNotulenId, setPreviewNotulenId] = useState<string | null>(null);

  const buildNotulenHtml = (item: Omit<NotulenItem, 'id' | 'updatedAt'>) => {
    const logoPgri = localStorage.getItem('logo-pgri') || localStorage.getItem('logo-kombel') || '';
    const ttdKetua = localStorage.getItem('ttd-ketua') || '';
    const ttdKetuaScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('ttd-ketua-size')) || 100) / 100));
    const ttdSekretaris = localStorage.getItem('ttd-sekretaris') || '';
    const ttdSekretarisScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('ttd-sekretaris-size')) || 100) / 100));
    const stempel = localStorage.getItem('logo-stempel') || '';
    const stempelScale = Math.max(0.3, Math.min(2.5, (Number(localStorage.getItem('logo-stempel-size')) || 100) / 100));
    const stempelRotation = Number(localStorage.getItem('logo-stempel-rotation')) || 0;
    const namaKetua = (orgConfig as any).ketuaName || localStorage.getItem('pgri-ketua-name') || 'UMAR ALI KUSUMA';
    const npaKetua = (orgConfig as any).ketuaNpa || localStorage.getItem('pgri-ketua-npa') || '13301500431';
    const namaSekretaris = (orgConfig as any).sekretarisName || localStorage.getItem('pgri-sekretaris-name') || 'ADI SAIFUL RIZAL, S.Pd';
    const npaSekretaris = (orgConfig as any).sekretarisNpa || localStorage.getItem('pgri-sekretaris-npa') || '13301500081';
    const formattedTanggalId = (() => {
      if (!item.tanggal) return '';
      const parsed = new Date(`${item.tanggal}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return item.tanggal;
    })();
    const formattedTanggalHariId = (() => {
      if (!item.tanggal) return '';
      const parsed = new Date(`${item.tanggal}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      return item.tanggal;
    })();
    const verifyText = `NOTULEN RAPAT PGRI RANTING GELANG | ${item.eventTitle || 'Draft Rapat'} | Tgl: ${item.tanggal}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyText)}`;
    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Notulen - ${escapeHtml(item.eventTitle || 'Draft Rapat')}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: transparent; }
        .sheet-a4 {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          color: #000000;
          padding: 14mm 18mm 14mm 18mm;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11.5pt;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
        }
        .content-body { flex: 1; }
        .kop { display: flex; align-items: center; gap: 14px; padding-bottom: 6px; position: relative; z-index: 2; font-family: 'Times New Roman', Times, serif; }
        .kop-logo-wrap { width: 94px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .kop-logo-wrap img { width: 92px; height: 92px; object-fit: contain; display: block; }
        .kop-logo-placeholder { width: 92px; height: 92px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #64748b; text-align: center; }
        .kop-text { flex: 1; text-align: center; line-height: 1.18; color: #000000; padding-left: 8px; }
        .kop-text .org-main { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; }
        .kop-text .sub-org { font-size: 10.5pt; font-weight: bold; font-style: italic; margin-top: 1px; }
        .kop-text .ranting-main { font-size: 16.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
        .kop-text .wilayah { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
        .kop-text .sekretariat { font-size: 8.5pt; font-style: italic; margin-top: 2px; }
        .kop-divider { border-top: 2px solid #000000; border-bottom: 1px solid #000000; height: 4px; margin-bottom: 18px; position: relative; z-index: 2; }
        h3 { text-align: center; text-decoration: underline; margin: 14px 0; }
        .box { border: 1px solid #000; padding: 10px 14px; margin: 8px 0 12px; min-height: 58px; white-space: pre-line; }
        .ttd-grid { display: flex; justify-content: space-between; align-items: flex-end; position: relative; margin-top: 20px; }
        .ttd-col { width: 220px; text-align: center; position: relative; }
        .ttd-space { height: 68px; position: relative; display: flex; align-items: center; justify-content: center; }
        .stempel-center { position: absolute; left: 50%; transform: translateX(-50%); bottom: 6px; width: 96px; opacity: 0.88; mix-blend-mode: multiply; pointer-events: none; }
        @media print {
          html, body { background: #ffffff; }
          .sheet-a4 { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
        }
      </style></head><body>
      <div class="sheet-a4">
        <div class="content-body">
          <div class="kop">
            <div class="kop-logo-wrap">
              ${logoPgri ? `<img src="${logoPgri}" alt="Logo" />` : `<div class="kop-logo-placeholder">Logo<br/>PGRI</div>`}
            </div>
            <div class="kop-text">
              <div class="org-main">${escapeHtml(orgConfig.kopOrganisasi)}</div>
              <div class="sub-org">(Teachers Association Of Republic Indonesia)</div>
              <div class="ranting-main">${escapeHtml(orgConfig.kopRanting)}</div>
              <div class="wilayah">${escapeHtml(orgConfig.kopWilayah)}</div>
              <div class="sekretariat">${escapeHtml(orgConfig.kopSekretariat)}</div>
            </div>
          </div>
          <div class="kop-divider"></div>
          <h3>NOTULEN &amp; BERITA ACARA RAPAT</h3>
          <table style="width:100%; margin-bottom:14px;">
            <tr><td style="width:160px">Judul Rapat</td><td>: <strong>${escapeHtml(item.eventTitle || '(Judul Rapat Belum Diisi)')}</strong></td></tr>
            <tr><td>Tanggal / Lokasi</td><td>: ${escapeHtml(formattedTanggalHariId)} / ${escapeHtml(item.tempat)}</td></tr>
            <tr><td>Pimpinan Rapat</td><td>: ${escapeHtml(item.pimpinanRapat)}</td></tr>
            <tr><td>Notulis</td><td>: ${escapeHtml(item.notulis)}</td></tr>
            <tr><td>Jumlah Hadir</td><td>: ${item.jumlahHadir} Orang</td></tr>
          </table>
          <strong>1. Agenda &amp; Ringkasan Pembahasan:</strong>
          <div class="box">${escapeHtml(item.agenda || '-')}</div>
          <strong>2. Keputusan Rapat:</strong>
          <div class="box">${escapeHtml(item.keputusan || '(Keputusan rapat belum diisi)')}</div>
          <strong>3. Rencana Tindak Lanjut (RTL):</strong>
          <div class="box">${escapeHtml(item.tindakLanjut || '-')}</div>
        </div>
        <div>
          <div style="text-align:right; margin-bottom:6px; padding-right:24px;">Gelang, ${escapeHtml(formattedTanggalId)}</div>
          <div class="ttd-grid">
            <div class="ttd-col">
              <div>Ketua</div>
              <div>PGRI Ranting Gelang</div>
              <div class="ttd-space">
                ${ttdKetua ? `<img src="${ttdKetua}" style="max-height:${Math.round(62 * ttdKetuaScale)}px; max-width:${Math.round(150 * ttdKetuaScale)}px; object-fit:contain;" alt="TTD Ketua" />` : ''}
              </div>
              <div style="font-weight:bold; text-decoration:underline;">${escapeHtml(namaKetua)}</div>
              <div style="font-size:10pt;">NPA. ${escapeHtml(npaKetua)}</div>
            </div>
            ${stempel ? `<img src="${stempel}" class="stempel-center" style="width:${Math.round(112 * stempelScale)}px; height:${Math.round(112 * stempelScale)}px; object-fit:contain; transform:translateX(-50%) rotate(${stempelRotation}deg);" alt="Stempel" />` : ''}
            <div class="ttd-col">
              <div>Sekretaris</div>
              <div>PGRI Ranting Gelang</div>
              <div class="ttd-space">
                ${ttdSekretaris ? `<img src="${ttdSekretaris}" style="max-height:${Math.round(62 * ttdSekretarisScale)}px; max-width:${Math.round(150 * ttdSekretarisScale)}px; object-fit:contain;" alt="TTD Sekretaris" />` : ''}
              </div>
              <div style="font-weight:bold; text-decoration:underline;">${escapeHtml(namaSekretaris)}</div>
              <div style="font-size:10pt;">NPA. ${escapeHtml(npaSekretaris)}</div>
            </div>
          </div>
          <div style="margin-top:16px; display:flex; justify-content:flex-end;">
            <div style="width:96px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:8.5pt; color:#334155;">
              <img src="${qrUrl}" alt="QR Verifikasi" style="width:58px; height:58px; border:1px solid #cbd5e1; padding:3px; background:#fff; display:block; margin:0 auto;" />
              <div style="margin-top:4px; width:100%; text-align:center; line-height:1.2;">Verifikasi Surat</div>
            </div>
          </div>
        </div>
      </div>
      </body></html>`;
  };

  const handleExportNotulen = async (item: NotulenItem) => {
    const html = buildNotulenHtml(item);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    await safeDownloadBlob(blob, `Notulen_${item.eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
    onNotice('success', 'Dokumen Notulen & Berita Acara berhasil diunduh.');
  };

  if (mode === 'surat_tugas') {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* KIRI: KOTAK PENGISIAN */}
        <div className={`xl:col-span-5 rounded-2xl border p-5 space-y-4 ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold">Editor Surat Tugas / Delegasi</h2>
                <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                  Isi data di bawah, pratinjau langsung diperbarui.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStNomor(buildAutoLetterNumber('ST', agendaList.length))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 cursor-pointer transition-colors ${isDark ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-[#faf8f5] border-stone-200 text-stone-700 hover:bg-stone-100'}`}
            >
              Auto Nomor
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nomor Surat Tugas</label>
              <input value={stNomor} onChange={(e) => setStNomor(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dasar Penugasan</label>
              <textarea rows={2} value={stDasar} onChange={(e) => setStDasar(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Keperluan / Tugas</label>
              <textarea rows={2} value={stKeperluan} onChange={(e) => setStKeperluan(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Hari</label>
                <input value={stHari} onChange={(e) => setStHari(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tanggal Pelaksanaan</label>
                <input value={stTanggal} onChange={(e) => setStTanggal(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Tempat Pelaksanaan</label>
              <input value={stTempat} onChange={(e) => setStTempat(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pilih Anggota Delegasi ({selectedDelegates.length} terpilih)</label>
              <div className={`max-h-48 overflow-y-auto rounded-2xl border p-2.5 space-y-1.5 ${isDark ? 'bg-stone-950 border-stone-800' : 'bg-[#faf8f5] border-stone-200'}`}>
                {teachers.map((t) => {
                  const checked = stSelectedIds.includes(t.id);
                  return (
                    <label key={t.id} className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-xs ${checked ? (isDark ? 'bg-red-950/70 text-amber-200 border border-red-800/50' : 'bg-red-50 text-red-900 border border-red-200') : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <input type="checkbox" checked={checked} onChange={() => toggleDelegate(t.id)} className="accent-red-800 dark:accent-amber-500" />
                        <span className="font-semibold truncate">{t.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">{t.school}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass}>Tambah Nama Delegasi Manual (opsional, 1 nama per baris)</label>
              <textarea rows={2} value={stManualNama} onChange={(e) => setStManualNama(e.target.value)} placeholder="Nama delegasi tambahan..." className={inputClass} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold">Daftar Tembusan</label>
                <button
                  type="button"
                  onClick={() => setStTembusanList([...stTembusanList, ''])}
                  className="text-xs font-semibold text-red-800 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
              <div className="space-y-2">
                {stTembusanList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 text-stone-400">{idx + 1}.</span>
                    <input
                      type="text"
                      className={inputClass}
                      value={item}
                      onChange={(e) => {
                        const next = [...stTembusanList];
                        next[idx] = e.target.value;
                        setStTembusanList(next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setStTembusanList(stTembusanList.filter((_, i) => i !== idx))
                      }
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KANAN: KOTAK PREVIEW */}
        <div className={`xl:col-span-7 rounded-2xl border p-5 space-y-3 xl:sticky xl:top-4 ${cardClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-display text-xs sm:text-sm font-bold">
                <Eye className="w-4 h-4 text-red-800 dark:text-amber-400" />
                <span>Pratinjau Langsung Dokumen Surat Tugas (A4)</span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                Tampilan di bawah ini identik dengan hasil dokumen yang akan diunduh / dicetak.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = buildAutoLetterNumber('ST', archiveCount + agendaList.length);
                    setStNomor(nextNum);
                    onNotice('success', `Nomor Surat Tugas otomatis diterapkan: ${nextNum}`);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    isDark ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-[#faf8f5] border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Auto No. Surat</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const namaDelegasi = [
                    ...selectedDelegates.map((d) => d.name),
                    ...(stManualNama.trim() ? stManualNama.split('\n').map((s) => s.trim()).filter(Boolean) : [])
                  ].join(', ');
                  const msg =
                    `📄 *SURAT TUGAS PGRI RANTING GELANG*\n` +
                    `Nomor: ${stNomor}\n` +
                    `Hari/Tanggal: ${stHari}, ${stTanggal}\n` +
                    `Tempat: ${stTempat}\n` +
                    `Keperluan: ${stKeperluan}\n` +
                    `Delegasi: ${namaDelegasi || '-'}`;
                  openWhatsAppShare(msg);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan WA</span>
              </button>
              {isAdmin && onSaveArchiveItem && (
                <button
                  type="button"
                  onClick={() => {
                    const base = createInitialDraft(teachers);
                    onSaveArchiveItem({
                      ...base,
                      id: `inv-st-${Date.now()}`,
                      title: `Surat Tugas - ${stKeperluan.slice(0, 50)}`,
                      nomorSurat: stNomor,
                      perihal: 'Surat Tugas',
                      hari: stHari,
                      tanggalAcara: stTanggal,
                      tempatAcara: stTempat,
                      acara: stKeperluan,
                      paragrafPembuka: stDasar
                    });
                  }}
                  disabled={isSavingCloud}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer disabled:opacity-60"
                >
                  {isSavingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Arsip</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportSuratTugas}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-800 hover:bg-red-700 text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Unduh / Cetak Surat</span>
              </button>
            </div>
          </div>
          <div className={`rounded-2xl overflow-x-auto ${isDark ? 'bg-stone-950' : 'bg-stone-200/80'} py-4 px-2 sm:px-6`}>
            <iframe
              title="Pratinjau Surat Tugas"
              srcDoc={buildSuratTugasHtml()}
              scrolling="no"
              style={{ width: '210mm', height: '297mm' }}
              className="bg-transparent border-0 shadow-2xl mx-auto block shrink-0"
            />
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'agenda_surat') {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* KIRI: KOTAK PENGISIAN & DAFTAR AGENDA */}
        <div className="xl:col-span-5 space-y-5">
          {isAdmin && (
            <form onSubmit={handleAddAgenda} className={`rounded-2xl border p-5 space-y-3.5 ${cardClass}`}>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-red-800 dark:text-amber-400" />
                <h2 className="font-display text-sm font-bold">Catat Surat Masuk / Surat Keluar</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Jenis Surat</label>
                  <select
                    value={newAgenda.direction}
                    onChange={(e) => setNewAgenda({ ...newAgenda, direction: e.target.value as 'Masuk' | 'Keluar' })}
                    className={inputClass}
                  >
                    <option value="Keluar">Surat Keluar</option>
                    <option value="Masuk">Surat Masuk</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tanggal Surat *</label>
                  <input type="date" required value={newAgenda.tanggalSurat} onChange={(e) => setNewAgenda({ ...newAgenda, tanggalSurat: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Nomor Surat *</label>
                <input required value={newAgenda.nomorSurat} onChange={(e) => setNewAgenda({ ...newAgenda, nomorSurat: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{newAgenda.direction === 'Masuk' ? 'Pengirim Surat *' : 'Tujuan Surat *'}</label>
                <input required value={newAgenda.asalTujuan} onChange={(e) => setNewAgenda({ ...newAgenda, asalTujuan: e.target.value })} placeholder="PGRI Cabang Sumberbaru / Sekolah" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Perihal *</label>
                <input required value={newAgenda.perihal} onChange={(e) => setNewAgenda({ ...newAgenda, perihal: e.target.value })} placeholder="Undangan Rapat Kerja / Edaran Kontribusi" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tautan Arsip PDF / Drive (opsional)</label>
                <input type="url" value={newAgenda.lampiranUrl || ''} onChange={(e) => setNewAgenda({ ...newAgenda, lampiranUrl: e.target.value })} placeholder="https://drive.google.com/..." className={inputClass} />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Simpan ke Buku Agenda</span>
                </button>
              </div>
            </form>
          )}

          <div className={`rounded-2xl border p-5 space-y-3.5 ${cardClass}`}>
            <div className="flex flex-col gap-2.5">
              <h3 className="font-display font-bold text-sm">Daftar Buku Agenda Surat ({filteredAgenda.length})</h3>
              <div className="flex flex-wrap items-center gap-2">
                {(['Semua', 'Masuk', 'Keluar'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setAgendaFilter(dir)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      agendaFilter === dir
                        ? 'bg-red-800 text-white'
                        : isDark ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={agendaSearch}
                    onChange={(e) => setAgendaSearch(e.target.value)}
                    placeholder="Cari nomor / perihal..."
                    className={`w-full pl-8 pr-3 py-1 rounded-lg border text-xs focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-950 border-stone-800 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                  />
                </div>
              </div>
            </div>

            {filteredAgenda.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">Belum ada catatan surat di Buku Agenda.</p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredAgenda.map((item) => (
                  <div key={item.id} className={`p-3.5 rounded-2xl border flex items-start justify-between gap-2.5 ${isDark ? 'bg-stone-950/60 border-stone-800' : 'bg-[#faf8f5] border-stone-200/80'}`}>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          item.direction === 'Masuk'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-800/15 text-red-800 dark:bg-amber-500/15 dark:text-amber-300'
                        }`}>
                          {item.direction}
                        </span>
                        <span className="font-mono text-[11px] font-bold truncate">{item.nomorSurat}</span>
                      </div>
                      <p className="font-bold text-xs">{item.perihal}</p>
                      <p className="text-[11px] text-stone-400">
                        {item.tanggalSurat} • {item.direction === 'Masuk' ? 'Dari:' : 'Kepada:'} {item.asalTujuan}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isSafeHttpUrl(item.lampiranUrl) && (
                        <a
                          href={item.lampiranUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          title="Buka Lampiran"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAgenda(item.id)}
                          className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/15 cursor-pointer"
                          title="Hapus catatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KANAN: KOTAK PREVIEW */}
        <div className={`xl:col-span-7 rounded-2xl border p-5 space-y-3 xl:sticky xl:top-4 ${cardClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-display text-xs sm:text-sm font-bold">
                <Eye className="w-4 h-4 text-red-800 dark:text-amber-400" />
                <span>Pratinjau Langsung Buku Agenda Surat (A4)</span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                Tampilan rekap mengikuti filter ({agendaFilter}) dan pencarian aktif.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = buildAutoLetterNumber(newAgenda.direction === 'Masuk' ? 'BA' : 'Und', agendaList.length);
                    setNewAgenda((prev) => ({ ...prev, nomorSurat: nextNum }));
                    onNotice('success', `Nomor surat otomatis diterapkan pada form agenda: ${nextNum}`);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    isDark ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-[#faf8f5] border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Auto No. Surat</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const summary = filteredAgenda
                    .slice(0, 10)
                    .map((a, idx) => `${idx + 1}. [${a.direction}] ${a.nomorSurat} - ${a.perihal} (${a.tanggalSurat})`)
                    .join('\n');
                  const msg =
                    `📚 *REKAP BUKU AGENDA SURAT (${agendaFilter.toUpperCase()})*\n` +
                    `PGRI Ranting Gelang • Total: ${filteredAgenda.length} Surat\n\n` +
                    `${summary || 'Belum ada data surat.'}`;
                  openWhatsAppShare(msg);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan WA</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const blob = new Blob([buildAgendaRekapHtml()], { type: 'text/html;charset=utf-8' });
                  await safeDownloadBlob(blob, `Buku_Agenda_Surat_${agendaFilter}.html`);
                  onNotice('success', 'Dokumen Rekap Buku Agenda Surat berhasil diunduh.');
                }}
                className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Unduh Rekap Agenda</span>
              </button>
            </div>
          </div>
          <div className={`rounded-2xl overflow-x-auto ${isDark ? 'bg-stone-950' : 'bg-stone-200/80'} py-4 px-2 sm:px-6`}>
            <iframe
              title="Pratinjau Buku Agenda Surat"
              srcDoc={buildAgendaRekapHtml()}
              scrolling="no"
              style={{ width: '210mm', height: '297mm' }}
              className="bg-transparent border-0 shadow-2xl mx-auto block shrink-0"
            />
          </div>
        </div>
      </div>
    );
  }

  const activePreviewNotulen = notulenList.find((n) => n.id === previewNotulenId) || null;

  // mode === 'notulen'
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* KIRI: KOTAK PENGISIAN & ARSIP */}
      <div className="xl:col-span-5 space-y-5">
        {isAdmin && (
          <form onSubmit={handleAddNotulen} className={`rounded-2xl border p-5 space-y-3.5 ${cardClass}`}>
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-red-800 dark:text-amber-400" />
              <h2 className="font-display text-sm font-bold">Buat Notulen &amp; Berita Acara Rapat</h2>
            </div>

            <div>
              <label className={labelClass}>Tautkan dari Jadwal Kegiatan (Auto Jumlah Hadir)</label>
              <select value={notulenForm.eventId} onChange={(e) => handleSelectEventForNotulen(e.target.value)} className={inputClass}>
                <option value="">-- Rapat Baru / Manual --</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>{evt.title} ({evt.date})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Judul Rapat / Kegiatan *</label>
                <input required value={notulenForm.eventTitle} onChange={(e) => setNotulenForm({ ...notulenForm, eventTitle: e.target.value })} placeholder="Rapat Pengurus PGRI" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tanggal Pelaksanaan *</label>
                <input type="date" required value={notulenForm.tanggal} onChange={(e) => setNotulenForm({ ...notulenForm, tanggal: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Lokasi</label>
                <input value={notulenForm.tempat} onChange={(e) => setNotulenForm({ ...notulenForm, tempat: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Jumlah Hadir (Orang)</label>
                <input type="number" min={0} value={notulenForm.jumlahHadir} onChange={(e) => setNotulenForm({ ...notulenForm, jumlahHadir: Number(e.target.value) || 0 })} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Pimpinan Rapat</label>
              <input value={notulenForm.pimpinanRapat} onChange={(e) => setNotulenForm({ ...notulenForm, pimpinanRapat: e.target.value })} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Agenda &amp; Ringkasan Pembahasan</label>
              <textarea rows={2} value={notulenForm.agenda} onChange={(e) => setNotulenForm({ ...notulenForm, agenda: e.target.value })} className={inputClass} placeholder="Poin-poin pembahasan rapat..." />
            </div>
            <div>
              <label className={labelClass}>Keputusan Rapat *</label>
              <textarea required rows={3} value={notulenForm.keputusan} onChange={(e) => setNotulenForm({ ...notulenForm, keputusan: e.target.value })} className={inputClass} placeholder="1. Menyepakati program kerja HGN...&#10;2. Penyesuaian jadwal..." />
            </div>
            <div>
              <label className={labelClass}>Rencana Tindak Lanjut (RTL)</label>
              <textarea rows={2} value={notulenForm.tindakLanjut} onChange={(e) => setNotulenForm({ ...notulenForm, tindakLanjut: e.target.value })} className={inputClass} placeholder="Penanggung jawab & target waktu pelaksanaan..." />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Plus className="w-4 h-4" />
                <span>Simpan Notulen Rapat</span>
              </button>
            </div>
          </form>
        )}

        <div className={`rounded-2xl border p-5 space-y-3.5 ${cardClass}`}>
          <h3 className="font-display font-bold text-sm">Arsip Notulen &amp; Berita Acara ({notulenList.length})</h3>
          {notulenList.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">Belum ada arsip notulen rapat.</p>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {notulenList.map((item) => (
                <div key={item.id} className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-stone-950/60 border-stone-800' : 'bg-[#faf8f5] border-stone-200/80'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs truncate">{item.eventTitle}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.tanggal}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.tempat}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.jumlahHadir} Hadir</span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                    <strong>Keputusan:</strong> {item.keputusan}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const msg =
                          `📝 *RINGKASAN NOTULEN RAPAT PGRI RANTING GELANG*\n` +
                          `📌 ${item.eventTitle}\n` +
                          `📅 ${item.tanggal} • 📍 ${item.tempat} • 👥 ${item.jumlahHadir} Hadir\n\n` +
                          `*Keputusan Rapat:*\n${item.keputusan}\n\n` +
                          `${item.tindakLanjut ? `*Tindak Lanjut:*\n${item.tindakLanjut}` : ''}`;
                        openWhatsAppShare(msg);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewNotulenId(previewNotulenId === item.id ? null : item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        previewNotulenId === item.id
                          ? 'bg-red-800 text-white'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>{previewNotulenId === item.id ? 'Draft Form' : 'Pratinjau'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportNotulen(item)}
                      className="px-2.5 py-1 rounded-lg bg-red-800/15 text-red-800 dark:bg-red-950/60 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Cetak</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KANAN: KOTAK PREVIEW */}
      <div className={`xl:col-span-7 rounded-2xl border p-5 space-y-3 xl:sticky xl:top-4 ${cardClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 font-display text-xs sm:text-sm font-bold">
              <Eye className="w-4 h-4 text-red-800 dark:text-amber-400" />
              <span>
                Pratinjau Langsung Notulen &amp; Berita Acara{' '}
                {activePreviewNotulen ? '(Arsip Terpilih)' : '(Draft Form)'}
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Tampilan dokumen resmi A4 diperbarui secara otomatis saat Anda mengetik.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activePreviewNotulen && (
              <button
                type="button"
                onClick={() => setPreviewNotulenId(null)}
                className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  isDark ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-700'
                }`}
              >
                Kembali ke Draft
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  const nextNum = buildAutoLetterNumber('BA', archiveCount + notulenList.length);
                  setNotulenForm((prev) => ({
                    ...prev,
                    eventTitle: prev.eventTitle.includes('No.')
                      ? prev.eventTitle.replace(/\(No\..*?\)/, `(No. ${nextNum})`)
                      : `${prev.eventTitle || 'Berita Acara Rapat'} (No. ${nextNum})`
                  }));
                  onNotice('success', `Nomor Berita Acara otomatis diterapkan: ${nextNum}`);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                  isDark ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-[#faf8f5] border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Auto No. Surat</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const target = activePreviewNotulen || notulenForm;
                const msg =
                  `📝 *RINGKASAN NOTULEN RAPAT PGRI RANTING GELANG*\n` +
                  `📌 ${target.eventTitle || 'Rapat Koordinasi'}\n` +
                  `📅 ${target.tanggal} • 📍 ${target.tempat} • 👥 ${target.jumlahHadir} Hadir\n\n` +
                  `*Keputusan Rapat:*\n${target.keputusan || '-'}\n\n` +
                  `${target.tindakLanjut ? `*Tindak Lanjut:*\n${target.tindakLanjut}` : ''}`;
                openWhatsAppShare(msg);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan WA</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const target = activePreviewNotulen || notulenForm;
                const blob = new Blob([buildNotulenHtml(target)], { type: 'text/html;charset=utf-8' });
                await safeDownloadBlob(blob, `Notulen_${(target.eventTitle || 'Rapat').replace(/[^a-zA-Z0-9]/g, '_')}.html`);
                onNotice('success', 'Dokumen Notulen & Berita Acara berhasil diunduh.');
              }}
              className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Notulen</span>
            </button>
          </div>
        </div>
        <div className={`rounded-2xl overflow-x-auto ${isDark ? 'bg-stone-950' : 'bg-stone-200/80'} py-4 px-2 sm:px-6`}>
          <iframe
            title="Pratinjau Notulen & Berita Acara"
            srcDoc={buildNotulenHtml(activePreviewNotulen || notulenForm)}
            scrolling="no"
            style={{ width: '210mm', height: '297mm' }}
            className="bg-transparent border-0 shadow-2xl mx-auto block shrink-0"
          />
        </div>
      </div>
    </div>
  );
};

export const BuatUndangan: React.FC<BuatUndanganProps> = ({
  activeRole = 'guru',
  teachers = [],
  events = [],
  attendanceList = [],
  theme
}) => {
  const isAdmin = activeRole === 'admin';
  const [isDark, setIsDark] = useState(() => {
    if (theme) return theme === 'dark';
    return typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false;
  });

  useEffect(() => {
    if (theme) {
      setIsDark(theme === 'dark');
    }
  }, [theme]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [assets, setAssets] = useState<OrgAssets>(() => readAssetsFromSettings());
  const [draft, setDraft] = useState<InvitationData>(() => createInitialDraft(teachers));

  // Arsip Undangan (tersimpan di Firestore `kombel_data/invitations` & localStorage)
  const [savedInvitations, setSavedInvitations] = useState<InvitationData[]>(() => {
    try {
      const raw = localStorage.getItem(INVITATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [viewMode, setViewMode] = useState<'editor' | 'surat_tugas' | 'agenda_surat' | 'notulen'>('editor');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isSyncingArchive, setIsSyncingArchive] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Collapsible sections in editor
  const [openSection, setOpenSection] = useState<'surat' | 'acara' | 'ttd'>('surat');

  // Sinkronisasi aset & kepengurusan dari localStorage / settings/global
  const refreshOrgDataFromMenus = async (fetchCloudIfMissing = false) => {
    let currentAssets = readAssetsFromSettings();

    if (
      fetchCloudIfMissing &&
      (!currentAssets.logoPgri || !currentAssets.ttdKetua || !currentAssets.logoStempel)
    ) {
      try {
        const docRef = doc(db, 'settings', 'global');
        let snap;
        try {
          snap = await getDocFromServer(docRef);
        } catch {
          snap = await getDoc(docRef);
        }
        if (snap && snap.exists()) {
          const cloudData = snap.data();
          Object.entries(cloudData).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              try {
                localStorage.setItem(k, String(v));
              } catch {}
            }
          });
          currentAssets = readAssetsFromSettings();
        }
      } catch (err) {
        console.warn('Info sinkron aset pengaturan:', err);
      }
    }

    setAssets(currentAssets);
    const signers = readSignersFromKepengurusan();
    const latestNpa = loadSavedNpa();
    setDraft((prev) => ({
      ...prev,
      ketuaNama: signers.ketuaNama,
      sekretarisNama: signers.sekretarisNama,
      ketuaNpa: latestNpa.ketuaNpa,
      sekretarisNpa: latestNpa.sekretarisNpa
    }));
  };

  useEffect(() => {
    refreshOrgDataFromMenus(true);
    const onSettingsChanged = () => {
      setAssets(readAssetsFromSettings());
    };
    window.addEventListener('storage', onSettingsChanged);
    window.addEventListener('kombel-settings-updated', onSettingsChanged);
    return () => {
      window.removeEventListener('storage', onSettingsChanged);
      window.removeEventListener('kombel-settings-updated', onSettingsChanged);
    };
  }, []);

  // Tarik arsip undangan, agenda surat, & notulen rapat dari Firebase saat menu dibuka (cooldown 60 detik + cek versi ringan)
  useEffect(() => {
    let isMounted = true;
    const loadCloudArchive = async () => {
      try {
        const lastSync = sessionStorage.getItem('pgri_eoffice_sync_ts');
        if (lastSync && Date.now() - Number(lastSync) < 60000) {
          return;
        }
      } catch {}

      setIsSyncingArchive(true);
      try {
        const cloudVersions = await fetchCloudVersions(45000);
        if (!isMounted) return;

        const canReadProtected = Boolean(auth.currentUser && auth.currentUser.emailVerified);
        const fetchInv = canReadProtected && shouldFetchByVersion('invitations', cloudVersions);
        const fetchAgenda = canReadProtected && shouldFetchByVersion('suratAgenda', cloudVersions);
        const fetchNotulen = shouldFetchByVersion('notulen', cloudVersions);

        const [invRes, agendaRes, notulenRes] = await Promise.allSettled([
          fetchInv ? syncFromFirebase('invitations') : Promise.resolve(null),
          fetchAgenda ? syncFromFirebase('suratAgenda') : Promise.resolve(null),
          fetchNotulen ? syncFromFirebase('notulen') : Promise.resolve(null)
        ]);

        if (!isMounted) return;

        if (fetchInv && invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
          setSavedInvitations(invRes.value);
          try {
            localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invRes.value));
          } catch {}
          markLocalVersionSynced('invitations', cloudVersions);
        }

        let updatedSubPanels = false;
        if (fetchAgenda && agendaRes.status === 'fulfilled' && Array.isArray(agendaRes.value)) {
          try {
            localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendaRes.value));
            updatedSubPanels = true;
          } catch {}
          markLocalVersionSynced('suratAgenda', cloudVersions);
        }

        if (fetchNotulen && notulenRes.status === 'fulfilled' && Array.isArray(notulenRes.value)) {
          try {
            localStorage.setItem(NOTULEN_STORAGE_KEY, JSON.stringify(notulenRes.value));
            updatedSubPanels = true;
          } catch {}
          markLocalVersionSynced('notulen', cloudVersions);
        }

        if (updatedSubPanels) {
          window.dispatchEvent(new Event('pgri-eoffice-synced'));
        }

        try {
          sessionStorage.setItem('pgri_eoffice_sync_ts', String(Date.now()));
        } catch {}
      } catch (e) {
        // Fallback diam-diam ke localStorage jika offline/kuota
      } finally {
        if (isMounted) setIsSyncingArchive(false);
      }
    };
    loadCloudArchive();
    const handleExternalSync = () => {
      try {
        const raw = localStorage.getItem(INVITATIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSavedInvitations(parsed);
        }
      } catch {}
    };
    window.addEventListener('pgri-eoffice-synced', handleExternalSync);
    return () => {
      isMounted = false;
      window.removeEventListener('pgri-eoffice-synced', handleExternalSync);
    };
  }, []);

  // Simpan default NPA terakhir secara lokal agar Admin tidak mengetik ulang
  useEffect(() => {
    try {
      localStorage.setItem(
        NPA_STORAGE_KEY,
        JSON.stringify({
          ketuaNpa: draft.ketuaNpa,
          sekretarisNpa: draft.sekretarisNpa
        })
      );
    } catch {}
  }, [draft.ketuaNpa, draft.sekretarisNpa]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusNotice({ type, text });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Helper cek apakah pengguna mengakses dari perangkat mobile (Ponsel / Tablet)
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Helper memuat library html2pdf khusus saat di ponsel atau fallback direct download
  const getHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).html2pdf) {
        return resolve((window as any).html2pdf);
      }
      const existingScript = document.querySelector('script[data-html2pdf="true"]') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve((window as any).html2pdf));
        existingScript.addEventListener('error', () => reject(new Error('Gagal memuat library PDF. Periksa koneksi internet Anda.')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.setAttribute('data-html2pdf', 'true');
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => {
        script.remove();
        reject(new Error('Gagal memuat library PDF. Periksa koneksi internet Anda.'));
      };
      document.head.appendChild(script);
    });
  };

  // Handler Unduh PDF (PC: Jendela Cetak bawaan browser seperti menu lain | Ponsel / Popup diblokir: Auto Download PDF)
  const handleDownloadPdf = async (targetData: InvitationData = draft) => {
    setIsGeneratingPdf(true);
    let container: HTMLDivElement | null = null;
    try {
      const freshAssets = readAssetsFromSettings();
      setAssets(freshAssets);
      const invitationHtml = buildInvitationPdfHtml(targetData, freshAssets);

      const safeTitle =
        (targetData.acara || targetData.perihal || 'Undangan_PGRI')
          .replace(/[^a-zA-Z0-9\s_-]/g, '')
          .trim()
          .replace(/\s+/g, '_') || 'Undangan_PGRI';
      const pdfFilename = `Undangan_${safeTitle}_PGRI_Ranting_Gelang.pdf`;

      // JIKA DI PC / LAPTOP: Gunakan pratinjau cetak bawaan browser seperti menu lain
      if (!isMobileDevice()) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const printHtmlContent = `
            <!DOCTYPE html>
            <html lang="id">
              <head>
                <meta charset="UTF-8" />
                <title>${escapeHtml(pdfFilename.replace(/\.pdf$/i, ''))}</title>
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 0;
                  }
                  * {
                    box-sizing: border-box;
                  }
                  html, body {
                    margin: 0;
                    padding: 0;
                    background: #ffffff;
                    color: #000000;
                    font-family: 'Times New Roman', Times, serif;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  @media print {
                    html, body {
                      width: 210mm;
                      height: 297mm;
                    }
                  }
                </style>
              </head>
              <body>
                ${invitationHtml}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                    }, 500);
                  };
                  window.onafterprint = function() {
                    window.close();
                  };
                </script>
              </body>
            </html>
          `;
          printWindow.document.open();
          printWindow.document.write(printHtmlContent);
          printWindow.document.close();
          return;
        }
      }

      // JIKA DI PONSEL (atau jika popup jendela cetak diblokir): Direct download PDF dengan html2pdf
      const html2pdf = await getHtml2Pdf();
      container = document.createElement('div');
      container.id = 'undangan-pdf-export-root';
      container.style.width = '794px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#000000';
      container.style.margin = '0';
      container.style.padding = '0';
      container.innerHTML = `
        <style data-pdf-style="true">
          * {
            box-sizing: border-box;
            font-family: 'Times New Roman', Times, serif;
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #000000;
          }
        </style>
        ${invitationHtml}
      `;

      const opt = {
        margin: [0, 0, 0, 0],
        filename: pdfFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            // Hapus stylesheet Tailwind v4 (mengandung oklch) agar html2canvas tidak gagal parsing warna
            clonedDoc
              .querySelectorAll('style:not([data-pdf-style="true"]), link[rel="stylesheet"]')
              .forEach((el) => el.remove());
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
      await safeDownloadBlob(pdfBlob, opt.filename);
      showToast('success', 'File PDF undangan utuh berhasil diunduh.');
    } catch (err: any) {
      console.error('Gagal membuat PDF undangan:', err);
      showToast('error', err?.message || 'Gagal membuat file PDF undangan.');
    } finally {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToArchive = async (customItem?: InvitationData) => {
    if (!isAdmin) return;
    setIsSavingCloud(true);
    const source = customItem || draft;
    const toSave: InvitationData = {
      ...source,
      title: source.title.trim() || `${source.perihal} - ${source.acara}`,
      updatedAt: new Date().toISOString()
    };
    const isEditingExisting = savedInvitations.some((item) => item.id === toSave.id);
    const nextCount = isEditingExisting ? savedInvitations.length : savedInvitations.length + 1;

    setSavedInvitations((prev) => {
      const exists = prev.some((item) => item.id === toSave.id);
      const updated = exists
        ? prev.map((item) => (item.id === toSave.id ? toSave : item))
        : [toSave, ...prev];
      try {
        localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (!customItem) {
      const freshNext = createInitialDraft(teachers);
      setDraft({
        ...freshNext,
        nomorSurat: buildAutoLetterNumber('Und', nextCount)
      });
    }

    try {
      const npaPayload = JSON.stringify({
        ketuaNpa: toSave.ketuaNpa,
        sekretarisNpa: toSave.sekretarisNpa
      });
      void syncSettingsToCloud({ [NPA_STORAGE_KEY]: npaPayload }, 'Default NPA Undangan');

      const res = await mutateCloudCollection<InvitationData>(
        'invitations',
        [INVITATIONS_STORAGE_KEY],
        (latest) =>
          latest.some((item) => item.id === toSave.id)
            ? latest.map((item) => (item.id === toSave.id ? toSave : item))
            : [toSave, ...latest],
        savedInvitations,
        'Arsip Undangan'
      );
      setSavedInvitations(res.items);
      showToast(
        'success',
        isEditingExisting
          ? 'Perubahan arsip undangan berhasil diperbarui.'
          : 'Undangan berhasil disimpan ke Arsip & Cloud.'
      );
    } catch {
      showToast('success', 'Undangan tersimpan di perangkat lokal.');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleDeleteArchive = async (id: string) => {
    if (!isAdmin) return;
    const nextFallback = savedInvitations.filter((item) => item.id !== id);
    setSavedInvitations((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      const res = await mutateCloudCollection<InvitationData>(
        'invitations',
        [INVITATIONS_STORAGE_KEY],
        (latest) => latest.filter((item) => item.id !== id),
        nextFallback,
        'Arsip Undangan'
      );
      setSavedInvitations(res.items);
      if (res.success) {
        showToast('success', 'Undangan dihapus dari arsip.');
      } else {
        showToast('error', res.error || 'Undangan terhapus lokal, namun gagal sinkron ke Cloud.');
      }
    } catch {
      showToast('error', 'Gagal menghapus undangan dari Cloud.');
    }
  };

  const handleCreateNewDraft = () => {
    const fresh = createInitialDraft(teachers);
    setDraft(fresh);
    setViewMode('editor');
    showToast('success', 'Formulir undangan baru siap diisi.');
  };

  const handleLoadIntoEditor = (inv: InvitationData, asDuplicate = false) => {
    if (asDuplicate) {
      setDraft({
        ...inv,
        id: `inv-${Date.now()}`,
        title: `${inv.title} (Salinan)`,
        updatedAt: new Date().toISOString()
      });
    } else {
      setDraft(inv);
    }
    if (isAdmin) {
      setViewMode('editor');
    }
  };
  
  const previewHtml = useMemo(() => buildInvitationPdfHtml(draft, assets), [draft, assets]);

  const cardClass = isDark
    ? 'bg-stone-900 border-stone-800 text-stone-100'
    : 'bg-white border-stone-200/90 text-stone-900';
  const inputClass = isDark
    ? 'w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-700/50 focus:border-red-700'
    : 'w-full px-3.5 py-2.5 rounded-xl bg-[#faf8f5] border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-700/35 focus:border-red-700';
  const labelClass = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`;

  return (
    <div className="space-y-6">
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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-1 ${
                isAdmin ? 'text-red-800 dark:text-amber-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                Tata Persuratan • {isAdmin ? 'Mode Admin / Pengurus' : 'Mode Baca Guru'}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">E-Office &amp; Pembuatan Undangan</h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                Buat undangan resmi, Surat Tugas, Buku Agenda Surat Masuk/Keluar, serta Notulen Rapat PGRI Ranting Gelang.
              </p>
            </div>
          </div>

          </div>

        {/* Switcher Tab Internal */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('agenda_surat')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'agenda_surat'
                ? 'bg-red-800 text-white shadow-sm'
                : isDark
                  ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Agenda Surat
          </button>
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'editor'
                ? 'bg-red-800 text-white shadow-sm'
                : isDark
                  ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Undangan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('surat_tugas')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'surat_tugas'
                ? 'bg-red-800 text-white shadow-sm'
                : isDark
                  ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Surat Tugas
          </button>
          <button
            type="button"
            onClick={() => setViewMode('notulen')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'notulen'
                ? 'bg-red-800 text-white shadow-sm'
                : isDark
                  ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Notulen
          </button>
        </div>
      </div>

      {/* Toast Pemberitahuan */}
      {statusNotice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center gap-2.5 ${
            statusNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Peringatan jika Guru membuka menu */}
      {!isAdmin && (
        <div className={`rounded-2xl border p-4 flex items-center gap-3 text-xs ${isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Pembuatan dan pengeditan dokumen hanya dapat dilakukan melalui <strong>Akses Pengurus (Admin)</strong>. Anda dapat melihat pratinjau dan mengunduh dokumen yang telah diterbitkan pada daftar arsip di bawah ini.
          </span>
        </div>
      )}

      {/* MODE EDITOR + ARSIP TERPADU + LIVE PREVIEW */}
      {viewMode === 'editor' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Form Pengisian Data Admin & Daftar Arsip Undangan */}
          <div className="xl:col-span-5 space-y-5">
            {isAdmin && (
              <div className={`rounded-2xl border p-5 space-y-4 ${cardClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-red-800 dark:text-amber-400" />
                    <h2 className="font-display text-sm font-bold">
                      {savedInvitations.some((item) => item.id === draft.id)
                        ? 'Edit Arsip Undangan'
                        : 'Buat Undangan Resmi Baru'}
                    </h2>
                  </div>
                  {savedInvitations.some((item) => item.id === draft.id) && (
                    <button
                      type="button"
                      onClick={handleCreateNewDraft}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                        isDark ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Buat Baru
                    </button>
                  )}
                </div>

                {/* Judul Arsip */}
                <div>
                  <label className={labelClass}>Judul Dokumen (Untuk Arsip Internal)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Misal: Undangan Lomba Bola Voli HGN 2026"
                  />
                </div>

                {/* Accordion 1: Nomor, Tanggal & Tujuan */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-stone-800 bg-stone-950/40' : 'border-stone-200 bg-[#faf8f5]'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(openSection === 'surat' ? 'acara' : 'surat')}
                    className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    <span>1. Nomor Surat, Tanggal &amp; Tujuan</span>
                    {openSection === 'surat' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openSection === 'surat' && (
                    <div className={`p-4 pt-2 border-t space-y-3.5 ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-8">
                          <label className={labelClass}>Nomor Surat</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={draft.nomorSurat}
                            onChange={(e) => setDraft({ ...draft, nomorSurat: e.target.value })}
                          />
                        </div>
                        <div className="col-span-4">
                          <label className={labelClass}>Lampiran</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={draft.lampiranText}
                            onChange={(e) => setDraft({ ...draft, lampiranText: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Tempat &amp; Tanggal Surat</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={draft.tanggalSurat}
                          onChange={(e) => setDraft({ ...draft, tanggalSurat: e.target.value })}
                          placeholder="Jember, 16 November 2026"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold">Daftar Tujuan (Kepada Yth.)</label>
                          <button
                            type="button"
                            onClick={() => setDraft({ ...draft, kepadaList: [...draft.kepadaList, ''] })}
                            className="text-xs font-semibold text-red-800 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Baris
                          </button>
                        </div>
                        <div className="space-y-2">
                          {draft.kepadaList.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                className={inputClass}
                                value={item}
                                onChange={(e) => {
                                  const next = [...draft.kepadaList];
                                  next[idx] = e.target.value;
                                  setDraft({ ...draft, kepadaList: next });
                                }}
                              />
                              {draft.kepadaList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft({
                                      ...draft,
                                      kepadaList: draft.kepadaList.filter((_, i) => i !== idx)
                                    })
                                  }
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 2: Isi Surat & Rincian Acara */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-stone-800 bg-stone-950/40' : 'border-stone-200 bg-[#faf8f5]'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(openSection === 'acara' ? 'ttd' : 'acara')}
                    className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    <span>2. Isi Surat &amp; Rincian Pelaksanaan</span>
                    {openSection === 'acara' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openSection === 'acara' && (
                    <div className={`p-4 pt-2 border-t space-y-3.5 ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
                      <div>
                        <label className={labelClass}>
                          Paragraf Pembuka <span className="font-normal text-stone-400">(gunakan **teks** untuk huruf tebal)</span>
                        </label>
                        <textarea
                          rows={4}
                          className={inputClass}
                          value={draft.paragrafPembuka}
                          onChange={(e) => setDraft({ ...draft, paragrafPembuka: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Hari</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={draft.hari}
                            onChange={(e) => setDraft({ ...draft, hari: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Tanggal Pelaksanaan</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={draft.tanggalAcara}
                            onChange={(e) => setDraft({ ...draft, tanggalAcara: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Pukul</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={draft.pukul}
                            onChange={(e) => setDraft({ ...draft, pukul: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Tempat</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={draft.tempatAcara}
                            onChange={(e) => setDraft({ ...draft, tempatAcara: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Catatan</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={draft.acara}
                          onChange={(e) => setDraft({ ...draft, acara: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 3: Penandatangan, NPA & Tembusan */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-stone-800 bg-stone-950/40' : 'border-stone-200 bg-[#faf8f5]'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(openSection === 'ttd' ? 'surat' : 'ttd')}
                    className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    <span>3. Penandatangan (Kepengurusan) &amp; Tembusan</span>
                    {openSection === 'ttd' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openSection === 'ttd' && (
                    <div className={`p-4 pt-2 border-t space-y-4 ${isDark ? 'border-stone-800' : 'border-stone-200/80'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold">Daftar Tembusan</label>
                          <button
                            type="button"
                            onClick={() => setDraft({ ...draft, tembusanList: [...draft.tembusanList, ''] })}
                            className="text-xs font-semibold text-red-800 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah
                          </button>
                        </div>
                        <div className="space-y-2">
                          {draft.tembusanList.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold w-5 text-stone-400">{idx + 1}.</span>
                              <input
                                type="text"
                                className={inputClass}
                                value={item}
                                onChange={(e) => {
                                  const next = [...draft.tembusanList];
                                  next[idx] = e.target.value;
                                  setDraft({ ...draft, tembusanList: next });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft({
                                    ...draft,
                                    tembusanList: draft.tembusanList.filter((_, i) => i !== idx)
                                  })
                                }
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tombol Simpan Merah PGRI */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveToArchive()}
                    disabled={isSavingCloud}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors"
                  >
                    {isSavingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>
                      {savedInvitations.some((item) => item.id === draft.id)
                        ? 'Perbarui Arsip Undangan'
                        : 'Simpan ke Arsip Undangan'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Daftar Arsip Undangan Tersimpan di Kolom Kiri */}
            <div className={`rounded-2xl border p-5 space-y-3.5 ${cardClass}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-sm">Arsip Undangan Tersimpan ({savedInvitations.length})</h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleCreateNewDraft}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-800/15 text-red-800 dark:bg-amber-500/15 dark:text-amber-300 hover:bg-red-800/25 dark:hover:bg-amber-500/25 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Draft Baru
                  </button>
                )}
              </div>

              {isSyncingArchive ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-stone-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat arsip undangan...
                </div>
              ) : savedInvitations.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  {isAdmin
                    ? 'Belum ada undangan tersimpan di arsip. Isi formulir di atas lalu klik "Simpan ke Arsip Undangan".'
                    : 'Belum ada surat undangan yang diterbitkan oleh Pengurus.'}
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {savedInvitations.map((inv) => {
                    const isActiveDraft = draft.id === inv.id;
                    return (
                      <div
                        key={inv.id}
                        className={`p-3.5 rounded-2xl border space-y-2 ${
                          isActiveDraft
                            ? isDark
                              ? 'bg-red-950/35 border-red-700/60'
                              : 'bg-red-50/80 border-red-300'
                            : isDark
                              ? 'bg-stone-950/60 border-stone-800'
                              : 'bg-[#faf8f5] border-stone-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs truncate">{inv.title || inv.acara}</h4>
                            <p className="font-mono text-[11px] text-stone-400 truncate mt-0.5">{inv.nomorSurat}</p>
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              {inv.hari}, {inv.tanggalAcara} • {inv.tempatAcara}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleLoadIntoEditor(inv, false)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              isActiveDraft
                                ? 'bg-red-800 text-white'
                                : 'bg-red-800/15 text-red-800 dark:bg-amber-500/15 dark:text-amber-300 hover:bg-red-800/25'
                            }`}
                          >
                            {isAdmin ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{isAdmin ? 'Buka & Edit' : 'Lihat Surat'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(inv)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600/15 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleLoadIntoEditor(inv, true)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                  isDark ? 'bg-stone-800 text-stone-300' : 'bg-stone-200/80 text-stone-700'
                                }`}
                              >
                                <Copy className="w-3 h-3" />
                                <span>Duplikat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteArchive(inv.id)}
                                className="p-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/15 ml-auto cursor-pointer"
                                title="Hapus arsip undangan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Live Preview A4 */}
          <div className="xl:col-span-7">
            <div className={`rounded-2xl border p-4 sm:p-5 ${cardClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-sm font-bold flex items-center gap-2">
                    <Printer className="w-4 h-4 text-red-800 dark:text-amber-400" />
                    Pratinjau Langsung Dokumen PDF (1 Halaman A4)
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    Tampilan di bawah ini identik dengan hasil file PDF utuh yang akan diunduh.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextNum = buildAutoLetterNumber('Und', savedInvitations.length);
                        setDraft((prev) => ({ ...prev, nomorSurat: nextNum }));
                        showToast('success', `Nomor surat otomatis diterapkan: ${nextNum}`);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                        isDark ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-[#faf8f5] border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                      title="Buat nomor surat otomatis sesuai format PGRI Ranting"
                    >
                      <Hash className="w-3.5 h-3.5" />
                      Auto No. Surat
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const msg =
                        `✉️ *UNDANGAN RESMI PGRI RANTING GELANG*\n` +
                        `Nomor: ${draft.nomorSurat}\n` +
                        `Perihal: *${draft.perihal}*\n\n` +
                        `📅 Hari/Tanggal: ${draft.hari}, ${draft.tanggalAcara}\n` +
                        `⏰ Waktu: ${draft.pukul}\n` +
                        `📍 Tempat: ${draft.tempatAcara}\n` +
                        `📌 Agenda: ${draft.acara}\n\n` +
                        `Mohon kehadiran Bapak/Ibu tepat waktu. Terima kasih.`;
                      openWhatsAppShare(msg);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Bagikan WA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(draft)}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-800 hover:bg-red-700 text-white cursor-pointer disabled:opacity-60 transition-colors"
                  >
                    {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Unduh PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="flex flex-col items-center gap-6 min-w-fit">
                  <div
                    className="shadow-2xl border border-stone-300 rounded-sm overflow-hidden bg-white"
                    style={{ width: '210mm' }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* SUB-MODUL E-OFFICE: SURAT TUGAS, BUKU AGENDA SURAT, NOTULEN RAPAT */}
      {(viewMode === 'surat_tugas' || viewMode === 'agenda_surat' || viewMode === 'notulen') && (
        <EOfficeSubPanels
          mode={viewMode}
          isAdmin={isAdmin}
          isDark={isDark}
          teachers={teachers}
          events={events}
          attendanceList={attendanceList}
          onNotice={showToast}
          onSaveArchiveItem={handleSaveToArchive}
          isSavingCloud={isSavingCloud}
          archiveCount={savedInvitations.length}
        />
      )}

      </div>
  );
};

export default BuatUndangan;
