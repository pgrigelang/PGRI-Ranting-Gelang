import fs from 'fs';
const code = fs.readFileSync('src/main.tsx', 'utf-8');
const inject = `
window.addEventListener('error', (e) => {
  fetch('http://localhost:4000', { method: 'POST', body: e.message + ' ' + e.filename + ' ' + e.lineno });
});
window.addEventListener('unhandledrejection', (e) => {
  fetch('http://localhost:4000', { method: 'POST', body: 'Promise: ' + String(e.reason) });
});
`;
if (!code.includes('http://localhost:4000')) {
  fs.writeFileSync('src/main.tsx', code.replace('import App from', inject + '\nimport App from'));
}
