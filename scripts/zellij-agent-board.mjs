#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SOCKET_DIR = process.env.ZELLIJ_SOCKET_DIR || '/tmp/zellij';
const DEFAULT_REGISTRY = path.join(process.cwd(), '.codex', 'zellij-agent-lanes.json');

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    json: false,
    watch: false,
    intervalMs: 2000,
    registry: DEFAULT_REGISTRY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--json') options.json = true;
    else if (arg === '--watch') options.watch = true;
    else if (arg === '--registry' && next) options.registry = argv[++index];
    else if (arg === '--interval-ms' && next) options.intervalMs = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.intervalMs) || options.intervalMs < 500 || options.intervalMs > 60_000) {
    throw new Error('--interval-ms must be an integer between 500 and 60000');
  }

  options.registry = path.resolve(options.registry);
  return options;
}

function usage() {
  return `Usage:
  pnpm zellij:board [--watch] [--json] [--registry <path>] [--interval-ms <ms>]

Shows a sidebar-style overview of repo-managed Zellij agent lanes.
`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function stripAnsi(value) {
  return String(value).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function runZellij(args) {
  fs.mkdirSync(DEFAULT_SOCKET_DIR, { recursive: true });
  const result = spawnSync('zellij', args, {
    cwd: process.cwd(),
    env: { ...process.env, ZELLIJ_SOCKET_DIR: DEFAULT_SOCKET_DIR },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    ok: result.status === 0,
    stdout: stripAnsi(result.stdout).trim(),
    stderr: stripAnsi(result.stderr).trim(),
  };
}

function readRegistry(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed?.lanes) ? parsed.lanes : [];
  } catch {
    return [];
  }
}

function parsePaneListOutput(stdout) {
  if (!stdout.startsWith('[') && !stdout.startsWith('{')) {
    return { ok: false, panes: [], error: 'session not attachable; it may be exited and waiting for resurrection' };
  }
  const parsed = JSON.parse(stdout);
  return { ok: true, panes: Array.isArray(parsed) ? parsed : [], error: null };
}

function listSessions() {
  const result = runZellij(['list-sessions', '--short', '--no-formatting']);
  if (!result.ok || result.stdout.includes('No active zellij sessions found')) return [];
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function listPanes(session) {
  const result = runZellij(['--session', session, 'action', 'list-panes', '--json', '--state', '--command', '--tab', '--all']);
  if (!result.ok) return { ok: false, panes: [], error: result.stderr || result.stdout };
  try {
    return parsePaneListOutput(result.stdout);
  } catch (error) {
    if (result.stdout.includes('Session') && result.stdout.includes('not found')) {
      return { ok: false, panes: [], error: 'session not attachable; it may be exited and waiting for resurrection' };
    }
    return { ok: false, panes: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function buildBoard(options) {
  const registry = readRegistry(options.registry);
  const sessions = listSessions();
  const live = new Set(sessions);
  const registeredSessions = new Set(registry.map((lane) => lane.session));
  const allSessions = [...new Set([...registry.map((lane) => lane.session), ...sessions])].sort();

  return allSessions.map((session) => {
    const lane = registry.find((candidate) => candidate.session === session) || {};
    const paneState = live.has(session) ? listPanes(session) : { ok: true, panes: [], error: null };
    const targetPaneId = lane.paneId ? Number(String(lane.paneId).replace(/^terminal_/, '')) : null;
    const panes = paneState.panes;
    const terminalPanes = panes.filter((candidate) => !candidate.is_plugin);
    const pane =
      terminalPanes.find((candidate) => targetPaneId !== null && candidate.id === targetPaneId) ||
      terminalPanes.find((candidate) => candidate.title === lane.paneName) ||
      terminalPanes[0] ||
      panes[0] ||
      null;
    const status = !live.has(session)
      ? 'stopped'
      : paneState.error?.includes('not attachable')
        ? 'exited'
      : pane?.exited
        ? `exited:${pane.exit_status ?? 'unknown'}`
        : paneState.ok
          ? 'active'
          : 'unknown';

    return {
      session,
      status,
      registered: registeredSessions.has(session),
      paneId: lane.paneId || (pane ? `terminal_${pane.id}` : null),
      paneName: lane.paneName || pane?.title || null,
      command: lane.command || pane?.terminal_command || null,
      cwd: lane.cwd || pane?.pane_cwd || null,
      createdAt: lane.createdAt || null,
      attach: `ZELLIJ_SOCKET_DIR=${shellQuote(DEFAULT_SOCKET_DIR)} zellij attach ${shellQuote(session)}`,
      inspect: pane
        ? `ZELLIJ_SOCKET_DIR=${shellQuote(DEFAULT_SOCKET_DIR)} zellij --session ${shellQuote(session)} action dump-screen --pane-id ${shellQuote(`terminal_${pane.id}`)} --full`
        : null,
      streamJson: pane
        ? `ZELLIJ_SOCKET_DIR=${shellQuote(DEFAULT_SOCKET_DIR)} zellij --session ${shellQuote(session)} subscribe --pane-id ${shellQuote(`terminal_${pane.id}`)} --format json --scrollback 200`
        : null,
      error: paneState.error,
    };
  });
}

function renderText(board) {
  const lines = [
    'CREATE SOMETHING / Zellij Agent Board',
    `Updated: ${new Date().toISOString()}`,
    `Socket: ${DEFAULT_SOCKET_DIR}`,
    '',
  ];

  if (board.length === 0) {
    lines.push('No active or registered Zellij agent lanes.');
    lines.push('');
    lines.push("Start one with: pnpm zellij:claude -- --name claude-webflow");
    return lines.join('\n');
  }

  for (const lane of board) {
    const marker = lane.status === 'active' ? '*' : lane.status.startsWith('exited') ? '!' : '-';
    lines.push(`${marker} ${lane.session}`);
    lines.push(`  status: ${lane.status}${lane.registered ? '' : ' (unregistered)'}`);
    if (lane.paneName || lane.paneId) lines.push(`  pane: ${[lane.paneName, lane.paneId].filter(Boolean).join(' / ')}`);
    if (lane.command) lines.push(`  command: ${lane.command}`);
    if (lane.cwd) lines.push(`  cwd: ${lane.cwd}`);
    if (lane.createdAt) lines.push(`  created: ${lane.createdAt}`);
    lines.push(`  attach: ${lane.attach}`);
    if (lane.inspect) lines.push(`  inspect: ${lane.inspect}`);
    if (lane.streamJson) lines.push(`  stream: ${lane.streamJson}`);
    if (lane.error) lines.push(`  error: ${lane.error}`);
    lines.push('');
  }

  return lines.join('\n');
}

function printBoard(options) {
  const board = buildBoard(options);
  if (options.json) console.log(JSON.stringify({ socketDir: DEFAULT_SOCKET_DIR, board }, null, 2));
  else console.log(renderText(board));
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.watch) {
    printBoard(options);
    return;
  }

  for (;;) {
    process.stdout.write('\x1Bc');
    printBoard(options);
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { buildBoard, listPanes, listSessions, parseArgs, parsePaneListOutput, renderText, stripAnsi };
