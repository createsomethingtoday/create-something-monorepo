import { describe, expect, it } from 'vitest';

import { getExtension, matchesAnyGlob, shouldExclude } from './glob';

describe('matchesAnyGlob', () => {
  it('matches everything when no patterns are provided', () => {
    expect(matchesAnyGlob('any/path.js', [])).toBe(true);
  });

  it('matches by basename (matchBase)', () => {
    expect(matchesAnyGlob('deep/nested/app.js', ['*.js'])).toBe(true);
    expect(matchesAnyGlob('deep/nested/app.ts', ['*.js'])).toBe(false);
  });

  it('matches globstar directory patterns', () => {
    expect(matchesAnyGlob('node_modules/pkg/index.js', ['**/node_modules/**'])).toBe(true);
    expect(matchesAnyGlob('src/index.js', ['**/node_modules/**'])).toBe(false);
  });

  it('normalizes backslash separators before matching', () => {
    expect(matchesAnyGlob('src\\vendor\\lib.js', ['**/vendor/**'])).toBe(true);
  });
});

describe('shouldExclude', () => {
  it('delegates to matchesAnyGlob', () => {
    expect(shouldExclude('dist/app.js', ['**/dist/**'])).toBe(true);
    expect(shouldExclude('src/app.js', ['**/dist/**'])).toBe(false);
  });
});

describe('getExtension', () => {
  it('returns the lowercased extension', () => {
    expect(getExtension('App.JS')).toBe('.js');
    expect(getExtension('path/to/file.min.css')).toBe('.css');
  });

  it('returns empty string when there is no extension', () => {
    expect(getExtension('Dockerfile')).toBe('');
    expect(getExtension('dir.with.dot/file')).toBe('');
  });
});
