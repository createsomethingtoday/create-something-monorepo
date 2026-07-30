import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');
const performanceCss = readFileSync(
  new URL('../lib/styles/performance.css', import.meta.url),
  'utf8'
);
const tokensCss = readFileSync(new URL('../lib/styles/tokens.css', import.meta.url), 'utf8');
const typography = readFileSync(new URL('../lib/tokens/typography.ts', import.meta.url), 'utf8');
const schedulerDocument = readFileSync(
  new URL('../lib/performance/scheduler-document.ts', import.meta.url),
  'utf8'
);
const schedulerEmail = readFileSync(
  new URL('../lib/performance/scheduler-email.ts', import.meta.url),
  'utf8'
);
const button = readFileSync(new URL('../lib/components/Button.svelte', import.meta.url), 'utf8');
const narrative = readFileSync(
  new URL('../lib/components/performance/PerformanceNarrativeStage.svelte', import.meta.url),
  'utf8'
);

describe('Canon Performance showroom', () => {
  it('demonstrates the three shared modes with executable Performance components', () => {
    expect(page).not.toContain('Welcome to your library project');
    expect(page).toContain("data-performance-mode=\"campaign\"");
    expect(page).toContain("data-performance-mode=\"proof\"");
    expect(page).toContain("data-performance-mode=\"operator\"");
    expect(page).toContain('<PerformanceCampaignOpening');
    expect(page).toContain('<PerformanceNarrativeStage');
    expect(page).toContain('<PerformanceConversionHandoff');
    expect(page).toContain('prefers-reduced-motion');
    expect(narrative).not.toContain('window.history.pushState');
    expect(narrative).toContain('pushState(fragment, {})');
  });

  it('uses one local/system typography contract without self-referential overrides', () => {
    for (const source of [performanceCss, tokensCss, typography, schedulerDocument, schedulerEmail]) {
      expect(source).not.toMatch(/Fontshare|fontshare|Satoshi/);
    }
    expect(performanceCss).not.toMatch(
      /--font-performance-(sans|display|mono):\s*var\(--font-performance-\1\)/
    );
    expect(tokensCss).toContain('--font-performance-display: var(--font-performance-sans);');
    expect(typography).toContain("display: 'var(--font-performance-sans)'");
    expect(schedulerDocument).toContain('performanceDocumentFontLinks = ``');
    expect(button).toMatch(/\.btn\s*\{[^}]*min-height:\s*var\(--height-performance-control-min/s);
  });

  it('defines campaign, proof, and operator aliases in the shared token graph', () => {
    for (const mode of ['campaign', 'proof', 'operator']) {
      expect(tokensCss).toContain(`--color-performance-mode-${mode}-surface:`);
      expect(tokensCss).toContain(`--color-performance-mode-${mode}-ink:`);
      expect(tokensCss).toContain(`--color-performance-mode-${mode}-accent:`);
      expect(performanceCss).toContain(`[data-performance-mode='${mode}']`);
    }
  });
});
