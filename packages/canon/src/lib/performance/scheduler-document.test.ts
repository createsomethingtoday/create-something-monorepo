import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_DOCUMENT_STYLE_VERSION,
  performanceDocumentCss,
  performanceDocumentFontLinks
} from './scheduler-document.js';

describe('standalone Performance document contract', () => {
  it('gives non-Svelte product surfaces Canon-owned fonts, tokens, and typography roles', () => {
    expect(PERFORMANCE_DOCUMENT_STYLE_VERSION).toBe('1.0.0');
    expect(performanceDocumentFontLinks).toContain(
      'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&amp;display=swap'
    );
    expect(performanceDocumentFontLinks).toContain(
      'https://cdn.jsdelivr.net/npm/@ibm/plex-mono@2.5.0/css/ibm-plex-mono-all.css'
    );
    expect(performanceDocumentCss).toContain('--color-performance-grid:rgb(9 9 9 / .055)');
    expect(performanceDocumentCss).toContain(
      '--font-performance-display:"Satoshi","Helvetica Neue",Helvetica,Arial,system-ui'
    );
    expect(performanceDocumentCss).toContain(
      '--font-performance-mono:"IBM Plex Mono","SFMono-Regular","SF Mono",Menlo,Monaco,Consolas,monospace'
    );
    expect(performanceDocumentCss).toContain('--font-performance-display-weight:500');
    expect(performanceDocumentCss).toContain('--tracking-performance-display:-.03em');
    expect(performanceDocumentCss).toContain('--leading-performance-display:.94');
    expect(performanceDocumentCss).toContain('font-family:var(--font-performance-display)');
    expect(performanceDocumentCss).toContain('font-family:var(--font-performance-mono)');
  });
});
