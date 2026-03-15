import { a4 as attr, aa as ensure_array_like, a5 as attr_style, a8 as stringify, a6 as escape_html, a7 as attr_class, ag as clsx, ab as bind_props } from "../../../../chunks/index.js";
import { S as SEO } from "../../../../chunks/SEO.js";
import { h as html } from "../../../../chunks/html.js";
import "marked";
function ShareButtons($$renderer, $$props) {
  let { title, url, isCompleted = false } = $$props;
  let shareText = isCompleted ? `I just completed ${title} on Create Something!` : title;
  let shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}`
  };
  $$renderer.push(`<div class="sticky top-24 space-y-4 animate-slide-in svelte-zxy5jv"><h3 class="share-title font-semibold mb-4 svelte-zxy5jv">Share:</h3> <div class="flex flex-col gap-3"><a${attr("href", shareLinks.twitter)} target="_blank" rel="noopener noreferrer" class="share-button flex items-center justify-center w-12 h-12 group svelte-zxy5jv" aria-label="Share on X"><svg class="share-icon w-5 h-5 svelte-zxy5jv" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></a> <a${attr("href", shareLinks.facebook)} target="_blank" rel="noopener noreferrer" class="share-button flex items-center justify-center w-12 h-12 group svelte-zxy5jv" aria-label="Share on Facebook"><svg class="share-icon w-5 h-5 svelte-zxy5jv" viewBox="0 0 24 24" fill="currentColor"><path d="M10 0C4.477 0 0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.879V12.89H5.898V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.989C16.343 19.129 20 14.99 20 10c0-5.523-4.477-10-10-10z"></path></svg></a> <a${attr("href", shareLinks.linkedin)} target="_blank" rel="noopener noreferrer" class="share-button flex items-center justify-center w-12 h-12 group svelte-zxy5jv" aria-label="Share on LinkedIn"><svg class="share-icon w-5 h-5 svelte-zxy5jv" viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 5a2 2 0 11-4-.002 2 2 0 014 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z"></path></svg></a> <a${attr("href", shareLinks.reddit)} target="_blank" rel="noopener noreferrer" class="share-button flex items-center justify-center w-12 h-12 group svelte-zxy5jv" aria-label="Share on Reddit"><svg class="share-icon w-5 h-5 svelte-zxy5jv" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"></path></svg></a> <button class="share-button flex items-center justify-center w-12 h-12 group svelte-zxy5jv" aria-label="Copy link"><svg class="share-icon w-5 h-5 svelte-zxy5jv" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button></div></div>`);
}
function RelatedArticles($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { papers, currentPaperId } = $$props;
    const relatedPapers = papers.filter((p) => p.id !== currentPaperId).slice(0, 4);
    const categoryDisplayNames = {
      automation: "Automation",
      webflow: "Webflow",
      development: "Development",
      infrastructure: "Infrastructure",
      analytics: "Analytics",
      authentication: "Authentication",
      dashboard: "Dashboard",
      research: "Research",
      tutorial: "Tutorial",
      methodology: "Methodology"
    };
    const getCategoryDisplayName = (category) => {
      return categoryDisplayNames[category] || category;
    };
    const formatDate = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    };
    if (relatedPapers.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="related-section w-full max-w-5xl mx-auto px-6 py-16"><div class="animate-reveal svelte-1jyr1ub" style="--index: 0"><h2 class="section-title mb-8 svelte-1jyr1ub">Related Articles</h2> <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><!--[-->`);
      const each_array = ensure_array_like(relatedPapers);
      for (let index = 0, $$length = each_array.length; index < $$length; index++) {
        let paper = each_array[index];
        $$renderer2.push(`<a${attr("href", `/experiments/${paper.slug}`)} class="group block h-full animate-reveal svelte-1jyr1ub"${attr_style(`--index: ${stringify(index + 1)}`)}${attr("aria-label", `Read article: ${stringify(paper.title)}`)}><article class="related-card h-full overflow-hidden svelte-1jyr1ub"><div class="thumbnail-container aspect-[16/9] flex items-center justify-center p-4 svelte-1jyr1ub">`);
        if (paper.ascii_thumbnail || paper.ascii_art) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<pre class="ascii-art leading-[1.1] font-mono select-none svelte-1jyr1ub">${escape_html(paper.ascii_thumbnail || paper.ascii_art)}</pre>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<pre class="ascii-placeholder leading-tight font-mono select-none svelte-1jyr1ub">
  ╔═════════════╗
  ║   ASCII     ║
  ║ THUMBNAIL   ║
  ╚═════════════╝
</pre>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="p-5 space-y-3"><div class="meta-row flex items-center gap-2 svelte-1jyr1ub"><span class="capitalize">${escape_html(getCategoryDisplayName(paper.category))}</span> `);
        if (paper.published_at || paper.date) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="meta-separator svelte-1jyr1ub">•</span> <span>${escape_html(formatDate(paper.published_at || paper.date))}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <span class="meta-separator svelte-1jyr1ub">•</span> <span>${escape_html(paper.reading_time)} min</span></div> <h3 class="related-title font-semibold line-clamp-2 leading-snug svelte-1jyr1ub">${escape_html(paper.title)}</h3> `);
        if (paper.excerpt_short) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="related-excerpt line-clamp-2 leading-relaxed svelte-1jyr1ub">${escape_html(paper.excerpt_short)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="read-more flex items-center gap-2 group-hover:gap-3 transition-all svelte-1jyr1ub"><span>Read more</span> <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div></div> <div class="hover-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none svelte-1jyr1ub"></div></article></a>`);
      }
      $$renderer2.push(`<!--]--></div></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function InteractiveExperimentCTA($$renderer, $$props) {
  let { spaceUrl, isCompleted = false, onReset } = $$props;
  $$renderer.push(`<div class="interactive-experiment-cta p-6 mb-8 svelte-12cqbt6"><div class="flex items-center justify-between gap-6 flex-wrap"><div class="flex-1 min-w-0"><div class="cta-title mb-1 svelte-12cqbt6">Interactive Version Available</div> <div class="cta-subtitle svelte-12cqbt6">Run this experiment hands-on in your browser</div></div> <div class="flex items-center gap-2">`);
  if (isCompleted && onReset) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<button class="reset-btn p-2 svelte-12cqbt6" aria-label="Reset progress" title="Reset progress"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--> <a${attr("href", spaceUrl)} target="_blank" rel="noopener noreferrer"${attr_class(`launch-btn flex items-center gap-2 px-4 py-2 ${stringify(isCompleted ? "completed" : "default")}`, "svelte-12cqbt6")}>`);
  if (isCompleted) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<span>Verification Complete</span> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`);
  } else {
    $$renderer.push("<!--[!-->");
    $$renderer.push(`<span>Launch Experiment</span> <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>`);
  }
  $$renderer.push(`<!--]--></a></div></div></div>`);
}
function TrackedExperimentBadge($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { paper, showFullStats = false } = $$props;
    const isTrackedExperiment = paper.slug.includes("experiment") || paper.category === "experiments";
    const metrics = { hours: 26, errors: 47, interventions: 12, savings: 78 };
    if (isTrackedExperiment) {
      $$renderer2.push("<!--[-->");
      if (!showFullStats) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="badge-compact inline-flex items-center gap-2 px-4 py-2 animate-scale svelte-1el0pot"><svg class="badge-icon w-4 h-4 svelte-1el0pot" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg> <span class="badge-label font-medium svelte-1el0pot">TRACKED EXPERIMENT</span> <span class="badge-separator svelte-1el0pot">•</span> <span class="badge-text svelte-1el0pot">Real-time logging</span></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="badge-full w-full p-6 animate-fade-in svelte-1el0pot"><div class="flex items-start justify-between mb-4"><div><div class="flex items-center gap-2 mb-1"><svg class="stats-icon w-6 h-6 svelte-1el0pot" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg> <h3 class="stats-title svelte-1el0pot">Tracked Experiment</h3></div> <p class="stats-subtitle svelte-1el0pot">Real-time logging • Full methodology</p></div></div> <div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="metric-card p-3 text-center svelte-1el0pot"><div class="metric-value svelte-1el0pot">${escape_html(metrics.hours)}</div> <div class="metric-label svelte-1el0pot">Hours</div></div> <div class="metric-card p-3 text-center svelte-1el0pot"><div class="metric-value svelte-1el0pot">${escape_html(metrics.errors)}</div> <div class="metric-label svelte-1el0pot">Errors</div></div> <div class="metric-card p-3 text-center svelte-1el0pot"><div class="metric-value svelte-1el0pot">${escape_html(metrics.interventions)}</div> <div class="metric-label svelte-1el0pot">Fixes</div></div> <div class="metric-card p-3 text-center svelte-1el0pot"><div class="metric-value svelte-1el0pot">${escape_html(metrics.savings)}%</div> <div class="metric-label svelte-1el0pot">Savings</div></div></div> <div class="stats-footer mt-4 pt-4"><p class="footer-text mb-2 svelte-1el0pot"><strong class="footer-strong svelte-1el0pot">Data sources:</strong> Claude Code Analytics API, Cloudflare billing,
          real-time hooks</p> <p class="footer-text svelte-1el0pot"><strong class="footer-strong svelte-1el0pot">Reproducibility:</strong> Starting prompt, tracking logs, and
          architecture decisions documented</p></div> <div class="mt-4"><a href="/methodology" class="methodology-link inline-flex items-center gap-1 svelte-1el0pot">Learn about our methodology <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg></a></div></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function ArticleContent($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { paper, isCompleted = false, onReset } = $$props;
    !!paper.html_content;
    paper.html_content || paper.content;
    let renderedContent = "";
    $$renderer2.push(`<article class="article-container w-full max-w-4xl mx-auto px-6 py-12 animate-reveal svelte-u755t7">`);
    if (paper.interactive_demo_url) {
      $$renderer2.push("<!--[-->");
      InteractiveExperimentCTA($$renderer2, {
        spaceUrl: paper.interactive_demo_url,
        paperTitle: paper.title,
        isCompleted,
        onReset
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="article-prose prose prose-invert prose-lg max-w-none svelte-u755t7">${html(renderedContent)}</div></article>`);
  });
}
function ArticleHeader($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { paper } = $$props;
    const categoryDisplayNames = {
      automation: "Automation",
      webflow: "Webflow",
      development: "Development"
    };
    const categoryDisplayName = categoryDisplayNames[paper.category] || paper.category;
    const difficultyColors = {
      Beginner: {
        text: "difficulty-beginner-text",
        bg: "difficulty-beginner-bg"
      },
      Intermediate: {
        text: "difficulty-intermediate-text",
        bg: "difficulty-intermediate-bg"
      },
      Advanced: {
        text: "difficulty-advanced-text",
        bg: "difficulty-advanced-bg"
      }
    };
    const difficultyColorClasses = difficultyColors[paper.difficulty_level || ""] || { text: "difficulty-default-text", bg: "difficulty-default-bg" };
    const formatDate = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    };
    $$renderer2.push(`<header class="article-header w-full max-w-5xl mx-auto px-6 py-12 animate-reveal svelte-1b833yn"><div class="ascii-hero mb-8 svelte-1b833yn"><div class="ascii-hero-inner aspect-[21/9] flex items-center justify-center p-8">`);
    if (paper.ascii_art) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<pre class="ascii-art svelte-1b833yn">${escape_html(paper.ascii_art)}</pre>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<pre class="ascii-placeholder svelte-1b833yn">
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║                     [ASCII ART HERO]                      ║
  ║                      PLACEHOLDER                          ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
</pre>`);
    }
    $$renderer2.push(`<!--]--></div></div> <div class="mb-6 animate-slide-in svelte-1b833yn" style="--delay: 2"><span class="category-tag inline-block px-4 py-2 uppercase tracking-wider svelte-1b833yn">${escape_html(categoryDisplayName)}</span></div> <h1 class="article-title mb-6 leading-tight animate-reveal svelte-1b833yn" style="--delay: 3">${escape_html(paper.title)}</h1> `);
    if (paper.excerpt_long) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="article-excerpt mb-8 leading-relaxed max-w-3xl animate-reveal svelte-1b833yn" style="--delay: 4">${escape_html(paper.excerpt_long)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="metadata-row flex flex-wrap items-center gap-6 pt-6 animate-reveal svelte-1b833yn" style="--delay: 5">`);
    if (paper.published_at || paper.date) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="metadata-item flex items-center gap-2 svelte-1b833yn"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"></path></svg> <span>${escape_html(formatDate(paper.published_at ?? paper.date ?? void 0))}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="metadata-item flex items-center gap-2 svelte-1b833yn"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> <span>${escape_html(paper.reading_time)} min read</span></div> `);
    if (paper.difficulty_level) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="metadata-item flex items-center gap-2 svelte-1b833yn"><div${attr_class(`difficulty-dot w-2 h-2 ${stringify(difficultyColorClasses.bg)}`, "svelte-1b833yn")}></div> <span${attr_class(clsx(difficultyColorClasses.text), "svelte-1b833yn")}>${escape_html(paper.difficulty_level)}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (paper.technical_focus) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="metadata-item flex items-center gap-2 svelte-1b833yn"><span class="tags-label svelte-1b833yn">Tags:</span> <div class="flex gap-2"><!--[-->`);
      const each_array = ensure_array_like(paper.technical_focus.split(",").slice(0, 3));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let tech = each_array[$$index];
        $$renderer2.push(`<span class="tech-tag px-2 py-1 svelte-1b833yn">${escape_html(tech.trim())}</span>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="mt-8 animate-reveal svelte-1b833yn" style="--delay: 6">`);
    TrackedExperimentBadge($$renderer2, { paper, showFullStats: true });
    $$renderer2.push(`<!----></div></header>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let paper, relatedPapers, fullUrl;
    let data = $$props["data"];
    paper = data.paper;
    relatedPapers = data.relatedPapers;
    fullUrl = `https://createsomething.agency/experiments/${paper.slug}`;
    SEO($$renderer2, {
      title: paper.title,
      description: paper.description || paper.excerpt_long || paper.excerpt_short || "Community experiment from the playground",
      keywords: paper.focus_keywords || `${paper.category}, experiments, community, fork, learn`,
      propertyName: "agency",
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Experiments", url: "/experiments" },
        { name: paper.title, url: `/experiments/${paper.slug}` }
      ]
    });
    $$renderer2.push(`<!----> <div class="min-h-screen page-wrapper svelte-1srx2u5">`);
    ArticleHeader($$renderer2, { paper });
    $$renderer2.push(`<!----> <div class="shell-inner-pad"><div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12"><aside class="hidden lg:block">`);
    ShareButtons($$renderer2, { title: paper.title, url: fullUrl });
    $$renderer2.push(`<!----></aside> <div class="min-w-0">`);
    ArticleContent($$renderer2, { paper });
    $$renderer2.push(`<!----></div></div></div> `);
    RelatedArticles($$renderer2, { papers: relatedPapers, currentPaperId: paper.id });
    $$renderer2.push(`<!----> <div class="shell-inner-pad py-12"><a href="/experiments" class="inline-flex items-center gap-2 back-link svelte-1srx2u5"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Back to all experiments</a></div></div>`);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
