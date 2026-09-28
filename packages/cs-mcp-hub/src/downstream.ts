import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Data, Effect, Either } from 'effect';

import type { McpBundleRegistry, McpServerConfig } from './types.js';

export type ConnectedDownstream = {
  name: string;
  config: McpServerConfig;
  client: Client;
  tools: Tool[];
};

export type DownstreamFailure = {
  name: string;
  error: string;
};

export type DownstreamConnections = {
  connected: ConnectedDownstream[];
  failed: DownstreamFailure[];
};

export class DownstreamConnectionError extends Data.TaggedError('DownstreamConnectionError')<{
  readonly server: string;
  readonly phase: 'connect' | 'list-tools';
  readonly message: string;
  readonly cause: unknown;
}> {}

type ManagedClient = Pick<Client, 'listTools' | 'close'>;

/** The hub owns a successful connection until shutdown; failed startup closes it here. */
export async function connectClientAndListTools(
  name: string,
  client: ManagedClient,
  connect: () => Promise<void>,
): Promise<Tool[]> {
  const attempt = Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: connect,
      catch: (cause) => connectionError(name, 'connect', cause),
    });
    return yield* Effect.tryPromise({
      try: () => listAllTools(client),
      catch: (cause) => connectionError(name, 'list-tools', cause),
    });
  }).pipe(
    Effect.onError(() => Effect.promise(async () => {
      try {
        await client.close();
      } catch {
        // Preserve the startup failure when cleanup also fails.
      }
    })),
  );

  const result = await Effect.runPromise(Effect.either(attempt));
  if (Either.isLeft(result)) throw result.left;
  return result.right;
}

function connectionError(
  server: string,
  phase: DownstreamConnectionError['phase'],
  cause: unknown,
): DownstreamConnectionError {
  return new DownstreamConnectionError({
    server,
    phase,
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  });
}

export async function connectDownstreamServers(
  registry: McpBundleRegistry,
  serverNames: string[],
): Promise<DownstreamConnections> {
  const results = await Promise.all(serverNames.map(async (name) => connectSingleServer(name, registry.servers[name])));
  const connected: ConnectedDownstream[] = [];
  const failed: DownstreamFailure[] = [];

  for (const result of results) {
    if ('client' in result) {
      connected.push(result);
    } else {
      failed.push(result);
    }
  }

  connected.sort((a, b) => a.name.localeCompare(b.name));
  failed.sort((a, b) => a.name.localeCompare(b.name));

  return { connected, failed };
}

export async function closeDownstreamServers(servers: ConnectedDownstream[]): Promise<void> {
  await Promise.all(
    servers.map(async (server) => {
      try {
        await server.client.close();
      } catch {
        // Ignore shutdown errors.
      }
    }),
  );
}

async function connectSingleServer(
  name: string,
  config: McpServerConfig | undefined,
): Promise<ConnectedDownstream | DownstreamFailure> {
  if (!config) {
    return { name, error: `Server "${name}" not found in registry` };
  }

  const client = new Client({
    name: `cs-mcp-hub:${name}`,
    version: '0.1.0',
  });

  try {
    let connect: () => Promise<void>;
    if (config.transport === 'http') {
      const requestInit: RequestInit = {};
      const headers = resolveHttpHeaders(config);
      if (Object.keys(headers).length > 0) {
        requestInit.headers = headers;
      }
      const transport = new StreamableHTTPClientTransport(new URL(config.url), { requestInit });
      connect = () => client.connect(transport);
    } else {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
        cwd: config.cwd,
      });
      connect = () => client.connect(transport);
    }

    const tools = await connectClientAndListTools(name, client, connect);
    return { name, config, client, tools };
  } catch (error: unknown) {
    // Construction errors occur before Effect owns the client.
    if (!(error instanceof DownstreamConnectionError)) {
      try { await client.close(); } catch { /* preserve the original failure */ }
    }
    const message = error instanceof Error ? error.message : String(error);
    return { name, error: message };
  }
}

async function listAllTools(client: ManagedClient): Promise<Tool[]> {
  const allTools: Tool[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await client.listTools(cursor ? { cursor } : undefined);
    allTools.push(...page.tools);
    if (!page.nextCursor) {
      return allTools;
    }
    cursor = page.nextCursor;
  }
}

function resolveHttpHeaders(config: Extract<McpServerConfig, { transport: 'http' }>): Record<string, string> {
  const headers: Record<string, string> = {
    ...(config.http_headers ?? {}),
    ...(config.headers ?? {}),
  };

  if (config.env_http_headers) {
    for (const [headerName, envVarName] of Object.entries(config.env_http_headers)) {
      const value = process.env[envVarName];
      if (value) {
        headers[headerName] = value;
      }
    }
  }

  if (config.bearer_token_env_var && !headers.Authorization) {
    const token = process.env[config.bearer_token_env_var];
    if (token) {
      headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
    }
  }

  return headers;
}
