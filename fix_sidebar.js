const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const regex = /\/\* 100% LOCK CHROME FONT FLICKER \*\/[\s\S]*?text-rendering: optimizeLegibility !important;\s*\}/;
code = code.replace(regex, '');

fs.writeFileSync('src/components/Sidebar.tsx', code);
