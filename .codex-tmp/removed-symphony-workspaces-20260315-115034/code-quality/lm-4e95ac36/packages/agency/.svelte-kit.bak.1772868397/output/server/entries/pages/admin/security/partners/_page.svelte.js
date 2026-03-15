import { aa as ensure_array_like, a6 as escape_html } from "../../../../../chunks/index.js";
import { S as SEO } from "../../../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const clients = data.clients;
    SEO($$renderer2, {
      title: "Partner Mappings",
      description: "Partner identity and account mappings for .agency.",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <section class="shell"><div class="shell-inner svelte-6waayr"><header class="hero svelte-6waayr"><p class="eyebrow svelte-6waayr">Operator Surface</p> <h1>Partner Mappings</h1> <p class="svelte-6waayr">Read-only partner client map used to reconcile consent, identity, workspace, and entitlement state for managed bearer issuance.</p> <nav class="subnav svelte-6waayr"><a href="/admin/security" class="svelte-6waayr">Overview</a> <a href="/admin/security/bearer-tokens" class="svelte-6waayr">Bearer Governance</a> <a href="/admin/security/contracts" class="svelte-6waayr">Contracts</a> <a href="/admin/security/commercial" class="svelte-6waayr">Commercial</a> <a href="/admin/security/partners" aria-current="page" class="svelte-6waayr">Partners</a></nav></header> <div class="panel svelte-6waayr"><div class="table-wrap svelte-6waayr"><table class="svelte-6waayr"><thead><tr><th class="svelte-6waayr">Client</th><th class="svelte-6waayr">Status</th><th class="svelte-6waayr">Identity</th><th class="svelte-6waayr">Workspace</th><th class="svelte-6waayr">Toolkits</th></tr></thead><tbody>`);
    if (clients.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<tr><td colspan="5" class="empty svelte-6waayr">No partner clients.</td></tr>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(clients);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let client = each_array[$$index];
        $$renderer2.push(`<tr><td class="svelte-6waayr"><div>${escape_html(client.display_name ?? client.slug)}</div> <div class="muted svelte-6waayr">${escape_html(client.owner_email ?? "no owner email")}</div> <div class="muted svelte-6waayr">${escape_html(client.updated_at)}</div></td><td class="svelte-6waayr">${escape_html(client.status)}</td><td class="muted svelte-6waayr"><div>${escape_html(client.identity_user_id ?? "no subject")}</div> <div>${escape_html(client.identity_account_id ?? "no account")}</div> <div>${escape_html(client.identity_tenant_id ?? "no tenant")}</div></td><td class="muted svelte-6waayr">${escape_html(client.workspace_account_id)}</td><td class="svelte-6waayr">${escape_html(client.required_toolkits.length > 0 ? client.required_toolkits.join(", ") : "none")}</td></tr>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></div></div></section>`);
  });
}
export {
  _page as default
};
