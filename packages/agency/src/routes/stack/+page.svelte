<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import OpenAIQualifications from '$lib/components/OpenAIQualifications.svelte';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';

  const journey: PerformanceCardItem[] = [
    {
      eyebrow: '01 Map',
      icon: 'folder',
      title: 'Map',
      detail:
        'List the steps, tools, and people involved. Agree on what AI may do and how you will check the result.'
    },
    {
      eyebrow: '02 Build',
      icon: 'settings',
      title: 'Build',
      detail:
        'Build and test one agreed task. Keep its code, work history, and instructions together.'
    },
    {
      eyebrow: '03 Control',
      icon: 'check',
      title: 'Control',
      detail:
        'Decide which tasks can run automatically, which need approval, and which must stop.'
    }
  ];

  const deliveryArtifacts: PerformanceCardItem[] = [
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: 'Workflow Map',
      detail: 'One workflow, source systems, owners, handoffs, and failure points.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'check',
      title: 'Who owns what',
      detail: 'What your team owns, what CREATE SOMETHING owns, and what vendors provide.'
    },
    {
      eyebrow: 'Contract',
      icon: 'document',
      title: 'Tool/API contract',
      detail: 'Which tools the agent can use, the access it needs, and the limits on each action.'
    },
    {
      eyebrow: 'Control',
      icon: 'settings',
      title: 'Policy rules',
      detail: 'Auto-allow, approval-needed, and blocked states with reasons.'
    },
    {
      eyebrow: 'Operate',
      icon: 'refresh',
      title: 'Runbook',
      detail: 'How to run the system, check a release, undo a change, and recover from failure.'
    },
    {
      eyebrow: 'Surface',
      icon: 'document',
      title: 'Operator brief',
      detail: 'A view of current work in your application or our database system, Substrate.'
    }
  ];

  const platformConviction: PerformanceCardItem[] = [
    {
      eyebrow: 'Development tool',
      icon: 'info',
      title: 'OpenAI Codex',
      detail:
        'The AI coding tool we use to build the project and help your team make the next change.'
    },
    {
      eyebrow: 'Owned system',
      icon: 'check',
      title: 'Code, rules, and work history',
      detail:
        'Your team keeps the business context, permissions, tests, work history, and recovery instructions.'
    },
    {
      eyebrow: 'Exit path',
      icon: 'refresh',
      title: 'Test a different AI model',
      detail:
        'The same tool definitions and test tasks can help compare Claude, open-weight models, and custom models.'
    }
  ];

  const faqItems = [
    {
      question: 'Who owns the system?',
      answer:
        'We agree on ownership before building: what your team keeps, what we deliver, and which services outside vendors provide.'
    },
    {
      question: 'Why does vendor ownership matter?',
      answer:
        'Changing a vendor should not erase your operating knowledge. Your team keeps the workflow plan, rules, instructions, and records needed to evaluate a replacement.'
    },
    {
      question: 'Who decides what the agent can do?',
      answer:
        'Your team sets the rules. The system checks whether each action is allowed, needs approval, or must stop before it affects live work.'
    }
  ];

  const stackRoles: PerformanceCardItem[] = [
    {
      eyebrow: 'Database and work view',
      icon: 'folder',
      title: 'Substrate',
      detail:
        'Our database system stores the records, tasks, approvals, and work history. APIs and MCP let approved software access it.',
      href: '/products'
    },
    {
      eyebrow: 'Runtime',
      icon: 'settings',
      title: 'Cloudflare',
      detail:
        'Cloudflare provides hosting and storage. We document who owns the account, who pays for it, and how to undo a release.',
      href: '/cloudflare'
    },
    {
      eyebrow: 'Reasoning',
      icon: 'info',
      title: 'OpenAI',
      detail:
        'OpenAI provides the AI models and coding tools. Your rules determine which tools an agent can use and when it needs approval.'
    }
  ];

  const stackScenes: PerformanceNarrativeScene[] = [
    {
      id: 'path',
      label: 'Path',
      summary: 'Map → pilot → control',
      title: 'Know what happens at each stage.',
      detail:
        'Plan the task, test a first version, then add ongoing support when the system is ready for live work.',
      tone: 'allow',
      receipts: ['workflow map', 'controlled pilot', 'operating control']
    },
    {
      id: 'boundary',
      label: 'Boundary',
      summary: 'Show what must stop',
      title: 'Your team decides which actions are allowed.',
      detail:
        'The plan shows the information AI uses, the work it can prepare, who approves it, and the record kept afterward.',
      tone: 'block',
      evidence: ['allowed routing', 'named authority', 'stop conditions', 'audit trail']
    },
    {
      id: 'ownership',
      label: 'Ownership',
      summary: 'Keep the durable assets',
      title: 'Keep the instructions and work history.',
      detail:
        'Your team keeps the account details, access rules, approvals, instructions, and work history. The handover also explains how to remove access.',
      tone: 'review',
      receipts: ['workflow map', 'tool contract', 'policy rules', 'runbook', 'operator brief']
    },
    {
      id: 'portability',
      label: 'Portability',
      summary: 'Conviction without dependence',
      title: 'Built with OpenAI. Prepared for change.',
      detail:
        'We build primarily with OpenAI Codex. Your project keeps its data, code, tool definitions, instructions, tests, and recovery guide. A different model must pass the relevant checks before you switch. CREATE SOMETHING maintains the system layer; Cloudflare provides infrastructure and OpenAI provides intelligence.',
      tone: 'neutral',
      actions: [
        { label: 'Inspect Substrate products', href: '/products' },
        { label: 'See the Cloudflare runtime', href: '/cloudflare' }
      ]
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Workflow',
      icon: 'folder',
      title: 'First workflow map',
      detail: 'Objects, source systems, owners, handoffs, and failure points.',
      state: 'ready'
    },
    {
      label: 'Boundary',
      icon: 'user',
      title: 'Vendor and ownership boundary',
      detail: 'What your team owns, what I deliver, and what vendors provide.',
      state: 'controlled'
    },
    {
      label: 'Control',
      icon: 'check',
      title: 'Decision states',
      detail: 'Auto-allow, approval-needed, and blocked states with reasons.',
      state: 'review'
    }
  ];
