import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(__filename);
const installer = require('../install.js') as {
  getDownloadUrl?: (binaryName: string, platform?: string) => string;
};

test('installer uses the Ground release-tag convention for every downloaded platform', () => {
  assert.equal(typeof installer.getDownloadUrl, 'function');

  assert.equal(
    installer.getDownloadUrl?.('darwin-arm64', 'darwin'),
    'https://github.com/createsomethingtoday/create-something-monorepo/releases/download/ground-v0.3.0/ground-darwin-arm64.tar.gz'
  );
  assert.equal(
    installer.getDownloadUrl?.('linux-x64', 'linux'),
    'https://github.com/createsomethingtoday/create-something-monorepo/releases/download/ground-v0.3.0/ground-linux-x64.tar.gz'
  );
  assert.equal(
    installer.getDownloadUrl?.('linux-arm64', 'linux'),
    'https://github.com/createsomethingtoday/create-something-monorepo/releases/download/ground-v0.3.0/ground-linux-arm64.tar.gz'
  );
  assert.equal(
    installer.getDownloadUrl?.('win32-x64', 'win32'),
    'https://github.com/createsomethingtoday/create-something-monorepo/releases/download/ground-v0.3.0/ground-win32-x64.zip'
  );
});
