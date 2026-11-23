const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const regex = /const getAttendanceSummaryForEvent = \(eventId: string\) => \{[\s\S]*?return \{ total: records\.length, hadir, izin, sakit, alpha, records \};\s*\};/;

const replacement = `const getAttendanceSummaryForEvent = (eventId: string) => {
    const records = attendanceList.filter(a => a.eventId === eventId);
    const hadir = records.filter(a => a.status === 'Hadir').length;
    const izin = records.filter(a => a.status === 'Izin').length;
    const sakit = records.filter(a => a.status === 'Sakit').length;
    const verifikasi = records.filter(a => a.status === 'Verifikasi').length;
    const alpha = Math.max(0, teachers.length - (hadir + izin + sakit + verifikasi));
    return { total: records.length, hadir, izin, sakit, alpha, verifikasi, records };
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
