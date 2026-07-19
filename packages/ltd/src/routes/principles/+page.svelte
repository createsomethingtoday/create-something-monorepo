<script lang="ts">
  import { CanonIndexOpening, PrincipleCard } from '$lib/components';
  import { groupPrinciplesByMaster } from '$lib/canon-index';
  import {
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const principlesByMaster = $derived(groupPrinciplesByMaster(data.principles));

  const principleScenes = $derived(
    principlesByMaster.map(
      (master, index): PerformanceNarrativeScene => ({
        id: master.slug,
        label: master.name,
        summary: `${master.principles.length} reusable ${master.principles.length === 1 ? 'principle' : 'principles'}`,
        title: `Use ${master.name} when this discipline governs the decision.`,
        detail:
          'Inspect the complete principle set, then open the master record for its source and context.',
        tone: index === 0 ? 'allow' : 'review',
        evidence: master.principles.map((principle) => principle.title),
        actions: [{ label: `Open ${master.name}`, href: `/masters/${master.slug}` }]
      })
    )
  );
</script>

<SEO
  title="Decision Principles"
  description="Reusable principles that help CREATE SOMETHING teams decide what to keep, remove, prove, and ship."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Principles', url: 'https://createsomething.ltd/principles' }
  ]}
/>

<CanonIndexOpening
  current="principles"
  title="Principles"
  description="Choose the master whose discipline fits the decision, then use the principle as a rule the team can repeat."
  recommendation={{
    label: principlesByMaster[0]?.name || 'Begin with the Masters',
    detail: principlesByMaster[0]
      ? 'Start with the first available source, then compare its rules with the other disciplines.'
      : 'The principle collection is unavailable, so begin with the master index.',
    href: principlesByMaster[0] ? `/masters/${principlesByMaster[0].slug}` : '/masters'
  }}
/>

{#if principlesByMaster.length > 0}
  <PerformanceNarrativeStage
    id="principles-by-master"
    eyebrow="Reusable judgment"
    title="Choose the source before applying the rule."
    description="Each scene keeps one master’s complete principle set together so the reader can compare disciplines without losing provenance."
    scenes={principleScenes}
    ariaLabel="Principles grouped by master"
  >
    {#snippet artifact(scene)}
      {@const master = principlesByMaster.find((entry) => entry.slug === scene.id)}
      {#if master}
        <div class="principle-list">
          <a class="master-link" href="/masters/{master.slug}">Open {master.name} →</a>
          {#each master.principles as principle}
            <PrincipleCard {principle} />
          {/each}
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>
{:else}
  <section class="principles-empty" aria-labelledby="principles-empty-title">
    <span>00 / Collection unavailable</span>
    <h2 id="principles-empty-title">The principle records are not available yet.</h2>
    <p>Continue with the master index while the collection is restored.</p>
    <a href="/masters">Open Masters →</a>
  </section>
{/if}

<style>
  .principle-list {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  .master-link {
    width: fit-content;
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .principles-empty {
    display: grid;
    gap: 0.75rem;
    width: min(48rem, calc(100% - 2rem));
    margin: 3rem auto;
    padding: 2rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .principles-empty span {
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .principles-empty h2,
  .principles-empty p {
    margin: 0;
  }
</style>
