import { describe, expect, it } from 'vitest';
import { filterCatalog } from '../src/lib/catalog';
import type { CatalogVideo } from '../src/lib/client';
const videos = [
  {
    id: 'a',
    title: 'MCP tool boundaries',
    description: 'Agent integration walkthrough',
    series: 'Architecture'
  },
  {
    id: 'b',
    title: 'Agent evaluations',
    description: 'Compare a retrieval experiment',
    series: 'Methods'
  }
] as CatalogVideo[];
describe('authorized catalog filtering', () => {
  it('combines normalized terms across metadata with the chosen series', () => {
    expect(filterCatalog(videos, '  MCP AGENT ', 'Architecture').map((v) => v.id)).toEqual(['a']);
    expect(filterCatalog(videos, 'agent', 'Methods').map((v) => v.id)).toEqual(['b']);
    expect(filterCatalog(videos, 'MCP', 'Methods')).toEqual([]);
  });
  it('restores the supplied catalog when filters clear and never manufactures items', () => {
    expect(filterCatalog(videos, '', '')).toEqual(videos);
    expect(filterCatalog([], 'agent', '')).toEqual([]);
  });
});
