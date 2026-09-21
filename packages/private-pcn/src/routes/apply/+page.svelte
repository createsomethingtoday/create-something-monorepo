<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { api } from '$lib/client';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let name = $state(''),
    credentials = $state(''),
    video = $state(''),
    busy = $state(false),
    message = $state(''),
    failed = $state(false);
  const token = $derived(data.hasInvitation);
  $effect(() => {
    name = data.application?.display_name || '';
    credentials = data.application?.credentials || '';
    video = data.application?.teaching_video_url || '';
  });
  async function redeem() {
    await api('creators/invitations', { action: 'redeem' });
  }
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    message = '';
    failed = false;
    try {
      await api('creators/application', {
        display_name: name,
        credentials,
        teaching_video_url: video
      });
      if (token) await redeem();
      await invalidateAll();
      message = 'Application submitted. Your review status will appear here.';
    } catch (e) {
      failed = true;
      message = (e as Error).message;
      await invalidateAll();
    } finally {
      busy = false;
    }
  }
  async function claim() {
    busy = true;
    failed = false;
    try {
      await redeem();
      await invalidateAll();
      message = 'Invitation saved. Your free month becomes available after approval.';
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Creator application | Private</title><meta name="robots" content="noindex" /></svelte:head
>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / CREATOR ADMISSION</p>
  <h1>Show your work.<br /><em>Teach the technique.</em></h1>
  <p class="lede">
    Private is a reviewed network for builders teaching agentic engineering. Share the experience
    behind your practice and show how you help another builder understand it.
  </p>
  <ol class="practice-steps" aria-label="Creator onboarding">
    <li><span>01 / EVIDENCE</span>Credentials + teaching video</li>
    <li><span>02 / REVIEW</span>Human review and feedback</li>
    <li><span>03 / PUBLISH</span>Your network, assets and pricing</li>
  </ol>
  <div class="builder-split">
    <section class="builder-panel">
      {#if data.application}<p class="eyebrow">APPLICATION / {data.application.status}</p>
        <h2>
          {data.application.status === 'approved'
            ? 'You’re approved.'
            : data.application.status === 'pending'
              ? 'Your work is in review.'
              : 'Review feedback'}
        </h2>
        {#if data.application.review_note}<p class="preserve">
            {data.application.review_note}
          </p>{/if}
        {#if data.application.status === 'approved'}<a class="button" href="/dashboard"
            >Build your network <Icon name="arrow-right" /></a
          >{:else if data.application.status === 'pending'}<p>
            You can return here for the decision. Your credentials and teaching link are visible
            only to you and CREATE SOMETHING reviewers.
          </p>{/if}
      {/if}
      {#if !data.application || data.application.status === 'rejected'}
        <form class="builder-form" onsubmit={submit}>
          <label
            >Your name<input bind:value={name} required maxlength="80" autocomplete="name" /></label
          >
          <label
            >Professional credentials<textarea
              bind:value={credentials}
              required
              minlength="30"
              maxlength="6000"
              placeholder="Your roles, projects, technical experience and links to work you can share."
            ></textarea></label
          >
          <label
            >Teaching video link<input
              type="url"
              bind:value={video}
              required
              maxlength="2000"
              placeholder="https://…"
              aria-describedby="video-help"
            /></label
          >
          <p id="video-help" class="field-hint">
            Use an HTTPS link reviewers can open, such as an unlisted recording. Teach a concrete
            technique: its constraints, implementation, evaluation and failure modes. Remove
            credentials, client secrets and material you lack permission to share.
          </p>
          <p class="field-hint">
            Your credentials and teaching link are used for creator review under the <a
              href="/privacy#information">Private Privacy Policy</a
            >. Publishing and participation follow the <a href="/terms#admission">Private Terms</a>.
          </p>
          <button class="button" disabled={busy}
            >{busy ? 'Submitting…' : 'Submit for review'} <Icon name="arrow-right" /></button
          >
        </form>{/if}
      {#if data.invited}<p class="availability">
          Creator invitation saved. One free month of network hosting is available after approval.
          It does not apply to company support.
        </p>{:else if token && data.application}<button
          class="button secondary"
          disabled={busy}
          onclick={claim}>Apply your invitation</button
        >{/if}
      {#if message}<p class:error={failed} role={failed ? 'alert' : 'status'}>{message}</p>{/if}
    </section>
    <aside>
      <p class="eyebrow">WHAT WE REVIEW</p>
      <h2>Useful practice.<br />Clear boundaries.</h2>
      <p>
        Explain a real engineering decision. Show what your agent can access, how you evaluate its
        work, and when a person needs to step in.
      </p>
      <p>
        Approval lets you publish your own offerings at your own prices. Delivering CREATE SOMETHING
        company support requires separate partner approval.
      </p>
      <h3>A recording workflow to try</h3>
      <p>
        <a
          href="https://www.descript.com/screen-recording"
          target="_blank"
          rel="noopener noreferrer">Descript</a
        >
        combines screen recording, transcript editing and captions. Record one technique, trim distractions,
        and check the transcript before sharing your review link. Any recording tool is welcome; we review
        the teaching, not the software.
      </p>
      <p class="field-hint">
        A review link keeps its host’s sharing settings. For member-only lessons, export your video
        and upload it to Private so network access rules govern delivery.
      </p>
      <a href="/field-engineering">Build a field practice portfolio <Icon name="arrow-right" /></a>
    </aside>
  </div>
</main>
