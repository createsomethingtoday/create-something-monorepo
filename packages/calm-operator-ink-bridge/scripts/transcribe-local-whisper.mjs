#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_WHISPER_MODEL = join(
  homedir(),
  'Library/Application Support/CREATE SOMETHING/Calm Operator/models/ggml-base.en.bin'
);

export function buildLocalWhisperCommands(audioPath, options = {}) {
  const wavPath = `${audioPath}.wav`;
  const outputBase = `${audioPath}.transcript`;
  return {
    ffmpeg: {
      executable: options.ffmpegExecutable || '/opt/homebrew/bin/ffmpeg',
      args: [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        's16le',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-i',
        audioPath,
        '-y',
        wavPath
      ]
    },
    whisper: {
      executable: options.whisperExecutable || '/opt/homebrew/bin/whisper-cli',
      args: [
        '--model',
        options.modelPath || DEFAULT_WHISPER_MODEL,
        '--file',
        wavPath,
        '--language',
        'en',
        '--prompt',
        'Codex. CREATE SOMETHING. Linear. GitHub. Cloudflare. Webflow.',
        '--no-timestamps',
        '--no-prints',
        '--suppress-nst',
        '--output-txt',
        '--output-file',
        outputBase
      ]
    },
    wavPath,
    transcriptPath: `${outputBase}.txt`
  };
}

function run(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      shell: false,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-4_000);
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error((stderr || `Local transcriber exited ${code}.`).trim().slice(0, 500)));
    });
  });
}

export async function transcribeLocalPcm(audioPath, options = {}) {
  if (!audioPath?.endsWith('.pcm')) throw new Error('Expected a Stopwatch .pcm recording.');
  const commands = buildLocalWhisperCommands(audioPath, options);
  await access(audioPath);
  await access(commands.whisper.args[1]);
  try {
    await run(commands.ffmpeg);
    await run(commands.whisper);
    const transcript = (await readFile(commands.transcriptPath, 'utf8')).trim();
    if (!transcript) throw new Error('Local Whisper returned an empty transcript.');
    return transcript;
  } finally {
    await Promise.all([
      rm(commands.wavPath, { force: true }),
      rm(commands.transcriptPath, { force: true })
    ]);
  }
}

async function main() {
  const audioPath = process.argv[2];
  const transcript = await transcribeLocalPcm(audioPath, {
    modelPath: process.env.CALM_OPERATOR_WHISPER_MODEL,
    ffmpegExecutable: process.env.CALM_OPERATOR_FFMPEG_EXECUTABLE,
    whisperExecutable: process.env.CALM_OPERATOR_WHISPER_EXECUTABLE
  });
  process.stdout.write(`${transcript}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
