<script lang="ts">
  import { SEO, TermsOfServiceContent } from '@create-something/canon';
</script>

<SEO
  title="Terms of Service"
  description="Terms of Service for CREATE SOMETHING SPACE. Read the terms governing your use of our website and services."
  propertyName="space"
  noindex={true}
/>

<section class="pt-32 pb-16 px-6">
  <div class="shell-inner">
    <div class="space-y-6 animate-reveal">
      <h1 class="page-title">Terms of Service</h1>
      <p class="date-text">Last updated: January 29, 2026</p>
    </div>
  </div>
</section>

<section class="pb-24 px-6">
  <div class="shell-inner">
    <TermsOfServiceContent
      property="space"
      domain="createsomething.space"
      lastUpdated="January 29, 2026"
      contactEmail="legal@createsomething.io"
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
    color: var(--color-fg-tertiary);
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
