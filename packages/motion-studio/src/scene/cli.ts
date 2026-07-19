#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import process from 'node:process';

import { buildAssemblyCommand } from './assembly.js';
import { planRender } from './cost.js';
import { planEdit } from './edit.js';
import type { MotionScene, RenderQuality, VideoProbe } from './types.js';
import { verifyVideoProbe } from './verify.js';

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function requiredOption(args: string[], name: string): string {
  const value = option(args, name);
  if (!value) throw new Error(`Missing required option: ${name}`);
  return value;
}

function qualityOption(args: string[]): RenderQuality {
  const value = option(args, '--quality') ?? 'draft';
  if (value !== 'draft' && value !== 'final') {
    throw new Error('--quality must be draft or final');
  }
  return value;
}

async function readScene(path: string): Promise<MotionScene> {
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Scene file must contain a JSON object');
  }
  return parsed as MotionScene;
}

async function writeOutput(args: string[], value: unknown): Promise<void> {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  const outputPath = option(args, '--out');
  if (outputPath) {
    await writeFile(outputPath, json, 'utf8');
    return;
  }
  process.stdout.write(json);
}

async function writeReceipt(args: string[], value: unknown): Promise<void> {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  const receiptPath = option(args, '--receipt');
  if (receiptPath) {
    await writeFile(receiptPath, json, 'utf8');
    return;
  }
  process.stdout.write(json);
}

async function run(executable: string, args: string[]): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout });
      else reject(new Error(`${executable} failed (${code ?? 'unknown'}): ${stderr.trim()}`));
    });
  });
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const scenePath = requiredOption(args, '--scene');
  const scene = await readScene(scenePath);

  if (command === 'plan') {
    const quality = qualityOption(args);
    await writeOutput(args, planRender(scene, quality));
    return;
  }

  if (command === 'edit') {
    const quality = qualityOption(args);
    const beatId = requiredOption(args, '--beat');
    await writeOutput(args, planEdit(scene, { beatId, quality }));
    return;
  }

  if (command === 'assemble') {
    const assembly = buildAssemblyCommand(scene, scenePath, option(args, '--out'));
    await run(assembly.executable, assembly.args);
    await writeReceipt(args, {
      sceneId: scene.id,
      outputPath: assembly.outputPath,
      inputPaths: assembly.inputPaths,
      durationSeconds: scene.format.deliveryDurationSeconds,
      authoredFps: scene.format.authoredFps,
      deliveryFps: scene.format.deliveryFps,
    });
    return;
  }

  if (command === 'verify') {
    const videoPath = requiredOption(args, '--video');
    const probeResult = await run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-show_entries',
      'stream=codec_type,width,height,r_frame_rate,nb_frames,sample_rate',
      '-of',
      'json',
      videoPath,
    ]);
    const receipt = verifyVideoProbe(scene, JSON.parse(probeResult.stdout) as VideoProbe, videoPath);
    await writeReceipt(args, receipt);
    if (!receipt.valid) process.exitCode = 1;
    return;
  }

  throw new Error(
    'Usage: motion-scene <plan|edit|assemble|verify> --scene <path> [options]'
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
