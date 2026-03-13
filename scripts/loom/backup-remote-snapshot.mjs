#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    out: 'tmp/loom-remote-backup.json',
    url: 'https://loom.mcp.createsomething.agency/admin/export',
    token: process.env.MIGRATION_ADMIN_TOKEN ?? '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' && argv[i + 1]) {
      args.out = argv[++i];
      continue;
    }
    if (arg === '--url' && argv[i + 1]) {
      args.url = argv[++i];
      continue;
    }
    if (arg === '--token' && argv[i + 1]) {
      args.token = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:\n  node scripts/loom/backup-remote-snapshot.mjs [--out tmp/loom-remote-backup.json] [--url https://loom.mcp.createsomething.agency/admin/export] [--token <MIGRATION_ADMIN_TOKEN>]`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.token) {
    throw new Error('Missing migration token. Pass --token or set MIGRATION_ADMIN_TOKEN.');
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const response = await fetch(args.url, {
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Remote backup failed (${response.status}): ${text}`);
  }

  const outPath = resolve(args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${text.trim()}\n`, 'utf8');

  const snapshot = JSON.parse(text);
  console.log(`Wrote remote Loom backup: ${outPath}`);
  console.log(JSON.stringify(snapshot.counts ?? {}, null, 2));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
