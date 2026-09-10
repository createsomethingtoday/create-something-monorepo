import { describe, expect, it } from 'vitest';
import { createDocument, isDocument, type CanvasDocument } from '../document';
import {
  basePose,
  independentDrawingCopy,
  independentProjectCopy,
  LIMITS,
  validateProject,
  type Project
} from './model';
import { importMap, syncMotionProject } from './import-map';
import {
  canvasSpaceForProject,
  mergeProjectRecord,
  type DrawProjectRecord
} from '../project-storage';

function canvas(): CanvasDocument {
  const document = createDocument('One shared project');
  return {
    ...document,
    id: 'canvas-shared',
    objects: [
      {
        id: 'stroke-stable',
        kind: 'stroke',
        createdAt: '2026-09-10T00:00:00.000Z',
        color: '#282522',
        width: 4,
        points: [
          { x: 10, y: 20 },
          { x: 110, y: 120 }
        ]
      },
      {
        id: 'note-stable',
        kind: 'note',
        createdAt: '2026-09-10T00:00:00.000Z',
        x: 150,
        y: 80,
        width: 240,
        height: 120,
        text: 'A person approves'
      },
      {
        id: 'group-canvas-only',
        kind: 'group',
        createdAt: '2026-09-10T00:00:00.000Z',
        x: 0,
        y: 0,
        width: 420,
        height: 240,
        label: 'Governed work',
        childIds: ['stroke-stable', 'note-stable']
      }
    ]
  };
}

