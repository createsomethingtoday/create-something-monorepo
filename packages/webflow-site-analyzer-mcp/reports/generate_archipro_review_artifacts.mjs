import fs from 'node:fs';

const baseDir = '/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-site-analyzer-mcp/reports';
const designerPath = `${baseDir}/archipro-designer-2026-03-02.json`;
const publishedPath = `${baseDir}/archipro-published-crawl-2026-03-02.json`;
const outJson = `${baseDir}/archipro-review-checklist-2026-03-02.json`;
const outMd = `${baseDir}/archipro-review-checklist-2026-03-02.md`;

const previewUrl = 'https://preview.webflow.com/preview/archiprotemplate-70629effe7faff236c7aca?utm_medium=preview_link&utm_source=dashboard&utm_content=archiprotemplate-70629effe7faff236c7aca&preview=896fb6bdfe0d546c91af69df27b5afe1&workflow=preview';
const publishedUrl = 'https://archiprotemplate-70629effe7faff236c7aca.webflow.io/';

const designer = JSON.parse(fs.readFileSync(designerPath, 'utf8'));
const published = JSON.parse(fs.readFileSync(publishedPath, 'utf8'));

const checks = new Map((designer?.checklistScore?.data?.checks || []).map((c) => [c.id, c]));
const pages = (published.pages || []).filter((p) => p && p.summary);
const home = pages.find((p) => p.url === publishedUrl.replace(/\/$/, '')) || pages.find((p) => p.url === publishedUrl) || pages[0] || null;
const pageIssue = {
  missingH1OrHierarchy: pages.some((p) => {
    const h = p.summary?.headings || {};
    return h.missingH1 || h.multipleH1 || (h.skippedHeadingLevels || 0) > 0;
  }),
  missingAlt: pages.some((p) => (p.summary?.images?.missingAlt || 0) > 0),
  missingMeta: pages.some((p) => (p.summary?.metaMissing || []).length > 0),
  missingDimensions: pages.some((p) => (p.summary?.images?.missingDimensions || 0) > 0),
  blankRel: pages.some((p) => (p.summary?.links?.blankTargetMissingRel || 0) > 0),
  missingLabels: pages.some((p) => (p.summary?.forms?.missingLabels || 0) > 0),
  aboveFoldLazy: pages.some((p) => (p.summary?.images?.aboveFoldLazy || 0) > 0),
  videosNoControls: pages.some((p) => (p.summary?.media?.autoplayWithoutControls || 0) > 0),
  bgVideosNoControl: pages.some((p) => (p.summary?.media?.backgroundVideosMissingControl || 0) > 0)
};

const allFormatKeys = Array.from(
  new Set(pages.flatMap((p) => Object.keys(p.summary?.imageFormats || p.summary?.images?.formats || {})))
).sort();

function statusFromDesigner(id) {
  const c = checks.get(id);
  if (!c) return { status: 'MANUAL', evidence: ['not-scored'] };
  if (c.result === 'pass') return { status: 'PASS', evidence: c.evidence || [] };
  if (c.result === 'fail') return { status: 'FAIL', evidence: c.evidence || [] };
  return { status: 'MANUAL', evidence: c.evidence || [] };
}

