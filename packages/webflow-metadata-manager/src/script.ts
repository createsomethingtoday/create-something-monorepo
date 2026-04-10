import type { StoredOverride } from './types.js';

export function renderMetadataOverrideScript(overrides: StoredOverride[]): string {
  const serialized = JSON.stringify(overrides);

  return `(() => {
  const overrides = ${serialized};

  function normalizePath(value) {
    if (!value) return null;
    let candidate = String(value).trim();
    if (!candidate) return null;
    candidate = candidate.split('?')[0].split('#')[0];
    if (!candidate.startsWith('/')) candidate = '/' + candidate;
    candidate = candidate.replace(/\\/+/g, '/');
    if (candidate.length > 1) candidate = candidate.replace(/\\/+$/, '');
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      // Keep the raw path if it cannot be decoded.
    }
    return candidate.toLowerCase();
  }

  function upsertMeta(selector, attributes) {
    const head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;

    let node = head.querySelector(selector);
    if (!node) {
      node = document.createElement('meta');
      head.appendChild(node);
    }

    Object.keys(attributes).forEach((key) => {
      if (attributes[key] !== undefined && attributes[key] !== null) {
        node.setAttribute(key, attributes[key]);
      }
    });
  }

  const path = normalizePath(window.location.pathname);
  const match = overrides.find((entry) => normalizePath(entry.path) === path);
  if (!match) return;

  const ogTitle = match.openGraphTitle || match.seoTitle || null;
  const ogDescription = match.openGraphDescription || match.seoDescription || null;

  if (match.seoTitle) {
    document.title = match.seoTitle;
    upsertMeta('meta[name="title"]', { name: 'title', content: match.seoTitle });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: ogTitle });
  }

  if (match.seoDescription) {
    upsertMeta('meta[name="description"]', { name: 'description', content: match.seoDescription });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: ogDescription });
  }

  if (ogTitle) {
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: ogTitle });
  }

  if (ogDescription) {
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: ogDescription });
  }

  document.documentElement.setAttribute('data-wf-metadata-override', match.path);
  window.__WF_METADATA_OVERRIDE__ = match;
})();`;
}
