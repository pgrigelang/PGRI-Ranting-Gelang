import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# 1. Swap Terverifikasi and Belum Diverifikasi buttons
old_buttons = """                <button
                  onClick={() => setVerifyFilter('belum')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    verifyFilter === 'belum'
                      ? (isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                      : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                  }`}
                >
                  Belum Diverifikasi
                </button>
                <button
                  onClick={() => setVerifyFilter('sudah')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    verifyFilter === 'sudah'
                      ? (isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                      : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                  }`}
                >
                  Terverifikasi
                </button>"""

new_buttons = """                <button
                  onClick={() => setVerifyFilter('sudah')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    verifyFilter === 'sudah'
                      ? (isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                      : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                  }`}
                >
                  Terverifikasi
                </button>
                <button
                  onClick={() => setVerifyFilter('belum')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    verifyFilter === 'belum'
                      ? (isDark ? 'bg-slate-700 text-slate-100 shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                      : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
                  }`}
                >
                  Belum Diverifikasi
                </button>"""

content = content.replace(old_buttons, new_buttons)

# 2. Add padding to list containers
content = content.replace(
    'className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar"',
    'className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5 px-3 pb-3 pt-1 custom-scrollbar -mx-3"'
)

content = content.replace(
    'className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"',
    'className="space-y-3 max-h-[300px] overflow-y-auto px-3 pb-3 pt-1 custom-scrollbar -mx-3"'
)

# 3. Increase max-w to prevent truncation of file name if they meant that
content = content.replace(
    'truncate max-w-[150px]',
    'truncate max-w-[200px]'
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
