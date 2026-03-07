import { a6 as escape_html } from "../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { S as SEO } from "../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    data.redirectTo || "/";
    const errorParam = data.error || null;
    const errorMessages = {
      access_denied: "Access was denied during sign-in.",
      invalid_state: "The sign-in session could not be verified. Please try again.",
      missing_callback_params: "The sign-in response was incomplete. Please try again.",
      token_exchange_failed: "Token exchange failed. Please try again."
    };
    const error = errorParam ? errorMessages[errorParam] || "Authentication failed. Please try again." : null;
    SEO($$renderer2, {
      title: "Sign In",
      description: "Sign in to CREATE SOMETHING AGENCY",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <div class="auth-container svelte-1x05zx6"><div class="auth-card svelte-1x05zx6"><div class="auth-header svelte-1x05zx6"><h1 class="svelte-1x05zx6">Sign in to \`.agency\`</h1> <p class="auth-subtitle svelte-1x05zx6">Identity is now managed through Auth0. Use your managed account to access the client portal,
				bearer-token controls, and MCP surfaces.</p></div> `);
    if (error) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="error-message svelte-1x05zx6" role="alert">${escape_html(error)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="auth-actions svelte-1x05zx6"><button class="primary-action svelte-1x05zx6" type="button">Continue with Auth0</button> <button class="secondary-action svelte-1x05zx6" type="button">Create account</button></div> <p class="auth-footnote svelte-1x05zx6">If you already have an authorized organization account, use the same email you use for client access.
			New account creation is still subject to policy, contract, and billing activation.</p></div></div>`);
  });
}
export {
  _page as default
};
