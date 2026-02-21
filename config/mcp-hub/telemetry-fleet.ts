import registryData from './registry.json';

type TelemetrySourceKey = 'cs' | 'workway';

type RegistryServerConfig = {
  transport: 'http' | 'stdio';
  tags?: string[];
};

type RegistryShape = {
  version: number;
  servers: Record<string, RegistryServerConfig>;
};

const WORKWAY_GMAIL_AGGREGATE_ALIAS = 'halfdozen-gmail-sync';
const WORKWAY_QUICKBOOKS_LEGACY_ALIAS = 'quickbooks-notion-mcp';
const CS_MANAGED_TELEMETRY_IDENTITIES = ['webflow-app-review-mcp'] as const;

const registry = registryData as RegistryShape;

function hasTag(tags: readonly string[] | undefined, tag: TelemetrySourceKey): boolean {
  return tags?.includes(tag) ?? false;
}

function uniquePreservingOrder(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}

function serversForSource(source: TelemetrySourceKey): string[] {
  return Object.entries(registry.servers)
    .filter(([, config]) => config.transport === 'http' && hasTag(config.tags, source))
    .map(([name]) => name);
}

const registryCsServers = serversForSource('cs');
const registryWorkwayServers = serversForSource('workway');

export const CS_FLEET_SERVERS = uniquePreservingOrder([
  ...registryCsServers,
  ...CS_MANAGED_TELEMETRY_IDENTITIES
]);

export const WORKWAY_FLEET_SERVERS = uniquePreservingOrder([
  WORKWAY_GMAIL_AGGREGATE_ALIAS,
  ...registryWorkwayServers,
  WORKWAY_QUICKBOOKS_LEGACY_ALIAS
]);

export const FLEET_SERVERS = [...CS_FLEET_SERVERS, ...WORKWAY_FLEET_SERVERS];

export const SERVER_SOURCE_BY_NAME: Record<string, TelemetrySourceKey> = {
  ...Object.fromEntries(CS_FLEET_SERVERS.map((name) => [name, 'cs' as const])),
  ...Object.fromEntries(WORKWAY_FLEET_SERVERS.map((name) => [name, 'workway' as const]))
};
