import type {
  CanonProjectOverlayTemplateFile,
  CanonProjectOverlayTemplateFilePack
} from '@create-something/canon/overlays/project-template';
import {
  buildCanonProjectOverlayTemplateFilePack,
  getCanonProjectOverlayTemplateFile,
  listCanonProjectOverlayTemplateFilePaths,
  renderCanonProjectOverlayTemplateFileMarkdown,
  renderCanonProjectOverlayTemplateFilePackMarkdown
} from '@create-something/canon/overlays/project-template';

export type CanonOverlayTemplateFile = CanonProjectOverlayTemplateFile;
export type CanonOverlayTemplateFilePack = CanonProjectOverlayTemplateFilePack;

export function getCanonOverlayTemplateFilePack(): CanonOverlayTemplateFilePack {
  return buildCanonProjectOverlayTemplateFilePack();
}

export function listCanonOverlayTemplateFilePaths(): string[] {
  return listCanonProjectOverlayTemplateFilePaths();
}

export function getCanonOverlayTemplateFile(
  relativePath: string
): CanonOverlayTemplateFile | undefined {
  return getCanonProjectOverlayTemplateFile(relativePath);
}

export function renderCanonOverlayTemplateFilePack(
  pack = buildCanonProjectOverlayTemplateFilePack()
): string {
  return renderCanonProjectOverlayTemplateFilePackMarkdown(pack);
}

export function renderCanonOverlayTemplateFile(file: CanonOverlayTemplateFile): string {
  return renderCanonProjectOverlayTemplateFileMarkdown(file);
}
