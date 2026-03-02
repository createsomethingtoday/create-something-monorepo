import fs from 'node:fs';
import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';

const startUrl = 'https://archiprotemplate-70629effe7faff236c7aca.webflow.io/';
const outPath = '/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-site-analyzer-mcp/reports/archipro-published-crawl-2026-03-02.json';
const apiKey = process.env.STEEL_API_KEY;
if (!apiKey) throw new Error('STEEL_API_KEY missing');

const maxPages = 30;
const maxDepth = 2;

function normalizeUrl(raw, origin) {
  try {
    const u = new URL(raw, origin);
    if (u.origin !== origin) return null;
    if (['mailto:', 'tel:', 'javascript:'].includes(u.protocol)) return null;
    u.hash = '';
    const path = u.pathname.replace(/\/$/, '') || '/';
    return `${u.origin}${path}${u.search}`;
  } catch {
    return null;
  }
}

function summarizePageAudit(audit) {
  const failReasons = [];
  const metaMissing = audit?.meta?.missing || [];
  if (metaMissing.length) failReasons.push(`meta_missing:${metaMissing.join(',')}`);

  const headings = audit?.headings?.summary || {};
  if (headings.missingH1) failReasons.push('missing_h1');
  if (headings.multipleH1) failReasons.push('multiple_h1');
  if ((headings.skippedHeadingLevels || 0) > 0) failReasons.push(`skipped_heading_levels:${headings.skippedHeadingLevels}`);
  if ((headings.emptyHeadings || 0) > 0) failReasons.push(`empty_headings:${headings.emptyHeadings}`);

  const domImgAlt = audit?.dom?.imagesMissingAlt?.count || 0;
  if (domImgAlt > 0) failReasons.push(`images_missing_alt:${domImgAlt}`);

  const links = audit?.links?.summary || {};
  if ((links.blankTargetMissingRel || 0) > 0) failReasons.push(`blank_target_missing_rel:${links.blankTargetMissingRel}`);
  if ((links.missingAccessibleName || 0) > 0) failReasons.push(`links_missing_accessible_name:${links.missingAccessibleName}`);
  if ((links.emptyHref || 0) > 0) failReasons.push(`links_empty_href:${links.emptyHref}`);
  if ((links.placeholderHref || 0) > 0) failReasons.push(`links_placeholder_href:${links.placeholderHref}`);

  const images = audit?.images?.summary || {};
  if ((images.missingDimensions || 0) > 0) failReasons.push(`images_missing_dimensions:${images.missingDimensions}`);
  if ((images.aboveFoldLazy || 0) > 0) failReasons.push(`images_above_fold_lazy:${images.aboveFoldLazy}`);

  const forms = audit?.forms?.summary || {};
  if ((forms.missingLabels || 0) > 0) failReasons.push(`forms_missing_labels:${forms.missingLabels}`);

  const media = audit?.media?.summary || {};
  if ((media.autoplayWithoutControls || 0) > 0) failReasons.push(`media_autoplay_without_controls:${media.autoplayWithoutControls}`);
  if ((media.backgroundVideosMissingControl || 0) > 0) failReasons.push(`bg_video_missing_controls:${media.backgroundVideosMissingControl}`);

  return {
    failCount: failReasons.length,
    failReasons,
    metaMissing,
    headings,
    links,
    images,
    forms,
    media,
    ix2: audit?.interactions?.ix2?.summary || null,
    ix3: audit?.interactions?.ix3?.summary || null
  };
}

const client = new Steel({ steelAPIKey: apiKey });
const session = await client.sessions.create({ timeout: 900000 });
const browser = await puppeteer.connect({ browserWSEndpoint: `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}` });

