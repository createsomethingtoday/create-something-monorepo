#!/usr/bin/env node
// Run one experiment arm over a sample of corpus versions.
//
//   node scripts/run-arm.mjs --arm astra --sample 20 --seed 7 [--network] [--only recX,recY] [--dry]
//
// An arm = model + prompt variant + sandbox mode. Each version gets a fresh
// workspace (bundle unzipped, listing.json, guidelines, registry), the agent
// runs through `codex exec` in the workspace-write sandbox with network off
// unless --network, and the result JSON plus the full event log land in
// runs/<arm>/<versionId>/. Reviewer feedback is never copied into the
// workspace.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readZip } from '../../webflow-app-forge/src/lib/zip.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(here, '..');
const FORGE = resolve(PKG, '..', 'webflow-app-forge');

export const ARMS = {
  // The two model arms of the hypothesis, same single-agent prompt.
  astra: { model: 'gpt-6-astra', prompt: 'reviewer.md', multiAgent: false },
  daybreak: { model: 'gpt-daybreak-blue-latest', prompt: 'reviewer.md', multiAgent: false },
  // The variant the hypothesis says may match: Astra coordinating subagents.
  'astra-subagents': { model: 'gpt-6-astra', prompt: 'reviewer.md', extraPrompt: 'reviewer-subagents.md', multiAgent: true },
  // Cheap control arm (same harness, smaller model) to separate harness from model.
  sol: { model: 'gpt-6.1-sol', prompt: 'reviewer.md', multiAgent: false },
  // Harness variable: v2 prompt forces the pattern sweep and the entitlement/URL
  // logic pass before any listing work. Same models, so the delta is the prompt.
  'astra-v2': { model: 'gpt-6-astra', prompt: 'reviewer-v2.md', multiAgent: false },
  'daybreak-v2': { model: 'gpt-daybreak-blue-latest', prompt: 'reviewer-v2.md', multiAgent: false },
  // v3: trust-boundary table + executed adversarial inputs, listing capped at 3. Tests whether
  // reviewer-style logic findings need a procedure the agent executes, not a pattern list.
  'daybreak-v3': { model: 'gpt-daybreak-blue-latest', prompt: 'reviewer-v3.md', multiAgent: false },
  'astra-v3': { model: 'gpt-6-astra', prompt: 'reviewer-v3.md', multiAgent: false },
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();

async function main() {
const args = parseArgs(process.argv.slice(2));
const armName = args.arm ?? 'astra';
const arm = ARMS[armName];
if (!arm) fail(`unknown arm ${armName}; one of ${Object.keys(ARMS).join(', ')}`);

const manifest = JSON.parse(readFileSync(join(PKG, 'corpus', 'manifest.json'), 'utf8'));
const pool = manifest.versions.filter((v) => v.bundle?.path);
const pilot = args.pilot ? JSON.parse(readFileSync(join(PKG, 'corpus', 'pilot-sample.json'), 'utf8')).map((p) => p.versionId) : null;
const picked = args.only ? pool.filter((v) => args.only.split(',').includes(v.versionId)) : pilot ? pool.filter((v) => pilot.includes(v.versionId)) : sample(pool, Number(args.sample ?? 20), Number(args.seed ?? 1));
if (args.network && process.env.ALLOW_SANDBOX_EGRESS !== '1') fail('--network gives the sandbox unrestricted egress while it can read the Codex login it runs under; set ALLOW_SANDBOX_EGRESS=1 to run networked arms on bundles you trust');
console.log(`arm=${armName} model=${arm.model} multiAgent=${arm.multiAgent} network=${Boolean(args.network)} versions=${picked.length}`);

const runRoot = join(PKG, 'runs', armName);
mkdirSync(runRoot, { recursive: true });
const summary = [];
for (const v of picked) {
  const out = join(runRoot, v.versionId);
  if (existsSync(join(out, 'result.json')) && !args.force) {
    console.log(`skip ${v.appName} v${v.versionNumber} (done)`);
    summary.push(readJson(join(out, 'run.json')));
    continue;
  }
  // A forced rerun must not inherit last-message.txt, result.json, run.json or judgment.json.
  if (args.force) rmSync(out, { recursive: true, force: true });
  const ws = prepareWorkspace(v, out, Boolean(args.network));
  if (args.dry) {
    console.log(`prepared ${ws}`);
    continue;
  }
  const started = Date.now();
  const run = await runCodex({ arm, ws, out, network: Boolean(args.network) });
  run.versionId = v.versionId;
  run.appName = v.appName;
  run.arm = armName;
  run.seconds = Math.round((Date.now() - started) / 1000);
  writeFileSync(join(out, 'run.json'), JSON.stringify(run, null, 2));
  summary.push(run);
  console.log(`${run.ok ? 'ok  ' : 'FAIL'} ${v.appName} v${v.versionNumber} ${run.seconds}s in=${run.usage?.input_tokens ?? '?'} out=${run.usage?.output_tokens ?? '?'} findings=${run.findings ?? '?'} ${run.error ?? ''}`);
}
writeFileSync(join(runRoot, `summary-${Date.now()}.json`), JSON.stringify(summary, null, 2));
}

// ---------------------------------------------------------------------------

function prepareWorkspace(v, out, network) {
  const ws = join(out, 'workspace');
  rmSync(ws, { recursive: true, force: true });
  mkdirSync(join(ws, 'bundle'), { recursive: true });

  // Unzip the bundle with the forge reader (no shell, no path traversal).
  const zip = readZip(readFileSync(join(PKG, v.bundle.path)));
  let files = 0;
  for (const entry of zip.files) {
    const safe = entry.name.replace(/^\/+/, '').split('/').filter((p) => p && p !== '..').join('/');
    if (!safe) continue;
    const target = join(ws, 'bundle', safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, zip.read(entry));
    files++;
  }

  const listing = {
    appName: v.appName,
    capability: v.capability,
    reviewType: v.reviewType,
    versionNumber: v.versionNumber,
    visibility: v.visibility,
    marketplaceStatus: v.marketplaceStatus,
    isPartnerProgramApp: v.isPartner,
    testingSiteUrl: v.testingSiteUrl ?? null,
    ...v.listing,
    longDescriptionText: htmlToText(v.listing.longDescriptionHtml),
    extensionManifestFromRegistry: v.bundle.manifest,
  };
  delete listing.longDescriptionHtml;
  writeFileSync(join(ws, 'listing.json'), JSON.stringify(listing, null, 2));
  cpSync(join(PKG, 'prompts', 'guidelines'), join(ws, 'guidelines'), { recursive: true });
  cpSync(join(FORGE, 'registry', 'requirements.json'), join(ws, 'registry.json'));
  cpSync(join(PKG, 'schemas', 'taxonomy.json'), join(ws, 'taxonomy.json'));
  if (network) writeFileSync(join(ws, 'NETWORK.md'), 'Network is available for read-only GET requests to the listing URLs and the testing site. Do not call any other host.\n');
  writeFileSync(join(ws, 'README.md'), `# Review workspace\n\nApp: ${v.appName} (version ${v.versionNumber}, ${v.reviewType}, ${v.capability})\nBundle files: ${files}\n\nRead prompt in the task. Write result.json here when done.\n`);
  return ws;
}

async function runCodex({ arm, ws, out, network }) {
  const prompt = [readFileSync(join(PKG, 'prompts', arm.prompt), 'utf8'), arm.extraPrompt ? readFileSync(join(PKG, 'prompts', arm.extraPrompt), 'utf8') : ''].filter(Boolean).join('\n\n---\n\n');
  const schema = join(PKG, 'schemas', 'findings.schema.json');
  const lastMessage = join(out, 'last-message.txt');
  const argv = [
    'exec',
    // Locked tool surface: no user config (local MCP servers, hooks), no ChatGPT
    // connector apps, no browser/computer use, no web search. An untrusted
    // bundle must never reach Gmail, Slack, Airtable, or the App Review MCP.
    '--ignore-user-config',
    '-c', 'features.apps=false',
    '-c', 'features.browser_use=false',
    '-c', 'features.computer_use=false',
    '-c', 'features.view_image=false',
    '-c', 'features.goals=false',
    '-c', 'web_search="disabled"',
    '-m', arm.model,
    '-s', 'workspace-write',
    '-C', ws,
    '--skip-git-repo-check',
    // No --ephemeral: subagent threads need a persisted rollout to spawn
    // ("invalid thread-store request: no rollout found for thread id").
    '--json',
    '--output-schema', schema,
    '-o', lastMessage,
    '-c', `features.multi_agent=${arm.multiAgent ? 'true' : 'false'}`,
    '-c', `sandbox_workspace_write.network_access=${network ? 'true' : 'false'}`,
    '-c', 'approval_policy="never"',
    '-c', 'model_reasoning_effort="high"',
    prompt,
  ];
  const events = [];
  const stderr = [];
  // Ground truth must not be readable while the agent runs: workspace-write still
  // allows reads anywhere on disk, and the labels live three directories up.
  lockLabels();
  const home = isolatedHome();
  const code = await new Promise((resolveExit) => {
    // stdin must be closed: with a pipe, codex waits to read a <stdin> block forever.
    const child = spawn('codex', argv, { cwd: ws, stdio: ['ignore', 'pipe', 'pipe'], env: home.env });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) events.push(line);
      }
    });
    child.stderr.on('data', (d) => stderr.push(d.toString()));
    const timer = setTimeout(() => child.kill('SIGTERM'), Number(process.env.ARM_TIMEOUT_MS ?? 25 * 60 * 1000));
    child.on('close', (c) => {
      clearTimeout(timer);
      resolveExit(c);
    });
  });
  unlockLabels();
  home.syncBack();
  writeFileSync(join(out, 'events.jsonl'), events.join('\n') + '\n');
  if (stderr.length) writeFileSync(join(out, 'stderr.txt'), stderr.join(''));

  const run = { ok: false, exitCode: code, usage: null, toolCalls: 0, subagents: 0, externalTools: [], labelPathHits: 0, error: null, findings: null, verdict: null, modelSeen: arm.model };
  // Audit: any event that names the label store means the sandbox boundary was crossed.
  run.labelPathHits = events.filter((l) => /labels\.json|judged-labels|corpus\//.test(l)).length;
  for (const line of events) {
    try {
      const e = JSON.parse(line);
      if (e.type === 'turn.completed' && e.usage) run.usage = e.usage;
      if (e.type === 'item.completed' && e.item?.type === 'command_execution') run.toolCalls++;
      // Any tool that is not a sandboxed shell command is an exfiltration surface; record it.
      if (e.type === 'item.completed' && e.item?.type && !['command_execution', 'agent_message', 'error', 'reasoning', 'file_change', 'collab_tool_call'].includes(e.item.type)) run.externalTools.push(e.item.type);
      if (e.type === 'item.completed' && e.item?.type === 'command_execution' && /^\s*codex\b|collaboration\.spawn_agent\(/.test(String(e.item.command ?? ''))) run.externalTools.push('cmd:' + String(e.item.command ?? '').slice(0, 60));
      if (e.type === 'item.completed' && e.item?.type === 'collab_tool_call') run.subagents++;
      if (e.type === 'item.completed' && e.item?.type === 'command_execution' && /spawn_agent|codex .*exec/i.test(String(e.item?.command ?? ''))) run.subagents++;
      if (e.type === 'item.completed' && e.item?.type === 'error') {
        const msg = String(e.item.message);
        // Codex config chatter is not a run error.
        if (!/ignoring \d+ unrecognized configuration|Under-development features|loading hooks from both/i.test(msg)) run.error = (run.error ? run.error + ' | ' : '') + msg.slice(0, 200);
      }
    } catch {
      // not JSON
    }
  }
  // The result: result.json written by the agent, else the structured last message.
  // Both candidates are checked against the schema's shape; a partial result.json must not win over a valid last message.
  const candidates = [existsSync(join(ws, 'result.json')) ? safeJson(readFileSync(join(ws, 'result.json'), 'utf8')) : null, existsSync(lastMessage) ? safeJson(readFileSync(lastMessage, 'utf8')) : null];
  const problems = candidates.map((c) => (c ? validateResult(c) : ['missing']));
  const pick = problems.findIndex((p) => p.length === 0);
  const result = pick >= 0 ? candidates[pick] : null;
  if (pick < 0 && candidates.some(Boolean)) run.error = (run.error ? run.error + ' | ' : '') + `result failed schema: ${problems.find((p) => p[0] !== 'missing')?.slice(0, 3).join('; ')}`;
  if (result) {
    writeFileSync(join(out, 'result.json'), JSON.stringify(result, null, 2));
    run.ok = true;
    run.findings = result.findings.length;
    run.verdict = result.verdict;
  } else if (!run.error) {
    run.error = 'no parsable result';
  }
  run.sha256 = createHash('sha256').update(prompt).digest('hex').slice(0, 12);
  return run;
}

function sample(list, n, seed) {
  // Deterministic stratified-ish sample: shuffle with a seeded PRNG, then take
  // round-robin across capability so no arm sees only Hybrid apps.
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const shuffled = [...list].sort(() => rnd() - 0.5);
  const buckets = new Map();
  for (const v of shuffled) buckets.set(v.capability ?? 'unknown', [...(buckets.get(v.capability ?? 'unknown') ?? []), v]);
  const out = [];
  while (out.length < n && [...buckets.values()].some((b) => b.length)) {
    for (const b of buckets.values()) {
      if (b.length && out.length < n) out.push(b.shift());
    }
  }
  return out;
}

function htmlToText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[k] = next;
      i++;
    } else out[k] = true;
  }
  return out;
}

