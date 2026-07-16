import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import {
  CanvaClientBindingService,
  type CanvaBindingRecord,
  type CanvaBindingStore,
  type CanvaConnectionGateway,
} from '../src/client-binding-service.js';
import {
  createCanvaOperatorMcpServer,
  type CanvaToolGateway,
} from '../src/server.js';

class MemoryBindingStore implements CanvaBindingStore {
  record: CanvaBindingRecord | null = null;
  audit: Array<Record<string, unknown>> = [];

  async read(): Promise<CanvaBindingRecord | null> {
    return this.record;
  }

  async reservePending(input: {
    reservationId: string;
    operatorSubject: string;
    now: string;
  }): Promise<CanvaBindingRecord> {
    if (this.record) throw new Error('CANVA_BINDING_NOT_AVAILABLE');
    this.record = {
      status: 'pending',
      reservationId: input.reservationId,
      operatorSubject: input.operatorSubject,
      createdAt: input.now,
      connectionRequestId: null,
    };
    return this.record;
  }

  async attachConnectionRequest(input: {
    reservationId: string;
    connectionRequestId: string;
  }): Promise<CanvaBindingRecord> {
    assert.equal(this.record?.status, 'pending');
    assert.equal(this.record.reservationId, input.reservationId);
    this.record = { ...this.record, connectionRequestId: input.connectionRequestId };
    return this.record;
  }

  async lock(input: {
    reservationId: string;
    connectedAccountId: string;
    lockedAt: string;
  }): Promise<CanvaBindingRecord> {
    assert.equal(this.record?.status, 'pending');
    assert.equal(this.record.reservationId, input.reservationId);
    this.record = {
      ...this.record,
      status: 'locked',
      connectedAccountId: input.connectedAccountId,
      lockedAt: input.lockedAt,
    };
    return this.record;
  }

  async releasePending(reservationId: string): Promise<void> {
    if (this.record?.status === 'pending' && this.record.reservationId === reservationId) {
      this.record = null;
    }
  }

  async reset(input: {
    expectedConnectedAccountId: string;
    operatorSubject: string;
    resetAt: string;
    receiptId: string;
    revoked: boolean;
  }): Promise<void> {
    assert.equal(this.record?.status, 'locked');
    assert.equal(this.record.connectedAccountId, input.expectedConnectedAccountId);
    this.audit.push(input);
    this.record = null;
  }

  async resetPending(input: {
    expectedReservationId: string;
    previousConnectionRequestId: string | null;
    operatorSubject: string;
    resetAt: string;
    receiptId: string;
    revoked: boolean;
  }): Promise<void> {
    assert.equal(this.record?.status, 'pending');
    assert.equal(this.record.reservationId, input.expectedReservationId);
    this.audit.push(input);
    this.record = null;
  }
}

class FakeConnectionGateway implements CanvaConnectionGateway, CanvaToolGateway {
  connectionStatus: 'PENDING' | 'ACTIVE' = 'PENDING';
  authorizeCalls = 0;
  revoked: string[] = [];
  executions: Array<{
    toolSlug: string;
    arguments: Record<string, unknown>;
    userId: string;
    connectedAccountId: string;
  }> = [];

  async authorize(): Promise<{ connectionRequestId: string; redirectUrl: string }> {
    this.authorizeCalls += 1;
    return {
      connectionRequestId: 'ca_client_canva',
      redirectUrl: 'https://connect.composio.dev/link/ln_client_canva',
    };
  }

  async getConnection(_connectionRequestId: string, expectedUserId: string): Promise<{
    id: string;
    status: 'PENDING' | 'ACTIVE';
    toolkit: string;
    userId: string;
  }> {
    return {
      id: 'ca_client_canva',
      status: this.connectionStatus,
      toolkit: 'canva',
      userId: expectedUserId,
    };
  }

  async revoke(connectedAccountId: string): Promise<void> {
    this.revoked.push(connectedAccountId);
  }

  async listTools() {
    return [
      {
        slug: 'CANVA_FETCH_CURRENT_USER_DETAILS',
        name: 'Fetch current user details',
        description: 'Return the Canva identity associated with the locked client connection.',
        inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
      },
    ];
  }

  async execute(input: {
    toolSlug: string;
    arguments: Record<string, unknown>;
    userId: string;
    connectedAccountId: string;
  }) {
    this.executions.push(input);
    return { ok: true, connectedAccountId: input.connectedAccountId };
  }
}

