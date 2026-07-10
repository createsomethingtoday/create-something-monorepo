import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');
const componentPath = join(
	REPO_ROOT,
	'packages/canon/src/lib/components/performance/PerformanceFieldStudy.svelte'
);
const exportPath = join(REPO_ROOT, 'packages/canon/src/lib/components/performance/index.ts');

describe('PerformanceFieldStudy', () => {
	it('requires real image description, measurements, and proof metadata', () => {
		const source = readFileSync(componentPath, 'utf8');

		expect(source).toContain('alt: string;');
		expect(source).toContain('metrics: PerformanceFieldStudyMetric[];');
		expect(source).toContain('proof: PerformanceFieldStudyProof;');
		expect(source).toContain('<picture>');
		expect(source).toContain('media="(max-width: 640px)"');
		expect(source).toContain('<dl>');
	});

	it('binds visual state to the shared semantic motion contract', () => {
		const source = readFileSync(componentPath, 'utf8');

		expect(source).toContain("import { PERFORMANCE_LAB_SEQUENCE }");
		expect(source).toContain('data-motion-stage={activeStage.id}');
		expect(source).toContain('data-motion-intent={activeStage.intent}');
		expect(source).toContain('data-motion-target={activeStage.target}');
		expect(source).not.toMatch(/#[0-9a-f]{3,8}[^\n]*--performance-field-accent/i);
	});

	it('settles to the same comprehensible state when motion is reduced', () => {
		const source = readFileSync(componentPath, 'utf8');

		expect(source).toContain('@media (prefers-reduced-motion: reduce)');
		expect(source).toContain('animation: none;');
		expect(source).toContain('transform: none;');
	});

	it('publishes the component and public types', () => {
		const source = readFileSync(exportPath, 'utf8');

		expect(source).toContain('PerformanceFieldStudy');
		expect(source).toContain('PerformanceFieldStudyMetric');
		expect(source).toContain('PerformanceFieldStudyProof');
	});
});
