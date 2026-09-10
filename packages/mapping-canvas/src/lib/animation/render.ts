import {
  evaluateCamera,
  sceneToScreen,
  boiledPoints,
  variationIndex,
  type Flipbook,
  evaluate,
  type Asset,
  type Drawing,
  type Point,
  type Project
} from './model';
export function toWorld(point: Point, pose: ReturnType<typeof evaluate>): Point {
  const r = (pose.rotation * Math.PI) / 180,
    x = point.x * pose.scaleX,
    y = point.y * pose.scaleY;
  return {
    x: pose.x + x * Math.cos(r) - y * Math.sin(r),
    y: pose.y + x * Math.sin(r) + y * Math.cos(r)
  };
}
export function toLocal(point: Point, pose: ReturnType<typeof evaluate>): Point {
  const r = (-pose.rotation * Math.PI) / 180,
    x = point.x - pose.x,
    y = point.y - pose.y;
  return {
    x: (x * Math.cos(r) - y * Math.sin(r)) / pose.scaleX,
    y: (x * Math.sin(r) + y * Math.cos(r)) / pose.scaleY
  };
}
type Cell = { x: number; y: number; width: number; height: number };
export class Renderer {
  private cells = new Map<string, Cell[]>();
  private images = new Map<string, { data: string; image: HTMLImageElement }>();
  fork(): Renderer {
    const next = new Renderer();
    next.images = new Map(this.images);
    next.cells = new Map(this.cells);
    return next;
  }
  async prepare(assets: Asset[]) {
    const active = new Set(assets.map((a) => a.id));
    for (const key of this.images.keys())
      if (!active.has(key)) {
        this.images.delete(key);
        for (const cellKey of this.cells.keys())
          if (cellKey.startsWith(`${key}:`)) this.cells.delete(cellKey);
      }
    await Promise.all(
      assets.map(async (a) => {
        const cached = this.images.get(a.id);
        if (
          cached?.data === a.data &&
          cached.image.naturalWidth === a.width &&
          cached.image.naturalHeight === a.height
        )
          return;
        const image = new Image();
        image.src = a.data;
        await image.decode();
        if (
          image.naturalWidth > 4096 ||
          image.naturalHeight > 4096 ||
          image.naturalWidth !== a.width ||
          image.naturalHeight !== a.height
        )
          throw new Error(`Image dimensions do not match asset: ${a.name}`);
        for (const key of this.cells.keys()) if (key.startsWith(`${a.id}:`)) this.cells.delete(key);
        this.images.set(a.id, { data: a.data, image });
      })
    );
  }
  paint(
    ctx: CanvasRenderingContext2D,
    p: Project,
    time: number,
    options: { ghosts?: number; selected?: string; points?: boolean } = {}
  ) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(ctx.canvas.width / p.width, ctx.canvas.height / p.height);
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, p.width, p.height);
    const ghosts = Math.min(3, options.ghosts ?? 0);
    for (let i = ghosts; i >= 1; i--) {
      for (const offset of [-i, i]) {
        const t = time + offset / p.fps;
        if (t >= 0 && t <= p.duration)
          for (const d of p.drawings)
            if (
              d.kind !== 'text' &&
              d.poses.length > 1 &&
              (!options.selected || d.id === options.selected)
            )
              this.draw(ctx, d, t, 0.2 / i, p, time, offset < 0 ? '#b74d51' : '#398f86');
      }
    }
    for (const d of p.drawings) if (d.space !== 'screen') this.draw(ctx, d, time, 1, p, time);
    for (const d of p.drawings) if (d.space === 'screen') this.draw(ctx, d, time, 1, p, time);
    const selected = p.drawings.find((d) => d.id === options.selected);
    if (selected) {
      const k = evaluate(selected, time);
      ctx.strokeStyle = '#3874c9';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      const pts =
        selected.kind === 'stroke'
          ? k.points
          : [
              { x: 0, y: 0 },
              { x: selected.width, y: 0 },
              { x: selected.width, y: selected.height },
              { x: 0, y: selected.height }
            ];
      const world = pts.map((pt) => {
          const w = toWorld(pt, k);
          return selected.space === 'screen' ? w : sceneToScreen(w, p, time);
        }),
        xs = world.map((pt) => pt.x),
        ys = world.map((pt) => pt.y);
      const x = Math.min(...xs),
        y = Math.min(...ys),
        w = Math.max(...xs) - x,
        h = Math.max(...ys) - y;
      ctx.strokeRect(x - 8, y - 8, w + 16, h + 16);
      ctx.setLineDash([]);
      if (options.points && selected.kind === 'stroke')
        for (const pt of world) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.stroke();
        }
    }
  }
  /** Decode and register sheet cells once, never per animation frame. */
  private sheetCells(id: string, image: HTMLImageElement, f: Flipbook): Cell[] {
    const key = `${id}:${f.columns}:${f.rows}:${f.frames}:${f.registration}`;
    const cached = this.cells.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    let pixels: Uint8ClampedArray | undefined;
    if (f.registration === 'alpha') {
      ctx.drawImage(image, 0, 0);
      pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const cells: Cell[] = [];
    for (let i = 0; i < f.frames; i++) {
      const col = i % f.columns,
        row = Math.floor(i / f.columns),
        x = Math.floor((col * canvas.width) / f.columns),
        y = Math.floor((row * canvas.height) / f.rows),
        right = Math.floor(((col + 1) * canvas.width) / f.columns),
        bottom = Math.floor(((row + 1) * canvas.height) / f.rows);
      let left = right,
        top = bottom,
        maxX = x - 1,
        maxY = y - 1;
      if (pixels)
        for (let py = y; py < bottom; py++)
          for (let px = x; px < right; px++)
            if (pixels[(py * canvas.width + px) * 4 + 3] > 32) {
              left = Math.min(left, px);
              top = Math.min(top, py);
              maxX = Math.max(maxX, px);
              maxY = Math.max(maxY, py);
            }
      cells.push(
        pixels && maxX >= left
          ? { x: left, y: top, width: maxX - left + 1, height: maxY - top + 1 }
          : { x, y, width: right - x, height: bottom - y }
      );
    }
    this.cells.set(key, cells);
    return cells;
  }
  private draw(
    ctx: CanvasRenderingContext2D,
    d: Drawing,
    time: number,
    alpha: number,
    project: Project,
    cameraTime: number,
    tint?: string
  ) {
    const k = evaluate(d, time);
    ctx.save();
    if (d.space !== 'screen') {
      const c = evaluateCamera(project, cameraTime);
      ctx.translate(project.width / 2, project.height / 2);
      ctx.scale(c.zoom, c.zoom);
      ctx.translate(-c.x, -c.y);
    }
    ctx.globalAlpha = k.opacity * alpha;
    ctx.translate(k.x, k.y);
    ctx.rotate((k.rotation * Math.PI) / 180);
    ctx.scale(k.scaleX, k.scaleY);
    ctx.strokeStyle = tint ?? d.color;
    ctx.fillStyle = tint ?? d.color;
    ctx.lineWidth = d.weight;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (d.kind === 'stroke') {
      const points = boiledPoints(k.points, d.boil, time);
      let total = 0;
      for (let i = 1; i < points.length; i++)
        total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      let remaining = total * k.reveal;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length && remaining > 0; i++) {
        const a = points[i - 1],
          b = points[i],
          length = Math.hypot(b.x - a.x, b.y - a.y),
          t = length ? Math.min(1, remaining / length) : 1;
        ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        remaining -= length;
      }
      ctx.stroke();
    } else if (d.kind === 'image') {
      const img = this.images.get(d.assetId ?? '')?.image;
      if (img) {
        ctx.beginPath();
        ctx.rect(0, 0, d.width * k.reveal, d.height);
        ctx.clip();
        if (d.flipbook) {
          const cells = this.sheetCells(d.assetId!, img, d.flipbook),
            cell = cells[variationIndex(d.flipbook, time)];
          ctx.drawImage(img, cell.x, cell.y, cell.width, cell.height, 0, 0, d.width, d.height);
        } else ctx.drawImage(img, 0, 0, d.width, d.height);
      }
    } else {
      ctx.font = `${d.weight}px sans-serif`;
      ctx.textBaseline = 'top';
      d.text.split('\n').forEach((line, i) => ctx.fillText(line, 0, i * d.weight * 1.3, d.width));
    }
    ctx.restore();
  }
}
export async function importImage(file: File): Promise<Asset> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6_000_000)
    throw new Error('Choose a PNG, JPEG or WebP up to 6 MB.');
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Image read failed.'));
    r.readAsDataURL(file);
  });
  const img = new Image();
  img.src = data;
  await img.decode();
  if (img.width > 4096 || img.height > 4096)
    throw new Error('Image dimensions must be at most 4096 × 4096.');
  return {
    id: crypto.randomUUID(),
    name: file.name,
    data,
    width: img.naturalWidth,
    height: img.naturalHeight,
    provenance: { source: 'import', createdAt: new Date().toISOString() }
  };
}
