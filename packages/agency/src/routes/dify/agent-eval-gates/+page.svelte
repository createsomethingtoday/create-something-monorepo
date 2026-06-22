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
        'A Dify workflow is not production-ready until the required gates pass against the current app and MCP cards.'
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
        'Keep detailed traces, account records, prompt variants, secrets, and approval receipts in the owning private system.'
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
  description="The eval gates that make Dify safer to operate: API health, expected tool use, forbidden actions, write confirmation, secret refusal, latency, cost, and release evidence."
  keywords="Dify agent eval gates, Dify evals, Dify MCP testing, AI agent governance, Policy OS, Dify approval gates"
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
  description="A Dify app becomes production-worthy when its tool use, approval behavior, blocked paths, secret handling, and operating limits are testable before the workflow gets more autonomy."
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
  eyebrow="Operating loop"
  title="Eval gates travel with the contract bundle."
  description="The gates should be derived from the same artifacts that define the workflow: tool access, allowed behavior, success criteria, golden tasks, and runbook."
>
  {#snippet after()}
    <ClearCardGrid items={workflowCards} columns={4} ariaLabel="Dify eval operating loop" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Examples"
  title="A gate is useful only when it names a concrete failure."
  description="Each workflow needs a small set of cases that prove the expected path and the stop path."
>
  {#snippet after()}
    <ClearCardGrid items={exampleRows} columns={3} ariaLabel="Dify eval examples" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Evidence"
  title="Public proof and private evidence are different artifacts."
  description="Buyers need proof that the workflow is governed. Operators still need private traces, receipts, and detailed records that should not be published."
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
    <Button href="/dify/content-engine" variant="secondary">See Content Engine</Button>
  {/snippet}
</ClearCtaBand>
