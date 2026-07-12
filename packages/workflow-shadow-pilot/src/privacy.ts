import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { WorkflowPilotPrivacySummary } from './types.js';

const CORPUS_FILES = [
  'manifest.blind.jsonl',
  'outcomes.private.jsonl',
  'sandbox-results.jsonl',
  'status-alignment.jsonl',
] as const;

const SENSITIVE_KEYS = new Set([
  'case_id',
  'asset_id',
  'version_id',
  'template_name',
  'reviewer',
  'review_feedback_snippet',
  'rejection_feedback_snippet',
  'source_url',
  'published_url',
  'preview_url',
]);

const FORBIDDEN_OUTPUT_KEYS = [...SENSITIVE_KEYS].sort();

function collectStrings(value: unknown, target: Set<string>): void {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized) target.add(normalized);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, target);
    return;
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectStrings(entry, target);
    }
  }
}

async function readSensitiveValues(corpusDir: string): Promise<Set<string>> {
  const values = new Set<string>();
  for (const file of CORPUS_FILES) {
    const content = await readFile(path.join(corpusDir, file), 'utf8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as Record<string, unknown>;
      for (const [key, value] of Object.entries(row)) {
        if (SENSITIVE_KEYS.has(key)) collectStrings(value, values);
      }
    }
  }
  return values;
}

export async function scanWorkflowPilotPrivacy(
  corpusDir: string,
  artifacts: unknown,
): Promise<WorkflowPilotPrivacySummary> {
  const sensitiveValues = await readSensitiveValues(corpusDir);
  const serialized = JSON.stringify(artifacts);
  const exactLeakCount = [...sensitiveValues].filter((value) => serialized.includes(value)).length;
  const forbiddenKeyCount = FORBIDDEN_OUTPUT_KEYS.filter((key) =>
    serialized.includes(`"${key}"`),
  ).length;

  return {
    schemaVersion: 'workflow_shadow_privacy_summary.v0.1',
    status: exactLeakCount === 0 && forbiddenKeyCount === 0 ? 'pass' : 'blocked',
    sensitiveValuesChecked: sensitiveValues.size,
    exactLeakCount,
    forbiddenKeyCount,
  };
}

export class WorkflowPilotPrivacyError extends Error {
  readonly code = 'PRIVATE_VALUE_LEAK' as const;
  readonly exactLeakCount: number;
  readonly forbiddenKeyCount: number;

  constructor(summary: WorkflowPilotPrivacySummary) {
    super(
      `Workflow shadow output failed privacy validation: ${summary.exactLeakCount} exact values and ${summary.forbiddenKeyCount} forbidden keys`,
    );
    this.name = 'WorkflowPilotPrivacyError';
    this.exactLeakCount = summary.exactLeakCount;
    this.forbiddenKeyCount = summary.forbiddenKeyCount;
  }
}

export async function assertWorkflowPilotPrivacy(
  corpusDir: string,
  artifacts: unknown,
): Promise<WorkflowPilotPrivacySummary> {
  const summary = await scanWorkflowPilotPrivacy(corpusDir, artifacts);
  if (summary.status !== 'pass') throw new WorkflowPilotPrivacyError(summary);
  return summary;
}
