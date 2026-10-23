<script lang="ts">
  import { tick } from 'svelte';
  import type { AgentActivity } from './agent-activity';
  let { activity, now, follow = $bindable(false), reduced = $bindable(false), stop }: { activity: AgentActivity; now: number; follow?: boolean; reduced?: boolean; stop: () => void } = $props();
  const task = $derived(activity.task);
  const action = $derived(activity.action);
  const activityState = $derived(activity.running > 0 ? 'running' : action?.state === 'failed' ? 'failed' : task?.state ?? action?.state ?? 'completed');
  const labels = { running: 'Acting', working: 'Working · reported by agent', waiting: 'Waiting for you', completed: 'Finished', failed: 'Needs attention' };
  const quiet = $derived(now - Math.max(action?.updatedAt ?? 0, task?.updatedAt ?? 0) > 30_000);
  const detailsId = $props.id();
  let panel = $state<HTMLElement | null>(null);
  let toggleButton = $state<HTMLButtonElement | null>(null);
  let expandedCompletion = $state<string | null>(null);
  // Disclosure is ephemeral and scoped to this completion, never the canvas/history.
  const completionIdentity = $derived(`${activity.documentId}:${task?.id ?? ''}:${action?.id ?? ''}:${action?.updatedAt ?? task?.updatedAt ?? ''}`);
  const expanded = $derived(activityState !== 'completed' || expandedCompletion === completionIdentity);

  $effect.pre(() => {
    if (expanded) return;
    const focused = document.activeElement;
    if (!focused || !panel?.contains(focused) || focused === toggleButton) return;
    // Only rescue focus from controls being hidden; leave operator canvas focus alone.
    void tick().then(() => {
      if (document.activeElement === focused || document.activeElement === document.body) toggleButton?.focus({ preventScroll: true });
    });
  });
</script>

<section bind:this={panel} class="agent-activity" class:collapsed={!expanded} aria-label="Agent activity" data-state={activityState} data-expanded={String(expanded)} data-work-state={activityState === 'waiting' ? 'approval' : activityState === 'failed' ? 'failure' : activityState === 'completed' ? 'success' : 'running'} data-ui="true">
  <div role="status" aria-live="polite" aria-atomic="true">
    <button bind:this={toggleButton} class="disclosure" aria-expanded={expanded} aria-controls={detailsId} aria-disabled={activityState !== 'completed'} aria-label={activityState === 'completed' ? expanded ? 'Hide completed agent activity' : 'Show completed agent activity' : `Agent activity: ${labels[activityState]}`} onkeydown={event => { if (event.key === ' ' || event.key === 'Enter') event.stopPropagation(); }} onclick={() => { if (activityState === 'completed') expandedCompletion = expanded ? null : completionIdentity; }}>
      <strong><i aria-hidden="true"></i>Agent · {labels[activityState]}</strong>{#if activityState === 'completed'}<span aria-hidden="true">{expanded ? '−' : '+'}</span>{/if}
    </button>
  </div>
  <div id={detailsId} hidden={!expanded}>
    {#if task}<p>{task.label}</p>{/if}
    {#if action && action.label !== task?.label}<p class="action">{action.label}{action.state === 'failed' ? ' · failed' : action.state === 'completed' ? ' · done' : ''}</p>{/if}
    {#if quiet && (activityState === 'working' || activityState === 'running')}<small>No recent activity · last update {Math.floor((now - Math.max(action?.updatedAt ?? 0, task?.updatedAt ?? 0)) / 1000)}s ago</small>{/if}
    {#if activity.running > 1}<small>{activity.running} operations running</small>{/if}
    <div class="controls">
      <button aria-pressed={follow} onclick={() => { if (follow) stop(); else follow = true; }}>{follow ? 'Following agent' : 'Follow agent'}</button>
      <button aria-pressed={reduced} onclick={() => reduced = !reduced}>Reduce motion</button>
    </div>
  </div>
</section>

<style>
  .agent-activity { position:absolute;z-index:6;right:14px;top:68px;width:min(290px,calc(100% - 28px));padding:12px;border:1px solid var(--line);border-left:2px solid var(--workspace-state-border);border-radius:4px;background:var(--workspace-state-background);color:var(--color-performance-fg-primary,#fff);font:12px var(--font-performance-sans,Arial,sans-serif); }
  .agent-activity.collapsed { width:auto;max-width:calc(100% - 28px);padding:0; }
  strong { display:flex;align-items:center;gap:7px;color:var(--workspace-state-text);font:var(--text-performance-operator-label) var(--font-performance-mono); }
  i { width:6px;height:6px;border-radius:50%;background:var(--workspace-state-text);flex:none; }
  p { margin:8px 0 0;overflow-wrap:anywhere;line-height:1.4; }
  .action,small { color:var(--color-performance-fg-secondary,#aaa); }
  small { display:block;margin-top:8px; }
  .controls { display:flex;gap:6px;margin-top:10px; }
  button { flex:1;min-height:36px;padding:6px;border:1px solid var(--line);border-radius:3px;background:transparent;color:inherit;font-size:var(--text-performance-caption);cursor:pointer; }
  .disclosure { display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-height:44px;border:0;text-align:left; }
  .disclosure[aria-disabled=true] { cursor:default;min-height:0;padding:0; }
  .collapsed .disclosure { padding:8px 10px; }
  button[aria-pressed=true] { border-color:var(--amber);color:var(--amber); }
  button:focus-visible { outline:2px solid var(--amber);outline-offset:2px; }
  @media(max-width:820px) { .agent-activity { top:auto;bottom:98px;right:8px;width:min(260px,calc(100% - 16px));padding:9px; } .agent-activity.collapsed { width:auto;max-width:calc(100% - 16px);padding:0; } button { min-height:44px; } }
</style>
