<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    ClearProofStrip,
    PropertyFunnel,
    SEO,
    type ClearCardItem,
    type ClearCtaItem
  } from '@create-something/canon';

  const proofMetrics = [
    { value: '5', label: 'live tools and surfaces' },
    { value: '3', label: 'runtime loops previewed in the shell' },
    { value: '100%', label: 'Cloudflare Workers-first execution' },
    { value: 'Direct', label: 'inspectable routes, outputs, and state' }
  ];

  const heroSignals: ClearCardItem[] = [
    {
      eyebrow: 'Execute',
      icon: 'settings',
      title: 'Run against the edge',
      detail: 'Use real routes and Workers-first constraints instead of static demos.'
    },
    {
      eyebrow: 'Inspect',
      icon: 'search',
      title: 'Expose the behavior',
      detail: 'Timing, state, outputs, and failure modes should stay visible.'
    },
    {
      eyebrow: 'Promote',
      icon: 'arrow-right',
      title: 'Move what survives',
      detail: 'Validated routes can graduate into .io research or .agency delivery.'
    }
  ];

  const tools: ClearCardItem[] = [
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

  const operatingLoops: ClearCardItem[] = [
    {
      eyebrow: 'Runtime',
      icon: 'settings',
      title: 'Execute live',
      detail:
        'The tool should do real work against a real runtime. If it only exists as a screenshot, it has not earned the pattern.',
      points: [
        'Prefer edge-safe execution surfaces over mocked behavior',
        'Return enough output to make the system inspectable',
        'Keep request and response shapes visible to the user'
      ]
    },
    {
      eyebrow: 'Evidence',
      icon: 'search',
      title: 'Inspect the system',
      detail:
        'A useful workbench exposes timing, state, policy assumptions, and the limits of the runtime instead of smoothing them away.',
      points: [
        'Capture timing and state transitions as first-class output',
        'Make failure modes discoverable before they become user pain',
        'Treat observability as part of the interface'
      ]
    },
    {
      eyebrow: 'Promotion',
      icon: 'arrow-right',
      title: 'Promote what survives',
      detail:
        'The experiments that hold up here are the ones that move into research, policy artifacts, or governed delivery.',
      points: [
        'Validated ideas roll into .io as documented patterns',
        'High-stakes workflows graduate into .agency delivery',
        'The workbench stays close to the implementation edge'
      ]
    }
  ];

  const ecosystemCards: ClearCardItem[] = [
    {
      eyebrow: '.io',
      icon: 'document',
      title: 'Read the pattern',
      detail:
        'When a tool surface reveals a repeatable pattern, the research property documents it and gives it a legible frame.',
      href: 'https://createsomething.io'
    },
    {
      eyebrow: '.agency',
      icon: 'arrow-right',
      title: 'Ship the workflow',
      detail:
        'When the pattern matters commercially, operationally, or reputationally, it moves into governed delivery.',
      href: 'https://createsomething.agency/book?source=space&intent=runtime-validation&lane=workflow_infrastructure'
    },
    {
      eyebrow: '.ltd',
      icon: 'check',
      title: 'See the thesis',
      detail:
        'The editorial layer explains why the workbench exists and how it fits the broader CREATE SOMETHING worldview.',
      href: 'https://createsomething.ltd'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Motion',
      icon: 'clock',
      title: 'Inspect interaction',
      detail: 'Use the motion route when the system behavior depends on timing, easing, or sequence.'
    },
    {
      label: 'Data',
      icon: 'document',
      title: 'Work the refresh loop',
      detail: 'Use the data studio when the question needs live state and repeatable outputs.'
    },
    {
      label: 'Delivery',
      icon: 'arrow-right',
      title: 'Move what holds',
      detail: 'Promote useful runtime patterns into research or governed workflow delivery.'
    }
  ];
</script>

<SEO
  title="Workbench | CREATE SOMETHING .space"
  description="CREATE SOMETHING .space is the live workbench for testing tools, runtimes, and interaction patterns on Cloudflare Workers."
  keywords="developer tools, code playground, motion analysis, realtime dashboards, Cloudflare Workers, live workbench, automation practice"
  ogImage="/og-image.svg"
  propertyName="space"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="CREATE SOMETHING .space"
  title="A public workbench for testing runtime ideas."
  description="CREATE SOMETHING .space is where tools, routes, and interaction patterns get tested against real execution surfaces before they become research, policy, or production workflows."
>
  {#snippet actions()}
    <Button href="/playground">Open The Playground</Button>
    <Button href="/praxis" variant="secondary">Start Praxis</Button>
  {/snippet}

  <p class="clear-note">Live routes. Workers-first execution. Inspectable outputs.</p>

  {#snippet aside()}
    <ClearCardGrid
      items={heroSignals}
      columns={1}
      density="compact"
      ariaLabel="Workbench operating signals"
    />
  {/snippet}

  {#snippet after()}
    <ClearProofStrip items={proofMetrics} ariaLabel="Workbench proof artifacts" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Live surfaces"
  title="Pick a route and work with the system directly."
  description="The workbench is organized around live routes that expose execution, analysis, or learning loops. Each surface should feel like a working tool, not a static marketing panel."
>
  {#snippet after()}
    <ClearCardGrid items={tools} columns={3} ariaLabel="Live workbench surfaces" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Operating loop"
  title="The workbench has a job beyond showing off."
  description="The practice layer should reveal how the system behaves, where it breaks, and which ideas are strong enough to carry into documentation or governed delivery."
>
  {#snippet after()}
    <ClearCardGrid items={operatingLoops} columns={3} ariaLabel="Workbench operating loop" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Cross-property handoff"
  title="Practice here, then move the result into the right layer."
  description="The best workbench patterns do not stay trapped on the playground. They transfer into the research, delivery, and editorial properties that complete the system."
>
  {#snippet after()}
    <ClearCardGrid items={ecosystemCards} columns={3} ariaLabel="Workbench handoff destinations" />
  {/snippet}
</ClearPageSection>

<PropertyFunnel
  current="space"
  heading="Use the workbench as the bridge into a real workflow."
  description="Try the runtime here, read the pattern when it holds up, and move to a mapping session when the workflow needs controls, owners, and a handoff."
/>

<ClearCtaBand
  eyebrow="Pick a surface"
  title="Start with the runtime you want to inspect."
  description="Open the playground if you want to execute code, motion if you want to inspect interaction systems, or data if you want to work against a live refresh loop."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href="/motion">Inspect Motion</Button>
    <Button href="/data/nba" variant="secondary">Open Data Studio</Button>
  {/snippet}
</ClearCtaBand>

<style>
  .clear-note {
    margin: 0;
    max-width: 36rem;
    color: var(--color-clear-grey, #636363);
    font-size: 0.94rem;
    line-height: 1.55;
  }
</style>
