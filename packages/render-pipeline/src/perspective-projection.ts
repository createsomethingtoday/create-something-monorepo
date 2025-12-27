/**
 * Custom Perspective Projection System
 *
 * Pure math perspective projection - no Three.js, no hidden matrices.
 * Every calculation is explicit and auditable.
 *
 * Coordinate system:
 *   X = horizontal (left/right, matches floor plan X)
 *   Y = vertical (up/down, height)
 *   Z = depth (front/back, matches floor plan Y)
 *
 * The tool recedes; geometric truth emerges.
 */

// ============================================================================
// VECTOR MATH UTILITIES
// ============================================================================

export type Vec3 = [number, number, number];

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ============================================================================
// CAMERA AND PROJECTION
// ============================================================================

export interface Camera {
  /** Camera position in world space [x, y, z] */
  position: Vec3;
  /** Point the camera is looking at [x, y, z] */
  target: Vec3;
  /** Field of view in degrees (vertical) */
  fov: number;
  /** Up vector (default: [0, 1, 0]) */
  up?: Vec3;
}

export interface ProjectionConfig {
  /** Screen width in pixels */
  width: number;
  /** Screen height in pixels */
  height: number;
  /** Near clipping plane (default: 0.1) */
  near?: number;
  /** Far clipping plane (default: 1000) */
  far?: number;
}

/**
 * Calculate view matrix basis vectors
 * Returns the right, up, and forward vectors for the camera
 */
export function calculateViewBasis(camera: Camera): {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
} {
  const worldUp = camera.up || [0, 1, 0];

  // Forward vector: from camera to target (normalized)
  const forward = normalize(subtract(camera.target, camera.position));

  // Right vector: perpendicular to forward and world up
  let right = normalize(cross(forward, worldUp));

  // Handle case where forward is parallel to world up
  if (length(right) < 0.001) {
    right = [1, 0, 0]; // Default to X axis
  }

  // Up vector: perpendicular to right and forward
  const up = normalize(cross(right, forward));

  return { right, up, forward };
}

/**
 * Project a 3D world point to 2D screen coordinates
 *
 * @returns [x, y] screen coordinates, or null if point is behind camera
 */
export function projectPoint(
  point: Vec3,
  camera: Camera,
  config: ProjectionConfig
): [number, number] | null {
  const { width, height } = config;
  const near = config.near ?? 0.1;

  // Get camera basis vectors
  const { right, up, forward } = calculateViewBasis(camera);

  // Transform point to camera space
  const relative = subtract(point, camera.position);
  const cameraSpace: Vec3 = [
    dot(relative, right),   // x in camera space (right is positive)
    dot(relative, up),      // y in camera space (up is positive)
    dot(relative, forward)  // z in camera space (forward is positive)
  ];

  // Point behind camera? Don't render
  if (cameraSpace[2] <= near) {
    return null;
  }

  // Perspective projection
  const aspect = width / height;
  const fovRad = (camera.fov * Math.PI) / 180;
  const tanHalfFov = Math.tan(fovRad / 2);

  // Project to normalized device coordinates (-1 to 1)
  const ndcX = cameraSpace[0] / (cameraSpace[2] * tanHalfFov * aspect);
  const ndcY = cameraSpace[1] / (cameraSpace[2] * tanHalfFov);

  // Convert to screen coordinates
  // NDC (-1, -1) = bottom-left, (1, 1) = top-right
  // Screen (0, 0) = top-left, (width, height) = bottom-right
  const screenX = (ndcX + 1) * 0.5 * width;
  const screenY = (1 - ndcY) * 0.5 * height; // Flip Y for screen coords

  return [screenX, screenY];
}

/**
 * Project a line from 3D to 2D, handling clipping
 *
 * @returns Array of [x1, y1, x2, y2] line segments, or empty if fully clipped
 */
export function projectLine(
  p1: Vec3,
  p2: Vec3,
  camera: Camera,
  config: ProjectionConfig
): [number, number, number, number][] {
  const near = config.near ?? 0.1;
  const { forward } = calculateViewBasis(camera);

  // Calculate distances from camera plane
  const d1 = dot(subtract(p1, camera.position), forward);
  const d2 = dot(subtract(p2, camera.position), forward);

  // Both behind camera
  if (d1 <= near && d2 <= near) {
    return [];
  }

  // Both in front - project normally
  if (d1 > near && d2 > near) {
    const s1 = projectPoint(p1, camera, config);
    const s2 = projectPoint(p2, camera, config);
    if (s1 && s2) {
      return [[s1[0], s1[1], s2[0], s2[1]]];
    }
    return [];
  }

  // One in front, one behind - clip to near plane
  const t = (near - d1) / (d2 - d1);
  const clipped: Vec3 = [
    p1[0] + t * (p2[0] - p1[0]),
    p1[1] + t * (p2[1] - p1[1]),
    p1[2] + t * (p2[2] - p1[2])
  ];

  const frontPoint = d1 > near ? p1 : p2;
  const s1 = projectPoint(frontPoint, camera, config);
  const s2 = projectPoint(clipped, camera, config);

  if (s1 && s2) {
    return [[s1[0], s1[1], s2[0], s2[1]]];
  }
  return [];
}

