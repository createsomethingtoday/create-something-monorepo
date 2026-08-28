import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const POLICY_PATH = resolve(ROOT, 'config/security-advisory-exceptions.v1.json');
const SOURCE_EXTENSIONS = new Set(['.cjs', '.js', '.jsx', '.mjs', '.svelte', '.ts', '.tsx']);
const SELF_PATHS = new Set([
  'scripts/security-advisory-exceptions.mjs',
  'scripts/test/security-advisory-exceptions.test.mjs'
]);
const MAX_EXCEPTION_DAYS = 45;

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function requiredString(findings, entry, field, label) {
  if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
    findings.push(`${label}.${field} must be a non-empty string`);
  }
}

export function validateSecurityAdvisoryPolicy(policy, now = new Date()) {
  const findings = [];
  if (!policy || typeof policy !== 'object') return ['policy must be an object'];
  if (policy.schemaVersion !== 1) findings.push('schemaVersion must equal 1');
  if (typeof policy.policy !== 'string' || policy.policy.trim() === '') {
    findings.push('policy must explain the exception contract');
  }
  if (!Array.isArray(policy.exceptions) || policy.exceptions.length === 0) {
    findings.push('exceptions must contain at least one owned advisory');
    return findings;
  }

  const seen = new Set();
  for (const [index, entry] of policy.exceptions.entries()) {
    const label = `exceptions[${index}]`;
    for (const field of [
      'advisoryId',
      'package',
      'severity',
      'affectedRange',
      'owner',
      'trackingIssue',
      'acceptedOn',
      'reviewBy',
      'state',
      'runtimeExposure',
      'removalTrigger'
    ]) {
      requiredString(findings, entry, field, label);
    }

    if (seen.has(entry.advisoryId)) findings.push(`${label} has duplicate advisory ${entry.advisoryId}`);
    seen.add(entry.advisoryId);
    if (!/^GHSA-[a-z0-9-]+$/.test(entry.advisoryId ?? '')) {
      findings.push(`${label}.advisoryId must be a GHSA identifier`);
    }
    if (!Number.isInteger(entry.alertNumber) || entry.alertNumber <= 0) {
      findings.push(`${label}.alertNumber must be a positive integer`);
    }
    if (!['critical', 'high'].includes(entry.severity)) {
      findings.push(`${label}.severity must be critical or high`);
    }
    if (entry.state !== 'open-upstream-unpatched') {
      findings.push(`${label}.state must be open-upstream-unpatched`);
    }
    if (entry.firstPatchedVersion !== null) {
      findings.push(`${label}.firstPatchedVersion must be null while the exception is active`);
    }
    if (entry.suppressesScanner !== false) {
      findings.push(`${label}.suppressesScanner must remain false`);
    }
    if (!/^CRE-\d+$/.test(entry.trackingIssue ?? '')) {
      findings.push(`${label}.trackingIssue must be a CRE issue identifier`);
    }
    if (!Array.isArray(entry.exploitPreconditions) || entry.exploitPreconditions.length === 0) {
      findings.push(`${label} must name at least one exploit precondition`);
    }
    if (!Array.isArray(entry.compensatingControls) || entry.compensatingControls.length < 2) {
      findings.push(`${label} must name at least two compensating controls`);
    }
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      findings.push(`${label} must include verification evidence`);
    }

    const acceptedOn = parseDate(entry.acceptedOn);
    const reviewBy = parseDate(entry.reviewBy);
    if (!acceptedOn) findings.push(`${label}.acceptedOn must be an ISO calendar date`);
    if (!reviewBy) findings.push(`${label}.reviewBy must be an ISO calendar date`);
    if (acceptedOn && reviewBy) {
      const lifetimeDays = (reviewBy - acceptedOn) / 86_400_000;
      if (lifetimeDays <= 0 || lifetimeDays > MAX_EXCEPTION_DAYS) {
        findings.push(`${label} review window must be between 1 and ${MAX_EXCEPTION_DAYS} days`);
      }
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      if (reviewBy < today) findings.push(`${label} expired on ${entry.reviewBy}`);
    }
  }

  return findings;
}

export function findDirectPackageImports(files, packageName) {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directImport = new RegExp(
    `(?:from\\s*['\"]${escaped}['\"]|import\\s*\\(\\s*['\"]${escaped}['\"]|require\\s*\\(\\s*['\"]${escaped}['\"])`
  );
  return [...files.entries()]
    .filter(([path, content]) => SOURCE_EXTENSIONS.has(extname(path)) && directImport.test(content))
    .map(([path]) => path)
    .sort();
}

function trackedSourceFiles() {
  const paths = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    cwd: ROOT,
    encoding: 'utf8'
  })
    .split('\0')
    .filter(Boolean);
  const files = new Map();
  for (const path of paths) {
    if (SELF_PATHS.has(path)) continue;
    if (!SOURCE_EXTENSIONS.has(extname(path))) continue;
    try {
      files.set(path, readFileSync(resolve(ROOT, path), 'utf8'));
    } catch {
      // A concurrently removed path cannot become a direct runtime import.
    }
  }
  return files;
}

function main() {
  const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));
  const findings = validateSecurityAdvisoryPolicy(policy);
  const sourceFiles = trackedSourceFiles();
  for (const exception of policy.exceptions ?? []) {
    const imports = findDirectPackageImports(sourceFiles, exception.package);
    if (imports.length > 0) {
      findings.push(
        `${exception.advisoryId} is classified as ${exception.runtimeExposure} but is imported directly by ${imports.join(', ')}`
      );
    }
  }

  if (findings.length > 0) {
    for (const finding of findings) console.error(finding);
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${policy.exceptions.length} visible, owned security advisory exception.`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();
