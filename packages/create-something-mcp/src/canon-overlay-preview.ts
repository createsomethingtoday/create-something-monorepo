import type {
  CanonProjectOverlayManifest,
  CanonProjectOverlayReview,
  CanonRegistryModality
} from './content/types.js';

const DEFAULT_MODALITIES: CanonRegistryModality[] = ['web', 'chat', 'app', 'voice', 'glasses'];

const CANON_PROJECT_OVERLAY_TEMPLATE_ARTIFACTS: CanonProjectOverlayManifest['artifacts'] = [
  {
    kind: 'theme',
    path: 'theme.css',
    description: 'Project-local CSS aliases that point back to Canon tokens.',
    registryItemIds: ['token.canon-core']
  },
  {
    kind: 'tokens',
    path: 'tokens.json',
    description: 'Design-token aliases for project-specific names without a new token scale.',
    registryItemIds: ['token.canon-core']
  },
  {
    kind: 'templates',
    path: 'templates',
    description: 'Copyable briefs for surface-specific workflow overlays.',
    registryItemIds: [
      'template.canon-project-overlay-manifest',
      'template.canon-extension-intake'
    ]
  },
  {
    kind: 'copy-rules',
    path: 'copy-rules.md',
    description: 'Project voice and terminology rules that keep Canon primitives stable.',
    registryItemIds: ['policy.signal-decision-proof']
  },
  {
    kind: 'surface-policy',
    path: 'surface-policy.md',
    description: 'Modality policy for web, chat, app, voice, and glasses overlays.',
    registryItemIds: ['policy.signal-decision-proof']
  },
  {
    kind: 'registry',
    path: 'registry.json',
    description: 'Project-local registry metadata and Canon dependency list.',
    registryItemIds: [
      'component.clear-decision-panel',
      'component.clear-proof-strip',
      'template.canon-project-overlay-manifest'
    ]
  }
];

export const CANON_PROJECT_OVERLAY_OUTPUT_FILES = [
  'theme.css',
  'tokens.json',
  'templates/README.md',
  'templates/surface-brief.md',
  'copy-rules.md',
  'surface-policy.md',
  'registry.json',
  'manifest.ts'
] as const;

export type CanonOverlayInstantiatePreviewOptions = {
  id: string;
  name: string;
  owner: string;
  sourcePackage: string;
  outputRoot: string;
  targetModalities?: CanonRegistryModality[];
  tags?: string[];
  includeContent?: boolean;
};

export type CanonOverlayInstantiatePreviewFile = {
  relativePath: (typeof CANON_PROJECT_OVERLAY_OUTPUT_FILES)[number];
  path: string;
  content: string;
  action: 'would-create';
};

export type CanonOverlayInstantiatePreviewResult = {
  manifest: CanonProjectOverlayManifest;
  files: CanonOverlayInstantiatePreviewFile[];
  outputRoot: string;
  summary: string;
};

export function createCanonOverlayInstantiatePreview(
  options: CanonOverlayInstantiatePreviewOptions
): CanonOverlayInstantiatePreviewResult {
  const manifest = createCanonProjectOverlayManifest(options);
  const files = renderCanonProjectOverlayTemplateFiles(options, manifest).map((file) => ({
    ...file,
    action: 'would-create' as const,
    content: options.includeContent ? file.content : ''
  }));

  return {
    manifest,
    files,
    outputRoot: options.outputRoot,
    summary: `Would create ${files.length} Canon overlay file(s) in ${options.outputRoot}.`
  };
}

