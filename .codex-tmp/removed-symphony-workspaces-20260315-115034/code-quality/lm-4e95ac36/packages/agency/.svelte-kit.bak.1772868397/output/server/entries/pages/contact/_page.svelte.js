import { a7 as attr_class, a8 as stringify, a4 as attr, a6 as escape_html } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
import { A as AnimatedGridPattern } from "../../../chunks/AnimatedGridPattern.js";
import { B as BlurFade } from "../../../chunks/BlurFade.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function SavvyCalButton($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      variant = "primary",
      size = "md",
      class: className = "",
      children
    } = $$props;
    $$renderer2.push(`<button${attr_class(`booking-cta ${stringify(variant)} ${stringify(size)} ${stringify(className)}`, "svelte-ewpy59")} type="button">`);
    if (children) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span>Book a discovery call</span>`);
    }
    $$renderer2.push(`<!--]--></button>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let submitting = false;
    SEO($$renderer2, {
      title: "Start With the Right Workflow | CREATE SOMETHING .agency",
      description: "Book a workflow mapping session or send your workflow details. We’ll identify the safest starting wedge, the right level of reliability control, and whether enterprise extension is needed.",
      keywords: "workflow mapping, production automation, reliability controls, enterprise workflows, custom mcp, automation risk",
      ogImage: "/og-image.svg",
      propertyName: "agency"
    });
    $$renderer2.push(`<!----> <section class="hero svelte-1bv7ezn"><div class="hero-grid-container svelte-1bv7ezn">`);
    AnimatedGridPattern($$renderer2, {
      numSquares: 25,
      maxOpacity: 0.08,
      duration: 4,
      repeatDelay: 2,
      width: 60,
      height: 60,
      class: "hero-animated-grid"
    });
    $$renderer2.push(`<!----></div> <div class="hero-content svelte-1bv7ezn">`);
    BlurFade($$renderer2, {
      delay: 0,
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="hero-eyebrow svelte-1bv7ezn">Contact</p>`);
      }
    });
    $$renderer2.push(`<!----> `);
    BlurFade($$renderer2, {
      delay: 0.1,
      children: ($$renderer3) => {
        $$renderer3.push(`<h1 class="hero-title svelte-1bv7ezn">Start with the right workflow.</h1>`);
      }
    });
    $$renderer2.push(`<!----> `);
    BlurFade($$renderer2, {
      delay: 0.2,
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="hero-detail svelte-1bv7ezn">Book a workflow mapping session or send your workflow details. We’ll scope the safest
        starting wedge, then extend only where the risk justifies it.</p>`);
      }
    });
    $$renderer2.push(`<!----></div></section> <section class="contact-section svelte-1bv7ezn"><div class="contact-container svelte-1bv7ezn">`);
    BlurFade($$renderer2, {
      delay: 0.1,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="contact-option svelte-1bv7ezn"><h2 class="svelte-1bv7ezn">Book a Workflow Mapping Session</h2> <p class="svelte-1bv7ezn">20-minute mapping session. We map your tools, workflow bottlenecks, and risk profile to
          identify the right starting wedge.</p> <div class="cal-button svelte-1bv7ezn">`);
        SavvyCalButton($$renderer3, { variant: "primary", size: "lg" });
        $$renderer3.push(`<!----></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    BlurFade($$renderer2, {
      delay: 0.2,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="contact-option svelte-1bv7ezn"><h2 class="svelte-1bv7ezn">Send a message</h2> <p class="svelte-1bv7ezn">Not ready for a call? Send your stack, bottleneck, and current risk concerns.</p> <form class="contact-form svelte-1bv7ezn"><div class="form-field svelte-1bv7ezn"><label for="name" class="form-label svelte-1bv7ezn">Name</label> <input type="text" id="name" name="name" required class="form-input svelte-1bv7ezn" autocomplete="name"/></div> <div class="form-field svelte-1bv7ezn"><label for="email" class="form-label svelte-1bv7ezn">Email</label> <input type="email" id="email" name="email" required class="form-input svelte-1bv7ezn" autocomplete="email"/></div> <div class="form-field svelte-1bv7ezn"><label for="message" class="form-label svelte-1bv7ezn">Which workflow needs attention first?</label> <p class="form-helper svelte-1bv7ezn">Tell us your stack, constraints, and bottleneck. We’ll map it to a scoped MCP wedge,
              reliability controls, enterprise extension, or referral.</p> <textarea id="message" name="message" required rows="4" class="form-input form-textarea svelte-1bv7ezn" placeholder="e.g., HubSpot + Notion + Slack. This workflow breaks at handoff, and we need a safer MCP-based starting point before expanding automation."></textarea></div> <button type="submit"${attr("disabled", submitting, true)} class="form-submit svelte-1bv7ezn">${escape_html("Send")}</button> `);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></form></div>`);
      }
    });
    $$renderer2.push(`<!----></div></section> <section class="email-section svelte-1bv7ezn"><div class="section-container svelte-1bv7ezn">`);
    BlurFade($$renderer2, {
      delay: 0.3,
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="email-text svelte-1bv7ezn">Or email directly: <a href="mailto:micah@createsomething.agency" class="email-link svelte-1bv7ezn">micah@createsomething.agency</a></p>`);
      }
    });
    $$renderer2.push(`<!----></div></section>`);
  });
}
export {
  _page as default
};
