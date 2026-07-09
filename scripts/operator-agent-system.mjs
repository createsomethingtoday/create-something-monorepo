#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_OUT_DIR = '.cache/operator-agent-system';
const DEFAULT_SCHEDULE_OUT_DIR = '.cache/operator-agent-schedule';
const DEFAULT_MODEL = process.env.OPERATOR_AGENT_MODEL || 'ornith:9b';
const DEFAULT_BASE_URL = process.env.OPERATOR_AGENT_BASE_URL || 'http://localhost:11434/v1';
const DEFAULT_PATTERN_REVIEW_LIMIT = 80;
const INTERNAL_PRODUCTION_TARGET = 'create-something-internal-production';
const CLIENT_PRODUCTION_TARGET = 'client-production';
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical']);
const PATCHABLE_PROFILES = new Set(['docs', 'scripts', 'tests']);
const MAX_APPEND_MARKDOWN_LENGTH = 2_000;
const MAX_EXACT_REPLACE_LENGTH = 4_000;
const MAX_REVISION_DEPTH = 3;
const MODES = new Set([
  'readiness',
  'scout',
  'policy',
  'handoff',
  'profiles',
  'patch',
  'complete',
  'rollback-proof',
  'revise',
  'batch-eval',
  'pattern-review',
  'model-probe',
  'model-benchmark',
  'memory-proposal',
]);

const PATTERN_REVIEW_FILES = [
  'AGENTS.md',
  'docs/README.md',
  'docs/MCP_FIRST_THESIS.md',
  'docs/THREE_TIER_FRAMEWORK.md',
  'docs/guides/OPERATOR_AGENT_SYSTEM.md',
  'docs/guides/OPERATOR_AGENT_PUBLIC_ACCESS.md',
  'docs/guides/OPERATOR_AGENT_EXTERNAL_PATTERN_MATRIX.md',
];

const PATTERN_REVIEW_DISCOVERY_ROOTS = ['AGENTS.md', 'docs', 'config', 'scripts', 'package.json'];
const ABSTRACT_NAMING_PATTERN =
  /\b(abstract|abstraction|agentic|ai[- ]native|composable|orchestration|platform|surface|system|framework|layer)\b/i;
const ABSTRACTION_BUILDING_ACTION_PATTERN =
  /\b(build|create|define|name|introduce|extract|generalize|formalize|standardize|architect|design|add)\b[\s\S]{0,80}\b(abstract|abstraction|agentic|ai[- ]native|composable|orchestration|platform|surface|system|framework|layer)\b|\b(abstract|abstraction|agentic|ai[- ]native|composable|orchestration|platform|surface|system|framework|layer)\b[\s\S]{0,80}\b(build|create|define|name|introduce|extract|generalize|formalize|standardize|architect|design|add)\b/i;

const PATTERN_REVIEW_CONCEPTS = [
  { id: 'database-tier', label: 'Database tier', pattern: /\bDatabase\b/i },
  { id: 'automation-tier', label: 'Automation tier', pattern: /\bAutomation\b/i },
  { id: 'judgment-tier', label: 'Judgment tier', pattern: /\bJudgment\b/i },
  { id: 'policy-artifact', label: 'policy artifact boundary', pattern: /\bpolicy (is an )?artifact\b/i },
  { id: 'cloudflare-access', label: 'Cloudflare Access boundary', pattern: /\bCloudflare Access\b/i },
  { id: 'no-write-gateway', label: 'no-write gateway posture', pattern: /\bno-write\b[\s\S]{0,120}\bgateway\b|\bgateway\b[\s\S]{0,120}\bno-write\b/i },
  { id: 'batch-eval', label: 'batch eval measurement loop', pattern: /\bbatch[- ]eval\b/i },
  { id: 'teacher-shadow', label: 'teacher shadow learning loop', pattern: /\bteacher[- ]shadow\b|\bTeacher Shadow\b/i },
  {
    id: 'external-agent-pattern-matrix',
    label: 'external agent pattern matrix',
    pattern: /\bOpenHands\b|\bSWE-agent\b|\bAider\b|\bLangGraph\b|\bCodified Context\b|\bmodel\s*->\s*harness\b/i,
  },
];

const SUB_AGENTS = [
  {
    id: 'scout',
    scope: 'repo scan and candidate discovery',
    allowedActions: ['read-only proposals'],
    forbiddenActions: ['writes', 'deploys', 'secrets'],
    verifier: 'receipt',
  },
  {
    id: 'docs',
    scope: 'markdown, guides, README routing',
    allowedActions: ['small docs edits'],
    forbiddenActions: ['runtime behavior changes', 'deploys'],
    verifier: 'git diff --check',
  },
  {
    id: 'evals',
    scope: 'eval cases, receipts, harness assertions',
    allowedActions: ['bounded eval changes'],
    forbiddenActions: ['production deploys', 'secret-bearing fixtures'],
    verifier: 'dry-run plus model receipt when relevant',
  },
  {
    id: 'scripts',
    scope: 'CLI help and small harness commands',
    allowedActions: ['narrow script patches'],
    forbiddenActions: ['broad refactors', 'destructive commands'],
    verifier: 'node --check or package test',
  },
  {
    id: 'tests',
    scope: 'targeted tests and fixtures',
    allowedActions: ['add or tighten tests'],
    forbiddenActions: ['large fixture churn'],
    verifier: 'package-local test',
  },
  {
    id: 'ci-readiness',
    scope: 'CI logs and workflow defaults',
    allowedActions: ['narrow workflow/runtime fixes'],
    forbiddenActions: ['production secret changes'],
    verifier: 'failing check reproduction',
  },
  {
    id: 'production-verifier',
    scope: 'CREATE SOMETHING internal production smoke',
    allowedActions: ['proof writes when policy allows'],
    forbiddenActions: ['client production', 'credentials', 'billing', 'deletion'],
    verifier: 'live smoke plus rollback note',
  },
  {
    id: 'security-readonly',
    scope: 'sensitive surface review',
    allowedActions: ['findings only'],
    forbiddenActions: ['writes'],
    verifier: 'no-write receipt',
  },
];

function parseArgs(argv) {
  const options = {
    mode: 'readiness',
    outDir: DEFAULT_OUT_DIR,
    baseUrl: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
    surface: 'docs/guides',
    limit: 8,
    timeoutMs: 180_000,
    target: 'local',
    risk: 'low',
    operation: 'scout',
    task: '',
    rollback: '',
    reversible: false,
    validation: [],
    candidateFile: '',
    candidateId: '',
    rollbackCandidateFile: '',
    rollbackCandidateId: '',
    rollbackProofReceipt: '',
    promotionFile: '',
    dryRun: false,
    reviseBlocked: true,
    patternReviewScope: 'all',
    patternReviewLimit: DEFAULT_PATTERN_REVIEW_LIMIT,
    benchmarkAttempts: 3,
    benchmarkMinPassRate: 0.8,
    benchmarkModels: [],
    memoryReceiptLimit: 12,
    memoryReceiptDirs: [],
    json: false,
    noModel: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (MODES.has(arg)) options.mode = arg;
    else if (arg === '--mode' && next) options.mode = argv[++index];
    else if (arg === '--out-dir' && next) options.outDir = argv[++index];
    else if (arg === '--base-url' && next) options.baseUrl = argv[++index];
    else if (arg === '--model' && next) options.model = argv[++index];
    else if (arg === '--surface' && next) options.surface = argv[++index];
    else if (arg === '--limit' && next) options.limit = Number(argv[++index]);
    else if (arg === '--pattern-scope' && next) options.patternReviewScope = argv[++index];
    else if (arg === '--pattern-limit' && next) options.patternReviewLimit = Number(argv[++index]);
    else if (arg === '--attempts' && next) options.benchmarkAttempts = Number(argv[++index]);
    else if (arg === '--min-pass-rate' && next) options.benchmarkMinPassRate = Number(argv[++index]);
    else if (arg === '--models' && next) options.benchmarkModels = argv[++index].split(',').map((model) => model.trim()).filter(Boolean);
    else if (arg === '--receipt-limit' && next) options.memoryReceiptLimit = Number(argv[++index]);
    else if (arg === '--receipt-dir' && next) options.memoryReceiptDirs.push(argv[++index]);
    else if (arg === '--timeout-ms' && next) options.timeoutMs = Number(argv[++index]);
    else if (arg === '--target' && next) options.target = argv[++index];
    else if (arg === '--risk' && next) options.risk = argv[++index];
    else if (arg === '--operation' && next) options.operation = argv[++index];
    else if (arg === '--task' && next) options.task = argv[++index];
    else if (arg === '--rollback' && next) options.rollback = argv[++index];
    else if (arg === '--validation' && next) options.validation.push(argv[++index]);
    else if (arg === '--candidate-file' && next) options.candidateFile = argv[++index];
    else if (arg === '--candidate-id' && next) options.candidateId = argv[++index];
    else if (arg === '--rollback-candidate-file' && next) options.rollbackCandidateFile = argv[++index];
    else if (arg === '--rollback-candidate-id' && next) options.rollbackCandidateId = argv[++index];
    else if (arg === '--rollback-proof-receipt' && next) options.rollbackProofReceipt = argv[++index];
    else if (arg === '--promotion-file' && next) options.promotionFile = argv[++index];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-revise') options.reviseBlocked = false;
    else if (arg === '--reversible') options.reversible = true;
    else if (arg === '--no-model') options.noModel = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!MODES.has(options.mode)) {
    throw new Error(`Unknown --mode ${options.mode}`);
  }
  if (!RISK_LEVELS.has(options.risk)) {
    throw new Error(`Unknown --risk ${options.risk}. Expected: ${[...RISK_LEVELS].join(', ')}`);
  }
  if (!['all', 'canonical'].includes(options.patternReviewScope)) {
    throw new Error('Unknown --pattern-scope. Expected: all or canonical');
  }
  if (!Number.isInteger(options.benchmarkAttempts) || options.benchmarkAttempts < 1 || options.benchmarkAttempts > 20) {
    throw new Error('--attempts must be an integer between 1 and 20');
  }
  if (Number.isNaN(options.benchmarkMinPassRate) || options.benchmarkMinPassRate < 0 || options.benchmarkMinPassRate > 1) {
    throw new Error('--min-pass-rate must be between 0 and 1');
  }
  if (!Number.isInteger(options.memoryReceiptLimit) || options.memoryReceiptLimit < 1 || options.memoryReceiptLimit > 100) {
    throw new Error('--receipt-limit must be an integer between 1 and 100');
  }
  return options;
}

