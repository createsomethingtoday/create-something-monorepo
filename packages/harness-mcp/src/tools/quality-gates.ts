import { execCommand, findMonorepoRoot } from '../utils.js';
import type { QualityGateResult } from '../types.js';

export function runQualityGate(
  gate: 'tests' | 'typecheck' | 'lint',
  options?: {
    cwd?: string;
    package?: string;
    autoFix?: boolean;
  }
): QualityGateResult {
  const root = findMonorepoRoot();
  const cwd = options?.cwd || root;

  const commands: Record<typeof gate, string> = {
    tests: options?.package
      ? `pnpm --filter=${options.package} test`
      : 'pnpm test',
    typecheck: options?.package
      ? `pnpm --filter=${options.package} exec tsc --noEmit`
      : 'tsc --noEmit',
    lint: options?.package
      ? `pnpm --filter=${options.package} exec eslint src/`
      : 'eslint src/'
  };

  let command = commands[gate];

  // Auto-fix for lint
  if (gate === 'lint' && options?.autoFix) {
    command += ' --fix';
  }

  const result = execCommand(command, cwd);

  return {
    gate,
    success: result.success,
    output: result.output,
    duration: result.duration,
    fixable: gate === 'lint' && !options?.autoFix,
    autoFixed: gate === 'lint' && options?.autoFix && result.success
  };
}

export function runAllGates(options?: {
  cwd?: string;
  package?: string;
  autoFix?: boolean;
}): QualityGateResult[] {
  const gates: Array<'tests' | 'typecheck' | 'lint'> = ['typecheck', 'lint', 'tests'];
  const results: QualityGateResult[] = [];

  for (const gate of gates) {
    try {
      const result = runQualityGate(gate, options);
      results.push(result);

      // Stop on first failure (unless auto-fixing lint)
      if (!result.success && !(gate === 'lint' && options?.autoFix)) {
        break;
      }
    } catch (error: any) {
      results.push({
        gate,
        success: false,
        output: error.message,
        duration: 0
      });
      break;
    }
  }

  return results;
}
