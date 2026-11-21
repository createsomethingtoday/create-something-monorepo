import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isWebflowDocument } from '../src/lib/config/webflowDocuments';
const read = (path: string) => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
describe('sitewide IO journal shell', () => {
  it('covers public, auth and administrative layouts without route-dependent dark shell selection', () => {
    const layout = read('routes/+layout.svelte');
    expect(layout).toContain("$lib/styles/io-journal.css");
    expect(layout).toContain('io-journal-admin');
    expect(layout).toContain('property-performance io-journal');
    expect(layout).toContain('data-theme="light"');
    expect(layout).not.toContain("data-theme={isResearchSurface ? 'dark'");
  });
  it('uses native Webflow-owned font paths and leaves canvas and SVG paints untouched', () => {
    const css = read('lib/styles/io-journal.css');
    expect(css).toContain("url('/fonts/switzer.woff2')");
    expect(css).toContain("url('/fonts/stix-two-text.ttf')");
    expect(css).not.toMatch(/(?:svg|canvas|path|circle)\s*\{/);
    expect(css).toContain('color-scheme: light');
  });
  it('reloads only exact migrated documents through their public edge owner', () => {
    for (const path of ['/', '/papers', '/papers/', '/plugins/canon', '/papers/selective-context'])
      expect(isWebflowDocument(path), path).toBe(true);
    for (const path of ['/newsletters', '/login', '/account', '/admin', '/api/newsletter', '/papers/unknown', '/papers/teaching-modalities-experiment', '/papers%2fselective-context'])
      expect(isWebflowDocument(path), path).toBe(false);
  });
});

describe('native journal artwork ownership', () => {
  it('uses original field-note art for the archive and reference art for connected tools', async () => {
    const { journalArtwork } = await import('../src/lib/config/journalArtwork');
    expect(journalArtwork('review-nook', 'field-note').src).toBe('/images/field-note-1280.webp');
    expect(journalArtwork('modular-port').src).toBe('/images/connected-tools-1280.webp');
    expect(journalArtwork('bounded-sandbox').src).toBe('/images/research-trace-1536.webp');
    expect(read('routes/newsletters/+page.svelte')).toContain('illustration="field-note"');
  });
});
