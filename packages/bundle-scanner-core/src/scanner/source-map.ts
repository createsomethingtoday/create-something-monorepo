import type { FileEntry, SourceMapReference, SourceMapSummary, UnzippedFile } from '../types';
import { getExtension } from '../utils/glob';

type ParsedSourceMap = {
  path: string;
  file?: string;
  sources: string[];
};

const GENERATED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.css']);

function decodeText(data: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    return null;
  }
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '' : normalized.slice(0, index);
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? normalized : normalized.slice(index + 1);
}

function joinPath(base: string, target: string): string {
  const normalizedTarget = normalizePath(target);
  if (!base) return normalizedTarget;
  return normalizePath(`${base}/${normalizedTarget}`);
}

function stripQueryAndHash(value: string): string {
  return value.split(/[?#]/, 1)[0] ?? value;
}

function resolveReference(filePath: string, target: string): string | undefined {
  if (/^data:/i.test(target)) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
    return stripQueryAndHash(target);
  }
  return joinPath(dirname(filePath), stripQueryAndHash(target));
}

function extractSourceMapReferences(file: FileEntry): SourceMapReference[] {
  const content = file.content ?? '';
  if (!content) return [];

  const references: SourceMapReference[] = [];
  const pattern =
    /(?:\/\/[#@]\s*sourceMappingURL=|\/\*[#@]\s*sourceMappingURL=)([^\s*]+)\s*(?:\*\/)?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const target = match[1]?.trim();
    if (!target) continue;
    references.push({
      filePath: file.path,
      target,
      resolvedTarget: resolveReference(file.path, target),
      inline: /^data:/i.test(target)
    });
  }
  return references;
}

function isGeneratedReviewCandidate(file: FileEntry): boolean {
  if (!GENERATED_EXTENSIONS.has(file.ext)) return false;
  if (file.path.endsWith('.map')) return false;
  if (/\/(node_modules|vendor|third_party|bower_components)\//i.test(`/${file.path}`)) return false;
  if (file.tags.includes('MINIFIED_FILE') || file.tags.includes('GENERATED_BUNDLE')) return true;
  if (/[._-]min\.(js|css)$/i.test(file.path)) return true;
  if (/(^|\/)(bundle|main|runtime|polyfills|vendor)(\.[\w-]+)?\.(js|css)$/i.test(file.path)) {
    return true;
  }
  return extractSourceMapReferences(file).length > 0;
}

function parseSourceMap(
  file: UnzippedFile
): ParsedSourceMap | { path: string; error: string } | null {
  const normalizedPath = normalizePath(file.path);
  if (!normalizedPath.endsWith('.map')) return null;

  const text = decodeText(file.data);
  if (!text) return { path: normalizedPath, error: 'Source map is not valid UTF-8 text.' };

  try {
    const parsed = JSON.parse(text) as {
      version?: unknown;
      file?: unknown;
      sources?: unknown;
    };
    if (parsed.version !== 3) {
      return { path: normalizedPath, error: 'Source map version must be 3.' };
    }
    if (!Array.isArray(parsed.sources)) {
      return { path: normalizedPath, error: 'Source map is missing a sources array.' };
    }

    return {
      path: normalizedPath,
      file: typeof parsed.file === 'string' ? normalizePath(parsed.file) : undefined,
      sources: parsed.sources
        .filter((source): source is string => typeof source === 'string')
        .map(normalizePath)
    };
  } catch {
    return { path: normalizedPath, error: 'Source map is not valid JSON.' };
  }
}

function mapLookupKeys(map: ParsedSourceMap): string[] {
  const keys = new Set<string>();
  keys.add(map.path);
  keys.add(basename(map.path));
  if (map.path.endsWith('.map')) {
    const generatedPath = map.path.slice(0, -4);
    keys.add(generatedPath);
    keys.add(basename(generatedPath));
  }
  if (map.file) {
    keys.add(map.file);
    keys.add(basename(map.file));
    keys.add(`${map.file}.map`);
    keys.add(`${basename(map.file)}.map`);
  }
  return [...keys].filter(Boolean);
}

function candidateLookupKeys(filePath: string): string[] {
  const normalized = normalizePath(filePath);
  return [normalized, basename(normalized), `${normalized}.map`, `${basename(normalized)}.map`];
}

export function analyzeSourceMaps(
  bundleInventory: FileEntry[],
  sourceMapFiles?: UnzippedFile[]
): SourceMapSummary {
  const bundleSourceMapFiles = bundleInventory
    .filter((file) => file.tags.includes('SOURCE_MAP') || file.path.endsWith('.map'))
    .map((file) => file.path);
  const sourceMappingUrlReferences = bundleInventory.flatMap(extractSourceMapReferences);
  const reviewCandidates = bundleInventory.filter(isGeneratedReviewCandidate);

  const notes: string[] = [];
  if (bundleSourceMapFiles.length > 0) {
    notes.push('Production bundle contains source map files.');
  }
  if (sourceMappingUrlReferences.length > 0) {
    notes.push('Production bundle contains sourceMappingURL references.');
  }

  const artifactProvided = Boolean(sourceMapFiles?.length);
  if (!artifactProvided) {
    return {
      status: reviewCandidates.length > 0 ? 'missing' : 'not_provided',
      artifactProvided: false,
      publicExposure: bundleSourceMapFiles.length > 0 || sourceMappingUrlReferences.length > 0,
      reviewCandidateCount: reviewCandidates.length,
      sourceMapFileCount: 0,
      validSourceMapCount: 0,
      invalidSourceMaps: [],
      exposedSourceMapFiles: bundleSourceMapFiles,
      sourceMappingUrlReferences,
      matchedGeneratedFiles: [],
      missingGeneratedFiles: reviewCandidates.map((file) => file.path),
      orphanSourceMaps: [],
      notes
    };
  }

  const parsedMaps: ParsedSourceMap[] = [];
  const invalidSourceMaps: Array<{ path: string; error: string }> = [];
  for (const file of sourceMapFiles ?? []) {
    const parsed = parseSourceMap(file);
    if (!parsed) continue;
    if ('error' in parsed) {
      invalidSourceMaps.push(parsed);
    } else {
      parsedMaps.push(parsed);
    }
  }

  const sourceMapLookup = new Map<string, ParsedSourceMap>();
  for (const map of parsedMaps) {
    for (const key of mapLookupKeys(map)) {
      sourceMapLookup.set(normalizePath(key), map);
    }
  }

  const matchedMapPaths = new Set<string>();
  const matchedGeneratedFiles: string[] = [];
  const missingGeneratedFiles: string[] = [];

  for (const candidate of reviewCandidates) {
    const keys = candidateLookupKeys(candidate.path).map(normalizePath);
    const match = keys.map((key) => sourceMapLookup.get(key)).find(Boolean);
    if (match) {
      matchedGeneratedFiles.push(candidate.path);
      matchedMapPaths.add(match.path);
    } else {
      missingGeneratedFiles.push(candidate.path);
    }
  }

  const missingReferenceTargets: string[] = [];
  for (const reference of sourceMappingUrlReferences) {
    if (reference.inline) continue;
    const keys = [reference.resolvedTarget, reference.target, basename(reference.target)]
      .filter((value): value is string => Boolean(value))
      .map(normalizePath);
    const match = keys.map((key) => sourceMapLookup.get(key)).find(Boolean);
    if (match) {
      matchedMapPaths.add(match.path);
      if (!matchedGeneratedFiles.includes(reference.filePath)) {
        matchedGeneratedFiles.push(reference.filePath);
      }
    } else {
      missingReferenceTargets.push(reference.resolvedTarget ?? reference.target);
    }
  }

  const orphanSourceMaps = parsedMaps
    .filter((map) => !matchedMapPaths.has(map.path))
    .map((map) => map.path);

  if (invalidSourceMaps.length > 0) {
    notes.push('One or more source map files could not be parsed.');
  }
  if (missingReferenceTargets.length > 0) {
    notes.push(`Missing source maps for references: ${missingReferenceTargets.join(', ')}`);
  }

  let status: SourceMapSummary['status'];
  if (parsedMaps.length === 0) {
    status = 'invalid';
  } else if (reviewCandidates.length === 0 && sourceMappingUrlReferences.length === 0) {
    status = 'not_required';
  } else if (matchedGeneratedFiles.length === 0) {
    status = 'mismatch';
  } else if (missingGeneratedFiles.length > 0 || missingReferenceTargets.length > 0) {
    status = 'partial';
  } else {
    status = 'matched';
  }

  return {
    status,
    artifactProvided: true,
    publicExposure: bundleSourceMapFiles.length > 0 || sourceMappingUrlReferences.length > 0,
    reviewCandidateCount: reviewCandidates.length,
    sourceMapFileCount: (sourceMapFiles ?? []).filter((file) => getExtension(file.path) === '.map')
      .length,
    validSourceMapCount: parsedMaps.length,
    invalidSourceMaps,
    exposedSourceMapFiles: bundleSourceMapFiles,
    sourceMappingUrlReferences,
    matchedGeneratedFiles: [...new Set(matchedGeneratedFiles)],
    missingGeneratedFiles: [...new Set([...missingGeneratedFiles, ...missingReferenceTargets])],
    orphanSourceMaps,
    notes
  };
}
