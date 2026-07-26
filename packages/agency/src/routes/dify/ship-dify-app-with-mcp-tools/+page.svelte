<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem
  } from '@create-something/canon';
  import ArticleVisualFigure from '$lib/components/ArticleVisualFigure.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const quickAnswer: PerformanceCardItem[] = [
    {
      eyebrow: 'Surface',
      icon: 'settings',
      title: 'Build the Dify app around one workflow.',
      detail:
        'Use Dify for the visible app, workflow canvas, publishing path, and operator-facing experience.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'folder',
      title: 'Expose tools through MCP.',
      detail:
        'Give the app only the server cards, tools, resources, and setup state needed for that workflow.'
    },
    {
      eyebrow: 'Control',
      icon: 'check',
      title: 'Ship the Control bundle with it.',
      detail:
        'The app is not done until approvals, blocked actions, eval gates, runbook, and proof are reviewable.'
    }
  ];

  const buildPath: PerformanceCardItem[] = [
    {
      eyebrow: '01',
      icon: 'search',
      title: 'Name the workflow and owner',
      detail:
        'Start with the business path, source systems, decision owner, failure mode, and first controlled point.'
    },
    {
      eyebrow: '02',
      icon: 'folder',
      title: 'Write the MCP boundary',
      detail:
        'List allowed tools, read resources, setup steps, auth scopes, forbidden actions, and harmless smoke checks.'
    },
    {
      eyebrow: '03',
      icon: 'settings',
      title: 'Package the Dify surface',
      detail:
        'Build the Dify workflow or chatflow, connect MCP tools, publish the app, and preserve a DSL or manifest snapshot.'
    },
    {
      eyebrow: '04',
      icon: 'check',
      title: 'Gate behavior before launch',
      detail:
        'Run expected tool use, forbidden tool use, write confirmation, secret refusal, latency, and cost checks.'
    },
    {
      eyebrow: '05',
      icon: 'document',
      title: 'Publish client-safe proof',
      detail:
        'Share route health, gate names, pass/fail status, release notes, and sanitized examples without raw traces.'
    }
  ];

  const contractCards: PerformanceCardItem[] = [
    {
      eyebrow: 'mcp_contract.yaml',
      icon: 'folder',
      title: 'Capability contract',
      detail:
        'Tool schemas, resource URIs, auth scopes, setup state, error model, and safe smoke input.'
    },
    {
      eyebrow: 'agent_contract.yaml',
      icon: 'check',
      title: 'Behavior contract',
      detail:
        'Allowed actions, approval-needed actions, blocked actions, escalation triggers, runtime surface, and graduation status.'
    },
    {
      eyebrow: 'outcome_contract.md',
      icon: 'document',
      title: 'Success contract',
      detail:
        'The business result, fallback path, owner responsibility, review cadence, and measurable acceptance criteria.'
    },
    {
      eyebrow: 'golden_tasks.yaml',
      icon: 'search',
      title: 'Regression contract',
      detail:
        'Positive and negative examples that prove normal tool use, refusal behavior, and approval pauses still work.'
    },
    {
      eyebrow: 'runbook.md',
      icon: 'settings',
      title: 'Operating contract',
      detail:
        'How to publish, pause, rotate access, handle incidents, roll back, and hand the workflow to a new operator.'
    }
  ];

  const gateCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Health',
      icon: 'check',
      title: 'Service API and MCP reachability',
      detail:
        'The app can call the expected Dify API path and the MCP server card can answer a harmless read.'
    },
    {
      eyebrow: 'Expected path',
      icon: 'search',
      title: 'Correct tool choice',
      detail:
        'Normal examples call the intended read, search, draft, classify, or handoff tool instead of improvising.'
    },
    {
      eyebrow: 'Forbidden path',
      icon: 'warning',
      title: 'No unsafe writes',
      detail:
        'The app does not call post, delete, refund, export, broad-search, or account-mutation tools outside the contract.'
    },
    {
      eyebrow: 'Approval',
      icon: 'user',
      title: 'Pause before impact',
      detail:
        'Customer-facing, revenue-touching, or irreversible actions stop with context and options for the named owner.'
    },
    {
      eyebrow: 'Secrets',
      icon: 'folder',
      title: 'Credential refusal',
      detail:
        'The app refuses requests for tokens, private traces, broad account records, and prompt-injection disclosure.'
    },
    {
      eyebrow: 'Operations',
      icon: 'settings',
      title: 'Latency and cost envelope',
      detail:
        'The workflow stays inside the agreed response and spend range, or it narrows scope before launch.'
    }
  ];

  const proofCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Public',
      icon: 'document',
      title: 'What decision owners can inspect',
      detail:
        'App purpose, workflow boundary, gate names, latest pass/fail status, release note, fallback path, and owner.'
    },
    {
      eyebrow: 'Private',
      icon: 'folder',
      title: 'What operators keep',
      detail:
        'Dify DSL snapshots, Langfuse traces, Langfuse runs, prompt variants, credentials, account records, and incident notes.'
    },
    {
      eyebrow: 'Decision',
      icon: 'check',
      title: 'What changes autonomy',
      detail:
        'Passing evidence can expand scope. Failing evidence narrows tools, adds approval, rolls back, or keeps a manual path.'
    }
  ];

  const exampleCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Auto-allow',
      icon: 'check',
      title: 'Read ticket and account context',
      detail:
        'The app can read scoped records and summarize the customer state when the MCP contract limits the account boundary.'
    },
    {
      eyebrow: 'Auto-allow',
      icon: 'document',
      title: 'Draft the reply',
      detail:
        'The app can prepare a customer-safe draft with cited source records, but it does not send the message yet.'
    },
    {
      eyebrow: 'Wait',
      icon: 'user',
      title: 'Post the reply',
      detail:
        'The app pauses for the support owner when the action becomes customer-facing or affects account trust.'
    },
    {
      eyebrow: 'Stop',
      icon: 'warning',
      title: 'Refund, delete, or disclose secrets',
      detail:
        'The app refuses or escalates when the request exceeds the support scope, touches revenue, or asks for private evidence.'
    }
  ];

  const sourceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'App concepts',
      detail: 'Dify app types, published web/API access, and app-as-MCP-server positioning.',
      href: 'https://docs.dify.ai/en/use-dify/getting-started/key-concepts'
    },
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'Use MCP tools',
      detail: 'Dify documentation for connecting external MCP server tools to apps.',
      href: 'https://docs.dify.ai/en/use-dify/build/mcp'
    },
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'API publishing',
      detail: 'Dify documentation for using an app as a backend API service.',
      href: 'https://docs.dify.ai/en/use-dify/publish/developing-with-apis'
    },
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'Langfuse integration',
      detail: 'Dify documentation for app performance tracing with Langfuse.',
      href: 'https://docs.dify.ai/en/use-dify/monitor/integrations/integrate-langfuse'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Map',
      icon: 'search',
      title: 'Workflow map',
      detail: 'Name the workflow, owner, tool boundary, and first controlled point.'
    },
    {
      label: 'Build',
      icon: 'settings',
      title: 'Dify app',
      detail: 'Package the visible surface and connect only the scoped MCP tools.'
    },
    {
      label: 'Prove',
      icon: 'check',
      title: 'Control',
      detail: 'Attach approvals, gates, runbook, and client-safe proof before launch.'
    }
  ];
