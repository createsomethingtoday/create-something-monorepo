/**
 * Physical Artifact Engine
 *
 * A route declares the semantic object it needs to explain; the renderer owns
 * camera, materials, responsive pose, performance budget, and failure state.
 * No source 3D asset is a public dependency in this registry.
 */

export const heroArtifactSceneIds = [
  'agency-folded-playbook',
  'agency-gated-route',
  'agency-three-path',
  'agency-evidence-stack',
  'io-research-specimen',
  'ltd-canon-standard',
  'space-runtime-rig',
  'basketball-procedural-court'
] as const;

export type HeroArtifactSceneId = (typeof heroArtifactSceneIds)[number];
export type HeroArtifactSubject =
  | 'folded-playbook'
  | 'gated-route'
  | 'three-path'
  | 'evidence-stack'
  | 'research-specimen'
  | 'canon-standard'
  | 'runtime-rig'
  | 'basketball-court';
export type HeroArtifactRole = 'subject' | 'source' | 'boundary' | 'evidence' | 'field';

type ArtifactCamera = {
  focalLength: number;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  scale: number;
};

export interface HeroArtifactScene {
  id: HeroArtifactSceneId;
  /** Property-local route locator; values are unique across the cohort. */
  route: string;
  property: 'agency' | 'io' | 'ltd' | 'space';
  subject: HeroArtifactSubject;
  label: string;
  roles: readonly HeroArtifactRole[];
  liveEnhancement: boolean;
  provenance: {
    source: 'procedural';
    license: string;
    externalUploadAllowed: false;
  };
  camera: { desktop: ArtifactCamera; mobile: ArtifactCamera };
  poster: {
    desktop: { width: number; height: number; recipeHash: string };
    mobile: { width: number; height: number; recipeHash: string };
  };
  fallback: { kind: 'authored-svg'; label: string } | { kind: 'none'; label: string };
  budget: { drawCalls: number; geometries: number; textures: number; pixelRatioCap: number };
}

const procedural = {
  source: 'procedural' as const,
  license: 'CREATE SOMETHING-owned procedural geometry',
  externalUploadAllowed: false as const
};

const roles = ['subject', 'source', 'boundary', 'evidence', 'field'] as const;
const profile = { drawCalls: 32, geometries: 28, textures: 3, pixelRatioCap: 1.5 } as const;
const desktop = (position: ArtifactCamera['position'], target: ArtifactCamera['target'], scale = 1) => ({
  focalLength: 52,
  position,
  target,
  scale
});
const mobile = (position: ArtifactCamera['position'], target: ArtifactCamera['target'], scale = 0.78) => ({
  focalLength: 50,
  position,
  target,
  scale
});
const poster = (desktopHash: string, mobileHash: string) => ({
  desktop: { width: 1920, height: 1080, recipeHash: desktopHash },
  mobile: { width: 1080, height: 1350, recipeHash: mobileHash }
});