// ============================================================================
// ROOM GEOMETRY
// ============================================================================

export interface RoomGeometry {
  /** Room name */
  name: string;
  /** Room bounds in feet */
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    floorY: number;
    ceilingY: number;
  };
  /** Lines to draw: [start, end, category] */
  edges: Array<{
    start: Vec3;
    end: Vec3;
    category: 'wall' | 'floor' | 'ceiling' | 'window' | 'grid';
  }>;
}

/**
 * Generate room geometry for a rectangular room
 */
export function generateRoomGeometry(
  name: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  ceilingHeight: number,
  options: {
    /** Add floor grid lines (every N feet, 0 = no grid) */
    floorGrid?: number;
    /** Add ceiling grid lines (every N feet, 0 = no grid) */
    ceilingGrid?: number;
    /** South wall (minZ) is glass */
    glassWallSouth?: boolean;
    /** Window sill height */
    windowSill?: number;
    /** Window head height */
    windowHead?: number;
  } = {}
): RoomGeometry {
  const edges: RoomGeometry['edges'] = [];

  const floorY = 0;
  const ceilingY = ceilingHeight;
  const {
    floorGrid = 4,
    ceilingGrid = 6,
    glassWallSouth = false,
    windowSill = 1,
    windowHead = 8
  } = options;

  // Corner vertices
  const corners = {
    // Floor corners
    floorSW: vec3(minX, floorY, minZ),
    floorSE: vec3(maxX, floorY, minZ),
    floorNW: vec3(minX, floorY, maxZ),
    floorNE: vec3(maxX, floorY, maxZ),
    // Ceiling corners
    ceilingSW: vec3(minX, ceilingY, minZ),
    ceilingSE: vec3(maxX, ceilingY, minZ),
    ceilingNW: vec3(minX, ceilingY, maxZ),
    ceilingNE: vec3(maxX, ceilingY, maxZ)
  };

  // Floor perimeter
  edges.push({ start: corners.floorSW, end: corners.floorSE, category: 'floor' });
  edges.push({ start: corners.floorSE, end: corners.floorNE, category: 'floor' });
  edges.push({ start: corners.floorNE, end: corners.floorNW, category: 'floor' });
  edges.push({ start: corners.floorNW, end: corners.floorSW, category: 'floor' });

  // Ceiling perimeter
  edges.push({ start: corners.ceilingSW, end: corners.ceilingSE, category: 'ceiling' });
  edges.push({ start: corners.ceilingSE, end: corners.ceilingNE, category: 'ceiling' });
  edges.push({ start: corners.ceilingNE, end: corners.ceilingNW, category: 'ceiling' });
  edges.push({ start: corners.ceilingNW, end: corners.ceilingSW, category: 'ceiling' });

  // Vertical corner edges (walls)
  edges.push({ start: corners.floorSW, end: corners.ceilingSW, category: 'wall' });
  edges.push({ start: corners.floorSE, end: corners.ceilingSE, category: 'wall' });
  edges.push({ start: corners.floorNW, end: corners.ceilingNW, category: 'wall' });
  edges.push({ start: corners.floorNE, end: corners.ceilingNE, category: 'wall' });

  // Floor grid
  if (floorGrid > 0) {
    // Lines parallel to X axis
    for (let z = minZ + floorGrid; z < maxZ; z += floorGrid) {
      edges.push({
        start: vec3(minX, floorY, z),
        end: vec3(maxX, floorY, z),
        category: 'grid'
      });
    }
    // Lines parallel to Z axis
    for (let x = minX + floorGrid; x < maxX; x += floorGrid) {
      edges.push({
        start: vec3(x, floorY, minZ),
        end: vec3(x, floorY, maxZ),
        category: 'grid'
      });
    }
  }

  // Ceiling grid (beams)
  if (ceilingGrid > 0) {
    for (let x = minX + ceilingGrid; x < maxX; x += ceilingGrid) {
      edges.push({
        start: vec3(x, ceilingY, minZ),
        end: vec3(x, ceilingY, maxZ),
        category: 'grid'
      });
    }
  }

  // Glass wall with window frame (south wall at minZ)
  if (glassWallSouth) {
    // Window frame horizontal lines
    edges.push({
      start: vec3(minX, windowSill, minZ),
      end: vec3(maxX, windowSill, minZ),
      category: 'window'
    });
    edges.push({
      start: vec3(minX, windowHead, minZ),
      end: vec3(maxX, windowHead, minZ),
      category: 'window'
    });

    // Mullions (vertical dividers every 4 feet)
    for (let x = minX; x <= maxX; x += 4) {
      edges.push({
        start: vec3(x, windowSill, minZ),
        end: vec3(x, windowHead, minZ),
        category: 'window'
      });
    }

    // Transom (horizontal divider at 70% of window height)
    const transomY = windowSill + (windowHead - windowSill) * 0.7;
    edges.push({
      start: vec3(minX, transomY, minZ),
      end: vec3(maxX, transomY, minZ),
      category: 'window'
    });
  }

  return {
    name,
    bounds: { minX, maxX, minZ, maxZ, floorY, ceilingY },
    edges
  };
}

