import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# Update the modal wrappers (Daftar Kehadiran and Verifikasi Tugas)
content = content.replace(
    "rounded-3xl max-w-3xl w-full p-6",
    "rounded-3xl max-w-4xl w-full p-8"
)

# Update the scroll container for Daftar Kehadiran
content = content.replace(
    'className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5 pr-6 pl-1 pb-4 custom-scrollbar"',
    'className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5 pr-8 pl-4 pb-4 custom-scrollbar"'
)

# Update the scroll container for Verifikasi Tugas
content = content.replace(
    'className="space-y-3 max-h-[300px] overflow-y-auto pr-6 pl-1 pb-4 custom-scrollbar"',
    'className="space-y-3 max-h-[300px] overflow-y-auto pr-8 pl-4 pb-4 custom-scrollbar"'
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
