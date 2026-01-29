<script lang="ts">
  import { SEO, PrivacyPolicyContent } from '@create-something/canon';
</script>

<SEO
  title="Privacy Policy"
  description="How CREATE SOMETHING collects, uses, and protects your data. We use Cloudflare only—no Google, no Meta. Session data: 7 days. Analytics: 90 days. Full control over your data."
  propertyName="io"
  noindex={true}
/>

<section class="relative pt-32 pb-16 px-6">
  <div class="max-w-4xl mx-auto">
    <div class="space-y-6 animate-reveal">
      <h1 class="page-title">
        Privacy Policy
      </h1>
      <p class="date-text">
        Last updated: January 29, 2026
      </p>
    </div>
  </div>
</section>

<section class="pb-20 px-6">
  <div class="max-w-4xl mx-auto">
    <PrivacyPolicyContent
      property="io"
      domain="createsomething.io"
      lastUpdated="January 29, 2026"
    />
  </div>
</section>

<style>
  .page-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .date-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }

  .animate-reveal {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal var(--duration-standard) var(--ease-standard) forwards;
  }

  @keyframes reveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-reveal {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
