#!/usr/bin/env node
// Download each matched bundle.zip from the public CDN URL the admin API
// returned, record sha256 and size on the manifest. Idempotent.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'corpus');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
mkdirSync(join(root, 'bundles'), { recursive: true });

let done = 0, skipped = 0, failed = 0;
const queue = manifest.versions.filter((v) => v.bundle?.bundleUrl);
const worker = async () => {
  while (queue.length) {
    const v = queue.shift();
    const path = join(root, 'bundles', `${v.versionId}.zip`);
    if (existsSync(path) && v.bundle.path) { skipped++; continue; }
    try {
      const res = await fetch(v.bundle.bundleUrl, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(path, buf);
      v.bundle.path = `corpus/bundles/${v.versionId}.zip`;
      v.bundle.sha256 = createHash('sha256').update(buf).digest('hex');
      v.bundle.bytes = buf.length;
      done++;
    } catch (error) {
      v.bundle.error = error instanceof Error ? error.message : String(error);
      failed++;
    }
  }
};
await Promise.all(Array.from({ length: 6 }, worker));
writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
const sizes = manifest.versions.filter((v) => v.bundle?.bytes).map((v) => v.bundle.bytes).sort((a, b) => a - b);
console.log({ downloaded: done, skipped, failed, total: manifest.versions.filter((v) => v.bundle?.path).length, medianBytes: sizes[Math.floor(sizes.length / 2)], maxBytes: sizes.at(-1) });
for (const v of manifest.versions.filter((v) => v.bundle?.error)) console.log('failed:', v.appName, v.bundle.error);
