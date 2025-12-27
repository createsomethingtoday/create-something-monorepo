/**
 * Perspective Line Renderer
 *
 * Generates perspective line drawings from FloorPlanData for ControlNet conditioning.
 * Uses Three.js to create 3D geometry and renders to SVG.
 *
 * The tool recedes; architectural perspective emerges.
 */

import * as THREE from 'three';
import { JSDOM } from 'jsdom';
import type { FloorPlanData, Wall } from './floor-plan-svg.js';
import type { HeightZone } from './section-svg.js';

/**
 * Camera position preset for a room view
 */
export interface CameraPreset {
  /** Preset name */
  name: string;
  /** Camera position [x, y, z] in feet */
  position: [number, number, number];
  /** Look-at target [x, y, z] in feet */
  target: [number, number, number];
  /** Field of view in degrees */
  fov?: number;
  /** Description for prompt */
  description?: string;
}

/**
 * Room view configuration
 */
export interface RoomView {
  /** Room name */
  room: string;
  /** Camera presets for this room */
  cameras: CameraPreset[];
}

/**
 * Render options for perspective output
 */
export interface PerspectiveRenderOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Line color */
  lineColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Line width */
  lineWidth?: number;
}

/**
 * Height data for 3D extrusion
 */
export interface HeightConfig {
  /** Default ceiling height */
  defaultCeiling: number;
  /** Height zones for variable ceilings */
  zones?: HeightZone[];
  /** Floor thickness */
  floorThickness?: number;
  /** Wall thickness */
  wallThickness?: number;
}

// Lazy-loaded SVGRenderer to avoid import-time DOM dependency
let SVGRendererModule: typeof import('three/examples/jsm/renderers/SVGRenderer.js') | null = null;

/**
 * Initialize the perspective renderer (call before first use)
 * Sets up jsdom environment for Three.js SVGRenderer
 */
export async function initPerspectiveRenderer(): Promise<void> {
  if (SVGRendererModule) return; // Already initialized

  // Setup jsdom for SVGRenderer (requires DOM APIs)
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const { window } = dom;

  // Polyfill globals needed by Three.js SVGRenderer
  (globalThis as any).window = window;
  (globalThis as any).document = window.document;
  (globalThis as any).DOMParser = window.DOMParser;
  (globalThis as any).XMLSerializer = window.XMLSerializer;

  // Dynamic import after globals are set
  SVGRendererModule = await import('three/examples/jsm/renderers/SVGRenderer.js');
}

/**
 * Create 3D scene from floor plan data
 */
