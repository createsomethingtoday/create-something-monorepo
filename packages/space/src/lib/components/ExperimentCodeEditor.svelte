<script lang="ts">
  import { onMount } from 'svelte';
  import type { Paper, CodeLesson } from '$lib/types/paper';

  interface Props {
    paper: Paper;
    onComplete?: () => void;
  }

  let { paper, onComplete }: Props = $props();

  // Essential state only
  let lessons = $state<CodeLesson[]>([]);
  let currentIndex = $state(0);
  let code = $state('');
  let output = $state<string[]>([]);
  let kvState = $state<{ key: string; value: any }[]>([]);
  let isRunning = $state(false);
  let sessionId = $state('');
  let showHint = $state(false);
  let executionTime = $state<number | null>(null);
  let previousTime = $state<number | null>(null);

  // Computed
  let lesson = $derived(lessons[currentIndex]);
  let canNext = $derived(currentIndex < lessons.length - 1);
  let canPrev = $derived(currentIndex > 0);

  onMount(() => {
    if (paper.code_lessons) {
      try {
        lessons = JSON.parse(paper.code_lessons);
        if (lessons.length > 0) {
          code = lessons[0].starterCode;
        }
      } catch (e) {
        console.error('Failed to parse lessons:', e);
      }
    }
    sessionId = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  async function runCode() {
    if (!lesson || isRunning) return;

    isRunning = true;
    output = [];
    kvState = [];

    const startTime = performance.now();

    try {
      // Determine which endpoint to use based on paper category/slug
      const isNotionExperiment = paper.category === 'api-migration' || paper.slug?.includes('notion');
      const endpoint = isNotionExperiment ? '/api/code/execute-notion' : '/api/code/execute';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          session_id: sessionId,
          lesson_id: lesson.id,
          paper_id: paper.id
        })
      });

      const result = await response.json() as { success: boolean; output?: string[]; kvState?: { key: string; value: any }[]; error?: string };
      const endTime = performance.now();

      // Store previous execution time before updating
      if (executionTime !== null) {
        previousTime = executionTime;
      }
      executionTime = Math.round(endTime - startTime);

      if (result.success) {
        output = result.output || ['Code executed successfully'];
        kvState = result.kvState || [];

        // Auto-detect completion: Successfully ran the final lesson
        const isLastLesson = currentIndex === lessons.length - 1;
        if (isLastLesson && onComplete) {
          onComplete();
        }
      } else {
        output = [`Error: ${result.error || 'Unknown error'}`];
      }
    } catch (err) {
      output = [`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`];
    } finally {
      isRunning = false;
    }
  }

  function nextLesson() {
    if (!canNext) return;
    currentIndex++;
    code = lessons[currentIndex].starterCode;
    output = [];
    kvState = [];
    showHint = false;
    executionTime = null;
    previousTime = null;
  }

  function prevLesson() {
    if (!canPrev) return;
    currentIndex--;
    code = lessons[currentIndex].starterCode;
    output = [];
    kvState = [];
    showHint = false;
    executionTime = null;
    previousTime = null;
  }

  function showSolution() {
    if (lesson?.solution) {
      code = lesson.solution;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if lesson}
  <!-- Lesson Header -->
  <div class="lesson-header">
    <div class="lesson-title">
      <h3>{lesson.title}</h3>
      <p>{lesson.description}</p>
    </div>
    <span class="lesson-count">{currentIndex + 1} / {lessons.length}</span>
  </div>

  <!-- Split Layout: Editor + Output -->
  <div class="split-container">
    <!-- Left Panel: Code Editor -->
    <div class="editor-panel">
      <div class="editor-content">
        <textarea
          bind:value={code}
          class="code-textarea"
          spellcheck="false"
          placeholder="Write your code here..."
        ></textarea>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button onclick={runCode} disabled={isRunning} class="run-btn">
          {isRunning ? 'Running...' : '▶ Run Code'}
        </button>

        <button onclick={() => showHint = !showHint} class="hint-btn">
          {showHint ? '✕ Close Hint' : '💡 Need Help?'}
        </button>

        <button onclick={showSolution} class="solution-btn">
          Show Solution
        </button>

        <div class="nav-buttons">
          <button onclick={prevLesson} disabled={!canPrev}>← Previous</button>
          <button onclick={nextLesson} disabled={!canNext}>Next →</button>
        </div>
      </div>
    </div>

    <!-- Right Panel: Output + KV State -->
    <div class="output-panel">
      <!-- Hint (Progressive Disclosure) -->
      {#if showHint && lesson.hints}
        <div class="hint-box animate-fade-in">
          <h4>Hints:</h4>
          <ul>
            {#each lesson.hints as hint}
              <li>{hint}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Output -->
      <div class="output-section">
        <div class="output-header">
          <h4>Output:</h4>
          {#if executionTime !== null}
            <div class="execution-info">
              <span class="exec-time">{executionTime}ms</span>
              {#if previousTime && executionTime < previousTime}
                <span class="improvement">↓ {Math.round(((previousTime - executionTime) / previousTime) * 100)}% faster</span>
              {/if}
            </div>
          {/if}
        </div>
        {#if output.length > 0}
          <pre class="output animate-fade-in">{output.join('\n')}</pre>
        {:else}
          <div class="output-placeholder">Code executed successfully</div>
        {/if}
      </div>

      <!-- KV State -->
      <div class="kv-section">
        <h4>KV Storage:</h4>
        {#if kvState.length > 0}
          <div class="kv-items animate-fade-in">
            {#each kvState as item}
              <div class="kv-item">
                <span class="kv-key">{item.key}</span>
                <span class="kv-value">{item.value}</span>
              </div>
            {/each}
          </div>
        {:else if output.length === 0}
          <div class="kv-placeholder">Run code to see KV storage state</div>
        {:else}
          <div class="kv-placeholder">No KV data stored yet</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Lesson Header */
  .lesson-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border-default);
  }

  .lesson-title h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: white;
  }

  .lesson-title p {
    margin: 0;
    color: var(--color-fg-tertiary);
    line-height: 1.5;
    font-size: 0.875rem;
  }

  .lesson-count {
    font-size: 0.75rem;
    color: var(--color-fg-muted);
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    white-space: nowrap;
  }

  /* Split Layout */
  .split-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    min-height: 600px;
  }

  /* Left Panel: Editor */
  .editor-panel {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border-default);
    border-radius: 8px;
    background: var(--color-overlay);
    overflow: hidden;
  }

  .editor-content {
    flex: 1;
    display: flex;
  }

  .code-textarea {
    width: 100%;
    height: 100%;
    padding: 1rem;
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    border: none;
    background: transparent;
    color: white;
    resize: none;
  }

  .code-textarea:focus {
    outline: none;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--color-border-default);
    background: var(--color-overlay);
    flex-wrap: wrap;
    align-items: center;
  }

  .run-btn {
    padding: 0.5rem 1rem;
    background: white;
    color: black;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .run-btn:hover:not(:disabled) {
    background: var(--color-fg-secondary);
    transform: scale(1.02);
  }

  .run-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .hint-btn,
  .solution-btn {
    padding: 0.5rem 0.875rem;
    background: var(--color-hover);
    color: white;
    border: 1px solid var(--color-border-emphasis);
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .hint-btn:hover,
  .solution-btn:hover {
    background: var(--color-active);
    border-color: var(--color-border-strong);
  }

  .nav-buttons {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
  }

  .nav-buttons button {
    padding: 0.5rem 0.875rem;
    background: var(--color-hover);
    color: white;
    border: 1px solid var(--color-border-emphasis);
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-buttons button:hover:not(:disabled) {
    background: var(--color-active);
    border-color: var(--color-border-strong);
  }

  .nav-buttons button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Right Panel: Output */
  .output-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .hint-box {
    padding: 1rem;
    background: var(--color-warning-muted);
    border: 1px solid var(--color-warning-border);
    border-radius: 6px;
  }

  .hint-box h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-warning);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hint-box ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .hint-box li {
    color: var(--color-fg-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .output-section,
  .kv-section {
    padding: 1rem;
    background: var(--color-overlay);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
  }

  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .output-section h4,
  .kv-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-fg-muted);
  }

  .execution-info {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    font-size: 0.75rem;
  }

  .exec-time {
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    color: var(--color-fg-tertiary);
    font-weight: 500;
  }

  .improvement {
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    color: var(--color-success);
    font-weight: 600;
  }

  .output,
  .output-placeholder {
    margin: 0;
    padding: 1rem;
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    background: var(--color-overlay);
    border: 1px solid var(--color-border-default);
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: white;
  }

  .output-placeholder,
  .kv-placeholder {
    color: var(--color-fg-muted);
    font-style: italic;
  }

  .kv-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .kv-item,
  .kv-placeholder {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-overlay);
    border: 1px solid var(--color-border-default);
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
  }

  .kv-key {
    font-weight: 600;
    color: var(--color-fg-tertiary);
  }

  .kv-value {
    color: white;
  }

  /* Animation */
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in {
      animation: none;
      opacity: 1;
    }
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .split-container {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .editor-panel {
      min-height: 400px;
    }
  }
</style>
