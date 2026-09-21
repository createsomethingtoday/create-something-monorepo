<script lang="ts">
  import { api } from '$lib/client';
  import { invalidateAll } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let id = $state<string | undefined>(),
    title = $state(''),
    context = $state(''),
    implementation = $state(''),
    evaluation = $state(''),
    result = $state(''),
    evidence = $state(''),
    visibility = $state('members'),
    consent = $state(false),
    busy = $state(false),
    message = $state('');
  async function save(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    message = '';
    try {
      await api(
        'field-notes',
        {
          id,
          title,
          context,
          implementation,
          evaluation,
          result,
          evidence_url: evidence,
          visibility,
          publishConsent: consent
        },
        data.network!.slug
      );
      await invalidateAll();
      message = 'Field note saved.';
      id = undefined;
      title = '';
      context = '';
      implementation = '';
      evaluation = '';
      result = '';
      evidence = '';
      visibility = 'members';
      consent = false;
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  function edit(note: any) {
    id = note.id;
    title = note.title;
    context = note.context;
    implementation = note.implementation;
    evaluation = note.evaluation;
    result = note.result;
    evidence = note.evidence_url;
    visibility = note.visibility === 'archived' ? 'members' : note.visibility;
    consent = false;
    document.getElementById('note-title')?.focus();
  }
  async function archive(note: any) {
    busy = true;
    try {
      await api('field-notes', { action: 'archive', id: note.id }, data.network!.slug);
      await invalidateAll();
      message = 'Field note archived.';
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Field notes | {data.network?.name}</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace">
  <a href={`/n/${data.network?.slug}`}><Icon name="arrow-left" /> Network library</a>
  <p class="eyebrow">PRIVATE / FIELD EVIDENCE</p>
  <h1>Explain the decision.<br /><em>Show the result.</em></h1>
  <p class="lede">
    Creator-reported evidence. These notes are not a CREATE SOMETHING certification or independent
    verification of outcomes.
  </p>
  {#if data.canEdit}<details class="builder-panel" open={!!id}>
      <summary>{id ? 'Edit field note' : 'Write a field note'}</summary>
      <form class="builder-form" onsubmit={save}>
        <label
          >Title<input
            id="note-title"
            bind:value={title}
            required
            minlength="3"
            maxlength="160"
          /></label
        ><label
          >Context and baseline<textarea
            bind:value={context}
            required
            minlength="20"
            maxlength="3000"
          ></textarea></label
        ><label
          >Implementation and boundaries<textarea
            bind:value={implementation}
            required
            minlength="20"
            maxlength="3000"
          ></textarea></label
        ><label
          >Evaluation and failure cases<textarea
            bind:value={evaluation}
            required
            minlength="20"
            maxlength="3000"
          ></textarea></label
        ><label
          >Observed result and limits<textarea
            bind:value={result}
            required
            minlength="20"
            maxlength="3000"
          ></textarea></label
        ><label
          >Evidence link<input
            type="url"
            bind:value={evidence}
            required
            maxlength="2000"
            placeholder="https://…"
          /></label
        ><label
          >Visibility<select bind:value={visibility}
            ><option value="members">Members only</option><option value="public"
              >Public preview</option
            ></select
          ></label
        >{#if visibility === 'public'}<label
            ><input type="checkbox" bind:checked={consent} required /> I have permission to publish this
            evidence and have removed confidential information.</label
          >{/if}<button class="button" disabled={busy}
          >{busy ? 'Saving…' : 'Save field note'} <Icon name="arrow-right" /></button
        >
      </form>
    </details>{/if}
  {#if message}<p role="status">{message}</p>{/if}
  {#each data.notes as note}<article class="builder-panel review-application">
      <p class="eyebrow">CREATOR REPORTED / {note.visibility}</p>
      <h2>{note.title}</h2>
      {#each [['Context', note.context], ['Implementation', note.implementation], ['Evaluation', note.evaluation], ['Result and limits', note.result]] as [label, text]}<section
          class="manifest-section"
        >
          <h3>{label}</h3>
          <p class="preserve">{text}</p>
        </section>{/each}
      <p>
        <a href={note.evidence_url} target="_blank" rel="noopener noreferrer"
          >Inspect evidence <Icon name="external-link" /></a
        >
      </p>
      {#if data.canEdit}<div class="actions">
          <button class="button secondary" onclick={() => edit(note)}>Edit</button><button
            class="button secondary"
            disabled={busy || note.visibility === 'archived'}
            onclick={() => archive(note)}>Archive</button
          >
        </div>{/if}
    </article>{:else}<p class="empty">No field notes are available to you yet.</p>{/each}
</main>
