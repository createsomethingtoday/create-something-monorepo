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
  p.drawings = [
    {
      id: 'canvas-stroke',
      source: { space: 'canvas', objectId: 'canvas-stroke' },
      name: 'Shared stroke',
      kind: 'stroke',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 20 }
      ],
      color: '#222222',
      weight: 3,
      text: '',
      width: 20,
      height: 20,
      poses: [
        {
          time: 0,
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          reveal: 1,
          easing: 'ease'
        }
      ]
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
  expect(read).toMatchObject({
    drawings: [{ id: 'canvas-stroke', source: { space: 'canvas', objectId: 'canvas-stroke' } }]
  });
  expect(() => structuredClone(read)).not.toThrow();
  expect(JSON.stringify(read)).not.toContain('base64');
  expect(JSON.stringify(tools[2].inputSchema)).toContain('"source"');
  const exact = (await tools[1].execute({ id: 'canvas-stroke' })) as {
    drawing: Project['drawings'][number];
  };
  const roundTrip = await tools[2].execute({
    expectedRevision: 0,
    operations: [{ type: 'put_drawing', drawing: exact.drawing }]
  });
  expect(roundTrip).toMatchObject({
    revision: 1,
    drawings: [{ id: 'canvas-stroke', source: { objectId: 'canvas-stroke' } }]
  });
  await expect(
    tools[2].execute({ expectedRevision: 99, operations: [{ type: 'settings', title: 'bad' }] })
  ).rejects.toThrow('Stale');
  expect(p.title).toBe('Untitled animation');
});