function usage() {
  console.log(`Usage:
  pnpm operator-agent:readiness
  pnpm operator-agent:profiles
  pnpm operator-agent:policy -- --target create-something-internal-production --risk medium --reversible --rollback "..."
  pnpm operator-agent:scout -- --surface docs/guides --limit 8
  pnpm operator-agent:patch -- --candidate-file .cache/operator-agent-system/<receipt>.json --candidate-id candidate-001
  pnpm operator-agent:complete -- --candidate-file .cache/operator-agent-system/<receipt>.json --candidate-id candidate-001
  pnpm operator-agent:rollback-proof -- --candidate-file forward.json --candidate-id forward --rollback-candidate-file rollback.json --rollback-candidate-id rollback
  pnpm operator-agent:revise -- --candidate-file .cache/operator-agent-system/<receipt>.json --candidate-id candidate-001
  pnpm operator-agent:batch-eval -- --surface docs/guides --limit 3
  pnpm operator-agent:pattern-review -- --timeout-ms 300000 --pattern-scope all
  pnpm operator-agent:model-probe -- --timeout-ms 120000
  pnpm operator-agent:model-benchmark -- --attempts 3 --timeout-ms 120000
  pnpm operator-agent:memory-proposal

Modes:
  readiness   Check local operator-agent system readiness.
  profiles    Print policy-bound sub-agent profiles.
  policy      Decide whether an autonomous action is allowed.
  scout       Generate or synthesize improvement candidates.
  handoff     Write a compact handoff receipt.
  patch       Apply one policy-gated docs candidate and run validation.
  complete    Carry one bounded candidate through preflight, action, verification, and a terminal receipt.
  rollback-proof  Apply one patch candidate, apply its rollback candidate, and verify the original file hash is restored.
  revise      Repair one content-blocked append payload without writing files.
  batch-eval  Run scout, patch dry-run, optional revise, and patch dry-run scorecard.
  pattern-review  Build a no-write pattern-review receipt from canonical repo patterns.
  model-probe  Check the local model endpoint with a small strict-JSON task.
  model-benchmark  Run repeated strict-JSON probes per candidate model and score promotion readiness.
  memory-proposal  Propose durable context updates from recent receipts without mutating memory.

Options:
  --surface <path>       Scout surface. Default: docs/guides
  --task <text>          Work intent for complete mode and model-backed scouting
  --limit <n>            Max files/candidates. Default: 8
  --pattern-scope <name> Pattern review scope: all | canonical. Default: all
  --pattern-limit <n>    Max discovered pattern files in all scope. Default: ${DEFAULT_PATTERN_REVIEW_LIMIT}
  --attempts <n>         Model benchmark attempts per model. Default: 3
  --min-pass-rate <n>    Model benchmark pass-rate threshold from 0 to 1. Default: 0.8
  --models <csv>         Candidate model names. Default: --model
  --receipt-dir <path>   Receipt directory for memory-proposal. Repeatable
  --receipt-limit <n>    Max receipts for memory-proposal. Default: 12
  --timeout-ms <n>       Model scout timeout. Default: 180000
  --target <name>        local | dev | preview | create-something-internal-production | client-production
  --risk <level>         low | medium | high | critical
  --operation <name>     scout | patch | self-heal | deploy | rollback
  --reversible           Mark operation as reversible
  --rollback <text>      Rollback path or note
  --validation <command> Required validation command. Repeatable
  --candidate-file <path> Scout receipt or candidate JSON for patch mode
  --candidate-id <id>     Candidate id to patch. Defaults to first candidate
  --rollback-candidate-file <path> Candidate JSON for rollback-proof mode
  --rollback-candidate-id <id> Rollback candidate id for rollback-proof mode
  --rollback-proof-receipt <path> Required matching rollback-proof receipt for A2 local code patch mode
  --promotion-file <path> Versioned A3 internal-production promotion packet for complete mode
  --dry-run               In patch mode, validate and receipt without writing
  --no-revise             In batch-eval mode, skip revise attempts
  --base-url <url>       OpenAI-compatible endpoint. Default: ${DEFAULT_BASE_URL}
  --model <name>         Model. Default: ${DEFAULT_MODEL}
  --no-model             Use deterministic scout fallback only
  --json                 Print JSON
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: options.timeoutMs ?? 120_000,
  });
  return {
    command: [command, ...args].join(' '),
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    summary: summarize(`${result.stdout ?? ''}${result.stderr ?? ''}`),
  };
}

function summarize(output) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-8).join('\n') || 'No output.';
}

function commandExists(command) {
  const result = spawnSync('command', ['-v', command], { shell: true, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function readDiskAvailableKiB(targetPath) {
  const result = spawnSync('df', ['-Pk', targetPath], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const row = result.stdout.trim().split('\n')[1]?.trim().split(/\s+/);
  return row?.[3] ? Number(row[3]) : null;
}

function inspectOllamaModel(model) {
  if (!commandExists('ollama')) return { installed: false, source: 'missing-ollama' };
  const result = spawnSync('ollama', ['list'], { encoding: 'utf8' });
  if (result.status !== 0) return { installed: false, source: 'ollama-list', error: result.stderr.trim() };
  const row = result.stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .find((columns) => columns[0] === model);
  return { installed: Boolean(row), source: 'ollama-list', row: row ? row.join(' ') : '' };
}

function policyDecision(options) {
  const blockers = [];
  const requirements = [];
  const target = options.target;

  if (target === CLIENT_PRODUCTION_TARGET) blockers.push('Client production requires a client-specific authorization packet.');
  if (['high', 'critical'].includes(options.risk)) blockers.push('High or critical risk requires operator approval.');
  if (!options.reversible) blockers.push('Autonomous production-lab actions must be reversible.');
  if (!options.rollback.trim()) blockers.push('Rollback path must be recorded.');
  if (['deploy', 'self-heal', 'patch'].includes(options.operation) && options.validation.length === 0) {
    blockers.push('Autonomous write/deploy operations require named validation commands.');
  }

  if (target === INTERNAL_PRODUCTION_TARGET) {
    requirements.push('Write pre-action and post-action receipts.');
    requirements.push('Run named validation before action.');
    requirements.push('Run post-deploy/live verification when operation touches production.');
    requirements.push('Record rollback note in the receipt.');
  }

  const allowed =
    blockers.length === 0 &&
    (target !== INTERNAL_PRODUCTION_TARGET || ['low', 'medium'].includes(options.risk));

  return {
    target,
    operation: options.operation,
    risk: options.risk,
    reversible: options.reversible,
    autonomyLevel: allowed && target === INTERNAL_PRODUCTION_TARGET ? 'A3' : allowed ? 'A1/A2' : 'A4',
    allowed,
    blockers,
    requirements,
    rollback: options.rollback,
    validation: options.validation,
    policyArtifact: 'docs/policies/v1/policy.operator-agent-production-lab.v1.md',
  };
}

function readiness(options) {
  const requiredFiles = [
    'AGENTS.md',
    'docs/guides/LOOPS_ABOVE_AGENTS.md',
    'docs/guides/OPERATOR_AGENT_SYSTEM.md',
    'docs/policies/v1/policy.operator-agent-production-lab.v1.md',
    'docs/guides/OPEN_WEIGHT_AGENT_EXECUTOR_EVAL.md',
    'evals/local-models/open-weight-agent-executor.cases.json',
  ];
  const fileChecks = requiredFiles.map((file) => ({ file, exists: fs.existsSync(file) }));
  const gitStatus = run('git', ['status', '--short']);
  const gptOss = inspectOllamaModel(options.model);
  const diskAvailableKiB = readDiskAvailableKiB(process.cwd());
  const checks = [
    {
      id: 'policy-files',
      passed: fileChecks.every((check) => check.exists),
      observed: fileChecks,
    },
    {
      id: 'ollama-model',
      passed: gptOss.installed,
      observed: gptOss,
    },
    {
      id: 'disk',
      passed: typeof diskAvailableKiB === 'number' && diskAvailableKiB > 5 * 1024 * 1024,
      observed: diskAvailableKiB,
      note: 'Require at least 5 GiB free for receipts and ordinary local loop work.',
    },
    {
      id: 'git-visible',
      passed: gitStatus.ok,
      observed: gitStatus.summary,
    },
  ];
  return {
    generatedAt: new Date().toISOString(),
    mode: 'readiness',
    passed: checks.every((check) => check.passed),
    host: {
      platform: os.platform(),
      arch: os.arch(),
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
      diskAvailableKiB,
    },
    checks,
    subAgents: SUB_AGENTS.map((agent) => agent.id),
  };
}

function listSurfaceFiles(surface, limit) {
  const result = run('rg', ['--files', surface], { timeoutMs: 30_000 });
  const files = result.ok ? result.stdout.split(/\r?\n/).filter(Boolean) : listFilesFallback([surface]);
  return files
    .filter((file) => !file.includes('/node_modules/') && !file.includes('/.svelte-kit/'))
    .slice(0, limit);
}

function shouldSkipWalkPath(relativePath) {
  return (
    relativePath.includes('/node_modules/') ||
    relativePath.includes('/.svelte-kit/') ||
    relativePath.includes('/.git/') ||
    relativePath.startsWith('node_modules/') ||
    relativePath.startsWith('.svelte-kit/') ||
    relativePath.startsWith('.git/') ||
    relativePath.startsWith('.cache/') ||
    relativePath.startsWith('.tmp/') ||
    relativePath.startsWith('dist/') ||
    relativePath.startsWith('build/') ||
    relativePath.startsWith('output/')
  );
}

function listFilesFallback(roots, maxFiles = 5_000) {
  const files = [];
  const cwd = process.cwd();
  const visit = (target) => {
    if (files.length >= maxFiles) return;
    const relative = path.relative(cwd, path.resolve(target)).replaceAll('\\', '/') || target.replaceAll('\\', '/');
    if (shouldSkipWalkPath(relative)) return;
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      return;
    }
    if (stat.isFile()) {
      files.push(relative);
      return;
    }
    if (!stat.isDirectory()) return;
    let entries = [];
    try {
      entries = fs.readdirSync(target, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      visit(path.join(target, entry.name));
      if (files.length >= maxFiles) return;
    }
  };
  for (const root of roots) visit(root);
  return [...new Set(files)];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceAnchorsForFile(file) {
  if (!file || !fs.existsSync(file)) return { headings: [], sourceLines: [] };
  const text = fs.readFileSync(file, 'utf8');
  const headings = [];
  const sourceLines = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^(?<level>#{1,6})\s+(?<text>.+?)\s*#*$/);
    if (heading?.groups?.text) {
      headings.push(heading.groups.text.replace(/[`*_~]/g, '').trim());
      continue;
    }
    if (
      line.length >= 16 &&
      line.length <= 140 &&
      !line.startsWith('```') &&
      !line.startsWith('|') &&
      !line.startsWith('<')
    ) {
      sourceLines.push(line.replace(/\s+/g, ' '));
    }
  }
  return {
    headings: [...new Set(headings.filter(Boolean))].slice(0, 12),
    sourceLines: [...new Set(sourceLines.filter(Boolean))].slice(0, 12),
  };
}

function parseRevisionId(candidateId) {
  let rootId = String(candidateId ?? '');
  const numbered = rootId.match(/^(?<root>.+)-rev(?<depth>[1-9]\d*)$/);
  if (numbered?.groups?.root && numbered.groups.depth) {
    return {
      rootId: numbered.groups.root,
      depth: Number(numbered.groups.depth),
    };
  }

  let depth = 0;
  while (rootId.endsWith('-revised')) {
    depth += 1;
    rootId = rootId.slice(0, -'-revised'.length);
  }
  return { rootId, depth };
}

function revisionLineageForCandidate(candidate) {
  const parsed = parseRevisionId(candidate.id);
  const explicitDepth = Number.isInteger(Number(candidate.revisionDepth)) ? Number(candidate.revisionDepth) : 0;
  const previousDepth = Math.max(parsed.depth, explicitDepth);
  const rootId = String(candidate.revisionRootId || parsed.rootId || candidate.id);
  const nextDepth = previousDepth + 1;
  const blockers = [];
  if (nextDepth > MAX_REVISION_DEPTH) {
    blockers.push(`candidate has reached maximum revision depth ${MAX_REVISION_DEPTH}.`);
  }
  return {
    rootId,
    parentId: candidate.id,
    previousDepth,
    nextDepth,
    maxDepth: MAX_REVISION_DEPTH,
    nextId: `${rootId}-rev${nextDepth}`,
    ok: blockers.length === 0,
    blockers,
  };
}

function baseRevisionTitle(title) {
  return String(title ?? '')
    .replace(/(?:\s+\(revised\))+$/i, '')
    .replace(/\s+\(revision\s+\d+\)$/i, '')
    .trim();
}

function baseRevisionWhy(why) {
  return String(why ?? '')
    .replace(/\s*Revision \d+: repaired append payload to satisfy operator-agent gates\./gi, '')
    .replace(/\s*Revised to satisfy operator-agent content quality gates\./gi, '')
    .trim();
}

function deterministicPatchForFile(file) {
  if (!file.endsWith('.md')) return null;
  const escapedFile = file.replace(/`/g, '');
  const anchors = sourceAnchorsForFile(file);
  const heading = anchors.headings[0];
  return {
    type: 'append-markdown',
    content: [
      '## Operator Agent Candidate',
      '',
      `- Source file: \`${escapedFile}\``,
      heading ? `- Anchored to heading: \`${heading}\`` : '- Anchored to source: target file exists',
      '- Candidate type: deterministic docs append',
      '- Validation: `git diff --check` scoped to this file',
      '- Rollback: revert this appended section',
    ].join('\n'),
  };
}

function normalizeFileEntry(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    if (typeof entry.path === 'string') return entry.path;
    if (typeof entry.file === 'string') return entry.file;
    if (typeof entry.filename === 'string') return entry.filename;
  }
  return String(entry ?? '');
}

function normalizePatchContent(content) {
  return String(content ?? '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .normalize('NFKD')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function normalizePatch(patch) {
  if (!patch || typeof patch !== 'object') return null;
  const type = String(patch.type ?? '');
  if (type === 'exact-replace') {
    return {
      type,
      search: normalizePatchContent(patch.search),
      replace: normalizePatchContent(patch.replace),
    };
  }
  return {
    type,
    content: normalizePatchContent(patch.content),
  };
}

function deterministicCandidates(files) {
  return files.slice(0, 5).map((file, index) => ({
    id: `candidate-${String(index + 1).padStart(3, '0')}`,
    profile: file.endsWith('.md') ? 'docs' : file.includes('eval') ? 'evals' : 'scripts',
    surface: path.dirname(file),
    title: `Review ${file} for a small bounded improvement`,
    risk: 'low',
    autonomyLevel: 'A0',
    files: [file],
    why: 'Deterministic fallback candidate from bounded surface scan.',
    proposedAction: 'Inspect the file and propose at most one reversible improvement.',
    validation: ['git diff --check'],
    rollback: 'no-op for scout; revert file if later patched',
    confidence: 0.5,
    patch: deterministicPatchForFile(file),
  }));
}

function extractJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isPatternReviewCandidate(file) {
  const normalized = file.replaceAll('\\', '/');
  if (!normalized || normalized.includes('/node_modules/') || normalized.includes('/.svelte-kit/')) return false;
  if (
    normalized.startsWith('.cache/') ||
    normalized.startsWith('.tmp/') ||
    normalized.startsWith('dist/') ||
    normalized.startsWith('build/') ||
    normalized.endsWith('.lock')
  ) {
    return false;
  }
  if (normalized === 'AGENTS.md' || normalized === 'package.json') return true;
  if (normalized.startsWith('docs/') && /\.(md|json)$/i.test(normalized)) return true;
  if (normalized.startsWith('config/cloudflare/') && /\.(json|ya?ml|toml)$/i.test(normalized)) return true;
  if (normalized.startsWith('config/mcp-hub/') && /\.(json|ya?ml|toml)$/i.test(normalized)) return true;
  if (/^config\/dify\/inventory(\.schema)?\.json$/i.test(normalized)) return true;
  if (normalized === 'config/dify-templates/policy-os-template-pack.json') return true;
  if (/^scripts\/operator-agent-.+\.mjs$/i.test(normalized)) return true;
  if (/^scripts\/test\/operator-agent-.+\.test\.mjs$/i.test(normalized)) return true;
  return false;
}

function patternReviewFilePriority(file) {
  if (PATTERN_REVIEW_FILES.includes(file)) return 0;
  if (file === 'package.json') return 1;
  if (file.startsWith('scripts/operator-agent-')) return 2;
  if (file.startsWith('scripts/test/operator-agent-')) return 3;
  if (file.startsWith('config/cloudflare/')) return 4;
  if (file.startsWith('config/mcp-hub/')) return 5;
  if (file.startsWith('config/dify/')) return 6;
  if (file.startsWith('docs/policies/')) return 7;
  if (file.startsWith('docs/guides/')) return 8;
  if (file.startsWith('docs/')) return 9;
  return 10;
}

function discoverPatternReviewFiles(options) {
  const discovered = new Set(PATTERN_REVIEW_FILES);
  if (options.patternReviewScope === 'canonical') return [...discovered];

  const existingRoots = PATTERN_REVIEW_DISCOVERY_ROOTS.filter((root) => fs.existsSync(root));
  if (existingRoots.length === 0) return [...discovered];
  const result = run('rg', ['--files', ...existingRoots], { timeoutMs: 30_000 });
  const candidateFiles = result.ok ? result.stdout.split(/\r?\n/).filter(Boolean) : listFilesFallback(existingRoots);
  for (const file of candidateFiles) {
    if (isPatternReviewCandidate(file)) discovered.add(file);
  }
  return [...discovered].sort((left, right) => {
    return patternReviewFilePriority(left) - patternReviewFilePriority(right) || left.localeCompare(right);
  });
}

function readPatternReviewFiles(options) {
  return discoverPatternReviewFiles(options)
    .slice(0, options.patternReviewLimit)
    .map((file) => {
    const exists = fs.existsSync(file);
    const text = exists ? fs.readFileSync(file, 'utf8') : '';
    const anchors = exists ? sourceAnchorsForFile(file) : { headings: [], sourceLines: [] };
    return {
      file,
      exists,
      headings: anchors.headings,
      sourceLines: anchors.sourceLines,
      text,
    };
  });
}

function patternSourceCoverage(files) {
  const sourceText = files
    .filter((entry) => entry.exists)
    .map((entry) => `# ${entry.file}\n${entry.text}`)
    .join('\n\n');
  return PATTERN_REVIEW_CONCEPTS.map((concept) => ({
    id: concept.id,
    label: concept.label,
    present: concept.pattern.test(sourceText),
  }));
}

function deterministicPatternReview(files, coverage) {
  const present = coverage.filter((entry) => entry.present).map((entry) => entry.label);
  const missing = coverage.filter((entry) => !entry.present).map((entry) => entry.label);
  const existingFiles = files.filter((entry) => entry.exists).map((entry) => entry.file);
  return {
    thesis:
      'CREATE SOMETHING treats operator receipts, gates, and runtime commands as the control product and uses local models as governed executors, not independent authorities.',
    tierMap: {
      Database: 'Source-of-truth artifacts such as docs, policy files, configs, receipts, and tunnel posture records.',
      Automation: 'CLI modes, gateway routes, batch-eval runs, Cloudflare tunnel startup, and validation commands.',
      Judgment: 'Policy artifacts, autonomy levels, Access allow policies, rollback requirements, and operator decisions.',
    },
    operatingPatterns: [
      'Start read-only with receipts before widening write authority.',
      'Keep public access behind Cloudflare Access and the gateway bearer token.',
      'Expose no-write gateway modes before any public patch or revise authority.',
      'Use batch eval and teacher shadow traces to measure reliability before production-lab promotion.',
    ],
    safeNextActions: [
      'Run all-scope pattern-review regularly to keep the local model aligned with canonical repo patterns.',
      'Compare pattern-review receipts against batch-eval scorecards before delegating broader work.',
    ],
    namingCritique: [
      {
        label: 'operator system / product surface',
        critique:
          'Abstract labels are critique-only findings unless the review ties them back to concrete operator workflow, receipts, gates, and rollback evidence.',
        replacement: 'pattern-review receipt, operator-agent runtime, no-write gateway, batch-eval scorecard',
      },
    ],
    gaps: missing,
    evidenceFiles: existingFiles,
    coverage: present,
  };
}

function patternReviewUsesAbstractNaming(patternReview) {
  const text = [
    patternReview?.thesis,
    patternReview?.tierMap?.Database,
    patternReview?.tierMap?.Automation,
    patternReview?.tierMap?.Judgment,
    ...(Array.isArray(patternReview?.operatingPatterns) ? patternReview.operatingPatterns : []),
    ...(Array.isArray(patternReview?.safeNextActions) ? patternReview.safeNextActions : []),
  ]
    .filter(Boolean)
    .join('\n');
  return ABSTRACT_NAMING_PATTERN.test(text);
}

function hasConcreteNamingCritique(patternReview) {
  if (!Array.isArray(patternReview?.namingCritique) || patternReview.namingCritique.length === 0) return false;
  return patternReview.namingCritique.every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    return (
      String(entry.label ?? '').trim() &&
      String(entry.critique ?? '').trim() &&
      String(entry.replacement ?? '').trim()
    );
  });
}

