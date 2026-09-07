import { existsSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';

// Shared environment discovery only; duplicate-analysis fixtures stay independent.
export function findWorkspaceRoot(start: string): string {
  let current = resolve(start);
  const root = parse(current).root;
  while (current !== root) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    current = dirname(current);
  }
  throw new Error(`Unable to find workspace root from ${start}`);
}
