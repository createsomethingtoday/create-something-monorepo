#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_LANE_URL = 'https://wf-template-review-eric.mcp.createsomething.agency/mcp';
const DEFAULT_APPROVED_SAMPLE = 2;
const DEFAULT_READY_SAMPLE = 1;
const DEFAULT_QUEUE_LIMIT = 8;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_WAIT_MS = 20 * 60 * 1000;
const DEFAULT_CRAWL_MAX_PAGES = 12;
const DEFAULT_CRAWL_MAX_DEPTH = 1;
const AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p';
const AIRTABLE_ASSETS_TABLE_ID = 'tblRwzpWoLgE9MrUm';

const AIRTABLE_FIELDS = {
  name: 'Name',
  websiteUrl: '🔗Website URL',
  previewSiteUrl: '🔗Preview Site URL',
  marketplaceStatus: '🚀Marketplace Status',
  latestReviewStatus: '📝Latest Review Status',
  submittedDate: '📅Submitted Date',
  thumbnailImage: '🖼️Thumbnail Image',
  thumbnailImageSecondary: '🖼️Thumbnail Image (Secondary)',
  carouselImages: '🖼️Carousel Images',
};

function parseArgs(argv) {
  const args = {
    laneUrl: process.env.REVIEWER_LANE_URL?.trim() || DEFAULT_LANE_URL,
    laneToken: process.env.REVIEWER_LANE_TOKEN?.trim() || '',
    airtableApiKey: process.env.AIRTABLE_API_KEY?.trim() || '',
    approvedSample: DEFAULT_APPROVED_SAMPLE,
    readySample: DEFAULT_READY_SAMPLE,
    queueLimit: DEFAULT_QUEUE_LIMIT,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    maxWaitMs: DEFAULT_MAX_WAIT_MS,
    crawlMaxPages: DEFAULT_CRAWL_MAX_PAGES,
    crawlMaxDepth: DEFAULT_CRAWL_MAX_DEPTH,
    outputJson: '',
    outputMarkdown: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (!next && arg.startsWith('--')) continue;

    if (arg === '--lane-url' && next) {
      args.laneUrl = next;
      index += 1;
      continue;
    }
    if (arg === '--lane-token' && next) {
      args.laneToken = next;
      index += 1;
      continue;
    }
    if (arg === '--airtable-api-key' && next) {
      args.airtableApiKey = next;
      index += 1;
      continue;
    }
    if (arg === '--approved-sample' && next) {
      args.approvedSample = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--ready-sample' && next) {
      args.readySample = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--queue-limit' && next) {
      args.queueLimit = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--poll-interval-ms' && next) {
      args.pollIntervalMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--max-wait-ms' && next) {
      args.maxWaitMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--crawl-max-pages' && next) {
      args.crawlMaxPages = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--crawl-max-depth' && next) {
      args.crawlMaxDepth = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === '--output-json' && next) {
      args.outputJson = next;
      index += 1;
      continue;
    }
    if (arg === '--output-markdown' && next) {
      args.outputMarkdown = next;
      index += 1;
      continue;
    }
  }

  return args;
}

function assertConfigured(args) {
  if (!args.laneUrl || !args.laneToken) {
    throw new Error('Provide reviewer lane credentials via --lane-url/--lane-token or REVIEWER_LANE_URL/REVIEWER_LANE_TOKEN.');
  }
  if (!args.airtableApiKey) {
    throw new Error('Provide AIRTABLE_API_KEY or --airtable-api-key to verify queue items against the source database.');
  }
}

async function timed(fn) {
  const startedAt = Date.now();
  const value = await fn();
  return {
    value,
    elapsedMs: Date.now() - startedAt,
  };
}

