import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { prepareMapPreview } from './prepare-map-preview.mjs';

test('builds the saved-place map helper for macOS 13 arm64 and rejects malformed input without a lookup', {skip:process.platform!=='darwin'}, async () => {
  const dir = await mkdtemp(join(tmpdir(),'gigi-map-build-'));
  try {
    const artifact = await prepareMapPreview(dir);
    assert.match(execFileSync('file',[artifact],{encoding:'utf8'}),/arm64/);
    assert.match(execFileSync('otool',['-l',artifact],{encoding:'utf8'}),/minos 13\.0/);
    for(const input of ['{}','not json',JSON.stringify({query:'x'.repeat(501)})]) {
      const run=spawnSync(artifact,[],{input,encoding:'utf8',timeout:5000});
      assert.equal(run.status,2); assert.equal(run.stdout,'');
    }
    const build = await readFile(new URL('../src-tauri/build.rs',import.meta.url),'utf8');
    assert.match(build,/"native"/, 'Swift changes must invalidate compiler provenance');
  } finally { await rm(dir,{recursive:true,force:true}); }
});
