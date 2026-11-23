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
        print(f"Not found in {filename} '{old_str[:30]}'")

patch_file("ForumView.tsx", 'className="px-6 py-3 rounded-full bg-indigo-500 hover:bg-indigo-400', 'className="relative z-10 px-6 py-3 rounded-full bg-indigo-500 hover:bg-indigo-400')
patch_file("MateriView.tsx", 'className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300', 'className="relative z-10 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300')
patch_file("PengaturanView.tsx", 'className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700', 'className="relative z-10 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700')

