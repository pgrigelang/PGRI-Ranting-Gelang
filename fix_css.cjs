const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// Replace the previous body rule
code = code.replace(/body\s*{\s*-webkit-font-smoothing: antialiased !important;[\s\S]*?text-rendering: optimizeLegibility !important;\s*}/, `* {
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  text-rendering: optimizeLegibility !important;
}`);

fs.writeFileSync('src/index.css', code);
