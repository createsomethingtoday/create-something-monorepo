import test from 'node:test';
import assert from 'node:assert/strict';

import { registerComposioProxyTools } from '../src/tools/composio-proxy.js';
import type { DmComposioConfig } from '../src/config.js';

type ToolHandler = (
  params: Record<string, unknown>,
  extra?: unknown,
) => Promise<{
  content?: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}>;

type ConnectedAccount = {
  connectionId: string;
  status: string;
  rawStatus?: string | null;
  createdAt?: string | null;
};

type ToolDef = {
  slug: string;
  name: string;
  description: string;
  parameters: {
    properties: Record<string, unknown>;
    required: string[];
  };
};

class FakeServer {
  readonly handlers = new Map<string, ToolHandler>();

  registerTool(
    name: string,
    _definition: unknown,
    handler: ToolHandler,
  ): void {
    this.handlers.set(name, handler);
  }
}

function createConfig(overrides: Partial<DmComposioConfig> = {}): DmComposioConfig {
  return {
    defaultEntityId: 'dm',
    proxyMode: 'allowlist',
    allowedToolkits: ['slack'],
    allowedToolkitsByEntity: {},
    toolNamePrefix: 'dm_composio',
    toolCacheSeconds: 300,
    ...overrides,
  };
}

function createComposioClient(overrides: Partial<{
  getTools: (toolkits: string[]) => Promise<ToolDef[]>;
  getConnectedAccountsForToolkit: (
    entityId: string,
    toolkit: string,
  ) => Promise<ConnectedAccount[]>;
  executeTool: (
    slug: string,
    args: Record<string, unknown>,
    entityId: string,
    connectedAccountId?: string,
  ) => Promise<Record<string, unknown>>;
  hasActiveConnection: (entityId: string, toolkit: string) => Promise<boolean>;
}> = {}) {
  const state: {
    executeToolCalls: Array<{
      slug: string;
      args: Record<string, unknown>;
      entityId: string;
      connectedAccountId?: string;
    }>;
    connectedAccountLookups: Array<{ entityId: string; toolkit: string }>;
  } = {
    executeToolCalls: [],
    connectedAccountLookups: [],
  };

  const client = {
    getTools: async (toolkits: string[]) => {
      if (overrides.getTools) {
        return overrides.getTools(toolkits);
      }

      if (toolkits.includes('slack')) {
        return [
          {
            slug: 'slack_list_channels',
            name: 'List channels',
            description: 'List channels',
            parameters: {
              properties: {
                include_archived: { type: 'boolean' },
              },
              required: [],
            },
          },
        ];
      }

      return [];
    },
    getConnectedAccountsForToolkit: async (entityId: string, toolkit: string) => {
      state.connectedAccountLookups.push({ entityId, toolkit });
      if (overrides.getConnectedAccountsForToolkit) {
        return overrides.getConnectedAccountsForToolkit(entityId, toolkit);
      }
      return [
        { connectionId: 'conn_active', status: 'active', rawStatus: 'ACTIVE', createdAt: null },
      ];
    },
    executeTool: async (
      slug: string,
      args: Record<string, unknown>,
      entityId: string,
      connectedAccountId?: string,
    ) => {
      state.executeToolCalls.push({ slug, args, entityId, connectedAccountId });
      if (overrides.executeTool) {
        return overrides.executeTool(slug, args, entityId, connectedAccountId);
      }
      return { ok: true };
    },
    hasActiveConnection: async (entityId: string, toolkit: string) => {
      if (overrides.hasActiveConnection) {
        return overrides.hasActiveConnection(entityId, toolkit);
      }
      return true;
    },
    getSDK: () => ({
      connectedAccounts: {
        link: async () => ({
          id: 'req_1',
          status: 'PENDING',
          redirectUrl: 'https://connect.example.test',
        }),
      },
    }),
  };

  return { client, state };
}

function getHandler(server: FakeServer, name: string): ToolHandler {
  const handler = server.handlers.get(name);
  assert.ok(handler, `expected ${name} handler to be registered`);
  return handler;
}

