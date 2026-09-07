import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const playbookField = read('../src/lib/components/PlaybookField.svelte');
const campaignOpening = read(
  '../../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'
);

const macroRouteContracts = [
  {
    path: '../src/routes/services/+page.svelte',
    mediaKey: 'services',
    title: 'Map the operation. Install the playbook.'
  },
  {
    path: '../src/routes/products/+page.svelte',
    mediaKey: 'products',
    title: 'One playbook. Three operating paths.'
  },
  {
    path: '../src/routes/field-reports/+page.svelte',
    mediaKey: 'fieldReports',
    title: 'Review the film. Improve the playbook.'
  }
] as const;

const fieldRouteContracts = [
  {
    path: '../src/routes/control/+page.svelte',
    variant: 'control',
    title: 'Run offense and defense from one playbook.'
  }
] as const;

test('Playbook field publishes one stable, accessible operating legend', () => {
  assert.match(playbookField, /export type PlaybookFieldVariant/);
  assert.match(playbookField, /role="img"/);
  assert.match(playbookField, /aria-label=\{play\.description\}/);
  assert.match(playbookField, /data-playbook-field=\{variant\}/);
  assert.match(playbookField, /O = owner/);
  assert.match(playbookField, /X = opposition/);
  assert.match(playbookField, /Ambiguity/);
  assert.match(playbookField, /Untrusted automation/);
  assert.match(playbookField, /AI out of reach/);
  assert.match(playbookField, /Route = delegated work/);
  assert.match(playbookField, /Gate = human decision/);
  assert.match(playbookField, /Receipt = proof/);
  assert.match(playbookField, /playbook-field__constraint-frame/);
  assert.match(playbookField, /playbook-field__gate-post/);
  assert.match(playbookField, /playbook-field__gate-decision/);
  assert.match(playbookField, />Gate<\/text>/);
  assert.match(playbookField, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Playbook field can become a self-contained study without changing its operating legend', () => {
  assert.match(playbookField, /embedded\?: boolean/);
  assert.match(playbookField, /embedded = false/);
  assert.match(playbookField, /class:playbook-field--embedded=\{embedded\}/);
  assert.match(playbookField, /\.playbook-field--embedded/);
});

test('Playbook proof is a readable receipt ticket, not a generic document glyph', () => {
  assert.match(playbookField, /state: string;/);
  assert.match(playbookField, /record: string;/);
  assert.match(playbookField, /evidence: string;/);
  assert.match(playbookField, /data-proof-ticket/);
  assert.match(playbookField, /RECEIPT/);
  assert.match(playbookField, /Evidence:/);

  for (const state of ['Attached', 'Recorded', 'Owned', 'Approved', 'Recoverable', 'Verified']) {
    assert.match(playbookField, new RegExp(`state: '${state}'`));
  }
});

test('campaign opening can be owned by a semantic artifact without fallback media', () => {
  assert.match(campaignOpening, /media\?: PerformanceCampaignMedia/);
  assert.match(campaignOpening, /\{#if media\}[\s\S]*performance-campaign-opening__media/);
  assert.match(campaignOpening, /data-artifact-owns-media=\{artifactOwnsMedia/);
  assert.match(campaignOpening, /artifactMobilePlacement\?: 'overlay' \| 'flow'/);
  assert.match(
    campaignOpening,
    /data-artifact-mobile-placement=\{artifact \? artifactMobilePlacement : undefined\}/
  );
  assert.match(campaignOpening, /data-artifact-mobile-placement='flow'[\s\S]*?display: contents/);
  assert.match(
    campaignOpening,
    /performance-campaign-opening__actions :global\(\.btn:focus-visible\)[\s\S]*?outline: 3px solid/
  );
  assert.match(
    campaignOpening,
    /performance-campaign-opening__artifact[\s\S]*?pointer-events: none/
  );
});

test('the commercial hero cohort uses responsive Playbook macro studies and no Paper fallback', () => {
  for (const contract of macroRouteContracts) {
    const source = read(contract.path);

    assert.match(source, /import \{ playbookHeroMedia \} from '\$lib\/data\/playbookHeroMedia'/);
    assert.match(
      source,
      new RegExp(`title="${contract.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`)
    );
    assert.match(source, new RegExp(`media=\\{playbookHeroMedia\\.${contract.mediaKey}\\}`));
    assert.match(source, /mediaMobilePlacement="background"/);
    assert.doesNotMatch(source, /from '\$lib\/data\/performanceMedia'/);
    assert.doesNotMatch(source, /mode="paper"/);
  }
});

test('Control retains a readable Playbook field where the field itself is the proof', () => {
  for (const contract of fieldRouteContracts) {
    const source = read(contract.path);

    assert.match(source, /import PlaybookField from '\$lib\/components\/PlaybookField\.svelte'/);
    assert.match(
      source,
      new RegExp(`title="${contract.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`)
    );
    assert.match(source, new RegExp(`<PlaybookField variant="${contract.variant}"`));
    assert.match(source, /artifactOwnsMedia/);
    assert.match(source, /artifactMobilePlacement="flow"/);
    assert.doesNotMatch(source, /from '\$lib\/data\/performanceMedia'/);
    assert.doesNotMatch(source, /mode="paper"/);
  }

  assert.doesNotMatch(playbookField, /bottom: 7rem/);
  assert.match(playbookField, /position: relative/);
});

test('Map uses the responsive overhead study while the editable canvas remains the proof', () => {
  const map = read('../src/routes/map/+page.svelte');

  assert.match(map, /title="See the whole operation before AI runs the play\."/);
  assert.match(map, /playbookMapSectionMedia/);
  assert.match(map, /src=\{playbookMapSectionMedia\.src\}/);
  assert.match(map, /srcset=\{playbookMapSectionMedia\.mobileSrc\}/);
  assert.match(map, /data-campaign-media="map-overhead-study"/);
  assert.match(map, /<PublicAtlasCanvas/);
  assert.doesNotMatch(map, /<PlaybookField variant="map"/);
  assert.doesNotMatch(map, /from '\$lib\/data\/performanceMedia'/);
  assert.doesNotMatch(map, /mode="paper"/);
});

test('the Home hero and Map narrative use responsive campaign studies while preserving operating context', () => {
  const home = read('../src/routes/+page.svelte');

  assert.match(home, /media=\{playbookHomeHeroMedia\}/);
  assert.match(home, /mediaMobilePlacement="background"/);
  assert.match(home, /srcset=\{playbookHeroMedia\.map\.mobileSrc\}/);
  assert.match(home, /src=\{playbookHeroMedia\.map\.src\}/);
  assert.match(home, /aria-label="Shared Playbook: Map, Build, Control"/);
  assert.match(home, /boundary-study__outcomes/);
  assert.doesNotMatch(home, /<PlaybookField/);
  assert.doesNotMatch(home, /artifactOwnsMedia/);
});

test('About turns the earned basketball origin into an operator-facing court vision story', () => {
  const about = read('../src/routes/about/+page.svelte');
  const playbookField = read('../src/lib/components/PlaybookField.svelte');

  assert.match(about, /Division III basketball/);
  assert.match(about, /shared picture/);
  assert.match(about, /The operator should see the whole court\./);
  assert.match(about, /<PlaybookField variant="about"/);
  assert.match(about, /Read the floor/);
  assert.match(about, /Call the play/);
  assert.match(about, /Review the film/);
  assert.match(playbookField, /about:\s*\{/);
  assert.match(playbookField, /Shared play/);
  assert.doesNotMatch(about, /basketball coaching|athletic performance services/i);
});

test('brand policy makes Playbook primary and bounds Paper as historical material', () => {
  const agencyReadme = read('../README.md');
  const designLanguage = read('../../../docs/CREATE_SOMETHING_PERFORMANCE_LAB_DESIGN_LANGUAGE.md');
  const visualGrammar = read('../../../docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md');

  for (const source of [agencyReadme, designLanguage, visualGrammar]) {
    assert.match(source, /Playbook/);
    assert.match(source, /offense/i);
    assert.match(source, /defense/i);
  }

  assert.match(visualGrammar, /O = owner/);
  assert.match(visualGrammar, /X = opposition/);
  assert.match(visualGrammar, /Paper remains available for editorial and historical material/);
  assert.doesNotMatch(designLanguage, /The primary material is working paper/);
});

test('the owned Playbook spec makes runbooks executable units inside an operator-owned system', () => {
  const spec = read('../../../docs/CREATE_SOMETHING_PLAYBOOK_SPEC.md');

  assert.match(spec, /Playbook.*complete operating system/s);
  assert.match(spec, /Play.*outcome-bearing workflow/s);
  assert.match(spec, /Runbook.*executable procedure/s);
  assert.match(spec, /Database/);
  assert.match(spec, /Automation/);
  assert.match(spec, /Judgment/);
  assert.match(spec, /Offense.*creates advantage/s);
  assert.match(spec, /Defense.*protects the operation/s);
  assert.match(spec, /ambiguity.*AI out of reach.*untrusted automation/s);
  assert.match(spec, /Decision gate/);
  assert.match(spec, /Stop condition/);
  assert.match(spec, /Recovery/);
  assert.match(spec, /Receipt/);
  assert.match(spec, /client.*inspect, operate, stop,\s*recover, and revise/s);
  assert.match(spec, /does not implement,\s*extend, or claim affiliation with that project/s);
});
