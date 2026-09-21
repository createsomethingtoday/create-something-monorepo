<script lang="ts">
  import { untrack } from 'svelte';
  import { api } from '$lib/client';
  import { trackImpact } from '$lib/impact';
  import { page } from '$app/state';
  import type { LessonProgress } from '$lib/learning';
  import StatusNotice from './StatusNotice.svelte';
  import StateBadge from './StateBadge.svelte';
  let {
    id,
    slug,
    progress,
    practice
  }: { id: string; slug?: string; progress: LessonProgress | null; practice: boolean } = $props();
  let current = $state(untrack(() => progress));
  let busy = $state(false);
  let failure = $state('');
  let notice = $state('');
  async function mark(action: 'watched' | 'practice') {
    busy = true;
    failure = '';
    notice = '';
    try {
      current = (
        await api('learning/progress', { id, action, watched: !current?.watched_at }, slug)
      ).progress;
      notice =
        action === 'practice' ? 'Practice marked as started.' : 'Your watched status was saved.';
      if (action === 'practice') trackImpact('practice_start', page.url.pathname);
    } catch (e) {
      failure = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<section class="progress-controls" aria-label="Personal progress">
  <div class="progress-actions">
    <button class="button secondary" disabled={busy} onclick={() => mark('watched')}
      >{current?.watched_at ? 'Mark as unwatched' : 'Mark as watched'}</button
    >
    {#if practice}<button
        class="button secondary"
        disabled={busy || !!current?.practice_started_at}
        onclick={() => mark('practice')}
        >{current?.practice_started_at ? 'Practice started' : 'Mark practice started'}</button
      >{/if}
    {#if current?.watched_at}<StateBadge label="Marked watched" tone="success" icon="check" />{/if}
  </div>
  <p>
    These are your personal progress notes. Watching or starting practice does not certify
    competence.
  </p>
  {#if failure}<StatusNotice tone="error" message={failure} />{:else if notice}<StatusNotice
      tone="success"
      message={notice}
    />{/if}
</section>

<style>
  .progress-controls {
    margin-top: 24px;
  }
  .progress-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }
  .progress-controls p {
    color: var(--muted);
    font-size: 13px;
    max-width: 70ch;
  }
</style>
