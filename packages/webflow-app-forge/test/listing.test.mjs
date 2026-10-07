import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runListingKit, EXAMPLE_LISTING } from '../src/listing-kit.mjs';
import { summarize } from '../src/lib/report.mjs';
import { tmp, writeGoodListing, writePng } from './helpers.mjs';

const find = (findings, check) => findings.filter((f) => f.check === check);

test('a complete Designer Extension listing is ready', () => {
  const { findings } = runListingKit(writeGoodListing(tmp()));
  const s = summarize(findings);
  assert.equal(s.ready, true, JSON.stringify(findings.filter((f) => f.status !== 'pass'), null, 2));
  assert.equal(find(findings, 'listing:screenshots')[0].status, 'warn', 'three screenshots: passes, recommends four');
  for (const f of findings) assert.ok(f.requirements.length > 0, `${f.check} maps to no registry requirement`);
});

test('the shipped example listing has the same shape as the test fixture', () => {
  const required = ['appName', 'appCapabilities', 'shortDescription', 'longDescription', 'features', 'categories', 'paymentType', 'websiteUrl', 'documentationUrl', 'privacyPolicyUrl', 'termsUrl', 'supportEmail', 'demoVideoUrl', 'testingSiteUrl', 'icon', 'screenshots'];
  for (const k of required) assert.ok(k in EXAMPLE_LISTING, `example missing ${k}`);
});

test('limits: name, short, long, features, categories', () => {
  const path = writeGoodListing(tmp(), {
    appName: 'A very long application name over thirty',
    shortDescription: 'x'.repeat(101),
    longDescription: 'Too short.',
    features: ['1', '2', '3', '4', '5', '6'],
    categories: ['Design', 'Utilities', 'Nonsense'],
  });
  const { findings } = runListingKit(path);
  for (const check of ['listing:name', 'listing:short', 'listing:long', 'listing:features', 'listing:categories']) {
    assert.equal(find(findings, check)[0].status, 'fail', check);
  }
  assert.match(find(findings, 'listing:categories')[0].evidence.join(' '), /Nonsense/);
});

test('Webflow mark in the name fails; Data Client capability fails', () => {
  const { findings } = runListingKit(writeGoodListing(tmp(), { appName: 'Webflow Booster', appCapabilities: 'Hybrid' }));
  assert.equal(find(findings, 'listing:name')[0].status, 'fail');
  assert.equal(find(findings, 'listing:capability')[0].status, 'fail');
});

test('non-production and non-https URLs fail; shared legal page is only suggested', () => {
  const { findings } = runListingKit(writeGoodListing(tmp(), {
    websiteUrl: 'http://sectionnamer.example.com',
    documentationUrl: 'https://sectionnamer.vercel.app/docs',
    privacyPolicyUrl: 'https://sectionnamer.example.com/legal',
    termsUrl: 'https://sectionnamer.example.com/legal/',
  }));
  assert.equal(find(findings, 'listing:website')[0].status, 'fail');
  assert.equal(find(findings, 'listing:docs')[0].status, 'fail');
  const legal = find(findings, 'listing:legal-urls');
  assert.equal(legal.find((f) => f.severity === 'required').status, 'pass');
  assert.equal(legal.find((f) => f.severity === 'suggested').status, 'fail');
});

test('support email uses the form rule: placeholders and reserved domains fail', () => {
  for (const supportEmail of ['<redacted>', 'N/A', 'support@example.com']) {
    const f = find(runListingKit(writeGoodListing(tmp(), { supportEmail })).findings, 'listing:support')[0];
    assert.equal(f.status, 'fail', supportEmail);
  }
  assert.equal(find(runListingKit(writeGoodListing(tmp())).findings, 'listing:support')[0].status, 'pass');
});

test('icon spec: wrong size, wrong type, too large, missing alt', () => {
  const dir = tmp();
  const path = writeGoodListing(dir, { icon: { path: './assets/icon.png', altText: '' } });
  writeFileSync(join(dir, 'assets', 'icon.png'), writePng(512, 512));
  const f = find(runListingKit(path).findings, 'listing:icon')[0];
  assert.equal(f.status, 'fail');
  assert.ok(f.evidence.some((e) => /900/.test(e)));
  assert.ok(f.evidence.some((e) => /alt text/.test(e)));
});

test('screenshots: count and dimensions', () => {
  const dir = tmp();
  const path = writeGoodListing(dir, { screenshots: [{ path: './assets/screenshot-1.png', altText: 'Panel' }] });
  writeFileSync(join(dir, 'assets', 'screenshot-1.png'), writePng(1200, 800));
  const f = find(runListingKit(path).findings, 'listing:screenshots')[0];
  assert.equal(f.status, 'fail');
  assert.ok(f.evidence.some((e) => /1 screenshots/.test(e)));
  assert.ok(f.evidence.some((e) => /1200x800/.test(e)));
});

test('paid app with no pricing notes fails pricing; testing site must be webflow.io; demo video required', () => {
  const { findings } = runListingKit(writeGoodListing(tmp(), {
    paymentType: ['Paid'],
    developerNotes: '',
    pricingNotes: '',
    testingSiteUrl: 'https://sectionnamer.example.com',
    demoVideoUrl: '',
  }));
  assert.equal(find(findings, 'listing:pricing')[0].status, 'fail');
  assert.equal(find(findings, 'listing:testing-site')[0].status, 'fail');
  assert.equal(find(findings, 'listing:demo-video')[0].status, 'fail');
});

test('form content rules are applied (beta language, long-description link)', () => {
  const { findings } = runListingKit(writeGoodListing(tmp(), {
    longDescription: 'This beta app is still in early access. Read more at https://sectionnamer.example.com/more and see how it transforms your workflow with the most powerful section tooling available anywhere today.',
  }));
  const copy = find(findings, 'listing:copy').find((f) => f.severity === 'required');
  assert.equal(copy.status, 'fail');
  assert.ok(copy.evidence.some((e) => /beta-language/.test(e)));
  assert.ok(copy.evidence.some((e) => /long-description-links/.test(e)));
});
