<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceCardItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { controlledFlowMedia } from '@create-something/canon/components/performance/media/controlled-flow';

  const proofMetrics = [
    { value: '5', label: 'live tools' },
    { value: '3', label: 'simple ways to choose' },
    { value: 'Edge', label: 'Workers-first execution' },
    { value: 'Visible', label: 'output and state' }
  ];

  const tools: PerformanceCardItem[] = [
    {
      eyebrow: 'Execution',
      icon: 'settings',
      title: 'Code Playground',
      href: '/playground',
      detail:
        'Run JavaScript in a Cloudflare Worker. See the console, request, result, and errors in one place.'
    },
    {
      eyebrow: 'Guided practice',
      icon: 'check',
      title: 'Praxis',
      href: '/praxis',
      detail:
        'Work through a guided integration challenge and practice the decisions behind a reliable connection.'
    },
    {
      eyebrow: 'Inspection',
      icon: 'clock',
      title: 'Motion Lab',
      href: '/motion',
      detail: 'Enter a public URL and inspect its timing, easing, sequence, and motion system.'
    },
    {
      eyebrow: 'Realtime data',
      icon: 'document',
      title: 'Data Studio',
      href: '/data/nba',
      detail:
        'Inspect live NBA data, saved snapshots, and useful metrics through a real refresh loop.'
    },
    {
      eyebrow: 'Concept graph',
      icon: 'search',
      title: 'Discover',
      href: '/discover',
      detail:
        'Choose a concept guide and trace one idea through research, practice, and implementation.'
    }
  ];

  const workbenchScenes: PerformanceNarrativeScene[] = [
    {
      id: 'run',
      label: 'Run',
      summary: 'Try code or a guided challenge',
      title: 'Start with something you can run.',
      detail:
        'Code Playground and Praxis use real routes and edge-safe execution. You can see the request, response, output, and the choices that produced it.',
      tone: 'allow',
      evidence: [
        'Prefer edge-safe execution surfaces over mocked behavior',
        'Keep the request and response visible',
        'Make the output easy to repeat or compare'
      ],
      receipts: ['console output', 'route state', 'timing result'],
      actions: [
        { label: 'Open Code Playground', href: '/playground' },
        { label: 'Start Praxis', href: '/praxis' }
      ]
    },
    {
      id: 'inspect',
      label: 'Inspect',
      summary: 'Study motion or live data',
      title: 'See what happened and where it can fail.',
      detail:
        'Motion Lab and Data Studio expose timing, state, limits, and recovery. Their failure modes remain part of the result instead of being hidden.',
      tone: 'review',
      evidence: [
        'Show what changed and when',
        'Keep failure modes visible',
        'Choose the next step from observed behavior'
      ],
      receipts: ['motion report', 'data snapshot', 'state trace'],
      actions: [
        { label: 'Inspect Motion', href: '/motion' },
        { label: 'Open Data Studio', href: '/data/nba' }
      ]
    },
    {
      id: 'carry-forward',
      label: 'Carry forward',
      summary: 'Trace a useful idea',
      title: 'Keep the result when it teaches something.',
      detail:
        'Discover helps you trace a repeatable result into its receiving property. A useful handoff names the owner and next decision.',
      tone: 'neutral',
      evidence: [
        'The result can be repeated or compared',
        'The artifact has a clear receiving property',
        'The handoff names the owner and next decision'
      ],
      receipts: ['research note', 'handoff link', 'workflow cue'],
      actions: [{ label: 'Open Discover', href: '/discover' }]
    }
  ];

  const toolsByScene: Record<string, PerformanceCardItem[]> = {
    run: tools.slice(0, 2),
    inspect: tools.slice(2, 4),
    'carry-forward': tools.slice(4)
  };

  const ecosystemCards: PerformanceCardItem[] = [
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
      title: 'Map the workflow',
      detail:
        'When the pattern matters commercially, operationally, or reputationally, carry its runtime evidence into the practice.',
      href: 'https://createsomething.agency/practice?source=space&intent=runtime-to-practice&stage=qualify&lane=workflow_infrastructure'
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
</script>

<SEO
  title="Workbench | CREATE SOMETHING .space"
  description="CREATE SOMETHING .space is the live workbench for testing tools, runtimes, and interaction patterns on Cloudflare Workers."
  keywords="developer tools, code playground, motion analysis, realtime dashboards, Cloudflare Workers, live workbench, automation practice"
  ogImage="/og-image.svg"
  propertyName="space"
/>

<PerformanceCampaignOpening
  eyebrow="CREATE SOMETHING .space"
  title="Choose a live tool and test one idea."
  lede="Run code, practice an integration, inspect motion, explore live NBA data, or trace a concept. If you are unsure, start with Code Playground."
  media={controlledFlowMedia}
  proof={proofMetrics.map((item) => ({ label: item.label, value: item.value }))}
>
  {#snippet actions()}
    <Button href="/playground">Start with Code Playground</Button>
    <Button href="#workbench-chooser" variant="secondary">Compare all five</Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceNarrativeStage
  id="workbench-chooser"
  eyebrow="Five live tools"
  title="Choose by what you want to do."
  description="Run something, inspect a system, or carry a useful result forward. Each choice opens a working surface."
  scenes={workbenchScenes}
  ariaLabel="Choose a live workbench tool"
>
  {#snippet artifact(scene)}
    <PerformanceCardGrid
      items={toolsByScene[scene.id] ?? []}
      columns={2}
      density="compact"
      ariaLabel="Tools for this choice"
    />
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  eyebrow="Keep what worked"
  title="Carry the result into the right place."
  description="A repeatable result can become a research note, a governed workflow, or part of the broader thesis. Choose the destination that matches your next decision."
  handoff={{
    owner: 'Workbench operator',
    authority: 'Runtime evidence',
    proof: 'Output + state + handoff',
    state: 'ready'
  }}
  artifactPlacement="full-width"
  density="compact"
>
  {#snippet actions()}
    <Button href="https://createsomething.io">Read the pattern</Button>
    <Button
      href="https://createsomething.agency/practice?source=space&intent=runtime-to-practice&stage=qualify&lane=workflow_infrastructure"
      variant="secondary">Map the workflow</Button
    >
  {/snippet}
  {#snippet aside()}
    <PerformanceCardGrid
      items={ecosystemCards}
      columns={3}
      density="compact"
      ariaLabel="Where to carry the result"
    />
  {/snippet}
</PerformanceConversionHandoff>
