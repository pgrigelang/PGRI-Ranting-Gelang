import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '<span>{rec.status === \'Verifikasi\' ? "Hapus" : "Batal"}</span>',
    '<span>Hapus</span>'
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
