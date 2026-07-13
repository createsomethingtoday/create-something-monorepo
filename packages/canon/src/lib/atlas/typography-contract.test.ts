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
			'--font-performance-interface',
			'--font-performance-record',
			'--font-performance-topology-label',
			'--text-performance-record',
			'--text-performance-record-meta',
			'--text-performance-operator-label',
			'--text-performance-topology-label',
			'--tracking-performance-topology-label',
			'--leading-performance-topology-label'
		]) {
			expect(tokens).toContain(token);
		}
	});

	it('keeps shared Atlas renderers on Canon typography roles', () => {
		const atlasFlowCss = read('packages/canon/src/lib/atlas/AtlasFlow.css');
		const atlasFlowSvelte = read('packages/canon/src/lib/atlas/AtlasFlow.svelte');
		const atlasStory = read('packages/canon/src/lib/atlas/AtlasStoryCanvas.svelte');

		expect(atlasFlowCss).toMatch(/var\(\s*--font-performance-interface/);
		expect(atlasFlowCss).toMatch(/var\(\s*--font-performance-topology-label/);
		expect(atlasFlowSvelte).toContain('var(--font-performance-topology-label');
		expect(atlasStory).toContain('var(--font-performance-topology-label');
		expect(atlasStory).toContain('var(--font-performance-record');
		expect(atlasFlowCss).not.toMatch(/font-family:\s*ABCDiatype/);
		expect(atlasFlowCss).not.toMatch(/font-family:\s*Inter/);
	});

	it('keeps Atlas Studio and the desktop shell on the same role names', () => {
		const studioCss = read('packages/interaction-atlas-mcp/src/studio/client/styles.css');
		const desktopShell = read('apps/atlas-studio-desktop/web/index.html');

		expect(studioCss).toContain('--font-performance-interface');
		expect(studioCss).toContain('--font-performance-topology-label');
		expect(studioCss).toContain('font-family: var(--font-performance-interface');
		expect(studioCss).toContain('font-family: var(--font-performance-topology-label');
		expect(desktopShell).toContain('--font-performance-interface');
		expect(desktopShell).toContain('Arial, "Helvetica Neue", Helvetica');
		expect(desktopShell).not.toContain('ona.com/fonts');
		expect(desktopShell).not.toMatch(/font-family:\s*"ABCDiatype"/);
	});
});
