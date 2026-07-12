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
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Workflow',
      icon: 'settings',
      title: 'Visible agent surface',
      detail: 'The Dify app shows the task, user handoff, and expected outcome.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'folder',
      title: 'Scoped tool access',
      detail: 'MCP cards name the tools, resources, owners, and setup steps.'
    },
    {
      eyebrow: 'Control',
      icon: 'check',
      title: 'Approval and evidence',
      detail: 'Policy OS names what can run, what stops, and what gets recorded.'
    }
  ];

  const proofCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Sanitized proof',
      icon: 'document',
      title: 'Public Guide Agent',
      detail:
        'A public Dify guide agent backed by read-only MCP cards, evidence summaries, and no raw private traces.'
    },
    {
      eyebrow: 'Client system',
      icon: 'settings',
      title: 'Abundance Delivery',
      detail:
        'A Dify-backed delivery surface with agent inventory, eval coverage, DSL snapshots, and production-oriented evidence controls.'
    },
    {
      eyebrow: 'Workflow template',
      icon: 'refresh',
      title: 'Transcript Workflow',
      detail:
        'A prior client integration proved a repeatable Dify plus MCP pattern for turning media intake into structured operating records.'
    },
    {
      eyebrow: 'Review system',
      icon: 'check',
      title: 'Marketplace Creator Pipeline',
      detail:
        'A Dify-supported review workflow that keeps context, tool access, policy boundaries, and handoff receipts inspectable.'
    }
  ];

  const faqItems = [
    {
      question: 'What is the Dify workflow path?',
      answer:
        'It is the CREATE SOMETHING path for mapping a Dify workflow before it runs: visible app surface, MCP tool boundary, Policy OS rule, eval gates, and evidence.'
    },
    {
      question: 'Where does MCP fit with Dify?',
      answer:
        'Dify becomes the visible agent surface while MCP server cards carry tool access and Policy OS carries approval, blocked-state, and evidence behavior.'
    },
    {
      question: 'What proof matters for Dify work?',
      answer:
        'Useful proof includes Dify DSL snapshots, API health checks, expected tool use, forbidden tool use, secret refusal, latency, and write-confirmation checks.'
    }
  ];

  const audienceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Builders',
      icon: 'settings',
      title: 'Ship Dify apps with real tool contracts.',
      detail:
        'Start with MCP server cards, Dify DSL snapshots, smoke checks, and setup steps that a new user can run.'
    },
    {
      eyebrow: 'Operators',
      icon: 'user',
      title: 'Run agents with approval states attached.',
      detail:
        'Policy OS defines what can run, what needs a human, what stops, and what evidence gets recorded.'
    },
    {
      eyebrow: 'Teams',
      icon: 'users',
      title: 'Reuse the workflow pattern.',
      detail:
        'Turn proven workflows into templates, setup guides, readable proof, and repeatable delivery steps.'
    }
  ];

  const funnelCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Learn',
      icon: 'document',
      title: 'Dify plus MCP control plane',
      detail:
        'Explain how Dify becomes the visible agent surface while MCPs carry tool access and Policy OS carries boundaries.',
      href: '/dify/mcp-control-plane'
    },
    {
      eyebrow: 'Validate',
      icon: 'check',
      title: 'Agent eval gates',
      detail:
        'Show API health, expected tool use, forbidden tool use, secret refusal, latency, and write confirmation checks.',
      href: '/dify/agent-eval-gates'
    },
    {
      eyebrow: 'Ship',
      icon: 'upload',
      title: 'Ship a Dify app with MCP tools',
      detail:
        'Turn one workflow into a Dify app with scoped MCP tools, approvals, eval gates, and proof.',
      href: '/dify/ship-dify-app-with-mcp-tools'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Runtime',
      icon: 'settings',
      title: 'Dify app',
      detail: 'Visible workflow and user-facing agent surface.'
    },
    {
      label: 'Boundary',
      icon: 'folder',
      title: 'MCP card',
      detail: 'Scoped tools, resources, and setup details.'
    },
    {
      label: 'Control',
      icon: 'check',
      title: 'Policy OS',
      detail: 'Approval states, blocked states, evals, and evidence.'
    }
  ];
</script>

<SEO
  title="Dify Workflow Systems | CREATE SOMETHING .agency"
  description="CREATE SOMETHING maps Dify workflows with MCP tool boundaries, Policy OS controls, eval gates, and readable evidence."
  keywords="Dify workflow systems, Dify MCP, Policy OS, Dify eval gates, AI workflow evidence"
  ogImage="/og/dify-lane.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify Workflow Systems"
  title="Dify workflows with the operating boundary visible."
  description="CREATE SOMETHING packages Dify as the visible agent runtime, MCP as the tool boundary, and Policy OS as the approval, runbook, and evidence layer."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/stack" variant="secondary">See what you keep</Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid items={statusCards} columns={1} density="compact" ariaLabel="Dify status" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Proof"
  title="Dify proof should be visible without exposing private traces."
  description="The workflow becomes easier to trust when decision owners can see the app shape, tool boundary, eval posture, sanitized artifacts, and delivery evidence."
>
  {#snippet after()}
    <PerformanceCardGrid items={proofCards} columns={4} ariaLabel="Dify proof cards" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Audience"
  title="The same Dify map serves builders, operators, and teams."
  description="Each audience sees a concrete path instead of a generic chatbot pitch."
>
  {#snippet after()}
    <PerformanceCardGrid items={audienceCards} columns={3} ariaLabel="Dify audience fit" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Content path"
  title="Teach the control plane before asking for trust."
  description="The guide cluster explains the operating model, validates the workflow, routes teams to the right next action, and keeps the public language focused on the task, boundary, owner, stop point, and evidence."
>
  {#snippet after()}
    <PerformanceCardGrid items={funnelCards} columns={4} ariaLabel="Dify content path" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Map the agent surface"
  title="Bring one Dify workflow that needs control."
  description="I’ll map the app surface, MCP boundary, eval gates, approval states, and evidence path before the workflow becomes a production agent."
  steps={ctaItems}
  handoff={{ owner: 'Agent operator', authority: 'Scoped Dify + MCP contract', proof: 'Policy OS evidence', state: 'review' }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/mcp-control-plane" variant="secondary">Read Control Plane</Button>
    <Button href="/dify/agent-eval-gates" variant="secondary">Read Eval Gates</Button>
  {/snippet}
</PerformanceConversionHandoff>
