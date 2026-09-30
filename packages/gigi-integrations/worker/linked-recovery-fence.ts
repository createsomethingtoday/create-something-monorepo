/** Local operator verification of the migration's exact D1 trigger definitions. Never import in the Worker. */
import { readFileSync } from 'node:fs';

export const RECOVERY_FENCE_NAMES = [
  'gigi_removed_gmail_attempt_update_fence',
  'gigi_removed_gmail_attempt_delete_fence',
] as const;

export interface RecoveryFenceDefinition { name: string; sql: string }

export function canonicalizeRecoveryFenceSql(sql: string): string {
  return sql.replace(/\s+/gu, ' ').trim().replace(/;$/u, '');
}

export function readRecoveryFenceDefinitions(): RecoveryFenceDefinition[] {
  const source = readFileSync(new URL('./migrations/0002_exact_linked_recovery_fence.sql', import.meta.url), 'utf8');
  const definitions = [...source.matchAll(/CREATE TRIGGER\s+([a-z_]+)\b[\s\S]*?END;/gu)]
    .map((match) => ({ name: match[1]!, sql: canonicalizeRecoveryFenceSql(match[0]) }));
  if (definitions.length !== RECOVERY_FENCE_NAMES.length ||
    RECOVERY_FENCE_NAMES.some((name, index) => definitions[index]?.name !== name)) {
    throw new Error('recovery_fence_migration_invalid');
  }
  return definitions;
}
