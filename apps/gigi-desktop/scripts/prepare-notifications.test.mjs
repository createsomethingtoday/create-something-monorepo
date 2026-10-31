import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { prepareNotifications } from './prepare-notifications.mjs';

test('packages a macOS 13 arm64 bridge with the complete notification ABI', {skip:process.platform!=='darwin'}, async () => {
  const dir=await mkdtemp(join(tmpdir(),'gigi-notification-build-'));
  try {
    const artifact=await prepareNotifications(dir);
    const exports=execFileSync('nm',['-gU',artifact],{encoding:'utf8'});
    for(const symbol of ['initialize','status','request','send','remove']) assert.match(exports,new RegExp(`_gigi_notifications_${symbol}\\b`));
    assert.match(execFileSync('file',[artifact],{encoding:'utf8'}),/arm64/);
    assert.match(execFileSync('otool',['-l',artifact],{encoding:'utf8'}),/minos 13\.0/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
