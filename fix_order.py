with open("src/App.tsx", "r") as f:
    lines = f.readlines()

content = "".join(lines)

current_user_block = """  // User profile
  const currentUser = {
    name: activeRole === 'admin' ? 'Pengurus Kombel' : 'Semua Guru',
    school: 'Kecamatan Sumberbaru',
    role: activeRole === 'admin' ? 'Admin' : 'Guru'
  };
"""

content = content.replace(current_user_block, "")

# Find where to insert it, maybe after activeRole useEffect
insert_marker = """  React.useEffect(() => {
    localStorage.setItem('activeRole', activeRole);
  }, [activeRole]);"""

content = content.replace(insert_marker, insert_marker + "\n" + current_user_block)

with open("src/App.tsx", "w") as f:
    f.write(content)

