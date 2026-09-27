import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { sealPreviewResult, openPreviewResult, publicPreviewDetails } from './netlify-preview-envelope.mjs';

const keys = () => generateKeyPairSync('rsa', {
  modulusLength: 3072,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const { publicKey, privateKey } = keys();
const fixture = {
  site_url: 'https://test-fixture.netlify.app',
  site_id: 'test-site-12345678', deploy_id: 'test-deploy-12345678',
  claim_url: 'https://app.netlify.com/drop/test-fixture#drop_token=test-only-private-value',
  claim_command: 'test fixture: never publish this field', password: 'test-only-password',
};
const payload = { repository: 'thingiverse12/Video', commit: 'test-fixture', stdout: JSON.stringify(fixture), stderr: 'private diagnostic fixture' };
const sealed = sealPreviewResult(payload, publicKey);
assert.deepEqual(openPreviewResult(sealed, privateKey), payload);
const serialized = JSON.stringify(sealed);
for (const privateValue of [fixture.claim_url, fixture.password, 'test-only-private-value', payload.stderr]) assert.ok(!serialized.includes(privateValue));
const publicData = publicPreviewDetails(fixture);
assert.deepEqual(Object.keys(publicData).sort(), ['deployId', 'siteId', 'siteUrl']);
assert.equal(publicData.siteUrl, 'https://test-fixture.netlify.app/');
assert.ok(!JSON.stringify(publicData).includes('private-value'));
const changed = structuredClone(sealed);
const bytes = Buffer.from(changed.ciphertext, 'base64'); bytes[0] ^= 1;
changed.ciphertext = bytes.toString('base64');
assert.throws(() => openPreviewResult(changed, privateKey), 'Tampering is detected');
assert.throws(() => openPreviewResult(sealed, keys().privateKey), 'Another reader cannot open the claim details');
assert.throws(() => sealPreviewResult(payload, privateKey), 'A private recipient key must never be accepted as the public file');
assert.throws(() => publicPreviewDetails({ ...fixture, site_url: 'https://example.com' }));
assert.throws(() => publicPreviewDetails({ ...fixture, site_url: 'https://test-fixture.netlify.app/?token=private' }));
assert.throws(() => publicPreviewDetails({ ...fixture, claim_url: 'https://example.com/drop/site#drop_token=private' }));
console.log('✓ Encrypted ownership details round-trip correctly');
console.log('✓ Public results exclude claim links, commands and passwords');
console.log('✓ Tampered envelopes, wrong keys and untrusted URLs are rejected');
console.log('No real deployment or authentication was performed by these tests.');
