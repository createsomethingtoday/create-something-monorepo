#!/usr/bin/env node

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CLAIMS_PATH = resolve(ROOT, 'docs/thesis/claims.yaml');
const DEFAULT_REPORT_PATH = resolve(ROOT, 'docs/CREATE_SOMETHING_SYSTEMS_THESIS_EVIDENCE.generated.md');

const VALID_COMMANDS = new Set(['check', 'generate', 'validate']);
const VALID_STATUSES = new Set(['supported', 'partial', 'unproven', 'contradicted', 'stale']);
const VALID_RELATIONS = new Set([
  'supports',
  'implements',
  'tests',
  'illustrates',
  'contradicts',
  'stale',
]);
const VALID_TYPES = new Set(['file', 'directory', 'package', 'command', 'commit', 'pr']);
const VALID_TIERS = new Set(['database', 'automation', 'judgment']);

const command = (process.argv[2] ?? 'check').trim().toLowerCase();

if (!VALID_COMMANDS.has(command)) {
  console.error('Usage: node scripts/thesis-evidence.mjs [check|generate|validate]');
  process.exit(2);
}

const { claimsFile, errors } = loadAndValidateClaims();

if (errors.length > 0) {
  console.error('Thesis evidence validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const reportPath = resolveRepoPath(
  typeof claimsFile.generated_report === 'string' ? claimsFile.generated_report : relativeToRoot(DEFAULT_REPORT_PATH)
);
const generatedReport = renderReport(claimsFile);

if (command === 'validate') {
  console.log(`Thesis evidence validation passed (${claimsFile.claims.length} claim(s)).`);
  process.exit(0);
}

if (command === 'generate') {
  writeFileSync(reportPath, generatedReport, 'utf8');
  console.log(`Wrote ${relativeToRoot(reportPath)}`);
  process.exit(0);
}

if (!isFileContentEqual(reportPath, generatedReport)) {
  console.error('Thesis evidence report is out of date:');
  console.error(`- ${relativeToRoot(reportPath)}`);
  console.error('Run: pnpm thesis:evidence:generate');
  process.exit(1);
}

console.log(`Thesis evidence check passed (${claimsFile.claims.length} claim(s)).`);

function loadAndValidateClaims() {
  const errors = [];

  if (!existsSync(CLAIMS_PATH)) {
    return {
      claimsFile: { claims: [] },
      errors: [`Required file missing: ${relativeToRoot(CLAIMS_PATH)}`],
    };
  }

  let claimsFile;
  try {
    claimsFile = parseYaml(readFileSync(CLAIMS_PATH, 'utf8'));
  } catch (error) {
    return {
      claimsFile: { claims: [] },
      errors: [`Invalid YAML in ${relativeToRoot(CLAIMS_PATH)}: ${formatError(error)}`],
    };
  }

  if (!isPlainObject(claimsFile)) {
    return {
      claimsFile: { claims: [] },
      errors: [`${relativeToRoot(CLAIMS_PATH)} must contain a YAML object.`],
    };
  }

  if (claimsFile.version !== 1) {
    errors.push('version must be 1.');
  }
  if (typeof claimsFile.title !== 'string' || claimsFile.title.trim().length === 0) {
    errors.push('title is required.');
  }
  if (typeof claimsFile.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(claimsFile.updated)) {
    errors.push('updated must be a YYYY-MM-DD string.');
  }
  if (typeof claimsFile.source_thesis !== 'string') {
    errors.push('source_thesis is required.');
  } else {
    validateRepoPath(claimsFile.source_thesis, 'source_thesis', errors, 'file');
  }
  if (typeof claimsFile.generated_report !== 'string') {
    errors.push('generated_report is required.');
  } else {
    validatePathInsideRepo(claimsFile.generated_report, 'generated_report', errors);
  }
  if (!Array.isArray(claimsFile.claims) || claimsFile.claims.length === 0) {
    errors.push('claims must be a non-empty array.');
  }

  const ids = new Set();
  for (const [index, claim] of asArray(claimsFile.claims).entries()) {
    validateClaim(claim, index, ids, errors);
  }

  return {
    claimsFile,
    errors,
  };
}

function validateClaim(claim, index, ids, errors) {
  const label = `claims[${index}]`;

  if (!isPlainObject(claim)) {
    errors.push(`${label} must be an object.`);
    return;
  }

  if (!isIdentifier(claim.id)) {
    errors.push(`${label}.id must be a dotted lowercase identifier.`);
  } else if (ids.has(claim.id)) {
    errors.push(`${label}.id duplicates ${claim.id}.`);
  } else {
    ids.add(claim.id);
  }

  requireText(claim.title, `${label}.title`, errors);
  requireText(claim.claim, `${label}.claim`, errors);

  if (!VALID_STATUSES.has(claim.status)) {
    errors.push(`${label}.status must be one of ${joinSet(VALID_STATUSES)}.`);
  }

  if (!Array.isArray(claim.tier) || claim.tier.length === 0) {
    errors.push(`${label}.tier must be a non-empty array.`);
  } else {
    for (const tier of claim.tier) {
      if (!VALID_TIERS.has(tier)) {
        errors.push(`${label}.tier contains unsupported tier "${String(tier)}".`);
      }
    }
  }

  if (!Array.isArray(claim.burden_of_proof) || claim.burden_of_proof.length === 0) {
    errors.push(`${label}.burden_of_proof must be a non-empty array.`);
  }
  if (!Array.isArray(claim.falsification) || claim.falsification.length === 0) {
    errors.push(`${label}.falsification must be a non-empty array.`);
  }
  if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) {
    errors.push(`${label}.evidence must be a non-empty array.`);
    return;
  }

  const evidenceIds = new Set();
  let hasSupportingEvidence = false;
  for (const [evidenceIndex, evidence] of claim.evidence.entries()) {
    const relation = validateEvidence(evidence, `${label}.evidence[${evidenceIndex}]`, evidenceIds, errors);
    if (['supports', 'implements', 'tests'].includes(relation)) {
      hasSupportingEvidence = true;
    }
  }

  if (!hasSupportingEvidence) {
    errors.push(`${label}.evidence must include at least one supports, implements, or tests relation.`);
  }
}

