<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/client';
  import type { StripeConnectInstance } from '@stripe/connect-js';
  let { data } = $props();
  let country = $state(''),
    countries = $state<string[]>([]);
  let busy = $state(false),
    message = $state(''),
    status = $state(''),
    panel = $state('onboarding');
  let host: HTMLDivElement;
  let connect = $state<StripeConnectInstance>();
  let disposed = false;
  let refreshing = $state(true);
  let failed = $state(false);
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const panelLabels = {
    onboarding: 'Setup',
    account: 'Account details',
    payouts: 'Payout history'
  };
  let statusLabel = $derived(
    refreshing
      ? 'Checking payout status'
      : failed
        ? 'Unable to confirm status'
        : status === 'ready'
          ? 'Ready for payouts'
          : status === 'not_enabled'
            ? 'Setup unavailable'
            : status === 'requirements_due'
              ? 'Setup required'
              : 'Status unavailable'
  );
  async function refresh() {
    refreshing = true;
    failed = false;
    try {
      const result = await api('support/payouts');
      status = result.state;
      countries = result.countries || [];
      if (result.country) country = result.country;
      message = result.payoutsReady
        ? 'Your support payout account is ready.'
        : 'Complete any outstanding Stripe requirements before receiving support payouts.';
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      refreshing = false;
    }
  }
  function show() {
    if (!connect || !host) return;
    host.replaceChildren();
    const banner = connect.create('notification-banner');
    host.appendChild(banner);
    const component =
      panel === 'onboarding'
        ? connect.create('account-onboarding')
        : panel === 'account'
          ? connect.create('account-management')
          : connect.create('payouts');
    component.setOnLoadError(() => {
      message = 'Stripe could not load this view. Retry setup or open your Stripe Dashboard.';
    });
    if (panel === 'onboarding') {
      const onboarding = component as ReturnType<StripeConnectInstance['create']>;
      if ('setOnExit' in onboarding)
        onboarding.setOnExit(() => {
          void refresh();
        });
    }
    host.appendChild(component);
  }
  async function hosted() {
    busy = true;
    message = '';
    try {
      const result = await api('support/payouts', { country, action: 'hosted' });
      window.location.assign(result.url);
    } catch (e) {
      message = (e as Error).message;
      busy = false;
    }
  }
  async function start() {
    busy = true;
    message = '';
    try {
      const setup = await api('support/payouts', { country });
      const { loadConnectAndInitialize } = await import('@stripe/connect-js/pure');
      if (disposed) return;
      if (connect) await connect.logout();
      let initialSecret: string | undefined = setup.clientSecret;
      connect = loadConnectAndInitialize({
        publishableKey: setup.publishableKey,
        fetchClientSecret: async () => {
          if (initialSecret) {
            const secret = initialSecret;
            initialSecret = undefined;
            return secret;
          }
          const next = await api('support/payouts', { country });
          return next.clientSecret;
        },
        appearance: {
          overlays: 'dialog',
          variables: { colorPrimary: '#1e4d3b', fontFamily: 'Arial, sans-serif' }
        }
      });
      show();
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  onMount(() => {
    void refresh();
  });
  onDestroy(() => {
    disposed = true;
    void connect?.logout();
  });
</script>

<svelte:head
  ><title>Support partner payouts | Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace payout-workspace">
  <a class="back-link" href="/support"><Icon name="arrow-left" /> Company support</a>
  <p class="eyebrow">PRIVATE / APPROVED PARTNER</p>
  <h1>Support payouts</h1>
  <p class="intro">Set up the account that receives your share of company support subscriptions.</p>
  <section class="builder-panel" aria-labelledby="payout-heading">
    <h2 id="payout-heading">Your payout account</h2>
    <div
      class="payout-status"
      class:ready={status === 'ready' && !failed && !refreshing}
      role="status"
      aria-live="polite"
    >
      <strong>{statusLabel}</strong>
      <p>{refreshing ? 'Checking your account with Stripe…' : message}</p>
    </div>
    <div class="setup-fields">
      <label for="business-country">Business country</label>
      <select id="business-country" bind:value={country} disabled={busy || refreshing}>
        <option value="">Select country</option>
        {#each countries as value}<option {value}>{regionNames.of(value) || value} ({value})</option
          >{/each}
      </select>
      <div class="payout-actions">
        <button
          class="button"
          disabled={busy || refreshing || !country || !data.onboardingEnabled}
          onclick={hosted}
        >
          {busy
            ? 'Opening Stripe…'
            : status === 'ready'
              ? 'Update details on Stripe'
              : 'Continue on Stripe'}
          <Icon name="external-link" />
        </button>
        <button class="button secondary" onclick={refresh} disabled={busy || refreshing}
          >{refreshing ? 'Checking…' : 'Refresh status'}</button
        >
      </div>
      <p class="field-hint">
        Stripe handles your business and bank details securely. Return here to check your status
        when finished.
      </p>
    </div>
    {#if !data.onboardingEnabled}<p class="availability">
        Partner payout onboarding is awaiting provider verification.
      </p>{/if}
    <details class="payout-details">
      <summary>Use setup on this page instead</summary>
      <p>
        If you prefer, open Stripe’s embedded form below. If it cannot connect, use Continue on
        Stripe above.
      </p>
      <button
        class="button secondary"
        disabled={busy || refreshing || !country || !data.onboardingEnabled}
        onclick={start}>{busy ? 'Loading…' : 'Open embedded setup'}</button
      >
      {#if connect}
        <div class="payout-actions" aria-label="Stripe account views">
          {#each ['onboarding', 'account', 'payouts'] as item}
            <button
              class="button secondary"
              aria-pressed={panel === item}
              onclick={() => {
                panel = item;
                show();
              }}>{panelLabels[item as keyof typeof panelLabels]}</button
            >
          {/each}
        </div>
      {/if}
      <div bind:this={host}></div>
    </details>
  </section>
  <details class="payout-details fee-details">
    <summary>How your support share is calculated</summary>
    <p>
      For the $900/month support subscription, you receive 75% after Stripe’s actual
      transaction-processing fee. CREATE SOMETHING retains 25% of that net amount and covers Billing
      and Connect fees from its share.
    </p>
    <p>Your independent creator sales use a separate payment account.</p>
  </details>
</main>

<style>
  .payout-workspace {
    max-width: 960px;
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
  }
  .eyebrow {
    margin-bottom: 12px;
  }
  .payout-workspace h1 {
    font-size: clamp(36px, 5vw, 56px);
    letter-spacing: -0.045em;
    margin-bottom: 16px;
  }
  .intro {
    color: var(--muted);
    max-width: 55ch;
    margin-bottom: 32px;
  }
  .payout-status {
    border-left: 2px solid var(--state-info);
    padding: 4px 0 4px 16px;
    margin-bottom: 28px;
  }
  .payout-status.ready {
    border-color: var(--state-success);
  }
  .payout-status p {
    color: var(--muted);
    margin: 8px 0 0;
  }
  .setup-fields {
    display: grid;
    gap: 12px;
  }
  .setup-fields select {
    width: 100%;
    margin: 0;
  }
  .payout-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 8px 0;
  }
  .field-hint {
    margin: 0;
  }
  .payout-details {
    border-top: 1px solid var(--line);
    margin-top: 28px;
    padding-top: 20px;
  }
  .payout-details summary {
    cursor: pointer;
    min-height: 44px;
    line-height: 1.5;
  }
  .payout-details p {
    color: var(--muted);
    max-width: 65ch;
  }
  .fee-details {
    padding: 20px 0;
  }
  [aria-pressed='true'] {
    border-color: var(--signal);
    color: var(--signal);
  }
  @media (max-width: 600px) {
    .payout-actions {
      flex-direction: column;
    }
    .payout-actions .button {
      width: 100%;
    }
  }
</style>
