import { S as SEO } from "../../../../chunks/SEO.js";
function _page($$renderer) {
  SEO($$renderer, {
    title: "Signing In",
    description: "Completing cross-domain authentication",
    propertyName: "agency",
    noindex: (
      // This page is a redirect target - users should never see it
      // The +page.server.ts handles the token exchange and redirects
      true
    )
  });
  $$renderer.push(`<!----> <div class="loading-container svelte-p5ipuj"><div class="loading-content svelte-p5ipuj"><div class="loading-text svelte-p5ipuj">Completing sign-in...</div> <div class="spinner svelte-p5ipuj"></div></div></div>`);
}
export {
  _page as default
};
