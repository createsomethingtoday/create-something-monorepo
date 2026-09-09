#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const STORE =
  process.env.CS_ZELLIJ_HOME ||
  path.join(os.homedir(), 'Library/Application Support/CREATE SOMETHING/Zellij');
const socketDir = process.env.ZELLIJ_SOCKET_DIR || '/tmp/zellij';
export function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
export function taskPath(id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id || ''))
    throw new Error('Task id must be 1-64 letters, digits, underscores or hyphens.');
  return path.join(STORE, 'tasks', id);
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
}
export function zellij(session, args) {
  const result = spawnSync('zellij', [...(session ? ['--session', session] : []), ...args], {
    env: { ...process.env, ZELLIJ_SOCKET_DIR: socketDir },
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message || result.stderr?.trim() || 'Zellij command failed');
  return result.stdout.trim();
}
export function exactPane(task, panes) {
  const pane = panes.find((p) => !p.is_plugin && p.id === task.paneId);
  if (!pane) throw new Error(`Worker terminal_${task.paneId} missing; refusing fallback`);
  if (task.claudeSessionId && !pane.terminal_command?.includes(task.claudeSessionId))
    throw new Error('Claude process identity changed; inspect and adopt a new task explicitly');
  if (pane.exited || pane.is_held) throw new Error('Worker exited or held; refusing input');
  return pane;
}
function inspectPane(task) {
  if (task.socketDir !== socketDir)
    throw new Error(`Use the task socket directory: ${task.socketDir}`);
  return exactPane(
    task,
    JSON.parse(
      zellij(task.session, ['action', 'list-panes', '--json', '--state', '--command', '--all'])
    )
  );
}
export function readTask(id) {
  return JSON.parse(fs.readFileSync(path.join(taskPath(id), 'task.json'), 'utf8'));
}
function eventsFor(id) {
  const dir = path.join(taskPath(id), 'events');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => {
      try {
        return [JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))];
      } catch {
        return [];
      }
    });
}
export function adopt({ id, session, paneId, title = id, issue = '' }) {
  const file = path.join(taskPath(id), 'task.json');
  if (fs.existsSync(file))
    throw new Error('Task already exists; inspect or resume it instead of overwriting');
  const numeric = Number(String(paneId).replace(/^terminal_/, ''));
  if (!Number.isInteger(numeric) || numeric < 0 || !session)
    throw new Error('Exact session and non-negative pane ID required');
  const task = {
    id,
    session,
    paneId: numeric,
    title,
    issue,
    socketDir,
    createdAt: new Date().toISOString()
  };
  inspectPane(task);
  writeJson(file, task);
  return task;
}
export function inspect(id) {
  const task = readTask(id);
  if (task.socketDir !== socketDir)
    throw new Error(`Use the task socket directory: ${task.socketDir}`);
  let terminal = 'connected';
  let error;
  try {
    inspectPane(task);
  } catch (e) {
    terminal = 'unavailable';
    error = e.message;
  }
  const events = eventsFor(id).filter(
    (e) => !task.claudeSessionId || e.sessionId === task.claudeSessionId
  );
  const latest = events.at(-1);
  return {
    ...task,
    terminal,
    agentState: terminal === 'connected' ? latest?.state || 'unknown' : 'unknown',
    latestEvent: latest || null,
    error
  };
}
export function capture(id) {
  const task = readTask(id);
  inspectPane(task);
  return zellij(task.session, [
    'action',
    'dump-screen',
    '--pane-id',
    `terminal_${task.paneId}`,
    '--full'
  ]);
}
function quote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
export function settings(id) {
  const dir = taskPath(id);
  const command = `${quote(process.execPath)} ${quote(path.join(ROOT, 'scripts/zellij-cockpit-hook.mjs'))} ${quote(path.join(dir, 'events'))}`;
  const names = [
    'SessionStart',
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
    'PermissionRequest',
    'Stop',
    'SessionEnd',
    'Notification'
  ];
  const hooks = Object.fromEntries(
    names.map((name) => [name, [{ hooks: [{ type: 'command', command, timeout: 5 }] }]])
  );
  const file = path.join(dir, 'claude-settings.json');
  writeJson(file, { hooks });
  return file;
}
export function normalizePrompt(text) {
  return typeof text === 'string' ? text.replace(/\r\n/g, '\n').replace(/\n+$/, '') : text;
}
export async function send(id, text, { screenHash, timeoutMs = 15000 } = {}) {
  text = normalizePrompt(text);
  if (!text?.trim() || text.length > 100000 || /[\x00-\x08\x0b-\x1f\x7f]/.test(text))
    throw new Error('Prompt must be non-empty plain text, at most 100000 characters');
  const dir = taskPath(id);
  const lock = path.join(dir, 'send.lock');
  const fd = fs.openSync(lock, 'wx', 0o600);
  try {
    const task = inspect(id);
    if (task.terminal !== 'connected') throw new Error(task.error);
    const screen = capture(id);
    // An explicit fresh screen fingerprint records the caller's readiness inspection.
    // Structured idle evidence alone does not prove there is no partially typed draft.
    if (!screenHash || hash(screen) !== screenHash)
      throw new Error(
        'Capture and inspect the current prompt, then supply its screen hash; changed screen refuses delivery'
      );
    if (['working', 'approval-required', 'disconnected'].includes(task.agentState))
      throw new Error(`Claude is ${task.agentState}; refusing prompt injection`);
    const before = new Date().toISOString();
    const promptHash = hash(text);
    inspectPane(task);
    const receipt = {
      id: crypto.randomUUID(),
      task: id,
      paneId: task.paneId,
      sentAt: before,
      promptHash,
      delivery: 'unconfirmed'
    };
    const receiptFile = path.join(dir, 'receipts', `${receipt.id}.json`);
    writeJson(receiptFile, receipt);
    try {
      zellij(task.session, ['action', 'paste', '--pane-id', `terminal_${task.paneId}`, text]);
      zellij(task.session, [
        'action',
        'send-keys',
        '--pane-id',
        `terminal_${task.paneId}`,
        'Enter'
      ]);
    } catch (error) {
      receipt.error = error.message;
      writeJson(receiptFile, receipt);
      throw new Error(
        `Delivery uncertain; do not retry automatically. Inspect ${receiptFile}: ${error.message}`
      );
    }
    const deadline = Date.now() + timeoutMs;
    do {
      const accepted = eventsFor(id).find(
        (e) =>
          e.at >= before &&
          (!task.claudeSessionId || e.sessionId === task.claudeSessionId) &&
          e.event === 'UserPromptSubmit' &&
          e.promptHash === promptHash
      );
      if (accepted) {
        receipt.delivery = 'accepted';
        receipt.claudeSessionId = accepted.sessionId;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    } while (Date.now() < deadline);
    writeJson(receiptFile, receipt);
    return {
      ...receipt,
      receiptFile,
      note: 'Acceptance is not task completion. Never automatically retry an unconfirmed delivery.'
    };
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}
export async function launch({ id, title = id, issue = '', cwd = process.cwd(), wasm }) {
  const dir = taskPath(id);
  if (fs.existsSync(path.join(dir, 'task.json')))
    throw new Error('Task already exists; inspect it instead');
  const plugin = path.resolve(
    wasm ||
      path.join(
        ROOT,
        'packages/zellij-cockpit/target/wasm32-wasip1/release/create-something-zellij-cockpit.wasm'
      )
  );
  if (!fs.existsSync(plugin)) throw new Error('Build the WASM plugin before launching');
  const session = `cs-${id}`;
  const sessions = zellij(null, ['list-sessions', '--short', '--no-formatting']);
  if (sessions.split('\n').includes(session))
    throw new Error('Session name already exists; adopt explicitly');
  const settingsFile = settings(id);
  const claudeSessionId = crypto.randomUUID();
  const layout = `layout {
  pane split_direction="vertical" {
    pane size="25%" name="CREATE SOMETHING" {
      plugin location=${JSON.stringify(`file:${plugin}`)} {
        task_title ${JSON.stringify(title)}
        issue ${JSON.stringify(issue)}
        pane_id "0"
      }
    }
    pane name="claude" command="claude" cwd=${JSON.stringify(path.resolve(cwd))} focus=true {
      args "--session-id" ${JSON.stringify(claudeSessionId)} "--settings" ${JSON.stringify(settingsFile)}
    }
  }
}
`;
  const layoutFile = path.join(dir, 'layout.kdl');
  fs.writeFileSync(layoutFile, layout, { mode: 0o600 });
  zellij(null, ['--layout', layoutFile, 'attach', '--create-background', session]);
  let workers = [];
  const deadline = Date.now() + 10000;
  do {
    try {
      const panes = JSON.parse(zellij(session, ['action', 'list-panes', '--json', '--all']));
      workers = panes.filter((p) => !p.is_plugin);
    } catch {
      /* A background session can temporarily return a session list before readiness. */
    }
    if (workers.length) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  if (workers.length !== 1)
    throw new Error('Expected exactly one worker; inspect the newly created session manually');
  const task = adopt({ id, session, paneId: workers[0].id, title, issue });
  task.claudeSessionId = claudeSessionId;
  task.cwd = path.resolve(cwd);
  task.plugin = plugin;
  writeJson(path.join(dir, 'task.json'), task);
  publish(id);
  return {
    ...task,
    attach: `ZELLIJ_SOCKET_DIR=${quote(socketDir)} zellij attach ${quote(session)}`
  };
}

export function publish(id) {
  const task = inspect(id);
  const payload = {
    title: task.title,
    issue: task.issue,
    pane_id: task.paneId,
    agent_state: task.agentState,
    evidence: task.latestEvent ? `Observed: ${task.latestEvent.at}` : 'No Claude events observed'
  };
  zellij(task.session, ['pipe', '--name', 'create-something-task', '--', JSON.stringify(payload)]);
  return payload;
}
function args(argv) {
  const [action, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i]?.startsWith('--') || rest[i + 1] == null)
      throw new Error('Expected --option value');
    options[rest[i].slice(2)] = rest[i + 1];
  }
  return { action, options };
}
async function main() {
  const { action, options: o } = args(process.argv.slice(2));
  let result;
  if (action === 'launch') result = await launch(o);
  else if (action === 'adopt') result = adopt({ ...o, paneId: o['pane-id'] });
  else if (action === 'inspect') result = inspect(o.id);
  else if (action === 'capture') {
    const screen = capture(o.id);
    result = { screen, screenHash: hash(screen) };
  } else if (action === 'settings') result = { path: settings(o.id) };
  else if (action === 'send')
    result = await send(o.id, fs.readFileSync(o.file, 'utf8'), { screenHash: o['screen-hash'] });
  else if (action === 'publish') result = publish(o.id);
  else
    throw new Error(
      'Use launch, adopt, inspect, capture, settings, send, or publish. All take --id; adopt also requires --session and --pane-id.'
    );
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]))
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
