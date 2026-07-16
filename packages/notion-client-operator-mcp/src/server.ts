import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import type { NotionClientBindingService } from './client-binding-service.js';

export type NotionToolDefinition = {
  slug: string;
  name: string;
  description: string;
  inputSchema: Tool['inputSchema'];
  annotations?: Tool['annotations'];
};

export interface NotionToolGateway {
  listTools(): Promise<NotionToolDefinition[]>;
  execute(input: {
    toolSlug: string;
    arguments: Record<string, unknown>;
    userId: string;
    connectedAccountId: string;
  }): Promise<Record<string, unknown>>;
}

export async function createNotionOperatorMcpServer(input: {
  service: NotionClientBindingService;
  gateway: NotionToolGateway;
  composioUserId: string;
  operator: { subject: string; email: string; scopes: string[] };
}): Promise<Server> {
  const notionTools = await input.gateway.listTools();
  const toolRoutes = new Map(
    notionTools.map((tool) => [normalizeNotionToolName(tool.slug), tool] as const),
  );
  const server = new Server(
    { name: 'notion-client-operator-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...managementTools(
        input.composioUserId,
        input.operator.scopes.includes('notion-client:admin'),
      ),
      ...(input.operator.scopes.includes('notion-client:write')
        ? notionTools.map((tool) => ({
            name: normalizeNotionToolName(tool.slug),
            description: `${tool.description} Always executes against the locked client Notion account.`,
            inputSchema: tool.inputSchema,
            annotations: tool.annotations,
          }))
        : []),
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = asRecord(request.params.arguments);
    try {
      if (request.params.name === 'notion_connection_status') {
        return jsonToolResult({
          ...(await input.service.getStatus()),
          clientIdentity: input.composioUserId,
        });
      }
      if (request.params.name === 'notion_create_connect_link') {
        if (!input.operator.scopes.includes('notion-client:admin')) {
          return errorToolResult('FORBIDDEN: notion-client:admin is required.');
        }
        return jsonToolResult(
          await input.service.createConnectLink({ operatorSubject: input.operator.subject }),
        );
      }
      if (request.params.name === 'notion_reset_connection') {
        if (!input.operator.scopes.includes('notion-client:admin')) {
          return errorToolResult('FORBIDDEN: notion-client:admin is required.');
        }
        return jsonToolResult(
          await input.service.resetConnection({
            operatorSubject: input.operator.subject,
            confirmation: requiredString(args, 'confirmation'),
            ...(typeof args.revoke === 'boolean' ? { revoke: args.revoke } : {}),
          }),
        );
      }

      const route = toolRoutes.get(request.params.name);
      if (!route) {
        return errorToolResult(`UNKNOWN_TOOL: ${request.params.name}`);
      }
      if (!input.operator.scopes.includes('notion-client:write')) {
        return errorToolResult('FORBIDDEN: notion-client:write is required.');
      }
      const connectedAccountId = await input.service.requireLockedAccountId();
      return jsonToolResult(
        await input.gateway.execute({
          toolSlug: route.slug,
          arguments: args,
          userId: input.composioUserId,
          connectedAccountId,
        }),
      );
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  return server;
}

function managementTools(composioUserId: string, allowAdmin: boolean): Tool[] {
  const tools: Tool[] = [
    {
      name: 'notion_connection_status',
      description:
        'Check whether the client Notion authorization is unbound, awaiting completion, or locked. Pending status includes the existing shareable Connect URL so operators can recover it without creating a duplicate request.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
  ];
  if (allowAdmin) {
    tools.push({
      name: 'notion_create_connect_link',
      description:
        'Create the single pending Composio Connect Link that the operator sends to the client. Fails closed while another link is pending or an account is locked.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
    tools.push({
      name: 'notion_reset_connection',
      description:
        `Operator-only destructive reset for either a pending request or locked account. By default revokes/deletes the Composio connection before removing the binding. Requires exact confirmation "RESET ${composioUserId}".`,
      inputSchema: {
        type: 'object',
        properties: {
          confirmation: {
            type: 'string',
            description: `Exact phrase: RESET ${composioUserId}`,
          },
          revoke: {
            type: 'boolean',
            description:
              'Defaults to true. Set false only when the upstream Notion grant must remain active after detaching this MCP.',
          },
        },
        required: ['confirmation'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
  }
  return tools;
}

function normalizeNotionToolName(slug: string): string {
  const lower = slug.trim().toLowerCase();
  return lower.startsWith('notion_') ? `client_${lower}` : `client_notion_${lower}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requiredString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`INVALID_ARGUMENT: ${key} is required.`);
  }
  return value;
}

function jsonToolResult(value: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function errorToolResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}
