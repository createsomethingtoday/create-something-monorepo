import {
  DISTRIBUTION_CATALOG_ENTRIES,
  type DistributionArtifactKind,
  type DistributionCatalogEntry,
  type DistributionCompatibility,
  type DistributionCompatibilityInstallMode,
  type DistributionGooseInstallMode,
  type DistributionHost,
} from './catalog.distribution.generated.js';

export {
  DISTRIBUTION_CATALOG_ENTRIES,
  type DistributionArtifactKind,
  type DistributionCatalogEntry,
  type DistributionCompatibility,
  type DistributionCompatibilityInstallMode,
  type DistributionEntitlement,
  type DistributionGooseInstallMode,
  type DistributionHost,
  type DistributionVisibility,
} from './catalog.distribution.generated.js';

export const DISTRIBUTION_CATALOG = DISTRIBUTION_CATALOG_ENTRIES;

export const DISTRIBUTION_ARTIFACT_KIND_VALUES = [
  'extension',
  'policy_pack',
  'recipe',
  'distro',
] as const satisfies readonly DistributionArtifactKind[];

export const DISTRIBUTION_ARTIFACT_KIND_ORDER = [
  'distro',
  'extension',
  'policy_pack',
  'recipe',
] as const satisfies readonly DistributionArtifactKind[];

export const DISTRIBUTION_COMPATIBILITY_HOST_VALUES = [
  'cursor',
  'claude-code',
  'claude-desktop',
  'windsurf',
  'vscode',
  'codex',
] as const satisfies readonly DistributionHost[];

export const DISTRIBUTION_TARGET_HOST_VALUES = [
  'goose',
  ...DISTRIBUTION_COMPATIBILITY_HOST_VALUES,
] as const;

export type DistributionTargetHost = (typeof DISTRIBUTION_TARGET_HOST_VALUES)[number];
export type DistributionInstallMode =
  | DistributionGooseInstallMode
  | DistributionCompatibilityInstallMode;

export type DistributionInstallAction = {
  type: DistributionInstallMode['type'];
  label: string;
  host: DistributionTargetHost;
  payload: string;
  command?: string;
  args?: readonly string[];
};

export const DISTRIBUTION_HOST_LABELS: Record<DistributionTargetHost, string> = {
  goose: 'Goose',
  cursor: 'Cursor',
  'claude-code': 'Claude Code',
  'claude-desktop': 'Claude Desktop',
  windsurf: 'Windsurf',
  vscode: 'VS Code',
  codex: 'Codex',
};

export function getDistributionArtifacts(): readonly DistributionCatalogEntry[] {
  return DISTRIBUTION_CATALOG;
}

export function getDistributionArtifact(id: string): DistributionCatalogEntry | undefined {
  return DISTRIBUTION_CATALOG.find((entry) => entry.id === id);
}

export function getDistributionArtifactsByKind(
  kind: DistributionArtifactKind,
): DistributionCatalogEntry[] {
  return DISTRIBUTION_CATALOG.filter((entry) => entry.kind === kind);
}

export function getRelatedDistributionArtifacts(
  entry: DistributionCatalogEntry,
): DistributionCatalogEntry[] {
  const packageRefs = [...(entry.packageRefs ?? [])] as string[];

  if (packageRefs.length < 1) {
    return [];
  }

  const kindRank = new Map(
    DISTRIBUTION_ARTIFACT_KIND_ORDER.map((kind, index) => [kind, index]),
  );

  return packageRefs
    .map((id) => getDistributionArtifact(id))
    .filter((candidate): candidate is DistributionCatalogEntry => Boolean(candidate))
    .sort((left, right) => {
      const rankLeft = kindRank.get(left.kind) ?? Number.MAX_SAFE_INTEGER;
      const rankRight = kindRank.get(right.kind) ?? Number.MAX_SAFE_INTEGER;

      if (rankLeft !== rankRight) {
        return rankLeft - rankRight;
      }

      return left.title.localeCompare(right.title);
    });
}

export function getDistributionGooseInstallActions(
  entry: DistributionCatalogEntry,
): DistributionInstallAction[] {
  return entry.goose.installModes.map((mode) => toInstallAction(mode, 'goose'));
}

export function getDistributionCompatibilityInstallActions(
  entry: DistributionCatalogEntry,
  host?: DistributionHost,
): DistributionInstallAction[] {
  const compatibility = getCompatibility(entry);
  const modes: readonly DistributionCompatibilityInstallMode[] =
    compatibility?.installModes ?? [];

  return modes
    .filter(
      (mode): mode is DistributionCompatibilityInstallMode =>
        !host || mode.host === host,
    )
    .map((mode) => toInstallAction(mode, mode.host));
}

export function getDistributionCompatibilityHosts(
  entry: DistributionCatalogEntry,
): DistributionHost[] {
  return [...(getCompatibility(entry)?.hosts ?? [])];
}

export function getInstallPayload(mode: DistributionInstallMode): string {
  if ('value' in mode && typeof mode.value === 'string') {
    return mode.value;
  }

  return [mode.command, ...(mode.args ?? [])].filter(Boolean).join(' ');
}

export function summarizeDistributionArtifact(entry: DistributionCatalogEntry) {
  const compatibility = getCompatibility(entry);

  return {
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    description: entry.description,
    ownerPackage: entry.ownerPackage,
    visibility: entry.visibility,
    entitlement: entry.entitlement,
    docsRef: entry.docsRef,
    telemetryKey: entry.telemetryKey,
    gooseModeTypes: entry.goose.installModes.map((mode) => mode.type),
    compatibilityHosts: getDistributionCompatibilityHosts(entry),
    compatibilityModeTypes: (compatibility?.installModes ?? []).map(
      (mode) => mode.type,
    ),
    relatedArtifactIds: [...(entry.packageRefs ?? [])],
  };
}

function getCompatibility(
  entry: DistributionCatalogEntry,
): DistributionCompatibility | undefined {
  return 'compatibility' in entry ? entry.compatibility : undefined;
}

function toInstallAction(
  mode: DistributionInstallMode,
  host: DistributionTargetHost,
): DistributionInstallAction {
  return {
    type: mode.type,
    label: mode.label,
    host,
    payload: getInstallPayload(mode),
    command: 'command' in mode ? mode.command : undefined,
    args: 'args' in mode ? mode.args : undefined,
  };
}
