import { OrgConfig } from '../types';
import { syncSettingsToCloud } from './sync';
import { logAuditEvent } from './auth';

export const ORG_CONFIG_STORAGE_KEY = 'org-config';

export const DEFAULT_ORG_CONFIG: OrgConfig = {
  bankName: 'Bank Jatim',
  bankAccountNumber: '0392075755',
  bankAccountHolder: 'ATIK ANDRIYATI',
  bendaharaWa: '6281515786365',
  monthlyDuesAmount: 15000,
  schools: [
    'SDN GELANG 01',
    'SDN GELANG 03',
    'SDN GELANG 04',
    'SDN GELANG 05',
    'SDN GELANG 06',
    'SDN GELANG 07',
    'SDN KALIGLAGAH 02',
    'SD NU 21 MIFTAHUL ULUM',
  ],
  kopOrganisasi: 'PERSATUAN GURU REPUBLIK INDONESIA',
  kopRanting: 'RANTING GELANG',
  kopWilayah: 'KECAMATAN SUMBERBARU - KABUPATEN JEMBER',
  kopSekretariat:
    'Sekretariat : Jl. PTPN XII Gunung Gambir Desa Gelang, Kecamatan Sumberbaru - Kabupaten Jember 68156',
  letterCodePrefix: 'PGRI.Rtg.Gelang',
  qrisImage: '',
};

export function getOrgConfig(): OrgConfig {
  if (typeof window === 'undefined') return DEFAULT_ORG_CONFIG;
  try {
    const raw = localStorage.getItem(ORG_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_ORG_CONFIG,
        ...parsed,
        schools:
          Array.isArray(parsed.schools) && parsed.schools.length > 0
            ? parsed.schools
            : DEFAULT_ORG_CONFIG.schools,
        monthlyDuesAmount:
          typeof parsed.monthlyDuesAmount === 'number' && !isNaN(parsed.monthlyDuesAmount)
            ? parsed.monthlyDuesAmount
            : DEFAULT_ORG_CONFIG.monthlyDuesAmount,
      };
    }
  } catch {}
  return DEFAULT_ORG_CONFIG;
}

export async function saveOrgConfig(config: OrgConfig) {
  const sanitized: OrgConfig = {
    bankName: (config.bankName || DEFAULT_ORG_CONFIG.bankName).trim().slice(0, 80),
    bankAccountNumber: (config.bankAccountNumber || DEFAULT_ORG_CONFIG.bankAccountNumber).trim().slice(0, 50),
    bankAccountHolder: (config.bankAccountHolder || DEFAULT_ORG_CONFIG.bankAccountHolder).trim().slice(0, 120),
    bendaharaWa: (config.bendaharaWa || DEFAULT_ORG_CONFIG.bendaharaWa).replace(/[^0-9]/g, '').slice(0, 20),
    monthlyDuesAmount: Math.max(0, Number(config.monthlyDuesAmount) || 0),
    schools: Array.from(
      new Set(
        (config.schools || [])
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      )
    ),
    kopOrganisasi: (config.kopOrganisasi || DEFAULT_ORG_CONFIG.kopOrganisasi).trim().slice(0, 140),
    kopRanting: (config.kopRanting || DEFAULT_ORG_CONFIG.kopRanting).trim().slice(0, 100),
    kopWilayah: (config.kopWilayah || DEFAULT_ORG_CONFIG.kopWilayah).trim().slice(0, 140),
    kopSekretariat: (config.kopSekretariat || DEFAULT_ORG_CONFIG.kopSekretariat).trim().slice(0, 240),
    letterCodePrefix: (config.letterCodePrefix || DEFAULT_ORG_CONFIG.letterCodePrefix).trim().slice(0, 60),
    qrisImage: typeof config.qrisImage === 'string' ? config.qrisImage.trim().slice(0, 450000) : '',
  };

  const serialized = JSON.stringify(sanitized);
  const res = await syncSettingsToCloud(
    { [ORG_CONFIG_STORAGE_KEY]: serialized },
    'Konfigurasi Organisasi PGRI'
  );
  await logAuditEvent(
    'Pengaturan Organisasi',
    'Update Konfigurasi',
    `Memperbarui rekening kas (${sanitized.bankName}), kontribusi bulanan Rp ${sanitized.monthlyDuesAmount.toLocaleString('id-ID')}, dan ${sanitized.schools.length} sekolah binaan.`
  );
  return res;
}

export function openWhatsAppShare(message: string, phoneNumber?: string) {
  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
