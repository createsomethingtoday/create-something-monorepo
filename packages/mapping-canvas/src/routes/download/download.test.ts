import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');
const canvasPage = readFileSync(new URL('../+page.svelte', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../../../static/sitemap.xml', import.meta.url), 'utf8');
const llms = readFileSync(new URL('../../../static/llms.txt', import.meta.url), 'utf8');

describe('Mac pilot landing', () => {
  it('keeps the web canvas primary and the native build individually delivered', () => {
    expect(page).toContain('Open Draw');
    expect(page).toContain('Request pilot build');
    expect(page).toContain('Developer ID signed, Apple notarized, Gatekeeper accepted.');
    expect(page).toContain('Apple Silicon');
    expect(page).toContain('macOS 13');
    expect(page).not.toContain('They are unsigned');
    expect(page).not.toContain('href=".dmg');
  });

  it('publishes the exact candidate evidence and canonical metadata', () => {
    expect(page).toContain('659ca02c3300f70f6bc549f4896df989debf9ff2');
    expect(page).toContain('25c4394b1ab71ab7e71ec28b0711f084bf6a5dace321cc212c9e30a57153e141');
    expect(page).toContain('0.1.1');
    expect(page).toContain('public hosting is pending');
    expect(page).toContain("'@type': 'SoftwareApplication'");
    expect(page).toContain('https://draw.createsomething.agency/download');
  });

  it('adds the route to crawler and answer-engine discovery', () => {
    expect(sitemap).toContain('<loc>https://draw.createsomething.agency/download</loc>');
    expect(llms).toContain('## Mac pilot');
    expect(llms).toContain('Developer ID signed');
  });

  it('opens the landing separately so the active canvas history stays mounted', () => {
    expect(canvasPage).toContain('href="/download" target="_blank" rel="noreferrer"');
  });

  it('uses actual synthetic workflow evidence with a clear caption', () => {
    expect(page).toContain('/images/draw/workflow-pilot.png');
    expect(page).toContain('alt="Synthetic request-to-handoff workflow in Draw, with formatted notes and connected steps"');
    expect(page).toContain('<figcaption>');
  });
});
