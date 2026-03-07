import { S as SEO } from "../../../chunks/SEO.js";
import { a6 as escape_html, a4 as attr, a8 as stringify } from "../../../chunks/index.js";
function TermsOfServiceContent($$renderer, $$props) {
  let {
    property,
    domain,
    lastUpdated = "January 29, 2026",
    contactEmail = "legal@createsomething.io"
  } = $$props;
  const propertyLabels = {
    io: "createsomething.io (Research)",
    space: "createsomething.space (Practice)",
    agency: "createsomething.agency (Services)",
    ltd: "createsomething.ltd (Philosophy)",
    lms: "learn.createsomething.space (Learning)"
  };
  const propertyLabel = propertyLabels[property];
  $$renderer.push(`<article class="terms-content svelte-10rtg1t"><section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">1. Agreement to Terms</h2> <p class="body-text svelte-10rtg1t">These Terms of Service ("Terms") govern your access to and use of ${escape_html(propertyLabel)}, located at <a${attr("href", `https://${stringify(domain)}`)} class="terms-link svelte-10rtg1t">${escape_html(domain)}</a> (the "Site"), and any related services
      provided by CREATE SOMETHING ("we," "us," or "our").</p> <p class="body-text svelte-10rtg1t">By accessing or using our Site, you agree to be bound by these Terms. If you disagree with any
      part of these Terms, you do not have permission to access the Site.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">2. Use of Our Service</h2> <h3 class="subsection-title svelte-10rtg1t">2.1 Eligibility</h3> <p class="body-text svelte-10rtg1t">You must be at least 13 years old to use our Site. By using our Site, you represent and
      warrant that you meet this age requirement.</p> <h3 class="subsection-title svelte-10rtg1t">2.2 License to Use</h3> <p class="body-text svelte-10rtg1t">We grant you a limited, non-exclusive, non-transferable, and revocable license to access and
      use our Site for personal, non-commercial purposes, subject to these Terms.</p> <h3 class="subsection-title svelte-10rtg1t">2.3 Prohibited Uses</h3> <p class="body-text svelte-10rtg1t">You may not use our Site:</p> <ul class="terms-list svelte-10rtg1t"><li class="svelte-10rtg1t">In any way that violates any applicable law or regulation</li> <li class="svelte-10rtg1t">To transmit, or procure the sending of, any advertising or promotional material without our
        prior written consent</li> <li class="svelte-10rtg1t">To impersonate or attempt to impersonate CREATE SOMETHING, our employees, another user, or
        any other person or entity</li> <li class="svelte-10rtg1t">To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Site</li> <li class="svelte-10rtg1t">To use any robot, spider, or other automatic device to access the Site for any purpose
        without our express written permission</li> <li class="svelte-10rtg1t">To introduce any viruses, malware, or other harmful code</li> <li class="svelte-10rtg1t">To attempt to gain unauthorized access to any portion of the Site or any systems or networks
        connected to the Site</li></ul></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">3. Intellectual Property Rights</h2> <h3 class="subsection-title svelte-10rtg1t">3.1 Our Content</h3> <p class="body-text svelte-10rtg1t">The Site and its entire contents, features, and functionality (including but not limited to
      all information, software, text, displays, images, video, and audio, and the design,
      selection, and arrangement thereof) are owned by CREATE SOMETHING, its licensors, or other
      providers of such material and are protected by United States and international copyright,
      trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p> <h3 class="subsection-title svelte-10rtg1t">3.2 Limited Use of Content</h3> <p class="body-text svelte-10rtg1t">You may view, download for caching purposes only, and print pages from the Site for your own
      personal, non-commercial use, subject to the restrictions set out in these Terms.</p> <p class="body-text svelte-10rtg1t">You must not:</p> <ul class="terms-list svelte-10rtg1t"><li class="svelte-10rtg1t">Modify copies of any materials from this Site</li> <li class="svelte-10rtg1t">Use any illustrations, photographs, video or audio sequences, or any graphics separately
        from the accompanying text</li> <li class="svelte-10rtg1t">Delete or alter any copyright, trademark, or other proprietary rights notices</li> <li class="svelte-10rtg1t">Republish, redistribute, or make commercial use of any content without explicit permission</li></ul> <h3 class="subsection-title svelte-10rtg1t">3.3 Code Examples and Tutorials</h3> <p class="body-text svelte-10rtg1t">Code examples and technical implementations described in our articles are provided for
      educational purposes. While you may use these examples in your own projects, we retain
      copyright on the original content and presentation. Attribution is appreciated but not
      required for code snippets.</p> <h3 class="subsection-title svelte-10rtg1t">3.4 Trademarks</h3> <p class="body-text svelte-10rtg1t">"CREATE SOMETHING" and any associated logos are trademarks of CREATE SOMETHING. You may not
      use these trademarks without our prior written permission.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">4. User Contributions</h2> <h3 class="subsection-title svelte-10rtg1t">4.1 General</h3> <p class="body-text svelte-10rtg1t">If you submit comments, suggestions, feedback, or other materials ("User Contributions"), you
      grant us a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use,
      reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and
      display such User Contributions in any media.</p> <h3 class="subsection-title svelte-10rtg1t">4.2 Representations</h3> <p class="body-text svelte-10rtg1t">You represent and warrant that:</p> <ul class="terms-list svelte-10rtg1t"><li class="svelte-10rtg1t">You own or control all rights to your User Contributions</li> <li class="svelte-10rtg1t">Your User Contributions do not violate the privacy rights, publicity rights, copyrights, or
        other rights of any third party</li> <li class="svelte-10rtg1t">Your User Contributions do not contain any defamatory, obscene, or otherwise unlawful
        material</li></ul></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">5. Newsletter and Communications</h2> <p class="body-text svelte-10rtg1t">By subscribing to our newsletter, you consent to receive periodic emails from us containing
      updates, articles, and other information related to our services. You may unsubscribe at any
      time by clicking the "unsubscribe" link in any newsletter email.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">6. Third-Party Links and Resources</h2> <p class="body-text svelte-10rtg1t">Our Site may contain links to third-party websites, applications, or resources ("Third-Party
      Resources"). These links are provided for your convenience only. We have no control over the
      content of these Third-Party Resources and accept no responsibility for them or for any loss
      or damage that may arise from your use of them.</p> <p class="body-text svelte-10rtg1t">Your use of Third-Party Resources is subject to the terms and conditions and privacy policies
      of those resources.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">7. Disclaimer of Warranties</h2> <div class="legal-notice svelte-10rtg1t"><p class="body-text svelte-10rtg1t">THE SITE AND ALL CONTENT, PRODUCTS, AND SERVICES INCLUDED ON OR OTHERWISE MADE AVAILABLE TO
        YOU THROUGH THE SITE ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, UNLESS OTHERWISE
        SPECIFIED IN WRITING.</p> <p class="body-text svelte-10rtg1t">WE MAKE NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, AS TO THE
        OPERATION OF THE SITE OR THE INFORMATION, CONTENT, PRODUCTS, OR SERVICES INCLUDED ON OR
        OTHERWISE MADE AVAILABLE THROUGH THE SITE, UNLESS OTHERWISE SPECIFIED IN WRITING.</p> <p class="body-text svelte-10rtg1t">TO THE FULL EXTENT PERMISSIBLE BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR
        IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
        FOR A PARTICULAR PURPOSE.</p></div> <p class="note-text svelte-10rtg1t">Note: Technical implementations and code examples in our articles are provided for educational
      purposes. We do not guarantee that code examples will work in all environments or for all use
      cases. Always test thoroughly and adapt to your specific needs.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">8. Limitation of Liability</h2> <div class="legal-notice svelte-10rtg1t"><p class="body-text svelte-10rtg1t">TO THE FULLEST EXTENT PROVIDED BY LAW, IN NO EVENT WILL CREATE SOMETHING, ITS AFFILIATES, OR
        THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, AGENTS, OFFICERS, OR DIRECTORS BE LIABLE FOR
        DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE,
        OR INABILITY TO USE, THE SITE, ANY WEBSITES LINKED TO IT, ANY CONTENT ON THE SITE OR SUCH
        OTHER WEBSITES, INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR
        PUNITIVE DAMAGES.</p></div> <p class="body-text svelte-10rtg1t">This includes, but is not limited to, damages for lost profits, loss of goodwill, work
      stoppage, computer failure or malfunction, loss of data, or any other commercial damages or
      losses, even if we have been advised of the possibility thereof.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">9. Indemnification</h2> <p class="body-text svelte-10rtg1t">You agree to defend, indemnify, and hold harmless CREATE SOMETHING and its affiliates,
      licensors, and service providers, and its and their respective officers, directors, employees,
      contractors, agents, licensors, suppliers, successors, and assigns from and against any
      claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including
      reasonable attorneys' fees) arising out of or relating to:</p> <ul class="terms-list svelte-10rtg1t"><li class="svelte-10rtg1t">Your violation of these Terms</li> <li class="svelte-10rtg1t">Your use of the Site</li> <li class="svelte-10rtg1t">Your User Contributions</li> <li class="svelte-10rtg1t">Your violation of any rights of a third party</li></ul></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">10. Termination</h2> <p class="body-text svelte-10rtg1t">We may terminate or suspend your access to all or part of the Site, without prior notice or
      liability, for any reason, including if you breach these Terms.</p> <p class="body-text svelte-10rtg1t">Upon termination, your right to use the Site will immediately cease. All provisions of these
      Terms which by their nature should survive termination shall survive, including, without
      limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of
      liability.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">11. Governing Law and Jurisdiction</h2> <p class="body-text svelte-10rtg1t">These Terms shall be governed by and construed in accordance with the laws of the United
      States, without regard to its conflict of law provisions.</p> <p class="body-text svelte-10rtg1t">You agree that any legal action or proceeding between you and CREATE SOMETHING for any purpose
      concerning these Terms or the parties' obligations hereunder shall be brought exclusively in a
      court of competent jurisdiction sitting in the United States.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">12. Dispute Resolution</h2> <h3 class="subsection-title svelte-10rtg1t">12.1 Informal Resolution</h3> <p class="body-text svelte-10rtg1t">In the event of any dispute, claim, or controversy arising out of or relating to these Terms,
      we encourage you to first contact us at <a${attr("href", `mailto:${stringify(contactEmail)}`)} class="terms-link svelte-10rtg1t">${escape_html(contactEmail)}</a> to seek informal resolution.</p> <h3 class="subsection-title svelte-10rtg1t">12.2 Binding Arbitration</h3> <p class="body-text svelte-10rtg1t">If we cannot resolve a dispute informally, any remaining dispute shall be resolved by binding
      arbitration in accordance with the rules of the American Arbitration Association. The
      arbitration shall take place in the United States.</p> <h3 class="subsection-title svelte-10rtg1t">12.3 Class Action Waiver</h3> <p class="body-text svelte-10rtg1t">You and CREATE SOMETHING agree that each may bring claims against the other only in your or
      its individual capacity and not as a plaintiff or class member in any purported class or
      representative proceeding.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">13. Changes to Terms</h2> <p class="body-text svelte-10rtg1t">We may revise and update these Terms from time to time at our sole discretion. All changes are
      effective immediately when we post them and apply to all access to and use of the Site
      thereafter.</p> <p class="body-text svelte-10rtg1t">Your continued use of the Site following the posting of revised Terms means that you accept
      and agree to the changes. You are expected to check this page frequently so you are aware of
      any changes, as they are binding on you.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">14. Entire Agreement</h2> <p class="body-text svelte-10rtg1t">These Terms, our Privacy Policy, and any other policies or guidelines posted on the Site
      constitute the sole and entire agreement between you and CREATE SOMETHING regarding the Site
      and supersede all prior and contemporaneous understandings, agreements, representations, and
      warranties, both written and oral, regarding the Site.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">15. Severability and Waiver</h2> <h3 class="subsection-title svelte-10rtg1t">15.1 Severability</h3> <p class="body-text svelte-10rtg1t">If any provision of these Terms is held to be invalid, illegal, or unenforceable, the
      remaining provisions shall continue in full force and effect.</p> <h3 class="subsection-title svelte-10rtg1t">15.2 Waiver</h3> <p class="body-text svelte-10rtg1t">No waiver by CREATE SOMETHING of any term or condition set out in these Terms shall be deemed
      a further or continuing waiver of such term or condition or a waiver of any other term or
      condition.</p></section> <section class="terms-section svelte-10rtg1t"><h2 class="section-title svelte-10rtg1t">16. Contact Us</h2> <p class="body-text svelte-10rtg1t">If you have any questions about these Terms of Service, please contact us:</p> <div class="contact-info svelte-10rtg1t"><p class="svelte-10rtg1t"><strong class="contact-label svelte-10rtg1t">Email:</strong> <a${attr("href", `mailto:${stringify(contactEmail)}`)} class="terms-link svelte-10rtg1t">${escape_html(contactEmail)}</a></p> <p class="svelte-10rtg1t"><strong class="contact-label svelte-10rtg1t">Website:</strong> <a${attr("href", `https://${stringify(domain)}/contact`)} class="terms-link svelte-10rtg1t">${escape_html(domain)}/contact</a></p></div></section> <section class="acknowledgment svelte-10rtg1t"><p class="svelte-10rtg1t">By using ${escape_html(domain)}, you acknowledge that you have read, understood, and agree to be bound by
      these Terms of Service.</p> <p class="last-updated svelte-10rtg1t">Last updated: ${escape_html(lastUpdated)}</p></section></article>`);
}
function _page($$renderer) {
  SEO($$renderer, {
    title: "Terms of Service",
    description: "Terms of Service for CREATE SOMETHING AGENCY. Read our terms governing your use of our website and services.",
    propertyName: "agency",
    noindex: true
  });
  $$renderer.push(`<!----> <section class="pt-32 pb-16 px-6"><div class="shell-inner"><div class="space-y-6 animate-reveal svelte-1e0rsuc"><h1 class="page-title svelte-1e0rsuc">Terms of Service</h1> <p class="date-text svelte-1e0rsuc">Last updated: January 29, 2026</p></div></div></section> <section class="pb-24 px-6"><div class="shell-inner">`);
  TermsOfServiceContent($$renderer, {
    property: "agency",
    domain: "createsomething.agency",
    lastUpdated: "January 29, 2026",
    contactEmail: "legal@createsomething.io"
  });
  $$renderer.push(`<!----></div></section>`);
}
export {
  _page as default
};