test('first completed Canva authorization locks the client account and blocks replacement links', async () => {
  const store = new MemoryBindingStore();
  const gateway = new FakeConnectionGateway();
  const service = new CanvaClientBindingService({
    store,
    gateway,
    composioUserId: 'client:acme:canva',
    now: () => '2026-07-16T19:00:00.000Z',
    randomId: () => 'reservation_1',
  });

  const link = await service.createConnectLink({ operatorSubject: 'operator_123' });
  assert.equal(link.status, 'pending');
  assert.equal(link.redirectUrl, 'https://connect.composio.dev/link/ln_client_canva');
  assert.equal(gateway.authorizeCalls, 1);

  gateway.connectionStatus = 'ACTIVE';
  const locked = await service.getStatus();
  assert.equal(locked.status, 'locked');
  assert.equal(locked.connectedAccountId, 'ca_client_canva');

  await assert.rejects(
    service.createConnectLink({ operatorSubject: 'operator_123' }),
    /CANVA_CONNECTION_LOCKED/,
  );
  assert.equal(gateway.authorizeCalls, 1);
});

test('operator reset requires client-specific confirmation, revokes the old account, and permits rebind', async () => {
  const store = new MemoryBindingStore();
  const gateway = new FakeConnectionGateway();
  const service = new CanvaClientBindingService({
    store,
    gateway,
    composioUserId: 'client:acme:canva',
    now: () => '2026-07-16T19:30:00.000Z',
    randomId: (() => {
      const ids = ['reservation_1', 'reset_receipt_1', 'reservation_2'];
      return () => ids.shift() ?? 'fallback_id';
    })(),
  });

  await service.createConnectLink({ operatorSubject: 'operator_123' });
  gateway.connectionStatus = 'ACTIVE';
  await service.getStatus();

  await assert.rejects(
    service.resetConnection({
      operatorSubject: 'operator_456',
      confirmation: 'RESET something-else',
    }),
    /CANVA_RESET_CONFIRMATION_REQUIRED/,
  );
  assert.deepEqual(gateway.revoked, []);
  assert.equal((await service.getStatus()).status, 'locked');

  const receipt = await service.resetConnection({
    operatorSubject: 'operator_456',
    confirmation: 'RESET client:acme:canva',
  });
  assert.deepEqual(receipt, {
    receiptId: 'reset_receipt_1',
    previousConnectedAccountId: 'ca_client_canva',
    revoked: true,
    resetAt: '2026-07-16T19:30:00.000Z',
    operatorSubject: 'operator_456',
  });
  assert.deepEqual(gateway.revoked, ['ca_client_canva']);
  assert.equal((await service.getStatus()).status, 'unbound');
  assert.equal(store.audit.length, 1);

  gateway.connectionStatus = 'PENDING';
  const nextLink = await service.createConnectLink({ operatorSubject: 'operator_456' });
  assert.equal(nextLink.status, 'pending');
  assert.equal(gateway.authorizeCalls, 2);
});

test('operator reset cancels a pending request and immediately permits a fresh link', async () => {
  const store = new MemoryBindingStore();
  const gateway = new FakeConnectionGateway();
  const service = new CanvaClientBindingService({
    store,
    gateway,
    composioUserId: 'client:acme:canva',
    now: () => '2026-07-16T21:00:00.000Z',
    randomId: (() => {
      const ids = ['reservation_1', 'reset_receipt_1', 'reservation_2'];
      return () => ids.shift() ?? 'fallback_id';
    })(),
  });

  await service.createConnectLink({ operatorSubject: 'operator_123' });
  const receipt = await service.resetConnection({
    operatorSubject: 'operator_456',
    confirmation: 'RESET client:acme:canva',
  });

  assert.deepEqual(receipt, {
    receiptId: 'reset_receipt_1',
    previousStatus: 'pending',
    previousConnectionRequestId: 'ca_client_canva',
    revoked: true,
    resetAt: '2026-07-16T21:00:00.000Z',
    operatorSubject: 'operator_456',
  });
  assert.deepEqual(gateway.revoked, ['ca_client_canva']);
  assert.equal((await service.getStatus()).status, 'unbound');
  assert.equal(store.audit.length, 1);

  const nextLink = await service.createConnectLink({ operatorSubject: 'operator_456' });
  assert.equal(nextLink.status, 'pending');
  assert.equal(gateway.authorizeCalls, 2);
});

