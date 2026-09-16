#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const LEDGER_SCHEMA_VERSION = 'ground-adjudication-ledger.v1';
const SUMMARY_SCHEMA_VERSION = 'ground-adjudication-summary.v1';
const VERDICTS = new Set(['confirmed', 'false_positive', 'out_of_scope']);
const COMPLETION = new Set(['complete', 'partial', 'no_analyzable']);

function fail(message) {
  throw new Error(`Invalid Ground adjudication ledger: ${message}`);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} must be an object`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string`);
  return value;
}

function requireCount(value, label) {
  if (!Number.isInteger(value) || value < 0) fail(`${label} must be a non-negative integer`);
  return value;
}

function requireOptionalCount(value, label) {
  return value === null ? value : requireCount(value, label);
}

function requireRate(value, label, { positive = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    fail(`${label} must be a number from 0 to 1`);
  }
  if (positive && value === 0) fail(`${label} must be greater than 0`);
  return value;
}

function requireOptionalRate(value, label, options) {
  return value === null ? value : requireRate(value, label, options);
}

function requireOptionalCheckCounts(value, label) {
  if (value === undefined || value === null) return value;
  requireObject(value, label);
  for (const [check, count] of Object.entries(value)) {
    requireString(check, `${label} check`);
    requireCount(count, `${label}.${check}`);
  }
  return value;
}

export function validateLedger(ledger) {
  requireObject(ledger, 'ledger');
  if (ledger.schema_version !== LEDGER_SCHEMA_VERSION) {
    fail(`schema_version must be ${LEDGER_SCHEMA_VERSION}`);
  }
  if (ledger.mode !== 'advisory') fail('mode must remain advisory');

  const thresholds = requireObject(ledger.thresholds, 'thresholds');
  requireOptionalCount(thresholds.minimum_complete_receipts, 'minimum_complete_receipts');
  requireOptionalCount(thresholds.minimum_adjudicated_findings, 'minimum_adjudicated_findings');
  requireOptionalRate(thresholds.minimum_precision, 'minimum_precision', { positive: true });
  requireOptionalRate(thresholds.minimum_recall, 'minimum_recall', { positive: true });
  requireOptionalRate(thresholds.maximum_false_positive_rate, 'maximum_false_positive_rate');
  requireOptionalCheckCounts(
    thresholds.minimum_adjudicated_by_check,
    'minimum_adjudicated_by_check'
  );
  if (thresholds.maximum_execution_failures !== undefined) {
    requireOptionalCount(thresholds.maximum_execution_failures, 'maximum_execution_failures');
  }

  if (!Array.isArray(ledger.records)) fail('records must be an array');
  const receiptIds = new Set();
  const findingIds = new Set();

  for (const [index, record] of ledger.records.entries()) {
    requireObject(record, `records[${index}]`);
    const receipt = requireObject(record.receipt, `records[${index}].receipt`);
    const receiptId = requireString(receipt.id, `records[${index}].receipt.id`);
    if (receiptIds.has(receiptId)) fail(`duplicate receipt id: ${receiptId}`);
    receiptIds.add(receiptId);
    requireString(receipt.source, `records[${index}].receipt.source`);
    if (!COMPLETION.has(receipt.completion)) {
      fail(`records[${index}].receipt.completion must be complete, partial, or no_analyzable`);
    }
    const observedFindings = requireCount(
      receipt.observed_findings,
      `records[${index}].receipt.observed_findings`
    );
    if (receipt.completion === 'complete' && receipt.execution_failures === undefined) {
      fail(`records[${index}].receipt complete receipt requires execution_failures`);
    }
    if (receipt.execution_failures !== undefined) {
      requireCount(receipt.execution_failures, `records[${index}].receipt.execution_failures`);
    }
    if (receipt.expected_findings !== undefined) {
      const expected = requireCount(
        receipt.expected_findings,
        `records[${index}].receipt.expected_findings`
      );
      const missed = requireCount(
        receipt.missed_findings,
        `records[${index}].receipt.missed_findings`
      );
      if (missed > expected) fail(`records[${index}].receipt missed_findings exceeds expected_findings`);
      if (expected > 0) requireString(receipt.recall_check, `records[${index}].receipt.recall_check`);
    }
    if (!Array.isArray(record.verdicts)) fail(`records[${index}].verdicts must be an array`);
    if (record.verdicts.length > observedFindings) {
      fail(`records[${index}] has more verdicts than observed findings`);
    }
    for (const [verdictIndex, verdict] of record.verdicts.entries()) {
      requireObject(verdict, `records[${index}].verdicts[${verdictIndex}]`);
      const findingId = requireString(
        verdict.finding_id,
        `records[${index}].verdicts[${verdictIndex}].finding_id`
      );
      if (findingIds.has(findingId)) fail(`duplicate finding id: ${findingId}`);
      findingIds.add(findingId);
      requireString(verdict.check, `records[${index}].verdicts[${verdictIndex}].check`);
      if (!VERDICTS.has(verdict.verdict)) {
        fail(`records[${index}].verdicts[${verdictIndex}] has unknown verdict: ${verdict.verdict}`);
      }
      requireString(verdict.rationale, `records[${index}].verdicts[${verdictIndex}].rationale`);
    }
  }
  return ledger;
}

