<script lang="ts">
  import type { AgentActivity } from './agent-activity';
  let { activity, now, follow = $bindable(false), reduced = $bindable(false), stop }: { activity: AgentActivity; now: number; follow?: boolean; reduced?: boolean; stop: () => void } = $props();
  const task = $derived(activity.task);
  const action = $derived(activity.action);
  const state = $derived(activity.running > 0 ? 'running' : action?.state === 'failed' ? 'failed' : task?.state ?? action?.state ?? 'completed');
  const labels = { running: 'Acting', working: 'Working · reported by agent', waiting: 'Waiting for you', completed: 'Finished', failed: 'Needs attention' };
  const quiet = $derived(now - Math.max(action?.updatedAt ?? 0, task?.updatedAt ?? 0) > 30_000);
</script>

<section class="agent-activity" aria-label="Agent activity" data-state={state} data-ui="true">
  <div role="status" aria-live="polite" aria-atomic="true">
    <strong><i aria-hidden="true"></i>Agent · {labels[state]}</strong>
    {#if task}<p>{task.label}</p>{/if}
    {#if action && action.label !== task?.label}<p class="action">{action.label}{action.state === 'failed' ? ' · failed' : action.state === 'completed' ? ' · done' : ''}</p>{/if}
  </div>
  {#if quiet && (state === 'working' || state === 'running')}<small>No recent activity · last update {Math.floor((now - Math.max(action?.updatedAt ?? 0, task?.updatedAt ?? 0)) / 1000)}s ago</small>{/if}
  {#if activity.running > 1}<small>{activity.running} operations running</small>{/if}
  <div class="controls">
    <button aria-pressed={follow} onclick={() => { if (follow) stop(); else follow = true; }}>{follow ? 'Following agent' : 'Follow agent'}</button>
    <button aria-pressed={reduced} onclick={() => reduced = !reduced}>Reduce motion</button>
  </div>
</section>

<style>
  .agent-activity { position:absolute;z-index:6;right:14px;top:68px;width:min(290px,calc(100% - 28px));padding:12px;border:1px solid var(--line);border-left:2px solid var(--amber);border-radius:4px;background:var(--color-performance-bg-pure,#000);color:var(--color-performance-fg-primary,#fff);font:12px var(--font-performance-sans,Arial,sans-serif); }
  strong { display:flex;align-items:center;gap:7px;font:10px var(--font-performance-mono,monospace); }
  i { width:6px;height:6px;border-radius:50%;background:var(--amber);flex:none; }
  p { margin:8px 0 0;overflow-wrap:anywhere;line-height:1.4; }
  .action,small { color:var(--color-performance-fg-secondary,#aaa); }
  small { display:block;margin-top:8px; }
  .controls { display:flex;gap:6px;margin-top:10px; }
  button { flex:1;min-height:36px;padding:6px;border:1px solid var(--line);border-radius:3px;background:transparent;color:inherit;font-size:11px;cursor:pointer; }
  button[aria-pressed=true] { border-color:var(--amber);color:var(--amber); }
  button:focus-visible { outline:2px solid var(--amber);outline-offset:2px; }
  @media(max-width:820px) { .agent-activity { top:auto;bottom:98px;right:8px;width:min(260px,calc(100% - 16px));padding:9px; } button { min-height:44px; } }
</style>
