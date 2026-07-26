#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

import {
  agencyActiveFiles,
  agencyOverlayFiles,
  agencyOverlayRules,
  autoExcludedPrefixes,
  controlledOwnedTermsByPrefix,
  contextualRules,
  deterministicRules,
  prosePolicy,
  reviewRules,
  stePolicy,
  supportedProseExtensions
} from './rules.mjs';

const repoRoot = process.cwd();

function usage(message) {
  if (message) console.error(message);
  console.error(
    'Usage: node scripts/prose-quality/index.mjs <check|audit> [file...] [--changed-from ref] [--profile agency-ste] [--scope agency-active] [--format text|json]'
  );
  process.exit(2);
}

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  if (mode !== 'check' && mode !== 'audit') usage('Mode must be check or audit.');

  const files = [];
  let format = 'text';
  let changedFrom = null;
  let profile = null;
  let scope = null;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--') continue;
    if (arg === '--format') {
      format = rest[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--format=')) {
      format = arg.slice('--format='.length);
      continue;
    }
    if (arg === '--changed-from') {
      changedFrom = rest[index + 1];
      if (!changedFrom) usage('Missing value after --changed-from.');
      index += 1;
      continue;
    }
    if (arg.startsWith('--changed-from=')) {
      changedFrom = arg.slice('--changed-from='.length);
      continue;
    }
    if (arg === '--profile') {
      profile = rest[index + 1];
      if (!profile) usage('Missing value after --profile.');
      index += 1;
      continue;
    }
    if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length);
      continue;
    }
    if (arg === '--scope') {
      scope = rest[index + 1];
      if (!scope) usage('Missing value after --scope.');
      index += 1;
      continue;
    }
    if (arg.startsWith('--scope=')) {
      scope = arg.slice('--scope='.length);
      continue;
    }
    if (arg === '--help' || arg === '-h') usage();
    if (arg.startsWith('-')) usage(`Unknown option: ${arg}`);
    files.push(arg);
  }

  if (format !== 'text' && format !== 'json') usage('Format must be text or json.');
  if (profile !== null && profile !== 'agency-ste') {
    usage(`Unsupported profile: ${profile}`);
  }
  if (scope !== null && scope !== 'agency-active') {
    usage(`Unsupported scope: ${scope}`);
  }
  if (files.length > 0 && changedFrom) {
    usage('Use explicit files or --changed-from, not both.');
  }
  if (scope && (files.length > 0 || changedFrom)) {
    usage('Use --scope without explicit files or --changed-from.');
  }

  return { mode, files, format, changedFrom, profile, scope };
}

function positionAt(source, offset) {
  const prefix = source.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines.at(-1).length + 1
  };
}

