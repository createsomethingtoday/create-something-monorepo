import { ComposioClient } from '@create-something/composio-bridge';

import type { CanvaConnectionGateway } from './client-binding-service.js';
import type { CanvaToolDefinition, CanvaToolGateway } from './server.js';

export class ComposioCanvaGateway implements CanvaConnectionGateway, CanvaToolGateway {
  private readonly client: ComposioClient;

  constructor(input: {
    apiKey: string;
    authConfigId?: string;
    client?: ComposioClient;
  }) {
    this.client = input.client ?? new ComposioClient({ apiKey: input.apiKey });
    this.authConfigId = input.authConfigId?.trim() || undefined;
  }

  private readonly authConfigId: string | undefined;

  async authorize(input: { userId: string }): Promise<{
    connectionRequestId: string;
    redirectUrl: string;
  }> {
    const request = await this.client
      .getSDK()
      .toolkits.authorize(input.userId, 'canva', this.authConfigId);
    const record = asRecord(request);
    return {
      connectionRequestId: requiredString(record, 'id'),
      redirectUrl: requiredString(record, 'redirectUrl'),
    };
  }

  async getConnection(connectionRequestId: string, expectedUserId: string): Promise<{
    id: string;
    status: string;
    toolkit: string;
    userId: string;
  }> {
    const sdk = this.client.getSDK();
    const connection = await sdk.connectedAccounts.get(connectionRequestId);
    if (connection.status === 'ACTIVE') {
      const ownedConnections = await sdk.connectedAccounts.list({
        userIds: [expectedUserId],
        toolkitSlugs: ['canva'],
        limit: 100,
      });
      if (!ownedConnections.items.some((item) => item.id === connection.id)) {
        throw new Error(
          'COMPOSIO_CONNECTION_USER_MISMATCH: The active Canva connection is not owned by the configured client identity.',
        );
      }
    }
    return {
      id: connection.id,
      status: connection.status,
      toolkit: connection.toolkit.slug,
      userId: expectedUserId,
    };
  }

  async revoke(connectedAccountId: string): Promise<void> {
    await this.client.getSDK().connectedAccounts.delete(connectedAccountId);
  }

  async listTools(): Promise<CanvaToolDefinition[]> {
    const tools = await this.client.getTools(['canva'], { limit: 100 });
    return tools.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      description: tool.description || `${tool.name} through Composio`,
      inputSchema: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters.properties).filter(
            (entry): entry is [string, object] =>
              Boolean(entry[1]) && typeof entry[1] === 'object' && !Array.isArray(entry[1]),
          ),
        ),
        ...(tool.parameters.required ? { required: tool.parameters.required } : {}),
        additionalProperties: false,
      },
    }));
  }

  execute(input: {
    toolSlug: string;
    arguments: Record<string, unknown>;
    userId: string;
    connectedAccountId: string;
  }): Promise<Record<string, unknown>> {
    return this.client.executeTool(
      input.toolSlug,
      input.arguments,
      input.userId,
      input.connectedAccountId,
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const result = value[key];
  if (typeof result !== 'string' || !result.trim()) {
    throw new Error(`COMPOSIO_INVALID_RESPONSE: ${key} is missing.`);
  }
  return result;
}
