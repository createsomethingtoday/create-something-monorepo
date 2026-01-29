<!--
  PrivacyPolicyContent - Shared privacy policy content for all CREATE SOMETHING properties

  Canon: Privacy is not a feature—it's respect for the user's autonomy.

  Usage:
  <PrivacyPolicyContent
    property="io"
    domain="createsomething.io"
    lastUpdated="December 22, 2025"
  />
-->
<script lang="ts">
  interface Props {
    /** Which CREATE SOMETHING property this policy is for */
    property: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
    /** The domain for this property */
    domain: string;
    /** Last updated date string */
    lastUpdated?: string;
    /** Contact email for privacy requests */
    contactEmail?: string;
  }

  let {
    property,
    domain,
    lastUpdated = 'January 29, 2026',
    contactEmail = 'privacy@createsomething.io'
  }: Props = $props();

  const propertyLabels: Record<string, string> = {
    io: 'createsomething.io (Research)',
    space: 'createsomething.space (Practice)',
    agency: 'createsomething.agency (Services)',
    ltd: 'createsomething.ltd (Philosophy)',
    lms: 'learn.createsomething.space (Learning)'
  };

  const propertyLabel = propertyLabels[property] || domain;
</script>

<article class="privacy-content">
  <!-- What We Collect -->
  <section class="policy-section">
    <h2 class="section-title">1. What We Collect</h2>

    <p class="body-text">
      We collect only what's necessary to provide our services. No tracking pixels. No advertising networks. No data brokers.
    </p>

    <h3 class="subsection-title">1.1 Session Data</h3>
    <p class="body-text">
      When you log in, we create a session to maintain your authenticated state:
    </p>
    <ul class="policy-list">
      <li>Session identifier (random token)</li>
      <li>Authentication timestamp</li>
      <li>Last activity timestamp</li>
    </ul>

    <h3 class="subsection-title">1.2 Page Views</h3>
    <p class="body-text">
      We collect minimal analytics to understand how our content serves you:
    </p>
    <ul class="policy-list">
      <li>Page URL visited</li>
      <li>Referrer (how you arrived)</li>
      <li>Approximate location (country-level, derived from IP)</li>
      <li>Device type (mobile/desktop)</li>
      <li>Browser family (e.g., Chrome, Safari—not fingerprinting)</li>
    </ul>
    <p class="body-text">
      We do <strong class="emphasis">not</strong> use cookies for analytics. We do <strong class="emphasis">not</strong> track you across sites.
    </p>

    <h3 class="subsection-title">1.3 User Profile</h3>
    <p class="body-text">
      If you create an account, we store:
    </p>
    <ul class="policy-list">
      <li>Email address (for authentication)</li>
      <li>Display name (optional)</li>
      <li>Avatar URL (if you set one)</li>
      <li>Account creation date</li>
      <li>Consent preferences (analytics opt-out status)</li>
    </ul>
  </section>

  <!-- Why We Collect -->
  <section class="policy-section">
    <h2 class="section-title">2. Why We Collect It</h2>

    <h3 class="subsection-title">2.1 Authentication</h3>
    <p class="body-text">
      Session data allows you to stay logged in and access your account across our properties.
    </p>

    <h3 class="subsection-title">2.2 Personalization</h3>
    <p class="body-text">
      Your profile data enables personalized experiences like progress tracking on {propertyLabel}.
    </p>

    <h3 class="subsection-title">2.3 Service Improvement</h3>
    <p class="body-text">
      Aggregate page view data helps us understand which content resonates and where to focus our efforts. We never sell this data or use it for advertising.
    </p>
  </section>

  <!-- How Long We Keep It -->
  <section class="policy-section">
    <h2 class="section-title">3. How Long We Keep It</h2>

    <div class="retention-table">
      <div class="retention-row">
        <span class="retention-type">Session data</span>
        <span class="retention-duration">7 days</span>
        <span class="retention-note">Auto-expires, forces re-authentication</span>
      </div>
      <div class="retention-row">
        <span class="retention-type">Page view analytics</span>
        <span class="retention-duration">90 days</span>
        <span class="retention-note">Then permanently deleted</span>
      </div>
      <div class="retention-row">
        <span class="retention-type">User profile</span>
        <span class="retention-duration">Until deletion</span>
        <span class="retention-note">You control when it's removed</span>
      </div>
    </div>

    <p class="body-text">
      After retention periods expire, data is permanently deleted—not archived, not anonymized for later use. Deleted means deleted.
    </p>
  </section>

  <!-- Third Parties -->
  <section class="policy-section">
    <h2 class="section-title">4. Third Parties</h2>

    <p class="body-text">
      We use <strong class="emphasis">one</strong> third-party provider:
    </p>

    <div class="provider-card">
      <h3 class="provider-name">Cloudflare</h3>
      <p class="provider-purpose">
        Infrastructure, security, and content delivery. Cloudflare processes requests to serve our websites but does not have access to your user data or analytics.
      </p>
      <a href="https://www.cloudflare.com/privacypolicy/" class="provider-link" target="_blank" rel="noopener noreferrer">
        Cloudflare Privacy Policy →
      </a>
    </div>

    <p class="body-text emphasis-block">
      We do <strong class="emphasis">not</strong> use:
    </p>
    <ul class="policy-list no-use-list">
      <li>Google Analytics or any Google services</li>
      <li>Meta/Facebook Pixel or any Meta services</li>
      <li>Third-party advertising networks</li>
      <li>Data brokers or data enrichment services</li>
      <li>Social login providers (we use our own identity system)</li>
    </ul>
  </section>

  <!-- Your Rights -->
  <section class="policy-section">
    <h2 class="section-title">5. Your Rights</h2>

    <p class="body-text">
      You have full control over your data. These rights apply to all users, regardless of location:
    </p>

    <h3 class="subsection-title">5.1 Access</h3>
    <p class="body-text">
      Request a complete copy of all data we hold about you. We'll provide it in a machine-readable format (JSON) within 30 days.
    </p>

    <h3 class="subsection-title">5.2 Export</h3>
    <p class="body-text">
      Download your data at any time from your account settings. No request needed—it's self-service.
    </p>

    <h3 class="subsection-title">5.3 Deletion</h3>
    <p class="body-text">
      Request permanent deletion of your account and all associated data. We process deletion requests within 30 days. Once deleted, data cannot be recovered.
    </p>

    <h3 class="subsection-title">5.4 Correction</h3>
    <p class="body-text">
      Update your profile information at any time through your account settings.
    </p>

    <h3 class="subsection-title">5.5 Opt-Out</h3>
    <p class="body-text">
      Opt out of analytics collection from your account settings. Your choice is stored in your profile and respected across all CREATE SOMETHING properties.
    </p>
  </section>

  <!-- Contact -->
  <section class="policy-section">
    <h2 class="section-title">6. Contact for Privacy Requests</h2>

    <p class="body-text">
      For any privacy-related requests or questions:
    </p>

    <div class="contact-info">
      <p>
        <strong class="contact-label">Email:</strong>
        <a href="mailto:{contactEmail}" class="contact-link">{contactEmail}</a>
      </p>
      <p>
        <strong class="contact-label">Response time:</strong>
        <span class="contact-value">Within 5 business days</span>
      </p>
    </div>

    <p class="body-text">
      For automated requests (access, export, deletion), use the self-service options in your account settings—they're faster than email.
    </p>
  </section>

  <!-- Legal Compliance -->
  <section class="policy-section">
    <h2 class="section-title">7. Legal Compliance</h2>

    <p class="body-text">
      This policy is designed to comply with:
    </p>
    <ul class="policy-list">
      <li><strong class="emphasis">GDPR</strong> (European Union)</li>
      <li><strong class="emphasis">CCPA/CPRA</strong> (California, USA)</li>
      <li><strong class="emphasis">PIPEDA</strong> (Canada)</li>
    </ul>

    <p class="body-text">
      We apply these protections to all users, regardless of jurisdiction. Privacy shouldn't depend on where you live.
    </p>
  </section>

  <!-- Changes -->
  <section class="policy-section">
    <h2 class="section-title">8. Changes to This Policy</h2>

    <p class="body-text">
      We'll notify you of significant changes via email (if you have an account) and update the "Last updated" date. Minor clarifications don't require notification but are reflected in the date.
    </p>

    <p class="body-text last-updated">
      Last updated: {lastUpdated}
    </p>
  </section>

  <!-- Acknowledgment -->
  <section class="acknowledgment">
    <p>
      By using {domain}, you acknowledge that you've read and understood this Privacy Policy.
    </p>
  </section>