const expressChecklist = [
  {
    id: 'webflow_audit.h1_hierarchy',
    requirement: 'One H1 per page; no skipped heading levels',
    status: pageIssue.missingH1OrHierarchy ? 'FAIL' : 'PASS',
    source: 'published-webmcp-crawl',
    evidence: [`pagesWithHierarchyIssues=${published.issueCounts?.skippedHeadingLevels || 0}`]
  },
  {
    id: 'webflow_audit.alt_text',
    requirement: 'No missing alt texts',
    status: pageIssue.missingAlt ? 'FAIL' : 'PASS',
    source: 'published-webmcp-crawl',
    evidence: [`pagesWithMissingAlt=${published.issueCounts?.imagesMissingAlt || 0}`]
  },
  {
    id: 'components.nav_footer_cta',
    requirement: 'Nav, Footer, and CTAs are Components',
    ...statusFromDesigner('components.nav_footer_cta'),
    source: 'designer-mcp'
  },
  {
    id: 'components.title_case_names',
    requirement: 'Components use title casing in names',
    ...statusFromDesigner('components.title_case_naming'),
    source: 'designer-mcp'
  },
  {
    id: 'interactions.unused_cleaned',
    requirement: 'Interactions are cleaned of unused animations',
    status: 'PARTIAL',
    source: 'published-webmcp + designer-mcp',
    evidence: [
      `ix2UnusedActionLists(home)=${home?.summary?.ix2?.unusedActionLists ?? 'n/a'}`,
      `ix2MissingTargets(home)=${home?.summary?.ix2?.missingTargets ?? 'n/a'}`,
      'Designer check is currently manual for strict unused/deleted state.'
    ]
  },
  {
    id: 'variables.defined_reusable',
    requirement: 'Color, typography, and spacing variables are defined and reusable',
    ...statusFromDesigner('variables.defined_reusable'),
    source: 'designer-mcp'
  },
  {
    id: 'variables.title_case',
    requirement: 'Variables use Title Case, human-readable naming',
    ...statusFromDesigner('variables.title_case_naming'),
    source: 'designer-mcp'
  },
  {
    id: 'variables.breakpoint_modes',
    requirement: 'Variable Modes exist for tablet/mobile landscape/portrait',
    ...statusFromDesigner('variables.breakpoint_modes'),
    source: 'designer-mcp'
  },
  {
    id: 'styles.unused_classes',
    requirement: 'Unused styles/classes are cleaned up',
    ...statusFromDesigner('styles.unused_classes_cleaned'),
    source: 'designer-mcp'
  },
  {
    id: 'styles.base_tag_styles',
    requirement: 'Base styles applied to HTML tags',
    ...statusFromDesigner('styles.base_tag_selectors'),
    source: 'designer-mcp'
  },
  {
    id: 'styles.base_uses_variables',
    requirement: 'Variables used to define base tag styles',
    status: 'MANUAL',
    source: 'designer-mcp',
    evidence: ['Variable linkage is not exposed in current metadata payload.']
  },
  {
    id: 'styles.combo_depth',
    requirement: 'No more than 3-4 combo classes per element',
    ...statusFromDesigner('styles.combo_class_depth'),
    source: 'designer-mcp'
  },
  {
    id: 'pages.home_seo_title_formula',
    requirement: 'Home SEO title matches required naming formula',
    status: home && home.title && home.title.includes(' - Webflow ') ? 'PASS' : 'FAIL',
    source: 'published-webmcp-crawl',
    evidence: [`homeTitle=${home?.title || 'n/a'}`]
  },
  {
    id: 'pages.license_text_exact',
    requirement: 'License page contains exact required intro text',
    status: 'FAIL',
    source: 'designer-mcp + published-webmcp-crawl',
    evidence: ['Licenses page not detected in Designer extracted page list.']
  },
  {
    id: 'pages.image_loading_strategy',
    requirement: 'Below-the-fold lazy, essential above-fold eager',
    status: pageIssue.aboveFoldLazy ? 'FAIL' : 'PASS',
    source: 'published-webmcp-crawl',
    evidence: [`pagesWithAboveFoldLazy=${published.issueCounts?.imagesAboveFoldLazy || 0}`]
  },
  {
    id: 'pages.videos_controls',
    requirement: 'No autoplay without controls and large videos have controls',
    status: pageIssue.videosNoControls || pageIssue.bgVideosNoControl ? 'FAIL' : 'PASS',
    source: 'published-webmcp-crawl',
    evidence: [
      `autoplayWithoutControlsDetected=${pageIssue.videosNoControls}`,
      `backgroundVideosMissingControlDetected=${pageIssue.bgVideosNoControl}`
    ]
  },
  {
    id: 'pages.meta_tags_static',
    requirement: 'Each static page has title, description and OG tags',
    status: pageIssue.missingMeta ? 'FAIL' : 'PASS',
    source: 'published-webmcp-crawl',
    evidence: [`pagesWithMissingMeta=${published.issueCounts?.metaMissing || 0}`]
  },
  {
    id: 'pages.meta_tags_cms_dynamic',
    requirement: 'CMS pages use dynamic SEO tags',
    status: 'PARTIAL',
    source: 'designer-mcp + published-webmcp-crawl',
    evidence: [
      `cmsCollectionsDetected=${designer?.designerExtraction?.data?.cmsCollections?.length || 0}`,
      'Dynamic field binding cannot be confirmed from current payloads.'
    ]
  },
  {
    id: 'pages.custom_404',
    requirement: 'Custom branded 404 page with nav and CTAs',
    status: published.audit404?.ok ? 'PASS' : 'FAIL',
    source: 'published-webmcp-crawl',
    evidence: [
      `status=${published.audit404?.status ?? 'n/a'}`,
      `navCount=${published.audit404?.navCount ?? 'n/a'}`,
      `linkCount=${published.audit404?.linkCount ?? 'n/a'}`
    ]
  },
  {
    id: 'pages.image_dimensions',
    requirement: 'Images have defined width/height',
    status: pageIssue.missingDimensions ? 'FAIL' : 'PASS',
    source: 'published-webmcp-crawl',
    evidence: [`pagesWithMissingImageDimensions=${published.issueCounts?.imagesMissingDimensions || 0}`]
  },
  {
    id: 'pages.transition_simple',
    requirement: 'Simple CSS transitions used for hover/press',
    status: 'MANUAL',
    source: 'published-webmcp-crawl',
    evidence: ['Transition-property linting not included in this run.']
  },
  {
    id: 'pages.wcag_contrast',
    requirement: 'WCAG color contrast met (default/hover/focus/active)',
    status: 'MANUAL',
    source: 'published-webmcp-crawl',
    evidence: ['Contrast calculation not included in this run.']
  },
  {
    id: 'pages.cms_used_relational',
    requirement: 'CMS used for repeatable/relational content',
    ...statusFromDesigner('cms.collection_pages_present'),
    source: 'designer-mcp'
  },
  {
    id: 'assets.modern_formats',
    requirement: 'Modern image formats used (WebP, AVIF, JPEG, PNG)',
    status: allFormatKeys.some((k) => ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(k)) ? 'PASS' : 'FAIL',
    source: 'published-webmcp-crawl',
    evidence: [`detectedFormats=${allFormatKeys.join(',') || 'none'}`]
  },
  {
    id: 'responsive.multi_breakpoint_check',
    requirement: 'Responsive check run on homepage + one additional page',
    status: 'MANUAL',
    source: 'published-webmcp-crawl',
    evidence: ['No multi-viewport screenshot diff run in this report.']
  }
];

