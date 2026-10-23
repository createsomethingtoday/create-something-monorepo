import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { isIoResearchSurface } from '../src/lib/config/researchSurface';

const experiments = new URL('../src/routes/experiments/', import.meta.url);
const concrete = readdirSync(experiments, { withFileTypes: true })
 .filter(entry => entry.isDirectory() && entry.name !== '[slug]' && existsSync(new URL(`${entry.name}/+page.svelte`, experiments)))
 .map(entry => `/experiments/${entry.name}`);

describe('public research shell', () => {
 it('includes every concrete experiment page as well as dynamic research', () => {
  expect(concrete).toHaveLength(17);
  for (const route of concrete) expect(isIoResearchSurface(route, route), route).toBe(true);
  expect(isIoResearchSurface('/experiments/meeting-capture', '/experiments/[slug]')).toBe(true);
 });
 it('keeps GPU brand accents on defined neutral tokens', () => {
  const source = readFileSync(new URL('../src/routes/experiments/living-arena-gpu/+page.svelte', import.meta.url), 'utf8');
  expect(source).not.toMatch(/var\(--color-accent(?:-rgb)?[,)\s]/);
  expect(source).toContain('aria-label="Agent count"');
  expect(source).toContain('aria-label="Simulation seed"');
 });
 it('does not classify endpoints, nested tools, auth or transactions as research pages', () => {
  for (const route of ['/api/experiments', '/experiments/living-arena-gpu/export', '/admin', '/login', '/auth/callback', '/checkout', '/account']) {
   expect(isIoResearchSurface(route, route), route).toBe(false);
  }
  expect(isIoResearchSurface('/experiments/unknown', null)).toBe(false);
 });
});
