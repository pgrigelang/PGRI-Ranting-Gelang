import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# 1. Update list container height for Daftar Kehadiran
content = content.replace(
    'className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5 pr-8 pl-4 pb-4 custom-scrollbar"',
    'className="mt-4 h-[380px] overflow-y-auto space-y-2.5 pr-8 pl-4 pb-4 custom-scrollbar"'
)

# 2. Update empty state for Daftar Kehadiran
old_empty_1 = """                if (displayRecords.length === 0) {
                  return (
                    <div className={`p-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'} text-xs`}>
                      Tidak ada data guru untuk filter ini.
                    </div>
                  );
                }"""

new_empty_1 = """                if (displayRecords.length === 0) {
                  return (
                    <div className={`h-full flex flex-col items-center justify-center p-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'} text-xs`}>
                      <ClipboardCheck className={`w-12 h-12 mb-3 opacity-20`} />
                      Tidak ada data guru untuk filter ini.
                    </div>
                  );
                }"""
content = content.replace(old_empty_1, new_empty_1)


# 3. Update list container height for Verifikasi Tugas
content = content.replace(
    'className="space-y-3 max-h-[300px] overflow-y-auto pr-8 pl-4 pb-4 custom-scrollbar"',
    'className="space-y-3 h-[380px] overflow-y-auto pr-8 pl-4 pb-4 custom-scrollbar"'
)

# 4. Update empty states for Verifikasi Tugas
content = content.replace(
    '<div className="py-8 flex flex-col items-center justify-center text-center">',
    '<div className="h-full flex flex-col items-center justify-center text-center">'
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
