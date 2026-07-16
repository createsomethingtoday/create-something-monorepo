import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import type { CanvaClientBindingService } from './client-binding-service.js';

export type CanvaToolDefinition = {
  slug: string;
  name: string;
  description: string;
  inputSchema: Tool['inputSchema'];
  annotations?: Tool['annotations'];
};

export interface CanvaToolGateway {
  listTools(): Promise<CanvaToolDefinition[]>;
  execute(input: {
    toolSlug: string;
    arguments: Record<string, unknown>;
    userId: string;
    connectedAccountId: string;
  }): Promise<Record<string, unknown>>;
}

export async function createCanvaOperatorMcpServer(input: {
  service: CanvaClientBindingService;
  gateway: CanvaToolGateway;
  composioUserId: string;
  operator: { subject: string; email: string; scopes: string[] };
}): Promise<Server> {
  const canvaTools = await input.gateway.listTools();
  const toolRoutes = new Map(
    canvaTools.map((tool) => [normalizeCanvaToolName(tool.slug), tool] as const),
  );
  const server = new Server(
    { name: 'canva-client-operator-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...managementTools(
        input.composioUserId,
        input.operator.scopes.includes('canva-client:admin'),
      ),
      ...(input.operator.scopes.includes('canva-client:write')
        ? canvaTools.map((tool) => ({
            name: normalizeCanvaToolName(tool.slug),
            description: `${tool.description} Always executes against the locked client Canva account.`,
            inputSchema: tool.inputSchema,
            annotations: tool.annotations,
          }))
        : []),
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = asRecord(request.params.arguments);
    try {
      if (request.params.name === 'canva_connection_status') {
        return jsonToolResult({
          ...(await input.service.getStatus()),
          clientIdentity: input.composioUserId,
        });
      }
      if (request.params.name === 'canva_create_connect_link') {
        if (!input.operator.scopes.includes('canva-client:admin')) {
          return errorToolResult('FORBIDDEN: canva-client:admin is required.');
        }
        return jsonToolResult(
          await input.service.createConnectLink({ operatorSubject: input.operator.subject }),
        );
      }
      if (request.params.name === 'canva_reset_connection') {
        if (!input.operator.scopes.includes('canva-client:admin')) {
          return errorToolResult('FORBIDDEN: canva-client:admin is required.');
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
      if (!input.operator.scopes.includes('canva-client:write')) {
        return errorToolResult('FORBIDDEN: canva-client:write is required.');
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
      name: 'canva_connection_status',
      description:
        'Check whether the client Canva authorization is unbound, awaiting completion, or locked.',
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
      name: 'canva_create_connect_link',
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
      name: 'canva_reset_connection',
      description:
        `Operator-only destructive reset. By default revokes the locked Composio account before removing the binding. Requires exact confirmation "RESET ${composioUserId}".`,
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
              'Defaults to true. Set false only when the upstream Canva grant must remain active after detaching this MCP.',
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

function normalizeCanvaToolName(slug: string): string {
  const lower = slug.trim().toLowerCase();
  return lower.startsWith('canva_') ? `client_${lower}` : `client_canva_${lower}`;
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
