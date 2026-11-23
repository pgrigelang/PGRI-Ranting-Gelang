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
            
        # The previous classes were something like: bg-gradient-to-r from-violet-600 to-purple-700
        # We want to replace whatever bg-gradient-to-r from-X to-Y with from-[color]-600 to-white/30
        
        # Regex to find bg-gradient-to-r from-... to-...
        # We know they start with `bg-gradient-to-r from-` and end with `rounded-3xl` (mostly)
        # Or we can just use regex substitution.
        
        # In BerandaView, we used `bg-gradient-to-r from-sky-500 to-blue-600 border-0`
        new_gradient = f"bg-gradient-to-r from-{color}-600 to-white/40"
        
        if filename == "BerandaView.tsx":
            content = re.sub(r'bg-gradient-to-r from-[a-z]+-\d+ to-[a-z]+-\d+', new_gradient, content, count=1)
        else:
            content = re.sub(r'bg-gradient-to-r from-[a-z]+-\d+ to-[a-z]+-\d+', new_gradient, content, count=1)
            
        with open(path, "w") as f:
            f.write(content)
        print(f"Updated {filename} to {color}")
        
