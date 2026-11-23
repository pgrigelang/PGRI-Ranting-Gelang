with open('src/App.tsx', 'r') as f:
    content = f.read()

# We need to replace the onSnapshot call.
old_snapshot = """      return onSnapshot(doc(db, 'kombel_data', key), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const parsed = ensureArray<any>(data.data);
          if (parsed !== null) {
            isSyncingRef.current = true;
            setter(parsed);
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 300);
          }
        }
      });"""

new_snapshot = """      return onSnapshot(doc(db, 'kombel_data', key), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const parsed = ensureArray<any>(data.data);
          if (parsed !== null) {
            isSyncingRef.current = true;
            setter(parsed);
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 300);
          }
        }
      }, (error) => {
        // Abaikan peringatan Quota Limit di Median.co
        if (error && error.message && error.message.includes('Quota')) {
          // diam saja
        } else {
          console.info('Pemberitahuan sinkronisasi cloud:', error);
        }
      });"""

content = content.replace(old_snapshot, new_snapshot)

with open('src/App.tsx', 'w') as f:
    f.write(content)
