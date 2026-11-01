#!/usr/bin/env node
// Join the admin versions API dumps onto the manifest, giving each version its bundle URL.
//
//   node scripts/join-admin-versions.mjs
//
// Input: corpus/admin-versions/<adminAppId>.json, one array per app as returned by
// GET https://webflow.com/admin/api/app/<adminAppId>/versions (an Okta admin browser
// session; saved by hand or with ego-browser). Each entry carries id, status, version,
// createdOn, bundleUrl (public CDN), size, extensionUrl and designerExtensionResource.
// Output: manifest.versions[].bundle = { extensionVersionId, status, version, createdOn,
// bundleUrl, size, extensionUrl, manifest } matched on the Airtable extensionVersionId,
// preserving sha256 / bytes / path that fetch-bundles.mjs added earlier. Idempotent.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', 'corpus');
const manifestPath = join(root, 'manifest.json');
const dumps = join(root, 'admin-versions');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const byApp = new Map();
if (existsSync(dumps)) {
  for (const f of readdirSync(dumps).filter((n) => n.endsWith('.json'))) {
    const list = JSON.parse(readFileSync(join(dumps, f), 'utf8'));
    byApp.set(f.replace(/\.json$/, ''), Array.isArray(list) ? list : list.versions ?? []);
  }
}

let matched = 0;
let missingDump = 0;
let noMatch = 0;
for (const v of manifest.versions) {
  if (!v.adminAppId || !v.extensionVersionId) continue;
  const list = byApp.get(v.adminAppId);
  if (!list) { missingDump++; continue; }
  const hit = list.find((e) => e.id === v.extensionVersionId);
  if (!hit) { noMatch++; continue; }
  const keep = v.bundle ?? {};
  v.bundle = {
    extensionVersionId: hit.id,
    status: hit.status,
    version: hit.version,
    createdOn: hit.createdOn,
    bundleUrl: hit.bundleUrl,
    size: hit.size,
    extensionUrl: hit.extensionUrl,
    manifest: hit.designerExtensionResource?.manifest ?? null,
    ...(keep.sha256 ? { sha256: keep.sha256, bytes: keep.bytes, path: keep.path } : {}),
  };
  matched++;
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log({ apps: byApp.size, matched, missingDump, noMatch, withBundleUrl: manifest.versions.filter((x) => x.bundle?.bundleUrl).length });
