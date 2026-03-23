export interface PinnedToolConfig {
  pinnedHalfdozenToolName: string;
  pinnedClientToolNames: string[];
}

const DEFAULT_HALFDOZEN_TOOL_NAME = 'halfdozen_notion';
const DEFAULT_CLIENT_TOOL_NAME = 'blondish_notion';

export function resolvePinnedToolConfig(input: {
  pinnedHalfdozenToolName?: string | null;
  pinnedClientToolName?: string | null;
  pinnedClientToolNames?: string | null;
}): PinnedToolConfig {
  const pinnedHalfdozenToolName =
    normalizeToolName(input.pinnedHalfdozenToolName) ?? DEFAULT_HALFDOZEN_TOOL_NAME;
  const pinnedClientToolNames = dedupeStrings([
    ...parseToolNames(input.pinnedClientToolNames),
    ...(normalizeToolName(input.pinnedClientToolName)
      ? [normalizeToolName(input.pinnedClientToolName) as string]
      : []),
  ]);

  return {
    pinnedHalfdozenToolName,
    pinnedClientToolNames:
      pinnedClientToolNames.length > 0
        ? pinnedClientToolNames
        : [DEFAULT_CLIENT_TOOL_NAME],
  };
}

export function listPinnedToolNames(config: PinnedToolConfig): string[] {
  return dedupeStrings([
    config.pinnedHalfdozenToolName,
    ...config.pinnedClientToolNames,
  ]);
}

export function formatPinnedToolNames(config: PinnedToolConfig): string {
  return listPinnedToolNames(config).join(', ');
}

export function resolvePinnedToolName(
  value: unknown,
  config: PinnedToolConfig,
): string | null {
  const alias = normalizeAliasKey(String(value ?? ''));
  if (!alias) return null;
  return buildPinnedToolAliasMap(config).get(alias) ?? null;
}

export function extractPinnedToolNameFromRequest(
  request: string,
  config: PinnedToolConfig,
): string | null {
  const normalizedRequest = normalizeAliasKey(request);
  if (!normalizedRequest) return null;

  const aliases = [...buildPinnedToolAliasMap(config).entries()].sort(
    ([leftAlias], [rightAlias]) => rightAlias.length - leftAlias.length,
  );

  for (const [alias, toolName] of aliases) {
    if (normalizedRequest.includes(alias)) {
      return toolName;
    }
  }

  return null;
}

function buildPinnedToolAliasMap(config: PinnedToolConfig): Map<string, string> {
  const aliases = new Map<string, string>();

  addAlias(aliases, config.pinnedHalfdozenToolName, config.pinnedHalfdozenToolName);
  addAlias(aliases, 'halfdozen', config.pinnedHalfdozenToolName);
  addAlias(aliases, 'half-dozen', config.pinnedHalfdozenToolName);
  addAlias(aliases, 'half dozen', config.pinnedHalfdozenToolName);

  for (const toolName of config.pinnedClientToolNames) {
    addAlias(aliases, toolName, toolName);
    const baseName = toolName.endsWith('_notion')
      ? toolName.slice(0, -'_notion'.length)
      : toolName;
    addAlias(aliases, baseName, toolName);
    addAlias(aliases, baseName.replace(/_/g, ' '), toolName);

    if (baseName === 'blondish') {
      addAlias(aliases, 'blond:ish', toolName);
    }
  }

  return aliases;
}

function addAlias(
  aliases: Map<string, string>,
  rawAlias: string | null | undefined,
  toolName: string,
): void {
  const alias = normalizeAliasKey(rawAlias ?? '');
  if (alias && !aliases.has(alias)) {
    aliases.set(alias, toolName);
  }
}

function parseToolNames(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((value) => normalizeToolName(value))
    .filter((value): value is string => Boolean(value));
}

function normalizeToolName(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim();
  return value.length > 0 ? value : null;
}

function normalizeAliasKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function dedupeStrings(values: string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }

  return deduped;
}