function patternReviewAbstractionActionBlockers(patternReview) {
  if (!Array.isArray(patternReview?.safeNextActions)) return [];
  return patternReview.safeNextActions
    .filter((action) => typeof action === 'string' && ABSTRACTION_BUILDING_ACTION_PATTERN.test(action))
    .map(
      (action) =>
        `patternReview.safeNextActions must not propose new abstractions; move abstraction concerns into namingCritique for operator review: ${action}`
    );
}

function shouldIncludePatternSourceExcerpt(entry) {
  if (!entry?.exists) return false;
  const file = entry.file;
  if (PATTERN_REVIEW_FILES.includes(file)) return true;
  if (file === 'docs/policies/README.md') return true;
  if (file === 'docs/policies/v1/policy.operator-agent-production-lab.v1.md') return true;
  if (file === 'package.json') return true;
  if (file.startsWith('scripts/operator-agent-') || file.startsWith('scripts/test/operator-agent-')) return true;
  if (file.startsWith('config/cloudflare/') || file.startsWith('config/mcp-hub/')) return true;
  return false;
}

function patternReviewGate(patternReview, inspectedFiles = []) {
  const blockers = [];
  const inspected = new Set(inspectedFiles.map((entry) => (typeof entry === 'string' ? entry : entry.file)).filter(Boolean));
  if (!patternReview || typeof patternReview !== 'object' || Array.isArray(patternReview)) {
    blockers.push('patternReview must be a JSON object.');
  }
  if (!String(patternReview?.thesis ?? '').trim()) blockers.push('patternReview.thesis is required.');
  if (!patternReview?.tierMap || typeof patternReview.tierMap !== 'object') blockers.push('patternReview.tierMap is required.');
  for (const tier of ['Database', 'Automation', 'Judgment']) {
    if (!String(patternReview?.tierMap?.[tier] ?? '').trim()) blockers.push(`patternReview.tierMap.${tier} is required.`);
  }
  if (!Array.isArray(patternReview?.operatingPatterns) || patternReview.operatingPatterns.length === 0) {
    blockers.push('patternReview.operatingPatterns must contain at least one pattern.');
  }
  if (!Array.isArray(patternReview?.safeNextActions) || patternReview.safeNextActions.length === 0) {
    blockers.push('patternReview.safeNextActions must contain at least one action.');
  }
  if (patternReviewUsesAbstractNaming(patternReview) && !hasConcreteNamingCritique(patternReview)) {
    blockers.push(
      'patternReview.namingCritique is required when abstract naming appears; include label, critique, and concrete replacement.'
    );
  }
  blockers.push(...patternReviewAbstractionActionBlockers(patternReview));
  if (Array.isArray(patternReview?.evidenceFiles)) {
    for (const file of patternReview.evidenceFiles) {
      if (typeof file !== 'string' || !file.trim()) {
        blockers.push('patternReview.evidenceFiles entries must be non-empty strings.');
      } else if (inspected.size > 0 && !inspected.has(file)) {
        blockers.push(`patternReview.evidenceFiles contains uninspected file: ${file}`);
      }
    }
  } else {
    blockers.push('patternReview.evidenceFiles is required.');
  }
  return {
    ok: blockers.length === 0,
    blockers,
  };
}

async function modelProbe(options) {
  if (options.noModel) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'model-probe',
      loop: 'operator-agent-system',
      target: options.target,
      model: null,
      baseUrl: null,
      timeoutMs: null,
      passed: false,
      outcome: 'model-disabled',
      modelResult: { ok: false, error: 'model disabled' },
      contractGate: {
        ok: false,
        blockers: ['model-probe requires model access; remove --no-model to probe the local executor'],
      },
      nextDecision: 'keep model-backed delegation disabled until the local executor can pass model-probe',
    };
  }

  const expected = {
    ready: true,
    loop: 'operator-agent-system',
    task: 'model-probe',
    canReturnJson: true,
  };
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-model',
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0,
        max_tokens: 120,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a local CREATE SOMETHING executor readiness probe. Return only one JSON object, no Markdown.',
          },
          {
            role: 'user',
            content:
              'Return exactly this JSON shape with matching values: {"ready":true,"loop":"operator-agent-system","task":"model-probe","canReturnJson":true}',
          },
        ],
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJsonObject(content);
    const blockers = [];
    if (!parsed) {
      blockers.push('model output did not contain a complete JSON object');
    } else {
      for (const [key, value] of Object.entries(expected)) {
        if (parsed[key] !== value) blockers.push(`model-probe expected ${key}=${JSON.stringify(value)}`);
      }
    }
    const passed = blockers.length === 0;
    return {
      generatedAt: new Date().toISOString(),
      mode: 'model-probe',
      loop: 'operator-agent-system',
      target: options.target,
      model: options.model,
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
      latencyMs,
      passed,
      outcome: passed ? 'model-probed' : 'model-probe-blocked',
      modelResult: {
        ok: passed,
        httpStatus: response.status,
        raw: content.slice(0, 1000),
        parsed,
      },
      contractGate: { ok: passed, blockers },
      nextDecision: passed
        ? 'allow bounded model-backed scout or batch-eval, but keep pattern-review deterministic until repeated receipts pass'
        : 'keep model-backed delegation disabled until the local executor can pass model-probe',
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'model-probe',
      loop: 'operator-agent-system',
      target: options.target,
      model: options.model,
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
      passed: false,
      outcome: 'model-probe-blocked',
      modelResult: {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      contractGate: {
        ok: false,
        blockers: ['local model endpoint did not complete the strict JSON probe'],
      },
      nextDecision: 'keep model-backed delegation disabled until the local executor can pass model-probe',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function modelBenchmark(options) {
  if (options.noModel) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'model-benchmark',
      loop: 'operator-agent-system',
      target: options.target,
      baseUrl: null,
      timeoutMs: null,
      attemptsPerModel: options.benchmarkAttempts,
      minPassRate: options.benchmarkMinPassRate,
      models: [],
      bestModel: null,
      passed: false,
      outcome: 'model-benchmark-blocked',
      nextDecision: 'remove --no-model and benchmark the local executor before model-backed delegation',
    };
  }

  const models = options.benchmarkModels.length > 0 ? options.benchmarkModels : [options.model];
  const summaries = [];
  for (const model of models) {
    const attempts = [];
    for (let attempt = 1; attempt <= options.benchmarkAttempts; attempt += 1) {
      const probe = await modelProbe({ ...options, model });
      attempts.push({
        attempt,
        generatedAt: probe.generatedAt,
        passed: probe.passed,
        outcome: probe.outcome,
        latencyMs: probe.latencyMs ?? null,
        blockers: probe.contractGate?.blockers ?? [],
      });
    }
    const passedCount = attempts.filter((attempt) => attempt.passed).length;
    const latencies = attempts.map((attempt) => attempt.latencyMs).filter((latency) => Number.isFinite(latency));
    summaries.push({
      model,
      attempts,
      passedCount,
      failedCount: attempts.length - passedCount,
      passRate: attempts.length > 0 ? passedCount / attempts.length : 0,
      averageLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length) : null,
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : null,
    });
  }

  summaries.sort((left, right) => {
    if (right.passRate !== left.passRate) return right.passRate - left.passRate;
    const leftLatency = left.averageLatencyMs ?? Number.POSITIVE_INFINITY;
    const rightLatency = right.averageLatencyMs ?? Number.POSITIVE_INFINITY;
    return leftLatency - rightLatency || left.model.localeCompare(right.model);
  });
  const bestModel = summaries[0] ?? null;
  const passed = Boolean(bestModel && bestModel.passRate >= options.benchmarkMinPassRate);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'model-benchmark',
    loop: 'operator-agent-system',
    target: options.target,
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    attemptsPerModel: options.benchmarkAttempts,
    minPassRate: options.benchmarkMinPassRate,
    models: summaries,
    bestModel: bestModel
      ? {
          model: bestModel.model,
          passRate: bestModel.passRate,
          averageLatencyMs: bestModel.averageLatencyMs,
          maxLatencyMs: bestModel.maxLatencyMs,
        }
      : null,
    passed,
    outcome: passed ? 'model-benchmarked' : 'model-benchmark-blocked',
    nextDecision: passed
      ? `allow ${bestModel.model} into bounded model-backed batch-eval, then verify schedule reliability before widening authority`
      : 'keep model-backed delegation disabled; benchmark a faster or more reliable local model before promotion',
  };
}

