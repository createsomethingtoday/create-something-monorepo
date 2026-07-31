import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const decks: Record<string, number> = {
  'abundance-system': 14,
  'beads-continuity': 14,
  'canon-design': 15,
  'claude-code-partner': 17,
  'cloudflare-edge': 18,
  'deployment-dwelling': 14,
  'developer-onboarding': 22,
  'heidegger-canon': 18,
  hub: 12,
  'user-onboarding': 15,
  workway: 17
};
const scriptHashes: Record<string, string> = {
  'abundance-system': '571a6eba131bff5b2db080d22509d0c31287f2e39bdee1061ea7e5ea099c496d',
  'beads-continuity': 'c33611981c924899c34993d4d1cc4ca45e4d45201f10fb5073efe31d68541669',
  'canon-design': '2ee80a9137ec4ab9af5fb2871368ced991d46af4473ec324efb1462b4218769a',
  'claude-code-partner': '670f4850d52e715c2a0eb434ff63f31f0ed1eae87c1635e1bfaa987a3b295b2e',
  'cloudflare-edge': 'b6f461f85bf008ebe9babc8fef5116a5b1345a60a6791714647ea158b7ee2601',
  'deployment-dwelling': '0c438ea1476cf28e7fa8d48d443e436e0f9f71d9f4c011df0d81a708429065fc',
  'developer-onboarding': '7a76493e2ea8c72faf5e88fbb88fbba93e5d944e853b7000ca906bba783f40ce',
  'heidegger-canon': '93796ae8bfe8a652a8746b1ed688af8d8ffdde12329a8c9f9ea0e48b30a1677b',
  hub: 'e9086b71514ff75052a9eb0da0bf74e4cdc3dc34ba8828235f7a113ce69c463f',
  'user-onboarding': '951c30b44502557945578346111d3cf1c368bcae90c0bc34e45caf45939f062a'
};

test('migrates the complete LTD presentation detail family as one editorial cohort', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'ltd-presentations');
  const expectedSources = [
    'packages/ltd/src/routes/presentations/[slug]/script/+page.svelte',
    ...Object.keys(decks).map(
      (slug) => `packages/ltd/src/routes/presentations/${slug}/+page.svelte`
    )
  ];

  assert.equal(group?.status, 'migrated');
  assert.equal(group?.contract?.archetype, 'editorial');
  assert.deepEqual(group?.sources, expectedSources);
});

test('preserves all 176 slides and every checked-in narration script byte for byte', () => {
  let slideTotal = 0;

  for (const [slug, expectedSlides] of Object.entries(decks)) {
    const page = read(`packages/ltd/src/routes/presentations/${slug}/+page.svelte`);
    const slideCount = (page.match(/<Slide\b/g) ?? []).length;
    slideTotal += slideCount;
    assert.equal(slideCount, expectedSlides, `${slug} slide count changed`);

    if (slug === 'workway') {
      assert.doesNotMatch(page, /scriptUrl=/);
    } else {
      assert.match(page, new RegExp(`scriptUrl="/presentations/${slug}/script"`));
    }
  }

  assert.equal(slideTotal, 176);

  for (const [slug, expectedHash] of Object.entries(scriptHashes)) {
    const script = read(`packages/ltd/src/routes/presentations/${slug}/SCRIPT.md`);
    assert.equal(sha256(script), expectedHash, `${slug} narration changed`);
  }
});

test('keeps the shared presentation meaningful without JavaScript and enhances it safely', () => {
  const presentation = read('packages/canon/src/lib/domains/ltd/Presentation.svelte');

  assert.match(presentation, /let isEnhanced = \$state\(false\)/);
  assert.match(presentation, /isEnhanced = true/);
  assert.match(presentation, /class:enhanced=\{isEnhanced\}/);
  assert.match(
    presentation,
    /\.presentation:not\(\.enhanced\)[^{]*:global\(\[data-slide\]\)[^{]*\{[^}]*display:\s*flex/s
  );
  assert.match(presentation, /\{#if isEnhanced\}[\s\S]*aria-label="Presentation controls"/);
  assert.doesNotMatch(presentation, /<svelte:window[^>]*onkeydown/);
  assert.doesNotMatch(presentation, /class="presentation"[\s\S]{0,300}tabindex="0"/);
  assert.match(presentation, /aria-keyshortcuts="ArrowLeft Home"/);
  assert.match(presentation, /aria-keyshortcuts="ArrowRight End"/);
  assert.match(presentation, /aria-keyshortcuts="F"/);
  assert.doesNotMatch(presentation, /case 'Enter'/);
  assert.doesNotMatch(presentation, /case ' '/);
  assert.doesNotMatch(presentation, /case 'Backspace'/);
});

test('keeps orientation, script access, progress, and controls in the presentation flow', () => {
  const presentation = read('packages/canon/src/lib/domains/ltd/Presentation.svelte');

  assert.match(presentation, /class="presentation-toolbar"/);
  assert.match(presentation, />All presentations</);
  assert.match(presentation, />Read script</);
  assert.match(presentation, /aria-valuenow=\{currentSlide \+ 1\}/);
  assert.doesNotMatch(presentation, /\.controls\s*\{[^}]*position:\s*fixed/s);
  assert.doesNotMatch(presentation, /\.progress-bar\s*\{[^}]*position:\s*fixed/s);
  assert.doesNotMatch(presentation, /\.hints\s*\{/);
  assert.match(presentation, /\.presentation\s*\{[^}]*overflow-x:\s*clip/s);

  const docs = read('packages/canon/README.md');
  assert.match(docs, /### LTD presentation contract/);
  assert.match(docs, /server-rendered\s+reading path/i);
});

test('turns the script route into one semantic reading path with progressive copy controls', () => {
  const scriptPage = read('packages/ltd/src/routes/presentations/[slug]/script/+page.svelte');

  assert.equal((scriptPage.match(/<main(?:\s|>)/g) ?? []).length, 0);
  assert.match(scriptPage, /let isEnhanced = \$state\(false\)/);
  assert.match(scriptPage, /\{#if isEnhanced\}[\s\S]*Copy Plain Text[\s\S]*Copy Markdown/);
  assert.match(scriptPage, /aria-live="polite"/);
  assert.match(scriptPage, /role="status"/);
  assert.match(scriptPage, /class="script-outline"/);
  assert.match(scriptPage, /\{#each sections as section/);
  assert.match(scriptPage, /<article class="script-content"/);
  assert.match(scriptPage, /<section id=\{section\.id\}/);
  assert.match(scriptPage, /<details class="raw-script"/);
  assert.match(scriptPage, /<pre>\{data\.script\}<\/pre>/);
  assert.equal((scriptPage.match(/data-performance-chapter=/g) ?? []).length, 3);
  assert.match(scriptPage, /\.script-viewer\s*\{[^}]*overflow-x:\s*clip/s);
});

test('preserves script lookup, presentation metadata, and explicit not-found behavior', () => {
  const server = read('packages/ltd/src/routes/presentations/[slug]/script/+page.server.ts');

  assert.match(server, /import\.meta\.glob\('\/src\/routes\/presentations\/\*\/SCRIPT\.md'/);
  assert.match(server, /throw error\(404/);

  for (const slug of Object.keys(scriptHashes)) {
    assert.match(server, new RegExp(`'${slug}'|\\b${slug}:`), `${slug} metadata is missing`);
  }

  assert.match(server, /\bworkway:\s*\{/);
});

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
