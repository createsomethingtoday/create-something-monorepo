<script lang="ts">
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
      const result = await api('seller', undefined, data.network!.slug);
      status = result.state;
      countries = result.countries || [];
      if (result.country) country = result.country;
      message =
        result.chargesReady && result.payoutsReady
          ? 'Your account can accept payments and receive payouts.'
          : 'Complete any outstanding Stripe requirements before accepting sales.';
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
          : panel === 'payments'
            ? connect.create('payments')
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
      const setup = await api('seller', { country }, data.network!.slug);
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
          const next = await api('seller', { country }, data.network!.slug);
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
  ><title>Seller payments | {data.network?.name}</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace">
  <div class="workspace-trail">
    <a href={`/n/${data.network!.slug}/settings`}>{data.network!.name} / Setup</a><span
      >/ Seller payments</span
    >
  </div>
  <p class="eyebrow">YOUR BUSINESS / YOUR PAYMENTS</p>
  <h1>Sell your work.<br /><em>Keep the relationship.</em></h1>
  <p class="lede">
    Buyers pay your business directly through Stripe. You set asset prices and handle support,
    refunds and disputes. CREATE SOMETHING provides your network and private package delivery.
  </p>
  <div class="builder-split">
    <section>
      <h2>Get ready to sell.</h2>
      <ol class="install-steps">
        <li>
          <strong>Verify your business.</strong> Provide your business and payout details securely through
          Stripe.
        </li>
        <li>
          <strong>Set your policies.</strong> Add a license and support/refund policy to each asset. Configure
          applicable tax registrations in Stripe; taxes are calculated at checkout.
        </li>
        <li>
          <strong>Review your storefront.</strong> Check payment readiness, publish an asset and test
          the buyer path.
        </li>
      </ol>
      <p class="availability">
        {data.feesConfirmed
          ? '$24.50 USD per network/month. CREATE SOMETHING takes 0% of asset sales. Stripe processing fees apply to your account.'
          : 'Network hosting is $24.50 USD/month. Asset sales remain disabled until launch pricing and payment acceptance are confirmed.'}
      </p>
      <p>
        <a href="https://stripe.com/pricing" target="_blank" rel="noreferrer"
          >Stripe processing fees ↗</a
        >
      </p>
      <p class="muted">
        Account setup does not charge you. Your Stripe Dashboard is where you manage payments,
        refunds, tax settings and payouts.
      </p>
      <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer"
        >Open your Stripe Dashboard ↗</a
      >
    </section>
    <section class="builder-panel">
      <p class="eyebrow">PAYMENT READINESS / {status || data.sellerState}</p>
      <h2>{status === 'ready' ? 'Ready for sales.' : 'Connect your business.'}</h2>
      <p>
        Stripe collects the information it needs for your business and country. You can leave and
        return to finish later.
      </p>
      <label
        >Business country<select bind:value={country} disabled={!!connect}
          ><option value="">Select your business country</option>{#each countries as code}<option
              value={code}
              >{new Intl.DisplayNames(['en'], { type: 'region' }).of(code)} ({code})</option
            >{/each}</select
        ></label
      >
      <p class="muted">
        Choose where your business is based. Stripe locks the country when the account is created.
      </p>
      <button class="button" disabled={busy || !data.onboardingEnabled || !country} onclick={start}
        >{busy ? 'Opening Stripe…' : connect ? 'Reload secure setup' : 'Open secure Stripe setup'} ↗</button
      ><button class="button secondary" disabled={busy} onclick={refresh}>Check readiness</button
      >{#if !data.onboardingEnabled}<p class="muted">
          Seller onboarding is awaiting platform configuration. Your network and asset drafts are
          saved.
        </p>{/if}{#if message}<p role="status" class="availability">{message}</p>{/if}
    </section>
  </div>
  {#if connect}<div class="catalog-tools">
      <label
        >Manage your business<select bind:value={panel} onchange={show}
          ><option value="onboarding">Complete onboarding</option><option value="account"
            >Business details</option
          ><option value="payments">Payments, refunds and disputes</option><option value="payouts"
            >Payouts</option
          ></select
        ></label
      >
    </div>{/if}
  <div bind:this={host} class="stripe-host"></div>
  <p class="workspace-trail">
    <a href={`/n/${data.network!.slug}/assets`}>Back to your assets →</a>
  </p>
</main>

<style>
  .stripe-host {
    margin: 32px 0;
    min-width: 0;
  }
  .button {
    margin: 8px 8px 8px 0;
  }
</style>
