<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, ArrowRight, Terminal, Eye } from 'lucide-svelte';
  import TerminalDemo from '$lib/components/TerminalDemo.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  
  // Use $derived so values update when navigating between lessons
  const lesson = $derived(data.lesson);
  const content = $derived(data.content);
  const prev = $derived(data.prev);
  const next = $derived(data.next);
  const lessonIndex = $derived(data.lessonIndex);
  const totalLessons = $derived(data.totalLessons);

  let contentEl: HTMLDivElement;

  // Add copy buttons to "Try This" code blocks after content renders
  onMount(() => {
    addCopyButtons();
  });

  // Re-add copy buttons when content changes (navigation)
  $effect(() => {
    // Track content changes
    content;
    // Wait for DOM update
    setTimeout(addCopyButtons, 0);
  });

  function addCopyButtons() {
    if (!contentEl) return;

    // Find all h2 elements that contain "Try This"
    const tryThisHeadings = contentEl.querySelectorAll('h2');
    
    tryThisHeadings.forEach(h2 => {
      if (!h2.textContent?.includes('Try This')) return;
      
      // Find the next code block after this heading
      let sibling = h2.nextElementSibling;
      while (sibling) {
        if (sibling.tagName === 'PRE') {
          // Check if we already added a wrapper
          if (sibling.parentElement?.classList.contains('try-this-prompt')) return;
          
          const codeEl = sibling.querySelector('code');
          const codeText = codeEl?.textContent || '';
          
          // Wrap the pre in a container with copy button
          const wrapper = document.createElement('div');
          wrapper.className = 'try-this-prompt';
          
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'prompt-header';
          buttonContainer.innerHTML = `
            <span class="prompt-label">Copy this prompt:</span>
            <button class="copy-prompt-btn" aria-label="Copy to clipboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copy</span>
            </button>
          `;
          
          sibling.parentNode?.insertBefore(wrapper, sibling);
          wrapper.appendChild(buttonContainer);
          wrapper.appendChild(sibling);
          
          // Add click handler
          const btn = buttonContainer.querySelector('.copy-prompt-btn');
          btn?.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(codeText);
              btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Copied!</span>
              `;
              btn.classList.add('copied');
              setTimeout(() => {
                btn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  <span>Copy</span>
                `;
                btn.classList.remove('copied');
              }, 2000);
            } catch (err) {
              console.error('Failed to copy:', err);
            }
          });
          
          break; // Only process the first code block after the heading
        }
        // Stop if we hit another h2
        if (sibling.tagName === 'H2') break;
        sibling = sibling.nextElementSibling;
      }
    });
  }

  // Terminal demos for setting-up lesson
  const INSTALL_DEMO = [
    {
      input: 'curl -fsSL https://claude.ai/install.sh | bash',
      output: ['Downloading Claude Code...', 'Installing...', '✓ Claude Code installed!']
    },
    {
      input: 'claude --version',
      output: ['claude 1.0.16']
    },
    {
      input: 'claude doctor',
      output: ['✓ Authentication valid', '✓ Network connection OK', '✓ Version up to date']
    }
  ];

  const NAVIGATION_DEMO = [
    { input: 'pwd', output: ['/Users/you/projects'] },
    { input: 'ls', output: ['my-app/  notes.txt  README.md'] },
    { input: 'cd my-app', output: [] },
    { input: 'ls', output: ['src/  package.json  tsconfig.json'] }
  ];
</script>

<svelte:head>
  <title>{lesson.title} | Seeing | CREATE SOMETHING</title>
  <meta name="description" content={lesson.description} />
</svelte:head>

