const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const regex = /\/\* Prevent font shifts and composite layer flickering \*\/[\s\S]*?-moz-osx-font-smoothing: grayscale;\s*\}/;

const newStyle = `/* 100% LOCK CHROME FONT FLICKER */
        .sidebar-container, .sidebar-container * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          -webkit-backface-visibility: hidden !important;
          backface-visibility: hidden !important;
          transform: translateZ(0) !important;
          text-rendering: optimizeLegibility !important;
        }`;

if (regex.test(code)) {
    code = code.replace(regex, newStyle);
    fs.writeFileSync('src/components/Sidebar.tsx', code);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find the target string.");
}
