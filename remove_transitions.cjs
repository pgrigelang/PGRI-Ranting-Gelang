const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Replace all transition-related classes
code = code.replace(/transition-colors/g, '');
code = code.replace(/transition-transform/g, '');
code = code.replace(/transition-opacity/g, '');
code = code.replace(/transition-all/g, '');
code = code.replace(/duration-200/g, '');
code = code.replace(/duration-300/g, '');
code = code.replace(/ease-out/g, '');

fs.writeFileSync('src/components/Sidebar.tsx', code);
