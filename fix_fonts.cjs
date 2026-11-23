const fs = require('fs');
const path = require('path');

const viewsDir = 'src/components/views';
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(viewsDir, file);
  let code = fs.readFileSync(filePath, 'utf8');

  // We want to remove the specific `<style>{...}</style>` block that defines `@import url(...)` and `.font-sans`
  // since it's causing global font flashing.
  // We should be careful to only remove the specific font importing style block.

  const regex = /<style>\s*\{`\s*@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=[^`]+`\}\s*<\/style>/g;
  code = code.replace(regex, '');

  fs.writeFileSync(filePath, code);
}
console.log('Fixed fonts in views!');
