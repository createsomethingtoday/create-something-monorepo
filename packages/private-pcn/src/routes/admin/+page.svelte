<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type CatalogVideo } from '$lib/client';
  let videos = $state<CatalogVideo[]>([]);
  let members = $state<{ email: string; active: number }[]>([]);
  let receipts = $state<{ action: string; target: string; created_at: string }[]>([]);
  let plays = $state<{ video_id: string; grants: number }[]>([]);
  let error = $state('');
  let message = $state('');
  let busy = $state(false);
  let title = $state('');
  let description = $state('');
  let series = $state('Agent engineering');
  let email = $state('');
  let files = $state<FileList>();
  let progress = $state(0);
  async function load() {
    try {
      const data = await api('admin');
      videos = data.videos;
      members = data.members;
      receipts = data.receipts;
      plays = data.plays;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  async function mutate(path: string, body: unknown) {
    busy = true;
    error = '';
    message = '';
    try {
      await api(path, body);
      await load();
      message = 'Saved.';
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function upload(event: SubmitEvent) {
    event.preventDefault();
    if (!files?.[0]) return;
    busy = true;
    error = '';
    progress = 0;
    try {
      const file = files[0];
      const result = await api('uploads', { title, description, series, size: file.size });
      const { Upload } = await import('tus-js-client');
      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          uploadUrl: result.uploadUrl,
          chunkSize: 10 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000],
          onError: reject,
          onProgress: (sent, total) => {
            progress = Math.round((sent / total) * 100);
          },
          onSuccess: () => resolve()
        });
        upload.start();
      });
      message = 'Upload received. Check processing, then choose where to publish.';
      title = '';
      description = '';
      await mutate('videos/status', { id: result.id });
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
      await load();
    }
  }
  onMount(load);
</script>

<svelte:head
  ><title>Manage network | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="workspace">
  <p class="eyebrow">PRIVATE / CREATOR WORKSPACE</p>
  <h1>Publish your <em>knowledge.</em></h1>
  <p>Uploads start private and unpublished. Review processing before you choose an audience.</p>
  <a href="/library">← Back to library</a>
  {#if error}<p class="notice error" role="alert">{error}</p>{/if}{#if message}<p
      class="notice"
      role="status"
    >
      {message}
    </p>{/if}
  <div class="admin-grid">
    <section>
      <h2>Add a walkthrough</h2>
      <form onsubmit={upload}>
        <label>Session title<input bind:value={title} required maxlength="160" /></label><label
          >Series or learning track<input bind:value={series} required maxlength="100" /></label
        ><label>Description<textarea bind:value={description} maxlength="2000"></textarea></label
        ><label
          >Video file · up to 1 GB / 30 minutes<input
            type="file"
            accept="video/*"
            bind:files
            required
          /></label
        ><button class="button" disabled={busy}
          >{busy ? `Working… ${progress}%` : 'Upload private draft'}</button
        >
      </form>
    </section>
    <section>
      <h2>Member access</h2>
      <p class="muted">
        Access is tied to a verified CREATE SOMETHING account. This saves an invitation; it does not
        send an email.
      </p>
      <form
        onsubmit={(event) => {
          event.preventDefault();
          mutate('members', { email, active: true });
        }}
      >
        <label>Member email<input type="email" bind:value={email} required /></label><button
          class="button secondary"
          disabled={busy}>Grant library access</button
        >
      </form>
      <ul class="member-list">
        {#each members as member}<li>
            <span>{member.email}<small>{member.active ? 'Active' : 'Revoked'}</small></span><button
              class="text-button"
              disabled={busy}
              onclick={() => mutate('members', { email: member.email, active: !member.active })}
              >{member.active ? 'Revoke' : 'Restore'}</button
            >
          </li>{/each}
      </ul>
      <p class="muted">
        Revocation blocks new playback grants immediately. A previously issued grant can remain
        valid for up to 60 seconds; media already buffered or downloaded cannot be recalled.
      </p>
    </section>
  </div>
  <section class="admin-videos">
    <h2>Publishing desk</h2>
    {#each videos as video}<article class="admin-video">
        <div>
          <h3>{video.title}</h3>
          <p>
            {video.ingest_status} · {video.visibility} · {video.access} · {plays.find(
              (p) => p.video_id === video.id
            )?.grants || 0} playback grants
          </p>
        </div>
        <div class="workspace-actions">
          <button
            disabled={busy}
            class="text-button"
            onclick={() => mutate('videos/status', { id: video.id })}>Check processing</button
          ><button
            disabled={busy || video.ingest_status !== 'ready'}
            class="text-button"
            onclick={() =>
              mutate('videos/publish', {
                id: video.id,
                visibility: 'published',
                access: 'members'
              })}>Publish to members</button
          ><button
            disabled={busy || video.ingest_status !== 'ready'}
            class="text-button"
            onclick={() =>
              mutate('videos/publish', { id: video.id, visibility: 'published', access: 'public' })}
            >Publish public preview</button
          ><button
            disabled={busy}
            class="text-button"
            onclick={() =>
              mutate('videos/publish', {
                id: video.id,
                visibility: 'archived',
                access: video.access
              })}>Archive</button
          >
        </div>
      </article>{/each}
    <p class="muted">
      Playback grants measure access requests, including renewals. They are not unique viewers or
      completed watches. Archiving removes a video from the library; it does not delete stored media
      or reduce storage charges.
    </p>
  </section>
  <section>
    <h2>Recent changes</h2>
    <ul class="receipt-list">
      {#each receipts as receipt}<li>
          <time>{receipt.created_at}</time><span>{receipt.action}</span><code>{receipt.target}</code
          >
        </li>{/each}
    </ul>
  </section>
</main>
