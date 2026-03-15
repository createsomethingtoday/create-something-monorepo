import { a9 as head, a6 as escape_html, ak as store_get, al as unsubscribe_stores } from "../../chunks/index.js";
import { p as page } from "../../chunks/stores.js";
function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("1j96wlh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$page", page).status)} | CREATE SOMETHING.agency</title>`);
      });
    });
    $$renderer2.push(`<div class="error-page svelte-1j96wlh"><div class="error-container svelte-1j96wlh"><h1 class="error-code svelte-1j96wlh">${escape_html(store_get($$store_subs ??= {}, "$page", page).status)}</h1> <h2 class="error-message svelte-1j96wlh">${escape_html(store_get($$store_subs ??= {}, "$page", page).error?.message || "Not Found")}</h2> <p class="error-description svelte-1j96wlh">`);
    if (store_get($$store_subs ??= {}, "$page", page).status === 404) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`The page you're looking for doesn't exist. Maybe it was moved, or maybe it never existed.`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (store_get($$store_subs ??= {}, "$page", page).status === 500) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`Something went wrong on our end. We've been notified and are looking into it.`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`An unexpected error occurred.`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></p> <div class="button-group svelte-1j96wlh"><a href="/" class="button-primary svelte-1j96wlh">Go Home</a> <a href="/services" class="button-secondary svelte-1j96wlh">View Services</a></div></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _error as default
};
