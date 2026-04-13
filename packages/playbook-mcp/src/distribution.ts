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

export type DistributionGooseQuickstartStep = {
  id: string;
  title: string;
  instruction: string;
  payload: string;
  kind: 'command' | 'deeplink' | 'file' | 'verify';
};

export const DEFAULT_DISTRIBUTION_GOOSE_EXPORT_BASE_DIR = '.goose-bundles';

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

export function getDistributionGooseExportOutputDir(
  entry: DistributionCatalogEntry,
  baseDir = DEFAULT_DISTRIBUTION_GOOSE_EXPORT_BASE_DIR,
): string {
  const normalizedBaseDir = baseDir.replace(/\/+$/, '');

  return `${normalizedBaseDir}/${entry.id}`;
}

export function getDistributionGooseExportCommand(
  entry: DistributionCatalogEntry,
  baseDir = DEFAULT_DISTRIBUTION_GOOSE_EXPORT_BASE_DIR,
): string {
  const outputDir = getDistributionGooseExportOutputDir(entry, baseDir);

  return `pnpm distribution:goose:export -- --artifact ${entry.id} --output ${outputDir}`;
}

export function getDistributionGooseExportReadmePath(
  entry: DistributionCatalogEntry,
  baseDir = DEFAULT_DISTRIBUTION_GOOSE_EXPORT_BASE_DIR,
): string {
  return `${getDistributionGooseExportOutputDir(entry, baseDir)}/README.md`;
}

export function getDistributionGooseQuickstart(
  entry: DistributionCatalogEntry,
  baseDir = DEFAULT_DISTRIBUTION_GOOSE_EXPORT_BASE_DIR,
): DistributionGooseQuickstartStep[] {
  const steps: DistributionGooseQuickstartStep[] = [
    {
      id: 'export',
      title: 'Export the Goose bundle',
      instruction:
        'Materialize the repo-local Goose bundle so the desktop app can reference copied policy, recipe, and distro files.',
      payload: getDistributionGooseExportCommand(entry, baseDir),
      kind: 'command',
    },
    {
      id: 'readme',
      title: 'Open the generated bundle README',
      instruction:
        'Use the exported README as the single local checklist for this artifact and its directly bundled pieces.',
      payload: getDistributionGooseExportReadmePath(entry, baseDir),
      kind: 'file',
    },
  ];

  const primaryAction = getPrimaryDistributionGooseAction(entry);

  if (primaryAction) {
    steps.push({
      id: 'primary',
      title: getPrimaryQuickstartTitle(entry, primaryAction),
      instruction: getPrimaryQuickstartInstruction(entry, primaryAction),
      payload: primaryAction.payload,
      kind: getQuickstartKind(primaryAction),
    });
  }

  const relatedArtifacts = getRelatedDistributionArtifacts(entry);
  const policyPack = relatedArtifacts.find((artifact) => artifact.kind === 'policy_pack');
  const recipe = relatedArtifacts.find((artifact) => artifact.kind === 'recipe');

  if (policyPack) {
    steps.push({
      id: 'policy-pack',
      title: 'Apply the matching policy pack',
      instruction:
        'Use the copied policy-pack files for persistent instructions, prompt templates, and adversary rules so behavior travels with the tool.',
      payload: getDistributionGooseExportReadmePath(entry, baseDir),
      kind: 'file',
    });
  }

  if (recipe) {
    const recipeAction = getPrimaryDistributionGooseAction(recipe);

    if (recipeAction) {
      steps.push({
        id: 'recipe',
        title: 'Open the bundled recipe',
        instruction:
          'Launch the matching Goose recipe after the extension and policy files are in place so the workflow boundary is explicit.',
        payload: recipeAction.payload,
        kind: getQuickstartKind(recipeAction),
      });
    }
  }

  const firstVerificationStep = entry.verification.steps[0];

  if (firstVerificationStep) {
    steps.push({
      id: 'verify',
      title: 'Run the first verification step',
      instruction: entry.verification.summary,
      payload: 'command' in firstVerificationStep
        ? firstVerificationStep.command
        : firstVerificationStep.prompt,
      kind: 'verify',
    });
  }

  return steps;
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

function getPrimaryDistributionGooseAction(
  entry: DistributionCatalogEntry,
): DistributionInstallAction | undefined {
  const actions = getDistributionGooseInstallActions(entry);

  return (
    actions.find((action) => action.type === 'goose_extension')
    ?? actions.find((action) => action.type === 'stdio_command')
    ?? actions.find((action) => action.type === 'goose_recipe')
    ?? actions.find((action) => action.type === 'goose_distro')
    ?? actions.find((action) => action.type === 'goose_bundle')
    ?? actions[0]
  );
}

function getQuickstartKind(
  action: DistributionInstallAction,
): DistributionGooseQuickstartStep['kind'] {
  if (action.type === 'goose_extension') {
    return 'deeplink';
  }

  if (
    action.type === 'goose_recipe'
    || action.type === 'stdio_command'
    || action.type === 'codex_command'
    || action.type === 'claude_code_command'
  ) {
    return 'command';
  }

  return 'file';
}

function getPrimaryQuickstartTitle(
  entry: DistributionCatalogEntry,
  action: DistributionInstallAction,
): string {
  if (action.type === 'stdio_command') {
    return 'Configure the Goose command-line extension';
  }

  if (action.type === 'goose_extension') {
    return 'Install the Goose extension';
  }

  if (action.type === 'goose_recipe') {
    return 'Open the Goose recipe';
  }

  if (action.type === 'goose_distro') {
    return entry.kind === 'distro'
      ? 'Review the distro starter'
      : 'Open the distro asset';
  }

  if (entry.kind === 'policy_pack') {
    return 'Inspect the policy-pack files';
  }

  return 'Open the primary Goose asset';
}

function getPrimaryQuickstartInstruction(
  entry: DistributionCatalogEntry,
  action: DistributionInstallAction,
): string {
  if (action.type === 'stdio_command') {
    return entry.kind === 'extension'
      ? 'Add the command-line extension in Goose. This path can layer Infisical ahead of the local bridge so authenticated hubs do not store bearer tokens in Goose.'
      : 'Run the local command-line entrypoint for this Goose artifact.';
  }

  if (action.type === 'goose_extension') {
    return 'Use the Goose deeplink to install the extension directly into the desktop app.';
  }

  if (action.type === 'goose_recipe') {
    return 'Open the recipe in Goose CLI or Desktop once the related extension and policy files are ready.';
  }

  if (action.type === 'goose_distro') {
    return entry.kind === 'distro'
      ? 'Start from the distro init-config so first-run defaults are explicit before local testing.'
      : 'Use the distro asset as the primary Goose packaging artifact for this bundle.';
  }

  if (entry.kind === 'policy_pack') {
    return 'Start from the copied policy-pack directory so the persistent instructions and prompt templates stay together.';
  }

  return 'Open the primary Goose asset for this artifact before moving to bundled policy and recipe steps.';
}
