/**
 * Evaluation Report — runs all eval scripts and generates a summary
 *
 * Aggregates results from:
 *   1. Workers compatibility
 *   2. Latency benchmark
 *   3. Tool quality
 *   4. Auth flow
 *
 * Outputs a structured report and a go/no-go recommendation.
 *
 * Run: COMPOSIO_API_KEY=... pnpm --filter=composio-bridge eval:all
 */

import type { EvalResult, EvalReport } from '../src/types.js';
import { runWorkersCompatEval } from './workers-compat.js';
import { runLatencyBench } from './latency-bench.js';
import { runToolQualityEval } from './tool-quality.js';
import { runAuthFlowEval } from './auth-flow.js';

// =============================================================================
// Decision Logic
// =============================================================================

function deriveRecommendation(
  results: EvalResult[],
  workersCompat: boolean,
): EvalReport['recommendation'] {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? passed / total : 0;

  // Hard gate: Workers compatibility
  if (!workersCompat) return 'reject';

  // Soft gates
  if (passRate >= 0.8) return 'adopt';
  if (passRate >= 0.5) return 'conditional';
  return 'reject';
}

function deriveSummary(
  report: EvalReport,
): string {
  const { recommendation, results, workersCompat } = report;
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  const lines: string[] = [];

  switch (recommendation) {
    case 'adopt':
      lines.push(`ADOPT: ${passed}/${total} tests passed. Composio is viable as invisible plumbing.`);
      break;
    case 'conditional':
      lines.push(`CONDITIONAL: ${passed}/${total} tests passed. Some concerns need addressing.`);
      break;
    case 'reject':
      lines.push(`REJECT: ${passed}/${total} tests passed. Composio does not meet requirements.`);
      break;
  }

  if (!workersCompat) {
    lines.push('BLOCKING: Cloudflare Workers compatibility failed. This is a hard gate.');
  }

  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    lines.push('');
    lines.push('Failed tests:');
    for (const f of failures) {
      lines.push(`  - ${f.test}: ${f.details}`);
    }
  }

  return lines.join('\n');
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Composio Bridge — Full Evaluation Report            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const hasApiKey = !!process.env.COMPOSIO_API_KEY;

  // Phase 1: Workers compatibility (no API key needed)
  const workersResults = await runWorkersCompatEval();
  const workersCompat = workersResults.every((r) => r.passed);

  // Phase 2-4: API-dependent tests (need COMPOSIO_API_KEY)
  let latencyResults: EvalResult[] = [];
  let qualityResults: EvalResult[] = [];
  let authResults: EvalResult[] = [];

  if (hasApiKey) {
    latencyResults = await runLatencyBench();
    qualityResults = await runToolQualityEval();
    authResults = await runAuthFlowEval();
  } else {
    console.log('\n\u26A0\uFE0F  COMPOSIO_API_KEY not set — skipping API-dependent tests.');
    console.log('   Set COMPOSIO_API_KEY to run latency, quality, and auth evaluations.\n');
  }

  // Aggregate
  const allResults = [
    ...workersResults,
    ...latencyResults,
    ...qualityResults,
    ...authResults,
  ];

  let sdkVersion = 'unknown';
  try {
    const pkgPath = require.resolve('@composio/core/package.json');
    const { readFileSync } = await import('fs');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    sdkVersion = pkg.version ?? 'unknown';
  } catch {
    // Can't read version — not critical
  }

  const report: EvalReport = {
    date: new Date().toISOString(),
    sdkVersion,
    workersCompat,
    results: allResults,
    recommendation: deriveRecommendation(allResults, workersCompat),
    summary: '', // Filled below
  };

  report.summary = deriveSummary(report);

  // Output
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    EVALUATION SUMMARY                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const passed = allResults.filter((r) => r.passed).length;
  const total = allResults.length;

  console.log(`Date:            ${report.date}`);
  console.log(`SDK Version:     ${report.sdkVersion}`);
  console.log(`Workers Compat:  ${report.workersCompat ? 'YES' : 'NO'}`);
  console.log(`Tests:           ${passed}/${total} passed`);
  console.log(`Recommendation:  ${report.recommendation.toUpperCase()}`);
  console.log('');
  console.log(report.summary);

  // Write JSON report
  const reportPath = new URL('../eval-report.json', import.meta.url);
  const { writeFileSync } = await import('fs');
  const { fileURLToPath } = await import('url');
  writeFileSync(fileURLToPath(reportPath), JSON.stringify(report, null, 2));
  console.log(`\nReport written to: eval-report.json`);
}

main().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
