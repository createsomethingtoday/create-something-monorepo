<script lang="ts">
  import StatusNotice from '$lib/components/StatusNotice.svelte';

  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { api } from '$lib/client';
  import type { LessonMaterial } from '$lib/server/lessons';
  let {
    id,
    slug,
    lesson,
    releases
  }: {
    id: string;
    slug?: string;
    lesson: LessonMaterial | null;
    releases: { id: string; title: string; version: string }[];
  } = $props();
  let fields = $state(
    untrack(() => ({
      outcome: lesson?.outcome || '',
      prerequisites: lesson?.prerequisites || '',
      tools: lesson?.tools || '',
      transcript: lesson?.transcript || '',
      practice: lesson?.practice || '',
      release_id: lesson?.release_id || ''
    }))
  );
  let busy = $state(false),
    message = $state(''),
    error = $state('');
  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    error = '';
    try {
      await api('lessons/save', { id, ...fields }, slug);
      await invalidateAll();
      message = 'Lesson material saved. Review the member view below.';
    } catch (e) {
      error =
        e instanceof TypeError
          ? 'Could not confirm the save. Your entries are still here. Check your connection, then save again.'
          : (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<details class="lesson-editor">
  <summary>Edit lesson material <span>Creator controls</span></summary>
  <p>
    These optional details help members apply the walkthrough. Saved changes are visible immediately
    wherever this session is published. Video publication and access stay separate.
  </p>
  <form onsubmit={save} aria-busy={busy}>
    <fieldset disabled={busy}>
      <label
        >What will the learner be able to do?<textarea
          bind:value={fields.outcome}
          maxlength="1000"
          rows="2"
          placeholder="Connect an MCP and verify its access with a read-only task"
        ></textarea></label
      >
      <label
        >Prerequisites<textarea
          bind:value={fields.prerequisites}
          maxlength="2000"
          rows="2"
          placeholder="Accounts, permissions, and knowledge needed before starting"
        ></textarea></label
      >
      <label
        >Tools and versions<textarea
          bind:value={fields.tools}
          maxlength="1000"
          rows="2"
          placeholder="Tools used in this demonstration and any version constraints"
        ></textarea></label
      >
      <label
        >Transcript<textarea
          bind:value={fields.transcript}
          maxlength="40000"
          rows="8"
          placeholder="Paste a reviewed plain-text transcript, including one exported from Descript"
        ></textarea></label
      >
      <label
        >Practice task<textarea
          bind:value={fields.practice}
          maxlength="4000"
          rows="4"
          placeholder="What to build, how to check the result, and what successful completion looks like"
        ></textarea></label
      >
      <label
        >Related asset release<select bind:value={fields.release_id}
          ><option value="">No linked release</option>{#each releases as release}<option
              value={release.id}>{release.title} · v{release.version}</option
            >{/each}</select
        ></label
      >
      <p>
        Choose the version used in the walkthrough. Linking a release does not grant ownership or
        download access.
      </p>
      <button class="button" type="submit">{busy ? 'Saving…' : 'Save lesson material'}</button>
    </fieldset>
    {#if busy}<StatusNotice message="Saving lesson material…" busy />{/if}
    {#if error}<StatusNotice tone="error" message={error} />{/if}
    {#if message}<StatusNotice tone="success" {message} />{/if}
  </form>
</details>

<style>
  .lesson-editor {
    border: 1px solid var(--line);
    padding: var(--space-performance-md);
    margin-block: var(--space-performance-lg);
  }
  summary {
    cursor: pointer;
    font-weight: 600;
    min-height: 44px;
  }
  summary span {
    color: var(--muted);
    font-size: 12px;
    margin-left: var(--space-performance-sm);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  p {
    color: var(--muted);
    max-width: 75ch;
  }
</style>
