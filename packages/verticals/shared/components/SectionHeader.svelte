<!--
  SectionHeader

  Canonical section header with title and optional subtitle.
  Centers content and maintains consistent typography.

  @usage
  <SectionHeader
    title="Our Services"
    subtitle="What we offer"
  />
-->
<script lang="ts">
  interface Props {
    title: string;
    subtitle?: string;
    align?: 'center' | 'left';
    class?: string;
  }

  let {
    title,
    subtitle,
    align = 'center',
    class: className = ''
  }: Props = $props();
</script>

<header class="section-header section-header--{align} {className}">
  <h2 class="section-title">{title}</h2>
  {#if subtitle}
    <p class="section-subtitle">{subtitle}</p>
  {/if}
</header>

<style>
  .section-header {
    margin-bottom: var(--space-xl);
  }

  .section-header--center {
    text-align: center;
    max-width: var(--width-prose);
    margin-left: auto;
    margin-right: auto;
  }

  .section-header--left {
    text-align: left;
  }

  .section-title {
    font-size: var(--text-h1);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-sm);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tighter);
  }

  .section-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin: 0;
  }
</style>
