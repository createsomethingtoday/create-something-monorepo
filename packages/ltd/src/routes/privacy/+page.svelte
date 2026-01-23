<script lang="ts">
  import { SEO, PrivacyPolicyContent } from '@create-something/components';
</script>

<SEO
  title="Privacy Policy"
  description="How CREATE SOMETHING collects, uses, and protects your data. We use Cloudflare only—no Google, no Meta. Session data: 7 days. Analytics: 90 days. Full control over your data."
  keywords="privacy policy, data protection, GDPR, CCPA, CREATE SOMETHING"
  propertyName="ltd"
  noindex={true}
/>

<section class="pt-24 pb-16 px-6">
  <div class="max-w-4xl mx-auto">
    <p class="eyebrow mb-6">Being-as-Trust</p>
    <h1 class="page-title mb-4">Privacy Policy</h1>
    <p class="date-text">Last updated: December 22, 2025</p>
  </div>
</section>

<section class="pb-24 px-6">
  <div class="max-w-4xl mx-auto">
    <PrivacyPolicyContent
      property="ltd"
      domain="createsomething.ltd"
      lastUpdated="December 22, 2025"
    />
  </div>
</section>

<style>
  .eyebrow {
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-fg-tertiary);
  }

  .page-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .date-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }
</style>
