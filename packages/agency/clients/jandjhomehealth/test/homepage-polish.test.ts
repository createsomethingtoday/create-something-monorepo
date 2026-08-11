import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const stylesheet = readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

test('the public hero lets its responsive aspect ratio control image height', () => {
	const heroImageRule = stylesheet.match(/\.hero-visual img\s*\{(?<declarations>[^}]*)\}/s);

	assert.ok(heroImageRule?.groups?.declarations, 'expected a .hero-visual img rule');
	assert.match(heroImageRule.groups.declarations, /height:\s*auto\s*;/);
});

test('the public trust path uses supported process language instead of unverified claims', () => {
	assert.doesNotMatch(
		homepage,
		/20\+|years of trusted care|experienced care professionals|more than two decades/i
	);
	assert.match(homepage, /Contact the care team/);
	assert.match(homepage, /Confirm needs and availability/);
	assert.match(homepage, /Plan the next step together/);
	assert.match(homepage, /Please do not include medical details here/);
	assert.match(homepage, /If you are experiencing a medical emergency, call 911/);
});
