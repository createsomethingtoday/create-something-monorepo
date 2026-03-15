import { a7 as attr_class, a5 as attr_style, a8 as stringify, aa as ensure_array_like, a4 as attr, a6 as escape_html } from "../../../../chunks/index.js";
import { S as SEO } from "../../../../chunks/SEO.js";
import { B as BlurFade } from "../../../../chunks/BlurFade.js";
import { S as ShimmerButton } from "../../../../chunks/ShimmerButton.js";
import { D as DEV } from "../../../../chunks/utils.js";
import { A as AnimatedGridPattern } from "../../../../chunks/AnimatedGridPattern.js";
const browser = DEV;
function LiquidGlass($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      mode = "smooth",
      tint = "none",
      highlight = true,
      showGrid = false,
      borderRadius = "lg",
      aspectRatio = "auto",
      padding = "var(--space-lg)",
      class: className = "",
      children
    } = $$props;
    const useRefraction = mode === "refraction" && browser;
    const tintColors = {
      purple: "var(--liquid-glass-tint-purple, #a78bfa)",
      blue: "var(--liquid-glass-tint-blue, #60a5fa)",
      emerald: "var(--liquid-glass-tint-emerald, #34d399)",
      amber: "var(--liquid-glass-tint-amber, #fbbf24)",
      rose: "var(--liquid-glass-tint-rose, #fb7185)",
      cyan: "var(--liquid-glass-tint-cyan, #22d3ee)"
    };
    const bgColor = tint !== "none" ? `color-mix(in srgb, ${tintColors[tint]} var(--liquid-glass-tint-mix-standard, 12%), var(--glass-bg-light))` : "var(--glass-bg-light)";
    const borderColor = tint !== "none" ? `color-mix(in srgb, ${tintColors[tint]} 25%, var(--glass-border-medium))` : "var(--glass-border-medium)";
    $$renderer2.push(`<div${attr_class(`liquid-glass radius-${stringify(borderRadius)} aspect-${stringify(aspectRatio)} ${stringify(className)}`, "svelte-197plx1", {
      "mode-solid": mode === "solid",
      "mode-smooth": mode === "smooth",
      "mode-refraction": mode === "refraction"
    })}${attr_style("", {
      "--lg-bg-color": bgColor,
      "--lg-border-color": borderColor,
      "--lg-padding": padding
    })}>`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div${attr_class("glass-layer svelte-197plx1", void 0, { "has-refraction": useRefraction })} aria-hidden="true"${attr_style("", {
      filter: "none"
    })}></div> `);
    if (showGrid) {
      $$renderer2.push("<!--[-->");
      AnimatedGridPattern($$renderer2, {
        numSquares: 30,
        maxOpacity: 0.08,
        duration: 4,
        repeatDelay: 1,
        class: "grid-pattern"
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="border-layer svelte-197plx1" aria-hidden="true"></div> `);
    if (highlight) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="highlight-layer svelte-197plx1" aria-hidden="true"></div> <div class="edge-glow svelte-197plx1" aria-hidden="true"></div> <div class="inner-shadow svelte-197plx1" aria-hidden="true"></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="content svelte-197plx1">`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div></div>`);
  });
}
function LiquidGlassIcon($$renderer, $$props) {
  let {
    size = "md",
    variant = "standard",
    shape,
    class: className = "",
    children
  } = $$props;
  const sizeMap = {
    sm: { width: "2.5rem", height: "2.5rem", fontSize: "0.75rem" },
    md: { width: "3rem", height: "3rem", fontSize: "0.875rem" },
    lg: { width: "4rem", height: "4rem", fontSize: "1rem" }
  };
  const dims = sizeMap[size];
  const isDeep = variant === "deep";
  const effectiveShape = shape ?? (isDeep ? "pill" : "square");
  $$renderer.push(`<div${attr_class(`liquid-glass-icon variant-${stringify(variant)} shape-${stringify(effectiveShape)} ${stringify(className)}`, "svelte-1sn07q")}${attr_style("", {
    width: dims.width,
    height: dims.height,
    "font-size": dims.fontSize
  })}><div${attr_class("blur-layer blur-primary svelte-1sn07q", void 0, { "deep": isDeep })} aria-hidden="true"></div> <div${attr_class("blur-layer blur-secondary svelte-1sn07q", void 0, { "deep": isDeep })} aria-hidden="true"></div> `);
  if (isDeep) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<div class="highlight-overlay svelte-1sn07q" aria-hidden="true"></div>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--> <span class="content svelte-1sn07q">`);
  children?.($$renderer);
  $$renderer.push(`<!----></span></div>`);
}
function IntegrationFlow($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      integrations,
      description,
      glassMode = "solid",
      tint = "none",
      showGrid = true,
      iconVariant = "standard",
      showConnectors = false,
      animateFlow = false,
      class: className = ""
    } = $$props;
    const connectorId = Math.random().toString(36).substring(2, 9);
    LiquidGlass($$renderer2, {
      mode: glassMode,
      tint,
      showGrid,
      aspectRatio: "video",
      class: className,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flow-content svelte-wy5xqr"><div${attr_class("icons-row svelte-wy5xqr", void 0, { "with-connectors": showConnectors })} role="list" aria-label="Integration flow"><!--[-->`);
        const each_array = ensure_array_like(integrations);
        for (let index = 0, $$length = each_array.length; index < $$length; index++) {
          let integration = each_array[index];
          $$renderer3.push(`<div class="integration-item svelte-wy5xqr">`);
          LiquidGlassIcon($$renderer3, {
            size: "md",
            variant: iconVariant,
            children: ($$renderer4) => {
              if (integration.icon) {
                $$renderer4.push("<!--[-->");
                integration.icon($$renderer4);
                $$renderer4.push(`<!---->`);
              } else {
                $$renderer4.push("<!--[!-->");
                $$renderer4.push(`<span${attr("aria-label", integration.name || integration.label)}>${escape_html(integration.label)}</span>`);
              }
              $$renderer4.push(`<!--]-->`);
            }
          });
          $$renderer3.push(`<!----></div> `);
          if (index < integrations.length - 1) {
            $$renderer3.push("<!--[-->");
            if (showConnectors) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<svg class="connector svelte-wy5xqr" width="40" height="24" viewBox="0 0 40 24" aria-hidden="true"><defs><linearGradient${attr("id", `connector-gradient-${stringify(connectorId)}-${stringify(index)}`)} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255, 255, 255, 0.1)"></stop><stop offset="50%" stop-color="rgba(255, 255, 255, 0.5)"></stop><stop offset="100%" stop-color="rgba(255, 255, 255, 0.1)"></stop></linearGradient><filter${attr("id", `connector-glow-${stringify(connectorId)}-${stringify(index)}`)} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter></defs><path d="M 0 12 L 40 12" fill="none"${attr("stroke", `url(#connector-gradient-${stringify(connectorId)}-${stringify(index)})`)} stroke-width="1.5" stroke-linecap="round"${attr("filter", `url(#connector-glow-${stringify(connectorId)}-${stringify(index)})`)}></path>`);
              if (animateFlow) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<circle r="2" fill="white" opacity="0.8" class="svelte-wy5xqr"><animateMotion${attr("dur", `${stringify(1.5 + index * 0.2)}s`)} repeatCount="indefinite" path="M 0 12 L 40 12" class="svelte-wy5xqr"></animateMotion><animate attributeName="opacity" values="0;0.8;0.8;0"${attr("dur", `${stringify(1.5 + index * 0.2)}s`)} repeatCount="indefinite" class="svelte-wy5xqr"></animate></circle>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]--></svg>`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<span class="arrow svelte-wy5xqr" aria-hidden="true">→</span>`);
            }
            $$renderer3.push(`<!--]-->`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></div> <p class="description svelte-wy5xqr">${escape_html(description)}</p></div>`);
      }
    });
  });
}
function _page($$renderer) {
  const integrations = [
    { label: "DB", name: "Database Layer" },
    { label: "AT", name: "Automation Layer" },
    { label: "JG", name: "Judgment Layer" },
    { label: "OC", name: "Orchestrator" }
  ];
  const failureModes = [
    {
      title: "Prompt Drift",
      description: "Agent performance degrades over time as data changes, edge cases accumulate, and prompts go untuned. What worked at launch stops working at month three.",
      icon: "01"
    },
    {
      title: "Policy Gaps",
      description: "No clear rules for when agents should escalate, what they can't do, how to handle ambiguity. The agent makes a bad call. Trust breaks.",
      icon: "02"
    },
    {
      title: "Orphaned Connections",
      description: "MCPs deployed and forgotten. APIs change, tokens expire, workflows evolve. The automation silently stops working — and nobody notices until damage is done.",
      icon: "03"
    }
  ];
  const services = [
    {
      name: "Prompt Optimization",
      cadence: "Weekly",
      description: "Systematic review of agent outputs. A/B testing prompt variations. Improving accuracy, tone, and consistency.",
      result: "Your agents get better every week."
    },
    {
      name: "Agent Orchestration",
      cadence: "Ongoing",
      description: "Coordinating multiple agents across systems. Ensuring they don't conflict, duplicate work, or miss handoffs.",
      result: "The conductor for your automation orchestra."
    },
    {
      name: "Policy Management",
      cadence: "Ongoing",
      description: "Decision rules, escalation paths, boundary conditions. What the agent can do, can't do, and when to involve a human.",
      result: "Guardrails that protect your business."
    },
    {
      name: "Performance Monitoring",
      cadence: "Continuous",
      description: "Uptime, accuracy rates, cost per operation, response times. Alerts when something degrades.",
      result: "You know it's working. We prove it monthly."
    },
    {
      name: "Quarterly Business Review",
      cadence: "Quarterly",
      description: "ROI measurement, expansion opportunities, roadmap updates.",
      result: "Every quarter, we show you the numbers and plan what's next."
    }
  ];
  const tiers = [
    {
      name: "Database",
      label: "What your systems know",
      description: "Data, records, content — the information layer. This is what exists.",
      accent: "tier-database",
      active: false
    },
    {
      name: "Automation",
      label: "What your MCPs do",
      description: "Connect, execute, transform — the action layer. This is what happens.",
      accent: "tier-automation",
      active: false
    },
    {
      name: "Judgment",
      label: "What should happen",
      description: "Policies, oversight, intelligence — the decision layer. This is where we operate.",
      accent: "tier-judgment",
      active: true
    }
  ];
  const plans = [
    {
      name: "Workflow Control Core",
      price: "$1,500–$2,000",
      period: "/mo",
      scope: "1–2 workflows in operation",
      features: [
        "Custom MCP operating baseline",
        "Weekly prompt and policy tuning",
        "Monthly performance reporting",
        "Drift detection and correction"
      ],
      featured: false
    },
    {
      name: "Workflow Control Growth",
      price: "$2,000–$3,000",
      period: "/mo",
      scope: "3–5 workflows in operation",
      features: [
        "Everything in Core",
        "Cross-agent orchestration",
        "Approval and escalation policy operations",
        "Golden-task regression checks",
        "Bi-weekly optimization calls"
      ],
      featured: true
    },
    {
      name: "Regulated / Multi-Team",
      price: "Custom",
      period: "",
      scope: "Complex environments and governance-heavy operations",
      features: [
        "Everything in Growth",
        "Advanced governance and audit-ready controls",
        "Custom reporting dashboards",
        "Quarterly business review",
        "Expansion roadmapping",
        "Direct architect access (no account layers)"
      ],
      featured: false
    }
  ];
  const audiences = [
    "Organizations with 1+ MCP connections already running or being built",
    "Teams that deployed AI automation and need ongoing tuning",
    "Regulated industries needing governance and audit trails",
    "Anyone who's seen automation break silently and wants to prevent it"
  ];
  SEO($$renderer, {
    title: "Enterprise Judgment Operations | CREATE SOMETHING .agency",
    description: "Reliability and control for teams already running automation. Add policy operations, orchestration, and ongoing safeguards once the workflow wedge is live.",
    keywords: "enterprise automation reliability, workflow controls, policy operations, ai governance, mcp wedge",
    ogImage: "/og-image.svg",
    propertyName: "agency"
  });
  $$renderer.push(`<!----> <section class="hero svelte-1xkawk"><div class="hero-grid svelte-1xkawk"></div> <div class="hero-container svelte-1xkawk"><div class="hero-content svelte-1xkawk">`);
  BlurFade($$renderer, {
    delay: 0,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-eyebrow svelte-1xkawk">The Judgment Layer</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h1 class="hero-title svelte-1xkawk">Reliability is what turns automation into operations.</h1>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-detail svelte-1xkawk">For teams already running MCPs or cross-system workflows, this is the control layer that
					keeps outcomes reliable. We add prompt optimization, policy controls, approval and
					escalation logic, and ongoing operational oversight.</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.3,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="hero-cta svelte-1xkawk">`);
      ShimmerButton($$renderer2, {
        href: "https://createsomething.agency/book",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Book Mapping Session`);
        }
      });
      $$renderer2.push(`<!----> <a href="/services" class="hero-link svelte-1xkawk">View all services →</a></div>`);
    }
  });
  $$renderer.push(`<!----></div> `);
  BlurFade($$renderer, {
    delay: 0.4,
    class: "hero-visual-wrapper",
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="hero-visual svelte-1xkawk">`);
      IntegrationFlow($$renderer2, {
        integrations,
        description: "Database → Automation → Judgment → Outcomes",
        tint: "none"
      });
      $$renderer2.push(`<!----></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="problem-section svelte-1xkawk"><div class="section-container svelte-1xkawk">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="problem-stat svelte-1xkawk">Most AI automation fails after deployment, not during it.</p>`);
    }
  });
  $$renderer.push(`<!----> <div class="failure-grid svelte-1xkawk"><!--[-->`);
  const each_array = ensure_array_like(failureModes);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let mode = each_array[i];
    BlurFade($$renderer, {
      delay: i * 0.08 + 0.15,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="failure-card svelte-1xkawk"><div class="failure-num svelte-1xkawk">${escape_html(mode.icon)}</div> <h3 class="failure-title svelte-1xkawk">${escape_html(mode.title)}</h3> <p class="failure-desc svelte-1xkawk">${escape_html(mode.description)}</p></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div> `);
  BlurFade($$renderer, {
    delay: 0.5,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="problem-conclusion svelte-1xkawk">These aren't connection problems. They're judgment problems.</p>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="services-section svelte-1xkawk"><div class="section-container svelte-1xkawk">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-1xkawk">What the Judgment Layer Includes</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="section-intro svelte-1xkawk">Operational controls for every stage of the workflow lifecycle.</p>`);
    }
  });
  $$renderer.push(`<!----> <div class="services-grid svelte-1xkawk"><!--[-->`);
  const each_array_1 = ensure_array_like(services);
  for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
    let service = each_array_1[i];
    BlurFade($$renderer, {
      delay: i * 0.08 + 0.2,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="service-card svelte-1xkawk"><div class="service-header svelte-1xkawk"><h3 class="service-name svelte-1xkawk">${escape_html(service.name)}</h3> <span class="service-cadence svelte-1xkawk">${escape_html(service.cadence)}</span></div> <p class="service-desc svelte-1xkawk">${escape_html(service.description)}</p> <p class="service-result svelte-1xkawk">${escape_html(service.result)}</p></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div></div></section> <section class="framework-section svelte-1xkawk"><div class="section-container svelte-1xkawk">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-1xkawk">The Three-Tier Framework</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="section-intro svelte-1xkawk">Every automation system has three layers. Most fail because the third is an afterthought.</p>`);
    }
  });
  $$renderer.push(`<!----> <div class="tier-grid svelte-1xkawk"><!--[-->`);
  const each_array_2 = ensure_array_like(tiers);
  for (let i = 0, $$length = each_array_2.length; i < $$length; i++) {
    let tier = each_array_2[i];
    BlurFade($$renderer, {
      delay: i * 0.1 + 0.2,
      children: ($$renderer2) => {
        $$renderer2.push(`<div${attr_class(`tier-card ${stringify(tier.accent)}`, "svelte-1xkawk", { "tier-active": tier.active })}><div class="tier-header svelte-1xkawk"><h3 class="tier-name svelte-1xkawk">${escape_html(tier.name)}</h3> <span class="tier-label svelte-1xkawk">${escape_html(tier.label)}</span></div> <p class="tier-desc svelte-1xkawk">${escape_html(tier.description)}</p> `);
        if (tier.active) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="tier-badge svelte-1xkawk">← This is where we operate.</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div> `);
  BlurFade($$renderer, {
    delay: 0.6,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="framework-conclusion svelte-1xkawk">Most automation fails because Judgment is an afterthought. We make it the focus.</p>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="pricing-section svelte-1xkawk"><div class="section-container svelte-1xkawk">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-1xkawk">Operating Plans</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="section-intro svelte-1xkawk">Operating envelopes for teams with automation already in motion. MCP remains the entry wedge for constrained starts and compliance-sensitive rollouts.</p>`);
    }
  });
  $$renderer.push(`<!----> <div class="pricing-grid svelte-1xkawk"><!--[-->`);
  const each_array_3 = ensure_array_like(plans);
  for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
    let plan = each_array_3[i];
    BlurFade($$renderer, {
      delay: i * 0.1 + 0.2,
      children: ($$renderer2) => {
        $$renderer2.push(`<div${attr_class("pricing-card svelte-1xkawk", void 0, { "featured": plan.featured })}><div class="pricing-card-inner svelte-1xkawk"><div class="pricing-name svelte-1xkawk">${escape_html(plan.name)}</div> <div class="pricing-price svelte-1xkawk">${escape_html(plan.price)}<span class="pricing-period svelte-1xkawk">${escape_html(plan.period)}</span></div> <p class="pricing-scope svelte-1xkawk">${escape_html(plan.scope)}</p> <ul class="pricing-features svelte-1xkawk"><!--[-->`);
        const each_array_4 = ensure_array_like(plan.features);
        for (let $$index_3 = 0, $$length2 = each_array_4.length; $$index_3 < $$length2; $$index_3++) {
          let feature = each_array_4[$$index_3];
          $$renderer2.push(`<li class="svelte-1xkawk">${escape_html(feature)}</li>`);
        }
        $$renderer2.push(`<!--]--></ul> <div class="pricing-cta svelte-1xkawk">`);
        ShimmerButton($$renderer2, {
          href: "https://createsomething.agency/book",
          children: ($$renderer3) => {
            $$renderer3.push(`<!---->Book Mapping Session`);
          }
        });
        $$renderer2.push(`<!----></div></div></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div> `);
  BlurFade($$renderer, {
    delay: 0.6,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="pricing-footer svelte-1xkawk">Need help picking the right path? <a href="https://createsomething.agency/book" class="pricing-link svelte-1xkawk">Let's talk.</a></p>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="audience-section svelte-1xkawk"><div class="section-container svelte-1xkawk">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-1xkawk">Who This Is For</h2>`);
    }
  });
  $$renderer.push(`<!----> <div class="audience-grid svelte-1xkawk"><!--[-->`);
  const each_array_5 = ensure_array_like(audiences);
  for (let i = 0, $$length = each_array_5.length; i < $$length; i++) {
    let audience = each_array_5[i];
    BlurFade($$renderer, {
      delay: i * 0.08 + 0.15,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="audience-card svelte-1xkawk"><p class="audience-text svelte-1xkawk">${escape_html(audience)}</p></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div></div></section> <section class="cta-section svelte-1xkawk"><div class="section-container svelte-1xkawk">`);
  BlurFade($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="cta-heading svelte-1xkawk">Your workflows need a control layer.</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="cta-subtext svelte-1xkawk">Run governed automation with clear policies, direct operational ownership, and reliability controls that hold up in production.</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="cta-buttons svelte-1xkawk">`);
      ShimmerButton($$renderer2, {
        href: "https://createsomething.agency/book",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Book Mapping Session`);
        }
      });
      $$renderer2.push(`<!----> <a href="/services" class="cta-secondary svelte-1xkawk">Need a constrained start? Use an MCP-only wedge →</a></div>`);
    }
  });
  $$renderer.push(`<!----></div></section>`);
}
export {
  _page as default
};
