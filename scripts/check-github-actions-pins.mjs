#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const workflowRoot = join(root, '.github', 'workflows');
const fullCommit = /^[0-9a-f]{40}$/;
const violations = [];

for (const file of walk(workflowRoot)) {
  if (!/\.ya?ml$/.test(file)) continue;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/);
    if (!match) return;
    const reference = match[1];

    // Local actions are pinned by the checked-out repository revision.
    if (reference.startsWith('./')) return;

    const separator = reference.lastIndexOf('@');
    const revision = separator >= 0 ? reference.slice(separator + 1) : '';
    if (!fullCommit.test(revision)) {
      violations.push(`${relative(root, file)}:${index + 1}: ${reference}`);
    }
  });
}

if (violations.length > 0) {
  console.error('GitHub Actions must use immutable full-length commit SHAs:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('GitHub Action references are pinned to full-length commit SHAs.');

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}