function getProxyHandler(server: FakeServer): ToolHandler {
  return getHandler(server, 'dm_composio__slack__slack_list_channels');
}

test('connected_account_id does not override the default entity and is stripped before forwarding', async () => {
  const server = new FakeServer();
  const { client, state } = createComposioClient();

  await registerComposioProxyTools(server as unknown as never, {
    composioClient: client as never,
    composioConfig: createConfig(),
  });

  const handler = getProxyHandler(server);
  const result = await handler({
    connected_account_id: 'conn_active',
    include_archived: true,
  });

  assert.equal(result.isError, undefined);
  assert.deepEqual(state.connectedAccountLookups, [{ entityId: 'dm', toolkit: 'slack' }]);
  assert.deepEqual(state.executeToolCalls, [
    {
      slug: 'slack_list_channels',
      args: { include_archived: true },
      entityId: 'dm',
      connectedAccountId: 'conn_active',
    },
  ]);
});

test('entity selectors still override the default entity and are removed from forwarded args', async () => {
  const server = new FakeServer();
  const { client, state } = createComposioClient();

  await registerComposioProxyTools(server as unknown as never, {
    composioClient: client as never,
    composioConfig: createConfig(),
  });

  const handler = getProxyHandler(server);
  const result = await handler({
    entity_id: 'team-42',
    connectedAccountId: 'conn_active',
    include_archived: false,
  });

  assert.equal(result.isError, undefined);
  assert.deepEqual(state.connectedAccountLookups, [{ entityId: 'team-42', toolkit: 'slack' }]);
  assert.deepEqual(state.executeToolCalls, [
    {
      slug: 'slack_list_channels',
      args: { include_archived: false },
      entityId: 'team-42',
      connectedAccountId: 'conn_active',
    },
  ]);
});

test('multiple active connections still require connected_account_id', async () => {
  const server = new FakeServer();
  const { client } = createComposioClient({
    getConnectedAccountsForToolkit: async () => [
      { connectionId: 'conn_1', status: 'active' },
      { connectionId: 'conn_2', status: 'active' },
    ],
  });

  await registerComposioProxyTools(server as unknown as never, {
    composioClient: client as never,
    composioConfig: createConfig(),
  });

  const handler = getProxyHandler(server);
  const result = await handler({ include_archived: true });

  assert.equal(result.isError, true);
  assert.match(
    result.content?.[0]?.text ?? '',
    /Pass connected_account_id to disambiguate execution/,
  );
});

