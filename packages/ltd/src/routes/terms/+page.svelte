<script lang="ts">
  import { SEO, TermsOfServiceContent } from '@create-something/canon';
</script>

<SEO
  title="Terms of Service"
  description="Terms of Service for CREATE SOMETHING LTD. The philosophical foundation—how we govern your use of the canon."
  keywords="terms of service, legal, CREATE SOMETHING, canon"
  propertyName="ltd"
  noindex={true}
/>

<section class="pt-24 pb-16 px-6">
  <div class="shell-inner">
    <p class="eyebrow mb-6">Being-as-Agreement</p>
    <h1 class="page-title mb-4">Terms of Service</h1>
    <p class="date-text">Last updated: January 29, 2026</p>
  </div>
</section>

<section class="pb-24 px-6">
  <div class="shell-inner">
    <TermsOfServiceContent
      property="ltd"
      domain="createsomething.ltd"
      lastUpdated="January 29, 2026"
      contactEmail="legal@createsomething.io"
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
