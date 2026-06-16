import type { FileEntry } from '@create-something/bundle-scanner-core';
import { sha256Hex } from './utils.js';

interface ManifestFile {
  path: string;
  ext: string;
  sizeBytes: number;
  contentHash: string;
}

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function shouldIncludeInManifest(file: FileEntry): file is FileEntry & { content: string } {
  return !file.isIgnored && file.isTextCandidate && typeof file.content === 'string';
}

export async function buildContentManifestHash(files: FileEntry[]): Promise<string> {
  const manifestFiles: ManifestFile[] = [];

  for (const file of files) {
    if (!shouldIncludeInManifest(file)) continue;

    const content = normalizeContent(file.content);
    manifestFiles.push({
      path: file.path,
      ext: file.ext,
      sizeBytes: new TextEncoder().encode(content).byteLength,
      contentHash: await sha256Hex(content),
    });
  }

  manifestFiles.sort((left, right) => left.path.localeCompare(right.path) || left.ext.localeCompare(right.ext));
  return sha256Hex(manifestFiles.map((file) => JSON.stringify(file)).join('\n'));
}