// ============================================================================
// SVG GENERATION
// ============================================================================

export interface SvgRenderOptions {
  /** Background color */
  backgroundColor?: string;
  /** Line colors by category */
  colors?: {
    wall?: string;
    floor?: string;
    ceiling?: string;
    window?: string;
    grid?: string;
  };
  /** Line widths by category */
  lineWidths?: {
    wall?: number;
    floor?: number;
    ceiling?: number;
    window?: number;
    grid?: number;
  };
}

type EdgeCategory = 'wall' | 'floor' | 'ceiling' | 'window' | 'grid';

const DEFAULT_COLORS: Record<EdgeCategory, string> = {
  wall: '#000000',
  floor: '#444444',
  ceiling: '#666666',
  window: '#0066cc',
  grid: '#888888'
};

const DEFAULT_LINE_WIDTHS: Record<EdgeCategory, number> = {
  wall: 2,
  floor: 1.5,
  ceiling: 1,
  window: 1,
  grid: 0.5
};

/**
 * Render room geometry to SVG string
 */
export function renderToSvg(
  geometry: RoomGeometry,
  camera: Camera,
  config: ProjectionConfig,
  options: SvgRenderOptions = {}
): string {
  const { width, height } = config;
  const backgroundColor = options.backgroundColor ?? '#ffffff';
  const colors = { ...DEFAULT_COLORS, ...options.colors };
  const lineWidths = { ...DEFAULT_LINE_WIDTHS, ...options.lineWidths };

  // Group lines by category for efficient SVG generation
  const linesByCategory: Record<EdgeCategory, [number, number, number, number][]> = {
    grid: [],
    floor: [],
    ceiling: [],
    window: [],
    wall: []
  };

  // Project all edges
  for (const edge of geometry.edges) {
    const segments = projectLine(edge.start, edge.end, camera, config);
    for (const seg of segments) {
      linesByCategory[edge.category].push(seg);
    }
  }

  // Build SVG
  const svgParts: string[] = [
    `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    `  <rect width="100%" height="100%" fill="${backgroundColor}"/>`
  ];

  // Render order: grid first (back), then floor, ceiling, window, wall (front)
  const renderOrder: EdgeCategory[] = [
    'grid',
    'floor',
    'ceiling',
    'window',
    'wall'
  ];

  for (const category of renderOrder) {
    const lines = linesByCategory[category];
    if (lines.length === 0) continue;

    const color = colors[category];
    const strokeWidth = lineWidths[category];

    // Combine into single path for efficiency
    const pathData = lines
      .map(([x1, y1, x2, y2]) => `M${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}`)
      .join(' ');

    svgParts.push(
      `  <path d="${pathData}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
    );
  }

  svgParts.push('</svg>');

  return svgParts.join('\n');
}

// ============================================================================
// ROOM PRESETS (threshold-dwelling)
// ============================================================================

export const ROOM_CONFIGS: Record<
  string,
  {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    ceilingHeight: number;
    glassWallSouth: boolean;
  }
> = {
  living: {
    minX: 39,
    maxX: 65,
    minZ: 0,
    maxZ: 13,
    ceilingHeight: 10,
    glassWallSouth: true
  },
  dining: {
    minX: 26,
    maxX: 39,
    minZ: 0,
    maxZ: 13,
    ceilingHeight: 10,
    glassWallSouth: true
  },
  kitchen: {
    minX: 12,
    maxX: 26,
    minZ: 0,
    maxZ: 13,
    ceilingHeight: 10,
    glassWallSouth: true
  },
  'primary-bedroom': {
    minX: 18,
    maxX: 39,
    minZ: 20,
    maxZ: 42,
    ceilingHeight: 9,
    glassWallSouth: false
  },
  'daughter-bedroom': {
    minX: 0,
    maxX: 18,
    minZ: 20,
    maxZ: 42,
    ceilingHeight: 9,
    glassWallSouth: false
  },
  'inlaw-suite': {
    minX: 39,
    maxX: 65,
    minZ: 20,
    maxZ: 42,
    ceilingHeight: 9,
    glassWallSouth: false
  },
  pantry: {
    minX: 0,
    maxX: 12,
    minZ: 4,
    maxZ: 13,
    ceilingHeight: 9,
    glassWallSouth: false
  },
  entry: {
    minX: 55,
    maxX: 65,
    minZ: 13,
    maxZ: 20,
    ceilingHeight: 9,
    glassWallSouth: false
  }
};

