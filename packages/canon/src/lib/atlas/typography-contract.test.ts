import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../../..', import.meta.url));

function read(path: string): string {
	return readFileSync(`${root}/${path}`, 'utf8');
}

describe('Atlas typography contract', () => {
	it('defines role tokens for operator, record, and topology typography', () => {
		const tokens = read('packages/canon/src/lib/styles/tokens.css');

		for (const token of [
			'--font-interface',
			'--font-record',
			'--font-topology-label',
			'--text-record',
			'--text-record-meta',
			'--text-operator-label',
			'--text-topology-label',
			'--tracking-topology-label',
			'--leading-topology-label'
		]) {
			expect(tokens).toContain(token);
		}
	});

	it('keeps shared Atlas renderers on Canon typography roles', () => {
		const atlasFlowCss = read('packages/canon/src/lib/atlas/AtlasFlow.css');
		const atlasFlowSvelte = read('packages/canon/src/lib/atlas/AtlasFlow.svelte');
		const atlasStory = read('packages/canon/src/lib/atlas/AtlasStoryCanvas.svelte');

		expect(atlasFlowCss).toMatch(/var\(\s*--font-interface/);
		expect(atlasFlowCss).toMatch(/var\(\s*--font-topology-label/);
		expect(atlasFlowSvelte).toContain('var(--font-topology-label');
		expect(atlasStory).toContain('var(--font-topology-label');
		expect(atlasStory).toContain('var(--font-record');
		expect(atlasFlowCss).not.toMatch(/font-family:\s*ABCDiatype/);
		expect(atlasFlowCss).not.toMatch(/font-family:\s*Inter/);
	});

	it('keeps Atlas Studio and the desktop shell on the same role names', () => {
		const studioCss = read('packages/interaction-atlas-mcp/src/studio/client/styles.css');
		const desktopShell = read('apps/atlas-studio-desktop/web/index.html');

		expect(studioCss).toContain('--font-interface');
		expect(studioCss).toContain('--font-topology-label');
		expect(studioCss).toContain('font-family: var(--font-interface');
		expect(studioCss).toContain('font-family: var(--font-topology-label');
		expect(desktopShell).toContain('--font-interface');
		expect(desktopShell).toContain('"ABC Diatype"');
		expect(desktopShell).not.toMatch(/font-family:\s*"ABCDiatype"/);
	});
});
