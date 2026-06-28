<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    SEO,
    type ClearCardItem,
    type ClearCtaItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusCards: ClearCardItem[] = [
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

  const proofCards: ClearCardItem[] = [
    {
      eyebrow: 'Sanitized proof',
      icon: 'document',
      title: 'Public Guide Agent',
      detail: 'A public Dify guide agent backed by read-only MCP cards and evidence summaries instead of private traces.'
    },
    {
      eyebrow: 'Client system',
      icon: 'settings',
      title: 'Abundance Delivery',
      detail: 'A Dify-backed delivery surface with agent inventory, eval coverage, and production-oriented evidence controls.'
    },
    {
      eyebrow: 'Workflow template',
      icon: 'refresh',
      title: 'Transcript To Notion',
      detail: 'A repeatable Dify plus MCP workflow pattern for turning media intake into structured operating records.'
    },
    {
      eyebrow: 'Review system',
      icon: 'check',
      title: 'Marketplace Creator Pipeline',
      detail: 'A Dify-supported review workflow that keeps context, tool access, and policy boundaries inspectable.'
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

  const audienceCards: ClearCardItem[] = [
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

  const funnelCards: ClearCardItem[] = [
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
    },
    {
      eyebrow: 'Publish',
      icon: 'document',
      title: 'Dify page portfolio',
      detail:
        'Keep canonical Dify explanations, proof, routing, and next steps on the agency domain.',
      href: '/dify/content-engine'
    },
    {
      eyebrow: 'Compare',
      icon: 'search',
      title: 'Dify vs n8n',
      detail: 'Use the layer comparison when teams are deciding between automation and agent apps.',
      href: '/dify/n8n-vs-dify'
    }
  ];

  const artifactCards: ClearCardItem[] = [
    {
      eyebrow: 'Runtime',
      icon: 'folder',
      title: 'dify_inventory.md',
      detail: 'Codified Dify agents, server cards, manifests, DSL snapshots, and eval references.'
    },
    {
      eyebrow: 'MCP',
      icon: 'settings',
      title: 'mcp_coverage.md',
      detail: 'Coverage states for ready, intake-ready, brokered, dormant, and missing Dify MCP cards.'
    },
    {
      eyebrow: 'Proof',
      icon: 'document',
      title: 'trust_catalog.md',
      detail: 'Public proof that intentionally excludes raw traces, private hubs, and credential references.'
    },
    {
      eyebrow: 'Policy',
      icon: 'check',
      title: 'policy_os.md',
      detail: 'Approvals, runbooks, golden tasks, tuning, and escalation packaged as the operating rule.'
    }
  ];

  const complianceCards: ClearCardItem[] = [
    {
      eyebrow: 'Claims',
      icon: 'warning',
      title: 'Say what the workflow does',
      detail: 'Public copy should explain the mapped task, tool boundary, stop point, owner, and evidence.'
    },
    {
      eyebrow: 'Routing',
      icon: 'arrow-right',
      title: 'Send readers to the next useful page',
      detail: 'A page should route to the control model, eval gates, shipping guide, comparison, or mapping session.'
    },
    {
      eyebrow: 'Private proof',
      icon: 'folder',
      title: 'No raw traces or credentials',
      detail: 'Public proof excludes Braintrust traces, hub records, broad connector surfaces, and secrets.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
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
  ogImage="/og/dify-lane.svg"
  propertyName="agency"
  {faqItems}
/>

<ClearPageSection
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
    <Button href="/stack" variant="secondary">See Stack Boundary</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid items={statusCards} columns={1} density="compact" ariaLabel="Dify status" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Proof"
  title="Dify proof should be visible without exposing private traces."
  description="The workflow becomes easier to trust when decision owners can see the app shape, tool boundary, eval posture, and delivery evidence."
>
  {#snippet after()}
    <ClearCardGrid items={proofCards} columns={4} ariaLabel="Dify proof cards" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Audience"
  title="The same Dify map serves builders, operators, and teams."
  description="Each audience sees a concrete path instead of a generic chatbot pitch."
>
  {#snippet after()}
    <ClearCardGrid items={audienceCards} columns={3} ariaLabel="Dify audience fit" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Content path"
  title="Teach the control plane before asking for trust."
  description="The guide cluster explains the operating model, validates the workflow, and routes teams to the right next action."
>
  {#snippet after()}
    <ClearCardGrid items={funnelCards} columns={4} ariaLabel="Dify content path" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Evidence"
  title="The useful proof is repo-owned and sanitized."
  description="Dify DSL snapshots, MCP coverage, trust catalogs, and Policy OS artifacts make the system reviewable without leaking client-private records."
>
  {#snippet after()}
    <ClearCardGrid items={artifactCards} columns={4} ariaLabel="Dify evidence artifacts" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Language"
  title="The page should make the workflow easy to understand."
  description="Clear public pages name the task, boundary, owner, stop point, and evidence before asking anyone to choose a tool."
>
  {#snippet after()}
    <ClearCardGrid items={complianceCards} columns={3} ariaLabel="Dify compliance guardrails" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the agent surface"
  title="Bring one Dify workflow that needs control."
  description="I’ll map the app surface, MCP boundary, eval gates, approval states, and evidence path before the workflow becomes a production agent."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/mcp-control-plane" variant="secondary">Read Control Plane</Button>
    <Button href="/dify/agent-eval-gates" variant="secondary">Read Eval Gates</Button>
  {/snippet}
</ClearCtaBand>
