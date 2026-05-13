<script lang="ts">
  import { SEO } from '@create-something/canon';

  const effectiveDate = 'March 6, 2026';

  const controls = [
    'One active bearer token per authenticated user',
    'Long-lived token issued by .agency, not raw Auth0 access tokens',
    'Retain the active token by default; rotation is explicit or compromise-driven',
    'Immediate revoke and regenerate controls',
    'Live checks for org membership, policy acceptance, contract status, billing status, and service entitlement',
    'Opaque token format with protected server-side storage',
    'Audit logs for issuance, regeneration, revocation, and request-time authorization'
  ];

  const responsibilities = [
    'Do not share the token with another person or team.',
    'Store the token in a secure secret manager or equivalent controlled environment.',
    'Regenerate or revoke the token immediately if compromise is suspected.',
    'Expect access to stop if the user or organization is no longer in good standing.',
    'Understand that regeneration invalidates the prior token immediately.'
  ];
</script>

<SEO
  title="Bearer Token Policy"
  description="The bearer token policy for CREATE SOMETHING .agency. One long-lived token per user, live entitlement checks, revocation, audit controls, and legal/commercial enforcement."
  propertyName="agency"
/>

<section class="hero pt-32 pb-16 px-6">
  <div class="shell-inner">
    <div class="eyebrow animate-reveal">Trust Surface</div>
    <div class="copy animate-reveal">
      <h1 class="page-title">Bearer Token Policy</h1>
      <p class="lede">
        A portable token should not become a portable permission slip. `.agency` issues one managed
        bearer token per authenticated user, but authorization stays conditional at request time.
      </p>
      <p class="date-text">Effective date: {effectiveDate}</p>
    </div>
  </div>
</section>

<section class="pb-24 px-6">
  <div class="shell-inner policy-grid">
    <article class="policy-card">
      <h2>Core Rule</h2>
      <p>
        Each bearer token is personal to one authenticated user, governed by `.agency`, and continuously
        checked against current organization, legal, policy, and billing state. A valid token does not
        guarantee access unless the user and organization remain in good standing at the time of each request.
        Existing active bearer tokens are retained by default; replacement is an explicit regenerate action or
        a response to suspected compromise or misuse.
      </p>
    </article>

    <article class="policy-card">
      <h2>Control Model</h2>
      <ul>
        {#each controls as control}
          <li>{control}</li>
        {/each}
      </ul>
    </article>

    <article class="policy-card">
      <h2>Prohibited Use</h2>
      <ul>
        <li>Shared team tokens</li>
        <li>Public repositories or uncontrolled environments</li>
        <li>Bypassing contract, payment, or policy requirements</li>
        <li>Continued use after suspected exposure</li>
      </ul>
    </article>

    <article class="policy-card">
      <h2>User Responsibilities</h2>
      <ul>
        {#each responsibilities as responsibility}
          <li>{responsibility}</li>
        {/each}
      </ul>
    </article>

    <article class="policy-card full-span">
      <h2>Termination and Enforcement</h2>
      <p>
        `.agency` may revoke or suspend bearer-token access immediately where compromise, misuse, billing
        delinquency, contract failure, policy violation, or other legal, operational, or security risk is
        detected. Revocation terminates token usability at once. Regeneration replaces the prior token with
        no overlap unless CREATE SOMETHING explicitly provides a managed transition mechanism.
      </p>
    </article>
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding: var(--agency-hero-padding-top) 1.5rem var(--agency-hero-padding-bottom);
  }

  .eyebrow {
    color: var(--color-fg-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .copy {
    max-width: 56rem;
  }

  .page-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin-bottom: 1rem;
  }

  .lede {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    max-width: 52rem;
    line-height: 1.7;
  }

  .date-text {
    margin-top: 1rem;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  .policy-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .policy-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
      rgba(0, 0, 0, 0.5);
    padding: 1.5rem;
    backdrop-filter: blur(8px);
  }

  .policy-card h2 {
    font-size: var(--text-h4);
    color: var(--color-fg-primary);
    margin-bottom: 1rem;
  }

  .policy-card p,
  .policy-card li {
    color: var(--color-fg-secondary);
    line-height: 1.7;
  }

  .policy-card ul {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.75rem;
  }

  .full-span {
    grid-column: 1 / -1;
  }

  .animate-reveal {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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
