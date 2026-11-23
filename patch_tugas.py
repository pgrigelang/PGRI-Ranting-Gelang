import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# Replace Eye
content = content.replace(
    '''<a
                              href={ts.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'} transition-colors cursor-pointer`}
                              title="Lihat & Download File"
                            >
                              <Eye className="w-4 h-4" />
                            </a>''',
    '''<a
                              href={ts.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'} transition-colors cursor-pointer`}
                              title="Lihat & Download File"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Lihat</span>
                            </a>'''
)

# Replace CheckCircle2
content = content.replace(
    '''<button
                                  onClick={() => {
                                    setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Terverifikasi' } : item));
                                    setToastMessage('Tugas berhasil diverifikasi!');
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'} transition-colors cursor-pointer`}
                                  title="Terima Tugas"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>''',
    '''<button
                                  onClick={() => {
                                    setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Terverifikasi' } : item));
                                    setToastMessage('Tugas berhasil diverifikasi!');
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'} transition-colors cursor-pointer`}
                                  title="Terima Tugas"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Terima</span>
                                </button>'''
)

# Replace X
content = content.replace(
    '''<button
                                  onClick={() => {
                                    setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Ditolak' } : item));
                                    setToastMessage('Tugas ditolak!');
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-600'} transition-colors cursor-pointer`}
                                  title="Tolak Tugas"
                                >
                                  <X className="w-4 h-4" />
                                </button>''',
    '''<button
                                  onClick={() => {
                                    setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Ditolak' } : item));
                                    setToastMessage('Tugas ditolak!');
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-600'} transition-colors cursor-pointer`}
                                  title="Tolak Tugas"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Tolak</span>
                                </button>'''
)

# Replace Trash2
content = content.replace(
    '''<button
                              onClick={() => {
                                if (confirm(`Apakah Anda yakin ingin mengembalikan tugas dari ${ts.teacherName} ke status Belum Diverifikasi?`)) {
                                  setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Belum Diverifikasi' } : item));
                                  setToastMessage('Tugas dikembalikan ke Belum Diverifikasi!');
                                  setTimeout(() => setToastMessage(null), 3000);
                                }
                              }}
                              className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-rose-400' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'} transition-colors cursor-pointer`}
                              title="Batalkan Verifikasi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>''',
    '''<button
                              onClick={() => {
                                if (confirm(`Apakah Anda yakin ingin mengembalikan tugas dari ${ts.teacherName} ke status Belum Diverifikasi?`)) {
                                  setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Belum Diverifikasi' } : item));
                                  setToastMessage('Tugas dikembalikan ke Belum Diverifikasi!');
                                  setTimeout(() => setToastMessage(null), 3000);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-rose-400' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'} transition-colors cursor-pointer`}
                              title="Batalkan Verifikasi"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Hapus</span>
                            </button>'''
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
