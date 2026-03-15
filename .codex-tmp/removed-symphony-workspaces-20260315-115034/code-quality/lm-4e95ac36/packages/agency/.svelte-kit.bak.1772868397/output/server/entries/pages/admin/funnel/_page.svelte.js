import { a6 as escape_html, aa as ensure_array_like, a5 as attr_style, a8 as stringify, a7 as attr_class } from "../../../../chunks/index.js";
import { f as formatCurrency, a as formatNumber, b as getDeltaIndicator, d as formatPercent } from "../../../../chunks/index2.js";
import { S as SEO } from "../../../../chunks/SEO.js";
import { C as Card } from "../../../../chunks/Card.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const summary = (() => data.summary)();
    const leads = (() => data.leads)();
    const stageColors = {
      awareness: "var(--color-info)",
      consideration: "var(--color-warning)",
      decision: "var(--color-data-3)",
      won: "var(--color-success)",
      lost: "var(--color-error)"
    };
    SEO($$renderer2, {
      title: "Admin - Funnel Dashboard",
      description: "Administrative dashboard",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <main class="dashboard svelte-75ty2p"><header class="header svelte-75ty2p"><h1 class="svelte-75ty2p">GTM Funnel</h1> <p class="period svelte-75ty2p">${escape_html(summary.period.start)} — ${escape_html(summary.period.end)}</p></header> <section class="section svelte-75ty2p"><h2 class="section-title svelte-75ty2p">Awareness</h2> <div class="metrics-grid svelte-75ty2p">`);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Impressions</span> <span class="metric-value svelte-75ty2p">${escape_html(formatNumber(summary.totals.impressions))}</span> <span${attr_class("metric-delta svelte-75ty2p", void 0, { "positive": summary.changes.impressions_delta > 0 })}>${escape_html(getDeltaIndicator(summary.changes.impressions_delta))} vs prior</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Reach</span> <span class="metric-value svelte-75ty2p">${escape_html(formatNumber(summary.totals.reach))}</span> <span${attr_class("metric-delta svelte-75ty2p", void 0, { "positive": summary.changes.reach_delta > 0 })}>${escape_html(getDeltaIndicator(summary.changes.reach_delta))} vs prior</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Engagements</span> <span class="metric-value svelte-75ty2p">${escape_html(formatNumber(summary.totals.engagements))}</span> <span${attr_class("metric-delta svelte-75ty2p", void 0, { "positive": summary.changes.engagements_delta > 0 })}>${escape_html(getDeltaIndicator(summary.changes.engagements_delta))} vs prior</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Engagement Rate</span> <span class="metric-value svelte-75ty2p">${escape_html(formatPercent(summary.conversion_rates.impression_to_engagement))}</span>`);
      }
    });
    $$renderer2.push(`<!----></div></section> <section class="section svelte-75ty2p"><h2 class="section-title svelte-75ty2p">Consideration</h2> <div class="metrics-grid svelte-75ty2p">`);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Website Visits</span> <span class="metric-value svelte-75ty2p">${escape_html(formatNumber(summary.totals.website_visits))}</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Visit → Lead</span> <span class="metric-value svelte-75ty2p">${escape_html(formatPercent(summary.conversion_rates.visit_to_lead))}</span>`);
      }
    });
    $$renderer2.push(`<!----></div></section> <section class="section svelte-75ty2p"><h2 class="section-title svelte-75ty2p">Decision</h2> <div class="metrics-grid svelte-75ty2p">`);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Discovery Calls</span> <span class="metric-value svelte-75ty2p">${escape_html(summary.totals.discovery_calls)}</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Proposals Sent</span> <span class="metric-value svelte-75ty2p">${escape_html(summary.totals.proposals_sent)}</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Call → Proposal</span> <span class="metric-value svelte-75ty2p">${escape_html(formatPercent(summary.conversion_rates.call_to_proposal))}</span>`);
      }
    });
    $$renderer2.push(`<!----></div></section> <section class="section svelte-75ty2p"><h2 class="section-title svelte-75ty2p">Conversion</h2> <div class="metrics-grid svelte-75ty2p">`);
    Card($$renderer2, {
      variant: "glass",
      radius: "md",
      padding: "md",
      class: "glass-emphasis flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Deals Closed</span> <span class="metric-value svelte-75ty2p">${escape_html(summary.totals.deals_closed)}</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "glass",
      radius: "md",
      padding: "md",
      class: "glass-emphasis flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Revenue</span> <span class="metric-value svelte-75ty2p">${escape_html(formatCurrency(summary.totals.revenue))}</span>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "standard",
      radius: "md",
      padding: "md",
      class: "flex flex-col gap-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<span class="metric-label svelte-75ty2p">Proposal → Close</span> <span class="metric-value svelte-75ty2p">${escape_html(formatPercent(summary.conversion_rates.proposal_to_close))}</span>`);
      }
    });
    $$renderer2.push(`<!----></div></section> <section class="section svelte-75ty2p"><h2 class="section-title svelte-75ty2p">Pipeline</h2> <div class="pipeline svelte-75ty2p"><!--[-->`);
    const each_array = ensure_array_like(Object.entries(summary.pipeline));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let [stage, count] = each_array[$$index];
      $$renderer2.push(`<div class="pipeline-stage svelte-75ty2p"><div class="stage-bar svelte-75ty2p"${attr_style(`--stage-color: ${stringify(stageColors[stage])}`)}><span class="stage-count svelte-75ty2p">${escape_html(count)}</span></div> <span class="stage-label svelte-75ty2p">${escape_html(stage)}</span></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="pipeline-value svelte-75ty2p"><span>Pipeline Value: ${escape_html(formatCurrency(summary.pipeline_value.total_estimated))}</span> <span>Closed: ${escape_html(formatCurrency(summary.pipeline_value.total_closed))}</span></div></section> <section class="section svelte-75ty2p"><h2 class="section-title svelte-75ty2p">Recent Leads</h2> `);
    if (leads.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="empty-state svelte-75ty2p">No leads yet. They'll appear here as they come in.</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="leads-table svelte-75ty2p"><table class="svelte-75ty2p"><thead><tr><th class="svelte-75ty2p">Name</th><th class="svelte-75ty2p">Company</th><th class="svelte-75ty2p">Source</th><th class="svelte-75ty2p">Stage</th><th class="svelte-75ty2p">Value</th></tr></thead><tbody><!--[-->`);
      const each_array_1 = ensure_array_like(leads.slice(0, 10));
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let lead = each_array_1[$$index_1];
        $$renderer2.push(`<tr><td class="svelte-75ty2p">${escape_html(lead.name)}</td><td class="svelte-75ty2p">${escape_html(lead.company || "—")}</td><td class="svelte-75ty2p">${escape_html(lead.source)}</td><td class="svelte-75ty2p"><span class="stage-badge svelte-75ty2p"${attr_style(`--stage-color: ${stringify(stageColors[lead.stage])}`)}>${escape_html(lead.stage)}</span></td><td class="svelte-75ty2p">${escape_html(lead.estimated_value ? formatCurrency(lead.estimated_value) : "—")}</td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]--></section> <section class="section svelte-75ty2p"><h2 class="section-title svelte-75ty2p">Quick Actions</h2> `);
    Card($$renderer2, {
      variant: "glass",
      radius: "md",
      padding: "md",
      class: "glass-emphasis flex flex-wrap gap-4",
      children: ($$renderer3) => {
        $$renderer3.push(`<a href="/admin/funnel/record" class="action-button svelte-75ty2p">Record Daily Metrics</a> <a href="/admin/funnel/leads/new" class="action-button svelte-75ty2p">Add Lead</a> <a href="/admin/social" class="action-button svelte-75ty2p">Social Calendar</a> <a href="/admin/community" class="action-button svelte-75ty2p">Community</a>`);
      }
    });
    $$renderer2.push(`<!----></section></main>`);
  });
}
export {
  _page as default
};
