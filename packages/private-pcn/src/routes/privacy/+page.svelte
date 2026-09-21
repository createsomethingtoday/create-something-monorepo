<script lang="ts">
  import LegalPage from '$lib/components/LegalPage.svelte';
  const sections = [
    { id: 'scope', title: 'Scope and responsibility' },
    { id: 'information', title: 'Information we handle' },
    { id: 'purposes', title: 'Why we use it' },
    { id: 'access', title: 'Who can access it' },
    { id: 'providers', title: 'Service providers' },
    { id: 'cookies', title: 'Cookies and measurement' },
    { id: 'retention', title: 'Retention and deletion' },
    { id: 'choices', title: 'Your choices and rights' },
    { id: 'security', title: 'Security and international processing' },
    { id: 'changes', title: 'Changes and contact' }
  ];
</script>

<LegalPage
  title="Privacy Policy"
  description="How CREATE SOMETHING Private handles accounts, creator applications, private networks, assets, and support activity."
  {sections}
>
  <section id="scope">
    <h2>1. Scope and responsibility</h2>
    <p>
      This policy applies to <strong>private.createsomething.agency</strong> and the information CREATE
      SOMETHING handles to operate Private. It covers our use of CREATE SOMETHING Identity for sign-in
      and verification. It does not describe every other CREATE SOMETHING website or an external tool
      you choose to use.
    </p>
    <p>
      We are responsible for platform account, admission, security, and operational processing.
      Creators and company workspace owners also make decisions about their participants and
      content. They may have their own privacy obligations and notices. An agreed company
      data-processing agreement may further define responsibilities for project information.
    </p>
    <p>
      Private is intended for adults aged 18 or older. Contact us if you believe a child has
      provided personal information through the service.
    </p>
  </section>
  <section id="information">
    <h2>2. Information we handle</h2>
    <ul>
      <li>
        <strong>Account and verification:</strong> email address, account identifier, verified and active
        status, authentication and recovery records, and session tokens. CREATE SOMETHING Identity processes
        sign-in credentials and stores password hashes. Private receives the identity and session information
        needed to authorize access.
      </li>
      <li>
        <strong>Creator admission:</strong> display name, professional credentials and links, teaching-video
        URL, application revisions, decisions, review notes, and invitation sponsorship, recipient, expiry,
        and redemption records. These come from applicants, sponsors, and reviewers.
      </li>
      <li>
        <strong>Networks and content:</strong> network settings, membership email addresses and status,
        video files and metadata, packages and release documentation, access entitlements, and field notes.
        Information comes from creators, participants, and authorized workspace operators.
      </li>
      <li>
        <strong>Company support:</strong> the company and contact information, project needs, workspace
        participants, requests, status, and updates submitted during an engagement.
      </li>
      <li>
        <strong>Commerce, where enabled:</strong> buyer and seller identifiers, email, selected release
        or subscription, amount, currency, payment-provider references, and payment, refund, dispute,
        and payout-readiness status. Stripe collects payment instruments and any verification information
        required for its services.
      </li>
      <li>
        <strong>Operations and measurement:</strong> access receipts, playback-grant records, aggregate
        engagement and delivery counts, errors, and administrator-support audit records. Our infrastructure
        also processes request information such as IP addresses, browser information, and timestamps for
        delivery, rate limiting, and security.
      </li>
    </ul>
    <p>
      Do not include passwords, API keys, unrelated personal records, or client information you lack
      permission to share in applications, videos, assets, or support requests. A professional
      credential submission is not a request for a government identity document.
    </p>
  </section>
  <section id="purposes">
    <h2>3. Why we use information</h2>
    <p>
      We use this information to verify accounts, review creators, issue and redeem invitations,
      manage memberships and free months, deliver authorized videos and releases, operate company
      support, reconcile payments where enabled, prevent abuse, resolve disputes, and respond to
      requests. Aggregate measurements help us understand whether onboarding and delivery work.
    </p>
    <p>
      We do not sell personal information or share it for cross-context behavioral advertising.
      Private does not install advertising pixels. We do not use private network content to train
      general-purpose AI models. Running an asset in an external agent or model service is a
      separate action under your control and that provider’s policies.
    </p>
    <p>
      Where a legal basis is required, we process information as necessary to provide the requested
      service, pursue legitimate operational and security interests, meet legal obligations, or act
      on consent where required. We do not treat acknowledging this policy as blanket consent for
      unrelated uses.
    </p>
  </section>
  <section id="access">
    <h2>4. Who can access information</h2>
    <p>
      <strong>Creators and participants:</strong> network owners manage their membership lists, content,
      and network reports. Participants can access material their current permissions or release entitlements
      allow. Reviewers can access applications and teaching-video links for admission decisions. Company-support
      participants and assigned approved partners can access the project information made available to
      their workspace.
    </p>
    <p>
      <strong>Public material:</strong> a creator can explicitly publish previews, listings, or field
      notes. Public visibility is different from private membership. A Descript or other externally hosted
      link follows that host’s sharing settings; submitting the link does not make an already public video
      private.
    </p>
    <p>
      <strong>Administrator assistance:</strong> authorized CREATE SOMETHING administrators may access
      information for operations, troubleshooting, security, and support. A read and write impersonation
      session is limited to 15 minutes and uses the target user’s permissions. It can make real workspace
      changes. Its audit records include administrator and target identifiers and emails, the reason,
      start and expiry or end times, request method and path, and response status. These request audits
      do not store request bodies, passwords, or URL query strings. Other service records may retain the
      content submitted through the underlying workflow.
    </p>
    <p>
      We may disclose information when legally required, to protect rights and security, or to
      service providers performing the functions below. Private access controls are not end-to-end
      encryption or a promise that authorized administrators and infrastructure providers cannot
      process content.
    </p>
  </section>
  <section id="providers">
    <h2>5. Service providers and external tools</h2>
    <ul>
      <li>
        <strong>Cloudflare:</strong> application hosting, databases, private package storage, video
        processing and signed delivery, traffic protection, and operational analytics. It processes
        content and request information to provide those services.
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer"
          >Cloudflare privacy policy</a
        >.
      </li>
      <li>
        <strong>Resend:</strong> verification and recovery email delivery used by CREATE SOMETHING
        Identity. This includes recipient addresses, message contents, and delivery information.
        <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer"
          >Resend privacy policy</a
        >.
      </li>
      <li>
        <strong>Stripe, when payment features are used:</strong> checkout, billing, connected seller
        or partner accounts, fraud prevention, refunds, disputes, and payouts. Private stores
        transaction references and status, rather than full card numbers or bank-login credentials.
        Stripe may also act under its own legal and regulatory obligations.
        <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer"
          >Stripe privacy policy</a
        >.
      </li>
    </ul>
    <p>
      Descript is an optional creator tool, not a requirement to use Private. Opening a Descript,
      repository, model-provider, or other external link sends a request to that provider and is
      subject to its privacy practices. Package permissions and installation instructions should
      explain external services a release uses. We do not control how a creator or external tool
      handles information outside Private.
    </p>
  </section>
  <section id="cookies">
    <h2>6. Cookies and measurement</h2>
    <p>
      Private uses secure, host-only cookies for sign-in, refresh, invitation continuity, and
      administrator support sessions. Access cookies last up to 15 minutes, refresh cookies up to
      seven days and may renew during use, invitation-continuity cookies up to 30 days, and
      support-session cookies up to 15 minutes. Signing out or ending a support session removes the
      corresponding active cookies. Cookie expiry is not deletion of the underlying account or audit
      records.
    </p>
    <p>
      Our first-party engagement endpoint stores daily counts of page categories and primary
      actions, rather than a person-by-person browsing history. This engagement measurement uses no
      analytics cookie and respects Do Not Track and Global Privacy Control signals. These signals
      do not disable essential sign-in, security logs, billing, access receipts, or
      authorized-delivery records.
    </p>
    <p>
      Network reports include membership and order counts, authorized playback grants, and
      package-delivery grants. A grant is not proof that someone finished watching, downloaded every
      byte, installed an asset, or demonstrated competence. Administrator-session browsing is
      excluded from client engagement reporting; operational actions and their audit records still
      exist.
    </p>
  </section>
  <section id="retention">
    <h2>7. Retention and deletion</h2>
    <p>
      We retain account, application, membership, content, entitlement, support, and audit records
      while needed to provide the service, preserve authorized release access, protect security,
      handle disputes, or meet legal obligations. Review history and expired or redeemed invitation
      records can remain after an application or invitation changes status. Payment and provider
      records may have separate legal retention requirements.
    </p>
    <p>
      The aggregate engagement and package-delivery tables use a 90-day cleanup window. Cleanup runs
      when those records are written; it is not a promise that every system record is erased at
      exactly 90 days. Playback events, security audits, account records, and provider logs are
      separate from those aggregates and do not share that automatic cleanup rule.
    </p>
    <p>
      Archiving a session or listing, revoking membership, and ending a subscription restrict
      availability but are not deletion requests. Contact us to request deletion. We review what can
      be removed, identify any information that must be retained, and respond under applicable law.
      Copies held by recipients, external video hosts, payment providers, or backups may require
      separate handling. We do not promise immediate erasure from every copy.
    </p>
  </section>
  <section id="choices">
    <h2>8. Your choices and rights</h2>
    <p>
      Email <a href="mailto:privacy@createsomething.io">privacy@createsomething.io</a> to request access,
      correction, deletion, or a portable copy of your personal information, or to raise a concern. Include
      your account email and relevant network; do not send your password or a government identity document.
      We may verify account control and ask for information proportionate to the request.
    </p>
    <p>
      Depending on your location and applicable law, you may also have rights to object to or
      restrict processing, withdraw consent where processing relies on it, appeal a decision about a
      privacy request, use an authorized agent, or complain to a regulator. We will respond within
      the period applicable to your request and explain any permitted limitation. Exercising a
      privacy right does not itself result in discriminatory treatment.
    </p>
    <p>
      Network owners can export supported network metadata. That export is not a complete
      personal-data export and does not include original video or package files. Contact us for
      broader requests. A creator may also need to handle information they independently control; we
      can help identify the appropriate contact.
    </p>
  </section>
  <section id="security">
    <h2>9. Security and international processing</h2>
    <p>
      We use authenticated access, current membership checks, private storage, signed video
      delivery, and audit records to protect the service. No system can guarantee absolute security.
      Tell us promptly if you suspect unauthorized access, and never share a sign-in or recovery
      link.
    </p>
    <p>
      CREATE SOMETHING and its providers may process information in the United States and other
      locations where the service operates. Private does not promise a particular data-residency
      region. Contact us before submitting project information that requires a specific residency,
      transfer safeguard, or regulated-data agreement.
    </p>
  </section>
  <section id="changes">
    <h2>10. Changes and contact</h2>
    <p>
      We will update the effective date when this policy changes and provide appropriate notice of
      material changes. We will seek consent where required before using previously collected
      information for a materially different purpose.
    </p>
    <p>
      Privacy requests: <a href="mailto:privacy@createsomething.io">privacy@createsomething.io</a>.
      Contract or content-rights questions:
      <a href="mailto:legal@createsomething.io">legal@createsomething.io</a>. See the
      <a href="/terms">Private Terms of Service</a> for participation and content rules.
    </p>
  </section>
</LegalPage>
