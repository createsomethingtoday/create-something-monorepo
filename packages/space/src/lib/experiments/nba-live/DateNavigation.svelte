<script lang="ts">
  /**
   * DateNavigation Component
   *
   * Navigate between dates to view historical NBA games.
   * Tufte principle: minimal chrome, functional navigation.
   */

  import { ChevronLeft, ChevronRight, Calendar } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { formatNbaDate, shiftNbaDate } from '$lib/nba/scoreboard-state';

  interface Props {
    currentDate: string; // YYYY-MM-DD
    baseUrl?: string;
    todayDate?: string;
  }

  let {
    currentDate,
    baseUrl = '/data/nba',
    todayDate = formatNbaDate(new Date())
  }: Props = $props();

  function formatDate(dateStr: string): string {
    if (dateStr === todayDate) return 'Today';
    if (dateStr === shiftNbaDate(todayDate, -1)) return 'Yesterday';
    if (dateStr === shiftNbaDate(todayDate, 1)) return 'Tomorrow';

    const date = new Date(dateStr + 'T12:00:00Z');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function changeDate(offset: number) {
    const newDate = shiftNbaDate(currentDate, offset);
    goto(`${baseUrl}?date=${newDate}`);
  }

  function jumpToDate(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      goto(`${baseUrl}?date=${value}`);
    }
  }

  function goToToday() {
    goto(baseUrl);
  }
</script>

<div class="date-nav">
  <button class="nav-button" onclick={() => changeDate(-1)} aria-label="Previous day">
    <ChevronLeft size={16} />
    <span>Previous</span>
  </button>

  <label class="date-display">
    <Calendar size={14} class="date-icon" />
    <span class="date-label">{formatDate(currentDate)}</span>
    <input
      class="date-input"
      type="date"
      value={currentDate}
      onchange={jumpToDate}
      aria-label="Jump to date"
    />
  </label>

  <button class="nav-button" onclick={() => changeDate(1)} aria-label="Next day">
    <span>Next</span>
    <ChevronRight size={16} />
  </button>

  {#if currentDate !== todayDate}
    <button class="today-button" onclick={goToToday}>Today</button>
  {/if}
</div>

<style>
  .date-nav {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
  }

  .nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 var(--space-performance-sm);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-sm);
    color: var(--color-performance-fg-secondary);
    cursor: pointer;
    transition: all var(--duration-performance-micro) var(--ease-performance-standard);
  }

  @media (max-width: 520px) {
    .nav-button span {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }

  .nav-button:hover {
    border-color: var(--color-performance-border-emphasis);
    color: var(--color-performance-fg-primary);
  }

  .date-display {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-xs) var(--space-performance-sm);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-sm);
    min-width: 140px;
    justify-content: center;
  }

  .date-display:focus-within {
    outline: 2px solid var(--color-performance-border-emphasis);
    outline-offset: 2px;
  }

  .date-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .date-display :global(.date-icon) {
    color: var(--color-performance-fg-muted);
  }

  .date-label {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-primary);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .today-button {
    min-height: 32px;
    padding: 0 var(--space-performance-sm);
    border-radius: var(--radius-performance-scale-sm);
    background: transparent;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    cursor: pointer;
  }

  .today-button:hover,
  .today-button:focus-visible {
    color: var(--color-performance-fg-primary);
    outline: 1px solid var(--color-performance-border-emphasis);
  }
</style>
