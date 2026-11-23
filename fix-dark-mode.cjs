const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'src', 'components', 'views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.tsx'));

const replacements = [
  { regex: /\bbg-white(?![\/\w]| dark:bg-)/g, replacement: 'bg-white dark:bg-slate-900' },
  { regex: /\bborder-slate-100(?! dark:border-)/g, replacement: 'border-slate-100 dark:border-slate-800' },
  { regex: /\bborder-slate-200(?! dark:border-)/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /\btext-slate-800(?! dark:text-)/g, replacement: 'text-slate-800 dark:text-slate-100' },
  { regex: /\btext-slate-700(?! dark:text-)/g, replacement: 'text-slate-700 dark:text-slate-300' },
  { regex: /\btext-slate-600(?! dark:text-)/g, replacement: 'text-slate-600 dark:text-slate-400' },
  { regex: /\bbg-slate-50(?![\/\w]| dark:bg-)/g, replacement: 'bg-slate-50 dark:bg-slate-800/50' },
  { regex: /\bbg-slate-100(?![\/\w]| dark:bg-)/g, replacement: 'bg-slate-100 dark:bg-slate-800' },
  { regex: /\btext-slate-900(?! dark:text-)/g, replacement: 'text-slate-900 dark:text-white' },
];

for (const file of files) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
console.log("Done");
