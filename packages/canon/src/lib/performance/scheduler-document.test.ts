import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_DOCUMENT_STYLE_VERSION,
  performanceDocumentCss,
  performanceDocumentFontLinks
} from './scheduler-document.js';

describe('standalone Performance document contract', () => {
  it('gives non-Svelte product surfaces Canon-owned fonts, tokens, and typography roles', () => {
    expect(PERFORMANCE_DOCUMENT_STYLE_VERSION).toBe('1.1.0');
    expect(performanceDocumentFontLinks).toBe('');
    expect(performanceDocumentCss).toContain('--color-performance-grid:rgb(9 9 9 / .055)');
    expect(performanceDocumentCss).toContain(
      '--font-performance-display:var(--font-performance-sans)'
    );
    expect(performanceDocumentCss).toContain(
      '--font-performance-mono:"SFMono-Regular","SF Mono",Menlo,Monaco,Consolas,monospace'
    );
    expect(performanceDocumentCss).toContain('--font-performance-display-weight:500');
    expect(performanceDocumentCss).toContain('--tracking-performance-display:-.03em');
    expect(performanceDocumentCss).toContain('--leading-performance-display:.94');
    expect(performanceDocumentCss).toContain('font-family:var(--font-performance-display)');
    expect(performanceDocumentCss).toContain('font-family:var(--font-performance-mono)');
    expect(performanceDocumentCss).not.toContain(
      '--font-performance-display:var(--font-performance-display)'
    );
    expect(performanceDocumentCss).not.toContain(
      '--font-performance-mono:var(--font-performance-mono)'
    );
  });
});
