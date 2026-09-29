<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Original elementary geometry; no imported or traced artwork. */
  export type AgencySignKind = 'map' | 'build' | 'control' | 'proof';

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
    kind, label, href, detail, direction = 'forward', current = false,
    card = false, heading = false, children
  }: Props = $props();

  const arrows = { forward: '→', down: '↓', back: '←', external: '↗' };
</script>

<a class="agency-sign" class:agency-sign--card={card} {href} aria-current={current ? 'page' : undefined}>
  <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">
    {#if kind === 'map'}
      <!-- A bounded plane and three connected workflow points. -->
      <path d="M3 12 16 5 29 12 16 19Z M3 12v7l13 7 13-7v-7 M16 19v7 M10 12l6-3 6 3-6 3Z" />
      <path d="M10 12v3 M22 12v3 M16 15v3" />
    {:else if kind === 'build'}
      <!-- Two assembled layers with an open interface seam. -->
      <path d="m4 9 12-6 12 6-12 6Z M4 9v5l12 6 12-6V9 M16 15v5 M4 20l12 6 12-6 M4 24l12 6 12-6 M16 26v4" />
    {:else if kind === 'control'}
      <!-- An operating boundary with a visible opening and stop bar. -->
      <path d="M4 12 16 6l12 6v10l-8 4 M12 26l-8-4V12 M4 22l12-6 12 6 M16 6v10 M12 28v-7 M20 28v-7 M12 23h8" />
    {:else}
      <!-- An inspectable record, with source/result lines, not a success check. -->
      <path d="m8 8 12-5 5 4v17l-12 5-5-4Z M8 8l5 4 12-5 M13 12v17 M17 15l5-2 M17 20l5-2 M17 25l5-2" />
    {/if}
  </svg>
  <div class="agency-sign__content">
    {#if current}<span class="agency-sign__current">Current path</span>{/if}
    <svelte:element this={heading ? 'h3' : 'strong'} class="agency-sign__label">{label}</svelte:element>
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
  svg { flex: 0 0 32px; }
  .agency-sign__content { min-width: 0; flex: 1; overflow-wrap: anywhere; }
  .agency-sign__label { display: block; margin: 0; font-size: var(--text-performance-body-sm); font-weight: var(--font-performance-semibold); }
  .agency-sign__detail, .agency-sign__current { display: block; font-size: var(--text-performance-caption); }
  .agency-sign__current { font-family: var(--font-performance-mono); }
  .agency-sign__arrow { flex: 0 0 auto; }
  .agency-sign--card { height: 100%; align-items: flex-start; padding: var(--space-performance-md); }
  .agency-sign--card .agency-sign__label { font-size: var(--text-performance-body); }
  .agency-sign:hover .agency-sign__label, .agency-sign:focus-visible .agency-sign__label { text-decoration: underline; text-underline-offset: .25em; }
  .agency-sign:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .agency-sign:active { outline: 1px solid currentColor; outline-offset: -4px; }
  @media (max-width: 640px) { svg { width: 24px; height: 24px; flex-basis: 24px; } }
</style>