export function renderCanonOverlayInstantiatePreview(
  result: CanonOverlayInstantiatePreviewResult,
  review: CanonProjectOverlayReview,
  includeContent: boolean
): string {
  const lines = [
    '## Canon Overlay Instantiation Preview',
    '',
    `- Overlay: \`${result.manifest.id}\``,
    `- Name: ${result.manifest.name}`,
    `- Status: \`${review.status}\``,
    `- Owner: ${result.manifest.owner}`,
    `- Source package: \`${result.manifest.sourcePackage}\``,
    `- Output root: \`${result.outputRoot}\``,
    `- Target modalities: ${result.manifest.targetModalities.map((m) => `\`${m}\``).join(', ')}`,
    `- Planned files: ${result.files.length}`,
    '',
    result.summary,
    '',
    '### File Plan',
    '',
    '| Action | Relative path | Target path |',
    '|--------|---------------|-------------|'
  ];

  for (const file of result.files) {
    lines.push(`| \`${file.action}\` | \`${file.relativePath}\` | \`${file.path}\` |`);
  }

  lines.push(
    '',
    '### Generated Manifest Review',
    '',
    `- Required artifacts: ${review.requiredArtifacts.map((kind) => `\`${kind}\``).join(', ')}`,
    `- Present artifacts: ${review.presentArtifacts.map((kind) => `\`${kind}\``).join(', ') || 'none'}`,
    `- Missing artifacts: ${review.missingArtifacts.map((kind) => `\`${kind}\``).join(', ') || 'none'}`,
    `- Integrity issues: ${review.integrityIssues.length}`,
    `- Summary: ${review.summary}`
  );

  if (review.extensionDecisions.length) {
    lines.push('', '### Extension Intake Decisions');
    for (const { packet, decision } of review.extensionDecisions) {
      lines.push(`- \`${packet.id}\`: \`${decision.stage}\` / \`${decision.action}\` - ${decision.rationale}`);
    }
  }

  lines.push('', '### Stop Conditions');
  for (const stop of review.stopConditions) lines.push(`- ${stop}`);

  lines.push(
    '',
    '### Write Boundary',
    '- This MCP preview does not write files.',
    '- Use the local Canon CLI for filesystem instantiation after reviewing this plan.'
  );

  if (includeContent) {
    lines.push('', '### File Contents');
    for (const file of result.files) {
      lines.push('', `#### ${file.relativePath}`, '', fencedContent(file.relativePath, file.content));
    }
  }

  return lines.join('\n');
}

function createCanonProjectOverlayManifest(
  options: Omit<CanonOverlayInstantiatePreviewOptions, 'outputRoot' | 'includeContent'>
): CanonProjectOverlayManifest {
  const targetModalities = options.targetModalities?.length
    ? options.targetModalities
    : DEFAULT_MODALITIES;
  const tags = options.tags?.length
    ? options.tags
    : ['canon', 'overlay', 'project', 'client', 'governance'];

  return {
    id: options.id,
    name: options.name,
    owner: options.owner,
    sourcePackage: options.sourcePackage,
    sourcePath: 'manifest.ts',
    targetModalities,
    tags,
    artifacts: CANON_PROJECT_OVERLAY_TEMPLATE_ARTIFACTS.map((artifact) => ({
      ...artifact,
      path: relativeOverlayArtifactPath(artifact.kind)
    })),
    extensionIntakes: [
      {
        id: `${options.id}.surface-brief`,
        title: 'Surface Brief Template',
        summary:
          'A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.',
        requestedKind: 'template',
        requestedModalities: targetModalities,
        owner: options.owner,
        sourcePackage: options.sourcePackage,
        sourcePath: 'templates/surface-brief.md',
        tags: ['overlay', 'brief', 'surface', 'evidence'],
        surfaces: [
          {
            surfaceId: `${targetModalities[0]}-${overlayIdSlug(options.id)}-brief-1`,
            name: 'Web project overlay brief',
            modality: targetModalities[0],
            sourcePath: 'templates/surface-brief.md',
            proof: 'Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake.'
          },
          {
            surfaceId: `${targetModalities[1] ?? targetModalities[0]}-${overlayIdSlug(options.id)}-brief-2`,
            name: 'Chat project overlay brief',
            modality: targetModalities[1] ?? targetModalities[0],
            sourcePath: 'templates/surface-brief.md',
            proof: 'The same structure summarizes cleanly for agent/chat handoff.'
          }
        ],
        dependencies: [
          'template.canon-project-overlay-manifest',
          'template.canon-extension-intake',
          'policy.signal-decision-proof'
        ]
      }
    ]
  };
}

