import assert from 'node:assert/strict';
import test from 'node:test';

import { ComposioClient } from '@create-something/composio-bridge';

import { ComposioNotionGateway } from '../src/composio-gateway.js';

function fakeClient(ownedIds: string[]): ComposioClient {
  return {
    getSDK: () => ({
      connectedAccounts: {
        get: async () => ({
          id: 'ca_client_notion',
          status: 'ACTIVE',
          toolkit: { slug: 'notion' },
        }),
        list: async (query: unknown) => ({
          items: ownedIds.map((id) => ({ id })),
          query,
        }),
      },
    }),
  } as unknown as ComposioClient;
}

function gatewayWithDelete(deleteConnection: (id: string) => Promise<void>): ComposioNotionGateway {
  return new ComposioNotionGateway({
    apiKey: 'test-key',
    client: {
      getSDK: () => ({
        connectedAccounts: { delete: deleteConnection },
      }),
    } as never,
  });
}

test('active Composio connections are verified through a stable-user filtered list', async () => {
  const gateway = new ComposioNotionGateway({
    apiKey: 'test-key',
    client: fakeClient(['ca_client_notion']),
  });

  assert.deepEqual(
    await gateway.getConnection('ca_client_notion', 'client:acme:notion'),
    {
      id: 'ca_client_notion',
      status: 'ACTIVE',
      toolkit: 'notion',
      userId: 'client:acme:notion',
    },
  );
});

test('active Composio connections outside the stable client identity fail closed', async () => {
  const gateway = new ComposioNotionGateway({
    apiKey: 'test-key',
    client: fakeClient(['ca_someone_else']),
  });

  await assert.rejects(
    gateway.getConnection('ca_client_notion', 'client:acme:notion'),
    /COMPOSIO_CONNECTION_USER_MISMATCH/,
  );
});

test('revoking an already deleted Composio connection is idempotent', async () => {
  const gateway = gatewayWithDelete(async () => {
    throw Object.assign(new Error('404 resource not found'), { statusCode: 404 });
  });

  await assert.doesNotReject(gateway.revoke('ca_already_deleted'));
});

test('revocation failures other than not found remain fail closed', async () => {
  const gateway = gatewayWithDelete(async () => {
    throw Object.assign(new Error('Composio unavailable'), { statusCode: 503 });
  });

  await assert.rejects(gateway.revoke('ca_still_present'), /Composio unavailable/);
});
