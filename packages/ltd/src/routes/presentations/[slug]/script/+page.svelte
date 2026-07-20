<script lang="ts">
  /**
   * Script Viewer
   *
   * The server-rendered page is a readable sectioned script. JavaScript adds
   * clipboard actions without becoming a prerequisite for the narration.
   */
  import { SEO } from '@create-something/canon';
  import { onDestroy, onMount } from 'svelte';

  interface ScriptBlock {
    type: 'content' | 'direction' | 'list' | 'technical';
    content: string;
  }

  interface ScriptSection {
    id: string;
    title: string;
    blocks: ScriptBlock[];
  }

  let { data } = $props();
  let isEnhanced = $state(false);
  let copyStatus = $state('');
  let clearStatusTimer: ReturnType<typeof setTimeout> | undefined;

  function parseScript(markdown: string): ScriptSection[] {
    const sections: ScriptSection[] = [];
    let current: ScriptSection | undefined;

    function ensureSection() {
      if (!current) {
        current = { id: 'introduction', title: 'Introduction', blocks: [] };
        sections.push(current);
      }
      return current;
    }

    for (const line of markdown.split('\n')) {
      const heading = line.match(/^##\s+(.+)$/);
      if (heading) {
        const title = heading[1].trim();
        current = {
          id: `${String(sections.length + 1).padStart(2, '0')}-${slugify(title)}`,
          title,
          blocks: []
        };
        sections.push(current);
        continue;
      }

      if (/^#\s/.test(line) || /^---+$/.test(line.trim()) || !line.trim()) continue;

      const section = ensureSection();
      section.blocks.push({
        type: classifyLine(line),
        content: cleanInlineMarkdown(line)
      });
    }

    return sections;
  }

  function classifyLine(line: string): ScriptBlock['type'] {
    const trimmed = line.trim();
    if (/^\[.*\]$/.test(trimmed) || /^\{.*\}$/.test(trimmed)) return 'direction';
    if (/^\*\*(Visual|Voiceover|Action|Direction|Duration|Pace|Tone|Format)/i.test(trimmed)) {
      return 'direction';
    }
    if (/^[-*]\s+/.test(trimmed)) return 'list';
    if (/^\|/.test(trimmed) || /`/.test(trimmed)) return 'technical';
    return 'content';
  }

  function cleanInlineMarkdown(line: string) {
    return line
      .trim()
      .replace(/^[-*]\s+/, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1');
  }

  function slugify(value: string) {
    return (
      value
        .toLowerCase()
        .replace(/\[[^\]]+\]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'section'
    );
  }

  const sections = $derived(parseScript(data.script));

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

    await copyText(plainText, 'Plain text copied.');
  }

  async function copyMarkdown() {
    await copyText(data.script, 'Markdown copied.');
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      reportCopyStatus(successMessage);
    } catch {
      reportCopyStatus('Could not copy. Select the raw script below instead.');
    }
  }

  function reportCopyStatus(message: string) {
    copyStatus = message;
    if (clearStatusTimer) clearTimeout(clearStatusTimer);
    clearStatusTimer = setTimeout(() => (copyStatus = ''), 3000);
  }

  onMount(() => {
    isEnhanced = true;
  });

  onDestroy(() => {
    if (clearStatusTimer) clearTimeout(clearStatusTimer);
  });
</script>

<SEO
  title={data.meta.title}
  description={data.meta.description}
  propertyName="ltd"
  canonical={`https://createsomething.ltd/presentations/${data.slug}/script`}
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
  <header class="script-header" data-performance-chapter="orientation">
    <a href="/presentations/{data.slug}" class="back-link">← Back to presentation</a>

    <div class="title-row">
      <div>
        <p class="eyebrow">Narration script</p>
        <h1>{data.meta.presentationTitle}</h1>
        <p class="subtitle">{data.meta.presentationSubtitle}</p>
      </div>

      {#if isEnhanced}
        <div class="actions" aria-label="Copy script">
          <button class="button-primary" onclick={copyPlainText}>Copy Plain Text</button>
          <button class="button-secondary" onclick={copyMarkdown}>Copy Markdown</button>
        </div>
      {/if}
    </div>

    <p class="copy-status" role="status" aria-live="polite">{copyStatus}</p>

    <nav class="script-outline" aria-label="Script sections">
      <p>Jump to a section</p>
      <ol>
        {#each sections as section}
          <li><a href={`#${section.id}`}>{section.title}</a></li>
        {/each}
      </ol>
    </nav>
  </header>

  <article class="script-content" data-performance-chapter="script-body">
    {#each sections as section, index}
      <section id={section.id} aria-labelledby={`${section.id}-title`}>
        <p class="section-number">{String(index + 1).padStart(2, '0')}</p>
        <h2 id={`${section.id}-title`}>{section.title}</h2>

        <div class="section-blocks">
          {#each section.blocks as block}
            <p
              class:direction={block.type === 'direction'}
              class:list-item={block.type === 'list'}
              class:technical={block.type === 'technical'}
            >
              {block.content}
            </p>
          {/each}
        </div>
      </section>
    {/each}

    <details class="raw-script">
      <summary>Raw markdown</summary>
      <p>The original file remains available for production notes and exact copying.</p>
      <pre>{data.script}</pre>
    </details>
  </article>

  <footer class="script-footer" data-performance-chapter="handoff">
    <p>Continue with the slides or choose another presentation.</p>
    <div>
      <a href="/presentations/{data.slug}" class="button-primary">View slides</a>
      <a href="/presentations" class="button-secondary">All presentations</a>
    </div>
  </footer>
</div>

<style>
  .script-viewer {
    min-height: 100vh;
    overflow-x: clip;
    background: var(--color-performance-bg-pure);
    color: var(--color-performance-fg-primary);
    padding: var(--space-performance-xl) var(--space-performance-lg);
  }

  .script-header,
  .script-content,
  .script-footer {
    width: min(100%, 72rem);
    margin-inline: auto;
  }

  .back-link {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .back-link:hover,
  .back-link:focus-visible {
    color: var(--color-performance-fg-primary);
  }

  .title-row {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-performance-lg);
    margin-top: var(--space-performance-lg);
  }

  .eyebrow,
  h1,
  .subtitle,
  .copy-status,
  .script-outline p,
  .section-number,
  .section-blocks p,
  .raw-script p,
  .script-footer p {
    margin: 0;
  }

  .eyebrow,
  .section-number,
  .script-outline p {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    text-transform: uppercase;
    letter-spacing: var(--tracking-performance-wide);
  }

  h1 {
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-bold);
    letter-spacing: var(--tracking-performance-tight);
    margin-top: var(--space-performance-xs);
  }

  .subtitle {
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-lg);
    margin-top: var(--space-performance-xs);
  }

  .actions,
  .script-footer div {
    display: flex;
    align-items: center;
    gap: var(--space-performance-sm);
    flex-wrap: wrap;
  }

  .copy-status {
    min-height: 1.5rem;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    margin-top: var(--space-performance-sm);
  }

  .script-outline {
    margin-top: var(--space-performance-lg);
    padding-block: var(--space-performance-sm);
    border-block: 1px solid var(--color-performance-border-default);
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .script-outline ol {
    display: flex;
    gap: var(--space-performance-xs);
    list-style: none;
    padding: 0;
    margin: var(--space-performance-xs) 0 0;
    width: max-content;
  }

  .script-outline a {
    display: inline-flex;
    padding: var(--space-performance-xs) var(--space-performance-sm);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-full);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    text-decoration: none;
  }

  .script-outline a:hover,
  .script-outline a:focus-visible {
    border-color: var(--color-performance-border-emphasis);
    color: var(--color-performance-fg-primary);
  }

  .script-content {
    max-width: 72ch;
  }

  .script-content > section {
    padding-block: var(--space-performance-xl);
    border-bottom: 1px solid var(--color-performance-border-default);
    scroll-margin-top: var(--space-performance-lg);
  }

  .script-content h2 {
    font-size: var(--text-performance-h2);
    line-height: var(--leading-performance-tight);
    margin: var(--space-performance-xs) 0 var(--space-performance-lg);
  }

  .section-blocks {
    display: grid;
    gap: var(--space-performance-sm);
  }

  .section-blocks p {
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
    color: var(--color-performance-fg-secondary);
  }

  .section-blocks .direction,
  .section-blocks .technical {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-body-sm);
    padding: var(--space-performance-xs) var(--space-performance-sm);
    background: var(--color-performance-bg-surface);
    border-left: 2px solid var(--color-performance-border-emphasis);
    overflow-wrap: anywhere;
  }

  .section-blocks .list-item {
    position: relative;
    padding-left: var(--space-performance-lg);
  }

  .section-blocks .list-item::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--color-performance-fg-muted);
  }

  .raw-script {
    margin-top: var(--space-performance-xl);
    padding: var(--space-performance-md);
    background: var(--color-performance-bg-surface);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-md);
  }

  .raw-script summary {
    font-weight: var(--font-performance-semibold);
    cursor: pointer;
  }

  .raw-script p {
    margin-top: var(--space-performance-xs);
    color: var(--color-performance-fg-secondary);
  }

  .raw-script pre {
    margin: var(--space-performance-md) 0 0;
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-body-sm);
    line-height: var(--leading-performance-relaxed);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .script-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-lg);
    padding-block: var(--space-performance-xl);
  }

  .script-footer p {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-secondary);
  }

  .script-footer a {
    text-decoration: none;
  }

  @media (max-width: 768px) {
    .script-viewer {
      padding: var(--space-performance-lg) var(--space-performance-md);
    }

    .title-row,
    .script-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .actions,
    .script-footer div {
      width: 100%;
    }

    .actions button,
    .script-footer a {
      flex: 1;
      text-align: center;
    }

    .script-content > section {
      padding-block: var(--space-performance-lg);
    }
  }

  @media print {
    .back-link,
    .actions,
    .script-outline,
    .copy-status,
    .raw-script,
    .script-footer {
      display: none;
    }

    .script-viewer {
      padding: 0;
    }
  }
</style>
