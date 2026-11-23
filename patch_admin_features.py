import re

# 1. KeuanganView.tsx
with open("src/components/views/KeuanganView.tsx", "r") as f:
    keu_content = f.read()

keu_button_regex = r'(<button\s*onClick=\{handleOpenAdd\}[\s\S]*?<span className="relative z-10 uppercase tracking-wide hidden sm:inline">Tambah Transaksi</span>\s*</button>)'
keu_content = re.sub(keu_button_regex, r'{activeRole === "admin" && (\1)}', keu_content)

with open("src/components/views/KeuanganView.tsx", "w") as f:
    f.write(keu_content)


# 2. MateriView.tsx
with open("src/components/views/MateriView.tsx", "r") as f:
    mat_content = f.read()

mat_button_regex = r'(<button\s*onClick=\{\(\) => setShowUploadModal\(true\)\}[\s\S]*?<span className="relative z-10 uppercase tracking-wide">Unggah Materi Baru</span>\s*</button>)'
mat_content = re.sub(mat_button_regex, r'{activeRole === "admin" && (\1)}', mat_content)

with open("src/components/views/MateriView.tsx", "w") as f:
    f.write(mat_content)


# 3. AnggotaView.tsx
with open("src/components/views/AnggotaView.tsx", "r") as f:
    ang_content = f.read()

edit_btn_regex = r'(<button\s*onClick=\{\(\) => handleOpenEdit\(teacher\)\}[\s\S]*?title="Edit Data Guru"\s*>[\s\S]*?</button>)'
ang_content = re.sub(edit_btn_regex, r'{activeRole === "admin" && (\1)}', ang_content)

del_btn_regex = r'(<button\s*onClick=\{\(\) => handleDelete\(teacher.id, teacher.name\)\}[\s\S]*?title="Hapus Data Guru"\s*>[\s\S]*?</button>)'
ang_content = re.sub(del_btn_regex, r'{activeRole === "admin" && (\1)}', ang_content)

# Disable "Aktif" button for non-admin
aktif_btn_regex = r'(<button\s*type="button"\s*onClick=\{\(\) => handleToggleActiveStatus\(teacher, true\)\}[\s\S]*?>[\s\S]*?Aktif\s*</button>)'
def repl_aktif(m):
    return m.group(1).replace('<button', '<button disabled={activeRole !== "admin"}')
ang_content = re.sub(aktif_btn_regex, repl_aktif, ang_content)

# Disable "Tidak Aktif" button for non-admin
inaktif_btn_regex = r'(<button\s*type="button"\s*onClick=\{\(\) => handleToggleActiveStatus\(teacher, false\)\}[\s\S]*?>[\s\S]*?Tidak Aktif\s*</button>)'
def repl_inaktif(m):
    return m.group(1).replace('<button', '<button disabled={activeRole !== "admin"}')
ang_content = re.sub(inaktif_btn_regex, repl_inaktif, ang_content)

with open("src/components/views/AnggotaView.tsx", "w") as f:
    f.write(ang_content)

print("Done patching.")
