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

  const servicePath: ClearCardItem[] = [
    {
      eyebrow: 'First step',
      icon: 'search',
      title: 'Trust Map',
      detail: 'Map the workflow, objects, owners, source systems, approvals, and first safe delegation point.'
    },
    {
      eyebrow: 'Start here',
      icon: 'settings',
      title: 'Workflow Pilot',
      detail: 'Rebuild the first handoff with rules, implementation, access setup, and portable runbooks.'
    },
    {
      eyebrow: 'Ongoing control',
      icon: 'check',
      title: 'Trust Layer',
      detail: 'Add approval states, blocked states, release checks, operator surfaces, and incident loops.'
    },
    {
      eyebrow: 'High stakes',
      icon: 'users',
      title: 'Enterprise Extension',
      detail: 'Extend the pattern across regulated, high-volume, or multi-team environments.'
    }
  ];

  const boundaryCards: ClearCardItem[] = [
    {
      eyebrow: 'You bring',
      icon: 'user',
      title: 'Workflow and approval owner',
      detail: 'The business path, source accounts, constraints, and the person who can approve risk.'
    },
    {
      eyebrow: 'I deliver',
      icon: 'settings',
      title: 'Rules, handoff, and evidence',
      detail: 'The workflow map, action boundary, safe delegation path, runbook, and release evidence.'
    },
    {
      eyebrow: 'Your team keeps',
      icon: 'folder',
      title: 'Context and control',
      detail: 'Business context, approval ownership, operating receipts, code, and handoff notes.'
    }
  ];

  const trustCards: ClearCardItem[] = [
    {
      eyebrow: 'No vendor lock-in',
      icon: 'refresh',
      title: 'The map survives tool changes',
      detail:
        'Vendor services are named because they help the workflow run. The workflow map, contracts, policy, and runbooks stay portable.'
    },
    {
      eyebrow: 'No secret sprawl',
      icon: 'warning',
      title: 'Credentials stay in approved paths',
      detail:
        'Tokens, API keys, and client credentials belong in the approved vault or runtime environment, not prompts or handoff docs.'
    },
    {
      eyebrow: 'No fake autonomy',
      icon: 'check',
      title: 'Agents act inside named permissions',
      detail:
        'The system shows what can run, what needs approval, and what stops before the agent touches the business.'
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
      detail: 'You get the service lane, trust boundary, and implementation path before build work starts.'
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
  title="Workflow Trust Layer | CREATE SOMETHING .agency"
  description="How CREATE SOMETHING makes one workflow safe to delegate: clear stack boundaries, decision states, evidence, and escalation when judgment is required."
  keywords="workflow trust layer, safe to delegate AI workflow, workflow pilot, MCP wedge, production automation, agent reliability"
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
    <Button href={agencyCoreMessaging.servicesMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="#service-path" variant="secondary">See Service Path</Button>
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
  id="service-path"
  variant="soft"
  eyebrow="Service path"
  title="Start with the smallest safe delegation point."
  description="Map what would be safe to delegate, prove the first workflow, then add the trust layer when the work starts touching revenue, compliance, or customer trust."
>
  {#snippet after()}
    <ClearCardGrid items={servicePath} columns={4} ariaLabel="Service path from map to trust layer" />
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
  eyebrow="Trust boundaries"
  title="No vendor mystery, no secret sprawl, no fake autonomy."
  description="The service gives agents constrained capacity inside named permissions and gives operators the evidence to understand each handoff."
>
  {#snippet after()}
    <ClearCardGrid items={trustCards} columns={3} ariaLabel="Trust boundaries" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
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
    <Button href={agencyCoreMessaging.servicesMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/products" variant="secondary">See Proof Surfaces</Button>
  {/snippet}
</ClearCtaBand>