async function modelPatternReview(options, files, coverage) {
  const deterministicDraft = deterministicPatternReview(files, coverage);
  const sourceExcerptFiles = files
    .filter((entry) => shouldIncludePatternSourceExcerpt(entry))
    .slice(0, 24);
  const modelDraft = {
    ...deterministicDraft,
    evidenceFiles: sourceExcerptFiles.map((entry) => entry.file),
  };
  const sourcePacket = sourceExcerptFiles
    .map((entry) =>
      [
        `FILE: ${entry.file}`,
        `HEADINGS: ${entry.headings.join(' | ') || 'none'}`,
        `SOURCE LINES:\n${entry.sourceLines.slice(0, 8).map((line) => `- ${line}`).join('\n') || '- none'}`,
      ].join('\n')
    )
    .join('\n\n---\n\n');
  const prompt = [
    'You are reviewing CREATE SOMETHING local operator-agent patterns.',
    'Return only one JSON object. No prose outside JSON.',
    'Do not use Markdown, headings, tables, bullets outside JSON, or fenced code blocks.',
    'Use only the supplied source excerpts. Do not claim external facts.',
    `Source coverage observed by harness:\n${coverage.map((entry) => `- ${entry.label}: ${entry.present ? 'present' : 'missing'}`).join('\n')}`,
    `Source excerpts:\n${sourcePacket}`,
    'Final response contract:',
    'Return the deterministic draft shape below as the response JSON. Refine field wording only when the source excerpts give a more concrete CREATE SOMETHING wording.',
    'Do not summarize any single policy, README, guide, or source file as the response. Source files are evidence, not the output schema.',
    'Keep every required key from the draft. Do not rename keys. Do not add wrapper keys like README, purpose, summary, policy, or overview.',
    'No abstract-only naming: if you use words like system, platform, framework, layer, surface, orchestration, agentic, AI-native, abstraction, or composable, include namingCritique with critique and concrete replacement.',
    'Treat abstraction language as critique-only. Do not turn it into a thesis, operating pattern, or work item unless the same response names the concrete receipt, command, file, gate, or rollback evidence behind it.',
    'Do not propose creating, naming, introducing, or extracting a new abstraction in safeNextActions. Put abstraction concerns only in namingCritique for operator review.',
    'Use evidenceFiles only from the source excerpt file names below; do not copy the full inspected file inventory.',
    'Required shape:',
    '{ "thesis": "...", "tierMap": { "Database": "...", "Automation": "...", "Judgment": "..." }, "operatingPatterns": ["..."], "safeNextActions": ["..."], "namingCritique": [{ "label": "...", "critique": "...", "replacement": "..." }], "gaps": ["..."], "evidenceFiles": ["..."] }',
    `Deterministic draft:\n${JSON.stringify(modelDraft, null, 2)}`,
  ].join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-model',
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You produce strict JSON pattern reviews for CREATE SOMETHING. Return one JSON object only, with no Markdown.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJsonObject(content);
    if (!parsed) {
      return {
        ok: false,
        raw: content,
        patternReview: null,
        error: 'model output did not contain a complete JSON object',
      };
    }
    return {
      ok: true,
      raw: content,
      patternReview: parsed,
    };
  } catch (error) {
    return {
      ok: false,
      patternReview: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function modelPatternReviewRepair(options, attemptedPatternReview, gate, coverage, files = []) {
  const deterministicShape = deterministicPatternReview(files, coverage);
  const allowedEvidenceFiles = files.map((entry) => entry.file).filter(Boolean);
  const repairEvidenceFiles = allowedEvidenceFiles.slice(0, 15);
  deterministicShape.evidenceFiles = repairEvidenceFiles;
  const prompt = [
    'Repair this CREATE SOMETHING pattern-review JSON object so it matches the required schema.',
    'Return only one JSON object. No Markdown, prose, code fences, or commentary outside JSON.',
    'Required shape:',
    '{ "thesis": "...", "tierMap": { "Database": "...", "Automation": "...", "Judgment": "..." }, "operatingPatterns": ["..."], "safeNextActions": ["..."], "namingCritique": [{ "label": "...", "critique": "...", "replacement": "..." }], "gaps": ["..."], "evidenceFiles": ["..."] }',
    'Keep useful content from the attempted object, but fill every missing required field from the provided fallback shape.',
    'Do not claim external facts. Keep the review concrete to CREATE SOMETHING operator workflows.',
    'If abstract naming appears, include namingCritique with label, critique, and concrete replacement.',
    'Treat abstraction language as critique-only. Do not turn it into a thesis, operating pattern, or work item unless the same response names the concrete receipt, command, file, gate, or rollback evidence behind it.',
    'Do not propose creating, naming, introducing, or extracting a new abstraction in safeNextActions. Put abstraction concerns only in namingCritique for operator review.',
    'Every evidenceFiles entry must be copied exactly from the allowed evidence file list.',
    'Use at most 15 evidenceFiles entries.',
    `Schema blockers:\n${gate.blockers.map((blocker) => `- ${blocker}`).join('\n')}`,
    `Allowed evidence files:\n${repairEvidenceFiles.map((file) => `- ${file}`).join('\n')}`,
    `Attempted object:\n${JSON.stringify(attemptedPatternReview, null, 2)}`,
    `Fallback shape:\n${JSON.stringify(deterministicShape, null, 2)}`,
  ].join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-model',
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You repair one JSON object into the exact CREATE SOMETHING pattern-review schema. Return JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJsonObject(content);
    if (!parsed) {
      return {
        ok: false,
        raw: content,
        patternReview: null,
        error: 'repair output did not contain a complete JSON object',
      };
    }
    return {
      ok: true,
      raw: content,
      patternReview: parsed,
    };
  } catch (error) {
    return {
      ok: false,
      patternReview: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function modelCandidates(options, files) {
  const candidateCount = Math.max(1, Math.min(files.length, 3));
  const prompt = [
    'You are the CREATE SOMETHING operator-agent scout.',
    `Return only a JSON array of exactly ${candidateCount} tiny improvement candidate(s).`,
    'Prefer docs append changes that are reversible and easy to validate.',
    'Do not propose secrets, credentials, billing, destructive actions, broad refactors, or client production changes.',
    'Do not include tokens, placeholder credentials, account IDs, or install commands unless they already appear in the inspected file name.',
    'For docs candidates, set profile to "docs", risk to "low", autonomyLevel to "A0" or "A1", validation to ["git diff --check"], and include patch: { "type": "append-markdown", "content": "..." }.',
    'Patch content must be concise Markdown, at most 600 characters, and must not contain code fences.',
    'Patch content must not include git checkout, git reset, install commands, shell pipes, token placeholders, credentials, or generic advice that does not reference the exact target file path.',
    'Patch content must cite one existing heading or source line from the target file.',
    'Patch content must add a distinct new signal; do not repeat existing source text or only tell the reader to see the file for details.',
    'Each candidate must include id, profile, surface, title, risk, autonomyLevel, files, why, proposedAction, validation, rollback, confidence, and optional patch.',
    'Validation should prefer "git diff --check"; patch mode will scope it to the candidate files.',
    ...(options.task ? [`Task: ${options.task}`] : []),
    `Surface: ${options.surface}`,
    `Files:\n${files.map((file) => `- ${file}`).join('\n')}`,
  ].join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-model',
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content:
              'You produce bounded CREATE SOMETHING engineering candidates as strict JSON. No prose outside JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content ?? '';
    const candidates = extractJsonArray(content);
    if (!candidates || candidates.length === 0) {
      return {
        ok: false,
        candidates: [],
        raw: content,
        error: 'model output did not contain a complete JSON array',
      };
    }
    return {
      ok: true,
      candidates,
      raw: content,
    };
  } catch (error) {
    return {
      ok: false,
      candidates: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function deterministicRevision(candidate) {
  const file = candidate.files[0] ?? 'docs/unknown.md';
  const anchors = sourceAnchorsForFile(file);
  const heading = anchors.headings[0];
  return [
    '## Operator Review Note',
    '',
    `- Target file: \`${file}\``,
    heading ? `- Anchored to heading: \`${heading}\`` : '- Anchored to source: target file exists',
    '- Review the existing guide before promoting this candidate.',
    '- Keep rollback to removing this appended section.',
  ].join('\n');
}

async function modelRevision(options, candidate, contentGate, sourceGate) {
  if (options.noModel) {
    return {
      ok: false,
      content: deterministicRevision(candidate),
      error: 'model disabled',
    };
  }

  const prompt = [
    'You are repairing one CREATE SOMETHING operator-agent append-markdown payload.',
    'Return only a JSON object with shape: { "patch": { "type": "append-markdown", "content": "..." } }.',
    'Repair only patch.content. Do not change the candidate id, file, risk, validation, or rollback.',
    'The repaired content must start with "## ", be concise Markdown, contain no code fences, and be 600 characters or less.',
    'The repaired content must reference the exact target file path.',
    'The repaired content must reference one existing heading or source line from the target file.',
    'Do not include git checkout, git reset, install commands, shell pipes, token placeholders, credentials, or generic advice that does not reference the exact target file path.',
    'Do not repeat existing source text or only tell the reader to see the file for details; add one distinct review note.',
    `Target file: ${candidate.files[0] ?? ''}`,
    `Existing headings:\n${sourceAnchorsForFile(candidate.files[0] ?? '').headings.map((heading) => `- ${heading}`).join('\n') || '- none'}`,
    `Original title: ${candidate.title}`,
    `Original content blockers:\n${contentGate.blockers.map((blocker) => `- ${blocker}`).join('\n') || '- none'}`,
    `Original source blockers:\n${sourceGate.blockers.map((blocker) => `- ${blocker}`).join('\n') || '- none'}`,
    `Original patch content:\n${candidate.patch?.content ?? ''}`,
  ].join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-model',
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: 'You repair one Markdown patch payload as strict JSON. No prose outside JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJsonObject(content);
    const revisedContent = parsed?.patch?.content ?? parsed?.content;
    if (!revisedContent) {
      return {
        ok: false,
        raw: content,
        content: deterministicRevision(candidate),
        error: 'model output did not contain patch.content',
      };
    }
    return {
      ok: true,
      raw: content,
      content: normalizePatchContent(revisedContent),
    };
  } catch (error) {
    return {
      ok: false,
      content: deterministicRevision(candidate),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCandidate(candidate, index) {
  const normalized = {
    id: String(candidate.id ?? `candidate-${String(index + 1).padStart(3, '0')}`),
    profile: String(candidate.profile ?? 'scout'),
    surface: String(candidate.surface ?? ''),
    title: String(candidate.title ?? 'Untitled candidate'),
    risk: RISK_LEVELS.has(candidate.risk) ? candidate.risk : 'low',
    autonomyLevel: String(candidate.autonomyLevel ?? 'A0'),
    files: Array.isArray(candidate.files) ? candidate.files.map(normalizeFileEntry) : [],
    why: String(candidate.why ?? ''),
    proposedAction: String(candidate.proposedAction ?? ''),
    validation: Array.isArray(candidate.validation) ? candidate.validation.map(String) : [],
    rollback: String(candidate.rollback ?? ''),
    confidence: Number.isFinite(Number(candidate.confidence)) ? Number(candidate.confidence) : 0,
    patch: normalizePatch(candidate.patch),
  };
  if (candidate.revisionRootId) normalized.revisionRootId = String(candidate.revisionRootId);
  if (candidate.parentCandidateId) normalized.parentCandidateId = String(candidate.parentCandidateId);
  if (Number.isInteger(Number(candidate.revisionDepth))) normalized.revisionDepth = Number(candidate.revisionDepth);
  return normalized;
}

function loadCandidate(options) {
  if (!options.candidateFile) throw new Error('Patch mode requires --candidate-file.');
  const payload = JSON.parse(fs.readFileSync(options.candidateFile, 'utf8'));
  const rawCandidates = Array.isArray(payload) ? payload : payload.candidates;
  if (!Array.isArray(rawCandidates) || rawCandidates.length === 0) {
    throw new Error(`${options.candidateFile}: expected a candidate array or scout receipt with candidates.`);
  }
  const candidates = rawCandidates.map(normalizeCandidate);
  if (!options.candidateId) return candidates[0];
  const candidate = candidates.find((entry) => entry.id === options.candidateId);
  if (!candidate) throw new Error(`Candidate ${options.candidateId} not found in ${options.candidateFile}.`);
  return candidate;
}

function writeCandidateInput(options, candidate, label) {
  fs.mkdirSync(options.outDir, { recursive: true });
  const safeLabel = String(label ?? candidate.id)
    .replace(/[^a-zA-Z0-9_.-]/g, '-')
    .slice(0, 80);
  const filePath = path.join(options.outDir, `candidate-input-${safeLabel}-${randomUUID().slice(0, 8)}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify({ candidates: [candidate] }, null, 2)}\n`);
  return filePath;
}

function isSafeRelativePath(filePath) {
  return (
    filePath &&
    !path.isAbsolute(filePath) &&
    !filePath.split(/[\\/]/).includes('..') &&
    !filePath.includes('\0')
  );
}

function countOccurrences(text, search) {
  if (!search) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const foundAt = text.indexOf(search, index);
    if (foundAt === -1) return count;
    count += 1;
    index = foundAt + search.length;
  }
}

function rollbackProofForCandidate(candidate, options) {
  const required =
    candidate.autonomyLevel === 'A2' && options.target === 'local' && ['scripts', 'tests'].includes(candidate.profile);
  if (!required) return { required: false, ok: true, receiptPath: options.rollbackProofReceipt || null, blockers: [] };
  if (options.rollbackProofGeneration) {
    return {
      required,
      ok: true,
      receiptPath: options.rollbackProofReceipt || null,
      blockers: [],
      note: 'A2 rollback proof is being generated by rollback-proof mode.',
    };
  }
  const blockers = [];
  if (candidate.patch?.type !== 'exact-replace') {
    blockers.push('A2 local code patches require exact-replace rollback-proof evidence.');
  }
  if (!options.rollbackProofReceipt) {
    blockers.push('A2 local code patches require rollback-proof receipt evidence.');
    return { required, ok: false, receiptPath: '', blockers };
  }
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(options.rollbackProofReceipt, 'utf8'));
  } catch (error) {
    blockers.push(`Could not read rollback-proof receipt: ${error instanceof Error ? error.message : String(error)}`);
    return { required, ok: false, receiptPath: options.rollbackProofReceipt, blockers };
  }
  const file = candidate.files[0] ?? '';
  if (receipt.mode !== 'rollback-proof') blockers.push('Rollback-proof receipt mode must be rollback-proof.');
  if (receipt.outcome !== 'rollback-proven') blockers.push(`Rollback-proof receipt outcome must be rollback-proven, got ${receipt.outcome}.`);
  if (receipt.passed !== true) blockers.push('Rollback-proof receipt must have passed true.');
  if (receipt.hashRestored !== true) blockers.push('Rollback-proof receipt must have hashRestored true.');
  if (receipt.file !== file) blockers.push(`Rollback-proof receipt file must match candidate file: ${file}.`);
  if (receipt.forwardCandidateId !== candidate.id) {
    blockers.push(`Rollback-proof receipt forwardCandidateId must match candidate id: ${candidate.id}.`);
  }
  if (receipt.hashes?.before !== receipt.hashes?.afterRollback) {
    blockers.push('Rollback-proof receipt before and afterRollback hashes must match.');
  }
  if (receipt.hashes?.before === receipt.hashes?.afterForward) {
    blockers.push('Rollback-proof receipt must show the forward write changed the file.');
  }
  if (receipt.stages?.forwardActual?.outcome !== 'patched' || receipt.stages?.forwardActual?.passed !== true) {
    blockers.push('Rollback-proof receipt forward actual stage must be patched and passed.');
  }
  if (receipt.stages?.rollbackActual?.outcome !== 'patched' || receipt.stages?.rollbackActual?.passed !== true) {
    blockers.push('Rollback-proof receipt rollback actual stage must be patched and passed.');
  }
  return { required, ok: blockers.length === 0, receiptPath: options.rollbackProofReceipt, blockers };
}

function validatePatchCandidate(candidate, options = {}) {
  const blockers = [];
  if (!PATCHABLE_PROFILES.has(candidate.profile)) blockers.push(`Profile ${candidate.profile} is not patch-enabled.`);
  const a3PromotionRisk =
    options.target === INTERNAL_PRODUCTION_TARGET && Boolean(options.promotionFile) && candidate.risk === 'medium';
  if (candidate.risk !== 'low' && !a3PromotionRisk) {
    blockers.push(`Patch mode allows low-risk candidates, plus medium-risk candidates inside a gated A3 promotion packet; got ${candidate.risk}.`);
  }
  const rollbackProof = rollbackProofForCandidate(candidate, options);
  if (!['A0', 'A1', 'A2'].includes(candidate.autonomyLevel)) {
    blockers.push(`Patch mode expects autonomy level A0, A1, or proof-gated A2, got ${candidate.autonomyLevel}.`);
  }
  if (candidate.autonomyLevel === 'A2' && !rollbackProof.required) {
    blockers.push('A2 patch mode is only available for local scripts/tests code patches.');
  }
  if (candidate.autonomyLevel === 'A2' && rollbackProof.required && !rollbackProof.ok) {
    blockers.push(...rollbackProof.blockers);
  }
  if (candidate.files.length !== 1) blockers.push('Patch mode currently requires exactly one target file.');
  const file = candidate.files[0] ?? '';
  if (!isSafeRelativePath(file)) blockers.push(`Unsafe file path: ${file}`);
  if (candidate.profile === 'docs') {
    if (!file.startsWith('docs/')) blockers.push(`Docs patch mode only writes under docs/: ${file}`);
    if (!file.endsWith('.md')) blockers.push(`Docs patch mode only writes Markdown files: ${file}`);
    if (candidate.patch && candidate.patch.type !== 'append-markdown') {
      blockers.push(`Docs patch mode supports append-markdown only, got ${candidate.patch.type}.`);
    }
  } else if (candidate.profile === 'scripts') {
    if (!/^scripts\/operator-agent-[A-Za-z0-9_.-]+\.mjs$/.test(file)) {
      blockers.push(`Scripts patch mode target is not allowlisted: ${file}`);
    }
    if (candidate.patch && candidate.patch.type !== 'exact-replace') {
      blockers.push(`Scripts patch mode supports exact-replace only, got ${candidate.patch.type}.`);
    }
    if (!candidate.validation.includes(`node --check ${file}`)) {
      blockers.push(`Scripts patch mode requires validation: node --check ${file}`);
    }
  } else if (candidate.profile === 'tests') {
    if (!/^scripts\/test\/operator-agent-[A-Za-z0-9_.-]+\.test\.mjs$/.test(file)) {
      blockers.push(`Tests patch mode target is not allowlisted: ${file}`);
    }
    if (candidate.patch && candidate.patch.type !== 'exact-replace') {
      blockers.push(`Tests patch mode supports exact-replace only, got ${candidate.patch.type}.`);
    }
    if (!candidate.validation.includes(`node --check ${file}`) && !candidate.validation.includes(`node --test ${file}`)) {
      blockers.push(`Tests patch mode requires validation: node --check ${file} or node --test ${file}`);
    }
  }
  if (file && !fs.existsSync(file)) blockers.push(`Target file does not exist: ${file}`);
  if (!candidate.rollback.trim()) blockers.push('Candidate must include a rollback note.');
  if (candidate.validation.length === 0) blockers.push('Candidate must include at least one validation command.');
  if (candidate.patch) {
    if (!['append-markdown', 'exact-replace'].includes(candidate.patch.type)) {
      blockers.push(`Unsupported patch type: ${candidate.patch.type}`);
    } else if (candidate.patch.type === 'append-markdown') {
      if (!candidate.patch.content.trim()) blockers.push('append-markdown patch content must not be empty.');
      if (candidate.patch.content.length > MAX_APPEND_MARKDOWN_LENGTH) {
        blockers.push(`append-markdown patch content must be ${MAX_APPEND_MARKDOWN_LENGTH} characters or less.`);
      }
      if (candidate.patch.content.includes('\0')) blockers.push('append-markdown patch content contains a null byte.');
    } else if (candidate.patch.type === 'exact-replace') {
      if (!candidate.patch.search) blockers.push('exact-replace search must not be empty.');
      if (!candidate.patch.replace) blockers.push('exact-replace replace must not be empty.');
      if (candidate.patch.search === candidate.patch.replace) blockers.push('exact-replace search and replace must differ.');
      if (candidate.patch.search.length > MAX_EXACT_REPLACE_LENGTH || candidate.patch.replace.length > MAX_EXACT_REPLACE_LENGTH) {
        blockers.push(`exact-replace search and replace must be ${MAX_EXACT_REPLACE_LENGTH} characters or less.`);
      }
      if (candidate.patch.search.includes('\0') || candidate.patch.replace.includes('\0')) {
        blockers.push('exact-replace search and replace must not contain a null byte.');
      }
      if (file && fs.existsSync(file)) {
        const occurrences = countOccurrences(fs.readFileSync(file, 'utf8'), candidate.patch.search);
        if (occurrences !== 1) blockers.push(`exact-replace search must match exactly once, got ${occurrences}.`);
      }
    }
  }
  return {
    ok: blockers.length === 0,
    blockers,
    file,
    rollbackProof,
  };
}

function contentQualityGate(candidate) {
  const blockers = [];
  if (!candidate.patch) {
    return { ok: true, blockers, summary: 'No append payload supplied; marker patch only.' };
  }
  if (candidate.patch.type === 'exact-replace') {
    return { ok: true, blockers, summary: 'Exact replace payload is constrained by candidate gate.' };
  }

  const content = candidate.patch.content.trim();
  const lower = content.toLowerCase();
  if (!content.startsWith('## ')) blockers.push('append-markdown content must start with a level-two Markdown heading.');
  if (content.includes('```')) blockers.push('append-markdown content must not include code fences.');
  if (content.length < 40) blockers.push('append-markdown content is too short to review safely.');
  if (/(your[_ -]?(token|key|secret|password)|token_here|api[_ -]?key|secret_here|password_here)/i.test(content)) {
    blockers.push('append-markdown content includes credential or placeholder language.');
  }
  if (/\bgit\s+checkout\b/i.test(content)) {
    blockers.push('append-markdown content includes a git checkout command.');
  }
  if (/\bgit\s+reset\b|\brm\s+-rf\b|\bcurl\b.*\|\s*(sh|bash)\b/i.test(content)) {
    blockers.push('append-markdown content includes a destructive or shell-pipe command.');
  }
  if (/\bnpm\s+install\s+-g\b|\bpnpm\s+add\b|\byarn\s+add\b|\bbrew\s+install\b/i.test(content)) {
    blockers.push('append-markdown content includes an install command.');
  }
  if (
    /\b(common pitfalls|best practices|quick start|pre-deploy verification checklist|deployment checklist)\b/i.test(content) &&
    !lower.includes(candidate.files[0]?.toLowerCase() ?? '')
  ) {
    blockers.push('generic guidance must reference the target file path.');
  }

  return {
    ok: blockers.length === 0,
    blockers,
    summary: blockers.length === 0 ? 'content quality gate passed' : 'content quality gate blocked write mode',
  };
}

function includesHeadingAnchor(content, heading) {
  const pattern = new RegExp(`(^|[^a-z0-9/._-])${escapeRegex(heading.toLowerCase())}([^a-z0-9/._-]|$)`, 'i');
  return pattern.test(content);
}

function sourceGroundingGate(candidate) {
  const blockers = [];
  if (!candidate.patch) {
    return { ok: true, blockers, summary: 'No append payload supplied; marker patch only.', anchors: null };
  }
  if (candidate.patch.type === 'exact-replace') {
    return { ok: true, blockers, summary: 'Exact replace payload is constrained by candidate gate.', anchors: null };
  }
  const file = candidate.files[0] ?? '';
  const anchors = sourceAnchorsForFile(file);
  const content = candidate.patch.content.toLowerCase();
  const headingMatch = anchors.headings.find((heading) => includesHeadingAnchor(content, heading));
  const sourceLineMatch = anchors.sourceLines.find((line) => content.includes(line.toLowerCase()));
  if (!headingMatch && !sourceLineMatch) {
    blockers.push('append-markdown content must reference an existing heading or source line from the target file.');
  }
  return {
    ok: blockers.length === 0,
    blockers,
    summary: blockers.length === 0 ? 'source grounding gate passed' : 'source grounding gate blocked write mode',
    anchors: {
      headings: anchors.headings,
      sourceLines: anchors.sourceLines,
      matchedHeading: headingMatch ?? null,
      matchedSourceLine: sourceLineMatch ?? null,
    },
  };
}

function meaningfulAppendLines(candidate) {
  const file = candidate.files[0] ?? '';
  return (candidate.patch?.content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^-+\s*/, ''))
    .map((line) => line.replaceAll(file, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('## '))
    .filter((line) => !/^anchored to (heading|source):/i.test(line))
    .filter((line) => !/^target file:/i.test(line));
}

function usefulnessGate(candidate) {
  const blockers = [];
  if (!candidate.patch) {
    return { ok: true, blockers, summary: 'No append payload supplied; marker patch only.', signals: null };
  }
  if (candidate.patch.type === 'exact-replace') {
    return { ok: true, blockers, summary: 'Exact replace payload is constrained by candidate gate.', signals: null };
  }
  const file = candidate.files[0] ?? '';
  const anchors = sourceAnchorsForFile(file);
  const meaningfulLines = meaningfulAppendLines(candidate);
  const repeatedLines = meaningfulLines.filter((line) =>
    anchors.sourceLines.some((sourceLine) => sourceLine.toLowerCase() === line.toLowerCase())
  );
  const crossReferenceOnly =
    meaningfulLines.length > 0 &&
    meaningfulLines.every((line) => /\b(for (full|detailed) (details|steps)|see .+ for (full )?details)\b/i.test(line));
  const crossReferenceSummary = meaningfulLines.some((line) =>
    /\b(for (full|detailed) (details|steps)|see .+ for (full )?details)\b/i.test(line)
  );
  const genericReviewLines = meaningfulLines.filter((line) =>
    /\b(review the existing guide before promoting this candidate|keep rollback to removing this appended section)\b/i.test(line)
  );

  if (repeatedLines.length > 0 && meaningfulLines.length === repeatedLines.length) {
    blockers.push('append-markdown content repeats existing source text without adding a distinct new signal.');
  }
  if (crossReferenceOnly) {
    blockers.push('append-markdown content is only a cross-reference summary, not a distinct improvement.');
  }
  if (crossReferenceSummary) {
    blockers.push('append-markdown content defers to the existing file instead of adding a distinct improvement.');
  }
  if (genericReviewLines.length > 0 && genericReviewLines.length === meaningfulLines.length) {
    blockers.push('append-markdown content is only a generic operator-review fallback.');
  }

  return {
    ok: blockers.length === 0,
    blockers,
    summary: blockers.length === 0 ? 'usefulness gate passed' : 'usefulness gate blocked write mode',
    signals: {
      meaningfulLines,
      repeatedLines,
      crossReferenceOnly,
      crossReferenceSummary,
      genericReviewLines,
    },
  };
}

function patchTextForCandidate(candidate, file) {
  if (candidate.patch?.type === 'append-markdown') {
    return ['', candidate.patch.content.trim(), ''].join('\n');
  }
  if (file?.endsWith('.mjs')) {
    return [
      '',
      '// operator-agent-system:patch-note',
      `// candidate: ${candidate.id}`,
      `// profile: ${candidate.profile}`,
      `// risk: ${candidate.risk}`,
      `// title: ${candidate.title}`,
      `// reason: ${candidate.why}`,
      `// proposed_action: ${candidate.proposedAction}`,
      '// operator-agent-system:patch-note end',
      '',
    ].join('\n');
  }
  return [
    '',
    '<!-- operator-agent-system:patch-note',
    `candidate: ${candidate.id}`,
    `profile: ${candidate.profile}`,
    `risk: ${candidate.risk}`,
    `title: ${candidate.title}`,
    `reason: ${candidate.why}`,
    `proposed_action: ${candidate.proposedAction}`,
    'operator-agent-system:patch-note -->',
    '',
  ].join('\n');
}

function applyCandidatePatch(candidate, file, options) {
  const before = fs.readFileSync(file, 'utf8');
  if (candidate.patch?.type === 'exact-replace') {
    const after = before.replace(candidate.patch.search, candidate.patch.replace);
    if (!options.dryRun) fs.writeFileSync(file, after);
    return {
      changed: !options.dryRun && before !== after,
      note: options.dryRun ? `Dry run would apply exact-replace patch to ${file}.` : `Applied exact-replace patch to ${file}.`,
    };
  }
  const marker = `candidate: ${candidate.id}`;
  const appendContent = candidate.patch?.type === 'append-markdown' ? candidate.patch.content.trim() : '';
  if (before.includes(marker) || (appendContent && before.includes(appendContent))) {
    return {
      changed: false,
      note: `Patch content for ${candidate.id} already exists in ${file}.`,
    };
  }
  const addition = patchTextForCandidate(candidate, file).trim();
  const separator = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const after = `${before}${separator}${addition}\n`;
  if (!options.dryRun) fs.writeFileSync(file, after);
  return {
    changed: !options.dryRun,
    note: options.dryRun ? `Dry run would append patch note to ${file}.` : `Appended patch note to ${file}.`,
  };
}

function parseValidationCommand(commandText, files = []) {
  const trimmed = commandText.trim();
  if (trimmed === 'git diff --check') {
    return files.length > 0
      ? { command: 'git', args: ['diff', '--check', '--', ...files] }
      : { command: 'git', args: ['diff', '--check'] };
  }
  if (trimmed === 'node scripts/policy-artifact-check.mjs') {
    return { command: 'node', args: ['scripts/policy-artifact-check.mjs'] };
  }
  if (trimmed === 'node scripts/agent-solo-loop.mjs --check') {
    return { command: 'node', args: ['scripts/agent-solo-loop.mjs', '--check'] };
  }
  const nodeCheck = trimmed.match(/^node --check (?<file>[A-Za-z0-9_./-]+)$/);
  if (nodeCheck?.groups?.file && isSafeRelativePath(nodeCheck.groups.file)) {
    return { command: 'node', args: ['--check', nodeCheck.groups.file] };
  }
  const nodeTest = trimmed.match(/^node --test (?<file>[A-Za-z0-9_./-]+)$/);
  if (nodeTest?.groups?.file && isSafeRelativePath(nodeTest.groups.file)) {
    return { command: 'node', args: ['--test', nodeTest.groups.file] };
  }
  return null;
}

function runValidationCommands(commands, files = []) {
  return commands.map((commandText) => {
    const parsed = parseValidationCommand(commandText, files);
    if (!parsed) {
      return {
        command: commandText,
        ok: false,
        skipped: true,
        summary: 'Validation command is not in the operator-agent allowlist.',
      };
    }
    return {
      ...run(parsed.command, parsed.args, { timeoutMs: 120_000 }),
      skipped: false,
    };
  });
}

function patchReportAllowsWrite(report) {
  return Boolean(
    report.candidateGate?.ok &&
      report.decision?.allowed &&
      report.contentGate?.ok &&
      report.sourceGate?.ok &&
      report.usefulnessGate?.ok
  );
}

function patchGateFailures(report) {
  return {
    candidate: report.candidateGate?.ok === false ? 1 : 0,
    policy: report.decision?.allowed === false ? 1 : 0,
    content: report.contentGate?.ok === false ? 1 : 0,
    source: report.sourceGate?.ok === false ? 1 : 0,
    usefulness: report.usefulnessGate?.ok === false ? 1 : 0,
  };
}

function addGateFailures(total, failures) {
  for (const [key, value] of Object.entries(failures)) {
    total[key] = (total[key] ?? 0) + value;
  }
  return total;
}

function patch(options) {
  const candidate = loadCandidate(options);
  const candidateGate = validatePatchCandidate(candidate, options);
  const contentGate = contentQualityGate(candidate);
  const sourceGate = sourceGroundingGate(candidate);
  const usefulGate = usefulnessGate(candidate);
  const decisionOptions = {
    ...options,
    operation: 'patch',
    risk: candidate.risk,
    reversible: Boolean(candidate.rollback.trim()),
    rollback: candidate.rollback,
    validation: candidate.validation,
  };
  const decision = policyDecision(decisionOptions);
  const preReceipt = {
    generatedAt: new Date().toISOString(),
    mode: 'patch-preflight',
    loop: 'operator-agent-system',
    target: options.target,
    candidate,
    candidateGate,
    contentGate,
    sourceGate,
    usefulnessGate: usefulGate,
    decision,
    dryRun: options.dryRun,
  };
  const preReceiptPath = writeReceipt(options, preReceipt);

  if (!candidateGate.ok || !decision.allowed) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'patch',
      loop: 'operator-agent-system',
      target: options.target,
      candidate,
      candidateGate,
      contentGate,
      sourceGate,
      usefulnessGate: usefulGate,
      decision,
      preReceiptPath,
      outcome: 'blocked',
      validationResults: [],
      nextDecision: 'operator adjusts candidate, target, rollback, or validation before retry',
    };
  }

  if (!contentGate.ok && !options.dryRun) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'patch',
      loop: 'operator-agent-system',
      target: options.target,
      candidate,
      candidateGate,
      contentGate,
      sourceGate,
      usefulnessGate: usefulGate,
      decision,
      preReceiptPath,
      dryRun: options.dryRun,
      passed: false,
      outcome: 'content-blocked',
      validationResults: [],
      rollback: candidate.rollback,
      nextDecision: 'revise candidate patch content or keep as dry-run evidence only',
    };
  }

  if (!sourceGate.ok && !options.dryRun) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'patch',
      loop: 'operator-agent-system',
      target: options.target,
      candidate,
      candidateGate,
      contentGate,
      sourceGate,
      usefulnessGate: usefulGate,
      decision,
      preReceiptPath,
      dryRun: options.dryRun,
      passed: false,
      outcome: 'source-blocked',
      validationResults: [],
      rollback: candidate.rollback,
      nextDecision: 'revise candidate patch content with source-grounded anchors or keep as dry-run evidence only',
    };
  }

  if (!usefulGate.ok && !options.dryRun) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'patch',
      loop: 'operator-agent-system',
      target: options.target,
      candidate,
      candidateGate,
      contentGate,
      sourceGate,
      usefulnessGate: usefulGate,
      decision,
      preReceiptPath,
      dryRun: options.dryRun,
      passed: false,
      outcome: 'usefulness-blocked',
      validationResults: [],
      rollback: candidate.rollback,
      nextDecision: 'revise candidate patch content with a distinct source-grounded improvement or keep as dry-run evidence only',
    };
  }

  const patchResult = applyCandidatePatch(candidate, candidateGate.file, options);
  const validationResults = options.dryRun ? [] : runValidationCommands(candidate.validation, candidate.files);
  const validationPassed = validationResults.every((result) => result.ok);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'patch',
    loop: 'operator-agent-system',
    target: options.target,
    autonomyLevel: decision.autonomyLevel,
    candidate,
    candidateGate,
    contentGate,
    sourceGate,
    usefulnessGate: usefulGate,
    decision,
    preReceiptPath,
    dryRun: options.dryRun,
    patchResult,
    validationResults,
    passed: options.dryRun || validationPassed,
    outcome: options.dryRun ? 'dry-run' : validationPassed ? 'patched' : 'validation-failed',
    rollback: candidate.rollback,
    nextDecision: validationPassed
      ? 'review diff and promote, continue, or rollback'
      : 'inspect validation output and rollback or repair',
  };
}

