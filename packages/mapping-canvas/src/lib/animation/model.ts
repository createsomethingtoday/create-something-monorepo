/** Animation owns a separate document: old mapping drafts are never migrated in place. */
export type Point = { x: number; y: number };
export type Easing = 'linear' | 'ease' | 'hold';
export type Pose = {
  time: number;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  reveal: number;
  easing: Easing;
  points?: Point[];
};
export type Asset = {
  id: string;
  name: string;
  data: string;
  width: number;
  height: number;
  provenance?: {
    source: 'codex-imagegen' | 'import';
    prompt?: string;
    model?: string;
    createdAt: string;
  };
};
export type CameraPose = { time: number; x: number; y: number; zoom: number; easing: Easing };
export type Boil = { amplitude: number; fps: number; seed: number };
export type Flipbook = {
  columns: number;
  rows: number;
  frames: number;
  fps: number;
  seed: number;
  registration: 'cell' | 'alpha';
};
export type Drawing = {
  space?: 'world' | 'screen';
  boil?: Boil;
  flipbook?: Flipbook;
  id: string;
  name: string;
  kind: 'stroke' | 'image' | 'text';
  points: Point[];
  color: string;
  weight: number;
  text: string;
  assetId?: string;
  width: number;
  height: number;
  poses: Pose[];
};
export type Project = {
  version: 'draw.animation.v1';
  camera?: CameraPose[];
  id: string;
  revision: number;
  title: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  background: string;
  assets: Asset[];
  drawings: Drawing[];
};
export const LIMITS = {
  bytes: 40_000_000,
  assetCharacters: 8_000_000,
  assets: 32,
  drawings: 250,
  poses: 120,
  points: 1000
};
export const makeId = () => crypto.randomUUID();
export const basePose = (time = 0): Pose => ({
  time,
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  reveal: 1,
  easing: 'ease'
});
export const newProject = (): Project => ({
  version: 'draw.animation.v1',
  id: makeId(),
  revision: 0,
  title: 'Untitled animation',
  width: 1280,
  height: 720,
  duration: 5,
  fps: 24,
  background: '#eee5d4',
  assets: [],
  drawings: []
});
const finite = (x: unknown, min: number, max: number) =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const string = (x: unknown, max: number) => typeof x === 'string' && x.length <= max;
const id = (x: unknown) => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(x);
const keys = (x: object, allowed: string[]) => Object.keys(x).every((k) => allowed.includes(k));
const color = (x: unknown) => typeof x === 'string' && /^#[\da-f]{6}$/i.test(x);
const points = (x: unknown) =>
  Array.isArray(x) &&
  x.length <= LIMITS.points &&
  x.every(
    (p) => p && keys(p, ['x', 'y']) && finite(p.x, -10000, 10000) && finite(p.y, -10000, 10000)
  );
