import { expect, it } from 'vitest';
import { filterCollection } from '../src/lib/collection';
const releases = [
  {
    release_id: 'v1',
    title: 'MCP Access',
    kind: 'mcp',
    network_name: 'Engineering Lab',
    version: '1.0',
    status: 'revoked'
  },
  {
    release_id: 'v2',
    title: 'MCP Access',
    kind: 'mcp',
    network_name: 'Engineering Lab',
    version: '2.0',
    status: 'active'
  },
  {
    release_id: 'skill',
    title: 'Review changes',
    kind: 'skill',
    network_name: 'Team Practice',
    version: '1.0',
    status: 'active'
  }
];
it('finds acquired releases by words across title, network, version and asset type', () => {
  expect(filterCollection(releases, ' LAB  2.0 ', 'mcp').map((x) => x.release_id)).toEqual(['v2']);
  expect(filterCollection(releases, 'agent skill', '').map((x) => x.release_id)).toEqual(['skill']);
  expect(filterCollection(releases, 'access', 'skill')).toEqual([]);
});
it('keeps release identity and revoked history when filters are cleared', () => {
  expect(filterCollection(releases, '', '')).toEqual(releases);
  expect(filterCollection(releases, 'access', '').map((x) => x.release_id)).toEqual(['v1', 'v2']);
});
