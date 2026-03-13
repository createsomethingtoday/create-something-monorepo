import { a4 as attr, aa as ensure_array_like, a6 as escape_html, a7 as attr_class } from "../../../../../chunks/index.js";
import { S as SEO } from "../../../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let contracts = [];
    let search = "";
    let form = {
      auth_subject: "",
      auth_email: "",
      account_id: "",
      tenant_id: "",
      contract_reference: "",
      contract_status: "active",
      contract_active: true,
      service_entitled: true,
      policy_accepted: true,
      effective_at: "",
      expires_at: ""
    };
    SEO($$renderer2, {
      title: "Contract Ledger",
      description: "Operator controls for .agency contract state.",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <section class="shell"><div class="shell-inner svelte-uf94un"><header class="hero svelte-uf94un"><p class="eyebrow svelte-uf94un">Operator Surface</p> <h1>Contract Ledger</h1> <p class="svelte-uf94un">Explicit contract authority for managed bearer access. Use this to override Stripe timing and define legal/commercial posture per user, account, or tenant.</p> <nav class="subnav svelte-uf94un"><a href="/admin/security" class="svelte-uf94un">Overview</a> <a href="/admin/security/bearer-tokens" class="svelte-uf94un">Bearer Governance</a> <a href="/admin/security/contracts" aria-current="page" class="svelte-uf94un">Contracts</a></nav></header> <div class="layout svelte-uf94un"><section class="editor svelte-uf94un"><h2>Contract Record</h2> <div class="form-grid svelte-uf94un"><label class="svelte-uf94un"><span class="svelte-uf94un">Reference</span> <input${attr("value", form.contract_reference)} placeholder="msa_outerfields_2026" class="svelte-uf94un"/></label> <label class="svelte-uf94un"><span class="svelte-uf94un">Status</span> `);
    $$renderer2.select(
      { value: form.contract_status, class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "draft" }, ($$renderer4) => {
          $$renderer4.push(`draft`);
        });
        $$renderer3.option({ value: "pending" }, ($$renderer4) => {
          $$renderer4.push(`pending`);
        });
        $$renderer3.option({ value: "active" }, ($$renderer4) => {
          $$renderer4.push(`active`);
        });
        $$renderer3.option({ value: "paused" }, ($$renderer4) => {
          $$renderer4.push(`paused`);
        });
        $$renderer3.option({ value: "expired" }, ($$renderer4) => {
          $$renderer4.push(`expired`);
        });
        $$renderer3.option({ value: "terminated" }, ($$renderer4) => {
          $$renderer4.push(`terminated`);
        });
      },
      "svelte-uf94un"
    );
    $$renderer2.push(`</label> <label class="svelte-uf94un"><span class="svelte-uf94un">Auth Subject</span> <input${attr("value", form.auth_subject)} placeholder="auth0|..." class="svelte-uf94un"/></label> <label class="svelte-uf94un"><span class="svelte-uf94un">Email</span> <input${attr("value", form.auth_email)} placeholder="user@example.com" class="svelte-uf94un"/></label> <label class="svelte-uf94un"><span class="svelte-uf94un">Account</span> <input${attr("value", form.account_id)} placeholder="acct_..." class="svelte-uf94un"/></label> <label class="svelte-uf94un"><span class="svelte-uf94un">Tenant</span> <input${attr("value", form.tenant_id)} placeholder="tenant_..." class="svelte-uf94un"/></label> <label class="svelte-uf94un"><span class="svelte-uf94un">Effective At</span> <input${attr("value", form.effective_at)} placeholder="2026-03-07T00:00:00Z" class="svelte-uf94un"/></label> <label class="svelte-uf94un"><span class="svelte-uf94un">Expires At</span> <input${attr("value", form.expires_at)} placeholder="2027-03-07T00:00:00Z" class="svelte-uf94un"/></label></div> <div class="toggles svelte-uf94un"><label class="svelte-uf94un"><input type="checkbox"${attr("checked", form.contract_active, true)} class="svelte-uf94un"/> Contract active</label> <label class="svelte-uf94un"><input type="checkbox"${attr("checked", form.service_entitled, true)} class="svelte-uf94un"/> Service entitled</label> <label class="svelte-uf94un"><input type="checkbox"${attr("checked", form.policy_accepted, true)} class="svelte-uf94un"/> Policy accepted</label></div> <div class="actions svelte-uf94un"><button${attr("disabled", !form.contract_reference.trim(), true)} class="svelte-uf94un">Save contract</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section> <section class="records svelte-uf94un"><div class="records-header svelte-uf94un"><h2>Current Records</h2> <div class="toolbar svelte-uf94un"><input${attr("value", search)} placeholder="Search by reference, user, email, account" class="svelte-uf94un"/> <button class="svelte-uf94un">Refresh</button></div></div> <div class="table-wrap svelte-uf94un"><table class="svelte-uf94un"><thead><tr><th class="svelte-uf94un">Reference</th><th class="svelte-uf94un">Subject</th><th class="svelte-uf94un">State</th><th class="svelte-uf94un">Timing</th></tr></thead><tbody class="svelte-uf94un"><!--[-->`);
    const each_array = ensure_array_like(contracts);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let contract = each_array[$$index];
      $$renderer2.push(`<tr class="svelte-uf94un"><td class="svelte-uf94un"><strong>${escape_html(contract.contract_reference)}</strong> <div class="muted svelte-uf94un">${escape_html(contract.updated_at)}</div></td><td class="svelte-uf94un"><div>${escape_html(contract.normalized_email ?? contract.auth_subject ?? "unmapped")}</div> <div class="muted svelte-uf94un">${escape_html(contract.account_id ?? "no account")} / ${escape_html(contract.tenant_id ?? "no tenant")}</div></td><td class="svelte-uf94un"><div${attr_class("svelte-uf94un", void 0, {
        "good": contract.contract_active === 1,
        "bad": contract.contract_active !== 1
      })}>${escape_html(contract.contract_status)}</div> <div class="muted svelte-uf94un">entitled=${escape_html(contract.service_entitled === 1 ? "yes" : "no")} policy=${escape_html(contract.policy_accepted === 1 ? "yes" : "no")}</div></td><td class="svelte-uf94un"><div>${escape_html(contract.effective_at ?? "immediate")}</div> <div class="muted svelte-uf94un">${escape_html(contract.expires_at ?? "no expiry")}</div></td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div></section></div></div></section>`);
  });
}
export {
  _page as default
};
