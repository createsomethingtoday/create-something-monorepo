#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const packageRoot = path.resolve(scriptDir, '..');

export const CANON_DEBT_SCOPES = ['src/routes/admin/security'];

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');
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

export function auditCanonDebt(files = discoverCanonDebtFiles()) {
  const findings = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');

    for (const rule of CANON_DEBT_RULES) {
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

export function discoverCanonDebtFiles(scopes = CANON_DEBT_SCOPES) {
  return scopes
    .flatMap((scope) => walkSvelteFiles(path.join(packageRoot, scope)))
    .sort((a, b) => a.localeCompare(b));
}

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

function packageRelative(file) {
  return path.relative(packageRoot, file).replaceAll(path.sep, '/');
}

function positionForIndex(source, index) {
  const before = source.slice(0, index);
  const lines = before.split('\n');

  return {
    line: lines.length,
    column: lines.at(-1).length + 1
  };
}
