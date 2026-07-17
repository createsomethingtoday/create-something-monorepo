#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const secretName = process.env.CODEX_PRESENCE_OPENAI_SECRET_NAME?.trim() || 'OPENAI_API_KEY';
const environment = process.env.CODEX_PRESENCE_INFISICAL_ENV?.trim() || 'prod';
const secretPath = process.env.CODEX_PRESENCE_INFISICAL_PATH?.trim() || '/';

const secret = spawnSync('infisical', [
  'secrets', 'get', secretName,
  `--env=${environment}`,
  `--path=${secretPath}`,
  '--include-imports=true',
  '--plain',
  '--silent'
], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});

if (secret.status !== 0) throw new Error(`Could not load Infisical secret ${secretName}.`);
const apiKey = secret.stdout.trim();
if (!apiKey || apiKey.includes('\n')) throw new Error(`Infisical secret ${secretName} did not contain one value.`);

const verifier = spawn(process.execPath, [resolve(root, 'scripts/codex-presence-verify.mjs')], {
  cwd: root,
  env: { ...process.env, OPENAI_API_KEY: apiKey },
  stdio: 'inherit'
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => verifier.kill(signal));
}

const exitCode = await new Promise((resolveExit) => {
  verifier.once('exit', (code) => resolveExit(code ?? 1));
});
process.exitCode = exitCode;
