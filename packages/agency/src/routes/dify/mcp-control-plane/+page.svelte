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

  const layerCards: ClearCardItem[] = [
    {
      eyebrow: 'Dify',
      icon: 'settings',
      title: 'Visible agent runtime',
      detail:
        'Dify carries the agent surface, workflow packaging, app templates, and operator-facing experience.'
    },
    {
      eyebrow: 'MCP',
      icon: 'folder',
      title: 'Tool and resource boundary',
      detail:
        'MCP server cards define what the agent can see, call, and describe without burying access in prompt text.'
    },
    {
      eyebrow: 'Policy OS',
      icon: 'check',
      title: 'Approval and evidence layer',
      detail:
        'Policy OS decides what can run automatically, what needs approval, and what stops with a reason.'
    }
  ];

  const implementationCards: ClearCardItem[] = [
    {
      eyebrow: '01',
      icon: 'search',
      title: 'Inventory the workflow',
      detail: 'Name the source systems, workflow owner, and approval authority.'
    },
    {
      eyebrow: '02',
      icon: 'folder',
      title: 'Confirm the MCP card',
      detail: 'Create or confirm the MCP server card and tool scope before the agent can claim capability.'
    },
    {
      eyebrow: '03',
      icon: 'upload',
      title: 'Package the Dify surface',
      detail: 'Keep the Dify agent or workflow tied to a repo-owned manifest and DSL snapshot.'
    },
    {
      eyebrow: '04',
      icon: 'check',
      title: 'Add eval gates',
      detail: 'Check expected tool use, forbidden tool use, secret refusal, latency, and write confirmation.'
    },
    {
      eyebrow: '05',
      icon: 'document',
      title: 'Publish sanitized proof',
      detail: 'Share trust evidence while raw traces and private records stay private.'
    }
  ];

  const contractBundleCards: ClearCardItem[] = [
    {
      eyebrow: 'Surface',
      icon: 'settings',
      title: 'Dify app',
      detail:
        'The workflow stays visible to operators: app surface, workflow packaging, and handoff context.'
    },
    {
      eyebrow: 'Capability',
      icon: 'folder',
      title: 'MCP contract',
      detail:
        'The tool and resource boundary names what the agent may read, call, and describe.'
    },
    {
      eyebrow: 'Behavior',
      icon: 'check',
      title: 'Agent contract',
      detail:
        'Allowed, approval-needed, and blocked actions are explicit before the workflow gains autonomy.'
    },
    {
      eyebrow: 'Outcome',
      icon: 'document',
      title: 'Success contract',
      detail:
        'The business result, fallback path, owner, and review cadence are separate from the prompt.'
    },
    {
      eyebrow: 'Proof',
      icon: 'search',
      title: 'Golden tasks and runbook',
      detail:
        'Regression examples and operating steps prove the workflow can survive model, tool, or runtime changes.'
    }
  ];

  const useCases: ClearCardItem[] = [
    {
      eyebrow: 'Builders',
      icon: 'settings',
      title: 'Package one useful workflow',
      detail: 'Use Dify to package the agent and MCP to expose the narrow tools needed for the workflow.'
    },
    {
      eyebrow: 'Operators',
      icon: 'user',
      title: 'Make governance visible',
      detail: 'Use Policy OS to show approval states, blocked states, runbooks, and evidence before scale.'
    },
    {
      eyebrow: 'Agencies',
      icon: 'users',
      title: 'Turn proof into reusable assets',
      detail: 'Turn repeatable workflows into Dify templates or plugin candidates after sanitizing setup and proof.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Surface',
      icon: 'settings',
      title: 'Dify app',
      detail: 'The user-facing place where the workflow runs.'
    },
    {
      label: 'Boundary',
      icon: 'folder',
      title: 'MCP card',
      detail: 'The tool contract and access description.'
    },
    {
      label: 'Rule',
      icon: 'check',
      title: 'Policy OS',
      detail: 'The allowed, approval, blocked, and evidence behavior.'
    }
  ];
</script>

<SEO
  title="Dify + MCP Control Plane | CREATE SOMETHING .agency"
  description="How CREATE SOMETHING packages Dify, MCP server cards, and Policy OS contract bundles into a governed control plane for agent workflows."
  keywords="Dify MCP control plane, Dify agent governance, MCP server cards, Policy OS, contract bundle, Dify app templates"
  ogType="article"
  ogImage="/og/dify-mcp-control-plane.svg"
  publishedTime="2026-05-18"
  modifiedTime="2026-06-22"
  articleSection="Dify Implementation"
  articleTags={['Dify', 'MCP', 'Policy OS', 'agent workflows']}
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify + MCP Control Plane"
  title="Dify is the surface. MCP is the boundary. Policy OS is the operating rule."
  description="The fastest path to serious Dify adoption is not another generic chatbot. It is a visible Dify app with scoped MCP tools, repo-owned manifests, eval gates, and an approval layer the operator can inspect."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowTeardownHref}>
      {agencyCoreMessaging.workflowTeardownLabel}
    </Button>
    <Button href="/dify" variant="secondary">Back To Dify Lane</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={layerCards}
      columns={1}
      density="compact"
      ariaLabel="Dify MCP control plane layers"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Layer map"
  title="Each layer has one job."
  description="The control plane only works when the app surface, tool boundary, and policy layer are not collapsed into one prompt."
>
  {#snippet after()}
    <ClearCardGrid items={layerCards} columns={3} ariaLabel="Control plane layer map" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="evals"
  variant="soft"
  eyebrow="Build order"
  title="Make the control plane inspectable before it becomes powerful."
  description="A Dify app becomes production-worthy when the workflow, tool boundary, approval behavior, and evidence model are explicit enough for another operator to review."
>
  {#snippet after()}
    <ClearCardGrid
      items={implementationCards}
      columns={4}
      ariaLabel="Dify control plane implementation steps"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="contract-bundle"
  variant="white"
  eyebrow="Contract bundle"
  title="The control plane becomes real when the bundle is reviewable."
  description="Dify provides the visible workflow surface, but the operating boundary should travel as artifacts: MCP capability, agent behavior, outcome success, golden tasks, and a runbook."
>
  {#snippet after()}
    <ClearCardGrid
      items={contractBundleCards}
      columns={4}
      ariaLabel="Dify control plane contract bundle"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="adoption"
  variant="soft"
  eyebrow="Who it serves"
  title="The same architecture supports three routes to Dify adoption."
  description="Builder adoption, operator governance, and agency packaging all become easier when the control plane is visible."
>
  {#snippet after()}
    <ClearCardGrid items={useCases} columns={3} ariaLabel="Dify control plane use cases" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Next step"
  title="Use the control-plane article to qualify the next action."
  description="Readers can take the governance checklist, request a workflow map, or book the mapping session once the Dify workflow and decision owner are clear."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/ship-dify-app-with-mcp-tools" variant="secondary">Read Shipping Guide</Button>
    <Button href="/dify/agent-eval-gates" variant="secondary">Read Eval Gates</Button>
    <Button href="/dify/content-engine" variant="secondary">See Content Engine</Button>
    <Button href="https://createsomething.io/papers/policy-os-contract-bundle" variant="secondary">
      Read Contract Bundle Paper
    </Button>
  {/snippet}
</ClearCtaBand>
