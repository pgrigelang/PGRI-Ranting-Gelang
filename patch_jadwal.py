import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# 1. Update text alignment (add pl-3)
content = content.replace(
    """<span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium`}>\n                            {evt.fullDate}""",
    """<span className={`pl-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium`}>\n                            {evt.fullDate}"""
)

# 2. Update trash bin logic in 'Terverifikasi'
content = content.replace(
    """if (confirm(`Apakah Anda yakin ingin menghapus tugas dari ${ts.teacherName}?`)) {\n                                  setTaskSubmissions(prev => prev.filter(item => item.id !== ts.id));\n                                  setToastMessage('Tugas berhasil dihapus!');""",
    """if (confirm(`Apakah Anda yakin ingin mengembalikan tugas dari ${ts.teacherName} ke status Belum Diverifikasi?`)) {\n                                  setTaskSubmissions(prev => prev.map(item => item.id === ts.id ? { ...item, status: 'Belum Diverifikasi' } : item));\n                                  setToastMessage('Tugas dikembalikan ke Belum Diverifikasi!');"""
)

# Also update the title of the trash bin button to reflect its new behavior
content = content.replace(
    """title="Hapus Tugas"\n                            >\n                              <Trash2 className="w-4 h-4" />""",
    """title="Batalkan Verifikasi"\n                            >\n                              <Trash2 className="w-4 h-4" />"""
)

# 3. Change 'Belum Upload' to 'Tidak Upload'
content = content.replace("'Belum Upload'", "'Tidak Upload'")

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
