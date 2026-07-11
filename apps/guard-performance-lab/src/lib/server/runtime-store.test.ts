import { describe, expect, it } from 'vitest';
import { D1LabStore, type GuardD1Database } from './d1-store.js';
import { storeForRuntime } from './runtime-store.js';

describe('Guard Lab production storage', () => {
  it('fails closed without the durable D1 binding in production', () => {
    expect(() => storeForRuntime({ env: { ENVIRONMENT: 'production' } })).toThrow(/GUARD_LAB_DB/);
  });

  it('uses D1 when the production binding is present', () => {
    const db = {} as GuardD1Database;
    expect(storeForRuntime({ env: { ENVIRONMENT: 'production', GUARD_LAB_DB: db } })).toBeInstanceOf(D1LabStore);
  });
});
