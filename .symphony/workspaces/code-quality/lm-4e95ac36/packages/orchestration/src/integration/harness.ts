/**
 * @create-something/orchestration
 *
 * Harness integration - wrap harness baseline checks for orchestration.
 */

import { runBaselineCheck, type BaselineConfig, type BaselineResult } from '@create-something/harness';

/**
 * Run baseline quality gates at session start.
 *
 * Philosophy: Broken baseline = broken signal. Check quality gates before
 * starting new work to prevent the "broken windows" problem.
 */
export async function runBaseline(cwd: string): Promise<BaselineResult> {
  const config: BaselineConfig = {
    enabled: true,
    gates: {
      tests: true,
      typecheck: true,
      lint: true,
      build: false, // Build is expensive
    },
    autoFix: true,
    useRalphEscalation: false, // Too expensive for every session
    createBlockers: true,
    maxAutoFixAttempts: 1,
    gateTimeoutMs: 5 * 60 * 1000, // 5 minutes
  };

  return await runBaselineCheck(config, cwd);
}

/**
 * Check if baseline passed.
 */
export function baselinePassed(result: BaselineResult): boolean {
  return result.passed;
}

/**
 * Format baseline result for display.
 */
export function formatBaselineResult(result: BaselineResult): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  BASELINE CHECK');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  for (const gate of result.gates) {
    const icon = gate.passed ? '✓' : '✗';
    const status = gate.passed ? 'PASS' : 'FAIL';

    lines.push(`${icon} ${gate.name.toUpperCase()}: ${status}`);

    if (gate.fixAttempted && gate.fixSucceeded) {
      lines.push(`  └─ Auto-fixed`);
    } else if (gate.fixAttempted && !gate.fixSucceeded) {
      lines.push(`  └─ Auto-fix failed`);
    }

    if (!gate.passed && gate.output) {
      // Show first few lines of error output
      const outputLines = gate.output.split('\n').slice(0, 5);
      for (const line of outputLines) {
        if (line.trim()) {
          lines.push(`     ${line.trim()}`);
        }
      }
      if (gate.output.split('\n').length > 5) {
        lines.push(`     ... (truncated)`);
      }
    }

    lines.push('');
  }

  if (result.blockerIssues.length > 0) {
    lines.push('Blocker Issues Created:');
    for (const issueId of result.blockerIssues) {
      lines.push(`  - ${issueId}`);
    }
    lines.push('');
  }

  lines.push(result.summary);
  lines.push('');
  lines.push(`Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
