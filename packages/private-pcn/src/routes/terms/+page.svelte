<script lang="ts">
  import LegalPage from '$lib/components/LegalPage.svelte';
  const sections = [
    { id: 'scope', title: 'Using Private' },
    { id: 'admission', title: 'Creator admission' },
    { id: 'ownership', title: 'Content and ownership' },
    { id: 'assets', title: 'Assets and licenses' },
    { id: 'billing', title: 'Trials and payments' },
    { id: 'support', title: 'Company support' },
    { id: 'conduct', title: 'Responsible use' },
    { id: 'administration', title: 'Administrator access' },
    { id: 'availability', title: 'Availability and responsibility' },
    { id: 'ending', title: 'Ending access' },
    { id: 'changes', title: 'Changes and contact' }
  ];
</script>

<LegalPage
  title="Terms of Service"
  description="The agreement for learning, publishing, and sharing agentic engineering practice through CREATE SOMETHING Private."
  {sections}
>
  <section id="scope">
    <h2>1. Using Private</h2>
    <p>
      These terms govern CREATE SOMETHING Private at <strong>private.createsomething.agency</strong
      >, including its creator networks, technical sessions, downloadable assets, and
      company-support workspaces. CREATE SOMETHING operates the platform (“we,” “us”). These are the
      terms for Private, rather than the general terms for our agency website.
    </p>
    <p>
      By creating an account or using Private, you agree to these terms. You must be at least 18 and
      able to enter this agreement. If you act for an organization, you must have authority to bind
      it. Keep your account information accurate and protect your sign-in credentials. Access uses
      CREATE SOMETHING Identity; an Identity account alone does not grant membership or creator
      approval.
    </p>
    <p>
      Our <a href="/privacy">Privacy Policy</a> explains how the service handles information. A separate
      signed agreement controls where it expressly changes these terms for an engagement. A creator’s
      release license controls your permitted use of that release, but does not override platform access
      or security requirements.
    </p>
  </section>
  <section id="admission">
    <h2>2. Creator admission</h2>
    <p>
      Creators must be approved before activating a network. An invitation does not bypass review:
      applicants submit professional credentials and a video teaching an agentic engineering
      technique. Submit accurate information and material you have permission to share. Reviewers
      may request more evidence, decline an application, or suspend approval when the practice or
      conduct no longer meets the service’s requirements.
    </p>
    <p>
      Approval is permission to participate, not certification of every technique, security claim,
      asset, or professional qualification. Approval to teach does not make a creator an approved
      company-support partner.
    </p>
  </section>
  <section id="ownership">
    <h2>3. Your content stays yours</h2>
    <p>
      You retain ownership of your videos, code, MCP servers, agent plugins, skills, documentation,
      and other submissions. You grant us a non-exclusive license to store, process, transcode,
      reproduce, and deliver that material as needed to operate Private, provide support, and honor
      the access or release licenses you authorize. This does not transfer ownership or give us a
      general right to advertise using private client work.
    </p>
    <p>
      You must have the rights and permissions needed for your content, including from employers,
      clients, collaborators, and people shown in recordings. Remove credentials and information you
      are not authorized to disclose. Respect third-party and open-source licenses.
    </p>
    <p>
      Network owners choose memberships and publication settings. Public previews and public field
      notes may be visible outside a network; external video links retain the sharing settings of
      their hosting service. Archiving a listing does not necessarily remove copies already
      downloaded or revoke an existing release license.
    </p>
  </section>
  <section id="assets">
    <h2>4. Assets and release licenses</h2>
    <p>
      Creators are responsible for their descriptions, prices, compatibility claims, permissions,
      licenses, installation instructions, and support and refund policies. Review these details
      before acquiring a package. Your entitlement is to the selected release; it does not
      automatically include future versions, network membership, team seats, resale, or
      redistribution.
    </p>
    <p>
      Private stores and delivers packages; it does not execute them for you or certify that they
      are safe. Before running an MCP server, plugin, skill, or workflow, inspect its permissions
      and dependencies, test it in an appropriate environment, and decide what access to grant.
      External runtimes, model providers, and tools have their own terms and charges.
    </p>
    <p>
      Contact the creator using the release’s support details about compatibility or a refund.
      Contact us about platform access or suspected abuse. Nothing in a creator’s policy or these
      terms removes mandatory consumer rights. A refund, dispute, or license violation may affect
      future access to a release.
    </p>
  </section>
  <section id="billing">
    <h2>5. Free months, subscriptions, and payments</h2>
    <p>
      An approved creator who redeems an eligible creator invitation may activate <strong
        >one calendar month of free hosting on one eligible draft network</strong
      >. The month begins on activation, cannot be moved or restarted by retrying, and does not
      apply to company support. It does not automatically convert into a paid subscription. After it
      ends, continued hosted access requires an available paid plan; you must explicitly subscribe.
    </p>
    <p>
      Paid features are available only when enabled. A price mentioned in these terms is not an
      invitation to pay through a disabled feature. Where checkout is available, it shows the price,
      currency, billing interval, and applicable taxes before you confirm. Recurring subscriptions
      renew according to the checkout terms until canceled; use the billing controls or contact us
      if they are unavailable. Cancellation stops future renewal and does not itself create a
      refund.
    </p>
    <p>
      Approved creators set their own asset prices. Creator purchases are distinct from
      network-hosting subscriptions. Stripe processes payments and, where applicable, seller
      verification and payouts. Applicable processing fees, taxes, disputes, and refund obligations
      are governed by the checkout, Stripe terms, and relevant seller or partner agreement. We do
      not promise a particular net payout beyond that agreement.
    </p>
  </section>
  <section id="support">
    <h2>6. Private support for companies</h2>
    <p>
      The CREATE SOMETHING company-support subscription is <strong>USD $900 per month</strong> when
      available. Only separately approved CREATE SOMETHING partners may offer it. The
      <strong>95% partner / 5% CREATE SOMETHING allocation applies only to this program</strong>; it
      is not the commission for creator assets or other creator services.
    </p>
    <p>
      The accepted engagement defines the project, participants, deliverables, access, and any
      response commitments. A subscription alone is not a promise of unlimited implementation, a
      production deployment, a service-level agreement, or a particular business outcome. Provide
      only project information you are authorized to share. Any special confidentiality,
      regulated-data, security, or data-processing requirements must be agreed before that
      information is provided.
    </p>
  </section>
  <section id="conduct">
    <h2>7. Responsible engineering and participation</h2>
    <p>
      Do not use Private to distribute malware or stolen material, expose secrets, impersonate
      someone, harass participants, misrepresent credentials, bypass review or access controls, or
      access systems without authorization. Do not redistribute private sessions or packages beyond
      their licenses. Automated tools must respect authorization, rate limits, and the rights of
      other participants.
    </p>
    <p>
      Creators must explain material permissions and risks honestly. Educational examples and
      agent-generated outputs require judgment and testing; they are not a substitute for the review
      required by your deployment or organization.
    </p>
  </section>
  <section id="administration">
    <h2>8. Administrator support access</h2>
    <p>
      Authorized CREATE SOMETHING administrators can open a time-limited read and write support
      session in a user’s workspace to troubleshoot or assist with setup and content. These sessions
      last up to 15 minutes and can make real changes within the user’s permissions. We record the
      administrator, target account, reason, and requests for accountability.
    </p>
    <p>
      Support sessions do not reveal the user’s password or remove creator-review requirements.
      Payment, seller-account, credential, review-decision, and company-support agreement actions
      are restricted. This operational access is described further in the <a href="/privacy#access"
        >Privacy Policy</a
      >.
    </p>
  </section>
  <section id="availability">
    <h2>9. Availability and responsibility</h2>
    <p>
      Except for commitments expressly made in a separate agreement or required by law, Private and
      creator materials are provided as available, without a guarantee of uninterrupted service,
      compatibility, security certification, or a particular result. Keep your own source files and
      backups. Private is not a permanent archive.
    </p>
    <p>
      To the extent permitted by applicable law, we disclaim implied warranties of merchantability
      and fitness for a particular purpose and are not responsible for indirect or consequential
      losses arising from use of Private. These limits do not exclude obligations or liability that
      applicable law does not allow us to exclude, or override an express written commitment.
    </p>
  </section>
  <section id="ending">
    <h2>10. Ending or restricting access</h2>
    <p>
      You may stop using Private and request account closure. Network owners can revoke membership.
      We may restrict content, approval, or access to address violations, security risks, legal
      requirements, or unpaid service. Where practical and appropriate, we will explain the reason
      and provide a way to contact us for review; urgent restrictions may take effect first.
    </p>
    <p>
      Ending access does not erase payment obligations, valid release-license terms, or records
      needed for security, disputes, or legal obligations. Archiving is not deletion. Network export
      covers supported metadata; retain your original videos and packages separately. Contact us for
      account or content deletion requests.
    </p>
  </section>
  <section id="changes">
    <h2>11. Changes and contact</h2>
    <p>
      We will date revisions and give notice of material changes through the service or appropriate
      account communications. Where required, we will obtain agreement before a change applies.
      Changes do not retroactively broaden a creator’s release license or our use of private
      content.
    </p>
    <p>
      For questions, access disputes, or content-rights complaints, email <a
        href="mailto:legal@createsomething.io">legal@createsomething.io</a
      >. Include the relevant network or release and a description of the issue; do not send
      passwords, API keys, or unnecessary confidential material. Applicable law and mandatory
      consumer protections govern any rights that cannot be changed by this agreement.
    </p>
  </section>
</LegalPage>