<article class="max-w-3xl mx-auto px-6 py-12">
  <!-- Breadcrumb -->
  <nav class="breadcrumb">
    <a href="/seeing" class="breadcrumb-link">
      <Eye size={16} />
      Seeing
    </a>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-current">Lesson {lessonIndex + 1}</span>
  </nav>

  <!-- Header -->
  <header class="lesson-header">
    <div class="lesson-meta">
      <span class="lesson-number">Lesson {lessonIndex + 1} of {totalLessons}</span>
      <span class="lesson-duration">{lesson.duration}</span>
    </div>
    <h1 class="lesson-title">{lesson.title}</h1>
    <p class="lesson-description">{lesson.description}</p>
  </header>

  <!-- Terminal Demos for Setting Up lesson -->
  {#if lesson.id === 'setting-up'}
    <div class="lesson-demos">
      <div class="demo-section">
        <h2 class="demo-title">What Installation Looks Like</h2>
        <p class="demo-intro">Three commands. Here's what you'll see:</p>
        <TerminalDemo 
          commands={INSTALL_DEMO} 
          title="Installing Claude Code"
          typingSpeed={40}
          pauseBetweenCommands={2000}
        />
      </div>
      
      <div class="demo-section">
        <h2 class="demo-title">Terminal Basics</h2>
        <p class="demo-intro">New to the terminal? Here's how navigation works:</p>
        <TerminalDemo 
          commands={NAVIGATION_DEMO} 
          title="Basic Navigation"
          typingSpeed={60}
          pauseBetweenCommands={1500}
        />
      </div>
    </div>
  {/if}

  <!-- Content -->
  <div class="prose lesson-content" bind:this={contentEl}>
    {@html content}
  </div>

  <!-- Practice CTA -->
  <aside class="practice-cta">
    <div class="practice-icon">
      <Terminal size={24} />
    </div>
    <div class="practice-content">
      <h3>Practice with Claude Code</h3>
      <p>Reading is the beginning. Practice develops perception.</p>
      <p class="practice-hint">Apply these concepts in your next coding session.</p>
    </div>
  </aside>

  <!-- Navigation -->
  <nav class="lesson-nav">
    {#if prev}
      <a href="/seeing/{prev.id}" class="nav-link nav-prev">
        <ArrowLeft size={16} />
        <div>
          <span class="nav-label">Previous</span>
          <span class="nav-title">{prev.title}</span>
        </div>
      </a>
    {:else}
      <div></div>
    {/if}

    {#if next}
      <a href="/seeing/{next.id}" class="nav-link nav-next">
        <div>
          <span class="nav-label">Next</span>
          <span class="nav-title">{next.title}</span>
        </div>
        <ArrowRight size={16} />
      </a>
    {:else}
      <a href="/seeing#install" class="nav-link nav-next graduation">
        <div>
          <span class="nav-label">Ready to practice?</span>
          <span class="nav-title">Install Seeing</span>
        </div>
        <ArrowRight size={16} />
      </a>
    {/if}
  </nav>
</article>

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: var(--space-lg);
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .breadcrumb-link {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-fg-secondary);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .breadcrumb-link:hover {
    color: var(--color-fg-primary);
  }

  .breadcrumb-separator {
    color: var(--color-fg-muted);
  }

  .lesson-header {
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border-default);
  }

  .lesson-meta {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .lesson-number {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lesson-duration {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
  }

  .lesson-title {
    font-size: var(--text-h1);
    margin-bottom: var(--space-sm);
  }

  .lesson-description {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }

  /* Prose styles for markdown content */
  .lesson-content :global(h2) {
    font-size: var(--text-h2);
    margin-top: var(--space-xl);
    margin-bottom: var(--space-md);
  }

  .lesson-content :global(h3) {
    font-size: var(--text-h3);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  .lesson-content :global(p) {
    margin-bottom: var(--space-md);
    line-height: var(--leading-relaxed);
  }

  .lesson-content :global(ul) {
    margin-bottom: var(--space-md);
    padding-left: var(--space-lg);
    list-style-type: disc;
  }

  .lesson-content :global(ol) {
    margin-bottom: var(--space-md);
    padding-left: var(--space-lg);
    list-style-type: decimal;
  }

  .lesson-content :global(li) {
    margin-bottom: var(--space-xs);
    padding-left: var(--space-xs);
  }

  .lesson-content :global(li)::marker {
    color: var(--color-fg-muted);
  }

  .lesson-content :global(blockquote) {
    margin: var(--space-lg) 0;
    padding: var(--space-md);
    padding-left: var(--space-lg);
    border-left: 3px solid var(--color-accent-emphasis);
    background: var(--color-bg-elevated);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    font-style: italic;
    color: var(--color-fg-secondary);
  }

  .lesson-content :global(code) {
    padding: 2px 6px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .lesson-content :global(pre) {
    margin: var(--space-md) 0;
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    overflow-x: auto;
  }

  .lesson-content :global(pre code) {
    padding: 0;
    background: none;
  }

  .lesson-content :global(strong) {
    font-weight: var(--font-semibold);
  }

  .lesson-content :global(hr) {
    margin: var(--space-xl) 0;
    border: none;
    border-top: 1px solid var(--color-border-default);
  }

  /* Practice CTA */
  .practice-cta {
    display: flex;
    gap: var(--space-md);
    margin: var(--space-xl) 0;
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .practice-icon {
    color: var(--color-fg-secondary);
  }

  .practice-content h3 {
    font-size: var(--text-body-lg);
    margin-bottom: var(--space-xs);
  }

  .practice-content p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin-bottom: var(--space-sm);
  }


  /* Navigation */
  .lesson-nav {
    display: flex;
    justify-content: space-between;
    gap: var(--space-md);
    margin-top: var(--space-xl);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border-default);
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: border-color var(--duration-micro) var(--ease-standard);
    max-width: 45%;
  }

  .nav-link:hover {
    border-color: var(--color-border-emphasis);
  }

  .nav-prev {
    text-align: left;
  }

  .nav-next {
    text-align: right;
    margin-left: auto;
  }

  .nav-label {
    display: block;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .nav-title {
    display: block;
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
  }

  .graduation {
    background: var(--color-accent-subtle);
    border-color: var(--color-accent-emphasis);
  }

  /* Terminal Demo Sections */
  .lesson-demos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .demo-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .demo-title {
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    margin: 0;
  }

  .demo-intro {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin: 0;
  }

  .practice-hint {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0;
  }

  /* Table styles for lesson content */
  .lesson-content :global(table) {
    width: 100%;
    margin: var(--space-md) 0;
    border-collapse: collapse;
    font-size: var(--text-body-sm);
  }

  .lesson-content :global(th),
  .lesson-content :global(td) {
    padding: var(--space-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-border-default);
  }

  .lesson-content :global(th) {
    font-weight: var(--font-semibold);
    color: var(--color-fg-secondary);
    background: var(--color-bg-elevated);
  }

  .lesson-content :global(td) {
    color: var(--color-fg-tertiary);
  }

  /* Try This Prompt with Copy Button */
  .lesson-content :global(.try-this-prompt) {
    margin: var(--space-md) 0;
    border: 1px solid var(--color-accent-emphasis);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-bg-elevated);
  }

  .lesson-content :global(.prompt-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-accent-subtle);
    border-bottom: 1px solid var(--color-accent-emphasis);
  }

  .lesson-content :global(.prompt-label) {
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lesson-content :global(.copy-prompt-btn) {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .lesson-content :global(.copy-prompt-btn:hover) {
    background: var(--color-bg-elevated);
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .lesson-content :global(.copy-prompt-btn:active) {
    transform: scale(0.98);
  }

  .lesson-content :global(.copy-prompt-btn.copied) {
    background: var(--color-success-subtle);
    border-color: var(--color-success-emphasis);
    color: var(--color-success-emphasis);
  }

  .lesson-content :global(.try-this-prompt pre) {
    margin: 0;
    border-radius: 0;
    border: none;
  }
</style>
