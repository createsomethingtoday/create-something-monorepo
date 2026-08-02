export type PerformancePaperProperty = 'agency' | 'io' | 'space' | 'ltd' | 'learn';
export type PerformancePaperStage = 'map' | 'build' | 'control';

type Vector3Tuple = readonly [number, number, number];

export interface PerformancePaperCameraFrame {
  focalLength: number;
  position: Vector3Tuple;
  target: Vector3Tuple;
  objectScale: number;
  safeZone: {
    copy: 'left';
    object: 'right';
    inset: number;
  };
}

export interface PerformancePaperShot {
  id: PerformancePaperProperty;
  composition: 'handoff' | 'research-stack' | 'scored-prototype' | 'canon-stack' | 'workbook';
  narrative: string;
  camera: {
    desktop: PerformancePaperCameraFrame;
    mobile: PerformancePaperCameraFrame;
  };
  lighting: {
    key: { intensity: number; position: Vector3Tuple; width: number; height: number };
    fill: { intensity: number; position: Vector3Tuple };
    graze: { intensity: number; position: Vector3Tuple };
    environment: number;
    exposure: number;
  };
  material: {
    roughness: number;
    metalness: 0;
    thickness: number;
    normalStrength: number;
    fiberRepeat: readonly [number, number];
  };
  tokens: {
    face: string;
    edge: string;
    fold: string;
    shadow: string;
    accent: string;
  };
  budget: {
    drawCalls: number;
    geometries: number;
    textures: number;
    perFrameNormalRecomputes: 0;
  };
}

export const performancePaperStudioTokens = {
  panel: '--color-performance-panel',
  paper: '--color-performance-paper',
  edge: '--color-performance-paper-edge',
  fold: '--color-performance-paper-fold',
  shadow: '--color-performance-paper-shadow',
  ink: '--color-performance-ink',
  signal: '--color-performance-signal',
  pressure: '--color-performance-pressure',
  growth: '--color-performance-growth',
  risk: '--color-performance-risk'
} as const;

const sharedMaterial = {
  roughness: 0.88,
  metalness: 0 as const,
  thickness: 0.032,
  normalStrength: 0.055,
  fiberRepeat: [6, 5] as const
};

const sharedBudget = {
  drawCalls: 18,
  geometries: 20,
  textures: 4,
  perFrameNormalRecomputes: 0 as const
};

const desktop = (
  focalLength: number,
  position: Vector3Tuple,
  target: Vector3Tuple,
  objectScale = 1
): PerformancePaperCameraFrame => ({
  focalLength,
  position,
  target,
  objectScale,
  safeZone: { copy: 'left', object: 'right', inset: 0.08 }
});

const mobile = (
  focalLength: number,
  position: Vector3Tuple,
  target: Vector3Tuple,
  objectScale = 0.84
): PerformancePaperCameraFrame => ({
  focalLength,
  position,
  target,
  objectScale,
  safeZone: { copy: 'left', object: 'right', inset: 0.12 }
});

