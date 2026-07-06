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

  const gateCards: ClearCardItem[] = [
    {
      eyebrow: 'Health',
      icon: 'check',
      title: 'API and MCP connectivity',
      detail:
        'The Dify app can reach the expected MCP server cards, required tools, and setup state before a user depends on the workflow.'
    },
    {
      eyebrow: 'Path',
      icon: 'search',
      title: 'Expected tool use',
      detail:
        'Golden tasks prove the agent calls the right read, search, draft, or handoff tool for normal cases.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'warning',
      title: 'Forbidden tool use',
      detail:
        'Negative cases prove the agent does not call write, delete, export, refund, or broad-access tools outside the contract.'
    },
    {
      eyebrow: 'Approval',
      icon: 'user',
      title: 'Write confirmation',
      detail:
        'Risky or customer-facing actions pause with context, options, and evidence instead of silently executing.'
    },
    {
      eyebrow: 'Safety',
      icon: 'folder',
      title: 'Secret refusal',
      detail:
        'The app refuses credential requests, private trace disclosure, broad data export, and prompt-injection attempts.'
    },
    {
      eyebrow: 'Operations',
      icon: 'settings',
      title: 'Latency and cost guardrails',
      detail:
        'The workflow stays inside a defined time and spend envelope, or stops with a reason and fallback path.'
    }
  ];

  const observabilityCards: ClearCardItem[] = [
    {
      eyebrow: 'Dify',
      icon: 'search',
      title: 'Langfuse watches the app runtime',
      detail:
        'Dify can send app traces to Langfuse, so operators can inspect conversations, prompts, model calls, latency, cost, and runtime errors where the Dify app actually runs.'
    },
    {
      eyebrow: 'MCP',
      icon: 'check',
      title: 'Langfuse scores the tool contract',
      detail:
        'CREATE SOMETHING uses Langfuse-backed evals for the MCPs we create, so expected tool use, forbidden tool use, write confirmation, and policy-boundary checks stay tied to the repo-owned contract.'
    },
    {
      eyebrow: 'Evidence',
      icon: 'folder',
      title: 'One evidence layer answers both questions',
      detail:
        'Langfuse explains what happened inside the Dify app and stores the eval evidence for whether the MCP boundary behaved the way the workflow contract promised.'
    }
  ];

  const evidenceCards: ClearCardItem[] = [
    {
      eyebrow: 'Health',
      icon: 'check',
      title: 'API and MCP connectivity',
      detail:
        'Use a Service API smoke plus Dify MCP setup state to prove the app can reach the expected server cards and tools.',
      points: [
        'Evidence: route health, tool availability, harmless read result',
        'Failure: block publish until the card or bearer path is fixed'
      ]
    },
    {
      eyebrow: 'Langfuse',
      icon: 'search',
      title: 'Runtime trace quality',
      detail:
        'Use Langfuse for Dify app sessions, prompt changes, model behavior, latency, token use, and runtime errors.',
      points: [
        'Evidence: trace link, session summary, cost and latency envelope',
        'Failure: narrow context, revise prompt, or change model path'
      ]
    },
    {
      eyebrow: 'Langfuse',
      icon: 'document',
      title: 'MCP contract behavior',
      detail:
        'Use Langfuse-backed eval runs for the CREATE SOMETHING-owned MCP gates that prove the agent uses the right tools and avoids disallowed tools.',
      points: [
        'Evidence: eval run, expected and forbidden tool assertions',
        'Failure: revise tool contract, tool description, or policy pack'
      ]
    },
    {
      eyebrow: 'Approval',
      icon: 'user',
      title: 'Write confirmation',
      detail:
        'Use negative and approval-path cases to prove write-capable tools pause before customer-facing or irreversible actions.',
      points: [
        'Evidence: confirmation prompt and no write before approval',
        'Failure: remove write scope or require a stricter approval state'
      ]
    }
  ];

  const workflowCards: ClearCardItem[] = [
    {
      eyebrow: '01',
      icon: 'document',
      title: 'Start from the contract bundle',
      detail:
        'Use the MCP contract, agent contract, outcome contract, golden tasks, and runbook as the source of truth.'
    },
    {
      eyebrow: '02',
      icon: 'settings',
      title: 'Map each gate to one workflow risk',
      detail:
        'Do not test everything at once. Pair each gate with the specific behavior it protects.'
    },
    {
      eyebrow: '03',
      icon: 'check',
      title: 'Run gates before publishing',
      detail:
        'A Dify workflow is not production-ready until Langfuse tracing is connected and the required Langfuse MCP eval gates pass against the current app and MCP cards.'
    },
    {
      eyebrow: '04',
      icon: 'refresh',
      title: 'Rerun after changes',
      detail:
        'Prompt, tool, model, DSL, policy, and runtime changes all require the relevant gates to run again.'
    }
  ];

  const proofCards: ClearCardItem[] = [
    {
      eyebrow: 'Public',
      icon: 'document',
      title: 'Client-safe proof',
      detail:
        'Share route health, gate names, pass/fail status, release notes, and sanitized examples without exposing raw traces.'
    },
    {
      eyebrow: 'Private',
      icon: 'folder',
      title: 'Operator evidence',
      detail:
        'Keep Langfuse traces, eval runs, account records, prompt variants, secrets, and approval receipts in the owning private system.'
    },
    {
      eyebrow: 'Decision',
      icon: 'check',
      title: 'Graduation evidence',
      detail:
        'Use passing gates to justify more autonomy, and failing gates to justify rollback, narrowed scope, or human review.'
    }
  ];

  const exampleRows: ClearCardItem[] = [
    {
      eyebrow: 'Support triage',
      icon: 'mail',
      title: 'Draft only unless approved',
      detail:
        'Normal cases draft replies. Refund, deletion, legal, and security cases route to a named human.'
    },
    {
      eyebrow: 'Template review',
      icon: 'search',
      title: 'Evidence before judgment',
      detail:
        'The app gathers published-site and policy evidence before making a review recommendation.'
    },
    {
      eyebrow: 'Inbox sync',
      icon: 'refresh',
      title: 'No broad export',
      detail:
        'The app reads authorized records, detects missing context, and blocks bulk export or secret disclosure.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Contract',
      icon: 'document',
      title: 'Bundle first',
      detail: 'The gates come from the workflow contract, not from a generic checklist.'
    },
    {
      label: 'Run',
      icon: 'check',
      title: 'Gate before publish',
      detail: 'The Dify workflow earns more autonomy only after the required checks pass.'
    },
    {
      label: 'Prove',
      icon: 'folder',
      title: 'Sanitize evidence',
      detail: 'Share proof without leaking private traces, account records, or credentials.'
    }
  ];
