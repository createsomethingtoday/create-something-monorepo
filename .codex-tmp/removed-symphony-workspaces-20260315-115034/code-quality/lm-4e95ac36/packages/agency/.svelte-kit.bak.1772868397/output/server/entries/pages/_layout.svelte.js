import { a3 as ssr_context, a4 as attr, a5 as attr_style, a6 as escape_html, a7 as attr_class, a8 as stringify, a9 as head, aa as ensure_array_like, ab as bind_props, ac as sanitize_props, ad as rest_props, ae as fallback, af as attributes, ag as clsx, ah as element, ai as slot, aj as spread_props, ak as store_get, al as unsubscribe_stores } from "../../chunks/index.js";
import { p as page } from "../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import { h as html } from "../../chunks/html.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function UserMenu($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { user, avatarUrl, name } = $$props;
    let isOpen = false;
    const displayName = name || user.email.split("@")[0];
    const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const gravatarUrl = (() => {
      if (avatarUrl) return avatarUrl;
      const hash = user.email.toLowerCase().trim().split("").reduce((a, c) => (a << 5) - a + c.charCodeAt(0) | 0, 0).toString(16);
      return `https://www.gravatar.com/avatar/${hash}?d=blank&s=80`;
    })();
    $$renderer2.push(`<div class="user-menu svelte-aurqlo"><button class="trigger svelte-aurqlo"${attr("aria-expanded", isOpen)} aria-haspopup="true"><span class="avatar svelte-aurqlo"${attr_style(`background-image: url(${stringify(gravatarUrl)})`)}>`);
    if (!avatarUrl) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="initials svelte-aurqlo">${escape_html(initials)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></span> <span${attr_class("chevron svelte-aurqlo", void 0, { "open": isOpen })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg></span></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function LayoutSEO($$renderer, $$props) {
  let { property } = $$props;
  const propertyConfig = {
    io: {
      domain: "https://createsomething.io",
      name: "CREATE SOMETHING",
      tagline: "Systems Thinking for AI-Native Development - Research papers with tracked experiments and rigorous methodology",
      description: "Research papers on AI-native development with tracked experiments and rigorous methodology. Covering Claude Code, agentic systems, and systematic approaches to building with AI.",
      color: "#000000"
    },
    space: {
      domain: "https://createsomething.space",
      name: "CREATE SOMETHING SPACE",
      tagline: "Interactive Tutorials for AI-Native Development - Learn by doing with runnable code examples",
      description: "Interactive tutorials for learning AI-native development by doing. Hands-on guides for Claude Code, Cloudflare Workers, SvelteKit, and modern web development.",
      color: "#000000"
    },
    agency: {
      domain: "https://createsomething.agency",
      name: "CREATE SOMETHING Agency",
      tagline: "Agentic Systems Engineering - AI automation workflows and autonomous systems that run businesses",
      description: "Agentic systems engineering consultancy building AI automation workflows and autonomous systems for businesses. Expert integration of Claude, Cloudflare, and modern web technologies.",
      color: "#000000"
    },
    ltd: {
      domain: "https://createsomething.ltd",
      name: "CREATE SOMETHING",
      tagline: "Weniger, aber besser",
      description: 'The philosophical foundation for the Create Something ecosystem. Curated wisdom from masters who embody "less, but better."',
      color: "#000000"
    },
    lms: {
      domain: "https://learn.createsomething.space",
      name: "CREATE SOMETHING LMS",
      tagline: "Learn the Ethos - Philosophy-driven development education",
      description: "Learn the CREATE SOMETHING ethos through practice. Eight learning paths teaching the Subtractive Triad, Canon design system, and AI-native development patterns.",
      color: "#000000"
    }
  };
  const config = propertyConfig[property];
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CREATE SOMETHING",
    alternateName: "Create Something Agency",
    url: config.domain,
    logo: `${config.domain}/favicon.png`,
    sameAs: [
      "https://www.linkedin.com/in/micahryanjohnson/",
      "https://github.com/createsomethingtoday"
    ],
    description: config.description,
    founder: {
      "@type": "Person",
      name: "Micah Johnson",
      jobTitle: "Systems Architect",
      sameAs: "https://www.linkedin.com/in/micahryanjohnson/"
    },
    knowsAbout: [
      "Agentic Systems Engineering",
      "AI-Native Development",
      "Claude Code",
      "Cloudflare Workers",
      "Automation Systems",
      "Autonomous AI Agents",
      "Systems Thinking"
    ],
    areaServed: { "@type": "Place", name: "Worldwide" }
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.name,
    url: config.domain,
    description: config.tagline,
    publisher: organizationSchema,
    inLanguage: "en-US"
  };
  const orgSchemaJson = JSON.stringify(organizationSchema);
  const webSchemaJson = JSON.stringify(websiteSchema);
  head("lq6pf0", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>${escape_html(config.name)}</title>`);
    });
    $$renderer2.push(`<meta name="title"${attr("content", config.name)}/> <meta name="description"${attr("content", config.description)}/> <meta name="robots" content="index, follow"/> <meta name="author" content="Create Something"/> <meta name="theme-color"${attr("content", config.color)}/> <link rel="canonical"${attr("href", config.domain)}/> <meta property="og:type" content="website"/> <meta property="og:url"${attr("content", config.domain)}/> <meta property="og:title"${attr("content", config.name)}/> <meta property="og:description"${attr("content", config.description)}/> <meta property="og:image"${attr("content", `${config.domain}/og-image.svg`)}/> <meta property="og:image:type" content="image/svg+xml"/> <meta property="og:image:width" content="1200"/> <meta property="og:image:height" content="630"/> <meta property="og:site_name"${attr("content", config.name)}/> <meta property="og:locale" content="en_US"/> <meta name="twitter:card" content="summary_large_image"/> <meta name="twitter:url"${attr("content", config.domain)}/> <meta name="twitter:title"${attr("content", config.name)}/> <meta name="twitter:description"${attr("content", config.description)}/> <meta name="twitter:image"${attr("content", `${config.domain}/og-image.svg`)}/> <meta name="twitter:creator" content="@micahryanjohnson"/> ${html('<script type="application/ld+json">' + orgSchemaJson + "<\/script>")} ${html('<script type="application/ld+json">' + webSchemaJson + "<\/script>")} <link rel="icon" href="/favicon.png" type="image/png"/> <link rel="icon" href="/favicon.svg" type="image/svg+xml"/> <link rel="icon" href="/favicon.ico" sizes="any"/> <link rel="apple-touch-icon" href="/favicon.png"/> <link rel="preconnect" href="https://fonts.googleapis.com"/> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/> <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&amp;display=swap" rel="stylesheet"/> <link href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&amp;display=swap" rel="stylesheet"/> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <meta name="format-detection" content="telephone=no"/> <meta http-equiv="x-ua-compatible" content="IE=edge"/>`);
  });
}
function Navigation($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      logo,
      logoSuffix,
      logoHref = "/",
      links,
      currentPath = "/",
      fixed = false,
      ctaLabel,
      ctaHref,
      user = null,
      onLogout,
      loginHref = "/login",
      showLogin = false,
      accountHref = "/account"
    } = $$props;
    let mobileMenuOpen = false;
    function isActive(link) {
      if (link.href === "/") {
        return currentPath === "/";
      }
      return currentPath.startsWith(link.href);
    }
    $$renderer2.push(`<nav${attr_class("nav-container svelte-11r1071", void 0, { "nav-fixed": fixed })} aria-label="Primary"><div class="nav-inner shell-inner svelte-11r1071"><div class="flex items-center justify-between"><a${attr("href", logoHref)} class="nav-logo svelte-11r1071">${escape_html(logo)} `);
    if (logoSuffix) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="nav-logo-suffix svelte-11r1071">${escape_html(logoSuffix)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></a> <div class="nav-desktop hidden lg:flex items-center gap-2 ml-8 svelte-11r1071"><!--[-->`);
    const each_array = ensure_array_like(links);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let link = each_array[$$index];
      $$renderer2.push(`<a${attr("href", link.href)}${attr_class("nav-link svelte-11r1071", void 0, { "active": isActive(link) })}>${escape_html(link.label)}</a>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (ctaLabel && ctaHref) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<a${attr("href", ctaHref)} class="nav-cta svelte-11r1071">${escape_html(ctaLabel)}</a>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (user) {
      $$renderer2.push("<!--[-->");
      UserMenu($$renderer2, {
        user
      });
    } else {
      $$renderer2.push("<!--[!-->");
      if (showLogin) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", loginHref)} class="nav-link svelte-11r1071">Sign in</a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div> <button class="nav-menu-button lg:hidden w-11 h-11 flex items-center justify-center svelte-11r1071"${attr("aria-label", "Open menu")}${attr("aria-expanded", mobileMenuOpen)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`);
    }
    $$renderer2.push(`<!--]--></button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></nav>`);
    bind_props($$props, { currentPath });
  });
}
function Footer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      mode = "ltd",
      aboutText,
      showNewsletter = false,
      newsletterTitle = "Stay updated with new experiments",
      newsletterDescription = "Get notified when new research is published. Real metrics, tracked experiments, honest learnings.",
      quickLinks = [],
      showRamsQuote = false,
      copyrightText,
      showSocial = false,
      turnstileSiteKey = ""
    } = $$props;
    let email = "";
    let honeypot = "";
    let isSubmitting = false;
    let message = null;
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const defaultCopyright = `© ${currentYear} Create Something. The canon for "less, but better."`;
    $$renderer2.push(`<footer class="footer svelte-1d9315y">`);
    if (showNewsletter) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section id="newsletter" class="py-20 px-6"><div class="max-w-4xl mx-auto"><div class="text-center"><h2 class="newsletter-title mb-4 svelte-1d9315y">${escape_html(newsletterTitle)}</h2> <p class="newsletter-description mb-8 max-w-2xl mx-auto svelte-1d9315y">${escape_html(newsletterDescription)}</p> <form class="max-w-lg mx-auto"><input type="text"${attr("value", honeypot)} name="website" autocomplete="off" tabindex="-1" class="honeypot svelte-1d9315y"/> <div class="flex flex-col sm:flex-row gap-3"><label for="newsletter-email" class="sr-only svelte-1d9315y">Email address</label> <input id="newsletter-email" type="email"${attr("value", email)} placeholder="Enter your email address" class="newsletter-input flex-1 px-6 py-4 svelte-1d9315y" required aria-required="true"${attr("aria-invalid", message?.type === "error")}${attr("aria-describedby", void 0)}${attr("disabled", isSubmitting, true)}/> <button type="submit"${attr("disabled", isSubmitting, true)} class="newsletter-button group px-8 py-4 flex items-center justify-center gap-2 svelte-1d9315y"><span>${escape_html("Subscribe")}</span> `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>`);
      }
      $$renderer2.push(`<!--]--></button></div> `);
      if (turnstileSiteKey) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="turnstile-container mt-4 svelte-1d9315y"></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></form></div></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div${attr_class("footer-links py-12 px-6", void 0, { "with-newsletter": showNewsletter })}><div class="footer-inner shell-inner"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"><div>`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="brand-title mb-4 svelte-1d9315y">CREATE SOMETHING</div> <p class="brand-description max-w-md mb-6 svelte-1d9315y">${escape_html(aboutText)}</p>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (showSocial) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<ul class="social-list flex items-center gap-4 svelte-1d9315y"><li><a href="https://github.com/createsomethingtoday" target="_blank" rel="noopener noreferrer" class="social-link w-10 h-10 flex items-center justify-center svelte-1d9315y" aria-label="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg></a></li> <li><a href="https://www.linkedin.com/in/micahryanjohnson/" target="_blank" rel="noopener noreferrer" class="social-link w-10 h-10 flex items-center justify-center svelte-1d9315y" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg></a></li></ul>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (quickLinks.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<nav aria-label="Quick links"><h3 class="section-title mb-4 svelte-1d9315y">Quick Links</h3> <ul class="space-y-3"><!--[-->`);
      const each_array = ensure_array_like(quickLinks);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let link = each_array[$$index];
        $$renderer2.push(`<li><a${attr("href", link.href)} class="footer-link svelte-1d9315y">${escape_html(link.label)}</a></li>`);
      }
      $$renderer2.push(`<!--]--></ul></nav>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <nav aria-label="CREATE SOMETHING properties"><h3 class="section-title mb-4 svelte-1d9315y">Modes of Being</h3> <ul class="space-y-3"><li><a href="https://createsomething.space"${attr_class("footer-link block svelte-1d9315y", void 0, { "active": mode === "space" })}><div>.space <span class="link-label svelte-1d9315y">— Explore</span></div> <div class="link-description svelte-1d9315y">Experiments, practice, learning by doing</div></a></li> <li><a href="https://learn.createsomething.space"${attr_class("footer-link block svelte-1d9315y", void 0, { "active": mode === "learn" })}><div>.learn <span class="link-label svelte-1d9315y">— Study</span></div> <div class="link-description svelte-1d9315y">Structured courses and educational content</div></a></li> <li><a href="https://createsomething.io"${attr_class("footer-link block svelte-1d9315y", void 0, { "active": mode === "io" })}><div>.io <span class="link-label svelte-1d9315y">— Research</span></div> <div class="link-description svelte-1d9315y">Papers, tools, documented discoveries</div></a></li> <li><a href="https://createsomething.agency"${attr_class("footer-link block svelte-1d9315y", void 0, { "active": mode === "agency" })}><div>.agency <span class="link-label svelte-1d9315y">— Build</span></div> <div class="link-description svelte-1d9315y">Client services, commercial work</div></a></li> <li><a href="https://createsomething.ltd"${attr_class("footer-link block svelte-1d9315y", void 0, { "active": mode === "ltd" })}><div>.ltd <span class="link-label svelte-1d9315y">— Canon</span></div> <div class="link-description svelte-1d9315y">Philosophy, patterns, the source of truth</div></a></li> <li><a href="https://github.com/createsomethingtoday" target="_blank" rel="noopener" class="footer-link block svelte-1d9315y"><div>GitHub <span class="link-label svelte-1d9315y">— Source</span></div> <div class="link-description svelte-1d9315y">Open development, version control</div></a></li></ul></nav></div></div></div> <div class="footer-copyright py-6 px-6"><div class="footer-inner shell-inner flex flex-col sm:flex-row items-center justify-between gap-4"><p class="copyright-text svelte-1d9315y">${escape_html(copyrightText || defaultCopyright)}</p> <nav class="legal-links flex items-center gap-4 svelte-1d9315y" aria-label="Legal"><a href="/privacy" class="legal-link svelte-1d9315y">Privacy</a> <span class="legal-separator svelte-1d9315y">·</span> <a href="/terms" class="legal-link svelte-1d9315y">Terms</a></nav></div></div> `);
    if (showRamsQuote) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="footer-quote py-8 px-6"><div class="footer-inner shell-inner text-center"><p class="quote-text leading-relaxed svelte-1d9315y">Less, but better. · Weniger, aber besser. · — Dieter Rams</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></footer>`);
  });
}
function Analytics($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let cleanupFns = [];
    onDestroy(() => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
    });
  });
}
function ModeIndicator($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      current,
      showLabels = false,
      size = "sm",
      showYouAreHere = false
    } = $$props;
    let hoveredMode = null;
    const modes = [
      {
        id: "space",
        label: "Explore",
        url: "https://createsomething.space"
      },
      {
        id: "learn",
        label: "Learn",
        url: "https://learn.createsomething.space"
      },
      {
        id: "io",
        label: "Research",
        url: "https://createsomething.io"
      },
      {
        id: "agency",
        label: "Build",
        url: "https://createsomething.agency"
      },
      {
        id: "ltd",
        label: "Canon",
        url: "https://createsomething.ltd"
      }
    ];
    $$renderer2.push(`<nav${attr_class("mode-indicator svelte-125s9fz", void 0, { "size-sm": size === "sm", "size-md": size === "md" })}><!--[-->`);
    const each_array = ensure_array_like(modes);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let mode = each_array[$$index];
      $$renderer2.push(`<a${attr("href", mode.url)}${attr_class("mode-item svelte-125s9fz", void 0, { "active": mode.id === current })}${attr("title", mode.label)}><span class="mode-dot svelte-125s9fz"></span> `);
      if (showLabels) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="mode-label svelte-125s9fz">.${escape_html(mode.id)}</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (showYouAreHere && mode.id === current && hoveredMode === current) ;
      else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></a>`);
    }
    $$renderer2.push(`<!--]--></nav>`);
  });
}
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
function Icon($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "name",
    "color",
    "size",
    "strokeWidth",
    "absoluteStrokeWidth",
    "iconNode"
  ]);
  $$renderer.component(($$renderer2) => {
    let name = fallback($$props["name"], void 0);
    let color = fallback($$props["color"], "currentColor");
    let size = fallback($$props["size"], 24);
    let strokeWidth = fallback($$props["strokeWidth"], 2);
    let absoluteStrokeWidth = fallback($$props["absoluteStrokeWidth"], false);
    let iconNode = fallback($$props["iconNode"], () => [], true);
    const mergeClasses = (...classes) => classes.filter((className, index, array) => {
      return Boolean(className) && array.indexOf(className) === index;
    }).join(" ");
    $$renderer2.push(`<svg${attributes(
      {
        ...defaultAttributes,
        ...$$restProps,
        width: size,
        height: size,
        stroke: color,
        "stroke-width": absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        class: clsx(mergeClasses("lucide-icon", "lucide", name ? `lucide-${name}` : "", $$sanitized_props.class))
      },
      void 0,
      void 0,
      void 0,
      3
    )}><!--[-->`);
    const each_array = ensure_array_like(iconNode);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let [tag, attrs] = each_array[$$index];
      element($$renderer2, tag, () => {
        $$renderer2.push(`${attributes({ ...attrs }, void 0, void 0, void 0, 3)}`);
      });
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></svg>`);
    bind_props($$props, {
      name,
      color,
      size,
      strokeWidth,
      absoluteStrokeWidth,
      iconNode
    });
  });
}
function Book_open($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M12 7v14" }],
    [
      "path",
      {
        "d": "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "book-open" },
    $$sanitized_props,
    {
      /**
       * @component @name BookOpen
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgN3YxNCIgLz4KICA8cGF0aCBkPSJNMyAxOGExIDEgMCAwIDEtMS0xVjRhMSAxIDAgMCAxIDEtMWg1YTQgNCAwIDAgMSA0IDQgNCA0IDAgMCAxIDQtNGg1YTEgMSAwIDAgMSAxIDF2MTNhMSAxIDAgMCAxLTEgMWgtNmEzIDMgMCAwIDAtMyAzIDMgMyAwIDAgMC0zLTN6IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/book-open
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Flask_conical($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"
      }
    ],
    ["path", { "d": "M6.453 15h11.094" }],
    ["path", { "d": "M8.5 2h7" }]
  ];
  Icon($$renderer, spread_props([
    { name: "flask-conical" },
    $$sanitized_props,
    {
      /**
       * @component @name FlaskConical
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTQgMnY2YTIgMiAwIDAgMCAuMjQ1Ljk2bDUuNTEgMTAuMDhBMiAyIDAgMCAxIDE4IDIySDZhMiAyIDAgMCAxLTEuNzU1LTIuOTZsNS41MS0xMC4wOEEyIDIgMCAwIDAgMTAgOFYyIiAvPgogIDxwYXRoIGQ9Ik02LjQ1MyAxNWgxMS4wOTQiIC8+CiAgPHBhdGggZD0iTTguNSAyaDciIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/flask-conical
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Graduation_cap($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"
      }
    ],
    ["path", { "d": "M22 10v6" }],
    ["path", { "d": "M6 12.5V16a6 3 0 0 0 12 0v-3.5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "graduation-cap" },
    $$sanitized_props,
    {
      /**
       * @component @name GraduationCap
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEuNDIgMTAuOTIyYTEgMSAwIDAgMC0uMDE5LTEuODM4TDEyLjgzIDUuMThhMiAyIDAgMCAwLTEuNjYgMEwyLjYgOS4wOGExIDEgMCAwIDAgMCAxLjgzMmw4LjU3IDMuOTA4YTIgMiAwIDAgMCAxLjY2IDB6IiAvPgogIDxwYXRoIGQ9Ik0yMiAxMHY2IiAvPgogIDxwYXRoIGQ9Ik02IDEyLjVWMTZhNiAzIDAgMCAwIDEyIDB2LTMuNSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/graduation-cap
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Hammer($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" }],
    ["path", { "d": "m18 15 4-4" }],
    [
      "path",
      {
        "d": "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "hammer" },
    $$sanitized_props,
    {
      /**
       * @component @name Hammer
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTUgMTItOC4zNzMgOC4zNzNhMSAxIDAgMSAxLTMtM0wxMiA5IiAvPgogIDxwYXRoIGQ9Im0xOCAxNSA0LTQiIC8+CiAgPHBhdGggZD0ibTIxLjUgMTEuNS0xLjkxNC0xLjkxNEEyIDIgMCAwIDEgMTkgOC4xNzJWN2wtMi4yNi0yLjI2YTYgNiAwIDAgMC00LjIwMi0xLjc1Nkw5IDIuOTZsLjkyLjgyQTYuMTggNi4xOCAwIDAgMSAxMiA4LjRWMTBsMiAyaDEuMTcyYTIgMiAwIDAgMSAxLjQxNC41ODZMMTguNSAxNC41IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/hammer
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Scroll($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M19 17V5a2 2 0 0 0-2-2H4" }],
    [
      "path",
      {
        "d": "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "scroll" },
    $$sanitized_props,
    {
      /**
       * @component @name Scroll
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTkgMTdWNWEyIDIgMCAwIDAtMi0ySDQiIC8+CiAgPHBhdGggZD0iTTggMjFoMTJhMiAyIDAgMCAwIDItMnYtMWExIDEgMCAwIDAtMS0xSDExYTEgMSAwIDAgMC0xIDF2MWEyIDIgMCAxIDEtNCAwVjVhMiAyIDAgMSAwLTQgMHYyYTEgMSAwIDAgMCAxIDFoMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/scroll
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function UnifiedSearch($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const PROPERTY_INFO = {
      space: { name: ".space", verb: "Explore", icon: Flask_conical },
      io: { name: ".io", verb: "Learn", icon: Book_open },
      agency: { name: ".agency", verb: "Build", icon: Hammer },
      ltd: { name: ".ltd", verb: "Canon", icon: Scroll },
      lms: { name: "LMS", verb: "Study", icon: Graduation_cap }
    };
    const TYPE_LABELS = {
      paper: "Paper",
      experiment: "Experiment",
      lesson: "Lesson",
      principle: "Principle",
      pattern: "Pattern",
      master: "Master",
      service: "Service",
      "case-study": "Case Study"
    };
    let {
      open = false,
      searchApiUrl = "https://unified-search.createsomething.workers.dev",
      localItems = [],
      placeholder = "Search across all properties...",
      currentProperty,
      onselect,
      onclose,
      enableAnalytics = true,
      showMobileButton = true
    } = $$props;
    let query = "";
    let selectedIndex = 0;
    let apiResults = [];
    let filteredLocalItems = () => {
      if (!query.trim()) return localItems.slice(0, 5);
      const lowerQuery = query.toLowerCase();
      return localItems.filter((item) => {
        const searchText = [item.label, item.description, ...item.keywords || []].join(" ").toLowerCase();
        return searchText.includes(lowerQuery);
      });
    };
    let apiItems = () => {
      return apiResults.map((result) => ({
        id: result.id,
        label: result.title,
        description: result.description,
        href: result.url,
        property: result.property,
        type: result.type
      }));
    };
    let groupedResults = () => {
      const groups = {};
      for (const item of apiItems()) {
        if (!item.property) continue;
        if (!groups[item.property]) {
          groups[item.property] = [];
        }
        groups[item.property].push(item);
      }
      return groups;
    };
    let allItems = () => {
      const items = [];
      if (!query.trim()) {
        items.push(...filteredLocalItems());
      }
      const propertyOrder = ["ltd", "io", "space", "lms", "agency"];
      const groups = groupedResults();
      for (const property of propertyOrder) {
        if (groups[property]) {
          items.push(...groups[property]);
        }
      }
      if (query.trim() && apiItems().length === 0 && true) {
        items.push(...filteredLocalItems());
      }
      return items;
    };
    if (showMobileButton && !open) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="mobile-search-button svelte-12vjnjv" aria-label="Open search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-12vjnjv"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (open) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="palette-overlay svelte-12vjnjv" role="button" tabindex="-1" aria-label="Close search"></div> <div class="palette svelte-12vjnjv" role="dialog" aria-modal="true" aria-label="Unified search"><div class="palette-input-wrapper svelte-12vjnjv"><svg class="palette-search-icon svelte-12vjnjv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg> <input${attr("value", query)} type="text" class="palette-input svelte-12vjnjv"${attr("placeholder", placeholder)} aria-label="Search"/> `);
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<kbd class="palette-shortcut svelte-12vjnjv">ESC</kbd>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="palette-results svelte-12vjnjv">`);
      {
        $$renderer2.push("<!--[!-->");
        if (!query.trim()) {
          $$renderer2.push("<!--[-->");
          if (filteredLocalItems().length > 0) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div class="palette-group svelte-12vjnjv"><div class="palette-group-header svelte-12vjnjv">Quick Access</div> <!--[-->`);
            const each_array = ensure_array_like(filteredLocalItems());
            for (let index = 0, $$length = each_array.length; index < $$length; index++) {
              let item = each_array[index];
              $$renderer2.push(`<button${attr_class("palette-item svelte-12vjnjv", void 0, { "selected": index === selectedIndex })}>`);
              if (item.icon) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<span class="palette-item-icon svelte-12vjnjv">${escape_html(item.icon)}</span>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]--> <div class="palette-item-content svelte-12vjnjv"><span class="palette-item-label svelte-12vjnjv">${escape_html(item.label)}</span> `);
              if (item.description) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<span class="palette-item-description svelte-12vjnjv">${escape_html(item.description)}</span>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]--></div> `);
              if (item.href) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<span class="palette-item-hint svelte-12vjnjv">↵</span>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]--></button>`);
            }
            $$renderer2.push(`<!--]--></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<div class="palette-empty svelte-12vjnjv">Start typing to search across all properties</div>`);
          }
          $$renderer2.push(`<!--]-->`);
        } else {
          $$renderer2.push("<!--[!-->");
          if (allItems().length === 0 && true) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div class="palette-empty svelte-12vjnjv">No results found for "${escape_html(query)}"</div>`);
          } else {
            $$renderer2.push("<!--[!-->");
            const groups = groupedResults();
            const propertyOrder = ["ltd", "io", "space", "lms", "agency"];
            const itemsBefore = { ltd: 0, io: 0, space: 0, lms: 0, agency: 0 };
            $$renderer2.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(propertyOrder);
            for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
              let property = each_array_1[$$index_2];
              if (groups[property] && groups[property].length > 0) {
                $$renderer2.push("<!--[-->");
                const propertyInfo = PROPERTY_INFO[property];
                const startIndex = Object.entries(itemsBefore).filter(([p]) => propertyOrder.indexOf(p) < propertyOrder.indexOf(property)).reduce((sum, [p]) => sum + (groups[p]?.length || 0), 0);
                $$renderer2.push(`<div class="palette-group svelte-12vjnjv"><div class="palette-group-header svelte-12vjnjv"><span class="palette-group-icon svelte-12vjnjv"><!---->`);
                propertyInfo.icon?.($$renderer2, { size: 14, strokeWidth: 2 });
                $$renderer2.push(`<!----></span> <span class="palette-group-name svelte-12vjnjv">${escape_html(propertyInfo.name)}</span> <span class="palette-group-verb svelte-12vjnjv">${escape_html(propertyInfo.verb)}</span></div> <!--[-->`);
                const each_array_2 = ensure_array_like(groups[property]);
                for (let i = 0, $$length2 = each_array_2.length; i < $$length2; i++) {
                  let item = each_array_2[i];
                  const globalIndex = startIndex + i;
                  $$renderer2.push(`<button${attr_class("palette-item svelte-12vjnjv", void 0, { "selected": globalIndex === selectedIndex })}><div class="palette-item-content svelte-12vjnjv"><span class="palette-item-label svelte-12vjnjv">${escape_html(item.label)}</span> `);
                  if (item.description) {
                    $$renderer2.push("<!--[-->");
                    $$renderer2.push(`<span class="palette-item-description svelte-12vjnjv">${escape_html(item.description)}</span>`);
                  } else {
                    $$renderer2.push("<!--[!-->");
                  }
                  $$renderer2.push(`<!--]--></div> `);
                  if (item.type) {
                    $$renderer2.push("<!--[-->");
                    $$renderer2.push(`<span class="palette-item-type svelte-12vjnjv">${escape_html(TYPE_LABELS[item.type])}</span>`);
                  } else {
                    $$renderer2.push("<!--[!-->");
                  }
                  $$renderer2.push(`<!--]--> <span class="palette-item-hint svelte-12vjnjv">↵</span></button>`);
                }
                $$renderer2.push(`<!--]--></div>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]-->`);
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div> <div class="palette-footer svelte-12vjnjv">`);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="palette-hint desktop-only svelte-12vjnjv"><kbd class="svelte-12vjnjv">↑</kbd><kbd class="svelte-12vjnjv">↓</kbd> navigate</span> <span class="palette-hint desktop-only svelte-12vjnjv"><kbd class="svelte-12vjnjv">↵</kbd> select</span> <span class="palette-hint desktop-only svelte-12vjnjv"><kbd class="svelte-12vjnjv">esc</kbd> close</span>`);
      }
      $$renderer2.push(`<!--]--> `);
      if (currentProperty) {
        $$renderer2.push("<!--[-->");
        const currentPropertyInfo = PROPERTY_INFO[currentProperty];
        $$renderer2.push(`<span class="palette-current svelte-12vjnjv"><!---->`);
        currentPropertyInfo.icon?.($$renderer2, { size: 12, strokeWidth: 2 });
        $$renderer2.push(`<!----> ${escape_html(currentPropertyInfo.name)}</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children, data } = $$props;
    const navLinks = [
      { label: "How I Work", href: "/services" },
      { label: "What I've Built", href: "/products" },
      { label: "About", href: "/about" }
    ];
    const quickAccessItems = [
      {
        id: "nav-services",
        label: "How I Work",
        description: "Workflow infrastructure, reliability, enterprise extension",
        href: "/services",
        icon: "🔨",
        keywords: [
          "workflow infrastructure",
          "reliability",
          "automation",
          "pricing",
          "services"
        ]
      },
      {
        id: "nav-products",
        label: "What I've Built",
        description: "Artifact-backed production workflows",
        href: "/products",
        icon: "📦",
        keywords: ["portfolio", "tools", "integrations"]
      },
      {
        id: "nav-book",
        label: "Book Mapping Session",
        description: "Map workflow risk and operational fit",
        href: "/book",
        icon: "📞",
        keywords: ["contact", "hire", "start", "book", "mapping", "session"]
      },
      {
        id: "nav-mcp-access",
        label: "MCP Access",
        description: "Reveal, copy, rotate, and revoke your personal bearer token",
        href: "/mcp-access",
        icon: "🗝️",
        keywords: [
          "mcp access",
          "bearer token",
          "copy token",
          "host setup",
          "codex",
          "claude",
          "cursor"
        ]
      },
      {
        id: "nav-security",
        label: "Security",
        description: "Identity boundaries, bearer-token governance, and operational controls",
        href: "/security",
        icon: "🛡️",
        keywords: ["security", "trust", "risk", "controls", "auth"]
      },
      {
        id: "nav-bearer-token-policy",
        label: "Bearer Token Policy",
        description: "One long-lived token per user with live entitlement checks and revocation",
        href: "/bearer-token-policy",
        icon: "🔑",
        keywords: [
          "bearer token",
          "token policy",
          "mcp access",
          "agent access",
          "auth"
        ]
      },
      {
        id: "nav-space",
        label: "Go to .space",
        description: "MCP experiments",
        href: "https://createsomething.space",
        icon: "🧪",
        keywords: ["explore", "try", "interactive"]
      },
      {
        id: "nav-io",
        label: "Go to .io",
        description: "MCP patterns for builders",
        href: "https://createsomething.io",
        icon: "📖",
        keywords: ["papers", "research", "learn"]
      },
      {
        id: "nav-ltd",
        label: "Go to .ltd",
        description: "Philosophy of automation",
        href: "https://createsomething.ltd",
        icon: "📜",
        keywords: ["canon", "principles", "foundation"]
      }
    ];
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.push(`<script src="https://embed.savvycal.com/v1/embed.js" defer><\/script><!---->`);
    });
    LayoutSEO($$renderer2, { property: "agency" });
    $$renderer2.push(`<!----> `);
    Analytics($$renderer2, {
      userId: data.user?.id,
      userOptedOut: data.user?.analytics_opt_out ?? false
    });
    $$renderer2.push(`<!----> `);
    UnifiedSearch($$renderer2, { currentProperty: "agency", localItems: quickAccessItems });
    $$renderer2.push(`<!----> <div class="layout-root min-h-screen svelte-12qhfyh">`);
    Navigation($$renderer2, {
      logo: "CREATE SOMETHING",
      logoSuffix: ".agency",
      links: navLinks,
      currentPath: store_get($$store_subs ??= {}, "$page", page).url.pathname,
      fixed: true,
      ctaLabel: "Book Mapping Session",
      ctaHref: "/book",
      showLogin: false
    });
    $$renderer2.push(`<!----> <main id="main-content" class="pt-[72px]">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main> `);
    Footer($$renderer2, {
      mode: "agency",
      showNewsletter: false,
      aboutText: "Production-safe workflow infrastructure for technical operators who need reliable automation, clear trust boundaries, and enterprise extension when workflows get risky.",
      quickLinks: [
        { label: "How I Work", href: "/services" },
        { label: "What I've Built", href: "/products" },
        { label: "About", href: "/about" },
        { label: "Security", href: "/security" },
        { label: "Bearer Token Policy", href: "/bearer-token-policy" },
        { label: "Book Mapping Session", href: "/book" }
      ],
      showSocial: true,
      isAuthenticated: !!data.user
    });
    $$renderer2.push(`<!----> `);
    ModeIndicator($$renderer2, { current: "agency" });
    $$renderer2.push(`<!----></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
