import os
import re

views_dir = "src/components/views"

colors_map = {
    "BerandaView.tsx": "blue",
    "ProfilKBView.tsx": "purple",
    "AnggotaView.tsx": "pink",
    "MateriView.tsx": "orange",
    "JadwalView.tsx": "green",
    "KeuanganView.tsx": "yellow",
    "ForumView.tsx": "teal",
    "DokumenView.tsx": "cyan",
    "KontakView.tsx": "rose",
    "PengaturanView.tsx": "slate"
}

for filename, color in colors_map.items():
    path = os.path.join(views_dir, filename)
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
            
        new_gradient = f"bg-gradient-to-r from-{color}-600 to-white/50"
        
        content = re.sub(r'bg-gradient-to-r from-[a-z]+-\d+ to-white/\d+', new_gradient, content, count=1)
            
        with open(path, "w") as f:
            f.write(content)

print("Done colors2")
