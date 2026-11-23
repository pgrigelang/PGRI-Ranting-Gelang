with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace('console.warn("Gagal mengambil status menu:", err);', """
      if (err && err.message && err.message.includes('Quota')) return;
      console.info("Info status menu:", err);
""")

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
