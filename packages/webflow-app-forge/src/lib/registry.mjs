import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(here, '..', '..', 'registry', 'requirements.json');

let cached = null;

export function loadRegistry() {
  if (!cached) cached = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  return cached;
}

export function requirementsForCheck(checkId) {
  return loadRegistry().requirements.filter((r) => r.check === checkId);
}

export function requirementById(id) {
  return loadRegistry().requirements.find((r) => r.id === id) || null;
}

/**
 * Coverage: for every requirement, what the run established.
 * findings: [{ check, status: 'pass'|'fail'|'warn'|'skip', ... }]
 */
const RANK = { fail: 0, warn: 1, pass: 2 };
/**
 * Status per requirement. Several requirements may share a check id with different severities
 * (a suggested LEGAL-DISTINCT and a required LEGAL-URLS both report under listing:legal), so a
 * requirement takes the worst finding of its own severity first and only then any finding on the check.
 */
export function coverage(findings) {
  const list = findings instanceof Map ? [...findings.values()] : findings;
  return loadRegistry().requirements.map((req) => {
    const onCheck = list.filter((f) => f.check === req.check);
    const own = onCheck.filter((f) => f.severity === req.severity);
    const pool = own.length ? own : onCheck;
    const finding = pool.sort((a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3))[0];
    let status = 'human';
    if (finding) status = finding.status;
    else if (!req.enforcedBy.includes('human') && !req.check.startsWith('human:')) status = 'not-run';
    return { id: req.id, title: req.title, provenance: req.provenance, severity: req.severity, enforcedBy: req.enforcedBy, status };
  });
}
