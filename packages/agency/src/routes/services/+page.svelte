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

  const servicePathDecisions: ClearDecisionItem[] = [
    {
      label: 'Trust Map',
      summary: 'Map',
      title: 'Diagnostic before build',
      detail: 'Use this when the workflow is real but the safe delegation point is still unclear.',
      tone: 'review',
      evidence: ['Workflow map', 'Owner map', 'Action boundary'],
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
      eyebrow: 'Workflow Trust Layer',
      icon: 'check',
      title: 'The layer underneath the agent work',
      detail:
        'CREATE SOMETHING defines the operating path first, then wires agents, tools, approvals, and evidence into one controlled workflow.'
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
  title="Workflow Trust Layer | How I Work"
  description="How CREATE SOMETHING makes one workflow safe to delegate: clear stack boundaries, decision states, evidence, and escalation when judgment is required."
  keywords="workflow trust layer, workflow mapping, AI interaction design, safe to delegate AI workflow, workflow pilot, production automation, agent reliability"
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
  variant="soft"
  eyebrow="Why this layer exists"
  title="Tools can connect the work. They do not decide what should be trusted."
  description="The durable value is the layer underneath the agent: the workflow boundary, approval model, recovery path, and evidence trail."
>
  {#snippet after()}
    <ClearCardGrid
      items={directToolComparison}
      columns={4}
      ariaLabel="Direct tool setup versus Workflow Trust Layer"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="atlas-warmup"
  variant="soft"
  eyebrow="Public Atlas canvas"
  title="Map the workflow before booking."
  description="The public Atlas surface turns human tasks, AI tasks, system operations, data, constraints, and touchpoints into a first onboarding artifact. A constrained mapping agent can help shape the canvas without touching production systems."
>
  {#snippet after()}
    <PublicAtlasCanvas />
  {/snippet}
</ClearPageSection>

<ClearDecisionPanel
  id="service-path"
  eyebrow="Service path"
  title="Every engagement has a clean exit."
  description="Start with the smallest safe delegation point, prove the first workflow, then add the trust layer only when live work needs more control. Each step has a concrete output, a decision point, and a next-state the buyer can understand."
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
  title="Transparency creates calm when the workflow has clear boundaries."
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
  description="Every trust-layer project ships with artifacts your team can inspect, run, inherit, and improve after launch."
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
    <ClearCardGrid items={objectionCards} columns={3} ariaLabel="Workflow Trust Layer objections" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the workflow"
  title="Map the workflow your team still protects by hand."
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

<style>
  .service-artifact-stack {
    display: grid;
    gap: 0.85rem;
  }
</style>
