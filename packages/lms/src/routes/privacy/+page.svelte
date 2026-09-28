<script lang="ts">
  import PrivacyPolicyContent from '$canon/components/PrivacyPolicyContent.svelte';
</script>

<svelte:head>
  <title>Privacy Policy | CREATE SOMETHING LMS</title>
  <meta name="description" content="How CREATE SOMETHING collects, uses, and protects your data. We use Cloudflare only—no Google, no Meta. Session data: 7 days. Analytics: 90 days. Full control over your data." />
</svelte:head>

<div class="privacy-page">
  <section class="privacy-header">
    <p class="eyebrow">Being-as-Trust</p>
    <h1 class="page-title">Privacy Policy</h1>
    <p class="date-text">Last updated: January 29, 2026</p>
  </section>

  <PrivacyPolicyContent
    property="lms"
    domain="learn.createsomething.space"
    lastUpdated="January 29, 2026"
  />
</div>

<style>
  .privacy-page {
    width: min(56rem, calc(100% - 2.5rem));
    margin-inline: auto;
    padding-block: 2rem 3rem;
  }

  .privacy-header {
    padding: 0;
    margin-bottom: 1.5rem;
  }

  .eyebrow {
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-sm);
  }

  .page-title {
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .date-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }
</style>
