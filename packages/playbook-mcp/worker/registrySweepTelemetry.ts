export function inferredProxyToolCount(
  connectedServers: Array<{ tool_count: number | null }>
): number | null {
  if (connectedServers.length === 0) return null;
  let total = 0;
  for (const server of connectedServers) {
    if (server.tool_count === null) return null;
    total += server.tool_count;
  }
  return total;
}

export function liveHubTotalServerCount(
  enabledServers: string[],
  connectedServers: Array<{ name: string }>,
  failedServers: Array<{ server: string }>
): number {
  if (enabledServers.length > 0) return enabledServers.length;
  return new Set([
    ...connectedServers.map((server) => server.name),
    ...failedServers.map((server) => server.server)
  ]).size;
}
