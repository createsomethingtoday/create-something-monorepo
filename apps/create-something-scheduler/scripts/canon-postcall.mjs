#!/usr/bin/env node
// Exact-occurrence local processing only. Recording and consent remain human actions.
import { constants } from 'node:fs';
import { open, mkdir, lstat, realpath, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readPrivateSpeech } from './canon-speech-source.mjs';
import { savePrivate } from './canon-recap.mjs';
const exec = promisify(execFile);
const scripts = dirname(fileURLToPath(import.meta.url));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export async function privateDirectory(directory) {
  const s = await lstat(directory);
  if (
    !s.isDirectory() ||
    s.isSymbolicLink() ||
    s.uid !== process.getuid() ||
    s.mode & 0o077 ||
    (await realpath(directory)) !== directory
  )
    throw Error('Occurrence directory must exist, be owner-only (0700), and contain no symlinks.');
}
export async function inspectWav(path) {
  const f = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const s = await f.stat();
    if (!s.isFile() || s.uid !== process.getuid()) throw Error('Unsafe recording.');
    const b = Buffer.alloc(44);
    const { bytesRead } = await f.read(b, 0, 44, 0);
    if (
      bytesRead !== 44 ||
      b.toString('ascii', 0, 4) !== 'RIFF' ||
      b.toString('ascii', 8, 16) !== 'WAVEfmt ' ||
      b.toString('ascii', 36, 40) !== 'data' ||
      b.readUInt32LE(16) !== 16 ||
      b.readUInt16LE(20) !== 1 ||
      b.readUInt16LE(22) !== 1 ||
      b.readUInt16LE(34) !== 16
    )
      return null;
    const rate = b.readUInt32LE(24),
      bytes = b.readUInt32LE(40);
    if (
      rate < 8000 ||
      rate > 96000 ||
      !bytes ||
      bytes % 2 ||
      bytes > rate * 2 * 3600 ||
      s.size !== bytes + 44 ||
      b.readUInt32LE(4) !== s.size - 8 ||
      b.readUInt16LE(32) !== 2 ||
      b.readUInt32LE(28) !== rate * 2
    )
      return null;
    return { identity: `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`, size: s.size };
  } finally {
    await f.close();
  }
}
async function hashFile(path) {
  const f = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const h = createHash('sha256');
    for await (const b of f.createReadStream({ autoClose: false })) h.update(b);
    return h.digest('hex');
  } finally {
    await f.close();
  }
}
export async function postcall({
  directory,
  occurrence,
  app,
  waitMs = 21600000,
  pollMs = 2000,
  transcribe
}) {
  directory = resolve(directory);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(occurrence)) throw Error('Use a unique safe occurrence ID.');
  await privateDirectory(directory);
  const lock = join(directory, '.postcall-lock');
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const lockStat = await lstat(lock);
    if (
      !lockStat.isDirectory() ||
      lockStat.isSymbolicLink() ||
      lockStat.uid !== process.getuid() ||
      lockStat.mode & 0o077
    )
      throw Error('Unsafe postcall lock.');
    const pid = Number(await readFile(join(lock, 'pid'), 'utf8').catch(() => '0'));
    if (!pid)
      throw Error('Incomplete lock; verify no worker runs, then remove .postcall-lock to retry.');
    try {
      process.kill(pid, 0);
      throw Error('Postcall worker already running.');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
    await rm(lock, { recursive: true });
    return postcall({ directory, occurrence, app, waitMs, pollMs, transcribe });
  }
  await writeFile(join(lock, 'pid'), String(process.pid), { mode: 0o600, flag: 'wx' });
  const statusPath = join(directory, 'postcall-status.json');
  async function status(value) {
    const tmp = join(lock, 'status.json');
    await writeFile(
      tmp,
      JSON.stringify(
        { schemaVersion: 1, occurrence, updatedAt: new Date().toISOString(), ...value },
        null,
        2
      ) + '\n',
      { mode: 0o600 }
    );
    await rename(tmp, statusPath);
  }
  const transcript = join(directory, 'transcript.json'),
    snapshot = join(directory, 'completed-audio.wav');
  let ownsOccurrence = false;
  try {
    const prior = JSON.parse(await readFile(statusPath, 'utf8').catch(() => '{}'));
    if (prior.occurrence && prior.occurrence !== occurrence)
      throw Error('Directory already belongs to another occurrence.');
    ownsOccurrence = true;
    await status({
      state: 'waiting-for-completed-recording',
      expectedAudio: join(directory, 'canon-meeting.wav')
    });
    let snapshotExists = false;
    try {
      await lstat(snapshot);
      snapshotExists = true;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (!snapshotExists) {
      const source = join(directory, 'canon-meeting.wav'),
        deadline = Date.now() + waitMs;
      let previous;
      while (true) {
        const candidate = await inspectWav(source).catch((e) => {
          if (e.code === 'ENOENT') return null;
          throw e;
        });
        if (candidate && candidate.identity === previous) {
          const input = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);
          const stage = join(lock, 'audio.wav');
          try {
            const output = await open(stage, 'wx', 0o600);
            try {
              for await (const chunk of input.createReadStream({ autoClose: false })) {
                let offset = 0;
                while (offset < chunk.length) {
                  const { bytesWritten } = await output.write(chunk, offset, chunk.length - offset);
                  offset += bytesWritten;
                }
              }
              await output.sync();
            } finally {
              await output.close();
            }
            if ((await inspectWav(source))?.identity !== previous || !(await inspectWav(stage)))
              throw Error('Recording changed during snapshot; retry after capture completes.');
            await rename(stage, snapshot);
          } finally {
            await input.close();
          }
          break;
        }
        if (Date.now() >= deadline)
          throw Error(
            'No completed exact recording arrived before timeout; retry this occurrence after saving.'
          );
        previous = candidate?.identity;
        await pause(pollMs);
      }
    }
    const ss = await lstat(snapshot);
    if (ss.mode & 0o077 || !(await inspectWav(snapshot)))
      throw Error('Unsafe or incomplete saved audio snapshot.');
    const audioSHA256 = await hashFile(snapshot);
    let transcriptExists = false;
    try {
      await lstat(transcript);
      transcriptExists = true;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (!transcriptExists) {
      await status({ state: 'transcribing-on-device', audioSHA256 });
      if (transcribe) await transcribe(snapshot, transcript, occurrence);
      else
        await exec(
          process.execPath,
          [
            join(scripts, 'canon-local-transcript-app.mjs'),
            'run',
            ...(app ? ['--app', resolve(app)] : []),
            '--',
            '--audio',
            snapshot,
            '--output',
            transcript,
            '--test-id',
            occurrence,
            '--host-consented'
          ],
          { timeout: 4 * 60 * 60 * 1000, maxBuffer: 1024 * 1024 }
        );
    }
    const meeting = await readPrivateSpeech(transcript);
    const raw = JSON.parse(await readFile(transcript, 'utf8'));
    if (raw.audioSHA256 !== audioSHA256 || raw.testID !== occurrence)
      throw Error('Transcript does not match this occurrence audio.');
    const result = await savePrivate(meeting, join(directory, 'review'));
    const outcome = {
      state: 'private-review-ready',
      audioSHA256,
      transcript,
      review: result.folder,
      humanReviewRequired: true
    };
    await status(outcome);
    return outcome;
  } catch (error) {
    if (ownsOccurrence)
      await status({ state: 'failed-retryable', error: error.message.slice(0, 2000) });
    throw error;
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
export async function main(args = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--directory', '--occurrence', '--app', '--wait-ms'].includes(args[i]) ||
      !args[i + 1] ||
      options[args[i]]
    )
      throw Error(
        'Use --directory <private occurrence folder> --occurrence <unique ID> [--app <existing.app>] [--wait-ms <positive milliseconds>].'
      );
    options[args[i]] = args[i + 1];
  }
  if (!options['--directory'] || !options['--occurrence'])
    throw Error('Explicit directory and occurrence required.');
  const waitMs = options['--wait-ms'] ? Number(options['--wait-ms']) : 21600000;
  if (!Number.isSafeInteger(waitMs) || waitMs < 1 || waitMs > 86400000)
    throw Error('Invalid wait timeout.');
  console.log(
    JSON.stringify(
      await postcall({
        directory: options['--directory'],
        occurrence: options['--occurrence'],
        app: options['--app'],
        waitMs
      })
    )
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
