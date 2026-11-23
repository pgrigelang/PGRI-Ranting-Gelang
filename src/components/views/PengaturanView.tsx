import React, { useState, useEffect } from 'react';
import { Settings, Upload, Image as ImageIcon, CheckCircle, Save, RotateCw, ZoomIn, Download, UploadCloud, Loader2, AlertTriangle, X, Building2, ShieldCheck, History, UserPlus, Trash2, RefreshCw, Users, Plus, ArrowUp, ArrowDown, Database, QrCode } from 'lucide-react';
import { backupAllFirebaseData, restoreAllFirebaseData, syncSettingsToCloud } from '../../lib/sync';
import { safeDownloadBlob } from '../../lib/download';
import { PengurusRole, PengurusAssignment, AuditLogEntry, OrgConfig, PengaturanSubTab } from '../../types';
import { getOrgConfig, saveOrgConfig } from '../../lib/orgConfig';
import {
  fetchPengurusAssignments,
  savePengurusAssignment,
  removePengurusAssignment,
  fetchAuditLogs,
  getLocalAuditLogs,
  logAuditEvent,
  PENGURUS_ROLE_LABELS,
  SUPER_ADMIN_EMAIL
} from '../../lib/auth';

interface KepengurusanMember {
  role: string;
  name: string;
  nip: string;
  instansi: string;
  wa: string;
}

const DEFAULT_PEMBINA: KepengurusanMember = {
  role: 'Pengawas Bina',
  name: 'Hanifatul Susmiyah, S.Pd',
  nip: '197306022002122005',
  instansi: 'Pengawas Bina Kecamatan Sumberbaru',
  wa: '6285859083645'
};

const DEFAULT_PENANGGUNG_JAWAB: KepengurusanMember[] = [
  {
    role: 'Ketua K3S',
    name: 'Ghufron Atok Urrohman, S.Pd',
    nip: '197805192014121003',
    instansi: 'Ketua Kelompok Kerja Kepala Sekolah',
    wa: '6285859342500'
  },
  {
    role: 'Ketua PGRI Cabang',
    name: 'Christian Dri Firman Widodo, S.Pd',
    nip: '198012262014121002',
    instansi: 'Ketua PGRI Cabang Kecamatan Sumberbaru',
    wa: '6281217910263'
  }
];

const DEFAULT_PENGURUS: KepengurusanMember[] = [
  { role: 'Penasehat', name: 'Semua Kepala Sekolah', nip: '-', instansi: '-', wa: '-' },
  { role: 'Ketua PGRI Ranting Gelang', name: 'Umar Ali Kusuma', nip: '198912092025211092', instansi: 'SDN GELANG 03', wa: '6288235537431' },
  { role: 'Wakil Ketua', name: 'Hartatik, S.Pd', nip: '198301072022212001', instansi: 'SDN KALIGLAGAH 02', wa: '6282245380232' },
  { role: 'Sekretaris', name: 'Adi Saiful Rizal, S.Pd', nip: '199401162025211089', instansi: 'SDN GELANG 03', wa: '6282292232649' },
  { role: 'Bendahara', name: 'Atik Andriyati, S.Pd', nip: '197701142014122002', instansi: 'SDN GELANG 06', wa: '6281515786365' },
  { role: 'Seksi Pembinaan Olahraga', name: 'Saiful Arif, S.Pd', nip: '198604122022211003', instansi: 'SDN GELANG 07', wa: '62881026888955' },
  { role: 'Seksi Pemberdayaan Perempuan', name: 'Siti Oktavia, S.Pd', nip: '197910072022212001', instansi: 'SDN GELANG 04', wa: '6285697890959' },
  { role: 'Seksi Pengembangan Profesi & Karir', name: 'Rohman, S.Pd', nip: '198904202022211002', instansi: 'SDN KALIGLAGAH 02', wa: '6282332910923' },
  { role: 'Seksi Humas', name: 'Jasuri Budianto, S.Pd', nip: '196918082022211001', instansi: 'SDN GELANG 01', wa: '6285314904015' },
  { role: 'Seksi Keagamaan', name: 'Muhammad Jupri, S.Pd.I', nip: '-', instansi: 'SD NU 21 MIFTAHUL ULUM', wa: '628817159553' }
];

const readPembinaFromStorage = (): KepengurusanMember => {
  try {
    const saved = localStorage.getItem('kombel-pembina');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          role: parsed.role || DEFAULT_PEMBINA.role,
          name: parsed.name || DEFAULT_PEMBINA.name,
          nip: parsed.nip || '-',
          instansi: parsed.instansi || '-',
          wa: parsed.wa || '-'
        };
      }
    }
  } catch {}
  return { ...DEFAULT_PEMBINA };
};

const readPenanggungJawabFromStorage = (): KepengurusanMember[] => {
  try {
    const saved = localStorage.getItem('kombel-penanggungjawab');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          role: item?.role || '',
          name: item?.name || '',
          nip: item?.nip || '-',
          instansi: item?.instansi || '-',
          wa: item?.wa || '-'
        }));
      }
    }
  } catch {}
  return DEFAULT_PENANGGUNG_JAWAB.map((item) => ({ ...item }));
};

const readPengurusFromStorage = (): KepengurusanMember[] => {
  try {
    const saved = localStorage.getItem('kombel-pengurus');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          role: item?.role || '',
          name: item?.name || '',
          nip: item?.nip || '-',
          instansi: item?.instansi || '-',
          wa: item?.wa || '-'
        }));
      }
    }
  } catch {}
  return DEFAULT_PENGURUS.map((item) => ({ ...item }));
};

const FIREBASE_KEYS = [
  'logo-pgri',
  'ttd-pengawas',
  'ttd-pengawas-size',
  'ttd-ketua',
  'ttd-ketua-size',
  'ttd-sekretaris',
  'ttd-sekretaris-size',
  'ttd-bendahara',
  'ttd-bendahara-size',
  'logo-stempel',
  'logo-stempel-size',
  'logo-stempel-rotation'
];

interface SettingUploadItemProps {
  label: string;
  id: string;
  currentImage?: string | null;
  onSettingChange: (key: string, value: string) => void;
  restricted?: boolean;
  activeRole?: string;
}

const compressImage = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const rawResult = e.target?.result as string;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
            callback(compressedBase64);
          } catch {
            callback(canvas.toDataURL('image/png', 0.8));
          }
        } else {
          callback(rawResult);
        }
      } catch {
        callback(rawResult);
      }
    };
    img.onerror = () => {
      callback(rawResult);
    };
    img.src = rawResult;
  };
  reader.readAsDataURL(file);
};

const SettingUploadItem: React.FC<SettingUploadItemProps> = ({ label, id, currentImage, onSettingChange, restricted, activeRole }) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (compressedBase64) => {
        setPreview(compressedBase64);
        onSettingChange(id, compressedBase64);
      });
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-200 [.dark_&]:border-stone-800 dark:border-stone-800 rounded-2xl bg-[#faf8f5] [.dark_&]:bg-stone-900/60 dark:bg-stone-900/60 relative overflow-hidden group transition-all ${restricted && activeRole !== 'admin' ? 'cursor-not-allowed opacity-80' : ''}`}>
      {restricted && activeRole !== 'admin' && (
        <div 
          className="absolute inset-0 z-50 bg-transparent cursor-not-allowed" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}
      <label 
        htmlFor={restricted && activeRole !== 'admin' ? undefined : id} 
        className="absolute inset-0 cursor-pointer z-10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          if (restricted && activeRole !== 'admin') {
            e.preventDefault();
          }
        }}
      />
      <input 
        id={id} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange} 
      />
      
      {preview ? (
        <div className="relative w-32 h-32 mb-4 rounded-xl overflow-hidden shadow-sm">
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <Upload className="w-6 h-6 text-white" />
          </div>
        </div>
      ) : (
        <div className={`w-20 h-20 mb-4 rounded-xl flex items-center justify-center transition-colors border ${isHovered ? 'bg-red-50 border-red-200 text-red-800 [.dark_&]:bg-red-950/60 dark:bg-red-950/60 [.dark_&]:border-red-800/60 dark:border-red-800/60 [.dark_&]:text-amber-400 dark:text-amber-400' : 'bg-stone-100 border-stone-200 text-stone-400 [.dark_&]:bg-stone-800 dark:bg-stone-800 [.dark_&]:border-stone-700 dark:border-stone-700'}`}>
          <ImageIcon className="w-8 h-8" />
        </div>
      )}
      
      <p className="font-display font-bold text-sm text-stone-800 [.dark_&]:text-white dark:text-white text-center">{label}</p>
      <p className="text-xs text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400 mt-1">Klik untuk unggah</p>
    </div>
  );
};

