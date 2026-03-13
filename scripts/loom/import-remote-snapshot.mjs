#!/usr/bin/env node

import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    snapshot: 'tmp/loom-migration-snapshot.json',
    url: 'https://loom.mcp.createsomething.agency/admin/migrate',
    token: process.env.MIGRATION_ADMIN_TOKEN ?? '',
    signingSecret: process.env.MIGRATION_SIGNING_SECRET ?? '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot' && argv[i + 1]) {
      args.snapshot = argv[++i];
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
    if (arg === '--signing-secret' && argv[i + 1]) {
      args.signingSecret = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:\n  node scripts/loom/import-remote-snapshot.mjs [--snapshot tmp/loom-migration-snapshot.json] [--url https://loom.mcp.createsomething.agency/admin/migrate] [--token <token>] [--signing-secret <secret>]`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.token) {
    throw new Error('Missing migration token. Pass --token or set MIGRATION_ADMIN_TOKEN.');
  }

  return args;
}

function computeSignature(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

async function main() {
  const args = parseArgs(process.argv);
  const snapshotPath = resolve(args.snapshot);
  const snapshotRaw = readFileSync(snapshotPath, 'utf8');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${args.token}`,
  };

  if (args.signingSecret) {
    headers['X-Migration-Signature'] = computeSignature(snapshotRaw, args.signingSecret);
  }

  const response = await fetch(args.url, {
    method: 'POST',
    headers,
    body: snapshotRaw,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Remote migration failed (${response.status}): ${responseText}`);
  }

  console.log(`Migration import succeeded: ${args.url}`);
  console.log(responseText);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
