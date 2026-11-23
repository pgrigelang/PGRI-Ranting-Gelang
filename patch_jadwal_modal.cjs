const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

// Add attendanceFilter state
code = code.replace("const [showUploadTaskModal, setShowUploadTaskModal] = useState(false);", "const [showUploadTaskModal, setShowUploadTaskModal] = useState(false);\n  const [attendanceFilter, setAttendanceFilter] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpha' | 'Verifikasi'>('Hadir');");

// Reset filter when opening modal
code = code.replace("onClick={() => setViewEventAttendance(evt)}", "onClick={() => { setViewEventAttendance(evt); setAttendanceFilter('Hadir'); }}");

fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
