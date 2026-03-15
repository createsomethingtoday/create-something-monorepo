/**
 * JSON Reporter
 *
 * Outputs audit results as machine-parseable JSON for CI/CD integration.
 */

import type { AuditResult } from '../types/index.js';

export function formatAsJson(result: AuditResult): string {
	return JSON.stringify(result, null, 2);
}

export function writeJsonReport(result: AuditResult, outputPath: string): void {
	const fs = require('fs');
	fs.writeFileSync(outputPath, formatAsJson(result), 'utf-8');
}
