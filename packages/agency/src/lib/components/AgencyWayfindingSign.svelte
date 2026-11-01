<script lang="ts">
  import type { Snippet } from 'svelte';
  import AgencyIsometricGlyph, { type AgencySignKind } from './AgencyIsometricGlyph.svelte';

  export type { AgencySignKind };

  interface Props {
    kind: AgencySignKind;
    label: string;
    href: string;
    detail?: string;
    direction?: 'forward' | 'down' | 'back' | 'external';
    current?: boolean;
    card?: boolean;
    heading?: boolean;
    children?: Snippet;
  }

  let {
    kind,
    label,
    href,
    detail,
    direction = 'forward',
    current = false,
    card = false,
    heading = false,
    children
  }: Props = $props();

  const arrows = { forward: '→', down: '↓', back: '←', external: '↗' };
</script>

<a
  class="agency-sign"
  class:agency-sign--card={card}
  {href}
  aria-current={current ? 'page' : undefined}
>
  <span class="agency-sign__glyph"><AgencyIsometricGlyph {kind} /></span>
  <div class="agency-sign__content">
    {#if current}<span class="agency-sign__current">Current path</span>{/if}
    <svelte:element this={heading ? 'h3' : 'strong'} class="agency-sign__label"
      >{label}</svelte:element
    >
    {#if detail}<span class="agency-sign__detail">{detail}</span>{/if}
    {#if children}{@render children()}{/if}
  </div>
  <span class="agency-sign__arrow" aria-hidden="true">{arrows[direction]}</span>
</a>

<style>
  .agency-sign {
    display: flex;
    align-items: center;
    gap: var(--space-performance-sm);
    box-sizing: border-box;
    min-width: 0;
    min-height: 44px;
    padding: var(--space-performance-sm);
    border: 1px solid currentColor;
    border-radius: var(--radius-performance-sm);
    color: inherit;
    text-decoration: none;
    font-family: var(--font-performance-interface);
    line-height: 1.45;
  }
  .agency-sign__glyph {
    flex: 0 0 32px;
    width: 32px;
  }
  .agency-sign__content {
    min-width: 0;
    flex: 1;
    overflow-wrap: anywhere;
  }
  .agency-sign__label {
    display: block;
    margin: 0;
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-semibold);
  }
  .agency-sign__detail,
  .agency-sign__current {
    display: block;
    font-size: var(--text-performance-caption);
  }
  .agency-sign__current {
    font-family: var(--font-performance-mono);
  }
  .agency-sign__arrow {
    flex: 0 0 auto;
  }
  .agency-sign--card {
    height: 100%;
    align-items: flex-start;
    padding: var(--space-performance-md);
  }
  .agency-sign--card .agency-sign__label {
    font-size: var(--text-performance-body);
  }
  .agency-sign:hover .agency-sign__label,
  .agency-sign:focus-visible .agency-sign__label {
    text-decoration: underline;
    text-underline-offset: 0.25em;
  }
  .agency-sign:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
  .agency-sign:active {
    outline: 1px solid currentColor;
    outline-offset: -4px;
  }
  @media (max-width: 640px) {
    .agency-sign__glyph {
      flex-basis: 24px;
      width: 24px;
    }
  }
</style>
