import os

views_dir = "src/components/views"

def patch_file(filename, old_str, new_str):
    path = os.path.join(views_dir, filename)
    with open(path, "r") as f:
        content = f.read()
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(path, "w") as f:
            f.write(content)
        print(f"Patched {filename}")
    else:
        print(f"Not found in {filename}")

# AnggotaView
anggota_old = """      {/* Header Banner */}
      <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(99,102,241,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>"""
anggota_new = """      {/* Header Banner */}
      <div className="relative overflow-hidden w-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(139,92,246,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">"""
patch_file("AnggotaView.tsx", anggota_old, anggota_new)

# BerandaView
beranda_old = 'className="rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group animate-banner-entry bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 border-0 text-white shadow-xl hover:shadow-indigo-500/20"'
beranda_new = 'className="rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group animate-banner-entry bg-gradient-to-r from-sky-500 to-blue-600 border-0 text-white shadow-xl hover:shadow-indigo-500/20"'
patch_file("BerandaView.tsx", beranda_old, beranda_new)

beranda_old2 = """      >
        <style>{`"""
beranda_new2 = """      >
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <style>{`"""
patch_file("BerandaView.tsx", beranda_old2, beranda_new2)


# DokumenView
dokumen_old = """      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(245,158,11,0.25)]">
        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold inline-flex items-center gap-1.5 mb-2">"""
dokumen_new = """      {/* Header Banner */}
      <div className="relative overflow-hidden w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(245,158,11,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold inline-flex items-center gap-1.5 mb-2">"""
patch_file("DokumenView.tsx", dokumen_old, dokumen_new)
# We also need to close the extra div in DokumenView
dokumen_old_close = """      </div>

      {/* Document List */}"""
dokumen_new_close = """        </div>
      </div>

      {/* Document List */}"""
patch_file("DokumenView.tsx", dokumen_old_close, dokumen_new_close)

# ForumView
forum_old = """      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(79,70,229,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>"""
forum_new = """      {/* Header Banner */}
      <div className="relative overflow-hidden w-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(79,70,229,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">"""
patch_file("ForumView.tsx", forum_old, forum_new)

# JadwalView
jadwal_old = """      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(59,130,246,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">"""
jadwal_new = """      <div className="relative overflow-hidden w-full bg-gradient-to-r from-cyan-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(8,145,178,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">"""
patch_file("JadwalView.tsx", jadwal_old, jadwal_new)

# KeuanganView
keuangan_old = """      {/* Header Banner */}
      <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(99,102,241,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>"""
keuangan_new = """      {/* Header Banner */}
      <div className="relative overflow-hidden w-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(16,185,129,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">"""
patch_file("KeuanganView.tsx", keuangan_old, keuangan_new)

# KontakView
kontak_old = """      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(79,70,229,0.25)]">
        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold inline-flex items-center gap-1.5 mb-2">"""
kontak_new = """      {/* Header Banner */}
      <div className="relative overflow-hidden w-full bg-gradient-to-r from-pink-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(244,63,94,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold inline-flex items-center gap-1.5 mb-2">"""
patch_file("KontakView.tsx", kontak_old, kontak_new)
kontak_old_close = """      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">"""
kontak_new_close = """        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">"""
patch_file("KontakView.tsx", kontak_old_close, kontak_new_close)

# MateriView
materi_old = """      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(16,185,129,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>"""
materi_new = """      <div className="relative overflow-hidden w-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(20,184,166,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">"""
patch_file("MateriView.tsx", materi_old, materi_new)

# PengaturanView
pengaturan_old = """      {/* Header Banner */}
      <div className="w-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>"""
pengaturan_new = """      {/* Header Banner */}
      <div className="relative overflow-hidden w-full bg-gradient-to-r from-slate-600 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(71,85,105,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">"""
patch_file("PengaturanView.tsx", pengaturan_old, pengaturan_new)

# ProfilKBView
profil_old = """      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(59,130,246,0.25)]">
        <span className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-white text-xs font-bold inline-flex items-center gap-1.5 mb-2">"""
profil_new = """      {/* Header Banner */}
      <div className="relative overflow-hidden w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(217,70,239,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Layer Cahaya Berjalan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-rtl" />
        </div>
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-white text-xs font-bold inline-flex items-center gap-1.5 mb-2">"""
patch_file("ProfilKBView.tsx", profil_old, profil_new)
profil_old_close = """      </div>

      {/* Vision & Mission */}"""
profil_new_close = """        </div>
      </div>

      {/* Vision & Mission */}"""
patch_file("ProfilKBView.tsx", profil_old_close, profil_new_close)

# Now, we also need to add `relative z-10` to the buttons on the right side of the headers 
# for AnggotaView, ForumView, MateriView, PengaturanView.
def patch_z10(filename, old_str, new_str):
    path = os.path.join(views_dir, filename)
    with open(path, "r") as f:
        content = f.read()
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(path, "w") as f:
            f.write(content)
        print(f"Patched z-10 for {filename}")

patch_z10("AnggotaView.tsx", '<div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">', '<div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">')
patch_z10("ForumView.tsx", '<button\n          onClick={() => setShowAddModal(true)}', '<button\n          onClick={() => setShowAddModal(true)}\n          className="relative z-10 "') # Actually wait, I shouldn't break the existing class. Let's do it safer.

