/**
 * @create-something/harness
 *
 * Self-Healing Baseline: Quality gates before starting work.
 * Upstream pattern from Steve Yegge's VC project.
 *
 * Philosophy: Run quality gates at session start to prevent the "broken windows"
 * problem where existing failures mask new regressions. VC achieves 90.9% pass
 * rate through this pattern.
 */

import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  BaselineConfig,
  BaselineGate,
  BaselineResult,
  BaselineHealth,
  QualityGateType,
  QualityGatesConfig,
  QualityGateDefinition,
} from './types.js';
import { DEFAULT_BASELINE_CONFIG, DEFAULT_HARNESS_CONFIG } from './types.js';
import { createSelfHealIssue } from './beads.js';

const exec = promisify(execCallback);

/**
 * Commands for each quality gate type.
 * Designed for pnpm monorepo with optional package filter.
 */
function getGateCommand(
  gate: QualityGateType,
  packageFilter?: string,
  isFix = false
): string {
  const filter = packageFilter ? `--filter=${packageFilter}` : '';

  switch (gate) {
    case 'tests':
      return `pnpm ${filter} test`.trim();
    case 'typecheck':
      return `pnpm ${filter} exec tsc --noEmit`.trim();
    case 'lint':
      if (isFix) {
        return `pnpm ${filter} exec eslint --fix .`.trim();
      }
      return `pnpm ${filter} exec eslint .`.trim();
    case 'build':
      return `pnpm ${filter} build`.trim();
  }
}

/**
 * Run a single quality gate.
 */
export async function runQualityGate(
  gate: QualityGateType,
  config: BaselineConfig,
  cwd: string
): Promise<BaselineGate> {
  const command = getGateCommand(gate, config.packageFilter);
  const startTime = Date.now();

  console.log(`  ⏳ Running ${gate}...`);

  try {
    const { stdout, stderr } = await Promise.race([
      exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), config.gateTimeoutMs)
      ),
    ]);

    const durationMs = Date.now() - startTime;
    const output = (stdout + stderr).slice(-5000); // Keep last 5000 chars

    console.log(`  ✅ ${gate} passed (${(durationMs / 1000).toFixed(1)}s)`);

    return {
      name: gate,
      passed: true,
      output,
      durationMs,
      fixAttempted: false,
      fixSucceeded: false,
      exitCode: 0,
      command,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const execError = error as { stdout?: string; stderr?: string; code?: number; message?: string };

    const output = ((execError.stdout || '') + (execError.stderr || '') + (execError.message || '')).slice(-5000);
    const exitCode = execError.code ?? 1;

    console.log(`  ❌ ${gate} failed (exit ${exitCode}, ${(durationMs / 1000).toFixed(1)}s)`);

    return {
      name: gate,
      passed: false,
      output,
      durationMs,
      fixAttempted: false,
      fixSucceeded: false,
      exitCode,
      command,
    };
  }
}

/**
 * Attempt to auto-fix a failing gate.
 * Currently supports:
 * - lint: Run with --fix flag
 */
