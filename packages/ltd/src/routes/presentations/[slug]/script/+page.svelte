<script lang="ts">
  /**
   * Script Viewer
   *
   * Displays the SCRIPT.md narration for a presentation.
   * Optimized for copying to Descript or teleprompter.
   *
   * Voice: CREATE SOMETHING
   * - Clarity over cleverness
   * - Specificity over generality
   */
  import { SEO } from '@create-something/canon';

  let { data } = $props();

  // Parse markdown into sections for better display
  function parseScript(markdown: string) {
    const lines = markdown.split('\n');
    const sections: Array<{ type: 'heading' | 'content' | 'markup'; content: string }> = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        sections.push({ type: 'heading', content: line.replace('## ', '') });
      } else if (line.startsWith('# ')) {
        // Skip H1 title
      } else if (line.startsWith('---')) {
        // Skip horizontal rules
      } else if (line.match(/^\[.*\]$/)) {
        // Markup like [PAUSE], [BREATHE]
        sections.push({ type: 'markup', content: line });
      } else if (line.match(/^\{.*\}$/)) {
        // Stage directions like {slide transition}
        sections.push({ type: 'markup', content: line });
      } else if (line.trim()) {
        sections.push({ type: 'content', content: line });
      }
    }

    return sections;
  }

  const sections = $derived(parseScript(data.script));

  // Copy script to clipboard (plain text, stripped of markup)
  async function copyPlainText() {
    const plainText = data.script
      .replace(/\[PAUSE.*?\]/g, '...')
      .replace(/\[BEAT\]/g, '...')
      .replace(/\[BREATHE\]/g, '')
      .replace(/\[SLOW\]|\[\/SLOW\]/g, '')
      .replace(/\[QUOTE\]|\[\/QUOTE\]/g, '')
      .replace(/\{.*?\}/g, '')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/↗|↘/g, '')
      .replace(/—/g, ' - ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    await navigator.clipboard.writeText(plainText);
    copyStatus = 'Copied!';
    setTimeout(() => (copyStatus = ''), 2000);
  }

  // Copy raw markdown
  async function copyMarkdown() {
    await navigator.clipboard.writeText(data.script);
    copyStatus = 'Copied!';
    setTimeout(() => (copyStatus = ''), 2000);
  }

  let copyStatus = $state('');
</script>

<SEO
  title={data.meta.title}
  description={data.meta.description}
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Presentations', url: 'https://createsomething.ltd/presentations' },
    {
      name: data.meta.presentationTitle,
      url: `https://createsomething.ltd/presentations/${data.slug}`
    },
    { name: 'Script', url: `https://createsomething.ltd/presentations/${data.slug}/script` }
  ]}
/>

<div class="script-viewer">
  <header class="header">
    <div class="header-content">
      <a href="/presentations/{data.slug}" class="back-link">← Back to Presentation</a>
      <h1>{data.meta.presentationTitle}</h1>
      <p class="subtitle">{data.meta.presentationSubtitle}</p>
    </div>
    <div class="actions">
      <button class="button-primary" onclick={copyPlainText}>Copy Plain Text</button>
      <button class="button-secondary" onclick={copyMarkdown}>Copy Markdown</button>
      {#if copyStatus}
        <span class="copy-status">{copyStatus}</span>
      {/if}
    </div>
  </header>

  <main class="script-content">
    <div class="script-raw">
      <pre>{data.script}</pre>
    </div>
  </main>

  <footer class="footer">
    <p>
      <a href="/presentations">All Presentations</a> ·
      <a href="/presentations/{data.slug}">View Slides</a>
    </p>
  </footer>
</div>

<style>
  .script-viewer {
    min-height: 100vh;
    background: var(--color-performance-bg-pure);
    color: var(--color-performance-fg-primary);
    padding: var(--space-performance-lg);
  }

  .header {
    max-width: 80ch;
    margin: 0 auto var(--space-performance-xl);
    padding-bottom: var(--space-performance-lg);
  }

  .header-content {
    margin-bottom: var(--space-performance-md);
  }

  .back-link {
    color: var(--color-performance-fg-muted);
    text-decoration: none;
    font-size: var(--text-performance-body-sm);
    display: inline-block;
    margin-bottom: var(--space-performance-sm);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .back-link:hover {
    color: var(--color-performance-fg-primary);
  }

  h1 {
    font-size: var(--text-performance-h1);
    font-weight: 700;
    letter-spacing: 0.02em;
    margin: 0 0 var(--space-performance-xs);
  }

  .subtitle {
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-lg);
    margin: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-performance-sm);
    align-items: center;
    flex-wrap: wrap;
  }

  /* Removed local .btn and .btn-secondary styles as we use .button-primary and .button-secondary from canon */

  .copy-status {
    color: var(--color-performance-success);
    font-size: var(--text-performance-body-sm);
  }

  .script-content {
    max-width: 80ch;
    margin: 0 auto;
  }

  .script-raw {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    padding: var(--space-performance-lg);
    overflow-x: auto;
  }

  .script-raw pre {
    margin: 0;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: var(--text-performance-body-sm);
    line-height: 1.7;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .footer {
    max-width: 80ch;
    margin: var(--space-performance-xl) auto 0;
    padding-top: var(--space-performance-lg);
    text-align: center;
  }

  .footer a {
    color: var(--color-performance-fg-muted);
    text-decoration: none;
    font-size: var(--text-performance-body-sm);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .footer a:hover {
    color: var(--color-performance-fg-primary);
  }

  @media print {
    .header,
    .actions,
    .footer,
    .back-link {
      display: none;
    }

    .script-viewer {
      padding: 0;
    }

    .script-raw {
      border: none;
      padding: 0;
      background: white;
    }

    .script-raw pre {
      font-size: 12pt;
      color: black;
    }
  }
</style>