function validateEvidence(evidence, label, ids, errors) {
  if (!isPlainObject(evidence)) {
    errors.push(`${label} must be an object.`);
    return undefined;
  }

  if (!isSlug(evidence.id)) {
    errors.push(`${label}.id must be a lowercase slug.`);
  } else if (ids.has(evidence.id)) {
    errors.push(`${label}.id duplicates ${evidence.id}.`);
  } else {
    ids.add(evidence.id);
  }

  if (!VALID_TYPES.has(evidence.type)) {
    errors.push(`${label}.type must be one of ${joinSet(VALID_TYPES)}.`);
  }
  if (!VALID_RELATIONS.has(evidence.relation)) {
    errors.push(`${label}.relation must be one of ${joinSet(VALID_RELATIONS)}.`);
  }
  requireText(evidence.note, `${label}.note`, errors);

  if (['file', 'directory', 'package'].includes(evidence.type)) {
    if (typeof evidence.path !== 'string' || evidence.path.trim().length === 0) {
      errors.push(`${label}.path is required for ${evidence.type} evidence.`);
    } else {
      validateRepoPath(evidence.path, `${label}.path`, errors, evidence.type);
      validateAnchors(evidence, label, errors);
    }
  }

  if (evidence.type === 'command') {
    requireText(evidence.command, `${label}.command`, errors);
  }

  if (evidence.type === 'commit') {
    if (typeof evidence.commit !== 'string' || !/^[a-f0-9]{7,40}$/u.test(evidence.commit)) {
      errors.push(`${label}.commit must be a 7-40 character git SHA.`);
    }
  }

  if (evidence.type === 'pr') {
    if (!Number.isInteger(evidence.number) || evidence.number < 1) {
      errors.push(`${label}.number must be a positive integer.`);
    }
  }

  return evidence.relation;
}

function validateAnchors(evidence, label, errors) {
  if (evidence.anchors === undefined) {
    return;
  }
  if (!Array.isArray(evidence.anchors)) {
    errors.push(`${label}.anchors must be an array when provided.`);
    return;
  }
  if (evidence.type !== 'file') {
    errors.push(`${label}.anchors are only supported for file evidence.`);
    return;
  }

  const absolutePath = resolveRepoPath(evidence.path);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return;
  }

  const content = readFileSync(absolutePath, 'utf8');
  for (const anchor of evidence.anchors) {
    if (typeof anchor !== 'string' || anchor.trim().length === 0) {
      errors.push(`${label}.anchors entries must be non-empty strings.`);
      continue;
    }
    if (!content.includes(anchor)) {
      errors.push(`${label}.anchors includes text not found in ${evidence.path}: ${anchor}`);
    }
  }
}

function validateRepoPath(repoPath, label, errors, expectedKind) {
  const absolutePath = validatePathInsideRepo(repoPath, label, errors);
  if (!absolutePath || !existsSync(absolutePath)) {
    errors.push(`${label} does not exist: ${repoPath}`);
    return;
  }

  const stat = statSync(absolutePath);
  if (expectedKind === 'file' && !stat.isFile()) {
    errors.push(`${label} must point to a file: ${repoPath}`);
  }
  if (expectedKind === 'directory' && !stat.isDirectory()) {
    errors.push(`${label} must point to a directory: ${repoPath}`);
  }
  if (expectedKind === 'package') {
    if (!stat.isDirectory()) {
      errors.push(`${label} must point to a package directory: ${repoPath}`);
    } else if (!existsSync(resolve(absolutePath, 'package.json')) && !existsSync(resolve(absolutePath, 'README.md'))) {
      errors.push(`${label} package evidence must contain package.json or README.md: ${repoPath}`);
    }
  }
}