export async function attemptAutoFix(
  gate: BaselineGate,
  config: BaselineConfig,
  cwd: string
): Promise<BaselineGate> {
  // Only lint supports auto-fix currently
  if (gate.name !== 'lint') {
    return { ...gate, fixAttempted: true, fixSucceeded: false };
  }

  console.log(`  🔧 Attempting auto-fix for ${gate.name}...`);

  const fixCommand = getGateCommand('lint', config.packageFilter, true);
  const startTime = Date.now();

  try {
    await exec(fixCommand, { cwd, maxBuffer: 10 * 1024 * 1024 });

    // Re-run the original check to see if it passes now
    const recheckResult = await runQualityGate(gate.name, config, cwd);

    if (recheckResult.passed) {
      console.log(`  ✅ Auto-fix succeeded for ${gate.name}`);
      return {
        ...recheckResult,
        fixAttempted: true,
        fixSucceeded: true,
        durationMs: Date.now() - startTime,
      };
    } else {
      console.log(`  ⚠ Auto-fix ran but ${gate.name} still failing`);
      return {
        ...recheckResult,
        fixAttempted: true,
        fixSucceeded: false,
      };
    }
  } catch (error) {
    console.log(`  ⚠ Auto-fix failed for ${gate.name}`);
    return {
      ...gate,
      fixAttempted: true,
      fixSucceeded: false,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Run a custom quality gate defined in config.
 * Supports configurable commands for domain-specific quality checks.
 */
export async function runCustomGate(
  gateDef: QualityGateDefinition,
  cwd: string,
  timeoutMs: number = 5 * 60 * 1000
): Promise<BaselineGate> {
  const startTime = Date.now();
  const effectiveTimeout = gateDef.timeout ?? timeoutMs;

  console.log(`  ⏳ Running ${gateDef.name}...`);

  try {
    const { stdout, stderr } = await Promise.race([
      exec(gateDef.command, { cwd, maxBuffer: 10 * 1024 * 1024 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), effectiveTimeout)
      ),
    ]);

    const durationMs = Date.now() - startTime;
    const output = (stdout + stderr).slice(-5000);

    console.log(`  ✅ ${gateDef.name} passed (${(durationMs / 1000).toFixed(1)}s)`);

    return {
      name: gateDef.name as QualityGateType,
      passed: true,
      output,
      durationMs,
      fixAttempted: false,
      fixSucceeded: false,
      exitCode: 0,
      command: gateDef.command,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const execError = error as { stdout?: string; stderr?: string; code?: number; message?: string };

    const output = ((execError.stdout || '') + (execError.stderr || '') + (execError.message || '')).slice(-5000);
    const exitCode = execError.code ?? 1;

    console.log(`  ❌ ${gateDef.name} failed (exit ${exitCode}, ${(durationMs / 1000).toFixed(1)}s)`);

    return {
      name: gateDef.name as QualityGateType,
      passed: false,
      output,
      durationMs,
      fixAttempted: false,
      fixSucceeded: false,
      exitCode,
      command: gateDef.command,
    };
  }
}

/**
 * Attempt auto-fix for a custom gate.
 */
export async function attemptCustomAutoFix(
  gate: BaselineGate,
  gateDef: QualityGateDefinition,
  cwd: string,
  timeoutMs: number = 5 * 60 * 1000
): Promise<BaselineGate> {
  if (!gateDef.autoFixCommand) {
    return { ...gate, fixAttempted: true, fixSucceeded: false };
  }

  console.log(`  🔧 Attempting auto-fix for ${gate.name}...`);
  const startTime = Date.now();

  try {
    await exec(gateDef.autoFixCommand, { cwd, maxBuffer: 10 * 1024 * 1024 });

    // Re-run the original check
    const recheckResult = await runCustomGate(gateDef, cwd, timeoutMs);

    if (recheckResult.passed) {
      console.log(`  ✅ Auto-fix succeeded for ${gate.name}`);
      return {
        ...recheckResult,
        fixAttempted: true,
        fixSucceeded: true,
        durationMs: Date.now() - startTime,
      };
    } else {
      console.log(`  ⚠ Auto-fix ran but ${gate.name} still failing`);
      return {
        ...recheckResult,
        fixAttempted: true,
        fixSucceeded: false,
      };
    }
  } catch (error) {
    console.log(`  ⚠ Auto-fix failed for ${gate.name}`);
    return {
      ...gate,
      fixAttempted: true,
      fixSucceeded: false,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Create a blocker issue for a failing baseline gate.
 */
export async function createBaselineBlocker(
  gate: BaselineGate,
  cwd: string
): Promise<string> {
  const title = `[Self-Heal] Fix failing ${gate.name} baseline`;

  const description = `
## Baseline Gate Failure

**Gate**: ${gate.name}
**Command**: \`${gate.command}\`
**Exit Code**: ${gate.exitCode}
**Auto-fix Attempted**: ${gate.fixAttempted ? 'Yes' : 'No'}
**Auto-fix Succeeded**: ${gate.fixSucceeded ? 'Yes' : 'No'}

## Output

\`\`\`
${gate.output.slice(-2000)}
\`\`\`

## Required Action

Fix the failing ${gate.name} gate before continuing with new work.
This issue was auto-created by the harness self-healing baseline check.

---
*Upstream pattern from VC: prevent "broken windows" problem.*
`.trim();

  const issueId = await createSelfHealIssue(
    title,
    description,
    { checkpointId: 'baseline-check' },
    cwd
  );
  console.log(`  📋 Created blocker issue: ${issueId}`);

  return issueId;
}

/**
 * Run all configured quality gates.
 * Returns overall baseline result with pass/fail status.
 */
export async function runBaselineCheck(
  config: BaselineConfig = DEFAULT_BASELINE_CONFIG,
  cwd: string
): Promise<BaselineResult> {
  if (!config.enabled) {
    return {
      passed: true,
      gates: [],
      blockerIssues: [],
      timestamp: new Date().toISOString(),
      totalDurationMs: 0,
      summary: 'Baseline check disabled',
    };
  }

  console.log('\n🔍 Running baseline quality gates...\n');
  const startTime = Date.now();
  const gates: BaselineGate[] = [];
  const blockerIssues: string[] = [];

  // Determine which gates to run
  const gatesToRun: QualityGateType[] = [];
  if (config.gates.typecheck) gatesToRun.push('typecheck');
  if (config.gates.lint) gatesToRun.push('lint');
  if (config.gates.tests) gatesToRun.push('tests');
  if (config.gates.build) gatesToRun.push('build');

  // Run each gate
  for (const gateType of gatesToRun) {
    let result = await runQualityGate(gateType, config, cwd);

    // Attempt auto-fix if enabled and gate failed
    if (!result.passed && config.autoFix) {
      result = await attemptAutoFix(result, config, cwd);
    }

    gates.push(result);

    // Create blocker issue if still failing and configured to do so
    if (!result.passed && config.createBlockers) {
      const blockerId = await createBaselineBlocker(result, cwd);
      blockerIssues.push(blockerId);
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const passed = gates.every(g => g.passed);
  const passedCount = gates.filter(g => g.passed).length;
  const failedCount = gates.filter(g => !g.passed).length;

  const summary = passed
    ? `All ${gates.length} quality gates passed (${(totalDurationMs / 1000).toFixed(1)}s)`
    : `${failedCount}/${gates.length} gates failed (${blockerIssues.length} blocker issues created)`;

  console.log(`\n${passed ? '✅' : '❌'} Baseline: ${summary}\n`);

  return {
    passed,
    gates,
    blockerIssues,
    timestamp: new Date().toISOString(),
    totalDurationMs,
    summary,
  };
}

/**
 * Run quality gates using HarnessConfig's QualityGatesConfig.
 * Supports both built-in gates and custom domain-specific gates.
 *
 * Philosophy: Different domains have different quality criteria.
 * - Legal: contract-validation, redaction-check
 * - Finance: audit-trail, compliance-check
 * - Manufacturing: tolerance-check, bom-validation
 */
export async function runConfiguredGates(
  config: QualityGatesConfig = DEFAULT_HARNESS_CONFIG.qualityGates,
  cwd: string,
  packageFilter?: string
): Promise<BaselineResult> {
  if (!config.enabled) {
    return {
      passed: true,
      gates: [],
      blockerIssues: [],
      timestamp: new Date().toISOString(),
      totalDurationMs: 0,
      summary: 'Quality gates disabled',
    };
  }

  console.log('\n🔍 Running quality gates...\n');
  const startTime = Date.now();
  const gates: BaselineGate[] = [];
  const blockerIssues: string[] = [];

  // Build BaselineConfig for built-in gates
  const baselineConfig: BaselineConfig = {
    enabled: true,
    gates: config.builtIn,
    autoFix: config.autoFix,
    createBlockers: config.createBlockers,
    maxAutoFixAttempts: 1,
    gateTimeoutMs: config.gateTimeoutMs,
    packageFilter,
  };

  // Run built-in gates first
  const builtInGates: QualityGateType[] = [];
  if (config.builtIn.typecheck) builtInGates.push('typecheck');
  if (config.builtIn.lint) builtInGates.push('lint');
  if (config.builtIn.tests) builtInGates.push('tests');
  if (config.builtIn.build) builtInGates.push('build');

  for (const gateType of builtInGates) {
    let result = await runQualityGate(gateType, baselineConfig, cwd);

    if (!result.passed && config.autoFix) {
      result = await attemptAutoFix(result, baselineConfig, cwd);
    }

    gates.push(result);

    if (!result.passed && config.createBlockers) {
      const blockerId = await createBaselineBlocker(result, cwd);
      blockerIssues.push(blockerId);
    }
  }

  // Run custom gates
  for (const gateDef of config.custom) {
    let result = await runCustomGate(gateDef, cwd, config.gateTimeoutMs);

    if (!result.passed && config.autoFix && gateDef.autoFixCommand) {
      result = await attemptCustomAutoFix(result, gateDef, cwd, config.gateTimeoutMs);
    }

    gates.push(result);

    // Create blocker if failed and configured (respects per-gate canBlock setting)
    const shouldBlock = gateDef.canBlock !== false; // default true
    if (!result.passed && config.createBlockers && shouldBlock) {
      const blockerId = await createBaselineBlocker(result, cwd);
      blockerIssues.push(blockerId);
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const passed = gates.every(g => g.passed);
  const failedCount = gates.filter(g => !g.passed).length;

  const summary = passed
    ? `All ${gates.length} quality gates passed (${(totalDurationMs / 1000).toFixed(1)}s)`
    : `${failedCount}/${gates.length} gates failed (${blockerIssues.length} blocker issues created)`;

  console.log(`\n${passed ? '✅' : '❌'} Quality gates: ${summary}\n`);

  return {
    passed,
    gates,
    blockerIssues,
    timestamp: new Date().toISOString(),
    totalDurationMs,
    summary,
  };
}

/**
 * Format baseline result for display.
 */
export function formatBaselineDisplay(result: BaselineResult): string {
  const lines: string[] = [];

  lines.push('┌────────────────────────────────────────────────────────────────┐');
  lines.push(`│  BASELINE ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}                                          │`);
  lines.push('├────────────────────────────────────────────────────────────────┤');

  for (const gate of result.gates) {
    const icon = gate.passed ? '✅' : '❌';
    const fixNote = gate.fixAttempted
      ? gate.fixSucceeded
        ? ' (auto-fixed)'
        : ' (fix failed)'
      : '';
    const duration = `${(gate.durationMs / 1000).toFixed(1)}s`;
    lines.push(`│  ${icon} ${gate.name.padEnd(12)} ${duration.padStart(8)}${fixNote.padEnd(20)} │`);
  }

  if (result.blockerIssues.length > 0) {
    lines.push('├────────────────────────────────────────────────────────────────┤');
    lines.push(`│  Blocker Issues: ${result.blockerIssues.join(', ').slice(0, 44).padEnd(44)} │`);
  }

  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push(`│  Total: ${(result.totalDurationMs / 1000).toFixed(1)}s                                              │`);
  lines.push('└────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Create empty baseline health tracker.
 */
export function createBaselineHealth(): BaselineHealth {
  return {
    totalChecks: 0,
    passedFirst: 0,
    passedAfterFix: 0,
    failed: 0,
    passRate: 100,
    commonFailures: [],
    lastResult: null,
  };
}

/**
 * Update baseline health with a new result.
 */
export function updateBaselineHealth(
  health: BaselineHealth,
  result: BaselineResult
): BaselineHealth {
  const newHealth = { ...health };
  newHealth.totalChecks++;
  newHealth.lastResult = result;

  if (result.passed) {
    const hadAutoFix = result.gates.some(g => g.fixSucceeded);
    if (hadAutoFix) {
      newHealth.passedAfterFix++;
    } else {
      newHealth.passedFirst++;
    }
  } else {
    newHealth.failed++;
  }

  // Calculate pass rate
  newHealth.passRate =
    newHealth.totalChecks > 0
      ? ((newHealth.passedFirst + newHealth.passedAfterFix) / newHealth.totalChecks) * 100
      : 100;

  // Update common failures
  const failureCounts = new Map<QualityGateType, number>();
  for (const gate of result.gates) {
    if (!gate.passed) {
      const current = failureCounts.get(gate.name) || 0;
      failureCounts.set(gate.name, current + 1);
    }
  }

  // Merge with existing common failures
  for (const existing of health.commonFailures) {
    const additional = failureCounts.get(existing.gate) || 0;
    failureCounts.set(existing.gate, existing.count + additional);
  }

  newHealth.commonFailures = Array.from(failureCounts.entries())
    .map(([gate, count]) => ({ gate, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return newHealth;
}

/**
 * Format baseline health for display.
 */
export function formatBaselineHealth(health: BaselineHealth): string {
  const lines: string[] = [];

  lines.push('┌────────────────────────────────────────────────────────────────┐');
  lines.push('│  BASELINE HEALTH                                               │');
  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push(`│  Total Checks: ${String(health.totalChecks).padStart(5)}                                        │`);
  lines.push(`│  Pass Rate:    ${health.passRate.toFixed(1).padStart(5)}%                                       │`);
  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push(`│  Passed First: ${String(health.passedFirst).padStart(5)}                                        │`);
  lines.push(`│  After Fix:    ${String(health.passedAfterFix).padStart(5)}                                        │`);
  lines.push(`│  Failed:       ${String(health.failed).padStart(5)}                                        │`);

  if (health.commonFailures.length > 0) {
    lines.push('├────────────────────────────────────────────────────────────────┤');
    lines.push('│  Common Failures:                                              │');
    for (const failure of health.commonFailures.slice(0, 3)) {
      lines.push(`│    ${failure.gate.padEnd(12)} ${String(failure.count).padStart(3)} times                            │`);
    }
  }

  lines.push('└────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Check if baseline allows work to proceed.
 * Returns true if:
 * - Baseline passed
 * - OR baseline check is disabled
 * - OR all failures have blocker issues created
 */
export function canProceedWithWork(result: BaselineResult, config: BaselineConfig): boolean {
  if (!config.enabled) return true;
  if (result.passed) return true;

  // If blockers are created, we can proceed (work on blockers first)
  if (config.createBlockers && result.blockerIssues.length > 0) {
    return true;
  }

  return false;
}

/**
 * Get issues to work on based on baseline result.
 * If baseline failed and blockers were created, returns blocker IDs.
 * Otherwise returns empty array (proceed with normal work).
 */
export function getBaselineBlockers(result: BaselineResult): string[] {
  if (result.passed) return [];
  return result.blockerIssues;
}
