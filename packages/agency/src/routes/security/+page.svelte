<script lang="ts">
  import { SEO } from '@create-something/canon';

  const layers = [
    {
      title: 'Identity',
      text: 'Auth0 provides the user identity boundary. Portable bearer tokens are issued by .agency, not exported directly from Auth0.'
    },
    {
      title: 'Authorization',
      text: 'Every request is checked against organization membership, service entitlements, policy acceptance, contract status, and billing state.'
    },
    {
      title: 'Secrets',
      text: 'System-side runtime secrets remain in managed secret infrastructure such as Infisical. User bearer tokens are treated as high-trust credentials and protected separately.'
    },
    {
      title: 'Operations',
      text: 'Revocation, regeneration, audit logs, anomaly review, and rate controls are part of the standing operating model, not optional support procedures.'
    }
  ];
</script>

<SEO
  title="Security"
  description="How CREATE SOMETHING .agency manages identity, bearer-token governance, entitlement checks, secrets, and operational controls for production automation."
  propertyName="agency"
/>

<section class="hero pt-32 pb-16 px-6">
  <div class="shell-inner">
    <div class="eyebrow animate-reveal">Trust Surface</div>
    <div class="copy animate-reveal">
      <h1 class="page-title">Security</h1>
      <p class="lede">
        `.agency` is designed around identity separation, live authorization, controlled secret handling,
        and operational revocation. The point is not just to issue credentials. The point is to keep
        automation governable after credentials exist.
      </p>
      <p class="date-text">Last updated: March 6, 2026</p>
    </div>
  </div>
</section>

<section class="pb-24 px-6">
  <div class="shell-inner security-grid">
    {#each layers as layer}
      <article class="security-card">
        <h2>{layer.title}</h2>
        <p>{layer.text}</p>
      </article>
    {/each}

    <article class="security-card full-span">
      <h2>Bearer Token Risk Management</h2>
      <p>
        `.agency` supports one long-lived bearer token per authenticated user. This simplicity is balanced
        by compensating controls: opaque token format, protected server-side storage, request-time
        entitlement enforcement, immediate revoke and regenerate paths, and auditability for both issuance
        and downstream use.
      </p>
      <p>
        If a token is suspected to be compromised, CREATE SOMETHING may revoke it immediately and require
        re-issuance before further host or agent access is restored.
      </p>
    </article>

    <article class="security-card full-span">
      <h2>Commercial and Legal Gating</h2>
      <p>
        Access is not determined by token validity alone. `.agency` may deny access where contract status,
        required policy acceptance, or billing standing is not current, even if a token has not expired.
        This keeps legal and commercial state inside the access decision rather than leaving it as a
        disconnected back-office concern.
      </p>
      <p>
        For security inquiries, contact <a href="mailto:legal@createsomething.io">legal@createsomething.io</a>.
      </p>
    </article>
  </div>
</section>

<style>
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
    max-width: 54rem;
    line-height: 1.7;
  }

  .date-text {
    margin-top: 1rem;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  .security-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .security-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      radial-gradient(circle at top left, rgba(251, 191, 36, 0.08), transparent 40%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
      rgba(0, 0, 0, 0.5);
    padding: 1.5rem;
    backdrop-filter: blur(8px);
  }

  .security-card h2 {
    font-size: var(--text-h4);
    color: var(--color-fg-primary);
    margin-bottom: 0.9rem;
  }

  .security-card p {
    color: var(--color-fg-secondary);
    line-height: 1.7;
    margin: 0 0 1rem;
  }

  .security-card p:last-child {
    margin-bottom: 0;
  }

  .security-card a {
    color: var(--color-fg-primary);
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
