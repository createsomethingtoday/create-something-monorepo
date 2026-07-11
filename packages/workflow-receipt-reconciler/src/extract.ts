import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { WorkflowReceiptCorpus, WorkflowReceiptReport } from './types.js';

interface EmbeddedReceiptRecord {
  template_name: string;
  selection_stratum: string;
  expected_review_status: string;
  expected_quality_rating?: string;
  reviewer?: string;
  evidence_status: string;
  finding_count: number;
  substantive_finding_count: number;
  finding_rule_ids: string[];
  alignment_label: string;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function lineAt(content: string, offset: number): number {
  return content.slice(0, offset).split('\n').length;
}

function assertReceipt(
  value: unknown,
  options: { requireQualityRating: boolean; requireReviewer: boolean },
): asserts value is EmbeddedReceiptRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Embedded workflow receipt must be an object');
  }
  const record = value as Record<string, unknown>;
  const strings = [
    'template_name',
    'selection_stratum',
    'expected_review_status',
    'evidence_status',
    'alignment_label',
  ];
  if (strings.some((field) => typeof record[field] !== 'string')) {
    throw new Error('Embedded workflow receipt is missing a required string field');
  }
  if (
    (options.requireQualityRating && typeof record.expected_quality_rating !== 'string') ||
    (record.expected_quality_rating !== undefined && typeof record.expected_quality_rating !== 'string')
  ) {
    throw new Error('Embedded workflow receipt has an invalid expected quality rating');
  }
  if (
    (options.requireReviewer && typeof record.reviewer !== 'string') ||
    (record.reviewer !== undefined && typeof record.reviewer !== 'string')
  ) {
    throw new Error('Embedded workflow receipt has an invalid reviewer');
  }
  if (
    !Number.isSafeInteger(record.finding_count) ||
    !Number.isSafeInteger(record.substantive_finding_count) ||
    !Array.isArray(record.finding_rule_ids) ||
    record.finding_rule_ids.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error('Embedded workflow receipt has invalid finding evidence');
  }
}

function canonicalOutcome(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function receiptFromRecord(
  entry: EmbeddedReceiptRecord,
  id: string,
  sourcePointer: string,
) {
  return {
    id,
    templateName: entry.template_name,
    selectionStratum: entry.selection_stratum,
    expectedReviewStatus: canonicalOutcome(entry.expected_review_status),
    expectedQualityRating: entry.expected_quality_rating
      ? canonicalOutcome(entry.expected_quality_rating)
      : undefined,
    reviewer: entry.reviewer ?? '(missing reviewer)',
    evidenceStatus: entry.evidence_status,
    findingCount: entry.finding_count,
    substantiveFindingCount: entry.substantive_finding_count,
    findingRuleIds: [...entry.finding_rule_ids],
    alignmentLabel: entry.alignment_label,
    sourcePointer,
  };
}

export function extractEmbeddedWorkflowReceiptCorpus(
  report: WorkflowReceiptReport,
): WorkflowReceiptCorpus {
  const sectionStart = report.content.indexOf('## Creator-Appeal Consistency Case');
  if (sectionStart < 0) throw new Error('Creator-Appeal Consistency Case section was not found');
  const section = report.content.slice(sectionStart);
  const block = /```json\s*(\[[\s\S]*?\])\s*```/.exec(section);
  if (!block || block[1] === undefined) {
    throw new Error('Creator-Appeal Consistency Case JSON block was not found');
  }
  const jsonOffset = sectionStart + block.index + block[0].indexOf(block[1]);
  const parsed: unknown = JSON.parse(block[1]);
  if (!Array.isArray(parsed)) throw new Error('Embedded workflow receipt corpus must be an array');

  let searchOffset = jsonOffset;
  const receipts = parsed.map((entry) => {
    assertReceipt(entry, { requireQualityRating: true, requireReviewer: true });
    const templateMarker = `"template_name": "${entry.template_name}"`;
    const templateOffset = report.content.indexOf(templateMarker, searchOffset);
    if (templateOffset < 0) throw new Error(`Receipt source for ${entry.template_name} was not found`);
    const objectStart = report.content.lastIndexOf('{', templateOffset);
    const objectEndMarker = report.content.indexOf('\n  }', templateOffset);
    if (objectStart < jsonOffset || objectEndMarker < 0) {
      throw new Error(`Receipt source range for ${entry.template_name} was not found`);
    }
    const objectEnd = objectEndMarker + '\n  }'.length;
    searchOffset = objectEnd;
    return receiptFromRecord(
      entry,
      `embedded-case:${slug(entry.template_name)}`,
      `lines:${lineAt(report.content, objectStart)}-${lineAt(report.content, objectEnd - 1)}`,
    );
  });

  return {
    schemaVersion: 'workflow_receipt_corpus.v0.1',
    corpusId: `${report.id}:embedded-cases`,
    source: {
      id: report.id,
      path: report.path,
      hash: `sha256:${createHash('sha256').update(report.content).digest('hex')}`,
    },
    receipts,
  };
}

const ARTIFACT_FILES = [
  'manifest.blind.jsonl',
  'outcomes.private.jsonl',
  'sandbox-results.jsonl',
  'status-alignment.jsonl',
] as const;

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

function caseIds(rows: Array<Record<string, unknown>>, file: string): string[] {
  const ids = rows.map((row, index) => {
    if (typeof row.case_id !== 'string' || !row.case_id) {
      throw new Error(`${file} line ${index + 1} is missing case_id`);
    }
    return row.case_id;
  });
  if (new Set(ids).size !== ids.length) throw new Error(`${file} contains duplicate case_id values`);
  return ids.sort();
}

export async function loadWorkflowReceiptCorpusFromDirectory(
  directory: string,
): Promise<WorkflowReceiptCorpus> {
  const contents = await Promise.all(
    ARTIFACT_FILES.map(async (file) => ({ file, content: await readFile(join(directory, file), 'utf8') })),
  );
  const parsed = new Map(contents.map(({ file, content }) => [file, parseJsonl(content, file)]));
  const expectedIds = caseIds(parsed.get(ARTIFACT_FILES[0])!, ARTIFACT_FILES[0]);
  for (const file of ARTIFACT_FILES.slice(1)) {
    const actualIds = caseIds(parsed.get(file)!, file);
    if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
      throw new Error(`${file} case IDs do not join to ${ARTIFACT_FILES[0]}`);
    }
  }

  const files = contents.map(({ file, content }) => ({
    path: file,
    hash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
  }));
  const bundleHash = createHash('sha256');
  for (const { file, content } of contents) bundleHash.update(file).update('\0').update(content).update('\0');
  const alignments = parsed.get('status-alignment.jsonl')!;
  const receipts = alignments.map((entry, index) => {
    assertReceipt(entry, { requireQualityRating: false, requireReviewer: false });
    return receiptFromRecord(
      entry,
      `receipt:${String(entry.case_id)}`,
      `status-alignment.jsonl:line:${index + 1}`,
    );
  });

  return {
    schemaVersion: 'workflow_receipt_corpus.v0.1',
    corpusId: `receipt-artifact-bundle:${basename(directory)}`,
    source: {
      id: `receipt-artifact-bundle:${basename(directory)}`,
      path: directory,
      hash: `sha256:${bundleHash.digest('hex')}`,
      files,
    },
    receipts,
  };
}