export const heroArtifactSceneRegistry = {
  'agency-folded-playbook': {
    id: 'agency-folded-playbook',
    route: '/',
    property: 'agency',
    subject: 'folded-playbook',
    label: 'Folded client-owned playbook opening into an approved route',
    roles,
    liveEnhancement: false,
    provenance: procedural,
    camera: {
      desktop: desktop([5.4, 3.6, 8.4], [0.5, 0.18, 0], 1.02),
      mobile: mobile([4.5, 4.25, 9.2], [0.1, 0.2, 0], 0.76)
    },
    poster: poster(
      '1a0c1d995507d56cd20bb9b2eb985238e08f18798a45d418986a83a8cc13e0a1',
      'd672efdf5746041bb8fc3d5099d7ca9ca415966a49cbbf647ef20bb6f3a4bf42'
    ),
    fallback: { kind: 'authored-svg', label: 'Playbook route and proof receipt' },
    budget: profile
  },
  'agency-gated-route': {
    id: 'agency-gated-route',
    route: '/services',
    property: 'agency',
    subject: 'gated-route',
    label: 'A route passes through an explicit human approval gate',
    roles,
    liveEnhancement: false,
    provenance: procedural,
    camera: {
      desktop: desktop([5.8, 3.4, 8.8], [0.45, 0.28, 0], 0.95),
      mobile: mobile([4.7, 4.2, 9.5], [0.15, 0.15, 0], 0.73)
    },
    poster: poster(
      '0c5e0d62867ca8a87e0e732d0119cb188f4302f3d4b7b054e7bfa33b3fe6172b',
      '9b8fc2433beaf7d7ad565c74d0997bba1b02c8f278238388a56450bb71f1a390'
    ),
    fallback: { kind: 'authored-svg', label: 'Approved route through a decision boundary' },
    budget: profile
  },
  'agency-three-path': {
    id: 'agency-three-path',
    route: '/products',
    property: 'agency',
    subject: 'three-path',
    label: 'One operating definition opening Map, Build, and Control paths',
    roles,
    liveEnhancement: false,
    provenance: procedural,
    camera: {
      desktop: desktop([5.75, 3.85, 9], [0.4, 0.28, 0], 0.94),
      mobile: mobile([4.7, 4.55, 9.8], [0.1, 0.2, 0], 0.72)
    },
    poster: poster(
      '8c2e57570e2a9b2a1f194d8b5e265cad4d93ad13ec6ce0dbefa86321c6d78e2b',
      'c79f9487d10b2d1d1d413f109b6ecb31b2f8568a75665a58a49b1061c3422940'
    ),
    fallback: { kind: 'authored-svg', label: 'Three operating paths from one owned definition' },
    budget: profile
  },
  'agency-evidence-stack': {
    id: 'agency-evidence-stack',
    route: '/field-reports',
    property: 'agency',
    subject: 'evidence-stack',
    label: 'Measured record, blocked judgment, and attached proof receipt',
    roles,
    liveEnhancement: false,
    provenance: procedural,
    camera: {
      desktop: desktop([5.4, 4.6, 8.9], [0.3, 0.2, 0], 0.88),
      mobile: mobile([4.55, 5.2, 9.8], [0.1, 0.28, 0], 0.69)
    },
    poster: poster(
      'e8127c63bc31f0d743dc4147916a85b73e6ba0455f323658a6b9c0f779a1eef5',
      '9d21603b9df8a2b9dbe31df946b4ff9478c9f813c0d59f8bbdc34efbcd1083ac'
    ),
    fallback: { kind: 'authored-svg', label: 'Evidence stack with an attached receipt' },
    budget: profile
  },
  'io-research-specimen': {
    id: 'io-research-specimen',
    route: 'io:/',
    property: 'io',
    subject: 'research-specimen',
    label: 'Layered research specimen registered to its source trace',
    roles,
    liveEnhancement: false,
    provenance: procedural,
    camera: {
      desktop: desktop([5.5, 4.9, 9.1], [0.35, 0.16, 0], 0.84),
      mobile: mobile([4.65, 5.55, 10.1], [0.15, 0.22, 0], 0.66)
    },
    poster: poster(
      '8e0790c8d9c215746d6d1dc5eac6cc9b5f34c4dded7a667f9b0f7e5a9232c2d1',
      'c13e9941c152efd209aadfd4419b225155023f9f3b2c7a9dcd4d85d9a1ed25b0'
    ),
    fallback: { kind: 'authored-svg', label: 'Research specimen with a provenance trace' },
    budget: profile
  },
  'ltd-canon-standard': {
    id: 'ltd-canon-standard',
    route: 'ltd:/',
    property: 'ltd',
    subject: 'canon-standard',
    label: 'A durable standard held against its visible source boundary',
    roles,
    liveEnhancement: false,
    provenance: procedural,
    camera: {
      desktop: desktop([5.8, 4.35, 9.35], [0.35, 0.2, 0], 0.82),
      mobile: mobile([4.85, 5, 10.3], [0.15, 0.22, 0], 0.64)
    },
    poster: poster(
      '2ed9db6c81f5da797fd2f90d8e1d45f7bbaa457b2c0a9e432d9bc51e126eab15',
      'a5f8c452c42c280fb64b1756d59b5f47b156395d1193e1fbf23a5c0b8f30c5c4'
    ),
    fallback: { kind: 'authored-svg', label: 'Canon standard held against a source rail' },
    budget: profile
  },
  'space-runtime-rig': {
    id: 'space-runtime-rig',
    route: 'space:/',
    property: 'space',
    subject: 'runtime-rig',
    label: 'A test rig exposes runtime state before promotion',
    roles,
    liveEnhancement: true,
    provenance: procedural,
    camera: {
      desktop: desktop([5.5, 3.95, 8.7], [0.3, 0.35, 0], 0.9),
      mobile: mobile([4.6, 4.7, 9.8], [0.1, 0.28, 0], 0.68)
    },
    poster: poster(
      '31a0ed481b4c7ab2d6e3e6337686a7fd48c61ce76df4ac93516427e56413bb75',
      'bb90aa72bf4ebed7666fd60ca0bde3020b83312f43aa36df11aa6a55ef7625a0'
    ),
    fallback: { kind: 'authored-svg', label: 'Runtime rig with a visible test boundary' },
    budget: profile
  },
  'basketball-procedural-court': {
    id: 'basketball-procedural-court',
    route: '/basketball-systems-lab',
    property: 'agency',
    subject: 'basketball-court',
    label: 'Procedural league court with visible policy and proof boundaries',
    roles,
    liveEnhancement: true,
    provenance: procedural,
    camera: {
      desktop: desktop([6.3, 4.5, 10.2], [0.25, 0.15, 0], 0.86),
      mobile: mobile([5.4, 5.5, 11.6], [0.1, 0.1, 0], 0.64)
    },
    poster: poster(
      '6bf8a3d0c394e6d04757f38e58c0a61b3e97319b7d10ef6d92040d5bae68d8f9',
      '790b43a4d268d28fa0af2c2ec9f0b2eea2ae72cc2c969ce5f7c73d8c0b3edb5a'
    ),
    fallback: { kind: 'authored-svg', label: 'Procedural court with policy and proof state' },
    budget: profile
  }
} as const satisfies Record<HeroArtifactSceneId, HeroArtifactScene>;

