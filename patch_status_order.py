import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "(['Hadir', 'Izin', 'Sakit'] as const)",
    "(['Hadir', 'Sakit', 'Izin'] as const)"
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
