import { a6 as escape_html, a4 as attr, a5 as attr_style, a8 as stringify, aa as ensure_array_like, a7 as attr_class } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
function AnimatedAsciiThumbnail($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      staticArt = ""
    } = $$props;
    $$renderer2.push(`<div class="ascii-thumbnail svelte-1i4ztsf" role="img" aria-label="Animated ASCII art thumbnail"><pre class="ascii-art svelte-1i4ztsf">${escape_html(
      // Cleanup on destroy
      staticArt
    )}</pre></div>`);
  });
}
function PaperCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { paper, rotation = 0, index = 0, animate = true } = $$props;
    function getAnimationScene(p) {
      const slug = p.slug || "";
      const tags = Array.isArray(p.tags) ? p.tags.map((t) => typeof t === "string" ? t : t.name).join(" ").toLowerCase() : "";
      if (slug.includes("ascii") || slug.includes("render")) return "donut";
      if (slug.includes("arena") || slug.includes("crowd") || slug.includes("gpu")) return "sphere";
      if (slug.includes("canvas") || slug.includes("diagram") || slug.includes("graph")) return "cube";
      if (slug.includes("kinetic") || slug.includes("typography") || slug.includes("text")) return "wave";
      if (slug.includes("data") || slug.includes("pattern") || slug.includes("viz")) return "spiral";
      if (tags.includes("3d") || tags.includes("webgpu")) return "sphere";
      if (tags.includes("animation") || tags.includes("motion")) return "wave";
      if (tags.includes("canvas") || tags.includes("interactive")) return "cube";
      const scenes = ["donut", "sphere", "cube", "wave", "spiral"];
      return scenes[index % scenes.length];
    }
    getAnimationScene(paper);
    const categoryDisplayNames = {
      automation: "Automation",
      webflow: "Webflow",
      development: "Development"
    };
    const categoryDisplayName = categoryDisplayNames[paper.category] || paper.category;
    const formattedDate = paper.published_at ? new Date(paper.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
    $$renderer2.push(`<a${attr("href", `/experiments/${paper.slug}`)} class="block h-full"><article class="group animate-reveal h-full svelte-4aozk7"${attr_style(`transform: rotate(${stringify(rotation)}deg); --delay: ${stringify(index)};`)}><div class="paper-card relative h-full overflow-hidden svelte-4aozk7"><div class="paper-image aspect-[4/3] flex items-center justify-center p-4 relative overflow-hidden svelte-4aozk7">`);
    if (paper.ascii_art && animate) {
      $$renderer2.push("<!--[-->");
      AnimatedAsciiThumbnail($$renderer2, {
        staticArt: paper.ascii_art
      });
    } else {
      $$renderer2.push("<!--[!-->");
      if (paper.ascii_art) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<pre class="ascii-art text-[0.45rem] leading-[1.1] font-mono select-none svelte-4aozk7">${escape_html(paper.ascii_art)}</pre>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="paper-placeholder text-6xl svelte-4aozk7">📄</div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><div class="arrow-button w-10 h-10 flex items-center justify-center svelte-4aozk7"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="arrow-icon svelte-4aozk7"><path d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z" fill="currentColor"></path></svg></div></div></div> <div class="p-2 pb-4 space-y-3"><div class="paper-meta flex items-center gap-2 font-medium svelte-4aozk7">`);
    if (formattedDate) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span>${escape_html(formattedDate)}</span> <span class="meta-dot w-1 h-1 svelte-4aozk7"></span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <span>${escape_html(paper.reading_time)} min read</span></div> <h3 class="paper-title font-medium line-clamp-2 leading-tight svelte-4aozk7">${escape_html(paper.title)}</h3> <div class="inline-block"><div class="relative overflow-hidden"><div class="category-badge px-3 py-1 font-medium group-hover:translate-y-[-100%] transition-transform duration-300 svelte-4aozk7">${escape_html(categoryDisplayName)}</div> <div class="category-badge absolute inset-0 px-3 py-1 font-medium translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 svelte-4aozk7">${escape_html(categoryDisplayName)}</div></div></div></div> <div class="hover-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none svelte-4aozk7"></div></div></article></a>`);
  });
}
function PapersGrid($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { papers, title = "Latest Articles" } = $$props;
    const rotations = [-1, 1, -0.5, 0.5, -1.5, 1.5, -1, 1];
    $$renderer2.push(`<section class="papers-section py-16 px-6 svelte-1yqw64a"><div class="max-w-7xl mx-auto"><div class="mb-12"><h2 class="section-title font-bold mb-2 svelte-1yqw64a">${escape_html(title)}</h2> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <ul class="papers-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 highlight-grid svelte-1yqw64a" role="list"><!--[-->`);
    const each_array = ensure_array_like(papers);
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let paper = each_array[index];
      $$renderer2.push(`<li class="highlight-item"${attr_style(`--index: ${stringify(index)}`)}>`);
      PaperCard($$renderer2, { paper, rotation: rotations[index % rotations.length], index });
      $$renderer2.push(`<!----></li>`);
    }
    $$renderer2.push(`<!--]--></ul> `);
    if (papers.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-center py-24 animate-fade-in svelte-1yqw64a"><div class="empty-icon mb-6 svelte-1yqw64a">📄</div> <h3 class="empty-title font-semibold mb-3 svelte-1yqw64a">No papers yet</h3> <p class="empty-text svelte-1yqw64a">Check back soon for technical content and case studies.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></section>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let sortBy = "newest";
    const sortedPapers = (() => {
      const sorted = [...data.papers];
      switch (sortBy) {
        case "newest":
          return sorted.sort((a, b) => {
            const aDate = new Date(a.published_at || a.created_at || 0).getTime();
            const bDate = new Date(b.published_at || b.created_at || 0).getTime();
            return bDate - aDate;
          });
        case "oldest":
          return sorted.sort((a, b) => {
            const aDate = new Date(a.published_at || a.created_at || 0).getTime();
            const bDate = new Date(b.published_at || b.created_at || 0).getTime();
            return aDate - bDate;
          });
        case "featured":
          return sorted.sort((a, b) => {
            const aFeatured = a.featured ?? 0;
            const bFeatured = b.featured ?? 0;
            if (bFeatured !== aFeatured) return bFeatured - aFeatured;
            const aDate = new Date(a.published_at || a.created_at || 0).getTime();
            const bDate = new Date(b.published_at || b.created_at || 0).getTime();
            return bDate - aDate;
          });
        default:
          return sorted;
      }
    })();
    SEO($$renderer2, {
      title: `All Experiments (${stringify(data.papers.length)})`,
      description: "Browse agency experiments and case studies. Real projects, real results.",
      propertyName: "agency",
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Experiments", url: "/experiments" }
      ]
    });
    $$renderer2.push(`<!----> <div class="min-h-screen page-wrapper svelte-omkwbn"><nav class="fixed top-0 left-0 right-0 z-50 nav-bar svelte-omkwbn"><div class="shell-inner-pad"><div class="flex items-center justify-between py-4"><a href="/" class="flex items-center"><div class="heading-2 font-bold hover:body-secondary transition-colors">CREATE SOMETHING AGENCY</div></a> <div class="hidden md:flex items-center gap-8"><a href="/" class="body-secondary hover:transition-colors body-sm font-medium">Home</a> <a href="/experiments" class="body-secondary hover:transition-colors body-sm font-medium">Experiments</a> <a href="/methodology" class="body-secondary hover:transition-colors body-sm font-medium">Methodology</a> <a href="/about" class="body-secondary hover:transition-colors body-sm font-medium">About</a> <a href="/contact" class="group relative px-6 py-2 transition-all nav-cta-button svelte-omkwbn"><span class="relative z-10">Contact</span></a></div></div></div></nav> <section class="relative pt-32 pb-12 px-6"><div class="shell-inner"><div class="text-center space-y-4"><h1 class="hero-title font-bold">All Experiments</h1> <p class="body-lg body-tertiary">${escape_html(data.papers.length)} agency experiments — real projects, real results</p></div> <div class="flex justify-center mt-8"><div class="inline-flex items-center gap-1 p-1 sort-control svelte-omkwbn"><button${attr_class(`px-4 py-2 font-medium transition-all sort-button ${stringify("sort-button-active")}`, "svelte-omkwbn")}>Newest</button> <button${attr_class(`px-4 py-2 font-medium transition-all sort-button ${stringify("")}`, "svelte-omkwbn")}>Oldest</button> <button${attr_class(`px-4 py-2 font-medium transition-all sort-button ${stringify("")}`, "svelte-omkwbn")}>Featured</button></div></div></div></section> `);
    PapersGrid($$renderer2, { papers: sortedPapers, title: "" });
    $$renderer2.push(`<!----> <footer class="py-6 px-6 page-footer svelte-omkwbn"><div class="shell-inner flex flex-col md:flex-row justify-between items-center gap-4"><p class="body-muted body-sm">© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} Micah Johnson. All rights reserved.</p> <div class="flex items-center gap-6"><a href="/privacy" class="body-muted hover:body-tertiary body-sm transition-colors">Privacy Policy</a> <a href="/terms" class="body-muted hover:body-tertiary body-sm transition-colors">Terms of Service</a></div></div></footer></div>`);
  });
}
export {
  _page as default
};
