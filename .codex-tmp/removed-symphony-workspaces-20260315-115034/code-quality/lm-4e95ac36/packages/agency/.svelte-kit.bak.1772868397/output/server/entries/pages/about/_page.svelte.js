import { a4 as attr, a8 as stringify, a6 as escape_html, aa as ensure_array_like, a7 as attr_class } from "../../../chunks/index.js";
import { B as BlurFade } from "../../../chunks/BlurFade.js";
import { S as SEO } from "../../../chunks/SEO.js";
import { A as AnimatedGridPattern } from "../../../chunks/AnimatedGridPattern.js";
function Timeline($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, config = {} } = $$props;
    const width = config.width ?? 900;
    const height = config.height ?? 300;
    const title = config.title;
    const subtitle = config.subtitle;
    const property = config.property ?? "io";
    const branded = config.branded ?? false;
    const events = data.events;
    const orientation = data.orientation ?? "horizontal";
    const PADDING = 42;
    const isHorizontal = orientation === "horizontal";
    const lineY = height / 2;
    const lineStartX = PADDING + 60;
    const lineEndX = width - PADDING - 60;
    const eventSpacing = (lineEndX - lineStartX) / (events.length - 1 || 1);
    const layoutedEvents = events.map((event, i) => {
      const x = lineStartX + i * eventSpacing;
      const alternateY = i % 2 === 0;
      const labelY = alternateY ? lineY - 70 : lineY + 70;
      return { ...event, x, labelY, alternateY };
    });
    $$renderer2.push(`<svg${attr("width", width)}${attr("height", height)}${attr("viewBox", `0 0 ${stringify(width)} ${stringify(height)}`)} class="diagram timeline svelte-jk9nws" xmlns="http://www.w3.org/2000/svg"><rect${attr("width", width)}${attr("height", height)} class="bg svelte-jk9nws"></rect>`);
    if (title) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<text${attr("x", width / 2)}${attr("y", PADDING)} class="title svelte-jk9nws" text-anchor="middle">${escape_html(title)}</text>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if (subtitle) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<text${attr("x", width / 2)}${attr("y", PADDING + 28)} class="subtitle svelte-jk9nws" text-anchor="middle">${escape_html(subtitle)}</text>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if (isHorizontal) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<line${attr("x1", lineStartX)}${attr("y1", lineY)}${attr("x2", lineEndX)}${attr("y2", lineY)} class="timeline-line svelte-jk9nws"></line><!--[-->`);
      const each_array = ensure_array_like(layoutedEvents);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let event = each_array[$$index];
        $$renderer2.push(`<circle${attr("cx", event.x)}${attr("cy", lineY)}${attr("r", event.highlight ? 8 : 6)}${attr_class("marker svelte-jk9nws", void 0, { "highlight": event.highlight })}></circle><line${attr("x1", event.x)}${attr("y1", lineY + (event.alternateY ? -10 : 10))}${attr("x2", event.x)}${attr("y2", event.labelY + (event.alternateY ? 30 : -30))} class="connector svelte-jk9nws"></line><text${attr("x", event.x)}${attr("y", event.labelY)} class="event-date svelte-jk9nws" text-anchor="middle"${attr("dominant-baseline", event.alternateY ? "auto" : "hanging")}>${escape_html(event.date)}</text><text${attr("x", event.x)}${attr("y", event.labelY + (event.alternateY ? 16 : -16))} class="event-label svelte-jk9nws" text-anchor="middle"${attr("dominant-baseline", event.alternateY ? "hanging" : "auto")}>${escape_html(event.label)}</text>`);
        if (event.description) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<text${attr("x", event.x)}${attr("y", event.labelY + (event.alternateY ? 34 : -34))} class="event-description svelte-jk9nws" text-anchor="middle"${attr("dominant-baseline", event.alternateY ? "hanging" : "auto")}>${escape_html(event.description)}</text>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if (branded) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<text${attr("x", width - PADDING)}${attr("y", height - 12)} class="branding svelte-jk9nws" text-anchor="end">createsomething.${escape_html(property)}</text>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></svg>`);
  });
}
const workHistory = [
  {
    id: "tamu-animal-sciences",
    date: "2008 – 2010",
    role: "B.S. Animal Sciences (Pre-vet track)",
    org: "Texas A&M University",
    subtitle: "Meat science praxis · Animal food science · Feed economics",
    bullets: [
      {
        label: "Complexity",
        text: "Physical systems (anatomy, processing constraints) and economic systems (feed distribution under real-world constraints)."
      },
      {
        label: "Abstraction Tools",
        text: "Categorization frameworks (cuts/processing), measurement + calculation, and turning messy reality into repeatable procedures."
      },
      {
        label: "Carry-forward (.agency)",
        text: "Comfort with first-principles detail plus operational clarity: build models that stay true to reality while making it teachable and executable."
      }
    ]
  },
  {
    id: "burleson-equine-hospital",
    date: "2010 – 2012",
    role: "Veterinary Technician (Equine)",
    org: "Burleson Equine Hospital",
    subtitle: "Equine nursing · Blood draws · Farm visits · Clinical logging",
    bullets: [
      {
        label: "Complexity",
        text: "High-stakes clinical work with living systems: patient variability, time-sensitive decisions, and strict safety constraints (animal + human)."
      },
      {
        label: "Hands-on Duties",
        text: "Equine nursing, drawing blood, administering medication per doctor's orders, assisting on farm visits, and maintaining accurate logs."
      },
      {
        label: "Abstraction Tools",
        text: "Protocols, checklists, dosage discipline, and documentation as a single source of truth for continuity of care."
      },
      {
        label: "Carry-forward (.agency)",
        text: "Operational rigor + traceability: when stakes are real, you design systems that prevent errors, keep humans in the loop, and leave an audit trail."
      }
    ]
  },
  {
    id: "photography-company",
    date: "2011 – 2013",
    role: "Co-owner (Photography Company)",
    org: "Independent",
    subtitle: "Creative production pipeline · First attempt at web development as a service",
    bullets: [
      {
        label: "Complexity",
        text: "High-variance client work: creative direction, production, delivery, and expectation management."
      },
      {
        label: "Abstraction Tools",
        text: "Repeatable production workflows: templates, checklists, and “same inputs → predictable outputs” thinking."
      },
      {
        label: "Carry-forward (.agency)",
        text: "Service instincts: ship outcomes on deadline, communicate tradeoffs clearly, and turn craft into a system clients can trust."
      }
    ]
  },
  {
    id: "enterprise-holdings",
    date: "2014 – 2015",
    role: "Digital Content Specialist",
    org: "Enterprise Holdings",
    subtitle: "CMS · SEO · Content operations",
    bullets: [
      {
        label: "Complexity",
        text: "Large-scale content systems: taxonomy, consistency, searchability, and operational maintenance."
      },
      {
        label: "Abstraction Tools",
        text: "Content models, publishing workflows, and the discipline of “structure first, copy second.”"
      },
      {
        label: "Carry-forward (.agency)",
        text: "Agent systems need clean information architecture. This is early training in making knowledge queryable and dependable."
      }
    ]
  },
  {
    id: "maritz",
    date: "2015 – 2016",
    role: "Interactive Developer",
    org: "Maritz",
    subtitle: "Enterprise client web projects",
    bullets: [
      {
        label: "Complexity",
        text: "Shipping inside constraints: stakeholders, timelines, brand standards, and production reliability."
      },
      {
        label: "Abstraction Tools",
        text: "Reusable front-end patterns, component thinking, and pragmatic engineering tradeoffs."
      },
      {
        label: "Carry-forward (.agency)",
        text: "Client work is constraint work. You get good by choosing what not to build and making the rest robust."
      }
    ]
  },
  {
    id: "hunter",
    date: "2016 – 2018",
    role: "UI Designer & Web Manager",
    org: "Hunter Engineering",
    subtitle: "Led web team · UI/UX design · Public sites",
    bullets: [
      {
        label: "Complexity",
        text: "Bridging product reality to user experience: constraints, stakeholder needs, and long-lived public surfaces."
      },
      {
        label: "Abstraction Tools",
        text: "UI systems, standards, and governance: make it consistent so the team can move faster without quality decay."
      },
      {
        label: "Carry-forward (.agency)",
        text: "A strong interface is an abstraction layer. Same principle applies to agent tooling: reduce cognitive load without hiding truth."
      }
    ]
  },
  {
    id: "webflow-support",
    date: "Feb 2018 – Mar 2020",
    role: "Customer Support Specialist & Team Manager",
    org: "Webflow",
    subtitle: "500+ user engagements · Onboarding systems · Troubleshooting",
    bullets: [
      {
        label: "Complexity",
        text: "Real-world failure modes: permissions, publishing, integrations, CSS/JS bugs, user mental models, and trust repair."
      },
      {
        label: "Abstraction Tools",
        text: "Troubleshooting trees, internal runbooks, and onboarding programs that turn tacit knowledge into repeatable process."
      },
      {
        label: "Carry-forward (.agency)",
        text: "This is where “tools + explainability” becomes a discipline: show work, leave an audit trail, and design for the next person."
      }
    ]
  },
  {
    id: "webflow-educator",
    date: "Mar 2020 – Apr 2021",
    role: "On-Screen Educator",
    org: "Webflow",
    subtitle: "Webflow University 2.0 · Documentation that links output to inputs",
    bullets: [
      {
        label: "Complexity",
        text: "Teaching at scale: reducing complexity without lying, across wildly different skill levels."
      },
      {
        label: "Abstraction Tools",
        text: "Curriculum design, clear mental models, and “explain the system, not the steps.”"
      },
      {
        label: "Carry-forward (.agency)",
        text: "Clients need systems they can understand. Agent work especially needs transparency, guardrails, and a shared vocabulary."
      }
    ]
  },
  {
    id: "webflow-marketplace-ops",
    date: "Jul 2023 – Dec 2024",
    role: "Marketplace Operations Manager",
    org: "Webflow",
    subtitle: "Template marketplace QA · Operational dashboards · Standards",
    bullets: [
      {
        label: "Complexity",
        text: "Marketplace systems: quality enforcement, creator experience, and scaling review across thousands of assets."
      },
      {
        label: "Abstraction Tools",
        text: "Dashboards, checklists, and standards-as-code thinking: turn subjective review into consistent evaluation."
      },
      {
        label: "Carry-forward (.agency)",
        text: "Operational data becomes intelligence. The value is in the feedback loop, not the one-off report."
      }
    ]
  },
  {
    id: "webflow-system-architect",
    date: "Dec 2024 – Present",
    role: "System Architect",
    org: "Webflow",
    subtitle: "Marketplace data infrastructure · Pipelines (Census/Snowflake/Amplitude/Segment)",
    bullets: [
      {
        label: "Complexity",
        text: "Distributed systems and data reality: events, identity, attribution, and the difference between “data exists” and “data is trusted.”"
      },
      {
        label: "Abstraction Tools",
        text: "Pipelines, service boundaries, and auditability: design systems where changes are traceable and safe to evolve."
      },
      {
        label: "Carry-forward (.agency)",
        text: "This is the core .agency muscle: build the connective tissue and the governance so AI can operate safely in real operations."
      }
    ]
  },
  {
    id: "create-something",
    date: "Nov 2018 – Present",
    role: "Webflow & API Developer",
    org: "CREATE SOMETHING",
    subtitle: "Custom development · API integrations · Automation systems",
    bullets: [
      {
        label: "Complexity",
        text: "Integrations live at the edges: mismatched data models, brittle auth, third-party outages, and humans who just need it to work."
      },
      {
        label: "Abstraction Tools",
        text: "Webflow + custom code, API-first builds, and automation “glue” that reduces tool sprawl into a single workflow."
      },
      {
        label: "Carry-forward (.agency)",
        text: "This becomes the delivery backbone: connect systems, preserve auditability, and make automation maintainable (not a pile of zaps)."
      }
    ]
  },
  {
    id: "half-dozen",
    date: "Jul 2024 – Present",
    role: "Co-Founder, Technology",
    org: "Half Dozen",
    subtitle: "Full-stack platform · 10+ service integrations · Multi-tenant operations",
    bullets: [
      {
        label: "Complexity",
        text: "Operational edge cases: schedules, payments, compliance, and the human messiness around live events."
      },
      {
        label: "Abstraction Tools",
        text: "Integration architecture, permissioning, and reliability patterns for systems that must keep running."
      },
      {
        label: "Carry-forward (.agency)",
        text: "Deep integration work: it’s not the API call, it’s the lifecycle. This is where “connectivity layer” becomes real."
      }
    ]
  },
  {
    id: "workway",
    date: "Apr 2025 – Present",
    role: "Founder",
    org: "WORKWAY",
    subtitle: "Workflow marketplace · Knowledge graph architecture · Edge infrastructure",
    bullets: [
      {
        label: "Complexity",
        text: "Compound automation: multi-step workflows, failure recovery, and progressive autonomy (humans stay in control)."
      },
      {
        label: "Abstraction Tools",
        text: "Workflow primitives + marketplace structure: turn “custom automation” into composable building blocks."
      },
      {
        label: "Carry-forward (.agency)",
        text: "This becomes the productized expression of the service: patterns that are stable enough to sell and safe enough to trust."
      }
    ]
  }
];
const workHistoryMilestones = {
  events: [
    { date: "2008", label: "A&M", description: "Domain systems", highlight: false },
    { date: "2018", label: "Webflow", description: "Support → Education", highlight: false },
    { date: "2023", label: "Marketplace", description: "Ops systems", highlight: false },
    { date: "2024", label: "System Architect", description: "Data infra", highlight: true },
    { date: "2018", label: "Create Something", description: "Web + APIs", highlight: true },
    { date: "2025", label: "WORKWAY", description: "Automation infra", highlight: true }
  ],
  orientation: "horizontal"
};
function WorkHistoryTimeline($$renderer) {
  const config = {
    title: "Timeline",
    subtitle: "Tools to abstract complexity (and understanding the complexity)",
    property: "agency",
    branded: true,
    width: 980,
    height: 340
  };
  $$renderer.push(`<div class="work-history svelte-10d3by4">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="milestones svelte-10d3by4" aria-label="Milestones timeline"><div class="milestones-inner svelte-10d3by4">`);
      Timeline($$renderer2, { data: workHistoryMilestones, config });
      $$renderer2.push(`<!----></div></div>`);
    }
  });
  $$renderer.push(`<!----> <ol class="timeline-list svelte-10d3by4"><!--[-->`);
  const each_array = ensure_array_like(workHistory);
  for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
    let item = each_array[$$index_1];
    BlurFade($$renderer, {
      delay: 0.15,
      children: ($$renderer2) => {
        $$renderer2.push(`<li class="timeline-item svelte-10d3by4"><div class="timeline-rail svelte-10d3by4" aria-hidden="true"><div class="timeline-dot svelte-10d3by4"></div></div> <div class="timeline-body svelte-10d3by4"><p class="timeline-date svelte-10d3by4">${escape_html(item.date)}</p> <h3 class="timeline-title svelte-10d3by4">${escape_html(item.role)} <span class="timeline-org svelte-10d3by4">· ${escape_html(item.org)}</span></h3> `);
        if (item.subtitle) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="timeline-subtitle svelte-10d3by4">${escape_html(item.subtitle)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <ul class="timeline-bullets svelte-10d3by4"><!--[-->`);
        const each_array_1 = ensure_array_like(item.bullets);
        for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
          let b = each_array_1[$$index];
          $$renderer2.push(`<li class="svelte-10d3by4"><strong class="svelte-10d3by4">${escape_html(b.label)}:</strong> ${escape_html(b.text)}</li>`);
        }
        $$renderer2.push(`<!--]--></ul></div></li>`);
      }
    });
  }
  $$renderer.push(`<!--]--></ol></div>`);
}
function _page($$renderer) {
  SEO($$renderer, {
    title: "About | Micah Johnson — Workflow Infrastructure",
    description: "I build workflow infrastructure for technical operators: cross-system logic, reliability controls, trust boundaries, and production-safe automation.",
    keywords: "Micah Johnson, workflow infrastructure, production automation, technical operators, cross-system architecture, automation reliability",
    ogImage: "/og-image.svg",
    propertyName: "agency"
  });
  $$renderer.push(`<!----> <section class="hero svelte-cwls5q"><div class="hero-grid-container svelte-cwls5q">`);
  AnimatedGridPattern($$renderer, {
    numSquares: 25,
    maxOpacity: 0.08,
    duration: 4,
    repeatDelay: 2,
    width: 60,
    height: 60,
    class: "hero-animated-grid"
  });
  $$renderer.push(`<!----></div> <div class="hero-content svelte-cwls5q">`);
  BlurFade($$renderer, {
    delay: 0,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-eyebrow svelte-cwls5q">About</p>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h1 class="hero-title svelte-cwls5q">I build workflow infrastructure for technical operators.</h1>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<p class="hero-detail svelte-cwls5q">I work on the part most teams under-scope: cross-system logic, reliability controls, trust
        boundaries, and the operating artifacts that make automation safe in production.</p>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="about-section svelte-cwls5q"><div class="section-container svelte-cwls5q">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="about-content svelte-cwls5q"><h2 class="svelte-cwls5q">The approach</h2> <p class="svelte-cwls5q">CREATE SOMETHING .agency helps CTOs and engineering leaders make important workflows
          reliable. Most engagements start with a scoped MCP implementation for one critical
          workflow, then expand into reliability controls and enterprise extension only when the
          operating risk justifies it.</p> <p class="svelte-cwls5q">My methodology is the Subtractive Triad: before building anything new, I audit your
          systems to find what should be removed — duplication, excess, disconnection. What remains
          is what's worth automating. This is why the systems hold up in production: the
          architecture is designed before capabilities are added.</p></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="about-section svelte-cwls5q"><div class="section-container svelte-cwls5q">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="about-content svelte-cwls5q"><h2 class="svelte-cwls5q">Background</h2> <p class="svelte-cwls5q">Micah Johnson. System Architect on the Marketplace Team at Webflow — building internal
          tools, onboarding systems, and platform infrastructure serving millions of users. Focused
          on technical architecture for production workflows and agent systems.</p> <p class="svelte-cwls5q">I have deployed production integrations connecting tools like Salesforce, HubSpot, Notion,
          Slack, Procore, and custom internal systems to AI. That building experience informs where
          to trust native tooling, where to start with MCP, and where to design custom control
          layers.</p> <p class="svelte-cwls5q">Based in Texas. Working with businesses across the US.</p> <p class="svelte-cwls5q"><a href="https://www.linkedin.com/in/micahryanjohnson/" class="link svelte-cwls5q" target="_blank" rel="noopener noreferrer">LinkedIn</a> · <a href="mailto:micah@createsomething.agency" class="link svelte-cwls5q">Email</a></p></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="about-section svelte-cwls5q" id="timeline"><div class="section-container svelte-cwls5q">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="about-content svelte-cwls5q"><h2 class="svelte-cwls5q">Timeline</h2> <p class="svelte-cwls5q">The through-line: using tools to abstract complexity while still understanding the
          complexity underneath. That pattern shows up in science, creative work, client services,
          marketplace systems, and now AI integrations.</p></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  WorkHistoryTimeline($$renderer);
  $$renderer.push(`<!----></div></section> <section class="about-section svelte-cwls5q"><div class="section-container svelte-cwls5q">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="about-content svelte-cwls5q"><h2 class="svelte-cwls5q">The system behind the work</h2> <p class="svelte-cwls5q">CREATE SOMETHING operates as a connected system — each part informs the others:</p> <ul class="circle-list svelte-cwls5q"><li class="svelte-cwls5q"><a href="https://createsomething.ltd" class="link svelte-cwls5q" target="_blank" rel="noopener noreferrer"><strong class="svelte-cwls5q">.ltd</strong></a> — Philosophy and principles</li> <li class="svelte-cwls5q"><a href="https://createsomething.io" class="link svelte-cwls5q" target="_blank" rel="noopener noreferrer"><strong class="svelte-cwls5q">.io</strong></a> — Research and validated patterns</li> <li class="svelte-cwls5q"><a href="https://createsomething.space" class="link svelte-cwls5q" target="_blank" rel="noopener noreferrer"><strong class="svelte-cwls5q">.space</strong></a> — Tools and experiments</li> <li class="svelte-cwls5q"><strong class="svelte-cwls5q">.agency</strong> — Workflow infrastructure, reliability controls, and enterprise extension <span class="muted svelte-cwls5q">(you are here)</span></li></ul> <p class="svelte-cwls5q">Client work informs the research. Research refines the methodology. The methodology
          improves the client work. Every part serves the whole.</p></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="about-section svelte-cwls5q"><div class="section-container svelte-cwls5q">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="about-content svelte-cwls5q"><h2 class="svelte-cwls5q">Also building</h2> <p class="svelte-cwls5q">I am also building <a href="https://workway.co" class="link svelte-cwls5q" target="_blank" rel="noopener noreferrer">WORKWAY</a>. When clients need full system development and onboarding as the primary engagement, I
          provide a direct referral path to trusted partners, including Half Dozen.</p></div>`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="cta-section svelte-cwls5q"><div class="section-container svelte-cwls5q">`);
  BlurFade($$renderer, {
    delay: 0.1,
    children: ($$renderer2) => {
      $$renderer2.push(`<h2 class="cta-heading svelte-cwls5q">Need a workflow you can trust?</h2>`);
    }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 0.2,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="cta-actions svelte-cwls5q"><a href="/book" class="cta-link-primary svelte-cwls5q">Book Mapping Session →</a> <a href="/services" class="cta-link-secondary svelte-cwls5q">How I work →</a></div>`);
    }
  });
  $$renderer.push(`<!----></div></section>`);
}
export {
  _page as default
};