export function getHeroArtifactScene(id: HeroArtifactSceneId): HeroArtifactScene {
  return heroArtifactSceneRegistry[id];
}

export function validateHeroArtifactSceneRegistry(
  registry: Record<HeroArtifactSceneId, HeroArtifactScene>
): string[] {
  const errors: string[] = [];
  const routes = new Set<string>();
  const subjects = new Set<string>();

  for (const id of heroArtifactSceneIds) {
    const scene = registry[id];
    if (!scene) {
      errors.push(`missing scene: ${id}`);
      continue;
    }
    if (routes.has(scene.route)) errors.push(`duplicate route: ${scene.route}`);
    routes.add(scene.route);
    if (subjects.has(scene.subject)) errors.push(`duplicate subject: ${scene.subject}`);
    subjects.add(scene.subject);
    if (scene.fallback.kind !== 'authored-svg' || !scene.fallback.label.trim()) {
      errors.push(`${id} must provide an authored SVG fallback`);
    }
    if (!scene.roles.every((role) => roles.includes(role))) {
      errors.push(`${id} uses an unresolved semantic role`);
    }
    for (const output of [scene.poster.desktop, scene.poster.mobile]) {
      if (!/^[a-f0-9]{64}$/.test(output.recipeHash)) {
        errors.push(`${id} has an invalid poster recipe hash`);
      }
    }
  }

  return errors;
}
