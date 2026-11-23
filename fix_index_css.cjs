const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

const fontImports = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');

@layer base {
  .font-sans {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .font-display {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .font-mono {
    font-family: 'JetBrains Mono', monospace;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
}
`;

if (!code.includes('fonts.googleapis.com')) {
  // Add it after the tailwind import
  code = code.replace('@import "tailwindcss";', '@import "tailwindcss";' + fontImports);
  fs.writeFileSync('src/index.css', code);
  console.log("Added font imports to index.css");
}
