import { CANON_REGISTRY_MANIFEST } from './data.js';
import type {
  CanonExtensionIntakePacket,
  CanonExtensionRoutingDecision,
  CanonProjectOverlayArtifactKind,
  CanonProjectOverlayIntegrityIssue,
  CanonProjectOverlayInventory,
  CanonProjectOverlayInventoryEntry,
  CanonProjectOverlayManifest,
  CanonProjectOverlayReview,
  CanonRegistryItem,
  CanonRegistryKind,
  CanonRegistryManifest,
  CanonRegistryModality,
  CanonRegistryMaturity,
  CanonRegistrySearchOptions
} from './schema.js';

export { CANON_REGISTRY_MANIFEST };
export {
  CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES,
  getCanonPublicExportClassification,
  getCanonPublicExportPathClassification,
  renderCanonPublicExportClassification,
  searchCanonPublicExportClassifications
} from './public-export-classification.js';
export type {
  CanonExtensionIntakePacket,
  CanonExtensionLifecycleStage,
  CanonExtensionRoutingDecision,
  CanonExtensionSurfaceEvidence,
  CanonProjectOverlayArtifact,
  CanonProjectOverlayArtifactKind,
  CanonProjectOverlayIntegrityIssue,
  CanonProjectOverlayInventory,
  CanonProjectOverlayInventoryEntry,
  CanonProjectOverlayManifest,
  CanonProjectOverlayReview,
  CanonRegistryContract,
  CanonRegistryItem,
  CanonRegistryKind,
  CanonRegistryManifest,
  CanonRegistryMaturity,
  CanonRegistryModality,
  CanonRegistrySearchOptions
} from './schema.js';
export type {
  CanonPublicExportClassification,
  CanonPublicExportClassificationRule,
  CanonPublicExportClassificationSearchOptions,
  CanonPublicExportRegistryPolicy
} from './public-export-classification.js';

export const CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS: CanonProjectOverlayArtifactKind[] = [
  'theme',
  'tokens',
  'templates',
  'copy-rules',
  'surface-policy',
  'registry'
];

export function getCanonRegistryManifest(): CanonRegistryManifest {
  return CANON_REGISTRY_MANIFEST;
}

export function listCanonRegistryItems(): CanonRegistryItem[] {
  return CANON_REGISTRY_MANIFEST.items;
}

export function getCanonRegistryItem(id: string): CanonRegistryItem | undefined {
  return CANON_REGISTRY_MANIFEST.items.find((item) => item.id === id);
}

