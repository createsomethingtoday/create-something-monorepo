import { aa as ensure_array_like, a6 as escape_html } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
function _page($$renderer) {
  const layers = [
    {
      title: "Identity",
      text: "Auth0 provides the user identity boundary. Portable bearer tokens are issued by .agency, not exported directly from Auth0."
    },
    {
      title: "Authorization",
      text: "Every request is checked against organization membership, service entitlements, policy acceptance, contract status, and billing state."
    },
    {
      title: "Secrets",
      text: "System-side runtime secrets remain in managed secret infrastructure such as Infisical. User bearer tokens are treated as high-trust credentials and protected separately."
    },
    {
      title: "Operations",
      text: "Revocation, regeneration, audit logs, anomaly review, and rate controls are part of the standing operating model, not optional support procedures."
    }
  ];
  SEO($$renderer, {
    title: "Security",
    description: "How CREATE SOMETHING .agency manages identity, bearer-token governance, entitlement checks, secrets, and operational controls for production automation.",
    propertyName: "agency"
  });
  $$renderer.push(`<!----> <section class="hero pt-32 pb-16 px-6"><div class="shell-inner"><div class="eyebrow animate-reveal svelte-4rm2pb">Trust Surface</div> <div class="copy animate-reveal svelte-4rm2pb"><h1 class="page-title svelte-4rm2pb">Security</h1> <p class="lede svelte-4rm2pb">\`.agency\` is designed around identity separation, live authorization, controlled secret handling,
        and operational revocation. The point is not just to issue credentials. The point is to keep
        automation governable after credentials exist.</p> <p class="date-text svelte-4rm2pb">Last updated: March 6, 2026</p></div></div></section> <section class="pb-24 px-6"><div class="shell-inner security-grid svelte-4rm2pb"><!--[-->`);
  const each_array = ensure_array_like(layers);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let layer = each_array[$$index];
    $$renderer.push(`<article class="security-card svelte-4rm2pb"><h2 class="svelte-4rm2pb">${escape_html(layer.title)}</h2> <p class="svelte-4rm2pb">${escape_html(layer.text)}</p></article>`);
  }
  $$renderer.push(`<!--]--> <article class="security-card full-span svelte-4rm2pb"><h2 class="svelte-4rm2pb">Bearer Token Risk Management</h2> <p class="svelte-4rm2pb">\`.agency\` supports one long-lived bearer token per authenticated user. This simplicity is balanced
        by compensating controls: opaque token format, protected server-side storage, request-time
        entitlement enforcement, immediate revoke and regenerate paths, and auditability for both issuance
        and downstream use.</p> <p class="svelte-4rm2pb">If a token is suspected to be compromised, CREATE SOMETHING may revoke it immediately and require
        re-issuance before further host or agent access is restored.</p></article> <article class="security-card full-span svelte-4rm2pb"><h2 class="svelte-4rm2pb">Commercial and Legal Gating</h2> <p class="svelte-4rm2pb">Access is not determined by token validity alone. \`.agency\` may deny access where contract status,
        required policy acceptance, or billing standing is not current, even if a token has not expired.
        This keeps legal and commercial state inside the access decision rather than leaving it as a
        disconnected back-office concern.</p> <p class="svelte-4rm2pb">For security inquiries, contact <a href="mailto:legal@createsomething.io" class="svelte-4rm2pb">legal@createsomething.io</a>.</p></article></div></section>`);
}
export {
  _page as default
};
