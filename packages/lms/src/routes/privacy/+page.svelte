<script lang="ts">
  import { PrivacyPolicyContent } from '@create-something/components';
</script>

<svelte:head>
  <title>Privacy Policy | CREATE SOMETHING LMS</title>
  <meta name="description" content="How CREATE SOMETHING collects, uses, and protects your data. We use Cloudflare only—no Google, no Meta. Session data: 7 days. Analytics: 90 days. Full control over your data." />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
  <section class="mb-12">
    <p class="eyebrow">Being-as-Trust</p>
    <h1 class="page-title">Privacy Policy</h1>
    <p class="date-text">Last updated: December 22, 2025</p>
  </section>

  <PrivacyPolicyContent
    property="lms"
    domain="learn.createsomething.space"
    lastUpdated="December 22, 2025"
  />
</div>

<style>
  .eyebrow {
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-sm);
  }

  .page-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .date-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }
</style>
