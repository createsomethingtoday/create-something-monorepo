<script lang="ts">
  import { Button } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  export let eyebrow = 'Conversion Path';
  export let title = 'Move from useful reading to a workflow trust decision.';
  export let description =
    'Cold readers should not be forced straight into a calendar. The ladder starts with a reusable checklist, moves to a trust map, and keeps the booking path for teams with a named workflow.';

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
        'A calendar path for teams who already know the workflow, owner, approval authority, and decision timeline.',
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
        <Button
          href={stage.href}
          variant={stage.intent === 'workflow-mapping' ? 'secondary' : 'primary'}
        >
          {stage.cta}
        </Button>
      </article>
    {/each}
  </div>
</section>

<style>
  .funnel-ladder {
    width: 100%;
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--color-clear-border-strong, #cecece);
    border-radius: var(--radius-clear-md, 8px);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem 3rem,
      var(--color-clear-porcelain, #f9f9f9);
  }

  .funnel-ladder__copy {
    display: grid;
    gap: 0.85rem;
    max-width: 58rem;
    margin-bottom: 1.5rem;
  }

  .product-kicker {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    min-height: 1.9rem;
    align-items: center;
    padding: 0.36rem 0.62rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .funnel-ladder h2,
  .funnel-card h3 {
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    letter-spacing: 0;
    text-wrap: balance;
  }

  .funnel-ladder h2 {
    font-size: 2.45rem;
    font-weight: var(--font-medium);
    line-height: 1.04;
  }

  .funnel-ladder p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    line-height: 1.58;
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
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
  }

  .funnel-card span {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .funnel-card h3 {
    font-size: 1.22rem;
    font-weight: var(--font-medium);
    line-height: 1.14;
  }

  .funnel-card p {
    font-size: 0.96rem;
  }

  .funnel-card :global(.btn) {
    align-self: end;
    justify-self: start;
    margin-top: 0.25rem;
    border-radius: var(--radius-clear-sm, 4px);
    box-shadow: none;
  }

  .funnel-card :global(.btn-primary) {
    background: var(--color-clear-onyx, #0a0e19);
    border-color: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
  }

  .funnel-card :global(.btn-secondary) {
    background: var(--color-clear-panel, #ffffff);
    border-color: var(--color-clear-border, #e1e1e1);
    color: var(--color-clear-onyx, #0a0e19);
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
      width: 100%;
      padding: 1rem;
    }

    .funnel-card :global(.btn) {
      box-sizing: border-box;
      width: 100%;
    }

    .funnel-ladder h2 {
      font-size: 2rem;
    }
  }
</style>
