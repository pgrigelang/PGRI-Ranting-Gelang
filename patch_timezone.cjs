const fs = require('fs');

let code = fs.readFileSync('src/components/views/JadwalView.tsx', 'utf8');

const oldLogic = `const todayStr = new Date().toISOString().split('T')[0];`;
const newLogic = `const today = new Date();
                            const todayStr = \`\${today.getFullYear()}-\${String(today.getMonth() + 1).padStart(2, '0')}-\${String(today.getDate()).padStart(2, '0')}\`;`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/views/JadwalView.tsx', code, 'utf8');
