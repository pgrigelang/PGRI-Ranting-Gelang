import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# Replace the condition to remove 'Ditolak' from 'belum'
new_content = content.replace(
    "ts.status === 'Belum Diverifikasi' || ts.status === 'Ditolak'",
    "ts.status === 'Belum Diverifikasi'"
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(new_content)
