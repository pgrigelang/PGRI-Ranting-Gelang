import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# 1. Update max-w-2xl to max-w-3xl for the modals to give more breathing room
content = content.replace(
    "rounded-3xl max-w-2xl w-full p-6 shadow-2xl",
    "rounded-3xl max-w-3xl w-full p-6 shadow-2xl"
)

# 2. Update the scroll container for Daftar Kehadiran
content = content.replace(
    'className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5 px-3 pb-3 pt-1 custom-scrollbar -mx-3"',
    'className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5 pr-4 pl-1 pb-4 custom-scrollbar"'
)

# 3. Update the scroll container for Verifikasi Tugas
content = content.replace(
    'className="space-y-3 max-h-[300px] overflow-y-auto px-3 pb-3 pt-1 custom-scrollbar -mx-3"',
    'className="space-y-3 max-h-[300px] overflow-y-auto pr-4 pl-1 pb-4 custom-scrollbar"'
)

# 4. Update the 'Lihat' button style
content = re.sub(
    r'className=\{`px-3 py-1\.5 rounded-xl flex items-center gap-1\.5 text-xs font-bold \$\{isDark \? \'bg-slate-800 hover:bg-slate-700 text-indigo-400\' : \'bg-indigo-50 hover:bg-indigo-100 text-indigo-600\'\} transition-colors cursor-pointer`\}[\s]*title="Lihat & Download File"[\s]*>[\s]*<Eye className="w-4 h-4" />[\s]*<span>Lihat</span>',
    '''className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm hover:bg-indigo-700 cursor-pointer"
                              title="Lihat & Download File"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat</span>''',
    content
)

# 5. Update the 'Terima' button style
content = re.sub(
    r'className=\{`px-3 py-1\.5 rounded-xl flex items-center gap-1\.5 text-xs font-bold \$\{isDark \? \'bg-slate-800 hover:bg-slate-700 text-emerald-400\' : \'bg-emerald-50 hover:bg-emerald-100 text-emerald-600\'\} transition-colors cursor-pointer`\}[\s]*title="Terima Tugas"[\s]*>[\s]*<CheckCircle2 className="w-4 h-4" />[\s]*<span>Terima</span>',
    '''className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm hover:bg-emerald-700 cursor-pointer"
                                  title="Terima Tugas"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Terima</span>''',
    content
)

# 6. Update the 'Tolak' button style
content = re.sub(
    r'className=\{`px-3 py-1\.5 rounded-xl flex items-center gap-1\.5 text-xs font-bold \$\{isDark \? \'bg-slate-800 hover:bg-slate-700 text-amber-400\' : \'bg-amber-50 hover:bg-amber-100 text-amber-600\'\} transition-colors cursor-pointer`\}[\s]*title="Tolak Tugas"[\s]*>[\s]*<X className="w-4 h-4" />[\s]*<span>Tolak</span>',
    '''className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm hover:bg-amber-600 cursor-pointer"
                                  title="Tolak Tugas"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tolak</span>''',
    content
)

# 7. Update the 'Hapus' button style (Batalkan Verifikasi)
content = re.sub(
    r'className=\{`px-3 py-1\.5 rounded-xl flex items-center gap-1\.5 text-xs font-bold \$\{isDark \? \'bg-slate-800 hover:bg-slate-700 text-rose-400\' : \'bg-rose-50 hover:bg-rose-100 text-rose-600\'\} transition-colors cursor-pointer`\}[\s]*title="Batalkan Verifikasi"[\s]*>[\s]*<Trash2 className="w-4 h-4" />[\s]*<span>Hapus</span>',
    '''className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm hover:bg-rose-700 cursor-pointer"
                              title="Batalkan Verifikasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>''',
    content
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
