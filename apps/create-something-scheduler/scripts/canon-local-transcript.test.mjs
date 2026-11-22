import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const source = fileURLToPath(new URL('./canon-local-transcript.swift',import.meta.url));
test('native CLI compiles; help and consent/privacy gates run without recording or Speech prompts', {skip:process.platform !== 'darwin'}, async () => {
  const root = await mkdtemp(join(tmpdir(),'canon-local-test-'));
  try {
    const binary = join(root,'transcript');
    const build = spawnSync('swiftc',[source,'-o',binary],{encoding:'utf8'}); assert.equal(build.status,0,build.stderr);
    assert.match(spawnSync(binary,['--help'],{encoding:'utf8'}).stdout,/No recording or uploads/);
    assert.match(spawnSync(binary,[],{encoding:'utf8'}).stderr,/Explicit authorized/);
    const audio = join(root,'silence.wav');
    const wav = Buffer.alloc(44+32000); wav.write('RIFF'); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8); wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(16000,24); wav.writeUInt32LE(32000,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(32000,40);
    await writeFile(audio,wav,{mode:0o644});
    const args = ['--audio',audio,'--output',join(root,'transcript.json'),'--test-id','synthetic','--host-consented'];
    assert.match(spawnSync(binary,args,{encoding:'utf8'}).stderr,/must be private/);
    await chmod(audio,0o600);
    await writeFile(join(root,'transcript.json'),'preserved',{mode:0o600});
    assert.match(spawnSync(binary,args,{encoding:'utf8'}).stderr,/Output exists/);
    assert.equal(await readFile(join(root,'transcript.json'),'utf8'),'preserved');
  } finally { await rm(root,{recursive:true,force:true}); }
});
test('on-device request has both mandatory guards; no recording or transport implementation', async () => {
  const text = await readFile(source,'utf8');
  assert.match(text,/recognizer.supportsOnDeviceRecognition/); assert.match(text,/request.requiresOnDeviceRecognition = true/);
  assert.match(text,/SFSpeechURLRecognitionRequest/); assert.ok(!/URLSession|AVAudioEngine|AVAudioRecorder|ScreenCaptureKit/.test(text));
  assert.match(text,/speakerAttribution.*unavailable-do-not-infer/);
});
