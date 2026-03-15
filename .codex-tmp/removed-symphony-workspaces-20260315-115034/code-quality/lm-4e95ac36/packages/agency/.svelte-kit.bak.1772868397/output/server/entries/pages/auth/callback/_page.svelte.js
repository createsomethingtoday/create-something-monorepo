import { S as SEO } from "../../../../chunks/SEO.js";
function _page($$renderer) {
  SEO($$renderer, {
    title: "Signing In",
    description: "Completing your Auth0 sign-in",
    propertyName: "agency",
    noindex: (
      // This page handles the redirect from magic link verification.
      true
    )
  });
  $$renderer.push(`<!----> <div class="callback-container svelte-3cfahf"><p>Completing your sign-in...</p></div>`);
}
export {
  _page as default
};
