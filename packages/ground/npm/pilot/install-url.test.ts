import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(__filename);
const { version } = require('../package.json') as { version: string };
const installer = require('../install.js') as {
  getDownloadUrl?: (binaryName: string, platform?: string) => string;
  getChecksumsUrl?: () => string;
  verifyArchiveIntegrity?: (archive: Buffer, assetName: string, checksums: string) => void;
};

const releaseBase =
  `https://github.com/createsomethingtoday/create-something-monorepo/releases/download/ground-v${version}`;

test('installer uses the Ground release-tag convention for every downloaded platform', () => {
  assert.equal(typeof installer.getDownloadUrl, 'function');

  assert.equal(
    installer.getDownloadUrl?.('darwin-arm64', 'darwin'),
    `${releaseBase}/ground-darwin-arm64.tar.gz`
  );
  assert.equal(
    installer.getDownloadUrl?.('linux-x64', 'linux'),
    `${releaseBase}/ground-linux-x64.tar.gz`
  );
  assert.equal(
    installer.getDownloadUrl?.('linux-arm64', 'linux'),
    `${releaseBase}/ground-linux-arm64.tar.gz`
  );
  assert.equal(
    installer.getDownloadUrl?.('win32-x64', 'win32'),
    `${releaseBase}/ground-win32-x64.zip`
  );
});

test('installer verifies a release archive against the versioned checksum manifest', () => {
  assert.equal(installer.getChecksumsUrl?.(), `${releaseBase}/SHA256SUMS`);
  assert.equal(typeof installer.verifyArchiveIntegrity, 'function');

  const archive = Buffer.from('ground release asset');
  const checksums =
    'bd614a86afe39b824aefc23702fd2054ef3e7189a8bd1510d29e21275d01083e  ground-darwin-arm64.tar.gz\n';

  assert.doesNotThrow(() =>
    installer.verifyArchiveIntegrity?.(archive, 'ground-darwin-arm64.tar.gz', checksums)
  );
  assert.throws(
    () => installer.verifyArchiveIntegrity?.(archive, 'ground-linux-x64.tar.gz', checksums),
    /does not contain a checksum/
  );
  assert.throws(
    () =>
      installer.verifyArchiveIntegrity?.(
        Buffer.from('tampered'),
        'ground-darwin-arm64.tar.gz',
        checksums
      ),
    /checksum mismatch/
  );
});
