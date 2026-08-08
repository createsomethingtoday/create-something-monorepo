<script lang="ts">
  import { onMount } from 'svelte';

  interface PlayerAccessState {
    subject: string;
    player_code: string;
    manager_subject: string;
    status: 'active' | 'revoked';
  }
  let { playerId, displayName }: { playerId: string; displayName: string } = $props();
  let access = $state<PlayerAccessState | null>(null);
  let passphrase = $state('');
  let busy = $state(false);
  let message = $state('');
  let error = $state('');
  let revokeArmed = $state(false);

  onMount(load);

  async function load() {
    error = '';
    const response = await fetch(`/api/player-access?playerId=${encodeURIComponent(playerId)}`);
    const body = await response.json() as { player_access?: PlayerAccessState | null; error?: string };
    if (!response.ok) {
      error = body.error === 'player_assignment_required'
        ? 'Assign an Identity subject to this player before creating Player Access.'
        : 'Player Access is not configured yet.';
      return;
    }
    access = body.player_access ?? null;
  }

  async function save() {
    error = '';
    message = '';
    if (passphrase.length < 15) {
      error = 'Use a memorable phrase of at least 15 characters.';
      return;
    }
    busy = true;
    try {
      const response = await fetch('/api/player-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          playerId,
          playerCode: access?.player_code,
          passphrase,
          displayName
        })
      });
      const body = await response.json() as { player_access?: PlayerAccessState; error?: string; message?: string };
      if (!response.ok || !body.player_access) throw new Error(body.message || body.error || 'Player Access could not be saved.');
      access = body.player_access;
      passphrase = '';
      message = 'Player Access is ready. Share the code and new secret phrase directly with the player and guardian.';
      revokeArmed = false;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Player Access could not be saved.';
    } finally {
      busy = false;
    }
  }

  async function revoke() {
    if (!revokeArmed) {
      revokeArmed = true;
      message = 'Press again to revoke every active Player Access session.';
      return;
    }
    busy = true;
    error = '';
    try {
      const response = await fetch('/api/player-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', playerId })
      });
      const body = await response.json() as { player_access?: PlayerAccessState; error?: string };
      if (!response.ok || !body.player_access) throw new Error(body.error || 'Player Access could not be revoked.');
      access = body.player_access;
      message = 'Player Access revoked. Existing refresh sessions can no longer continue.';
      revokeArmed = false;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Player Access could not be revoked.';
    } finally {
      busy = false;
    }
  }

  async function copyCode() {
    if (!access?.player_code) return;
    await navigator.clipboard.writeText(access.player_code);
    message = 'Player code copied.';
  }
</script>

<section class="player-access" aria-labelledby="player-access-title">
  <div class="section-copy">
    <p class="eyebrow">Guardian-managed identity</p>
    <h2 id="player-access-title">Player Access</h2>
    <p>Give {displayName} an email-free player code and secret phrase. The old secret phrase cannot be viewed; an authorized adult can only replace or revoke it.</p>
  </div>

  {#if access}
    <div class="credential-status" class:revoked={access.status === 'revoked'}>
      <span>Status / {access.status}</span>
      <strong>{access.player_code}</strong>
      <button type="button" onclick={copyCode}>Copy player code</button>
    </div>
  {:else}
    <div class="credential-status empty-status"><span>Status / not created</span><strong>No player code yet</strong></div>
  {/if}

  <form onsubmit={(event) => { event.preventDefault(); save(); }}>
    <label>
      <span>New secret phrase</span>
      <input type="password" bind:value={passphrase} autocomplete="new-password" minlength="15" maxlength="128" placeholder="Four or more memorable words" disabled={busy} />
    </label>
    <button class="primary" type="submit" disabled={busy}>Create or reset access</button>
    <button class="danger" type="button" disabled={busy || !access} onclick={revoke}>{revokeArmed ? 'Confirm revoke access' : 'Revoke access'}</button>
  </form>
  <p class="policy">Do not use a birthday, jersey number, player name, or shared team password. Reset immediately if the phrase is shared accidentally.</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if message}<p class="message" role="status">{message}</p>{/if}
</section>

<style>
  .player-access { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(210px, .8fr); gap: var(--space-performance-lg); padding: var(--space-performance-lg); border: 1px solid var(--color-performance-border-default); background: var(--color-performance-bg-pure); }
  .section-copy h2 { margin: 0 0 var(--space-performance-xs); }
  .section-copy p:last-child, .policy { color: var(--color-performance-fg-tertiary); }
  .credential-status { display: grid; align-content: center; gap: var(--space-performance-xs); padding: var(--space-performance-md); background: var(--color-performance-success-muted); border-left: 4px solid var(--color-performance-success); }
  .credential-status.revoked { background: var(--color-performance-error-muted); border-color: var(--color-performance-error); }
  .credential-status span, .policy { font: 700 11px var(--font-performance-mono); text-transform: uppercase; letter-spacing: .05em; }
  .credential-status strong { font: 700 var(--text-performance-h3) var(--font-performance-mono); }
  .credential-status button { width: fit-content; padding: 0; border: 0; background: transparent; text-decoration: underline; cursor: pointer; }
  .empty-status { background: var(--color-performance-bg-muted); border-color: var(--color-performance-border-default); }
  form { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; gap: var(--space-performance-sm); align-items: end; }
  label { display: grid; gap: var(--space-performance-xs); font-weight: 600; }
  input { min-height: 44px; padding: var(--space-performance-sm) var(--space-performance-md); border-radius: var(--radius-performance-scale-md); font: inherit; }
  form button { min-height: 44px; padding: var(--space-performance-sm) var(--space-performance-md); border-radius: var(--radius-performance-scale-full); font: inherit; font-weight: 700; cursor: pointer; }
  .primary { border: 0; background: var(--color-performance-fg-primary); color: var(--color-performance-bg-pure); }
  .danger { border: 1px solid var(--color-performance-error-border); background: var(--color-performance-bg-pure); color: var(--color-performance-error); }
  .policy, .error, .message { grid-column: 1 / -1; margin: 0; }
  .error { color: var(--color-performance-error); }
  .message { color: var(--color-performance-success); }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 2px; }
  @media (max-width: 760px) {
    .player-access { grid-template-columns: 1fr; }
    form { grid-template-columns: 1fr; }
  }
</style>
