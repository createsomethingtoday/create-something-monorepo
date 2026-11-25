import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/fetch-utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/utils/fetch-utils')>()),
	fetchHTML: vi.fn()
}));

import { fetchHTML } from '../src/utils/fetch-utils';
import { auditFontLicenses, extractUploadedFontFamilies, generateFontLicenseIssues, isFontNamed } from '../src/validators/font-licenses';

const SITE = 'https://example-template.webflow.io';
const CDN = 'https://cdn.prod.website-files.com/0123456789abcdef01234567';
const SHEET = `${CDN}/css/site.webflow.shared.abc.css`;

const CSS = `
/* @font-face { font-family: "Commented"; src: url("${CDN}/Commented.woff2"); } */
@font-face { font-family: webflow-icons; src: url("data:application/x-font-ttf;charset=utf-8;base64,AAEA") format("truetype"); }
@font-face { font-family: "Switzer Variable"; src: url("${CDN}/Switzer-Variable.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: 'Switzer Variable'; src: url('${CDN}/Switzer-VariableItalic.woff2') format('woff2'); font-style: italic; }
@font-face { font-family: PP Neue Montreal; src: url(${CDN}/PPNeueMontreal-Book.otf) format("opentype"); }
@font-face { font-family: "Elsewhere"; src: url("https://fonts.example.com/elsewhere.woff2"); }
.heading { font-family: "Switzer Variable", sans-serif; }`;

describe('extractUploadedFontFamilies', () => {
	it('lists each family with a file on a Webflow asset host, once', () => {
		expect(extractUploadedFontFamilies(CSS, SHEET)).toEqual(['Switzer Variable', 'PP Neue Montreal']);
	});

	it('finds nothing in a stylesheet with no uploaded font', () => {
		expect(extractUploadedFontFamilies('.a{font-family:Inter,sans-serif}', SHEET)).toEqual([]);
	});

	it('reads a long stylesheet with unclosed blocks, comments and url values in linear time', () => {
		const started = Date.now();
		expect(extractUploadedFontFamilies('@font-face{'.repeat(200_000), SHEET)).toEqual([]);
		expect(extractUploadedFontFamilies('/* '.repeat(300_000), SHEET)).toEqual([]);
		expect(extractUploadedFontFamilies(`@font-face{font-family:A;src:${'url('.repeat(200_000)}}`, SHEET)).toEqual([]);
		expect(Date.now() - started).toBeLessThan(2000);
	});

	it('resolves a file path that is relative to the stylesheet', () => {
		expect(extractUploadedFontFamilies('@font-face{font-family:Local;src:url(../fonts/local.woff2)}', SHEET)).toEqual(['Local']);
	});
});

describe('isFontNamed', () => {
	it('accepts the name without weight words, without a foundry prefix, or without spaces', () => {
		expect(isFontNamed('Switzer Variable', 'Fonts: Switzer by Indian Type Foundry (ITF Free Font License).')).toBe(true);
		expect(isFontNamed('PP Neue Montreal', 'Neue Montreal — Pangram Pangram, free for personal use')).toBe(true);
		expect(isFontNamed('Neue Montreal', 'NeueMontreal is licensed under …')).toBe(true);
		expect(isFontNamed('SwitzerVariable', 'switzer')).toBe(true);
	});

	it('accepts a one-word family name that the page writes as several words', () => {
		expect(isFontNamed('Instrumentserif', 'Fonts: Instrument Serif, headings and quotes.')).toBe(true);
		expect(isFontNamed('Librecasloncondensed', 'the license for Libre Caslon Condensed fonts')).toBe(true);
		expect(isFontNamed('Aspektavf', 'Aspekta by Ivo Dolenc, SIL Open Font License')).toBe(true);
		expect(isFontNamed('Aspektavf', 'Fonts https://fonts.google.com/')).toBe(false);
	});

	it('accepts Font Awesome for its file family names', () => {
		expect(isFontNamed('Fa Solid 900', 'Icons: Font Awesome Free')).toBe(true);
		expect(isFontNamed('Fa Brands 400', 'Fonts: Open Sans, Lato')).toBe(false);
	});

	it('needs the whole name as words', () => {
		expect(isFontNamed('Inter', 'International images are from Unsplash.')).toBe(false);
		expect(isFontNamed('General Sans', 'General information about this template.')).toBe(false);
		expect(isFontNamed('Switzer', 'All fonts are free to use.')).toBe(false);
	});

	it('does not accept a generic word for the name', () => {
		expect(isFontNamed('DM Sans', 'Fonts: Open Sans')).toBe(false);
		expect(isFontNamed('PT Serif', 'A serif typeface from Google Fonts')).toBe(false);
		expect(isFontNamed('Fa Solid 900', 'A solid choice of icons')).toBe(false);
		expect(isFontNamed('Highlight', 'High quality images')).toBe(false);
		expect(isFontNamed('DM Sans', 'Fonts: DM Sans, Open Font License')).toBe(true);
	});

	it('keeps a name that is only a weight word', () => {
		expect(isFontNamed('Bold', 'Fonts: Bold by Example Foundry')).toBe(true);
		expect(isFontNamed('Bold', 'Fonts: Inter')).toBe(false);
	});
});

describe('generateFontLicenseIssues', () => {
	it('warns once and lists the fonts the page does not name', () => {
		const issues = generateFontLicenseIssues(['Switzer Variable', 'PP Neue Montreal'], 'Typography: Neue Montreal (Pangram Pangram).');
		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({ id: 'font-license-missing', severity: 'warning' });
		expect(issues[0].details?.fonts).toEqual(['Switzer Variable']);
	});

	it('passes when every font is named', () => {
		expect(generateFontLicenseIssues(['Switzer Variable'], 'Switzer, ITF Free Font License')).toEqual([]);
	});
});

describe('auditFontLicenses', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function serve(licensesBody: string | null, sheetStatus = 200) {
		vi.mocked(fetchHTML).mockImplementation(async (url: string) => {
			if (new URL(url).pathname !== '/licenses' || licensesBody === null) throw new Error('HTTP 404: Not Found');
			const html = `<html><head></head><body><style>.x{content:"Switzer"}</style><script>var font = "Switzer";</script><h1>Licenses</h1>${licensesBody}</body></html>`;
			return { html, status: 200, headers: {}, size: html.length, loadTime: 0 };
		});
		vi.stubGlobal('fetch', vi.fn(async () => new Response(CSS, { status: sheetStatus })));
	}

	it('reports a font that the Licenses page does not name', async () => {
		serve('<p>Images: Unsplash.</p><p>Fonts: <a href="https://pangrampangram.com">Neue Montreal</a></p>');
		const issues = await auditFontLicenses(SITE, [SHEET]);
		expect(issues[0]?.details?.fonts).toEqual(['Switzer Variable']);
	});

	it('does not count a name that is only in a style or script block', async () => {
		serve('<p>Fonts: Neue Montreal</p>');
		expect((await auditFontLicenses(SITE, [SHEET]))[0]?.details?.fonts).toEqual(['Switzer Variable']);
	});

	it('reports nothing when the stylesheet or the Licenses page does not load, or there is no stylesheet', async () => {
		serve('<p>Nothing</p>', 500);
		expect(await auditFontLicenses(SITE, [SHEET])).toEqual([]);
		serve(null);
		expect(await auditFontLicenses(SITE, [SHEET])).toEqual([]);
		serve('<p>Nothing</p>');
		expect(await auditFontLicenses(SITE, [])).toEqual([]);
	});
});