</article>

<style>
  .privacy-content {
    max-width: 100%;
  }

  .policy-section {
    margin-bottom: var(--space-xl);
  }

  .section-title {
    font-size: var(--text-h2);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-md);
  }

  .subsection-title {
    font-size: var(--text-h3);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-top: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .body-text {
    color: var(--color-fg-secondary);
    line-height: 1.7;
    margin-bottom: var(--space-sm);
  }

  .emphasis {
    color: var(--color-fg-primary);
  }

  .emphasis-block {
    margin-top: var(--space-md);
  }

  .policy-list {
    list-style: disc;
    list-style-position: inside;
    margin-left: var(--space-sm);
    margin-bottom: var(--space-sm);
    color: var(--color-fg-secondary);
  }

  .policy-list li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .no-use-list li {
    color: var(--color-fg-tertiary);
  }

  /* Retention table */
  .retention-table {
    margin: var(--space-md) 0;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .retention-row {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
    align-items: center;
  }

  .retention-row:last-child {
    border-bottom: none;
  }

  .retention-type {
    color: var(--color-fg-primary);
    font-weight: 500;
  }

  .retention-duration {
    color: var(--color-fg-secondary);
    font-weight: 600;
  }

  .retention-note {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  @media (max-width: 640px) {
    .retention-row {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }

    .retention-note {
      margin-top: 0.25rem;
    }
  }

  /* Provider card */
  .provider-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    margin: var(--space-md) 0;
  }

  .provider-name {
    font-size: var(--text-body-lg);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .provider-purpose {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-sm);
    line-height: 1.6;
  }

  .provider-link {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    text-decoration: none;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .provider-link:hover {
    text-decoration: underline;
  }

  /* Contact info */
  .contact-info {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    margin: var(--space-md) 0;
  }

  .contact-info p {
    margin-bottom: var(--space-xs);
    color: var(--color-fg-secondary);
  }

  .contact-info p:last-child {
    margin-bottom: 0;
  }

  .contact-label {
    color: var(--color-fg-primary);
  }

  .contact-link {
    color: var(--color-fg-primary);
    text-decoration: none;
  }

  .contact-link:hover {
    text-decoration: underline;
  }

  .contact-value {
    color: var(--color-fg-secondary);
  }

  .last-updated {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    margin-top: var(--space-md);
  }

  /* Acknowledgment */
  .acknowledgment {
    margin-top: var(--space-xl);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border-default);
  }

  .acknowledgment p {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }
</style>
