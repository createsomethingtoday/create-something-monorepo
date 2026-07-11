<script lang="ts">
  import {
    PerformanceEvidenceIndex,
    PerformanceThesisConditions,
    type PerformanceCondition,
    type PerformanceEvidenceItem
  } from '@create-something/canon';
  import type { PageData } from './$types';

  export let data: PageData;

  $: availableCount = data.agents.filter((agent) => agent.credentialState === 'available').length;
  $: missingCount = data.agents.length - availableCount;
  $: agentConditions = [
    {
      label: 'Ready',
      title: `${availableCount} credentials available`,
      detail: 'Server-side keys are present and the corresponding agent lanes can accept operator work.',
      tone: 'growth'
    },
    {
      label: 'Review',
      title: `${missingCount} credentials missing`,
      detail: 'These lanes stay visible for authorized staff but cannot run until their server-side key exists.',
      tone: missingCount > 0 ? 'pressure' : 'neutral'
    },
    {
      label: 'Boundary',
      title: `${data.agents.length} identity-scoped lanes`,
      detail: 'Agent identity, credential state, next action, and proof path remain inside the staff boundary.',
      tone: 'signal'
    }
  ] satisfies PerformanceCondition[];
  $: agentEvidence = data.agents.map(
    (agent): PerformanceEvidenceItem => ({
      id: agent.apiKeyEnv,
      kind: `${agent.client} / ${agent.lane}`,
      title: agent.label,
      detail: `${agent.operatorSummary} Next action: ${agent.nextAction}`,
      state: agent.credentialState === 'available' ? 'verified' : 'review',
      date: agent.operatorStateLabel,
      href: `/agents/${agent.id}`
    })
  );
</script>

<svelte:head>
  <title>CREATE SOMETHING Operator Agents</title>
</svelte:head>

{#if !data.accessAllowed}
  <section class="access-shell performance-paper">
    <div class="access-copy">
      <div class="eyebrow">Staff access</div>
      <h1 class="section-title">Sign in with CREATE SOMETHING to use the agent shell.</h1>
      <p class="muted">
        Agent keys stay server-side. Staff access is required before agent names, credentials, or
        chat actions are available. {data.accessDetail}
      </p>
    </div>
    <a class="link-button" href={data.signInUrl}>Staff sign-in</a>
  </section>
{:else}
  <section class="agents-shell">
    <PerformanceThesisConditions
      eyebrow="Workflow trust layer"
      title="Dify agents in one standalone operator surface."
      description="Each agent keeps its API key server-side, exposes its lane and proof path, and waits behind verified staff identity before any operator chat can run."
      conditions={agentConditions}
      headingLevel="h1"
      ariaLabel="Agent credential summary"
    />

    <PerformanceEvidenceIndex
      eyebrow="Operator proof surface"
      title="Agent lanes, authority, and credential state."
      description="Objects identify the client and lane. Actions state the next operator move. Receipts expose the credential boundary before chat can run."
      items={agentEvidence}
      emptyMessage="No operator agents are currently registered."
      ariaLabel="Operator agent registry"
    />
  </section>
{/if}

<style>
  .access-shell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: min(var(--content-width-performance), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .access-shell {
    margin-top: 2rem;
    padding: 1.1rem;
  }

  .access-copy {
    display: grid;
    gap: 0.75rem;
    max-width: 42rem;
  }

  .agents-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    min-width: 0;
  }

  @media (max-width: 820px) {
    .access-shell {
      flex-direction: column;
      align-items: stretch;
    }

    .access-shell {
      width: min(100% - 1.5rem, var(--content-width-performance));
    }
  }
</style>
