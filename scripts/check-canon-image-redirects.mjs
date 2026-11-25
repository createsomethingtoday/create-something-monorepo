#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [propertyFlag, property, artifactFlag, artifactPath] = process.argv.slice(2);
if (process.argv.length !== 6 || propertyFlag !== '--property' || artifactFlag !== '--artifact' || !['io', 'ltd', 'space', 'lms'].includes(property)) {
  throw new Error('Usage: node scripts/check-canon-image-redirects.mjs --property <io|ltd|space|lms> --artifact <directory>');
}
const artifact = resolve(artifactPath);
const sourceRules = readFileSync(resolve(root, `packages/${property}/_redirects`), 'utf8')
  .split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
const builtRules = new Set(readFileSync(resolve(artifact, '_redirects'), 'utf8')
  .split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')));
const routes = JSON.parse(readFileSync(resolve(artifact, '_routes.json'), 'utf8'));
// The configured exclusions are exact paths or trailing wildcard prefixes.
const matches = (pattern, path) => pattern.endsWith('*')
  ? !pattern.slice(0, -1).includes('*') && path.startsWith(pattern.slice(0, -1))
  : pattern === path;
const findings = [];
for (const rule of sourceRules) {
  const [from, to, status] = rule.split(/\s+/);
  if (status !== '301' || !from.startsWith('/') || !to.startsWith('/')) findings.push({ rule, reason: 'invalid Canon image redirect' });
  if (!builtRules.has(rule)) findings.push({ from, reason: 'redirect missing from artifact' });
  if (!routes.exclude.some(pattern => matches(pattern, from))) {
    findings.push({ from, reason: 'application worker intercepts the URL before Pages static redirects' });
  }
}
console.log(JSON.stringify({ property, artifact, redirects: sourceRules.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;
