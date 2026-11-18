import { canonTaskScenes, type CanonTaskSceneKey } from '$lib/canon-task-scenes';

/** Original felt-identity concept stills; see static/images/canon-tasks-v1/manifest.json. */
export const scenes = {
  workshop: { ...canonTaskScenes['welcome-bench'], task: 'welcome-bench' as CanonTaskSceneKey, alt: "Canon welcomes a paper stair model onto the workbench.", caption: "An open workshop. Choose a tool and inspect how it works." },
  fit: { ...canonTaskScenes['tool-fit'], task: 'tool-fit' as CanonTaskSceneKey, alt: "Canon compares a wooden connector with its matching socket.", caption: "Find the fit before making the connection." },
  compiler: { ...canonTaskScenes['compiler-jig'], task: 'compiler-jig' as CanonTaskSceneKey, alt: "Canon compares a paper definition with the wooden part made by its jig.", caption: "A definition becomes something you can check." },
  ground: { ...canonTaskScenes['evidence-comparison'], task: 'evidence-comparison' as CanonTaskSceneKey, alt: "Canon checks a notched card against its dark paper reference outline.", caption: "Compare the evidence before accepting the claim." },
  notes: { ...canonTaskScenes['review-nook'], task: 'review-nook' as CanonTaskSceneKey, alt: "Canon keeps a working sheet available in a warm review nook.", caption: "Keep the notes that make the next attempt useful." },
  practice: { ...canonTaskScenes['bounded-sandbox'], task: 'bounded-sandbox' as CanonTaskSceneKey, alt: "Canon tests a wooden mechanism along a track inside a bounded ceramic sand tray.", caption: "Try an idea inside a clear boundary." },
  repair: { ...canonTaskScenes['shared-repair'], task: 'shared-repair' as CanonTaskSceneKey, alt: "Canon repairs the axle of a shared wooden gear assembly.", caption: "Improve the shared tool, then return it to use." },
  subtract: { ...canonTaskScenes['subtract-route'], task: 'subtract-route' as CanonTaskSceneKey, alt: "Canon removes an unnecessary paper loop while the direct path remains connected.", caption: "Remove the extra path so the useful one is clear." },
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
export function projectTaskScene(slug: string): CanonTaskSceneKey {
  return scenes[projectScene(slug)].task;
}
export function sceneImage(key: SceneKey): string {
  return scenes[key].src;
}
