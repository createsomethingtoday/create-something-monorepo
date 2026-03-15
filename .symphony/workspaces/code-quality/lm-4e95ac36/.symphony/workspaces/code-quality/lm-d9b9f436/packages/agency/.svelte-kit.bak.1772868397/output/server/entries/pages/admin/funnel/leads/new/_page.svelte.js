import { a4 as attr, aa as ensure_array_like, a6 as escape_html } from "../../../../../../chunks/index.js";
import { S as SEO } from "../../../../../../chunks/SEO.js";
function _page($$renderer) {
  let name = "";
  let source = "linkedin";
  let email = "";
  let company = "";
  let role = "";
  let linkedin_url = "";
  let source_detail = "";
  let campaign = "";
  let stage = "awareness";
  let estimated_value = void 0;
  let service_interest = "";
  let notes = "";
  const sources = [
    { value: "linkedin", label: "LinkedIn" },
    { value: "website", label: "Website" },
    { value: "referral", label: "Referral" },
    { value: "cold", label: "Cold Outreach" },
    { value: "event", label: "Event" },
    { value: "other", label: "Other" }
  ];
  const stages = [
    { value: "awareness", label: "Awareness" },
    { value: "consideration", label: "Consideration" },
    { value: "decision", label: "Decision" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" }
  ];
  SEO($$renderer, {
    title: "Admin - Add Lead",
    description: "Administrative dashboard",
    propertyName: "agency",
    noindex: true
  });
  $$renderer.push(`<!----> <main class="page svelte-erzknm"><header class="header svelte-erzknm"><a href="/admin/funnel" class="back-link svelte-erzknm">← Back to Dashboard</a> <h1 class="svelte-erzknm">Add Lead</h1> <p class="subtitle svelte-erzknm">Add a new lead to the pipeline.</p></header> `);
  {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--> <form><section class="section svelte-erzknm"><h2 class="section-title svelte-erzknm">Contact Information</h2> <div class="fields-grid svelte-erzknm"><div class="field full-width svelte-erzknm"><label for="name" class="svelte-erzknm">Name <span class="required svelte-erzknm">*</span></label> <input type="text" id="name"${attr("value", name)} required placeholder="John Smith" class="svelte-erzknm"/></div> <div class="field svelte-erzknm"><label for="email" class="svelte-erzknm">Email</label> <input type="email" id="email"${attr("value", email)} placeholder="john@company.com" class="svelte-erzknm"/></div> <div class="field svelte-erzknm"><label for="company" class="svelte-erzknm">Company</label> <input type="text" id="company"${attr("value", company)} placeholder="Acme Inc" class="svelte-erzknm"/></div> <div class="field svelte-erzknm"><label for="role" class="svelte-erzknm">Role / Title</label> <input type="text" id="role"${attr("value", role)} placeholder="CTO" class="svelte-erzknm"/></div> <div class="field svelte-erzknm"><label for="linkedin" class="svelte-erzknm">LinkedIn URL</label> <input type="url" id="linkedin"${attr("value", linkedin_url)} placeholder="https://linkedin.com/in/..." class="svelte-erzknm"/></div></div></section> <section class="section svelte-erzknm"><h2 class="section-title svelte-erzknm">Source</h2> <div class="fields-grid svelte-erzknm"><div class="field svelte-erzknm"><label for="source" class="svelte-erzknm">Lead Source <span class="required svelte-erzknm">*</span></label> `);
  $$renderer.select(
    { id: "source", value: source, required: true, class: "" },
    ($$renderer2) => {
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(sources);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let s = each_array[$$index];
        $$renderer2.option({ value: s.value }, ($$renderer3) => {
          $$renderer3.push(`${escape_html(s.label)}`);
        });
      }
      $$renderer2.push(`<!--]-->`);
    },
    "svelte-erzknm"
  );
  $$renderer.push(`</div> <div class="field svelte-erzknm"><label for="source_detail" class="svelte-erzknm">Source Detail</label> <input type="text" id="source_detail"${attr("value", source_detail)} placeholder="e.g., Subtractive Triad post" class="svelte-erzknm"/></div> <div class="field svelte-erzknm"><label for="campaign" class="svelte-erzknm">Campaign</label> <input type="text" id="campaign"${attr("value", campaign)} placeholder="e.g., GTM Sprint 2" class="svelte-erzknm"/></div></div></section> <section class="section svelte-erzknm"><h2 class="section-title svelte-erzknm">Pipeline</h2> <div class="fields-grid svelte-erzknm"><div class="field svelte-erzknm"><label for="stage" class="svelte-erzknm">Stage</label> `);
  $$renderer.select(
    { id: "stage", value: stage, class: "" },
    ($$renderer2) => {
      $$renderer2.push(`<!--[-->`);
      const each_array_1 = ensure_array_like(stages);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let s = each_array_1[$$index_1];
        $$renderer2.option({ value: s.value }, ($$renderer3) => {
          $$renderer3.push(`${escape_html(s.label)}`);
        });
      }
      $$renderer2.push(`<!--]-->`);
    },
    "svelte-erzknm"
  );
  $$renderer.push(`</div> <div class="field svelte-erzknm"><label for="value" class="svelte-erzknm">Estimated Value ($)</label> <input type="number" id="value"${attr("value", estimated_value)} min="0" step="100" placeholder="10000" class="svelte-erzknm"/></div> <div class="field full-width svelte-erzknm"><label for="interest" class="svelte-erzknm">Service Interest</label> <input type="text" id="interest"${attr("value", service_interest)} placeholder="e.g., Agent Integration, Web Development" class="svelte-erzknm"/></div></div></section> <section class="section svelte-erzknm"><h2 class="section-title svelte-erzknm">Notes</h2> <div class="field svelte-erzknm"><label for="notes" class="svelte-erzknm">Initial Notes</label> <textarea id="notes" rows="4" placeholder="How did they find us? What are their pain points? Any context..." class="svelte-erzknm">`);
  const $$body = escape_html(notes);
  if ($$body) {
    $$renderer.push(`${$$body}`);
  }
  $$renderer.push(`</textarea></div></section> <div class="actions svelte-erzknm"><a href="/admin/funnel" class="cancel-btn svelte-erzknm">Cancel</a> <button type="submit" class="submit-btn svelte-erzknm"${attr("disabled", !name, true)}>${escape_html("Create Lead")}</button></div></form></main>`);
}
export {
  _page as default
};
