import re

with open("src/components/views/AnggotaView.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "onClick={() => handleToggleActiveStatus(teacher, true)}" in line:
        # the button tag is on the previous line or so
        pass

# let's just do it with a regex on the whole file
with open("src/components/views/AnggotaView.tsx", "r") as f:
    content = f.read()

# Replace <button ... Aktif
aktif_btn_regex = r'(<button)(\s*type="button"\s*onClick=\{\(\) => handleToggleActiveStatus\(teacher, true\)\}[\s\S]*?>[\s\S]*?Aktif\s*</button>)'
content = re.sub(aktif_btn_regex, r'\1 disabled={activeRole !== "admin"}\2', content)

# Replace <button ... Tidak aktif
inaktif_btn_regex = r'(<button)(\s*type="button"\s*onClick=\{\(\) => handleToggleActiveStatus\(teacher, false\)\}[\s\S]*?>[\s\S]*?Tidak aktif\s*</button>)'
content = re.sub(inaktif_btn_regex, r'\1 disabled={activeRole !== "admin"}\2', content)

with open("src/components/views/AnggotaView.tsx", "w") as f:
    f.write(content)

