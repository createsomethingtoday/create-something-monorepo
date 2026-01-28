<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Command {
    input: string;
    output: string[];
    delay?: number; // ms to wait before showing output
  }

  interface Props {
    commands: Command[];
    typingSpeed?: number; // ms per character
    pauseBetweenCommands?: number; // ms between commands
    loopDelay?: number; // ms before restarting
    title?: string;
  }

  let {
    commands,
    typingSpeed = 50,
    pauseBetweenCommands = 1500,
    loopDelay = 3000,
    title = 'Terminal'
  }: Props = $props();

  let displayedLines = $state<string[]>([]);
  let currentTyping = $state('');
  let showCursor = $state(true);
  let isTyping = $state(false);
  
  let animationFrame: number;
  let timeoutId: ReturnType<typeof setTimeout>;
  let cursorInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    // Blink cursor
    cursorInterval = setInterval(() => {
      showCursor = !showCursor;
    }, 530);

    startAnimation();
  });

  onDestroy(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (timeoutId) clearTimeout(timeoutId);
    if (cursorInterval) clearInterval(cursorInterval);
  });

  async function startAnimation() {
    displayedLines = [];
    currentTyping = '';

    for (const command of commands) {
      // Type the command character by character
      isTyping = true;
      for (let i = 0; i <= command.input.length; i++) {
        currentTyping = command.input.slice(0, i);
        await sleep(typingSpeed + Math.random() * 30); // slight randomness
      }
      isTyping = false;

      // Small pause after typing
      await sleep(command.delay ?? 300);

      // Add the full command line to history
      displayedLines = [...displayedLines, `$ ${command.input}`];
      currentTyping = '';

      // Show output lines
      for (const line of command.output) {
        await sleep(100);
        displayedLines = [...displayedLines, line];
      }

      // Pause before next command
      await sleep(pauseBetweenCommands);
    }

    // Pause before looping
    await sleep(loopDelay);
    startAnimation();
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      timeoutId = setTimeout(resolve, ms);
    });
  }
</script>

<div class="terminal-demo">
  <div class="terminal-header">
    <div class="terminal-dots">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
    </div>
    <span class="terminal-title">{title}</span>
  </div>
  
  <div class="terminal-body">
    {#each displayedLines as line}
      <div class="terminal-line" class:command={line.startsWith('$')}>
        {line}
      </div>
    {/each}
    
    {#if currentTyping || isTyping}
      <div class="terminal-line command">
        <span class="prompt">$ </span>
        <span class="typing">{currentTyping}</span>
        <span class="cursor" class:visible={showCursor}>▌</span>
      </div>
    {:else}
      <div class="terminal-line command">
        <span class="prompt">$ </span>
        <span class="cursor" class:visible={showCursor}>▌</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .terminal-demo {
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    max-width: 100%;
  }

  .terminal-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border-default);
  }

  .terminal-dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .dot-red {
    background: #ff5f57;
  }

  .dot-yellow {
    background: #febc2e;
  }

  .dot-green {
    background: #28c840;
  }

  .terminal-title {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    margin-left: auto;
    margin-right: auto;
    padding-right: 48px; /* offset for dots */
  }

  .terminal-body {
    padding: var(--space-md);
    min-height: 180px;
    max-height: 280px;
    overflow-y: auto;
  }

  .terminal-line {
    color: var(--color-fg-tertiary);
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .terminal-line.command {
    color: var(--color-fg-secondary);
  }

  .prompt {
    color: var(--color-fg-muted);
  }

  .typing {
    color: var(--color-fg-primary);
  }

  .cursor {
    color: var(--color-fg-primary);
    opacity: 0;
    transition: opacity 0.1s;
  }

  .cursor.visible {
    opacity: 1;
  }
</style>
