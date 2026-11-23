const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// Remove the import from where it was
const importStr = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');";
code = code.replace(importStr, '');

// Prepend to file
code = importStr + '\n' + code;

fs.writeFileSync('src/index.css', code);
