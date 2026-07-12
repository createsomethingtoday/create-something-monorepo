#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const retiredProvider = ['cl', 'erk'].join('');
const standaloneProvider = new RegExp(`(^|[^a-z0-9_])${retiredProvider}([^a-z0-9_]|$)`, 'i');

export function findRetiredIdentityProviderReferences(value) {
  const text = String(value);
  const lower = text.toLowerCase();
  const matches = [];
  if (lower.includes(`@${retiredProvider}`)) matches.push('package scope');
  if (text.includes(`${retiredProvider.toUpperCase()}_`)) matches.push('environment prefix');
  if (lower.includes(`${retiredProvider}.createsomething`)) matches.push('hosted domain');
  if (standaloneProvider.test(text)) matches.push('standalone provider name');
  return matches;
}

if (process.argv.includes('--self-test')) {
  const forbidden = [
    `@${retiredProvider}/backend`,
    `${retiredProvider.toUpperCase()}_SECRET_KEY`,
    `${retiredProvider}.createsomething.agency`,
    `Use ${retiredProvider[0].toUpperCase()}${retiredProvider.slice(1)} for auth`,
  ];
  for (const fixture of forbidden) {
    if (findRetiredIdentityProviderReferences(fixture).length === 0) {
      throw new Error(`Guard missed a forbidden fixture: ${fixture}`);
    }
  }
  if (findRetiredIdentityProviderReferences('MoonClerk payments').length !== 0) {
    throw new Error('Guard incorrectly rejected the unrelated payments product.');
  }
  console.log('retired identity provider guard self-test: pass');
  process.exit(0);
}

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const violations = [];
for (const file of tracked) {
  if (!existsSync(file)) continue;
  const buffer = readFileSync(file);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const matches = findRetiredIdentityProviderReferences(lines[index]);
    if (matches.length > 0) {
      violations.push({ file, line: index + 1, matches });
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.matches.join(', ')}`);
  }
  process.exit(1);
}

console.log(`retired identity provider check: pass (${tracked.length} tracked files)`);