function readJson(p) {
  return existsSync(p) ? safeJson(readFileSync(p, 'utf8')) : null;
}

function safeJson(t) {
  try {
    const start = t.indexOf('{');
    return JSON.parse(start >= 0 ? t.slice(start) : t);
  } catch {
    return null;
  }
}

function fail(m) {
  console.error(m);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Sandbox hygiene

/**
 * The child runs under an isolated HOME that holds only Codex's auth.json: no
 * Infisical-injected variables, and no ~/.config/gh, cloud profiles or SSH keys
 * for prompt-injected bundle content to read and exfiltrate when --network is on.
 * A refreshed auth.json is copied back so the operator's login does not go stale.
 */
function isolatedHome() {
  const realCodex = process.env.CODEX_HOME ?? `${process.env.HOME}/.codex`;
  const home = join(PKG, 'runs', '.home');
  const codex = join(home, '.codex');
  rmSync(home, { recursive: true, force: true });
  mkdirSync(codex, { recursive: true });
  const src = join(realCodex, 'auth.json');
  const dst = join(codex, 'auth.json');
  if (existsSync(src)) copyFileSync(src, dst);
  const before = existsSync(dst) ? statSync(dst).mtimeMs : 0;
  const keep = ['PATH', 'USER', 'SHELL', 'TERM', 'LANG', 'LC_ALL', 'TZ'];
  const env = Object.fromEntries(keep.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));
  env.HOME = home;
  env.TMPDIR = join(home, 'tmp');
  mkdirSync(env.TMPDIR, { recursive: true });
  env.CODEX_HOME = codex;
  return {
    env,
    syncBack() {
      try {
        if (existsSync(dst) && statSync(dst).mtimeMs > before) copyFileSync(dst, src);
      } catch { /* leave the operator's auth as it was */ }
      rmSync(home, { recursive: true, force: true });
    },
  };
}

