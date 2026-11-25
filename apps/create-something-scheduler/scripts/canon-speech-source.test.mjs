import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPrivateSpeech } from './canon-speech-source.mjs';
test('hour transcript retains global references and timing; overflow and invalid segment ends fail', async () => {
  const root = await mkdtemp(join(tmpdir(),'canon-speech-source-'));
  try {
    const hash = 'a'.repeat(64);
    const source = {schemaVersion:1,provider:'macOS Speech on-device',audience:'host-only',requiresOnDeviceRecognition:true,speakerAttribution:'unavailable-do-not-infer',audioSHA256:hash,audioDurationSeconds:3600,segments:[0,49.5,50,3599].map((start,i)=>({source:`local-audio-sha256:${hash}#segment-${i+1}`,startSeconds:start,durationSeconds:0.5,text:`word ${i}`}))};
    const path = join(root,'transcript.json');
    const save = () => writeFile(path,JSON.stringify(source),{mode:0o600});
    await save(); const result = await readPrivateSpeech(path);
    assert.equal(result.entries.at(-1).startSeconds,3599);
    assert.deepEqual(result.entries.flatMap(e=>e.segmentSources),source.segments.map(s=>s.source));
    source.audioDurationSeconds=3600.001; await save(); await assert.rejects(readPrivateSpeech(path));
    source.audioDurationSeconds=3600; source.segments.at(-1).durationSeconds=2; await save(); await assert.rejects(readPrivateSpeech(path));
  } finally { await rm(root,{recursive:true,force:true}); }
});
