export const DEMO_EVIDENCE = [
  {
    id: 'evidence-demo-map',
    title: 'Approved workflow map',
    kind: 'Map',
    status: 'Verified',
    sourceUrl: 'https://example.com/demo/map',
    observedAt: '2026-08-13T12:00:00.000Z',
    summary: 'Synthetic proof that the workflow definition passed operator review.'
  },
  {
    id: 'evidence-demo-smoke',
    title: 'Worker capability smoke',
    kind: 'Automation',
    status: 'Verified',
    sourceUrl: 'https://example.com/demo/worker-smoke',
    observedAt: '2026-08-13T12:05:00.000Z',
    summary: 'Synthetic proof for the local tool, sync, and webhook capability checks.'
  },
  {
    id: 'evidence-demo-approval',
    title: 'Operator approval receipt',
    kind: 'Judgment',
    status: 'Review',
    sourceUrl: 'https://example.com/demo/approval',
    observedAt: '2026-08-13T12:10:00.000Z',
    summary: 'Synthetic approval artifact awaiting the disposable-workspace smoke.'
  }
] as const;
