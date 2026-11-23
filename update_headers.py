import re
import os

views_dir = "src/components/views"

replacements = {
    "AnggotaView.tsx": {
        "old_class": r'className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(99,102,241,0\.25\)\] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-violet-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(139,92,246,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "DokumenView.tsx": {
        "old_class": r'className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(245,158,11,0\.25\)\]"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(245,158,11,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "ForumView.tsx": {
        "old_class": r'className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(79,70,229,0\.25\)\] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(79,70,229,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "JadwalView.tsx": {
        "old_class": r'className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(59,130,246,0\.25\)\] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-cyan-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(8,145,178,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "KeuanganView.tsx": {
        "old_class": r'className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(99,102,241,0\.25\)\] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(16,185,129,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "KontakView.tsx": {
        "old_class": r'className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(79,70,229,0\.25\)\]"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-pink-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(244,63,94,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "MateriView.tsx": {
        "old_class": r'className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(16,185,129,0\.25\)\] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(20,184,166,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "PengaturanView.tsx": {
        "old_class": r'className="w-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-slate-600 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(71,85,105,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    },
    "ProfilKBView.tsx": {
        "old_class": r'className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-\[0_10px_25px_rgba\(59,130,246,0\.25\)\]"',
        "new_class": 'className="relative overflow-hidden w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_25px_rgba(217,70,239,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"'
    }
}

for file_name, config in replacements.items():
    path = os.path.join(views_dir, file_name)
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
            
        if "animate-shine-rtl" not in content and file_name != "JadwalView.tsx":
            # For views without the flex wrapper internally initially (Dokumen, Kontak, Profil)
            if file_name in ["DokumenView.tsx", "KontakView.tsx", "ProfilKBView.tsx"]:
                # Wrap their content in a flex div structure
                # Because we changed their outer div to be flex, we need to wrap their old children in a relative z-10 div
                # Let's just do a specific replace for them to avoid messing up closing tags
                pass

print("Done")
