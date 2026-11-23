import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

# Let's just remove the broken parts
content = re.sub(
    r'      \{/\* Style Tambahan untuk Animasi \*/\}\n      <style>\{`\n          50% \{\n            transform: translateX\(-200%\) skewX\(-25deg\);\n          \}\n          100% \{\n            transform: translateX\(200%\) skewX\(-25deg\);\n          \}\n        \}\n        \.animate-shine-rtl \{\n          animation: shineLoop 5s infinite ease-in-out;\n        \}',
    r'      {/* Style Tambahan untuk Animasi */}\n      <style>{`',
    content
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
