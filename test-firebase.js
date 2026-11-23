import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { readFile } from 'fs/promises';

const config = JSON.parse(await readFile('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
try {
  const db = getFirestore(app, config.firestoreDatabaseId);
  console.log('Success:', db.type);
} catch (e) {
  console.error('Error:', e);
}
