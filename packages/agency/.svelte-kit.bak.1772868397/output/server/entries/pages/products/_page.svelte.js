import { aa as ensure_array_like, a4 as attr, a6 as escape_html } from "../../../chunks/index.js";
import { p as products } from "../../../chunks/services.js";
import { S as SEO } from "../../../chunks/SEO.js";
import { A as AnimatedGridPattern } from "../../../chunks/AnimatedGridPattern.js";
import { B as BlurFade } from "../../../chunks/BlurFade.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const featured = products.filter((p) => p.category === "featured");
    products.filter((p) => p.category === "developer-tools");
    products.filter((p) => p.category === "framework");
    const integrations = products.filter((p) => p.category === "integration");
    const clientWork = products.filter((p) => p.category === "client");
    function isExternal(href) {
      return !!href && href.startsWith("http");
    }
    SEO($$renderer2, {
      title: "What I've Built | Production Workflow MCPs",
      description: "Open source tools and custom integrations connecting business tools to AI. Notion, Gmail, Zoom, Salesforce, HubSpot, Procore, and more.",
      keywords: "AI integrations, business tool automation, Notion AI, Gmail AI, Zoom AI, Salesforce AI, custom AI development, MCP servers",
      ogImage: "/og-image.svg",
      propertyName: "agency"
    });
    $$renderer2.push(`<!----> <section class="hero svelte-1dj9mz1"><div class="hero-grid-container svelte-1dj9mz1">`);
    AnimatedGridPattern($$renderer2, {
      numSquares: 25,
      maxOpacity: 0.08,
      duration: 4,
      repeatDelay: 2,
      width: 60,
      height: 60,
      class: "hero-animated-grid"
    });
    $$renderer2.push(`<!----></div> <div class="hero-content svelte-1dj9mz1">`);
    BlurFade($$renderer2, {
      delay: 0,
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="hero-eyebrow svelte-1dj9mz1">Open Source + Custom</p>`);
      }
    });
    $$renderer2.push(`<!----> `);
    BlurFade($$renderer2, {
      delay: 0.1,
      children: ($$renderer3) => {
        $$renderer3.push(`<h1 class="hero-title svelte-1dj9mz1">What I've Built</h1>`);
      }
    });
    $$renderer2.push(`<!----> `);
    BlurFade($$renderer2, {
      delay: 0.2,
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="hero-subtitle svelte-1dj9mz1">Open source tools, platform connectors, and custom builds for production workflows.</p>`);
      }
    });
    $$renderer2.push(`<!----></div></section> <section class="products-section svelte-1dj9mz1"><div class="section-inner svelte-1dj9mz1">`);
    BlurFade($$renderer2, {
      delay: 0.1,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="section-header svelte-1dj9mz1"><h2 class="section-eyebrow svelte-1dj9mz1">Flagship Tools</h2> <p class="section-desc svelte-1dj9mz1">Install in 2 minutes. Powering the same agents we build for clients.</p></div>`);
      }
    });
    $$renderer2.push(`<!----> <div class="featured-grid svelte-1dj9mz1"><!--[-->`);
    const each_array = ensure_array_like(featured);
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let product = each_array[index];
      BlurFade($$renderer2, {
        delay: 0.2 + index * 0.1,
        children: ($$renderer3) => {
          $$renderer3.push(`<a${attr("href", product.href)} class="product-card featured-card svelte-1dj9mz1"><div class="product-badge badge-oss svelte-1dj9mz1">${escape_html(product.badge)}</div> <h3 class="product-name svelte-1dj9mz1">${escape_html(product.title)}</h3> <p class="product-tagline svelte-1dj9mz1">${escape_html(product.tagline)}</p> <p class="product-description svelte-1dj9mz1">${escape_html(product.description)}</p> <div class="product-footer svelte-1dj9mz1">`);
          if (product.npmPackage) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<code class="product-npm svelte-1dj9mz1">${escape_html(product.npmPackage)}</code>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> <span class="product-cta svelte-1dj9mz1">Install →</span></div></a>`);
        }
      });
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="products-section svelte-1dj9mz1"><div class="section-inner svelte-1dj9mz1">`);
    BlurFade($$renderer2, {
      delay: 0.1,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="section-header svelte-1dj9mz1"><h2 class="section-eyebrow svelte-1dj9mz1">Integration MCPs</h2> <p class="section-desc svelte-1dj9mz1">Bridges between your platforms and the agents that serve you.</p></div>`);
      }
    });
    $$renderer2.push(`<!----> <div class="category-grid svelte-1dj9mz1"><!--[-->`);
    const each_array_1 = ensure_array_like(integrations);
    for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
      let product = each_array_1[index];
      BlurFade($$renderer2, {
        delay: 0.2 + index * 0.1,
        children: ($$renderer3) => {
          $$renderer3.push(`<a${attr("href", product.href)} class="product-card category-card svelte-1dj9mz1"${attr("target", isExternal(product.href) ? "_blank" : void 0)}${attr("rel", isExternal(product.href) ? "noopener noreferrer" : void 0)}><div class="product-badge badge-neutral svelte-1dj9mz1">${escape_html(product.badge)}</div> <h3 class="product-name svelte-1dj9mz1">${escape_html(product.title)}</h3> <p class="product-tagline svelte-1dj9mz1">${escape_html(product.tagline)}</p> <p class="product-description svelte-1dj9mz1">${escape_html(product.description)}</p> <span class="product-cta svelte-1dj9mz1">View on GitHub →</span></a>`);
        }
      });
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="products-section svelte-1dj9mz1"><div class="section-inner svelte-1dj9mz1">`);
    BlurFade($$renderer2, {
      delay: 0.1,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="section-header svelte-1dj9mz1"><h2 class="section-eyebrow svelte-1dj9mz1">Client Portfolio</h2> <p class="section-desc svelte-1dj9mz1">MCPs we've built for specific clients and workflows.</p></div>`);
      }
    });
    $$renderer2.push(`<!----> <div class="client-grid svelte-1dj9mz1"><!--[-->`);
    const each_array_2 = ensure_array_like(clientWork);
    for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
      let product = each_array_2[index];
      BlurFade($$renderer2, {
        delay: 0.2 + index * 0.1,
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="client-card svelte-1dj9mz1"><div class="client-card-header svelte-1dj9mz1"><div class="product-badge badge-accent svelte-1dj9mz1">${escape_html(product.badge)}</div> `);
          if (product.client) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<span class="client-name svelte-1dj9mz1">for ${escape_html(product.client)}</span>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></div> <h3 class="product-name svelte-1dj9mz1">${escape_html(product.title)}</h3> <p class="product-tagline svelte-1dj9mz1">${escape_html(product.tagline)}</p> <p class="product-description svelte-1dj9mz1">${escape_html(product.description)}</p> `);
          if (product.integrations && product.integrations.length > 0) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="integration-tags svelte-1dj9mz1"><!--[-->`);
            const each_array_3 = ensure_array_like(product.integrations);
            for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
              let integration = each_array_3[$$index_2];
              $$renderer3.push(`<span class="integration-tag svelte-1dj9mz1">${escape_html(integration)}</span>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></div>`);
        }
      });
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="cta-section svelte-1dj9mz1"><div class="section-container svelte-1dj9mz1">`);
    BlurFade($$renderer2, {
      delay: 0.1,
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="cta-heading svelte-1dj9mz1">Need something custom?</p>`);
      }
    });
    $$renderer2.push(`<!----> `);
    BlurFade($$renderer2, {
      delay: 0.2,
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="cta-subtext svelte-1dj9mz1">I build integrations for your specific tools and workflows.</p>`);
      }
    });
    $$renderer2.push(`<!----> `);
    BlurFade($$renderer2, {
      delay: 0.3,
      children: ($$renderer3) => {
        $$renderer3.push(`<a href="/book" class="cta-link svelte-1dj9mz1">Book a call →</a>`);
      }
    });
    $$renderer2.push(`<!----></div></section>`);
  });
}
export {
  _page as default
};
