const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const modalStartRegex = /<div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">[\s\S]*?\{\/\* MODAL CREATE NEW EVENT \*\//;

const replacement = `<div className="mt-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {['Hadir', 'Sakit', 'Izin', 'Alpha', 'Verifikasi'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setAttendanceFilter(filter as any)}
                  className={\`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors \${
                    attendanceFilter === filter
                      ? 'bg-indigo-600 text-white shadow-md'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }\`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {(() => {
                const summary = getAttendanceSummaryForEvent(viewEventAttendance.id);
                let displayRecords = [];
                if (attendanceFilter === 'Alpha') {
                  const submittedTeacherIds = summary.records.map(r => r.teacherId).filter(Boolean);
                  const implicitAlphas = teachers
                    .filter(t => !submittedTeacherIds.includes(t.id))
                    .map(t => ({
                      id: \`implicit-alpha-\${t.id}\`,
                      eventId: viewEventAttendance.id,
                      eventTitle: viewEventAttendance.title,
                      teacherId: t.id,
                      teacherName: t.name,
                      school: t.school,
                      status: 'Alpha' as const,
                      timestamp: '-',
                    }));
                  const explicitAlphas = summary.records.filter(r => r.status === 'Alpha');
                  displayRecords = [...explicitAlphas, ...implicitAlphas];
                } else {
                  displayRecords = summary.records.filter(r => r.status === attendanceFilter);
                }

                if (displayRecords.length === 0) {
                  return (
                    <div className={\`p-8 text-center \${isDark ? 'text-slate-500' : 'text-slate-400'} text-xs\`}>
                      Tidak ada data guru untuk filter ini.
                    </div>
                  );
                }

                return displayRecords.map((rec) => (
                  <div key={rec.id} className={\`p-3.5 rounded-2xl \${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'} border flex items-center justify-between gap-3 text-xs\`}>
                    <div>
                      <p className={\`font-bold \${isDark ? 'text-slate-100' : 'text-slate-800'}\`}>{rec.teacherName}</p>
                      <p className={\`text-[10px] \${isDark ? 'text-slate-400' : 'text-slate-500'}\`}>{rec.school} {rec.timestamp !== '-' && \`• \${rec.timestamp}\`}</p>
                      {rec.notes && <p className={\`text-[11px] \${isDark ? 'text-slate-400' : 'text-slate-600'} italic mt-0.5\`}>&ldquo;{rec.notes}&rdquo;</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={\`px-3 py-1 rounded-full font-bold text-[10px] \${
                        rec.status === 'Verifikasi' 
                          ? (isDark ? 'bg-amber-950/60 text-amber-300' : 'bg-amber-100 text-amber-800')
                          : rec.status === 'Alpha'
                          ? (isDark ? 'bg-rose-950/60 text-rose-300' : 'bg-rose-100 text-rose-800')
                          : (isDark ? 'bg-emerald-950/60 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                      }\`}>
                        {rec.status}
                      </span>
                      
                      {currentUser.role === 'admin' && (
                        <div className="flex items-center gap-1 ml-2">
                          {rec.status === 'Verifikasi' && (
                            <>
                              <button
                                onClick={() => {
                                  if (confirm(\`Terima kehadiran \${rec.teacherName}?\`)) {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Hadir'});
                                  }
                                }}
                                className={\`p-1.5 rounded-lg \${isDark ? 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-800' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'} transition-colors\`}
                                title="Terima (Hadir)"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(\`Tolak kehadiran \${rec.teacherName}?\`)) {
                                    if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Alpha'});
                                  }
                                }}
                                className={\`p-1.5 rounded-lg \${isDark ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-800' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'} transition-colors\`}
                                title="Tolak (Alpha)"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => {
                              if (confirm(\`Hapus data kehadiran \${rec.teacherName}?\`)) {
                                if (rec.id.startsWith('implicit-alpha')) {
                                  alert('Data ini dihasilkan secara otomatis karena guru belum absen.');
                                } else {
                                  if (onDeleteAttendance) onDeleteAttendance(rec.id);
                                }
                              }
                            }}
                            className={\`p-1.5 rounded-lg \${isDark ? 'bg-rose-900/50 text-rose-400 hover:bg-rose-800' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'} transition-colors\`}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className={\`pt-4 border-t \${isDark ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-end\`}>
              <button
                onClick={() => setViewEventAttendance(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE NEW EVENT */`;

code = code.replace(modalStartRegex, replacement);

fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