export function validateProject(value: unknown): asserts value is Project {
  const p = value as Project;
  if (
    !p ||
    !keys(p, [
      'version',
      'camera',
      'id',
      'revision',
      'title',
      'width',
      'height',
      'duration',
      'fps',
      'background',
      'assets',
      'drawings'
    ]) ||
    p.version !== 'draw.animation.v1' ||
    !id(p.id) ||
    !Number.isSafeInteger(p.revision) ||
    p.revision < 0 ||
    !string(p.title, 240) ||
    !finite(p.width, 64, 1920) ||
    !finite(p.height, 64, 1920) ||
    !Number.isInteger(p.width) ||
    !Number.isInteger(p.height) ||
    !finite(p.duration, 0.1, 120) ||
    !Number.isInteger(p.fps) ||
    !finite(p.fps, 1, 60) ||
    !color(p.background) ||
    !Array.isArray(p.assets) ||
    p.assets.length > LIMITS.assets ||
    !Array.isArray(p.drawings) ||
    p.drawings.length > LIMITS.drawings
  )
    throw new Error('Invalid animation project or project limits exceeded.');
  if (p.camera !== undefined) {
    if (!Array.isArray(p.camera) || !p.camera.length || p.camera.length > LIMITS.poses)
      throw new Error('Invalid camera track.');
    let prior = -1;
    for (const k of p.camera) {
      if (
        !k ||
        !keys(k, ['time', 'x', 'y', 'zoom', 'easing']) ||
        !finite(k.time, 0, p.duration) ||
        k.time <= prior ||
        !finite(k.x, -10000, 10000) ||
        !finite(k.y, -10000, 10000) ||
        !finite(k.zoom, 0.25, 4) ||
        !['linear', 'ease', 'hold'].includes(k.easing)
      )
        throw new Error('Invalid camera pose.');
      prior = k.time;
    }
  }
  const ids = new Set<string>();
  for (const a of p.assets) {
    if (
      !a ||
      !keys(a, ['id', 'name', 'data', 'width', 'height', 'provenance']) ||
      !id(a.id) ||
      ids.has(a.id) ||
      !string(a.name, 240) ||
      !finite(a.width, 1, 4096) ||
      !finite(a.height, 1, 4096) ||
      typeof a.data !== 'string' ||
      a.data.length > LIMITS.assetCharacters ||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(a.data)
    )
      throw new Error('Invalid image asset. Use a bounded embedded PNG, JPEG or WebP.');
    if (
      a.provenance &&
      (!keys(a.provenance, ['source', 'prompt', 'model', 'createdAt']) ||
        !['codex-imagegen', 'import'].includes(a.provenance.source) ||
        !string(a.provenance.createdAt, 80) ||
        !Number.isFinite(Date.parse(a.provenance.createdAt)) ||
        (a.provenance.prompt !== undefined && !string(a.provenance.prompt, 8000)) ||
        (a.provenance.model !== undefined && !string(a.provenance.model, 120)))
    )
      throw new Error('Invalid asset provenance.');
    ids.add(a.id);
  }
  const drawingIds = new Set<string>();
  for (const d of p.drawings) {
    if (
      !d ||
      !keys(d, [
        'id',
        'name',
        'kind',
        'points',
        'color',
        'weight',
        'text',
        'assetId',
        'width',
        'height',
        'poses',
        'space',
        'boil',
        'flipbook'
      ]) ||
      !id(d.id) ||
      drawingIds.has(d.id) ||
      !string(d.name, 240) ||
      !['stroke', 'image', 'text'].includes(d.kind) ||
      !points(d.points) ||
      !color(d.color) ||
      !finite(d.weight, 0.1, 100) ||
      !string(d.text, 2000) ||
      !finite(d.width, 1, 4096) ||
      !finite(d.height, 1, 4096) ||
      !Array.isArray(d.poses) ||
      !d.poses.length ||
      d.poses.length > LIMITS.poses ||
      (d.kind === 'image' && !ids.has(d.assetId ?? '')) ||
      (d.kind === 'stroke' && d.points.length < 2)
    )
      throw new Error('Invalid drawing, asset reference or drawing limits.');
    if (d.space !== undefined && !['world', 'screen'].includes(d.space))
      throw new Error('Invalid drawing space.');
    if (
      d.boil !== undefined &&
      (d.kind !== 'stroke' ||
        !d.boil ||
        !keys(d.boil, ['amplitude', 'fps', 'seed']) ||
        !finite(d.boil.amplitude, 0, 5) ||
        !finite(d.boil.fps, 1, 24) ||
        !Number.isInteger(d.boil.seed) ||
        !finite(d.boil.seed, 0, 65535))
    )
      throw new Error('Invalid line boil.');
    if (d.flipbook !== undefined) {
      const f = d.flipbook;
      if (
        d.kind !== 'image' ||
        !f ||
        !keys(f, ['columns', 'rows', 'frames', 'fps', 'seed', 'registration']) ||
        ![f.columns, f.rows, f.frames, f.seed].every(Number.isInteger) ||
        !finite(f.columns, 1, 8) ||
        !finite(f.rows, 1, 8) ||
        !finite(f.frames, 1, 16) ||
        f.frames > f.columns * f.rows ||
        !finite(f.fps, 1, 24) ||
        !finite(f.seed, 0, 65535) ||
        !['cell', 'alpha'].includes(f.registration)
      )
        throw new Error('Invalid image variation sheet.');
      const asset = p.assets.find((a) => a.id === d.assetId)!;
      if (asset.width / f.columns < 8 || asset.height / f.rows < 8)
        throw new Error('Variation cells are too small.');
    }
    drawingIds.add(d.id);
    let prior = -1;
    for (const k of d.poses) {
      if (
        !k ||
        !keys(k, [
          'time',
          'x',
          'y',
          'rotation',
          'scaleX',
          'scaleY',
          'opacity',
          'reveal',
          'easing',
          'points'
        ]) ||
        !finite(k.time, 0, p.duration) ||
        k.time <= prior ||
        !finite(k.x, -10000, 10000) ||
        !finite(k.y, -10000, 10000) ||
        !finite(k.rotation, -36000, 36000) ||
        !finite(k.scaleX, 0.01, 100) ||
        !finite(k.scaleY, 0.01, 100) ||
        !finite(k.opacity, 0, 1) ||
        !finite(k.reveal, 0, 1) ||
        !['linear', 'ease', 'hold'].includes(k.easing) ||
        (k.points !== undefined && (!points(k.points) || k.points.length !== d.points.length))
      )
        throw new Error(
          'Invalid key pose. Times must be ordered and point correspondence must be preserved.'
        );
      prior = k.time;
    }
  }
  if (JSON.stringify(p).length > LIMITS.bytes) throw new Error('Animation project exceeds 40 MB.');
}
export function parseProject(text: string): Project {
  if (text.length > LIMITS.bytes) throw new Error('Animation project exceeds 40 MB.');
  const project: unknown = JSON.parse(text);
  validateProject(project);
  return project;
}
/** Cubic Bezier timing (0.42,0,0.58,1), solved in x so this is not just a cubic y shortcut. */
export function timing(t: number, easing: Easing): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (easing === 'hold') return 0;
  if (easing === 'linear') return t;
  const bezier = (u: number, a: number, b: number) =>
    3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, 0.42, 0.58) < t) lo = mid;
    else hi = mid;
  }
  return bezier((lo + hi) / 2, 0, 1);
}
export function evaluate(d: Drawing, time: number): Pose & { points: Point[] } {
  const keys = d.poses;
  let a = keys[0],
    b = a;
  for (let i = 1; i < keys.length; i++) {
    b = keys[i];
    if (time < b.time) break;
    a = b;
  }
  if (time <= a.time || a === b) return { ...a, points: a.points ?? d.points };
  const t = timing((time - a.time) / (b.time - a.time), a.easing),
    mix = (x: number, y: number) => x + (y - x) * t;
  const ap = a.points ?? d.points,
    bp = b.points ?? d.points;
  return {
    time,
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    rotation: mix(a.rotation, b.rotation),
    scaleX: mix(a.scaleX, b.scaleX),
    scaleY: mix(a.scaleY, b.scaleY),
    opacity: mix(a.opacity, b.opacity),
    reveal: mix(a.reveal, b.reveal),
    easing: a.easing,
    points: ap.map((p, i) => ({ x: mix(p.x, bp[i].x), y: mix(p.y, bp[i].y) }))
  };
}
export function putPose(d: Drawing, pose: Pose): Drawing {
  return {
    ...d,
    poses: [...d.poses.filter((k) => Math.abs(k.time - pose.time) > 0.000001), pose].sort(
      (a, b) => a.time - b.time
    )
  };
}
export type Operation =
  | { type: 'put_drawing'; drawing: Drawing }
  | { type: 'put_asset'; asset: Asset }
  | { type: 'set_camera'; poses: CameraPose[] }
  | { type: 'put_pose'; id: string; pose: Pose }
  | { type: 'remove_drawing'; id: string }
  | { type: 'remove_pose'; id: string; time: number }
  | {
      type: 'settings';
      title?: string;
      duration?: number;
      fps?: number;
      background?: string;
      width?: number;
      height?: number;
    };
