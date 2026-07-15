import type { FileEntry } from '@create-something/bundle-scanner-core';

const ABSOLUTE_URL_PATTERN = /https:\/\/[^\s"'`<>\\)]+/g;
const RUNTIME_PATH_PATTERN = /\/v\d+\/cdn\/runtime(?:\/[^\s"'`<>\\)]*)?\.js/g;
const RUNTIME_URL_HINT = /(?:\/runtime(?:\/|\.|$)|\/loader(?:\/|\.|$)|\/cdn\/[^/?#]+\.js)/i;
const API_ORIGIN_HINT = /\b(?:api|cdn)\./i;
const NON_PRODUCTION_HOST_HINT = /(?:^|\.)(?:example|example\.com|localhost)(?:\.|$)|mywebsite/i;

function cleanUrl(value: string): string | null {
  try {
    const url = new URL(value.replace(/[},;]+$/, ''));
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function discoverRuntimeReferences(inventory: FileEntry[]): string[] {
  const absoluteUrls = new Set<string>();
  const runtimePaths = new Set<string>();

  for (const file of inventory) {
    if (!file.content) continue;

    for (const match of file.content.matchAll(ABSOLUTE_URL_PATTERN)) {
      const normalized = cleanUrl(match[0]);
      if (normalized) absoluteUrls.add(normalized);
    }

    for (const match of file.content.matchAll(RUNTIME_PATH_PATTERN)) {
      runtimePaths.add(match[0]);
    }
  }

  const references = new Set<string>();
  const candidateOrigins = new Set<string>();

  for (const value of absoluteUrls) {
    const url = new URL(value);
    if (
      url.pathname === '/' &&
      API_ORIGIN_HINT.test(url.hostname) &&
      !NON_PRODUCTION_HOST_HINT.test(url.hostname)
    ) {
      candidateOrigins.add(url.origin);
    }
    if (RUNTIME_URL_HINT.test(url.pathname)) references.add(value);
  }

  for (const path of runtimePaths) {
    const normalizedPath = path.replace(/\$\{[^}]+\}/g, '{id}');
    for (const origin of candidateOrigins) {
      references.add(`${origin}${normalizedPath}`);
    }
  }

  return [...references].sort();
}