test('dm_gmail_list_recent_threads returns sorted thread summaries', async () => {
  const server = new FakeServer();
  const { client, state } = createComposioClient({
    getTools: async () => [],
    getConnectedAccountsForToolkit: async () => {
      return [
        { connectionId: 'conn_gmail', status: 'active', rawStatus: 'ACTIVE', createdAt: null },
      ];
    },
    executeTool: async (
      slug: string,
      args: Record<string, unknown>,
      entityId: string,
      connectedAccountId?: string,
    ) => {
      if (slug === 'gmail_fetch_emails') {
        return {
          data: {
            messages: [
              { threadId: 'thread_older' },
              { threadId: 'thread_newer' },
              { threadId: 'thread_newer' },
            ],
          },
        };
      }

      if (slug === 'gmail_fetch_message_by_thread_id' && args.thread_id === 'thread_older') {
        return {
          data: {
            messages: [
              {
                threadId: 'thread_older',
                messageId: 'msg_old',
                messageTimestamp: '2026-03-16T01:12:24Z',
                sender: 'Older Sender <older@example.com>',
                to: 'Danny Morgan <dm@halfdozen.co>',
                subject: 'Older thread',
                preview: { body: 'Older preview' },
                labelIds: ['INBOX'],
                attachmentList: [],
              },
            ],
          },
        };
      }

      if (slug === 'gmail_fetch_message_by_thread_id' && args.thread_id === 'thread_newer') {
        return {
          data: {
            messages: [
              {
                threadId: 'thread_newer',
                messageId: 'msg_new',
                messageTimestamp: '2026-03-17T21:48:57Z',
                sender: 'New Sender <new@example.com>',
                to: 'Danny Morgan <dm@halfdozen.co>',
                subject: 'Newest thread',
                preview: { body: 'Newest preview' },
                labelIds: ['INBOX', 'UNREAD'],
                attachmentList: [{ attachmentId: 'att_1' }],
              },
            ],
          },
        };
      }

      throw new Error(`Unexpected slug: ${slug}`);
    },
  });

  await registerComposioProxyTools(server as unknown as never, {
    composioClient: client as never,
    composioConfig: createConfig({
      allowedToolkits: ['gmail'],
    }),
  });

  const handler = getHandler(server, 'dm_gmail_list_recent_threads');
  const result = await handler({
    entity_id: 'acct_danny',
    connected_account_id: 'conn_gmail',
    query: 'is:unread',
    max_results: 2,
  });

  assert.equal(result.isError, undefined);
  assert.deepEqual(state.connectedAccountLookups, [{ entityId: 'acct_danny', toolkit: 'gmail' }]);
  assert.deepEqual(state.executeToolCalls, [
    {
      slug: 'gmail_fetch_emails',
      args: {
        user_id: 'me',
        verbose: false,
        ids_only: true,
        include_payload: false,
        include_spam_trash: false,
        max_results: 6,
        label_ids: ['INBOX'],
        query: 'is:unread',
      },
      entityId: 'acct_danny',
      connectedAccountId: 'conn_gmail',
    },
    {
      slug: 'gmail_fetch_message_by_thread_id',
      args: {
        user_id: 'me',
        thread_id: 'thread_older',
      },
      entityId: 'acct_danny',
      connectedAccountId: 'conn_gmail',
    },
    {
      slug: 'gmail_fetch_message_by_thread_id',
      args: {
        user_id: 'me',
        thread_id: 'thread_newer',
      },
      entityId: 'acct_danny',
      connectedAccountId: 'conn_gmail',
    },
  ]);

  assert.deepEqual(result.structuredContent?.threads, [
    {
      thread_id: 'thread_newer',
      latest_message_id: 'msg_new',
      latest_timestamp: '2026-03-17T21:48:57.000Z',
      subject: 'Newest thread',
      sender: 'New Sender <new@example.com>',
      to: 'Danny Morgan <dm@halfdozen.co>',
      preview: 'Newest preview',
      label_ids: ['INBOX', 'UNREAD'],
      unread: true,
      has_attachments: true,
      attachment_count: 1,
      message_count: 1,
    },
    {
      thread_id: 'thread_older',
      latest_message_id: 'msg_old',
      latest_timestamp: '2026-03-16T01:12:24.000Z',
      subject: 'Older thread',
      sender: 'Older Sender <older@example.com>',
      to: 'Danny Morgan <dm@halfdozen.co>',
      preview: 'Older preview',
      label_ids: ['INBOX'],
      unread: false,
      has_attachments: false,
      attachment_count: 0,
      message_count: 1,
    },
  ]);
});

test('dm_gmail_list_recent_threads requires connected_account_id when gmail has multiple active connections', async () => {
  const server = new FakeServer();
  const { client } = createComposioClient({
    getTools: async () => [],
    getConnectedAccountsForToolkit: async () => [
      { connectionId: 'conn_1', status: 'active' },
      { connectionId: 'conn_2', status: 'active' },
    ],
  });

  await registerComposioProxyTools(server as unknown as never, {
    composioClient: client as never,
    composioConfig: createConfig({
      allowedToolkits: ['gmail'],
    }),
  });

  const handler = getHandler(server, 'dm_gmail_list_recent_threads');
  const result = await handler({});

  assert.equal(result.isError, true);
  assert.match(
    result.content?.[0]?.text ?? '',
    /Pass connected_account_id to disambiguate execution/,
  );
});
