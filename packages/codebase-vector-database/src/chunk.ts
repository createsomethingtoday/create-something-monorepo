import type { FileEntry } from '@create-something/bundle-scanner-core';
import type { CodeChunkInput } from './types.js';
import { nowIso, sha256Hex } from './utils.js';

export interface CreateChunkOptions {
  bundleId: string;
  maxChars: number;
  overlapLines: number;
  createdAt?: string;
}

const EXTENSION_LANGUAGES: Record<string, string> = {
  '.astro': 'astro',
  '.bash': 'shell',
  '.c': 'c',
  '.cc': 'cpp',
  '.cjs': 'javascript',
  '.clj': 'clojure',
  '.cpp': 'cpp',
  '.cs': 'csharp',
  '.css': 'css',
  '.dart': 'dart',
  '.env': 'dotenv',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.go': 'go',
  '.graphql': 'graphql',
  '.h': 'c',
  '.hpp': 'cpp',
  '.html': 'html',
  '.java': 'java',
  '.js': 'javascript',
  '.json': 'json',
  '.json5': 'json',
  '.jsonc': 'json',
  '.jsx': 'javascript',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.less': 'less',
  '.lua': 'lua',
  '.mjs': 'javascript',
  '.md': 'markdown',
  '.mdx': 'mdx',
  '.php': 'php',
  '.prisma': 'prisma',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.sass': 'sass',
  '.scala': 'scala',
  '.scss': 'scss',
  '.sh': 'shell',
  '.sql': 'sql',
  '.svelte': 'svelte',
  '.svg': 'svg',
  '.swift': 'swift',
  '.toml': 'toml',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.vue': 'vue',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.zsh': 'shell',
};

export function languageForExtension(ext: string): string {
  return EXTENSION_LANGUAGES[ext.toLowerCase()] ?? (ext.replace(/^\./, '') || 'text');
}

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function splitIntoLineChunks(
  content: string,
  maxChars: number,
  overlapLines: number,
): Array<{ content: string; startLine: number; endLine: number }> {
  const lines = normalizeContent(content).split('\n');
  const chunks: Array<{ content: string; startLine: number; endLine: number }> = [];
  let start = 0;

  while (start < lines.length) {
    const firstLine = lines[start] ?? '';
    if (firstLine.length > maxChars) {
      for (let offset = 0; offset < firstLine.length; offset += maxChars) {
        const chunkContent = firstLine.slice(offset, offset + maxChars).trim();
        if (chunkContent.length > 0) {
          chunks.push({
            content: chunkContent,
            startLine: start + 1,
            endLine: start + 1,
          });
        }
      }
      start += 1;
      continue;
    }

    let end = start;
    let length = 0;

    while (end < lines.length) {
      const lineLength = lines[end]!.length + 1;
      if (end > start && length + lineLength > maxChars) break;
      length += lineLength;
      end += 1;
    }

    const chunkLines = lines.slice(start, end);
    const chunkContent = chunkLines.join('\n').trim();
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        startLine: start + 1,
        endLine: Math.max(end, start + 1),
      });
    }

    if (end >= lines.length) break;
    start = Math.max(start + 1, end - overlapLines);
  }

  return chunks;
}

function shouldChunkFile(file: FileEntry): file is FileEntry & { content: string } {
  return !file.isIgnored && file.isTextCandidate && typeof file.content === 'string' && file.content.trim().length > 0;
}

export async function createCodeChunks(files: FileEntry[], options: CreateChunkOptions): Promise<CodeChunkInput[]> {
  const createdAt = options.createdAt ?? nowIso();
  const chunks: CodeChunkInput[] = [];

  for (const file of files) {
    if (!shouldChunkFile(file)) continue;

    const language = languageForExtension(file.ext);
    const lineChunks = splitIntoLineChunks(file.content, options.maxChars, options.overlapLines);

    for (const [index, chunk] of lineChunks.entries()) {
      const contentHash = await sha256Hex(chunk.content);
      const identityHash = await sha256Hex(`${options.bundleId}\0${file.path}\0${index}\0${contentHash}`);
      const id = `code_chunk_${identityHash.slice(0, 32)}`;

      chunks.push({
        id,
        bundleId: options.bundleId,
        vectorId: id,
        filePath: file.path,
        ext: file.ext,
        language,
        chunkIndex: index,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        sizeBytes: new TextEncoder().encode(chunk.content).byteLength,
        contentHash,
        content: chunk.content,
        tags: file.tags,
        createdAt,
      });
    }
  }

  return chunks;
}

export function buildEmbeddingText(
  chunk: Pick<CodeChunkInput, 'filePath' | 'language' | 'startLine' | 'endLine' | 'content'>,
  context: { repository?: string | null; ref?: string | null; commitSha?: string | null } = {},
): string {
  const header = [
    context.repository ? `Repository: ${context.repository}` : null,
    context.ref ? `Ref: ${context.ref}` : null,
    context.commitSha ? `Commit: ${context.commitSha}` : null,
    `Path: ${chunk.filePath}`,
    `Language: ${chunk.language}`,
    `Lines: ${chunk.startLine}-${chunk.endLine}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `${header}\n\n${chunk.content}`;
}