</script>

<SEO
  title="How To Ship A Dify App With MCP Tools | CREATE SOMETHING .agency"
  description="A practical field guide for shipping one Dify app with scoped MCP tools, Control contracts, eval gates, approval states, and client-safe proof."
  keywords="ship Dify app with MCP tools, Dify MCP implementation, Dify app governance, Dify Control, Dify agent approval gates"
  canonical="https://createsomething.agency/dify/ship-dify-app-with-mcp-tools"
  ogType="article"
  ogImage="/og/dify-lane.png"
  publishedTime="2026-06-23"
  modifiedTime="2026-06-23"
  articleSection="Dify Implementation"
  articleTags={['Dify', 'MCP', 'Control', 'agent governance', 'workflow implementation']}
  propertyName="agency"
  noindex={true}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify Field Guide"
  title="How to ship a Dify app with MCP tools."
  description="The useful unit is one governed workflow: Dify as the visible app, MCP as the tool boundary, and Control as the approval, eval, runbook, and proof layer."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowTeardownHref}>
      {agencyCoreMessaging.workflowTeardownLabel}
    </Button>
    <Button href="/dify/mcp-control-plane" variant="secondary">Read Control Plane</Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid items={quickAnswer} columns={1} density="compact" ariaLabel="Dify MCP quick answer" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Operating path"
  title="Ship the smallest workflow that can be inspected."
  description="Do not start with a generic agent. Start with a workflow whose owner, tools, approval path, and proof can be named."
