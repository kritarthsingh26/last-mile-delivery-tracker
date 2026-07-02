const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file === 'route.ts') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('export const dynamic = "force-dynamic";')) {
        content = 'export const dynamic = "force-dynamic";\n' + content;
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Prepend dynamic flag to: ${fullPath}`);
      }
    }
  }
}

walkDir(path.join(__dirname, '../src/app/api'));
console.log('Prepend script finished successfully!');
