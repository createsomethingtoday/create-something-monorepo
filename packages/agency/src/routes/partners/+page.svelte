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
      eyebrow: 'Primary',
      icon: 'settings',
      title: 'Dify workflow systems',
      detail: 'Visible agent surfaces, MCP setup, eval gates, and control-layer controls.'
    },
    {
      eyebrow: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare runtime',
      detail: 'Workers, Pages, D1, and remote MCP surfaces as the controlled delivery substrate.'
    },
    {
      eyebrow: 'Workspace',
      icon: 'document',
      title: 'Notion operating layer',
      detail: 'The operator workspace, PM layer, and evidence surface.'
    }
  ];

  const applicationQueue: ClearCardItem[] = [
    {
      eyebrow: 'Agent runtime',
      icon: 'settings',
      title: 'Dify',
      detail:
        'Use Dify when the workflow needs a visible agent surface, MCP tool boundary, eval gates, and readable proof.',
      href: '/dify',
      points: ['Agent surface', 'MCP boundary', 'Eval gates']
    },
    {
      eyebrow: 'Runtime substrate',
      icon: 'folder',
      title: 'Cloudflare',
      detail:
        'Use Cloudflare when the workflow needs Workers, Pages, D1, remote MCPs, runbooks, and delivery evidence.',
      href: '/cloudflare',
      points: ['Runtime routes', 'Durable state', 'Rollback path']
    },
    {
      eyebrow: 'Operator workspace',
      icon: 'document',
      title: 'Notion',
      detail:
        'Use Notion when the workflow needs PM visibility, readable evidence, templates, and human review.',
      href: '/notion',
      points: ['Operator workspace', 'Review layer', 'Template proof']
    },
    {
      eyebrow: 'Reasoning host',
      icon: 'check',
      title: 'OpenAI readiness',
      detail:
        'Use OpenAI as reasoning and agent-host proof while CREATE SOMETHING owns scoped tools, approvals, evals, and operating boundaries.',
      href: '/stack',
      points: ['Scoped tools', 'Approval behavior', 'Grounded evidence']
    }
  ];

  const operatingLoop: ClearCardItem[] = [
    {
      eyebrow: '01',
      icon: 'document',
      title: 'Explain with one story',
      detail:
        'CREATE SOMETHING builds controlled AI workflow systems: agent surface, runtime substrate, operator workspace, and audit trails.'
    },
    {
      eyebrow: '02',
      icon: 'arrow-right',
      title: 'Route each workflow correctly',
      detail:
        'Readers should understand whether the work belongs in the agent surface, runtime layer, workspace, or broader stack boundary.'
    },
    {
      eyebrow: '03',
      icon: 'check',
      title: 'Publish sanitized proof',
      detail:
        'Use inventories, evidence summaries, screenshots, diagrams, templates, and setup steps without exposing private records.'
    },
    {
      eyebrow: '04',
      icon: 'refresh',
      title: 'Turn delivery into reusable proof',
      detail:
        'Turn repeated builds into Dify workflow guides, Notion templates, Cloudflare runbooks, and reusable MCP cards once proven.'
    }
  ];

  const partnerArtifacts: ClearCardItem[] = [
    {
      eyebrow: 'Strategy',
      icon: 'document',
      title: 'program_stack_packet.md',
      detail: 'One narrative tying Dify, Cloudflare, Notion, and OpenAI to the same controlled workflow system.'
    },
    {
      eyebrow: 'Review',
      icon: 'search',
      title: 'surface_review_2026_05_17.md',
      detail: 'Current review of program readiness, MCP, agent, control, and public-page alignment.'
    },
    {
      eyebrow: 'Apply',
      icon: 'edit',
      title: 'application_drafts.md',
      detail: 'Program-specific copy with conservative claims and sanitized implementation proof.'
    },
    {
      eyebrow: 'Route',
      icon: 'arrow-right',
      title: 'workflow_routing_rules.md',
      detail: 'Rules separating agent surface, runtime, workspace, and client delivery paths.'
    }
  ];

  const guardrails: ClearCardItem[] = [
    {
      eyebrow: 'Claims',
      icon: 'warning',
      title: 'No unsupported program claim',
      detail: 'No official certification, reseller, or technology alliance claim before acceptance.'
    },
    {
      eyebrow: 'Brand',
      icon: 'warning',
      title: 'No implied endorsement',
      detail: 'No vendor commercial brand use in sales collateral unless the relevant program authorizes it.'
    },
    {
      eyebrow: 'Privacy',
      icon: 'folder',
      title: 'No private proof',
      detail: 'No raw traces, secrets, private hub details, client records, billing details, or broad connector surfaces in public proof.'
    },
    {
      eyebrow: 'Disclosure',
      icon: 'check',
      title: 'No unclear routing',
      detail: 'Public routes should name the workflow, owner, approval path, stop point, and evidence.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Agent surface',
      icon: 'settings',
      title: 'Dify',
      detail: 'Visible workflows, app packaging, templates, and eval gates.'
    },
    {
      label: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare',
      detail: 'Workers, Pages, D1, queues, remote MCP endpoints, and rollback paths.'
    },
    {
      label: 'Workspace',
      icon: 'document',
      title: 'Notion',
      detail: 'PM visibility, evidence surfaces, templates, and human review.'
    }
  ];

  const faqItems = [
    {
      question: 'What is the tool program stack?',
      answer:
        'It is the public routing page for Dify, Cloudflare, Notion, and OpenAI-related workflow systems. Each tool gets a clear job inside the operating model.'
    },
    {
      question: 'Why not lead with vendor badges?',
      answer:
        'The durable value is the workflow boundary: what can run, what needs approval, what stops, who owns the account, and what evidence the operator keeps.'
    },
    {
      question: 'How does this help a team choose the right path?',
      answer:
        'The page routes a concrete workflow toward the visible agent surface, runtime substrate, operator workspace, or broader stack boundary before implementation begins.'
    }
  ];
