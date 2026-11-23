import re
import os

views_dir = "src/components/views"

def make_glossy_button(inner_content, color="amber", tag="button", extra_attrs=""):
    shadow_rgb = {
        "amber": "245,158,11",
        "emerald": "16,185,129",
        "blue": "59,130,246",
        "indigo": "99,102,241",
        "purple": "168,85,247",
        "pink": "236,72,153",
        "rose": "244,63,94",
        "cyan": "6,182,212",
        "teal": "20,184,166",
        "slate": "100,116,139",
        "yellow": "234,179,8",
    }.get(color, "245,158,11")
    
    class_str = f"relative overflow-hidden w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-b from-{color}-400 via-{color}-500 to-{color}-600 text-{color}-950 font-black text-xs sm:text-sm border-2 border-{color}-200/80 shadow-[0_6px_15px_rgba({shadow_rgb},0.5)] hover:shadow-[0_8px_20px_rgba({shadow_rgb},0.7)] active:scale-95 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
    if tag == "a":
        class_str += " no-underline"
        
    return f"""<{tag}
  {extra_attrs.strip()}
  className="{class_str}"
>
  <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/60 to-transparent rounded-t-full pointer-events-none" />
  {inner_content.strip()}
</{tag}>"""

replacements = [
    {
        "file": "BerandaView.tsx",
        "regex": r'<button\s*onClick=\{\(\) => onNavigate\(\'jadwal\'\)\}.*?</button>',
        "color": "amber",
        "tag": "button",
        "attrs": "onClick={() => onNavigate('jadwal')}",
        "inner": '<Calendar className="w-4 h-4 relative z-10 stroke-[3]" />\n  <span className="relative z-10 uppercase tracking-wide">Jadwal & Absensi</span>'
    },
    {
        "file": "BerandaView.tsx",
        "regex": r'<a\s*href="https://ruangpembelajaran\.ai\.studio/".*?</a>',
        "color": "blue",
        "tag": "a",
        "attrs": 'href="https://ruangpembelajaran.ai.studio/"\n  target="_blank"\n  rel="noopener noreferrer"',
        "inner": '<ExternalLink className="w-4 h-4 relative z-10 stroke-[3]" />\n  <span className="relative z-10 uppercase tracking-wide">Ruang Pembelajaran</span>'
    },
    {
        "file": "DokumenView.tsx",
        "regex": r'<button\s*onClick=\{\(\) => setShowUploadModal\(true\)\}.*?</button>',
        "color": "cyan",
        "tag": "button",
        "attrs": "onClick={() => setShowUploadModal(true)}",
        "inner": '<Upload className="w-4 h-4 relative z-10 stroke-[3]" />\n  <span className="relative z-10 uppercase tracking-wide">Unggah Dokumen Baru</span>'
    }
]

for r in replacements:
    path = os.path.join(views_dir, r["file"])
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
            
        new_btn = make_glossy_button(r["inner"], r["color"], r["tag"], r["attrs"])
        
        new_content = re.sub(r["regex"], lambda m: new_btn, content, flags=re.DOTALL)
        if new_content != content:
            with open(path, "w") as f:
                f.write(new_content)
            print(f'Patched {r["file"]} (regex 2)')
        else:
            print(f'Failed to patch {r["file"]} (regex 2)')

