import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { WorkflowHistoricalContextBundle } from './types.js';

const REJECTION_CATEGORIES = new Set([
  'UI/UX Concerns',
  'Other',
  'App issue',
  'Guideline Infringement',
  'Duplicate submission',
  'Invalid Submission',
]);

const IMPROVEMENT_AREAS = new Set([
  'Template: Overall user experience',
  'Template: Graphic design',
  'Template: Hierarchy',
  'Template: Interaction design',
  'Template: Layout design quality',
  'Template: Site optimization',
  'Template: Accessibility',
  'Template: Guidelines compliance',
  'Template: Responsive design',
  'Template: Technical requirements',
]);

function parseJsonl(content: string, file: string): Array<Record<string, unknown>> {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const value: unknown = JSON.parse(line);
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${file} line ${index + 1} must be an object`);
      }
      return value as Record<string, unknown>;
    });
}

function caseId(row: Record<string, unknown>, file: string, line: number): string {
  if (typeof row.case_id !== 'string' || !row.case_id) {
    throw new Error(`${file} line ${line} is missing case_id`);
  }
  return row.case_id;
}

function requiredString(row: Record<string, unknown>, field: string, caseName: string): string {
  const value = row[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${caseName} is missing ${field}`);
  }
  return value.trim();
}

function present(value: unknown): boolean {
  return typeof value === 'string' && Boolean(value.trim());
}

function canonical(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export async function loadSanitizedHistoricalContextBundle(
  directory: string,
): Promise<WorkflowHistoricalContextBundle> {
  const files = ['outcomes.private.jsonl', 'status-alignment.jsonl'] as const;
  const contents = await Promise.all(
    files.map(async (file) => ({ file, content: await readFile(join(directory, file), 'utf8') })),
  );
  const parsed = new Map(contents.map(({ file, content }) => [file, parseJsonl(content, file)]));
  const outcomes = parsed.get('outcomes.private.jsonl')!;
  const alignments = parsed.get('status-alignment.jsonl')!;
  const outcomeIds = outcomes.map((row, index) => caseId(row, files[0], index + 1));
  const alignmentIds = alignments.map((row, index) => caseId(row, files[1], index + 1));
  if (new Set(outcomeIds).size !== outcomeIds.length || new Set(alignmentIds).size !== alignmentIds.length) {
    throw new Error('Historical context files contain duplicate case IDs');
  }
  if (JSON.stringify([...outcomeIds].sort()) !== JSON.stringify([...alignmentIds].sort())) {
    throw new Error('Historical context case IDs do not join');
  }
  const alignmentById = new Map(alignments.map((row, index) => [alignmentIds[index], { row, line: index + 1 }]));

  const cases = outcomes.map((outcome, index) => {
    const id = outcomeIds[index]!;
    const alignment = alignmentById.get(id)!;
    const rejectionCategory = outcome.rejection_reason;
    if (rejectionCategory !== undefined && !REJECTION_CATEGORIES.has(String(rejectionCategory))) {
      throw new Error(`${id} has an unconfigured rejection category`);
    }
    const improvementAreas = Array.isArray(outcome.actual_improvement_areas)
      ? outcome.actual_improvement_areas
      : [];
    if (improvementAreas.some((value) => typeof value !== 'string' || !IMPROVEMENT_AREAS.has(value))) {
      throw new Error(`${id} has an unconfigured improvement area`);
    }
    return {
      id: `historical-context:${id}`,
      caseId: id,
      selectionStratum: requiredString(outcome, 'selection_stratum', id),
      observedOutcome: canonical(requiredString(outcome, 'actual_review_status', id)),
      alignmentLabel: requiredString(alignment.row, 'alignment_label', id),
      ...(typeof rejectionCategory === 'string' ? { rejectionCategory } : {}),
      improvementAreas: improvementAreas as string[],
      hasReviewFeedback: present(outcome.review_feedback_snippet),
      hasRejectionFeedback: present(outcome.rejection_feedback_snippet),
      hasDecisionDate: present(outcome.decision_date),
      sourcePointers: {
        outcome: `outcomes.private.jsonl:line:${index + 1}`,
        alignment: `status-alignment.jsonl:line:${alignment.line}`,
      },
    };
  });

  const sourceFiles = contents.map(({ file, content }) => ({
    path: file,
    hash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
  }));
  const hash = createHash('sha256');
  for (const { file, content } of contents) hash.update(file).update('\0').update(content).update('\0');

  return {
    schemaVersion: 'workflow_historical_context_bundle.v0.1',
    bundleId: `historical-context:${basename(directory)}`,
    source: {
      path: directory,
      hash: `sha256:${hash.digest('hex')}`,
      files: sourceFiles,
    },
    cases,
  };
}