</script>

<SEO
  title="Tool Program Stack | CREATE SOMETHING .agency"
  description="CREATE SOMETHING routes controlled AI workflow systems across Dify agent surfaces, Cloudflare runtime, Notion workspaces, and OpenAI readiness."
  keywords="AI workflow systems, Dify workflow systems, Cloudflare workflow runtime, Notion operating system, MCP tool stack"
  ogImage="/og-image.svg"
  propertyName="agency"
  {faqItems}
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Tool Program Stack"
  title="One operating story for controlled AI workflow systems."
  description="This page should not read like unrelated badges. Dify carries the visible agent runtime, Cloudflare carries the deployable substrate, Notion carries the operator workspace, and OpenAI readiness stays bounded by real authorization."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={statusCards}
      columns={1}
      density="compact"
      ariaLabel="Tool program stack status"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Route"
  title="Each tool page has one job."
  description="The public pages qualify the workflow, explain the boundary, and route teams without implying authorization that does not exist."
>
  {#snippet after()}
    <ClearCardGrid items={applicationQueue} columns={4} ariaLabel="Tool program routes" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Operating loop"
  title="Explain, route, prove, then reuse."
  description="The program system turns delivery evidence into reusable proof only after the workflow, setup, and support path are ready."
>
  {#snippet after()}
    <ClearCardGrid items={operatingLoop} columns={4} ariaLabel="Partner operating loop" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Evidence files"
  title="Program proof stays sanitized and traceable."
  description="The useful artifacts are strategy packets, application drafts, workflow-routing rules, and proof inventories that can be shared without leaking client-private records."
>
  {#snippet after()}
    <ClearCardGrid items={partnerArtifacts} columns={4} ariaLabel="Partner evidence files" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Guardrails"
  title="Conservative claims protect the channel."
  description="The program stack is credible because it does not pretend approval, endorsement, or resale rights exist before they do."
>
  {#snippet after()}
    <ClearCardGrid items={guardrails} columns={4} ariaLabel="Partner guardrails" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the route"
  title="Bring one workflow into the right tool path."
  description="I’ll identify whether the work belongs in agent runtime, infrastructure runtime, operator workspace, or a broader implementation referral."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</ClearCtaBand>