function renderCanonProjectOverlayTemplateFiles(
  options: Pick<CanonOverlayInstantiatePreviewOptions, 'outputRoot'>,
  manifest: CanonProjectOverlayManifest
): Array<Omit<CanonOverlayInstantiatePreviewFile, 'action'>> {
  return [
    {
      relativePath: 'theme.css',
      path: joinOverlayPath(options.outputRoot, 'theme.css'),
      content: renderThemeCss(manifest)
    },
    {
      relativePath: 'tokens.json',
      path: joinOverlayPath(options.outputRoot, 'tokens.json'),
      content: `${JSON.stringify(renderTokensJson(manifest), null, 2)}\n`
    },
    {
      relativePath: 'templates/README.md',
      path: joinOverlayPath(options.outputRoot, 'templates/README.md'),
      content: renderTemplatesReadme(manifest)
    },
    {
      relativePath: 'templates/surface-brief.md',
      path: joinOverlayPath(options.outputRoot, 'templates/surface-brief.md'),
      content: renderSurfaceBrief(manifest)
    },
    {
      relativePath: 'copy-rules.md',
      path: joinOverlayPath(options.outputRoot, 'copy-rules.md'),
      content: renderCopyRules(manifest)
    },
    {
      relativePath: 'surface-policy.md',
      path: joinOverlayPath(options.outputRoot, 'surface-policy.md'),
      content: renderSurfacePolicy(manifest)
    },
    {
      relativePath: 'registry.json',
      path: joinOverlayPath(options.outputRoot, 'registry.json'),
      content: `${JSON.stringify(renderRegistryJson(manifest), null, 2)}\n`
    },
    {
      relativePath: 'manifest.ts',
      path: joinOverlayPath(options.outputRoot, 'manifest.ts'),
      content: renderManifestTs(manifest)
    }
  ];
}

function relativeOverlayArtifactPath(kind: CanonProjectOverlayManifest['artifacts'][number]['kind']) {
  switch (kind) {
    case 'theme':
      return 'theme.css';
    case 'tokens':
      return 'tokens.json';
    case 'templates':
      return 'templates';
    case 'copy-rules':
      return 'copy-rules.md';
    case 'surface-policy':
      return 'surface-policy.md';
    case 'registry':
      return 'registry.json';
  }
}

function renderThemeCss(manifest: CanonProjectOverlayManifest): string {
  return `/*
 * ${manifest.name} theme overlay.
 * Generated from @create-something/canon/overlays/project-template.
 * Keep aliases pointed at Canon tokens instead of forking primitives.
 */

:root {
\t--overlay-accent: var(--color-clear-action, #155eef);
\t--overlay-accent-contrast: var(--color-clear-action-contrast, #ffffff);
\t--overlay-surface: var(--color-bg-surface, #ffffff);
\t--overlay-surface-muted: var(--color-bg-subtle, #f6f7f9);
\t--overlay-border: var(--color-border-default, #d9dde5);
\t--overlay-proof: var(--color-clear-proof, #0f766e);
\t--overlay-review: var(--color-clear-review, #a16207);
\t--overlay-block: var(--color-clear-block, #b42318);
\t--overlay-radius: var(--radius-clear, 8px);
\t--overlay-focus-ring: 0 0 0 3px color-mix(in srgb, var(--overlay-accent) 24%, transparent);
}

[data-canon-overlay='${manifest.id}'] {
\tcolor: var(--color-fg-default, #111827);
\tbackground: var(--overlay-surface);
}

[data-canon-overlay='${manifest.id}'] :focus-visible {
\toutline: none;
\tbox-shadow: var(--overlay-focus-ring);
}
`;
}

function renderTokensJson(manifest: CanonProjectOverlayManifest) {
  return {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $extensions: {
      canonOverlay: {
        id: manifest.id,
        name: manifest.name,
        sourcePackage: manifest.sourcePackage
      }
    },
    canonOverlay: {
      accent: {
        $type: 'color',
        $value: '{color.clear.action}',
        $description: 'Project accent alias. Keep the underlying Canon token as the source of truth.'
      },
      surface: {
        $type: 'color',
        $value: '{color.bg.surface}',
        $description: 'Default overlay surface alias for web and app shells.'
      },
      proof: {
        $type: 'color',
        $value: '{color.clear.proof}',
        $description: 'Evidence and receipt state alias. Must be paired with text labels.'
      },
      radius: {
        $type: 'dimension',
        $value: '{radius.clear}',
        $description: 'Overlay radius alias. Do not introduce a project-specific radius scale.'
      }
    }
  };
}

function renderTemplatesReadme(manifest: CanonProjectOverlayManifest): string {
  return `# ${manifest.name} Templates

Copy these templates into project surfaces and fill in project-specific details.

## Files

- \`surface-brief.md\`: one surface or client workflow brief.

## Template Rules

- Keep template structure stable so agents can compare overlays across clients.
- Put project language in the overlay, not in Canon primitives.
- Attach extension-intake packets only when the project needs a primitive, template, adapter, token, or policy that Canon does not already provide.
`;
}

