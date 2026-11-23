const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

code = code.replace("onAddAttendance: (rec: Omit<AttendanceRecord, 'id' | 'timestamp'>) => void;", "onAddAttendance: (rec: Omit<AttendanceRecord, 'id' | 'timestamp'>) => void;\n  onUpdateAttendance?: (updated: AttendanceRecord) => void;\n  onDeleteAttendance?: (id: string) => void;");

code = code.replace("onAddAttendance,\n  onAddEvent,", "onAddAttendance,\n  onUpdateAttendance,\n  onDeleteAttendance,\n  onAddEvent,");

fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
