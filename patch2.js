import fs from 'fs';
const code = fs.readFileSync('src/main.tsx', 'utf-8');
const inject = `
window.addEventListener('error', (e) => {
  document.body.innerHTML += '<div id="error-log" style="color:red;z-index:9999;position:absolute;top:0;">' + e.message + '</div>';
});
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML += '<div id="error-log" style="color:red;z-index:9999;position:absolute;top:0;">Promise: ' + String(e.reason) + '</div>';
});
`;
if (!code.includes('error-log')) {
  fs.writeFileSync('src/main.tsx', code.replace('import App from', inject + '\nimport App from'));
}
