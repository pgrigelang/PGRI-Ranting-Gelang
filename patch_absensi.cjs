const fs = require('fs');
let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const startMarker = '<form onSubmit={handleAbsensiSubmit} className="mt-4 space-y-4">';
const endMarker = '<div className={`p-3 rounded-2xl ${isDark ? \'bg-indigo-950/40 border-indigo-900/50 text-indigo-200\' : \'bg-indigo-50/70 border-indigo-100 text-indigo-900\'} border flex items-start gap-2 text-xs font-medium`}>';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const before = code.substring(0, startIndex);
  const after = code.substring(endIndex);

  const replacement = `<form onSubmit={handleAbsensiSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1\`}>
                    Pilih Nama Guru (Anggota Kombel)
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value);
                      const found = teachers.find(t => t.id === e.target.value);
                      if (found) setSchoolName(found.school);
                    }}
                    className={\`w-full px-3.5 py-2.5 rounded-xl \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'} border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20\`}
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id} className={isDark ? "bg-slate-800 text-slate-100" : "bg-white text-slate-800"}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1\`}>
                    NIP
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={teachers.find(t => t.id === selectedTeacherId)?.nip || '-'}
                    className={\`w-full px-3.5 py-2.5 rounded-xl \${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'} border text-xs font-medium cursor-not-allowed\`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1\`}>Jenis Kelamin</label>
                  <input
                    type="text"
                    readOnly
                    value={teachers.find(t => t.id === selectedTeacherId) ? (getGender(teachers.find(t => t.id === selectedTeacherId)!) === 'L' ? 'Laki - Laki' : 'Perempuan') : '-'}
                    className={\`w-full px-3.5 py-2.5 rounded-xl \${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'} border text-xs font-medium cursor-not-allowed\`}
                  />
                </div>

                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1\`}>Asal Sekolah SD</label>
                  <input
                    type="text"
                    readOnly
                    value={teachers.find(t => t.id === selectedTeacherId)?.school || '-'}
                    className={\`w-full px-3.5 py-2.5 rounded-xl \${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'} border text-xs font-medium cursor-not-allowed\`}
                  />
                </div>
              </div>

              <div>
                <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1\`}>
                  Status Kehadiran <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Hadir', 'Izin', 'Sakit'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAttendanceStatus(status as any)}
                      className={\`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer \${
                        attendanceStatus === status
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : isDark
                          ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }\`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {(attendanceStatus === 'Sakit' || attendanceStatus === 'Izin') && (
                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1\`}>Catatan / Alasan</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={\`Masukkan keterangan tambahan karena \${attendanceStatus}...\`}
                    className={\`w-full px-3.5 py-2.5 rounded-xl \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'} border text-xs font-medium\`}
                  />
                </div>
              )}

              `;

  fs.writeFileSync('src/components/views/JadwalView.tsx', before + replacement + after, 'utf8');
  console.log('Successfully replaced');
} else {
  console.log('Failed to find markers', startIndex, endIndex);
}
