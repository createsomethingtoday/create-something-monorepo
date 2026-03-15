import { a4 as attr, aa as ensure_array_like, a6 as escape_html, a7 as attr_class } from "../../../../../chunks/index.js";
import { S as SEO } from "../../../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const toggleFields = [
      { field: "managed_bearer_allowed", label: "Bearer" },
      { field: "org_membership_active", label: "Org" },
      { field: "service_entitled", label: "Service" },
      { field: "policy_accepted", label: "Policy" },
      { field: "contract_active", label: "Contract" },
      { field: "billing_active", label: "Billing" }
    ];
    let { data } = $$props;
    let entitlements = [];
    let search = "";
    let busySubject = "";
    SEO($$renderer2, {
      title: "Bearer Token Governance",
      description: "Operator controls for .agency managed bearer token entitlement state.",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <section class="shell"><div class="shell-inner svelte-1n0g9eo"><header class="hero svelte-1n0g9eo"><p class="eyebrow svelte-1n0g9eo">Operator Surface</p> <h1>Managed Bearer Governance</h1> <p class="svelte-1n0g9eo">Live entitlement state for \`.agency\` bearer tokens. Auth0 proves identity. This table controls whether that identity remains entitled to use MCP access.</p> <nav class="subnav svelte-1n0g9eo"><a href="/admin/security" class="svelte-1n0g9eo">Overview</a> <a href="/admin/security/bearer-tokens" aria-current="page" class="svelte-1n0g9eo">Bearer Governance</a> <a href="/admin/security/contracts" class="svelte-1n0g9eo">Contracts</a></nav></header> <div class="toolbar svelte-1n0g9eo"><input${attr("value", search)} placeholder="Search by subject, email, account, tenant" class="svelte-1n0g9eo"/> <button class="svelte-1n0g9eo">Refresh</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="table-wrap svelte-1n0g9eo"><table class="svelte-1n0g9eo"><thead><tr><th class="svelte-1n0g9eo">User</th><th class="svelte-1n0g9eo">Account</th><th class="svelte-1n0g9eo">Status</th><th class="svelte-1n0g9eo">Checks</th><th class="svelte-1n0g9eo">Denial</th></tr></thead><tbody><!--[-->`);
    const each_array = ensure_array_like(entitlements);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let row = each_array[$$index_1];
      $$renderer2.push(`<tr><td class="svelte-1n0g9eo"><strong>${escape_html(row.auth_email ?? row.auth_subject)}</strong> <div class="muted svelte-1n0g9eo">${escape_html(row.auth_subject)}</div> <div class="muted svelte-1n0g9eo">${escape_html(row.updated_at)}</div></td><td class="svelte-1n0g9eo"><div>${escape_html(row.account_id ?? "unset")}</div> <div class="muted svelte-1n0g9eo">${escape_html(row.tenant_id ?? "unset")}</div></td><td class="svelte-1n0g9eo"><span${attr_class("svelte-1n0g9eo", void 0, {
        "allowed": row.decision.allowed,
        "blocked": !row.decision.allowed
      })}>${escape_html(row.decision.reason)}</span></td><td class="checks svelte-1n0g9eo"><!--[-->`);
      const each_array_1 = ensure_array_like(toggleFields);
      for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
        let { field, label } = each_array_1[$$index];
        $$renderer2.push(`<button${attr("disabled", busySubject === row.auth_subject, true)}${attr_class("svelte-1n0g9eo", void 0, { "check-on": row[field] === 1, "check-off": row[field] !== 1 })}>${escape_html(label)}</button>`);
      }
      $$renderer2.push(`<!--]--></td><td class="svelte-1n0g9eo"><form class="svelte-1n0g9eo"><input name="denial_reason"${attr("value", row.denial_reason ?? "")} placeholder="Optional deny reason" class="svelte-1n0g9eo"/> <button${attr("disabled", busySubject === row.auth_subject, true)} class="svelte-1n0g9eo">Save</button></form></td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></div></section>`);
  });
}
export {
  _page as default
};
