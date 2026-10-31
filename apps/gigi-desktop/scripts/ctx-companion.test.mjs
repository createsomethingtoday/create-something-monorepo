import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCtxAsset, ctxAsset } from './ctx-companion.mjs';
test('only pinned supported CTX distribution assets can enter the bundle',()=>{
 assert.equal(ctxAsset('darwin','arm64').sha256,'90807a133453ed6a2a70b6fdfb70a1ce7da9b6d4eb2cf33248020c664d330d99');
 assert.throws(()=>ctxAsset('darwin','ia32'),/Unsupported/);
 assert.throws(()=>verifyCtxAsset(Buffer.from('unverified executable'),ctxAsset('darwin','arm64')),/checksum/);
});
