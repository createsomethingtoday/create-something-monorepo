<script lang="ts">
  import StateBadge from '$lib/components/StateBadge.svelte';
  import StatusNotice from '$lib/components/StatusNotice.svelte';

  import { api } from '$lib/client';
  import { invalidateAll } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let busy = $state(false),
    message = $state(''),
    failed = $state(false);
  let notes = $state<Record<string, string>>({});
  async function decide(subject: string, revision: number, status: string) {
    busy = true;
    message = '';
    failed = false;
    try {
      await api('creators/review', {
        subject,
        revision,
        status,
        review_note: notes[subject] || ''
      });
      await invalidateAll();
      message = 'Decision recorded.';
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function partner(subject: string, approved: boolean) {
    busy = true;
    message = '';
    failed = false;
    try {
      await api('support/partners', { subject, approved, note: notes[subject] || '' });
      await invalidateAll();
      message = 'Partner decision recorded.';
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Creator review | Private</title><meta name="robots" content="noindex" /></svelte:head
>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / QUALITY REVIEW</p>
  <h1>Review the practice.<br /><em>Protect the standard.</em></h1>
  <p class="lede">
    Review credentials and the teaching demonstration. Judge technical accuracy, clear explanation,
    evaluation and responsible handling of access. Creator approval does not confer support-partner
    status.
  </p>
  {#if message}<StatusNotice tone={failed ? 'error' : 'success'} {message} />{/if}
  {#each data.applications as application}<article class="builder-panel review-application">
      <div class="state-row">
        <StateBadge
          label={application.status === 'approved'
            ? 'Creator approved'
            : application.status === 'pending'
              ? 'In review'
              : application.status === 'rejected'
                ? 'Changes requested'
                : 'Suspended'}
          tone={application.status === 'approved' ? 'success' : 'warning'}
          icon={application.status === 'approved'
            ? 'check'
            : application.status === 'pending'
              ? 'clock'
              : 'warning'}
        /><span>Revision {application.revision}</span>
      </div>
      <h2>{application.display_name}</h2>
      <p>{application.email}</p>
      <p class="preserve">{application.credentials}</p>
      <a href={application.teaching_video_url} target="_blank" rel="noopener noreferrer"
        >Watch teaching video <Icon name="external-link" /></a
      ><label
        >Decision feedback<textarea
          bind:value={notes[application.subject]}
          minlength="5"
          maxlength="2000"
          placeholder="Specific evidence supporting this decision; visible to the applicant."
        ></textarea></label
      >
      <div class="actions">
        {#each ['approved', 'rejected', 'suspended'] as status}<button
            class="button secondary"
            disabled={busy || (notes[application.subject] || '').trim().length < 5}
            onclick={() => decide(application.subject, application.revision, status)}
            >{status === 'approved'
              ? 'Approve creator'
              : status === 'rejected'
                ? 'Request changes'
                : 'Suspend creator'}</button
          >{/each}
      </div>
      {#if application.status === 'approved' || application.support_partner}<p>
          Company support partner: {application.support_partner ? 'approved' : 'not approved'}
        </p>
        <button
          class="button secondary"
          disabled={busy || (notes[application.subject] || '').trim().length < 5}
          onclick={() => partner(application.subject, !application.support_partner)}
          >{application.support_partner
            ? 'Revoke support-partner approval'
            : 'Approve for company support'}</button
        >{/if}
    </article>{:else}<p class="empty">No applications yet.</p>{/each}
</main>