</script>

<SEO
  title="What You Keep | CREATE SOMETHING .agency"
  description="See what your team keeps after delivery: code, accounts, data, instructions, tests, and work history. Understand what outside vendors provide."
  keywords="delegated work control, workflow control layer, Substrate database, transparent AI stack, MCP stack, vendor boundaries, Cloudflare, OpenAI"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformanceCampaignOpening
  expression="editorial"
  eyebrow="What You Keep"
  title="Your system should stay yours."
  lede="You keep the accounts, data, approval rights, and operating history. We document the system so your team can understand it, change it, and evaluate other tools."
  media={playbookHeroMedia.stack}
  mediaMobilePlacement="background"
  density="compact"
  proof={[
    { label: 'Your team keeps', value: 'Accounts + decisions' },
    { label: 'Substrate records', value: 'State + evidence' },
    { label: 'Vendors provide', value: 'Replaceable infrastructure' }
  ]}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceNarrativeStage
  id="stack-ownership-story"
  eyebrow="One ownership story"
  title="You should be able to leave with everything that matters."
  description="See what we deliver, what your team controls, and which services come from outside vendors."
  scenes={stackScenes}
  ariaLabel="Stack ownership story"
>
  {#snippet artifact(scene: PerformanceNarrativeScene)}
    {#if scene.id === 'path'}
      <PerformanceCardGrid items={journey} columns={3} ariaLabel="Stack service journey" />
    {:else if scene.id === 'boundary'}
      <PublicAtlasStoryCanvas
        starterId="insurance-claims-intake"
        storyId="stack-insurance-claims-intake-story"
        eyebrow="Who owns what canvas"
        title="Your team decides which actions are allowed."
        description="This example shows how a claim moves through review. AI can prepare the work; the responsible person approves consequential actions."
        compact
      />
    {:else if scene.id === 'ownership'}
      <PerformanceCardGrid
        items={deliveryArtifacts}
        columns={3}
        ariaLabel="Stack delivery artifacts"
      />
    {:else}
      <div class="stack-proof-pair">
        <section aria-labelledby="platform-conviction-title">
          <h4 id="platform-conviction-title">Development tool and portable exit</h4>
          <PerformanceCardGrid
            items={platformConviction}
            columns={3}
            ariaLabel="Current platform, owned system, and portable exit path"
          />
        </section>
        <section aria-labelledby="stack-roles-title">
          <h4 id="stack-roles-title">What each part does</h4>
          <PerformanceCardGrid
            items={stackRoles}
            columns={3}
            ariaLabel="Owned Substrate with Cloudflare infrastructure and OpenAI intelligence"
          />
        </section>
      </div>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<OpenAIQualifications />

<PerformanceConversionHandoff
  expression="editorial"
  eyebrow="Start with the workflow"
  title="Bring the workflow, the accounts, and the decision owner."
  description="We’ll agree on the task, the tools it needs, and who can approve its actions before implementation starts."
  steps={ctaItems}
  handoff={{
    owner: 'Workflow owner',
    authority: 'Owned stack boundary',
    proof: 'Controlled path + decision states',
    state: 'review'
  }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .stack-proof-pair {
    display: grid;
    gap: clamp(1.25rem, 3vw, 2.5rem);
  }

  .stack-proof-pair section {
    display: grid;
    gap: 0.8rem;
  }

  .stack-proof-pair h4 {
    margin: 0;
    font-family: var(--font-performance-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
  }
</style>