export function applyOperations(
  p: Project,
  operations: Operation[],
  expectedRevision: number
): Project {
  if (p.revision !== expectedRevision)
    throw new Error('Stale animation revision. Inspect again before retrying.');
  if (!Array.isArray(operations) || !operations.length || operations.length > 100)
    throw new Error('Use 1–100 operations.');
  let next = { ...p };
  for (const op of operations) {
    if (op.type === 'set_camera') next = { ...next, camera: op.poses };
    else if (op.type === 'put_asset')
      next = { ...next, assets: [...next.assets.filter((a) => a.id !== op.asset.id), op.asset] };
    else if (op.type === 'put_drawing') {
      const i = next.drawings.findIndex((d) => d.id === op.drawing.id);
      next = {
        ...next,
        drawings:
          i < 0
            ? [...next.drawings, op.drawing]
            : next.drawings.map((d, j) => (j === i ? op.drawing : d))
      };
    } else if (
      op.type === 'put_pose' ||
      op.type === 'remove_pose' ||
      op.type === 'remove_drawing'
    ) {
      if (!next.drawings.some((d) => d.id === op.id)) throw new Error('Unknown drawing.');
      next = {
        ...next,
        drawings: next.drawings
          .filter((d) => op.type !== 'remove_drawing' || d.id !== op.id)
          .map((d) =>
            d.id !== op.id
              ? d
              : op.type === 'put_pose'
                ? putPose(d, op.pose)
                : op.type === 'remove_pose'
                  ? { ...d, poses: d.poses.filter((k) => k.time !== op.time) }
                  : d
          )
      };
    } else if (op.type === 'settings') {
      const { type, ...settings } = op;
      void type;
      if (
        Object.keys(settings).some(
          (k) => !['title', 'duration', 'fps', 'background', 'width', 'height'].includes(k)
        )
      )
        throw new Error('Unknown setting.');
      next = { ...next, ...settings };
    } else throw new Error('Unknown animation operation.');
  }
  next = { ...next, revision: p.revision + 1 };
  validateProject(next);
  return next;
}

