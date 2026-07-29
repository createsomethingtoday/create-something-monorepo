<script lang="ts">
  import {
    CanonCollectionRail,
    CanonIndexOpening,
    type CanonCollectionItem
  } from '$lib/components';
  import { SEO } from '@create-something/canon';

  const presentations = [
    {
      slug: 'heidegger-canon',
      title: 'HEIDEGGER: CANON',
      subtitle: 'Philosophy as Foundation',
      description:
        'Install the CREATE SOMETHING methodology. Apply the Subtractive Triad. Build systems that disappear.',
      slides: 18,
      duration: '25 min',
      tags: ['Philosophy', 'Methodology']
    },
    {
      slug: 'claude-code-partner',
      title: 'CLAUDE CODE: PARTNER',
      subtitle: 'AI-Native Development',
      description:
        'Set up Claude Code as your development partner. Configure CLAUDE.md, rules, MCP servers, and hooks.',
      slides: 16,
      duration: '25 min',
      tags: ['Claude Code', 'AI', 'Setup']
    },
    {
      slug: 'beads-continuity',
      title: 'BEADS: CONTINUITY',
      subtitle: 'Cross-Session Memory',
      description:
        'Agent-native task tracking for cross-session memory. Dependencies, robot mode, and hermeneutic continuity.',
      slides: 14,
      duration: '20 min',
      tags: ['Beads', 'Task Management']
    },
    {
      slug: 'cloudflare-edge',
      title: 'CLOUDFLARE: EDGE',
      subtitle: 'Global Infrastructure',
      description:
        'Deploy to the edge with D1, KV, R2, and Workers. Infrastructure that disappears.',
      slides: 18,
      duration: '25 min',
      tags: ['Cloudflare', 'Infrastructure']
    },
    {
      slug: 'canon-design',
      title: 'CANON: DESIGN',
      subtitle: 'Design Tokens from Philosophy',
      description:
        'Tailwind for structure, Canon for aesthetics. Design tokens derived from first principles.',
      slides: 15,
      duration: '20 min',
      tags: ['Design', 'CSS', 'Canon']
    },
    {
      slug: 'deployment-dwelling',
      title: 'DEPLOYMENT: DWELLING',
      subtitle: 'Shipping to Production',
      description: 'Deploy to production and dwell. The hermeneutic spiral of ongoing practice.',
      slides: 14,
      duration: '20 min',
      tags: ['Deployment', 'Practice']
    },
    {
      slug: 'workway',
      title: 'WORKWAY',
      subtitle: 'Workflow Automation for Developers',
      description:
        'Build workflows with TypeScript. Deploy to the edge. Monetize in the marketplace.',
      slides: 17,
      duration: '20 min',
      tags: ['Philosophy', 'Product', 'Heidegger', 'Claude Code', 'Cloudflare']
    },
    {
      slug: 'hub',
      title: 'HUB',
      subtitle: 'The Governed MCP Surface',
      description:
        'See how Hub governs discovery, execution, and tenant-aware tools across Codex and downstream MCPs.',
      slides: 12,
      duration: '10 min',
      tags: ['Hub', 'MCP', 'Codex', 'Policy']
    },
    {
      slug: 'abundance-system',
      title: 'ABUNDANCE',
      subtitle: 'Nurse Staffing, Explained Simply',
      description:
        'See how Abundance captures profiles and ranks matches. Then inspect policy and directional staffing budgets.',
      slides: 14,
      duration: '18 min',
      tags: ['Healthcare', 'Matching', 'Concierge', 'Policy']
    }
  ];

  const presentationItems: CanonCollectionItem[] = presentations.map((presentation) => ({
    title: presentation.title,
    detail: presentation.description,
    href: `/presentations/${presentation.slug}`,
    eyebrow: presentation.subtitle,
    meta: `${presentation.slides} slides · ${presentation.duration}`,
    points: presentation.tags
  }));
</script>

<SEO
  title="Presentations"
  description="Philosophy-driven presentations from CREATE SOMETHING."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Presentations', url: 'https://createsomething.ltd/presentations' }
  ]}
/>

<CanonIndexOpening
  current="presentations"
  title="Presentations"
  description="Choose the argument that matches the practice you need to explain, teach, or apply."
  recommendation={{
    label: 'Begin with Heidegger: Canon',
    detail:
      'Start with the shared philosophy before moving into tools, infrastructure, or delivery.',
    href: '/presentations/heidegger-canon'
  }}
/>

<CanonCollectionRail
  id="presentation-collection"
  title="Choose an argument to follow."
  description="Each presentation is a direct destination with its topic, duration, and evidence boundary visible before you open it."
  items={presentationItems}
  emptyMessage="No presentations are available. Return to the Canon system for the governing sources."
/>
