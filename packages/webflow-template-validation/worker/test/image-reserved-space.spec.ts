import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDocument } from 'htmlparser2';
import {
	clearStylesheetCache,
	imageSpaceReserved,
	loadPageStyles,
	parseStylesheet,
	type StyledNode
} from '../src/validators/image-reserved-space';
import { analyzeImageDimensions } from '../src/validators/content-validator';
import { parseHTMLWorker } from '../src/utils/fetch-utils';

const PAGE = 'https://example.webflow.io/';
const SHEET = 'https://cdn.prod.website-files.com/abc/css/example.webflow.shared.css';

function page(body: string, css: string, extraHead = ''): string {
	return `<!doctype html><html><head><link rel="stylesheet" href="${SHEET}">${extraHead}</head><body>${body}</body></html>`;
}

function findImages(html: string): StyledNode[] {
	const out: StyledNode[] = [];
	const walk = (node: StyledNode) => {
		for (const child of node.children ?? []) {
			if (child.name === 'img') out.push(child);
			walk(child);
		}
	};
	walk(parseDocument(html) as unknown as StyledNode);
	return out;
}

/** Reserved verdict per image, in document order. */
async function verdicts(body: string, css: string, extraHead = ''): Promise<boolean[]> {
	const html = page(body, css, extraHead);
	const styles = await loadPageStyles(html, PAGE, async () => css);
	expect(styles).not.toBeNull();
	return findImages(html).map((img) => imageSpaceReserved(img, styles!));
}