export const performancePaperShots = {
  agency: {
    id: 'agency',
    composition: 'handoff',
    narrative:
      'A compressed handoff opens into a routed sheet and settles with a controlled receipt.',
    camera: {
      desktop: desktop(52, [5.6, 3.7, 8.4], [0.35, 0.15, 0], 1.04),
      mobile: mobile(50, [4.8, 4.2, 9.2], [0, 0.2, 0], 0.78)
    },
    lighting: {
      key: { intensity: 4.2, position: [-4.5, 6.5, 5.8], width: 5.5, height: 4 },
      fill: { intensity: 0.9, position: [4, 2.5, 5] },
      graze: { intensity: 1.65, position: [5.5, 1.2, -4] },
      environment: 0.72,
      exposure: 1.1
    },
    material: { ...sharedMaterial, normalStrength: 0.065 },
    tokens: {
      face: performancePaperStudioTokens.panel,
      edge: performancePaperStudioTokens.edge,
      fold: performancePaperStudioTokens.fold,
      shadow: performancePaperStudioTokens.shadow,
      accent: performancePaperStudioTokens.signal
    },
    budget: sharedBudget
  },
  io: {
    id: 'io',
    composition: 'research-stack',
    narrative:
      'Layered research sheets keep their sources connected through a blue provenance trace.',
    camera: {
      desktop: desktop(52, [5.2, 5.2, 8.8], [0.25, -0.1, 0], 0.72),
      mobile: mobile(50, [4.5, 5.7, 9.8], [0.15, 0, 0], 0.64)
    },
    lighting: {
      key: { intensity: 3.8, position: [-5.5, 7.2, 4.8], width: 6, height: 4.5 },
      fill: { intensity: 0.82, position: [4.2, 3.4, 5.2] },
      graze: { intensity: 1.35, position: [5.8, 1.4, -3.5] },
      environment: 0.68,
      exposure: 1.06
    },
    material: sharedMaterial,
    tokens: {
      face: performancePaperStudioTokens.panel,
      edge: performancePaperStudioTokens.edge,
      fold: performancePaperStudioTokens.fold,
      shadow: performancePaperStudioTokens.shadow,
      accent: performancePaperStudioTokens.signal
    },
    budget: sharedBudget
  },
  space: {
    id: 'space',
    composition: 'scored-prototype',
    narrative: 'A scored paper prototype holds its test geometry open under visible pressure.',
    camera: {
      desktop: desktop(46, [5.8, 4.1, 8], [0.2, 0.15, 0], 0.76),
      mobile: mobile(44, [5.2, 4.8, 9.4], [0.1, 0.1, 0], 0.64)
    },
    lighting: {
      key: { intensity: 4.5, position: [-5.8, 6.4, 5.2], width: 4.8, height: 3.2 },
      fill: { intensity: 0.72, position: [3.5, 2.2, 4.5] },
      graze: { intensity: 2.15, position: [6.2, 0.75, -3.8] },
      environment: 0.62,
      exposure: 1.08
    },
    material: { ...sharedMaterial, roughness: 0.84 },
    tokens: {
      face: performancePaperStudioTokens.panel,
      edge: performancePaperStudioTokens.edge,
      fold: performancePaperStudioTokens.fold,
      shadow: performancePaperStudioTokens.shadow,
      accent: performancePaperStudioTokens.pressure
    },
    budget: sharedBudget
  },
  ltd: {
    id: 'ltd',
    composition: 'canon-stack',
    narrative: 'A substantial canon sheet and visible spine hold the source standard in place.',
    camera: {
      desktop: desktop(56, [5.7, 4.6, 9.4], [0.3, 0, 0], 0.74),
      mobile: mobile(54, [5, 5.1, 10.2], [0.15, 0.05, 0], 0.64)
    },
    lighting: {
      key: { intensity: 4, position: [-4.8, 7.4, 5.6], width: 6.2, height: 4.8 },
      fill: { intensity: 0.78, position: [4.5, 3.2, 5.5] },
      graze: { intensity: 1.6, position: [6.4, 1.1, -4.5] },
      environment: 0.7,
      exposure: 1.04
    },
    material: { ...sharedMaterial, roughness: 0.92, thickness: 0.038 },
    tokens: {
      face: performancePaperStudioTokens.panel,
      edge: performancePaperStudioTokens.edge,
      fold: performancePaperStudioTokens.fold,
      shadow: performancePaperStudioTokens.shadow,
      accent: performancePaperStudioTokens.risk
    },
    budget: sharedBudget
  },
  learn: {
    id: 'learn',
    composition: 'workbook',
    narrative: 'An accordion workbook advances through tabs toward an attached completion receipt.',
    camera: {
      desktop: desktop(48, [5.4, 4.4, 8.2], [0.2, 0.1, 0], 0.76),
      mobile: mobile(46, [4.8, 5, 9.5], [0.1, 0.2, 0], 0.64)
    },
    lighting: {
      key: { intensity: 4.1, position: [-5.2, 6.8, 5.4], width: 5.6, height: 4.2 },
      fill: { intensity: 0.86, position: [4.1, 2.8, 5] },
      graze: { intensity: 1.45, position: [5.9, 1, -4.2] },
      environment: 0.66,
      exposure: 1.08
    },
    material: { ...sharedMaterial, roughness: 0.86 },
    tokens: {
      face: performancePaperStudioTokens.panel,
      edge: performancePaperStudioTokens.edge,
      fold: performancePaperStudioTokens.fold,
      shadow: performancePaperStudioTokens.shadow,
      accent: performancePaperStudioTokens.growth
    },
    budget: sharedBudget
  }
} as const satisfies Record<PerformancePaperProperty, PerformancePaperShot>;

export function getPerformancePaperShot(property: PerformancePaperProperty): PerformancePaperShot {
  return performancePaperShots[property];
}