async function postRpc(url, token, method, params) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-${Date.now()}`,
      method,
      params,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`RPC ${method} failed (${response.status}): ${text}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`RPC ${method} returned non-JSON payload: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (payload?.error) {
    throw new Error(
      typeof payload.error?.message === 'string' ? payload.error.message : JSON.stringify(payload.error)
    );
  }

  return payload?.result ?? null;
}

function parseToolEnvelope(result, context) {
  if (!result || typeof result !== 'object') {
    throw new Error(`${context} returned an empty tool envelope.`);
  }

  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }

  const text = Array.isArray(result.content)
    ? result.content
        .filter((part) => part?.type === 'text' && typeof part?.text === 'string')
        .map((part) => part.text)
        .join('\n')
    : '';

  if (!text) return result;

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${context} returned unparsable text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function callHubTool(laneUrl, laneToken, toolName, args, context = toolName) {
  const result = await postRpc(laneUrl, laneToken, 'tools/call', {
    name: toolName,
    arguments: args,
  });
  return parseToolEnvelope(result, context);
}

async function callProxyTool(laneUrl, laneToken, proxyToolName, args) {
  const envelope = await callHubTool(
    laneUrl,
    laneToken,
    'hub_execute_proxy_tool',
    { proxyToolName, args },
    `hub_execute_proxy_tool:${proxyToolName}`,
  );

  if (envelope?.ok === false) {
    throw new Error(
      typeof envelope?.error === 'string'
        ? envelope.error
        : `Proxy tool ${proxyToolName} returned ok=false`
    );
  }

  return envelope?.data ?? envelope;
}

async function listQueue(laneUrl, laneToken, status, limit) {
  return callProxyTool(
    laneUrl,
    laneToken,
    'webflow-template-review-mcp__template_review_list_queue',
    {
      status,
      assigned: 'any',
      limit,
    },
  );
}

async function fetchAirtableAsset(apiKey, assetId) {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ASSETS_TABLE_ID}/${assetId}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Airtable fetch failed for ${assetId} (${response.status}): ${text}`);
  }

  const payload = JSON.parse(text);
  return payload;
}