export function renderCanonRegistryItem(item: CanonRegistryItem): string {
  const lines = [
    `## ${item.name}`,
    '',
    `- ID: \`${item.id}\``,
    `- Kind: \`${item.kind}\``,
    `- Maturity: \`${item.maturity}\``,
    `- Modalities: ${item.modalities.map((modality) => `\`${modality}\``).join(', ')}`,
    `- Source: \`${item.sourcePath}\``
  ];

  if (item.importPath) lines.push(`- Import: \`${item.importPath}\``);
  if (item.docsPath) lines.push(`- Docs: \`${item.docsPath}\``);
  if (item.dependencies?.length) {
    lines.push(`- Dependencies: ${item.dependencies.map((id) => `\`${id}\``).join(', ')}`);
  }

  lines.push('', item.description, '', '### Contract');

  for (const [key, value] of Object.entries(item.contract)) {
    if (value) lines.push(`- **${key}**: ${value}`);
  }

  return lines.join('\n');
}

export function listCanonRegistryModalities(): CanonRegistryModality[] {
  return CANON_REGISTRY_MANIFEST.requiredModalities;
}

export function listCanonRegistryByKind(kind: CanonRegistryKind): CanonRegistryItem[] {
  return CANON_REGISTRY_MANIFEST.items.filter((item) => item.kind === kind);
}

export function listCanonRegistryByModality(modality: CanonRegistryModality): CanonRegistryItem[] {
  return CANON_REGISTRY_MANIFEST.items.filter((item) => item.modalities.includes(modality));
}

export function searchCanonRegistry(
  query: string,
  options: CanonRegistrySearchOptions = {}
): CanonRegistryItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const limit = options.limit ?? 20;
  const matches = CANON_REGISTRY_MANIFEST.items
    .filter((item) => !options.kind || item.kind === options.kind)
    .filter((item) => !options.modality || item.modalities.includes(options.modality))
    .filter((item) => !options.maturity || item.maturity === options.maturity)
    .map((item) => ({ item, score: scoreCanonRegistryItem(item, normalizedQuery) }))
    .filter((result) => normalizedQuery.length === 0 || result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map((result) => result.item);

  return matches;
}

export function routeCanonExtensionIntake(
  packet: CanonExtensionIntakePacket
): CanonExtensionRoutingDecision {
  if (packet.matchesRegistryItemId) {
    const existing = getCanonRegistryItem(packet.matchesRegistryItemId);
    if (existing?.maturity === 'stable') {
      return {
        stage: 'canon-stable',
        action: 'use-existing',
        rationale: `${existing.id} is already stable in Canon; extend through configuration or overlay copy instead of forking the primitive.`,
        requiredEvidence: [
          'Name the consuming surface and import path.',
          'Document any local copy, integration, or content differences outside Canon.'
        ],
        stopBeforeStable: []
      };
    }
  }

  if (packet.deprecatesRegistryItemId) {
    const existing = getCanonRegistryItem(packet.deprecatesRegistryItemId);
    return {
      stage: existing ? 'deprecated' : 'project-local',
      action: existing ? 'mark-deprecated' : 'needs-review',
      rationale: existing
        ? `${existing.id} exists in Canon; replacement proposals must keep migration guidance and replacement routing discoverable.`
        : `${packet.deprecatesRegistryItemId} is not a Canon registry item; confirm the source of truth before deprecation work.`,
      requiredEvidence: [
        'Replacement registry item or overlay path.',
        'Migration guidance for existing consumers.',
        'Compatibility or rollback note.'
      ],
      stopBeforeStable: [
        'Do not remove the old item until consumers and replacement routing are documented.'
      ]
    };
  }

  const uniqueSurfaceIds = new Set(packet.surfaces.map((surface) => surface.surfaceId));
  if (uniqueSurfaceIds.size >= 2) {
    return {
      stage: 'candidate',
      action: 'promote-candidate',
      rationale:
        'The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.',
      requiredEvidence: [
        'Source-adjacent implementation path.',
        'At least two surface proofs or client receipts.',
        'Accessibility, evidence, motion, and extension contract notes.',
        'Registry dependencies and modality list.'
      ],
      stopBeforeStable: [
        'Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.'
      ]
    };
  }

  return {
    stage: 'project-local',
    action: 'keep-local',
    rationale:
      'The proposal has fewer than two distinct surfaces, so the project overlay should keep ownership while collecting evidence.',
    requiredEvidence: [
      'Local owner and source path.',
      'Problem statement tied to a real workflow.',
      'Proof from a second surface or client before candidate promotion.'
    ],
    stopBeforeStable: [
      'Do not add a stable Canon export from a one-off overlay.',
      'Do not create a parallel primitive when a stable registry item already matches the need.'
    ]
  };
}

export function renderCanonExtensionRoutingDecision(
  packet: CanonExtensionIntakePacket,
  decision: CanonExtensionRoutingDecision
): string {
  const lines = [
    '## Canon Extension Routing',
    '',
    `- Intake: \`${packet.id}\``,
    `- Title: ${packet.title}`,
    `- Requested kind: \`${packet.requestedKind}\``,
    `- Requested modalities: ${packet.requestedModalities.map((modality) => `\`${modality}\``).join(', ')}`,
    `- Owner: ${packet.owner}`,
    `- Source package: \`${packet.sourcePackage}\``
  ];

  if (packet.sourcePath) lines.push(`- Source path: \`${packet.sourcePath}\``);
  if (packet.tags.length) {
    lines.push(`- Tags: ${packet.tags.map((tag) => `\`${tag}\``).join(', ')}`);
  }
  if (packet.dependencies?.length) {
    lines.push(`- Dependencies: ${packet.dependencies.map((id) => `\`${id}\``).join(', ')}`);
  }
  if (packet.matchesRegistryItemId) {
    lines.push(`- Matches registry item: \`${packet.matchesRegistryItemId}\``);
  }
  if (packet.deprecatesRegistryItemId) {
    lines.push(`- Deprecates registry item: \`${packet.deprecatesRegistryItemId}\``);
  }

  lines.push('', packet.summary, '', '### Decision');
  lines.push(`- Stage: \`${decision.stage}\``);
  lines.push(`- Action: \`${decision.action}\``);
  lines.push(`- Rationale: ${decision.rationale}`);

  if (packet.surfaces.length) {
    lines.push('', '### Surface Evidence');
    for (const surface of packet.surfaces) {
      const details = [
        `\`${surface.surfaceId}\``,
        surface.name,
        `modality: \`${surface.modality}\``
      ];
      if (surface.sourcePath) details.push(`source: \`${surface.sourcePath}\``);
      if (surface.proof) details.push(`proof: ${surface.proof}`);
      lines.push(`- ${details.join(' | ')}`);
    }
  }

  lines.push('', '### Required Evidence');
  for (const evidence of decision.requiredEvidence) lines.push(`- ${evidence}`);

  if (decision.stopBeforeStable.length) {
    lines.push('', '### Stop Before Stable');
    for (const stop of decision.stopBeforeStable) lines.push(`- ${stop}`);
  }

  return lines.join('\n');
}

