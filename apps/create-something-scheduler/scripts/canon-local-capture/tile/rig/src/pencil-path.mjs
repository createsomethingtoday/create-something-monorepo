/** Flatten SVG centerlines for pencil rendering; null preserves native SVG fallback. */
export function flattenPencilPath(d) {
  if (typeof d !== 'string') return null;
  const tokens = [];
  const pattern = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
  let end = 0;
  for (const match of d.matchAll(pattern)) {
    if (!/^[\s,]*$/.test(d.slice(end, match.index))) return null;
    tokens.push(match[0]);
    end = match.index + match[0].length;
  }
  if (!/^[\s,]*$/.test(d.slice(end))) return null;
  if (!tokens.length) return [];
  const paths = [];
  let i = 0, command = null, current = [0, 0], start = null, path = null;
  let previous = '', cubicControl = null, quadraticControl = null, count = 0;
  const isCommand = value => /^[a-zA-Z]$/.test(value);
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const append = point => {
    if (++count > 65536 || !point.every(Number.isFinite)) throw new Error('Path limit');
    path.points.push(point);
  };
  // Distance to the chord segment also catches collinear curves that double back.
  const distance = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const curve = (points, depth = 0) => {
    if (points.slice(1, -1).every(p => distance(p, points[0], points.at(-1)) <= 0.35)) {
      append(points.at(-1));
      return;
    }
    if (depth >= 16) throw new Error('Curve limit');
    const left = [points[0]], right = [points.at(-1)];
    let level = points;
    while (level.length > 1) {
      level = level.slice(1).map((point, index) => midpoint(level[index], point));
      left.push(level[0]);
      right.unshift(level.at(-1));
    }
    curve(left, depth + 1);
    curve(right, depth + 1);
  };
  try {
    while (i < tokens.length) {
      if (isCommand(tokens[i])) command = tokens[i++];
      else if (!command) return null;
      const upper = command.toUpperCase(), relative = command !== upper;
      if (!'MLHVQCSTZ'.includes(upper)) return null;
      if (!path && upper !== 'M') return null;
      if (upper === 'Z') {
        if (!path || !start) return null;
        path.closed = true;
        current = [...start];
        previous = 'Z'; cubicControl = quadraticControl = null; command = null;
        continue;
      }
      const arity = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, S: 4, T: 2 }[upper];
      if (i + arity > tokens.length || tokens.slice(i, i + arity).some(isCommand)) return null;
      const values = tokens.slice(i, i + arity).map(Number);
      if (!values.every(Number.isFinite)) return null;
      i += arity;
      const point = offset => [values[offset] + (relative ? current[0] : 0), values[offset + 1] + (relative ? current[1] : 0)];
      const reflect = control => [2 * current[0] - control[0], 2 * current[1] - control[1]];
      let next, nextCubic = null, nextQuadratic = null;
      if (upper === 'M') {
        next = point(0);
        path = { points: [], closed: false };
        paths.push(path); start = [...next]; append(next);
        command = relative ? 'l' : 'L';
      } else {
        // Drawing after close starts another contour at the closed contour's origin.
        if (path.closed) {
          path = { points: [], closed: false }; paths.push(path); start = [...current]; append([...current]);
        }
        if (upper === 'H') next = [values[0] + (relative ? current[0] : 0), current[1]];
        else if (upper === 'V') next = [current[0], values[0] + (relative ? current[1] : 0)];
        else next = point(arity - 2);
        if (upper === 'C' || upper === 'S') {
          const c1 = upper === 'C' ? point(0) : ('CS'.includes(previous) && cubicControl ? reflect(cubicControl) : current);
          nextCubic = point(upper === 'C' ? 2 : 0);
          curve([current, c1, nextCubic, next]);
        } else if (upper === 'Q' || upper === 'T') {
          nextQuadratic = upper === 'Q' ? point(0) : ('QT'.includes(previous) && quadraticControl ? reflect(quadraticControl) : current);
          curve([current, nextQuadratic, next]);
        } else append(next);
      }
      current = next; previous = upper; cubicControl = nextCubic; quadraticControl = nextQuadratic;
    }
    return paths;
  } catch {
    return null;
  }
}
