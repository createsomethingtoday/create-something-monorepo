<script lang="ts">
  import { SEO } from '@create-something/canon';
  import ControlStackDiagram from '$lib/components/ControlStackDiagram.svelte';
  import BlockedStatePanel from '$lib/components/BlockedStatePanel.svelte';

  const layers = [
    {
      title: 'Identity boundary',
      text: 'Auth0 establishes the person or tenant boundary. `.agency` does not treat a bearer token as a replacement for identity.'
    },
    {
      title: 'Live entitlement',
      text: 'Every request is checked against organization membership, service entitlement, contract standing, billing state, and policy acceptance.'
    },
    {
      title: 'Credential separation',
      text: 'Portal sign-in, managed bearer tokens, and hosted product credentials remain distinct so compromise or revocation can be handled deliberately.'
    },
    {
      title: 'Operational control',
      text: 'Revocation, regeneration, anomaly review, and audit trails are part of the standing operating model, not an optional support add-on.'
    }
  ];
</script>

<SEO
  title="Security"
  description="How CREATE SOMETHING .agency turns identity, entitlement, blocked states, and audit trails into governed execution for production automation."
  propertyName="agency"
/>

<section class="hero">
  <div class="shell-inner">
    <div class="eyebrow animate-reveal">Proof Surface</div>
    <div class="copy animate-reveal">
      <h1 class="page-title">Security</h1>
      <p class="lede">
        A valid token is not a trusted action. Policy OS turns credentials into governable runtime
        behavior: access can exist, stop, or require approval based on identity, entitlement,
        commercial state, and policy.
      </p>
      <p class="date-text">Last updated: March 9, 2026</p>
    </div>
  </div>
</section>

<section class="section-shell">
  <div class="shell-inner">
    <ControlStackDiagram
      title="How `.agency` enforces governable automation"
      description="Each request passes through an explicit chain. That is why approval requirements, blocked states, and recovery paths stay legible instead of hiding inside prompt behavior."
    />
  </div>
</section>

<section class="section-shell">
  <div class="shell-inner">
    <BlockedStatePanel />
  </div>
</section>

<section class="section-shell">
  <div class="shell-inner security-grid">
    {#each layers as layer}
      <article class="security-card">
        <h2>{layer.title}</h2>
        <p>{layer.text}</p>
      </article>
    {/each}

    <article class="security-card full-span">
      <h2>Bearer token risk management</h2>
      <p>
        `.agency` issues one managed bearer token per authenticated user for approved hosts and
        background agents. The token is portable, but authorization remains conditional at request
        time through live entitlement and policy checks.
      </p>
      <p>
        If compromise is suspected, CREATE SOMETHING can revoke or regenerate access immediately
        without waiting for a token expiry window.
      </p>
    </article>

    <article class="security-card full-span">
      <h2>Why commercial and legal state belongs in the access decision</h2>
      <p>
        Access is not determined by token validity alone. `.agency` can deny execution when
        contract status, billing standing, or required policy acceptance is not current. This keeps
        back-office reality tied to runtime behavior instead of leaving a governance gap between the
        agreement and the workflow.
      </p>
      <p>
        For security inquiries, contact <a href="mailto:legal@createsomething.io">legal@createsomething.io</a>.
      </p>
    </article>
  </div>
</section>

<style>
  .hero {
    padding: var(--agency-hero-padding-top) 1.5rem var(--agency-hero-padding-bottom);
  }

  .section-shell {
    padding: 0 1.5rem 4rem;
  }

  .eyebrow {
    color: var(--color-fg-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .copy {
    max-width: 62rem;
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
    max-width: 58rem;
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
      radial-gradient(circle at top left, rgba(45, 212, 191, 0.09), transparent 45%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
      rgba(0, 0, 0, 0.5);
    padding: 1.5rem;
    border-radius: 20px;
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
