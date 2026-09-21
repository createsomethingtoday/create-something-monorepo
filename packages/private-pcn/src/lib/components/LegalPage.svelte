<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    title,
    description,
    effectiveDate = 'September 20, 2026',
    version = '1.0',
    sections,
    children
  }: {
    title: string;
    description: string;
    effectiveDate?: string;
    version?: string;
    sections: { id: string; title: string }[];
    children: Snippet;
  } = $props();
</script>

<svelte:head>
  <title>{title} | CREATE SOMETHING Private</title>
  <meta name="description" content={description} />
</svelte:head>
<main id="main" class="legal-page">
  <header class="legal-header">
    <p class="eyebrow">PRIVATE / THE AGREEMENT</p>
    <h1>{title}</h1>
    <p class="intro">{description}</p>
    <p class="updated">Effective {effectiveDate} · Version {version}</p>
    <nav class="documents" aria-label="Legal documents">
      <a href="/terms" aria-current={title === 'Terms of Service' ? 'page' : undefined}
        >Terms of Service</a
      >
      <a href="/privacy" aria-current={title === 'Privacy Policy' ? 'page' : undefined}
        >Privacy Policy</a
      >
    </nav>
  </header>
  <div class="legal-layout">
    <nav class="contents" aria-label="On this page">
      <p class="eyebrow">ON THIS PAGE</p>
      <ol>
        {#each sections as section}<li><a href={`#${section.id}`}>{section.title}</a></li>{/each}
      </ol>
    </nav>
    <article>{@render children()}</article>
  </div>
</main>

<style>
  .legal-page {
    max-width: 1180px;
    margin: 0 auto;
    padding: clamp(3rem, 7vw, 6rem) 5vw;
  }
  .legal-header {
    max-width: 780px;
    margin-bottom: 3.5rem;
  }
  h1 {
    font-size: clamp(2.5rem, 6vw, 5rem);
    line-height: 1.05;
    letter-spacing: -0.05em;
    margin: 1rem 0 1.5rem;
  }
  .intro {
    font-size: 1.2rem;
    line-height: 1.6;
    color: var(--muted);
  }
  .updated {
    font-size: 0.875rem;
    color: var(--muted);
    margin: 1.5rem 0;
  }
  .documents {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 2rem;
  }
  .documents a[aria-current='page'] {
    color: var(--signal);
  }
  .legal-layout {
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    gap: clamp(2rem, 5vw, 5rem);
    border-top: 1px solid var(--line);
    padding-top: 2.5rem;
  }
  .contents {
    align-self: start;
    position: sticky;
    top: 2rem;
  }
  ol {
    padding-left: 1.25rem;
    margin: 1rem 0;
  }
  li {
    padding: 0.4rem 0;
    line-height: 1.5;
  }
  .contents a {
    color: var(--muted);
    text-decoration: none;
  }
  .contents a:hover {
    color: var(--paper);
    text-decoration: underline;
  }
  article {
    min-width: 0;
    max-width: 70ch;
    font-size: 1rem;
    line-height: 1.75;
    overflow-wrap: anywhere;
  }
  article :global(section) {
    margin-bottom: 2.75rem;
    scroll-margin-top: 2rem;
  }
  article :global(h2) {
    font-size: 1.4rem;
    line-height: 1.3;
    letter-spacing: -0.02em;
    margin: 0 0 1rem;
  }
  article :global(p),
  article :global(ul) {
    margin: 0 0 1rem;
    color: var(--muted);
  }
  article :global(strong),
  article :global(a) {
    color: var(--paper);
  }
  article :global(ul) {
    padding-left: 1.4rem;
  }
  article :global(li) {
    margin-bottom: 0.5rem;
  }
  @media (max-width: 760px) {
    .legal-layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .contents {
      position: static;
      border-bottom: 1px solid var(--line);
      padding-bottom: 1.5rem;
    }
    .legal-header {
      margin-bottom: 2rem;
    }
  }
  @media print {
    .legal-page {
      color: #111;
      background: #fff;
      max-width: none;
      padding: 0;
    }
    .legal-layout {
      display: block;
    }
    .contents,
    .documents {
      display: none;
    }
    article,
    .intro,
    .updated,
    article :global(p),
    article :global(ul),
    article :global(a),
    article :global(strong) {
      color: #111;
    }
  }
</style>
