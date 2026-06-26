<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearDecisionPanel,
    ClearPageSection,
    ClearProofStrip,
    ClearReceiptGrid,
    ClearStateRows,
    SEO,
    type ClearCardItem,
    type ClearCtaItem,
    type ClearDecisionItem,
    type ClearProofItem,
    type ClearReceipt,
    type ClearWorkflowState
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
      detail: 'The support, revenue, production, or credential-touching handoff your team protects by hand.'
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

  const directToolComparison: ClearCardItem[] = [
    {
      eyebrow: 'Agent tools',
      icon: 'user',
      title: 'The operator stays the safety system',
      detail:
        'Chat, coding agents, and copilots can move fast, but someone still has to know the workflow, watch the boundary, and decide what is allowed.'
    },
    {
      eyebrow: 'Connector setup',
      icon: 'settings',
      title: 'Connection does not create trust',
      detail:
        'MCP servers and app integrations expose capability. The workflow still needs owners, action rules, approval paths, and recovery notes.'
    },
    {
      eyebrow: 'Generic automation',
      icon: 'refresh',
      title: 'Speed without receipts creates cleanup debt',
      detail:
        'A workflow can run and still be unsafe if nobody can see what changed, why it ran, what stopped, or who approves the next move.'
    },
    {
      eyebrow: 'Delegated Work Control',
      icon: 'check',
      title: 'The control layer underneath delegated work',
      detail:
        'CREATE SOMETHING defines the operating path first, then wires agents, tools, approvals, owners, and evidence into one controlled workflow.'
    }
  ];

  const calibrationCards: ClearCardItem[] = [
    {
      eyebrow: 'Explore',
      icon: 'document',
      title: 'Start with the checklist',
      detail:
        'Use this when you know AI should help but the approval rule, owner, or first workflow is not clear yet.',
      href: agencyCoreMessaging.governanceChecklistHref,
      points: ['Buyer gives: a rough workflow', 'Buyer gets: the questions needed before scope']
    },
    {
      eyebrow: 'Map',
      icon: 'search',
      title: 'Request a Workflow Trust Map',
      detail:
        'Use this when the workflow, stack, bottleneck, owner, and risk boundary can be named without a long discovery cycle.',
      href: agencyCoreMessaging.workflowTeardownHref,
      points: [
        'Buyer gives: systems, owner, drag, risk',
        'Buyer gets: workflow map, owner map, action boundary, and first receipt plan'
      ]
    },
    {
      eyebrow: 'Book',
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

  const supportRecoveryExamples: ClearCardItem[] = [
    {
      eyebrow: 'Run',
      icon: 'check',
      title: 'Address fix before fulfillment',
      detail:
        'Order state, address validation, and warehouse cutoff are clear enough for a bounded note and customer-safe confirmation.'
    },
    {
      eyebrow: 'Wait',
      icon: 'user',
      title: 'Delayed order credit',
      detail:
        'The agent can verify the shipment and draft the apology, but the goodwill credit touches revenue and waits for the owner.'
    },
    {
      eyebrow: 'Stop',
      icon: 'warning',
      title: 'Refund exception',
      detail:
        'A post-delivery full refund exceeds the support lane, so the workflow blocks money movement and opens an owner handoff.'
    }
  ];

  const boundaryStates: ClearWorkflowState[] = [
    {
      tone: 'wait',
      state: 'Bring',
      label: 'Workflow and approval owner',
      detail:
        'The business path, source accounts, constraints, and the person who can approve risk.'
    },
    {
      tone: 'run',
      state: 'Build',
      label: 'Rules, handoff, and evidence',
      detail:
        'The workflow map, action boundary, safe delegation path, runbook, and release evidence.'
    },
    {
      tone: 'stop',
      state: 'Keep',
      label: 'Context and control',
      detail: 'Business context, approval ownership, operating receipts, code, and handoff notes.'
    }
  ];

  const artifactReceipts: ClearReceipt[] = [
    {
      number: '01',
      label: 'Workflow map',
      detail: 'Objects, owners, source systems, handoffs, and known failure points.'
    },
    {
      number: '02',
      label: 'Action rules',
      detail: 'Auto-allow, approval-needed, and blocked states with reasons.'
    },
    {
      number: '03',
      label: 'Operator brief',
      detail: 'The visible state for Webflow, Dify, Linear, Notion, or a custom app.'
    },
    {
      number: '04',
      label: 'Runbook and receipts',
      detail: 'Validation commands, deploy IDs, recovery paths, and handoff notes.'
    }
  ];

  const artifactProofItems: ClearProofItem[] = [
    {
      value: 'Map',
      label: 'Source objects, owners, and handoffs stay visible.'
    },
    {
      value: 'Boundary',
      label: 'Run, wait, and stop rules are explicit before execution.'
    },
    {
      value: 'Brief',
      label: 'Operators see the current state without raw internal logs.'
    },
    {
      value: 'Receipts',
      label: 'Validation, deploy, rollback, and handoff evidence travel together.'
    }
  ];

  const objectionCards: ClearCardItem[] = [
    {
      eyebrow: 'Objection',
      icon: 'refresh',
      title: 'We already have automations',
      detail:
        'Keep the automations that work. The service adds the missing boundary: which actions can run, which wait for approval, and which stop with a reason.'
    },
    {
      eyebrow: 'Objection',
      icon: 'settings',
      title: 'We can use agents directly',
      detail:
        'Use agents directly for low-risk work. Bring in a trust layer when the workflow touches customers, revenue, production, credentials, or account ownership.'
    },
    {
      eyebrow: 'Objection',
      icon: 'folder',
      title: 'This sounds like a platform build',
      detail:
        'The first step is intentionally smaller: one workflow, one owner, one safe delegation path, and a clear no-build exit if the map is not convincing.'
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
  description="How CREATE SOMETHING makes one workflow safe to delegate: clear stack boundaries, decision states, owners, evidence, and escalation when judgment is required."
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
  title="Make one workflow safe to delegate."
  description="Bring the support recovery, customer-trust, revenue, production, or credential-touching workflow your team still protects by hand. I map what can run, what waits, what stops, who owns the decision, and what receipt survives the handoff."
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
  description="The work is strongest when the problem is concrete enough to map and important enough that brittle handoffs are already costing attention. Support recovery is the default wedge because the risk is visible."
>
  {#snippet after()}
    <ClearCardGrid items={fitCards} columns={2} ariaLabel="Workflow fit check" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Default wedge"
  title="Support recovery shows the whole boundary quickly."
  description="Cases, orders, payments, shipments, accounts, customer promises, and revenue decisions make the run/wait/stop boundary concrete before the build starts."
>
  {#snippet after()}
    <ClearCardGrid
      items={supportRecoveryExamples}
      columns={3}
      ariaLabel="Support recovery run wait stop examples"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Why this layer exists"
  title="Tools can connect the work. They cannot explain the boundary."
  description="Delegated Work Control makes the boundary visible: what can run, what waits, what stops, who owns the decision, and what evidence survives."
>
  {#snippet after()}
    <ClearCardGrid
      items={directToolComparison}
      columns={4}
      ariaLabel="Direct tool setup versus Delegated Work Control"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="atlas-warmup"
  variant="soft"
  eyebrow="Public Atlas canvas"
  title="Use Atlas to make the boundary visible before booking."
  description="The public Atlas surface turns human tasks, AI tasks, system operations, data, constraints, touchpoints, owners, stop conditions, and receipts into a first onboarding artifact. It does not touch production systems."
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
  description="The first offer is a Workflow Trust Map. If the map shows a safe delegation path, the next move is a pilot. If it does not, the work stops with a useful boundary artifact instead of becoming an open-ended automation project."
  items={servicePathDecisions}
  ariaLabel="Service path from map to trust layer"
/>

<ClearPageSection
  variant="soft"
  eyebrow="Offer calibration"
  title="The funnel routes by readiness, not curiosity."
  description="Explorers get the trust questions. Qualified buyers get a workflow map. Ready buyers bring the owner, systems, and timeline into a mapping session."
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
  title="The visitor should understand what they keep."
  description="Your team sees enough to trust and inherit the system. Sensitive credentials, private data, and platform-specific complexity stay behind the right operational boundary."
>
  {#snippet after()}
    <ClearStateRows
      eyebrow="Workflow ownership"
      title="What moves and what stays owned?"
      states={boundaryStates}
      receiptLabel="Boundary receipts"
      receipts={['workflow-map.md', 'action-boundary.md', 'handoff-notes.md']}
      ariaLabel="Workflow ownership boundary"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="What your team keeps"
  title="Leave with maps, runbooks, and receipts your team can operate."
  description="Every Workflow Trust Layer project ships with artifacts your team can inspect, run, inherit, and improve after launch."
>
  {#snippet after()}
    <div class="service-artifact-stack">
      <ClearReceiptGrid receipts={artifactReceipts} ariaLabel="Service artifacts" />
      <ClearProofStrip items={artifactProofItems} ariaLabel="Service artifact proof states" />
    </div>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Common objections"
  title="The point is not more automation. The point is safer delegation."
  description="The first engagement should make the next step clearer before it asks for a build."
>
  {#snippet after()}
    <ClearCardGrid items={objectionCards} columns={3} ariaLabel="Delegated Work Control objections" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the workflow"
  title="Map the workflow your team still protects by hand."
  description="We will define the handoffs, approvals, decision owners, failure modes, and escalation path before any implementation work starts."
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

<style>
  .service-artifact-stack {
    display: grid;
    gap: 0.85rem;
  }
</style>