>
  {#snippet after()}
    <PerformanceCardGrid items={buildPath} columns={4} ariaLabel="Dify MCP shipping path" />
    <ArticleVisualFigure
      src="/images/articles/dify-ship-mcp-tools/dify-mcp-shipping-path-v2.svg"
      alt="Diagram showing Dify as the app surface, MCP as the tool boundary, Control as the control layer, and proof as the release surface."
      eyebrow="Verified diagram"
      title="The shipping path is surface, boundary, control, proof."
      caption="This owned diagram keeps the implementation legible: Dify carries the app, MCP scopes capability, Control governs behavior, and proof explains what changed."
      sourceLabel="Verified SVG generated from a structured CREATE SOMETHING specification."
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Contract bundle"
  title="The app ships with artifacts, not just prompts."
  description="A Dify workflow becomes governable when its tool access, behavior, outcome, tests, and operating steps are separate enough to review."
>
  {#snippet after()}
    <PerformanceCardGrid items={contractCards} columns={4} ariaLabel="Dify MCP contract bundle" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Eval gates"
  title="Run gates where the workflow can overreach."
  description="The goal is not a generic benchmark. The goal is evidence that changes a publish, hold, rollback, or scope decision."
>
  {#snippet after()}
    <PerformanceCardGrid items={gateCards} columns={3} ariaLabel="Dify MCP eval gates" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Worked example"
  title="For support triage, the same workflow has four different decisions."
  description="This is the quality bar from the papers applied to one Dify app: every tool call needs a state, owner, evidence path, and stop condition."
>
  {#snippet after()}
    <PerformanceCardGrid items={exampleCards} columns={4} ariaLabel="Dify MCP support triage example" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Proof"
  title="Separate client-safe proof from private evidence."
  description="Decision owners need enough proof to trust the workflow. Operators still need private traces, eval runs, credentials, account records, and incident notes protected."
>
  {#snippet after()}
    <PerformanceCardGrid items={proofCards} columns={3} ariaLabel="Dify MCP proof split" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Sources"
  title="The recommendation follows the current Dify surfaces."
  description="Dify provides the app and publishing model, MCP connects external tools, and Langfuse can monitor app performance. CREATE SOMETHING adds the workflow contract, eval gate, and proof surface."
>
  {#snippet after()}
    <PerformanceCardGrid items={sourceCards} columns={4} ariaLabel="Dify MCP source notes" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Next step"
  title="Bring one Dify workflow before adding more tools."
  description="I’ll map the workflow, MCP tool boundary, approval path, eval gates, and client-safe proof package before the app gets more autonomy."
  steps={ctaItems}
  handoff={{ owner: 'Dify app operator', authority: 'Scoped MCP tool contract', proof: 'Control launch receipt', state: 'review' }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowTeardownHref}>
      {agencyCoreMessaging.workflowTeardownLabel}
    </Button>
    <Button href="/dify" variant="secondary">Back To Dify</Button>
    <Button href="/dify/agent-eval-gates" variant="secondary">Read Eval Gates</Button>
    <Button href="https://createsomething.io/papers/policy-os-contract-bundle" variant="secondary">
      Read Contract Bundle Paper
    </Button>
  {/snippet}
</PerformanceConversionHandoff>
