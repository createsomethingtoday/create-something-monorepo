import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "data", "insights-cms.json"), "utf8"));
const categories = data.categories;
const items = data.items;
const categoryById = new Map(categories.map((category) => [category.id, category]));

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const slugPath = (item) => `${item.slug}.html`;

function updateTitle(html, title) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>Cato | ${esc(title)}</title>`)
    .replace(/<meta content="[^"]*" property="og:title">/, `<meta content="Cato | ${esc(title)}" property="og:title">`)
    .replace(/<meta content="[^"]*" property="twitter:title">/, `<meta content="Cato | ${esc(title)}" property="twitter:title">`);
}

function replaceInsightsSections(html, sections) {
  return html.replace(
    /<div class="insights-page-sections">[\s\S]*?\n      <section class="section_cta-v2">/,
    `<div class="insights-page-sections">\n${sections}\n      </div>\n      <section class="section_cta-v2">`
  );
}

function heroSection({ title, summary, backLink = "", panelLabel, panelTitle, panelSummary }) {
  return `        <section class="section_insights-hub background-color-secondary padding-top-nav-offset">
          <div class="insights-hero-bg" aria-hidden="true"><img src="images/hero-bg-element_1hero-bg-element.webp" loading="eager" alt="" class="insights-hero-bg-element"><img src="images/hero-bg-element_1hero-bg-element.webp" loading="eager" alt="" class="insights-hero-bg-element is-right"></div>
          <div class="padding-global padding-section-large">
            <div class="container-large">
              <div class="insights-hero-grid">
                <div class="insights-hero-copy">
                  <p class="insights-eyebrow">Insights</p>
                  <h1 data-split="lines" data-anim-load="lines" class="heading-style-h2 insights-hero-heading">${esc(title)}</h1>
                  <p class="insights-hero-text">${esc(summary)}</p>
                  ${backLink}
                </div>
                <div data-anim-load="fade" class="insights-feature-panel background-color-tertiary">
                  <p class="insights-panel-label text-color-alternate">${esc(panelLabel)}</p>
                  <h2 class="heading-style-h5 text-color-alternate">${esc(panelTitle)}</h2>
                  <p class="text-color-alternate">${esc(panelSummary)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>`;
}

function archiveCard(item, featured = false) {
  if (featured) {
    return `                  <a href="${esc(slugPath(item))}" class="insights-cms-card is-featured w-inline-block">
                    <div class="insights-featured-card-top">
                      <div class="insights-card-pill">${esc(item.pill)}</div>
                      <div class="insights-cms-meta">${esc(item.date)}</div>
                    </div>
                    <div class="insights-featured-card-body">
                      <div>
                        <h3 class="heading-style-h4">${esc(item.title)}</h3>
                        <p class="insights-cms-summary">${esc(item.summary)}</p>
                      </div><span class="insights-cms-link">${esc(item.ctaLabel)}</span>
                    </div>
                  </a>`;
  }

  return `                  <a href="${esc(slugPath(item))}" class="insights-cms-card is-archive-card w-inline-block">
                    <div class="insights-card-pill">${esc(item.pill)}</div>
                    <div>
                      <div class="insights-cms-meta">${esc(item.date)}</div>
                      <h3 class="heading-style-h5">${esc(item.title)}</h3>
                      <p class="insights-cms-summary">${esc(item.summary)}</p>
                    </div><span class="insights-cms-link">${esc(item.ctaLabel)}</span>
                  </a>`;
}

function hubCard(item) {
  return `                  <a href="${esc(slugPath(item))}" class="insights-cms-card w-inline-block">
                    <div class="insights-card-pill">${esc(item.pill)}</div>
                    <div>
                      <div class="insights-cms-meta">${esc(item.date)}</div>
                      <h3 class="heading-style-h5">${esc(item.title)}</h3>
                      <p class="insights-cms-summary">${esc(item.summary)}</p>
                    </div><span class="insights-cms-link">${esc(item.ctaLabel)}</span>
                  </a>`;
}

function categoryArchive(category) {
  const categoryItems = items.filter((item) => item.category === category.id);
  const subscribeSection = category.hasSubscribe ? `        <section data-section="resiliency-alerts-subscribe" class="section_insights-system">
          <div class="padding-global padding-section-large resiliency-content-wrapper">
            <div class="container-large">
              <div class="insights-system-band is-subscribe">
                <div class="insights-system-copy">
                  <p class="insights-eyebrow">Resiliency Report Alerts</p>
                  <h2 class="heading-style-h3">Subscribe for Resiliency Report Alerts.</h2>
                  <p>Receive updates when Cato publishes new healthcare supply risk signals, disruption analysis, and report archive entries.</p>
                </div>
                <div data-anim-scroll="children-fade" class="insights-system-list">
                  <div class="insights-system-item is-form-card">
                    <div class="resiliency-form-intro">
                      <div class="insights-card-pill">Email alerts</div>
                      <h3 class="heading-style-h5">Receive new Resiliency Report Alerts.</h3>
                      <p>Get healthcare supply risk signals, disruption reports, and sourcing notes as they publish.</p>
                    </div>
                    <ul role="list" class="resiliency-alert-benefits">
                      <li>New report releases</li>
                      <li>Supply disruption signals</li>
                      <li>Procurement response notes</li>
                    </ul>
                    <div class="form-block w-form">
                      <form id="email-form-3" name="email-form-3" data-name="Email Form 3" method="get" class="resiliency-alert-form" data-wf-page="69fd0f4ba8ad74fa26559cfe" data-wf-element-id="cms-alert-form">
                        <label for="Resiliency-Email" class="resiliency-form-label">Work email address</label>
                        <div class="resiliency-form-row"><input class="form_input is-resiliency-signup w-input" maxlength="256" name="Resiliency-Email" data-name="Resiliency Email" placeholder="you@organization.com" type="email" id="Resiliency-Email" required=""><input type="submit" data-wait="Subscribing..." class="button is-resiliency-submit w-button" value="Subscribe to alerts"></div>
                        <p class="resiliency-form-note">No spam. Unsubscribe anytime.</p>
                      </form>
                      <div class="success-message w-form-done"><div>You are subscribed. New Resiliency Report Alerts will be sent to your inbox.</div></div>
                      <div class="error-message w-form-fail"><div>Something went wrong. Please try again.</div></div>
                    </div>
                  </div>
                  <div class="insights-system-item is-note-card"><strong>Archive status</strong><span>Browse published resiliency reports below as the archive grows from recurring market signals and care continuity analysis.</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>
` : "";

  const cta = category.hasSubscribe ? `                  <div class="insights-archive-cta">
                    <div>
                      <strong>Want future alerts?</strong>
                      <span>Subscribe once and receive new Resiliency Report Alerts as they publish.</span>
                    </div>
                    <a href="#email-form-3" class="insights-archive-cta-link">Subscribe for alerts</a>
                  </div>` : "";

  return `${heroSection({
    title: category.title,
    summary: category.heroSummary,
    backLink: '<a href="insights.html" class="insights-back-link">Back to all Insights</a>',
    panelLabel: category.panelLabel,
    panelTitle: category.panelTitle,
    panelSummary: category.panelSummary
  })}
${subscribeSection}        <section class="section_insights-system">
          <div class="padding-global padding-section-large">
            <div class="container-large">
              <div class="insights-system-band is-archive">
                <div class="insights-system-copy">
                  <p class="insights-eyebrow">${esc(category.archiveEyebrow)}</p>
                  <h2 data-split="lines" data-anim-scroll="lines" class="heading-style-h3">${esc(category.archiveTitle)}</h2>
                  <p>${esc(category.archiveSummary)}</p>
                </div>
                <div data-anim-scroll="children-fade" class="insights-archive-list">
${categoryItems.map((item) => archiveCard(item)).join("\n")}
${cta}
                </div>
              </div>
            </div>
          </div>
        </section>`;
}

function hubSections() {
  const featured = items.find((item) => item.featured) || items[0];
  const rest = items.filter((item) => item.id !== featured.id);

  const filters = [
    `<a href="insights.html" class="insights-filter is-active"><span>All insights</span><span class="insights-filter-count">${items.length}</span></a>`,
    ...categories.map((category) => {
      const count = items.filter((item) => item.category === category.id).length;
      return `<a href="${esc(category.page)}" class="insights-filter"><span>${esc(category.filterLabel)}</span><span class="insights-filter-count">${count}</span></a>`;
    })
  ].join("\n                    ");

  return `${heroSection({
    title: "Healthcare procurement intelligence for resilient supply chains.",
    summary: "Research, reports, resources, and company updates from Cato for teams responsible for protecting care continuity during supply disruption.",
    panelLabel: "Featured now",
    panelTitle: "Resiliency Report Alerts",
    panelSummary: "A recurring signal path for supply disruption analysis, sourcing risk, and care continuity planning."
  }).replace(
    "</div>\n              </div>\n            </div>\n          </div>\n        </section>",
    `  <a href="resiliency-reports.html" class="insights-feature-link">Subscribe and view archive</a>
                </div>
              </div>
              <div class="insights-card-grid">
${categories.map((category) => `                <a href="${esc(category.page)}" class="insights-card w-inline-block">
                  <div class="insights-card-pill">${esc(category.cardLabel)}</div>
                  <h2 class="heading-style-h5">${esc(category.cardTitle)}</h2>
                  <p>${esc(category.cardSummary)}</p><span class="insights-card-link">${esc(category.cardCta)}</span>
                </a>`).join("\n")}
              </div>
            </div>
          </div>
        </section>`
  )}
        <section class="section_insights-preview background-color-secondary">
          <div class="padding-global padding-section-large">
            <div class="container-large">
              <div class="insights-preview-header">
                <p class="insights-eyebrow">Insights hub</p>
                <h2 data-split="lines" data-anim-scroll="lines" class="heading-style-h3">One place for reports, research, resources, and updates.</h2>
                <p class="insights-hero-text">Browse by content type, follow the featured Resiliency Report Alerts path, and keep high-priority launches visible as Cato publishes new market signals.</p>
              </div>
              <div class="insights-hub-layout">
                <aside data-anim-scroll="fade" class="insights-filter-rail" aria-label="Browse insights by content type">
                  <div class="insights-filter-title">Browse by type</div>
                  <div class="insights-filter-list">
                    ${filters}
                  </div>
                  <p class="insights-filter-note">Start with one hub, then split high-volume categories into focused pages as publishing grows.</p>
                </aside>
                <div data-anim-scroll="children-fade" class="insights-cms-grid is-editorial">
${archiveCard(featured, true)}
${rest.map((item) => hubCard(item)).join("\n")}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section class="section_insights-system">
          <div class="padding-global padding-section-large">
            <div class="container-large">
              <div class="insights-system-band">
                <div class="insights-system-copy">
                  <p class="insights-eyebrow">CMS model</p>
                  <h2 data-split="lines" data-anim-scroll="lines" class="heading-style-h3">A local preview of the Webflow collection shape.</h2>
                  <p>This mock CMS mirrors the fields needed in Webflow: title, slug, type, category, summary, body, date, featured state, menu feature state, CTA label, audience, and archive routing.</p>
                </div>
                <div class="insights-system-list">
                  <div class="insights-system-item"><strong>Collection</strong><span>Insights entries power the hub, focused archive pages, detail pages, and featured navigation content.</span></div>
                  <div class="insights-system-item"><strong>Focused archives</strong><span>Resiliency Reports, Newsroom, Research, and Resources can each filter the same collection by category.</span></div>
                  <div class="insights-system-item"><strong>Native Webflow target</strong><span>After review, these records can become CMS items and the static lists can become Collection Lists with matching field bindings.</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>`;
}

function bodyHtml(item) {
  return item.body
    .map((section) => `                    <section class="insights-detail-section">
                      <h2>${esc(section.heading)}</h2>
${section.paragraphs.map((paragraph) => `                      <p>${esc(paragraph)}</p>`).join("\n")}
${section.bullets ? `                      <ul role="list">
${section.bullets.map((bullet) => `                        <li>${esc(bullet)}</li>`).join("\n")}
                      </ul>` : ""}
                    </section>`)
    .join("\n");
}

function detailSections(item) {
  const category = categoryById.get(item.category);
  return `${heroSection({
    title: item.title,
    summary: item.summary,
    backLink: `<a href="${esc(category.page)}" class="insights-back-link">Back to ${esc(category.title)}</a>`,
    panelLabel: item.resourceType,
    panelTitle: category.title,
    panelSummary: `Designed for ${item.audience.toLowerCase()}`
  })}
        <section class="section_insights-system">
          <div class="padding-global padding-section-large">
            <div class="container-large">
              <div class="insights-detail-layout">
                <article class="insights-detail-article">
                  <div class="insights-detail-meta">
                    <div class="insights-card-pill">${esc(item.pill)}</div>
                    <span>${esc(item.date)}</span>
                  </div>
                  <div class="insights-detail-rich-text text-rich-text">
${bodyHtml(item)}
                  </div>
                </article>
                <aside class="insights-detail-sidebar" aria-label="Resource details">
                  <div class="insights-detail-sidebar-card">
                    <p class="insights-eyebrow">Resource details</p>
                    <div class="insights-detail-field"><strong>Resource type</strong><span>${esc(item.resourceType)}</span></div>
                    <div class="insights-detail-field"><strong>Archive</strong><a href="${esc(category.page)}">${esc(category.title)}</a></div>
                    <div class="insights-detail-field"><strong>Built for</strong><span>${esc(item.audience)}</span></div>
                    <div class="insights-detail-field"><strong>Published</strong><span>${esc(item.date)}</span></div>
                  </div>
                  <div class="insights-detail-sidebar-card">
                    <p class="insights-eyebrow">Key takeaways</p>
                    <ul role="list" class="insights-detail-takeaways">
${item.takeaways.map((takeaway) => `                      <li>${esc(takeaway)}</li>`).join("\n")}
                    </ul>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>`;
}

function renderFile(file, sections, title) {
  const html = updateTitle(replaceInsightsSections(readFileSync(join(root, file), "utf8"), sections), title);
  writeFileSync(join(root, file), html);
}

renderFile("insights.html", hubSections(), "Insights");
for (const category of categories) {
  renderFile(category.page, categoryArchive(category), category.title);
}

const detailTemplate = readFileSync(join(root, "insights.html"), "utf8");
for (const item of items) {
  const html = updateTitle(replaceInsightsSections(detailTemplate, detailSections(item)), item.title);
  writeFileSync(join(root, slugPath(item)), html);
}

console.log(`Rendered ${categories.length} archive pages and ${items.length} detail pages from data/insights-cms.json`);
