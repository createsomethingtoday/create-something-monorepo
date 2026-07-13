import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_EMAIL_STYLE_VERSION,
  performanceEmailTokens
} from './scheduler-email.js';

describe('Performance email token contract', () => {
  it('exposes versioned, inline-safe values with readable system fallbacks', () => {
    expect(PERFORMANCE_EMAIL_STYLE_VERSION).toBe('1.0.0');
    expect(performanceEmailTokens.color).toEqual(
      expect.objectContaining({
        paper: '#f3f3f0',
        panel: '#ffffff',
        ink: '#090909',
        muted: '#5e6268',
        line: '#d7d7d2',
        signal: '#0057b8'
      })
    );
    expect(performanceEmailTokens.font.display).toContain('Satoshi');
    expect(performanceEmailTokens.font.display).toContain('Arial');
    expect(performanceEmailTokens.font.mono).toContain('IBM Plex Mono');
    expect(performanceEmailTokens.font.mono).toContain('monospace');
    expect(performanceEmailTokens.layout.maxWidth).toBe('640px');
  });
});
