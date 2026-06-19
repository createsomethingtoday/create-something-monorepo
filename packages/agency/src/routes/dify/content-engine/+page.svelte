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

  const channelRoles: ClearCardItem[] = [
    {
      eyebrow: 'Canonical',
      icon: 'document',
      title: 'Custom-domain content cluster',
      detail:
        'Long-form Dify guides, internal links, disclosures, analytics, partner handoff, and self-serve routing live on the CREATE SOMETHING site.'
    },
    {
      eyebrow: 'Distribution',
      icon: 'mail',
      title: 'Substack dispatches',
      detail:
        'Weekly notes summarize one idea, point back to the canonical page, collect replies, and build the subscriber list.'
    },
    {
      eyebrow: 'Discovery',
      icon: 'share',
      title: 'Social and video clips',
      detail:
        'Native snippets and demos create reach, but the measurable conversion path still resolves to the canonical page.'
    }
  ];

  const targets: ClearCardItem[] = [
    {
      eyebrow: '30 days',
      icon: 'calendar',
      title: '4 canonical posts',
      detail: '100-200 subscribers and 1-2 paid conversions.'
    },
    {
      eyebrow: '90 days',
      icon: 'calendar',
      title: '8-12 canonical posts',
      detail: '300-500 subscribers and 4-6 paid conversions.'
    },
    {
      eyebrow: '6 months',
      icon: 'calendar',
      title: '2,500-5,000 visits/month',
      detail: '750-1,500 subscribers and 20 paid conversions.'
    },
    {
      eyebrow: '12 months',
      icon: 'calendar',
      title: '6,000-10,000 visits/month',
      detail: '2,000-3,500 subscribers and 50 paid conversions.'
    }
  ];

  const contentCluster: ClearCardItem[] = [
    {
      eyebrow: 'Builders',
      icon: 'document',
      title: 'Dify + MCP Control Plane',
      detail: 'Dify is the surface. MCP is the boundary.',
      href: '/dify/mcp-control-plane'
    },
    {
      eyebrow: 'Operators',
      icon: 'check',
      title: 'Dify Agent Eval Gates',
      detail: 'The evals that make Dify safer to operate.',
      href: '/book'
    },
    {
      eyebrow: 'Agencies',
      icon: 'settings',
      title: 'Ship A Dify App With MCP Tools',
      detail: 'A practical shipping checklist for Dify plus MCP.',
      href: '/book'
    },
    {
      eyebrow: 'Comparison',
      icon: 'search',
      title: 'Dify vs n8n',
      detail: 'The job changed: n8n for workflows, Dify for agent apps.',
      href: '/dify/n8n-vs-dify'
    }
  ];

  const economics: ClearCardItem[] = [
    {
      eyebrow: 'Upgrade milestone',
      icon: 'check',
      title: '20 paid conversions',
      detail: '$534/mo at 70% Professional and 30% Team on the starting 30% rate.'
    },
    {
      eyebrow: 'First scaled target',
      icon: 'arrow-up',
      title: '50 paid conversions',
      detail: '$1,869/mo with first 20 at 30%, next 30 at 50%, same plan mix.'
    },
    {
      eyebrow: 'Mature run rate',
      icon: 'arrow-up',
      title: '100 paid conversions',
      detail: '$4,094/mo with first 20 at 30%, next 80 at 50%, same plan mix.'
    }
  ];

  const operatingLoop: ClearCardItem[] = [
    {
      eyebrow: '01',
      icon: 'upload',
      title: 'Publish the custom-domain page first',
      detail: 'The agency site owns proof, disclosures, analytics, and lead routing.'
    },
    {
      eyebrow: '02',
      icon: 'arrow-right',
      title: 'Link from Dify and partner pages',
      detail: 'Keep the cluster discoverable from related commercial and partner routes.'
    },
    {
      eyebrow: '03',
      icon: 'warning',
      title: 'Keep affiliate links direct until acceptance',
      detail: 'Implementation and enterprise leads stay in the partner lane.'
    },
    {
      eyebrow: '04',
      icon: 'document',
      title: 'Log the evidence',
      detail: 'Record URL, audience, disclosure, link type, campaign, and conversion evidence.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Canonical',
      icon: 'document',
      title: 'Own the source of truth',
      detail: 'The agency domain carries proof and disclosure.'
    },
    {
      label: 'Dispatch',
      icon: 'mail',
      title: 'Send readers back',
      detail: 'Substack distributes the idea without replacing the canonical page.'
    },
    {
      label: 'Measure',
      icon: 'check',
      title: 'Track the routing',
      detail: 'Visits, clicks, conversions, and service leads stay distinct.'
    }
  ];
</script>

<SEO
  title="Dify Affiliate Content Engine | CREATE SOMETHING .agency"
  description="CREATE SOMETHING uses a custom-domain-first Dify content engine with Substack distribution for disclosed affiliate acquisition and partner-safe lead routing."
  keywords="Dify affiliate content, Dify Substack, Dify blog strategy, Dify partner funnel, Dify MCP content"
  canonical="https://createsomething.agency/dify/content-engine"
  ogType="article"
  ogImage="/og/dify-content-engine.svg"
  publishedTime="2026-05-18"
  modifiedTime="2026-06-19"
  articleSection="Dify Affiliate Content"
  articleTags={['Dify', 'affiliate', 'Substack', 'content strategy', 'MCP']}
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify Content Engine"
  title="Custom-domain content owns the funnel. Substack carries the dispatch."
  description="The Dify affiliate lane needs one canonical place for proof, disclosures, analytics, and lead routing. The CREATE SOMETHING site owns that source of truth; Substack sends readers back to it."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.governanceChecklistHref}>
      {agencyCoreMessaging.governanceChecklistLabel}
    </Button>
    <Button href="/dify" variant="secondary">Back To Dify Lane</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={channelRoles}
      columns={1}
      density="compact"
      ariaLabel="Dify content channel roles"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Channel split"
  title="Each surface has one job."
  description="Canonical pages, dispatches, and discovery clips should reinforce each other without confusing attribution or lead routing."
>
  {#snippet after()}
    <ClearCardGrid items={channelRoles} columns={3} ariaLabel="Dify content channel split" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Content cluster"
  title="Start with pieces that explain the operating model."
  description="The cluster should teach Dify plus MCP, eval gates, app packaging, delivery evidence, and practical comparison before asking for a purchase."
>
  {#snippet after()}
    <ClearCardGrid items={contentCluster} columns={4} ariaLabel="Dify content cluster" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Targets"
  title="The content engine has measurable milestones."
  description="Conversion targets stay explicit so the affiliate path does not blur into implementation or partner-led revenue."
>
  {#snippet after()}
    <ClearCardGrid items={targets} columns={4} ariaLabel="Dify content targets" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Economics"
  title="Affiliate economics are useful only after the routing is clean."
  description="Self-serve affiliate conversions, service leads, and partner opportunities should be measured separately."
>
  {#snippet after()}
    <ClearCardGrid items={economics} columns={3} ariaLabel="Dify affiliate economics" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Operating loop"
  title="Publish, link, disclose, and measure."
  description="The content workflow is a control path, not just a publishing cadence."
>
  {#snippet after()}
    <ClearCardGrid items={operatingLoop} columns={4} ariaLabel="Dify content operating loop" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Next"
  title="Use content to qualify the workflow, not replace the service path."
  description="If the reader has a concrete Dify workflow, the next step is to map the workflow, tool boundary, approval path, and evidence."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/n8n-vs-dify" variant="secondary">Read Dify vs n8n</Button>
  {/snippet}
</ClearCtaBand>