function lower(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function hasStyleGuideName(name) {
  const normalized = lower(name);
  return normalized.includes('style guide') || normalized.includes('styleguide');
}

function hasInstructionsName(name) {
  const normalized = lower(name);
  return (
    normalized.includes('instruction') ||
    normalized.includes('instructions') ||
    normalized.includes('start here') ||
    normalized.includes('getting started') ||
    normalized.includes('documentation') ||
    (normalized.includes('guide') &&
      !normalized.includes('style guide') &&
      !normalized.includes('styleguide'))
  );
}

function hasLicenseName(name) {
  const normalized = lower(name);
  return normalized.includes('license') || normalized.includes('licenses');
}

function findDesignerCheck(report, id) {
  return Array.isArray(report?.designer?.checks)
    ? report.designer.checks.find((check) => check?.id === id) ?? null
    : null;
}

function findRow(report, id) {
  return Array.isArray(report?.rows)
    ? report.rows.find((row) => row?.id === id) ?? null
    : null;
}

function summarizeRequiredPages(report) {
  const designerPageNames = Array.isArray(report?.designer?.metadataSummary?.pages)
    ? report.designer.metadataSummary.pages.map((page) => page?.name).filter((value) => typeof value === 'string')
    : [];
  const designerPageNamesLower = designerPageNames.map((name) => name.toLowerCase());
  const precheckClassifications = Array.isArray(report?.precheck?.classifiedUrls)
    ? report.precheck.classifiedUrls
    : [];
  const publishedPages = Array.isArray(report?.published?.pages) ? report.published.pages : [];
  const publishedUtilityPages = publishedPages.filter(
    (page) => typeof page?.classification === 'string' && page.classification.startsWith('utility:')
  );
  const policyChecks = report?.published?.policyChecks ?? {};

  const styleGuideDesignerFound = designerPageNamesLower.some((name) => hasStyleGuideName(name));
  const styleGuidePrecheckFound = precheckClassifications.some(
    (entry) => entry?.classification === 'utility:style-guide'
  );
  const styleGuidePublishedFound = publishedPages.some(
    (page) => page?.classification === 'utility:style-guide'
  );

  const instructionsDesignerFound = designerPageNamesLower.some((name) => hasInstructionsName(name));
  const instructionsPrecheckFound =
    Boolean(report?.precheck?.requiredPages?.instructions) ||
    precheckClassifications.some((entry) => entry?.classification === 'utility:instructions');
  const instructionsPublishedFound = publishedPages.some(
    (page) => page?.classification === 'utility:instructions'
  );

  const licenseDesignerFound = designerPageNamesLower.some((name) => hasLicenseName(name));
  const licensePrecheckFound =
    Boolean(report?.precheck?.requiredPages?.licenses) ||
    precheckClassifications.some((entry) => entry?.classification === 'utility:license');
  const licensePublishedFound = publishedPages.some(
    (page) => page?.classification === 'utility:license'
  );

  return {
    designerPageNames,
    publishedUtilityPages: publishedUtilityPages.map((page) => ({
      url: page?.url ?? null,
      classification: page?.classification ?? null,
    })),
    styleGuide: {
      designerFound: styleGuideDesignerFound,
      precheckFound: styleGuidePrecheckFound,
      publishedFound: styleGuidePublishedFound,
      designerCheckResult: findDesignerCheck(report, 'pages.style_guide_exists')?.result ?? null,
      rowStatus: findRow(report, 'pages.style_guide_exists')?.status ?? null,
    },
    instructions: {
      designerFound: instructionsDesignerFound,
      precheckFound: instructionsPrecheckFound,
      publishedFound: instructionsPublishedFound,
      designerCheckResult: findDesignerCheck(report, 'pages.instructions_exists')?.result ?? null,
      rowStatus: findRow(report, 'pages.instructions_exists')?.status ?? null,
      requiredByPolicy: Boolean(policyChecks?.hasGsap || policyChecks?.hasCustomCode),
    },
    licenses: {
      designerFound: licenseDesignerFound,
      precheckFound: licensePrecheckFound,
      publishedFound: licensePublishedFound,
      designerCheckResult: findDesignerCheck(report, 'pages.licenses_exists')?.result ?? null,
      rowStatus: findRow(report, 'pages.licenses_exists')?.status ?? null,
    },
    policy: {
      hasGsap: Boolean(policyChecks?.hasGsap),
      hasCustomCode: Boolean(policyChecks?.hasCustomCode),
      gsapRowStatus: findRow(report, 'policy.gsap_detected')?.status ?? null,
      customCodeRowStatus: findRow(report, 'policy.custom_code_detected')?.status ?? null,
    },
  };
}

function compareQueueItemToAirtable(queueItem, airtableRecord) {
  const fields = airtableRecord?.fields ?? {};
  const thumbnailCount = Array.isArray(fields[AIRTABLE_FIELDS.thumbnailImage])
    ? fields[AIRTABLE_FIELDS.thumbnailImage].length
    : 0;
  const secondaryThumbnailCount = Array.isArray(fields[AIRTABLE_FIELDS.thumbnailImageSecondary])
    ? fields[AIRTABLE_FIELDS.thumbnailImageSecondary].length
    : 0;
  const carouselCount = Array.isArray(fields[AIRTABLE_FIELDS.carouselImages])
    ? fields[AIRTABLE_FIELDS.carouselImages].length
    : 0;

  return {
    recordIdMatches: airtableRecord?.id === queueItem.assetId,
    templateNameMatches: fields[AIRTABLE_FIELDS.name] === queueItem.templateName,
    websiteUrlMatches: fields[AIRTABLE_FIELDS.websiteUrl] === queueItem.websiteUrl,
    previewSiteUrlMatches: fields[AIRTABLE_FIELDS.previewSiteUrl] === queueItem.previewSiteUrl,
    marketplaceStatusMatches: fields[AIRTABLE_FIELDS.marketplaceStatus] === queueItem.marketplaceStatus,
    latestReviewStatusMatches: fields[AIRTABLE_FIELDS.latestReviewStatus] === queueItem.latestReviewStatus,
    submittedDateMatches:
      !queueItem.submittedDate || fields[AIRTABLE_FIELDS.submittedDate] === queueItem.submittedDate,
    imageSubmissionCounts: {
      thumbnailCount,
      secondaryThumbnailCount,
      carouselCount,
    },
  };
}

async function enqueueReview(laneUrl, laneToken, queueItem, crawlMaxPages, crawlMaxDepth) {
  return callProxyTool(
    laneUrl,
    laneToken,
    'webflow-site-analyzer-mcp__enqueue_template_review',
    {
      previewUrl: queueItem.previewSiteUrl,
      publishedUrl: queueItem.websiteUrl,
      includeManual: true,
      crawlMaxPages,
      crawlMaxDepth,
    },
  );
}

async function getReviewJob(laneUrl, laneToken, jobId) {
  return callProxyTool(
    laneUrl,
    laneToken,
    'webflow-site-analyzer-mcp__get_template_review_job',
    { jobId },
  );
}

async function waitForReviewJob(laneUrl, laneToken, jobId, pollIntervalMs, maxWaitMs) {
  const startedAt = Date.now();
  let latestJob = null;

  while (Date.now() - startedAt < maxWaitMs) {
    latestJob = await getReviewJob(laneUrl, laneToken, jobId);
    if (latestJob?.status === 'succeeded' || latestJob?.status === 'failed' || latestJob?.status === 'canceled') {
      return latestJob;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for template review job ${jobId} after ${maxWaitMs}ms.`);
}

function aggregateRequiredPages(samples) {
  const successful = samples.filter((sample) => sample.ok && sample.requiredPages);

  const reduceDimension = (key) => {
    const summary = {
      both: 0,
      designerOnly: 0,
      publishedOnly: 0,
      neither: 0,
      rowPass: 0,
      rowFail: 0,
      rowPartial: 0,
      rowManual: 0,
      designerMissedPublishedFound: 0,
    };

    for (const sample of successful) {
      const entry = sample.requiredPages[key];
      const publishedPresent = Boolean(entry.precheckFound || entry.publishedFound);
      const designerPresent = Boolean(entry.designerFound);

      if (designerPresent && publishedPresent) summary.both += 1;
      else if (designerPresent) summary.designerOnly += 1;
      else if (publishedPresent) summary.publishedOnly += 1;
      else summary.neither += 1;

      if (entry.rowStatus === 'pass') summary.rowPass += 1;
      else if (entry.rowStatus === 'fail') summary.rowFail += 1;
      else if (entry.rowStatus === 'partial') summary.rowPartial += 1;
      else if (entry.rowStatus === 'manual') summary.rowManual += 1;

      if (!designerPresent && publishedPresent) {
        summary.designerMissedPublishedFound += 1;
      }
    }

    return summary;
  };

  const instructionsPolicy = {
    triggered: 0,
    triggeredWithoutAnyDetectedPage: 0,
    triggeredWithDesignerOnly: 0,
    triggeredWithPublishedOnly: 0,
    triggeredWithBoth: 0,
  };

  for (const sample of successful) {
    const entry = sample.requiredPages.instructions;
    const publishedPresent = Boolean(entry.precheckFound || entry.publishedFound);
    const designerPresent = Boolean(entry.designerFound);
    if (!entry.requiredByPolicy) continue;

    instructionsPolicy.triggered += 1;
    if (designerPresent && publishedPresent) instructionsPolicy.triggeredWithBoth += 1;
    else if (designerPresent) instructionsPolicy.triggeredWithDesignerOnly += 1;
    else if (publishedPresent) instructionsPolicy.triggeredWithPublishedOnly += 1;
    else instructionsPolicy.triggeredWithoutAnyDetectedPage += 1;
  }

  return {
    successfulAssets: successful.length,
    styleGuide: reduceDimension('styleGuide'),
    instructions: reduceDimension('instructions'),
    licenses: reduceDimension('licenses'),
    instructionsPolicy,
  };
}

function formatMs(ms) {
  return `${(ms / 1000).toFixed(3)}s`;
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Required Pages Live Experiment');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Reviewer lane: \`${report.reviewerLaneUrl}\``);
  lines.push('');
  lines.push('## Goal');
  lines.push('');
  lines.push('Measure required-page detection on live template submissions selected from the Airtable-backed review queue, then compare the three evidence surfaces reviewers actually depend on: Airtable submission URLs, published-site discovery/crawl, and preview Designer extraction.');
  lines.push('');
  lines.push('## Sampling');
  lines.push('');
  lines.push(`- Approved sample: ${report.selection.approved.length}`);
  lines.push(`- Ready-for-review sample: ${report.selection.ready.length}`);
  lines.push(`- Queue source: Airtable-backed \`template_review_list_queue\` via \`webflow-template-review-mcp\``);
  lines.push(`- Airtable parity check: direct REST fetch of each sampled asset record from \`${AIRTABLE_ASSETS_TABLE_ID}\``);
  lines.push('');
  lines.push('## Aggregate Findings');
  lines.push('');
  lines.push(`- Successful analyses: ${report.aggregate.successfulAssets}/${report.assets.length}`);
  lines.push(`- Style Guide: both=${report.aggregate.styleGuide.both}, publishedOnly=${report.aggregate.styleGuide.publishedOnly}, designerOnly=${report.aggregate.styleGuide.designerOnly}, neither=${report.aggregate.styleGuide.neither}`);
  lines.push(`- Instructions: both=${report.aggregate.instructions.both}, publishedOnly=${report.aggregate.instructions.publishedOnly}, designerOnly=${report.aggregate.instructions.designerOnly}, neither=${report.aggregate.instructions.neither}`);
  lines.push(`- Licenses: both=${report.aggregate.licenses.both}, publishedOnly=${report.aggregate.licenses.publishedOnly}, designerOnly=${report.aggregate.licenses.designerOnly}, neither=${report.aggregate.licenses.neither}`);
  lines.push(`- Designer missed a published-required page: styleGuide=${report.aggregate.styleGuide.designerMissedPublishedFound}, instructions=${report.aggregate.instructions.designerMissedPublishedFound}, licenses=${report.aggregate.licenses.designerMissedPublishedFound}`);
  lines.push(`- Policy-triggered instructions cases: ${report.aggregate.instructionsPolicy.triggered}`);
  lines.push(`- Policy-triggered with no detected instructions page anywhere: ${report.aggregate.instructionsPolicy.triggeredWithoutAnyDetectedPage}`);
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push('- Style Guide and Licenses should use published precheck/crawl as the primary evidence path, with Designer page names as fallback only.');
  lines.push('- Instructions should use the blended signal: published precheck/crawl OR Designer page name variants, then apply policy-triggered escalation only when no instructions page is detected anywhere.');
  lines.push('- Queue selection from the review MCP is good enough for experiment sampling, but direct Airtable parity checks are still useful to confirm URL/status truth on sampled assets.');
  lines.push('- Tool-call timing was useful here as operator telemetry. It should stay in reports like this, not in the reviewer-facing MCP contract.');
  lines.push('');
  lines.push('## Assets');
  lines.push('');

  for (const asset of report.assets) {
    lines.push(`### ${asset.templateName}`);
    lines.push('');
    lines.push(`- Sample bucket: ${asset.sampleBucket}`);
    lines.push(`- Asset ID: \`${asset.assetId}\``);
    lines.push(`- Website URL: \`${asset.websiteUrl}\``);
    lines.push(`- Preview URL: \`${asset.previewSiteUrl}\``);
    lines.push(`- Queue status: \`${asset.queueStatus}\` / marketplace \`${asset.marketplaceStatus}\``);
    lines.push(`- Airtable parity: website=${asset.airtableParity?.websiteUrlMatches ?? false}, preview=${asset.airtableParity?.previewSiteUrlMatches ?? false}, status=${asset.airtableParity?.latestReviewStatusMatches ?? false}, marketplace=${asset.airtableParity?.marketplaceStatusMatches ?? false}`);
    if (asset.airtableError) {
      lines.push(`- Airtable parity note: ${asset.airtableError}`);
    }
    if (!asset.ok) {
      lines.push(`- Analysis error: ${asset.error}`);
      lines.push('');
      continue;
    }

    lines.push('');
    lines.push('| Check | Designer | Precheck | Published crawl | Live unified row | Designer check |');
    lines.push('|---|---:|---:|---:|---|---|');
    lines.push(`| Style Guide | ${asset.requiredPages.styleGuide.designerFound} | ${asset.requiredPages.styleGuide.precheckFound} | ${asset.requiredPages.styleGuide.publishedFound} | ${asset.requiredPages.styleGuide.rowStatus} | ${asset.requiredPages.styleGuide.designerCheckResult} |`);
    lines.push(`| Instructions | ${asset.requiredPages.instructions.designerFound} | ${asset.requiredPages.instructions.precheckFound} | ${asset.requiredPages.instructions.publishedFound} | ${asset.requiredPages.instructions.rowStatus} | ${asset.requiredPages.instructions.designerCheckResult} |`);
    lines.push(`| Licenses | ${asset.requiredPages.licenses.designerFound} | ${asset.requiredPages.licenses.precheckFound} | ${asset.requiredPages.licenses.publishedFound} | ${asset.requiredPages.licenses.rowStatus} | ${asset.requiredPages.licenses.designerCheckResult} |`);
    lines.push('');
    lines.push(`- Policy flags: hasGsap=${asset.requiredPages.policy.hasGsap}, hasCustomCode=${asset.requiredPages.policy.hasCustomCode}, gsapRow=${asset.requiredPages.policy.gsapRowStatus}, customCodeRow=${asset.requiredPages.policy.customCodeRowStatus}`);
    lines.push(`- Designer pages: ${asset.requiredPages.designerPageNames.join(', ') || 'none'}`);
    lines.push(`- Published utility pages: ${asset.requiredPages.publishedUtilityPages.map((page) => `${page.classification}:${page.url}`).join(' | ') || 'none'}`);
    lines.push(`- Coverage: ${asset.coverage.coveragePercent}% (${asset.coverage.crawledPages}/${asset.coverage.totalKnownPages})`);
    lines.push(`- Timing: queue=${formatMs(asset.timings.queueMs)}, airtable=${formatMs(asset.timings.airtableMs)}, enqueue=${formatMs(asset.timings.enqueueMs)}, wait=${formatMs(asset.timings.waitMs)}, total=${formatMs(asset.timings.totalMs)}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertConfigured(args);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const reportsDir = path.resolve(scriptDir, '..', 'reports');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const outputJson = args.outputJson || path.join(reportsDir, `required-pages-live-experiment-${dateStamp}.json`);
  const outputMarkdown =
    args.outputMarkdown || path.join(reportsDir, `required-pages-live-experiment-${dateStamp}.md`);

  const approvedQueue = await timed(() =>
    listQueue(args.laneUrl, args.laneToken, 'approved', args.queueLimit),
  );
  const readyQueue = await timed(() =>
    listQueue(args.laneUrl, args.laneToken, 'ready_to_review', args.queueLimit),
  );

  const approvedSelected = (approvedQueue.value?.items ?? [])
    .filter((item) => item?.websiteUrl && item?.previewSiteUrl)
    .slice(0, Math.max(0, args.approvedSample));
  const readySelected = (readyQueue.value?.items ?? [])
    .filter((item) => item?.websiteUrl && item?.previewSiteUrl)
    .slice(0, Math.max(0, args.readySample));

  const selectedAssets = [
    ...approvedSelected.map((item) => ({ ...item, sampleBucket: 'approved' })),
    ...readySelected.map((item) => ({ ...item, sampleBucket: 'ready_to_review' })),
  ];

  const assets = [];

  for (const queueItem of selectedAssets) {
    const assetStartedAt = Date.now();
    const assetResult = {
      assetId: queueItem.assetId,
      templateName: queueItem.templateName,
      websiteUrl: queueItem.websiteUrl,
      previewSiteUrl: queueItem.previewSiteUrl,
      queueStatus: queueItem.latestReviewStatus ?? null,
      marketplaceStatus: queueItem.marketplaceStatus ?? null,
      sampleBucket: queueItem.sampleBucket,
      ok: false,
      timings: {
        queueMs: queueItem.sampleBucket === 'approved' ? approvedQueue.elapsedMs : readyQueue.elapsedMs,
        airtableMs: 0,
        enqueueMs: 0,
        waitMs: 0,
        totalMs: 0,
      },
    };

    try {
      try {
        const airtableFetch = await timed(() => fetchAirtableAsset(args.airtableApiKey, queueItem.assetId));
        assetResult.timings.airtableMs = airtableFetch.elapsedMs;
        assetResult.airtableParity = compareQueueItemToAirtable(queueItem, airtableFetch.value);
      } catch (error) {
        assetResult.airtableError = error instanceof Error ? error.message : String(error);
      }

      const enqueue = await timed(() =>
        enqueueReview(
          args.laneUrl,
          args.laneToken,
          queueItem,
          args.crawlMaxPages,
          args.crawlMaxDepth,
        ),
      );
      assetResult.timings.enqueueMs = enqueue.elapsedMs;

      const jobId = enqueue.value?.jobId;
      if (!jobId) {
        throw new Error(`Template review enqueue did not return jobId for ${queueItem.templateName}.`);
      }

      const waited = await timed(() =>
        waitForReviewJob(
          args.laneUrl,
          args.laneToken,
          jobId,
          args.pollIntervalMs,
          args.maxWaitMs,
        ),
      );
      assetResult.timings.waitMs = waited.elapsedMs;

      const job = waited.value;
      if (job?.status !== 'succeeded' || !job?.result) {
        throw new Error(`Template review job ${jobId} finished with status ${job?.status ?? 'unknown'}.`);
      }

      assetResult.ok = true;
      assetResult.jobId = jobId;
      assetResult.generatedAt = job.result.generatedAt;
      assetResult.coverage = job.result.summary.coverage;
      assetResult.summary = job.result.summary;
      assetResult.providerMetrics = job.result.providerMetrics ?? null;
      assetResult.requiredPages = summarizeRequiredPages(job.result);
    } catch (error) {
      assetResult.error = error instanceof Error ? error.message : String(error);
    } finally {
      assetResult.timings.totalMs = Date.now() - assetStartedAt;
    }

    assets.push(assetResult);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    reviewerLaneUrl: args.laneUrl,
    databaseSource: {
      queueProxyTool: 'webflow-template-review-mcp__template_review_list_queue',
      airtableBaseId: AIRTABLE_BASE_ID,
      airtableAssetsTableId: AIRTABLE_ASSETS_TABLE_ID,
    },
    selection: {
      queueLimit: args.queueLimit,
      approved: approvedSelected.map((item) => ({
        assetId: item.assetId,
        templateName: item.templateName,
        websiteUrl: item.websiteUrl,
        previewSiteUrl: item.previewSiteUrl,
      })),
      ready: readySelected.map((item) => ({
        assetId: item.assetId,
        templateName: item.templateName,
        websiteUrl: item.websiteUrl,
        previewSiteUrl: item.previewSiteUrl,
      })),
      queueTimingsMs: {
        approved: approvedQueue.elapsedMs,
        readyToReview: readyQueue.elapsedMs,
      },
    },
    assets,
    aggregate: aggregateRequiredPages(assets),
    recommendation: {
      styleGuide:
        'Prefer published precheck/crawl discovery, with Designer page names as fallback only.',
      instructions:
        'Blend published precheck/crawl and Designer page-name variants, then escalate only when policy triggers and no instructions page is found anywhere.',
      licenses:
        'Prefer published precheck/crawl discovery, with Designer page names as fallback only.',
      toolTiming:
        'Keep elapsed time in operator reports and experiment artifacts, not in the reviewer-facing MCP contract.',
    },
  };

  const markdown = toMarkdown(report);

  await fs.mkdir(path.dirname(outputJson), { recursive: true });
  await fs.mkdir(path.dirname(outputMarkdown), { recursive: true });
  await fs.writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputMarkdown, markdown, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        outputJson,
        outputMarkdown,
        assetsAnalyzed: assets.length,
        successfulAssets: report.aggregate.successfulAssets,
        queueTimingsMs: report.selection.queueTimingsMs,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