</script>

<SEO
  title="Dify Agent Eval Gates | CREATE SOMETHING .agency"
  description="The eval gates that make Dify safer to operate: Dify-native Langfuse traces, Langfuse MCP gates, API health, expected tool use, forbidden actions, write confirmation, secret refusal, latency, cost, and release evidence."
  keywords="Dify agent eval gates, Dify Langfuse, Dify evals, Langfuse MCP evals, Dify MCP testing, AI agent governance, Policy OS, Dify approval gates"
  canonical="https://createsomething.agency/dify/agent-eval-gates"
  ogType="article"
  ogImage="/og/dify-lane.svg"
  publishedTime="2026-06-22"
  modifiedTime="2026-06-22"
  articleSection="Dify Implementation"
  articleTags={['Dify', 'eval gates', 'MCP', 'Policy OS', 'agent governance']}
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify Agent Eval Gates"
  title="The evals that make Dify safer to operate."
  description="A Dify app becomes production-worthy when Langfuse can explain the runtime trace and score the MCP contract before the workflow gets more autonomy."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/mcp-control-plane" variant="secondary">Read Control Plane</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={gateCards.slice(0, 3)}
      columns={1}
      density="compact"
      ariaLabel="Primary Dify eval gates"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Trace and gate layer"
  title="Use Langfuse for Dify traces and MCP gates."
  description="Dify carries the app. Langfuse observes the Dify runtime and evaluates the MCP contracts CREATE SOMETHING creates."
>
  {#snippet after()}
    <ClearCardGrid
      items={observabilityCards}
      columns={3}
      ariaLabel="Dify Langfuse observability and eval layer"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Gate set"
  title="The first gates should match the real workflow risk."
  description="Do not start with a generic benchmark. Start with the places a Dify workflow can overreach, hide uncertainty, or lose the operating boundary."
>
  {#snippet after()}
    <ClearCardGrid items={gateCards} columns={3} ariaLabel="Dify agent eval gates" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Evidence map"
  title="Each gate should point to the system that proves it."
  description="The goal is not duplicate observability. The goal is to know which trace or eval run answers the operator's question."
>
  {#snippet after()}
    <ClearCardGrid items={evidenceCards} columns={4} ariaLabel="Dify eval gate evidence map" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Operating loop"
  title="Eval gates travel with the contract bundle."
  description="The gates should be derived from the same artifacts that define the workflow: tool access, allowed behavior, success criteria, golden tasks, and runbook."
>
  {#snippet after()}
    <ClearCardGrid items={workflowCards} columns={4} ariaLabel="Dify eval operating loop" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Examples"
  title="A gate is useful only when it names a concrete failure."
  description="Each workflow needs a small set of cases that prove the expected path and the stop path."
>
  {#snippet after()}
    <ClearCardGrid items={exampleRows} columns={3} ariaLabel="Dify eval examples" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Evidence"
  title="Public proof and private evidence are different artifacts."
  description="Decision owners need proof that the workflow is governed. Operators still need private traces, receipts, and detailed records that should not be published."
>
  {#snippet after()}
    <ClearCardGrid items={proofCards} columns={3} ariaLabel="Dify eval evidence types" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Next step"
  title="Map the first eval gates before publishing the workflow."
  description="Bring one Dify app and I’ll map the tool boundary, approval states, blocked paths, golden tasks, and client-safe evidence package."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify" variant="secondary">Back To Dify</Button>
    <Button href="/dify/content-engine" variant="secondary">See Dify Page Portfolio</Button>
    <Button href="https://createsomething.io/papers/eval-evidence-layer" variant="secondary">
      Read Eval Evidence Paper
    </Button>
  {/snippet}
</ClearCtaBand>
