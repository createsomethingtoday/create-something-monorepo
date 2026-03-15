import { aa as ensure_array_like, a6 as escape_html } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
function _page($$renderer) {
  const controls = [
    "One active bearer token per authenticated user",
    "Long-lived token issued by .agency, not raw Auth0 access tokens",
    "Immediate revoke and regenerate controls",
    "Live checks for org membership, policy acceptance, contract status, billing status, and service entitlement",
    "Opaque token format with protected server-side storage",
    "Audit logs for issuance, regeneration, revocation, and request-time authorization"
  ];
  const responsibilities = [
    "Do not share the token with another person or team.",
    "Store the token in a secure secret manager or equivalent controlled environment.",
    "Regenerate or revoke the token immediately if compromise is suspected.",
    "Expect access to stop if the user or organization is no longer in good standing.",
    "Understand that regeneration invalidates the prior token immediately."
  ];
  SEO($$renderer, {
    title: "Bearer Token Policy",
    description: "The bearer token policy for CREATE SOMETHING .agency. One long-lived token per user, live entitlement checks, revocation, audit controls, and legal/commercial enforcement.",
    propertyName: "agency"
  });
  $$renderer.push(`<!----> <section class="hero pt-32 pb-16 px-6 svelte-1pr5mit"><div class="shell-inner"><div class="eyebrow animate-reveal svelte-1pr5mit">Trust Surface</div> <div class="copy animate-reveal svelte-1pr5mit"><h1 class="page-title svelte-1pr5mit">Bearer Token Policy</h1> <p class="lede svelte-1pr5mit">\`.agency\` issues one long-lived bearer token per authenticated user for use in approved hosts,
        local tools, and background agents. The token is portable. The authorization is conditional.</p> <p class="date-text svelte-1pr5mit">Effective date: March 6, 2026</p></div></div></section> <section class="pb-24 px-6"><div class="shell-inner policy-grid svelte-1pr5mit"><article class="policy-card svelte-1pr5mit"><h2 class="svelte-1pr5mit">Core Rule</h2> <p class="svelte-1pr5mit">Each bearer token is personal to one authenticated user, governed by \`.agency\`, and continuously
        checked against current organization, legal, policy, and billing state. A valid token does not
        guarantee access unless the user and organization remain in good standing at the time of each request.</p></article> <article class="policy-card svelte-1pr5mit"><h2 class="svelte-1pr5mit">Control Model</h2> <ul class="svelte-1pr5mit"><!--[-->`);
  const each_array = ensure_array_like(controls);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let control = each_array[$$index];
    $$renderer.push(`<li class="svelte-1pr5mit">${escape_html(control)}</li>`);
  }
  $$renderer.push(`<!--]--></ul></article> <article class="policy-card svelte-1pr5mit"><h2 class="svelte-1pr5mit">Prohibited Use</h2> <ul class="svelte-1pr5mit"><li class="svelte-1pr5mit">Shared team tokens</li> <li class="svelte-1pr5mit">Public repositories or uncontrolled environments</li> <li class="svelte-1pr5mit">Bypassing contract, payment, or policy requirements</li> <li class="svelte-1pr5mit">Continued use after suspected exposure</li></ul></article> <article class="policy-card svelte-1pr5mit"><h2 class="svelte-1pr5mit">User Responsibilities</h2> <ul class="svelte-1pr5mit"><!--[-->`);
  const each_array_1 = ensure_array_like(responsibilities);
  for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
    let responsibility = each_array_1[$$index_1];
    $$renderer.push(`<li class="svelte-1pr5mit">${escape_html(responsibility)}</li>`);
  }
  $$renderer.push(`<!--]--></ul></article> <article class="policy-card full-span svelte-1pr5mit"><h2 class="svelte-1pr5mit">Termination and Enforcement</h2> <p class="svelte-1pr5mit">\`.agency\` may revoke or suspend bearer-token access immediately where compromise, misuse, billing
        delinquency, contract failure, policy violation, or other legal, operational, or security risk is
        detected. Revocation terminates token usability at once. Regeneration replaces the prior token with
        no overlap unless CREATE SOMETHING explicitly provides a managed transition mechanism.</p></article></div></section>`);
}
export {
  _page as default
};