export function summarizeLedger(ledger) {
  validateLedger(ledger);
  const receipts = { total: ledger.records.length, complete: 0, partial: 0, no_analyzable: 0 };
  const findings = {
    observed: 0,
    classified: 0,
    adjudicated: 0,
    unclassified: 0,
    confirmed: 0,
    false_positive: 0,
    out_of_scope: 0
  };
  const checks = {};
  const execution = { failures: 0 };
  const recallEvidence = { expected: 0, detected: 0, missed: 0 };

  for (const record of ledger.records) {
    receipts[record.receipt.completion] += 1;
    execution.failures += record.receipt.execution_failures ?? 0;
    if (record.receipt.expected_findings !== undefined) {
      recallEvidence.expected += record.receipt.expected_findings;
      recallEvidence.missed += record.receipt.missed_findings;
      recallEvidence.detected += record.receipt.expected_findings - record.receipt.missed_findings;
    }
    findings.observed += record.receipt.observed_findings;
    findings.classified += record.verdicts.length;
    for (const verdict of record.verdicts) {
      findings[verdict.verdict] += 1;
      if (verdict.verdict !== 'out_of_scope') findings.adjudicated += 1;
      const check = (checks[verdict.check] ??= {
        adjudicated: 0,
        confirmed: 0,
        false_positive: 0,
        out_of_scope: 0
      });
      check[verdict.verdict] += 1;
      if (verdict.verdict !== 'out_of_scope') check.adjudicated += 1;
    }
  }
  findings.unclassified = findings.observed - findings.classified;

  const decisionable = findings.confirmed + findings.false_positive;
  const precision = decisionable === 0 ? null : findings.confirmed / decisionable;
  const falsePositiveRate = decisionable === 0 ? null : findings.false_positive / decisionable;
  const recall = recallEvidence.expected === 0 ? null : recallEvidence.detected / recallEvidence.expected;
  const reasons = [];
  const { thresholds } = ledger;
  if (thresholds.minimum_complete_receipts === null) {
    reasons.push('complete_receipt_threshold_not_configured');
  } else if (receipts.complete < thresholds.minimum_complete_receipts) {
    reasons.push('insufficient_complete_receipts');
  }
  if (thresholds.minimum_adjudicated_findings === null) {
    reasons.push('adjudicated_finding_threshold_not_configured');
  } else if (findings.adjudicated < thresholds.minimum_adjudicated_findings) {
    reasons.push('insufficient_adjudicated_findings');
  }
  if (findings.unclassified > 0) reasons.push('unclassified_findings');
  if (thresholds.minimum_precision === null) reasons.push('precision_threshold_not_configured');
  else if (precision === null) reasons.push('precision_unknown');
  else if (precision < thresholds.minimum_precision) reasons.push('precision_below_threshold');
  if (thresholds.minimum_recall === null || thresholds.minimum_recall === undefined) {
    reasons.push('recall_threshold_not_configured');
  } else if (recall === null) reasons.push('recall_unknown');
  else if (recall < thresholds.minimum_recall) reasons.push('recall_below_threshold');
  if (thresholds.maximum_false_positive_rate === null) {
    reasons.push('false_positive_rate_threshold_not_configured');
  } else if (
    falsePositiveRate !== null &&
    falsePositiveRate > thresholds.maximum_false_positive_rate
  ) {
    reasons.push('false_positive_rate_above_threshold');
  }
  for (const [check, minimum] of Object.entries(thresholds.minimum_adjudicated_by_check ?? {})) {
    if ((checks[check]?.adjudicated ?? 0) < minimum) {
      reasons.push(`insufficient_adjudicated_findings:${check}`);
    }
  }
  if (
    thresholds.maximum_execution_failures !== undefined &&
    thresholds.maximum_execution_failures !== null &&
    execution.failures > thresholds.maximum_execution_failures
  ) {
    reasons.push('execution_failures_above_threshold');
  }

  return {
    schema_version: SUMMARY_SCHEMA_VERSION,
    mode: 'advisory',
    thresholds,
    receipts,
    findings,
    checks,
    execution,
    precision,
    recall,
    recall_evidence: recallEvidence,
    false_positive_rate: falsePositiveRate,
    promotion: { ready: reasons.length === 0, reasons }
  };
}

