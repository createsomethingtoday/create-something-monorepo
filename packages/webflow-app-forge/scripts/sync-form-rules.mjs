#!/usr/bin/env node
// One-way sync of the submission form's listing rules into this package.
//
// The App submission form (webflow/wf-app-form-cloud) is the gate every
// Marketplace submission passes through, and its lib/ rules were calibrated
// against approved and rejected live listings. Those rules stay canonical
// there. This script copies the pure-ESM rule modules here and records the
// source commit so the two never drift silently.
//
// Usage: node scripts/sync-form-rules.mjs [path-to-wf-app-form-cloud-checkout]
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.argv[2] || join(process.env.HOME, 'Code', 'wf-app-form-cloud-cre-1379'));
const target = join(here, '..', 'src', 'vendor', 'form-rules');

const FILES = [
  'contentGuidelines.js',
  'submissionGuidance.js',
  'urlGuidance.js',
  'productionUrls.js',
  'marketplaceCategories.js',
  'appIconSpec.js',
  'emailFields.js',
];

if (!existsSync(join(source, 'lib', FILES[0]))) {
  console.error(`No form checkout at ${source}. Pass the path as the first argument.`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });
for (const file of FILES) {
  const text = readFileSync(join(source, 'lib', file), 'utf8');
  if (/^\s*(import|export .* from)\s/m.test(text)) {
    console.error(`${file} imports another module; vendoring only supports self-contained rule files.`);
    process.exit(1);
  }
  copyFileSync(join(source, 'lib', file), join(target, file));
}

let commit = 'unknown';
let remote = 'unknown';
try {
  commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  remote = execFileSync('git', ['-C', source, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
} catch {
  // leave unknown
}

writeFileSync(
  join(target, 'VENDOR.json'),
  JSON.stringify({ source: remote, commit, syncedAt: new Date().toISOString().slice(0, 10), files: FILES }, null, 2) + '\n'
);
console.log(`Synced ${FILES.length} rule files from ${remote}@${commit.slice(0, 7)} into src/vendor/form-rules`);
