import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

export type AndonRecord = {
  id: string;
  createdAt: string; // ISO
  policyId: string;
  kind: 'commandExecution' | 'fileChange' | 'turn';
  phase?: 'approval' | 'started' | 'completed';
  threadId: string;
  turnId: string;
  itemId: string;
  summary: string;
  details: Record<string, unknown>;
  decision?: string;
  status?: string;
};

export function appendAndon(cwd: string, record: AndonRecord): string {
  const dir = join(cwd, '.judgment');
  mkdirSync(dir, { recursive: true });

  const path = join(dir, 'andon.jsonl');
  appendFileSync(path, `${JSON.stringify(record)}\n`, 'utf-8');
  return path;
}
