import { ae as fallback, a4 as attr, a7 as attr_class, ag as clsx, ab as bind_props, aa as ensure_array_like, a6 as escape_html } from "../../../chunks/index.js";
import { H as HubMcpFlow, M as Marquee } from "../../../chunks/HubMcpFlow.js";
import { S as SEO } from "../../../chunks/SEO.js";
import { A as AnimatedGridPattern } from "../../../chunks/AnimatedGridPattern.js";
import { B as BlurFade } from "../../../chunks/BlurFade.js";
import { B as BorderBeam } from "../../../chunks/BorderBeam.js";
import { S as ShimmerButton } from "../../../chunks/ShimmerButton.js";
function BrandLogo($$renderer, $$props) {
  let d;
  let name = $$props["name"];
  let size = fallback($$props["size"], 24);
  let color = fallback($$props["color"], "currentColor");
  let className = fallback($$props["className"], "");
  const paths = {
    SvelteKit: "M10.354 21.125a4.44 4.44 0 0 1-4.765-1.767 4.109 4.109 0 0 1-.703-3.107 3.898 3.898 0 0 1 .134-.522l.105-.321.287.21a7.21 7.21 0 0 0 2.186 1.092l.208.063-.02.208a1.253 1.253 0 0 0 .226.83 1.337 1.337 0 0 0 1.435.533 1.231 1.231 0 0 0 .343-.15l5.59-3.562a1.164 1.164 0 0 0 .524-.778 1.242 1.242 0 0 0-.211-.937 1.338 1.338 0 0 0-1.435-.533 1.23 1.23 0 0 0-.343.15l-2.133 1.36a4.078 4.078 0 0 1-1.135.499 4.44 4.44 0 0 1-4.765-1.766 4.108 4.108 0 0 1-.702-3.108 3.855 3.855 0 0 1 1.742-2.582l5.589-3.563a4.072 4.072 0 0 1 1.135-.499 4.44 4.44 0 0 1 4.765 1.767 4.109 4.109 0 0 1 .703 3.107 3.943 3.943 0 0 1-.134.522l-.105.321-.286-.21a7.204 7.204 0 0 0-2.187-1.093l-.208-.063.02-.207a1.255 1.255 0 0 0-.226-.831 1.337 1.337 0 0 0-1.435-.532 1.231 1.231 0 0 0-.343.15L8.62 9.368a1.162 1.162 0 0 0-.524.778 1.24 1.24 0 0 0 .211.937 1.338 1.338 0 0 0 1.435.533 1.235 1.235 0 0 0 .344-.151l2.132-1.36a4.067 4.067 0 0 1 1.135-.498 4.44 4.44 0 0 1 4.765 1.766 4.108 4.108 0 0 1 .702 3.108 3.857 3.857 0 0 1-1.742 2.583l-5.589 3.562a4.072 4.072 0 0 1-1.135.499m10.358-17.95C18.484-.015 14.082-.96 10.9 1.068L5.31 4.63a6.412 6.412 0 0 0-2.896 4.295 6.753 6.753 0 0 0 .666 4.336 6.43 6.43 0 0 0-.96 2.396 6.833 6.833 0 0 0 1.168 5.167c2.229 3.19 6.63 4.135 9.812 2.108l5.59-3.562a6.41 6.41 0 0 0 2.896-4.295 6.756 6.756 0 0 0-.665-4.336 6.429 6.429 0 0 0 .958-2.396 6.831 6.831 0 0 0-1.167-5.168Z",
    TypeScript: "M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z",
    "Notion API": "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z",
    "Cloudflare Workers": "M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727",
    "Cloudflare D1": "M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727",
    "Durable Objects": "M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727",
    "Anthropic Claude": "M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"
  };
  paths["Model Context Protocol"] = "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12";
  d = paths[name] || "";
  if (d) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg"${attr("width", size)}${attr("height", size)} viewBox="0 0 24 24"${attr("fill", color)}${attr_class(clsx(className), "svelte-1ff3ueu")} role="img"${attr("aria-label", name)}>`);
    if (name === "Model Context Protocol") {
      $$renderer.push("<!--[-->");
      $$renderer.push(`<path${attr("d", d)} fill="none"${attr("stroke", color)} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>`);
    } else {
      $$renderer.push("<!--[!-->");
      $$renderer.push(`<path${attr("d", d)}></path>`);
    }
    $$renderer.push(`<!--]--></svg>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]-->`);
  bind_props($$props, { name, size, color, className });
}
function _page($$renderer) {
  const deliveryVector = {
    clientFacingLabel: "Skills + MCP",
    technicalLabel: "MCP + Skills"
  };
  const stackItems = [
    { name: "Model Context Protocol", type: "Connectivity" },
    { name: "Cloudflare Workers", type: "Compute" },
    { name: "Cloudflare D1", type: "Persistence" },
    { name: "Anthropic Claude", type: "Intelligence" },
    { name: "Durable Objects", type: "State Coordination" },
    { name: "SvelteKit", type: "Client Runtime" },
    { name: "TypeScript", type: "Safety" },
    { name: "Notion API", type: "Operating Interface" }
  ];
  const services = [
    {
      name: "Workflow Infrastructure",
      description: "Production-safe workflow infrastructure for cross-system operations, automation, and AI execution.",
      type: "Implementation Sprint",
      price: "Custom",
      priceDescription: "Scoped build"
    },
    {
      name: "Reliability and Control Layer",
      description: `Operational safeguards delivered with ${deliveryVector.clientFacingLabel}: evals, policy controls, release gates, and incident loops.`,
      type: "Add-on Retainer",
      price: "Custom",
      priceDescription: "Monthly"
    },
    {
      name: "Enterprise Extension",
      description: "Custom orchestration and governance for high-stakes, cross-system, and compliance-heavy workflows.",
      type: "Project + Managed",
      price: "Custom",
      priceDescription: "Scoped implementation"
    }
  ];
  const faqItems = [
    {
      question: "What is your primary service?",
      answer: "Workflow Infrastructure for production business workflows. Reliability and Control Layer and Enterprise Extension are added as workflow complexity and operational risk increase."
    },
    {
      question: "Do you build full business systems and run onboarding?",
      answer: "When system development and team onboarding are the primary need, I provide a direct referral path to Half Dozen."
    },
    {
      question: "What does .agency own?",
      answer: ".agency owns workflow infrastructure design, reliability controls, trust boundaries, and enterprise extension architecture."
    },
    {
      question: "When should we add the Reliability and Control Layer?",
      answer: "Add it when failures become expensive, workflows become autonomous, or multiple systems must stay in sync. It is the reliability gate before scale."
    },
    {
      question: "When do we need Enterprise Extension?",
      answer: "Use Enterprise Extension for regulated, high-volume, or cross-system operations requiring deterministic retries, auditability, and custom trust boundaries."
    },
    {
      question: "Do you still offer MCP-only?",
      answer: "Yes. MCP-only remains a scoped wedge for discovery and compliance-constrained rollouts, but default delivery moves to outcomes and operational reliability."
    },
    {
      question: "Do clients own the implementation?",
      answer: "Yes. Clients retain ownership of code, workflows, and operating documentation. We optimize for portability and long-term control."
    },
    {
      question: "Why the phrase Skills + MCP?",
      answer: `Client-facing delivery is ${deliveryVector.clientFacingLabel}. Technical proof uses ${deliveryVector.technicalLabel}: MCP handles trust and connectivity while Skills carry behavior and workflow intent.`
    }
  ];
  SEO($$renderer, {
    title: "How We Work | Production-Safe Workflow Infrastructure",
    description: "CREATE SOMETHING .agency builds production-safe workflow infrastructure for technical operators: reliability controls, trust boundaries, and enterprise automation architecture.",
    keywords: "workflow infrastructure, production automation, technical operators, agent reliability, enterprise automation architecture, custom mcp",
    ogImage: "/og-image.svg",
    propertyName: "agency",
    services,
    faqItems
  });
  $$renderer.push(`<!----> <section class="hero svelte-4z030h"><div class="hero-grid-container svelte-4z030h">`);
  AnimatedGridPattern($$renderer, {
    numSquares: 25,
    maxOpacity: 0.08,
    duration: 4,
    repeatDelay: 2,
    width: 60,
    height: 60,
    class: "hero-animated-grid"
  });
  $$renderer.push(`<!----></div> <div class="hero-content svelte-4z030h">`);
  BlurFade($$renderer, {
    delay: 0,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-eyebrow svelte-4z030h">How I Work</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h1 class="hero-title svelte-4z030h">Production-grade automation for connected systems.</h1>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-subtitle svelte-4z030h">We help CTOs and engineering leaders orchestrate the tools their teams already rely on,
        add control layers around AI execution, and keep cross-system work reliable in production.
        Start with Workflow Infrastructure. Add the Reliability and Control Layer when failure cost
        rises. Escalate to Enterprise Extension for high-stakes operations.</p>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="flow-section svelte-4z030h"><div class="section-container svelte-4z030h">`);
  BlurFade($$renderer, {
    delay: 0.3,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="mcp-flow-wrapper svelte-4z030h">`);
      HubMcpFlow($$renderer2);
      $$renderer2.push(`<!----></div> <p class="mcp-flow-caption svelte-4z030h">Hub MCP routes execution. Reliability controls decide what can run safely.</p>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="stack-section svelte-4z030h"><div class="section-container svelte-4z030h">`);
  BlurFade($$renderer, {
    delay: 0.4,
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading-sm svelte-4z030h">The Reliability Stack</h2>`);
    }
  });
  $$renderer.push(`<!----></div> `);
  BlurFade($$renderer, {
    delay: 0.5,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="marquee-wrapper svelte-4z030h"><div class="marquee-fade-left svelte-4z030h"></div> <div class="marquee-fade-right svelte-4z030h"></div> `);
      Marquee($$renderer2, {
        pauseOnHover: true,
        duration: 40,
        gap: 24,
        repeat: 2,
        class: "stack-marquee",
        children: ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array = ensure_array_like(stackItems);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let item = each_array[$$index];
            $$renderer3.push(`<div class="stack-card svelte-4z030h"><span class="stack-type svelte-4z030h">${escape_html(item.type)}</span> <div class="stack-name-group svelte-4z030h">`);
            BrandLogo($$renderer3, { name: item.name, size: 18, className: "text-white/70" });
            $$renderer3.push(`<!----> <span class="stack-name svelte-4z030h">${escape_html(item.name)}</span></div></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        }
      });
      $$renderer2.push(`<!----></div>`);
    }
  });
  $$renderer.push(`<!----></section> <section class="retainer-section svelte-4z030h"><div class="section-container svelte-4z030h">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="retainer-card svelte-4z030h">`);
      BorderBeam($$renderer2, { size: 300, duration: 12, delay: 9 });
      $$renderer2.push(`<!----> <div class="retainer-header svelte-4z030h"><div class="retainer-pricing svelte-4z030h"><div class="retainer-price svelte-4z030h">Workflow Infrastructure</div> <div class="retainer-period svelte-4z030h">The operating model for reliable automation</div></div> <p class="retainer-note svelte-4z030h">A model for moving from brittle scripts and one-off glue code to resilient systems.<br/> Built for teams carrying real execution and incident risk.</p></div> <div class="retainer-body svelte-4z030h"><div class="retainer-columns svelte-4z030h"><div class="retainer-detail svelte-4z030h"><h3 class="svelte-4z030h">Operating Principles</h3> <ul class="retainer-list svelte-4z030h"><li class="svelte-4z030h"><strong>Delivery Vector:</strong> ${escape_html(deliveryVector.clientFacingLabel)}</li> <li class="svelte-4z030h"><strong>Focus:</strong> We remove integration drag and build reliable boundaries;
                  basic setup is assumed.</li> <li class="svelte-4z030h"><strong>Discovery:</strong> MCP-only available as an isolated entry wedge.</li> <li class="svelte-4z030h"><strong>Referrals:</strong> System-development-first engagements routed to partners.</li> <li class="svelte-4z030h"><strong>Ownership:</strong> Client owns all code, workflows, and operating artifacts.</li></ul></div> <div class="retainer-detail svelte-4z030h"><h3 class="svelte-4z030h">When to Escalate</h3> <ul class="retainer-list svelte-4z030h"><li class="svelte-4z030h">Repeated automation failures or high incident cost</li> <li class="svelte-4z030h">Cross-system workflow coupling and data drift risk</li> <li class="svelte-4z030h">Regulated or high-stakes operations requiring auditability</li> <li class="svelte-4z030h">Need for deterministic retries/idempotency</li> <li class="svelte-4z030h">Enterprise security or trust-boundary requirements</li></ul></div></div> <div class="retainer-callout svelte-4z030h"><p class="svelte-4z030h">Tool setup and onboarding are necessary but not sufficient for production automation.
              The durable value is in reliability engineering, trust boundaries, and extension
              architecture that lowers operational risk over time.</p></div></div></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="retainer-section svelte-4z030h"><div class="section-container svelte-4z030h">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-4z030h">What Ships Every Engagement</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="artifact-grid svelte-4z030h"><div class="artifact-doc-card svelte-4z030h"><div class="artifact-doc-header svelte-4z030h"><span class="artifact-doc-dot svelte-4z030h"></span> <span class="artifact-doc-name svelte-4z030h">mcp_contract.yaml</span></div> <p class="artifact-doc-desc svelte-4z030h">Tools, resources, auth scopes, and error model</p></div> <div class="artifact-doc-card svelte-4z030h"><div class="artifact-doc-header svelte-4z030h"><span class="artifact-doc-dot svelte-4z030h"></span> <span class="artifact-doc-name svelte-4z030h">agent_contract.yaml</span></div> <p class="artifact-doc-desc svelte-4z030h">Allowed actions, approvals, and escalation rules</p></div> <div class="artifact-doc-card svelte-4z030h"><div class="artifact-doc-header svelte-4z030h"><span class="artifact-doc-dot svelte-4z030h"></span> <span class="artifact-doc-name svelte-4z030h">outcome_contract.md</span></div> <p class="artifact-doc-desc svelte-4z030h">Workflow targets, success criteria, and fallback path</p></div> <div class="artifact-doc-card svelte-4z030h"><div class="artifact-doc-header svelte-4z030h"><span class="artifact-doc-dot svelte-4z030h"></span> <span class="artifact-doc-name svelte-4z030h">golden_tasks.yaml</span></div> <p class="artifact-doc-desc svelte-4z030h">Release gate checks and latest pass/fail status</p></div> <div class="artifact-doc-card svelte-4z030h"><div class="artifact-doc-header svelte-4z030h"><span class="artifact-doc-dot svelte-4z030h"></span> <span class="artifact-doc-name svelte-4z030h">runbook.md</span></div> <p class="artifact-doc-desc svelte-4z030h">Incident response, rollback, and ownership boundaries</p></div></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="timeline-section svelte-4z030h"><div class="section-container svelte-4z030h">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-4z030h">What a Month Looks Like</h2>`);
    }
  });
  $$renderer.push(`<!----> <div class="timeline-grid svelte-4z030h">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="timeline-card svelte-4z030h"><span class="timeline-label svelte-4z030h">Phase 1</span> <h3 class="svelte-4z030h">Workflow Infrastructure</h3> <p class="svelte-4z030h">Implement the highest-value cross-system workflows with clear trust boundaries and
            production behavior.</p></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="timeline-card svelte-4z030h"><span class="timeline-label svelte-4z030h">Phase 2</span> <h3 class="svelte-4z030h">Reliability and Control</h3> <p class="svelte-4z030h">.agency adds eval coverage, release checks, policy envelopes, and incident loops as
            automation scope, business criticality, and risk increase.</p></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.3,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="timeline-card svelte-4z030h"><span class="timeline-label svelte-4z030h">Phase 3</span> <h3 class="svelte-4z030h">Extension</h3> <p class="svelte-4z030h">For enterprise constraints, we extend beyond Notion-native automations with custom
            MCP/orchestration and governance controls.</p></div>`);
    }
  });
  $$renderer.push(`<!----></div></div></section> <section class="faq-section svelte-4z030h"><div class="section-container svelte-4z030h">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-4z030h">Questions</h2>`);
    }
  });
  $$renderer.push(`<!----> <div class="faq-grid svelte-4z030h"><!--[-->`);
  const each_array_1 = ensure_array_like(faqItems);
  for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
    let faq = each_array_1[i];
    BlurFade($$renderer, {
      delay: 0.1 + i * 0.05,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="faq-item svelte-4z030h"><h3 class="svelte-4z030h">${escape_html(faq.question)}</h3> <p class="svelte-4z030h">${escape_html(faq.answer)}</p></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div></div></section> <section class="cta-section svelte-4z030h"><div class="section-container svelte-4z030h">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="cta-heading svelte-4z030h">Map your workflow risk surface.</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="cta-subtext svelte-4z030h">We’ll define your trust boundaries, failure modes, and escalation path before
        implementation.</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="cta-buttons svelte-4z030h">`);
      ShimmerButton($$renderer2, {
        href: "/book",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Book a Mapping Session`);
        }
      });
      $$renderer2.push(`<!----> <a href="/products" class="cta-secondary svelte-4z030h">See what I've built →</a></div>`);
    }
  });
  $$renderer.push(`<!----></div></section>`);
}
export {
  _page as default
};
