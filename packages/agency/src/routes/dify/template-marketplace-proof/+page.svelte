<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem
  } from '@create-something/canon';
  import ArticleVisualFigure from '$lib/components/ArticleVisualFigure.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const quickAnswer: PerformanceCardItem[] = [
    {
      eyebrow: 'First template',
      icon: 'document',
      title: 'Control Client Intake And MCP Audit',
      detail:
        'A read-only Dify chatflow that maps systems, workflow risk, approval points, and the first MCP audit brief.'
    },
    {
      eyebrow: 'Why this one',
      icon: 'check',
      title: 'It proves the operating boundary.',
      detail:
        'The template shows Dify as the visible app, MCP as the tool boundary, and Control as the rule set.'
    },
    {
      eyebrow: 'What waits',
      icon: 'user',
      title: 'Creator Center submission stays manual.',
      detail:
        'The live app still needs Dify Studio import, one successful run, export, and Creator Center review.'
    }
  ];

  const submissionPath: PerformanceCardItem[] = [
    {
      eyebrow: '01',
      icon: 'folder',
      title: 'Import the DSL',
      detail:
        'Start from the repo-owned starter file and keep the final Dify export tied to the template manifest.'
    },
    {
      eyebrow: '02',
      icon: 'settings',
      title: 'Connect only public cards',
      detail:
        'Use the CREATE SOMETHING, Three-Tier Framework, and Playbook MCP cards; avoid client-private tools.'
    },
    {
      eyebrow: '03',
      icon: 'check',
      title: 'Run the app once',
      detail:
        'Use a harmless intake prompt and confirm the answer names Database, Automation, Judgment, and approval boundaries.'
    },
    {
      eyebrow: '04',
      icon: 'document',
      title: 'Write the listing',
      detail:
        'Submit English name, overview, categories, tags, and numbered setup steps that a new user can follow.'
    },
    {
      eyebrow: '05',
      icon: 'upload',
      title: 'Record proof',
      detail:
        'Export the final DSL, codify the smoke case, run the Dify checks, and keep the evidence in Linear.'
    }
  ];

  const listingCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Name',
      icon: 'document',
      title: 'Control MCP Audit Assistant',
      detail:
        'Short enough to scan, and it says what the app does: audit a workflow before tool access expands.'
    },
    {
      eyebrow: 'Categories',
      icon: 'folder',
      title: 'Operations, IT, Knowledge',
      detail:
        'The template is for operating teams that need a workflow map, system inventory, and governed tool plan.'
    },
    {
      eyebrow: 'Overview',
      icon: 'search',
      title: 'Two to four clear sentences',
      detail:
        'Explain that the app collects context, classifies the work, and produces a scoped MCP audit brief.'
    },
    {
      eyebrow: 'Setup',
      icon: 'check',
      title: 'Five numbered steps',
      detail:
        'Use/import the template, add a model provider, connect the three read-only MCP cards, publish, then test.'
    }
  ];

  const gateCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Static',
      icon: 'check',
      title: 'Template pack check',
      detail: 'The repo validates DSL shape, secret-like strings, and the template manifest before submission.'
    },
    {
      eyebrow: 'Runtime',
      icon: 'settings',
      title: 'Service API smoke',
      detail:
        'The live clone should answer the intake prompt and call the expected read-only framework or playbook tool.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'warning',
      title: 'No private examples',
      detail:
        'The marketplace asset must not expose raw traces, customer data, private hubs, broad connector surfaces, or credentials.'
    },
    {
      eyebrow: 'Evidence',
      icon: 'document',
      title: 'Linear receipt',
      detail:
        'The final handoff records commands, app URL or submission state, rollback note, and remaining manual review.'
    }
  ];

  const sourceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'Publish apps to Marketplace',
      detail: 'Dify requires Creator Center submission, English listing fields, and a working app run.',
      href: 'https://docs.dify.ai/en/cloud/use-dify/publish/publish-to-marketplace'
    },
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'Template Marketplace',
      detail: 'The marketplace presents templates by category, language, creator, and one-click adoption.',
      href: 'https://marketplace.dify.ai/templates'
    },
    {
      eyebrow: 'Repo',
      icon: 'document',
      title: 'Template pack',
      detail:
        'The repo keeps DSL snapshots, setup rules, MCP card references, smoke cases, and eval gates together.',
      href: '/dify/ship-dify-app-with-mcp-tools'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Map',
      icon: 'search',
      title: 'Workflow intake',
      detail: 'Capture the systems, decision owner, risk boundary, and first controlled point.'
    },
    {
      label: 'Audit',
      icon: 'folder',
      title: 'MCP boundary',
      detail: 'Name read tools, blocked actions, setup steps, and safe smoke checks.'
    },
    {
      label: 'Publish',
      icon: 'upload',
      title: 'Marketplace proof',
      detail: 'Submit only after the live clone runs and the repo checks pass.'
    }
  ];
