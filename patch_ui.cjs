const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const startStr = '{/* Right Action & Attendance Stat */}';
const endStr = '                </div>\n              </div>\n            );\n          })}\n        </div>';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const before = code.substring(0, startIndex);
  const after = code.substring(endIndex);

  const replacement = `{/* Right Action & Attendance Stat */}
                <div className={\`w-full md:w-[320px] flex flex-col items-stretch justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0 \${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0\`}>
                  
                  {/* Absensi Section */}
                  <div className="flex flex-col gap-2">
                    <div className={\`\${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} px-4 py-2 rounded-2xl border text-center\`}>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status Kehadiran Guru</p>
                      <p className={\`text-[11px] font-bold \${isDark ? 'text-slate-100' : 'text-slate-800'}\`}>
                        <span className={\`\${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-extrabold\`}>{summary.hadir} Hadir</span> • {summary.sakit} Sakit • {summary.izin} Izin • {summary.alpha} Alpha
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenAbsensi(evt)}
                        className="w-full px-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Isi Absensi
                      </button>
                      <button
                        onClick={() => setViewEventAttendance(evt)}
                        className={\`w-full px-2 py-2.5 rounded-xl \${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer\`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        Daftar Hadir
                      </button>
                    </div>
                  </div>

                  {/* Tugas Section */}
                  <div className="flex flex-col gap-2">
                    <div className={\`\${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} px-4 py-2 rounded-2xl border text-center flex flex-col items-center justify-center gap-1\`}>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Batas Upload Tugas</p>
                      <input 
                        type="date"
                        value={evt.uploadDeadline || ''}
                        onChange={(e) => onUpdateEvent && onUpdateEvent({ ...evt, uploadDeadline: e.target.value })}
                        className={\`bg-transparent border-none text-xs font-bold focus:ring-0 \${isDark ? 'text-slate-100 [color-scheme:dark]' : 'text-slate-800'} text-center w-full max-w-[150px] p-0 m-0\`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (evt.uploadDeadline && new Date() > new Date(evt.uploadDeadline)) {
                            alert("Batas upload tugas sudah berakhir.");
                            return;
                          }
                          setSelectedEventForUpload(evt);
                          setUploadTaskFile(null);
                          setShowUploadTaskModal(true);
                        }}
                        className={\`w-full px-2 py-2.5 rounded-xl \${isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'} font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer\`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload Tugas
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEventForVerify(evt);
                          setShowVerifyTaskModal(true);
                        }}
                        className={\`w-full px-2 py-2.5 rounded-xl \${isDark ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'} font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer\`}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Verifikasi
                      </button>
                    </div>
                  </div>

`;

  fs.writeFileSync('src/components/views/JadwalView.tsx', before + replacement + after, 'utf8');
  console.log('Successfully patched UI');
} else {
  console.log('Could not find markers', startIndex, endIndex);
}
