import { CANON_OVERLAY_TEMPLATE_FILE_PACK } from './content/generated/canon-overlay-template-files.js';
import type {
  CanonOverlayTemplateFile,
  CanonOverlayTemplateFilePack
} from './content/types.js';

export function getCanonOverlayTemplateFilePack(): CanonOverlayTemplateFilePack {
  return CANON_OVERLAY_TEMPLATE_FILE_PACK;
}

export function listCanonOverlayTemplateFilePaths(): string[] {
  return CANON_OVERLAY_TEMPLATE_FILE_PACK.files.map((file) => file.relativePath);
}

export function getCanonOverlayTemplateFile(relativePath: string): CanonOverlayTemplateFile | undefined {
  const normalizedPath = normalizeRelativePath(relativePath);

  return CANON_OVERLAY_TEMPLATE_FILE_PACK.files.find((file) => file.relativePath === normalizedPath);
}

export function renderCanonOverlayTemplateFilePack(pack = CANON_OVERLAY_TEMPLATE_FILE_PACK): string {
  const lines = [
    '# Canon overlay template file pack',
    '',
    `- Template: ${pack.templateId}`,
    `- Template resource: ${pack.templateUri}`,
    `- File pack resource: ${pack.filesUri}`,
    `- Source of truth: ${pack.sourceOfTruth}`,
    `- Files: ${pack.summary.totalFiles}`,
    '',
    pack.description,
    '',
    '## Files',
    '',
    '| Path | MIME type | Resource |',
    '| --- | --- | --- |'
  ];

  for (const file of pack.files) {
    lines.push(`| ${file.relativePath} | ${file.mimeType} | ${file.uri} |`);
  }

  lines.push(
    '',
    '## Agent Contract',
    '',
    `- Purpose: ${pack.agentContract.purpose}`,
    `- Primary consumers: ${pack.agentContract.primaryConsumers.join(', ')}`,
    '',
    'Use for:'
  );

  for (const use of pack.agentContract.useFor) lines.push(`- ${use}`);

  lines.push('', 'Stop before:');

  for (const stop of pack.agentContract.stopBefore) lines.push(`- ${stop}`);

  lines.push('', '## File Contents');

  for (const file of pack.files) {
    lines.push('', renderCanonOverlayTemplateFile(file));
  }

  return lines.join('\n');
}

export function renderCanonOverlayTemplateFile(file: CanonOverlayTemplateFile): string {
  return [
    `### ${file.relativePath}`,
    '',
    `- Resource: ${file.uri}`,
    `- Output path: ${file.outputPath}`,
    `- MIME type: ${file.mimeType}`,
    `- Description: ${file.description}`,
    '',
    fencedContent(file.relativePath, file.content)
  ].join('\n');
}

function normalizeRelativePath(relativePath: string): string {
  const decoded = decodeURIComponent(relativePath);
  return decoded.replace(/^\/+/g, '');
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
