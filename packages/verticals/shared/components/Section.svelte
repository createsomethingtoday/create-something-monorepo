<!--
  Section

  Canonical section wrapper with golden ratio spacing.
  Provides consistent vertical rhythm across all templates.

  @usage
  <Section>
    <h2>Section Title</h2>
    <p>Content</p>
  </Section>

  <Section variant="elevated">
    <h2>Elevated Section</h2>
  </Section>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    variant?: 'pure' | 'elevated' | 'surface';
    spacing?: 'default' | 'compact' | 'generous';
    id?: string;
    class?: string;
  }

  let {
    children,
    variant = 'pure',
    spacing = 'default',
    id,
    class: className = ''
  }: Props = $props();
</script>

<section
  {id}
  class="section section--{variant} section--{spacing} {className}"
>
  <div class="section-container">
    {@render children()}
  </div>
</section>

<style>
  .section {
    width: 100%;
  }

  /* Spacing variants */
  .section--default {
    padding: var(--space-3xl) 0;
  }

  .section--compact {
    padding: var(--space-2xl) 0;
  }

  .section--generous {
    padding: var(--space-4xl, 17.942rem) 0;
  }

  /* Background variants */
  .section--pure {
    background: var(--color-bg-pure);
  }

  .section--elevated {
    background: var(--color-bg-elevated);
  }

  .section--surface {
    background: var(--color-bg-surface);
  }

  /* Container */
  .section-container {
    max-width: var(--container-xl);
    margin: 0 auto;
    padding: 0 var(--space-md);
  }

  @media (max-width: 768px) {
    .section--default {
      padding: var(--space-2xl) 0;
    }

    .section--compact {
      padding: var(--space-xl) 0;
    }

    .section--generous {
      padding: var(--space-3xl) 0;
    }
  }
</style>
