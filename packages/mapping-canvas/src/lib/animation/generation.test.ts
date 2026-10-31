import { describe, it, expect } from 'vitest';
import { basePose, newProject, evaluate } from './model';
import { compileProposal, assertProposalCurrent } from './generation';

describe('motion proposals', () => {
  it('compiles a custom cubic arrow without changing the source project', () => {
    const project = { ...newProject(), duration: 6 };
    const before = structuredClone(project);
    const result = compileProposal(project, {
      version: 'draw.motion-intent.v1', summary: 'A curved arrow moves right.',
      additions: [{ name: 'Arrow', color: '#225588', weight: 4,
        geometry: { type: 'curve', start: { x: 0, y: 0 }, segments: [
          { c1: { x: 50, y: -60 }, c2: { x: 150, y: -60 }, end: { x: 200, y: 0 } }
        ], arrow: true },
        poses: [{ time: 0, x: 100, y: 200 }, { time: 3, x: 400, y: 250 }, { time: 6, x: 700, y: 200 }]
      }], edits: []
    }, [], 'proposal-1');
    expect(project).toEqual(before);
    expect(result.project.drawings[0].points.length).toBeGreaterThan(30);
    expect(evaluate(result.project.drawings[0], 3).x).toBe(400);
    expect(result.operations).toHaveLength(1);
    expect(result.baseRevision).toBe(project.revision);
  });
  const seeded = () => ({ ...newProject(), duration: 6, drawings: [
    { id: 'title', name: 'FLOW', kind: 'text' as const, points: [], text: 'FLOW', color: '#225588', weight: 40, width: 200, height: 60,
      poses: [{ ...basePose(), x: 100, y: 100, opacity: 0 }, { ...basePose(2), x: 100, y: 100 }] },
    { id: 'protected', name: 'Keep', kind: 'text' as const, points: [], text: 'KEEP THIS', color: '#225588', weight: 40, width: 220, height: 60,
      poses: [{ ...basePose(), x: 950, y: 600 }] }
  ] });
  it('changes only the selected timing track and rejects a stale or different project', () => {
    const project = seeded();
    const intent = { version: 'draw.motion-intent.v1', summary: 'Fade over four seconds', additions: [], edits: [
      { id: 'title', poses: [project.drawings[0].poses[0], { ...project.drawings[0].poses[1], time: 4 }] }
    ] };
    const proposal = compileProposal(project, intent, ['title'], 'edit-1');
    expect(proposal.project.drawings[1]).toEqual(project.drawings[1]);
    expect(proposal.project.drawings[0]).toEqual({ ...project.drawings[0], poses: intent.edits[0].poses });
    expect(() => compileProposal(project, intent, [], 'edit-1')).toThrow(/selected/);
    expect(() => assertProposalCurrent(proposal, { ...project, revision: 1 })).toThrow(/changed/);
    expect(() => assertProposalCurrent(proposal, { ...project, id: 'another' })).toThrow(/changed/);
  });
  it('rejects clipped geometry, invalid timing, NaN and discontinuous hold motion atomically', () => {
    const project = seeded(), original = structuredClone(project);
    const intent = { version: 'draw.motion-intent.v1', summary: 'Move', additions: [], edits: [
      { id: 'title', poses: [{ ...basePose(), x: 100, y: 100 }, { ...basePose(4), x: 1100, y: 100 }] }
    ] };
    expect(() => compileProposal(project, intent, ['title'], 'invalid')).toThrow(/frame/);
    intent.edits[0].poses[1].x = 400;
    intent.edits[0].poses[0].easing = 'hold';
    expect(() => compileProposal(project, intent, ['title'], 'invalid')).toThrow(/jump/);
    intent.edits[0].poses[0].easing = 'ease';
    intent.edits[0].poses[1].time = 7;
    expect(() => compileProposal(project, intent, ['title'], 'invalid')).toThrow(/time/);
    intent.edits[0].poses[1].time = 4; intent.edits[0].poses[1].x = NaN;
    expect(() => compileProposal(project, intent, ['title'], 'invalid')).toThrow(/x/);
    expect(project).toEqual(original);
  });
  it('rejects camera clipping between endpoints and silent destructive fields', () => {
    const project = { ...seeded(), camera: [{ time: 0, x: 320, y: 360, zoom: 2, easing: 'ease' as const }, { time: 6, x: 640, y: 360, zoom: 1, easing: 'ease' as const }] };
    const intent = { version: 'draw.motion-intent.v1', summary: 'Move', additions: [], edits: [{ id: 'title', poses: [{ ...basePose(), x: 750, y: 200 }] }] };
    expect(() => compileProposal(project, intent, ['title'], 'camera')).toThrow(/frame/);
    expect(() => compileProposal(project, { ...intent, camera: [] }, ['title'], 'camera')).toThrow(/fields/);
  });
  it('preserves a morph returning to base geometry when an edited key omits points', () => {
    const project = { ...newProject(), drawings: [{ id: 'path', name: 'Morph', kind: 'stroke' as const,
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], text: '', color: '#225588', weight: 4, width: 100, height: 50,
      poses: [{ ...basePose(), x: 100, y: 100, points: [{ x: 0, y: 0 }, { x: 100, y: 50 }] },
        { ...basePose(2), x: 100, y: 100 }] }] };
    const track = [project.drawings[0].poses[0], { ...project.drawings[0].poses[1], time: 3 }];
    const proposal = compileProposal(project, { version: 'draw.motion-intent.v1', summary: 'Retimed morph', additions: [],
      edits: [{ id: 'path', poses: track }] }, ['path'], 'morph');
    expect(evaluate(proposal.project.drawings[0], 3).points).toEqual(project.drawings[0].points);
    expect(proposal.project.drawings[0].poses).toEqual(track);
  });
});
