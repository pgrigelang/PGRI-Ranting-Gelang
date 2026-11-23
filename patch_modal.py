import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

delete_attendance_modal = """      {/* MODAL HAPUS KEHADIRAN (VERIFIKASI) */}
      {deleteAttendanceTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200`}>
            <div className={`flex items-center gap-3 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-rose-900/40' : 'bg-rose-100'} flex items-center justify-center shrink-0`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Konfirmasi Hapus Data
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-rose-400/80' : 'text-rose-600/80'}`}>
                  Apakah Anda yakin ingin menghapus data kehadiran ini?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteAttendanceTarget(null)}
                className={`flex-1 px-4 py-2.5 rounded-full font-bold text-xs transition-colors cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onDeleteAttendance) onDeleteAttendance(deleteAttendanceTarget);
                  setDeleteAttendanceTarget(null);
                  setToastMessage('Data kehadiran berhasil dihapus!');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="relative overflow-hidden flex-1 px-4 py-2.5 rounded-full bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-rose-300/60 shadow-[0_4px_12px_rgba(225,29,72,0.4)] hover:shadow-[0_6px_16px_rgba(225,29,72,0.6)] active:scale-95 transition-all cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
                <Trash2 className="w-4 h-4 stroke-[3] relative z-10" />
                <span className="relative z-10">Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW EVENT ATTENDANCE LIST */}"""

content = content.replace("{/* MODAL VIEW EVENT ATTENDANCE LIST */}", delete_attendance_modal)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