function repoRelative(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    usage(result.stderr.trim() || `git ${args.join(' ')} failed.`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isAutoIncluded(file) {
  const normalized = file.split(path.sep).join('/').replace(/^\.\//, '');
  if (autoExcludedPrefixes.some((prefix) => normalized.startsWith(prefix))) return false;
  return supportedProseExtensions.has(path.extname(normalized));
}

function resolveSelection({ mode, files, changedFrom, scope }) {
  if (scope === 'agency-active') {
    return {
      baseline: null,
      scope,
      files: [...agencyActiveFiles].map(repoRelative).sort()
    };
  }

  if (files.length > 0) return { baseline: null, files };

  if (changedFrom || mode === 'check') {
    const baseline = changedFrom ?? 'origin/main';
    const changed = runGit(['diff', '--name-only', '--diff-filter=ACMR', baseline, '--']);
    const untracked = runGit(['ls-files', '--others', '--exclude-standard']);
    return {
      baseline,
      files: [...new Set([...changed, ...untracked])]
        .filter(isAutoIncluded)
        .filter((file) => existsSync(path.resolve(repoRoot, file)))
        .sort()
    };
  }

  return {
    baseline: null,
    files: runGit(['ls-files'])
      .filter(isAutoIncluded)
      .filter((file) => existsSync(path.resolve(repoRoot, file)))
      .sort()
  };
}

function countTerms(source, terms, excludedTerms = new Set()) {
  return terms.filter((term) => {
    if (excludedTerms.has(term)) return false;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(source);
  }).length;
}

function controlledOwnedTerms(file) {
  for (const [prefix, terms] of Object.entries(controlledOwnedTermsByPrefix)) {
    if (file.startsWith(prefix)) return terms;
  }
  return new Set();
}

function parseIgnoredRanges(source, file) {
  const rule = prosePolicy.configuration_rules[0];
  const markerPattern = /<!--\s*prose-ignore-(start|end)(?:\s*:\s*([\s\S]*?))?\s*-->/g;
  const findings = [];
  const ranges = [];
  let open = null;

  function finding(match, message) {
    const { line, column } = positionAt(source, match.index);
    findings.push({
      file,
      line,
      column,
      rule: rule.id,
      severity: rule.severity,
      message,
      suggestion: rule.suggestion,
      excerpt: match[0]
    });
  }

  for (const match of source.matchAll(markerPattern)) {
    const [, kind, rawReason] = match;
    if (kind === 'start') {
      if (open) {
        finding(match, 'Nested prose-ignore-start markers are not supported.');
        continue;
      }
      open = { match, start: match.index };
      if (!rawReason?.trim()) {
        finding(match, 'A prose-ignore-start marker requires a teaching-example reason.');
      }
      continue;
    }

    if (!open) {
      finding(match, 'A prose-ignore-end marker has no matching prose-ignore-start marker.');
      continue;
    }

    ranges.push([open.start, match.index + match[0].length]);
    open = null;
  }

  if (open) {
    finding(open.match, 'A prose-ignore-start marker has no matching prose-ignore-end marker.');
    ranges.push([open.start, source.length]);
  }

  let masked = source;
  for (const [start, end] of ranges.toReversed()) {
    const range = source.slice(start, end).replace(/[^\r\n]/g, ' ');
    masked = `${masked.slice(0, start)}${range}${masked.slice(end)}`;
  }

  return { findings, masked };
}

function resolveContentProfile(source, absoluteFile, requestedProfile) {
  if (requestedProfile !== 'agency-ste') return null;

  const explicit = source.match(
    /<!--\s*prose-profile:\s*(procedure|description|brand-heading|exact-content)\s*-->/i
  )?.[1];
  if (explicit) return explicit.toLowerCase();
  if (agencyActiveFiles.has(absoluteFile)) return stePolicy.scope.default_public_profile;
  return null;
}

function reviewSentences(source, file, contentProfile = null) {
  const findings = [];
  const sentencePattern = /[^.!?\n]+[.!?]/g;

  for (const match of source.matchAll(sentencePattern)) {
    const excerpt = match[0].trim();
    const leadingWhitespace = match[0].length - match[0].trimStart().length;
    const { line, column } = positionAt(source, match.index + leadingWhitespace);
    const prose = excerpt.replace(/`[^`]*`/g, ' ').replace(/<[^>]*>/g, ' ');
    const words = prose.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];

    const steProfile = contentProfile ? stePolicy.content_profiles[contentProfile] : null;
    const steMaxWords = steProfile?.automatic_enforcement ? steProfile.max_words : null;
    const longSentence = reviewRules.longSentence;
    if (steMaxWords !== null && words.length > steMaxWords) {
      findings.push({
        file,
        line,
        column,
        rule: `ste/${contentProfile}-sentence-length`,
        severity: 'error',
        message: `This ${contentProfile} sentence has ${words.length} words; the STE-aligned limit is ${steMaxWords}.`,
        suggestion:
          contentProfile === 'procedure'
            ? 'Write one instruction in 20 words or fewer.'
            : 'Split the description so each sentence has 25 words or fewer.',
        excerpt
      });
    } else if (steMaxWords === null && !steProfile && words.length > longSentence.maxWords) {
      findings.push({
        file,
        line,
        column,
        rule: longSentence.id,
        severity: longSentence.severity,
        message: `This sentence has ${words.length} words; use the count as a review signal, not proof of poor writing.`,
        suggestion: longSentence.suggestion,
        excerpt
      });
    }

    const abstraction = reviewRules.abstractionDensity;
    const abstractionCount = countTerms(prose, abstraction.terms);
    if (abstractionCount >= abstraction.minTerms) {
      findings.push({
        file,
        line,
        column,
        rule: abstraction.id,
        severity: abstraction.severity,
        message: `This sentence contains ${abstractionCount} abstract terms; inspect whether the reader can picture the work.`,
        suggestion: abstraction.suggestion,
        excerpt
      });
    }

    const owned = reviewRules.ownedTermCluster;
    const ownedCount = countTerms(prose, owned.terms, controlledOwnedTerms(file));
    if (ownedCount >= owned.minTerms) {
      findings.push({
        file,
        line,
        column,
        rule: owned.id,
        severity: owned.severity,
        message: `This sentence contains ${ownedCount} owned terms; inspect whether their local meaning is clear.`,
        suggestion: owned.suggestion,
        excerpt
      });
    }
  }

  return findings;
}

function auditSource(source, relativeFile, absoluteFile, requestedProfile = null) {
  const ignored = parseIgnoredRanges(source, relativeFile);
  const lintableSource = ignored.masked;
  const findings = [...ignored.findings];

  const usesAgencyOverlay =
    agencyOverlayFiles.has(absoluteFile) ||
    relativeFile.startsWith('packages/agency/test/fixtures/prose-quality/');
  const activeDeterministicRules = usesAgencyOverlay
    ? [...deterministicRules, ...agencyOverlayRules]
    : deterministicRules;

  for (const rule of activeDeterministicRules) {
    for (const match of lintableSource.matchAll(rule.pattern)) {
      const { line, column } = positionAt(lintableSource, match.index);
      findings.push({
        file: relativeFile,
        line,
        column,
        rule: rule.id,
        severity: rule.severity,
        message: `Replace "${match[0]}" with a specific, verifiable description.`,
        suggestion: rule.suggestion,
        excerpt: match[0]
      });
    }
  }

  for (const rule of contextualRules) {
    for (const match of lintableSource.matchAll(rule.pattern)) {
      const { line, column } = positionAt(lintableSource, match.index);
      findings.push({
        file: relativeFile,
        line,
        column,
        rule: rule.id,
        severity: rule.severity,
        message: `Review whether "${match[0]}" is precise in context; this term is not a deterministic failure.`,
        suggestion: rule.suggestion,
        excerpt: match[0]
      });
    }
  }

  const contentProfile = resolveContentProfile(lintableSource, absoluteFile, requestedProfile);
  findings.push(...reviewSentences(lintableSource, relativeFile, contentProfile));

  return findings.sort((left, right) => left.line - right.line || left.column - right.column);
}

function auditFile(file, requestedProfile = null) {
  const absoluteFile = path.resolve(repoRoot, file);
  if (!statSync(absoluteFile).isFile()) usage(`Not a file: ${file}`);
  return auditSource(
    readFileSync(absoluteFile, 'utf8'),
    repoRelative(absoluteFile),
    absoluteFile,
    requestedProfile
  );
}

function baselineFindings(baseline, file, requestedProfile = null) {
  const result = spawnSync('git', ['show', `${baseline}:${file}`], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) return [];

  const absoluteFile = path.resolve(repoRoot, file);
  return auditSource(result.stdout, file, absoluteFile, requestedProfile);
}

function findingSignature(finding) {
  return `${finding.rule}\u0000${finding.severity}\u0000${finding.excerpt.toLocaleLowerCase()}`;
}

function introducedFindings(current, baseline) {
  const baselineCounts = new Map();
  for (const finding of baseline) {
    const signature = findingSignature(finding);
    baselineCounts.set(signature, (baselineCounts.get(signature) ?? 0) + 1);
  }

  return current.filter((finding) => {
    const signature = findingSignature(finding);
    const remaining = baselineCounts.get(signature) ?? 0;
    if (remaining === 0) return true;
    baselineCounts.set(signature, remaining - 1);
    return false;
  });
}

function buildReport(mode, selection, profile) {
  const findings = selection.files.flatMap((file) => {
    const current = auditFile(file, profile);
    if (!selection.baseline) return current;
    return introducedFindings(current, baselineFindings(selection.baseline, file, profile));
  });
  const blocking = findings.filter((finding) => finding.severity === 'error').length;
  const review = findings.length - blocking;

  return {
    version: 1,
    policy: {
      id: prosePolicy.policy_id,
      version: prosePolicy.version
    },
    mode,
    ...(profile ? { profile } : {}),
    selection: selection.scope
      ? { kind: 'scope', scope: selection.scope }
      : selection.baseline
        ? { kind: 'changed', baseline: selection.baseline }
        : { kind: 'explicit-or-full' },
    status: blocking > 0 ? 'block' : review > 0 ? 'review' : 'pass',
    summary: {
      files: selection.files.length,
      findings: findings.length,
      blocking,
      review
    },
    findings
  };
}

function renderText(report) {
  console.log(`Prose ${report.mode}: ${report.status}`);
  console.log(
    `${report.summary.files} file(s), ${report.summary.blocking} blocking, ${report.summary.review} review`
  );
  for (const finding of report.findings) {
    console.log(
      `${finding.file}:${finding.line}:${finding.column} [${finding.severity}] ${finding.rule} ${finding.message}`
    );
    console.log(`  ${finding.suggestion}`);
  }
}

const parsed = parseArgs(process.argv.slice(2));
const selection = resolveSelection(parsed);
const report = buildReport(parsed.mode, selection, parsed.profile);

if (parsed.format === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  renderText(report);
}

if (parsed.mode === 'check' && report.summary.blocking > 0) {
  process.exitCode = 1;
}
