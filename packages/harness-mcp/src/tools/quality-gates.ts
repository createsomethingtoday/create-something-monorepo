import { execCommand, findMonorepoRoot } from '../utils.js';
import type { QualityGateResult } from '../types.js';

interface CommandSpec {
  command: string;
  args: string[];
}

function buildLintCommand(packageName?: string, autoFix?: boolean): CommandSpec {
  const args = ['-w', 'lint'];

  if (packageName || autoFix) {
    args.push('--');
  }

  if (packageName) {
    args.push(`--package=${packageName}`);
  }

  if (autoFix) {
    args.push('--fix');
  }

  return { command: 'pnpm', args };
}

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

  const commands: Record<typeof gate, CommandSpec> = {
    tests: options?.package
      ? { command: 'pnpm', args: [`--filter=${options.package}`, 'test'] }
      : { command: 'pnpm', args: ['test'] },
    typecheck: options?.package
      ? { command: 'pnpm', args: [`--filter=${options.package}`, 'exec', 'tsc', '--noEmit'] }
      : { command: 'tsc', args: ['--noEmit'] },
    lint: buildLintCommand(options?.package, options?.autoFix)
  };

  const { command, args } = commands[gate];

  const result = execCommand(command, args, cwd);

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
