const source = 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/';

/** Public artifacts only. Source availability does not assert deployment or Marketplace approval. */
export const builtWork = [
  {
    id: 'ground',
    category: 'Developer tooling',
    title: 'Ground',
    description:
      'A code-analysis tool that checks the evidence before an agent claims code is duplicated, unused or disconnected.',
    artifact: 'CLI + MCP server',
    links: [{ label: 'Explore Ground', href: '/products/ground' }]
  },
  {
    id: 'mcps',
    category: 'Agent integrations',
    title: 'MCP servers that connect agents to real work',
    description:
      'Tools for reading and changing structured data. Our scheduling MCP includes conflict detection, backfill and forecasting.',
    artifact: 'Scheduling MCP source',
    links: [{ label: 'Inspect the scheduling MCP', href: source + 'packages/schedule-mcp' }]
  },
  {
    id: 'review',
    category: 'Review systems',
    title: 'Evidence before approval',
    description:
      'Template-review workflows that collect evidence for a reviewer. The published field report shows what worked, what failed and why judgment stayed with a person.',
    artifact: 'Published evaluation',
    links: [{ label: 'Read the review-system results', href: '/field-reports/template-review' }]
  },
  {
    id: 'marketplace',
    category: 'Marketplace frontends',
    title: 'An interface for the people behind the assets',
    description:
      'The Webflow Asset Dashboard brings asset management, editing, analytics and submission status into a creator-facing interface.',
    artifact: 'Dashboard implementation',
    links: [{ label: 'Inspect the dashboard source', href: source + 'packages/webflow-dashboard' }]
  },
  {
    id: 'forms',
    category: 'Dynamic forms',
    title: 'Catch submission problems at the source',
    description:
      'A two-step marketplace submission form with published-URL checks, image uploads and validation feedback before work reaches a reviewer.',
    artifact: 'Form + validation implementation',
    links: [
      {
        label: 'Inspect the submission form',
        href: source + 'apps/marketplace-template-submission-cloud'
      }
    ]
  },
  {
    id: 'skills',
    category: 'Agent skills',
    title: 'Methods another operator can use',
    description:
      'Packaged architecture and debugging skills give agents a repeatable way to classify a system, trace a failure and design an integration.',
    artifact: 'Three-Tier Framework skills',
    links: [
      { label: 'Explore the skill package', href: source + 'packages/pi-three-tier-framework' }
    ]
  },
  {
    id: 'webflow',
    category: 'Webflow apps & components',
    title: 'Checks and interfaces inside the tools people use',
    description:
      'A Webflow Designer validation app, plus reusable React components for forms, navigation, approval gates and workflow interfaces.',
    artifact: 'Designer extension + component source',
    links: [
      { label: 'Inspect the validator app', href: source + 'packages/webflow-template-validation' },
      { label: 'Explore Webflow components', href: source + 'packages/webflow-components' }
    ]
  }
] as const;