/** Camera is a world-space center with zoom; overlays bypass it. */
export function evaluateCamera(p: Project, time: number): CameraPose {
  const ks = p.camera;
  if (!ks?.length) return { time, x: p.width / 2, y: p.height / 2, zoom: 1, easing: 'linear' };
  let a = ks[0],
    b = a;
  for (let i = 1; i < ks.length; i++) {
    b = ks[i];
    if (time < b.time) break;
    a = b;
  }
  if (time <= a.time || a === b) return { ...a };
  const t = timing((time - a.time) / (b.time - a.time), a.easing);
  return {
    time,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    zoom: a.zoom + (b.zoom - a.zoom) * t,
    easing: a.easing
  };
}
export function sceneToScreen(pt: Point, p: Project, time: number): Point {
  const c = evaluateCamera(p, time);
  return { x: (pt.x - c.x) * c.zoom + p.width / 2, y: (pt.y - c.y) * c.zoom + p.height / 2 };
}
export function screenToScene(pt: Point, p: Project, time: number): Point {
  const c = evaluateCamera(p, time);
  return { x: (pt.x - p.width / 2) / c.zoom + c.x, y: (pt.y - p.height / 2) / c.zoom + c.y };
}
export function variationIndex(f: Flipbook, time: number): number {
  return (Math.floor(Math.max(0, time) * f.fps + 1e-7) + f.seed) % f.frames;
}
/** Three repeatable redraws. Endpoints stay anchored so growing connections meet their targets. */
export function boiledPoints(points: Point[], boil: Boil | undefined, time: number): Point[] {
  if (!boil?.amplitude) return points;
  const phase = Math.floor(Math.max(0, time) * boil.fps + 1e-7) % 3;
  const noise = (i: number) => {
    let n =
      Math.imul(i + 1, 374761393) ^
      Math.imul(boil.seed + 1, 668265263) ^
      Math.imul(phase + 1, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (((n ^ (n >>> 16)) >>> 0) / 4294967295) * 2 - 1;
  };
  const total = points
    .slice(1)
    .reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
  const spacing = Math.max(10, total / 2000);
  const out: Point[] = [points[0]];
  let index = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = Math.hypot(b.x - a.x, b.y - a.y),
      steps = Math.max(1, Math.ceil(length / spacing));
    for (let j = 1; j <= steps; j++) {
      const t = j / steps,
        amount = i === points.length - 1 && j === steps ? 0 : noise(index++) * boil.amplitude;
      if (i === points.length - 1 && j === steps) {
        out.push(b);
        continue;
      }
      out.push({
        x: a.x + (b.x - a.x) * t - ((b.y - a.y) / (length || 1)) * amount,
        y: a.y + (b.y - a.y) * t + ((b.x - a.x) / (length || 1)) * amount
      });
    }
  }
  return out;
}