function validatePathInsideRepo(repoPath, label, errors) {
  if (typeof repoPath !== 'string' || repoPath.trim().length === 0) {
    errors.push(`${label} must be a non-empty path.`);
    return undefined;
  }
  if (repoPath.startsWith('/') || repoPath.includes('\0')) {
    errors.push(`${label} must be a relative repo path: ${repoPath}`);
    return undefined;
  }
  const absolutePath = resolveRepoPath(repoPath);
  const relativePath = relative(ROOT, absolutePath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath === '') {
    errors.push(`${label} must stay inside the repo: ${repoPath}`);
    return undefined;
  }
  return absolutePath;
}

function renderReport(claimsFile) {
  const lines = [];
  const counts = countStatuses(claimsFile.claims);

  lines.push('# CREATE SOMETHING Systems Thesis Evidence');
  lines.push('');
  lines.push('> Generated from `docs/thesis/claims.yaml`. Do not edit this file directly.');
  lines.push('> Update claims and citations in the source YAML, then run `pnpm thesis:evidence:generate`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source thesis: \`${claimsFile.source_thesis}\``);
  lines.push(`- Claim set updated: ${claimsFile.updated}`);
  lines.push(`- Total claims: ${claimsFile.claims.length}`);
  for (const status of [...VALID_STATUSES]) {
    if ((counts.get(status) ?? 0) > 0) {
      lines.push(`- ${status}: ${counts.get(status)}`);
    }
  }
  lines.push('');
  lines.push('## How To Read This');
  lines.push('');
  lines.push('Each claim has a status, burden of proof, repo-local evidence, falsification tests, and open questions. File, directory, package, and anchor citations are validated by `pnpm thesis:evidence:check`. Command evidence is listed as operational verification to run when refreshing a claim; the checker does not execute arbitrary commands by default.');
  lines.push('');
  lines.push('Status meanings:');
  lines.push('');
  for (const [status, description] of Object.entries(claimsFile.statuses ?? {})) {
    lines.push(`- \`${status}\`: ${description}`);
  }
  lines.push('');
  lines.push('Relation meanings:');
  lines.push('');
  for (const [relation, description] of Object.entries(claimsFile.relations ?? {})) {
    lines.push(`- \`${relation}\`: ${description}`);
  }
  lines.push('');
  lines.push('## Claims');
  lines.push('');

  for (const claim of claimsFile.claims) {
    lines.push(`### ${claim.title}`);
    lines.push('');
    lines.push(`- id: \`${claim.id}\``);
    lines.push(`- status: \`${claim.status}\``);
    lines.push(`- tier: ${claim.tier.map((tier) => `\`${tier}\``).join(', ')}`);
    lines.push('');
    lines.push(claim.claim.trim());
    lines.push('');
    lines.push('Burden of proof:');
    lines.push('');
    for (const item of claim.burden_of_proof) {
      lines.push(`- ${item}`);
    }
    lines.push('');
    lines.push('Evidence:');
    lines.push('');
    for (const evidence of claim.evidence) {
      lines.push(renderEvidenceLine(evidence));
    }
    lines.push('');
    lines.push('Falsification tests:');
    lines.push('');
    for (const item of claim.falsification) {
      lines.push(`- ${item}`);
    }
    lines.push('');
    if (Array.isArray(claim.open_questions) && claim.open_questions.length > 0) {
      lines.push('Open questions:');
      lines.push('');
      for (const item of claim.open_questions) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function renderEvidenceLine(evidence) {
  const parts = [`- \`${evidence.relation}\``, `\`${evidence.type}\``];
  if (evidence.path) {
    parts.push(`\`${evidence.path}\``);
  }
  if (evidence.command) {
    parts.push(`\`${evidence.command}\``);
  }
  if (evidence.commit) {
    parts.push(`\`${evidence.commit}\``);
  }
  if (evidence.number) {
    parts.push(`#${evidence.number}`);
  }
  parts.push(`- ${evidence.note}`);

  if (Array.isArray(evidence.anchors) && evidence.anchors.length > 0) {
    parts.push(`Anchors: ${evidence.anchors.map((anchor) => `\`${anchor}\``).join('; ')}`);
  }

  return parts.join(' ');
}

function countStatuses(claims) {
  const counts = new Map();
  for (const claim of claims) {
    counts.set(claim.status, (counts.get(claim.status) ?? 0) + 1);
  }
  return counts;
}

function requireText(value, label, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${label} is required.`);
  }
}

function resolveRepoPath(repoPath) {
  return resolve(ROOT, repoPath);
}

function relativeToRoot(path) {
  return relative(ROOT, path);
}

function isFileContentEqual(path, content) {
  if (!existsSync(path)) {
    return false;
  }
  return readFileSync(path, 'utf8') === content;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isIdentifier(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/u.test(value);
}

function isSlug(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/u.test(value);
}

function joinSet(set) {
  return [...set].map((value) => `"${value}"`).join(', ');
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
