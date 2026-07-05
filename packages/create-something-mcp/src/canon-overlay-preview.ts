import {
  createCanonProjectOverlayManifest,
  renderCanonProjectOverlayTemplateFiles,
  type CanonProjectOverlayInstantiateFile,
  type CanonProjectOverlayInstantiateOptions
} from '@create-something/canon/overlays/project-template';

import type { CanonProjectOverlayManifest, CanonProjectOverlayReview } from './content/types.js';

export type CanonOverlayInstantiatePreviewOptions = Omit<
  CanonProjectOverlayInstantiateOptions,
  'dryRun' | 'force'
>;

export type CanonOverlayInstantiatePreviewFile = Omit<
  CanonProjectOverlayInstantiateFile,
  'action'
> & {
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
  const manifest = createCanonProjectOverlayManifest(options) as CanonProjectOverlayManifest;
  const files = renderCanonProjectOverlayTemplateFiles(options).map((file) => ({
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
      lines.push(
        `- \`${packet.id}\`: \`${decision.stage}\` / \`${decision.action}\` - ${decision.rationale}`
      );
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
      lines.push(
        '',
        `#### ${file.relativePath}`,
        '',
        fencedContent(file.relativePath, file.content)
      );
    }
  }

  return lines.join('\n');
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
