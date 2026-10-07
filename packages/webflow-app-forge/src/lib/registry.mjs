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
export function coverage(findingsByCheck) {
  return loadRegistry().requirements.map((req) => {
    const finding = findingsByCheck.get(req.check);
    let status = 'human';
    if (finding) status = finding.status;
    else if (!req.enforcedBy.includes('human') && !req.check.startsWith('human:')) status = 'not-run';
    return { id: req.id, title: req.title, provenance: req.provenance, severity: req.severity, enforcedBy: req.enforcedBy, status };
  });
}
