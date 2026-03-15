import { a6 as escape_html, aa as ensure_array_like, a5 as attr_style, a8 as stringify, a4 as attr } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const metrics = (() => data.metrics)();
    (() => data.user)();
    function formatCurrency(amount) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
    }
    function timeAgo(isoString) {
      const date = new Date(isoString);
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1e3 * 60));
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
    function statusColor(status) {
      return status === "success" ? "var(--color-success)" : "var(--color-error)";
    }
    SEO($$renderer2, {
      title: "Dashboard | CREATE SOMETHING AGENCY",
      description: "Your agent activity dashboard - see recovered revenue, execution metrics, and daily analytics.",
      propertyName: "agency"
    });
    $$renderer2.push(`<!----> <div class="dashboard svelte-x1i5gj"><header class="dashboard-header svelte-x1i5gj"><div class="header-content"><h1 class="dashboard-title svelte-x1i5gj">Dashboard</h1> <p class="dashboard-subtitle svelte-x1i5gj">Your agents have been busy. Here's what they've done.</p></div> <div class="period-selector svelte-x1i5gj"><span class="period-label svelte-x1i5gj">Last 30 days</span></div></header> <section class="summary-grid svelte-x1i5gj"><div class="summary-card highlight svelte-x1i5gj"><span class="summary-label svelte-x1i5gj">Revenue Recovered</span> <span class="summary-value svelte-x1i5gj">${escape_html(formatCurrency(metrics.summary.revenueRecovered))}</span> <span class="summary-note svelte-x1i5gj">From no-show recovery + upsells</span></div> <div class="summary-card svelte-x1i5gj"><span class="summary-label svelte-x1i5gj">Total Executions</span> <span class="summary-value svelte-x1i5gj">${escape_html(metrics.summary.totalExecutions.toLocaleString())}</span> <span class="summary-note svelte-x1i5gj">Workflows triggered</span></div> <div class="summary-card svelte-x1i5gj"><span class="summary-label svelte-x1i5gj">Success Rate</span> <span class="summary-value svelte-x1i5gj">${escape_html(metrics.summary.successRate)}%</span> <span class="summary-note svelte-x1i5gj">Completed successfully</span></div> <div class="summary-card svelte-x1i5gj"><span class="summary-label svelte-x1i5gj">Hours Automated</span> <span class="summary-value svelte-x1i5gj">${escape_html(metrics.summary.hoursAutomated)}</span> <span class="summary-note svelte-x1i5gj">Manual work saved</span></div></section> <div class="content-grid svelte-x1i5gj"><section class="agents-section"><h2 class="section-title svelte-x1i5gj">Agent Performance</h2> <div class="agents-list svelte-x1i5gj"><!--[-->`);
    const each_array = ensure_array_like(metrics.byAgent);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let agent = each_array[$$index];
      $$renderer2.push(`<div class="agent-card svelte-x1i5gj"><div class="agent-header svelte-x1i5gj"><h3 class="agent-name svelte-x1i5gj">${escape_html(agent.name)}</h3> <span class="agent-last-run svelte-x1i5gj">${escape_html(timeAgo(agent.lastRun))}</span></div> <div class="agent-metrics svelte-x1i5gj"><div class="agent-metric svelte-x1i5gj"><span class="metric-value svelte-x1i5gj">${escape_html(agent.executions)}</span> <span class="metric-label svelte-x1i5gj">Executions</span></div> <div class="agent-metric svelte-x1i5gj"><span class="metric-value svelte-x1i5gj">${escape_html(agent.successRate)}%</span> <span class="metric-label svelte-x1i5gj">Success</span></div> `);
      if (agent.revenueRecovered) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="agent-metric highlight svelte-x1i5gj"><span class="metric-value svelte-x1i5gj">${escape_html(formatCurrency(agent.revenueRecovered))}</span> <span class="metric-label svelte-x1i5gj">Recovered</span></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (agent.conversions) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="agent-metric svelte-x1i5gj"><span class="metric-value svelte-x1i5gj">${escape_html(agent.conversions)}</span> <span class="metric-label svelte-x1i5gj">Conversions</span></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (agent.verificationsCompleted) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="agent-metric svelte-x1i5gj"><span class="metric-value svelte-x1i5gj">${escape_html(agent.verificationsCompleted)}</span> <span class="metric-label svelte-x1i5gj">Verified</span></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (agent.reviewsGenerated) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="agent-metric svelte-x1i5gj"><span class="metric-value svelte-x1i5gj">${escape_html(agent.reviewsGenerated)}</span> <span class="metric-label svelte-x1i5gj">Reviews</span></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> <section class="activity-section"><h2 class="section-title svelte-x1i5gj">Recent Activity</h2> <div class="activity-list svelte-x1i5gj"><!--[-->`);
    const each_array_1 = ensure_array_like(metrics.recentActivity);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let activity = each_array_1[$$index_1];
      $$renderer2.push(`<div class="activity-item svelte-x1i5gj"><div class="activity-status svelte-x1i5gj"${attr_style(`background-color: ${stringify(statusColor(activity.status))}`)}></div> <div class="activity-content svelte-x1i5gj"><p class="activity-agent svelte-x1i5gj">${escape_html(activity.agentName)}</p> <p class="activity-outcome svelte-x1i5gj">${escape_html(activity.outcome)}</p></div> <span class="activity-time svelte-x1i5gj">${escape_html(timeAgo(activity.timestamp))}</span></div>`);
    }
    $$renderer2.push(`<!--]--></div></section></div> <section class="trend-section svelte-x1i5gj"><h2 class="section-title svelte-x1i5gj">Daily Revenue Trend</h2> <div class="trend-chart svelte-x1i5gj"><!--[-->`);
    const each_array_2 = ensure_array_like(metrics.dailyTrend);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let day = each_array_2[$$index_2];
      $$renderer2.push(`<div class="trend-bar-container svelte-x1i5gj"><div class="trend-bar svelte-x1i5gj"${attr_style(`height: ${stringify(day.revenue / 520 * 100)}%`)}${attr("title", `${stringify(day.date)}: ${stringify(formatCurrency(day.revenue))}`)}></div> <span class="trend-label svelte-x1i5gj">${escape_html(day.date.slice(-2))}</span></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> <footer class="dashboard-footer svelte-x1i5gj"><p class="footer-note svelte-x1i5gj">Powered by <a href="https://workway.co" target="_blank" rel="noopener" class="svelte-x1i5gj">WORKWAY</a></p></footer></div>`);
  });
}
export {
  _page as default
};