</script>

<SEO
  title="Dify Template Marketplace Proof | CREATE SOMETHING .agency"
  description="How CREATE SOMETHING packages a Dify template marketplace submission around Control, MCP boundaries, setup steps, smoke checks, and client-safe proof."
  keywords="Dify Template Marketplace, Dify Creator Center, Dify template, Control, MCP audit, Dify marketplace proof"
  canonical="https://createsomething.agency/dify/template-marketplace-proof"
  ogType="article"
  ogImage="/og/dify-lane.png"
  publishedTime="2026-07-04"
  modifiedTime="2026-07-04"
  articleSection="Dify Implementation"
  articleTags={['Dify', 'Template Marketplace', 'Creator Center', 'Control', 'MCP']}
  propertyName="agency"
  noindex={true}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify Template Marketplace"
  title="Publish the proof, not a generic template."
  description="The first CREATE SOMETHING marketplace asset should show a controlled workflow: Dify carries the app, MCP scopes the tools, and Control explains what can run, wait, or stop."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/ship-dify-app-with-mcp-tools" variant="secondary">
      Read Shipping Guide
    </Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid
      items={quickAnswer}
      columns={1}
      density="compact"
      ariaLabel="Dify marketplace proof summary"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Submission path"
  title="The first template should be read-only and easy to inspect."
  description="A marketplace template should help a new Dify user get to a working app in minutes while keeping private delivery evidence out of the public package."
>
  {#snippet after()}
    <PerformanceCardGrid items={submissionPath} columns={4} ariaLabel="Dify marketplace submission path" />
    <ArticleVisualFigure
      src="/images/articles/dify-ship-mcp-tools/dify-mcp-shipping-path.png"
      alt="Diagram showing Dify as the app surface, MCP as the tool boundary, Control as the control layer, and proof as the release surface."
      eyebrow="Submission visual"
      title="Marketplace proof still follows surface, boundary, control, proof."
      caption="The public template should teach the operating boundary before it asks users to connect more tools."
      sourceLabel="Created by CREATE SOMETHING for the Dify implementation cluster."
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Listing packet"
  title="The marketplace listing needs clear metadata."
  description="Dify templates should have English names, concise overviews, focused categories, and setup steps that match the real app setup order."
>
  {#snippet after()}
    <PerformanceCardGrid items={listingCards} columns={4} ariaLabel="Dify marketplace listing packet" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Gates"
  title="Do not submit until the app and repo agree."
  description="The Dify Studio clone, exported DSL, repo manifest, smoke case, and public copy should all describe the same workflow boundary."
>
  {#snippet after()}
    <PerformanceCardGrid items={gateCards} columns={4} ariaLabel="Dify marketplace gates" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Sources"
  title="The path follows Dify's current publishing model."
  description="Creator Center owns submission and review. The repo owns the template contract, smoke evidence, and public explanation."
>
  {#snippet after()}
    <PerformanceCardGrid items={sourceCards} columns={3} ariaLabel="Dify marketplace sources" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Next step"
  title="Map one Dify template before it goes public."
  description="I’ll map the workflow, app surface, MCP boundary, setup steps, smoke checks, and client-safe proof before the template expands to more tools."
  steps={ctaItems}
  handoff={{ owner: 'Template publisher', authority: 'Marketplace submission contract', proof: 'Live clone + repo checks', state: 'review' }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify" variant="secondary">Back To Dify</Button>
    <Button href="/dify/agent-eval-gates" variant="secondary">Read Eval Gates</Button>
  {/snippet}
</PerformanceConversionHandoff>