interface AdvancedSettingUploadItemProps {
  label: string;
  id: string;
  currentImage?: string | null;
  currentSize?: number;
  currentRotation?: number;
  onSettingChange: (key: string, value: string) => void;
  type: 'stempel' | 'ttd';
  restricted?: boolean;
  activeRole?: string;
}

const AdvancedSettingUploadItem: React.FC<AdvancedSettingUploadItemProps> = ({ 
  label, id, currentImage, currentSize, currentRotation, 
  onSettingChange, type, restricted, activeRole 
}) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const size = typeof currentSize === 'number' && !isNaN(currentSize) ? currentSize : 100;
  const rotation = typeof currentRotation === 'number' && !isNaN(currentRotation) ? currentRotation : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (compressedBase64) => {
        setPreview(compressedBase64);
        onSettingChange(id, compressedBase64);
      });
    }
  };

  return (
    <div className={`flex flex-col p-6 border-2 border-dashed border-stone-200 [.dark_&]:border-stone-800 dark:border-stone-800 rounded-2xl bg-[#faf8f5] [.dark_&]:bg-stone-900/60 dark:bg-stone-900/60 relative ${restricted && activeRole !== 'admin' ? 'cursor-not-allowed opacity-80' : ''}`}>
      {restricted && activeRole !== 'admin' && (
        <div 
          className="absolute inset-0 z-50 bg-transparent cursor-not-allowed" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}
      
      {/* Area Upload (Atas) */}
      <div className="flex items-center justify-center relative w-full h-32 mb-4 group">
        <label 
          htmlFor={restricted && activeRole !== 'admin' ? undefined : id} 
          className="absolute inset-0 cursor-pointer z-10"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            if (restricted && activeRole !== 'admin') {
              e.preventDefault();
            }
          }}
        />
        <input 
          id={id} 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange} 
        />
        
        {preview ? (
          <div className="relative w-32 h-32 rounded-xl shadow-sm flex items-center justify-center bg-transparent">
            <img 
              src={preview} 
              alt={label} 
              className="object-contain transition-all" 
              style={{ 
                width: '100%', 
                height: '100%', 
                transform: `scale(${size / 100}) rotate(${rotation}deg)`
              }} 
            />
            <div className={`absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'} pointer-events-none z-10`}>
              <Upload className="w-6 h-6 text-white" />
            </div>
          </div>
        ) : (
          <div className={`w-20 h-20 rounded-xl flex items-center justify-center transition-colors border ${isHovered ? 'bg-red-50 border-red-200 text-red-800 [.dark_&]:bg-red-950/60 dark:bg-red-950/60 [.dark_&]:border-red-800/60 dark:border-red-800/60 [.dark_&]:text-amber-400 dark:text-amber-400' : 'bg-stone-100 border-stone-200 text-stone-400 [.dark_&]:bg-stone-800 dark:bg-stone-800 [.dark_&]:border-stone-700 dark:border-stone-700'}`}>
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
      </div>
      
      <div className="text-center mb-5 relative z-10 pointer-events-none">
        <p className="font-display font-bold text-sm text-stone-800 [.dark_&]:text-white dark:text-white">{label}</p>
        <p className="text-xs text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400 mt-1">Klik gambar untuk mengubah</p>
      </div>

      {/* Area Kontrol */}
      <div className="flex items-center justify-between w-full gap-6 pt-4 border-t border-stone-200/80 [.dark_&]:border-stone-800 dark:border-stone-800">
        
        {type === 'stempel' && (
          <div className="w-full flex flex-col gap-2">
            <span className="text-[10px] font-bold text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400 uppercase tracking-wider flex items-center justify-center gap-1.5 font-mono">
              <ZoomIn className="w-3.5 h-3.5" />
              Ukuran ({size}%)
            </span>
            <input type="range" min="30" max="250" value={size} onChange={(e) => {
              if (restricted && activeRole !== 'admin') { return; }
              onSettingChange(`${id}-size`, e.target.value); 
            }} className="w-full z-20 relative cursor-pointer accent-red-800 dark:accent-amber-500" />
          </div>
        )}

        {type === 'ttd' && (
          <div className="w-full flex flex-col gap-2">
            <span className="text-[10px] font-bold text-stone-500 [.dark_&]:text-stone-400 dark:text-stone-400 uppercase tracking-wider flex items-center justify-center gap-1.5 font-mono">
              <ZoomIn className="w-3.5 h-3.5" />
              Ukuran ({size}%)
            </span>
            <input type="range" min="30" max="250" value={size} onChange={(e) => {
              if (restricted && activeRole !== 'admin') { return; }
              onSettingChange(`${id}-size`, e.target.value); 
            }} className="w-full z-20 relative cursor-pointer accent-red-800 dark:accent-amber-500" />
          </div>
        )}

      </div>

    </div>
  );
};

