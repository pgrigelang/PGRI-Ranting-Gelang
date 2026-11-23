import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace the useState block for currentUser
old_block = """  const [currentUser] = useState({
    name: 'Kelompok Belajar',
    school: 'Kecamatan Sumberbaru',
    role: 'Kelas 3'
  });"""

new_block = """  const currentUser = {
    name: activeRole === 'admin' ? 'Pengurus Kombel' : 'Semua Guru',
    school: 'Kecamatan Sumberbaru',
    role: activeRole === 'admin' ? 'Admin' : 'Guru'
  };"""

content = content.replace(old_block, new_block)

with open("src/App.tsx", "w") as f:
    f.write(content)

