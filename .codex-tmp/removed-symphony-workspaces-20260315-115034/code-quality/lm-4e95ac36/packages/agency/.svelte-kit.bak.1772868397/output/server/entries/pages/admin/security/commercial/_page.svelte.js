import { aa as ensure_array_like, a6 as escape_html, a7 as attr_class } from "../../../../../chunks/index.js";
import { S as SEO } from "../../../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const commercial = data.commercial;
    SEO($$renderer2, {
      title: "Commercial State",
      description: "Stripe-backed commercial state for .agency.",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <section class="shell"><div class="shell-inner svelte-y7ha9u"><header class="hero svelte-y7ha9u"><p class="eyebrow svelte-y7ha9u">Operator Surface</p> <h1>Commercial State</h1> <p class="svelte-y7ha9u">Read-only Stripe-backed commercial ledger used during entitlement reconciliation when no explicit contract record overrides it.</p> <nav class="subnav svelte-y7ha9u"><a href="/admin/security" class="svelte-y7ha9u">Overview</a> <a href="/admin/security/bearer-tokens" class="svelte-y7ha9u">Bearer Governance</a> <a href="/admin/security/contracts" class="svelte-y7ha9u">Contracts</a> <a href="/admin/security/commercial" aria-current="page" class="svelte-y7ha9u">Commercial</a> <a href="/admin/security/partners" class="svelte-y7ha9u">Partners</a></nav></header> <div class="panel svelte-y7ha9u"><div class="table-wrap svelte-y7ha9u"><table class="svelte-y7ha9u"><thead><tr><th class="svelte-y7ha9u">Customer</th><th class="svelte-y7ha9u">Stripe</th><th class="svelte-y7ha9u">Offer</th><th class="svelte-y7ha9u">State</th><th class="svelte-y7ha9u">Timing</th></tr></thead><tbody>`);
    if (commercial.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<tr><td colspan="5" class="empty svelte-y7ha9u">No commercial records.</td></tr>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(commercial);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let row = each_array[$$index];
        $$renderer2.push(`<tr><td class="svelte-y7ha9u"><div>${escape_html(row.normalized_email ?? "unknown")}</div> <div class="muted svelte-y7ha9u">${escape_html(row.updated_at)}</div></td><td class="muted svelte-y7ha9u"><div>${escape_html(row.stripe_customer_id ?? "no customer")}</div> <div>${escape_html(row.stripe_subscription_id ?? "no subscription")}</div></td><td class="svelte-y7ha9u"><div>${escape_html(row.product_id ?? "unknown")}</div> <div class="muted svelte-y7ha9u">${escape_html(row.service_tier ?? "no tier")}</div></td><td class="svelte-y7ha9u"><div>${escape_html(row.subscription_status ?? "n/a")}</div> <div${attr_class("svelte-y7ha9u", void 0, {
          "good": row.billing_active === 1,
          "bad": row.billing_active !== 1
        })}>billing=${escape_html(row.billing_active === 1 ? "active" : "inactive")}</div> <div class="muted svelte-y7ha9u">contract=${escape_html(row.contract_active === 1 ? "active" : "inactive")}</div></td><td class="svelte-y7ha9u"><div>${escape_html(row.current_period_end ?? "no period end")}</div> <div class="muted svelte-y7ha9u">${escape_html(row.last_invoice_status ?? "no invoice status")}</div></td></tr>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></div></div></section>`);
  });
}
export {
  _page as default
};
