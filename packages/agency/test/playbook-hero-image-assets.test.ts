import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  playbookHeroMedia,
  playbookHomeHeroMedia,
  type PlaybookHeroRoute
} from '../src/lib/data/playbookHeroMedia';

const agencyRoot = fileURLToPath(new URL('..', import.meta.url));

const expectedHashes: Record<PlaybookHeroRoute, { desktop: string; mobile: string }> = {
  services: {
    desktop: 'e3ff001c6cdcbc52455160e89c74ca5945068915a0318276d46b1c5c5e4f6837',
    mobile: '4fecf87a3428e79a044bedc2c98a493327af715c39bf00d4498082a5a08a038d'
  },
  practice: {
    desktop: 'e2abc1c65a830fcd2eff011043a8725b322ae3b0c7678b1b9ec8915adff7dbac',
    mobile: 'ff93fbc94460070e1511282fd631a1d34297e712497f2c814f3a5099e682b1eb'
  },
  stack: {
    desktop: '97b5820193ca6678f6665b18e76e7d2dcf796960177b434750a5a7f117e6b5ee',
    mobile: 'bddf4efaca6ad9c11e9fab3cd33908de1d85f20e81443e4d39fc2c4b183e7649'
  },
  products: {
    desktop: '9b07f2b0345e32609f20cec31396d25a84e0dd4d99ffd5fc09ad346deb554def',
    mobile: 'de20df79983f968da95aa0dff316f4a4d2c50cd0ff5c07d81ea5e0030b36fb5c'
  },
  fieldReports: {
    desktop: '2847f7f312b746e4bf35f73f885367a41f18a820b980f7f177f762cd623c813a',
    mobile: '99857a564fa772592de5252e20747ad6ee1b7bb55c7ac6217ae5c0ac7b452105'
  },
  workflows: {
    desktop: '54784b3785abf52cb085d58a11bc51c61d78b0c70941835a13e4889ba1c1339b',
    mobile: '3f7036312354d78ddaf8b0c839a7b0f29688d13b08075e4faf18b1fc3a0fc0b1'
  },
  map: {
    desktop: '0b803ad1a5b30a2392bc3ceae3cddc2011065b9e11d32ad4a3d727f44e1810bb',
    mobile: '46caca75a1b4fd16053436990f466d2e8e88efd9cc5419baeb561e185deb2b56'
  },
  templateReview: {
    desktop: 'd6c9aaaab394231f5f263d71f4f4163003d1b3b46eeb23dc89b90cfd85323e27',
    mobile: 'ffd9e469ddb49138f9d40d09dbb9f827eb66d3ab5eb530270ea725dab9483d97'
  },
  agentReadiness: {
    desktop: 'a9132c5bfce203fd9707477ef2a74ad593de83f3f68223cb14b9c6088033cbde',
    mobile: '7c5081428ace7394f01bd0f7b120ab027f4695c183a621aea78e2e52c9980cf6'
  }
};

function publicAsset(pathname: string) {
  return readFileSync(`${agencyRoot}/static${pathname}`);
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

test('Playbook macro heroes keep distinct desktop and mobile source assets', () => {
  for (const [route, media] of Object.entries(playbookHeroMedia) as [
    PlaybookHeroRoute,
    (typeof playbookHeroMedia)[PlaybookHeroRoute]
  ][]) {
    assert.ok(media.mobileSrc, `${route} is missing its authored mobile companion`);
    assert.notEqual(media.src, media.mobileSrc, `${route} must not reuse a desktop crop on mobile`);
    assert.match(media.alt, /AI agent/i, `${route} alt text should retain the agent focus`);
    assert.equal(media.width, 1536);
    assert.equal(media.height, 1024);

    const desktop = publicAsset(media.src);
    const mobile = publicAsset(media.mobileSrc);

    assert.ok(desktop.byteLength > 50_000, `${route} desktop export looks truncated`);
    assert.ok(mobile.byteLength > 50_000, `${route} mobile export looks truncated`);
    assert.equal(sha256(desktop), expectedHashes[route].desktop);
    assert.equal(sha256(mobile), expectedHashes[route].mobile);
  }
});

test('the Home court candidate keeps its authored desktop and mobile studies distinct', () => {
  assert.equal(playbookHomeHeroMedia.src, '/images/performance-lab/playbook-home-agent-macro.webp');
  assert.equal(
    playbookHomeHeroMedia.mobileSrc,
    '/images/performance-lab/playbook-home-agent-macro-mobile.webp'
  );
  assert.match(playbookHomeHeroMedia.alt, /AI-agent/i);
  assert.equal(playbookHomeHeroMedia.width, 1536);
  assert.equal(playbookHomeHeroMedia.height, 1024);

  const desktop = publicAsset(playbookHomeHeroMedia.src);
  const mobile = publicAsset(playbookHomeHeroMedia.mobileSrc!);

  assert.ok(desktop.byteLength > 50_000, 'Home desktop export looks truncated');
  assert.ok(mobile.byteLength > 50_000, 'Home mobile export looks truncated');
  assert.equal(sha256(desktop), 'ea7a153bf4dcb9a37fb689d80953e0afbc768bc412de09033d008668f9d08d08');
  assert.equal(sha256(mobile), '814fca6eed996d6133dc1521f75cd9c1f5b216413932eb55c2891cdbf8cc3f97');
});

test('the Ground hero keeps its verification instrument and provenance intact', () => {
  const route = readFileSync(`${agencyRoot}/src/routes/products/ground/+page.svelte`, 'utf8');
  const metadata = readFileSync(
    `${agencyRoot}/content/assets/brand/agency-ground-verification-instrument.v20260825/metadata.md`,
    'utf8'
  );
  const prompts = readFileSync(
    `${agencyRoot}/content/assets/brand/agency-ground-verification-instrument.v20260825/source/prompts.md`,
    'utf8'
  );
  const desktop = publicAsset('/images/performance-lab/ground-verification-instrument.webp');
  const mobile = publicAsset('/images/performance-lab/ground-verification-instrument-mobile.webp');

  assert.match(route, /ground-verification-instrument\.webp/);
  assert.match(route, /ground-verification-instrument-mobile\.webp/);
  assert.doesNotMatch(route, /pressure-boundary-natural/);
  assert.match(metadata, /compare code inputs, stop the unverified claim/i);
  assert.match(metadata, /No third-party brand/);
  assert.match(prompts, /Desktop crop correction v2/);
  assert.match(prompts, /Mobile companion v1/);
  assert.ok(desktop.byteLength > 50_000, 'Ground desktop export looks truncated');
  assert.ok(mobile.byteLength > 50_000, 'Ground mobile export looks truncated');
  assert.equal(sha256(desktop), '9ad234d752f7d1e966e10951abdc17698e9deb7780e5e9cdafa02762e8fc85fb');
  assert.equal(sha256(mobile), '82f6fa352c9d7a935b141f2576297d4a355206f3e35ed5334950762e83271197');
});
