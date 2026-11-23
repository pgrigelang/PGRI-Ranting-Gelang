const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const updateLogic = `  const handleUpdateAttendance = (updated: AttendanceRecord) => {
    setAttendanceList(attendanceList.map(a => a.id === updated.id ? updated : a));
  };

  const handleDeleteAttendance = (id: string) => {
    setAttendanceList(attendanceList.filter(a => a.id !== id));
  };`;

code = code.replace("const handleAddEvent = (evt: Omit<ActivityEvent, 'id' | 'attendanceOpen'>) => {", updateLogic + "\n\n  const handleAddEvent = (evt: Omit<ActivityEvent, 'id' | 'attendanceOpen'>) => {");

code = code.replace("onAddAttendance={handleAddAttendance}", "onAddAttendance={handleAddAttendance}\n              onUpdateAttendance={handleUpdateAttendance}\n              onDeleteAttendance={handleDeleteAttendance}");

fs.writeFileSync('src/App.tsx', code, 'utf8');
