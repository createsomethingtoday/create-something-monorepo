import { a6 as escape_html, aa as ensure_array_like, a5 as attr_style, a8 as stringify, a4 as attr } from "../../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import { S as SEO } from "../../../../chunks/SEO.js";
import { C as Card } from "../../../../chunks/Card.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    const platformColors = {
      linkedin: "#0A66C2",
      twitter: "#1DA1F2",
      github: "#333",
      hackernews: "#FF6600",
      reddit: "#FF4500"
    };
    const urgencyColors = {
      critical: "var(--color-error)",
      high: "var(--color-warning)",
      medium: "var(--color-info)",
      low: "var(--color-fg-muted)"
    };
    const leadColors = {
      hot: "var(--color-error)",
      warm: "var(--color-warning)",
      cold: "var(--color-info)",
      unknown: "var(--color-fg-muted)",
      client: "var(--color-success)"
    };
    function formatTime(iso) {
      if (!iso) return "Never";
      const date = new Date(iso);
      const now = /* @__PURE__ */ new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1e3 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (hours < 1) return "Just now";
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    }
    function truncate(text, length) {
      if (text.length <= length) return text;
      return text.slice(0, length) + "...";
    }
    let dismissedSignals = /* @__PURE__ */ new Set();
    let processedQueue = /* @__PURE__ */ new Set();
    SEO($$renderer2, {
      title: "Admin - Community",
      description: "Administrative dashboard",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <main class="dashboard svelte-1k1q4sy"><header class="dashboard-header svelte-1k1q4sy"><div class="header-content svelte-1k1q4sy"><h1 class="svelte-1k1q4sy">Community</h1> <p class="subtitle svelte-1k1q4sy">Your 5-minute review. Then deep work.</p></div> <div class="header-stats svelte-1k1q4sy"><div class="stat svelte-1k1q4sy"><span class="stat-value svelte-1k1q4sy">${escape_html(data.stats.new_signals)}</span> <span class="stat-label svelte-1k1q4sy">New Signals</span></div> <div class="stat svelte-1k1q4sy"><span class="stat-value svelte-1k1q4sy">${escape_html(data.stats.pending_responses)}</span> <span class="stat-label svelte-1k1q4sy">Pending</span></div> <div class="stat svelte-1k1q4sy"><span class="stat-value svelte-1k1q4sy">${escape_html(data.stats.hot_leads)}</span> <span class="stat-label svelte-1k1q4sy">Hot Leads</span></div> <div class="stat svelte-1k1q4sy"><span class="stat-value svelte-1k1q4sy">${escape_html(data.stats.responses_this_week)}</span> <span class="stat-label svelte-1k1q4sy">This Week</span></div></div></header> `);
    if (form?.success) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="toast success svelte-1k1q4sy">Action completed: ${escape_html(form.action)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="dashboard-grid svelte-1k1q4sy">`);
    Card($$renderer2, {
      variant: "glass",
      radius: "md",
      padding: "lg",
      class: "glass-emphasis col-span-2",
      children: ($$renderer3) => {
        $$renderer3.push(`<h2 class="panel-title svelte-1k1q4sy">Response Queue</h2> <p class="panel-subtitle svelte-1k1q4sy">Drafted by an agent. Approve or edit.</p> `);
        if (data.queue.length === 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="empty-state svelte-1k1q4sy"><p>No pending responses</p></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div class="queue-list svelte-1k1q4sy"><!--[-->`);
          const each_array = ensure_array_like(data.queue);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let item = each_array[$$index];
            if (!processedQueue.has(item.id)) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<div class="queue-item svelte-1k1q4sy"><div class="queue-header svelte-1k1q4sy"><span class="platform-badge svelte-1k1q4sy"${attr_style(`background: ${stringify(platformColors[item.platform] || "#666")}`)}>${escape_html(item.platform)}</span> <span class="action-type svelte-1k1q4sy">${escape_html(item.action_type)}</span> <span class="priority svelte-1k1q4sy">P${escape_html(item.priority)}</span></div> `);
              if (item.signal_content) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<div class="signal-context svelte-1k1q4sy"><span class="signal-author svelte-1k1q4sy">${escape_html(item.signal_author || "Unknown")}</span> <p class="signal-preview svelte-1k1q4sy">${escape_html(truncate(item.signal_content, 100))}</p></div>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]--> <div class="draft-content svelte-1k1q4sy"><textarea name="draft" class="draft-textarea svelte-1k1q4sy">`);
              const $$body = escape_html(item.draft_content);
              if ($$body) {
                $$renderer3.push(`${$$body}`);
              }
              $$renderer3.push(`</textarea></div> `);
              if (item.draft_reasoning) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<p class="reasoning svelte-1k1q4sy">${escape_html(item.draft_reasoning)}</p>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]--> <div class="queue-actions svelte-1k1q4sy"><form method="POST" action="?/approve"><input type="hidden" name="id"${attr("value", item.id)}/> <button type="submit" class="btn btn-approve svelte-1k1q4sy">Approve</button></form> <form method="POST" action="?/reject"><input type="hidden" name="id"${attr("value", item.id)}/> <button type="submit" class="btn btn-reject svelte-1k1q4sy">Reject</button></form> `);
              if (item.target_url) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<a${attr("href", item.target_url)} target="_blank" class="btn btn-link svelte-1k1q4sy">View</a>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]--></div></div>`);
            } else {
              $$renderer3.push("<!--[!-->");
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "glass",
      radius: "md",
      padding: "lg",
      class: "glass-emphasis",
      children: ($$renderer3) => {
        $$renderer3.push(`<h2 class="panel-title svelte-1k1q4sy">Signals</h2> <p class="panel-subtitle svelte-1k1q4sy">Mentions, questions, opportunities</p> `);
        if (data.signals.length === 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="empty-state svelte-1k1q4sy"><p>No new signals</p></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div class="signals-list svelte-1k1q4sy"><!--[-->`);
          const each_array_1 = ensure_array_like(data.signals);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let signal = each_array_1[$$index_1];
            if (!dismissedSignals.has(signal.id)) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<div class="signal-item svelte-1k1q4sy"${attr_style(`--urgency-color: ${stringify(urgencyColors[signal.urgency])}`)}><div class="signal-header svelte-1k1q4sy"><span class="platform-badge svelte-1k1q4sy"${attr_style(`background: ${stringify(platformColors[signal.platform] || "#666")}`)}>${escape_html(signal.platform)}</span> <span class="signal-type svelte-1k1q4sy">${escape_html(signal.signal_type)}</span> <span class="urgency-badge svelte-1k1q4sy">${escape_html(signal.urgency)}</span> <span class="time svelte-1k1q4sy">${escape_html(formatTime(signal.detected_at))}</span></div> <div class="signal-author-info svelte-1k1q4sy"><span class="author-name svelte-1k1q4sy">${escape_html(signal.author_name || signal.author_handle || "Unknown")}</span> `);
              if (signal.author_followers) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<span class="followers svelte-1k1q4sy">${escape_html(signal.author_followers.toLocaleString())} followers</span>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]--></div> <p class="signal-content svelte-1k1q4sy">${escape_html(truncate(signal.content, 200))}</p> <div class="signal-actions svelte-1k1q4sy"><form method="POST" action="?/flag"><input type="hidden" name="id"${attr("value", signal.id)}/> <button type="submit" class="btn btn-flag svelte-1k1q4sy">Flag for Response</button></form> <form method="POST" action="?/dismiss"><input type="hidden" name="id"${attr("value", signal.id)}/> <button type="submit" class="btn btn-dismiss svelte-1k1q4sy">Dismiss</button></form> `);
              if (signal.source_url) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<a${attr("href", signal.source_url)} target="_blank" class="btn btn-link svelte-1k1q4sy">View</a>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]--></div></div>`);
            } else {
              $$renderer3.push("<!--[!-->");
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      variant: "glass",
      radius: "md",
      padding: "lg",
      class: "glass-emphasis",
      children: ($$renderer3) => {
        $$renderer3.push(`<h2 class="panel-title svelte-1k1q4sy">Warming Relationships</h2> <p class="panel-subtitle svelte-1k1q4sy">People engaging with your work</p> `);
        if (data.relationships.length === 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="empty-state svelte-1k1q4sy"><p>No tracked relationships yet</p></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div class="relationships-list svelte-1k1q4sy"><!--[-->`);
          const each_array_2 = ensure_array_like(data.relationships);
          for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
            let rel = each_array_2[$$index_2];
            $$renderer3.push(`<div class="relationship-item svelte-1k1q4sy"><div class="rel-header svelte-1k1q4sy"><span class="platform-badge svelte-1k1q4sy"${attr_style(`background: ${stringify(platformColors[rel.platform] || "#666")}`)}>${escape_html(rel.platform)}</span> <span class="lead-badge svelte-1k1q4sy"${attr_style(`background: ${stringify(leadColors[rel.lead_potential])}`)}>${escape_html(rel.lead_potential)}</span></div> <div class="rel-person svelte-1k1q4sy"><span class="person-name svelte-1k1q4sy">${escape_html(rel.person_name || rel.person_handle)}</span> `);
            if (rel.person_company) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<span class="person-company svelte-1k1q4sy">${escape_html(rel.person_company)}</span>`);
            } else {
              $$renderer3.push("<!--[!-->");
            }
            $$renderer3.push(`<!--]--></div> <div class="rel-stats svelte-1k1q4sy"><div class="warmth-bar svelte-1k1q4sy"><div class="warmth-fill svelte-1k1q4sy"${attr_style(`width: ${stringify(rel.warmth_score * 100)}%`)}></div></div> <span class="interactions svelte-1k1q4sy">${escape_html(rel.interactions_count)} interactions</span> <span class="last-seen svelte-1k1q4sy">${escape_html(formatTime(rel.last_interaction))}</span></div></div>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    $$renderer2.push(`<!----></div> <footer class="dashboard-footer svelte-1k1q4sy"><p>Generated ${escape_html(new Date(data.generatedAt).toLocaleTimeString())}</p> <a href="/admin/funnel" class="nav-link svelte-1k1q4sy">Back to Funnel</a></footer></main>`);
  });
}
export {
  _page as default
};
