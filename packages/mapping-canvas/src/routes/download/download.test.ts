import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');
const canvasPage = readFileSync(new URL('../+page.svelte', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../../../static/sitemap.xml', import.meta.url), 'utf8');
const llms = readFileSync(new URL('../../../static/llms.txt', import.meta.url), 'utf8');

describe('Mac preview landing', () => {
  it('keeps the web canvas primary and the native build individually delivered', () => {
    expect(page).toContain('Open Draw');
    expect(page).toContain('Request Mac preview');
    expect(page).toContain('unsigned, not notarized');
    expect(page).not.toContain('href=".dmg');
  });

  it('publishes the exact candidate evidence and canonical metadata', () => {
    expect(page).toContain('7c74dc1485377e316efa7173796dda883cb21eee');
    expect(page).toContain('0c82b266fa7df6d7078bdc93d7ff2f02186da4168e7b3567f97a376f5843f0bd');
    expect(page).toContain('33711866576');
    expect(page).toContain("'@type': 'SoftwareApplication'");
    expect(page).toContain('https://draw.createsomething.agency/download');
  });

  it('adds the route to crawler and answer-engine discovery', () => {
    expect(sitemap).toContain('<loc>https://draw.createsomething.agency/download</loc>');
    expect(llms).toContain('## Mac preview');
    expect(llms).toContain('Developer ID signing');
  });

  it('opens the landing separately so the active canvas history stays mounted', () => {
    expect(canvasPage).toContain('href="/download" target="_blank" rel="noreferrer"');
  });
});
