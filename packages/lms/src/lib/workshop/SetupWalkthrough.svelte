<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { setupSteps, setupKey, initialSetup, restoreSetup, applySetup, type SetupIntent } from './walkthrough';

  let progress = $state(initialSetup());
  let loaded = $state(false);
  let status = $state('');
  let copied = $state('');
  const index = $derived(setupSteps.findIndex(step => step.id === progress.step));
  const current = $derived(setupSteps[index]);
  onMount(() => {
    try { progress = restoreSetup(localStorage.getItem(setupKey)); }
    catch { status = 'Browser storage is unavailable. You can read the guide, but checks will not be saved.'; }
    loaded = true;
    const sync = (event: StorageEvent) => {
      if (event.key === setupKey) progress = restoreSetup(event.newValue);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  });
  async function update(intent: SetupIntent) {
    if (!loaded) return;
    copied = '';
    if (!navigator.locks) {
      progress = applySetup(progress, intent);
      status = 'Checks are not saved: this browser lacks cross-tab locking. You can still read every step.';
    } else {
      try {
        await navigator.locks.request(setupKey, () => {
          progress = applySetup(restoreSetup(localStorage.getItem(setupKey)), intent);
          localStorage.setItem(setupKey, JSON.stringify(progress));
        });
        status = intent.type === 'check' ? 'Self-report saved in this browser. No provider verification was performed.' : '';
      } catch {
        progress = applySetup(progress, intent);
        status = 'Checks could not be saved. You can keep reading; use your own decision record to resume.';
      }
    }
    if (intent.type === 'select') {
      await tick();
      document.getElementById('setup-step-heading')?.focus();
    }
  }
  async function copy(label: string, text: string) {
    copied = '';
    try {
      await navigator.clipboard.writeText(text);
      copied = label;
      status = `Copied: ${label}. Review it and replace any YOUR_ placeholders before use.`;
    } catch {
      status = 'Copy is unavailable. Select the visible code and copy it manually; nothing was executed.';
    }
  }
</script>

<section class="setup" aria-labelledby="setup-heading">
  <h3 id="setup-heading">From starter to first deployment</h3>
  <p>Five steps in your own terminal and accounts. This guide runs no commands and collects no credentials or provider evidence. A computer is needed for the terminal steps.</p>
  <p class="progress">Self-reported checks: {progress.checked.length} / {setupSteps.length}. Provider verification: not performed by this game.</p>
  <nav aria-label="Setup walkthrough steps">
    <ol>
      {#each setupSteps as step, i}
        <li><button type="button" disabled={!loaded} aria-current={progress.step === step.id ? 'step' : undefined} onclick={() => update({ type: 'select', step: step.id })}>
          {i + 1}. {step.title}{progress.checked.includes(step.id) ? ' — self-reported' : ''}
        </button></li>
      {/each}
    </ol>
  </nav>
  <h4 id="setup-step-heading" tabindex="-1">Step {index + 1} of {setupSteps.length}: {current.title}</h4>
  {#if current.id === 'starter'}
    <p><a href="/workshop/pcn-starter.zip" download>Download pcn-starter.zip</a></p>
  {/if}
  <ol class="instructions">{#each current.instructions as instruction}<li>{instruction}</li>{/each}</ol>
  {#each current.commands as command}
    <div class="command">
      <p>{command.label}</p>
      <pre><code>{command.text}</code></pre>
      <button type="button" onclick={() => copy(command.label, command.text)} aria-label={`Copy ${command.label}`}>
        {copied === command.label ? 'Copied' : 'Copy'}
      </button>
    </div>
  {/each}
  <h5>What success looks like</h5>
  <p>{current.success}</p>
  <h5>If it fails</h5>
  {#each current.recovery as item}
    <details><summary>{item.problem}</summary><p>{item.action}</p></details>
  {/each}
  <h5>Keep your evidence</h5>
  <p>{current.evidence}</p>
  <ul>{#each current.links as link}<li><a href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a></li>{/each}</ul>
  <label class="check">
    <input type="checkbox" disabled={!loaded} checked={progress.checked.includes(current.id)} onchange={(event) => update({ type: 'check', step: current.id, checked: event.currentTarget.checked })} />
    I checked this step’s result myself (self-report)
  </label>
  <p role="status" aria-live="polite">{status}</p>
  {#if progress.checked.length === setupSteps.length}
    <p>All five checks are self-reported. Keep your real repository and deployment evidence in DECISIONS.md. Accounts and infrastructure remain unverified by this game.</p>
  {/if}
  <div class="navigation">
    <button type="button" disabled={!loaded || index === 0} onclick={() => update({ type: 'select', step: setupSteps[index - 1].id })}>Previous setup step</button>
    <button type="button" disabled={!loaded || index === setupSteps.length - 1} onclick={() => update({ type: 'select', step: setupSteps[index + 1].id })}>Next setup step</button>
  </div>
  <p>You can revisit any step without running it again. Saved checks and your place stay in this browser; clearing site data removes them. Restarting the simulation leaves this setup guide’s progress intact.</p>
</section>

<style>
  .setup { margin: 2rem 0; padding-top: 1.5rem; border-top: 1px solid var(--color-border-default, #444); min-width: 0; }
  h3 { font-size: 1.25rem; }
  h4 { font-size: 1.125rem; margin: 1.5rem 0 1rem; }
  h5 { font-size: 1rem; margin: 1.5rem 0 .5rem; }
  p, li { line-height: 1.6; }
  p { margin: .75rem 0; }
  .progress { color: var(--color-fg-secondary, #aaa); }
  nav ol { list-style: none; padding: 0; display: grid; gap: .5rem; }
  nav button { width: 100%; text-align: left; }
  button { padding: .65rem .8rem; color: inherit; background: var(--color-bg-secondary, #262626); border: 1px solid var(--color-border-default, #444); font: inherit; cursor: pointer; min-height: 44px; }
  button[aria-current='step'] { border-color: var(--color-fg-primary, #eee); }
  button:disabled { opacity: .5; cursor: default; }
  button:focus-visible, a:focus-visible, summary:focus-visible, input:focus-visible { outline: 2px solid var(--color-fg-primary, #eee); outline-offset: 3px; }
  a, summary { overflow-wrap: anywhere; }
  .instructions { padding-left: 1.25rem; }
  .instructions li { margin: .75rem 0; }
  pre { background: var(--color-bg-secondary, #262626); padding: .75rem; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .85rem; line-height: 1.5; }
  .command { margin: 1rem 0; min-width: 0; }
  details { padding: .65rem 0; border-bottom: 1px solid var(--color-border-default, #444); }
  summary { cursor: pointer; min-height: 24px; }
  .check { display: flex; gap: .65rem; align-items: flex-start; margin-top: 1.5rem; line-height: 1.6; }
  input { margin-top: .4rem; }
  .navigation { display: flex; flex-wrap: wrap; gap: .5rem; }
</style>
