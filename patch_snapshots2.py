import re

with open('src/components/views/PengaturanView.tsx', 'r') as f:
    content = f.read()

content = content.replace('console.warn("Error in settings onSnapshot:", error);', """
      if (error && error.message && error.message.includes('Quota')) return;
      console.info("Info settings onSnapshot:", error);
""")

with open('src/components/views/PengaturanView.tsx', 'w') as f:
    f.write(content)

