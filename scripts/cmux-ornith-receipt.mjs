#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_CACHE_DIR = '.cache/operator-agent-system';
const BATCH_RECEIPT_SUFFIX = 'batch-eval-local-scout.json';

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    receipt: null,
    cacheDir: DEFAULT_CACHE_DIR,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--receipt' && next) options.receipt = argv[++index];
    else if (arg === '--cache-dir' && next) options.cacheDir = argv[++index];
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function usage() {
  return `Usage:
  pnpm cmux:ornith:receipt [--receipt <path>] [--json]

Reviews a receipt-backed Ornith batch-eval result. This command does not patch,
revise, or approve work; it only summarizes the operator-agent receipt for Codex
or operator review.
`;
}

function findLatestBatchEvalReceipt(cacheDir = DEFAULT_CACHE_DIR, cwd = process.cwd()) {
  const resolvedDir = path.resolve(cwd, cacheDir);
  const entries = fs
    .readdirSync(resolvedDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(BATCH_RECEIPT_SUFFIX))
    .map((entry) => {
      const receiptPath = path.join(resolvedDir, entry.name);
      return {
        path: receiptPath,
        mtimeMs: fs.statSync(receiptPath).mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (entries.length === 0) {
    throw new Error(`No *-${BATCH_RECEIPT_SUFFIX} receipts found in ${resolvedDir}`);
  }

  return entries[0].path;
}

function readJsonFile(filePath, cwd = process.cwd()) {
  const resolvedPath = path.resolve(cwd, filePath);
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
}

function listText(value) {
  if (Array.isArray(value)) return value.length === 0 ? 'none' : value.join(', ');
  if (value === undefined || value === null || value === '') return 'none';
  return String(value);
}

function summarizeRun(run) {
  const patch = run.initialPatch || run.revisedPatch || {};
  const candidate = patch.candidate || {};
  const decision = patch.decision || {};
  const gates = {
    candidate: patch.candidateGate?.ok ?? null,
    content: patch.contentGate?.ok ?? null,
    source: patch.sourceGate?.ok ?? null,
    usefulness: patch.usefulnessGate?.ok ?? null,
  };
  const blockers = [
    ...(patch.candidateGate?.blockers || []),
    ...(patch.contentGate?.blockers || []),
    ...(patch.sourceGate?.blockers || []),
    ...(patch.usefulnessGate?.blockers || []),
    ...(decision.blockers || []),
  ];

  return {
    candidateId: run.candidateId || candidate.id || 'unknown',
    candidateFile: run.candidateFile || null,
    title: candidate.title || 'untitled candidate',
    files: candidate.files || [],
    risk: candidate.risk || patch.risk || null,
    autonomyLevel: candidate.autonomyLevel || patch.autonomyLevel || null,
    why: candidate.why || null,
    proposedAction: candidate.proposedAction || null,
    validation: candidate.validation || decision.validation || [],
    rollback: candidate.rollback || patch.rollback || decision.rollback || null,
    gates,
    blockers,
    allowed: decision.allowed ?? null,
    dryRun: patch.dryRun ?? null,
    passed: patch.passed ?? null,
    outcome: patch.outcome || null,
    patchResult: patch.patchResult || null,
    preReceiptPath: patch.preReceiptPath || null,
    revised: Boolean(run.revision || run.revisedPatch),
  };
}

function summarizeReceipt(receipt, receiptPath = null) {
  const runs = Array.isArray(receipt.runs) ? receipt.runs.map(summarizeRun) : [];
  return {
    receiptPath,
    generatedAt: receipt.generatedAt || null,
    mode: receipt.mode || null,
    loop: receipt.loop || null,
    target: receipt.target || null,
    surface: receipt.surface || receipt.scout?.surface || null,
    limit: receipt.limit ?? null,
    model: receipt.model || receipt.scout?.model || null,
    passed: receipt.passed ?? null,
    outcome: receipt.outcome || null,
    nextDecision: receipt.nextDecision || receipt.scout?.nextDecision || null,
    scorecard: receipt.scorecard || null,
    modelScoutOk: receipt.scout?.modelResult?.ok ?? null,
    filesInspected: receipt.scout?.filesInspected || [],
    runs,
  };
}

function formatBool(value) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

function formatMarkdownSummary(summary) {
  const lines = [
    '# Ornith Receipt Review',
    '',
    `- Receipt: ${summary.receiptPath || 'unknown'}`,
    `- Generated: ${summary.generatedAt || 'unknown'}`,
    `- Surface: ${summary.surface || 'unknown'}`,
    `- Mode: ${summary.mode || 'unknown'}`,
    `- Passed: ${formatBool(summary.passed)}`,
    `- Outcome: ${summary.outcome || 'unknown'}`,
    `- Model scout ok: ${formatBool(summary.modelScoutOk)}`,
    `- Files inspected: ${listText(summary.filesInspected)}`,
    '',
  ];

  if (summary.scorecard) {
    lines.push('## Scorecard', '');
    for (const [key, value] of Object.entries(summary.scorecard)) {
      lines.push(`- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
    lines.push('');
  }

  lines.push('## Candidates', '');
  if (summary.runs.length === 0) {
    lines.push('No candidate runs found in this receipt.', '');
  } else {
    for (const run of summary.runs) {
      lines.push(
        `### ${run.candidateId}`,
        '',
        `- Title: ${run.title}`,
        `- Files: ${listText(run.files)}`,
        `- Risk: ${run.risk || 'unknown'}`,
        `- Autonomy: ${run.autonomyLevel || 'unknown'}`,
        `- Allowed by receipt: ${formatBool(run.allowed)}`,
        `- Dry run: ${formatBool(run.dryRun)}`,
        `- Passed: ${formatBool(run.passed)}`,
        `- Outcome: ${run.outcome || 'unknown'}`,
        `- Gates: candidate=${formatBool(run.gates.candidate)}, content=${formatBool(run.gates.content)}, source=${formatBool(run.gates.source)}, usefulness=${formatBool(run.gates.usefulness)}`,
        `- Blockers: ${listText(run.blockers)}`,
        `- Validation: ${listText(run.validation)}`,
        `- Rollback: ${run.rollback || 'unknown'}`,
        `- Candidate file: ${run.candidateFile || 'none'}`,
        `- Pre-receipt: ${run.preReceiptPath || 'none'}`,
        `- Patch note: ${run.patchResult?.note || 'none'}`,
        '',
      );
    }
  }

  lines.push(
    '## Review Boundary',
    '',
    '- This command only reads receipts.',
    '- Codex must inspect target files before asking Ornith for patch/revise.',
    '- Free-form visible chat is not evidence for promotion.',
    `- Next decision from receipt: ${summary.nextDecision || 'review candidate, continue, reject, or request a bounded patch'}`,
    '',
  );

  return lines.join('\n');
}

function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const receiptPath = options.receipt || findLatestBatchEvalReceipt(options.cacheDir);
  const receipt = readJsonFile(receiptPath);
  const summary = summarizeReceipt(receipt, path.relative(process.cwd(), path.resolve(receiptPath)));

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(formatMarkdownSummary(summary));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export {
  findLatestBatchEvalReceipt,
  formatMarkdownSummary,
  parseArgs,
  summarizeReceipt,
  summarizeRun,
};
