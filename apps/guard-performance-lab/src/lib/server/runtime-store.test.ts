import { describe, expect, it } from 'vitest';
import { D1LabStore, type GuardD1Database } from './d1-store.js';
import { JsonFileLabStore } from './store.js';
import { storeForRuntime } from './runtime-store.js';

describe('Guard Lab production storage', () => {
  it('fails closed without the durable D1 binding in production', () => {
    expect(() => storeForRuntime({ env: { ENVIRONMENT: 'production' } })).toThrow(/GUARD_LAB_DB/);
  });

  it('uses D1 when the production binding is present', () => {
    const db = {} as GuardD1Database;
    expect(storeForRuntime({ env: { ENVIRONMENT: 'production', GUARD_LAB_DB: db } })).toBeInstanceOf(D1LabStore);
  });

  it('honors an explicit private JSON datastore outside production even when the adapter exposes D1', () => {
    const previousPath = process.env.GUARD_LAB_DATA_PATH;
    process.env.GUARD_LAB_DATA_PATH = '/tmp/guard-lab-browser-proof.json';
    try {
      const db = {} as GuardD1Database;
      expect(storeForRuntime({ env: { ENVIRONMENT: 'development', GUARD_LAB_DB: db } })).toBeInstanceOf(JsonFileLabStore);
    } finally {
      if (previousPath === undefined) delete process.env.GUARD_LAB_DATA_PATH;
      else process.env.GUARD_LAB_DATA_PATH = previousPath;
    }
  });
});
