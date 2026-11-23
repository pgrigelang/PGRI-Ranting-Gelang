import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Update isSyncing declaration and add refs
isSyncing_decl = "const [isSyncing, setIsSyncing] = useState(false);"
new_decls = """
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const isInitialMount = useRef({
    teachers: true,
    materials: true,
    events: true,
    attendanceList: true,
    forumPosts: true,
    financialTransactions: true,
    cashPayments: true
  });
"""
content = content.replace(isSyncing_decl, new_decls)

# 2. Update handleSync
old_handle_sync = """  const handleSync = async () => {
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
  };"""

new_handle_sync = """  const handleSync = async (silent = false) => {
    isSyncingRef.current = true;
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
      
      if (!silent) alert('Data berhasil di-sync dari server!');
    } catch (e) {
      console.error(e);
      if (!silent) alert('Gagal sync data dari server.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 500);
    }
  };

  useEffect(() => {
    handleSync(true);
  }, []);"""

content = content.replace(old_handle_sync, new_handle_sync)

# 3. Replace individual useEffects
def replace_effect(state_name, try_catch=False):
    global content
    # Find the useEffect block for the state
    if try_catch:
        pattern = r"  (React\.)?useEffect\(\(\) => \{\n    try \{\n      localStorage\.setItem\('kombel-" + state_name + r"', JSON\.stringify\(" + state_name + r"\)\);\n(?:      syncToFirebase\('.*?', .*?\);\n)?    \} catch \(e\) \{\n.*?\n    \}\n  \}, \[" + state_name + r"\]\);"
    else:
        pattern = r"  (React\.)?useEffect\(\(\) => \{\n    localStorage\.setItem\('kombel-" + state_name + r"', JSON\.stringify\(" + state_name + r"\)\);\n(?:    syncToFirebase\('.*?', .*?\);\n)?  \}, \[" + state_name + r"\]\);"
    
    if try_catch:
        replacement = f"""  useEffect(() => {{
    try {{
      localStorage.setItem('kombel-{state_name}', JSON.stringify({state_name}));
      if (isInitialMount.current.{state_name}) {{
        isInitialMount.current.{state_name} = false;
        return;
      }}
      if (!isSyncingRef.current) {{
        syncToFirebase('{state_name}', {state_name});
      }}
    }} catch (e) {{
      console.error('Gagal menyimpan data {state_name}:', e);
    }}
  }}, [{state_name}]);"""
    else:
        replacement = f"""  useEffect(() => {{
    localStorage.setItem('kombel-{state_name}', JSON.stringify({state_name}));
    if (isInitialMount.current.{state_name}) {{
      isInitialMount.current.{state_name} = false;
      return;
    }}
    if (!isSyncingRef.current) {{
      syncToFirebase('{state_name}', {state_name});
    }}
  }}, [{state_name}]);"""
        
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

replace_effect('teachers')
replace_effect('materials')
replace_effect('events', try_catch=True)
replace_effect('attendanceList', try_catch=True)
replace_effect('forumPosts')
replace_effect('financialTransactions')
replace_effect('cashPayments')

with open("src/App.tsx", "w") as f:
    f.write(content)