const LABEL_PATHS = [join(PKG, 'corpus', 'labels.json'), join(PKG, 'corpus', 'judged-labels')];
function lockLabels() {
  for (const p of LABEL_PATHS) { try { chmodSync(p, 0o000); } catch { /* absent */ } }
}
function unlockLabels() {
  for (const p of LABEL_PATHS) { try { chmodSync(p, p.endsWith('.json') ? 0o644 : 0o755); } catch { /* absent */ } }
}
process.on('exit', unlockLabels);
process.on('SIGINT', () => { unlockLabels(); process.exit(130); });
process.on('SIGTERM', () => { unlockLabels(); process.exit(143); });

/** Shape check against schemas/findings.schema.json: enums and required fields, no external validator. */
function validateResult(r) {
  const problems = [];
  if (!r || typeof r !== 'object') return ['not an object'];
  if (!['approve', 'changes_requested', 'reject', 'cannot_determine'].includes(r.verdict)) problems.push(`verdict ${JSON.stringify(r.verdict)}`);
  if (typeof r.summary !== 'string') problems.push('summary missing');
  if (!Array.isArray(r.findings)) return [...problems, 'findings not an array'];
  r.findings.forEach((f, i) => {
    for (const k of ['code', 'title', 'evidence', 'fix']) if (typeof f?.[k] !== 'string' || !f[k].trim()) problems.push(`finding ${i} ${k} missing`);
    if (!['blocker', 'required', 'suggested'].includes(f?.severity)) problems.push(`finding ${i} severity ${JSON.stringify(f?.severity)}`);
  });
  return problems;
}
