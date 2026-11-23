const fs = require('fs');
const file = 'src/components/views/JadwalView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Pencil to imports
content = content.replace(/Trash2,/, 'Pencil,\n  Trash2,');
content = content.replace(/Edit2,\n/, ''); // Optional, but let's keep it clean
// wait, I'll just do a targeted replacement for the buttons later.

// Let's just create a complete patch.
