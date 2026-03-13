import { aa as ensure_array_like, a7 as attr_class, a5 as attr_style, a8 as stringify, a6 as escape_html } from "../../../../chunks/index.js";
import { S as SEO } from "../../../../chunks/SEO.js";
import { C as Card } from "../../../../chunks/Card.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const statusColors = {
      complete: "var(--color-success)",
      in_progress: "var(--color-info)",
      pending: "var(--color-fg-muted)",
      missed: "var(--color-error)",
      posted: "var(--color-success)",
      failed: "var(--color-error)"
    };
    const dayLabels = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri"
    };
    const rhythm = (() => data.rhythm)();
    const stats = (() => data.stats)();
    SEO($$renderer2, {
      title: "Admin - Social Calendar",
      description: "Administrative dashboard",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <main class="dashboard svelte-ai9coo"><header class="header svelte-ai9coo"><h1 class="svelte-ai9coo">Social Calendar</h1> <p class="subtitle svelte-ai9coo">Agent-native content scheduling with full observability</p></header> `);
    if (data.tokenStatus) {
      $$renderer2.push("<!--[-->");
      Card($$renderer2, {
        variant: "glass",
        radius: "md",
        padding: "none",
        class: `glass-emphasis banner ${data.tokenStatus.warning ? "warning" : ""} ${!data.tokenStatus.connected ? "disconnected" : ""}`,
        children: ($$renderer3) => {
          if (!data.tokenStatus.connected) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<span class="banner-icon">⚠</span> <span>LinkedIn disconnected. <a href="https://createsomething.io/api/linkedin/auth">Reconnect</a></span>`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (data.tokenStatus.warning) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<span class="banner-icon">⚠</span> <span>${escape_html(data.tokenStatus.warning)}</span>`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<span class="banner-icon">✓</span> <span>LinkedIn connected (${escape_html(data.tokenStatus.daysRemaining)} days remaining)</span>`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <section class="section svelte-ai9coo"><h2 class="section-title svelte-ai9coo">Weekly Rhythm</h2> <p class="section-subtitle svelte-ai9coo">Clay Playbook adherence for this week</p> <div class="rhythm-grid svelte-ai9coo"><!--[-->`);
    const each_array = ensure_array_like(["monday", "tuesday", "wednesday", "thursday", "friday"]);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let day = each_array[$$index];
      const dayData = rhythm?.[day];
      $$renderer2.push(`<div${attr_class("rhythm-day svelte-ai9coo", void 0, { "today": data.currentDay === day })}${attr_style(`--status-color: ${stringify(statusColors[dayData?.status || "pending"])}`)}><div class="day-header svelte-ai9coo"><span class="day-label svelte-ai9coo">${escape_html(dayLabels[day])}</span> <span class="day-status svelte-ai9coo">${escape_html(dayData?.status || "pending")}</span></div> <div class="day-focus svelte-ai9coo">${escape_html(dayData?.focus || "")}</div> `);
      if (dayData?.post) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="day-content svelte-ai9coo">${escape_html(dayData.post.preview)}</div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="day-empty svelte-ai9coo">No content</div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (data.gaps && data.gaps.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="gaps-alert svelte-ai9coo"><strong>${escape_html(data.gaps.length)} gap${escape_html(data.gaps.length > 1 ? "s" : "")}</strong> in schedule.
				Next slot: <strong>${escape_html(data.nextSlot?.formatted)}</strong></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section> <section class="section svelte-ai9coo"><h2 class="section-title svelte-ai9coo">Today's Focus</h2> `);
    Card($$renderer2, {
      variant: "glass",
      radius: "md",
      padding: "none",
      class: "glass-emphasis focus-card",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="focus-day svelte-ai9coo">${escape_html(data.currentDay)}</div> <div class="focus-title svelte-ai9coo">${escape_html(data.todaysFocus)}</div> <div class="focus-description svelte-ai9coo">${escape_html(rhythm?.[data.currentDay || ""]?.description || "No focus defined")}</div>`);
      }
    });
    $$renderer2.push(`<!----></section> <section class="section svelte-ai9coo"><h2 class="section-title svelte-ai9coo">Statistics</h2> <div class="stats-grid svelte-ai9coo"><div class="stat-card svelte-ai9coo"><span class="stat-value svelte-ai9coo">${escape_html(stats?.pending || 0)}</span> <span class="stat-label svelte-ai9coo">Pending</span></div> <div class="stat-card svelte-ai9coo"><span class="stat-value svelte-ai9coo">${escape_html(stats?.posted || 0)}</span> <span class="stat-label svelte-ai9coo">Posted</span></div> <div class="stat-card svelte-ai9coo"><span class="stat-value svelte-ai9coo">${escape_html(stats?.failed || 0)}</span> <span class="stat-label svelte-ai9coo">Failed</span></div></div></section> <section class="section svelte-ai9coo"><h2 class="section-title svelte-ai9coo">Schedule</h2> `);
    if (data.posts && data.posts.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="posts-list svelte-ai9coo"><!--[-->`);
      const each_array_1 = ensure_array_like(data.posts);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let post = each_array_1[$$index_1];
        $$renderer2.push(`<div${attr_class("post-card svelte-ai9coo", void 0, { "past": post.isPast })}><div class="post-time svelte-ai9coo">${escape_html(post.scheduledForFormatted)}</div> <div class="post-content svelte-ai9coo"><div class="post-preview svelte-ai9coo">${escape_html(post.preview)}</div> `);
        if (post.campaign) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="post-campaign svelte-ai9coo">${escape_html(post.campaign)}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="post-status svelte-ai9coo"${attr_style(`--status-color: ${stringify(statusColors[post.status])}`)}>${escape_html(post.status)}</div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<p class="empty-state svelte-ai9coo">No posts scheduled. Use MCP tools or the API to schedule content.</p>`);
    }
    $$renderer2.push(`<!--]--></section> <section class="section svelte-ai9coo"><h2 class="section-title svelte-ai9coo">API Endpoints</h2> <div class="api-links svelte-ai9coo"><a href="/api/social/status" class="api-link svelte-ai9coo" target="_blank">/api/social/status</a> <a href="/api/social/gaps" class="api-link svelte-ai9coo" target="_blank">/api/social/gaps</a> <a href="/api/social/rhythm" class="api-link svelte-ai9coo" target="_blank">/api/social/rhythm</a> <a href="/api/social/suggest" class="api-link svelte-ai9coo" target="_blank">/api/social/suggest</a></div></section> <section class="section svelte-ai9coo"><h2 class="section-title svelte-ai9coo">MCP Tools</h2> <div class="tools-grid svelte-ai9coo"><div class="tool-card svelte-ai9coo"><code class="svelte-ai9coo">social_status</code> <span class="svelte-ai9coo">Check schedule state</span></div> <div class="tool-card svelte-ai9coo"><code class="svelte-ai9coo">social_gaps</code> <span class="svelte-ai9coo">Find posting gaps</span></div> <div class="tool-card svelte-ai9coo"><code class="svelte-ai9coo">social_schedule</code> <span class="svelte-ai9coo">Schedule content</span></div> <div class="tool-card svelte-ai9coo"><code class="svelte-ai9coo">social_suggest</code> <span class="svelte-ai9coo">Get suggestions</span></div> <div class="tool-card svelte-ai9coo"><code class="svelte-ai9coo">social_rhythm</code> <span class="svelte-ai9coo">Check rhythm</span></div> <div class="tool-card svelte-ai9coo"><code class="svelte-ai9coo">social_cancel</code> <span class="svelte-ai9coo">Cancel a post</span></div></div></section></main>`);
  });
}
export {
  _page as default
};
