import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

// Narrow regression guard, not an originality assessment or legal clearance.
// Scan content shipped by the app and its public documentation. The names below
// occur only in this developer test; it is not imported into the browser bundle.
const oldReferences = /\b(?:leif|billy|volvo|v40|ica|kalles|tony|kronofogden|svt|sörbäcken|lillåsen)\b/i;
const permittedFiles = /\.(?:ts|tsx|css|html|md|svg|txt)$/i;
const seen = [];
async function scan(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      if (full !== 'public/licenses') await scan(full);
    } else if (entry.isFile() && permittedFiles.test(entry.name)) {
      const text = await readFile(full, 'utf8');
      assert.ok(!oldReferences.test(text), `Old name or brand reintroduced in ${relative('.', full)}`);
      seen.push(full);
    }
  }
}
await scan('src');
await scan('public');
for (const file of ['index.html', 'README.md']) {
  assert.ok(!oldReferences.test(await readFile(file, 'utf8')), `Old name or brand reintroduced in ${file}`);
}
const sourceOnly = process.argv.includes('--source-only');
const licenses = ['fontsource-barlow-condensed', 'fontsource-dm-sans', 'lucide-react', 'react', 'react-dom', 'scheduler', 'three'];
assert.ok((await stat('public/licenses/NOTICE.txt')).size > 100, 'Missing dependency notice');
for (const name of licenses) {
  const file = `public/licenses/${name}.txt`;
  assert.ok((await stat(file)).size > 500, `Missing or incomplete third-party license: ${name}`);
  if (!sourceOnly) {
    try {
      await stat('dist/index.html');
      assert.ok((await stat(`dist/licenses/${name}.txt`)).size > 500, `License not included in build: ${name}`);
    } catch (error) {
      // No build yet: the checked-in source licenses still get checked.
      if (error?.code !== 'ENOENT' || !String(error.path).endsWith('dist/index.html')) throw error;
    }
  }
}
console.log(`✓ Checked ${seen.length + 2} app/docs files and ${licenses.length} dependency licenses${sourceOnly ? ' before build' : ''}`);
console.log('This limited check cannot establish originality, permission or freedom from claims.');
