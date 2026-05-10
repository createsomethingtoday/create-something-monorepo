<script lang="ts">
  import { Button } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  export let eyebrow = 'Mapping session';
  export let title = 'The first session turns the workflow into a safe build decision.';
  export let description =
    'The buyer does not need a technical guessing game. They need to know where AI can help, what needs review, what should stop, and what workflow console should be built first.';
  export let ctaHref = '/book';
  export let ctaLabel = agencyCoreMessaging.bookMappingSessionLabel;

  const sessionSteps = [
    {
      label: 'Bring',
      title: 'One real workflow',
      detail: 'The handoff with drag, risk, rework, or capacity trapped in manual coordination.'
    },
    {
      label: 'Map',
      title: 'The operating boundary',
      detail: 'Source accounts, owners, data, vendor roles, approvals, blocked states, and failure modes.'
    },
    {
      label: 'Decide',
      title: 'The first safe build',
      detail: 'Whether the right first move is a workflow console, matching workflow, intake/routing layer, agent add-on, referral, or stop.'
    },
    {
      label: 'Keep',
      title: 'The artifact trail',
      detail: 'Workflow map, stack boundary, agent/tool contract, decision states, and implementation path.'
    }
  ];
</script>

<div class="mapping-brief product-surface product-surface--soft">
  <div class="mapping-brief__copy">
    <span class="product-kicker">{eyebrow}</span>
    <h3>{title}</h3>
    <p>{description}</p>
    <Button href={ctaHref}>{ctaLabel}</Button>
  </div>

  <div class="mapping-brief__grid" role="list">
    {#each sessionSteps as step}
      <article class="mapping-brief__step" role="listitem">
        <span>{step.label}</span>
        <strong>{step.title}</strong>
        <p>{step.detail}</p>
      </article>
    {/each}
  </div>
</div>

<style>
  .mapping-brief {
    display: grid;
    grid-template-columns: minmax(0, 0.72fr) minmax(0, 1fr);
    gap: clamp(1.4rem, 4vw, 3rem);
    align-items: start;
    padding: clamp(1.15rem, 3vw, 1.85rem);
    overflow: hidden;
    background:
      linear-gradient(135deg, rgba(49, 92, 255, 0.13), rgba(45, 212, 191, 0.045)),
      rgba(0, 0, 0, 0.52);
  }

  .mapping-brief__copy {
    display: grid;
    gap: 0.9rem;
    align-items: start;
  }

  .mapping-brief__copy h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(1.8rem, 3vw, 3rem);
    line-height: 1.02;
    letter-spacing: -0.04em;
    text-wrap: balance;
  }

  .mapping-brief__copy p,
  .mapping-brief__step p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .mapping-brief__copy :global(.btn) {
    justify-self: start;
    margin-top: 0.15rem;
  }

  .mapping-brief__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem clamp(1rem, 3vw, 1.6rem);
  }

  .mapping-brief__step {
    display: grid;
    gap: 0.42rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mapping-brief__step span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .mapping-brief__step strong {
    color: var(--color-fg-primary);
    font-size: 1.04rem;
    line-height: 1.2;
  }

  .mapping-brief__step p {
    font-size: 0.94rem;
  }

  @media (max-width: 900px) {
    .mapping-brief {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .mapping-brief__grid {
      grid-template-columns: 1fr;
    }

    .mapping-brief__copy :global(.btn) {
      box-sizing: border-box;
      width: 100%;
    }
  }
</style>
