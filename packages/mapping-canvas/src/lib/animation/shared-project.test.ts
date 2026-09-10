import { describe, expect, it } from 'vitest';
import { createDocument, type CanvasDocument } from '../document';
import { basePose, independentProjectCopy, LIMITS, validateProject, type Project } from './model';
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
    expect(synchronized.drawings.find(({ id }) => id === 'stroke-stable')?.points[1].x).toBe(210);
    const synchronizedStroke = synchronized.drawings.find(({ id }) => id === 'stroke-stable')!;
    expect(synchronizedStroke.poses.at(-1)?.x).toBe(90);
    expect(synchronizedStroke.poses.at(-1)?.points).toEqual([
      { x: 15, y: 24 },
      { x: 220, y: 128 }
    ]);
    const oldNote = animated.drawings.find(({ id }) => id === 'note-stable')!;
    const importedNote = importMap(edited).drawings.find(({ id }) => id === 'note-stable')!;
    const delta = importedNote.poses[0].x - oldNote.source!.origin!.x;
    const synchronizedNote = synchronized.drawings.find(({ id }) => id === 'note-stable')!;
    expect(synchronizedNote.poses.map(({ x }) => x)).toEqual(
      oldNote.poses.map(({ x }) => x + delta)
    );
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
    expect(stroke.points[0]).toEqual({ x: 0, y: 0 });
    expect(stroke.points.at(-1)).toEqual({ x: 2500, y: 20 });
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

  it('keeps a Motion-specific title while Canvas content is reconciled', () => {
    const source = canvas();
    const existing = { ...syncMotionProject(source), title: 'Motion cut' };

    expect(syncMotionProject({ ...source, title: 'Canvas map' }, existing).title).toBe('Motion cut');
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