export function createSceneFromPlan(
  plan: FloorPlanData,
  heights: HeightConfig
): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const {
    defaultCeiling,
    zones = [],
    wallThickness = 0.5
  } = heights;

  // Materials - use LineBasicMaterial for wireframe look
  const wallMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
  const floorMaterial = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 1 });
  const windowMaterial = new THREE.LineBasicMaterial({ color: 0x0066cc, linewidth: 1 });

  // Create floor plane
  const floorGeometry = new THREE.PlaneGeometry(plan.width, plan.depth);
  const floorEdges = new THREE.EdgesGeometry(floorGeometry);
  const floor = new THREE.LineSegments(floorEdges, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(plan.width / 2, 0, plan.depth / 2);
  scene.add(floor);

  // Create ceiling plane (simplified - use default height)
  const ceilingGeometry = new THREE.PlaneGeometry(plan.width, plan.depth);
  const ceilingEdges = new THREE.EdgesGeometry(ceilingGeometry);
  const ceiling = new THREE.LineSegments(ceilingEdges, floorMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(plan.width / 2, defaultCeiling, plan.depth / 2);
  scene.add(ceiling);

  // Create walls as 3D boxes
  for (const wall of plan.walls) {
    const wallHeight = getHeightAtPosition(wall.x1, wall.y1, zones, defaultCeiling);
    const wallMesh = createWall3D(wall, wallHeight, wallThickness, wallMaterial);
    scene.add(wallMesh);
  }

  // Create windows
  for (const window of plan.windows || []) {
    const windowMesh = createWindow3D(window, windowMaterial);
    scene.add(windowMesh);
  }

  // Create columns
  for (const col of plan.columns || []) {
    const colHeight = getHeightAtPosition(col.x, col.y, zones, defaultCeiling);
    const columnMesh = createColumn3D(col.x, col.y, colHeight, wallMaterial);
    scene.add(columnMesh);
  }

  return scene;
}

/**
 * Get ceiling height at a position based on height zones
 */
function getHeightAtPosition(
  x: number,
  y: number,
  zones: HeightZone[],
  defaultHeight: number
): number {
  // Find the zone containing this position
  for (const zone of zones) {
    if (x >= zone.start && x <= zone.end) {
      // If zone has slope, interpolate
      if (zone.slopeTo !== undefined) {
        const t = (x - zone.start) / (zone.end - zone.start);
        return zone.ceiling + t * (zone.slopeTo - zone.ceiling);
      }
      return zone.ceiling;
    }
  }
  return defaultHeight;
}

/**
 * Create a 3D wall from 2D wall data
 */
function createWall3D(
  wall: Wall,
  height: number,
  thickness: number,
  material: THREE.LineBasicMaterial
): THREE.LineSegments {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Create box geometry for wall
  const geometry = new THREE.BoxGeometry(length, height, thickness);
  const edges = new THREE.EdgesGeometry(geometry);
  const mesh = new THREE.LineSegments(edges, material);

  // Position and rotate
  const centerX = (wall.x1 + wall.x2) / 2;
  const centerY = (wall.y1 + wall.y2) / 2;
  const angle = Math.atan2(dy, dx);

  mesh.position.set(centerX, height / 2, centerY);
  mesh.rotation.y = -angle;

  return mesh;
}

/**
 * Create a 3D window representation
 */
function createWindow3D(
  window: { x: number; y: number; width: number; orientation: string },
  material: THREE.LineBasicMaterial
): THREE.LineSegments {
  const windowHeight = 6; // Standard window height
  const sillHeight = 2.5; // Standard sill height

  const width = window.orientation === 'horizontal' ? window.width : 0.5;
  const depth = window.orientation === 'vertical' ? window.width : 0.5;

  const geometry = new THREE.BoxGeometry(width, windowHeight, depth);
  const edges = new THREE.EdgesGeometry(geometry);
  const mesh = new THREE.LineSegments(edges, material);

  mesh.position.set(window.x, sillHeight + windowHeight / 2, window.y);

  return mesh;
}

/**
 * Create a 3D column
 */
function createColumn3D(
  x: number,
  y: number,
  height: number,
  material: THREE.LineBasicMaterial
): THREE.LineSegments {
  const columnSize = 0.5; // 6" column

  const geometry = new THREE.BoxGeometry(columnSize, height, columnSize);
  const edges = new THREE.EdgesGeometry(geometry);
  const mesh = new THREE.LineSegments(edges, material);

  mesh.position.set(x, height / 2, y);

  return mesh;
}

/**
 * Render scene to SVG string
 */
export async function renderToSvg(
  scene: THREE.Scene,
  camera: CameraPreset,
  options: PerspectiveRenderOptions = {}
): Promise<string> {
  // Ensure renderer is initialized
  if (!SVGRendererModule) {
    await initPerspectiveRenderer();
  }

  const {
    width = 1440,
    height = 1080,
    backgroundColor = '#ffffff'
  } = options;

  // Create camera
  const threeCamera = new THREE.PerspectiveCamera(
    camera.fov || 60,
    width / height,
    0.1,
    1000
  );
  threeCamera.position.set(...camera.position);
  threeCamera.lookAt(new THREE.Vector3(...camera.target));

  // Create SVG renderer
  const renderer = new SVGRendererModule!.SVGRenderer();
  renderer.setSize(width, height);

  // Render
  renderer.render(scene, threeCamera);

  // Get SVG element and convert to string
  const svgElement = renderer.domElement;

  // Add background rect
  const bgRect = (globalThis as any).document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect'
  );
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', backgroundColor);
  svgElement.insertBefore(bgRect, svgElement.firstChild);

  // Add viewBox for proper scaling
  svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Ensure xmlns is set (required for standalone SVG parsing)
  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  return svgElement.outerHTML;
}

/**
 * Generate perspective conditioning image for a room
 */
export async function generatePerspectiveConditioning(
  plan: FloorPlanData,
  heights: HeightConfig,
  camera: CameraPreset,
  options: PerspectiveRenderOptions = {}
): Promise<string> {
  const scene = createSceneFromPlan(plan, heights);
  return renderToSvg(scene, camera, options);
}

/**
 * Camera presets for threshold-dwelling rooms
 * Coordinates in feet, matching floor plan data
 */
