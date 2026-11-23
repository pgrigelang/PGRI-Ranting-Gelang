const fs = require('fs');
let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

// Button Terima
code = code.replace(
  `onClick={() => {
                                  if (confirm(\`Terima kehadiran \${rec.teacherName}?\`)) {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Hadir'});
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer"`,
  `onClick={() => {
                                  if (confirm(\`Terima kehadiran \${rec.teacherName}?\`)) {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Hadir'});
                                  }
                                }}
                                disabled={!isAdmin}
                                className={\`px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm \${isAdmin ? 'hover:bg-emerald-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'}\`}`
);

// Button Tolak
code = code.replace(
  `onClick={() => {
                                  if (confirm(\`Tolak kehadiran \${rec.teacherName}?\`)) {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Alpha'});
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer"`,
  `onClick={() => {
                                  if (confirm(\`Tolak kehadiran \${rec.teacherName}?\`)) {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Alpha'});
                                  }
                                }}
                                disabled={!isAdmin}
                                className={\`px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm \${isAdmin ? 'hover:bg-amber-600 cursor-pointer' : 'opacity-50 cursor-not-allowed'}\`}`
);

// Button Hapus
code = code.replace(
  `onClick={() => {
                              if (confirm(\`Hapus data kehadiran \${rec.teacherName}?\`)) {
                                if (rec.id.startsWith('implicit-alpha')) {
                                  alert('Data ini dihasilkan secara otomatis karena guru belum absen.');
                                } else {
                                  if (onDeleteAttendance) onDeleteAttendance(rec.id);
                                }
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer"`,
  `onClick={() => {
                              if (confirm(\`Hapus data kehadiran \${rec.teacherName}?\`)) {
                                if (rec.id.startsWith('implicit-alpha')) {
                                  alert('Data ini dihasilkan secara otomatis karena guru belum absen.');
                                } else {
                                  if (onDeleteAttendance) onDeleteAttendance(rec.id);
                                }
                              }
                            }}
                            disabled={!isAdmin}
                            className={\`px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm \${isAdmin ? 'hover:bg-rose-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'}\`}`
);

fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
