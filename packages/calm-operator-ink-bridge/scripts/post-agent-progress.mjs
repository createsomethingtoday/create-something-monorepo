import { readFile } from 'node:fs/promises';

const origin = (process.env.INK_BRIDGE_ORIGIN || 'https://ink.createsomething.agency').replace(
  /\/+$/,
  ''
);
const token = process.env.INK_RELAY_TOKEN?.trim() || '';
if (!token) throw new Error('INK_RELAY_TOKEN is required.');

const path = process.argv[2];
const source = path && path !== '-' ? await readFile(path, 'utf8') : await readFile(0, 'utf8');
const progress = JSON.parse(source);
const response = await fetch(`${origin}/ink/agent-progress`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-ink-token': token },
  body: JSON.stringify(progress)
});
const result = await response.text();
if (!response.ok)
  throw new Error(`Ink bridge returned HTTP ${response.status}: ${result.slice(0, 500)}`);
process.stdout.write(`${result}\n`);
