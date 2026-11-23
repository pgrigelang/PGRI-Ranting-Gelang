# Patch PengaturanView.tsx
with open('src/components/views/PengaturanView.tsx', 'r') as f:
    content = f.read()

old_settings = """    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCloudSettings(docSnap.data() as Record<string, string>);
      }
    }, (error) => {
      console.warn("Error in settings onSnapshot:", error);
    });"""

new_settings = """    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCloudSettings(docSnap.data() as Record<string, string>);
      }
    }, (error) => {
      if (error && error.message && error.message.includes('Quota')) return;
      console.info("Info settings onSnapshot:", error);
    });"""

content = content.replace(old_settings, new_settings)
with open('src/components/views/PengaturanView.tsx', 'w') as f:
    f.write(content)

# Patch Sidebar.tsx
with open('src/components/Sidebar.tsx', 'r') as f:
    content2 = f.read()

old_sidebar = """    const unsub = onSnapshot(doc(db, 'settings', 'locked-menus'), (snap) => {
      if (snap.exists()) {
        setLockedMenus(snap.data() as Record<string, boolean>);
      }
    });"""

new_sidebar = """    const unsub = onSnapshot(doc(db, 'settings', 'locked-menus'), (snap) => {
      if (snap.exists()) {
        setLockedMenus(snap.data() as Record<string, boolean>);
      }
    }, (error) => {
      // Abaikan error kuota
      if (error && error.message && error.message.includes('Quota')) return;
    });"""

content2 = content2.replace(old_sidebar, new_sidebar)
with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content2)