export const THRESHOLD_DWELLING_CAMERAS: RoomView[] = [
  {
    room: 'living',
    cameras: [
      {
        name: 'wide',
        position: [55, 5, 6.5],
        target: [40, 4, 6.5],
        fov: 75,
        description: 'wide angle view of living room from east corner'
      },
      {
        name: 'seating',
        position: [50, 4, 10],
        target: [42, 3, 6],
        fov: 60,
        description: 'seating area looking toward glass wall'
      },
      {
        name: 'corner',
        position: [52, 5, 0],
        target: [45, 4, 6],
        fov: 70,
        description: 'glass corner with two walls of windows'
      }
    ]
  },
  {
    room: 'kitchen',
    cameras: [
      {
        name: 'wide',
        position: [25, 5, 10],
        target: [18, 4, 6],
        fov: 75,
        description: 'full kitchen view with island'
      },
      {
        name: 'island',
        position: [20, 4, 8],
        target: [18, 3, 4],
        fov: 60,
        description: 'kitchen island detail'
      },
      {
        name: 'sink',
        position: [15, 4, 5],
        target: [20, 4, 0],
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
        position: [38, 5, 10],
        target: [30, 4, 6],
        fov: 70,
        description: 'dining room with table'
      },
      {
        name: 'table',
        position: [33, 4, 8],
        target: [33, 3, 4],
        fov: 50,
        description: 'dining table detail'
      },
      {
        name: 'toward-kitchen',
        position: [35, 5, 2],
        target: [25, 4, 6],
        fov: 75,
        description: 'view toward kitchen open plan'
      }
    ]
  },
  {
    room: 'primary-bedroom',
    cameras: [
      {
        name: 'wide',
        position: [22, 5, 35],
        target: [28, 4, 30],
        fov: 70,
        description: 'primary bedroom from entry'
      },
      {
        name: 'bed',
        position: [30, 4, 38],
        target: [28, 3, 32],
        fov: 50,
        description: 'bed area detail'
      },
      {
        name: 'window',
        position: [25, 4, 30],
        target: [28, 4, 42],
        fov: 60,
        description: 'window seat with garden view'
      }
    ]
  },
  {
    room: 'primary-bath',
    cameras: [
      {
        name: 'wide',
        position: [30, 5, 32],
        target: [33, 4, 35],
        fov: 65,
        description: 'bathroom with tub and vanity'
      },
      {
        name: 'vanity',
        position: [28, 4, 35],
        target: [32, 4, 35],
        fov: 50,
        description: 'double vanity detail'
      },
      {
        name: 'tub',
        position: [35, 4, 32],
        target: [35, 3, 38],
        fov: 50,
        description: 'freestanding tub by window'
      }
    ]
  },
  {
    room: 'daughter-bedroom',
    cameras: [
      {
        name: 'wide',
        position: [5, 5, 25],
        target: [9, 4, 32],
        fov: 70,
        description: 'bedroom from entry'
      },
      {
        name: 'desk',
        position: [3, 4, 30],
        target: [8, 4, 35],
        fov: 50,
        description: 'built-in desk area'
      },
      {
        name: 'bed',
        position: [12, 4, 35],
        target: [6, 3, 35],
        fov: 50,
        description: 'bed area detail'
      }
    ]
  },
  {
    room: 'inlaw-suite',
    cameras: [
      {
        name: 'wide',
        position: [45, 5, 25],
        target: [52, 4, 32],
        fov: 70,
        description: 'suite from entry'
      },
      {
        name: 'sitting',
        position: [58, 4, 38],
        target: [55, 4, 35],
        fov: 50,
        description: 'reading nook by window'
      },
      {
        name: 'entry',
        position: [60, 5, 22],
        target: [50, 4, 30],
        fov: 65,
        description: 'entry view into suite'
      }
    ]
  },
  {
    room: 'pantry',
    cameras: [
      {
        name: 'wide',
        position: [8, 5, 10],
        target: [6, 4, 7],
        fov: 60,
        description: 'walk-in pantry with shelving'
      },
      {
        name: 'sitin',
        position: [4, 4, 8],
        target: [6, 3, 10],
        fov: 50,
        description: 'cozy sit-in nook'
      },
      {
        name: 'wine',
        position: [10, 4, 6],
        target: [6, 4, 8],
        fov: 50,
        description: 'wine storage area'
      }
    ]
  },
  {
    room: 'entry',
    cameras: [
      {
        name: 'approach',
        position: [72, 5, 16],
        target: [65, 4, 16],
        fov: 60,
        description: 'approach from outside'
      },
      {
        name: 'interior',
        position: [62, 5, 16],
        target: [55, 4, 16],
        fov: 65,
        description: 'entry vestibule interior'
      },
      {
        name: 'looking-out',
        position: [60, 5, 16],
        target: [70, 4, 16],
        fov: 70,
        description: 'view from entry to prairie'
      }
    ]
  }
];
