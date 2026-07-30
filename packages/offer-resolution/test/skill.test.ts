import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const skillRoot = resolve(repoRoot, 'packages/dotfiles/codex/skills/offer-resolution');

async function read(relativePath: string): Promise<string> {
  return readFile(resolve(skillRoot, relativePath), 'utf8');
}

function routesToOfferResolution(prompt: string): boolean {
  const value = prompt.toLowerCase();
  const excluded =
    /(monitor|continuously|buy|purchase|complete checkout|scrape every|historical sales lift|create a coupon|product description)/.test(
      value
    );
  const offer = /(coupon|promo|discount|offer|code|liketoknowit|ltk)/.test(value);
  const resolveIntent = /(find|search|check|verify|compare|best|work|reliable|determine)/.test(
    value
  );
  return !excluded && offer && resolveIntent;
}

test('skill metadata routes offer-finding requests and names the exclusions', async () => {
  const skill = await read('SKILL.md');
  assert.doesNotMatch(skill, /TODO/);
  assert.match(skill, /description: .*coupon.*promo.*public LTK/i);
  assert.match(skill, /merchant.*budget.*ZIP.*deadline/i);
  assert.match(skill, /Do not.*purchase/i);
  assert.match(skill, /historical lift/i);
});

test('skill uses the package CLI and deterministic result as the authority', async () => {
  const skill = await read('SKILL.md');
  assert.match(skill, /@create-something\/offer-resolution/);
  assert.match(skill, /resolve_offer_evidence/);
  assert.match(skill, /Never.*score/i);
  assert.match(skill, /references\/source-registry\.md/);
});

test('source registry covers all initial locations and their evidence role', async () => {
  const registry = await read('references/source-registry.md');
  for (const source of [
    'Official retailer',
    'Retailer checkout',
    'Public LTK',
    'Creator-owned',
    'Affiliate feed',
    'User-authorized',
    'Search index',
    'Deal aggregator'
  ]) {
    assert.match(registry, new RegExp(source, 'i'));
  }
  assert.match(registry, /No private LTK API/i);
  assert.match(registry, /search.*lead/i);
});

test('UI metadata invokes the skill by its exact name', async () => {
  const metadata = await read('agents/openai.yaml');
  assert.match(metadata, /\$offer-resolution/);
});

test('routing evals include positive and excluded scenarios', async () => {
  const positive = JSON.parse(
    await readFile(resolve(packageRoot, 'evals/trigger-positive.json'), 'utf8')
  ) as string[];
  const negative = JSON.parse(
    await readFile(resolve(packageRoot, 'evals/trigger-negative.json'), 'utf8')
  ) as string[];

  assert.ok(positive.length >= 8);
  assert.ok(negative.length >= 6);
  assert.deepEqual(
    positive.filter((prompt) => !routesToOfferResolution(prompt)),
    []
  );
  assert.deepEqual(
    negative.filter((prompt) => routesToOfferResolution(prompt)),
    []
  );
});
