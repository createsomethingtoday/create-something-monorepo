<script lang="ts">
  import { Button } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  export let eyebrow = 'Conversion Path';
  export let title = 'Move from useful reading to a named workflow decision.';
  export let description =
    'Cold readers should not be forced straight into a calendar. Start with a reusable checklist, make a private draft, request a workflow map when review would help, then book when the owner and decision are named.';

  const stages = [
    {
      label: 'Cold',
      title: 'Control checklist',
      detail:
        'A low-friction resource for readers who need language for allowed, ask, blocked, logging, and recovery states.',
      cta: agencyCoreMessaging.governanceChecklistLabel,
      href: agencyCoreMessaging.governanceChecklistHref,
      intent: 'governance-checklist'
    },
    {
      label: 'Warm',
      title: 'Private workflow draft',
      detail:
        'A browser-local starting sheet for the owner, systems, approval points, risk boundary, and first workflow worth mapping.',
      cta: agencyCoreMessaging.startWithWorkflowLabel,
      href: agencyCoreMessaging.startWithWorkflowHref,
      intent: 'private-workflow-draft'
    },
    {
      label: 'Review',
      title: 'Workflow-map request',
      detail:
        'A short request for help reviewing the stack, bottleneck, risk boundary, and first workflow worth mapping.',
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
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    border-radius: var(--radius-performance-md, 4px);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem 3rem,
      var(--color-performance-paper, #f3f3f0);
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
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.76rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .funnel-ladder h2,
  .funnel-card h3 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    letter-spacing: 0;
    text-wrap: balance;
  }

  .funnel-ladder h2 {
    font-size: 2.45rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.04;
  }

  .funnel-ladder p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.58;
    text-wrap: pretty;
  }

  .funnel-ladder__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }

  .funnel-card {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    min-height: 18rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
  }

  .funnel-card span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .funnel-card h3 {
    font-size: 1.22rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.14;
  }

  .funnel-card p {
    font-size: 0.96rem;
  }

  .funnel-card :global(.btn) {
    align-self: end;
    justify-self: start;
    margin-top: 0.25rem;
    border-radius: var(--radius-performance-sm, 4px);
    box-shadow: none;
  }

  .funnel-card :global(.btn-primary) {
    background: var(--color-performance-ink, #090909);
    border-color: var(--color-performance-ink, #090909);
    color: #ffffff;
  }

  .funnel-card :global(.btn-secondary) {
    background: var(--color-performance-panel, #ffffff);
    border-color: var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-ink, #090909);
  }

  @media (max-width: 1080px) {
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