const perPageFailures = pages
  .map((p) => ({
    url: p.url,
    title: p.title,
    statusCode: p.status,
    failCount: p.summary?.failCount || 0,
    failReasons: p.summary?.failReasons || []
  }))
  .sort((a, b) => b.failCount - a.failCount || a.url.localeCompare(b.url));

const expressCounts = expressChecklist.reduce(
  (acc, row) => {
    const s = row.status;
    if (s === 'PASS') acc.pass += 1;
    else if (s === 'FAIL') acc.fail += 1;
    else if (s === 'PARTIAL') acc.partial += 1;
    else acc.manual += 1;
    return acc;
  },
  { pass: 0, fail: 0, partial: 0, manual: 0 }
);

const output = {
  generatedAt: new Date().toISOString(),
  template: {
    name: designer?.designerExtraction?.data?.siteName || 'Unknown',
    previewUrl,
    publishedUrl
  },
  dataSources: {
    designerReportPath: designerPath,
    publishedCrawlPath: publishedPath,
    designerTestedAt: designer?.testedAt || null,
    publishedGeneratedAt: published?.generatedAt || null
  },
  summary: {
    expressChecklist: expressCounts,
    designerScore: designer?.checklistScore?.data?.summary || null,
    publishedCrawl: published?.crawlSummary || null,
    snippetInfo: published?.snippetInfo || null,
    sitemapStatus: published?.sitemapStatus || null
  },
  expressChecklist,
  perPageFailures
};

fs.writeFileSync(outJson, JSON.stringify(output, null, 2));

const mdLines = [];
mdLines.push('# Archipro Template Review Checklist');
mdLines.push('');
mdLines.push(`Generated: ${output.generatedAt}`);
mdLines.push(`Preview URL: ${previewUrl}`);
mdLines.push(`Published URL: ${publishedUrl}`);
mdLines.push('');
mdLines.push('## Summary');
mdLines.push('');
mdLines.push(`- Express checklist: PASS ${expressCounts.pass}, FAIL ${expressCounts.fail}, PARTIAL ${expressCounts.partial}, MANUAL ${expressCounts.manual}`);
mdLines.push(`- Designer strict score: ${output.summary.designerScore?.pass || 0} pass / ${output.summary.designerScore?.fail || 0} fail / ${output.summary.designerScore?.manual || 0} manual`);
mdLines.push(`- Published crawl: ${output.summary.publishedCrawl?.auditedPages || 0} audited pages, ${output.summary.publishedCrawl?.failingPages || 0} pages with at least one fail`);
mdLines.push(`- Snippet: v${output.summary.snippetInfo?.version || 'unknown'} with ${output.summary.snippetInfo?.toolCount || 0} tools`);
mdLines.push(`- Sitemap: ${output.summary.sitemapStatus?.error ? `FAIL (${output.summary.sitemapStatus.error})` : 'PASS'}`);
mdLines.push('');
mdLines.push('## Express Checklist Mapping');
mdLines.push('');
mdLines.push('| ID | Requirement | Status | Source | Evidence |');
mdLines.push('|---|---|---|---|---|');
for (const row of expressChecklist) {
  const evidence = (row.evidence || []).join('; ').replace(/\|/g, '\\|');
  mdLines.push(`| ${row.id} | ${row.requirement} | ${row.status} | ${row.source} | ${evidence} |`);
}
mdLines.push('');
mdLines.push('## Per-Page Fail List (Published Crawl)');
mdLines.push('');
for (const page of perPageFailures) {
  mdLines.push(`- ${page.url} (${page.failCount}): ${(page.failReasons || []).join(', ')}`);
}
mdLines.push('');
mdLines.push('## Output Files');
mdLines.push('');
mdLines.push(`- ${outJson}`);
mdLines.push(`- ${outMd}`);

fs.writeFileSync(outMd, mdLines.join('\n'));

console.log(JSON.stringify({ outJson, outMd, expressCounts, perPageCount: perPageFailures.length }, null, 2));
