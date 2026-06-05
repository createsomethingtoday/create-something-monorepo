<script lang="ts">
  import { Button } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  export let eyebrow = 'Conversion Path';
  export let title = 'Move from useful reading to a workflow trust decision.';
  export let description =
    'Cold readers should not be forced straight into a calendar. The ladder starts with a reusable checklist, moves to a trust map, and keeps the booking path for high-intent buyers.';

  const stages = [
    {
      label: 'Cold',
      title: 'Trust checklist',
      detail:
        'A low-friction resource for readers who need language for allowed, ask, blocked, logging, and recovery states.',
      cta: agencyCoreMessaging.governanceChecklistLabel,
      href: agencyCoreMessaging.governanceChecklistHref,
      intent: 'governance-checklist'
    },
    {
      label: 'Warm',
      title: 'Trust map',
      detail:
        'A short form that captures the stack, bottleneck, risk boundary, and first workflow worth mapping.',
      cta: agencyCoreMessaging.workflowTeardownLabel,
      href: agencyCoreMessaging.workflowTeardownHref,
      intent: 'workflow-teardown'
    },
    {
      label: 'Hot',
      title: 'Mapping session',
      detail:
        'A calendar path for buyers who already know the workflow, owner, approval authority, and decision timeline.',
      cta: agencyCoreMessaging.bookMappingSessionLabel,
      href: '/book?source=funnel-ladder&intent=workflow-mapping&lane=not_sure',
      intent: 'workflow-mapping'
    }
  ] as const;
</script>

<section class="funnel-ladder" aria-labelledby="funnel-ladder-title">
  <div class="funnel-ladder__copy">
    <span class="product-kicker">{eyebrow}</span>
    <h2 id="funnel-ladder-title">{title}</h2>
    <p>{description}</p>
  </div>

  <div class="funnel-ladder__grid" role="list">
    {#each stages as stage}
      <article class="funnel-card" role="listitem" data-intent={stage.intent}>
        <span>{stage.label}</span>
        <h3>{stage.title}</h3>
        <p>{stage.detail}</p>
        <Button href={stage.href} variant={stage.intent === 'workflow-mapping' ? 'secondary' : 'primary'}>
          {stage.cta}
        </Button>
      </article>
    {/each}
  </div>
</section>

<style>
  .funnel-ladder {
    width: min(1120px, calc(100% - 2rem));
    margin: clamp(1.25rem, 3vw, 2rem) auto clamp(3.5rem, 6vw, 5rem);
    padding: clamp(1.35rem, 3vw, 2rem);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(135deg, rgba(49, 92, 255, 0.12), rgba(45, 212, 191, 0.04)),
      rgba(0, 0, 0, 0.52);
    box-shadow:
      inset 1px 1px 0 rgba(255, 255, 255, 0.08),
      0 22px 70px rgba(0, 0, 0, 0.32);
  }

  .funnel-ladder__copy {
    display: grid;
    gap: 0.85rem;
    max-width: 58rem;
    margin-bottom: clamp(1.25rem, 3vw, 1.8rem);
  }

  .funnel-ladder h2,
  .funnel-card h3 {
    margin: 0;
    color: var(--color-fg-primary);
    letter-spacing: 0;
    text-wrap: balance;
  }

  .funnel-ladder h2 {
    font-size: clamp(1.7rem, 3vw, 2.75rem);
    line-height: 1.04;
  }

  .funnel-ladder p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .funnel-ladder__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .funnel-card {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    min-height: 18rem;
    padding: 1rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-lg);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018)),
      color-mix(in srgb, var(--color-shell-surface-secondary) 82%, transparent);
  }

  .funnel-card span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .funnel-card h3 {
    font-size: clamp(1.08rem, 1.5vw, 1.35rem);
    line-height: 1.14;
  }

  .funnel-card p {
    font-size: 0.96rem;
  }

  .funnel-card :global(.btn) {
    align-self: end;
    justify-self: start;
    margin-top: 0.25rem;
  }

  @media (max-width: 900px) {
    .funnel-ladder__grid {
      grid-template-columns: 1fr;
    }

    .funnel-card {
      min-height: auto;
    }
  }

  @media (max-width: 560px) {
    .funnel-ladder {
      width: min(100% - 1rem, 1120px);
      padding: 1rem;
    }

    .funnel-card :global(.btn) {
      box-sizing: border-box;
      width: 100%;
    }
  }
</style>
