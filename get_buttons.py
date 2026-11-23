import re
import os

views = [
    "AnggotaView.tsx",
    "BerandaView.tsx",
    "DokumenView.tsx",
    "ForumView.tsx",
    "KeuanganView.tsx",
    "MateriView.tsx",
    "PengaturanView.tsx"
]

for view in views:
    path = os.path.join("src/components/views", view)
    with open(path, "r") as f:
        content = f.read()
    
    # Extract just the header part (roughly from "Header Banner" to the end of the flex container)
    header_match = re.search(r'Header Banner.*?</div>\s*</div>', content, re.DOTALL)
    if header_match:
        header = header_match.group(0)
        buttons = re.findall(r'<button.*?</button>', header, re.DOTALL)
        links = re.findall(r'<a[^>]*w-full[^>]*>.*?</a>', header, re.DOTALL)
        print(f"--- {view} ---")
        for b in buttons:
            print(b)
        for l in links:
            print(l)
    else:
        # Check if maybe different comment or structure
        # Just grab the first 1000 chars and look for buttons
        header = content[:1500]
        buttons = re.findall(r'<button.*?</button>', header, re.DOTALL)
        links = re.findall(r'<a[^>]*w-full[^>]*>.*?</a>', header, re.DOTALL)
        print(f"--- {view} (fallback) ---")
        for b in buttons:
            print(b)
        for l in links:
            print(l)

