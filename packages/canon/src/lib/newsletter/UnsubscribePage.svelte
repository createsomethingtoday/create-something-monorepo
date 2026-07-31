<script lang="ts">
  /**
   * UnsubscribePage Component
   *
   * Shared unsubscribe confirmation page used across properties.
   * Pass the property prop to customize SEO and footer link.
   */

  import type { Property } from '../analytics/types';

  type PropertyDomain = Exclude<Property, 'lms'>;

  interface Props {
    data: {
      success: boolean;
      error: string | null;
      email: string | null;
    };
    property: PropertyDomain;
  }

  let { data, property }: Props = $props();

  const propertyDomains: Record<PropertyDomain, string> = {
    io: 'createsomething.io',
    space: 'createsomething.space',
    agency: 'createsomething.agency',
    ltd: 'createsomething.ltd'
  };

  const domain = $derived(propertyDomains[property]);
</script>

<div class="page-container min-h-screen flex items-center justify-center">
  <div class="max-w-md mx-auto px-6 py-16 text-center">
    <div class="logo mb-8">CREATE SOMETHING</div>

    {#if data.success}
      <div class="success-section">
        <h1 class="page-title mb-4">You are unsubscribed.</h1>
        <p class="body-text mb-6">
          {data.email
            ? `If ${data.email} was subscribed, it has now been removed.`
            : 'If you were subscribed, you have now been removed.'}
        </p>
        <p class="caption-text">This address will not receive more research notes.</p>
      </div>
    {:else}
      <div class="error-section">
        <h1 class="page-title mb-4">We could not unsubscribe this address.</h1>
        <p class="body-text mb-6">
          {data.error || 'Something went wrong processing your request.'}
        </p>
        <p class="caption-text">
          If you continue to receive emails, contact <a
            href="mailto:micah@createsomething.io"
            class="link">micah@createsomething.io</a
          >
        </p>
      </div>
    {/if}

    <div class="footer-link mt-12">
      <a href="https://{domain}" class="link">Back to CREATE SOMETHING</a>
    </div>
  </div>
</div>

<style>
  .page-container {
    background: var(--color-performance-bg-pure);
    color: var(--color-performance-fg-primary);
  }

  .logo {
    font-size: var(--text-performance-body-sm);
    font-weight: 500;
    color: var(--color-performance-fg-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .page-title {
    font-size: var(--text-performance-h2);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
  }

  .body-text {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-tertiary);
    line-height: 1.6;
  }

  .caption-text {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
  }

  .link {
    color: var(--color-performance-fg-tertiary);
    text-decoration: underline;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .link:hover {
    color: var(--color-performance-fg-primary);
  }

  .footer-link {
    padding-top: var(--space-performance-lg);
  }
</style>
