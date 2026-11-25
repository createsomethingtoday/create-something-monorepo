import { describe, expect, it } from 'vitest';
import { postLoginPath } from './post-login';

describe('postLoginPath', () => {
  it('accepts an asset page, with or without a known tab', () => {
    expect(postLoginPath('/assets/recABCDEFGHIJKLMN')).toBe('/assets/recABCDEFGHIJKLMN');
    expect(postLoginPath('/assets/recABCDEFGHIJKLMN?tab=timeline')).toBe('/assets/recABCDEFGHIJKLMN?tab=timeline');
  });

  it('rejects everything else, so the value can never leave this site', () => {
    for (const value of [
      undefined,
      null,
      '',
      '/dashboard',
      'https://evil.example/assets/recABCDEFGHIJKLMN',
      '//evil.example/assets/recABCDEFGHIJKLMN',
      '/assets/recABCDEFGHIJKLMN?tab=health',
      '/assets/recABCDEFGHIJKLMN?tab=timeline&x=1',
      '/assets/recABCDEFGHIJKLMN\n/evil',
      '/assets/recABCDEFGHIJKLMN#//evil.example',
      '/assets/../login',
      '/assets/recABC'
    ]) {
      expect(postLoginPath(value)).toBeNull();
    }
  });
});
