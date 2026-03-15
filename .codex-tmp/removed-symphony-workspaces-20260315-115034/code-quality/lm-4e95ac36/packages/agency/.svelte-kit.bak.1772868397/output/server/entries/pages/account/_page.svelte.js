import { S as SEO } from "../../../chunks/SEO.js";
import { a9 as head, a6 as escape_html, aa as ensure_array_like, a4 as attr, a7 as attr_class } from "../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function AccountPage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      user,
      pageTitle,
      currentProperty,
      analytics
    } = $$props;
    let isLoggingOut = false;
    const propertyLabels = {
      ltd: "Philosophy",
      io: "Research",
      space: "Practice",
      agency: "Services",
      lms: "Learning"
    };
    const propertyUrls = {
      ltd: "https://createsomething.ltd/login?redirect=/account",
      io: "https://createsomething.io/login?redirect=/account",
      space: "https://createsomething.space/login?redirect=/account",
      agency: "https://createsomething.agency/login?redirect=/account",
      lms: "https://learn.createsomething.space/login?redirect=/account"
    };
    head("11moiyk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(pageTitle)}</title>`);
      });
    });
    $$renderer2.push(`<div class="account-container svelte-11moiyk"><div class="account-card svelte-11moiyk"><div class="account-header svelte-11moiyk"><div class="avatar svelte-11moiyk">${escape_html(user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?")}</div> <div class="account-info svelte-11moiyk"><h1 class="svelte-11moiyk">${escape_html(user?.name || "Anonymous")}</h1> <p class="email svelte-11moiyk">${escape_html(user?.email)}</p></div></div> <div class="account-sections svelte-11moiyk"><section class="account-section svelte-11moiyk"><h2 class="svelte-11moiyk">Account Details</h2> <div class="detail-row svelte-11moiyk"><span class="detail-label svelte-11moiyk">Email</span> <span class="detail-value svelte-11moiyk">${escape_html(user?.email)}</span></div> `);
    if (user?.name) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="detail-row svelte-11moiyk"><span class="detail-label svelte-11moiyk">Name</span> <span class="detail-value svelte-11moiyk">${escape_html(user.name)}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (user?.tier) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="detail-row svelte-11moiyk"><span class="detail-label svelte-11moiyk">Tier</span> <span class="detail-value tier svelte-11moiyk">${escape_html(user.tier)}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section> <section class="account-section svelte-11moiyk"><h2 class="svelte-11moiyk">Connected Properties</h2> <p class="section-description svelte-11moiyk">Your account works across all CREATE SOMETHING properties.</p> <div class="properties-grid svelte-11moiyk"><!--[-->`);
    const each_array = ensure_array_like(["ltd", "io", "space", "agency"]);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let prop = each_array[$$index];
      $$renderer2.push(`<a${attr("href", propertyUrls[prop])}${attr_class("property-link svelte-11moiyk", void 0, { "current": currentProperty === prop })}><span class="property-name svelte-11moiyk">.${escape_html(prop)}</span> <span class="property-label svelte-11moiyk">${escape_html(propertyLabels[prop])}</span></a>`);
    }
    $$renderer2.push(`<!--]--></div></section> `);
    if (analytics) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="account-section svelte-11moiyk"><h2 class="svelte-11moiyk">Your Activity</h2> `);
      analytics($$renderer2);
      $$renderer2.push(`<!----></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <section class="account-section svelte-11moiyk"><h2 class="svelte-11moiyk">Session</h2> <button class="logout-button svelte-11moiyk"${attr("disabled", isLoggingOut, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Sign out`);
    }
    $$renderer2.push(`<!--]--></button></section></div></div></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const accountUser = data.user;
    SEO($$renderer2, {
      title: "Account",
      description: "Manage your CREATE SOMETHING AGENCY account",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> `);
    AccountPage($$renderer2, {
      user: accountUser,
      pageTitle: "Account | CREATE SOMETHING AGENCY",
      currentProperty: "agency"
    });
    $$renderer2.push(`<!----> <section class="access-section svelte-8i5vi8"><div class="access-card svelte-8i5vi8"><div><h2 class="svelte-8i5vi8">MCP Access</h2> <p class="svelte-8i5vi8">Your personal bearer token, host setup snippets, and managed access scope now live on a dedicated
				page designed for safe reveal-and-copy workflows.</p></div> <a href="/mcp-access" class="access-link svelte-8i5vi8">Open MCP Access</a></div></section>`);
  });
}
export {
  _page as default
};
