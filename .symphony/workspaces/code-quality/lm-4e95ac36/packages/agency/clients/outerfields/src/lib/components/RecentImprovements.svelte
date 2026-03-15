<!--
  Recent Improvements Component
  
  Shows applied changes in a user-friendly changelog format.
  Follows Nicely Said principles: specific, honest, user-focused.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Improvement {
    id: string;
    title: string;
    description: string;
    appliedAt: number;
    changeType: string;
  }
  
  let improvements = $state<Improvement[]>([]);
  let loading = $state(true);
  
  onMount(async () => {
    try {
      const response = await fetch('/api/admin/proposals?status=applied&limit=5');
      if (response.ok) {
        const data = await response.json();
        improvements = (data.proposals || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          appliedAt: p.applied_at,
          changeType: p.change_type
        }));
      }
    } catch (e) {
      console.error('Failed to load improvements:', e);
    } finally {
      loading = false;
    }
  });
  
  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return 'Today';
    } else if (diff < 48 * 60 * 60 * 1000) {
      return 'Yesterday';
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  
  const changeTypeLabels: Record<string, string> = {
    preview_duration: 'Preview timing',
    cta_text: 'Button text',
    spacing_adjustment: 'Layout',
    element_visibility: 'UI element',
    animation_timing: 'Animation',
    feature_flag_toggle: 'Feature',
    content_order: 'Content order',
    gate_messaging: 'Messaging'
  };
</script>

<section class="recent-improvements">
  <h3 class="section-title">Recent improvements</h3>
  
  {#if loading}
    <p class="loading">Loading...</p>
  {:else if improvements.length === 0}
    <p class="empty">No recent changes. Check back soon.</p>
  {:else}
    <ul class="improvements-list">
      {#each improvements as improvement}
        <li class="improvement-item">
          <span class="improvement-date">{formatDate(improvement.appliedAt)}</span>
          <div class="improvement-content">
            <span class="improvement-type">{changeTypeLabels[improvement.changeType] || improvement.changeType}</span>
            <strong class="improvement-title">{improvement.title}</strong>
            <p class="improvement-description">{improvement.description}</p>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .recent-improvements {
    padding: 1rem 0;
  }
  
  .section-title {
    font-size: var(--text-body-md, 1rem);
    font-weight: 600;
    color: var(--color-fg-primary, #fff);
    margin: 0 0 1rem;
  }
  
  .loading, .empty {
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-body-sm, 0.875rem);
    margin: 0;
  }
  
  .improvements-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .improvement-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--color-bg-surface, rgba(255, 255, 255, 0.03));
    border-radius: var(--radius-md, 8px);
  }
  
  .improvement-date {
    font-size: var(--text-body-xs, 0.75rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    white-space: nowrap;
    min-width: 70px;
  }
  
  .improvement-content {
    flex: 1;
  }
  
  .improvement-type {
    display: inline-block;
    font-size: var(--text-body-xs, 0.75rem);
    color: var(--color-brand, #7c2bee);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  
  .improvement-title {
    display: block;
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-primary, #fff);
    margin-bottom: 0.25rem;
  }
  
  .improvement-description {
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    margin: 0;
    line-height: 1.4;
  }
</style>
