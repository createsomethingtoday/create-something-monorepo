import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const ioRoot = join(import.meta.dirname, '..');
const paperRoutesRoot = join(ioRoot, 'src/routes/papers');
const guideCatalogPath = join(ioRoot, 'src/lib/papers/reading-guides.ts');
const guideComponentPath = join(ioRoot, 'src/lib/components/papers/PaperReadingGuide.svelte');
const dynamicPagePath = join(paperRoutesRoot, '[slug]/+page.svelte');

const staticSlugs = readdirSync(paperRoutesRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && entry.name !== '[slug]')
	.filter((entry) => existsSync(join(paperRoutesRoot, entry.name, '+page.svelte')))
	.map((entry) => entry.name)
	.sort();

const fileBasedSource = readFileSync(join(ioRoot, 'src/lib/config/fileBasedPapers.ts'), 'utf8');
const dynamicSlugs = [...fileBasedSource.matchAll(/\n\s*slug:\s*'([^']+)'/g)]
	.map((match) => match[1])
	.sort();
const publicSlugs = [...new Set([...staticSlugs, ...dynamicSlugs])].sort();

function read(path: string): string {
	return readFileSync(path, 'utf8');
}

test('preserves the complete paper implementation and dynamic-record inventory', () => {
	assert.equal(staticSlugs.length, 40, 'expected all 40 static paper implementations');
	assert.equal(dynamicSlugs.length, 12, 'expected all 12 file-backed paper records');
	assert.equal(1 + staticSlugs.length, 41, 'expected the dynamic implementation plus 40 static implementations');
	assert.equal(publicSlugs.length, 50, 'expected 50 unique public paper destinations');
	assert.match(read(dynamicPagePath), /data\.paper/);
});

test('classifies editorial papers and the architectural tool truthfully', () => {
	const editorial = performancePageRegistry.find((group) => group.id === 'io-papers');
	const tool = performancePageRegistry.find((group) => group.id === 'io-paper-tool');

	assert.ok(editorial, 'the editorial paper cohort must remain registered');
	assert.equal(editorial.status, 'migrated');
	assert.equal(editorial.contract.archetype, 'editorial');
	assert.equal(editorial.sources.length, 40);
	assert.ok(!editorial.sources.some((source) => source.includes('papers/threshold-dwelling')));

	assert.ok(tool, 'threshold-dwelling needs a separate tool cohort');
	assert.equal(tool.status, 'migrated');
	assert.equal(tool.contract.archetype, 'tool');
	assert.equal(tool.sources.length, 1);
	assert.match(tool.sources[0], /papers\/threshold-dwelling\/\+page\.svelte$/);
});

test('gives every public destination a concrete reader question and thesis', async () => {
	assert.ok(existsSync(guideCatalogPath), 'the route-owned paper reading-guide catalog is missing');
	if (!existsSync(guideCatalogPath)) return;

	const module = (await import(`${guideCatalogPath}?t=${Date.now()}`)) as {
		paperReadingGuides: Record<
			string,
			{
				question: string;
				thesis: string;
				evidence: string;
				limit: string;
				continueLabel: string;
				continueHref: string;
			}
		>;
	};

	assert.deepEqual(Object.keys(module.paperReadingGuides).sort(), publicSlugs);
	for (const [slug, guide] of Object.entries(module.paperReadingGuides)) {
		assert.match(guide.question, /\?$/, `${slug} needs a direct reader question`);
		assert.ok(guide.thesis.split(/\s+/).length >= 6, `${slug} needs a meaningful thesis`);
		assert.ok(guide.evidence.split(/\s+/).length >= 4, `${slug} needs an evidence cue`);
		assert.ok(guide.limit.split(/\s+/).length >= 4, `${slug} needs an explicit limit`);
		assert.ok(guide.continueLabel.length > 3 && guide.continueHref.startsWith('/'));
		assert.doesNotMatch(
			`${guide.question} ${guide.thesis}`,
			/\b(the page|this page|artifact|surface|lane|hermeneutic|zuhandenheit|vorhandenheit|subtractive triad)\b/i,
			`${slug} opens with artifact-facing or unexplained vocabulary`
		);
	}
});