test('MCP Canva tools execute only through the locked client account', async () => {
  const store = new MemoryBindingStore();
  const gateway = new FakeConnectionGateway();
  const service = new CanvaClientBindingService({
    store,
    gateway,
    composioUserId: 'client:acme:canva',
    now: () => '2026-07-16T20:00:00.000Z',
    randomId: () => 'reservation_1',
  });
  const server = await createCanvaOperatorMcpServer({
    service,
    gateway,
    composioUserId: 'client:acme:canva',
    operator: {
      subject: 'operator_123',
      email: 'operator@createsomething.io',
      scopes: ['canva-client:read', 'canva-client:write', 'canva-client:admin'],
    },
  });
  const client = new Client(
    { name: 'canva-client-operator-test', version: '1.0.0' },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'canva_create_connect_link'));
    assert.ok(tools.tools.some((tool) => tool.name === 'canva_reset_connection'));
    assert.ok(tools.tools.some((tool) => tool.name === 'client_canva_fetch_current_user_details'));

    const beforeAuth = await client.callTool({
      name: 'client_canva_fetch_current_user_details',
      arguments: {},
    });
    assert.equal(beforeAuth.isError, true);
    assert.match(JSON.stringify(beforeAuth.content), /CANVA_CONNECTION_REQUIRED/);

    await service.createConnectLink({ operatorSubject: 'operator_123' });
    gateway.connectionStatus = 'ACTIVE';
    await service.getStatus();

    const afterAuth = await client.callTool({
      name: 'client_canva_fetch_current_user_details',
      arguments: {},
    });
    assert.notEqual(afterAuth.isError, true);
    assert.deepEqual(gateway.executions, [
      {
        toolSlug: 'CANVA_FETCH_CURRENT_USER_DETAILS',
        arguments: {},
        userId: 'client:acme:canva',
        connectedAccountId: 'ca_client_canva',
      },
    ]);
  } finally {
    await client.close();
    await server.close();
  }
});

test('MCP admin reset clears a stale pending request through the Claude-facing tool', async () => {
  const store = new MemoryBindingStore();
  const gateway = new FakeConnectionGateway();
  const service = new CanvaClientBindingService({
    store,
    gateway,
    composioUserId: 'client:acme:canva',
    randomId: (() => {
      const ids = ['reservation_1', 'reset_receipt_1', 'reservation_2'];
      return () => ids.shift() ?? 'fallback_id';
    })(),
  });
  const server = await createCanvaOperatorMcpServer({
    service,
    gateway,
    composioUserId: 'client:acme:canva',
    operator: {
      subject: 'operator_admin',
      email: 'operator@createsomething.io',
      scopes: ['canva-client:read', 'canva-client:admin'],
    },
  });
  const client = new Client(
    { name: 'canva-client-pending-reset-test', version: '1.0.0' },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    await client.callTool({ name: 'canva_create_connect_link', arguments: {} });
    const reset = await client.callTool({
      name: 'canva_reset_connection',
      arguments: { confirmation: 'RESET client:acme:canva' },
    });
    assert.notEqual(reset.isError, true);
    assert.equal(
      (reset.structuredContent as { previousStatus?: string } | undefined)?.previousStatus,
      'pending',
    );

    const replacement = await client.callTool({
      name: 'canva_create_connect_link',
      arguments: {},
    });
    assert.notEqual(replacement.isError, true);
    assert.equal(gateway.authorizeCalls, 2);
  } finally {
    await client.close();
    await server.close();
  }
});

test('read-only operators can inspect status but cannot discover or call admin and Canva write tools', async () => {
  const store = new MemoryBindingStore();
  const gateway = new FakeConnectionGateway();
  const service = new CanvaClientBindingService({
    store,
    gateway,
    composioUserId: 'client:acme:canva',
  });
  const server = await createCanvaOperatorMcpServer({
    service,
    gateway,
    composioUserId: 'client:acme:canva',
    operator: {
      subject: 'operator_read_only',
      email: 'reader@createsomething.io',
      scopes: ['canva-client:read'],
    },
  });
  const client = new Client(
    { name: 'canva-client-read-only-test', version: '1.0.0' },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name),
      ['canva_connection_status'],
    );

    const forbidden = await client.callTool({
      name: 'canva_create_connect_link',
      arguments: {},
    });
    assert.equal(forbidden.isError, true);
    assert.match(JSON.stringify(forbidden.content), /canva-client:admin/);

    const unknownWriteTool = await client.callTool({
      name: 'client_canva_fetch_current_user_details',
      arguments: {},
    });
    assert.equal(unknownWriteTool.isError, true);
    assert.match(JSON.stringify(unknownWriteTool.content), /canva-client:write/);
    assert.deepEqual(gateway.executions, []);
  } finally {
    await client.close();
    await server.close();
  }
});
