import { signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { ActiveTab, AuditLogEntry, PengurusAssignment, PengurusRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'adisaifulrizal@gmail.com';

const AUDIT_STORAGE_KEY = 'pgri-audit-logs';
const ROLES_STORAGE_KEY = 'pgri-pengurus-roles';

export const PENGURUS_ROLE_LABELS: Record<PengurusRole, string> = {
  ketua: 'Ketua / Super Admin',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  seksi: 'Pengurus Seksi',
  guru: 'Anggota Guru',
};

export function emailToDocKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function isSuperAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL);
}

export function isPengurusRole(role: PengurusRole): boolean {
  return role === 'ketua' || role === 'sekretaris' || role === 'bendahara' || role === 'seksi';
}

export function canAccessAdminForTab(role: PengurusRole, tab: ActiveTab): boolean {
  if (role === 'ketua') return true;
  if (role === 'sekretaris') {
    return [
      'profil',
      'anggota',
      'jadwal',
      'dokumen',
      'undangan',
      'proker',
      'sosial',
      'kontak',
      'pengaturan',
    ].includes(tab);
  }
  if (role === 'bendahara') {
    return ['keuangan', 'sosial', 'pengaturan'].includes(tab);
  }
  if (role === 'seksi') {
    return ['proker', 'jadwal', 'dokumen'].includes(tab);
  }
  return false;
}

export function canManageConfidentialAspirasi(role: PengurusRole): boolean {
  return role === 'ketua' || role === 'sekretaris';
}

export async function signInPengurusWithGoogle(): Promise<{
  user: User;
  role: PengurusRole;
  assignment?: PengurusAssignment | null;
}> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  const resolved = await resolvePengurusRole(user);
  return { user, ...resolved };
}

export async function signOutPengurus(): Promise<void> {
  await signOut(auth);
}

export async function resolvePengurusRole(
  user: User | null
): Promise<{ role: PengurusRole; assignment: PengurusAssignment | null }> {
  if (!user || !user.email) {
    return { role: 'guru', assignment: null };
  }

  const normalizedEmail = user.email.trim().toLowerCase();
  if (normalizedEmail === SUPER_ADMIN_EMAIL && user.emailVerified) {
    return {
      role: 'ketua',
      assignment: {
        email: normalizedEmail,
        name: user.displayName || 'Ketua / Admin PGRI',
        role: 'ketua',
        positionLabel: 'Ketua / Super Admin PGRI Ranting Gelang',
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const docKey = emailToDocKey(normalizedEmail);
  try {
    const snap = await getDoc(doc(db, 'pengurus_roles', docKey));
    if (snap.exists()) {
      const data = snap.data() as PengurusAssignment;
      if (data && isPengurusRole(data.role)) {
        return { role: data.role, assignment: data };
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `pengurus_roles/${docKey}`);
  }

  // Fallback to locally cached roles if offline
  try {
    const cached = localStorage.getItem(ROLES_STORAGE_KEY);
    if (cached) {
      const list = JSON.parse(cached) as PengurusAssignment[];
      const found = list.find((item) => item.email.trim().toLowerCase() === normalizedEmail);
      if (found && isPengurusRole(found.role)) {
        return { role: found.role, assignment: found };
      }
    }
  } catch {}

  return { role: 'guru', assignment: null };
}

export async function fetchPengurusAssignments(): Promise<PengurusAssignment[]> {
  try {
    const snap = await getDocs(collection(db, 'pengurus_roles'));
    const list: PengurusAssignment[] = [];
    snap.forEach((d) => {
      const data = d.data() as PengurusAssignment;
      if (data?.email) list.push(data);
    });
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(list));
    } catch {}
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'pengurus_roles');
    try {
      const cached = localStorage.getItem(ROLES_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
}

export async function savePengurusAssignment(assignment: PengurusAssignment): Promise<boolean> {
  const cleanEmail = assignment.email.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  const payload: PengurusAssignment = {
    email: cleanEmail,
    name: assignment.name.trim().slice(0, 120),
    role: assignment.role,
    positionLabel: (assignment.positionLabel || PENGURUS_ROLE_LABELS[assignment.role]).slice(0, 120),
    assignedBy: auth.currentUser?.email || SUPER_ADMIN_EMAIL,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'pengurus_roles', docKey), payload);
    const existing = await fetchPengurusAssignments();
    const merged = [payload, ...existing.filter((x) => x.email !== cleanEmail)];
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(merged));
    } catch {}
    await logAuditEvent('Pengaturan RBAC', 'Simpan Peran', `Menetapkan ${payload.name} (${cleanEmail}) sebagai ${PENGURUS_ROLE_LABELS[payload.role]}`);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `pengurus_roles/${docKey}`);
    return false;
  }
}

export async function removePengurusAssignment(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const docKey = emailToDocKey(cleanEmail);
  try {
    await deleteDoc(doc(db, 'pengurus_roles', docKey));
    try {
      const cached = JSON.parse(localStorage.getItem(ROLES_STORAGE_KEY) || '[]') as PengurusAssignment[];
      localStorage.setItem(
        ROLES_STORAGE_KEY,
        JSON.stringify(cached.filter((x) => x.email.toLowerCase() !== cleanEmail))
      );
    } catch {}
    await logAuditEvent('Pengaturan RBAC', 'Hapus Peran', `Mencabut hak akses pengurus untuk ${cleanEmail}`);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `pengurus_roles/${docKey}`);
    return false;
  }
}

export function getLocalAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function fetchAuditLogs(maxCount = 50): Promise<AuditLogEntry[]> {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    const logs: AuditLogEntry[] = [];
    snap.forEach((d) => logs.push(d.data() as AuditLogEntry));
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
    } catch {}
    return logs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'audit_logs');
    return getLocalAuditLogs();
  }
}

export async function logAuditEvent(
  module: string,
  action: string,
  summary: string,
  roleOverride?: PengurusRole
): Promise<void> {
  const user = auth.currentUser;
  const entry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorUid: user?.uid || 'local-session',
    actorEmail: user?.email || 'session@pgri-gelang',
    actorName: user?.displayName || 'Pengurus PGRI',
    actorRole: roleOverride || (localStorage.getItem('pgri-pengurus-role') || 'admin'),
    module: module.slice(0, 64),
    action: action.slice(0, 64),
    summary: summary.slice(0, 500),
    timestamp: new Date().toISOString(),
  };

  try {
    const current = getLocalAuditLogs();
    const updated = [entry, ...current].slice(0, 100);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('pgri-audit-updated'));
  } catch {}

  if (!user || !user.emailVerified) return;

  try {
    await setDoc(doc(db, 'audit_logs', entry.id), entry);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `audit_logs/${entry.id}`);
  }
}
