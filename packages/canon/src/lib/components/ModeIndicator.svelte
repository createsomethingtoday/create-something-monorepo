<script lang="ts">
  /**
   * ModeIndicator - Hermeneutic Circle Position
   *
   * Shows the user's current position in the CREATE Something ecosystem.
   * Visualizes the Modes of Being: .ltd → .io → .space → .agency
   *
   * Position: Bottom-left corner, subtle but persistent
   */

  interface Props {
    current: 'ltd' | 'io' | 'space' | 'agency' | 'learn';
    showLabels?: boolean;
    size?: 'sm' | 'md';
    showYouAreHere?: boolean;
  }

  let { current, showLabels = false, size = 'sm', showYouAreHere = false }: Props = $props();

  let hoveredMode = $state<string | null>(null);
  let focusedMode = $state<string | null>(null);

  const modes = [
    { id: 'space', label: 'Explore', url: 'https://createsomething.space' },
    { id: 'learn', label: 'Learn', url: 'https://learn.createsomething.space' },
    { id: 'io', label: 'Research', url: 'https://createsomething.io' },
    { id: 'agency', label: 'Build', url: 'https://createsomething.agency' },
    { id: 'ltd', label: 'Canon', url: 'https://createsomething.ltd' }
  ] as const;

  function handleModeClick(e: MouseEvent, mode: (typeof modes)[number]) {
    if (mode.id === current) {
      e.preventDefault();
      return;
    }

    // Set transition origin for cross-property animation
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cs-transition-from', current);
      sessionStorage.setItem('cs-transition-to', mode.id);
      sessionStorage.setItem('cs-transition-time', Date.now().toString());
    }

    // Add exit animation
    document.body.classList.add('transitioning-out');
  }

  function getModeAriaLabel(mode: (typeof modes)[number]) {
    if (mode.id === current) {
      return `Current property: .${mode.id} ${mode.label}`;
    }

    return `Go to .${mode.id} ${mode.label}`;
  }

  function shouldShowTooltip(mode: (typeof modes)[number]) {
    return hoveredMode === mode.id || focusedMode === mode.id;
  }

  function getModeTooltipLabel(mode: (typeof modes)[number]) {
    if (mode.id === current) {
      return showYouAreHere ? 'You are here' : 'Current';
    }

    return mode.label;
  }
</script>

<nav
  class="mode-indicator"
  class:size-sm={size === 'sm'}
  class:size-md={size === 'md'}
  aria-label="CREATE SOMETHING properties"
>
  {#each modes as mode}
    <a
      href={mode.url}
      class="mode-item"
      class:active={mode.id === current}
      onclick={(e) => handleModeClick(e, mode)}
      title={`.${mode.id} ${mode.label}`}
      aria-label={getModeAriaLabel(mode)}
      aria-current={mode.id === current ? 'page' : undefined}
      onmouseenter={() => (hoveredMode = mode.id)}
      onmouseleave={() => (hoveredMode = null)}
      onfocus={() => (focusedMode = mode.id)}
      onblur={() => (focusedMode = null)}
    >
      <span class="mode-dot"></span>
      {#if showLabels}
        <span class="mode-label">.{mode.id}</span>
      {/if}
      {#if shouldShowTooltip(mode)}
        <span class="mode-tooltip">
          <strong>.{mode.id}</strong>
          <span>{getModeTooltipLabel(mode)}</span>
        </span>
      {/if}
    </a>
  {/each}
</nav>

<style>
  .mode-indicator {
    position: fixed;
    bottom: clamp(1rem, 2vw, 1.5rem);
    left: clamp(1rem, 2vw, 1.5rem);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.48rem 0.55rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-full);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    z-index: var(--z-fixed);
    opacity: 0.92;
    box-shadow: var(--shadow-clear-restraint, 0 4px 20px rgba(0, 0, 0, 0.06));
    transition:
      opacity var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  .mode-indicator:hover {
    opacity: 1;
    border-color: var(--color-clear-border-strong, #cecece);
    box-shadow: var(--shadow-clear-lift, 0 8px 28px rgba(0, 0, 0, 0.08));
  }

  .mode-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-width: 1.3rem;
    min-height: 1.3rem;
    padding: 0.2rem;
    border-radius: var(--radius-full);
    text-decoration: none;
    transition:
      background var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      transform var(--duration-micro) var(--ease-standard);
  }

  .mode-item:hover:not(.active) {
    background: var(--color-clear-porcelain, #f9f9f9);
  }

  .mode-item.active {
    cursor: default;
    background: color-mix(in srgb, var(--color-clear-pill-active, #cad7fa) 34%, white);
  }

  .mode-dot {
    width: 0.42rem;
    height: 0.42rem;
    border-radius: var(--radius-full);
    background: var(--color-clear-border-strong, #cecece);
    transition:
      background var(--duration-micro) var(--ease-standard),
      transform var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  .mode-item:hover:not(.active) .mode-dot {
    background: var(--color-clear-grey-quiet, #818181);
    transform: scale(1.12);
  }

  .mode-item.active .mode-dot {
    background: var(--color-clear-onyx, #0a0e19);
    box-shadow: 0 0 0 3px var(--color-clear-panel, #ffffff);
  }

  .mode-label {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-clear-grey, #636363);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .mode-item:hover:not(.active) .mode-label {
    color: var(--color-clear-onyx, #0a0e19);
  }

  .mode-item.active .mode-label {
    color: var(--color-clear-onyx, #0a0e19);
  }

  .mode-item:focus-visible {
    outline: 2px solid var(--color-clear-ocean, #0048ff);
    outline-offset: 2px;
  }

  .mode-tooltip {
    position: absolute;
    bottom: calc(100% + var(--space-xs));
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    gap: 0.12rem;
    min-width: max-content;
    padding: 0.42rem 0.55rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    font-size: var(--text-caption);
    color: var(--color-clear-grey, #636363);
    white-space: nowrap;
    pointer-events: none;
    box-shadow: var(--shadow-clear-restraint, 0 4px 20px rgba(0, 0, 0, 0.06));
    animation: fadeIn var(--duration-micro) var(--ease-standard);
  }

  .mode-tooltip strong,
  .mode-tooltip span {
    display: block;
    line-height: 1;
  }

  .mode-tooltip strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold, 600);
  }

  .mode-tooltip span {
    color: var(--color-clear-grey, #636363);
    font-size: 0.68rem;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .mode-item {
    position: relative;
  }

  /* Size variants */
  .size-sm {
    padding: 0.44rem 0.52rem;
  }

  .size-sm .mode-dot {
    width: 0.38rem;
    height: 0.38rem;
  }

  .size-md .mode-dot {
    width: 0.52rem;
    height: 0.52rem;
  }

  /* Hide on mobile - unified search FAB replaces this functionality */
  @media (max-width: 768px) {
    .mode-indicator {
      display: none;
    }
  }

  /* Also hide on touch devices */
  @media (pointer: coarse) {
    .mode-indicator {
      display: none;
    }
  }
</style>
