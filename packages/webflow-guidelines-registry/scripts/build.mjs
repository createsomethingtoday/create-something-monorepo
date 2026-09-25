#!/usr/bin/env node
/**
 * Build the single-file wrop page.
 *
 *   source/*.mdx + source/SOURCE.json  ──parse──▶  data island (JSON)
 *   src/template.html + src/styles.css + src/proposal-codec.js + src/app.js + scripts/mdx.mjs  ──inline──▶  dist/index.html
 *
 * The output is one self-contained HTML document (no build step at runtime,
 * CDN-free) that wrop can host. `dist/data.json` is written alongside for
 * inspection and for the export script.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePage } from './mdx.mjs';
import { mergeWorking } from './merge-working.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const sourceDir = join(root, 'source');
const distDir = join(root, 'dist');

export const APP_VERSION = '2026-09-23.1';
export const WROP_TOPIC = 'marketplace-guidelines-registry';

/** Page order and public URLs, mirroring fern/products/apps/versions/v1.yml. */
export const PAGE_ORDER = [
  { file: 'overview', title: 'Overview', docUrl: 'https://developers.webflow.com/apps/docs/marketplace/overview' },
  { file: 'marketplace-guidelines', title: 'Marketplace Guidelines', docUrl: 'https://developers.webflow.com/apps/docs/marketplace-guidelines' },
  { file: 'submitting-your-app', title: 'Submitting your App', docUrl: 'https://developers.webflow.com/apps/docs/marketplace/submitting-your-app' },
  { file: 'listing-your-app', title: 'Listing your App', docUrl: 'https://developers.webflow.com/apps/docs/marketplace/listing-your-app' },
  { file: 'private-apps', title: 'Private Apps', docUrl: 'https://developers.webflow.com/apps/docs/private-apps' },
  { file: 'marketing-your-app', title: 'Marketing your App', docUrl: 'https://developers.webflow.com/apps/docs/marketing-your-app' },
  { file: 'app-metrics', title: 'App Metrics', docUrl: 'https://developers.webflow.com/data/docs/app-metrics' },
];

export function buildData({ source = sourceDir, seedPath = join(root, 'data', 'registry-seed.json'), previous = null } = {}) {
  const sourceMeta = JSON.parse(readFileSync(join(source, 'SOURCE.json'), 'utf8'));
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  const files = readdirSync(source).filter((f) => f.endsWith('.mdx'));
  const pages = PAGE_ORDER.filter((p) => files.includes(`${p.file}.mdx`)).map((p) => {
    const text = readFileSync(join(source, `${p.file}.mdx`), 'utf8');
    const parsed = parsePage(text, p.file);
    return {
      slug: p.file,
      title: parsed.fields.title || p.title,
      docUrl: p.docUrl,
      sourcePath: `${sourceMeta.dir}/${p.file}.mdx`,
      frontmatter: parsed.frontmatter,
      sections: parsed.sections,
    };
  });
  const registry = {};
  for (const page of pages) {
    for (const s of page.sections) {
      registry[s.id] = { ...seed.defaults, ...(seed.sections[s.id] || {}) };
    }
  }
  // Carry forward anything a previous published version accumulated (working
  // copy edits, registry edits, changelog) when rebuilding from a newer source.
  const working = mergeWorking(previous, pages, registry);
  return {
    meta: {
      app: 'Marketplace Guidelines Registry',
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
      wropTopic: WROP_TOPIC,
      source: sourceMeta,
    },
    baseline: { pages, registry },
    working,
  };
}

export function renderHtml(data, { template, styles, app, mdx, codec = '' }) {
  const json = JSON.stringify(data).replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
  return template
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__MDX__*/', () => mdx.replace(/^export\s+/gm, ''))
    .replace('/*__APP__*/', () => `${codec}\n${app}`)
    .replace('__DATA__', () => json)
    .replace(/__APP_VERSION__/g, data.meta.appVersion);
}

export function build(opts = {}) {
  const data = buildData(opts);
  const html = renderHtml(data, {
    template: readFileSync(join(root, 'src', 'template.html'), 'utf8'),
    styles: readFileSync(join(root, 'src', 'styles.css'), 'utf8'),
    app: readFileSync(join(root, 'src', 'app.js'), 'utf8'),
    codec: readFileSync(join(root, 'src', 'publication-guard.js'), 'utf8') + '\n' + readFileSync(join(root, 'src', 'proposal-codec.js'), 'utf8'),
    mdx: readFileSync(join(here, 'mdx.mjs'), 'utf8'),
  });
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, 'index.html'), html);
  writeFileSync(join(distDir, 'data.json'), JSON.stringify(data, null, 2));
  return { html, data };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { html, data } = build();
  const sections = data.baseline.pages.reduce((n, p) => n + p.sections.length, 0);
  console.log(`built dist/index.html (${(html.length / 1024).toFixed(1)} KB) — ${data.baseline.pages.length} pages, ${sections} sections, source ${data.meta.source.sha.slice(0, 8)}`);
  if (html.length > 2 * 1024 * 1024) {
    console.error('ERROR: wrop limit is 2 MB');
    process.exit(1);
  }
}
