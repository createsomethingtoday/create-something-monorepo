<script lang="ts">
  import {
    PerformanceEvidenceIndex,
    PerformanceThesisConditions,
    type PerformanceCondition,
    type PerformanceEvidenceItem
  } from '@create-something/canon';

  const transitionConditions = [
    {
      label: 'Ownership',
      title: 'CREATE SOMETHING owns the contract',
      detail: 'Agent policy, state, tool access, receipts, and operator boundaries stay in repo-owned artifacts.',
      tone: 'signal'
    },
    {
      label: 'Infrastructure',
      title: 'Cloudflare runs the edge',
      detail: 'Network security, rate limits, compute, and durable state remain on the Cloudflare substrate.',
      tone: 'growth'
    },
    {
      label: 'Intelligence',
      title: 'OpenAI executes the model loop',
      detail: 'Model execution stays behind the provider-neutral CREATE SOMETHING HTTP and SSE boundary.',
      tone: 'neutral'
    }
  ] satisfies PerformanceCondition[];

  const transitionEvidence = [
    {
      id: 'CRE-1233-RUNTIME',
      kind: 'Owned contract',
      title: 'Cloudflare and OpenAI runtime candidate',
      detail: 'Normalized failures, D1 continuation receipts, MCP allowlists, and edge admission checks are verified in the candidate.',
      state: 'verified',
      date: '2026-07-13',
      href: 'https://createsomething.agency/stack'
    },
    {
      id: 'CRE-1233-ROUTE',
      kind: 'Retirement',
      title: 'Standalone provider shell closed',
      detail: 'Legacy agent detail routes permanently return operators to this owned runtime boundary.',
      state: 'verified',
      date: '2026-07-13'
    },
    {
      id: 'CRE-1233-GATE',
      kind: 'Promotion',
      title: 'Production cutover remains approval-gated',
      detail: 'Deployment, merge, and provider-secret retirement require the owning promotion workflow and rollback receipt.',
      state: 'review',
      date: 'Awaiting approval'
    }
  ] satisfies PerformanceEvidenceItem[];
</script>

<svelte:head>
  <title>CREATE SOMETHING Operator Agents</title>
</svelte:head>

<section class="agents-shell">
  <PerformanceThesisConditions
    eyebrow="Runtime transition"
    title="Operator agents now use the CREATE SOMETHING runtime boundary."
    description="This legacy standalone shell is closed. Cloudflare provides infrastructure and OpenAI provides intelligence behind a CREATE SOMETHING-owned contract."
    conditions={transitionConditions}
    headingLevel="h1"
    ariaLabel="Owned operator agent runtime"
  />

  <PerformanceEvidenceIndex
    eyebrow="Transition receipts"
    title="The owned boundary is explicit and reviewable."
    description="These receipts distinguish the verified candidate, the retired standalone route, and the approval still required for production promotion."
    items={transitionEvidence}
    ariaLabel="Operator runtime transition evidence"
  />

  <div class="transition-action">
    <a class="link-button" href="https://createsomething.agency/stack">Review the owned stack</a>
  </div>
</section>

<style>
  .agents-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    padding-bottom: clamp(3rem, 7vw, 7rem);
  }

  .transition-action {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: 0 auto;
  }
</style>
