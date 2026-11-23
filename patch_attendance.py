import re

with open("src/App.tsx", "r") as f:
    content = f.read()

pattern = r"  (React\.)?useEffect\(\(\) => \{\n    try \{\n      localStorage\.setItem\('kombel-attendance', JSON\.stringify\(attendanceList\)\);\n    \} catch \(e\) \{\n      console\.error\('Gagal menyimpan data absensi:', e\);\n    \}\n  \}, \[attendanceList\]\);"

replacement = """  useEffect(() => {
    try {
      localStorage.setItem('kombel-attendance', JSON.stringify(attendanceList));
      if (isInitialMount.current.attendanceList) {
        isInitialMount.current.attendanceList = false;
        return;
      }
      if (!isSyncingRef.current) {
        syncToFirebase('attendanceList', attendanceList);
      }
    } catch (e) {
      console.error('Gagal menyimpan data absensi:', e);
    }
  }, [attendanceList]);"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(content)

