import type { PerformanceCampaignMedia } from '@create-something/canon';

export type PlaybookHeroRoute = 'services' | 'practice' | 'stack' | 'products' | 'fieldReports';

const imageRoot = '/images/performance-lab';

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
  }
};
