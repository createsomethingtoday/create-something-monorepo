import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_RUN_HISTORY_PATH } from './run-history.js';
import {
  createRunHistoryLatestResource,
  createRunHistoryListResource,
  createRunHistoryStatusResource,
  parseRunHistoryJsonl,
  registerFlueRunHistoryResources as registerCoreFlueRunHistoryResources,
  type FlueRunHistoryResourceOptions,
  type McpResourceServerLike,
  type RunHistoryRecord,
} from './mcp-resource-core.js';

export {
  DEFAULT_RUN_HISTORY_RESOURCE_SOURCE,
  FLUE_RUN_HISTORY_RESOURCE_URIS,
  createRunHistoryLatestResource,
  createRunHistoryListResource,
  createRunHistoryStatusResource,
  parseRunHistoryJsonl,
  type FlueRunHistoryResourceOptions,
  type McpResourceResult,
  type McpResourceServerLike,
  type RunHistoryLatestResource,
  type RunHistoryListResource,
  type RunHistoryRecord,
  type RunHistoryRecordSummary,
  type RunHistoryStatusResource,
} from './mcp-resource-core.js';

export function readRunHistoryRecords(path = DEFAULT_RUN_HISTORY_PATH): RunHistoryRecord[] {
  const resolvedPath = resolve(process.cwd(), path);
  if (!existsSync(resolvedPath)) return [];

  const text = readFileSync(resolvedPath, 'utf8');
  return parseRunHistoryJsonl(text, resolvedPath);
}

export function registerFlueRunHistoryResources(
  server: McpResourceServerLike,
  options: FlueRunHistoryResourceOptions = {},
): void {
  const historyPath = options.historyPath ?? DEFAULT_RUN_HISTORY_PATH;

  registerCoreFlueRunHistoryResources(server, {
    ...options,
    historyPath,
    loadRecords: options.loadRecords ?? (() => readRunHistoryRecords(historyPath)),
  });
}

function readArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

export function runMcpResourcesCli(args = process.argv.slice(2)): void {
  const historyPath = readArg(args, '--history-path') ?? DEFAULT_RUN_HISTORY_PATH;
  const resource = readArg(args, '--resource') ?? 'status';
  const records = readRunHistoryRecords(historyPath);

  const output =
    resource === 'latest'
      ? createRunHistoryLatestResource(records, { historyPath })
      : resource === 'list'
        ? createRunHistoryListResource(records, { historyPath })
        : resource === 'all'
          ? {
              status: createRunHistoryStatusResource(records, { historyPath }),
              latest: createRunHistoryLatestResource(records, { historyPath }),
              list: createRunHistoryListResource(records, { historyPath }),
            }
          : createRunHistoryStatusResource(records, { historyPath });

  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMcpResourcesCli();
}
