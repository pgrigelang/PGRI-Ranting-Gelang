const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const newModalBlock = `
      {/* MODAL HAPUS EVENT */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={\`bg-white [\${isDark ? '.dark_' : ''}&]:bg-slate-900 \${isDark ? 'bg-slate-900 border-slate-800' : 'border-slate-100'} rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200\`}>
            <div className={\`flex items-center gap-3 \${isDark ? 'text-rose-400' : 'text-rose-600'}\`}>
              <div className={\`w-10 h-10 rounded-full \${isDark ? 'bg-rose-900/40' : 'bg-rose-100'} flex items-center justify-center shrink-0\`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={\`font-bold text-base \${isDark ? 'text-white' : 'text-slate-900'}\`}>
                  Konfirmasi Hapus
                </h3>
                <p className={\`text-xs mt-0.5 \${isDark ? 'text-rose-400/80' : 'text-rose-600/80'}\`}>
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <p className={\`text-sm \${isDark ? 'text-slate-300' : 'text-slate-600'}\`}>
              Apakah Anda yakin ingin menghapus jadwal kegiatan <span className="font-bold">{deleteEventTarget.title}</span>?
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteEventTarget(null)}
                className={\`px-4 py-2 rounded-xl \${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} font-bold text-xs transition-colors cursor-pointer\`}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onDeleteEvent) onDeleteEvent(deleteEventTarget.id);
                  setDeleteEventTarget(null);
                  setToastMessage('Jadwal kegiatan berhasil dihapus!');
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 stroke-[3]" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD TUGAS */}
      {showUploadTaskModal && selectedEventForUpload && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={\`\${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-3xl max-w-xl w-full p-6 shadow-2xl border animate-in zoom-in-95 duration-200 my-8\`}>
            <div className={\`flex items-center justify-between pb-3 border-b \${isDark ? 'border-slate-800' : 'border-slate-100'}\`}>
              <h3 className={\`font-extrabold text-base \${isDark ? 'text-slate-100' : 'text-slate-800'}\`}>Upload Tugas</h3>
              <button onClick={() => setShowUploadTaskModal(false)} className={\`p-1 rounded-lg \${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'} transition-colors\`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className={\`p-3 rounded-xl border \${isDark ? 'bg-indigo-950/30 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}\`}>
                <p className={\`text-xs font-bold \${isDark ? 'text-indigo-300' : 'text-indigo-700'}\`}>{selectedEventForUpload.title}</p>
                <p className={\`text-[11px] \${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1\`}>{selectedEventForUpload.fullDate}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5\`}>Nama Guru</label>
                  <select
                    value={uploadTaskTeacherId}
                    onChange={(e) => setUploadTaskTeacherId(e.target.value)}
                    className={\`w-full px-3 py-2 rounded-xl \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'} border text-xs font-medium\`}
                  >
                    {activeTeachers.map(t => (
                      <option key={t.id} value={t.id} className={isDark ? "bg-slate-800 text-slate-100" : "bg-white text-slate-800"}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5\`}>NIP</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedTaskTeacher?.nip || '-'}
                    className={\`w-full px-3 py-2 rounded-xl \${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'} border text-xs font-medium cursor-not-allowed\`}
                  />
                </div>
                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5\`}>Jenis Kelamin</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedTaskTeacher ? (selectedTaskTeacher.gender === 'L' ? 'Laki - Laki' : 'Perempuan') : '-'}
                    className={\`w-full px-3 py-2 rounded-xl \${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'} border text-xs font-medium cursor-not-allowed\`}
                  />
                </div>
                <div>
                  <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5\`}>Asal Sekolah</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedTaskTeacher?.school || '-'}
                    className={\`w-full px-3 py-2 rounded-xl \${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'} border text-xs font-medium cursor-not-allowed\`}
                  />
                </div>
              </div>

              <div>
                <label className={\`block text-xs font-bold \${isDark ? 'text-slate-300' : 'text-slate-700'} mb-2\`}>Pilih File Tugas</label>
                <div className={\`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors \${uploadTaskFile ? (isDark ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-500 bg-emerald-50') : (isDark ? 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50')}\`}>
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadTaskFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className={\`w-12 h-12 rounded-full flex items-center justify-center \${uploadTaskFile ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600') : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}\`}>
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className={\`text-sm font-bold \${isDark ? 'text-slate-200' : 'text-slate-700'}\`}>
                      {uploadTaskFile ? uploadTaskFile.name : 'Klik atau seret file ke sini'}
                    </p>
                    <p className={\`text-xs mt-1 \${isDark ? 'text-slate-400' : 'text-slate-500'}\`}>
                      {uploadTaskFile ? \`\${(uploadTaskFile.size / 1024 / 1024).toFixed(2)} MB\` : 'PDF, Word, PPT, Excel, atau ZIP (Maks. 25 MB)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={\`pt-4 border-t \${isDark ? 'border-slate-800' : 'border-slate-100'} flex justify-end gap-2\`}>
              <button
                onClick={() => setShowUploadTaskModal(false)}
                className={\`px-4 py-2 rounded-xl \${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-bold text-xs transition-colors\`}
              >
                Batal
              </button>
              <button
                disabled={!uploadTaskFile || isUploadingTask || !selectedTaskTeacher}
                onClick={() => {
                  if (!uploadTaskFile || !selectedTaskTeacher) return;
                  setIsUploadingTask(true);
                  
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    try {
                      const base64String = (reader.result).split(',')[1];
                      const payload = {
                        fileData: base64String,
                        fileName: uploadTaskFile.name,
                        mimeType: uploadTaskFile.type || 'application/octet-stream'
                      };
                      
                      const response = await fetch(GAS_WEB_APP_URL, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'text/plain;charset=utf-8'
                        },
                        body: JSON.stringify(payload)
                      });
                      
                      const result = await response.json();
                      
                      if (result.status === 'success') {
                        const newSubmission = {
                          id: Date.now().toString(),
                          eventId: selectedEventForUpload.id,
                          teacherId: selectedTaskTeacher.id,
                          teacherName: selectedTaskTeacher.name,
                          teacherNip: selectedTaskTeacher.nip || '-',
                          teacherGender: selectedTaskTeacher.gender === 'L' ? 'Laki - Laki' : 'Perempuan',
                          teacherSchool: selectedTaskTeacher.school,
                          fileUrl: result.url,
                          fileName: uploadTaskFile.name,
                          status: 'Belum Diverifikasi',
                          date: new Date().toISOString()
                        };
                        setTaskSubmissions(prev => [newSubmission, ...prev]);
                        setToastMessage('Tugas berhasil diunggah!');
                      } else {
                        setToastMessage('Gagal mengunggah tugas.');
                      }
                    } catch (err) {
                      console.error(err);
                      setToastMessage('Terjadi kesalahan saat mengunggah.');
                    } finally {
                      setIsUploadingTask(false);
                      setShowUploadTaskModal(false);
                      setUploadTaskFile(null);
                      setTimeout(() => setToastMessage(null), 3500);
                    }
                  };
                  reader.readAsDataURL(uploadTaskFile);
                }}
                className={\`px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 \${(!uploadTaskFile || isUploadingTask) ? 'opacity-50 cursor-not-allowed' : ''}\`}
              >
                {isUploadingTask ? 'Mengunggah...' : 'Simpan Tugas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI TUGAS */}
      {showVerifyTaskModal && selectedEventForVerify && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={\`\${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-3xl max-w-2xl w-full p-6 shadow-2xl border animate-in zoom-in-95 duration-200\`}>
            <div className={\`flex items-center justify-between pb-3 border-b \${isDark ? 'border-slate-800' : 'border-slate-100'}\`}>
              <h3 className={\`font-extrabold text-base \${isDark ? 'text-slate-100' : 'text-slate-800'}\`}>Verifikasi Tugas</h3>
              <button onClick={() => setShowVerifyTaskModal(false)} className={\`p-1 rounded-lg \${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'} transition-colors\`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className={\`p-3 rounded-xl border \${isDark ? 'bg-indigo-950/30 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}\`}>
                <p className={\`text-xs font-bold \${isDark ? 'text-indigo-300' : 'text-indigo-700'}\`}>{selectedEventForVerify.title}</p>
                <p className={\`text-[11px] \${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1\`}>{selectedEventForVerify.fullDate}</p>
              </div>

              <div className={\`flex items-center gap-2 p-1 rounded-xl \${isDark ? 'bg-slate-800' : 'bg-slate-100'}\`}>
                <button
                  onClick={() => setVerifyFilter('belum')}
                  className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${
                    verifyFilter === 'belum'
                      ? (isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                      : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                  }\`}
                >
                  Belum Upload
                </button>
                <button
                  onClick={() => setVerifyFilter('sudah')}
                  className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${
                    verifyFilter === 'sudah'
                      ? (isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                      : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                  }\`}
                >
                  Sudah Upload
                </button>
              </div>

              <div className={\`space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar\`}>
                {taskSubmissions.filter(ts => ts.eventId === selectedEventForVerify.id && (verifyFilter === 'belum' ? ts.status === 'Belum Diverifikasi' : ts.status === 'Terverifikasi')).length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <ClipboardCheck className={\`w-12 h-12 mb-3 \${isDark ? 'text-slate-700' : 'text-slate-200'}\`} />
                    <p className={\`text-sm font-bold \${isDark ? 'text-slate-300' : 'text-slate-600'}\`}>Tidak ada data</p>
                    <p className={\`text-xs \${isDark ? 'text-slate-500' : 'text-slate-400'}\`}>Belum ada tugas di kategori ini.</p>
                  </div>
                ) : (
                  taskSubmissions.filter(ts => ts.eventId === selectedEventForVerify.id && (verifyFilter === 'belum' ? ts.status === 'Belum Diverifikasi' : ts.status === 'Terverifikasi')).map(ts => (
                    <div key={ts.id} className={\`flex items-center justify-between p-3.5 rounded-2xl border \${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}\`}>
                      <div className="flex flex-col gap-0.5">
                        <span className={\`text-sm font-bold \${isDark ? 'text-slate-200' : 'text-slate-800'}\`}>{ts.teacherName}</span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={\`\${isDark ? 'text-slate-400' : 'text-slate-500'}\`}>{ts.teacherSchool}</span>
                          <span className={\`\${isDark ? 'text-slate-600' : 'text-slate-300'}\`}>•</span>
                          <span className={\`\${isDark ? 'text-slate-400' : 'text-slate-500'} truncate max-w-[150px]\`} title={ts.fileName}>{ts.fileName}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {currentUser.role === 'admin' && (
                          <>
                            <a
                              href={ts.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={\`p-2 rounded-xl \${isDark ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'} transition-colors cursor-pointer\`}
                              title="Lihat & Download File"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            {ts.status === 'Belum Diverifikasi' && (
                              <button
                                onClick={() => {
                                  setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Terverifikasi' } : item));
                                  setToastMessage('Tugas berhasil diverifikasi!');
                                  setTimeout(() => setToastMessage(null), 3000);
                                }}
                                className={\`p-2 rounded-xl \${isDark ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'} transition-colors cursor-pointer\`}
                                title="Verifikasi Tugas"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        <span className={\`px-2.5 py-1 rounded-lg text-[10px] font-bold \${ts.status === 'Terverifikasi' ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700')}\`}>
                          {ts.status === 'Terverifikasi' ? 'Sudah Verifikasi' : 'Belum Verifikasi'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            <div className={\`pt-4 border-t \${isDark ? 'border-slate-800' : 'border-slate-100'} flex justify-end\`}>
              <button
                onClick={() => setShowVerifyTaskModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(/    <\/div>\s*  \);\s*};\s*$/, newModalBlock + '\n    </div>\n  );\n};\n');

fs.writeFileSync('src/components/views/JadwalView.tsx', code);
console.log('Fixed modals in JadwalView.tsx');
