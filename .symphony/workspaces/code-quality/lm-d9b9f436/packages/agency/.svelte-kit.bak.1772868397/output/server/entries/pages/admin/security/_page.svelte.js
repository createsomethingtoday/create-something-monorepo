import { a6 as escape_html, aa as ensure_array_like, a7 as attr_class } from "../../../../chunks/index.js";
import { S as SEO } from "../../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const summary = data.summary;
    const denied = data.recentDeniedEntitlements;
    const contracts = data.recentContracts;
    const commercial = data.recentCommercialAccounts;
    SEO($$renderer2, {
      title: "Security Operations",
      description: "Operator dashboard for bearer governance, contracts, and commercial state.",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <section class="shell"><div class="shell-inner svelte-14w49b7"><header class="hero svelte-14w49b7"><p class="eyebrow svelte-14w49b7">Operator Surface</p> <h1>Security Operations</h1> <p class="svelte-14w49b7">Control plane for managed bearer access. Auth0 establishes identity; this dashboard shows whether contract, billing, partner, and operator controls currently allow that identity to use MCP.</p> <nav class="subnav svelte-14w49b7"><a href="/admin/security" aria-current="page" class="svelte-14w49b7">Overview</a> <a href="/admin/security/bearer-tokens" class="svelte-14w49b7">Bearer Governance</a> <a href="/admin/security/contracts" class="svelte-14w49b7">Contracts</a> <a href="/admin/security/commercial" class="svelte-14w49b7">Commercial</a> <a href="/admin/security/partners" class="svelte-14w49b7">Partners</a> <a href="/admin/security/audit" class="svelte-14w49b7">Audit</a></nav></header> <section class="summary-grid svelte-14w49b7"><article class="stat-card svelte-14w49b7"><span class="label svelte-14w49b7">Entitlements</span> <strong class="svelte-14w49b7">${escape_html(summary.totalEntitlements)}</strong></article> <article class="stat-card svelte-14w49b7"><span class="label svelte-14w49b7">Denied</span> <strong class="bad svelte-14w49b7">${escape_html(summary.deniedEntitlements)}</strong></article> <article class="stat-card svelte-14w49b7"><span class="label svelte-14w49b7">Manual Overrides</span> <strong class="svelte-14w49b7">${escape_html(summary.manualOverrides)}</strong></article> <article class="stat-card svelte-14w49b7"><span class="label svelte-14w49b7">Active Contracts</span> <strong class="svelte-14w49b7">${escape_html(summary.activeContracts)}</strong></article> <article class="stat-card svelte-14w49b7"><span class="label svelte-14w49b7">Billing Healthy</span> <strong class="good svelte-14w49b7">${escape_html(summary.activeBilling)}</strong></article> <article class="stat-card svelte-14w49b7"><span class="label svelte-14w49b7">Billing Attention</span> <strong class="bad svelte-14w49b7">${escape_html(summary.inactiveBilling)}</strong></article></section> <section class="actions svelte-14w49b7"><a href="/admin/security/bearer-tokens" class="action-card svelte-14w49b7"><h2 class="svelte-14w49b7">Bearer Governance</h2> <p class="svelte-14w49b7">Inspect allow/deny state, live checks, and operator overrides for managed bearer access.</p></a> <a href="/admin/security/contracts" class="action-card svelte-14w49b7"><h2 class="svelte-14w49b7">Contracts</h2> <p class="svelte-14w49b7">Set explicit contract authority for users, accounts, and tenants. Contract state overrides Stripe timing noise.</p></a> <a href="/admin/security/commercial" class="action-card svelte-14w49b7"><h2 class="svelte-14w49b7">Commercial State</h2> <p class="svelte-14w49b7">Inspect raw Stripe-backed customer, subscription, and invoice posture feeding billing enforcement.</p></a> <a href="/admin/security/partners" class="action-card svelte-14w49b7"><h2 class="svelte-14w49b7">Partner Mappings</h2> <p class="svelte-14w49b7">Inspect partner client status, Auth0 subject mapping, workspace account mapping, and required toolkits.</p></a> <a href="/admin/security/audit" class="action-card svelte-14w49b7"><h2 class="svelte-14w49b7">Audit Explorer</h2> <p class="svelte-14w49b7">Inspect partner delivery artifacts, identity auth events, and policy decisions from the broker path.</p></a></section> <div class="panels svelte-14w49b7"><section class="panel svelte-14w49b7"><div class="panel-header svelte-14w49b7"><h2>Recent Denials</h2> <a href="/admin/security/bearer-tokens" class="svelte-14w49b7">Open</a></div> <div class="table-wrap svelte-14w49b7"><table class="svelte-14w49b7"><thead><tr><th class="svelte-14w49b7">User</th><th class="svelte-14w49b7">Reason</th><th class="svelte-14w49b7">Context</th></tr></thead><tbody>`);
    if (denied.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<tr><td colspan="3" class="empty svelte-14w49b7">No denied entitlements.</td></tr>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(denied);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let row = each_array[$$index];
        $$renderer2.push(`<tr><td class="svelte-14w49b7"><div>${escape_html(row.auth_email ?? row.auth_subject)}</div> <div class="muted svelte-14w49b7">${escape_html(row.updated_at)}</div></td><td class="bad svelte-14w49b7">${escape_html(row.decision.reason)}</td><td class="muted svelte-14w49b7">${escape_html(row.account_id ?? "no account")} / ${escape_html(row.tenant_id ?? "no tenant")}</td></tr>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></section> <section class="panel svelte-14w49b7"><div class="panel-header svelte-14w49b7"><h2>Recent Contracts</h2> <a href="/admin/security/contracts" class="svelte-14w49b7">Open</a></div> <div class="table-wrap svelte-14w49b7"><table class="svelte-14w49b7"><thead><tr><th class="svelte-14w49b7">Reference</th><th class="svelte-14w49b7">Status</th><th class="svelte-14w49b7">Mapped To</th></tr></thead><tbody>`);
    if (contracts.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<tr><td colspan="3" class="empty svelte-14w49b7">No contract records.</td></tr>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_1 = ensure_array_like(contracts);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let row = each_array_1[$$index_1];
        $$renderer2.push(`<tr><td class="svelte-14w49b7"><div>${escape_html(row.contract_reference)}</div> <div class="muted svelte-14w49b7">${escape_html(row.updated_at)}</div></td><td class="svelte-14w49b7">${escape_html(row.contract_status)}</td><td class="muted svelte-14w49b7">${escape_html(row.normalized_email ?? row.auth_subject ?? row.account_id ?? "unmapped")}</td></tr>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></section> <section class="panel full svelte-14w49b7"><div class="panel-header svelte-14w49b7"><h2>Recent Commercial State</h2></div> <div class="table-wrap svelte-14w49b7"><table class="svelte-14w49b7"><thead><tr><th class="svelte-14w49b7">Customer</th><th class="svelte-14w49b7">Stripe</th><th class="svelte-14w49b7">Product</th><th class="svelte-14w49b7">Billing</th></tr></thead><tbody>`);
    if (commercial.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<tr><td colspan="4" class="empty svelte-14w49b7">No Stripe-backed commercial state.</td></tr>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_2 = ensure_array_like(commercial);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let row = each_array_2[$$index_2];
        $$renderer2.push(`<tr><td class="svelte-14w49b7"><div>${escape_html(row.normalized_email ?? "unknown")}</div> <div class="muted svelte-14w49b7">${escape_html(row.updated_at)}</div></td><td class="muted svelte-14w49b7"><div>${escape_html(row.stripe_customer_id ?? "no customer")}</div> <div>${escape_html(row.stripe_subscription_id ?? "no subscription")}</div></td><td class="svelte-14w49b7">${escape_html(row.product_id ?? "unknown")} <span class="muted svelte-14w49b7">${escape_html(row.subscription_status ?? "n/a")}</span></td><td class="svelte-14w49b7"><span${attr_class("svelte-14w49b7", void 0, {
          "good": row.billing_active === 1,
          "bad": row.billing_active !== 1
        })}>billing=${escape_html(row.billing_active === 1 ? "active" : "inactive")}</span> <div class="muted svelte-14w49b7">contract=${escape_html(row.contract_active === 1 ? "active" : "inactive")}</div></td></tr>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></section></div></div></section>`);
  });
}
export {
  _page as default
};
