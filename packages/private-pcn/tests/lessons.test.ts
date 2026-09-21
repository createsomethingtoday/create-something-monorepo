import { impactSurface } from '../src/lib/impact';
import { describe, expect, it } from 'vitest';
import { lessonPath, libraryReturnPath } from '../src/lib/lessons';
describe('shareable lesson navigation', () => {
  it('preserves library filters within the selected network, never an arbitrary return URL', () => {
    const path = lessonPath('lesson-1', 'engineering', 'MCP & tools', 'Safe operations');
    const url = new URL(path, 'https://private.example');
    expect(url.pathname).toBe('/n/engineering/lessons/lesson-1');
    expect(libraryReturnPath('engineering', url.searchParams)).toBe(
      '/n/engineering?q=MCP+%26+tools&series=Safe+operations'
    );
    expect(libraryReturnPath(undefined, new URLSearchParams('return=https://evil.example'))).toBe(
      '/library'
    );
    expect(lessonPath('lesson-1')).toBe('/lessons/lesson-1');
    expect(libraryReturnPath('create-something', new URLSearchParams())).toBe('/library');
  });
});

it('aggregates lesson engagement without sending network, lesson or query identifiers', () => {
  expect(impactSurface('/lessons/lesson-1')).toBe('lesson');
  expect(impactSurface('/n/private-client/lessons/lesson-2')).toBe('lesson');
  expect(impactSurface('/library')).toBe('library');
});
