/**
 * Local Flue run-history resources for the stdio CREATE SOMETHING MCP.
 *
 * The source is an ignored JSONL file written by the Flue pilot package. Keep
 * this local-only until run history is promoted to a remote storage binding.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerFlueRunHistoryResources,
  type McpResourceServerLike,
} from '@create-something/flue-service-agent/mcp-resources';

export const DEFAULT_CREATE_SOMETHING_FLUE_HISTORY_PATH =
  'packages/agents/flue-service-agent/.artifacts/flue-service-agent/run-history.jsonl';

export function getLocalFlueRunHistoryPath(env: NodeJS.ProcessEnv = process.env): string {
  const configuredPath = env.FLUE_RUN_HISTORY_PATH?.trim();
  return configuredPath || DEFAULT_CREATE_SOMETHING_FLUE_HISTORY_PATH;
}

export function registerLocalFlueRunHistoryResources(
  server: Pick<McpServer, 'resource'>,
  historyPath = getLocalFlueRunHistoryPath(),
): void {
  registerFlueRunHistoryResources(server as McpResourceServerLike, { historyPath });
}
