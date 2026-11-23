import os
import glob

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Look for the pattern where container is declared inside try
    import re
    # We want to find cases where `try {` is followed by (some optional await/const) and then `const container = document.createElement('div');`
    # However, since there might be other variables, we can just replace `const container = document.createElement('div');` 
    # but we need to declare it before the try block.
    # Actually, a simpler approach is to search for `const container = document.createElement('div');`
    # and if it is inside a try block, we can change it to `container = document.createElement('div');`
    # and add `let container: HTMLDivElement | null = null;` before the try block.
    
    # It's easier to just match exactly the block we know.
    
    replacements = [
        (
            "      try {\n        const html2pdf = await getHtml2Pdf();\n        const container = document.createElement('div');",
            "      let container: HTMLDivElement | null = null;\n      try {\n        const html2pdf = await getHtml2Pdf();\n        container = document.createElement('div');"
        ),
        (
            "    try {\n      const html2pdf = await getHtml2Pdf();\n      const container = document.createElement('div');",
            "    let container: HTMLDivElement | null = null;\n    try {\n      const html2pdf = await getHtml2Pdf();\n      container = document.createElement('div');"
        ),
        (
            "      try {\n        const html2pdf = await getHtml2Pdf();\n\n        const container = document.createElement('div');",
            "      let container: HTMLDivElement | null = null;\n      try {\n        const html2pdf = await getHtml2Pdf();\n\n        container = document.createElement('div');"
        ),
        (
            "    try {\n      const html2pdf = await getHtml2Pdf();\n\n      const container = document.createElement('div');",
            "    let container: HTMLDivElement | null = null;\n    try {\n      const html2pdf = await getHtml2Pdf();\n\n      container = document.createElement('div');"
        )
    ]
    
    changed = False
    for old_str, new_str in replacements:
        if old_str in content:
            content = content.replace(old_str, new_str)
            changed = True
            
    # Also check JadwalView and AnggotaView which might have slightly different spacing.
    # Let's use regex for safety:
    pattern = re.compile(r"(\s*)try\s*\{\s*const html2pdf = await getHtml2Pdf\(\);\s*const container = document\.createElement\('div'\);")
    def repl(m):
        indent = m.group(1)
        return f"{indent}let container: HTMLDivElement | null = null;{indent}try {{{indent}  const html2pdf = await getHtml2Pdf();{indent}  container = document.createElement('div');"
        
    new_content = pattern.sub(repl, content)
    if new_content != content:
        changed = True
        content = new_content

    if changed:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"No changes in {filepath}")

for f in glob.glob("src/components/views/*.tsx"):
    fix_file(f)
