// Laddar en TypeScript-modul ur src/ direkt i Node för de webbläsarfria testerna.
// Bundlar med esbuild (följer med Vite) till en tillfällig ESM-fil och importerar den.
// Modulerna som testas ska vara rena: inga THREE-objekt och ingen DOM. Loadern
// vägrar därför bundlar som drar in three eller rör window/document/localStorage.
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORBIDDEN = [
  { name: 'three', pattern: /from\s*["']three["']|require\(["']three["']\)/ },
  { name: 'window', pattern: /\bwindow\./ },
  { name: 'document', pattern: /\bdocument\./ },
  { name: 'localStorage', pattern: /\blocalStorage\b/ },
];

export async function importPureModule(entry) {
  const result = await build({
    entryPoints: [resolve(entry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    external: ['three'],
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  for (const { name, pattern } of FORBIDDEN) {
    if (pattern.test(code)) throw new Error(`${entry} drar in ${name} – regelmodulerna ska gå att köra utan 3D och DOM.`);
  }
  const dir = await mkdtemp(join(tmpdir(), 'gramyren-regler-'));
  const file = join(dir, 'module.mjs');
  await writeFile(file, code);
  return import(pathToFileURL(file).href);
}
