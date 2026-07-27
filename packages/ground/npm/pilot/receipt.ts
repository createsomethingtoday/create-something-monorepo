import Ajv, { type ErrorObject } from 'ajv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ReceiptValidationResult {
  valid: boolean;
  errors: string[];
}

const schema = JSON.parse(
  readFileSync(resolve(__dirname, 'ground-benchmark-receipt.schema.json'), 'utf8')
);
const ajv = new Ajv({ allErrors: true, strict: true, validateFormats: false });
const validateSchema = ajv.compile(schema);

function formatSchemaError(error: ErrorObject): string {
  return `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`;
}

function asRecord(value: unknown): Record<string, any> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

function validateSummary(
  label: string,
  configuredSamples: number,
  samples: Array<Record<string, any>>,
  summary: Record<string, any>,
  errors: string[]
): void {
  const passed = samples.filter((sample) => sample.status === 'passed').length;
  const failed = samples.filter((sample) => sample.status === 'failed').length;
  const fingerprints = [
    ...new Set(
      samples
        .map((sample) => sample.semanticFingerprint)
        .filter((value): value is string => typeof value === 'string')
    )
  ];

  if (samples.length !== configuredSamples) {
    errors.push(`${label}.samples length must equal configuration.samples`);
  }
  if (summary.attempted !== samples.length) {
    errors.push(`${label}.summary.attempted must equal the retained sample count`);
  }
  if (summary.passed !== passed) {
    errors.push(`${label}.summary.passed does not match sample statuses`);
  }
  if (summary.failed !== failed) {
    errors.push(`${label}.summary.failed does not match sample statuses`);
  }
  if (failed > 0) {
    errors.push(`${label}.summary.failed must be zero for a passing receipt`);
  }
  if (summary.resultConsistent !== (failed === 0 && fingerprints.length === 1)) {
    errors.push(`${label}.summary.resultConsistent does not match retained samples`);
  }
  if (JSON.stringify(summary.fingerprints) !== JSON.stringify(fingerprints)) {
    errors.push(`${label}.summary.fingerprints does not match retained samples`);
  }

  const indexes = samples.map((sample) => sample.index);
  const expectedIndexes = samples.map((_, index) => index + 1);
  if (JSON.stringify(indexes) !== JSON.stringify(expectedIndexes)) {
    errors.push(`${label}.samples indexes must be contiguous and one-based`);
  }
}

export function validateGroundBenchmarkReceipt(receipt: unknown): ReceiptValidationResult {
  const errors: string[] = [];
  if (!validateSchema(receipt)) {
    errors.push(...(validateSchema.errors ?? []).map(formatSchemaError));
    return { valid: false, errors };
  }

  const record = asRecord(receipt)!;
  const configuration = asRecord(record.configuration)!;
  const nativeMcp = asRecord(record.nativeMcp)!;
  const nativeSummary = asRecord(nativeMcp.summary)!;
  const nativeSamples = nativeMcp.samples as Array<Record<string, any>>;

  validateSummary('nativeMcp', configuration.samples, nativeSamples, nativeSummary, errors);

  if (nativeMcp.protocolPassed !== true) {
    errors.push('nativeMcp.protocolPassed must be true for a passing receipt');
  }

  const typescriptBaseline = asRecord(record.typescriptBaseline);
  if (typescriptBaseline) {
    validateSummary(
      'typescriptBaseline',
      configuration.samples,
      typescriptBaseline.samples as Array<Record<string, any>>,
      asRecord(typescriptBaseline.summary)!,
      errors
    );
  }

  return { valid: errors.length === 0, errors };
}