function renderSurfaceBrief(manifest: CanonProjectOverlayManifest): string {
  return `# Surface Brief

Overlay: ${manifest.name} (${manifest.id})

## Surface

- Name:
- Modality: ${manifest.targetModalities.join(' | ')}
- Owner: ${manifest.owner}
- Source path:

## Workflow Need

Describe the workflow object, action, policy, owner, and receipt.

## Canon Reuse

- Registry items:
- Imported components:
- Token aliases:

## Local Overlay

- Theme changes:
- Copy rules:
- Surface policy:
- Templates:

## Evidence

- Receipt:
- Validation command:
- Second surface or client proof:

## Extension Intake

Use only when the local overlay cannot reuse an existing Canon registry item.
`;
}

function renderCopyRules(manifest: CanonProjectOverlayManifest): string {
  return `# ${manifest.name} Copy Rules

Use this file to define project-local language while preserving Canon structure.

## Rules

- Name the workflow object before the action.
- Name the owner, evidence, receipt, and next action when a surface asks for trust.
- Keep state words stable across modalities: \`ready\`, \`review\`, \`blocked\`, \`complete\`.
- Keep reasoning and policy details off thin displays; summarize the decision and route to the full receipt.
- Do not rename Canon primitives to project-specific concepts when the primitive behavior is unchanged.

## Voice And Chat

- Prefer short declarative sentences.
- Make handoffs explicit: who owns the next step, what proof exists, and where the durable record lives.
- Do not put private chain-of-thought, hidden policy text, or speculative rationale in user-visible output.

## Web And App

- Put proof beside claims.
- Use action labels that describe the result, not the component.
- Keep local marketing tone in project copy files, not Canon primitives.
`;
}

function renderSurfacePolicy(manifest: CanonProjectOverlayManifest): string {
  return `# ${manifest.name} Surface Policy

This policy keeps ${manifest.sourcePackage} overlays portable across ${manifest.targetModalities.join(', ')} without forking Canon.

## Web

- Use Canon components and tokens first.
- Add project-local layout, copy, and theme aliases only when the consuming route needs them.
- Keep receipt, evidence, and owner metadata visible near decisions.

## Chat

- Return compact summaries grounded in overlay artifacts.
- Name the registry item or template before suggesting a local primitive.
- Route primitive changes through Canon extension intake.

## App

- Preserve touch targets, focus order, and text state labels.
- Use local templates for workflow-specific screens, not new base components.

## Voice

- Speak status, owner, and next action.
- Do not read long policy text. Point to the receipt or durable record.

## Glasses

- Show only glanceable state, owner, and next action.
- Keep reasoning, review history, and policy bodies on larger surfaces.

## Promotion Boundary

Project overlays can become Canon candidates only after repeated-surface evidence exists. Until then, keep implementation, copy, and policy local to the named overlay.
`;
}

function renderRegistryJson(manifest: CanonProjectOverlayManifest) {
  return {
    id: manifest.id,
    name: manifest.name,
    owner: manifest.owner,
    sourcePackage: manifest.sourcePackage,
    targetModalities: manifest.targetModalities,
    registryItemIds: [
      'token.canon-core',
      'component.clear-decision-panel',
      'component.clear-proof-strip',
      'template.canon-project-overlay-manifest',
      'template.canon-extension-intake',
      'policy.signal-decision-proof'
    ],
    overlayRule:
      'Use project-local artifacts for theme, tokens, templates, copy, surface policy, and registry metadata. Route primitive changes through Canon extension intake instead of forking Canon.'
  };
}

function renderManifestTs(manifest: CanonProjectOverlayManifest): string {
  return `import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';

export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = ${JSON.stringify(
    manifest,
    null,
    2
  )};
`;
}

function joinOverlayPath(outputRoot: string, relativePath: string): string {
  const trimmedRoot = outputRoot.replace(/\/+$/g, '');
  return trimmedRoot ? `${trimmedRoot}/${relativePath}` : relativePath;
}

function overlayIdSlug(id: string): string {
  return id.replace(/^overlay\./, '').replaceAll('.', '-');
}

function fencedContent(relativePath: string, content: string): string {
  const language = relativePath.endsWith('.ts')
    ? 'ts'
    : relativePath.endsWith('.json')
      ? 'json'
      : relativePath.endsWith('.css')
        ? 'css'
        : 'md';

  return `\`\`\`${language}\n${content}\`\`\``;
}
