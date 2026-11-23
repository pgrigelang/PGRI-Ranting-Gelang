import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# We want to replace the onSnapshot block. 
# It looks like:
#       return onSnapshot(doc(db, 'kombel_data', key), (snapshot) => {
#         if (snapshot.exists()) {
#           const data = snapshot.data();
#           const parsed = ensureArray<any>(data.data);
#           if (parsed !== null) {
#             isSyncingRef.current = true;
#             setter(parsed);
#             setTimeout(() => {
#               isSyncingRef.current = false;
#             }, 300);
#           }
#         }
#       });

pattern = re.compile(r"return onSnapshot\(doc\(db, 'kombel_data', key\), \(snapshot\) => \{.*?\n\s*\}\);\n", re.DOTALL)

new_str = """return onSnapshot(doc(db, 'kombel_data', key), (snapshot) => {
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
        if (error && error.message && error.message.includes('Quota')) return;
        console.info('Pemberitahuan sinkronisasi cloud:', error);
      });
"""

if pattern.search(content):
    content = pattern.sub(new_str, content)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched App.tsx")
else:
    print("Could not find pattern in App.tsx")

