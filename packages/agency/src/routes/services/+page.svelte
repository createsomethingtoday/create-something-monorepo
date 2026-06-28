<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearDecisionPanel,
    ClearPageSection,
    SEO,
    type ClearCardItem,
    type ClearCtaItem,
    type ClearDecisionItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';

  const services = [
    {
      name: 'Workflow Trust Map',
      description:
        'A fixed first map of the workflow, object model, action boundary, approval path, and first safe delegation point.',
      type: 'Entry wedge',
      price: 'Fixed scope',
      priceDescription: 'Map before any build decision'
    },
    {
      name: 'Workflow Pilot',
      description:
        'A single workflow rebuilt with clear rules, clean handoffs, and production-safe behavior.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: 'Trust Layer',
      description:
        'The Workflow Trust Layer for delegated work already in motion: scoped actions, approval states, release checks, blocked states, and incident loops.',
      type: 'Workflow Control Plan',
      price: 'Custom',
      priceDescription: 'Monthly'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Audit-ready orchestration for regulated, high-volume, or multi-system workflows that need deterministic recovery.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation'
    }
  ];

  const heroSignals: ClearCardItem[] = [
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: '1 risky workflow',
      detail:
        'The support, revenue, production, or credential-touching handoff your team protects by hand.'
    },
    {
      eyebrow: 'Control',
      icon: 'check',
      title: '3 decision states',
      detail: 'Auto-allow, approval-needed, or blocked with a reason.'
    },
    {
      eyebrow: 'Surface',
      icon: 'document',
      title: 'Receipt plan',
      detail: 'The operator sees what ran, what waited, what stopped, and which owner decides next.'
    }
  ];

  const fitCards: ClearCardItem[] = [
    {
      eyebrow: 'Good fit',
      icon: 'success',
      title: 'A named workflow is dragging',
      detail:
        'The strongest starting point is one workflow with a visible owner, repeated handoffs, and consequences when the handoff fails.',
      points: [
        'Support recovery, customer trust, revenue ops, or delivery work is already being rescued by hand',
        'Crosses systems, teams, or permissions',
        'Creates rework, customer risk, compliance concern, or revenue drag',
        'Has someone who owns approval without wanting to watch all day'
      ]
    },
    {
      eyebrow: 'Not the fit',
      icon: 'warning',
      title: 'A vague automation wishlist',
      detail:
        'The work is not broad admin coverage, staff augmentation, or fake autonomy. It needs a concrete operating path.',
      points: [
        'No one can name the approval owner',
        'The failure mode is still abstract',
        'The goal is unattended action without scoped rules'
      ]
    }
  ];

  const servicePathDecisions: ClearDecisionItem[] = [
    {
      label: 'Workflow Trust Map',
      summary: 'Map',
      title: 'Fixed-scope first offer',
      detail:
        'Use this when the workflow is real but the safe delegation point is still unclear. If the map does not show a safe path, stop there.',
      tone: 'review',
      evidence: ['Workflow map', 'Owner map', 'Action boundary', 'First receipt plan'],
      receipts: ['first-receipt-plan.md', 'pilot-recommendation.md']
    },
    {
      label: 'Workflow Pilot',
      summary: 'Run',
      title: 'One workflow to production proof',
      detail:
        'Use this when the first handoff is clear enough to rebuild and verify with real operating evidence.',
      tone: 'allow',
      evidence: ['Implemented path', 'Operator surface', 'Runbook'],
      receipts: ['release-evidence.md', 'accepted-handoff.md']
    },
    {
      label: 'Trust Layer',
      summary: 'Wait',
      title: 'Monthly control around live work',
      detail:
        'Use this when a live workflow needs approval states, blocked states, release checks, and recovery loops.',
      tone: 'review',
      evidence: ['Monitored decisions', 'Approval states', 'Recovery notes'],
      receipts: ['incident-loop.md', 'iteration-queue.md']
    },
    {
      label: 'Enterprise Extension',
      summary: 'Gate',
      title: 'Multi-team control path',
      detail:
        'Use this when the workflow crosses teams, systems, compliance needs, or account boundaries.',
      tone: 'block',
      evidence: ['Rollout plan', 'Access model', 'Audit posture'],
      receipts: ['procurement-gate.md', 'ownership-transfer.md']
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Before build',
      icon: 'folder',
      title: 'Name the workflow',
      detail: 'Bring the handoff, owner, source systems, and risk you want out of manual rescue.'
    },
    {
      label: 'During session',
      icon: 'settings',
      title: 'Map the control path',
      detail: 'We define what can run, what waits, what stops, and what evidence proves it.'
    },
    {
      label: 'After session',
      icon: 'check',
      title: 'Leave with the first safe path',
      detail:
        'You get the service lane, trust boundary, and implementation path before build work starts.'
    }
  ];

  const faqItems = [
    {
      question: 'What is your primary service?',
      answer:
        'The first offer is a fixed-scope Workflow Trust Map. Workflow Pilot follows only when the first safe delegation path is clear enough to build.'
    },
    {
      question: 'Are agents part of the workforce?',
      answer:
        'They can be, when the workflow gives them a clear job, scoped tools, approval boundaries, named ownership, and evidence.'
    },
    {
      question: 'Do we need to understand MCP first?',
      answer:
        'No. Bring the workflow and the accounts involved. I translate the technical choices into a stack boundary and implementation path.'
    },
    {
      question: 'Do clients own the implementation?',
      answer:
        'Yes. Clients retain ownership of code, workflows, operating documentation, and approval authority.'
    }
  ];