export function reviewCanonProjectOverlay(
  manifest: CanonProjectOverlayManifest,
  options: { integrityIssues?: CanonProjectOverlayIntegrityIssue[] } = {}
): CanonProjectOverlayReview {
  const presentArtifacts = CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS.filter((kind) =>
    manifest.artifacts.some((artifact) => artifact.kind === kind)
  );
  const missingArtifacts = CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS.filter(
    (kind) => !presentArtifacts.includes(kind)
  );
  const integrityIssues = options.integrityIssues ?? [];
  const extensionDecisions = (manifest.extensionIntakes ?? []).map((packet) => ({
    packet,
    decision: routeCanonExtensionIntake(packet)
  }));
  const needsReview = extensionDecisions.some(({ decision }) => decision.action === 'needs-review');
  const needsEvidence = extensionDecisions.some(
    ({ decision }) => decision.stage === 'project-local'
  );
  const missingArtifactFiles = integrityIssues.filter(
    (issue) => issue.kind === 'missing-artifact-file'
  );
  const needsIntegrityReview = integrityIssues.some(
    (issue) => issue.kind !== 'missing-artifact-file'
  );
  const status =
    missingArtifacts.length || missingArtifactFiles.length
      ? 'needs-artifacts'
      : needsReview || needsIntegrityReview
        ? 'needs-review'
        : needsEvidence
          ? 'needs-evidence'
          : 'ready';
  const stopConditions = [
    ...(missingArtifacts.length
      ? [
          `Add missing overlay artifacts before treating ${manifest.id} as a complete Canon overlay: ${missingArtifacts.join(', ')}.`
        ]
      : []),
    ...(missingArtifactFiles.length
      ? [
          `Restore missing overlay artifact file paths before treating ${manifest.id} as complete: ${missingArtifactFiles
            .map((issue) => issue.path)
            .filter(Boolean)
            .join(', ')}.`
        ]
      : []),
    ...(needsIntegrityReview
      ? [
          `Resolve Canon overlay integrity issues before handoff: ${integrityIssues
            .filter((issue) => issue.kind !== 'missing-artifact-file')
            .map((issue) => issue.message)
            .join('; ')}.`
        ]
      : []),
    ...extensionDecisions.flatMap(({ decision }) => decision.stopBeforeStable),
    'Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.',
    'Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts.'
  ];

  return {
    status,
    requiredArtifacts: CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS,
    presentArtifacts,
    missingArtifacts,
    integrityIssues,
    extensionDecisions,
    stopConditions: [...new Set(stopConditions)],
    summary:
      status === 'ready'
        ? `${manifest.name} declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies.`
        : `${manifest.name} is ${status}; keep it project-owned until missing artifacts, integrity issues, and evidence gaps are resolved.`
  };
}