function fileSha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function patchStageSummary(report, receiptPath) {
  return {
    receiptPath,
    candidateId: report.candidate?.id ?? null,
    candidateFile: report.candidate?.files?.[0] ?? null,
    dryRun: Boolean(report.dryRun),
    outcome: report.outcome,
    passed: report.passed ?? report.outcome !== 'blocked',
    changed: report.patchResult?.changed ?? false,
    patchNote: report.patchResult?.note ?? null,
    validation: (report.validationResults ?? []).map((result) => ({
      command: result.command,
      ok: result.ok,
      skipped: Boolean(result.skipped),
      summary: result.summary,
    })),
    blockers: {
      candidate: report.candidateGate?.blockers ?? [],
      policy: report.decision?.blockers ?? [],
      content: report.contentGate?.blockers ?? [],
      source: report.sourceGate?.blockers ?? [],
      usefulness: report.usefulnessGate?.blockers ?? [],
    },
  };
}

function runPatchStage(options, stageOptions) {
  const mergedOptions = { ...options, ...stageOptions, mode: 'patch' };
  const report = patch(mergedOptions);
  const receiptPath = writeReceipt(mergedOptions, report);
  return {
    report,
    summary: patchStageSummary(report, receiptPath),
  };
}

function rollbackProof(options) {
  if (!options.candidateFile) throw new Error('Rollback-proof mode requires --candidate-file.');
  if (!options.rollbackCandidateFile) throw new Error('Rollback-proof mode requires --rollback-candidate-file.');

  const forwardCandidate = loadCandidate(options);
  const rollbackCandidate = loadCandidate({
    ...options,
    candidateFile: options.rollbackCandidateFile,
    candidateId: options.rollbackCandidateId,
  });
  const file = forwardCandidate.files[0] ?? '';
  const rollbackFile = rollbackCandidate.files[0] ?? '';
  const setupBlockers = [];
  if (forwardCandidate.files.length !== 1) setupBlockers.push('Forward candidate must target exactly one file.');
  if (rollbackCandidate.files.length !== 1) setupBlockers.push('Rollback candidate must target exactly one file.');
  if (file !== rollbackFile) setupBlockers.push(`Rollback candidate must target the same file as the forward candidate: ${file} vs ${rollbackFile}`);
  if (!file || !fs.existsSync(file)) setupBlockers.push(`Target file does not exist: ${file}`);
  if (forwardCandidate.patch?.type !== 'exact-replace') setupBlockers.push('Forward candidate must use patch.type exact-replace.');
  if (rollbackCandidate.patch?.type !== 'exact-replace') setupBlockers.push('Rollback candidate must use patch.type exact-replace.');

  if (setupBlockers.length > 0) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'rollback-proof',
      loop: 'operator-agent-system',
      target: options.target,
      passed: false,
      outcome: 'blocked',
      setupBlockers,
      hashRestored: false,
      nextDecision: 'fix rollback-proof candidate pairing before writing',
    };
  }

  const beforeHash = fileSha256(file);
  const proofStageOptions = { ...options, rollbackProofGeneration: true };
  const forwardDryRun = runPatchStage(proofStageOptions, { dryRun: true });
  const stages = { forwardDryRun: forwardDryRun.summary };

  if (forwardDryRun.report.outcome !== 'dry-run' || !forwardDryRun.report.passed) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'rollback-proof',
      loop: 'operator-agent-system',
      target: options.target,
      file,
      forwardCandidateId: forwardCandidate.id,
      rollbackCandidateId: rollbackCandidate.id,
      hashes: { before: beforeHash, afterForward: beforeHash, afterRollback: beforeHash },
      hashRestored: true,
      passed: false,
      outcome: 'forward-dry-run-blocked',
      stages,
      receipts: { forwardDryRun: forwardDryRun.summary.receiptPath },
      nextDecision: 'fix forward candidate before attempting write',
    };
  }

  const forwardActual = runPatchStage(proofStageOptions, { dryRun: false });
  const afterForwardHash = fileSha256(file);
  stages.forwardActual = forwardActual.summary;

  const shouldRollback = Boolean(forwardActual.report.patchResult?.changed);
  if (!shouldRollback) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'rollback-proof',
      loop: 'operator-agent-system',
      target: options.target,
      file,
      forwardCandidateId: forwardCandidate.id,
      rollbackCandidateId: rollbackCandidate.id,
      hashes: { before: beforeHash, afterForward: afterForwardHash, afterRollback: afterForwardHash },
      hashRestored: afterForwardHash === beforeHash,
      passed: false,
      outcome: 'forward-write-did-not-change-file',
      stages,
      receipts: {
        forwardDryRun: forwardDryRun.summary.receiptPath,
        forwardActual: forwardActual.summary.receiptPath,
      },
      nextDecision: 'inspect forward candidate exact-replace search and retry',
    };
  }

  const rollbackBaseOptions = {
    ...proofStageOptions,
    candidateFile: options.rollbackCandidateFile,
    candidateId: options.rollbackCandidateId,
  };
  const rollbackDryRun = runPatchStage(rollbackBaseOptions, { dryRun: true });
  stages.rollbackDryRun = rollbackDryRun.summary;

  if (rollbackDryRun.report.outcome !== 'dry-run' || !rollbackDryRun.report.passed) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'rollback-proof',
      loop: 'operator-agent-system',
      target: options.target,
      file,
      forwardCandidateId: forwardCandidate.id,
      rollbackCandidateId: rollbackCandidate.id,
      hashes: { before: beforeHash, afterForward: afterForwardHash, afterRollback: afterForwardHash },
      hashRestored: false,
      passed: false,
      outcome: 'rollback-dry-run-blocked',
      stages,
      receipts: {
        forwardDryRun: forwardDryRun.summary.receiptPath,
        forwardActual: forwardActual.summary.receiptPath,
        rollbackDryRun: rollbackDryRun.summary.receiptPath,
      },
      nextDecision: 'manual rollback required; rollback candidate did not pass dry-run',
    };
  }

  const rollbackActual = runPatchStage(rollbackBaseOptions, { dryRun: false });
  const afterRollbackHash = fileSha256(file);
  stages.rollbackActual = rollbackActual.summary;
  const hashRestored = afterRollbackHash === beforeHash;
  const passed = Boolean(forwardActual.report.passed && rollbackActual.report.passed && hashRestored);

  return {
    generatedAt: new Date().toISOString(),
    mode: 'rollback-proof',
    loop: 'operator-agent-system',
    target: options.target,
    file,
    forwardCandidateId: forwardCandidate.id,
    rollbackCandidateId: rollbackCandidate.id,
    hashes: {
      before: beforeHash,
      afterForward: afterForwardHash,
      afterRollback: afterRollbackHash,
    },
    hashRestored,
    passed,
    outcome: passed ? 'rollback-proven' : hashRestored ? 'validation-failed-after-rollback' : 'rollback-not-restored',
    stages,
    receipts: {
      forwardDryRun: forwardDryRun.summary.receiptPath,
      forwardActual: forwardActual.summary.receiptPath,
      rollbackDryRun: rollbackDryRun.summary.receiptPath,
      rollbackActual: rollbackActual.summary.receiptPath,
    },
    nextDecision: passed
      ? 'review rollback-proof receipt before widening local write authority'
      : 'inspect receipts and keep authority bounded until rollback proof passes',
  };
}