</script>

<SEO
  title="Delegated Work Control | How I Work"
  description="How CREATE SOMETHING makes one business workflow safe to delegate: name the workflow, map the safe lane, then pilot only when the boundary is clear."
  keywords="delegated work control, workflow trust layer, workflow mapping, AI interaction design, safe to delegate AI workflow, workflow pilot, production automation, agent reliability"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="How I Work"
  title="Make one business workflow safe to hand to AI."
  description="Bring the support, revenue, production, or credential-touching handoff your team still protects by hand. I map the safe lane before anything touches customers, money, production, or accounts."
>
  {#snippet actions()}
    <Button href="#atlas-warmup">
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={heroSignals}
      columns={1}
      density="compact"
      ariaLabel="Workflow service signals"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Fit check"
  title="This works when the problem is named."
  description="The right starting point is not a broad automation wishlist. It is one repeated handoff, one accountable owner, and one risk your team no longer wants to watch all day."
>
  {#snippet after()}
    <ClearCardGrid items={fitCards} columns={2} ariaLabel="Workflow fit check" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="atlas-warmup"
  variant="soft"
  eyebrow="Map before booking"
  title="See the lane before deciding to build."
  description="The public Atlas map turns one workflow into a first artifact: the systems involved, the action lane, the approval owner, the hard stop, and the receipt. It does not touch production systems."
>
  {#snippet after()}
    <PublicAtlasStoryCanvas
      starterId="marketplace-review-queue"
      storyId="services-marketplace-review-story"
      compact
    />
    <PublicAtlasCanvas />
  {/snippet}
</ClearPageSection>

<ClearDecisionPanel
  id="service-path"
  eyebrow="Service path"
  title="Start with a fixed-scope map before any build decision."
  description="If the map shows a safe lane, the next move is a pilot. If it does not, the work stops with a useful boundary artifact instead of becoming an open-ended automation project."
  items={servicePathDecisions}
  ariaLabel="Service path from map to trust layer"
/>

<ClearCtaBand
  eyebrow="Map the workflow"
  title="Map the workflow your team still protects by hand."
  description="We will define the handoff, owner, allowed actions, approval pauses, hard stops, and proof record before any implementation work starts."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href="#atlas-warmup">
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</ClearCtaBand>