describe('image space reserved by CSS', () => {
	beforeEach(() => clearStylesheetCache());

	it('passes a fixed width and height, and an aspect ratio with one definite side', async () => {
		const css = `
			.card-image { width: 320px; height: 240px; object-fit: cover; }
			.hero-image { width: 100%; aspect-ratio: 16 / 9; }
			.avatar { height: 3rem; aspect-ratio: 1; }
		`;
		expect(
			await verdicts('<img class="card-image"><img class="hero-image"><img class="avatar">', css)
		).toEqual([true, true, true]);
	});

	it('fails when the height comes from the image itself', async () => {
		const css = `
			.fluid { width: 100%; height: auto; }
			.ratio-only { aspect-ratio: 16 / 9; }
			.w-only { width: 400px; }
			.max { max-width: 100%; }
		`;
		expect(
			await verdicts('<img class="fluid"><img class="ratio-only"><img class="w-only"><img class="max"><img>', css)
		).toEqual([false, false, false, false, false]);
	});

	it('resolves a percentage height only against a parent with a settled height', async () => {
		const css = `
			.cover { width: 100%; height: 100%; object-fit: cover; }
			.frame { height: 420px; }
			.ratio-frame { aspect-ratio: 4 / 3; }
			.inner { height: 100%; }
			.loose { padding: 2rem; }
		`;
		const body = `
			<div class="frame"><img class="cover"></div>
			<div class="ratio-frame"><img class="cover"></div>
			<div class="frame"><div class="inner"><img class="cover"></div></div>
			<div class="loose"><img class="cover"></div>
			<div class="loose"><div class="inner"><img class="cover"></div></div>
		`;
		expect(await verdicts(body, css)).toEqual([true, true, true, false, false]);
	});

	it('passes out-of-flow images', async () => {
		const css = `.bg { position: absolute; inset: 0; } .pin { position: fixed; top: 0; }`;
		expect(await verdicts('<img class="bg"><img class="pin">', css)).toEqual([true, true]);
	});

	it('follows the cascade: specificity, source order, combo classes and !important', async () => {
		const css = `
			.thumb { width: 80px; height: 80px; }
			.thumb.is-fluid { height: auto; }
			.gallery .thumb { height: auto; }
			.locked { height: 64px !important; width: 64px; }
			.locked.is-fluid { height: auto; }
			.late { width: 50px; height: 50px; }
			.late { height: auto; }
		`;
		const body = `
			<img class="thumb">
			<img class="thumb is-fluid">
			<div class="gallery"><img class="thumb"></div>
			<img class="locked is-fluid">
			<img class="late">
		`;
		expect(await verdicts(body, css)).toEqual([true, false, false, true, false]);
	});

	it('requires the space to be reserved at every breakpoint', async () => {
		const css = `
			.a { width: 400px; height: 300px; }
			.b { width: 400px; height: 300px; }
			.c { width: 100%; height: auto; }
			@media screen and (max-width: 767px) {
				.a { width: 100%; height: 200px; }
				.b { height: auto; }
				.c { height: 240px; }
			}
		`;
		expect(await verdicts('<img class="a"><img class="b"><img class="c">', css)).toEqual([true, false, false]);
	});

	it('ignores hover states, pseudo-elements and rules that cannot size an image', async () => {
		const css = `
			.pic:hover { width: 100px; height: 100px; }
			.pic::after { width: 100px; height: 100px; }
			@keyframes grow { from { width: 10px; height: 10px; } to { width: 20px; height: 20px; } }
			@font-face { font-family: X; src: url(x.woff2); }
		`;
		expect(await verdicts('<img class="pic">', css)).toEqual([false]);
	});

	it('reads inline styles and <style> blocks, and treats one size attribute as a width or height', async () => {
		const css = `.h { height: 200px; }`;
		const body = `
			<img style="width: 120px; height: 90px">
			<img class="embed">
			<img class="h" width="300">
			<img width="300">
		`;
		const head = '<style>.embed { width: 10rem; aspect-ratio: 1 / 1; }</style>';
		expect(await verdicts(body, css, head)).toEqual([true, true, true, false]);
	});

	it('resolves variables set on :root or body, and treats an unknown variable as no size', async () => {
		const css = `
			:root { --size-full: 100%; --thumb: 4rem; --alias: var(--thumb); }
			body { --tall: 20rem; }
			.card { --local: 5rem; }
			.v { width: var(--thumb); height: var(--alias); }
			.full { width: var(--size-full); height: var(--size-full); }
			.b { width: 100%; height: var(--tall); }
			.unknown { width: var(--local); height: var(--local); }
			.fallback { width: var(--missing, 3rem); height: var(--missing, 3rem); }
		`;
		const body = '<img class="v"><img class="full"><img class="b"><div class="card"><img class="unknown"></div><img class="fallback">';
		expect(await verdicts(body, css)).toEqual([true, false, true, false, true]);
	});

	it('treats calc() and clamp() lengths as definite, and keywords as not', async () => {
		const css = `
			.c { width: calc(100% - 2rem); height: clamp(10rem, 30vw, 20rem); }
			.k { width: fit-content; height: max-content; }
			.p { width: 100%; height: calc(100% - 10px); }
		`;
		expect(await verdicts('<img class="c"><img class="k"><img class="p">', css)).toEqual([true, false, false]);
	});

	it('counts a percentage width only when its container does not shrink to its content', async () => {
		const css = `
			.fill { width: 100%; height: 100%; }
			.box { height: 40px; }
			.row { display: flex; }
			.grow { flex: 1; }
			.col { display: flex; flex-direction: column; }
			.fixed-w { width: 120px; }
			.inline { display: inline-block; }
			.abs { position: absolute; }
			.w-inline-block { display: inline-block; }
		`;
		const body = `
			<div class="box"><img class="fill"></div>
			<div class="row"><div class="box"><img class="fill"></div></div>
			<div class="row"><div class="box grow"><img class="fill"></div></div>
			<div class="row"><div class="box fixed-w"><img class="fill"></div></div>
			<div class="col"><div class="box"><img class="fill"></div></div>
			<div class="box inline"><img class="fill"></div>
			<div class="box abs"><img class="fill"></div>
			<a class="box"><img class="fill"></a>
			<a class="box w-inline-block fixed-w"><img class="fill"></a>
		`;
		expect(await verdicts(body, css)).toEqual([true, false, true, true, true, false, false, false, true]);
	});

	it('applies overlapping media queries together', async () => {
		const css = `
			.pic { width: 300px; height: 200px; aspect-ratio: 3 / 2; }
			.ok { width: 300px; height: 200px; aspect-ratio: 3 / 2; }
			@media screen and (max-width: 991px) { .pic { width: auto; } .ok { width: auto; } }
			@media screen and (max-width: 767px) { .pic { height: auto; } }
			@media screen and (min-width: 1440px) { .ok { height: auto; } }
			@media print { .ok { width: auto; height: auto; } }
		`;
		// .pic loses both sides below 767px; .ok never loses both at one width.
		expect(await verdicts('<img class="pic"><img class="ok">', css)).toEqual([false, true]);
	});

	it('tries conditions it cannot evaluate both on and off', async () => {
		const css = `
			.a { width: 300px; height: 200px; }
			.b { width: 300px; height: 200px; }
			@media (orientation: portrait) { .a { height: auto; } }
			@media (hover: hover) { .b { width: 20rem; } }
		`;
		expect(await verdicts('<img class="a"><img class="b">', css)).toEqual([false, true]);
	});

	it('does not trust a variable that is also set somewhere else', async () => {
		const css = `
			:root { --image-height: 200px; --mode-size: 10rem; --plain: 12rem; }
			.theme-dark { --mode-size: auto; }
			.image { width: 300px; height: var(--image-height); }
			.moded { width: var(--mode-size); height: var(--mode-size); }
			.plain { width: var(--plain); height: var(--plain); }
		`;
		const body = '<img class="image" style="--image-height:auto"><img class="moded"><img class="plain">';
		expect(await verdicts(body, css)).toEqual([false, false, true]);
	});

	it('does not accept an "auto" ratio on the image, but does on its frame', async () => {
		const css = `
			.auto-ratio { width: 300px; aspect-ratio: auto 1 / 1; }
			.ratio { width: 300px; aspect-ratio: 1 / 1; }
			.frame { aspect-ratio: auto 4 / 3; }
			.cover { width: 100%; height: 100%; }
		`;
		const body = '<img class="auto-ratio"><img class="ratio"><div class="frame"><img class="cover"></div>';
		expect(await verdicts(body, css)).toEqual([false, true, true]);
	});

	it('keeps the media attribute of a <style> or <link> as a condition on its rules', async () => {
		const css = `.a { width: 300px; height: 200px; } .b { width: 300px; height: 200px; }`;
		const head = `
			<style media="(max-width: 767px)">.a { height: auto; }</style>
			<style media="print">.b { height: auto; }</style>
		`;
		expect(await verdicts('<img class="a"><img class="b">', css, head)).toEqual([false, true]);

		clearStylesheetCache();
		const html = `<!doctype html><html><head>
			<link rel="stylesheet" href="${SHEET}">
			<link rel="stylesheet" media="(max-width: 479px)" href="https://cdn.prod.website-files.com/abc/css/mobile.css">
		</head><body><img class="a"></body></html>`;
		const styles = await loadPageStyles(html, PAGE, async (url) => (url.endsWith('mobile.css') ? '.a { width: auto; height: auto; }' : css));
		expect(findImages(html).map((img) => imageSpaceReserved(img, styles!))).toEqual([false]);
	});

	it('treats @supports rules as conditional', async () => {
		const css = `
			.a { width: 300px; height: 200px; }
			.b { width: 100%; }
			@supports (aspect-ratio: 1) { .a { height: auto; } .b { aspect-ratio: 2 / 1; } }
		`;
		// .a loses its height where the feature exists; .b has no height where it does not.
		expect(await verdicts('<img class="a"><img class="b">', css)).toEqual([false, false]);
	});

	it('ranks cascade layers before specificity', async () => {
		const css = `
			@layer base, components;
			@layer components { .pic { width: 300px; height: 200px; } }
			@layer base { .gallery .pic.pic { height: auto; } }
			@layer components { .late { width: 300px; height: 200px; } }
			.late { height: auto; }
			@layer base { .imp { height: 200px !important; width: 300px; } }
			.imp { height: auto !important; }
		`;
		const body = '<div class="gallery"><img class="pic"></div><img class="late"><img class="imp">';
		// components beats base; unlayered beats layered; for !important the layer wins.
		expect(await verdicts(body, css)).toEqual([true, false, true]);
	});

	it('does not resolve a percentage height against an inline parent', async () => {
		const css = `.tall { height: 200px; } .pic { width: 300px; height: 100%; } .block { display: block; }`;
		const body = `
			<span class="tall"><img class="pic"></span>
			<span class="tall block"><img class="pic"></span>
			<div class="tall"><img class="pic"></div>
		`;
		expect(await verdicts(body, css)).toEqual([false, true, true]);
	});

	it('does not trust a variable with two different global values', async () => {
		const css = `
			body { --h: auto; --same: 10rem; }
			:root { --h: 200px; --same: 10rem; }
			.a { width: 300px; height: var(--h); }
			.b { width: var(--same); height: var(--same); }
		`;
		expect(await verdicts('<img class="a"><img class="b">', css)).toEqual([false, true]);
	});

	it('reads a stylesheet again after the cache time', async () => {
		vi.useFakeTimers();
		try {
			const html = page('<img class="a">', '');
			let css = '.a { width: 300px; height: 200px; }';
			let reads = 0;
			const fetcher = async () => {
				reads += 1;
				return css;
			};
			const first = await loadPageStyles(html, PAGE, fetcher);
			expect(imageSpaceReserved(findImages(html)[0], first!)).toBe(true);

			css = '.a { width: 300px; height: auto; }';
			vi.advanceTimersByTime(30_000);
			await loadPageStyles(html, PAGE, fetcher);
			expect(reads).toBe(1);

			vi.advanceTimersByTime(31_000);
			const later = await loadPageStyles(html, PAGE, fetcher);
			expect(reads).toBe(2);
			expect(imageSpaceReserved(findImages(html)[0], later!)).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not accept a box that uses the "all" reset', async () => {
		const css = `.reset { all: unset; } .frame { height: 200px; } .pic { width: 300px; height: 100%; }`;
		const body = `
			<img style="width:300px;height:200px;all:unset">
			<div class="frame reset"><img class="pic"></div>
			<div class="frame"><img class="pic"></div>
		`;
		expect(await verdicts(body, css)).toEqual([false, false, true]);
	});

	it('reads nested rules', async () => {
		const css = `
			.pic { width: 300px; height: 200px; & { height: auto; } }
			.card { .thumb { width: 80px; height: 80px; } }
			.wide { width: 300px; height: 200px; @media (max-width: 767px) { height: auto; } }
			.keep { width: 300px; height: 200px; &.is-fluid { height: auto; } }
		`;
		const body = `
			<img class="pic">
			<div class="card"><img class="thumb"></div>
			<img class="thumb">
			<img class="wide">
			<img class="keep">
			<img class="keep is-fluid">
		`;
		expect(await verdicts(body, css)).toEqual([false, true, false, false, true, false]);
	});

	it('keeps declarations after a nested rule later in the cascade', async () => {
		const css = `
			.pic { width: 300px; height: auto; & { height: 200px; } height: auto; }
			.ok { width: 300px; height: auto; & { height: auto; } height: 200px; }
		`;
		expect(await verdicts('<img class="pic"><img class="ok">', css)).toEqual([false, true]);
	});

	it('honors !important on a global variable', async () => {
		const css = `
			:root { --h: auto !important; --h: 200px; --w: 300px !important; }
			.pic { width: var(--w); height: var(--h); }
			.wide { width: var(--w); height: 100px; }
		`;
		expect(await verdicts('<img class="pic"><img class="wide">', css)).toEqual([false, true]);
	});

	it('accepts only a positive ratio', async () => {
		const css = `
			.zero { width: 300px; aspect-ratio: 0; }
			.div0 { width: 300px; aspect-ratio: 1 / 0; }
			.calc { width: 300px; aspect-ratio: calc(16 / 9); }
			.dec { width: 300px; aspect-ratio: 1.5; }
			.frac { width: 300px; aspect-ratio: 16/9; }
		`;
		const body = '<img class="zero"><img class="div0"><img class="calc"><img class="dec"><img class="frac">';
		expect(await verdicts(body, css)).toEqual([false, false, false, true, true]);
	});

	it('returns null when a site stylesheet cannot be read, and skips other hosts', async () => {
		const html = page('<img class="x">', '', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">');
		const requested: string[] = [];
		const failed = await loadPageStyles(html, PAGE, async (url) => {
			requested.push(url);
			return null;
		});
		expect(failed).toBeNull();
		expect(requested).toEqual([SHEET]);
	});

	it('survives broken CSS', () => {
		expect(() => parseStylesheet('.a { width: 10px; height: 10px; } .b { width: 5px')).not.toThrow();
		expect(() => parseStylesheet('.a { width: 10px } ..bad { height: 1px } } .c { height: 2px } @media {')).not.toThrow();
	});
});

describe('analyzeImageDimensions with page styles', () => {
	beforeEach(() => clearStylesheetCache());

	it('counts only images with neither attributes nor reserved CSS space', async () => {
		const css = `.sized { width: 320px; height: 200px; } .fluid { width: 100%; height: auto; }`;
		const html = page(
			`<img src="/attrs.webp" width="640" height="480">
			 <img src="/css.webp" class="sized">
			 <img src="/fluid.webp" class="fluid">`,
			css
		);
		const parsed = parseHTMLWorker(html);
		const styles = await loadPageStyles(html, PAGE, async () => css);

		const withStyles = analyzeImageDimensions(parsed, styles);
		expect(withStyles.missing).toBe(1);
		expect(withStyles.sizedByCss).toBe(1);
		expect(withStyles.details.map((detail) => detail.src)).toEqual(['/fluid.webp']);

		// Without styles the check is the attribute-only rule.
		const attributesOnly = analyzeImageDimensions(parsed);
		expect(attributesOnly.missing).toBe(2);
		expect(attributesOnly.sizedByCss).toBe(0);
	});
});
