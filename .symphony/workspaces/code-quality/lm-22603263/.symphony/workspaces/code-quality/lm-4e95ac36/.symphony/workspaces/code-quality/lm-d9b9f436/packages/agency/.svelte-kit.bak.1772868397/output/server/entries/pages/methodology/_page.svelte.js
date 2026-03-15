import { aa as ensure_array_like, a6 as escape_html } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
import { B as BlurFade } from "../../../chunks/BlurFade.js";
import { S as ShimmerButton } from "../../../chunks/ShimmerButton.js";
function _page($$renderer) {
  const disciplines = [
    {
      level: 1,
      name: "DRY",
      domain: "Implementation",
      question: "Have we built this before?",
      action: "Unify",
      description: "I audit your systems for redundant tools, duplicate workflows, and repeated data entry. If three teams use three different project management tools, that's duplication. If the same customer data lives in four systems, that's duplication. I map it, measure the cost, and design the unified architecture.",
      outcome: "Fewer systems, clearer data, lower costs."
    },
    {
      level: 2,
      name: "Rams",
      domain: "Artifact",
      question: "Does this earn its existence?",
      action: "Remove",
      description: 'Named for Dieter Rams — "Weniger, aber besser" (Less, but better). Every tool, every workflow, every automation must justify its existence. I challenge each component: Does it produce outcomes? Is it used? Would anyone notice if it disappeared? The tools that survive this audit are the ones worth investing in.',
      outcome: "A leaner stack where every tool earns its place."
    },
    {
      level: 3,
      name: "Heidegger",
      domain: "System",
      question: "Does this serve the whole?",
      action: "Reconnect",
      description: "Named for the hermeneutic circle — the principle that every part must serve the whole, and the whole gives meaning to every part. Surviving tools must connect into a coherent system. Data flows between them. Automations bridge them. The architecture becomes a living whole, not a collection of islands.",
      outcome: "A connected system where every component serves the mission."
    }
  ];
  const phases = [
    {
      weeks: "Week 1–2",
      name: "DRY Audit",
      description: "Map all systems, identify duplication, measure waste."
    },
    {
      weeks: "Week 3–4",
      name: "Rams Review",
      description: "Challenge each component, score value vs. cost."
    },
    {
      weeks: "Week 5–6",
      name: "Heidegger Design",
      description: "Reconnect surviving systems into coherent architecture."
    },
    {
      weeks: "Week 7–8",
      name: "Blueprint Delivery",
      description: "Complete architecture + implementation roadmap."
    }
  ];
  const tiers = [
    {
      name: "Database",
      subtitle: "What exists",
      items: ["State", "Content", "Records"],
      description: "The foundation — where your data lives, how it's structured, and whether the right information is available to the right systems."
    },
    {
      name: "Automation",
      subtitle: "What happens",
      items: ["Tools", "Integrations", "Workflows"],
      description: "The engine — how systems connect, how data moves, and how actions get triggered without manual intervention."
    },
    {
      name: "Judgment",
      subtitle: "What should happen",
      items: ["Policies", "Oversight", "Decisions"],
      description: "The intelligence — where human insight meets automated execution. Knowing when to act, what to escalate, and which decisions require a person."
    }
  ];
  SEO($$renderer, {
    title: "Methodology | How I Think About Automation",
    description: "Most automation fails because it adds complexity. My methodology does the opposite: remove duplication, strip excess, reconnect what remains. Here's the framework behind every engagement.",
    keywords: "AI automation methodology, systems design, automation audit, workflow optimization, tool consolidation, connected systems",
    ogImage: "/og-image.svg",
    propertyName: "agency",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Methodology", url: "/methodology" }
    ]
  });
  $$renderer.push(`<!----> <section class="hero svelte-7o0w84"><div class="hero-grid svelte-7o0w84"></div> <div class="hero-content svelte-7o0w84">`);
  BlurFade($$renderer, {
    delay: 0,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-eyebrow svelte-7o0w84">Methodology</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h1 class="hero-title svelte-7o0w84">Build Less. Connect What Matters.</h1>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-subtitle svelte-7o0w84">Most automation projects fail because they add complexity — more tools, more workflows,
				more moving parts. I do the opposite. Find what's redundant, strip what doesn't work,
				and connect what remains into a system that actually serves your business.</p>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="principle-section svelte-7o0w84"><div class="section-container svelte-7o0w84">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="principle-card svelte-7o0w84"><h2 class="principle-heading svelte-7o0w84">The Core Principle</h2> <p class="principle-body svelte-7o0w84">Most automation strategies fail because they <em class="svelte-7o0w84">add</em> — more tools, more workflows,
				more connections. The Subtractive Triad inverts this. I start by removing what
				doesn't belong. What remains is the architecture.</p></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="disciplines-section svelte-7o0w84"><div class="section-container svelte-7o0w84">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-7o0w84">The Three Disciplines</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.15,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="section-subhead svelte-7o0w84">One principle — subtractive revelation — applied at three scales.</p>`);
    }
  });
  $$renderer.push(`<!----> <div class="disciplines-stack svelte-7o0w84"><!--[-->`);
  const each_array = ensure_array_like(disciplines);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let discipline = each_array[i];
    BlurFade($$renderer, {
      delay: 0.2 + i * 0.1,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="discipline-card svelte-7o0w84"><div class="discipline-header svelte-7o0w84"><div class="discipline-level svelte-7o0w84"><span class="level-number svelte-7o0w84">Level ${escape_html(discipline.level)}</span> <span class="level-domain svelte-7o0w84">${escape_html(discipline.domain)}</span></div> <div class="discipline-meta svelte-7o0w84"><h3 class="discipline-name svelte-7o0w84">${escape_html(discipline.name)}</h3> <div class="discipline-action svelte-7o0w84"><span class="action-label svelte-7o0w84">Action:</span> <span class="action-value svelte-7o0w84">${escape_html(discipline.action)}</span></div></div></div> <div class="discipline-question svelte-7o0w84"><span class="question-mark svelte-7o0w84">"</span> ${escape_html(discipline.question)} <span class="question-mark svelte-7o0w84">"</span></div> <div class="discipline-body svelte-7o0w84"><p class="discipline-description svelte-7o0w84">${escape_html(discipline.description)}</p> <div class="discipline-outcome svelte-7o0w84"><span class="outcome-label svelte-7o0w84">Outcome</span> <p class="outcome-text svelte-7o0w84">${escape_html(discipline.outcome)}</p></div></div></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div></div></section> <section class="process-section svelte-7o0w84"><div class="section-container svelte-7o0w84">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-7o0w84">The Process Applied</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.15,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="section-subhead svelte-7o0w84">How the Triad maps to an engagement — eight weeks from audit to architecture.</p>`);
    }
  });
  $$renderer.push(`<!----> <div class="phases-grid svelte-7o0w84"><!--[-->`);
  const each_array_1 = ensure_array_like(phases);
  for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
    let phase = each_array_1[i];
    BlurFade($$renderer, {
      delay: 0.2 + i * 0.08,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="phase-card svelte-7o0w84"><div class="phase-weeks svelte-7o0w84">${escape_html(phase.weeks)}</div> <h3 class="phase-name svelte-7o0w84">${escape_html(phase.name)}</h3> <p class="phase-description svelte-7o0w84">${escape_html(phase.description)}</p> `);
        if (i < phases.length - 1) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="phase-connector svelte-7o0w84"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div></div></section> <section class="why-section svelte-7o0w84"><div class="section-container svelte-7o0w84">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="why-card svelte-7o0w84"><h2 class="why-heading svelte-7o0w84">Why Three Levels</h2> <div class="why-body svelte-7o0w84"><p class="svelte-7o0w84">The triad is coherent because it's one principle — <strong class="svelte-7o0w84">subtractive revelation</strong> — applied at three scales.</p> <p class="svelte-7o0w84">Most automation reviews stop at Level 1: finding duplicates. That's useful, but
						incomplete. Deduplication alone leaves you with a tighter stack that still contains
						tools nobody uses and systems that don't talk to each other.</p> <p class="svelte-7o0w84">We go deeper. Removing excess (Level 2) strips the stack to only what produces
						outcomes. Reconnecting what remains (Level 3) transforms isolated tools into a
						system that serves the whole.</p> <p class="svelte-7o0w84">This is what produces architectures that last — not because they're complex, but
						because everything that doesn't belong has been removed.</p></div></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="framework-section svelte-7o0w84"><div class="section-container svelte-7o0w84">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="section-heading svelte-7o0w84">The Three-Tier Framework</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.15,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="section-subhead svelte-7o0w84">Every part of your system does one of three things. Understanding which is the key to building automation that works.</p>`);
    }
  });
  $$renderer.push(`<!----> <div class="tiers-grid svelte-7o0w84"><!--[-->`);
  const each_array_2 = ensure_array_like(tiers);
  for (let i = 0, $$length = each_array_2.length; i < $$length; i++) {
    let tier = each_array_2[i];
    BlurFade($$renderer, {
      delay: 0.2 + i * 0.1,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="tier-card svelte-7o0w84"><div class="tier-header svelte-7o0w84"><h3 class="tier-name svelte-7o0w84">${escape_html(tier.name)}</h3> <span class="tier-subtitle svelte-7o0w84">${escape_html(tier.subtitle)}</span></div> <div class="tier-items svelte-7o0w84"><!--[-->`);
        const each_array_3 = ensure_array_like(tier.items);
        for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
          let item = each_array_3[$$index_2];
          $$renderer2.push(`<span class="tier-item svelte-7o0w84">${escape_html(item)}</span>`);
        }
        $$renderer2.push(`<!--]--></div> <p class="tier-description svelte-7o0w84">${escape_html(tier.description)}</p></div>`);
      }
    });
  }
  $$renderer.push(`<!--]--></div> `);
  BlurFade($$renderer, {
    delay: 0.5,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="framework-insight svelte-7o0w84"><p class="svelte-7o0w84">Every component in your automation stack maps to one of these tiers. When tiers are
					misaligned — when automation makes decisions that should be judgment, or when records
					aren't available to the systems that need them — the architecture fails. The Three-Tier
					Framework reveals these misalignments before they become expensive.</p></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="cta-section svelte-7o0w84"><div class="section-container svelte-7o0w84">`);
  BlurFade($$renderer, {
    delay: 0,
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="cta-heading svelte-7o0w84">Ready to simplify?</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="cta-subtext svelte-7o0w84">Every engagement starts with this methodology. I look at your tools, find what doesn't belong, and build what matters.</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="cta-buttons svelte-7o0w84">`);
      ShimmerButton($$renderer2, {
        href: "/book",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Book Mapping Session`);
        }
      });
      $$renderer2.push(`<!----> <a href="/services" class="cta-secondary svelte-7o0w84">How I work →</a></div>`);
    }
  });
  $$renderer.push(`<!----></div></section>`);
}
export {
  _page as default
};
