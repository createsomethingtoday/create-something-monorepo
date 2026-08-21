import { spawn, spawnSync } from 'node:child_process';
import { hashProjectPassword } from '../src/lib/server/access.js';

const fixturePassword = 'guard-lab-browser-fixture';
const verifier = await hashProjectPassword(fixturePassword);
const pnpmEntrypoint = process.env.npm_execpath;
if (!pnpmEntrypoint) throw new Error('Run the browser fixture through pnpm.');

console.log(JSON.stringify({
  url: 'http://127.0.0.1:4173',
  fixturePassword,
  playerId: 'developing-guard',
  productionCredential: false
}));

const migration = spawnSync(process.execPath, [pnpmEntrypoint, 'd1:migrate:local'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env
});
if (migration.status !== 0) throw new Error('The local Guard Lab D1 fixture migration failed.');

const child = spawn(process.execPath, [
  pnpmEntrypoint,
  'exec',
  'vite',
  'dev',
  '--host',
  '127.0.0.1',
  '--port',
  '4173'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ENVIRONMENT: 'development',
    GUARD_LAB_PROJECT_PASSWORD_HASH: verifier,
    GUARD_LAB_SESSION_SECRET: 'guard-lab-browser-fixture-session-secret-2026',
    GUARD_LAB_SHARED_PLAYER_ID: 'developing-guard'
  }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => child.kill(signal));
}

child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
