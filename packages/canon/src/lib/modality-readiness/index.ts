import type {
  CanonExtensionSurfaceEvidence,
  CanonProjectOverlayInventory,
  CanonProjectOverlayInventoryEntry,
  CanonRegistryItem,
  CanonRegistryManifest,
  CanonRegistryModality
} from '../registry/schema.js';

export type CanonModalityReadinessStatus = 'implemented' | 'templated' | 'gap';

export type CanonModalityReadinessEntry = {
  modality: CanonRegistryModality;
  status: CanonModalityReadinessStatus;
  registryItemCount: number;
  stableRegistryItemCount: number;
  templateCount: number;
  templateIds: string[];
  readyOverlayCount: number;
  overlayIds: string[];
  candidateIntakeCount: number;
  evidenceSurfaceCount: number;
  evidenceSurfaceIds: string[];
  summary: string;
  gaps: string[];
  nextEvidence: string[];
};

export type CanonModalityReadinessReport = {
  schemaVersion: 1;
  id: 'canon-modality-readiness-report';
  sourceOfTruth: '@create-something/canon/modality-readiness';
  description: string;
  modalities: CanonModalityReadinessEntry[];
  summary: {
    totalModalities: number;
    implemented: number;
    templated: number;
    gaps: number;
    registryItems: number;
    templateItems: number;
    readyOverlays: number;
    evidenceSurfaces: number;
  };
  agentContract: {
    purpose: 'canon-modality-readiness';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
};

export function buildCanonModalityReadinessReport(options: {
  registryManifest: CanonRegistryManifest;
  overlayInventory: CanonProjectOverlayInventory;
}): CanonModalityReadinessReport {
  const modalities = options.registryManifest.requiredModalities.map((modality) =>
    buildCanonModalityReadinessEntry({
      modality,
      registryItems: options.registryManifest.items.filter((item) =>
        item.modalities.includes(modality)
      ),
      overlayEntries: options.overlayInventory.entries
    })
  );

  return {
    schemaVersion: 1,
    id: 'canon-modality-readiness-report',
    sourceOfTruth: '@create-something/canon/modality-readiness',
    description:
      'Machine-readable Canon readiness matrix for separating implemented project-overlay evidence from registry and template coverage across web, chat, app, voice, and glasses.',
    modalities,
    summary: {
      totalModalities: modalities.length,
      implemented: modalities.filter((entry) => entry.status === 'implemented').length,
      templated: modalities.filter((entry) => entry.status === 'templated').length,
      gaps: modalities.filter((entry) => entry.status === 'gap').length,
      registryItems: sum(modalities.map((entry) => entry.registryItemCount)),
      templateItems: sum(modalities.map((entry) => entry.templateCount)),
      readyOverlays: sum(modalities.map((entry) => entry.readyOverlayCount)),
      evidenceSurfaces: sum(modalities.map((entry) => entry.evidenceSurfaceCount))
    },
    agentContract: {
      purpose: 'canon-modality-readiness',
      primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
      useFor: [
        'auditing Canon foundation completeness before claiming web, chat, app, voice, and glasses coverage',
        'distinguishing real project-overlay evidence from registry or template-only readiness',
        'choosing the next modality-specific project overlay or Canon template implementation slice',
        'feeding Canon completion status into MCP resources and agent handoffs'
      ],
      stopBefore: [
        'claiming a modality is implemented when it only has registry or template coverage',
        'treating one project overlay as stable Canon promotion without the overlay candidate workflow',
        'promoting voice or glasses coverage from templated to implemented without real overlay evidence',
        'creating a separate readiness tracker outside Canon registry, overlays, MCP, or Linear'
      ]
    }
  };
}

export function renderCanonModalityReadinessReport(report: CanonModalityReadinessReport): string {
  const lines = [
    '# Canon Modality Readiness',
    '',
    report.description,
    '',
    '## Summary',
    '',
    `- Implemented modalities: ${report.summary.implemented}`,
    `- Templated modalities: ${report.summary.templated}`,
    `- Gap modalities: ${report.summary.gaps}`,
    `- Registry item references: ${report.summary.registryItems}`,
    `- Template item references: ${report.summary.templateItems}`,
    `- Ready overlay references: ${report.summary.readyOverlays}`,
    `- Evidence surfaces: ${report.summary.evidenceSurfaces}`,
    ''
  ];

  for (const entry of report.modalities) {
    lines.push(`## ${entry.modality}`);
    lines.push('');
    lines.push(`- Status: \`${entry.status}\``);
    lines.push(`- Registry items: ${entry.registryItemCount}`);
    lines.push(`- Stable registry items: ${entry.stableRegistryItemCount}`);
    lines.push(`- Templates: ${entry.templateIds.length ? entry.templateIds.join(', ') : 'none'}`);
    lines.push(
      `- Ready overlays: ${entry.overlayIds.length ? entry.overlayIds.join(', ') : 'none'}`
    );
    lines.push(
      `- Evidence surfaces: ${
        entry.evidenceSurfaceIds.length ? entry.evidenceSurfaceIds.join(', ') : 'none'
      }`
    );
    lines.push('');
    lines.push(entry.summary);

    if (entry.gaps.length) {
      lines.push('', '### Gaps');
      for (const gap of entry.gaps) lines.push(`- ${gap}`);
    }

    if (entry.nextEvidence.length) {
      lines.push('', '### Next Evidence');
      for (const item of entry.nextEvidence) lines.push(`- ${item}`);
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function buildCanonModalityReadinessEntry(options: {
  modality: CanonRegistryModality;
  registryItems: CanonRegistryItem[];
  overlayEntries: CanonProjectOverlayInventoryEntry[];
}): CanonModalityReadinessEntry {
  const templates = options.registryItems.filter((item) => item.kind === 'template');
  const readyOverlayEntries = options.overlayEntries.filter(
    (entry) =>
      entry.review.status === 'ready' && entry.manifest.targetModalities.includes(options.modality)
  );
  const evidenceSurfaces = options.overlayEntries.flatMap((entry) =>
    (entry.manifest.extensionIntakes ?? []).flatMap((packet) =>
      packet.surfaces.filter((surface) => surface.modality === options.modality)
    )
  );
  const candidateIntakes = options.overlayEntries.flatMap((entry) =>
    entry.review.extensionDecisions.filter(
      (decision) =>
        decision.decision.action === 'promote-candidate' &&
        decision.packet.requestedModalities.includes(options.modality)
    )
  );

  const status = getReadinessStatus({
    registryItemCount: options.registryItems.length,
    templateCount: templates.length,
    readyOverlayCount: readyOverlayEntries.length,
    evidenceSurfaceCount: evidenceSurfaces.length
  });
  const gaps = getReadinessGaps({
    modality: options.modality,
    status,
    registryItemCount: options.registryItems.length,
    templateCount: templates.length,
    readyOverlayCount: readyOverlayEntries.length,
    evidenceSurfaceCount: evidenceSurfaces.length
  });

  return {
    modality: options.modality,
    status,
    registryItemCount: options.registryItems.length,
    stableRegistryItemCount: options.registryItems.filter((item) => item.maturity === 'stable')
      .length,
    templateCount: templates.length,
    templateIds: templates.map((template) => template.id).sort(),
    readyOverlayCount: readyOverlayEntries.length,
    overlayIds: uniqueSorted(readyOverlayEntries.map((entry) => entry.manifest.id)),
    candidateIntakeCount: candidateIntakes.length,
    evidenceSurfaceCount: evidenceSurfaces.length,
    evidenceSurfaceIds: uniqueSorted(evidenceSurfaces.map(surfaceEvidenceId)),
    summary: renderReadinessSummary({
      modality: options.modality,
      status,
      registryItemCount: options.registryItems.length,
      templateCount: templates.length,
      readyOverlayCount: readyOverlayEntries.length,
      evidenceSurfaceCount: evidenceSurfaces.length
    }),
    gaps,
    nextEvidence: getNextEvidence({ modality: options.modality, status, gaps })
  };
}

function getReadinessStatus(options: {
  registryItemCount: number;
  templateCount: number;
  readyOverlayCount: number;
  evidenceSurfaceCount: number;
}): CanonModalityReadinessStatus {
  if (options.readyOverlayCount > 0 && options.evidenceSurfaceCount > 0) {
    return 'implemented';
  }
  if (options.registryItemCount > 0 || options.templateCount > 0) {
    return 'templated';
  }
  return 'gap';
}

function getReadinessGaps(options: {
  modality: CanonRegistryModality;
  status: CanonModalityReadinessStatus;
  registryItemCount: number;
  templateCount: number;
  readyOverlayCount: number;
  evidenceSurfaceCount: number;
}): string[] {
  const gaps: string[] = [];

  if (options.registryItemCount === 0) {
    gaps.push(`${options.modality} has no Canon registry items.`);
  }
  if (options.templateCount === 0) {
    gaps.push(`${options.modality} has no Canon template item.`);
  }
  if (options.readyOverlayCount === 0) {
    gaps.push(`${options.modality} has no ready project overlay manifest.`);
  }
  if (options.evidenceSurfaceCount === 0) {
    gaps.push(`${options.modality} has no project-overlay surface evidence.`);
  }
  if (options.status === 'templated') {
    gaps.push(
      `${options.modality} is available as Canon registry/template guidance but still needs implementation evidence before it can be called implemented.`
    );
  }

  return gaps;
}

function getNextEvidence(options: {
  modality: CanonRegistryModality;
  status: CanonModalityReadinessStatus;
  gaps: string[];
}): string[] {
  if (options.status === 'implemented') {
    return [
      'Keep overlay evidence current as project surfaces change.',
      'Route repeated patterns through Canon candidate promotion before marking stable.'
    ];
  }

  if (options.status === 'templated') {
    return [
      `Add or extend a project overlay with ${options.modality} target modality evidence.`,
      'Include source paths, operator proof, dependencies, and candidate intake routing.',
      'Keep the modality templated until overlay inventory reports ready evidence.'
    ];
  }

  return [
    `Create a Canon registry item or template for ${options.modality}.`,
    'Add docs, import/export path, and validation before collecting project overlay evidence.'
  ];
}

function renderReadinessSummary(options: {
  modality: CanonRegistryModality;
  status: CanonModalityReadinessStatus;
  registryItemCount: number;
  templateCount: number;
  readyOverlayCount: number;
  evidenceSurfaceCount: number;
}): string {
  if (options.status === 'implemented') {
    return `${options.modality} has Canon registry coverage plus ready project-overlay evidence from ${options.evidenceSurfaceCount} surface(s).`;
  }
  if (options.status === 'templated') {
    return `${options.modality} has Canon registry or template coverage, but no ready project-overlay evidence yet.`;
  }
  return `${options.modality} is not yet represented in Canon registry or project-overlay evidence.`;
}

function surfaceEvidenceId(surface: CanonExtensionSurfaceEvidence): string {
  return surface.sourcePath ? `${surface.surfaceId}:${surface.sourcePath}` : surface.surfaceId;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