describe('shared Draw project contract', () => {
  it('materializes motion drawings with the same project and object IDs', () => {
    const source = canvas();
    const result = importMap(source);

    expect(result.drawings.map(({ id }) => id)).toEqual(['stroke-stable', 'note-stable']);
    expect(result.drawings.every((drawing) => drawing.source?.objectId === drawing.id)).toBe(true);
    expect(result.skipped).toBe(1);

    const motion = syncMotionProject(source);
    expect(motion.id).toBe(source.id);
    expect(motion.title).toBe(source.title);
    expect(motion.drawings.map(({ id }) => id)).toEqual(['stroke-stable', 'note-stable']);
  });

  it('keeps animation poses while reconciling later Canvas geometry by stable ID', () => {
    const source = canvas();
    const initial = syncMotionProject(source);
    const animated: Project = {
      ...initial,
      revision: 1,
      drawings: initial.drawings.map((drawing) => {
        if (drawing.id === 'stroke-stable')
          return {
            ...drawing,
            poses: [
              ...drawing.poses,
              {
                ...basePose(1),
                x: 90,
                points: [
                  { x: 15, y: 24 },
                  { x: 120, y: 128 }
                ]
              }
            ]
          };
        if (drawing.id === 'note-stable')
          return {
            ...drawing,
            poses: [...drawing.poses, { ...drawing.poses[0], time: 1, x: drawing.poses[0].x + 40 }]
          };
        return drawing;
      })
    };
    const edited = {
      ...source,
      objects: source.objects.map((object) =>
        object.id === 'stroke-stable' && object.kind === 'stroke'
          ? {
              ...object,
              points: [
                { x: 10, y: 20 },
                { x: 210, y: 120 }
              ]
            }
          : object.id === 'note-stable' && object.kind === 'note'
            ? { ...object, x: object.x + 120 }
            : object
      )
    };

    const synchronized = syncMotionProject(edited, animated);

    expect(synchronized.revision).toBe(2);
    const synchronizedStroke = synchronized.drawings.find(({ id }) => id === 'stroke-stable')!;
    const oldStroke = animated.drawings.find(({ id }) => id === 'stroke-stable')!;
    const importedStroke = importMap(edited).drawings.find(({ id }) => id === 'stroke-stable')!;
    expect(synchronizedStroke.points).toEqual(importedStroke.points);
    expect(synchronizedStroke.poses.at(-1)?.x).toBe(90);
    expect(synchronizedStroke.poses.at(-1)?.points).toEqual(
      oldStroke.poses.at(-1)!.points!.map((point, index) => ({
        x: importedStroke.points[index].x + (point.x - oldStroke.points[index].x),
        y: importedStroke.points[index].y + (point.y - oldStroke.points[index].y)
      }))
    );
    const oldNote = animated.drawings.find(({ id }) => id === 'note-stable')!;
    const importedNote = importMap(edited).drawings.find(({ id }) => id === 'note-stable')!;
    const delta = importedNote.poses[0].x - oldNote.source!.origin!.x;
    const synchronizedNote = synchronized.drawings.find(({ id }) => id === 'note-stable')!;
    expect(synchronizedNote.poses.map(({ x }) => x)).toEqual(
      oldNote.poses.map(({ x }) => x + delta)
    );
  });

  it('rebases authored animation through the Canvas-to-scene fit scale', () => {
    const source = canvas();
    const initial = syncMotionProject(source);
    const priorStroke = initial.drawings.find(({ id }) => id === 'stroke-stable')!;
    const priorNote = initial.drawings.find(({ id }) => id === 'note-stable')!;
    const animated: Project = {
      ...initial,
      drawings: initial.drawings.map((drawing) =>
        drawing.id === 'stroke-stable'
          ? {
              ...drawing,
              poses: [
                drawing.poses[0],
                {
                  ...drawing.poses[0],
                  time: 1,
                  x: 100,
                  scaleX: 2,
                  points: drawing.points.map(({ x, y }) => ({ x: x + 50, y: y - 20 }))
                }
              ]
            }
          : drawing.id === 'note-stable'
            ? {
                ...drawing,
                poses: [
                  drawing.poses[0],
                  { ...drawing.poses[0], time: 1, x: drawing.poses[0].x + 100 }
                ]
              }
            : drawing
      )
    };
    const expanded: CanvasDocument = {
      ...source,
      objects: [
        ...source.objects,
        {
          id: 'far-object',
          kind: 'rectangle',
          createdAt: '2026-09-10T00:00:00.000Z',
          color: '#282522',
          from: { x: 10_000, y: 0 },
          to: { x: 10_100, y: 100 }
        }
      ]
    };

    const synchronized = syncMotionProject(expanded, animated);
    const nextStroke = synchronized.drawings.find(({ id }) => id === 'stroke-stable')!;
    const nextNote = synchronized.drawings.find(({ id }) => id === 'note-stable')!;
    const ratio = nextStroke.source!.origin!.scaleX / priorStroke.source!.origin!.scaleX;

    expect(ratio).toBeLessThan(1);
    expect(nextStroke.poses[1].x).toBeCloseTo(100 * ratio);
    expect(nextStroke.poses[1].scaleX).toBe(2);
    expect(nextStroke.poses[1].points![0].x - nextStroke.points[0].x).toBeCloseTo(50 * ratio);
    expect(nextStroke.poses[1].points![0].y - nextStroke.points[0].y).toBeCloseTo(-20 * ratio);
    expect(nextNote.poses[1].x - nextNote.source!.origin!.x).toBeCloseTo(
      (animated.drawings.find(({ id }) => id === 'note-stable')!.poses[1].x -
        priorNote.source!.origin!.x) *
        ratio
    );
    expect(() => validateProject(synchronized)).not.toThrow();
  });

  it('bounds dense and wide Canvas strokes for a valid Motion project', () => {
    const source = canvas();
    source.objects = source.objects.map((object) =>
      object.id === 'stroke-stable' && object.kind === 'stroke'
        ? {
            ...object,
            width: 240,
            points: Array.from({ length: 2_501 }, (_, index) => ({ x: index, y: index % 31 }))
          }
        : object
    );

    const motion = syncMotionProject(source);
    const stroke = motion.drawings.find(({ id }) => id === 'stroke-stable')!;

    expect(stroke.points).toHaveLength(LIMITS.points);
    expect(stroke.points[0]).toEqual({ x: 60, y: 60 });
    expect(stroke.points.at(-1)?.x).toBe(1160);
    expect(stroke.weight).toBe(100);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('detaches Canvas provenance when a Motion project is copied', () => {
    const shared = syncMotionProject(canvas());
    const copy = independentProjectCopy(shared, 'independent-copy');

    expect(copy.id).toBe('independent-copy');
    expect(copy.revision).toBe(0);
    expect(copy.drawings.every((drawing) => drawing.source === undefined)).toBe(true);
    expect(copy.drawings.map(({ id }) => id)).toEqual(shared.drawings.map(({ id }) => id));
    expect(() => validateProject(copy)).not.toThrow();
  });

  it('detaches Canvas provenance when a drawing is duplicated for Motion', () => {
    const shared = syncMotionProject(canvas());
    const source = shared.drawings[0];
    const copy = independentDrawingCopy(source, 'motion-copy');

    expect(copy.id).toBe('motion-copy');
    expect(copy.name).toBe(`${source.name} copy`);
    expect(copy.source).toBeUndefined();
    expect(() => validateProject({ ...shared, drawings: [source, copy] })).not.toThrow();
  });

  it('keeps a Motion-specific title while Canvas content is reconciled', () => {
    const source = canvas();
    const existing = { ...syncMotionProject(source), title: 'Motion cut' };

    expect(syncMotionProject({ ...source, title: 'Canvas map' }, existing).title).toBe(
      'Motion cut'
    );
  });

  it('creates a Canvas space with the identity of a Motion-only project', () => {
    const motion = { ...syncMotionProject(canvas()), title: 'Motion-only project' };
    const record = mergeProjectRecord(undefined, { motion });

    expect(canvasSpaceForProject(record)).toMatchObject({
      id: motion.id,
      title: 'Motion-only project',
      objects: []
    });
  });

  it('preserves valid Canvas IDs that include punctuation', () => {
    const source = canvas();
    source.objects = source.objects
      .map((object) => (object.id === 'note-stable' ? { ...object, id: 'approval.step' } : object))
      .filter((object) => object.kind !== 'group');

    const motion = syncMotionProject(source);
    expect(motion.drawings.some(({ id }) => id === 'approval.step')).toBe(true);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('rejects Canvas object IDs that cannot remain stable in Motion', () => {
    const source = canvas();
    source.objects = source.objects
      .map((object) => (object.id === 'note-stable' ? { ...object, id: 'x'.repeat(241) } : object))
      .filter((object) => object.kind !== 'group');

    expect(isDocument(source)).toBe(false);
  });

  it('maps far-panned Canvas vectors into Motion scene coordinates', () => {
    const source = canvas();
    source.objects = source.objects
      .map((object) =>
        object.id === 'stroke-stable' && object.kind === 'stroke'
          ? {
              ...object,
              points: [
                { x: 50_000, y: -70_000 },
                { x: 62_000, y: -64_000 }
              ]
            }
          : object
      )
      .filter((object) => object.kind !== 'group');

    const motion = syncMotionProject(source);
    const stroke = motion.drawings.find(({ id }) => id === 'stroke-stable')!;

    expect(
      Math.max(...stroke.points.flatMap(({ x, y }) => [Math.abs(x), Math.abs(y)]))
    ).toBeLessThan(10_000);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('maps finite coordinates at both numeric extremes without overflow', () => {
    const source = canvas();
    source.objects = source.objects
      .map((object) =>
        object.id === 'stroke-stable' && object.kind === 'stroke'
          ? {
              ...object,
              points: [
                { x: -Number.MAX_VALUE, y: -Number.MAX_VALUE },
                { x: Number.MAX_VALUE, y: Number.MAX_VALUE }
              ]
            }
          : object
      )
      .filter((object) => object.kind !== 'group');

    const motion = syncMotionProject(source);
    const stroke = motion.drawings.find(({ id }) => id === 'stroke-stable')!;

    expect(stroke.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    expect(stroke.source!.origin!.scaleX).toBeGreaterThan(0);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('maps ellipse endpoints at both numeric extremes without overflow', () => {
    const source = canvas();
    source.objects = [
      {
        id: 'ellipse-extremes',
        kind: 'ellipse',
        createdAt: '2026-09-10T00:00:00.000Z',
        from: { x: -Number.MAX_VALUE, y: -Number.MAX_VALUE },
        to: { x: Number.MAX_VALUE, y: Number.MAX_VALUE },
        color: '#282522'
      }
    ];

    const motion = syncMotionProject(source);
    const ellipse = motion.drawings.find(({ id }) => id === 'ellipse-extremes')!;

    expect(ellipse.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('scales an overflowing note extent into valid Motion dimensions', () => {
    const source = canvas();
    source.objects = [
      {
        id: 'note-extreme-size',
        kind: 'note',
        createdAt: '2026-09-10T00:00:00.000Z',
        x: Number.MAX_VALUE,
        y: Number.MAX_VALUE,
        width: Number.MAX_VALUE,
        height: Number.MAX_VALUE,
        text: 'Still representable'
      }
    ];

    const motion = syncMotionProject(source);
    const note = motion.drawings.find(({ id }) => id === 'note-extreme-size')!;

    expect(note.width).toBeLessThanOrEqual(4_096);
    expect(note.height).toBeLessThanOrEqual(4_096);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('fits only Canvas objects that fit beside Motion-only layers', () => {
    const source = canvas();
    source.objects = Array.from({ length: LIMITS.drawings }, (_, index) => ({
      id: `retained-${index}`,
      kind: 'note' as const,
      createdAt: '2026-09-10T00:00:00.000Z',
      x: index * 10,
      y: 0,
      width: 240,
      height: 120,
      text: `Retained ${index}`
    }));
    source.objects.push({
      id: 'omitted-distant',
      kind: 'note',
      createdAt: '2026-09-10T00:00:00.000Z',
      x: Number.MAX_VALUE,
      y: Number.MAX_VALUE,
      width: 240,
      height: 120,
      text: 'Must not affect fit'
    });
    const seed = syncMotionProject(canvas());
    const existing = {
      ...seed,
      drawings: [{ ...seed.drawings[0], id: 'motion-only', source: undefined }]
    };
    const expected = syncMotionProject({ ...source, objects: source.objects.slice(0, LIMITS.drawings - 1) }, existing);
    const actual = syncMotionProject(source, existing);

    expect(actual.drawings.find(({ id }) => id === 'retained-0')).toEqual(
      expected.drawings.find(({ id }) => id === 'retained-0')
    );
    expect(actual.drawings.some(({ id }) => id === 'omitted-distant')).toBe(false);
    expect(() => validateProject(actual)).not.toThrow();
  });

  it('keeps a near-limit Motion project loadable when Canvas layers do not fit', () => {
    const source = canvas();
    source.objects = [{
      id: 'canvas-note-over-budget',
      kind: 'note',
      createdAt: '2026-09-10T00:00:00.000Z',
      x: 0,
      y: 0,
      width: 240,
      height: 120,
      text: 'This Canvas layer must be omitted when Motion has no byte capacity.'
    }];
    const seed = syncMotionProject(canvas());
    const existing = {
      ...seed,
      id: source.id,
      drawings: [{ ...seed.drawings[0], id: 'motion-only', source: undefined }]
    };
    const originalByteLimit = LIMITS.bytes;
    LIMITS.bytes = JSON.stringify({ ...existing, revision: existing.revision + 1 }).length + 10;
    try {
      const synchronized = syncMotionProject(source, existing);
      expect(synchronized.drawings).toEqual(existing.drawings);
      expect(synchronized.drawings.some(({ id }) => id === 'canvas-note-over-budget')).toBe(false);
      expect(() => validateProject(synchronized)).not.toThrow();
    } finally {
      LIMITS.bytes = originalByteLimit;
    }
  });

  it('reserves byte capacity for every retained Canvas animation before applying updates', () => {
    const source = canvas();
    source.objects = [
      {
        id: 'animated-first',
        kind: 'note',
        createdAt: '2026-09-10T00:00:00.000Z',
        x: 0,
        y: 0,
        width: 240,
        height: 120,
        text: 'First'
      },
      {
        id: 'animated-second',
        kind: 'note',
        createdAt: '2026-09-10T00:00:00.000Z',
        x: 300,
        y: 0,
        width: 240,
        height: 120,
        text: 'Second'
      }
    ];
    const existing = syncMotionProject(source);
    const edited = {
      ...source,
      objects: source.objects.map((object) =>
        object.id === 'animated-first' ? { ...object, text: 'x'.repeat(2_000) } : object
      )
    };
    const originalByteLimit = LIMITS.bytes;
    LIMITS.bytes = JSON.stringify({ ...existing, revision: existing.revision + 1 }).length + 100;
    try {
      const synchronized = syncMotionProject(edited, existing);
      expect(synchronized.drawings.map(({ id }) => id).sort()).toEqual([
        'animated-first',
        'animated-second'
      ]);
      expect(synchronized.drawings.find(({ id }) => id === 'animated-first')?.text).toBe('First');
      expect(() => validateProject(synchronized)).not.toThrow();
    } finally {
      LIMITS.bytes = originalByteLimit;
    }
  });

  it('refits retained layers after an over-budget distant Canvas object is omitted', () => {
    const source = canvas();
    source.objects = [{
      id: 'retained-note',
      kind: 'note',
      createdAt: '2026-09-10T00:00:00.000Z',
      x: 0,
      y: 0,
      width: 240,
      height: 120,
      text: 'Retained'
    }];
    const existing = syncMotionProject(source);
    const edited = {
      ...source,
      objects: [
        ...source.objects,
        {
          id: 'distant-over-budget',
          kind: 'note' as const,
          createdAt: '2026-09-10T00:00:00.000Z',
          x: 1_000_000,
          y: 1_000_000,
          width: 240,
          height: 120,
          text: 'x'.repeat(2_000)
        }
      ]
    };
    const originalByteLimit = LIMITS.bytes;
    LIMITS.bytes = JSON.stringify({ ...existing, revision: existing.revision + 1 }).length + 100;
    try {
      const synchronized = syncMotionProject(edited, existing);
      expect(synchronized.drawings.some(({ id }) => id === 'distant-over-budget')).toBe(false);
      expect(synchronized.drawings.find(({ id }) => id === 'retained-note')).toEqual(
        existing.drawings.find(({ id }) => id === 'retained-note')
      );
      expect(() => validateProject(synchronized)).not.toThrow();
    } finally {
      LIMITS.bytes = originalByteLimit;
    }
  });

  it('bounds Canvas text and drawing counts without dropping Motion-only artwork', () => {
    const source = canvas();
    source.title = 'Title '.repeat(100);
    source.objects = Array.from({ length: LIMITS.drawings + 10 }, (_, index) => ({
      id: `note-${index}`,
      kind: 'note' as const,
      createdAt: '2026-09-10T00:00:00.000Z',
      x: index * 10,
      y: 0,
      width: 240,
      height: 120,
      text: 'x'.repeat(2_100)
    }));
    const motionOnly = {
      ...syncMotionProject(canvas()),
      drawings: [
        {
          ...syncMotionProject(canvas()).drawings[0],
          id: 'motion-only',
          source: undefined
        }
      ]
    };

    const motion = syncMotionProject(source, motionOnly);

    expect(motion.title).toBe(motionOnly.title);
    expect(motion.drawings).toHaveLength(LIMITS.drawings);
    expect(motion.drawings.at(-1)?.id).toBe('motion-only');
    expect(motion.drawings[0].text).toHaveLength(2_000);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('keeps existing Canvas-backed animation when reordered input exceeds the layer limit', () => {
    const source = canvas();
    source.objects = Array.from({ length: LIMITS.drawings }, (_, index) => ({
      id: `note-${index}`,
      kind: 'note' as const,
      createdAt: '2026-09-10T00:00:00.000Z',
      x: index * 10,
      y: 0,
      width: 240,
      height: 120,
      text: `Note ${index}`
    }));
    const initial = syncMotionProject(source);
    const retainedId = `note-${LIMITS.drawings - 1}`;
    const existing = {
      ...initial,
      drawings: initial.drawings.map((drawing) =>
        drawing.id === retainedId
          ? { ...drawing, poses: [...drawing.poses, { ...drawing.poses[0], time: 1, x: 900 }] }
          : drawing
      )
    };
    const prepended: CanvasDocument = {
      ...source,
      objects: [
        {
          id: 'new-first',
          kind: 'note',
          createdAt: '2026-09-10T00:00:00.000Z',
          x: -100,
          y: 0,
          width: 240,
          height: 120,
          text: 'New first note'
        },
        ...source.objects
      ]
    };

    const synchronized = syncMotionProject(prepended, existing);
    const retained = synchronized.drawings.find(({ id }) => id === retainedId);

    expect(synchronized.drawings).toHaveLength(LIMITS.drawings);
    expect(retained?.poses).toHaveLength(2);
    expect(retained?.poses.at(-1)?.time).toBe(1);
    expect(retained?.poses.at(-1)?.x).not.toBe(retained?.poses[0].x);
    expect(synchronized.drawings.some(({ id }) => id === 'new-first')).toBe(false);
    expect(() => validateProject(synchronized)).not.toThrow();
  });

  it('preserves Motion-only artwork when Canvas introduces the same object ID', () => {
    const source = canvas();
    const initial = syncMotionProject(source);
    const priorStroke = initial.drawings.find(({ id }) => id === 'stroke-stable')!;
    const existing: Project = {
      ...initial,
      drawings: [
        { ...priorStroke, source: undefined, poses: [...priorStroke.poses, basePose(1)] },
        ...initial.drawings.filter(({ id }) => id !== 'stroke-stable')
      ]
    };

    const synchronized = syncMotionProject(source, existing);
    const canvasStroke = synchronized.drawings.find(({ id }) => id === 'stroke-stable')!;
    const retainedMotion = synchronized.drawings.find(
      (drawing) => drawing.id !== 'stroke-stable' && drawing.name === priorStroke.name
    )!;

    expect(canvasStroke.source?.objectId).toBe('stroke-stable');
    expect(retainedMotion.source).toBeUndefined();
    expect(retainedMotion.poses).toEqual(existing.drawings[0].poses);
    expect(synchronized.drawings).toHaveLength(existing.drawings.length + 1);
    expect(() => validateProject(synchronized)).not.toThrow();
  });

  it('bounds transforms and point overrides when Canvas geometry rebases animation', () => {
    const source = canvas();
    const initial = syncMotionProject(source);
    const animated: Project = {
      ...initial,
      drawings: initial.drawings.map((drawing) => ({
        ...drawing,
        poses: [
          ...drawing.poses,
          {
            ...drawing.poses[0],
            time: 1,
            x: 9_950,
            scaleX: 100,
            points:
              drawing.kind === 'stroke'
                ? drawing.points.map(() => ({ x: 9_990, y: -9_990 }))
                : undefined
          }
        ]
      }))
    };
    const moved = {
      ...source,
      objects: source.objects.map((object) =>
        object.kind === 'note' ? { ...object, x: object.x + 500 } : object
      )
    };

    const synchronized = syncMotionProject(moved, animated);

    expect(
      synchronized.drawings.every((drawing) =>
        drawing.poses.every(
          (pose) =>
            Math.abs(pose.x) <= 10_000 &&
            Math.abs(pose.y) <= 10_000 &&
            pose.scaleX <= 100 &&
            pose.scaleY <= 100
        )
      )
    ).toBe(true);
    expect(
      synchronized.drawings
        .flatMap((drawing) => drawing.poses.flatMap((pose) => pose.points ?? []))
        .every(({ x, y }) => Math.abs(x) <= 10_000 && Math.abs(y) <= 10_000)
    ).toBe(true);
    expect(() => validateProject(synchronized)).not.toThrow();
  });

  it('preserves and validates a bounded Canvas project ID with URL punctuation', () => {
    const source = { ...canvas(), id: 'project.v1 & review' };
    const motion = syncMotionProject(source);

    expect(motion.id).toBe(source.id);
    expect(() => validateProject(motion)).not.toThrow();
  });

  it('merges Canvas and Motion writes without replacing the other space', () => {
    const source = canvas();
    const motion = syncMotionProject(source);
    const canvasRecord = mergeProjectRecord(undefined, { canvas: source });
    const complete = mergeProjectRecord(canvasRecord, { motion });
    const renamed = { ...source, title: 'Renamed in Canvas' };
    const afterCanvasWrite = mergeProjectRecord(complete, { canvas: renamed });

    expect(afterCanvasWrite.id).toBe(source.id);
    expect(afterCanvasWrite.canvas?.title).toBe('Renamed in Canvas');
    expect(afterCanvasWrite.motion).toEqual(motion);
    expect(afterCanvasWrite).toMatchObject({
      version: 'draw.project.v1'
    } satisfies Partial<DrawProjectRecord>);
  });
});