export const PengaturanView: React.FC<{
  activeRole?: string;
  pengurusRole?: PengurusRole;
  activeSubTab?: PengaturanSubTab;
}> = ({ activeRole, pengurusRole = 'guru', activeSubTab = 'logo' }) => {
  const effectiveSubTab: PengaturanSubTab = pengurusRole === 'bendahara' ? 'organisasi' : (activeSubTab as PengaturanSubTab);
  const [isSaved, setIsSaved] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [firebaseSettings, setFirebaseSettings] = useState<Record<string, string>>(() => {
    const localInit: Record<string, string> = {};
    FIREBASE_KEYS.forEach(key => {
      const v = localStorage.getItem(key);
      if (v) localInit[key] = v;
    });
    return localInit;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<Record<string, any> | null>(null);
  const [systemNotice, setSystemNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // State Pengaturan Pengurus (Data di Menu Kepengurusan)
  const [pembinaData, setPembinaData] = useState<KepengurusanMember>(() => readPembinaFromStorage());
  const [savedPembinaData, setSavedPembinaData] = useState<KepengurusanMember>(() => readPembinaFromStorage());
  const [pjList, setPjList] = useState<KepengurusanMember[]>(() => readPenanggungJawabFromStorage());
  const [savedPjList, setSavedPjList] = useState<KepengurusanMember[]>(() => readPenanggungJawabFromStorage());
  const [pengurusStruct, setPengurusStruct] = useState<KepengurusanMember[]>(() => readPengurusFromStorage());
  const [savedPengurusStruct, setSavedPengurusStruct] = useState<KepengurusanMember[]>(() => readPengurusFromStorage());
  const [isSavingPengurus, setIsSavingPengurus] = useState(false);

  const hasPengurusChanges =
    JSON.stringify(pembinaData) !== JSON.stringify(savedPembinaData) ||
    JSON.stringify(pjList) !== JSON.stringify(savedPjList) ||
    JSON.stringify(pengurusStruct) !== JSON.stringify(savedPengurusStruct);

  // State Konfigurasi Organisasi PGRI
  const [orgConfig, setOrgConfig] = useState<OrgConfig>(() => getOrgConfig());
  const [savedOrgConfig, setSavedOrgConfig] = useState<OrgConfig>(() => getOrgConfig());
  const [schoolsText, setSchoolsText] = useState<string>(() => getOrgConfig().schools.join('\n'));
  const [savedSchoolsText, setSavedSchoolsText] = useState<string>(() => getOrgConfig().schools.join('\n'));
  const [isSavingOrgConfig, setIsSavingOrgConfig] = useState(false);

  const hasOrgConfigChanges =
    orgConfig.bankName !== savedOrgConfig.bankName ||
    orgConfig.bankAccountNumber !== savedOrgConfig.bankAccountNumber ||
    orgConfig.bankAccountHolder !== savedOrgConfig.bankAccountHolder ||
    orgConfig.bendaharaWa !== savedOrgConfig.bendaharaWa ||
    orgConfig.monthlyDuesAmount !== savedOrgConfig.monthlyDuesAmount ||
    orgConfig.letterCodePrefix !== savedOrgConfig.letterCodePrefix ||
    orgConfig.kopOrganisasi !== savedOrgConfig.kopOrganisasi ||
    orgConfig.kopRanting !== savedOrgConfig.kopRanting ||
    orgConfig.kopWilayah !== savedOrgConfig.kopWilayah ||
    orgConfig.kopSekretariat !== savedOrgConfig.kopSekretariat ||
    (orgConfig.qrisImage || '') !== (savedOrgConfig.qrisImage || '') ||
    schoolsText !== savedSchoolsText;

  // State Manajemen Peran Pengurus (RBAC)
  const [pengurusList, setPengurusList] = useState<PengurusAssignment[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [newRoleEmail, setNewRoleEmail] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleType, setNewRoleType] = useState<PengurusRole>('sekretaris');
  const [newRolePosition, setNewRolePosition] = useState('');
  const [isSavingRole, setIsSavingRole] = useState(false);

  const isRoleFormComplete =
    newRoleEmail.trim() !== '' &&
    newRoleName.trim() !== '' &&
    newRoleType.trim() !== '' &&
    newRolePosition.trim() !== '';

  // State Audit Log
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getLocalAuditLogs());
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const showSystemNotice = (type: 'success' | 'warning' | 'error', message: string, durationMs = 4000) => {
    setSystemNotice({ type, message });
    setTimeout(() => {
      setSystemNotice((prev) => (prev?.message === message ? null : prev));
    }, durationMs);
  };

  const [isDark, setIsDark] = useState(() => 
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

  useEffect(() => {
    const syncLocalSettings = () => {
      const updated: Record<string, string> = {};
      FIREBASE_KEYS.forEach(key => {
        const v = localStorage.getItem(key);
        if (v) updated[key] = v;
      });
      setFirebaseSettings(prev => ({ ...prev, ...updated }));
      const latestOrg = getOrgConfig();
      setOrgConfig(latestOrg);
      setSavedOrgConfig(latestOrg);
      setSchoolsText(latestOrg.schools.join('\n'));
      setSavedSchoolsText(latestOrg.schools.join('\n'));

      const latestPembina = readPembinaFromStorage();
      const latestPj = readPenanggungJawabFromStorage();
      const latestPengurus = readPengurusFromStorage();
      setPembinaData(latestPembina);
      setSavedPembinaData(latestPembina);
      setPjList(latestPj);
      setSavedPjList(latestPj);
      setPengurusStruct(latestPengurus);
      setSavedPengurusStruct(latestPengurus);
    };

    const syncLocalAudit = () => {
      setAuditLogs(getLocalAuditLogs());
    };

    syncLocalSettings();
    setIsLoading(false);

    window.addEventListener('storage', syncLocalSettings);
    window.addEventListener('kombel-settings-updated', syncLocalSettings);
    window.addEventListener('pgri-audit-updated', syncLocalAudit);

    return () => {
      window.removeEventListener('storage', syncLocalSettings);
      window.removeEventListener('kombel-settings-updated', syncLocalSettings);
      window.removeEventListener('pgri-audit-updated', syncLocalAudit);
    };
  }, []);

  useEffect(() => {
    if (activeRole !== 'admin') return;
    let mounted = true;
    const loadAdminExtras = async () => {
      setIsLoadingRoles(true);
      setIsLoadingAudit(true);
      try {
        const [roles, logs] = await Promise.all([
          fetchPengurusAssignments(),
          fetchAuditLogs(40)
        ]);
        if (mounted) {
          setPengurusList(roles);
          setAuditLogs(logs);
        }
      } finally {
        if (mounted) {
          setIsLoadingRoles(false);
          setIsLoadingAudit(false);
        }
      }
    };
    loadAdminExtras();
    return () => { mounted = false; };
  }, [activeRole]);

  const handleSaveOrgConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingOrgConfig) return;
    setIsSavingOrgConfig(true);
    try {
      const parsedSchools = schoolsText
        .split(/\r?\n|,/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const nextConfig: OrgConfig = {
        ...orgConfig,
        schools: parsedSchools.length > 0 ? parsedSchools : orgConfig.schools,
      };
      const res = await saveOrgConfig(nextConfig);
      const updatedOrg = getOrgConfig();
      const updatedSchools = updatedOrg.schools.join('\n');
      setOrgConfig(updatedOrg);
      setSavedOrgConfig(updatedOrg);
      setSchoolsText(updatedSchools);
      setSavedSchoolsText(updatedSchools);
      if (res.success) {
        showSystemNotice('success', 'Konfigurasi organisasi PGRI berhasil disimpan ke Cloud.');
      } else {
        showSystemNotice('warning', 'Konfigurasi tersimpan di perangkat ini. Sinkronisasi Cloud akan dilanjutkan saat koneksi tersedia.');
      }
    } catch {
      showSystemNotice('error', 'Gagal menyimpan konfigurasi organisasi.');
    } finally {
      setIsSavingOrgConfig(false);
    }
  };

  const handleQrisFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showSystemNotice('error', 'Harap pilih file gambar (PNG/JPG/WEBP) untuk QRIS.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const maxSide = 420;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        setOrgConfig((prev) => ({ ...prev, qrisImage: compressed }));
      };
      img.onerror = () => {
        showSystemNotice('error', 'Gambar QRIS gagal dibaca. Gunakan format PNG atau JPG.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSavePengurusData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeRole !== 'admin' || isSavingPengurus) return;

    const cleanPembina: KepengurusanMember = {
      role: pembinaData.role.trim() || 'Pengawas Bina',
      name: pembinaData.name.trim() || '-',
      nip: pembinaData.nip.trim() || '-',
      instansi: pembinaData.instansi.trim() || '-',
      wa: pembinaData.wa.trim() || '-'
    };

    const cleanPj = pjList
      .map((item) => ({
        role: item.role.trim(),
        name: item.name.trim(),
        nip: item.nip.trim() || '-',
        instansi: item.instansi.trim() || '-',
        wa: item.wa.trim() || '-'
      }))
      .filter((item) => item.role !== '' || item.name !== '');

    const cleanPengurus = pengurusStruct
      .map((item) => ({
        role: item.role.trim(),
        name: item.name.trim(),
        nip: item.nip.trim() || '-',
        instansi: item.instansi.trim() || '-',
        wa: item.wa.trim() || '-'
      }))
      .filter((item) => item.role !== '' || item.name !== '');

    if (cleanPj.length === 0 || cleanPengurus.length === 0) {
      showSystemNotice('error', 'Minimal harus ada 1 data Penanggung Jawab dan 1 data Struktur Kepengurusan.');
      return;
    }

    setIsSavingPengurus(true);
    try {
      const result = await syncSettingsToCloud(
        {
          'kombel-pembina': JSON.stringify(cleanPembina),
          'kombel-penanggungjawab': JSON.stringify(cleanPj),
          'kombel-pengurus': JSON.stringify(cleanPengurus)
        },
        'Data Kepengurusan PGRI'
      );

      setPembinaData(cleanPembina);
      setSavedPembinaData(cleanPembina);
      setPjList(cleanPj);
      setSavedPjList(cleanPj);
      setPengurusStruct(cleanPengurus);
      setSavedPengurusStruct(cleanPengurus);

      await logAuditEvent(
        'Pengaturan Pengurus',
        'Simpan Data Pengurus',
        `Memperbarui data Pembina, ${cleanPj.length} Penanggung Jawab, dan ${cleanPengurus.length} Struktur Kepengurusan.`
      );

      if (result.success) {
        showSystemNotice('success', 'Data Kepengurusan (Pembina, Penanggung Jawab & Pengurus) berhasil disimpan dan disinkronkan ke menu Kepengurusan.');
      } else {
        showSystemNotice('warning', result.error || 'Data tersimpan di perangkat ini. Sinkronisasi Cloud akan dilanjutkan saat koneksi tersedia.');
      }
    } catch {
      showSystemNotice('error', 'Gagal menyimpan data kepengurusan.');
    } finally {
      setIsSavingPengurus(false);
    }
  };

  const handleMovePengurus = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= pengurusStruct.length) return;
    setPengurusStruct((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pengurusRole !== 'ketua' || isSavingRole) return;
    const cleanEmail = newRoleEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showSystemNotice('error', 'Masukkan alamat email Google yang valid.');
      return;
    }
    if (!newRoleName.trim()) {
      showSystemNotice('error', 'Nama pengurus wajib diisi.');
      return;
    }
    if (!newRolePosition.trim()) {
      showSystemNotice('error', 'Jabatan pengurus wajib diisi.');
      return;
    }
    setIsSavingRole(true);
    try {
      const ok = await savePengurusAssignment({
        email: cleanEmail,
        name: newRoleName.trim(),
        role: newRoleType,
        positionLabel: newRolePosition.trim() || PENGURUS_ROLE_LABELS[newRoleType],
        updatedAt: new Date().toISOString(),
      });
      if (ok) {
        const updated = await fetchPengurusAssignments();
        setPengurusList(updated);
        setNewRoleEmail('');
        setNewRoleName('');
        setNewRolePosition('');
        showSystemNotice('success', `Hak akses ${PENGURUS_ROLE_LABELS[newRoleType]} untuk ${cleanEmail} berhasil ditetapkan.`);
      } else {
        showSystemNotice('error', 'Gagal menyimpan peran pengurus. Pastikan Anda masuk sebagai Ketua.');
      }
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleRemoveRole = async (email: string) => {
    if (pengurusRole !== 'ketua') return;
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      showSystemNotice('warning', 'Akun Ketua utama tidak dapat dihapus.');
      return;
    }
    const ok = await removePengurusAssignment(email);
    if (ok) {
      setPengurusList((prev) => prev.filter((item) => item.email.toLowerCase() !== email.toLowerCase()));
      showSystemNotice('success', `Hak akses pengurus untuk ${email} telah dicabut.`);
    } else {
      showSystemNotice('error', 'Gagal mencabut hak akses pengurus.');
    }
  };

  const handleRefreshAudit = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await fetchAuditLogs(40);
      setAuditLogs(logs);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSaveAll = async () => {
    try {
      const fbData: Record<string, string> = {};
      let hasFbData = false;

      Object.entries(pendingChanges).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
        if (FIREBASE_KEYS.includes(key)) {
          fbData[key] = value as string;
          hasFbData = true;
        }
      });

      if (hasFbData) {
        await syncSettingsToCloud(fbData, 'Pengaturan Aplikasi');
        setFirebaseSettings(prev => ({ ...prev, ...fbData }));
      }

      setPendingChanges({});
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.warn("Error saving settings:", error);
    }
  };

  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  const getValue = (key: string) => {
    if (pendingChanges[key] !== undefined) return pendingChanges[key];
    if (FIREBASE_KEYS.includes(key)) {
      return firebaseSettings[key] !== undefined ? firebaseSettings[key] : null;
    }
    return localStorage.getItem(key);
  };

  const handleBackup = async () => {
    if (isBackingUp || isRestoring) return;
    setIsBackingUp(true);
    try {
      const data = await backupAllFirebaseData();
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const d = new Date();
        const dString = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
        const filename = `backup_pgri_ranting_gelang_${dString}.json`;
        await safeDownloadBlob(blob, filename);
        showSystemNotice('success', 'Backup seluruh data aplikasi berhasil diunduh.');
      } else {
        showSystemNotice('error', 'Gagal membuat backup data.');
      }
    } catch (error) {
      console.warn(error);
      showSystemNotice('error', 'Terjadi kesalahan saat membackup data.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = () => {
    if (isBackingUp || isRestoring) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e2) => {
        try {
          const jsonStr = e2.target?.result as string;
          const data = JSON.parse(jsonStr);
          const hasValidStructure =
            data &&
            typeof data === 'object' &&
            !Array.isArray(data) &&
            (typeof data.kombel_data === 'object' ||
              typeof data.settings === 'object' ||
              typeof data.local_extras === 'object' ||
              typeof data.per_doc_collections === 'object' ||
              Array.isArray(data.pengurus_roles) ||
              Array.isArray(data.audit_logs));

          if (!hasValidStructure) {
            showSystemNotice('error', 'Format file backup tidak valid (struktur data backup PGRI / settings tidak ditemukan).');
            return;
          }
          setPendingRestoreData(data);
        } catch (error) {
          console.warn(error);
          showSystemNotice('error', 'File backup tidak valid atau rusak.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData || isRestoring) return;
    setIsRestoring(true);
    try {
      const result = await restoreAllFirebaseData(pendingRestoreData);
      setPendingRestoreData(null);
      if (result.success) {
        if (result.cloudSynced) {
          showSystemNotice('success', 'Seluruh data & pengaturan berhasil direstore ke perangkat dan Cloud. Memuat ulang...');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          const detail = result.warnings[0] || 'Sebagian data gagal dikirim ke Cloud.';
          showSystemNotice(
            'warning',
            `Data berhasil dipulihkan ke perangkat ini, namun sinkronisasi Cloud perlu diperhatikan: ${detail}`,
            6000
          );
          setTimeout(() => {
            window.location.reload();
          }, 2600);
        }
      } else {
        showSystemNotice('error', result.warnings[0] || 'Gagal merestore data.');
      }
    } catch (error) {
      console.warn(error);
      setPendingRestoreData(null);
      showSystemNotice('error', 'Terjadi kesalahan saat merestore data.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="font-sans space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? '#44403c transparent' : '#d6d3d1 transparent'};
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
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
      <div className={`relative overflow-hidden w-full min-h-[164px] rounded-2xl p-6 sm:p-8 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-colors duration-200 ${
        isDark
          ? 'bg-gradient-to-br from-[#231214] via-stone-900 to-[#1a1112] border-red-900/40 text-stone-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] pgri-batik-pattern-dark'
          : 'bg-gradient-to-br from-[#fdfbf7] via-white to-red-50/50 border-stone-200/90 text-stone-900 shadow-[0_6px_20px_rgba(127,29,29,0.06)] pgri-batik-pattern'
      }`}>
        <div className="absolute top-0 inset-x-0 h-[3px] pgri-top-accent pointer-events-none" />

        <div className="relative z-10">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-red-800 dark:text-amber-400 mb-1.5">
            <Settings className="w-3.5 h-3.5" />
            {effectiveSubTab === 'pengurus'
              ? 'Pengaturan Kepengurusan'
              : effectiveSubTab === 'organisasi'
              ? 'Konfigurasi Sistem'
              : effectiveSubTab === 'hak-akses'
              ? 'Keamanan & Audit'
              : effectiveSubTab === 'data'
              ? 'Pemeliharaan Data'
              : 'Pengaturan Aplikasi'}
          </p>
          <h1 className={`font-display text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}>
            {effectiveSubTab === 'pengurus'
              ? 'Pengaturan Pengurus'
              : effectiveSubTab === 'organisasi'
              ? 'Konfigurasi Organisasi'
              : effectiveSubTab === 'hak-akses'
              ? 'Manajemen Hak Akses & Jejak Audit'
              : effectiveSubTab === 'data'
              ? 'Manajemen Data Sistem'
              : 'Logo & Tanda Tangan'}
          </h1>
          <p className={`text-xs sm:text-sm font-medium mt-1 max-w-2xl ${
            isDark ? 'text-stone-400' : 'text-stone-600'
          }`}>
            {effectiveSubTab === 'pengurus'
              ? 'Atur data Pembina, Penanggung Jawab, dan Struktur Kepengurusan yang tampil di menu Kepengurusan'
              : effectiveSubTab === 'organisasi'
              ? 'Pengaturan rekening kas, nomor WA bendahara, nominal kontribusi, kop surat default, dan daftar sekolah binaan'
              : effectiveSubTab === 'hak-akses'
              ? 'Kelola akun Google pengurus (RBAC) sekaligus pantau jejak audit aktivitas pengurus secara kronologis'
              : effectiveSubTab === 'data'
              ? 'Pemantauan kapasitas penyimpanan Cloud, pencadangan (Backup), dan pemulihan (Restore) data aplikasi'
              : 'Unggah logo dan tanda tangan untuk keperluan dokumen'}
          </p>
        </div>

        {effectiveSubTab === 'logo' && pengurusRole !== 'bendahara' && (
          <button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 z-10 ${
              !hasUnsavedChanges
                ? (isDark
                    ? 'bg-stone-800 text-stone-400 border border-stone-700 opacity-75 cursor-default'
                    : 'bg-stone-100 text-stone-500 border border-stone-200 opacity-75 cursor-default')
                : 'bg-red-800 hover:bg-red-700 text-white active:scale-95 cursor-pointer'
            }`}
          >
            {!hasUnsavedChanges ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="tracking-wide">Tersimpan</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span className="tracking-wide">Simpan Semua</span>
              </>
            )}
          </button>
        )}

        {effectiveSubTab === 'pengurus' && activeRole === 'admin' && pengurusRole !== 'bendahara' && (
          <button
            type="button"
            onClick={() => handleSavePengurusData()}
            disabled={!hasPengurusChanges || isSavingPengurus}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 z-10 ${
              !hasPengurusChanges
                ? (isDark
                    ? 'bg-stone-800 text-stone-400 border border-stone-700 opacity-75 cursor-default'
                    : 'bg-stone-100 text-stone-500 border border-stone-200 opacity-75 cursor-default')
                : 'bg-red-800 hover:bg-red-700 text-white active:scale-95 cursor-pointer'
            }`}
          >
            {isSavingPengurus ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="tracking-wide">Menyimpan...</span>
              </>
            ) : !hasPengurusChanges ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="tracking-wide">Tersimpan</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span className="tracking-wide">Simpan Data Pengurus</span>
              </>
            )}
          </button>
        )}
      </div>

      {systemNotice && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
          systemNotice.type === 'success'
            ? isDark ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : systemNotice.type === 'warning'
              ? isDark ? 'bg-amber-950/40 border-amber-800/70 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              : isDark ? 'bg-rose-950/40 border-rose-800/70 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {systemNotice.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{systemNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSystemNotice(null)}
            className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {effectiveSubTab === 'logo' && pengurusRole !== 'bendahara' && (
        isLoading ? (
          <div className="flex justify-center items-center py-20 min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800 dark:border-amber-400"></div>
          </div>
        ) : (
          <div className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-8">
            
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SettingUploadItem 
                id="logo-pgri" 
                label="Logo PGRI" 
                currentImage={getValue('logo-pgri')} 
                onSettingChange={handleSettingChange} 
                restricted={true}
                activeRole={activeRole}
              />
              <AdvancedSettingUploadItem 
                id="logo-stempel" 
                label="Logo Stempel" 
                type="stempel"
                currentImage={getValue('logo-stempel')} 
                currentSize={getValue('logo-stempel-size') ? Number(getValue('logo-stempel-size')) : undefined}
                onSettingChange={handleSettingChange} 
                restricted={true}
                activeRole={activeRole}
              />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AdvancedSettingUploadItem 
                id="ttd-pengawas" 
                label="Tanda Tangan Pengawas" 
                type="ttd"
                currentImage={getValue('ttd-pengawas')} 
                currentSize={getValue('ttd-pengawas-size') ? Number(getValue('ttd-pengawas-size')) : undefined}
                onSettingChange={handleSettingChange} 
                restricted={true}
                activeRole={activeRole}
              />
              <AdvancedSettingUploadItem 
                id="ttd-ketua" 
                label="Tanda Tangan Ketua PGRI Ranting" 
                type="ttd"
                currentImage={getValue('ttd-ketua')} 
                currentSize={getValue('ttd-ketua-size') ? Number(getValue('ttd-ketua-size')) : undefined}
                onSettingChange={handleSettingChange} 
                restricted={true}
                activeRole={activeRole}
              />
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AdvancedSettingUploadItem 
                id="ttd-sekretaris" 
                label="Tanda Tangan Sekretaris" 
                type="ttd"
                currentImage={getValue('ttd-sekretaris')} 
                currentSize={getValue('ttd-sekretaris-size') ? Number(getValue('ttd-sekretaris-size')) : undefined}
                onSettingChange={handleSettingChange} 
                restricted={true}
                activeRole={activeRole}
              />
              <AdvancedSettingUploadItem 
                id="ttd-bendahara" 
                label="Tanda Tangan Bendahara" 
                type="ttd"
                currentImage={getValue('ttd-bendahara')} 
                currentSize={getValue('ttd-bendahara-size') ? Number(getValue('ttd-bendahara-size')) : undefined}
                onSettingChange={handleSettingChange} 
                restricted={true}
                activeRole={activeRole}
              />
            </div>

          </div>
        )
      )}

      {activeRole === 'admin' && effectiveSubTab === 'pengurus' && pengurusRole !== 'bendahara' && (
        <form onSubmit={handleSavePengurusData} className="space-y-6">
          {/* Pembina */}
          <div className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Pembina (Pengawas Bina)</h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Data pembina utama yang tampil di bagian atas menu Kepengurusan.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Jabatan / Peran</label>
                <input
                  type="text"
                  required
                  value={pembinaData.role}
                  onChange={(e) => setPembinaData({ ...pembinaData, role: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={pembinaData.name}
                  onChange={(e) => setPembinaData({ ...pembinaData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>NIP</label>
                <input
                  type="text"
                  value={pembinaData.nip}
                  onChange={(e) => setPembinaData({ ...pembinaData, nip: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Instansi / Unit Kerja</label>
                <input
                  type="text"
                  value={pembinaData.instansi}
                  onChange={(e) => setPembinaData({ ...pembinaData, instansi: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>No. WhatsApp (62...)</label>
                <input
                  type="text"
                  value={pembinaData.wa}
                  onChange={(e) => setPembinaData({ ...pembinaData, wa: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
            </div>
          </div>

          {/* Penanggung Jawab */}
          <div className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Penanggung Jawab</h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Ketua K3S, Ketua PGRI Cabang, atau penanggung jawab organisasi lainnya.</p>
              </div>
              <button
                type="button"
                onClick={() => setPjList((prev) => [...prev, { role: '', name: '', nip: '-', instansi: '-', wa: '-' }])}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${isDark ? 'bg-red-950/50 border-red-800/60 text-amber-300 hover:bg-red-900/50' : 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Penanggung Jawab</span>
              </button>
            </div>

            <div className="space-y-3">
              {pjList.map((pj, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end ${isDark ? 'bg-stone-800/40 border-stone-800' : 'bg-[#faf8f5] border-stone-200'}`}>
                  <div className="lg:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>Jabatan</label>
                    <input
                      type="text"
                      required
                      value={pj.role}
                      onChange={(e) => setPjList((prev) => prev.map((it, i) => (i === idx ? { ...it, role: e.target.value } : it)))}
                      placeholder="Ketua K3S"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={pj.name}
                      onChange={(e) => setPjList((prev) => prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it)))}
                      placeholder="Nama & Gelar"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>NIP</label>
                    <input
                      type="text"
                      value={pj.nip}
                      onChange={(e) => setPjList((prev) => prev.map((it, i) => (i === idx ? { ...it, nip: e.target.value } : it)))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>Instansi</label>
                    <input
                      type="text"
                      value={pj.instansi}
                      onChange={(e) => setPjList((prev) => prev.map((it, i) => (i === idx ? { ...it, instansi: e.target.value } : it)))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>WhatsApp</label>
                    <input
                      type="text"
                      value={pj.wa}
                      onChange={(e) => setPjList((prev) => prev.map((it, i) => (i === idx ? { ...it, wa: e.target.value } : it)))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-1 flex justify-end">
                    {pjList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPjList((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/15 cursor-pointer"
                        title="Hapus Penanggung Jawab"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Struktur Kepengurusan */}
          <div className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Struktur Kepengurusan PGRI Ranting</h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                  Kelola jabatan, nama pengurus, NIP, sekolah/instansi, dan nomor WhatsApp. Data ini otomatis dipakai di menu Kepengurusan, Pengumuman, Program Kerja, dan Buat Undangan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPengurusStruct((prev) => [...prev, { role: '', name: '', nip: '-', instansi: '-', wa: '-' }])}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border shrink-0 cursor-pointer transition-colors ${isDark ? 'bg-red-950/50 border-red-800/60 text-amber-300 hover:bg-red-900/50' : 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pengurus</span>
              </button>
            </div>

            <div className="space-y-3">
              {pengurusStruct.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end ${isDark ? 'bg-stone-800/40 border-stone-800' : 'bg-[#faf8f5] border-stone-200'}`}>
                  <div className="lg:col-span-3">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>Jabatan #{idx + 1}</label>
                    <input
                      type="text"
                      required
                      value={item.role}
                      onChange={(e) => setPengurusStruct((prev) => prev.map((it, i) => (i === idx ? { ...it, role: e.target.value } : it)))}
                      placeholder="Ketua / Sekretaris / Seksi..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => setPengurusStruct((prev) => prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it)))}
                      placeholder="Nama Lengkap & Gelar"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>NIP</label>
                    <input
                      type="text"
                      value={item.nip}
                      onChange={(e) => setPengurusStruct((prev) => prev.map((it, i) => (i === idx ? { ...it, nip: e.target.value } : it)))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>Sekolah / Instansi</label>
                    <input
                      type="text"
                      value={item.instansi}
                      onChange={(e) => setPengurusStruct((prev) => prev.map((it, i) => (i === idx ? { ...it, instansi: e.target.value } : it)))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>No. WA</label>
                    <input
                      type="text"
                      value={item.wa}
                      onChange={(e) => setPengurusStruct((prev) => prev.map((it, i) => (i === idx ? { ...it, wa: e.target.value } : it)))}
                      className={`w-full px-2.5 py-2 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div className="lg:col-span-1 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMovePengurus(idx, -1)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-amber-500/10 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                      title="Geser ke Atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pengurusStruct.length - 1}
                      onClick={() => handleMovePengurus(idx, 1)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-amber-500/10 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                      title="Geser ke Bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {pengurusStruct.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPengurusStruct((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/15 cursor-pointer"
                        title="Hapus Pengurus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!hasPengurusChanges || isSavingPengurus}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                  !hasPengurusChanges
                    ? (isDark
                        ? 'bg-stone-800 text-stone-400 border border-stone-700 opacity-75 cursor-default'
                        : 'bg-stone-100 text-stone-500 border border-stone-200 opacity-75 cursor-default')
                    : 'bg-red-800 hover:bg-red-700 disabled:opacity-60 text-white shadow-sm cursor-pointer active:scale-95'
                }`}
              >
                {isSavingPengurus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : !hasPengurusChanges ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Tersimpan</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Data Pengurus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeRole === 'admin' && effectiveSubTab === 'organisasi' && (
        <>
          {/* 1. Konfigurasi Dinamis Organisasi PGRI */}
          <form onSubmit={handleSaveOrgConfig} className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Konfigurasi Organisasi PGRI Ranting</h2>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Pengaturan rekening kas, nomor WA bendahara, nominal kontribusi, kop surat default, dan daftar sekolah binaan.</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={!hasOrgConfigChanges || isSavingOrgConfig}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shrink-0 ${
                  !hasOrgConfigChanges
                    ? (isDark
                        ? 'bg-stone-800 text-stone-400 border border-stone-700 opacity-75 cursor-default'
                        : 'bg-stone-100 text-stone-500 border border-stone-200 opacity-75 cursor-default')
                    : 'bg-red-800 hover:bg-red-700 disabled:opacity-60 text-white shadow-sm cursor-pointer active:scale-95'
                }`}
              >
                {isSavingOrgConfig ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : !hasOrgConfigChanges ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Tersimpan</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Konfigurasi</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Nama Bank Kas</label>
                <input
                  type="text"
                  value={orgConfig.bankName}
                  onChange={(e) => setOrgConfig({ ...orgConfig, bankName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Nomor Rekening Kas</label>
                <input
                  type="text"
                  value={orgConfig.bankAccountNumber}
                  onChange={(e) => setOrgConfig({ ...orgConfig, bankAccountNumber: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Atas Nama Rekening</label>
                <input
                  type="text"
                  value={orgConfig.bankAccountHolder}
                  onChange={(e) => setOrgConfig({ ...orgConfig, bankAccountHolder: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Nomor WhatsApp Bendahara (628...)</label>
                <input
                  type="text"
                  value={orgConfig.bendaharaWa}
                  onChange={(e) => setOrgConfig({ ...orgConfig, bendaharaWa: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="628xxxxxxxxxx"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium font-mono focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Nominal Kontribusi Bulanan (Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={orgConfig.monthlyDuesAmount}
                  onChange={(e) => setOrgConfig({ ...orgConfig, monthlyDuesAmount: Number(e.target.value) || 0 })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Kode Prefix Nomor Surat</label>
                <input
                  type="text"
                  value={orgConfig.letterCodePrefix}
                  onChange={(e) => setOrgConfig({ ...orgConfig, letterCodePrefix: e.target.value })}
                  placeholder="PGRI.Rtg.Gelang"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Kop Surat Baris 1 (Organisasi)</label>
                  <input
                    type="text"
                    value={orgConfig.kopOrganisasi}
                    onChange={(e) => setOrgConfig({ ...orgConfig, kopOrganisasi: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Kop Baris 2 (Ranting)</label>
                    <input
                      type="text"
                      value={orgConfig.kopRanting}
                      onChange={(e) => setOrgConfig({ ...orgConfig, kopRanting: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Kop Baris 3 (Wilayah)</label>
                    <input
                      type="text"
                      value={orgConfig.kopWilayah}
                      onChange={(e) => setOrgConfig({ ...orgConfig, kopWilayah: e.target.value })}
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>Alamat Sekretariat Kop Surat</label>
                  <input
                    type="text"
                    value={orgConfig.kopSekretariat}
                    onChange={(e) => setOrgConfig({ ...orgConfig, kopSekretariat: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  Daftar Sekolah Binaan Ranting (1 sekolah per baris)
                </label>
                <textarea
                  rows={6}
                  value={schoolsText}
                  onChange={(e) => setSchoolsText(e.target.value)}
                  placeholder="SDN GELANG 01&#10;SDN GELANG 03"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium leading-relaxed focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-[#faf8f5] border-stone-200 text-stone-800'}`}
                />
                <p className="text-[11px] text-stone-400 mt-1">Otomatis digunakan pada pilihan asal sekolah di menu Daftar Anggota & Rekap Kontribusi.</p>
              </div>
            </div>

            {/* Gambar QRIS Resmi Pembayaran Kas */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isDark ? 'bg-stone-800/50 border-stone-700/80' : 'bg-[#faf8f5] border-stone-200'}`}>
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-16 h-16 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${isDark ? 'bg-stone-900 border-stone-700 text-amber-400' : 'bg-white border-stone-200 text-red-800'}`}>
                  {orgConfig.qrisImage ? (
                    <img src={orgConfig.qrisImage} alt="Preview QRIS Resmi" className="w-full h-full object-contain bg-white p-1" />
                  ) : (
                    <QrCode className="w-7 h-7" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className={`font-display font-bold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-stone-900'}`}>
                    Gambar QRIS Resmi Pembayaran Kas
                  </h3>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                    {orgConfig.qrisImage
                      ? 'QRIS resmi telah terpasang dan akan tampil pada tombol Download QRIS di menu Catatan Keuangan.'
                      : 'Opsional: Unggah gambar QRIS resmi dari bank agar anggota dapat langsung scan untuk membayar kontribusi kas.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <label className="px-3.5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{orgConfig.qrisImage ? 'Ganti QRIS' : 'Unggah QRIS'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisFileUpload}
                    className="hidden"
                  />
                </label>
                {orgConfig.qrisImage && (
                  <button
                    type="button"
                    onClick={() => setOrgConfig((prev) => ({ ...prev, qrisImage: '' }))}
                    className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${isDark ? 'bg-red-950/60 border-red-800/60 text-red-300 hover:bg-red-900/60' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pemantauan Kapasitas Dokumen Pengaturan Cloud (settings/global) */}
            {(() => {
              const MAX_SAFE_SETTINGS_BYTES = 950 * 1024;
              const settingsPayload: Record<string, string> = {};
              try {
                [
                  ...FIREBASE_KEYS,
                  'kombel-visi', 'kombel-misi', 'kombel-pembina', 'kombel-penanggungjawab', 'kombel-pengurus',
                  'logo-kombel', 'pgri-verified-pengurus-names', 'kombel-undangan-npa'
                ].forEach((k) => {
                  const val = localStorage.getItem(k);
                  if (val !== null) settingsPayload[k] = val;
                });
                const parsedSchools = schoolsText
                  .split(/\r?\n|,/)
                  .map((s) => s.trim().toUpperCase())
                  .filter(Boolean);
                settingsPayload['org-config'] = JSON.stringify({
                  ...orgConfig,
                  schools: parsedSchools.length > 0 ? parsedSchools : orgConfig.schools
                });
              } catch {
                // ignore
              }
              const bytes = new Blob([JSON.stringify(settingsPayload)]).size;
              const kb = Math.round(bytes / 1024);
              const pct = Math.min(100, Math.round((bytes / MAX_SAFE_SETTINGS_BYTES) * 100));
              const isHigh = pct >= 85;
              const isWarn = pct >= 70;

              return (
                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  isHigh
                    ? isDark ? 'bg-red-950/30 border-red-800/60' : 'bg-red-50 border-red-200'
                    : isWarn
                    ? isDark ? 'bg-amber-950/25 border-amber-800/60' : 'bg-amber-50 border-amber-200'
                    : isDark ? 'bg-stone-800/40 border-stone-800' : 'bg-[#faf8f5] border-stone-200/80'
                }`}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={`font-bold ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                      Kapasitas Dokumen Pengaturan Cloud (settings/global)
                    </span>
                    <span className={`font-bold font-mono ${
                      isHigh ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {kb} KB / 950 KB ({pct}%)
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-stone-800' : 'bg-stone-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHigh ? 'bg-red-600' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(pct, kb > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                  {isWarn && (
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>
                      Ukuran dokumen pengaturan mendekati batas aman 950 KB. Pertimbangkan memperkecil ukuran logo, tanda tangan, atau gambar QRIS jika gagal tersimpan ke Cloud.
                    </p>
                  )}
                </div>
              );
            })()}
          </form>
        </>
      )}

      {activeRole === 'admin' && effectiveSubTab === 'hak-akses' && pengurusRole !== 'bendahara' && (
        <>
          {/* 2. Manajemen Peran Pengurus (RBAC) */}
          <div className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Manajemen Hak Akses Pengurus (RBAC)</h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                  Kelola akun Google pengurus berdasarkan jabatan (Ketua, Sekretaris, Bendahara, Seksi). Hanya <strong>Ketua</strong> yang dapat menambah atau mencabut hak akses.
                </p>
              </div>
            </div>

            {pengurusRole === 'ketua' && (
              <form onSubmit={handleAddRole} className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 ${isDark ? 'bg-stone-800/40 border-stone-800' : 'bg-[#faf8f5] border-stone-200'}`}>
                <input
                  type="email"
                  required
                  value={newRoleEmail}
                  onChange={(e) => setNewRoleEmail(e.target.value)}
                  placeholder="Email Google Pengurus"
                  className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                />
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                />
                <select
                  value={newRoleType}
                  onChange={(e) => setNewRoleType(e.target.value as PengurusRole)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                >
                  <option value="ketua">Ketua / Super Admin</option>
                  <option value="sekretaris">Sekretaris</option>
                  <option value="bendahara">Bendahara</option>
                  <option value="seksi">Pengurus Seksi</option>
                </select>
                <input
                  type="text"
                  required
                  value={newRolePosition}
                  onChange={(e) => setNewRolePosition(e.target.value)}
                  placeholder="Jabatan (mis: Seksi Kaderisasi)"
                  className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-red-700 ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-white border-stone-200 text-stone-800'}`}
                />
                <button
                  type="submit"
                  disabled={!isRoleFormComplete || isSavingRole}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    !isRoleFormComplete
                      ? (isDark
                          ? 'bg-stone-800 text-stone-400 border border-stone-700 opacity-75 cursor-not-allowed'
                          : 'bg-stone-200 text-stone-500 border border-stone-300 opacity-75 cursor-not-allowed')
                      : 'bg-red-800 hover:bg-red-700 disabled:opacity-60 text-white cursor-pointer active:scale-95'
                  }`}
                >
                  {isSavingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isSavingRole ? 'Menyimpan...' : 'Tetapkan'}</span>
                </button>
              </form>
            )}

            <div className="space-y-2">
              <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isDark ? 'bg-red-950/30 border-red-900/50' : 'bg-red-50/60 border-red-200/80'}`}>
                <div>
                  <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Akun Pengelola Utama</p>
                  <p className="text-[11px] text-stone-400 font-mono">{SUPER_ADMIN_EMAIL}</p>
                </div>
                <span className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase self-start sm:self-center border ${isDark ? 'bg-red-950/80 border-red-800/60 text-amber-300' : 'bg-red-100 border-red-200 text-red-900'}`}>
                  Ketua / Super Admin
                </span>
              </div>

              {isLoadingRoles ? (
                <p className="text-xs text-stone-400 py-2">Memuat daftar pengurus...</p>
              ) : pengurusList.length === 0 ? (
                <p className="text-xs text-stone-400 py-2">Belum ada akun pengurus tambahan. Ketua dapat menambahkan email Sekretaris, Bendahara, atau Pengurus Seksi di atas.</p>
              ) : (
                pengurusList.map((item) => (
                  <div key={item.email} className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isDark ? 'bg-stone-800/40 border-stone-800' : 'bg-[#faf8f5] border-stone-200/80'}`}>
                    <div>
                      <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>{item.name} <span className="font-normal text-stone-400">• {item.positionLabel || PENGURUS_ROLE_LABELS[item.role]}</span></p>
                      <p className="text-[11px] text-stone-400 font-mono">{item.email}</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase border ${isDark ? 'bg-stone-800 border-stone-700 text-stone-200' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>
                        {PENGURUS_ROLE_LABELS[item.role]}
                      </span>
                      {pengurusRole === 'ketua' && item.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRole(item.email)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/15 cursor-pointer"
                          title="Cabut hak akses"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Jejak Audit Aktivitas (Audit Log) */}
          <div className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-4 mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Jejak Audit Aktivitas Pengurus</h2>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Catatan kronologis perubahan penting untuk akuntabilitas dan transparansi organisasi.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshAudit}
                disabled={isLoadingAudit}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${isDark ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700' : 'bg-[#faf8f5] border-stone-200 text-stone-700 hover:bg-stone-100'}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                <span>Muat Ulang</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">Belum ada catatan aktivitas pengurus.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${isDark ? 'bg-stone-800/40 border-stone-800' : 'bg-[#faf8f5] border-stone-200/80'}`}>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${isDark ? 'bg-emerald-950/70 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}>{log.module}</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>{log.action}</span>
                        <span className="text-[11px] text-stone-400">oleh {log.actorName} ({log.actorRole})</span>
                      </div>
                      <p className={isDark ? 'text-stone-300' : 'text-stone-600'}>{log.summary}</p>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeRole === 'admin' && effectiveSubTab === 'data' && pengurusRole !== 'bendahara' && (
        <div className="bg-white [.dark_&]:bg-stone-900 dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200/90 [.dark_&]:border-stone-800 dark:border-stone-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-red-950/70 border-red-800/60 text-amber-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>Manajemen Data Sistem</h2>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Fasilitas untuk mencadangkan (Backup) seluruh data aplikasi ke file dan mengembalikan (Restore) data dari file cadangan.</p>
            </div>
          </div>

          {(() => {
            const MAX_SAFE_BYTES = 950 * 1024;
            const collections = [
              { label: 'Daftar Hadir Kegiatan', keys: ['kombel-attendance'] },
              { label: 'Jadwal Kegiatan', keys: ['kombel-events'] },
              { label: 'Daftar Anggota', keys: ['kombel-teachers'] },
              { label: 'Catatan Keuangan', keys: ['kombel-financialTransactions'] },
              { label: 'Kontribusi Kas Anggota', keys: ['kombel-cashPayments'] },
              { label: 'Program Kerja', keys: ['pgri-proker-items'] },
              { label: 'Dana Sosial & Aspirasi', keys: ['pgri-dana-sosial', 'pgri-aspirasi-local'] },
              { label: 'Arsip Undangan', keys: ['kombel-invitations'] },
              { label: 'Agenda Surat & Notulen', keys: ['pgri-surat-agenda', 'pgri-notulen-rapat'] },
              { label: 'Pengumuman & Pesan Kontak', keys: ['kombel-announcements', 'pgri-kontak-feedback'] },
              { label: 'Pengaturan & Logo', keys: ['__settings__'] }
            ].map((item) => {
              let bytes = 0;
              try {
                if (item.keys[0] === '__settings__') {
                  const settingsObj: Record<string, string> = {};
                  [
                    ...FIREBASE_KEYS,
                    'kombel-visi', 'kombel-misi', 'kombel-pembina', 'kombel-penanggungjawab', 'kombel-pengurus',
                    'org-config', 'logo-kombel', 'pgri-verified-pengurus-names', 'kombel-undangan-npa'
                  ].forEach((k) => {
                    const val = localStorage.getItem(k);
                    if (val !== null) settingsObj[k] = val;
                  });
                  bytes = new Blob([JSON.stringify(settingsObj)]).size;
                } else {
                  bytes = item.keys.reduce((sum, storageKey) => {
                    const raw = localStorage.getItem(storageKey) || '[]';
                    return sum + new Blob([raw]).size;
                  }, 0);
                }
              } catch {
                bytes = 0;
              }
              const kb = Math.round(bytes / 1024);
              const pct = Math.min(100, Math.round((bytes / MAX_SAFE_BYTES) * 100));
              return { ...item, key: item.keys[0], kb, pct };
            });
            const hasWarning = collections.some((c) => c.pct >= 70);

            return (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                hasWarning
                  ? isDark ? 'bg-amber-950/20 border-amber-800/60' : 'bg-amber-50/70 border-amber-200'
                  : isDark ? 'bg-stone-800/40 border-stone-800' : 'bg-[#faf8f5] border-stone-200/80'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                    Pemantauan Kapasitas Dokumen Cloud (Maks. 950 KB / Koleksi)
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                    hasWarning
                      ? isDark ? 'bg-amber-900/60 text-amber-300' : 'bg-amber-100 text-amber-800'
                      : isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {hasWarning ? 'Perlu Arsip / Backup' : 'Kapasitas Aman'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {collections.map((c) => (
                    <div key={c.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={isDark ? 'text-stone-300' : 'text-stone-600'}>{c.label}</span>
                        <span className={`font-bold font-mono ${
                          c.pct >= 70 ? 'text-amber-500' : isDark ? 'text-stone-400' : 'text-stone-500'
                        }`}>
                          {c.kb} KB ({c.pct}%)
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-stone-800' : 'bg-stone-200'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            c.pct >= 85 ? 'bg-red-600' : c.pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(c.pct, c.kb > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {hasWarning && (
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>
                    Salah satu koleksi mendekati batas 950 KB per dokumen. Disarankan melakukan <strong>Backup Data</strong> terlebih dahulu lalu merapikan data kegiatan lama agar sinkronisasi tetap lancar.
                  </p>
                )}
              </div>
            );
          })()}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleBackup}
              disabled={isBackingUp || isRestoring}
              className="flex-1 px-4 py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isBackingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>{isBackingUp ? 'Membuat Backup...' : 'Backup Data'}</span>
            </button>
            <button
              onClick={handleRestore}
              disabled={isBackingUp || isRestoring}
              className="flex-1 px-4 py-3 bg-red-800 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isRestoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
              <span>{isRestoring ? 'Merestore Data...' : 'Restore Data'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Restore Data */}
      {pendingRestoreData && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'} rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-red-950/60 border-red-800/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display font-bold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                  Konfirmasi Restore Data
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                  PERINGATAN: Mengembalikan data (<strong>Restore</strong>) akan menimpa semua data aplikasi saat ini dengan data dari file backup. Apakah Anda yakin ingin melanjutkan?
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setPendingRestoreData(null)}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-60 border ${isDark ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300' : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700'}`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{isRestoring ? 'Memproses...' : 'Ya, Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};