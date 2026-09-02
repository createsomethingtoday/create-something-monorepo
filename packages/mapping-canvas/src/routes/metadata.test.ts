import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../../static/manifest.webmanifest', import.meta.url), 'utf8'));
const robots = readFileSync(new URL('../../static/robots.txt', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../../static/sitemap.xml', import.meta.url), 'utf8');
const llms = readFileSync(new URL('../../static/llms.txt', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../../static/service-worker.js', import.meta.url), 'utf8');
const serverHooks = readFileSync(new URL('../hooks.server.ts', import.meta.url), 'utf8');

describe('public identity and discovery', () => {
  it('uses the governed CREATE SOMETHING logo in the product header', () => {
    expect(page).toContain('src="/brand/create-something-agency-white.svg"');
    expect(page).toContain('alt="CREATE SOMETHING .agency"');
  });

  it('publishes canonical, social, and application metadata for Draw', () => {
    expect(page).toContain('https://draw.createsomething.agency/');
    expect(page).toContain('property="og:image"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain("'@type': 'WebApplication'");
    expect(page).toContain("'@type': 'Organization'");
    expect(page).toContain('Local-first');
  });

  it('keeps crawler and answer-engine artifacts on the canonical origin', () => {
    expect(manifest.name).toBe('CREATE SOMETHING Draw');
    expect(manifest.description).toContain('local-first');
    expect(robots).toContain('Sitemap: https://draw.createsomething.agency/sitemap.xml');
    expect(sitemap).toContain('<loc>https://draw.createsomething.agency/</loc>');
    expect(llms).toContain('# CREATE SOMETHING Draw');
    expect(llms).toContain('saved only on the current device');
    expect(serviceWorker).toContain("'/brand/create-something-agency-white.svg'");
  });

  it('sets the production browser security contract on dynamic Pages responses', () => {
    expect(serverHooks).toContain('Content-Security-Policy');
    expect(serverHooks).toContain("frame-ancestors 'none'");
    expect(serverHooks).toContain('Strict-Transport-Security');
    expect(serverHooks).toContain('Permissions-Policy');
    expect(serverHooks).toContain('X-Content-Type-Options');
    expect(serverHooks).toContain("dev ? ' ws: wss:' : ''");
  });
});
