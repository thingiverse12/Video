import { readFileSync } from 'node:fs';

// The artifact download host may be unavailable in a restricted workspace.
// GitHub check annotations provide another read-only transport for the SAME
// encrypted envelope. No plaintext claim details or private keys are emitted.
export function emitEncryptedResult(envelope) {
  if (envelope.version !== 1 || envelope.algorithm !== 'RSA-OAEP-SHA256+AES-256-GCM') throw new Error('Unsupported encrypted result');
  for (const field of ['key', 'iv', 'tag', 'ciphertext']) if (typeof envelope[field] !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(envelope[field])) throw new Error('Invalid encrypted result field');
  const encoded = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
  const size = 6000, total = Math.ceil(encoded.length / size);
  if (total > 8) { console.log('Encrypted result is too large for annotations; use the result artifact.'); return; }
  for (let i = 0; i < total; i++) console.log(`::notice title=NETLIFY_ENVELOPE_${i + 1}_OF_${total}::${encoded.slice(i * size, (i + 1) * size)}`);
}

if (process.argv[1]?.endsWith('/emit-netlify-result.mjs')) {
  try { emitEncryptedResult(JSON.parse(readFileSync(process.argv[2], 'utf8'))); }
  catch { console.error('The encrypted preview result could not be exported.'); process.exitCode = 1; }
}
