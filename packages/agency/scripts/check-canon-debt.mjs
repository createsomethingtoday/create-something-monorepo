#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * @typedef {{ id: string; pattern: RegExp; message: string }} CanonDebtRule
 * @typedef {{ file: string; line: number; column: number; rule: string; text: string; message: string }} CanonDebtFinding
 * @typedef {{ strategy: 'changed-files' | 'explicit-files'; base?: string; files?: string[] }} CanonDebtPilotSelection
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const packageRoot = path.resolve(scriptDir, '..');

export const CANON_DEBT_SCOPES = ['src/routes/admin/security'];

/** @type {readonly CanonDebtRule[]} */
const CANON_DEBT_RULES = [
  {
    id: 'hardcoded-rgba',
    pattern: /rgba?\([^)]+\)/gi,
    message: 'Use a Canon color token instead of a raw rgba()/rgb() value.'
  },
  {
    id: 'hardcoded-hex',
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
    message: 'Use a Canon color token instead of a raw hex value.'
  },
  {
    id: 'hardcoded-transition-timing',
    pattern:
      /\b(?:transition|animation):[^;]*(?:\b\d+(?:\.\d+)?m?s\b|(?<!-)\bease(?:-out|-in|-in-out)?\b)/gi,
    message: 'Use Canon duration and easing tokens for transitions and animations.'
  }
];

/** Rules under calibration; keep them out of the enforcing check until the pilot is measured. */
export const CANON_DEBT_PILOT_RULES = [
  ...CANON_DEBT_RULES,
  {
    id: 'hardcoded-shadow',
    pattern: /\bbox-shadow\s*:(?!\s*(?:var\([^;]+|none)\s*;)\s*[^;]+;/gi,
    message: 'Use a Canon shadow token instead of a raw box-shadow value.'
  }
];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.pilot) {
    const files =
      args.files.length > 0
        ? resolvePilotFiles(args.files)
        : discoverChangedCanonDebtFiles(args.base);
    const report = createCanonDebtPilotReport(files, {
      strategy: args.files.length > 0 ? 'explicit-files' : 'changed-files',
      ...(args.files.length > 0 ? {} : { base: args.base })
    });

    console.log(JSON.stringify(report, null, 2));
  } else {
    const json = args.json;
  const findings = auditCanonDebt();

    if (json) {
      console.log(
        JSON.stringify({ ok: findings.length === 0, scopes: CANON_DEBT_SCOPES, findings }, null, 2)
      );
    } else if (findings.length > 0) {
      console.error('Canon debt check failed:');
      for (const finding of findings) {
        console.error(
          `- ${finding.file}:${finding.line}:${finding.column} ${finding.rule} ${JSON.stringify(finding.text)}`
        );
        console.error(`  ${finding.message}`);
      }
    } else {
      console.log(
        `Canon debt check passed across ${discoverCanonDebtFiles().length} file(s): ${CANON_DEBT_SCOPES.join(', ')}`
      );
    }

    if (findings.length > 0) {
      process.exit(1);
    }
  }
}

/** @param {string[]} argv */
function parseCliArgs(argv) {
  const files = [];
  let pilot = false;
  let json = false;
  let base = 'origin/main';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--pilot') {
      pilot = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--base') {
      const value = argv[index + 1];
      if (!value) throw new Error('--base requires a git ref.');
      base = value;
      index += 1;
    } else if (arg === '--file') {
      const value = argv[index + 1];
      if (!value) throw new Error('--file requires a package-relative Svelte file.');
      files.push(value);
      index += 1;
    }
  }

  return { base, files, json, pilot };
}

/**
 * @param {string[]} [files]
 * @returns {CanonDebtFinding[]}
 */
export function auditCanonDebt(files = discoverCanonDebtFiles(), rules = CANON_DEBT_RULES) {
  /** @type {CanonDebtFinding[]} */
  const findings = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');

    for (const rule of rules) {
      const matches = source.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));

      for (const match of matches) {
        const index = match.index ?? 0;
        const position = positionForIndex(source, index);
        findings.push({
          file: packageRelative(file),
          line: position.line,
          column: position.column,
          rule: rule.id,
          text: match[0],
          message: rule.message
        });
      }
    }
  }

  return findings.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.rule.localeCompare(b.rule);
  });
}

/**
 * Warning-only report for a caller-selected changed-file slice. This must remain
 * separate from the enforcing Canon debt guard until signal/noise is measured.
 *
 * @param {string[]} files
 * @param {CanonDebtPilotSelection} selection
 */
export function createCanonDebtPilotReport(files, selection) {
  const findings = auditCanonDebt(files, CANON_DEBT_PILOT_RULES);
  const findingsByRule = Object.fromEntries(
    [...new Set(findings.map((finding) => finding.rule))]
      .sort((a, b) => a.localeCompare(b))
      .map((rule) => [rule, findings.filter((finding) => finding.rule === rule).length])
  );

  return {
    format: 'canon-debt-pilot/v1',
    mode: 'warning',
    blocking: false,
    selection: {
      strategy: selection.strategy,
      ...(selection.base ? { base: selection.base } : {}),
      files: files.map(packageRelative).sort((a, b) => a.localeCompare(b))
    },
    summary: {
      filesScanned: files.length,
      findings: findings.length,
      findingsByRule
    },
    findings
  };
}

/**
 * @param {string} base
 * @returns {string[]}
 */
export function discoverChangedCanonDebtFiles(base = 'origin/main') {
  const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: packageRoot,
    encoding: 'utf8'
  }).trim();
  const packagePath = path.relative(repositoryRoot, packageRoot);
  const output = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMR', base, '--', packagePath],
    { cwd: repositoryRoot, encoding: 'utf8' }
  );

  return output
    .split('\n')
    .filter(Boolean)
    .map((file) => path.resolve(repositoryRoot, file))
    .filter((file) => file.endsWith('.svelte') && isWithinPackage(file) && existsSync(file))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * @param {readonly string[]} [scopes]
 * @returns {string[]}
 */
export function discoverCanonDebtFiles(scopes = CANON_DEBT_SCOPES) {
  return scopes
    .flatMap((scope) => walkSvelteFiles(path.join(packageRoot, scope)))
    .sort((a, b) => a.localeCompare(b));
}

/** @param {string[]} files @returns {string[]} */
function resolvePilotFiles(files) {
  return files
    .map((file) => path.resolve(packageRoot, file))
    .filter((file) => {
      if (!file.endsWith('.svelte') || !isWithinPackage(file) || !existsSync(file)) {
        throw new Error(`--file must name an existing package-relative Svelte file: ${file}`);
      }
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

/** @param {string} file */
function isWithinPackage(file) {
  const relative = path.relative(packageRoot, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** @param {string} root @returns {string[]} */
function walkSvelteFiles(root) {
  if (!existsSync(root)) return [];

  const files = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkSvelteFiles(fullPath));
    } else if (entry.endsWith('.svelte')) {
      files.push(fullPath);
    }
  }

  return files;
}

/** @param {string} file @returns {string} */
function packageRelative(file) {
  return path.relative(packageRoot, file).replaceAll(path.sep, '/');
}

/** @param {string} source @param {number} index @returns {{ line: number; column: number }} */
function positionForIndex(source, index) {
  const before = source.slice(0, index);
  const lines = before.split('\n');

  return {
    line: lines.length,
    column: (lines.at(-1) ?? '').length + 1
  };
}
