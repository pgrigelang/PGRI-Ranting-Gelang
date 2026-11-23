import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Add imports
if "import { syncToFirebase, syncFromFirebase }" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\nimport { syncToFirebase, syncFromFirebase } from './lib/sync';")

# Add isSyncing state
if "const [isSyncing, setIsSyncing] = useState(false);" not in content:
    content = content.replace("const [theme, setTheme]", "const [isSyncing, setIsSyncing] = useState(false);\n  const [theme, setTheme]")

# Add handleSync function
handle_sync = """
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const fTeachers = await syncFromFirebase('teachers');
      if (fTeachers) setTeachers(fTeachers);
      
      const fMaterials = await syncFromFirebase('materials');
      if (fMaterials) setMaterials(fMaterials);
      
      const fEvents = await syncFromFirebase('events');
      if (fEvents) setEvents(fEvents);
      
      const fAttendance = await syncFromFirebase('attendanceList');
      if (fAttendance) setAttendanceList(fAttendance);
      
      const fForum = await syncFromFirebase('forumPosts');
      if (fForum) setForumPosts(fForum);
      
      const fFin = await syncFromFirebase('financialTransactions');
      if (fFin) setFinancialTransactions(fFin);
      
      const fCash = await syncFromFirebase('cashPayments');
      if (fCash) setCashPayments(fCash);
      
      alert('Data berhasil di-sync dari server!');
    } catch (e) {
      console.error(e);
      alert('Gagal sync data dari server.');
    } finally {
      setIsSyncing(false);
    }
  };
"""
if "const handleSync =" not in content:
    content = content.replace("export default function App() {", "export default function App() {\n" + handle_sync)

# Find <Header ... /> and add onSync={handleSync} isSyncing={isSyncing}
header_regex = r'(<Header\s+currentDate=\{currentDate\})'
content = re.sub(header_regex, r'\1\n          onSync={handleSync}\n          isSyncing={isSyncing}', content)

with open("src/App.tsx", "w") as f:
    f.write(content)
