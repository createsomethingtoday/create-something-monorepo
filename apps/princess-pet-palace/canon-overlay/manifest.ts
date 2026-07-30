export const CANON_PROJECT_OVERLAY_MANIFEST = {
  id: 'overlay.princess-pet-palace',
  name: 'Princess Pet Palace Overlay',
  owner: 'princess-pet-palace',
  sourcePackage: 'princess-pet-palace',
  sourcePath: 'manifest.ts',
  targetModalities: ['web', 'chat', 'app', 'voice', 'glasses'],
  tags: ['canon', 'overlay', 'project', 'child-safety', 'learning', 'accessibility'],
  artifacts: [
    {
      kind: 'theme',
      path: 'theme.css',
      description: 'Project-local aliases for the existing playful visual system.',
      registryItemIds: ['token.performance-core']
    },
    {
      kind: 'tokens',
      path: 'tokens.json',
      description: 'Semantic aliases for focus, feedback, and activity surfaces.',
      registryItemIds: ['token.performance-core']
    },
    {
      kind: 'templates',
      path: 'templates',
      description: 'A governed brief for child-facing learning activities.',
      registryItemIds: [
        'template.canon-project-overlay-manifest',
        'template.canon-extension-intake'
      ]
    },
    {
      kind: 'copy-rules',
      path: 'copy-rules.md',
      description: 'Encouraging, age-appropriate language rules without manipulative feedback.',
      registryItemIds: ['policy.signal-decision-proof']
    },
    {
      kind: 'surface-policy',
      path: 'surface-policy.md',
      description: 'Child-safety, privacy, accessibility, and modality boundaries.',
      registryItemIds: ['policy.signal-decision-proof']
    },
    {
      kind: 'registry',
      path: 'registry.json',
      description: 'Project-local ownership and Canon dependency metadata.',
      registryItemIds: [
        'component.clear-decision-panel',
        'component.clear-proof-strip',
        'template.canon-project-overlay-manifest'
      ]
    }
  ],
  extensionIntakes: []
};
