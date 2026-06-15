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
      title: 'Dify Service Partner',
      detail: 'Implementation, training, support, MCP setup, and trust-layer controls.'
    },
    {
      eyebrow: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare PowerUP Consult',
      detail: 'Workers, Pages, D1, and remote MCP surfaces as the controlled delivery substrate.'
    },
    {
      eyebrow: 'Workspace',
      icon: 'document',
      title: 'Notion Solutions Partner',
      detail: 'The operator workspace, PM layer, and template distribution proof.'
    }
  ];

  const applicationQueue: ClearCardItem[] = [
    {
      eyebrow: 'Agent runtime',
      icon: 'settings',
      title: 'Dify',
      detail:
        'Use the Dify lane for implementation, marketplace readiness, and affiliate routing after acceptance.',
      href: '/dify',
      points: ['Service Partner first', 'Marketplace Partner after proof', 'Affiliate lane after acceptance']
    },
    {
      eyebrow: 'Runtime substrate',
      icon: 'folder',
      title: 'Cloudflare',
      detail:
        'Use the Cloudflare lane for Workers, Pages, D1, remote MCPs, runbooks, and delivery evidence.',
      href: '/cloudflare',
      points: ['PowerUP Consult first', 'Self-Serve Agency when volume justifies it']
    },
    {
      eyebrow: 'Operator workspace',
      icon: 'document',
      title: 'Notion',
      detail:
        'Use the Notion lane for PM visibility, client-readable evidence, templates, and human review.',
      href: '/notion',
      points: ['Solutions Partner first', 'Technology Partner later']
    },
    {
      eyebrow: 'Reasoning host',
      icon: 'check',
      title: 'OpenAI readiness',
      detail:
        'Use OpenAI as reasoning and agent-host proof while CREATE SOMETHING owns scoped tools, approvals, evals, and trust boundaries.',
      href: '/stack',
      points: ['Do not overclaim', 'No unsupported affiliate or reseller claim']
    }
  ];

  const operatingLoop: ClearCardItem[] = [
    {
      eyebrow: '01',
      icon: 'document',
      title: 'Apply with one story',
      detail:
        'CREATE SOMETHING builds controlled AI workflow systems: agent surface, runtime substrate, operator workspace, and trust receipts.'
    },
    {
      eyebrow: '02',
      icon: 'arrow-right',
      title: 'Route each lead correctly',
      detail:
        'Self-serve buyers use disclosed affiliate or marketplace paths only after approval. Implementation and co-sell buyers stay in partner lanes.'
    },
    {
      eyebrow: '03',
      icon: 'check',
      title: 'Publish sanitized proof',
      detail:
        'Use inventories, public trust catalogs, screenshots, diagrams, templates, and setup steps without exposing private records.'
    },
    {
      eyebrow: '04',
      icon: 'refresh',
      title: 'Convert delivery into distribution',
      detail:
        'Turn repeated builds into Dify templates, Notion templates, Cloudflare runbooks, and reusable MCP cards once proven.'
    }
  ];

  const partnerArtifacts: ClearCardItem[] = [
    {
      eyebrow: 'Strategy',
      icon: 'document',
      title: 'partner_stack_packet.md',
      detail: 'One narrative tying Dify, Cloudflare, Notion, and OpenAI to the same controlled workflow system.'
    },
    {
      eyebrow: 'Review',
      icon: 'search',
      title: 'surface_review_2026_05_17.md',
      detail: 'Current review of partner, affiliate, MCP, agent, trust, and public-page alignment.'
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
      title: 'lead_routing_rules.md',
      detail: 'Rules separating affiliate, marketplace, partner, reseller, and client delivery opportunities.'
    }
  ];

  const guardrails: ClearCardItem[] = [
    {
      eyebrow: 'Claims',
      icon: 'warning',
      title: 'No unsupported partner claim',
      detail: 'No official partner, certified provider, reseller, or technology alliance claim before acceptance.'
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
      title: 'No affiliate links before approval',
      detail: 'Affiliate links wait for acceptance, disclosure language, declared domains, and payment/tax setup.'
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
</script>

<SEO
  title="Partner Stack | CREATE SOMETHING .agency"
  description="CREATE SOMETHING partner stack for controlled AI workflow systems: Dify agent surfaces, Cloudflare runtime, Notion workspaces, and OpenAI readiness."
  keywords="Dify partner, Cloudflare partner, Notion partner, AI workflow systems, MCP partner stack"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Partner Stack"
  title="One partner story for controlled AI workflow systems."
  description="The partner surface should not read like unrelated badges. Dify carries the visible agent runtime, Cloudflare carries the deployable substrate, Notion carries the operator workspace, and OpenAI readiness stays bounded by real authorization."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/stack" variant="secondary">See Stack Boundary</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={statusCards}
      columns={1}
      density="compact"
      ariaLabel="Partner stack status"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Application lanes"
  title="Each partner page has one job."
  description="The public pages qualify the lane, explain the boundary, and route buyers without implying approval before the partner program actually grants it."
>
  {#snippet after()}
    <ClearCardGrid items={applicationQueue} columns={4} ariaLabel="Partner application lanes" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Operating loop"
  title="Apply, route, prove, then productize."
  description="The partner system turns delivery evidence into distribution only after the workflow, disclosure, setup, and support path are ready."
>
  {#snippet after()}
    <ClearCardGrid items={operatingLoop} columns={4} ariaLabel="Partner operating loop" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Evidence files"
  title="Partner proof stays sanitized and traceable."
  description="The useful artifacts are strategy packets, application drafts, lead-routing rules, and proof inventories that can be shared without leaking client-private records."
>
  {#snippet after()}
    <ClearCardGrid items={partnerArtifacts} columns={4} ariaLabel="Partner evidence files" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Guardrails"
  title="Conservative claims protect the channel."
  description="The partner stack is credible because it does not pretend approval, endorsement, or affiliate rights exist before they do."
>
  {#snippet after()}
    <ClearCardGrid items={guardrails} columns={4} ariaLabel="Partner guardrails" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the lane"
  title="Bring one workflow into the right partner path."
  description="I’ll identify whether the work belongs in agent runtime, infrastructure runtime, operator workspace, or a broader implementation referral."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/services" variant="secondary">See Service Path</Button>
  {/snippet}
</ClearCtaBand>
