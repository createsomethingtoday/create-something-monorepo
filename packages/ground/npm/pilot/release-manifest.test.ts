import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(__filename);
const verifier = require('../release-verify.js') as {
  verifyReleaseManifest?: (checksums: string) => void;
};

const digest = 'a'.repeat(64);
const completeManifest = [
  `${digest}  ground-darwin-arm64.tar.gz`,
  `${digest}  ground-linux-arm64.tar.gz`,
  `${digest}  ground-linux-x64.tar.gz`,
  `${digest}  ground-win32-x64.zip`
].join('\n');

test('npm publication requires checksums for every supported Ground release asset', () => {
  assert.equal(typeof verifier.verifyReleaseManifest, 'function');
  assert.doesNotThrow(() => verifier.verifyReleaseManifest?.(completeManifest));
  assert.throws(
    () => verifier.verifyReleaseManifest?.(completeManifest.replace('ground-linux-arm64.tar.gz\n', '')),
    /missing checksum entries.*ground-linux-arm64.tar.gz/
  );
});
