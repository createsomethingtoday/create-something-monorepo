#!/usr/bin/env node

import { spawn } from 'node:child_process';

const requiredSecrets = [
  'OPERATOR_ADMIN_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_WEBHOOK_SECRET_TOKEN'
];

const optionalSecrets = [
  'TELEGRAM_ALLOWED_USER_IDS',
  'TELEGRAM_ALLOWED_CHAT_IDS',
  'LINEAR_API_KEY'
];

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const dryRun = process.argv.includes('--dry-run');
const wranglerName = readArg('name');

function pushSecret(name, value) {
  return new Promise((resolve, reject) => {
    const args = ['exec', 'wrangler', 'secret', 'put', name];
    if (wranglerName) args.push('--name', wranglerName);

    if (dryRun) {
      console.log(`[dry-run] pnpm ${args.join(' ')}`);
      resolve();
      return;
    }

    const child = spawn('pnpm', args, {
      stdio: ['pipe', 'inherit', 'inherit']
    });

    child.stdin.end(value);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler secret put ${name} exited with ${code}`));
    });
  });
}

const missing = requiredSecrets.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment secrets: ${missing.join(', ')}`);
  console.error('Run through Infisical, for example:');
  console.error('  infisical run --env=prod --path=/ --include-imports=true -- pnpm --dir packages/operator-chat-agent secrets:push');
  process.exit(1);
}

const secrets = [...requiredSecrets, ...optionalSecrets].filter((name) => process.env[name]);

for (const name of secrets) {
  await pushSecret(name, process.env[name]);
}

console.log(`Pushed ${dryRun ? 'planned ' : ''}${secrets.length} Worker secret(s).`);
