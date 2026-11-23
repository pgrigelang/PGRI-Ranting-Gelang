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

# ForumView
patch_file("ForumView.tsx", 'className="px-6 py-3.5 rounded-2xl bg-amber-400', 'className="relative z-10 px-6 py-3.5 rounded-2xl bg-amber-400')

# PengaturanView
patch_file("PengaturanView.tsx", 'className={`px-6 py-3 rounded-full font-black', 'className={`relative z-10 px-6 py-3 rounded-full font-black')

