const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const oldStyle = `        /* Prevent font shifts and composite layer flickering */
        .sidebar-container {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        .sidebar-container * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }`;

const newStyle = `        /* 100% LOCK CHROME FONT FLICKER */
        .sidebar-container, .sidebar-container * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          -webkit-backface-visibility: hidden !important;
          backface-visibility: hidden !important;
          transform: translateZ(0) !important;
          text-rendering: optimizeLegibility !important;
        }`;

code = code.replace(oldStyle, newStyle);
fs.writeFileSync('src/components/Sidebar.tsx', code);
