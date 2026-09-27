import { createCipheriv, createDecipheriv, createPublicKey, publicEncrypt, privateDecrypt, randomBytes, constants } from 'node:crypto';

const AAD = Buffer.from('arena-netlify-preview-v1', 'utf8');

// Claim links grant ownership of an anonymous site. Never put them in public
// Actions logs or plaintext artifacts. Only the deployment owner's local key
// can open this authenticated, hybrid-encrypted envelope.
export function sealPreviewResult(payload, publicKeyPem) {
  if (!publicKeyPem.includes('-----BEGIN PUBLIC KEY-----') || publicKeyPem.includes('PRIVATE KEY')) throw new Error('A public recipient key is required');
  const publicKey = createPublicKey(publicKeyPem);
  if (publicKey.asymmetricKeyType !== 'rsa' || publicKey.asymmetricKeyDetails.modulusLength < 3072) throw new Error('An RSA recipient key of at least 3072 bits is required');
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {
    version: 1,
    algorithm: 'RSA-OAEP-SHA256+AES-256-GCM',
    key: publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key).toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function openPreviewResult(envelope, privateKeyPem) {
  if (envelope.version !== 1 || envelope.algorithm !== 'RSA-OAEP-SHA256+AES-256-GCM') throw new Error('Unsupported preview envelope');
  const key = privateDecrypt({ key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(envelope.key, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAAD(AAD); decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

export function publicPreviewDetails(result) {
  const site = new URL(result.site_url);
  const claim = new URL(result.claim_url);
  if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.netlify\.app$/i.test(site.hostname) || site.username || site.password || site.port || site.search || site.hash || site.pathname !== '/') throw new Error('Unexpected preview URL');
  if (claim.protocol !== 'https:' || claim.hostname !== 'app.netlify.com' || !claim.pathname.startsWith('/drop/') || claim.username || claim.password || claim.port || !new URLSearchParams(claim.hash.slice(1)).get('drop_token')) throw new Error('Unexpected Netlify claim URL');
  if (typeof result.site_id !== 'string' || typeof result.deploy_id !== 'string') throw new Error('Missing deployment identifiers');
  // Explicit allowlist: no claim URL, claim command, password or token.
  return { siteUrl: site.href, siteId: result.site_id, deployId: result.deploy_id };
}
