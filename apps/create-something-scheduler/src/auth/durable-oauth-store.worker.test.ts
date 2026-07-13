import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { GoogleCredentials } from './google-oauth.js';
import { DurableOAuthStore } from './durable-oauth-store.js';

describe('DurableOAuthStore', () => {
  it('consumes hashed state once and encrypts Google credentials at rest', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName('oauth-store-test'));
    const credentials: GoogleCredentials = {
      accessToken: 'controlled-access-token',
      refreshToken: 'controlled-refresh-token',
      expiresAt: '2026-07-13T16:00:00Z',
      grantedScopes: ['scope-a']
    };

    const result = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableOAuthStore(state, 'controlled-encryption-secret');
      await store.save({
        state: 'controlled-oauth-state',
        expiresAt: '2026-07-13T15:10:00Z'
      });
      const firstConsume = await store.consume(
        'controlled-oauth-state',
        '2026-07-13T15:00:00Z'
      );
      const secondConsume = await store.consume(
        'controlled-oauth-state',
        '2026-07-13T15:00:00Z'
      );
      await store.write(credentials);
      const raw = state.storage.kv.get('google:credentials');
      return {
        firstConsume,
        secondConsume,
        raw,
        decrypted: await store.read()
      };
    });

    expect(result.firstConsume).toBe(true);
    expect(result.secondConsume).toBe(false);
    expect(result.decrypted).toEqual(credentials);
    expect(JSON.stringify(result.raw)).not.toContain('controlled-access-token');
    expect(JSON.stringify(result.raw)).not.toContain('controlled-refresh-token');
  });
});
