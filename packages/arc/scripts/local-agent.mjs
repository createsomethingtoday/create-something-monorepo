#!/usr/bin/env node

import { accessSync, constants, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const provider = process.argv.includes('--claude') ? 'claude' : 'codex';
const briefPathIndex = process.argv.indexOf('--brief');
const brief = briefPathIndex >= 0
  ? readFileSync(process.argv[briefPathIndex + 1], 'utf8')
  : readFileSync(0, 'utf8');
const schemaPath = fileURLToPath(new URL('./arc-proposal.schema.json', import.meta.url));
const schema = readFileSync(schemaPath, 'utf8');

function executableCandidates(name, explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    if (directory) candidates.push(path.join(directory, name));
  }
  const nvmRoot = path.join(homedir(), '.nvm', 'versions', 'node');
  try {
    for (const version of readdirSync(nvmRoot).sort().reverse()) {
      candidates.push(path.join(nvmRoot, version, 'bin', name));
    }
  } catch {
    // NVM is optional; PATH remains the normal discovery path.
  }
  return [...new Set(candidates)];
}

function resolveExecutable(name, explicit) {
  for (const candidate of executableCandidates(name, explicit)) {
    try {
      accessSync(candidate, constants.X_OK);
      const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: 5_000 });
      if (probe.status === 0) return candidate;
    } catch {
      // Continue past stale package-manager shims and unavailable versions.
    }
  }
  return null;
}

if (!brief.trim()) {
  console.error('Pipe an Arc agent brief to this command or pass --brief <path>.');
  process.exit(2);
}

const instruction = [
  'You are an Arc composition collaborator.',
  'Read the structured brief below and return exactly one JSON proposal matching the supplied schema.',
  'Do not edit files, call tools, approve, publish, or execute an external write.',
  'Prefer direct, concrete language. Preserve the human decision boundary and map evidence.',
  '',
  brief
].join('\n');

const executable = resolveExecutable(
  provider,
  provider === 'codex' ? process.env.ARC_CODEX_BIN : process.env.ARC_CLAUDE_BIN
);
if (!executable) {
  console.error(`${provider} is not installed or runnable. Install it and log in with the operator account first.`);
  process.exit(127);
}

const result = provider === 'claude'
  ? spawnSync(executable, [
      '--print',
      '--output-format', 'json',
      '--json-schema', schema,
      '--permission-mode', 'dontAsk',
      '--no-session-persistence',
      '--disable-slash-commands',
      '--no-chrome',
      instruction
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  : spawnSync(executable, [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--ignore-user-config',
      '--ignore-rules',
      '--sandbox', 'read-only',
      '--output-schema', schemaPath,
      '-'
    ], { input: instruction, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

if (result.error?.code === 'ENOENT') {
  console.error(`${provider} became unavailable. Reinstall it and log in with the operator account first.`);
  process.exit(127);
}
if (result.status !== 0) {
  console.error(result.stderr?.trim() || `${provider} exited with status ${result.status}.`);
  process.exit(result.status ?? 1);
}

function parseProposal(output) {
  const trimmed = output.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(unfenced);
  if (provider === 'claude') {
    if (parsed.structured_output) return parsed.structured_output;
    if (typeof parsed.result === 'string') return parseProposal(parsed.result);
  }
  return parsed;
}

try {
  const proposal = parseProposal(result.stdout);
  const allowedKinds = new Set(['copy', 'layout', 'motion', 'map-focus', 'image', 'speaker-notes']);
  const allowedPatchFields = new Set(['label', 'heading', 'explanation', 'takeaway', 'layout', 'notes', 'focusNodeIds', 'motionCue', 'callout', 'code']);
  if (!proposal || typeof proposal !== 'object' || !allowedKinds.has(proposal.kind)) throw new Error('Invalid proposal kind.');
  if (!proposal.patch || typeof proposal.patch !== 'object' || Array.isArray(proposal.patch)) throw new Error('Proposal patch must be an object.');
  if (Object.keys(proposal.patch).some((key) => !allowedPatchFields.has(key))) throw new Error('Proposal contains an unbounded patch field.');
  proposal.patch = Object.fromEntries(Object.entries(proposal.patch).filter(([, value]) => value !== null));
  if (!String(proposal.summary ?? '').trim()) throw new Error('Proposal summary is required.');
  proposal.model = `local authenticated ${provider}`;
  proposal.prompt = `Arc local runner · ${provider}`;
  process.stdout.write(`${JSON.stringify(proposal, null, 2)}\n`);
} catch (error) {
  console.error(`The local agent did not return a valid Arc proposal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
