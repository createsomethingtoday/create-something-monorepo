import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const [base, directory = '.release-demo/dist'] = process.argv.slice(2);
if (!base || !/^https:\/\//.test(base)) throw new Error('Usage: node verify-release.mjs https://host .release-demo/dist');
const root = resolve(directory);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
for (const file of await readdir(root)) {
  if (file === '_headers') continue;
  const response = await fetch(new URL(file, `${base.replace(/\/$/, '')}/`));
  assert.equal(response.status, 200, file);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', file);
  assert.ok(response.headers.get('content-security-policy')?.includes("default-src 'self'"), file);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(hash(bytes), hash(await readFile(join(root, file))), `${file} deployed bytes`);
  results.push({ file, bytes: bytes.length, sha256: hash(bytes) });
}
for (const file of ['screen.mp4', 'screen-mobile.mp4']) {
  const response = await fetch(new URL(file, base), { headers: { Range: 'bytes=0-31' } });
  assert.equal(response.status, 206, `${file} byte ranges`);
  assert.match(response.headers.get('content-range') || '', /^bytes 0-31\/\d+$/);
  assert.equal((await response.arrayBuffer()).byteLength, 32);
}
for (const file of ['reference.mp4','synthetic-source.mp4','render.py','render-receipt.json','.env','package.json','_headers']) {
  const response = await fetch(new URL(file, base));
  assert.equal(response.status, 404, `${file} must remain private`);
  await response.arrayBuffer();
}
console.log(JSON.stringify({ url: base, checkedAt: new Date().toISOString(), assets: results, byteRanges: 'passed', privatePaths: '404', securityHeaders: 'passed' }, null, 2));
