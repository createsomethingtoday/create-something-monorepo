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
  async function refresh() {
    try {
      const result = await api('support/payouts');
      status = result.state;
      countries = result.countries || [];
      if (result.country) country = result.country;
      message = result.payoutsReady
        ? 'Your support payout account is ready.'
        : 'Complete any outstanding Stripe requirements before receiving support payouts.';
    } catch (e) {
      message = (e as Error).message;
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
<main id="main" class="builder-workspace">
  <a href="/support"><Icon name="arrow-left" /> Company support</a>
  <p class="eyebrow">PRIVATE / APPROVED PARTNER</p>
  <h1>Deliver the support.<br /><em>Receive your share.</em></h1>
  <p class="lede">
    This payout account is for CREATE SOMETHING’s $900/month support subscription. The partner share
    is 95%; CREATE SOMETHING retains 5% before processing fees. Your independent creator sales use a
    separate payment account.
  </p>
  <section class="builder-panel">
    <h2>Partner verification</h2>
    <p>
      Complete Stripe’s business and payout requirements. Only approved partners with a ready
      account can receive support subscriptions.
    </p>
    <label
      >Business country<select bind:value={country} disabled={busy}
        ><option value="">Select country</option>{#each countries as value}<option {value}
            >{value}</option
          >{/each}</select
      ></label
    ><button class="button" disabled={busy || !country || !data.onboardingEnabled} onclick={start}
      >{busy ? 'Loading…' : 'Open payout setup'}</button
    >
    <div class="actions">
      {#each ['onboarding', 'account', 'payouts'] as item}<button
          class="button secondary"
          disabled={!connect}
          onclick={() => {
            panel = item;
            show();
          }}>{item}</button
        >{/each}<button class="button secondary" onclick={refresh} disabled={busy}
        >Refresh status</button
      >
    </div>
    <p role="status">{status} {message}</p>
    {#if !data.onboardingEnabled}<p class="availability">
        Partner payout onboarding is awaiting provider verification.
      </p>{/if}
    <div bind:this={host}></div>
  </section>
</main>