const origin = new URL(startUrl).origin;
const queue = [{ url: startUrl, depth: 0 }];
const visited = new Set();
const discovered = new Set([startUrl]);
const pages = [];
let snippetInfo = null;
let sitemapStatus = null;
let audit404 = null;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  while (queue.length > 0 && visited.size < maxPages) {
    const item = queue.shift();
    if (!item) break;
    const { url, depth } = item;
    if (visited.has(url)) continue;
    visited.add(url);

    const pageRecord = {
      url,
      depth,
      status: null,
      title: null,
      hasSnippet: false,
      error: null,
      summary: null,
      discoveredLinks: 0
    };

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
      pageRecord.status = response?.status?.() ?? null;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const evalData = await page.evaluate(async () => {
        const title = document.title || null;
        const links = Array.from(document.querySelectorAll('a[href]')).map((a) => a.href);
        const api = window.__wfReview;

        if (!api) {
          return { title, hasSnippet: false, links };
        }

        const tools = typeof api.listTools === 'function' ? api.listTools().map((t) => t.name) : [];

        let audit = null;
        let auditError = null;
        try {
          audit = await api.callTool('audit_webflow_way', { maxExamples: 20, includeSitemap: false });
        } catch (e) {
          auditError = e instanceof Error ? e.message : String(e);
        }

        let sitemap = null;
        try {
          sitemap = await api.callTool('get_sitemap_urls', { sitemapPath: '/sitemap.xml', maxUrls: 200 });
        } catch (e) {
          sitemap = { error: e instanceof Error ? e.message : String(e) };
        }

        let a404 = null;
        try {
          a404 = await api.callTool('audit_404', {});
        } catch (e) {
          a404 = { error: e instanceof Error ? e.message : String(e) };
        }

        return {
          title,
          hasSnippet: true,
          snippetVersion: api.version ?? null,
          toolCount: tools.length,
          tools,
          links,
          audit,
          auditError,
          sitemap,
          a404
        };
      });

      pageRecord.title = evalData.title;
      pageRecord.hasSnippet = Boolean(evalData.hasSnippet);

      if (evalData.hasSnippet) {
        if (!snippetInfo) {
          snippetInfo = {
            version: evalData.snippetVersion,
            toolCount: evalData.toolCount,
            tools: evalData.tools
          };
        }
        if (!sitemapStatus) sitemapStatus = evalData.sitemap;
        if (!audit404) audit404 = evalData.a404;

        if (evalData.auditError) {
          pageRecord.error = evalData.auditError;
        } else {
          pageRecord.summary = summarizePageAudit(evalData.audit);
        }
      }

      const links = Array.isArray(evalData.links) ? evalData.links : [];
      const normalized = [];
      for (const href of links) {
        const n = normalizeUrl(href, origin);
        if (!n) continue;
        normalized.push(n);
      }
      const unique = Array.from(new Set(normalized));
      pageRecord.discoveredLinks = unique.length;

      if (depth < maxDepth) {
        for (const nextUrl of unique) {
          if (!visited.has(nextUrl) && !discovered.has(nextUrl)) {
            discovered.add(nextUrl);
            queue.push({ url: nextUrl, depth: depth + 1 });
          }
        }
      }
    } catch (error) {
      pageRecord.error = error instanceof Error ? error.message : String(error);
    }

    pages.push(pageRecord);
  }

  const pagesWithSnippet = pages.filter((p) => p.hasSnippet).length;
  const auditedPages = pages.filter((p) => p.summary).length;
  const failingPages = pages.filter((p) => (p.summary?.failCount || 0) > 0);

  const issueCounts = {
    metaMissing: 0,
    skippedHeadingLevels: 0,
    imagesMissingAlt: 0,
    linksMissingRel: 0,
    linksMissingAccessibleName: 0,
    imagesMissingDimensions: 0,
    imagesAboveFoldLazy: 0,
    formsMissingLabels: 0
  };

  for (const p of pages) {
    const s = p.summary;
    if (!s) continue;
    if ((s.metaMissing || []).length > 0) issueCounts.metaMissing += 1;
    if ((s.headings?.skippedHeadingLevels || 0) > 0) issueCounts.skippedHeadingLevels += 1;
    if ((s.images?.missingAlt || 0) > 0) issueCounts.imagesMissingAlt += 1;
    if ((s.links?.blankTargetMissingRel || 0) > 0) issueCounts.linksMissingRel += 1;
    if ((s.links?.missingAccessibleName || 0) > 0) issueCounts.linksMissingAccessibleName += 1;
    if ((s.images?.missingDimensions || 0) > 0) issueCounts.imagesMissingDimensions += 1;
    if ((s.images?.aboveFoldLazy || 0) > 0) issueCounts.imagesAboveFoldLazy += 1;
    if ((s.forms?.missingLabels || 0) > 0) issueCounts.formsMissingLabels += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    startUrl,
    origin,
    crawlConfig: { maxPages, maxDepth },
    crawlSummary: {
      visitedPages: pages.length,
      pagesWithSnippet,
      auditedPages,
      failingPages: failingPages.length
    },
    snippetInfo,
    sitemapStatus,
    audit404,
    issueCounts,
    pages
  };

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outPath, crawlSummary: report.crawlSummary, issueCounts, snippetInfo, sitemapStatus, audit404 }, null, 2));
} finally {
  await browser.close();
}