export function formatMarkdown(summary) {
  const percent = (value) => (value === null ? 'unknown' : `${(value * 100).toFixed(1)}%`);
  const lines = [
    '# Ground Adjudication Summary',
    '',
    `- Mode: ${summary.mode}`,
    `- Receipts: ${summary.receipts.total} total, ${summary.receipts.complete} complete, ${summary.receipts.partial} partial, ${summary.receipts.no_analyzable} no analyzable source`,
    `- Findings: ${summary.findings.observed} observed, ${summary.findings.classified} classified, ${summary.findings.adjudicated} calibration adjudicated, ${summary.findings.unclassified} unclassified`,
    `- Verdicts: ${summary.findings.confirmed} confirmed, ${summary.findings.false_positive} false positive, ${summary.findings.out_of_scope} out of scope`,
    `- Execution failures: ${summary.execution.failures}`,
    `- Precision: ${percent(summary.precision)}`,
    `- Recall: ${percent(summary.recall)} (${summary.recall_evidence.detected}/${summary.recall_evidence.expected} seeded positives detected)`,
    `- False-positive rate: ${percent(summary.false_positive_rate)}`,
    `- Promotion readiness: ${summary.promotion.ready ? 'ready' : 'not ready'}`
  ];
  if (!summary.promotion.ready) {
    lines.push('', '## Evidence still needed', '');
    for (const reason of summary.promotion.reasons) lines.push(`- ${reason}`);
  }
  lines.push(
    '',
    '_Advisory evidence by itself. Governed release promotion is enforced separately by `ground-calibration-verify.mjs`._'
  );
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const options = { format: 'markdown' };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--ledger') options.ledger = argv[++index];
    else if (arg.startsWith('--ledger=')) options.ledger = arg.slice('--ledger='.length);
    else if (arg === '--format') options.format = argv[++index];
    else if (arg.startsWith('--format=')) options.format = arg.slice('--format='.length);
    else if (arg === '--output') options.output = argv[++index];
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else if (arg === '--json') options.format = 'json';
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.help && (!options.ledger || options.ledger.startsWith('--'))) {
    throw new Error('Missing value for --ledger');
  }
  if (!['json', 'markdown'].includes(options.format)) {
    throw new Error('Invalid format. Expected json or markdown.');
  }
  return options;
}

function main() {
  try {
    const options = parseArgs(process.argv);
    if (options.help) {
      console.log(
        'Usage: node scripts/ground-adjudication.mjs --ledger <path> [--format json|markdown] [--output <path>]'
      );
      return;
    }
    const ledger = JSON.parse(readFileSync(options.ledger, 'utf8'));
    const summary = summarizeLedger(ledger);
    const rendered =
      options.format === 'json' ? `${JSON.stringify(summary, null, 2)}\n` : formatMarkdown(summary);
    if (options.output) writeFileSync(options.output, rendered, { flag: 'wx' });
    process.stdout.write(rendered);
  } catch (error) {
    console.error(
      `Ground adjudication failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
