import { applyOperations, basePose, validateProject, type Drawing, type Operation, type Point, type Pose, type Project } from './model';

export const INTENT_VERSION = 'draw.motion-intent.v1';
export type MotionProposal = {
  projectId: string; baseRevision: number; summary: string;
  operations: Operation[]; project: Project;
};
/** Image pixels never leave the device. Image layers cannot be selected for generated edits. */
export function generationContext(project: Project): Project {
  return { ...project, assets: [], drawings: project.drawings.filter(d => d.kind !== 'image') };
}
type RecordValue = Record<string, unknown>;
function record(value: unknown, fields: string[], label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  const extra = Object.keys(value).filter(key => !fields.includes(key));
  if (extra.length) throw new Error(`Invalid ${label} fields: ${extra.join(', ')}.`);
  return value as RecordValue;
}
function number(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Invalid ${label}.`);
  return value;
}
function text(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${label}.`);
  return value;
}
function list(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Invalid ${label}.`);
  return value;
}
function point(value: unknown): Point {
  const p = record(value, ['x', 'y'], 'point');
  return { x: number(p.x, -4000, 4000, 'point x'), y: number(p.y, -4000, 4000, 'point y') };
}
function points(value: unknown): Point[] { return list(value, 1000, 'points').map(point); }

function geometry(value: unknown): Pick<Drawing, 'kind' | 'points' | 'text' | 'width' | 'height'> {
  const g = record(value, ['type', 'text', 'width', 'points', 'start', 'segments', 'arrow'], 'geometry');
  if (g.type === 'text') {
    record(g, ['type', 'text', 'width'], 'text geometry');
    return { kind: 'text', points: [], text: text(g.text, 500, 'caption'), width: number(g.width, 1, 1920, 'caption width'), height: 100 };
  }
  let path: Point[];
  if (g.type === 'polyline') {
    record(g, ['type', 'points'], 'polyline geometry'); path = points(g.points);
    if (path.length < 2) throw new Error('A path needs at least two points.');
  } else if (g.type === 'curve') {
    record(g, ['type', 'start', 'segments', 'arrow'], 'curve geometry');
    if (g.arrow !== undefined && typeof g.arrow !== 'boolean') throw new Error('Invalid arrow flag.');
    path = [point(g.start)];
    const segments = list(g.segments, 8, 'curve segments');
    if (!segments.length) throw new Error('A curve needs a segment.');
    for (const raw of segments) {
      const s = record(raw, ['c1', 'c2', 'end'], 'curve segment');
      const a = path.at(-1)!, b = point(s.c1), c = point(s.c2), d = point(s.end);
      for (let i = 1; i <= 64; i++) {
        const t = i / 64, u = 1 - t;
        path.push({ x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
          y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y });
      }
    }
    if (g.arrow) {
      const end = path.at(-1)!;
      const before = [...path].reverse().find((p) => Math.hypot(end.x - p.x, end.y - p.y) > 0.01);
      if (!before) throw new Error('An arrow needs a nonzero curve.');
      const angle = Math.atan2(end.y - before.y, end.x - before.x);
      const wing = (side: number) => ({ x: end.x - 18 * Math.cos(angle) + side * 8 * Math.sin(angle), y: end.y - 18 * Math.sin(angle) - side * 8 * Math.cos(angle) });
      path.push(wing(1), end, wing(-1));
    }
  } else throw new Error('Use text, polyline or curve geometry.');
  return { kind: 'stroke', points: path, text: '', width: Math.max(1, Math.max(...path.map(p => p.x)) - Math.min(...path.map(p => p.x))), height: Math.max(1, Math.max(...path.map(p => p.y)) - Math.min(...path.map(p => p.y))) };
}

function poses(value: unknown, duration: number, full: boolean): Pose[] {
  const raw = list(value, 32, 'pose track');
  if (!raw.length) throw new Error('A drawing needs a pose at time zero.');
  let previous = basePose(), priorTime = -1;
  return raw.map((value, index) => {
    const p = record(value, ['time', 'x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity', 'reveal', 'easing', 'points'], 'pose');
    const time = number(p.time, 0, duration, 'pose time');
    if ((index === 0 && time !== 0) || time <= priorTime) throw new Error('Pose times must start at zero and strictly increase.');
    if (full && ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity', 'reveal', 'easing'].some(k => p[k] === undefined))
      throw new Error('Edited tracks require complete poses to preserve the intended motion.');
    // Complete edited keys follow the canonical model: absent points mean base geometry.
    // Only newly generated tracks inherit omitted properties from their preceding key.
    const next: Pose = { ...(full ? basePose() : previous), time };
    for (const [key, min, max] of [['x', -10000, 10000], ['y', -10000, 10000], ['rotation', -3600, 3600], ['scaleX', .01, 20], ['scaleY', .01, 20], ['opacity', 0, 1], ['reveal', 0, 1]] as const)
      if (p[key] !== undefined) next[key] = number(p[key], min, max, key);
    if (p.easing !== undefined) {
      if (!['linear', 'ease', 'hold'].includes(String(p.easing))) throw new Error('Invalid easing.');
      next.easing = p.easing as Pose['easing'];
    }
    if (p.points !== undefined) next.points = points(p.points);
    previous = next; priorTime = time; return next;
  });
}

/** Conservative bounds over all times, not just sampled frames. May reject tight camera moves. */
function verifyMotion(d: Drawing, project: Project) {
  const cameras = project.camera?.length ? project.camera : [{ x: project.width / 2, y: project.height / 2, zoom: 1 }];
  for (let i = 0; i < d.poses.length; i++) {
    const a = d.poses[i], b = d.poses[i + 1] ?? a;
    if (a.easing === 'hold' && ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity', 'reveal', 'points'].some(key => JSON.stringify(a[key as keyof Pose]) !== JSON.stringify(b[key as keyof Pose])))
      throw new Error(`${d.name}: hold would cause a jump. Use equal poses for a delay and ease/linear for motion.`);
    if (!Math.max(a.opacity, b.opacity)) continue;
    const local = d.kind === 'text'
      ? [{ x: 0, y: 0 }, { x: d.width, y: 0 }, { x: 0, y: d.weight * 1.4 * d.text.split('\n').length }, { x: d.width, y: d.weight * 1.4 * d.text.split('\n').length }]
      : d.kind === 'image' ? [{ x: 0, y: 0 }, { x: d.width, y: 0 }, { x: 0, y: d.height }, { x: d.width, y: d.height }]
        : [...(a.points ?? d.points), ...(b.points ?? d.points)];
    const scale = Math.max(a.scaleX, b.scaleX, a.scaleY, b.scaleY);
    const pad = d.kind === 'stroke' ? (d.weight / 2 + (d.boil?.amplitude ?? 0) * 2 + (d.arrowheadScale ?? 0) * 20) * scale : 0;
    let xs: number[], ys: number[];
    if (a.rotation === b.rotation) {
      const angle = a.rotation * Math.PI / 180;
      const all = local.flatMap(p => [a.scaleX, b.scaleX].flatMap(sx => [a.scaleY, b.scaleY].map(sy => ({ x: p.x * sx * Math.cos(angle) - p.y * sy * Math.sin(angle), y: p.x * sx * Math.sin(angle) + p.y * sy * Math.cos(angle) }))));
      xs = all.map(p => p.x); ys = all.map(p => p.y);
    } else {
      const radius = Math.max(...local.map(p => Math.hypot(p.x, p.y))) * scale;
      xs = [-radius, radius]; ys = [-radius, radius];
    }
    const minX = Math.min(a.x, b.x) + Math.min(...xs) - pad, maxX = Math.max(a.x, b.x) + Math.max(...xs) + pad;
    const minY = Math.min(a.y, b.y) + Math.min(...ys) - pad, maxY = Math.max(a.y, b.y) + Math.max(...ys) + pad;
    const screen = d.space === 'screen';
    const zoom = screen ? 1 : Math.max(...cameras.map(c => c.zoom));
    const left = screen ? 0 : Math.max(...cameras.map(c => c.x)) - project.width / (2 * zoom);
    const right = screen ? project.width : Math.min(...cameras.map(c => c.x)) + project.width / (2 * zoom);
    const top = screen ? 0 : Math.max(...cameras.map(c => c.y)) - project.height / (2 * zoom);
    const bottom = screen ? project.height : Math.min(...cameras.map(c => c.y)) + project.height / (2 * zoom);
    if (minX < left || maxX > right || minY < top || maxY > bottom)
      throw new Error(`${d.name}: motion could leave the frame. Keep geometry and motion inside the camera with a margin.`);
  }
}

export function compileProposal(project: Project, input: unknown, editableIds: string[], proposalId: string): MotionProposal {
  validateProject(project);
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(proposalId)) throw new Error('Invalid proposal identity.');
  const intent = record(input, ['version', 'summary', 'additions', 'edits'], 'motion intent');
  if (intent.version !== INTENT_VERSION) throw new Error('Unsupported motion intent version.');
  const summary = text(intent.summary, 600, 'summary');
  const additions = list(intent.additions, 20, 'additions'), edits = list(intent.edits, 20, 'edits');
  if (!additions.length && !edits.length) throw new Error('The proposal contains no changes.');
  if (editableIds.length > 20 || editableIds.some(id => !project.drawings.some(d => d.id === id))) throw new Error('Invalid editable selection.');
  const operations: Operation[] = [], seen = new Set<string>();
  for (let i = 0; i < additions.length; i++) {
    const a = record(additions[i], ['name', 'color', 'weight', 'geometry', 'poses'], 'addition');
    const id = `generated-${proposalId}-${i}`;
    if (project.drawings.some(d => d.id === id)) throw new Error('Proposal identity already exists.');
    const drawing: Drawing = { id, name: text(a.name, 120, 'drawing name'), color: text(a.color, 7, 'color'), weight: number(a.weight, .1, 100, 'weight'), ...geometry(a.geometry), poses: poses(a.poses, project.duration, false) };
    operations.push({ type: 'put_drawing', drawing });
  }
  for (const value of edits) {
    const e = record(value, ['id', 'poses'], 'edit');
    const id = text(e.id, 240, 'drawing id');
    if (!editableIds.includes(id) || seen.has(id)) throw new Error('Only explicitly selected artwork may be edited, once per proposal.');
    seen.add(id);
    const drawing = project.drawings.find(d => d.id === id)!;
    operations.push({ type: 'put_drawing', drawing: { ...drawing, poses: poses(e.poses, project.duration, true) } });
  }
  const next = applyOperations(project, operations, project.revision);
  for (const op of operations) if (op.type === 'put_drawing') verifyMotion(op.drawing, next);
  return { projectId: project.id, baseRevision: project.revision, summary, operations, project: next };
}

export function assertProposalCurrent(proposal: MotionProposal, project: Project) {
  if (proposal.projectId !== project.id || proposal.baseRevision !== project.revision)
    throw new Error('The project changed. Discard this preview and generate again.');
}
