#!/usr/bin/env node

const { download, getChecksumsUrl } = require('./install.js');

const REQUIRED_RELEASE_ASSETS = [
  'ground-calibration-receipt.json',
  'ground-darwin-arm64.tar.gz',
  'ground-darwin-x64.tar.gz',
  'ground-linux-arm64.tar.gz',
  'ground-linux-x64.tar.gz',
  'ground-win32-x64.zip',
  'ground-darwin-arm64-smoke.json',
  'ground-darwin-x64-smoke.json',
  'ground-linux-arm64-smoke.json',
  'ground-linux-x64-smoke.json',
  'ground-win32-x64-smoke.json'
];

function verifyReleaseManifest(checksums) {
  const assets = new Set(
    checksums
      .split(/\r?\n/)
      .map((line) => line.trim().match(/^[a-f0-9]{64}\s+\*?(.+)$/i)?.[1])
      .filter(Boolean)
  );
  const missing = REQUIRED_RELEASE_ASSETS.filter((asset) => !assets.has(asset));

  if (missing.length > 0) {
    throw new Error(`Ground release is missing checksum entries for: ${missing.join(', ')}`);
  }
}

async function main() {
  const checksums = await download(getChecksumsUrl());
  verifyReleaseManifest(checksums.toString('utf8'));
  console.log('Ground release checksum manifest is complete.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Ground release verification failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { verifyReleaseManifest };
