import re

with open('src/lib/sync.ts', 'r') as f:
    content = f.read()

# Replace console.warn('Error fetching... with checking for Quota
# but actually we can just use console.info or comment it out so Median doesn't alert.
new_content = content.replace("console.warn(`Error fetching ${collectionName} from Firebase:`, error);", """
    if (error && error.message && error.message.includes('Quota limit exceeded')) {
      // Abaikan log error secara diam-diam agar tidak memunculkan peringatan (alert) 3 Errors di Median.co
      console.log('Firebase Quota Exceeded. Menggunakan data lokal (localStorage).');
    } else {
      console.info(`Gagal mengambil ${collectionName} dari Firebase:`, error);
    }
""")

new_content = new_content.replace("console.warn(`Error syncing ${collectionName} to Firebase:`, error);", """
    if (error && error.message && error.message.includes('Quota limit exceeded')) {
      console.log('Firebase Quota Exceeded (Sync). Disimpan secara lokal saja.');
    } else {
      console.info(`Gagal menyinkronkan ${collectionName} ke Firebase:`, error);
    }
""")

with open('src/lib/sync.ts', 'w') as f:
    f.write(new_content)
