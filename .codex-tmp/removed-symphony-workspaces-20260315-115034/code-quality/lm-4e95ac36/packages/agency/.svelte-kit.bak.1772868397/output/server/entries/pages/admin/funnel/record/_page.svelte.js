import { a4 as attr, a6 as escape_html } from "../../../../../chunks/index.js";
import { S as SEO } from "../../../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let submitting = false;
    let linkedin_impressions = void 0;
    let linkedin_reach = void 0;
    let linkedin_followers = void 0;
    let linkedin_follower_delta = void 0;
    let linkedin_engagements = void 0;
    let linkedin_profile_views = void 0;
    let website_visits = void 0;
    let website_unique_visitors = void 0;
    let content_downloads = void 0;
    let discovery_calls_scheduled = void 0;
    let discovery_calls_completed = void 0;
    let proposals_sent = void 0;
    let deals_closed = void 0;
    let revenue_closed = void 0;
    let notes = "";
    SEO($$renderer2, {
      title: "Admin - Record Metrics",
      description: "Administrative dashboard",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <main class="page svelte-l498x7"><header class="header svelte-l498x7"><a href="/admin/funnel" class="back-link svelte-l498x7">← Back to Dashboard</a> <h1 class="svelte-l498x7">Record Daily Metrics</h1> <p class="subtitle svelte-l498x7">Enter metrics for a specific date. Existing data for the date will be updated.</p></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <form><section class="section svelte-l498x7"><h2 class="section-title svelte-l498x7">Date</h2> <div class="field svelte-l498x7"><label for="date" class="svelte-l498x7">Metrics Date</label> <input type="date" id="date"${attr("value", date)} required class="svelte-l498x7"/></div></section> <section class="section svelte-l498x7"><h2 class="section-title svelte-l498x7">LinkedIn Metrics</h2> <p class="section-help svelte-l498x7">From LinkedIn Analytics → Content &amp; Activity</p> <div class="fields-grid svelte-l498x7"><div class="field svelte-l498x7"><label for="impressions" class="svelte-l498x7">Impressions</label> <input type="number" id="impressions"${attr("value", linkedin_impressions)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="reach" class="svelte-l498x7">Reach (Members)</label> <input type="number" id="reach"${attr("value", linkedin_reach)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="engagements" class="svelte-l498x7">Engagements</label> <input type="number" id="engagements"${attr("value", linkedin_engagements)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="profile_views" class="svelte-l498x7">Profile Views</label> <input type="number" id="profile_views"${attr("value", linkedin_profile_views)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="followers" class="svelte-l498x7">Total Followers</label> <input type="number" id="followers"${attr("value", linkedin_followers)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="follower_delta" class="svelte-l498x7">New Followers</label> <input type="number" id="follower_delta"${attr("value", linkedin_follower_delta)} placeholder="0" class="svelte-l498x7"/></div></div></section> <section class="section svelte-l498x7"><h2 class="section-title svelte-l498x7">Website Metrics</h2> <p class="section-help svelte-l498x7">From Cloudflare Analytics or your analytics tool</p> <div class="fields-grid svelte-l498x7"><div class="field svelte-l498x7"><label for="visits" class="svelte-l498x7">Total Visits</label> <input type="number" id="visits"${attr("value", website_visits)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="unique" class="svelte-l498x7">Unique Visitors</label> <input type="number" id="unique"${attr("value", website_unique_visitors)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="downloads" class="svelte-l498x7">Content Downloads</label> <input type="number" id="downloads"${attr("value", content_downloads)} min="0" placeholder="0" class="svelte-l498x7"/></div></div></section> <section class="section svelte-l498x7"><h2 class="section-title svelte-l498x7">Pipeline Metrics</h2> <p class="section-help svelte-l498x7">Sales activity for the day</p> <div class="fields-grid svelte-l498x7"><div class="field svelte-l498x7"><label for="calls_scheduled" class="svelte-l498x7">Calls Scheduled</label> <input type="number" id="calls_scheduled"${attr("value", discovery_calls_scheduled)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="calls_completed" class="svelte-l498x7">Calls Completed</label> <input type="number" id="calls_completed"${attr("value", discovery_calls_completed)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="proposals" class="svelte-l498x7">Proposals Sent</label> <input type="number" id="proposals"${attr("value", proposals_sent)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="deals" class="svelte-l498x7">Deals Closed</label> <input type="number" id="deals"${attr("value", deals_closed)} min="0" placeholder="0" class="svelte-l498x7"/></div> <div class="field svelte-l498x7"><label for="revenue" class="svelte-l498x7">Revenue Closed ($)</label> <input type="number" id="revenue"${attr("value", revenue_closed)} min="0" step="0.01" placeholder="0.00" class="svelte-l498x7"/></div></div></section> <section class="section svelte-l498x7"><h2 class="section-title svelte-l498x7">Notes</h2> <div class="field svelte-l498x7"><label for="notes" class="svelte-l498x7">Daily Notes (optional)</label> <textarea id="notes" rows="3" placeholder="Top performing posts, observations, etc." class="svelte-l498x7">`);
    const $$body = escape_html(notes);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></div></section> <div class="actions svelte-l498x7"><button type="submit" class="submit-btn svelte-l498x7"${attr("disabled", submitting, true)}>${escape_html("Record Metrics")}</button></div></form></main>`);
  });
}
export {
  _page as default
};
