#!/usr/bin/env node

import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const CHECKPOINT_SCRIPT = path.join(ROOT, 'scripts', 'loom', 'deploy-checkpoint.mjs');

const SURFACES = {
  agency: {
    label: 'agency',
    command: ['pnpm', '--filter', '@create-something/agency', 'deploy'],
    defaultEnvironment: 'dev',
  },
  io: {
    label: 'io',
    command: ['pnpm', '--filter', '@create-something/io', 'deploy'],
    defaultEnvironment: 'dev',
  },
  space: {
    label: 'space',
    command: ['pnpm', '--filter', '@create-something/space', 'deploy'],
    defaultEnvironment: 'dev',
  },
  ltd: {
    label: 'ltd',
    command: ['pnpm', '--filter', '@create-something/ltd', 'deploy'],
    defaultEnvironment: 'dev',
  },
  'identity-worker': {
    label: 'identity-worker',
    command: ['pnpm', '--filter', '@create-something/identity-worker', 'deploy'],
    defaultEnvironment: 'dev',
  },
  'cs-hub-remote': {
    label: 'cs-hub-remote',
    command: ['pnpm', '--filter', '@create-something/cs-mcp-hub-remote', 'deploy'],
    defaultEnvironment: 'dev',
  },
  'hub-fleet': {
    label: 'hub-fleet',
    command: ['pnpm', 'mcp:hub:fleet:deploy'],
    defaultEnvironment: 'dev',
  },
};

function usage() {
  const surfaceList = Object.keys(SURFACES).sort().join(', ');
  console.log(`Usage:
  node scripts/loom/deploy-surface.mjs --surface <name> [checkpoint options] [-- <extra deploy args>]

Surfaces:
  ${surfaceList}

Behavior:
  - injects the selected surface label into scripts/loom/deploy-checkpoint.mjs
  - uses the mapped high-traffic deploy command for that surface
  - forwards any args after -- to the underlying deploy command
  - defaults --environment to the surface default when omitted

Options:
  --surface <name>   Surface key from the list above
  --print-command    Print the resolved checkpoint command and exit
  --help             Show this message

Examples:
  node scripts/loom/deploy-surface.mjs \\
    --surface agency \\
    --task-id lm-123 \\
    --rollback-reference main

  pnpm deploy:agency:checkpoint -- --task-id lm-123 --rollback-reference main

  pnpm deploy:io:checkpoint -- \\
    --task-id lm-456 \\
    --environment preview \\
    --rollback-reference main \\
    -- --branch=preview
`);
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function parseArgs(argv) {
  const wrapper = {
    printCommand: false,
    skippedScriptArgsBarrier: false,
  };
  const checkpointArgs = [];
  const deployArgs = [];
  let inDeployArgs = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (
      arg === '--' &&
      !inDeployArgs &&
      wrapper.surface &&
      checkpointArgs.length === 0 &&
      deployArgs.length === 0 &&
      !wrapper.skippedScriptArgsBarrier
    ) {
      wrapper.skippedScriptArgsBarrier = true;
      continue;
    }

    if (arg === '--') {
      inDeployArgs = true;
      continue;
    }

    if (inDeployArgs) {
      deployArgs.push(arg);
      continue;
    }

    if (arg === '--surface' && argv[index + 1]) {
      wrapper.surface = argv[++index];
      continue;
    }
    if (arg === '--print-command') {
      wrapper.printCommand = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      wrapper.help = true;
      continue;
    }

    checkpointArgs.push(arg);
  }

  return { wrapper, checkpointArgs, deployArgs };
}

function hasOption(args, name) {
  return args.includes(name);
}

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function main() {
  const { wrapper, checkpointArgs, deployArgs } = parseArgs(process.argv);

  if (wrapper.help) {
    usage();
    process.exit(0);
  }

  if (!wrapper.surface) {
    throw new Error('Missing required option: --surface');
  }

  const surface = SURFACES[wrapper.surface];
  if (!surface) {
    throw new Error(`Unknown surface: ${wrapper.surface}`);
  }

  const resolvedCheckpointArgs = [...checkpointArgs];
  if (!hasOption(resolvedCheckpointArgs, '--environment')) {
    resolvedCheckpointArgs.push('--environment', surface.defaultEnvironment);
  }

  const command = [
    process.execPath,
    CHECKPOINT_SCRIPT,
    '--surface',
    surface.label,
    ...resolvedCheckpointArgs,
    '--',
    ...surface.command,
    ...(deployArgs.length > 0 ? ['--', ...deployArgs] : []),
  ];

  if (wrapper.printCommand) {
    console.log(command.map(shellQuote).join(' '));
    return;
  }

  const exitCode = await runCommand(command, ROOT);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
