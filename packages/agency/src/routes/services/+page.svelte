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
  import WorkflowMappingWarmup from '$lib/components/WorkflowMappingWarmup.svelte';

  const services = [
    {
      name: 'Trust Map',
      description:
        'A fixed first map of the workflow, object model, action boundary, approval path, and first safe delegation point.',
      type: 'Entry wedge',
      price: 'Custom',
      priceDescription: 'Scoped diagnostic'
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
        'Scoped actions, approval states, release checks, blocked states, and incident loops for workflows already in motion.',
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
      title: '1 workflow',
      detail: 'The handoff your team needs done without constant human coverage.'
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
      title: 'Quiet brief',
      detail: 'The operator sees only what needs judgment.'
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

  const commercialShape: ClearCardItem[] = [
    {
      eyebrow: 'Trust Map',
      icon: 'search',
      title: 'Diagnostic before build',
      detail: 'Use this when the workflow is real but the safe delegation point is still unclear.',
      points: [
        'Timing: before implementation or platform selection',
        'Output: workflow map, owner map, action boundary, first receipt plan',
        'Exit: pilot recommendation, trust-layer scope, or no-build handoff'
      ]
    },
    {
      eyebrow: 'Workflow Pilot',
      icon: 'settings',
      title: 'One workflow to production proof',
      detail:
        'Use this when the first handoff is clear enough to rebuild and verify with real operating evidence.',
      points: [
        'Timing: one scoped workflow before broader automation',
        'Output: implemented path, operator surface, runbook, release evidence',
        'Exit: accepted handoff, blocked decisions, or trust-layer retainer'
      ]
    },
    {
      eyebrow: 'Trust Layer',
      icon: 'check',
      title: 'Monthly control around live work',
      detail:
        'Use this when a live workflow needs approval states, blocked states, release checks, and recovery loops.',
      points: [
        'Cadence: monthly control around work already in motion',
        'Output: monitored decisions, receipts, incident notes, iteration queue',
        'Exit: maintained control layer or transfer-ready operating package'
      ]
    },
    {
      eyebrow: 'Enterprise Extension',
      icon: 'users',
      title: 'Multi-team control path',
      detail:
        'Use this when the workflow crosses teams, systems, compliance needs, or account boundaries.',
      points: [
        'Shape: phased rollout with explicit procurement and access gates',
        'Output: rollout plan, access model, audit posture, ownership design',
        'Exit: managed implementation, platform handoff, or account transfer'
      ]
    }
  ];

  const calibrationCards: ClearCardItem[] = [
    {
      eyebrow: 'Cold buyer',
      icon: 'document',
      title: 'Start with the checklist',
      detail:
        'Use this when you know AI should help but the approval rule, owner, or first workflow is not clear yet.',
      href: agencyCoreMessaging.governanceChecklistHref,
      points: ['Buyer gives: a rough workflow', 'Buyer gets: the questions needed before scope']
    },
    {
      eyebrow: 'Qualified buyer',
      icon: 'search',
      title: 'Request a trust map',
      detail:
        'Use this when the workflow, stack, bottleneck, and risk boundary can be named without a long discovery cycle.',
      href: agencyCoreMessaging.workflowTeardownHref,
      points: [
        'Buyer gives: systems, owner, drag, risk',
        'Buyer gets: the first safe delegation path'
      ]
    },
    {
      eyebrow: 'Ready buyer',
      icon: 'check',
      title: 'Book the mapping session',
      detail:
        'Use this when there is urgency, an approval owner, and a real decision to make about workflow capacity.',
      href: agencyCoreMessaging.servicesMappingSessionHref,
      points: ['Buyer gives: decision timeline', 'Buyer gets: map, lane, and build recommendation']
    }
  ];

  const proofRecords: ClearCardItem[] = [
    {
      eyebrow: 'Abundance',
      icon: 'settings',
      title: 'Workflow pilot with recruiter-gated agent work',
      detail:
        'Recruiter-gated agent work, shared operating data, job discovery, eval evidence, and explicit account-owner decisions.',
      href: '/delivery/abundance',
      points: ['Shows: pilot proof, agent boundary, public/private evidence split']
    },
    {
      eyebrow: 'ShivWorks',
      icon: 'folder',
      title: 'Backend handoff with named access lanes',
      detail:
        'Developer runbook, named access lanes, production data boundaries, and a named-recipient approval gate.',
      href: '/delivery/shivworks',
      points: ['Shows: handoff proof, access control, ownership transfer options']
    }
  ];

  const boundaryCards: ClearCardItem[] = [
    {
      eyebrow: 'You bring',
      icon: 'user',
      title: 'Workflow and approval owner',
      detail:
        'The business path, source accounts, constraints, and the person who can approve risk.'
    },
    {
      eyebrow: 'I deliver',
      icon: 'settings',
      title: 'Rules, handoff, and evidence',
      detail:
        'The workflow map, action boundary, safe delegation path, runbook, and release evidence.'
    },
    {
      eyebrow: 'Your team keeps',
      icon: 'folder',
      title: 'Context and control',
      detail: 'Business context, approval ownership, operating receipts, code, and handoff notes.'
    }
  ];

  const artifactCards: ClearCardItem[] = [
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: 'Workflow map',
      detail: 'Objects, owners, source systems, handoffs, and known failure points.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'check',
      title: 'Action rules',
      detail: 'Auto-allow, approval-needed, and blocked states with reasons.'
    },
    {
      eyebrow: 'Surface',
      icon: 'document',
      title: 'Operator brief',
      detail: 'The visible state for Webflow, Dify, Linear, Notion, or a custom app.'
    },
    {
      eyebrow: 'Evidence',
      icon: 'download',
      title: 'Runbook and receipts',
      detail: 'Validation commands, deploy IDs, recovery paths, and handoff notes.'
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
        'Workflow Pilot fixes the first painful workflow. Trust Layer becomes the ongoing plan once speed needs approvals, release controls, and oversight.'
    },
    {
      question: 'Are agents part of the workforce?',
      answer:
        'They can be, when the workflow gives them a clear job, scoped tools, approval boundaries, and evidence.'
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
  title="Workflow Control Service | How I Work"
  description="How CREATE SOMETHING makes one workflow safe to delegate: clear stack boundaries, decision states, evidence, and escalation when judgment is required."
  keywords="workflow mapping, AI interaction design, workflow trust layer, safe to delegate AI workflow, workflow pilot, production automation, agent reliability"
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
  title="Start with one workflow."
  description="Bring the operating path your team cannot keep covering by hand. I map the inputs, owners, approvals, and failure modes; rebuild the handoff; and add controlled agent capacity only where the boundary is clear."
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
  title="Bring one workflow with an owner, risk, and repeatable drag."
  description="The work is strongest when the problem is concrete enough to map and important enough that brittle handoffs are already costing attention."
>
  {#snippet after()}
    <ClearCardGrid items={fitCards} columns={2} ariaLabel="Workflow fit check" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="atlas-warmup"
  variant="soft"
  eyebrow="Atlas warmup"
  title="Map the workflow yourself before booking."
  description="Inspired by quietloudlab's AI Interaction Atlas, this warmup turns human tasks, AI tasks, system operations, data, constraints, and touchpoints into the first onboarding artifact."
>
  {#snippet after()}
    <WorkflowMappingWarmup />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="service-path"
  variant="white"
  eyebrow="Service path"
  title="Every engagement has a clean exit."
  description="Start with the smallest safe delegation point, prove the first workflow, then add the trust layer only when live work needs more control. Each step has a concrete output, a decision point, and a next-state the buyer can understand."
>
  {#snippet after()}
    <ClearCardGrid
      items={commercialShape}
      columns={4}
      ariaLabel="Service path from map to trust layer"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Offer calibration"
  title="The funnel routes by readiness, not curiosity."
  description="Cold readers get the trust questions. Qualified buyers get a workflow map. Ready buyers bring the owner, systems, and timeline into a mapping session."
>
  {#snippet after()}
    <ClearCardGrid items={calibrationCards} columns={3} ariaLabel="Buyer readiness paths" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Delivery proof"
  title="Delivery records show what happens after the call."
  description="The proof surface is not a portfolio screenshot. It shows the operating result, what stayed private, which decisions remain, and how ownership moves."
>
  {#snippet after()}
    <ClearCardGrid items={proofRecords} columns={2} ariaLabel="Delivery proof records" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Ownership boundary"
  title="Transparency creates calm when the workflow has clear boundaries."
  description="Your team sees enough to trust and inherit the system. Sensitive credentials, private data, and platform-specific complexity stay behind the right operational boundary."
>
  {#snippet after()}
    <ClearCardGrid items={boundaryCards} columns={3} ariaLabel="Workflow ownership boundary" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="What your team keeps"
  title="Leave with maps, runbooks, and receipts your team can operate."
  description="Every trust-layer project ships with artifacts your team can inspect, run, inherit, and improve after launch."
>
  {#snippet after()}
    <ClearCardGrid items={artifactCards} columns={4} ariaLabel="Service artifacts" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the workflow"
  title="Map the workflow that's creating the most drag."
  description="We will define the handoffs, approvals, failure modes, and escalation path before any implementation work starts."
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
