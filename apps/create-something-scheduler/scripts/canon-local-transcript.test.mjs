import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, chmod, rm, realpath } from 'node:fs/promises';
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
test('one-hour native audio is fully segmented offline; overflow rejected and no transcript published', {skip:process.platform !== 'darwin'}, async () => {
  const root = await mkdtemp(join(tmpdir(),'canon-hour-test-'));
  try {
    const binary = join(root,'transcript');
    const build = spawnSync('swiftc',[process.env.CANON_TEST_SWIFT_SOURCE || source,'-o',binary],{encoding:'utf8'});
    assert.equal(build.status,0,build.stderr);
    // Real PCM input: 57,600,000 frames, about 115 MB, without speech or permission prompts.
    const frames = 16000 * 3600;
    const header = Buffer.alloc(44); header.write('RIFF'); header.writeUInt32LE(36+frames*2,4); header.write('WAVEfmt ',8); header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(1,22); header.writeUInt32LE(16000,24); header.writeUInt32LE(32000,28); header.writeUInt16LE(2,32); header.writeUInt16LE(16,34); header.write('data',36); header.writeUInt32LE(frames*2,40);
    const audio = join(root,'hour.wav');
    await writeFile(audio,Buffer.concat([header,Buffer.alloc(frames*2)]),{mode:0o600});
    const output = join(root,'never-transcript.json');
    const args = ['--audio',audio,'--output',output,'--test-id','synthetic-hour','--host-consented','--validate-audio'];
    const run = spawnSync(binary,args,{encoding:'utf8',timeout:120000});
    assert.equal(run.status,0,run.stderr);
    const result = JSON.parse(run.stdout);
    assert.equal(result.validationOnly,true); assert.equal(result.audioDurationSeconds,3600);
    assert.equal(result.coveredFrames,frames); assert.equal(result.inputFrames,frames); assert.equal(result.chunks.length,72);
    result.chunks.forEach((chunk,i) => { assert.equal(chunk.startSeconds,i*50); assert.equal(chunk.durationSeconds,50); assert.equal(chunk.digitallySilent,true); });
    const { readdir } = await import('node:fs/promises');
    assert.deepEqual((await readdir(root)).sort(),['hour.wav','transcript']);
    header.writeUInt32LE(36+(frames+1)*2,4); header.writeUInt32LE((frames+1)*2,40);
    await writeFile(audio,Buffer.concat([header,Buffer.alloc((frames+1)*2)]),{mode:0o600});
    const overflow = spawnSync(binary,args,{encoding:'utf8'});
    assert.equal(overflow.status,1); assert.match(overflow.stderr,/at most 60 minutes/);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('normal signed app launches help through LaunchServices without a Speech prompt', {skip:process.platform !== 'darwin'}, async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(),'canon-app-test-')));
  try {
    const helper = fileURLToPath(new URL('./canon-local-transcript-app.mjs',import.meta.url));
    const app = join(root,'Canon Local Transcript.app');
    const build = spawnSync(process.execPath,[helper,'build','--app',app],{encoding:'utf8',timeout:120000});
    assert.equal(build.status,0,build.stderr);
    const run = spawnSync(process.execPath,[helper,'run','--app',app,'--','--help'],{encoding:'utf8',timeout:30000});
    assert.equal(run.status,0,run.stderr); assert.match(run.stdout,/No recording or uploads/); assert.match(run.stdout,/LaunchServices completed successfully/);
    const failed = spawnSync(process.execPath,[helper,'run','--app',app,'--','--invalid'],{encoding:'utf8',timeout:30000});
    assert.equal(failed.status,1); assert.match(failed.stderr,/Transcriber exited 1/); assert.match(failed.stdout,/Invalid arguments/);
    const rebuild = spawnSync(process.execPath,[helper,'build','--app',app],{encoding:'utf8'});
    assert.equal(rebuild.status,1); assert.match(rebuild.stderr,/Existing binaries are preserved/);
  } finally { await rm(root,{recursive:true,force:true}); }
});
