import type { DrawWebMcpTool } from '../webmcp';
import { evaluate, type Project, type Operation } from './model';
export type AnimationController = {
  get: () => Project;
  apply: (ops: Operation[], revision: number) => Promise<void>;
  seek: (time: number, id?: string) => void;
  time: () => number;
  history: (direction: 'undo' | 'redo') => Promise<void>;
};
const num = { type: 'number' },
  point = {
    type: 'object',
    required: ['x', 'y'],
    properties: { x: num, y: num },
    additionalProperties: false
  };
const pose = {
  type: 'object',
  required: ['time', 'x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity', 'reveal', 'easing'],
  properties: {
    time: num,
    x: num,
    y: num,
    rotation: num,
    scaleX: num,
    scaleY: num,
    opacity: num,
    reveal: num,
    easing: { enum: ['linear', 'ease', 'hold'] },
    points: { type: 'array', maxItems: 1000, items: point }
  },
  additionalProperties: false
};
const drawing = {
  type: 'object',
  required: ['id', 'name', 'kind', 'points', 'color', 'weight', 'text', 'width', 'height', 'poses'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    kind: { enum: ['stroke', 'image', 'text'] },
    points: { type: 'array', items: point },
    color: { type: 'string' },
    weight: num,
    text: { type: 'string' },
    assetId: { type: 'string' },
    width: num,
    height: num,
    poses: { type: 'array', items: pose }
  },
  additionalProperties: false
};
export function animationTools(c: AnimationController): DrawWebMcpTool[] {
  const tool = (
    name: string,
    description: string,
    properties: Record<string, unknown>,
    required: string[],
    read: boolean,
    execute: DrawWebMcpTool['execute']
  ): DrawWebMcpTool => ({
    name,
    title: name.replaceAll('_', ' '),
    description,
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
    annotations: { readOnlyHint: read, openWorldHint: false },
    execute: async (input) => JSON.parse(JSON.stringify(await execute(input)))
  });
  const inspect = () => {
    const p = c.get();
    return {
      ...p,
      assets: p.assets.map(({ data, ...a }) => ({ ...a, characters: data.length })),
      drawings: p.drawings.map((d) => ({
        id: d.id,
        name: d.name,
        kind: d.kind,
        assetId: d.assetId,
        pointCount: d.points.length,
        poseTimes: d.poses.map((k) => k.time)
      })),
      time: c.time()
    };
  };
  return [
    tool(
      'draw_animation_inspect',
      'Read animation settings, revision, asset provenance and compact drawing summaries without image bytes. Use draw_animation_drawing for exact editable geometry.',
      {},
      [],
      true,
      async () => inspect()
    ),
    tool(
      'draw_animation_drawing',
      'Read one complete drawing and its evaluated pose. Coordinates are local to the drawing origin. Rotation is degrees. Pose points must preserve point count and correspondence.',
      { id: { type: 'string' } },
      ['id'],
      true,
      async (input) => {
        const d = c.get().drawings.find((d) => d.id === input.id);
        if (!d) throw new Error('Unknown drawing.');
        return { revision: c.get().revision, drawing: d, evaluated: evaluate(d, c.time()) };
      }
    ),
    tool(
      'draw_animation_apply',
      'Atomically edit persistent animation using the current revision. put_pose modifies only one key pose. The left pose easing controls transition to the next; hold switches at the next key. Reuse drawings and assets instead of redrawing every output frame. put_drawing can add a vector or instance an imported image asset. Import Codex-generated images through the Image/asset file control or .draw-asset.json bundle; no API calls occur here.',
      {
        expectedRevision: { type: 'integer' },
        operations: {
          type: 'array',
          minItems: 1,
          maxItems: 100,
          items: {
            oneOf: [
              {
                type: 'object',
                required: ['type', 'drawing'],
                properties: { type: { const: 'put_drawing' }, drawing },
                additionalProperties: false
              },
              {
                type: 'object',
                required: ['type', 'id', 'pose'],
                properties: { type: { const: 'put_pose' }, id: { type: 'string' }, pose },
                additionalProperties: false
              },
              {
                type: 'object',
                required: ['type', 'id', 'time'],
                properties: { type: { const: 'remove_pose' }, id: { type: 'string' }, time: num },
                additionalProperties: false
              },
              {
                type: 'object',
                required: ['type', 'id'],
                properties: { type: { const: 'remove_drawing' }, id: { type: 'string' } },
                additionalProperties: false
              },
              {
                type: 'object',
                required: ['type'],
                properties: {
                  type: { const: 'settings' },
                  title: { type: 'string' },
                  duration: num,
                  fps: num,
                  background: { type: 'string' },
                  width: num,
                  height: num
                },
                additionalProperties: false
              }
            ]
          }
        }
      },
      ['expectedRevision', 'operations'],
      false,
      async (input) => {
        await c.apply(input.operations as Operation[], input.expectedRevision as number);
        return inspect();
      }
    ),
    tool(
      'draw_animation_seek',
      'Seek the shared visible playhead and optionally select a drawing for human inspection. This does not modify saved poses.',
      { time: num, id: { type: 'string' } },
      ['time'],
      false,
      async (input) => {
        if (
          typeof input.time !== 'number' ||
          !Number.isFinite(input.time) ||
          input.time < 0 ||
          input.time > c.get().duration
        )
          throw new Error('Time outside animation.');
        if (input.id !== undefined && !c.get().drawings.some((d) => d.id === input.id))
          throw new Error('Unknown drawing.');
        c.seek(input.time, input.id as string | undefined);
        return { time: input.time, revision: c.get().revision };
      }
    ),
    tool(
      'draw_animation_history',
      'Undo or redo the last durable animation edit. Uses the same history as the human editor.',
      { direction: { enum: ['undo', 'redo'] } },
      ['direction'],
      false,
      async (input) => {
        if (input.direction !== 'undo' && input.direction !== 'redo')
          throw new Error('Invalid history direction.');
        await c.history(input.direction);
        return inspect();
      }
    )
  ];
}
