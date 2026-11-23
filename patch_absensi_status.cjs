const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

code = code.replace(
  "status: attendanceStatus,",
  "status: attendanceStatus === 'Hadir' ? 'Verifikasi' : attendanceStatus,"
);

fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
