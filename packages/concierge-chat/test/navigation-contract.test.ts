import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layoutSource = readFileSync('src/routes/+layout.svelte', 'utf8');

test('public navigation gives the applicant action priority over staff utility access', () => {
  assert.match(layoutSource, /class="webflow-primary-action"/);
  assert.match(layoutSource, />Start application\s*<span aria-hidden="true">↗<\/span><\/a>/);
  assert.match(layoutSource, /class="webflow-staff-link"[\s\S]*?>\s*<span>Staff access<\/span>/);
  assert.doesNotMatch(layoutSource, /\{ href: '\/apply', label: 'Start' \}/);
});

test('mobile navigation exposes explicit open and close state with Escape recovery', () => {
  assert.match(
    layoutSource,
    /aria-label=\{publicNavOpen \? 'Close navigation' : 'Open navigation'\}/
  );
  assert.match(layoutSource, /event\.key === 'Escape' && publicNavOpen/);
  assert.match(layoutSource, /publicNavToggle\?\.focus\(\)/);
  assert.match(layoutSource, /class:open=\{publicNavOpen\}/);
});

test('public navigation collapses before the former two-row tablet state', () => {
  assert.match(layoutSource, /@media \(max-width: 1080px\)/);
  assert.doesNotMatch(layoutSource, /@media \(max-width: 860px\)/);
  assert.match(
    layoutSource,
    /@media \(max-width: 1080px\) \{[\s\S]*?\.webflow-nav-links \{[\s\S]*?align-items: stretch;[\s\S]*?justify-content: stretch;/
  );
});

test('public navigation links no longer inherit the internal app pill treatment', () => {
  assert.match(layoutSource, /\.app-nav nav a \{/);
  assert.doesNotMatch(layoutSource, /\n  nav a \{/);
  assert.match(layoutSource, /\.webflow-nav-links a \{[\s\S]*?border: 0;/);
});

test('public navigation prioritizes the two audiences and keeps specialised routes contextual', () => {
  const publicNavBlock = layoutSource.match(
    /: isPublicIntakeRoute \|\| !showInternalNavigation\s+\? \[([\s\S]*?)\]\s+: \[/
  )?.[1];

  assert.ok(publicNavBlock, 'expected a dedicated public navigation block');
  assert.match(publicNavBlock, /\{ href: '\/nurses', label: 'For nurses' \}/);
  assert.match(publicNavBlock, /\{ href: '\/facilities', label: 'For facilities' \}/);
  assert.match(publicNavBlock, /\{ href: '\/jobs', label: 'Open roles' \}/);
  assert.match(publicNavBlock, /\{ href: '\/agents', label: 'How it works' \}/);
  assert.doesNotMatch(publicNavBlock, /\{ href: '\/voice', label: 'Voice' \}/);
  assert.doesNotMatch(publicNavBlock, /\{ href: '\/client-service', label: 'NPG service' \}/);
});