test('places plain orientation after the title and before the research record', () => {
	assert.ok(existsSync(guideComponentPath), 'the shared paper reading-guide component is missing');

	const directHeaderSlugs = staticSlugs.filter(
		(slug) => !['analyzer-mcp-review-architecture', 'webflow-template-review-webmcp'].includes(slug)
	);
	for (const slug of directHeaderSlugs) {
		const source = read(join(paperRoutesRoot, slug, '+page.svelte'));
		const titleIndex = source.indexOf('<h1');
		const guideIndex = source.indexOf('<PaperReadingGuide');
		assert.ok(titleIndex >= 0, `${slug} must retain its H1`);
		assert.ok(guideIndex > titleIndex, `${slug} must place orientation after its H1`);
		assert.match(source, /PaperReadingGuide/);
	}

	for (const slug of ['analyzer-mcp-review-architecture', 'webflow-template-review-webmcp']) {
		const source = read(join(paperRoutesRoot, slug, '+page.svelte'));
		assert.match(source, /PaperArticleHeader/);
		assert.doesNotMatch(source, /\bArticleHeader\b/);
	}

	const dynamicSource = read(dynamicPagePath);
	assert.match(dynamicSource, /PaperArtifactPage/);
	assert.doesNotMatch(dynamicSource, /\bResearchArtifactPage\b/);
});

test('keeps optional depth semantic and controls progressively enhanced', () => {
	assert.ok(existsSync(guideComponentPath), 'the shared paper reading-guide component is missing');
	if (existsSync(guideComponentPath)) {
		const guideSource = read(guideComponentPath);
		assert.match(guideSource, /<section[^>]+aria-labelledby=/);
		assert.match(guideSource, /Start here/);
		assert.match(guideSource, /What to inspect/);
		assert.match(guideSource, /Where it stops/);
		assert.match(guideSource, /Continue/);
	}

	const teaching = read(join(paperRoutesRoot, 'teaching-modalities-experiment/+page.svelte'));
	assert.match(teaching, /let enhanced\s*=\s*\$state\(false\)/);
	assert.doesNotMatch(teaching, /<button[^>]*class="reveal-dot"[^>]*><\/button>/);
	assert.match(teaching, /aria-label=.*reveal/i);

	const animation = read(join(paperRoutesRoot, 'animation-spec-architecture/+page.svelte'));
	assert.match(animation, /let enhanced\s*=\s*\$state\(false\)/);

	const threshold = read(join(paperRoutesRoot, 'threshold-dwelling/+page.svelte'));
	assert.match(threshold, /let enhanced\s*=\s*\$state\(false\)/);
	assert.match(threshold, /<LightStudy[^>]+interactive=\{enhanced\}/);

	const lightStudy = read(
		join(ioRoot, '../canon/src/lib/experiments/threshold-dwelling/LightStudy.svelte')
	);
	assert.match(lightStudy, /interactive\?: boolean/);
	assert.match(lightStudy, /\{#if interactive\}[\s\S]*Light study controls/);

	const tufteMorph = read(join(ioRoot, 'src/lib/animations/TufteMorph.svelte'));
	assert.match(tufteMorph, /let enhanced\s*=\s*\$state\(false\)/);
	assert.match(tufteMorph, /\{#if enhanced\}[\s\S]*class="controls"/);
});

test('bounds the default reading path while keeping the no-JavaScript record open', () => {
	const editorialStaticSlugs = staticSlugs.filter((slug) => slug !== 'threshold-dwelling');
	for (const slug of editorialStaticSlugs) {
		const source = read(join(paperRoutesRoot, slug, '+page.svelte'));
		assert.match(source, /<details[^>]+data-paper-record[^>]+id="full-paper"[^>]+open>/, `${slug} needs an open server-rendered record`);
		assert.match(source, /<summary>Read the full paper<\/summary>/, `${slug} needs a native record summary`);
	}

	const dynamicComponent = read(join(ioRoot, 'src/lib/components/papers/PaperArtifactPage.svelte'));
	assert.match(dynamicComponent, /<details[^>]+data-paper-record[^>]+id="full-paper"[^>]+open>/);
	assert.match(dynamicComponent, /<summary>Read the full paper<\/summary>/);

	const guideSource = read(guideComponentPath);
	assert.match(guideSource, /hashchange/);
	assert.match(guideSource, /record.*open/s);
	assert.match(guideSource, /href="#full-paper"/);
	assert.match(guideSource, /openRecordAndFocusSummary/);
	assert.match(guideSource, /querySelector<HTMLElement>\('summary'\)\?\.focus\(\)/);
});

test('prevents invalid threshold geometry while preserving keyboard exit', () => {
	const floorPlan = read(
		join(ioRoot, '../canon/src/lib/experiments/threshold-dwelling/FloorPlan.svelte')
	);
	const threshold = read(join(paperRoutesRoot, 'threshold-dwelling/+page.svelte'));

	assert.match(floorPlan, /\$:\s*scaleBarY\s*=\s*svgHeight\s*-\s*10/);
	assert.doesNotMatch(floorPlan, /const\s+scaleBarY\s*=\s*svgHeight/);
	assert.match(threshold, /event\.key === 'Escape'/);
	assert.match(threshold, /aria-label="Toggle fullscreen floor plan"/);
});
