import { createHash } from 'node:crypto';

export function deterministicPercent(input: string): number {
  const hash = createHash('sha256').update(input).digest('hex');
  const first8 = hash.slice(0, 8);
  const value = Number.parseInt(first8, 16);
  return value % 100;
}

export function shouldSampleCanary(input: string, percent: number): boolean {
  const bounded = Math.max(0, Math.min(100, Math.floor(percent)));
  if (bounded <= 0) return false;
  if (bounded >= 100) return true;
  return deterministicPercent(input) < bounded;
}
