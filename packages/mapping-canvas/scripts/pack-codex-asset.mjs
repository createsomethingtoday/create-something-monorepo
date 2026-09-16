#!/usr/bin/env node
// Package artwork already generated in Codex. No API requests or credentials.
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const args = process.argv.slice(2),
  get = (k) => {
    const i = args.indexOf(k);
    return i < 0 ? undefined : args[i + 1];
  };
const input = get('--image'),
  out = get('--out'),
  promptFile = get('--prompt-file'),
  model = get('--model');
if (!input || !out) {
  console.error(
    'Usage: node scripts/pack-codex-asset.mjs --image <Codex PNG> --out <asset.draw-asset.json> [--prompt-file <txt>] [--model <verified-model>]'
  );
  process.exit(1);
}
const bytes = await readFile(input);
if (
  bytes.length > 6_000_000 ||
  bytes.length < 24 ||
  bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
)
  throw new Error('Use a PNG up to 6 MB.');
const width = bytes.readUInt32BE(16),
  height = bytes.readUInt32BE(20);
if (!width || !height || width > 4096 || height > 4096)
  throw new Error('PNG dimensions must be within 4096 × 4096.');
const prompt = promptFile ? await readFile(promptFile, 'utf8') : undefined;
if (prompt && prompt.length > 8000) throw new Error('Prompt exceeds 8000 characters.');
const asset = {
  id: randomUUID(),
  name: basename(input),
  data: `data:image/png;base64,${bytes.toString('base64')}`,
  width,
  height,
  provenance: {
    source: 'codex-imagegen',
    createdAt: new Date().toISOString(),
    ...(prompt ? { prompt } : {}),
    ...(model ? { model } : {})
  }
};
await writeFile(out, JSON.stringify({ version: 'draw.asset.v1', asset }), { flag: 'wx' });
console.log(
  JSON.stringify({
    file: resolve(out),
    id: asset.id,
    width,
    height,
    source: asset.provenance.source,
    model: model ?? 'not reported by generation tool'
  })
);
