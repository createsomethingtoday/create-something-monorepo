#!/usr/bin/env node

import {
  acceptSuggestion,
  addEdge,
  addNode,
  addObservation,
  createSession,
  exportSessionMarkdown,
  getSessionPath,
  listSessions,
  readSession
} from './store.js';
import { startStudioServer } from './server.js';
import type { AtlasCanvasNodeKind, AtlasCanvasNodeStatus } from './types.js';

type ParsedArgs = {
  command: string;
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [command = 'help', ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index] ?? '';
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { command, flags };
}

function str(flags: ParsedArgs['flags'], key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function bool(flags: ParsedArgs['flags'], key: string): boolean {
  return flags[key] === true || flags[key] === 'true';
}

function required(flags: ParsedArgs['flags'], key: string): string {
  const value = str(flags, key);
  if (!value) throw new Error(`Missing required flag --${key}`);
  return value;
}

function printHelp(): void {
  console.log(`CREATE SOMETHING Atlas Studio

Usage:
  pnpm atlas:studio create --client "Client" --workflow "Workflow" [--owner "Name"]
  pnpm atlas:studio serve --session SESSION_ID [--port 5198]
  pnpm atlas:studio observe --session SESSION_ID --suggest --text "Client says approval is needed"
  pnpm atlas:studio node --session SESSION_ID --kind ai --label "Draft response" [--status wait]
  pnpm atlas:studio edge --session SESSION_ID --source NODE_ID --target NODE_ID [--label "passes"]
  pnpm atlas:studio accept --session SESSION_ID --suggestion SUGGESTION_ID
  pnpm atlas:studio export --session SESSION_ID
  pnpm atlas:studio list
`);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  switch (parsed.command) {
    case 'create': {
      const session = await createSession({
        client: required(parsed.flags, 'client'),
        workflow: required(parsed.flags, 'workflow'),
        owner: str(parsed.flags, 'owner')
      });
      console.log(
        JSON.stringify(
          {
            id: session.id,
            path: getSessionPath(session.id),
            serve: `pnpm atlas:studio serve --session ${session.id}`,
            observe: `pnpm atlas:studio observe --session ${session.id} --suggest --text "client says..."`
          },
          null,
          2
        )
      );
      return;
    }

    case 'serve': {
      const port = Number(str(parsed.flags, 'port') ?? '5198');
      const host = str(parsed.flags, 'host') ?? '127.0.0.1';
      const sessionId = str(parsed.flags, 'session');
      await startStudioServer({ host, port, sessionId });
      const sessions = sessionId ? [{ id: sessionId }] : await listSessions();
      const activeId = sessionId ?? sessions[0]?.id;
      console.log(`Atlas Studio running at http://${host}:${port}/sessions/${activeId}`);
      await new Promise(() => undefined);
      return;
    }

    case 'list': {
      const sessions = await listSessions();
      console.log(
        JSON.stringify(
          sessions.map((session) => ({
            id: session.id,
            client: session.client,
            workflow: session.workflow,
            updatedAt: session.updatedAt
          })),
          null,
          2
        )
      );
      return;
    }

    case 'show': {
      console.log(JSON.stringify(await readSession(required(parsed.flags, 'session')), null, 2));
      return;
    }

    case 'observe': {
      const session = await addObservation(required(parsed.flags, 'session'), {
        text: required(parsed.flags, 'text'),
        source: bool(parsed.flags, 'operator') ? 'operator' : 'agent',
        suggest: bool(parsed.flags, 'suggest')
      });
      console.log(
        JSON.stringify(
          {
            id: session.id,
            observations: session.observations.length,
            queuedSuggestions: session.suggestions.filter(
              (suggestion) => suggestion.status === 'queued'
            ).length
          },
          null,
          2
        )
      );
      return;
    }

    case 'node': {
      const session = await addNode(required(parsed.flags, 'session'), {
        kind: required(parsed.flags, 'kind') as AtlasCanvasNodeKind,
        label: str(parsed.flags, 'label'),
        atlasId: str(parsed.flags, 'atlas-id'),
        owner: str(parsed.flags, 'owner'),
        status: str(parsed.flags, 'status') as AtlasCanvasNodeStatus | undefined,
        notes: str(parsed.flags, 'notes'),
        evidence: str(parsed.flags, 'evidence'),
        createdBy: bool(parsed.flags, 'operator') ? 'operator' : 'agent'
      });
      const node = session.canvas.nodes.at(-1);
      console.log(JSON.stringify({ session: session.id, node }, null, 2));
      return;
    }

    case 'edge': {
      const session = await addEdge(required(parsed.flags, 'session'), {
        source: required(parsed.flags, 'source'),
        target: required(parsed.flags, 'target'),
        label: str(parsed.flags, 'label'),
        evidence: str(parsed.flags, 'evidence'),
        createdBy: bool(parsed.flags, 'operator') ? 'operator' : 'agent'
      });
      console.log(
        JSON.stringify({ session: session.id, edge: session.canvas.edges.at(-1) }, null, 2)
      );
      return;
    }

    case 'accept': {
      const session = await acceptSuggestion(
        required(parsed.flags, 'session'),
        required(parsed.flags, 'suggestion')
      );
      console.log(
        JSON.stringify(
          {
            id: session.id,
            nodes: session.canvas.nodes.length,
            queuedSuggestions: session.suggestions.filter(
              (suggestion) => suggestion.status === 'queued'
            ).length
          },
          null,
          2
        )
      );
      return;
    }

    case 'export': {
      const session = await readSession(required(parsed.flags, 'session'));
      process.stdout.write(exportSessionMarkdown(session));
      return;
    }

    case 'help':
    default:
      printHelp();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
