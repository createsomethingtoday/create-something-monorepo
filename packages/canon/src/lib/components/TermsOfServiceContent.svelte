<!--
  TermsOfServiceContent - Shared terms of service content for all CREATE SOMETHING properties

  Canon: Terms are a contract of mutual respect—clear, fair, accessible.

  Usage:
  <TermsOfServiceContent
    property="io"
    domain="createsomething.io"
    lastUpdated="January 29, 2026"
  />
-->
<script lang="ts">
  interface Props {
    /** Which CREATE SOMETHING property these terms are for */
    property: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
    /** The domain for this property */
    domain: string;
    /** Last updated date string */
    lastUpdated?: string;
    /** Contact email for legal inquiries */
    contactEmail?: string;
  }

  let {
    property,
    domain,
    lastUpdated = 'January 29, 2026',
    contactEmail = 'legal@createsomething.io'
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

<article class="terms-content">
  <!-- Agreement to Terms -->
  <section class="terms-section">
    <h2 class="section-title">1. Agreement to Terms</h2>
    <p class="body-text">
      These Terms of Service ("Terms") govern your access to and use of {propertyLabel}, located at <a href="https://{domain}" class="terms-link">{domain}</a> (the "Site"), and any related services provided by CREATE SOMETHING ("we," "us," or "our").
    </p>
    <p class="body-text">
      By accessing or using our Site, you agree to be bound by these Terms. If you disagree with any part of these Terms, you do not have permission to access the Site.
    </p>
  </section>

  <!-- Use of Our Service -->
  <section class="terms-section">
    <h2 class="section-title">2. Use of Our Service</h2>

    <h3 class="subsection-title">2.1 Eligibility</h3>
    <p class="body-text">
      You must be at least 13 years old to use our Site. By using our Site, you represent and warrant that you meet this age requirement.
    </p>

    <h3 class="subsection-title">2.2 License to Use</h3>
    <p class="body-text">
      We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use our Site for personal, non-commercial purposes, subject to these Terms.
    </p>

    <h3 class="subsection-title">2.3 Prohibited Uses</h3>
    <p class="body-text">You may not use our Site:</p>
    <ul class="terms-list">
      <li>In any way that violates any applicable law or regulation</li>
      <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
      <li>To impersonate or attempt to impersonate CREATE SOMETHING, our employees, another user, or any other person or entity</li>
      <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Site</li>
      <li>To use any robot, spider, or other automatic device to access the Site for any purpose without our express written permission</li>
      <li>To introduce any viruses, malware, or other harmful code</li>
      <li>To attempt to gain unauthorized access to any portion of the Site or any systems or networks connected to the Site</li>
    </ul>
  </section>

  <!-- Intellectual Property -->
  <section class="terms-section">
    <h2 class="section-title">3. Intellectual Property Rights</h2>

    <h3 class="subsection-title">3.1 Our Content</h3>
    <p class="body-text">
      The Site and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by CREATE SOMETHING, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
    </p>

    <h3 class="subsection-title">3.2 Limited Use of Content</h3>
    <p class="body-text">
      You may view, download for caching purposes only, and print pages from the Site for your own personal, non-commercial use, subject to the restrictions set out in these Terms.
    </p>
    <p class="body-text">You must not:</p>
    <ul class="terms-list">
      <li>Modify copies of any materials from this Site</li>
      <li>Use any illustrations, photographs, video or audio sequences, or any graphics separately from the accompanying text</li>
      <li>Delete or alter any copyright, trademark, or other proprietary rights notices</li>
      <li>Republish, redistribute, or make commercial use of any content without explicit permission</li>
    </ul>

    <h3 class="subsection-title">3.3 Code Examples and Tutorials</h3>
    <p class="body-text">
      Code examples and technical implementations described in our articles are provided for educational purposes. While you may use these examples in your own projects, we retain copyright on the original content and presentation. Attribution is appreciated but not required for code snippets.
    </p>

    <h3 class="subsection-title">3.4 Trademarks</h3>
    <p class="body-text">
      "CREATE SOMETHING" and any associated logos are trademarks of CREATE SOMETHING. You may not use these trademarks without our prior written permission.
    </p>
  </section>

  <!-- User Contributions -->
  <section class="terms-section">
    <h2 class="section-title">4. User Contributions</h2>

    <h3 class="subsection-title">4.1 General</h3>
    <p class="body-text">
      If you submit comments, suggestions, feedback, or other materials ("User Contributions"), you grant us a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such User Contributions in any media.
    </p>

    <h3 class="subsection-title">4.2 Representations</h3>
    <p class="body-text">You represent and warrant that:</p>
    <ul class="terms-list">
      <li>You own or control all rights to your User Contributions</li>
      <li>Your User Contributions do not violate the privacy rights, publicity rights, copyrights, or other rights of any third party</li>
      <li>Your User Contributions do not contain any defamatory, obscene, or otherwise unlawful material</li>
    </ul>
  </section>

  <!-- Newsletter -->
  <section class="terms-section">
    <h2 class="section-title">5. Newsletter and Communications</h2>
    <p class="body-text">
      By subscribing to our newsletter, you consent to receive periodic emails from us containing updates, articles, and other information related to our services. You may unsubscribe at any time by clicking the "unsubscribe" link in any newsletter email.
    </p>
  </section>

  <!-- Third-Party Links -->
  <section class="terms-section">
    <h2 class="section-title">6. Third-Party Links and Resources</h2>
    <p class="body-text">
      Our Site may contain links to third-party websites, applications, or resources ("Third-Party Resources"). These links are provided for your convenience only. We have no control over the content of these Third-Party Resources and accept no responsibility for them or for any loss or damage that may arise from your use of them.
    </p>
    <p class="body-text">
      Your use of Third-Party Resources is subject to the terms and conditions and privacy policies of those resources.
    </p>
  </section>

  <!-- Disclaimer of Warranties -->
  <section class="terms-section">
    <h2 class="section-title">7. Disclaimer of Warranties</h2>
    <div class="legal-notice">
      <p class="body-text">
        THE SITE AND ALL CONTENT, PRODUCTS, AND SERVICES INCLUDED ON OR OTHERWISE MADE AVAILABLE TO YOU THROUGH THE SITE ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, UNLESS OTHERWISE SPECIFIED IN WRITING.
      </p>
      <p class="body-text">
        WE MAKE NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, AS TO THE OPERATION OF THE SITE OR THE INFORMATION, CONTENT, PRODUCTS, OR SERVICES INCLUDED ON OR OTHERWISE MADE AVAILABLE THROUGH THE SITE, UNLESS OTHERWISE SPECIFIED IN WRITING.
      </p>
      <p class="body-text">
        TO THE FULL EXTENT PERMISSIBLE BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
      </p>
    </div>
    <p class="note-text">
      Note: Technical implementations and code examples in our articles are provided for educational purposes. We do not guarantee that code examples will work in all environments or for all use cases. Always test thoroughly and adapt to your specific needs.
    </p>
  </section>

  <!-- Limitation of Liability -->
  <section class="terms-section">
    <h2 class="section-title">8. Limitation of Liability</h2>
    <div class="legal-notice">
      <p class="body-text">
        TO THE FULLEST EXTENT PROVIDED BY LAW, IN NO EVENT WILL CREATE SOMETHING, ITS AFFILIATES, OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, AGENTS, OFFICERS, OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE, OR INABILITY TO USE, THE SITE, ANY WEBSITES LINKED TO IT, ANY CONTENT ON THE SITE OR SUCH OTHER WEBSITES, INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
      </p>
    </div>
    <p class="body-text">
      This includes, but is not limited to, damages for lost profits, loss of goodwill, work stoppage, computer failure or malfunction, loss of data, or any other commercial damages or losses, even if we have been advised of the possibility thereof.
    </p>
  </section>

  <!-- Indemnification -->
  <section class="terms-section">
    <h2 class="section-title">9. Indemnification</h2>
    <p class="body-text">
      You agree to defend, indemnify, and hold harmless CREATE SOMETHING and its affiliates, licensors, and service providers, and its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
    </p>
    <ul class="terms-list">
      <li>Your violation of these Terms</li>
      <li>Your use of the Site</li>
      <li>Your User Contributions</li>
      <li>Your violation of any rights of a third party</li>
    </ul>
  </section>

  <!-- Termination -->
  <section class="terms-section">
    <h2 class="section-title">10. Termination</h2>
    <p class="body-text">
      We may terminate or suspend your access to all or part of the Site, without prior notice or liability, for any reason, including if you breach these Terms.
    </p>
    <p class="body-text">
      Upon termination, your right to use the Site will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
    </p>
  </section>

  <!-- Governing Law -->
  <section class="terms-section">
    <h2 class="section-title">11. Governing Law and Jurisdiction</h2>
    <p class="body-text">
      These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
    </p>
    <p class="body-text">
      You agree that any legal action or proceeding between you and CREATE SOMETHING for any purpose concerning these Terms or the parties' obligations hereunder shall be brought exclusively in a court of competent jurisdiction sitting in the United States.
    </p>
  </section>

  <!-- Dispute Resolution -->
  <section class="terms-section">
    <h2 class="section-title">12. Dispute Resolution</h2>

    <h3 class="subsection-title">12.1 Informal Resolution</h3>
    <p class="body-text">
      In the event of any dispute, claim, or controversy arising out of or relating to these Terms, we encourage you to first contact us at <a href="mailto:{contactEmail}" class="terms-link">{contactEmail}</a> to seek informal resolution.
    </p>

    <h3 class="subsection-title">12.2 Binding Arbitration</h3>
    <p class="body-text">
      If we cannot resolve a dispute informally, any remaining dispute shall be resolved by binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in the United States.
    </p>

    <h3 class="subsection-title">12.3 Class Action Waiver</h3>
    <p class="body-text">
      You and CREATE SOMETHING agree that each may bring claims against the other only in your or its individual capacity and not as a plaintiff or class member in any purported class or representative proceeding.
    </p>
  </section>

  <!-- Changes to Terms -->
  <section class="terms-section">
    <h2 class="section-title">13. Changes to Terms</h2>
    <p class="body-text">
      We may revise and update these Terms from time to time at our sole discretion. All changes are effective immediately when we post them and apply to all access to and use of the Site thereafter.
    </p>
    <p class="body-text">
      Your continued use of the Site following the posting of revised Terms means that you accept and agree to the changes. You are expected to check this page frequently so you are aware of any changes, as they are binding on you.
    </p>
  </section>

  <!-- Entire Agreement -->
  <section class="terms-section">
    <h2 class="section-title">14. Entire Agreement</h2>
    <p class="body-text">
      These Terms, our Privacy Policy, and any other policies or guidelines posted on the Site constitute the sole and entire agreement between you and CREATE SOMETHING regarding the Site and supersede all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, regarding the Site.
    </p>
  </section>

  <!-- Severability -->
  <section class="terms-section">
    <h2 class="section-title">15. Severability and Waiver</h2>

    <h3 class="subsection-title">15.1 Severability</h3>
    <p class="body-text">
      If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
    </p>

    <h3 class="subsection-title">15.2 Waiver</h3>
    <p class="body-text">
      No waiver by CREATE SOMETHING of any term or condition set out in these Terms shall be deemed a further or continuing waiver of such term or condition or a waiver of any other term or condition.
    </p>
  </section>

  <!-- Contact -->
  <section class="terms-section">
    <h2 class="section-title">16. Contact Us</h2>
    <p class="body-text">
      If you have any questions about these Terms of Service, please contact us:
    </p>

    <div class="contact-info">
      <p>
        <strong class="contact-label">Email:</strong>
        <a href="mailto:{contactEmail}" class="terms-link">{contactEmail}</a>
      </p>
      <p>
        <strong class="contact-label">Website:</strong>
        <a href="https://{domain}/contact" class="terms-link">{domain}/contact</a>
      </p>
    </div>
  </section>

  <!-- Acknowledgment -->
  <section class="acknowledgment">
    <p>
      By using {domain}, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
    </p>
    <p class="last-updated">
      Last updated: {lastUpdated}
    </p>
  </section>
</article>

<style>
  .terms-content {
    max-width: 100%;
  }

  .terms-section {
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

  .terms-list {
    list-style: disc;
    list-style-position: inside;
    margin-left: var(--space-sm);
    margin-bottom: var(--space-sm);
    color: var(--color-fg-secondary);
  }

  .terms-list li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .terms-link {
    color: var(--color-fg-primary);
    text-decoration: none;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .terms-link:hover {
    text-decoration: underline;
  }

  /* Legal notice blocks (warranties, liability) */
  .legal-notice {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    margin: var(--space-md) 0;
  }

  .legal-notice .body-text {
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-sm);
  }

  .legal-notice .body-text:last-child {
    margin-bottom: 0;
  }

  .note-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    font-style: italic;
    margin-top: var(--space-sm);
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

  .last-updated {
    margin-top: var(--space-sm);
    font-style: italic;
  }
</style>
