import { it, expect } from 'vitest';
import { animationTools } from './tools';
import { newProject, applyOperations, type Project } from './model';
it('returns cloneable compact receipts and rejects stale agent edits', async () => {
  let p: Project = newProject();
  p.assets = [
    {
      id: 'asset',
      name: 'Ball',
      data: 'data:image/png;base64,AAAA',
      width: 1,
      height: 1,
      provenance: new Proxy(
        { source: 'codex-imagegen' as const, createdAt: '2026-09-10T00:00:00Z' },
        {}
      )
    }
  ];
  const tools = animationTools({
    get: () => p,
    apply: async (ops, r) => {
      p = applyOperations(p, ops, r);
    },
    time: () => 0,
    seek: () => {},
    history: async () => {}
  });
  const read = await tools[0].execute({});
  expect(() => structuredClone(read)).not.toThrow();
  expect(JSON.stringify(read)).not.toContain('base64');
  await expect(
    tools[2].execute({ expectedRevision: 99, operations: [{ type: 'settings', title: 'bad' }] })
  ).rejects.toThrow('Stale');
  expect(p.title).toBe('Untitled animation');
});
