import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createGuardLabMcpServer, parseTrustedLauncherScope } from './server.js';
import { createInitialState } from '../lib/model.js';
import type { LabStore } from '../lib/server/store.js';

describe('Guard Lab stdio launcher scope', () => {
  it('has no implicit operator default', () => {
    expect(() => parseTrustedLauncherScope({})).toThrow(/trusted launcher/i);
  });

  it('accepts an explicit player scope from a trusted launcher', () => {
    expect(parseTrustedLauncherScope({
      GUARD_LAB_MCP_LAUNCHER: 'trusted',
      GUARD_LAB_MCP_SCOPE: 'player:developing-guard'
    })).toEqual({ role: 'player', playerId: 'developing-guard' });
  });

  it('publishes the complete introduction map as the Session 01 resource', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    let state = createInitialState('2026-07-12T00:00:00.000Z');
    const store: LabStore = {
      read: async () => state,
      mutate: async (transform) => state = await transform(state),
      reset: async () => state = createInitialState('2026-07-12T00:00:00.000Z')
    };
    const server = createGuardLabMcpServer(store, { role: 'operator' });
    const client = new Client({ name: 'guard-program-map-test', version: '1.0.0' }, { capabilities: {} });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const resource = await client.readResource({ uri: 'guard://program/session-01' });
    const content = resource.contents[0];
    expect(content && 'text' in content ? JSON.parse(content.text) : null).toMatchObject({
      version: '0.5.0',
      introductionFlow: expect.arrayContaining([expect.objectContaining({ id: 'arrive' }), expect.objectContaining({ id: 'receipt' })]),
      roleMap: expect.arrayContaining([expect.objectContaining({ owner: 'Coach' }), expect.objectContaining({ owner: 'Codex' })]),
      accessHandoff: expect.arrayContaining([expect.objectContaining({ id: 'now' }), expect.objectContaining({ id: 'later' })]),
      levelTransitions: expect.arrayContaining([expect.objectContaining({ id: 'college' }), expect.objectContaining({ id: 'pro' })]),
      clockPhases: expect.arrayContaining([expect.objectContaining({ id: 'early' }), expect.objectContaining({ id: 'late' })]),
      schemeReadMap: expect.arrayContaining([expect.objectContaining({ id: 'misdirection' })]),
      courtReadOrder: expect.arrayContaining([expect.objectContaining({ id: 'ball' }), expect.objectContaining({ id: 'second-side' })]),
      guardSchemeLibrary: expect.arrayContaining([expect.objectContaining({ id: 'five-out' }), expect.objectContaining({ id: 'spain-pnr' }), expect.objectContaining({ id: 'press-break' })]),
      evidenceFlow: expect.arrayContaining([expect.objectContaining({ id: 'receipt' })])
    });

    await client.close();
    await server.close();
  });
});
