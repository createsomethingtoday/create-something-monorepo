<script lang="ts">
  interface Props {
    onSubmit: (credentials: { player_code: string; passphrase: string }) => Promise<boolean>;
    error?: string | null;
  }

  let { onSubmit, error = null }: Props = $props();
  let playerCode = $state('');
  let passphrase = $state('');
  let busy = $state(false);
  let localError = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    localError = null;
    if (!playerCode.trim() || !passphrase) {
      localError = 'Enter your player code and secret phrase.';
      return;
    }
    busy = true;
    try {
      const signedIn = await onSubmit({ player_code: playerCode.trim(), passphrase });
      if (!signedIn) passphrase = '';
    } catch {
      passphrase = '';
      localError = 'Player Access could not sign in. Try again.';
    } finally {
      busy = false;
    }
  }
</script>

<form class="player-login" onsubmit={submit}>
  <header>
    <h2>Player Access</h2>
    <p>No email needed. Use the code and secret phrase an adult gave you.</p>
  </header>

  {#if error || localError}<div class="error" role="alert">{error || localError}</div>{/if}

  <label>
    <span>Player code</span>
    <input bind:value={playerCode} autocomplete="username" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="Example: ACE-2713" disabled={busy} required />
  </label>
  <label>
    <span>Secret phrase</span>
    <input type="password" bind:value={passphrase} autocomplete="current-password" maxlength="128" placeholder="Enter your secret phrase" disabled={busy} required />
  </label>

  <button type="submit" disabled={busy}>{busy ? 'Opening your workspace…' : 'Open my workspace'}</button>
  <p class="help">Forgot either one? Ask your parent, guardian, or coach to reset Player Access. They cannot see your old secret phrase.</p>
</form>

<style>
  .player-login { display: grid; gap: var(--space-performance-md); width: 100%; max-width: 440px; }
  header { text-align: center; }
  h2 { margin: 0 0 var(--space-performance-xs); font-size: var(--text-performance-h2); }
  header p, .help { margin: 0; color: var(--color-performance-fg-tertiary); }
  label { display: grid; gap: var(--space-performance-xs); color: var(--color-performance-fg-secondary); font-size: var(--text-performance-body-sm); font-weight: 600; }
  input { width: 100%; padding: var(--space-performance-sm) var(--space-performance-md); border-radius: var(--radius-performance-scale-md); color: var(--color-performance-fg-primary); font: inherit; }
  input:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 2px; }
  button { min-height: 44px; border: 0; border-radius: var(--radius-performance-scale-full); background: var(--color-performance-fg-primary); color: var(--color-performance-bg-pure); font: inherit; font-weight: 700; cursor: pointer; }
  button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 2px; }
  button:disabled, input:disabled { cursor: wait; opacity: .55; }
  .error { padding: var(--space-performance-sm); border: 1px solid var(--color-performance-error-border); border-radius: var(--radius-performance-scale-md); background: var(--color-performance-error-muted); color: var(--color-performance-error); }
  .help { font-size: var(--text-performance-body-sm); line-height: 1.5; }
</style>
