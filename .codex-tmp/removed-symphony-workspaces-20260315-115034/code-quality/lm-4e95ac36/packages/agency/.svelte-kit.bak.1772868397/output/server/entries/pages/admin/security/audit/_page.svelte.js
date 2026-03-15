import { aa as ensure_array_like, a6 as escape_html } from "../../../../../chunks/index.js";
import { S as SEO } from "../../../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const deliveries = data.deliveries;
    const authEvents = data.authEvents;
    const policyEvents = data.policyEvents;
    SEO($$renderer2, {
      title: "Audit Explorer",
      description: "Operational evidence for bearer governance and partner delivery.",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <section class="shell"><div class="shell-inner svelte-b0k83v"><header class="hero svelte-b0k83v"><p class="eyebrow svelte-b0k83v">Operator Surface</p> <h1>Audit Explorer</h1> <p class="svelte-b0k83v">Read-only operational evidence for access delivery and resolver decisions. Use this when you need to explain why a token was issued, denied, or revoked.</p> <nav class="subnav svelte-b0k83v"><a href="/admin/security" class="svelte-b0k83v">Overview</a> <a href="/admin/security/bearer-tokens" class="svelte-b0k83v">Bearer Governance</a> <a href="/admin/security/contracts" class="svelte-b0k83v">Contracts</a> <a href="/admin/security/commercial" class="svelte-b0k83v">Commercial</a> <a href="/admin/security/partners" class="svelte-b0k83v">Partners</a> <a href="/admin/security/audit" aria-current="page" class="svelte-b0k83v">Audit</a></nav></header> <div class="panels svelte-b0k83v"><section class="panel svelte-b0k83v"><div class="panel-header"><h2>Partner Deliveries</h2></div> <div class="table-wrap svelte-b0k83v"><table class="svelte-b0k83v"><thead><tr><th class="svelte-b0k83v">Client</th><th class="svelte-b0k83v">Delivery</th><th class="svelte-b0k83v">Artifact</th></tr></thead><tbody><!--[-->`);
    const each_array = ensure_array_like(deliveries);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let row = each_array[$$index];
      $$renderer2.push(`<tr><td class="svelte-b0k83v"><div>${escape_html(row.client_display_name ?? row.client_slug)}</div> <div class="muted svelte-b0k83v">${escape_html(row.created_at)}</div></td><td class="svelte-b0k83v"><div>${escape_html(row.delivery_type)}</div> <div class="muted svelte-b0k83v">${escape_html(row.delivery_channel)} by ${escape_html(row.delivered_by)}</div></td><td class="svelte-b0k83v"><div>${escape_html(row.artifact_ref ?? "none")}</div> <div class="muted svelte-b0k83v">${escape_html(row.recipient ?? "no recipient")} / ${escape_html(row.expires_at ?? "no expiry")}</div></td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></section> <section class="panel svelte-b0k83v"><div class="panel-header"><h2>Identity Auth Events</h2></div> <div class="table-wrap svelte-b0k83v"><table class="svelte-b0k83v"><thead><tr><th class="svelte-b0k83v">Event</th><th class="svelte-b0k83v">User</th><th class="svelte-b0k83v">Time</th></tr></thead><tbody><!--[-->`);
    const each_array_1 = ensure_array_like(authEvents);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let row = each_array_1[$$index_1];
      $$renderer2.push(`<tr><td class="svelte-b0k83v"><div>${escape_html(row.event_type)}</div> <div class="muted svelte-b0k83v">${escape_html(row.id)}</div></td><td class="svelte-b0k83v">${escape_html(row.user_id ?? "unknown")}</td><td class="svelte-b0k83v">${escape_html(row.created_at)}</td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></section> <section class="panel full svelte-b0k83v"><div class="panel-header"><h2>Policy Decisions</h2></div> <div class="table-wrap svelte-b0k83v"><table class="svelte-b0k83v"><thead><tr><th class="svelte-b0k83v">Policy</th><th class="svelte-b0k83v">Action</th><th class="svelte-b0k83v">Decision</th><th class="svelte-b0k83v">Context</th></tr></thead><tbody><!--[-->`);
    const each_array_2 = ensure_array_like(policyEvents);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let row = each_array_2[$$index_2];
      $$renderer2.push(`<tr><td class="svelte-b0k83v"><div>${escape_html(row.policy_id)}</div> <div class="muted svelte-b0k83v">${escape_html(row.created_at)}</div></td><td class="svelte-b0k83v">${escape_html(row.action_name)}</td><td class="svelte-b0k83v">${escape_html(row.final_decision)}</td><td class="muted svelte-b0k83v">${escape_html(row.actor ?? "unknown actor")} / ${escape_html(row.account_id ?? "no account")}</td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></section></div></div></section>`);
  });
}
export {
  _page as default
};