export function renderCanonProjectOverlayReview(
  manifest: CanonProjectOverlayManifest,
  review: CanonProjectOverlayReview
): string {
  const lines = [
    '## Canon Project Overlay Review',
    '',
    `- Overlay: \`${manifest.id}\``,
    `- Name: ${manifest.name}`,
    `- Status: \`${review.status}\``,
    `- Owner: ${manifest.owner}`,
    `- Source package: \`${manifest.sourcePackage}\``,
    `- Target modalities: ${manifest.targetModalities.map((modality) => `\`${modality}\``).join(', ')}`
  ];

  if (manifest.sourcePath) lines.push(`- Source path: \`${manifest.sourcePath}\``);
  if (manifest.tags?.length) {
    lines.push(`- Tags: ${manifest.tags.map((tag) => `\`${tag}\``).join(', ')}`);
  }

  lines.push('', review.summary, '', '### Overlay Artifacts');
  lines.push(`- Required: ${review.requiredArtifacts.map((kind) => `\`${kind}\``).join(', ')}`);
  lines.push(
    `- Present: ${review.presentArtifacts.map((kind) => `\`${kind}\``).join(', ') || 'none'}`
  );
  lines.push(
    `- Missing: ${review.missingArtifacts.map((kind) => `\`${kind}\``).join(', ') || 'none'}`
  );
  lines.push(`- Integrity issues: ${review.integrityIssues.length}`);

  for (const artifact of manifest.artifacts) {
    const details = [`\`${artifact.kind}\``, `path: \`${artifact.path}\``];
    if (artifact.description) details.push(artifact.description);
    if (artifact.registryItemIds?.length) {
      details.push(`registry: ${artifact.registryItemIds.map((id) => `\`${id}\``).join(', ')}`);
    }
    lines.push(`- ${details.join(' | ')}`);
  }

  if (review.extensionDecisions.length) {
    lines.push('', '### Extension Intake Decisions');
    for (const { packet, decision } of review.extensionDecisions) {
      lines.push(
        `- \`${packet.id}\`: \`${decision.stage}\` / \`${decision.action}\` - ${decision.rationale}`
      );
    }
  }

  lines.push('', '### Stop Conditions');
  for (const stop of review.stopConditions) lines.push(`- ${stop}`);

  return lines.join('\n');
}

function scoreCanonRegistryItem(item: CanonRegistryItem, query: string): number {
  if (!query) return 1;

  const haystacks = [
    item.id,
    item.name,
    item.kind,
    item.maturity,
    item.description,
    item.importPath ?? '',
    item.docsPath ?? '',
    ...item.tags,
    ...item.modalities,
    ...(item.dependencies ?? []),
    item.contract.accessibility ?? '',
    item.contract.evidence ?? '',
    item.contract.motion ?? '',
    item.contract.extension ?? ''
  ].map((value) => value.toLowerCase());

  return query
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => {
      if (item.id.toLowerCase() === token || item.name.toLowerCase() === token) return score + 8;
      if (haystacks.some((value) => value.includes(token))) return score + 1;
      return score;
    }, 0);
}
