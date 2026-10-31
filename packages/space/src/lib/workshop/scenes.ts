/** PR2045 Agency scenes, inspected before reuse. Concept imagery, never runtime proof. */
export const scenes = {
  workshop: {
    stem: 'products-workbench-paths-continuity-v2',
    width: 1536,
    height: 1024,
    alt: 'Small charcoal and ivory agents work at separate metal benches in an open workshop.',
    caption: 'An open workshop. Choose a tool and inspect how it works.'
  },
  fit: {
    stem: 'tool-fit-without-forcing',
    width: 1536,
    height: 1024,
    alt: 'An agent compares a machined connector with its socket before joining them.',
    caption: 'Find the fit before making the connection.'
  },
  compiler: {
    stem: 'compiler-from-plan-to-tested-jig',
    width: 1536,
    height: 1024,
    alt: 'Two agents turn a measured metal template into a matching part at a workbench.',
    caption: 'A definition becomes something you can check.'
  },
  ground: {
    stem: 'ground-compare-before-claim',
    width: 1402,
    height: 1122,
    alt: 'Two agents inspect the fit between metal parts under a small work light.',
    caption: 'Compare the evidence before accepting the claim.'
  },
  notes: {
    stem: 'about-careful-working-notes',
    width: 1536,
    height: 1024,
    alt: 'A small charcoal agent opens a worn notebook beside a folded paper model.',
    caption: 'Keep the notes that make the next attempt useful.'
  },
  practice: {
    stem: 'editorial-experiments-isolated-sandbox',
    width: 1536,
    height: 1024,
    alt: 'An agent tries a small digging mechanism inside a transparent bounded sand tray.',
    caption: 'Try an idea inside a clear boundary.'
  },
  repair: {
    stem: 'editorial-upstream-shared-tool-repair',
    width: 1536,
    height: 1024,
    alt: 'Charcoal and ivory agents repair a shared metal gear assembly together.',
    caption: 'Improve the shared tool, then return it to use.'
  },
  subtract: {
    stem: 'subtract-the-extra-route',
    width: 1536,
    height: 1024,
    alt: 'An agent removes an unnecessary loop from a machined metal route.',
    caption: 'Remove the extra path so the useful one is clear.'
  }
} as const;
export type SceneKey = keyof typeof scenes;
export const projectScenes: Record<string, SceneKey> = {
  ground: 'ground',
  'workflow-compiler': 'compiler',
  'three-tier-framework': 'fit',
  'policy-os': 'notes',
  'template-preflight': 'ground',
  'app-preflight': 'ground',
  'canon-plugin': 'fit',
  'triad-review': 'subtract',
  'deep-module-design': 'subtract',
  'intent-mapping': 'notes',
  'debug-feedback-loop': 'repair',
  'tdd-vertical-slice': 'practice',
  'workflow-runtime': 'compiler',
  'voice-validator': 'notes',
  'understanding-graphs': 'notes',
  'ascii-renderer': 'fit',
  simulation: 'practice',
  spritz: 'fit',
  'canon-tokens': 'fit',
  tufte: 'ground',
  'render-pipeline': 'compiler',
  'mcp-core': 'fit'
};
export function projectScene(slug: string): SceneKey {
  return projectScenes[slug] ?? 'fit';
}
export function sceneImage(key: SceneKey): string {
  return `/images/workshop/stories/${scenes[key].stem}.webp`;
}
