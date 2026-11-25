import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, chmod, rm, stat, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { postcall, inspectWav } from './canon-postcall.mjs';
import { encodeWav } from './canon-local-capture/audio.mjs';
async function fixture(t) {
  const d = await mkdtemp(join(await realpath(tmpdir()), 'canon-postcall-'));
  await chmod(d, 0o700);
  t.after(() => rm(d, { recursive: true, force: true }));
  return d;
}
test('partial exact files and Chrome temporary files never trigger transcription', async (t) => {
  const directory = await fixture(t);
  const b = Buffer.from(encodeWav([new Float32Array(160)], 16000));
  await writeFile(join(directory, 'canon-meeting.wav.crswap'), b);
  await writeFile(join(directory, 'canon-meeting.wav'), b.subarray(0, 50));
  assert.equal(await inspectWav(join(directory, 'canon-meeting.wav')), null);
  let calls = 0;
  await assert.rejects(
    postcall({ directory, occurrence: 'test', waitMs: 10, pollMs: 5, transcribe: () => calls++ }),
    /No completed/
  );
  assert.equal(calls, 0);
  assert.equal(
    JSON.parse(await readFile(join(directory, 'postcall-status.json'))).state,
    'failed-retryable'
  );
});
test('completed file produces a private recap, reruns reuse output and recover from failure', async (t) => {
  const directory = await fixture(t);
  const b = Buffer.from(encodeWav([new Float32Array(16000)], 16000));
  await writeFile(join(directory, 'canon-meeting.wav'), b, { mode: 0o644 });
  let calls = 0;
  const transcribe = async (audio, output, occurrence) => {
    calls++;
    const sha = createHash('sha256')
      .update(await readFile(audio))
      .digest('hex');
    await writeFile(
      output,
      JSON.stringify({
        schemaVersion: 1,
        provider: 'macOS Speech on-device',
        audience: 'host-only',
        requiresOnDeviceRecognition: true,
        speakerAttribution: 'unavailable-do-not-infer',
        audioSHA256: sha,
        audioDurationSeconds: 1,
        testID: occurrence,
        segments: [
          {
            source: `local-audio-sha256:${sha}#segment-1`,
            startSeconds: 0,
            durationSeconds: 0.5,
            text: 'We agreed to review.'
          }
        ]
      }),
      { mode: 0o600 }
    );
  };
  await assert.rejects(
    postcall({
      directory,
      occurrence: 'test',
      waitMs: 100,
      pollMs: 5,
      transcribe: async () => {
        throw Error('permission denied');
      }
    }),
    /permission denied/
  );
  const result = await postcall({ directory, occurrence: 'test', transcribe });
  assert.equal(result.state, 'private-review-ready');
  assert.match(await readFile(join(result.review, 'recap.html'), 'utf8'), /We agreed/);
  assert.equal((await stat(join(directory, 'completed-audio.wav'))).mode & 0o077, 0);
  await postcall({ directory, occurrence: 'test', transcribe });
  assert.equal(calls, 1);
  await assert.rejects(
    postcall({ directory, occurrence: 'other', transcribe }),
    /another occurrence/
  );
});
