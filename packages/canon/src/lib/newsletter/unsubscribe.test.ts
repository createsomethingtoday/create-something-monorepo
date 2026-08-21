import { describe, expect, it } from 'vitest';
import { processUnsubscribe } from './unsubscribe.js';

describe('unsubscribe lifecycle', () => {
  it('suppresses only the subscriber whose stored token matches', async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const token = btoa('reader@example.com:123456');
    const db = {
      prepare(sql: string) {
        let values: unknown[] = [];
        const statement = {
          bind(...nextValues: unknown[]) {
            values = nextValues;
            return statement;
          },
          async run() {
            calls.push({ sql, values });
            return { success: true };
          }
        };
        return statement;
      }
    };

    const result = await processUnsubscribe(token, db);

    expect(result.success).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toContain('unsubscribe_token = ?');
    expect(calls[0]!.sql).toContain('active = 0');
    expect(calls[0]!.values).toEqual(['reader@example.com', token]);
  });
});