const PROMOTION_STAGE_NAMES = ['promote', 'deploy', 'smoke', 'rollback', 'rollbackSmoke'];
const A4_COMMAND_PATTERN = /\b(client[- ]production|secret|credential|token|api[- ]key|private[- ]key|password|billing|account[- ]access|delete|destroy|drop[- ]table|truncate|rotate[- ]key|data[- ]migration)\b/i;

function promotionCommandGate(command, stage) {
  const blockers = [];
  if (!Array.isArray(command) || command.length < 2 || !command.every((entry) => typeof entry === 'string' && entry.trim())) {
    return { ok: false, blockers: [`${stage} commands must be nonempty argv arrays.`] };
  }
  const [executable, ...args] = command;
  const text = command.join(' ');
  if (command.some((entry) => entry.includes('\0') || entry.includes('\n') || entry.includes('\r'))) {
    blockers.push(`${stage} command contains a control character.`);
  }
  if (A4_COMMAND_PATTERN.test(text)) blockers.push(`${stage} command crosses an A4 protected boundary.`);
  if (args.some((arg) => ['--force', '--force-with-lease', '--hard', '--admin'].includes(arg))) {
    blockers.push(`${stage} command contains a destructive or force flag.`);
  }
  if (executable === 'node') {
    const script = args[0] === '--check' || args[0] === '--test' ? args[1] : args[0];
    if (!script || !/^scripts\/(?:test\/)?operator-agent-[A-Za-z0-9_.-]+\.mjs$/.test(script)) {
      blockers.push(`${stage} node command must target an allowlisted operator-agent script.`);
    }
  } else if (executable === 'pnpm') {
    if (args.includes('exec') || !new RegExp(stage === 'rollbackSmoke' ? 'rollback|smoke|verify' : stage, 'i').test(text)) {
      blockers.push(`${stage} pnpm command must invoke a stage-named package script without pnpm exec.`);
    }
  } else if (executable === 'corepack') {
    if (args[0] !== 'pnpm' || args.includes('exec') || !new RegExp(stage === 'rollbackSmoke' ? 'rollback|smoke|verify' : stage, 'i').test(text)) {
      blockers.push(`${stage} corepack command must invoke a stage-named pnpm script without pnpm exec.`);
    }
  } else if (executable === 'wrangler') {
    const expected = stage === 'rollback' ? 'rollback' : stage === 'deploy' ? 'deploy' : null;
    if (!expected || args[0] !== expected) blockers.push(`wrangler is only allowlisted for deploy or rollback stages.`);
  } else if (executable === 'gh') {
    if (stage !== 'promote' || args[0] !== 'pr' || !['create', 'checks', 'merge', 'view'].includes(args[1])) {
      blockers.push('gh is only allowlisted for pull-request promotion commands.');
    }
  } else if (executable === 'curl') {
    if (!['smoke', 'rollbackSmoke'].includes(stage) || !args.some((arg) => /^https:\/\//.test(arg))) {
      blockers.push('curl is only allowlisted for HTTPS smoke verification.');
    }
    if (args.some((arg) => ['-X', '--request', '-d', '--data', '--data-raw'].includes(arg))) {
      blockers.push('curl smoke verification must remain read-only.');
    }
  } else {
    blockers.push(`${stage} executable is not allowlisted: ${executable}`);
  }
  return { ok: blockers.length === 0, blockers };
}

function loadPromotionPacket(options, candidate) {
  const blockers = [];
  let packet = null;
  if (!options.promotionFile) {
    blockers.push('A3 internal production completion requires --promotion-file.');
    return { ok: false, blockers, packet };
  }
  try {
    packet = JSON.parse(fs.readFileSync(options.promotionFile, 'utf8'));
  } catch (error) {
    blockers.push(`Could not read promotion packet: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, blockers, packet };
  }
  if (packet.schemaVersion !== 'operator-agent-promotion.v1') blockers.push('Promotion packet schemaVersion must be operator-agent-promotion.v1.');
  if (!/^CRE-\d+$/.test(packet.linearIssue ?? '')) blockers.push('Promotion packet requires a Linear issue identifier.');
  if (packet.target !== INTERNAL_PRODUCTION_TARGET || packet.target !== options.target) {
    blockers.push(`Promotion packet target must match ${INTERNAL_PRODUCTION_TARGET}.`);
  }
  if (!['low', 'medium'].includes(packet.risk) || packet.risk !== candidate.risk) {
    blockers.push('Promotion packet risk must match the low or medium candidate risk.');
  }
  if (!String(packet.branch ?? '').startsWith('codex/')) blockers.push('Promotion branch must use the codex/ prefix.');
  if (packet.remote !== 'origin') blockers.push('Promotion remote must be origin.');
  if (!String(packet.commitMessage ?? '').includes(packet.linearIssue ?? '__missing__')) {
    blockers.push('Promotion commit message must include the Linear issue identifier.');
  }
  if (!packet.stages || typeof packet.stages !== 'object') blockers.push('Promotion packet requires stages.');
  for (const stage of PROMOTION_STAGE_NAMES) {
    const commands = packet.stages?.[stage];
    if (!Array.isArray(commands) || commands.length === 0) {
      blockers.push(`Promotion stage ${stage} requires at least one command.`);
      continue;
    }
    for (const command of commands) blockers.push(...promotionCommandGate(command, stage).blockers);
  }

  const branchResult = run('git', ['branch', '--show-current']);
  if (!branchResult.ok || branchResult.stdout.trim() !== packet.branch) {
    blockers.push(`Current branch must match promotion branch ${packet.branch}.`);
  }
  const tracked = run('git', ['ls-files', '--error-unmatch', '--', ...candidate.files]);
  if (!tracked.ok) blockers.push('A3 promotion only accepts already-tracked candidate files.');
  const remote = run('git', ['remote', 'get-url', packet.remote ?? 'origin']);
  if (!remote.ok || !remote.stdout.trim()) blockers.push('Promotion remote origin must exist.');
  const cwdReal = fs.realpathSync(process.cwd());
  const allowedDirty = new Set(
    [options.candidateFile, options.promotionFile]
      .filter(Boolean)
      .map((file) => {
        const real = fs.realpathSync(path.resolve(file));
        return path.relative(cwdReal, real).replaceAll('\\', '/');
      })
      .filter((file) => file && !file.startsWith('../'))
  );
  const status = run('git', ['status', '--porcelain']);
  const unexpectedDirty = status.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/^"|"$/g, ''))
    .filter((file) => !allowedDirty.has(file));
  if (!status.ok || unexpectedDirty.length > 0) {
    blockers.push(`A3 promotion requires an isolated clean worktree; unexpected paths: ${unexpectedDirty.join(', ') || 'status unavailable'}.`);
  }
  const decision = policyDecision({
    ...options,
    target: packet.target,
    risk: packet.risk,
    operation: 'deploy',
    reversible: true,
    rollback: 'execute promotion packet rollback and rollbackSmoke stages',
    validation: candidate.validation,
  });
  blockers.push(...decision.blockers);
  return { ok: blockers.length === 0, blockers, packet, decision };
}

function runPromotionCommands(commands) {
  return commands.map(([command, ...args]) => ({
    ...run(command, args, { timeoutMs: 300_000 }),
    skipped: false,
  }));
}

function promotionResultsPassed(results) {
  return results.length > 0 && results.every((result) => result.ok);
}

function a4CompletionReport(options, candidate, selection, stages, blockers, nextDecision) {
  return {
    generatedAt: new Date().toISOString(),
    mode: 'complete',
    loop: 'operator-agent-system',
    target: options.target,
    autonomyLevel: 'A4',
    candidate,
    selection,
    stages,
    escalation: { autonomyLevel: 'A4', blockers },
    terminalState: 'escalated',
    passed: false,
    outcome: 'escalated-a4',
    nextDecision,
  };
}

function runA3Promotion(options, candidate, selection, stages, promotionGate) {
  const packet = promotionGate.packet;
  stages.promotionGate = {
    ok: promotionGate.ok,
    linearIssue: packet.linearIssue,
    target: packet.target,
    risk: packet.risk,
    branch: packet.branch,
    policyDecision: promotionGate.decision,
  };
  stages.stage = run('git', ['add', '--', ...candidate.files]);
  if (!stages.stage.ok) {
    return a4CompletionReport(options, candidate, selection, stages, ['Could not stage the bounded candidate files.'], 'operator repairs the scoped git staging failure');
  }
  stages.commit = run('git', ['commit', '-m', packet.commitMessage, '--', ...candidate.files]);
  if (!stages.commit.ok) {
    return a4CompletionReport(options, candidate, selection, stages, ['Could not create the scoped promotion commit.'], 'operator inspects commit evidence before retrying');
  }
  stages.push = run('git', ['push', packet.remote, `HEAD:refs/heads/${packet.branch}`], { timeoutMs: 300_000 });
  if (!stages.push.ok) {
    return a4CompletionReport(options, candidate, selection, stages, ['Could not push the scoped promotion branch.'], 'operator inspects remote or branch protection before retrying');
  }

  stages.promote = runPromotionCommands(packet.stages.promote);
  if (!promotionResultsPassed(stages.promote)) {
    return a4CompletionReport(options, candidate, selection, stages, ['The review or merge promotion gate failed.'], 'operator inspects the failed promotion command before deployment');
  }
  stages.deploy = runPromotionCommands(packet.stages.deploy);
  if (!promotionResultsPassed(stages.deploy)) {
    return a4CompletionReport(options, candidate, selection, stages, ['Deployment did not complete cleanly; automatic rollback is unsafe because deployment state is ambiguous.'], 'operator inspects deployment state before any rollback');
  }
  stages.smoke = runPromotionCommands(packet.stages.smoke);
  if (promotionResultsPassed(stages.smoke)) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'complete',
      loop: 'operator-agent-system',
      target: options.target,
      autonomyLevel: 'A3',
      candidate,
      selection,
      stages,
      terminalState: 'completed',
      passed: true,
      outcome: 'completed-production',
      nextDecision: 'internal production work is deployed and live verification passed',
    };
  }

  stages.productionRollback = runPromotionCommands(packet.stages.rollback);
  stages.rollbackSmoke = promotionResultsPassed(stages.productionRollback)
    ? runPromotionCommands(packet.stages.rollbackSmoke)
    : [];
  const rollbackPassed = promotionResultsPassed(stages.productionRollback) && promotionResultsPassed(stages.rollbackSmoke);
  if (rollbackPassed) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'complete',
      loop: 'operator-agent-system',
      target: options.target,
      autonomyLevel: 'A3',
      candidate,
      selection,
      stages,
      terminalState: 'rolled-back',
      passed: true,
      outcome: 'production-smoke-failed-rolled-back',
      nextDecision: 'operator reviews the failed production smoke before a new promotion attempt',
    };
  }
  return a4CompletionReport(
    options,
    candidate,
    selection,
    stages,
    ['Production smoke failed and the recorded rollback could not be verified.'],
    'operator takes control of production recovery and verifies health'
  );
}

async function complete(options) {
  let completeOptions = { ...options };
  let selection = {
    source: 'candidate-file',
    task: options.task || null,
    candidatesConsidered: [],
  };

  if (!completeOptions.candidateFile) {
    if (!options.task.trim()) throw new Error('Complete mode requires --task or --candidate-file.');
    const scoutReport = await scout(options);
    const considered = [];
    for (const candidate of scoutReport.candidates) {
      const candidateFile = writeCandidateInput(options, candidate, `${candidate.id}-complete`);
      const preflight = patch({
        ...options,
        candidateFile,
        candidateId: candidate.id,
        dryRun: true,
        operation: 'patch',
      });
      considered.push({
        candidateId: candidate.id,
        candidateFile,
        writeAllowed: patchReportAllowsWrite(preflight),
        blockers: patchStageSummary(preflight, null).blockers,
      });
      if (patchReportAllowsWrite(preflight)) {
        completeOptions = { ...completeOptions, candidateFile, candidateId: candidate.id };
        break;
      }
    }
    selection = {
      source: 'scout',
      task: options.task,
      candidatesConsidered: considered,
      model: options.noModel ? null : options.model,
    };
    if (!completeOptions.candidateFile) {
      return {
        generatedAt: new Date().toISOString(),
        mode: 'complete',
        loop: 'operator-agent-system',
        target: options.target,
        autonomyLevel: 'A4',
        selection,
        stages: {},
        escalation: {
          autonomyLevel: 'A4',
          blockers: ['No scout candidate passed the bounded write gates.'],
        },
        terminalState: 'escalated',
        passed: false,
        outcome: 'escalated-a4',
        nextDecision: 'operator reviews candidate blockers or narrows the task and surface',
      };
    }
  }

  const candidate = loadCandidate(completeOptions);
  const promotionGate = options.target === INTERNAL_PRODUCTION_TARGET
    ? loadPromotionPacket(completeOptions, candidate)
    : null;
  if (promotionGate && !promotionGate.ok) {
    return a4CompletionReport(
      options,
      candidate,
      selection,
      { promotionGate: { ok: false, blockers: promotionGate.blockers } },
      promotionGate.blockers,
      'operator repairs the A3 promotion packet or protected-boundary evidence before Ornith retries'
    );
  }
  const file = candidate.files[0] ?? '';
  const before = file && fs.existsSync(file) ? fs.readFileSync(file) : null;
  const beforeHash = before === null ? null : createHash('sha256').update(before).digest('hex');
  const preflight = runPatchStage(completeOptions, { dryRun: true });
  const stages = { preflight: preflight.summary };

  if (preflight.report.outcome !== 'dry-run' || !preflight.report.passed) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'complete',
      loop: 'operator-agent-system',
      target: options.target,
      autonomyLevel: candidate.autonomyLevel,
      candidate,
      selection,
      stages,
      escalation: {
        autonomyLevel: 'A4',
        blockers: [
          ...(preflight.report.candidateGate?.blockers ?? []),
          ...(preflight.report.decision?.blockers ?? []),
          ...(preflight.report.contentGate?.blockers ?? []),
          ...(preflight.report.sourceGate?.blockers ?? []),
          ...(preflight.report.usefulnessGate?.blockers ?? []),
        ],
      },
      terminalState: 'escalated',
      passed: false,
      outcome: 'escalated-a4',
      nextDecision: 'operator resolves the preflight blockers before Ornith retries',
    };
  }

  const action = runPatchStage(completeOptions, { dryRun: false });
  stages.action = action.summary;
  if (action.report.outcome === 'patched' && action.report.passed) {
    if (promotionGate) return runA3Promotion(options, candidate, selection, stages, promotionGate);
    return {
      generatedAt: new Date().toISOString(),
      mode: 'complete',
      loop: 'operator-agent-system',
      target: options.target,
      autonomyLevel: candidate.autonomyLevel,
      candidate,
      selection,
      stages,
      terminalState: 'completed',
      passed: true,
      outcome: 'completed-local',
      nextDecision: 'work item is complete at the verified local boundary',
    };
  }

  if (before !== null && file && action.report.patchResult?.changed) {
    fs.writeFileSync(file, before);
    const afterRollbackHash = fileSha256(file);
    const rollbackValidation = runValidationCommands(candidate.validation, candidate.files);
    const rollbackPassed = afterRollbackHash === beforeHash && rollbackValidation.every((result) => result.ok);
    stages.rollback = {
      hashRestored: afterRollbackHash === beforeHash,
      beforeHash,
      afterRollbackHash,
      validation: rollbackValidation.map((result) => ({
        command: result.command,
        ok: result.ok,
        skipped: Boolean(result.skipped),
        summary: result.summary,
      })),
    };
    if (rollbackPassed) {
      return {
        generatedAt: new Date().toISOString(),
        mode: 'complete',
        loop: 'operator-agent-system',
        target: options.target,
        autonomyLevel: candidate.autonomyLevel,
        candidate,
        selection,
        stages,
        terminalState: 'rolled-back',
        passed: true,
        outcome: 'validation-failed-rolled-back',
        nextDecision: 'work item was not promoted; inspect failed validation before retrying',
      };
    }
  }
  return a4CompletionReport(
    options,
    candidate,
    selection,
    stages,
    [
      action.report.patchResult?.changed
        ? 'Candidate validation failed and the restored snapshot could not be verified.'
        : 'Candidate action did not reach a verified write state.',
    ],
    'operator inspects the failed action and rollback evidence before retrying'
  );
}

async function revise(options) {
  const candidate = loadCandidate(options);
  const candidateGate = validatePatchCandidate(candidate);
  const originalContentGate = contentQualityGate(candidate);
  const originalSourceGate = sourceGroundingGate(candidate);
  const originalUsefulnessGate = usefulnessGate(candidate);
  const revisionLineage = revisionLineageForCandidate(candidate);
  if (!revisionLineage.ok) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'revise',
      loop: 'operator-agent-system',
      target: options.target,
      originalCandidate: candidate,
      originalCandidateGate: candidateGate,
      originalContentGate,
      originalSourceGate,
      originalUsefulnessGate,
      revisionLineage,
      revisionModel: null,
      candidates: [],
      comparison: {
        blockersBefore: originalContentGate.blockers.length,
        blockersAfter: null,
        blockersResolved: false,
        sourceBlockersBefore: originalSourceGate.blockers.length,
        sourceBlockersAfter: null,
        sourceBlockersResolved: false,
        usefulnessBlockersBefore: originalUsefulnessGate.blockers.length,
        usefulnessBlockersAfter: null,
        usefulnessBlockersResolved: false,
        candidateGateOk: candidateGate.ok,
      },
      passed: false,
      outcome: 'revision-depth-blocked',
      nextDecision: 'open a new scout candidate or escalate to operator review instead of continuing this revision chain',
    };
  }
  const repair = await modelRevision(options, candidate, originalContentGate, originalSourceGate);
  const revisedCandidate = normalizeCandidate(
    {
      ...candidate,
      id: revisionLineage.nextId,
      title: `${baseRevisionTitle(candidate.title)} (revision ${revisionLineage.nextDepth})`,
      why: `${baseRevisionWhy(candidate.why)} Revision ${revisionLineage.nextDepth}: repaired append payload to satisfy operator-agent gates.`.trim(),
      revisionRootId: revisionLineage.rootId,
      parentCandidateId: revisionLineage.parentId,
      revisionDepth: revisionLineage.nextDepth,
      patch: {
        type: 'append-markdown',
        content: repair.content,
      },
    },
    0
  );
  const revisedCandidateGate = validatePatchCandidate(revisedCandidate);
  const revisedContentGate = contentQualityGate(revisedCandidate);
  const revisedSourceGate = sourceGroundingGate(revisedCandidate);
  const revisedUsefulnessGate = usefulnessGate(revisedCandidate);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'revise',
    loop: 'operator-agent-system',
    target: options.target,
    originalCandidate: candidate,
    originalCandidateGate: candidateGate,
    originalContentGate,
    originalSourceGate,
    originalUsefulnessGate,
    revisionLineage,
    revisionModel: options.noModel
      ? null
      : {
          model: options.model,
          baseUrl: options.baseUrl,
          ok: repair.ok,
          error: repair.error,
          raw: repair.raw?.slice(0, 2000),
        },
    revisedCandidate,
    revisedCandidateGate,
    revisedContentGate,
    revisedSourceGate,
    revisedUsefulnessGate,
    candidates: [revisedCandidate],
    comparison: {
      blockersBefore: originalContentGate.blockers.length,
      blockersAfter: revisedContentGate.blockers.length,
      blockersResolved: originalContentGate.blockers.length > 0 && revisedContentGate.ok,
      sourceBlockersBefore: originalSourceGate.blockers.length,
      sourceBlockersAfter: revisedSourceGate.blockers.length,
      sourceBlockersResolved: originalSourceGate.blockers.length > 0 && revisedSourceGate.ok,
      usefulnessBlockersBefore: originalUsefulnessGate.blockers.length,
      usefulnessBlockersAfter: revisedUsefulnessGate.blockers.length,
      usefulnessBlockersResolved: originalUsefulnessGate.blockers.length > 0 && revisedUsefulnessGate.ok,
      candidateGateOk: revisedCandidateGate.ok,
    },
    passed: revisedCandidateGate.ok && revisedContentGate.ok && revisedSourceGate.ok && revisedUsefulnessGate.ok,
    outcome:
      revisedCandidateGate.ok && revisedContentGate.ok && revisedSourceGate.ok && revisedUsefulnessGate.ok
        ? 'revised'
        : 'revision-blocked',
    nextDecision:
      revisedCandidateGate.ok && revisedContentGate.ok && revisedSourceGate.ok && revisedUsefulnessGate.ok
        ? 'feed revised candidate receipt into patch dry-run'
        : 'inspect revised blockers or retry with a narrower repair prompt',
  };
}

async function scout(options) {
  const files = listSurfaceFiles(options.surface, options.limit);
  const modelResult = options.noModel ? null : await modelCandidates(options, files);
  const rawCandidates =
    modelResult?.ok && modelResult.candidates.length > 0
      ? modelResult.candidates
      : deterministicCandidates(files);
  const candidates = rawCandidates.map(normalizeCandidate);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'scout',
    loop: 'operator-agent-system',
    autonomyLevel: 'A0',
    target: options.target,
    risk: 'low',
    surface: options.surface,
    model: options.noModel ? null : options.model,
    baseUrl: options.noModel ? null : options.baseUrl,
    timeoutMs: options.noModel ? null : options.timeoutMs,
    filesInspected: files,
    modelResult: modelResult
      ? { ok: modelResult.ok, error: modelResult.error, raw: modelResult.raw?.slice(0, 2000) }
      : { ok: false, error: 'model disabled' },
    candidates,
    nextDecision: 'operator selects one candidate for policy-gated patch or self-heal run',
  };
}

async function patternReview(options) {
  const files = readPatternReviewFiles(options);
  const coverage = patternSourceCoverage(files);
  const modelResult = options.noModel ? null : await modelPatternReview(options, files, coverage);
  const deterministicPayload = deterministicPatternReview(files, coverage);
  const modelSchemaGate = modelResult?.patternReview ? patternReviewGate(modelResult.patternReview, files) : null;
  let repairResult = null;
  let repairSchemaGate = null;
  let patternReviewPayload = deterministicPayload;
  let patternReviewSource = options.noModel ? 'deterministic' : 'deterministic-fallback';

  if (modelResult?.patternReview && modelSchemaGate?.ok) {
    patternReviewPayload = modelResult.patternReview;
    patternReviewSource = 'model';
  } else if (modelResult?.patternReview && !options.noModel) {
    repairResult = await modelPatternReviewRepair(options, modelResult.patternReview, modelSchemaGate, coverage, files);
    repairSchemaGate = repairResult?.patternReview ? patternReviewGate(repairResult.patternReview, files) : null;
    if (repairResult?.patternReview && repairSchemaGate?.ok) {
      patternReviewPayload = repairResult.patternReview;
      patternReviewSource = 'model-repair';
    }
  }

  const gate = patternReviewGate(patternReviewPayload, files);
  const unresolvedModelGate =
    Boolean(modelResult?.patternReview) && !modelSchemaGate?.ok && !repairSchemaGate?.ok;
  const missingConcepts = coverage.filter((entry) => !entry.present);
  const passed = gate.ok && missingConcepts.length === 0 && !unresolvedModelGate;
  return {
    generatedAt: new Date().toISOString(),
    mode: 'pattern-review',
    loop: 'operator-agent-system',
    autonomyLevel: 'A0',
    target: options.target,
    model: options.noModel ? null : options.model,
    baseUrl: options.noModel ? null : options.baseUrl,
    timeoutMs: options.noModel ? null : options.timeoutMs,
    patternReviewScope: options.patternReviewScope,
    patternReviewLimit: options.patternReviewLimit,
    filesInspected: files.map((entry) => ({
      file: entry.file,
      exists: entry.exists,
      headings: entry.headings,
    })),
    sourceCoverage: coverage,
    modelResult: modelResult
      ? {
          ok: modelResult.ok,
          error: modelResult.error,
          raw: modelResult.raw?.slice(0, 2000),
          schemaGate: modelSchemaGate,
        }
      : { ok: false, error: 'model disabled' },
    repairResult: repairResult
      ? {
          ok: repairResult.ok,
          error: repairResult.error,
          raw: repairResult.raw?.slice(0, 2000),
          schemaGate: repairSchemaGate,
        }
      : null,
    patternReviewSource,
    fallbackUsed: patternReviewSource === 'deterministic' || patternReviewSource === 'deterministic-fallback',
    patternReview: patternReviewPayload,
    patternReviewGate: gate,
    passed,
    outcome: passed ? 'pattern-reviewed' : 'pattern-review-blocked',
    nextDecision:
      passed
        ? 'use pattern-review receipt as local model context before scout or batch-eval runs'
        : 'repair missing canonical pattern docs or tighten the pattern-review prompt before delegation',
  };
}

async function batchEval(options) {
  const scoutReport = await scout(options);
  const runs = [];
  const scorecard = {
    candidatesProposed: scoutReport.candidates.length,
    modelScoutOk: Boolean(scoutReport.modelResult?.ok),
    modelParseFailures: scoutReport.modelResult?.ok === false && !options.noModel ? 1 : 0,
    dryRunPatchAttempts: 0,
    initialWritesAllowed: 0,
    initialGateFailures: { candidate: 0, policy: 0, content: 0, source: 0, usefulness: 0 },
    revisionsAttempted: 0,
    revisionsPassed: 0,
    revisionDepthBlocked: 0,
    modelRevisionFailures: 0,
    postRevisionDryRunAttempts: 0,
    postRevisionWritesAllowed: 0,
    writesPerformed: 0,
  };

  for (const candidate of scoutReport.candidates) {
    const candidateFile = writeCandidateInput(options, candidate, candidate.id);
    const initialPatch = patch({
      ...options,
      candidateFile,
      candidateId: candidate.id,
      dryRun: true,
      operation: 'patch',
    });
    scorecard.dryRunPatchAttempts += 1;
    if (patchReportAllowsWrite(initialPatch)) scorecard.initialWritesAllowed += 1;
    addGateFailures(scorecard.initialGateFailures, patchGateFailures(initialPatch));

    const runRecord = {
      candidateId: candidate.id,
      candidateFile,
      initialPatch,
      revision: null,
      revisedPatch: null,
    };

    if (options.reviseBlocked && !patchReportAllowsWrite(initialPatch)) {
      scorecard.revisionsAttempted += 1;
      const revision = await revise({
        ...options,
        candidateFile,
        candidateId: candidate.id,
        operation: 'scout',
      });
      runRecord.revision = revision;
      if (revision.outcome === 'revision-depth-blocked') scorecard.revisionDepthBlocked += 1;
      if (revision.revisionModel && revision.revisionModel.ok === false) scorecard.modelRevisionFailures += 1;
      if (revision.passed) scorecard.revisionsPassed += 1;

      const revisedCandidate = revision.candidates?.[0];
      if (revisedCandidate) {
        const revisedCandidateFile = writeCandidateInput(options, revisedCandidate, revisedCandidate.id);
        const revisedPatch = patch({
          ...options,
          candidateFile: revisedCandidateFile,
          candidateId: revisedCandidate.id,
          dryRun: true,
          operation: 'patch',
        });
        runRecord.revisedCandidateFile = revisedCandidateFile;
        runRecord.revisedPatch = revisedPatch;
        scorecard.postRevisionDryRunAttempts += 1;
        if (patchReportAllowsWrite(revisedPatch)) scorecard.postRevisionWritesAllowed += 1;
      }
    }

    runs.push(runRecord);
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: 'batch-eval',
    loop: 'operator-agent-system',
    target: options.target,
    surface: options.surface,
    limit: options.limit,
    model: options.noModel ? null : options.model,
    baseUrl: options.noModel ? null : options.baseUrl,
    timeoutMs: options.noModel ? null : options.timeoutMs,
    reviseBlocked: options.reviseBlocked,
    scout: scoutReport,
    scorecard,
    runs,
    passed: true,
    outcome: 'evaluated',
    nextDecision: 'inspect scorecard before widening write authority or model autonomy',
  };
}

function receiptDirsForMemoryProposal(options) {
  const dirs = options.memoryReceiptDirs.length > 0 ? options.memoryReceiptDirs : [options.outDir, DEFAULT_SCHEDULE_OUT_DIR];
  return [...new Set(dirs.filter(Boolean))];
}

function receiptSummary(filePath, payload) {
  const relPath = path.relative(process.cwd(), filePath) || filePath;
  const scorecard = payload.scorecard ?? null;
  const completionAudit = payload.evidence?.completionAudit ?? payload.completionAudit ?? null;
  return {
    path: relPath,
    generatedAt: payload.generatedAt ?? null,
    mode: payload.mode ?? 'unknown',
    outcome: payload.outcome ?? null,
    passed: typeof payload.passed === 'boolean' ? payload.passed : null,
    model: payload.model ?? payload.bestModel?.model ?? payload.latestModelBenchmark?.bestModel?.model ?? null,
    patternReviewSource: payload.patternReviewSource ?? scorecard?.patternReviewSource ?? null,
    modelHealth: payload.modelHealth ?? scorecard?.modelHealth ?? null,
    writesPerformed: scorecard?.writesPerformed ?? scorecard?.batchEvalWritesPerformed ?? payload.writesPerformed ?? null,
    completionVerdict: completionAudit?.verdict ?? payload.completionVerdict ?? null,
    publicReady: completionAudit?.publicReady ?? payload.publicReady ?? null,
    modelBackedReady: completionAudit?.modelBackedReady ?? payload.modelBackedReady ?? null,
    latestBenchmark: payload.bestModel ?? payload.latestModelBenchmark?.report?.bestModel ?? null,
  };
}

function receiptMemoryPriority(payload) {
  if (!payload) return 0;
  if (payload.mode === 'model-benchmark') return 90;
  if (payload.mode === 'schedule-once') return 80;
  if (payload.evidence?.completionAudit || payload.completionAudit) return 75;
  if (payload.mode === 'pattern-review') return 70;
  if (payload.mode === 'batch-eval') return 65;
  if (/access|cloudflare/i.test(String(payload.mode)) || payload.publicBlockers || payload.accessPreflight) return 60;
  return 10;
}

function readRecentReceipts(options) {
  const receipts = [];
  for (const dir of receiptDirsForMemoryProposal(options)) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(dir, entry.name));
    for (const filePath of entries) {
      try {
        const stat = fs.statSync(filePath);
        const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        receipts.push({
          filePath,
          mtimeMs: stat.mtimeMs,
          payload,
          summary: receiptSummary(filePath, payload),
        });
      } catch (error) {
        receipts.push({
          filePath,
          mtimeMs: 0,
          payload: null,
          summary: {
            path: path.relative(process.cwd(), filePath) || filePath,
            mode: 'unreadable',
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }
  receipts.sort((left, right) => {
    const priorityDiff = receiptMemoryPriority(right.payload) - receiptMemoryPriority(left.payload);
    if (priorityDiff !== 0) return priorityDiff;
    return right.mtimeMs - left.mtimeMs || left.filePath.localeCompare(right.filePath);
  });
  return receipts.slice(0, options.memoryReceiptLimit);
}

function addMemoryProposal(proposals, proposal) {
  const normalizedNote = proposal.note.replace(/\s+/g, ' ').trim().toLowerCase();
  if (proposals.some((entry) => entry.normalizedNote === normalizedNote)) return;
  proposals.push({
    id: `memory-candidate-${String(proposals.length + 1).padStart(3, '0')}`,
    type: 'memory-update-proposal',
    target: proposal.target ?? 'operator-agent durable context',
    title: proposal.title,
    note: proposal.note,
    evidenceReceipts: proposal.evidenceReceipts,
    confidence: proposal.confidence ?? 0.75,
    writeBack: 'operator-controlled; no memory store mutation performed by this command',
    normalizedNote,
  });
}

function proposalsFromReceipt(receipt, proposals) {
  const payload = receipt.payload;
  if (!payload) return;
  const source = receipt.summary.path;
  if (payload.mode === 'model-benchmark' && payload.bestModel) {
    const passRate = Math.round((payload.bestModel.passRate ?? 0) * 100);
    addMemoryProposal(proposals, {
      title: `Local model benchmark: ${payload.bestModel.model}`,
      note: `${payload.bestModel.model} benchmarked at ${passRate}% strict-JSON pass rate with average latency ${payload.bestModel.averageLatencyMs ?? 'unknown'}ms; use this receipt before changing local executor authority.`,
      evidenceReceipts: [source],
      confidence: payload.passed ? 0.86 : 0.72,
    });
  }

  if (payload.mode === 'schedule-once' && payload.scorecard) {
    const scorecard = payload.scorecard;
    addMemoryProposal(proposals, {
      title: 'Regular operator-agent heartbeat evidence',
      note: `Latest schedule-once receipt reported modelHealth=${scorecard.modelHealth ?? 'unknown'}, patternReview=${scorecard.patternReviewPassed ? 'passed' : 'blocked'}, modelScoutOk=${scorecard.modelScoutOk === true}, and writesPerformed=${scorecard.writesPerformed ?? scorecard.batchEvalWritesPerformed ?? 'unknown'}.`,
      evidenceReceipts: [source],
      confidence: 0.8,
    });
  }

  if (payload.mode === 'pattern-review') {
    const missingCoverage = (payload.sourceCoverage ?? []).filter((entry) => !entry.present).map((entry) => entry.id ?? entry.label);
    addMemoryProposal(proposals, {
      title: 'Pattern-review context baseline',
      note: `Pattern review used ${payload.patternReviewSource ?? 'unknown'} source with scope=${payload.patternReviewScope ?? 'unknown'} and ${missingCoverage.length === 0 ? 'complete required source coverage' : `missing coverage: ${missingCoverage.join(', ')}`}.`,
      evidenceReceipts: [source],
      confidence: missingCoverage.length === 0 ? 0.82 : 0.62,
    });
  }

  if (payload.mode === 'batch-eval' && payload.scorecard) {
    addMemoryProposal(proposals, {
      title: 'Batch-eval authority evidence',
      note: `Batch eval proposed ${payload.scorecard.candidatesProposed ?? 0} candidates, allowed ${payload.scorecard.initialWritesAllowed ?? 0} initial dry-run writes, allowed ${payload.scorecard.postRevisionWritesAllowed ?? 0} post-revision dry-run writes, and performed ${payload.scorecard.writesPerformed ?? 0} writes.`,
      evidenceReceipts: [source],
      confidence: 0.78,
    });
  }

  const completionAudit = payload.evidence?.completionAudit ?? payload.completionAudit;
  if (completionAudit) {
    const blocked = (completionAudit.items ?? []).filter((item) => item.status !== 'proven').map((item) => item.id);
    addMemoryProposal(proposals, {
      title: 'Operator-agent completion audit state',
      note: `Completion audit verdict=${completionAudit.verdict ?? 'unknown'} with ${completionAudit.proven ?? 'unknown'}/${completionAudit.total ?? 'unknown'} requirements proven; remaining blockers: ${blocked.join(', ') || 'none'}.`,
      evidenceReceipts: [source],
      confidence: blocked.length === 0 ? 0.86 : 0.8,
    });
  }

  if (/access|cloudflare/i.test(String(payload.mode)) || payload.publicBlockers || payload.accessPreflight) {
    const blockers = payload.publicBlockers ?? payload.accessPreflight?.blockers ?? payload.blockers ?? [];
    addMemoryProposal(proposals, {
      title: 'Public Access gate evidence',
      note: `Public operator-agent access remains ${blockers.length > 0 ? `blocked by ${blockers.join('; ')}` : 'ready by the inspected receipt'}; do not expose write tools publicly from this evidence alone.`,
      evidenceReceipts: [source],
      confidence: blockers.length > 0 ? 0.78 : 0.7,
    });
  }
}

function memoryProposal(options) {
  const receipts = readRecentReceipts(options);
  const proposals = [];
  for (const receipt of receipts) proposalsFromReceipt(receipt, proposals);
  for (const proposal of proposals) delete proposal.normalizedNote;
  return {
    generatedAt: new Date().toISOString(),
    mode: 'memory-proposal',
    loop: 'operator-agent-system',
    autonomyLevel: 'A0',
    target: options.target,
    receiptDirs: receiptDirsForMemoryProposal(options),
    receiptLimit: options.memoryReceiptLimit,
    receiptsInspected: receipts.map((receipt) => receipt.summary),
    proposals,
    mutation: {
      writesPerformed: 0,
      memoryStoreMutated: false,
      reason: 'memory updates remain explicit operator-controlled artifacts',
    },
    passed: true,
    outcome: 'memory-proposed',
    nextDecision:
      proposals.length > 0
        ? 'operator reviews proposals and promotes durable context through the normal memory-update path if useful'
        : 'run benchmark, schedule, pattern-review, or audit first so memory proposals have receipt evidence',
  };
}

function handoff(options) {
  const decision = policyDecision(options);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'handoff',
    loop: 'operator-agent-system',
    decision,
    receiptTemplate: {
      Loop: 'operator-agent-system',
      Mode: 'handoff',
      'Autonomy level': decision.autonomyLevel,
      Target: decision.target,
      Risk: decision.risk,
      Policy: decision.policyArtifact,
      Verification: options.validation.join('; ') || 'not supplied',
      Rollback: options.rollback || 'not supplied',
      'Next decision': decision.allowed ? 'execute bounded run' : 'operator approval required',
    },
  };
}

function writeReceipt(options, report) {
  fs.mkdirSync(options.outDir, { recursive: true });
  const stamp = `${new Date().toISOString().replaceAll(':', '-').replace('.', '-')}-${randomUUID().slice(0, 8)}`;
  const label = [report.mode, report.decision?.target ?? report.target ?? options.target, report.decision?.operation ?? options.operation]
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9_.-]/g, '-');
  const filePath = path.join(options.outDir, `${stamp}-${label}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

function printReport(options, report, receiptPath) {
  if (options.json) {
    console.log(JSON.stringify({ ...report, receiptPath }, null, 2));
    return;
  }
  console.log(`# operator-agent-system`);
  console.log(`Mode: ${report.mode}`);
  if ('passed' in report) console.log(`Result: ${report.passed ? 'passed' : 'blocked'}`);
  if (report.decision) console.log(`Policy: ${report.decision.allowed ? 'allowed' : 'blocked'} (${report.decision.autonomyLevel})`);
  if (report.candidates) console.log(`Candidates: ${report.candidates.length}`);
  if (report.scorecard) {
    console.log(`Candidates proposed: ${report.scorecard.candidatesProposed}`);
    console.log(`Initial writes allowed: ${report.scorecard.initialWritesAllowed}`);
    console.log(`Revisions attempted: ${report.scorecard.revisionsAttempted}`);
    console.log(`Post-revision writes allowed: ${report.scorecard.postRevisionWritesAllowed}`);
  }
  if (report.sourceCoverage) {
    const missing = report.sourceCoverage.filter((entry) => !entry.present).map((entry) => entry.label);
    console.log(`Pattern review coverage: ${missing.length === 0 ? 'complete' : `missing ${missing.join(', ')}`}`);
  }
  if (report.patternReviewSource) console.log(`Pattern review source: ${report.patternReviewSource}`);
  if (report.mode === 'model-benchmark' && report.bestModel) {
    console.log(`Best model: ${report.bestModel.model}`);
    console.log(`Pass rate: ${Math.round(report.bestModel.passRate * 100)}%`);
  }
  if (report.mode === 'memory-proposal') {
    console.log(`Receipts inspected: ${report.receiptsInspected.length}`);
    console.log(`Memory proposals: ${report.proposals.length}`);
  }
  console.log(`Receipt: ${receiptPath}`);
  if (report.decision?.blockers?.length) {
    console.log('\n## Blockers');
    for (const blocker of report.decision.blockers) console.log(`- ${blocker}`);
  }
  if (report.candidateGate?.blockers?.length) {
    console.log('\n## Candidate blockers');
    for (const blocker of report.candidateGate.blockers) console.log(`- ${blocker}`);
  }
  if (report.contentGate?.blockers?.length) {
    console.log('\n## Content blockers');
    for (const blocker of report.contentGate.blockers) console.log(`- ${blocker}`);
  }
  if (report.sourceGate?.blockers?.length) {
    console.log('\n## Source blockers');
    for (const blocker of report.sourceGate.blockers) console.log(`- ${blocker}`);
  }
  if (report.usefulnessGate?.blockers?.length) {
    console.log('\n## Usefulness blockers');
    for (const blocker of report.usefulnessGate.blockers) console.log(`- ${blocker}`);
  }
  if (report.revisionLineage?.blockers?.length) {
    console.log('\n## Revision blockers');
    for (const blocker of report.revisionLineage.blockers) console.log(`- ${blocker}`);
  }
  if (report.patternReviewGate?.blockers?.length) {
    console.log('\n## Pattern review blockers');
    for (const blocker of report.patternReviewGate.blockers) console.log(`- ${blocker}`);
  }
  if (report.patchResult) console.log(`Patch: ${report.patchResult.note}`);
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  let report;
  if (options.mode === 'readiness') report = readiness(options);
  else if (options.mode === 'profiles') {
    report = { generatedAt: new Date().toISOString(), mode: 'profiles', subAgents: SUB_AGENTS };
  } else if (options.mode === 'policy') {
    report = { generatedAt: new Date().toISOString(), mode: 'policy', decision: policyDecision(options) };
  } else if (options.mode === 'handoff') report = handoff(options);
  else if (options.mode === 'patch') report = patch(options);
  else if (options.mode === 'complete') report = await complete(options);
  else if (options.mode === 'rollback-proof') report = rollbackProof(options);
  else if (options.mode === 'revise') report = await revise(options);
  else if (options.mode === 'batch-eval') report = await batchEval(options);
  else if (options.mode === 'pattern-review') report = await patternReview(options);
  else if (options.mode === 'model-probe') report = await modelProbe(options);
  else if (options.mode === 'model-benchmark') report = await modelBenchmark(options);
  else if (options.mode === 'memory-proposal') report = memoryProposal(options);
  else report = await scout(options);

  const receiptPath = writeReceipt(options, report);
  printReport(options, report, receiptPath);
  if (report.passed === false || report.decision?.allowed === false || report.outcome === 'blocked') process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
