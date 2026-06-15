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
      eyebrow: 'Application',
      icon: 'settings',
      title: 'Service Partner',
      detail: 'Implementation, training, support, governance, and enterprise adoption.'
    },
    {
      eyebrow: 'Distribution',
      icon: 'folder',
      title: 'Marketplace Partner',
      detail: 'Templates, plugins, and repeatable Dify plus MCP solutions.'
    },
    {
      eyebrow: 'Target',
      icon: 'check',
      title: '20 paid conversions',
      detail: 'The first affiliate economics milestone after Dify accepts the application.'
    }
  ];

  const proofCards: ClearCardItem[] = [
    {
      eyebrow: 'Sanitized proof',
      icon: 'document',
      title: 'Public Guide Agent',
      detail: 'A public Dify guide agent backed by read-only MCP cards and trust catalog evidence instead of private traces.'
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
      detail: 'A Dify-supported marketplace workflow that keeps review context, tool access, and policy boundaries inspectable.'
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
      eyebrow: 'Agencies',
      icon: 'users',
      title: 'Package repeatable Dify delivery.',
      detail:
        'Turn proven workflows into templates, plugin candidates, client-safe case studies, and affiliate-ready content.'
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
      href: '/dify/mcp-control-plane#evals'
    },
    {
      eyebrow: 'Publish',
      icon: 'upload',
      title: 'Custom-domain content engine',
      detail:
        'Keep canonical Dify articles, disclosures, analytics, and partner handoff on the agency domain.',
      href: '/dify/content-engine'
    },
    {
      eyebrow: 'Compare',
      icon: 'search',
      title: 'Dify vs n8n',
      detail: 'Use the layer comparison when buyers are deciding between automation and agent apps.',
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
      eyebrow: 'Partner',
      icon: 'warning',
      title: 'No official partner claim before approval',
      detail: 'The page can show readiness and proof without implying Dify has accepted the application.'
    },
    {
      eyebrow: 'Affiliate',
      icon: 'warning',
      title: 'No affiliate link replacement before acceptance',
      detail: 'Affiliate routing waits for acceptance, disclosures, and declared surfaces.'
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
  title="Dify Implementation Lane | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds Dify-first agent systems with MCP connectivity, Policy OS governance, eval gates, and client-safe evidence."
  keywords="Dify implementation, Dify MCP, Dify partner application, Dify affiliate, Policy OS, AI agent governance"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify Implementation Lane"
  title="Dify-ready agent systems with the policy layer attached."
  description="CREATE SOMETHING packages Dify as the visible agent runtime, MCP as the tool boundary, and Policy OS as the approval, runbook, and evidence layer."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/partners" variant="secondary">See Partner Stack</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid items={statusCards} columns={1} density="compact" ariaLabel="Dify status" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Proof"
  title="Dify proof should be visible without exposing private traces."
  description="The lane works when buyers can see the app shape, tool boundary, eval posture, and delivery evidence."
>
  {#snippet after()}
    <ClearCardGrid items={proofCards} columns={4} ariaLabel="Dify proof cards" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Audience"
  title="The same Dify lane serves builders, operators, and agencies."
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
  description="The guide cluster explains the operating model, validates the workflow, and routes buyers to the right next action."
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
  eyebrow="Compliance"
  title="The lane is conservative until Dify accepts it."
  description="The public page should separate implementation proof from affiliate, marketplace, and partner claims that require approval."
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
  {/snippet}
</ClearCtaBand>