/**
 * Generate room geometry for a named room
 */
export function generateRoom(roomName: string): RoomGeometry {
  const config = ROOM_CONFIGS[roomName];
  if (!config) {
    throw new Error(`Unknown room: ${roomName}. Available: ${Object.keys(ROOM_CONFIGS).join(', ')}`);
  }

  return generateRoomGeometry(
    roomName,
    config.minX,
    config.maxX,
    config.minZ,
    config.maxZ,
    config.ceilingHeight,
    {
      floorGrid: 4,
      ceilingGrid: 6,
      glassWallSouth: config.glassWallSouth,
      windowSill: 1,
      windowHead: 8
    }
  );
}

// ============================================================================
// CAMERA PRESETS (threshold-dwelling)
// ============================================================================

export interface CameraPreset {
  name: string;
  position: Vec3;
  target: Vec3;
  fov: number;
  description: string;
}

export interface RoomCameras {
  room: string;
  cameras: CameraPreset[];
}

/**
 * Camera presets for threshold-dwelling rooms
 *
 * Coordinate system:
 *   X = left/right (matches floor plan X, 0 is west, increases east)
 *   Y = height (0 is floor, increases up)
 *   Z = front/back (matches floor plan Y, 0 is south, increases north)
 *
 * Living room bounds: X: 39-65, Z: 0-13, ceiling: 10
 */
export const CAMERA_PRESETS: RoomCameras[] = [
  {
    room: 'living',
    cameras: [
      {
        name: 'wide',
        // Standing in NE corner, looking SW toward glass wall
        position: [60, 5, 10],
        target: [45, 4, 3],
        fov: 75,
        description: 'wide angle from northeast corner looking toward glass wall'
      },
      {
        name: 'seating',
        // Standing mid-room, looking south toward glass
        position: [52, 4, 8],
        target: [52, 4, 0],
        fov: 60,
        description: 'seating area looking directly at glass wall'
      },
      {
        name: 'corner',
        // Standing in NW area, looking toward SE glass corner
        position: [44, 5, 10],
        target: [62, 4, 2],
        fov: 70,
        description: 'looking toward southeast glass corner'
      }
    ]
  },
  {
    room: 'kitchen',
    cameras: [
      {
        name: 'wide',
        position: [24, 5, 10],
        target: [18, 4, 3],
        fov: 75,
        description: 'full kitchen view toward glass wall'
      },
      {
        name: 'island',
        position: [19, 4, 8],
        target: [19, 3, 4],
        fov: 60,
        description: 'kitchen island detail'
      },
      {
        name: 'sink',
        position: [15, 4, 6],
        target: [15, 4, 0],
        fov: 50,
        description: 'sink area with window view'
      }
    ]
  },
  {
    room: 'dining',
    cameras: [
      {
        name: 'wide',
        position: [37, 5, 10],
        target: [30, 4, 3],
        fov: 70,
        description: 'dining room toward glass wall'
      },
      {
        name: 'table',
        position: [33, 4, 9],
        target: [33, 3, 3],
        fov: 50,
        description: 'dining table detail'
      },
      {
        name: 'toward-kitchen',
        position: [35, 5, 3],
        target: [25, 4, 8],
        fov: 75,
        description: 'view toward kitchen open plan'
      }
    ]
  }
];

/**
 * Debug helper: print camera info
 */
export function debugCamera(camera: Camera): void {
  const { right, up, forward } = calculateViewBasis(camera);

  console.log('Camera Debug:');
  console.log(`  Position: [${camera.position.join(', ')}]`);
  console.log(`  Target:   [${camera.target.join(', ')}]`);
  console.log(`  FOV:      ${camera.fov}°`);
  console.log(`  Forward:  [${forward.map((v) => v.toFixed(3)).join(', ')}]`);
  console.log(`  Right:    [${right.map((v) => v.toFixed(3)).join(', ')}]`);
  console.log(`  Up:       [${up.map((v) => v.toFixed(3)).join(', ')}]`);

  // Calculate look direction angles
  const yaw = Math.atan2(forward[0], forward[2]) * (180 / Math.PI);
  const pitch = Math.asin(forward[1]) * (180 / Math.PI);
  console.log(`  Yaw:      ${yaw.toFixed(1)}° (0=north, 90=east, -90=west)`);
  console.log(`  Pitch:    ${pitch.toFixed(1)}° (0=level, +up, -down)`);
}
