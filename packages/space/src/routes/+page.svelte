<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformanceDecisionPanel,
    PerformancePageSection,
    paperPrototypeScoreMedia,
    SEO,
    type PerformanceCardItem,
    type PerformanceDecisionItem
  } from '@create-something/canon';

  const proofMetrics = [
    { value: '5', label: 'live tools and surfaces' },
    { value: '3', label: 'runtime loops previewed in the shell' },
    { value: '100%', label: 'Cloudflare Workers-first execution' },
    { value: 'Direct', label: 'inspectable routes, outputs, and state' }
  ];

  const tools: PerformanceCardItem[] = [
    {
      eyebrow: 'Execution',
      icon: 'settings',
      title: 'Code Playground',
      href: '/playground',
      detail:
        'Execute JavaScript directly in the Workers runtime with console streaming, async support, and an inspectable request surface.'
    },
    {
      eyebrow: 'Guided practice',
      icon: 'check',
      title: 'Praxis',
      href: '/praxis',
      detail:
        'Learn integration patterns through guided challenges that turn runtime ideas into operator habits instead of abstract lessons.'
    },
    {
      eyebrow: 'Inspection',
      icon: 'clock',
      title: 'Motion Lab',
      href: '/motion',
      detail:
        'Analyze animation systems from any public URL with extracted timing, easing, sequencing, and motion architecture notes.'
    },
    {
      eyebrow: 'Realtime data',
      icon: 'document',
      title: 'Data Studio',
      href: '/data/nba',
      detail:
        'Work with live dashboards, historical snapshots, and derived metrics that stay useful under real refresh and caching conditions.'
    },
    {
      eyebrow: 'Concept graph',
      icon: 'search',
      title: 'Discover',
      href: '/discover',
      detail:
        'Map concepts across CREATE SOMETHING properties and use the network to move from idea to implementation and back again.'
    }
  ];

  const decisionStates: PerformanceDecisionItem[] = [
    {
      label: 'Run',
      summary: 'Live surface',
      title: 'Execute against the runtime.',
      detail:
        'The workbench earns its place when the visitor can run, inspect, or compare something real instead of reading a static promise.',
      tone: 'allow',
      evidence: [
        'Route performs real work',
        'Request and response shape stay visible',
        'Output can be repeated or compared'
      ],
      receipts: ['console output', 'route state', 'timing result'],
      actions: [{ label: 'Open Playground', href: '/playground' }]
    },
    {
      label: 'Inspect',
      summary: 'Behavior visible',
      title: 'Show the state behind the result.',
      detail:
        'When timing, easing, cache state, or data refresh affects the outcome, the interaction should surface that behavior directly.',
      tone: 'review',
      evidence: [
        'The user can see what changed',
        'Failure modes are part of the surface',
        'The next route is chosen by behavior, not hype'
      ],
      receipts: ['motion report', 'data snapshot', 'state trace'],
      actions: [
        { label: 'Inspect Motion', href: '/motion' },
        { label: 'Open Data', href: '/data/nba' }
      ]
    },
    {
      label: 'Promote',
      summary: 'Pattern survived',
      title: 'Move useful behavior into the right property.',
      detail:
        'A successful workbench result should become research when it teaches, or delivery when the workflow needs controls and owners.',
      tone: 'neutral',
      evidence: [
        'The runtime behavior is repeatable',
        'The artifact has a clear receiving property',
        'Promotion path names the owner and next decision'
      ],
      receipts: ['research note', 'handoff link', 'workflow cue'],
      actions: [
        { label: 'Read Pattern', href: 'https://createsomething.io' },
        {
          label: 'Map Workflow',
          href: 'https://createsomething.agency/practice?source=space&intent=runtime-to-practice&stage=qualify&lane=workflow_infrastructure'
        }
      ]
    }
  ];

</script>

<SEO
  title="Workbench | CREATE SOMETHING .space"
  description="CREATE SOMETHING .space is the live workbench for testing tools, runtimes, and interaction patterns on Cloudflare Workers."
  keywords="developer tools, code playground, motion analysis, realtime dashboards, Cloudflare Workers, live workbench, automation practice"
  ogImage="/og-image.png"
  propertyName="space"
/>

<PerformanceCampaignOpening
  mobileSearchBoundary
  eyebrow="CREATE SOMETHING .space"
  propertyRole="Public systems workbench"
  expression="editorial"
  title="A public workbench for testing runtime ideas."
  lede="CREATE SOMETHING .space is where tools, routes, and interaction patterns get tested against real execution surfaces before they become research, policy, or production workflows."
  media={paperPrototypeScoreMedia}
  proof={proofMetrics.map((item) => ({ label: item.label, value: item.value }))}
  mode="paper"
>
  {#snippet actions()}
    <Button href="/playground">Open The Playground</Button>
    <Button href="/praxis" variant="secondary">Start Praxis</Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceDecisionPanel
  id="runtime-decision"
  eyebrow="Runtime decision path"
  title="Use interaction to show what can run, what needs inspection, and what should move."
  description="The workbench should communicate through visible state changes: execute, inspect, then promote only what survives runtime contact."
  items={decisionStates}
  ariaLabel="Runtime decision path"
/>

<PerformancePageSection
  variant="white"
  eyebrow="Live surfaces"
  title="Pick a route and work with the system directly."
  description="Each route exposes execution, analysis, or learning as a working surface—not a static marketing panel."
>
  {#snippet after()}
    <PerformanceCardGrid items={tools} columns={3} ariaLabel="Live workbench surfaces" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Pick a surface"
  title="Start with the runtime you want to inspect."
  description="Open the playground if you want to execute code, motion if you want to inspect interaction systems, or data if you want to work against a live refresh loop."
  handoff={{
    owner: 'Workbench operator',
    authority: 'Runtime evidence',
    proof: 'Output + state + handoff',
    state: 'ready'
  }}
>
  {#snippet actions()}
    <Button href="/motion">Inspect Motion</Button>
    <Button href="/data/nba" variant="secondary">Open Data Studio</Button>
  {/snippet}
</PerformanceConversionHandoff>
