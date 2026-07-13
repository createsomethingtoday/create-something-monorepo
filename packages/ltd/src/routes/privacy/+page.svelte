<script lang="ts">
  import { SEO, PrivacyPolicyContent } from '@create-something/canon';
</script>

<SEO
  title="Privacy Policy"
  description="How CREATE SOMETHING collects, uses, and protects your data. We use Cloudflare only—no Google, no Meta. Session data: 7 days. Analytics: 90 days. Full control over your data."
  keywords="privacy policy, data protection, GDPR, CCPA, CREATE SOMETHING"
  propertyName="ltd"
  noindex={true}
/>

<section class="pt-24 pb-16 px-6">
  <div class="shell-inner">
    <p class="eyebrow mb-6">Being-as-Trust</p>
    <h1 class="page-title mb-4">Privacy Policy</h1>
    <p class="date-text">Last updated: January 29, 2026</p>
  </div>
</section>

<section class="pb-24 px-6">
  <div class="shell-inner">
    <PrivacyPolicyContent
      property="ltd"
      domain="createsomething.ltd"
      lastUpdated="January 29, 2026"
    />
  </div>
</section>

<style>
  .eyebrow {
    font-size: var(--text-performance-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-performance-fg-tertiary);
  }

  .page-title {
    font-size: var(--text-performance-h1);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
  }

  .date-text {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-secondary);
  }
</style>
