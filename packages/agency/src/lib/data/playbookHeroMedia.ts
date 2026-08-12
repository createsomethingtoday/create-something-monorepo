import type { PerformanceCampaignMedia } from '@create-something/canon';

export type PlaybookHeroRoute =
  | 'services'
  | 'practice'
  | 'stack'
  | 'products'
  | 'fieldReports'
  | 'workflows'
  | 'map'
  | 'templateReview'
  | 'agentReadiness';

const imageRoot = '/images/performance-lab';

/**
 * A bounded Home candidate: campaign material, not workflow proof. The
 * semantic Playbook field remains in the Home narrative stage below the fold.
 */
export const playbookHomeHeroMedia: PerformanceCampaignMedia = {
  src: `${imageRoot}/playbook-home-agent-macro.webp`,
  mobileSrc: `${imageRoot}/playbook-home-agent-macro-mobile.webp`,
  alt: 'Macro-real Playbook court with an ivory AI-agent marker held inside a smoked-metal ring and approached by an amber workflow route.',
  width: 1536,
  height: 1024,
  colorMode: 'natural'
};

export const playbookHeroMedia: Record<PlaybookHeroRoute, PerformanceCampaignMedia> = {
  services: {
    src: `${imageRoot}/playbook-how-it-works-approval-gate.webp`,
    mobileSrc: `${imageRoot}/playbook-how-it-works-approval-gate-mobile.webp`,
    alt: 'Macro 3D Playbook court with an AI agent paused at a human approval gate.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  practice: {
    src: `${imageRoot}/playbook-practice-calibration-rig.webp`,
    mobileSrc: `${imageRoot}/playbook-practice-calibration-rig-mobile.webp`,
    alt: 'Macro 3D Playbook court with an AI agent seated in a calibration rig.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  stack: {
    src: `${imageRoot}/playbook-what-you-keep-ownership-stack.webp`,
    mobileSrc: `${imageRoot}/playbook-what-you-keep-ownership-stack-mobile.webp`,
    alt: 'Macro 3D Playbook court with an AI agent beside a layered ownership stack.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  products: {
    src: `${imageRoot}/playbook-products-three-path-junction.webp`,
    mobileSrc: `${imageRoot}/playbook-products-three-path-junction-mobile.webp`,
    alt: 'Macro 3D Playbook court with an AI agent at a three-path operating junction.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  fieldReports: {
    src: `${imageRoot}/playbook-field-reports-evidence-receipt.webp`,
    mobileSrc: `${imageRoot}/playbook-field-reports-evidence-receipt-mobile.webp`,
    alt: 'Macro 3D Playbook court with an AI agent route attached to an evidence receipt.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  workflows: {
    src: `${imageRoot}/playbook-workflows-guide-junction.webp`,
    mobileSrc: `${imageRoot}/playbook-workflows-guide-junction-mobile.webp`,
    alt: 'Macro-real Playbook court with an ivory AI agent marker at a three-way guide junction beside a tabbed field manual, approval block, and proof tile.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  map: {
    src: `${imageRoot}/playbook-map-operating-junction.webp`,
    mobileSrc: `${imageRoot}/playbook-map-operating-junction-mobile.webp`,
    alt: 'Macro-real Playbook court with an ivory AI agent marker at a mapped operating junction, an amber route, and a proof-green terminal.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  templateReview: {
    src: `${imageRoot}/playbook-template-review-human-gate.webp`,
    mobileSrc: `${imageRoot}/playbook-template-review-human-gate-mobile.webp`,
    alt: 'Macro-real Playbook court with an ivory AI agent marker stopped before a human approval gate and a proof-green terminal beyond it.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  },
  agentReadiness: {
    src: `${imageRoot}/playbook-agent-readiness-source-check.webp`,
    mobileSrc: `${imageRoot}/playbook-agent-readiness-source-check-mobile.webp`,
    alt: 'Macro-real Playbook court with an ivory AI agent checking two source tiles, one missing-source boundary, and a proof-green receipt.',
    width: 1536,
    height: 1024,
    colorMode: 'natural'
  }
};
