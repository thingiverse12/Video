import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { openPreviewResult } from './netlify-preview-envelope.mjs';

// The claim link for an anonymous Netlify site grants ownership of that site,
// so it is never written to the workflow log in clear text. Two files are used:
//   .github/netlify-preview-public.pem      public key, committed, used to seal
//   .netlify/preview-owner-private-key.pem  private key, gitignored, never shared
//
//   node scripts/netlify-owner-key.mjs generate
//   node scripts/netlify-owner-key.mjs open .netlify/preview-owner-private-key.pem .netlify/preview-result/private.enc.json
//   node scripts/netlify-owner-key.mjs open .netlify/preview-owner-private-key.pem --log run.log

const DEFAULT_PUBLIC = '.github/netlify-preview-public.pem';
const DEFAULT_PRIVATE = '.netlify/preview-owner-private-key.pem';

function generate() {
  if (!readFileSync('.gitignore', 'utf8').split(/\r?\n/).includes('.netlify/')) {
    throw new Error('Refusing to write a private key: .netlify/ is not gitignored.');
  }
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  mkdirSync(dirname(resolve(DEFAULT_PRIVATE)), { recursive: true });
  writeFileSync(DEFAULT_PUBLIC, publicKey);
  writeFileSync(DEFAULT_PRIVATE, privateKey, { mode: 0o600 });
  chmodSync(DEFAULT_PRIVATE, 0o600);
  console.log(`Public key written to ${DEFAULT_PUBLIC} (commit this file).`);
  console.log(`Private key written to ${DEFAULT_PRIVATE} (gitignored, mode 600, never commit or share it).`);
  console.log('After committing the public key, the next preview publish seals its claim link for this key.');
}

function envelopeFromLog(text) {
  const chunks = [...text.matchAll(/NETLIFY_ENVELOPE_(\d+)_OF_(\d+)::([A-Za-z0-9+/=]+)/g)]
    .map(match => ({ index: Number(match[1]), total: Number(match[2]), data: match[3] }))
    .sort((a, b) => a.index - b.index);
  if (!chunks.length) throw new Error('No encrypted result annotations were found in that log.');
  if (chunks.length !== chunks[0].total) throw new Error(`Expected ${chunks[0].total} envelope chunks, found ${chunks.length}.`);
  return JSON.parse(Buffer.from(chunks.map(chunk => chunk.data).join(''), 'base64').toString('utf8'));
}

function open(privateFile, sourceFile, fromLog) {
  if (!existsSync(privateFile)) throw new Error(`Missing private key: ${privateFile}`);
  if (!existsSync(sourceFile)) throw new Error(`Missing result file: ${sourceFile}`);
  const raw = readFileSync(sourceFile, 'utf8');
  const envelope = fromLog || /\.(log|txt)$/.test(sourceFile)
    ? envelopeFromLog(raw)
    : JSON.parse(raw);
  console.log(JSON.stringify(openPreviewResult(envelope, readFileSync(privateFile, 'utf8')), null, 2));
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'generate') generate();
  else if (command === 'open') {
    const fromLog = rest.includes('--log');
    const files = rest.filter(argument => argument !== '--log');
    if (files.length < 2) throw new Error('Användning: open <privat nyckel> [--log] <resultatfil>');
    open(files[0], files[1], fromLog);
  } else {
    console.log('Användning:\n  node scripts/netlify-owner-key.mjs generate\n  node scripts/netlify-owner-key.mjs open <privat nyckel> <resultatfil>\n  node scripts/netlify-owner-key.mjs open <privat nyckel> --log <loggfil>');
  }
} catch (error) {
  console.error(error?.message ?? 'Kunde inte hantera nyckeln.');
  process.exitCode = 1;
}
