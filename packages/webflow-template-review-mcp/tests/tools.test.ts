import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildAdminTemplateFillConsoleScript } from '../src/admin-template-fill.js';
import type { AirtableClient } from '../src/airtable.js';
import { RUBRIC_DIMENSIONS } from '../src/comprehensive-review-contract.js';
import { resolveOAuthAccess, SCOPE_WRITE } from '../src/oauth-access.js';
import {
  applyReviewerAuthEmailAliases,
  parseReviewerDirectory,
  type ReviewerProfile,
} from '../src/reviewer-directory.js';
import { METRICS_ASSET_FIELD_IDS, TABLE_IDS, TEMPLATE_REVIEW_FIELD_MAP } from '../src/schema.js';
import { registerTools, WRITE_TOOL_NAMES } from '../src/tools.js';

type ToolResult = {
  content: Array<{ type?: string; text?: string; data?: string; mimeType?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

function createServerHarness() {
  const names: string[] = [];
  const handlers = new Map<string, ToolHandler>();
  const annotations = new Map<string, Record<string, unknown>>();

  const server = {
    registerTool(name: string, config: { annotations?: Record<string, unknown> }, handler: ToolHandler) {
      names.push(name);
      handlers.set(name, handler);
      if (config.annotations) annotations.set(name, config.annotations);
    },
    tool(name: string, ...args: unknown[]) {
      names.push(name);
      const handler = args.at(-1) as ToolHandler;
      handlers.set(name, handler);
      if (args.length >= 4) {
        annotations.set(name, args.at(-2) as Record<string, unknown>);
      }
    },
  } as unknown as McpServer;

  return { server, names, handlers, annotations };
}

function parsePayload(result: ToolResult) {
  return JSON.parse(result.content.find((item) => item.type === 'text' || item.text)?.text ?? '{}') as {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: Record<string, unknown>;
  };
}

const reviewer: ReviewerProfile = {
  accountId: 'acct_wf_eric',
  airtableCollaboratorId: 'usr_eric',
  email: 'eric.unger@webflow.com',
  name: 'Eric Unger',
  lane: 'wf-template-review-eric',
};

test('registerTools places reviewer-safe write tools before admin and broad mutation routes', () => {
  const { server, names } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  assert.notEqual(names.indexOf('template_review_assign_self'), -1);
  assert.notEqual(names.indexOf('template_review_request_changes'), -1);
  assert.notEqual(names.indexOf('template_review_set_review_status'), -1);
  assert.notEqual(names.indexOf('template_review_get_comprehensive_review_contract'), -1);
  assert.notEqual(names.indexOf('template_review_format_agent_review_feedback'), -1);
  assert.notEqual(names.indexOf('template_review_prepare_published_site_sandbox'), -1);
  assert.notEqual(names.indexOf('template_review_run_published_site_sandbox'), -1);
  assert.notEqual(names.indexOf('template_review_save_agent_feedback'), -1);
  assert.notEqual(names.indexOf('template_review_save_draft_feedback'), -1);
  assert.notEqual(names.indexOf('template_review_run_published_site_validation'), -1);
  assert.notEqual(names.indexOf('template_review_prepare_admin_template_fill'), -1);
  assert.notEqual(names.indexOf('template_review_prepare_admin_template_fill_batch'), -1);
  assert.notEqual(names.indexOf('template_review_get_template_thumbnail'), -1);
  assert.ok(names.indexOf('template_review_prepare_admin_template_fill') < names.indexOf('template_review_run_published_site_validation'));
  assert.ok(names.indexOf('template_review_prepare_admin_template_fill_batch') < names.indexOf('template_review_run_published_site_validation'));
  assert.ok(names.indexOf('template_review_get_template_thumbnail') < names.indexOf('template_review_run_published_site_validation'));
  assert.ok(names.indexOf('template_review_run_published_site_validation') < names.indexOf('template_review_assign_self'));
  assert.ok(names.indexOf('template_review_get_comprehensive_review_contract') < names.indexOf('template_review_run_published_site_validation'));
  assert.ok(names.indexOf('template_review_prepare_published_site_sandbox') < names.indexOf('template_review_run_published_site_validation'));
  assert.ok(names.indexOf('template_review_run_published_site_sandbox') < names.indexOf('template_review_run_published_site_validation'));
  assert.ok(names.indexOf('template_review_format_agent_review_feedback') < names.indexOf('template_review_save_agent_feedback'));
  assert.ok(names.indexOf('template_review_assign_self') < names.indexOf('template_review_assign_reviewer'));
  assert.ok(names.indexOf('template_review_request_changes') < names.indexOf('template_review_complete_publishing'));
  assert.ok(names.indexOf('template_review_set_review_status') < names.indexOf('template_review_update_version_review'));
  assert.ok(names.indexOf('template_review_save_agent_feedback') < names.indexOf('template_review_save_draft_feedback'));
  assert.ok(names.indexOf('template_review_save_draft_feedback') < names.indexOf('template_review_approve_version'));
});

test('comprehensive review contract exposes required coverage matrix and manual checks', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_get_comprehensive_review_contract')?.({});

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const contract = payload.data as {
    version: string;
    requiredReportSections: string[];
    reviewLanes: Array<{ id: string; evidenceLabel: string; requiredEvidence: string[] }>;
    rubricDimensions: string[];
    agentReviewFeedbackFormat: string[];
    decisionBoundary: string;
  };

  assert.equal(contract.version, 'template-review-comprehensive-evidence.v1');
  assert.deepEqual(contract.requiredReportSections, [
    'Confirmed summary',
    'Coverage matrix',
    'Confirmed findings',
    'Human follow-up',
    'Manual checks remaining',
    'Decision boundary',
  ]);
  assert.ok(contract.reviewLanes.some((lane) => lane.id === 'e2b_public_site_pass' && lane.evidenceLabel === 'Auto/Partial'));
  assert.ok(contract.reviewLanes.some((lane) => lane.id === 'designer_admin_manual_checks' && lane.evidenceLabel === 'Manual'));
  assert.ok(contract.rubricDimensions.includes('layout_design_quality'));
  assert.ok(contract.rubricDimensions.includes('conversion_best_practices'));
  assert.ok(contract.agentReviewFeedbackFormat.includes('Coverage matrix'));
  assert.match(contract.decisionBoundary, /not an official review decision/i);
});

test('prepare_published_site_sandbox returns bounded E2B runner evidence contract', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_prepare_published_site_sandbox')?.({
    published_url: 'https://example-template.webflow.io/',
    run_id: 'run_fixture_1',
    policy_snapshot_id: 'policy.fixture',
    max_pages: 3,
    max_network_requests: 50,
    timeout_ms: 10000,
    viewports: [{ name: 'mobile', width: 390, height: 844 }],
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const bundle = payload.data as {
    schema_version: string;
    job: {
      schema_version: string;
      run_id: string;
      source_url: string;
      policy_snapshot_id: string;
      controls: {
        max_pages: number;
        max_network_requests: number;
        allowed_hosts: string[];
        viewports: Array<{ name: string; width: number; height: number }>;
      };
      output_contract: { must_not_emit: string[]; failure_is_escalation: boolean };
      artifacts: { output_file: string; screenshot_dir: string };
    };
    e2b_run_code: string;
    usage: { tool: string; language: string; expected_output_file: string };
    safety_boundary: string[];
  };

  assert.equal(bundle.schema_version, 'published_site_sandbox_bundle.v0.1');
  assert.equal(bundle.job.schema_version, 'published_site_sandbox_job.v0.1');
  assert.equal(bundle.job.run_id, 'run_fixture_1');
  assert.equal(bundle.job.source_url, 'https://example-template.webflow.io/');
  assert.equal(bundle.job.policy_snapshot_id, 'policy.fixture');
  assert.equal(bundle.job.controls.max_pages, 3);
  assert.equal(bundle.job.controls.max_network_requests, 50);
  assert.deepEqual(bundle.job.controls.allowed_hosts, ['example-template.webflow.io']);
  assert.deepEqual(bundle.job.controls.viewports, [{ name: 'mobile', width: 390, height: 844 }]);
  assert.equal(bundle.job.output_contract.failure_is_escalation, true);
  assert.ok(bundle.job.output_contract.must_not_emit.includes('final_rejection'));
  assert.ok(bundle.job.output_contract.must_not_emit.includes('airtable_write'));
  assert.equal(bundle.usage.tool, 'e2b.run_code');
  assert.equal(bundle.usage.language, 'python');
  assert.equal(bundle.usage.expected_output_file, '/tmp/webflow-template-review-sandbox/published-site-sandbox-output.json');
  assert.match(bundle.e2b_run_code, /published_site_sandbox_output\.v0\.1/);
  assert.match(bundle.e2b_run_code, /try_render_with_playwright/);
  assert.match(bundle.e2b_run_code, /horizontal_overflow/);
  assert.match(bundle.e2b_run_code, /if not address\.is_global/);
  assert.match(bundle.e2b_run_code, /os\.path\.isdir\('\/opt\/ms-playwright'\)/);
  assert.match(bundle.e2b_run_code, /No review decision, rating, reviewer feedback, or external write is performed/);
  assert.ok(bundle.safety_boundary.some((item) => item.includes('Evidence-only')));
});

test('prepare_published_site_sandbox rejects non-public URLs before runner generation', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_prepare_published_site_sandbox')?.({
    published_url: 'http://localhost:3000/',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'PUBLISHED_SITE_SANDBOX_INPUT_INVALID');
  assert.match(String(payload.error?.message), /https|private|local|loopback/i);
});

test('run_published_site_sandbox is annotated read-only and returns structured evidence plus bounded images', async () => {
  const { server, handlers, annotations } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
    {
      sandboxExecution: {
        apiKey: 'test-key',
        executor: async () => ({
          ok: true,
          schema_version: 'published_site_sandbox_execution.v0.1',
          run_id: 'run-tool-fixture',
          source_url: 'https://example-template.webflow.io/',
          provider: 'direct_e2b',
          status: 'ok',
          fetched_urls: ['https://example-template.webflow.io/'],
          evidence: { static_pages: [], rendered: { status: 'ok', pages: [] }, errors: [], caveats: [] },
          controls: {},
          sandbox: { id: 'sandbox-tool-fixture' },
          cleanup: { killed: true },
          screenshots: [
            {
              name: 'home.png',
              mime_type: 'image/png',
              bytes: 7,
              included: true,
              data: Buffer.from([137, 80, 78, 71, 1, 2, 3]).toString('base64'),
            },
          ],
          caveats: ['Evidence only.'],
        }),
      },
    },
  );

  const result = await handlers.get('template_review_run_published_site_sandbox')?.({
    published_url: 'https://example-template.webflow.io/',
    include_screenshots: true,
  });

  assert.ok(result);
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent?.ok, true);
  assert.equal(result.content.filter((item) => item.type === 'image').length, 1);
  assert.deepEqual(annotations.get('template_review_run_published_site_sandbox'), {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  });
});

function completeComprehensiveFeedbackInput() {
  return {
    intake: {
      template_name: 'Kairova',
      version_id: 'rec_version_1',
      asset_id: 'rec_asset_1',
      published_url: 'https://kairova.webflow.io/',
      review_status: '🦵Ready to Review',
      agent_review_feedback_was_blank_before_write: true,
    },
    coverage_matrix: [
      {
        lane_id: 'intake_context',
        label: 'Auto',
        summary: 'Submission identifiers and review status were loaded from Airtable context.',
        evidence: ['version rec_version_1', 'asset rec_asset_1'],
      },
      {
        lane_id: 'published_site_validator',
        label: 'Partial',
        summary: 'Published-site validator returned partial rubric coverage.',
        evidence: ['rubricCoverage=partial_published_site_validation', '4 warnings'],
      },
      {
        lane_id: 'e2b_public_site_pass',
        label: 'Partial',
        summary: 'E2B fetched the homepage and utility pages for current public evidence.',
        evidence: ['Fetched https://kairova.webflow.io/', 'Fetched https://kairova.webflow.io/utility-pages/licenses'],
      },
      {
        lane_id: 'rubric_dimension_matrix',
        label: 'Partial',
        summary: 'All rubric dimensions were labeled with current evidence or manual reasons.',
      },
      {
        lane_id: 'designer_admin_manual_checks',
        label: 'Manual',
        summary: 'Designer/Admin checks remain manual before any official action.',
        gaps: ['Designer structure, admin fields, visual quality, originality, and category fit require human review.'],
      },
    ],
    confirmed_findings: [
      {
        title: 'Placeholder content appeared on sampled pages',
        label: 'Auto',
        source: 'e2b_public_site_pass',
        evidence: 'E2B visible-text scan found lorem-like text on the homepage.',
        url: 'https://kairova.webflow.io/',
        rubric_dimension: 'overall_user_experience',
        severity: 'warning',
      },
    ],
    rubric_dimension_matrix: RUBRIC_DIMENSIONS.map((dimension) => ({
      dimension,
      label: dimension === 'site_optimization' || dimension === 'accessibility' ? 'Partial' : 'Manual',
      evidence_or_reason:
        dimension === 'site_optimization' || dimension === 'accessibility'
          ? 'Published-site validator and E2B provided partial public-site evidence.'
          : 'Requires human reviewer judgment and/or Designer/Admin inspection.',
    })),
    e2b_urls_fetched: ['https://kairova.webflow.io/', 'https://kairova.webflow.io/utility-pages/licenses'],
    human_follow_up: ['Verify placeholder content, utility-page license text, and Designer/Admin requirements before any official action.'],
    manual_checks_remaining: [
      'Designer/Admin checks for components, variables, unused styles/classes, interactions cleanup, Designer responsive QA, forms, CMS/dynamic page setup, site settings, custom fonts and licenses, asset thumbnail, template name and categories, pricing/page-count calculation, MRP/admin publishing prerequisites, visual quality, originality, similarity/flooding, and category fit remain manual.',
    ],
    validator_summary: {
      rubric_coverage: 'partial_published_site_validation',
      crawl_coverage: 'public crawl sampled homepage and utility page',
      pages_analyzed: 2,
      critical_errors: 0,
      warnings: 4,
    },
    caveats: ['This draft uses public published-site evidence and does not inspect Designer/Admin internals.'],
    generated_by: 'TEMPLATE REVIEW HUB',
  };
}

test('format_agent_review_feedback validates and formats comprehensive evidence before writes', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_format_agent_review_feedback')?.(completeComprehensiveFeedbackInput());

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const formatted = payload.data as {
    contract_version: string;
    agent_review_feedback: string;
    validation: { passed: boolean; missing_rubric_dimensions: string[]; missing_manual_check_topics: string[] };
    section_headings: string[];
  };

  assert.equal(formatted.contract_version, 'template-review-comprehensive-evidence.v1');
  assert.equal(formatted.validation.passed, true);
  assert.deepEqual(formatted.validation.missing_rubric_dimensions, []);
  assert.deepEqual(formatted.validation.missing_manual_check_topics, []);
  assert.ok(formatted.section_headings.includes('Coverage matrix'));
  assert.match(formatted.agent_review_feedback, /Coverage matrix/);
  assert.match(formatted.agent_review_feedback, /Confirmed findings/);
  assert.match(formatted.agent_review_feedback, /Human follow-up/);
  assert.match(formatted.agent_review_feedback, /Manual checks remaining/);
  assert.match(formatted.agent_review_feedback, /Rubric dimension matrix/);
  assert.match(formatted.agent_review_feedback, /E2B public-site pass/);
  assert.match(formatted.agent_review_feedback, /not an official review decision/i);
});

test('format_agent_review_feedback rejects incomplete comprehensive evidence', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;
  const input = completeComprehensiveFeedbackInput();
  input.rubric_dimension_matrix = input.rubric_dimension_matrix.filter((row) => row.dimension !== 'accessibility');
  input.manual_checks_remaining = ['Designer/Admin checks remain manual.'];

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_format_agent_review_feedback')?.(input);

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'COMPREHENSIVE_REVIEW_PACKET_INVALID');
  const details = payload.error?.details as {
    missing_rubric_dimensions: string[];
    missing_manual_check_topics: string[];
  };
  assert.deepEqual(details.missing_rubric_dimensions, ['accessibility']);
  assert.ok(details.missing_manual_check_topics.includes('components'));
  assert.ok(details.missing_manual_check_topics.includes('visual quality'));
});

test('published-site validation tool calls working validators without Airtable writes', async () => {
  const { server, handlers } = createServerHarness();
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const client = {} as AirtableClient;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    requests.push({ url, body });

    if (url.includes('webflow-way.local')) {
      return new Response(
        JSON.stringify({
          siteUrl: body.siteUrl,
          timestamp: '2026-05-19T00:00:00.000Z',
          analysis: {
            assets: { issues: [], stats: { totalAssets: 0 }, assets: [] },
            content: {
              issues: [{ id: 'seo-title-repeated', category: 'Content', severity: 'warning', message: 'Repeated title detected' }],
              stats: { totalPages: 1 },
              pages: [{ url: body.siteUrl }],
            },
            accessibility: { issues: [], stats: { missingAltText: 0 }, audit: {} },
            interactions: {
              issues: [{ id: 'legacy-ix2-interactions-detected', category: 'Interactions and GSAP', severity: 'error', message: 'Legacy IX2 detected' }],
              stats: { legacyIx2Detected: true, legacyIx2Count: 2, pagesRequested: 1, pagesAnalyzed: 1, pagesFailed: 0, pagesWithLegacyIx2: 1, analysisComplete: true, analysisStatus: 'completed' },
              pages: [{ url: body.siteUrl, legacyIx2Detected: true, legacyIx2Count: 2, matches: [] }],
            },
          },
          summary: { totalIssues: 2, criticalErrors: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        passed: false,
        totalPagesFound: 1,
        validatedPages: 1,
        passedPages: 0,
        failedPages: 1,
        pageResults: [
          {
            url: body.url,
            success: true,
            passed: false,
            summary: {
              scriptCount: 2,
              validGsapCount: 1,
              flaggedCodeCount: 1,
              legacyIx2Detected: true,
              legacyIx2Count: 1,
            },
            details: {
              flaggedCode: [{ message: 'Legacy Webflow IX2 interactions detected.', policy: 'ix2-rejected' }],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  registerTools(
    server,
    () => client,
    () => reviewer,
    {
      webflowValidationWorkerUrl: 'https://webflow-way.local/validate',
      gsapValidationWorkerUrl: 'https://gsap.local/validateGsap',
      fetcher,
    },
  );

  const result = await handlers.get('template_review_run_published_site_validation')?.({
    published_url: 'https://example-template.webflow.io/',
    max_pages: 5,
    page_slugs: ['/about'],
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const validation = payload.data?.validation as {
    publishedUrl: string;
    rubricCoverage: string;
    caveats: string[];
    results: {
      webflow_way: { ok: boolean; categories: Array<{ key: string; issueCount: number }> };
      gsap_custom_code: { ok: boolean; detections: { legacyIx2Detected: boolean; flaggedCodeCount: number } };
    };
  };

  assert.equal(validation.publishedUrl, 'https://example-template.webflow.io/');
  assert.equal(validation.rubricCoverage, 'partial_published_site_validation');
  assert.ok(validation.caveats.some((caveat) => caveat.includes('Lorem/placeholder findings are review evidence')));
  assert.ok(validation.caveats.some((caveat) => caveat.includes('generated Webflow video fallback/poster assets')));
  assert.ok(validation.caveats.some((caveat) => caveat.includes('/sitemap.xml is not a template requirement')));
  assert.equal(validation.results.webflow_way.ok, true);
  assert.deepEqual(
    validation.results.webflow_way.categories.map((category) => [category.key, category.issueCount]),
    [
      ['assets', 0],
      ['content', 1],
      ['accessibility', 0],
      ['interactions', 1],
    ],
  );
  assert.equal(validation.results.gsap_custom_code.ok, true);
  assert.equal(validation.results.gsap_custom_code.detections.legacyIx2Detected, true);
  assert.equal(validation.results.gsap_custom_code.detections.flaggedCodeCount, 1);
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.body.siteUrl, 'https://example-template.webflow.io/');
  assert.deepEqual(requests[0]?.body.designerData, { components: [], styles: [], pages: [], assets: [] });
  assert.equal(requests[1]?.body.url, 'https://example-template.webflow.io/');
});

test('assign_self routes through reviewer-safe self-assignment', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ versionId: string; reviewer: Record<string, unknown> | null }> = [];
  const client = {
    assignSelfToVersion: async (versionId: string, actingReviewer: Record<string, unknown> | null) => {
      calls.push({ versionId, reviewer: actingReviewer });
      return { versionId, reviewOwner: actingReviewer };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_assign_self')?.({
    version_id: 'rec_version_1',
  });

  assert.ok(result);
  assert.deepEqual(calls, [
    {
      versionId: 'rec_version_1',
      reviewer: {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    },
  ]);
  assert.equal(parsePayload(result).ok, true);
});

test('my_queue defaults to compact active assigned work', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<Record<string, unknown>> = [];
  const client = {
    listMyQueueDetailed: async (query: Record<string, unknown>) => {
      calls.push(query);
      return {
        sortApplied: query.sort,
        items: [
          {
            assetId: 'rec_asset_1',
            templateName: 'Finoraa',
            assignableVersionId: 'rec_version_1',
            normalizedStatus: 'in_review',
            latestReviewFeedback: 'Long feedback '.repeat(100),
          },
        ],
      };
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer);

  const result = await handlers.get('template_review_my_queue')?.({});

  assert.ok(result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.limit, 25);
  assert.equal(calls[0]?.sort, 'submittedDate_desc');
  assert.equal(calls[0]?.includeCompleted, false);

  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.equal(payload.data?.statusApplied, 'active');
  assert.equal(payload.data?.limitApplied, 25);
  assert.equal(payload.data?.feedbackApplied, 'omitted');

  const items = payload.data?.items as Array<Record<string, unknown>>;
  assert.equal(items.length, 1);
  assert.equal(items[0]?.templateName, 'Finoraa');
  assert.equal(items[0]?.latestReviewFeedback, undefined);
});

test('OAuth auth alias drives my_queue with the canonical Airtable collaborator', async () => {
  const directory = applyReviewerAuthEmailAliases(
    parseReviewerDirectory(JSON.stringify({
      acct_wf_micah: {
        airtableCollaboratorId: 'usr_micah',
        email: 'micah@webflow.com',
        name: 'Micah Johnson',
      },
    })),
    JSON.stringify({ acct_wf_micah: ['micah@createsomething.io'] }),
  );
  const access = resolveOAuthAccess({
    email: 'micah@createsomething.io',
    allowedDomain: 'webflow.com',
    allowedEmails: new Set(['micah@createsomething.io']),
    directory,
  });
  assert.equal(access.allowed, true);
  if (!access.allowed) return;

  const { server, handlers } = createServerHarness();
  const calls: Array<Record<string, unknown>> = [];
  const client = {
    listMyQueueDetailed: async (query: Record<string, unknown>) => {
      calls.push(query);
      return { sortApplied: query.sort, items: [] };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => access.reviewerProfile,
    {},
    { allowWrites: access.scopes.includes(SCOPE_WRITE) },
  );
  const result = await handlers.get('template_review_my_queue')?.({});

  assert.ok(result);
  assert.equal(parsePayload(result).ok, true);
  assert.deepEqual(calls[0]?.currentReviewer, {
    id: 'usr_micah',
    email: 'micah@webflow.com',
    name: 'Micah Johnson',
  });
});

test('request_changes requires reviewer ownership before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewStatus: '📤Changes Requested' };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_request_changes')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Please tighten the responsive layout.',
    improvement_areas: ['Template: Typography'],
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    ],
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_status: '📤Changes Requested',
        review_feedback: 'Please tighten the responsive layout.',
        improvement_areas: ['Template: Typography'],
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('approve_version requires reviewer ownership before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewStatus: '✅Approved' };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_approve_version')?.({
    version_id: 'rec_version_1',
    release_record_id: 'rec_release_1',
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    ],
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_status: '✅Approved',
        release_record_id: 'rec_release_1',
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('complete_publishing requires reviewer ownership before workflow mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    completePublishing: async (...args: unknown[]) => {
      calls.push({ method: 'completePublishing', args });
      return {
        updatedVersion: { versionId: 'rec_version_1' },
        updatedAsset: { assetId: 'rec_asset_1' },
        resolvedRelease: { releaseId: 'rec_release_1' },
        resolvedLocalDate: '2026-03-18',
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_complete_publishing')?.({
    version_id: 'rec_version_1',
    release_record_id: 'rec_release_1',
    approve_version: true,
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    ],
  });
  assert.deepEqual(calls[1], {
    method: 'completePublishing',
    args: [
      'rec_version_1',
      {
        release_record_id: 'rec_release_1',
        release_date_local: undefined,
        time_zone: undefined,
        approve_version: true,
        mrp_id_overwrite: undefined,
        mark_all_publishing_items: undefined,
        review_owner: { id: 'usr_eric' },
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('update_version_review rejects reviewer-scoped owner changes before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    requireAssignedVersion: async () => {
      throw new Error('should not run');
    },
    updateVersionReview: async () => {
      throw new Error('should not run');
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_update_version_review')?.({
    version_id: 'rec_version_1',
    review_owner: { id: 'usr_other' },
    review_feedback: 'Draft feedback',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'REVIEWER_WRITE_SCOPE_VIOLATION');
});

test('update_version_review writes supplemental agent review feedback through reviewer scope', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return {
        versionId: 'rec_version_1',
        agentReviewFeedback: 'AI supplemental draft',
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_update_version_review')?.({
    version_id: 'rec_version_1',
    agent_review_feedback: 'AI supplemental draft',
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    ],
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_status: undefined,
        quality_rating: undefined,
        improvement_areas: undefined,
        review_feedback: undefined,
        release_record_id: undefined,
        reject_reason: undefined,
        rejection_feedback: undefined,
        agent_review_feedback: 'AI supplemental draft',
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('save_agent_feedback writes only supplemental agent feedback without central assignment', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return {
        versionId: 'rec_version_1',
        agentReviewFeedback: 'AI supplemental draft',
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => undefined,
  );

  const result = await handlers.get('template_review_save_agent_feedback')?.({
    version_id: 'rec_version_1',
    agent_review_feedback: 'AI supplemental draft',
  });

  assert.ok(result);
  assert.deepEqual(calls, [
    {
      method: 'updateVersionReview',
      args: [
        'rec_version_1',
        {
          agent_review_feedback: 'AI supplemental draft',
        },
      ],
    },
  ]);
  assert.equal(parsePayload(result).ok, true);
});

test('save_agent_feedback does not require reviewer ownership or mutate reviewer assignment', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      throw new Error('agent feedback should not require assignment');
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return {
        versionId: 'rec_version_1',
        agentReviewFeedback: 'AI supplemental draft',
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_save_agent_feedback')?.({
    version_id: 'rec_version_1',
    agent_review_feedback: 'AI supplemental draft',
  });

  assert.ok(result);
  assert.deepEqual(calls, [
    {
      method: 'updateVersionReview',
      args: [
        'rec_version_1',
        {
          agent_review_feedback: 'AI supplemental draft',
        },
      ],
    },
  ]);
  assert.equal(parsePayload(result).ok, true);
});

test('save_draft_feedback writes validated improvement areas through to the client', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewFeedback: 'Draft feedback' };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Draft feedback',
    improvement_areas: ['Template: Accessibility'],
  });

  assert.ok(result);
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_feedback: 'Draft feedback',
        improvement_areas: ['Template: Accessibility'],
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('save_draft_feedback rejects empty payloads before any mutation runs', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    requireAssignedVersion: async () => {
      throw new Error('should not run');
    },
    updateVersionReview: async () => {
      throw new Error('should not run');
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'NO_MUTATION_FIELDS');
});

test('save_draft_feedback writes review feedback without mutating improvement areas', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewFeedback: 'Draft feedback' };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Draft feedback',
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger',
      },
    ],
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_feedback: 'Draft feedback',
        improvement_areas: undefined,
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('get_field_map exposes stable table ids and metrics field ids', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_get_field_map')?.({});

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.data?.tables, TABLE_IDS);
  assert.deepEqual(payload.data?.metricsFieldIds, {
    assets: METRICS_ASSET_FIELD_IDS,
  });
});

test('read-only access registers no write tools', () => {
  const { server, names } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
    {},
    { allowWrites: false },
  );

  for (const writeTool of WRITE_TOOL_NAMES) {
    assert.equal(names.includes(writeTool), false, `expected ${writeTool} to be hidden for read-only access`);
  }
  assert.notEqual(names.indexOf('template_review_get_review_context'), -1);
  assert.notEqual(names.indexOf('template_review_run_published_site_validation'), -1);
  assert.notEqual(names.indexOf('template_review_format_agent_review_feedback'), -1);
});

test('unmapped allowlisted OAuth identity receives no reviewer write tools', () => {
  const access = resolveOAuthAccess({
    email: 'mariana.segura@webflow.com',
    allowedDomain: 'webflow.com',
    allowedEmails: new Set(['mariana.segura@webflow.com']),
    directory: new Map(),
  });
  assert.equal(access.allowed, true);
  if (!access.allowed) return;

  const { server, names } = createServerHarness();
  registerTools(
    server,
    () => ({} as AirtableClient),
    () => access.reviewerProfile,
    {},
    { allowWrites: access.scopes.includes(SCOPE_WRITE) },
  );

  for (const writeTool of WRITE_TOOL_NAMES) {
    assert.equal(names.includes(writeTool), false, `expected ${writeTool} to be hidden for unmapped OAuth identity`);
  }
});

test('workflow shadow pilot access registers exactly the queue read tool', () => {
  const { server, names } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
    {},
    {
      allowWrites: false,
      allowedToolNames: new Set(['template_review_list_queue']),
    },
  );

  assert.deepEqual(names, ['template_review_list_queue']);
});

test('default access keeps the full write surface', () => {
  const { server, names } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  for (const writeTool of WRITE_TOOL_NAMES) {
    assert.notEqual(names.indexOf(writeTool), -1, `expected ${writeTool} to be registered by default`);
  }
});

test('get_checklists is registered read-only and exposes structured checklist state', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    getVersionChecklists: async (versionId: string) => ({
      versionId,
      checklists: {
        review: { kind: 'review', present: true, items: [{ index: 1, text: 'first', checked: false, section: null, lineNumber: 1 }], summary: { total: 1, checked: 0, unchecked: 1, complete: false } },
        publishing: { kind: 'publishing', present: false, items: [], summary: { total: 0, checked: 0, unchecked: 0, complete: false } },
      },
    }),
  } as unknown as AirtableClient;

  // Read-only sessions must still see it.
  assert.equal(WRITE_TOOL_NAMES.has('template_review_get_checklists'), false);

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_get_checklists')?.({ version_id: 'rec_version_1' });
  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.equal((payload.data as { checklists: { review: { summary: { unchecked: number } } } }).checklists.review.summary.unchecked, 1);
});

test('set_checklist_items requires reviewer ownership and forwards the concurrency guard', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    setVersionChecklistItems: async (...args: unknown[]) => {
      calls.push({ method: 'setVersionChecklistItems', args });
      return { versionId: 'rec_version_1', checklist: 'review', changed: [], written: false };
    },
  } as unknown as AirtableClient;

  assert.equal(WRITE_TOOL_NAMES.has('template_review_set_checklist_items'), true);

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_set_checklist_items')?.({
    version_id: 'rec_version_1',
    checklist: 'review',
    items: [{ index: 3, checked: true, expected_text: 'Third item' }],
    expected_total: 10,
  });

  assert.ok(result);
  assert.equal(calls[0].method, 'requireAssignedVersion');
  assert.deepEqual(calls[1], {
    method: 'setVersionChecklistItems',
    args: [
      'rec_version_1',
      {
        checklist: 'review',
        items: [{ index: 3, checked: true, expectedText: 'Third item' }],
        expected_total: 10,
        review_owner: { id: 'usr_eric' },
      },
    ],
  });
  assert.equal(parsePayload(result).ok, true);
});

test('set_checklist_items is hidden from read-only sessions', () => {
  const { server, names } = createServerHarness();

  registerTools(
    server,
    () => ({}) as AirtableClient,
    () => reviewer,
    {},
    { allowWrites: false },
  );

  assert.equal(names.includes('template_review_set_checklist_items'), false);
  assert.equal(names.includes('template_review_get_checklists'), true);
});

test('approve_version warns about unchecked review checklist items without blocking', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    requireAssignedVersion: async () => ({
      versionId: 'rec_version_1',
      rawFields: {
        [TEMPLATE_REVIEW_FIELD_MAP.confirmed.versions.reviewChecklist]: '[ ] one\n[x] two\n[ ] three',
      },
    }),
    updateVersionReview: async () => ({ versionId: 'rec_version_1', reviewStatus: '✅Approved' }),
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_approve_version')?.({ version_id: 'rec_version_1' });
  assert.ok(result);
  const payload = parsePayload(result);

  assert.equal(payload.ok, true, 'unchecked items must not block approval');
  const warnings = (payload.data as { warnings: string[] }).warnings;
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /2 of 3 items unchecked/);
});

test('approve_version emits no checklist warning when the checklist is complete or absent', async () => {
  for (const raw of ['[x] one\n[x] two', undefined]) {
    const { server, handlers } = createServerHarness();
    const client = {
      requireAssignedVersion: async () => ({
        versionId: 'rec_version_1',
        rawFields: { [TEMPLATE_REVIEW_FIELD_MAP.confirmed.versions.reviewChecklist]: raw },
      }),
      updateVersionReview: async () => ({ versionId: 'rec_version_1' }),
    } as unknown as AirtableClient;

    registerTools(
      server,
      () => client,
      () => reviewer,
    );

    const result = await handlers.get('template_review_approve_version')?.({ version_id: 'rec_version_1' });
    assert.ok(result);
    assert.deepEqual((parsePayload(result).data as { warnings: string[] }).warnings, []);
  }
});

test('whole-field checklist overwrite is no longer reachable through update_version_review', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<Record<string, unknown>> = [];
  const client = {
    requireAssignedVersion: async () => ({ versionId: 'rec_version_1' }),
    updateVersionReview: async (_versionId: string, input: Record<string, unknown>) => {
      calls.push(input);
      return { versionId: 'rec_version_1' };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  await handlers.get('template_review_update_version_review')?.({
    version_id: 'rec_version_1',
    review_feedback: 'note',
    // Rejected by the schema rather than silently stringified into the field.
    review_checklist: { destroy: true },
    publishing_checklist: ['destroy'],
  });

  assert.equal(calls.length, 1);
  assert.equal('review_checklist' in calls[0], false);
  assert.equal('publishing_checklist' in calls[0], false);
  assert.equal(TEMPLATE_REVIEW_FIELD_MAP.writeSupport.versionReview.includes('review_checklist' as never), false);
  assert.equal(TEMPLATE_REVIEW_FIELD_MAP.writeSupport.versionReview.includes('publishing_checklist' as never), false);
});

function adminFillContext(versionId = 'rec_version_komanica') {
  return {
    versionId,
    assetId: 'rec_asset_komanica',
    templateName: 'Komanica',
    reviewStatus: '🔁Response to Review',
    canAssign: false,
    canReview: true,
    canPublish: false,
    isAssignedToCurrentReviewer: true,
    version: { versionId, assetId: 'rec_asset_komanica', rawFields: {} },
    asset: {
      assetId: 'rec_asset_komanica',
      templateName: 'Komanica',
      uid: 'komanica',
      descriptionShort: 'A bold editorial agency template.',
      descriptionLongHtml: '<p>Long description</p>',
      adminDetailPagePath: '/templates/html/komanica-website-template',
      adminRecommendedType: 'CMS',
      categoryNames: ['Design Portfolio', 'Creative Agency'],
      categoryCmsSlugs: ['design-portfolio-websites', 'creative-agency-websites'],
      categoryGroupDisplayNames: ['Portfolio & Agency'],
      categoryGroupCmsSlugs: ['portfolio-and-agency-websites'],
      templatePriceFilter: 99,
      priceString: '$99 USD',
      websiteUrl: 'https://komanica.webflow.io/',
      previewSiteUrl: 'https://webflow.com/preview/komanica',
      thumbnailImageUrl: 'https://example.com/thumb.png',
      secondaryThumbnailUrls: ['https://example.com/secondary.png'],
      carouselImageUrls: ['https://example.com/carousel-1.png'],
    },
  };
}

function runAdminFillScriptAgainstFakeForm(script: string) {
  class FakeInput {
    value = '';

    constructor(readonly name: string) {}

    dispatchEvent() {}
  }

  class FakeSelect extends FakeInput {
    constructor(
      name: string,
      readonly options: Array<{ value: string; textContent: string }>,
    ) {
      super(name);
    }
  }

  const fields: Record<string, FakeInput> = {
    name: new FakeInput('name'),
    shortName: new FakeInput('shortName'),
    description: new FakeInput('description'),
    extDetailPageUrl: new FakeInput('extDetailPageUrl'),
    extCategory: new FakeSelect('extCategory', [
      { value: '', textContent: '' },
      { value: 'Design', textContent: 'Design' },
      { value: 'Business', textContent: 'Business' },
    ]),
    extMainTag: new FakeInput('extMainTag'),
    type: new FakeSelect('type', [
      { value: 'basic', textContent: 'basic' },
      { value: 'Ecommerce', textContent: 'Ecommerce' },
      { value: 'CMS', textContent: 'CMS' },
      { value: 'Memberships', textContent: 'Memberships' },
    ]),
    cost: new FakeInput('cost'),
  };
  const form = {
    querySelector: (selector: string) => {
      const name = selector.match(/\[name="([^"]+)"\]/)?.[1];
      return name ? fields[name] : null;
    },
  };
  const fakeDocument = {
    querySelector: (selector: string) => {
      if (selector === 'form[action="/admin/templates"]') return form;
      if (selector.startsWith('form[action="/admin/templates"]')) return form.querySelector(selector);
      return null;
    },
    querySelectorAll: (selector: string) => (selector === 'form' ? [form] : []),
  };
  const globalWithDom = globalThis as typeof globalThis & {
    document?: unknown;
    HTMLSelectElement?: unknown;
    Event?: unknown;
  };
  const previousDocument = globalWithDom.document;
  const previousSelect = globalWithDom.HTMLSelectElement;
  const previousEvent = globalWithDom.Event;
  const previousTable = console.table;
  const previousWarn = console.warn;

  try {
    globalWithDom.document = fakeDocument;
    globalWithDom.HTMLSelectElement = FakeSelect;
    globalWithDom.Event = class {
      constructor(readonly type: string) {}
    };
    console.table = () => undefined;
    console.warn = () => undefined;
    new Function(script)();
  } finally {
    globalWithDom.document = previousDocument;
    globalWithDom.HTMLSelectElement = previousSelect;
    globalWithDom.Event = previousEvent;
    console.table = previousTable;
    console.warn = previousWarn;
  }

  return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
}

test('prepare_admin_template_fill generates read-only admin form data and fill-only script', async () => {
  const { server, handlers } = createServerHarness();
  const calls: string[] = [];
  const client = {
    getReviewContext: async (versionId: string) => {
      calls.push(versionId);
      return adminFillContext(versionId);
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_prepare_admin_template_fill')?.({
    version_id: 'rec_version_komanica',
  });

  assert.ok(result);
  assert.deepEqual(calls, ['rec_version_komanica']);

  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const bundle = payload.data as {
    schema_version: string;
    readiness: { can_publish: boolean; warning?: string };
    form_data: Record<string, unknown>;
    missing_fields: string[];
    manual_uploads: Record<string, unknown>;
    safety_boundary: string[];
    console_script: string;
    bookmarklet: string;
  };

  assert.equal(bundle.schema_version, 'webflow_admin_template_fill.v0.1');
  assert.equal(bundle.readiness.can_publish, false);
  assert.match(bundle.readiness.warning ?? '', /Admin form preparation only/);
  assert.equal(bundle.form_data.template_name, 'Komanica');
  assert.equal(bundle.form_data.uid, 'komanica');
  assert.equal(bundle.form_data.detail_page_path, '/templates/html/komanica-website-template');
  assert.equal(bundle.form_data.recommended_type, 'CMS');
  assert.equal(bundle.form_data.price_usd, 99);
  assert.equal(bundle.form_data.price_cents, 9900);
  assert.deepEqual(bundle.form_data.category_names, ['Design Portfolio', 'Creative Agency']);
  assert.deepEqual(bundle.form_data.category_cms_slugs, ['design-portfolio-websites', 'creative-agency-websites']);
  assert.equal(bundle.form_data.category_display_name, 'Portfolio & Agency');
  assert.deepEqual(bundle.form_data.admin_form, {
    name: 'Komanica',
    shortName: 'komanica',
    description: 'A bold editorial agency template.',
    extDetailPageUrl: '/templates/html/komanica-website-template',
    extCategory: 'Design',
    extMainTag: 'Agency',
    type: 'CMS',
    cost: '9900',
  });
  assert.deepEqual(bundle.missing_fields, []);
  assert.deepEqual(bundle.manual_uploads.secondary_thumbnail_urls, ['https://example.com/secondary.png']);
  assert.ok(bundle.console_script.includes('form[action="/admin/templates"]'));
  assert.match(bundle.console_script, /\['cost', data\.cost\]/);
  assert.doesNotMatch(bundle.console_script, /long_description_html/);
  assert.match(bundle.console_script, /fill-only script/i);
  assert.match(bundle.console_script, /does not submit/i);
  assert.match(bundle.bookmarklet, /^javascript:/);
  assert.ok(bundle.safety_boundary.some((item) => item.includes('does not write Airtable')));
});

test('generated admin fill script targets the real Webflow Admin field names', () => {
  const script = buildAdminTemplateFillConsoleScript({
    template_name: 'Komanica',
    uid: 'komanica',
    detail_page_path: '/templates/html/komanica-website-template',
    recommended_type: 'CMS',
    price_usd: 99,
    price_cents: 9900,
    category_names: ['Design Portfolio', 'Creative Agency'],
    category_cms_slugs: ['design-portfolio-websites', 'creative-agency-websites'],
    category_display_name: 'Portfolio & Agency',
    short_description: 'A bold editorial agency template.',
    admin_form: {
      name: 'Komanica',
      shortName: 'komanica',
      description: 'A bold editorial agency template.',
      extDetailPageUrl: '/templates/html/komanica-website-template',
      extCategory: 'Design',
      extMainTag: 'Agency',
      type: 'CMS',
      cost: '9900',
    },
  });

  assert.deepEqual(runAdminFillScriptAgainstFakeForm(script), {
    name: 'Komanica',
    shortName: 'komanica',
    description: 'A bold editorial agency template.',
    extDetailPageUrl: '/templates/html/komanica-website-template',
    extCategory: 'Design',
    extMainTag: 'Agency',
    type: 'CMS',
    cost: '9900',
  });
});

test('prepare_admin_template_fill_batch omits scripts by default for compact handoffs', async () => {
  const { server, handlers } = createServerHarness();
  const calls: string[] = [];
  const client = {
    getReviewContext: async (versionId: string) => {
      calls.push(versionId);
      return adminFillContext(versionId);
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_prepare_admin_template_fill_batch')?.({
    version_ids: ['rec_version_komanica', 'rec_version_komanica', 'rec_version_other'],
  });

  assert.ok(result);
  assert.deepEqual(calls, ['rec_version_komanica', 'rec_version_other']);

  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const batch = payload.data as {
    schema_version: string;
    count: number;
    include_scripts: boolean;
    items: Array<{ console_script?: string; bookmarklet?: string; form_data: Record<string, unknown> }>;
  };

  assert.equal(batch.schema_version, 'webflow_admin_template_fill_batch.v0.1');
  assert.equal(batch.count, 2);
  assert.equal(batch.include_scripts, false);
  assert.equal(batch.items[0]?.form_data.template_name, 'Komanica');
  assert.equal(batch.items[0]?.console_script, undefined);
  assert.equal(batch.items[0]?.bookmarklet, undefined);
});

test('get_template_thumbnail resolves a version to fresh asset attachment links', async () => {
  const { server, handlers } = createServerHarness();
  const calls: string[] = [];
  const client = {
    getVersionById: async (versionId: string) => {
      calls.push(`version:${versionId}`);
      return { versionId, assetId: 'rec_asset_komanica', rawFields: {} };
    },
    getAssetThumbnails: async (assetId: string) => {
      calls.push(`thumbnails:${assetId}`);
      return {
        assetId,
        templateName: 'Komanica',
        thumbnail: {
          url: 'https://airtable.example/fresh-thumb.png',
          filename: 'komanica-thumbnail.png',
          type: 'image/png',
          sizeBytes: 245_000,
          width: 1440,
          height: 1080,
        },
        secondaryThumbnails: [{ url: 'https://airtable.example/fresh-secondary.png', filename: 'komanica-secondary.png' }],
        carouselImages: [],
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_get_template_thumbnail')?.({
    version_id: 'rec_version_komanica',
  });

  assert.ok(result);
  assert.deepEqual(calls, ['version:rec_version_komanica', 'thumbnails:rec_asset_komanica']);

  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const data = payload.data as {
    schema_version: string;
    source: { asset_id: string; version_id?: string; template_name: string };
    thumbnail: { url: string; filename?: string; width?: number } | null;
    secondary_thumbnails: Array<{ url: string }>;
    carousel_images: unknown[];
    url_expiry_note: string;
    next_steps: string[];
  };

  assert.equal(data.schema_version, 'webflow_admin_template_thumbnails.v0.1');
  assert.equal(data.source.asset_id, 'rec_asset_komanica');
  assert.equal(data.source.version_id, 'rec_version_komanica');
  assert.equal(data.source.template_name, 'Komanica');
  assert.equal(data.thumbnail?.url, 'https://airtable.example/fresh-thumb.png');
  assert.equal(data.thumbnail?.filename, 'komanica-thumbnail.png');
  assert.equal(data.thumbnail?.width, 1440);
  assert.equal(data.secondary_thumbnails.length, 1);
  assert.deepEqual(data.carousel_images, []);
  assert.match(data.url_expiry_note, /time-limited/i);
  assert.ok(data.next_steps.some((step) => step.includes('MRP ID (Override)')));
});

test('get_template_thumbnail accepts asset_id directly and rejects missing identifiers', async () => {
  const { server, handlers } = createServerHarness();
  const calls: string[] = [];
  const client = {
    getVersionById: async () => {
      throw new Error('should not resolve a version when asset_id is provided');
    },
    getAssetThumbnails: async (assetId: string) => {
      calls.push(`thumbnails:${assetId}`);
      return {
        assetId,
        templateName: 'Komanica',
        thumbnail: null,
        secondaryThumbnails: [],
        carouselImages: [],
      };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const direct = await handlers.get('template_review_get_template_thumbnail')?.({
    asset_id: 'rec_asset_komanica',
  });
  assert.ok(direct);
  const directPayload = parsePayload(direct);
  assert.equal(directPayload.ok, true);
  assert.deepEqual(calls, ['thumbnails:rec_asset_komanica']);
  assert.equal((directPayload.data as { thumbnail: unknown }).thumbnail, null);
  assert.equal((directPayload.data as { source: { version_id?: string } }).source.version_id, undefined);

  const missing = await handlers.get('template_review_get_template_thumbnail')?.({});
  assert.ok(missing);
  const missingPayload = parsePayload(missing);
  assert.equal(missingPayload.ok, false);
  assert.equal((missingPayload.error as { code?: string })?.code, 'MISSING_IDENTIFIER');
});

test('prepare_admin_template_verify builds a read-only compare script from the MRP override', async () => {
  const { server, handlers } = createServerHarness();
  const context = adminFillContext('rec_version_komanica') as Record<string, unknown>;
  (context.asset as Record<string, unknown>).mrpIdOverride = 'abcdef012345abcdef012345';
  const client = {
    getReviewContext: async () => context,
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_prepare_admin_template_verify')?.({
    version_id: 'rec_version_komanica',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  const data = payload.data as {
    schema_version: string;
    template_id: string;
    template_id_source: string;
    expected: Record<string, unknown>;
    console_script: string;
    safety_boundary: string[];
  };

  assert.equal(data.schema_version, 'webflow_admin_template_verify.v0.1');
  assert.equal(data.template_id, 'abcdef012345abcdef012345');
  assert.equal(data.template_id_source, 'mrp_id_override');
  assert.deepEqual(data.expected, {
    name: 'Komanica',
    shortName: 'komanica',
    description: 'A bold editorial agency template.',
    extDetailPageUrl: '/templates/html/komanica-website-template',
    extCategory: 'Design',
    extMainTag: 'Agency',
    type: 'CMS',
    cost: 9900,
  });
  assert.ok(data.console_script.includes("fetch('/admin/api/templates/' + templateId"));
  assert.doesNotMatch(data.console_script, /method:\s*'(PUT|POST|DELETE)'/);
  assert.doesNotMatch(data.console_script, /confirm\(/);
  assert.ok(data.safety_boundary.some((item) => /read-only/i.test(item)));
});

test('prepare_admin_template_verify fails cleanly when no MRP id is resolvable', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    getReviewContext: async () => adminFillContext('rec_version_komanica'),
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer,
  );

  const result = await handlers.get('template_review_prepare_admin_template_verify')?.({
    version_id: 'rec_version_komanica',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal((payload.error as { code?: string })?.code, 'TEMPLATE_ID_UNRESOLVED');
});

test('set_mrp_visibility PUTs the airtable MRP route with bearer key and XHR header', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ _id: 'abcdef012345abcdef012345', visibility: 'PRIVATE' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  registerTools(
    server,
    () => ({}) as AirtableClient,
    () => reviewer,
    { marketplaceAdmin: { apiKey: 'k'.repeat(128), fetchFn: fetchStub } },
  );

  const result = await handlers.get('template_review_set_mrp_visibility')?.({
    mrp_id: 'abcdef012345abcdef012345',
    visibility: 'PRIVATE',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'https://webflow.com/admin/api/mrp/airtable');
  assert.equal(calls[0]?.init.method, 'PUT');
  const headers = calls[0]?.init.headers as Record<string, string>;
  assert.equal(headers['X-Requested-With'], 'XMLHttpRequest');
  assert.match(headers.Authorization ?? '', /^Bearer k+$/);
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { mrpId: 'abcdef012345abcdef012345', visibility: 'PRIVATE' });

  const data = payload.data as { requestedVisibility: string; response: { visibility?: string } };
  assert.equal(data.requestedVisibility, 'PRIVATE');
  assert.equal(data.response.visibility, 'PRIVATE');
});

test('set_mrp_visibility fails closed without the marketplace admin key and stays write-gated', async () => {
  const { server, handlers, names } = createServerHarness();

  registerTools(
    server,
    () => ({}) as AirtableClient,
    () => reviewer,
    {},
  );

  const result = await handlers.get('template_review_set_mrp_visibility')?.({
    mrp_id: 'abcdef012345abcdef012345',
    visibility: 'PUBLIC',
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal((payload.error as { code?: string })?.code, 'MARKETPLACE_ADMIN_KEY_UNAVAILABLE');
  assert.ok(WRITE_TOOL_NAMES.has('template_review_set_mrp_visibility'));
  assert.notEqual(names.indexOf('template_review_prepare_admin_template_verify'), -1);

  const readOnly = createServerHarness();
  registerTools(
    readOnly.server,
    () => ({}) as AirtableClient,
    () => reviewer,
    {},
    { allowWrites: false },
  );
  assert.equal(readOnly.names.indexOf('template_review_set_mrp_visibility'), -1);
  assert.notEqual(readOnly.names.indexOf('template_review_prepare_admin_template_verify'), -1);
});

function adminCreateContext(overrides: Record<string, unknown> = {}) {
  const base = adminFillContext();
  return { ...base, canPublish: true, asset: { ...base.asset, creatorEmail: 'hello@komanica.co', ...overrides } };
}

test('create_admin_template POSTs the template payload, records the MRP ID, and returns the Admin URL', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ _id: '6ac54eddbb8a7def85e05871', slug: 'komanica', status: 'DRAFT' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  const publishingWrites: Array<{ assetId: string; input: unknown }> = [];
  const client = {
    getReviewContext: async () => adminCreateContext(),
    updateAssetPublishing: async (assetId: string, input: unknown) => {
      publishingWrites.push({ assetId, input });
      return {};
    },
  } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer, { marketplaceAdmin: { apiKey: 'k'.repeat(128), fetchFn: fetchStub } });

  const result = await handlers.get('template_review_create_admin_template')?.({ version_id: 'rec_version_komanica' });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true, JSON.stringify(payload.error));

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'https://webflow.com/admin/api/mrp/airtable');
  assert.equal(calls[0]?.init.method, 'POST');
  const headers = calls[0]?.init.headers as Record<string, string>;
  assert.equal(headers['X-Requested-With'], 'XMLHttpRequest');
  assert.match(headers.Authorization ?? '', /^Bearer k+$/);

  const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, any>;
  assert.equal(body.resourceType, 'TEMPLATE');
  assert.equal(body.name, 'Komanica');
  assert.equal(body.displayName, 'Komanica');
  assert.equal(body.siteSlug, 'komanica');
  assert.equal(body.visibility, 'PRIVATE');
  assert.deepEqual(body.price, { value: 9900, unit: 'USD' });
  assert.deepEqual(body.support, { email: 'hello@komanica.co' });
  assert.equal(body.templateMetadata.type, 'CMS');
  assert.equal(body.templateMetadata.extDetailPageUrl, '/templates/html/komanica-website-template');
  assert.equal(body.templateMetadata.extCategory, 'Design');
  assert.ok(typeof body.templateMetadata.extMainTag === 'string' && body.templateMetadata.extMainTag.length > 0);
  assert.deepEqual(body.thumbnailImage, { url: 'https://example.com/thumb.png', altText: 'Komanica' });

  assert.deepEqual(publishingWrites, [{ assetId: 'rec_asset_komanica', input: { mrp_id_overwrite: '6ac54eddbb8a7def85e05871' } }]);

  const data = payload.data as { template_id: string; admin_url: string; mrp_id_recorded: boolean; remaining_in_admin: string[] };
  assert.equal(data.template_id, '6ac54eddbb8a7def85e05871');
  assert.equal(data.admin_url, 'https://webflow.com/admin/templates/6ac54eddbb8a7def85e05871');
  assert.equal(data.mrp_id_recorded, true);
  assert.equal(data.remaining_in_admin.length, 4);
  assert.match(data.remaining_in_admin[0] ?? '', /thumbnail/i);
});

test('create_admin_template fails closed without the marketplace admin key and stays write-gated', async () => {
  const { server, handlers, names } = createServerHarness();
  registerTools(server, () => ({ getReviewContext: async () => adminCreateContext() }) as unknown as AirtableClient, () => reviewer, {});

  const result = await handlers.get('template_review_create_admin_template')?.({ version_id: 'rec_version_komanica' });
  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal((payload.error as { code?: string })?.code, 'MARKETPLACE_ADMIN_KEY_UNAVAILABLE');
  assert.ok(WRITE_TOOL_NAMES.has('template_review_create_admin_template'));
  assert.notEqual(names.indexOf('template_review_create_admin_template'), -1);

  const readOnly = createServerHarness();
  registerTools(readOnly.server, () => ({}) as AirtableClient, () => reviewer, {}, { allowWrites: false });
  assert.equal(readOnly.names.indexOf('template_review_create_admin_template'), -1);
});

test('create_admin_template refuses to duplicate an asset that already has a Template ID', async () => {
  const { server, handlers } = createServerHarness();
  let fetched = false;
  const fetchStub = (async () => {
    fetched = true;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const client = {
    getReviewContext: async () => adminCreateContext({ mrpIdOverride: 'abcdef012345abcdef012345' }),
  } as unknown as AirtableClient;
  registerTools(server, () => client, () => reviewer, { marketplaceAdmin: { apiKey: 'k'.repeat(128), fetchFn: fetchStub } });

  const result = await handlers.get('template_review_create_admin_template')?.({ version_id: 'rec_version_komanica' });
  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal((payload.error as { code?: string })?.code, 'TEMPLATE_ID_ALREADY_RECORDED');
  assert.equal(fetched, false);
});

test('create_admin_template refuses without a support contact', async () => {
  const { server, handlers } = createServerHarness();
  let fetched = false;
  const fetchStub = (async () => {
    fetched = true;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const client = {
    getReviewContext: async () => adminCreateContext({ creatorEmail: undefined }),
  } as unknown as AirtableClient;
  registerTools(server, () => client, () => reviewer, { marketplaceAdmin: { apiKey: 'k'.repeat(128), fetchFn: fetchStub } });

  const result = await handlers.get('template_review_create_admin_template')?.({ version_id: 'rec_version_komanica' });
  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal((payload.error as { code?: string })?.code, 'SUPPORT_CONTACT_MISSING');
  assert.equal(fetched, false);
});

test('set_featured_flag is restricted to featured-batch coordinators', async () => {
  const { server, handlers } = createServerHarness();
  let clientCalled = false;
  const client = {
    setFeaturedFlag: async () => {
      clientCalled = true;
      return { assetId: 'rec_x', templateName: 'X', isFeatured: true, warnings: [] };
    },
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer, // ordinary reviewer: no featuredCoordinator grant
  );

  const denied = await handlers.get('template_review_set_featured_flag')?.({
    asset_id: 'rec_x',
    is_featured: true,
    confirm_creator_notification: true,
  });
  assert.ok(denied);
  const deniedPayload = parsePayload(denied);
  assert.equal(deniedPayload.ok, false);
  assert.equal((deniedPayload.error as { code?: string }).code, 'FEATURED_COORDINATOR_REQUIRED');
  assert.equal(clientCalled, false);

  const coordinatorHarness = createServerHarness();
  registerTools(
    coordinatorHarness.server,
    () => client,
    () => ({ ...reviewer, featuredCoordinator: true }),
  );
  const allowed = await coordinatorHarness.handlers.get('template_review_set_featured_flag')?.({
    asset_id: 'rec_x',
    is_featured: true,
    confirm_creator_notification: true,
  });
  assert.ok(allowed);
  const allowedPayload = parsePayload(allowed);
  assert.equal(allowedPayload.ok, true);
  assert.equal(clientCalled, true);
});

test('handoff observation exposes minimized evidence and stays outside queue-only discovery', async () => {
  const {server, handlers, annotations} = createServerHarness();
  const client = {
    getAssetById: async () => ({assetId: 'recAAAAAAAAAAAAAA', templateName: 'private'}),
    getVersionById: async () => ({versionId: 'recBBBBBBBBBBBBBB', assetId: 'recAAAAAAAAAAAAAA', reviewStatus: '🆕Ready for Review', rawFields: {email: 'private@example.com'}}),
  } as unknown as AirtableClient;
  registerTools(server, () => client, () => reviewer, {}, {allowWrites: false});
  const handler = handlers.get('template_review_observe_handoff');
  assert.ok(handler);
  const result = await handler({assetId: 'recAAAAAAAAAAAAAA', versionId: 'recBBBBBBBBBBBBBB'});
  assert.equal(parsePayload(result).data?.state, 'confirmed');
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(annotations.get('template_review_observe_handoff')?.readOnlyHint, true);
  const restricted = createServerHarness();
  registerTools(restricted.server, () => client, () => reviewer, {}, {allowWrites: false, allowedToolNames: new Set(['template_review_list_queue'])});
  assert.equal(restricted.handlers.has('template_review_observe_handoff'), false);
});

test('handoff source errors do not leak raw upstream messages or record identifiers', async () => {
  const {server, handlers} = createServerHarness();
  registerTools(server, () => ({getAssetById: async () => {throw new Error('secret record recAAAAAAAAAAAAAA');}, getVersionById: async () => null}) as unknown as AirtableClient);
  const handler = handlers.get('template_review_observe_handoff');
  assert.ok(handler);
  const result = await handler({assetId: 'recAAAAAAAAAAAAAA', versionId: 'recBBBBBBBBBBBBBB'});
  assert.equal(result.isError, true);
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(JSON.stringify(result).includes('recAAAAAAAAAAAAAA'), false);
});

test('template_review_fetch_published_site_stylesheet returns compiled CSS through the runtime fetcher and stays read-only', async () => {
  const { server, names, handlers, annotations } = createServerHarness();
  const client = {} as unknown as AirtableClient;
  const calls: string[] = [];
  const cssUrl = 'https://cdn.prod.website-files.com/68a1/css/example-template.webflow.5f3a1c9e2.css';
  const fetcher: typeof fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    if (url === 'https://example-template.webflow.io/') {
      return new Response(`<html><head><link rel="stylesheet" href="${cssUrl}"><style>.custom{color:red}</style></head><body></body></html>`, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (url === cssUrl) {
      return new Response('.hero{font-family:"Inter",sans-serif}@media (max-width:479px){.hero{display:none}}', {
        status: 200,
        headers: { 'Content-Type': 'text/css' },
      });
    }
    return new Response('nope', { status: 404 });
  };

  registerTools(server, () => client, () => reviewer, { fetcher }, { allowWrites: false });

  assert.ok(names.includes('template_review_fetch_published_site_stylesheet'), 'read-only sessions must still see the stylesheet tool');
  assert.equal(WRITE_TOOL_NAMES.has('template_review_fetch_published_site_stylesheet'), false);
  assert.equal(annotations.get('template_review_fetch_published_site_stylesheet')?.readOnlyHint, true);

  const result = await handlers.get('template_review_fetch_published_site_stylesheet')?.({
    published_url: 'https://example-template.webflow.io',
    search: ['inter'],
  });
  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.deepEqual(calls, ['https://example-template.webflow.io/', cssUrl]);
  const data = payload.data as {
    stylesheets: Array<{ href: string; fetched: boolean; css: string; summary: { font_families: string[]; media_queries: string[] } }>;
    inline_styles: Array<{ css: string }>;
    search_matches: Array<{ snippet: string }>;
  };
  assert.equal(data.stylesheets[0]?.href, cssUrl);
  assert.equal(data.stylesheets[0]?.fetched, true);
  assert.deepEqual(data.stylesheets[0]?.summary.font_families, ['Inter']);
  assert.deepEqual(data.stylesheets[0]?.summary.media_queries, ['(max-width:479px)']);
  assert.equal(data.inline_styles[0]?.css, '.custom{color:red}');
  assert.equal(data.search_matches[0]?.snippet, '.hero{font-family:"Inter",sans-serif}');

  const rejected = await handlers.get('template_review_fetch_published_site_stylesheet')?.({
    published_url: 'https://example.com/',
  });
  assert.ok(rejected);
  assert.equal(rejected.isError, true);
  assert.equal(parsePayload(rejected).error?.code, 'INVALID_PUBLISHED_URL');
});

// --- Zendesk ticket leg -----------------------------------------------------

import type { ZendeskClient } from '../src/zendesk.js';
import { AirtableClientError } from '../src/airtable.js';

const ticketVersion = {
  versionId: 'recVersionZD',
  assetId: 'recAssetZD',
  versionNumber: 3,
  reviewOwner: { id: reviewer.airtableCollaboratorId },
  reviewStatus: '🏃🏾In Review',
  zendeskTicketId: '1199299',
  zendeskSubject: 'Your Webflow Marketplace Template submission',
  rawFields: {},
};

test('zendesk tools register with the write pair hidden from read-only sessions', () => {
  const { server, names } = createServerHarness();
  registerTools(server, () => ({}) as AirtableClient, () => reviewer);
  for (const name of [
    'template_review_get_ticket_thread',
    'template_review_search_tickets',
    'template_review_send_ticket_followup',
    'template_review_update_ticket_status',
  ]) {
    assert.notEqual(names.indexOf(name), -1, `expected ${name} registered by default`);
  }
  assert.ok(WRITE_TOOL_NAMES.has('template_review_send_ticket_followup'));
  assert.ok(WRITE_TOOL_NAMES.has('template_review_update_ticket_status'));
  assert.equal(WRITE_TOOL_NAMES.has('template_review_get_ticket_thread'), false);
  assert.equal(WRITE_TOOL_NAMES.has('template_review_search_tickets'), false);

  const readOnly = createServerHarness();
  registerTools(readOnly.server, () => ({}) as AirtableClient, () => reviewer, {}, { allowWrites: false });
  assert.notEqual(readOnly.names.indexOf('template_review_get_ticket_thread'), -1);
  assert.notEqual(readOnly.names.indexOf('template_review_search_tickets'), -1);
  assert.equal(readOnly.names.indexOf('template_review_send_ticket_followup'), -1);
  assert.equal(readOnly.names.indexOf('template_review_update_ticket_status'), -1);
});

test('get_ticket_thread resolves the ticket through the version record', async () => {
  const { server, handlers } = createServerHarness();
  const calls: unknown[] = [];
  const zendesk = {
    agentTicketUrl: (id: string) => `https://webflow2579.zendesk.com/agent/tickets/${id}`,
    getTicketThread: async (ticketId: string, options: unknown) => {
      calls.push([ticketId, options]);
      return { ticketId, subject: ticketVersion.zendeskSubject, status: 'pending', comments: [{ id: 1, isPublic: true, body: 'Fixed.' }] };
    },
  } as unknown as ZendeskClient;
  const client = { getScopedVersion: async () => ({ version: ticketVersion, asset: { assetId: 'recAssetZD' } }) } as unknown as AirtableClient;

  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });
  const result = await handlers.get('template_review_get_ticket_thread')?.({ version_id: 'recVersionZD', include_internal_notes: true, limit: 5 });

  const payload = parsePayload(result!);
  assert.equal(payload.ok, true);
  assert.equal(payload.data?.version_number, 3);
  assert.equal(payload.data?.ticket_url, 'https://webflow2579.zendesk.com/agent/tickets/1199299');
  assert.deepEqual(calls, [['1199299', { includeInternalNotes: true, limit: 5 }]]);
});

test('get_ticket_thread and search_tickets fail closed without a ticket link or Zendesk config', async () => {
  const { server, handlers } = createServerHarness();
  let threadCalls = 0;
  const zendesk = { getTicketThread: async () => { threadCalls += 1; return {}; } } as unknown as ZendeskClient;
  const client = { getScopedVersion: async () => ({ version: { ...ticketVersion, zendeskTicketId: undefined }, asset: { assetId: 'recAssetZD' } }) } as unknown as AirtableClient;
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });

  const noTicket = parsePayload((await handlers.get('template_review_get_ticket_thread')?.({ version_id: 'recVersionZD', include_internal_notes: false, limit: 20 }))!);
  assert.equal(noTicket.ok, false);
  assert.equal(noTicket.error?.code, 'NO_ZENDESK_TICKET');
  assert.equal(threadCalls, 0);

  const unconfigured = createServerHarness();
  registerTools(unconfigured.server, () => client, () => reviewer);
  const thread = parsePayload((await unconfigured.handlers.get('template_review_get_ticket_thread')?.({ version_id: 'recVersionZD', include_internal_notes: false, limit: 20 }))!);
  assert.equal(thread.error?.code, 'ZENDESK_NOT_CONFIGURED');
  const search = parsePayload((await unconfigured.handlers.get('template_review_search_tickets')?.({ query: 'x', limit: 25, scope: 'marketplace_review' }))!);
  assert.equal(search.error?.code, 'ZENDESK_NOT_CONFIGURED');
});

test('search_tickets scopes to the Marketplace Review group by default and passes filters through', async () => {
  const { server, handlers } = createServerHarness();
  const received: unknown[] = [];
  const zendesk = {
    agentTicketUrl: (id: string) => `https://webflow2579.zendesk.com/agent/tickets/${id}`,
    searchTickets: async (params: unknown) => {
      received.push(params);
      return { scope: 'marketplace_review', query: 'q', count: 1, hasMore: false, tickets: [{ ticketId: '1199299' }] };
    },
  } as unknown as ZendeskClient;
  registerTools(server, () => ({}) as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });

  const result = parsePayload((await handlers.get('template_review_search_tickets')?.({ query: 'Studio', status: 'pending', requester_email: 'creator@example.com', limit: 10, scope: 'marketplace_review' }))!);
  assert.equal(result.ok, true);
  assert.deepEqual((result.data?.tickets as Array<{ ticketUrl: string }>)[0]?.ticketUrl, 'https://webflow2579.zendesk.com/agent/tickets/1199299');
  assert.deepEqual(received[0], {
    query: 'Studio', status: 'pending', tags: undefined, requesterEmail: 'creator@example.com', assigneeId: undefined,
    createdAfter: undefined, createdBefore: undefined, sortBy: undefined, sortOrder: undefined, limit: 10, scope: 'marketplace_review',
  });
});

test('send_ticket_followup requires reviewer ownership, then posts an escaped comment on the linked ticket', async () => {
  const { server, handlers } = createServerHarness();
  const comments: unknown[] = [];
  const zendesk = {
    agentTicketUrl: (id: string) => `https://webflow2579.zendesk.com/agent/tickets/${id}`,
    addTicketComment: async (ticketId: string, input: unknown) => {
      comments.push([ticketId, input]);
      return { ticketId, isPublic: true, auditId: 7, ticketStatus: 'open' };
    },
  } as unknown as ZendeskClient;
  const assigned: unknown[] = [];
  const client = {
    requireAssignedVersion: async (versionId: string, current: unknown) => {
      assigned.push([versionId, current]);
      return ticketVersion;
    },
  } as unknown as AirtableClient;
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });

  const unconfirmed = parsePayload((await handlers.get('template_review_send_ticket_followup')?.({
    version_id: 'recVersionZD',
    message: 'Hi Studio',
    visibility: 'public',
    confirm_public_reply: false,
  }))!);
  assert.equal(unconfirmed.error?.code, 'PUBLIC_REPLY_CONFIRMATION_REQUIRED');
  assert.equal(comments.length, 0);
  assert.equal(assigned.length, 0);

  const result = parsePayload((await handlers.get('template_review_send_ticket_followup')?.({
    version_id: 'recVersionZD',
    message: 'Hi Studio,\n\nThe `<script>` line was cut off — full text below.\n\nCheers',
    visibility: 'public',
    confirm_public_reply: true,
  }))!);
  assert.equal(result.ok, true);
  assert.equal(result.data?.ticket_id, '1199299');
  assert.equal(result.data?.audit_id, 7);
  assert.deepEqual(assigned[0], ['recVersionZD', { id: reviewer.airtableCollaboratorId, email: reviewer.email, name: reviewer.name }]);
  const [ticketId, input] = comments[0] as [string, { htmlBody: string; isPublic: boolean }];
  assert.equal(ticketId, '1199299');
  assert.equal(input.isPublic, true);
  assert.ok(input.htmlBody.includes('<code>&lt;script&gt;</code>'));
  assert.doesNotMatch(input.htmlBody, /<script/);
});

test('send_ticket_followup fails closed when the version is unowned, unlinked, or Zendesk is unconfigured', async () => {
  let posts = 0;
  const zendesk = { addTicketComment: async () => { posts += 1; return {}; } } as unknown as ZendeskClient;

  const unowned = createServerHarness();
  registerTools(unowned.server, () => ({
    requireAssignedVersion: async () => { throw new AirtableClientErrorForTest('REVIEWER_ASSIGNMENT_CONFLICT'); },
  }) as unknown as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });
  const conflict = parsePayload((await unowned.handlers.get('template_review_send_ticket_followup')?.({ version_id: 'recVersionZD', message: 'Hello', visibility: 'public', confirm_public_reply: true }))!);
  assert.equal(conflict.ok, false);

  const unlinked = createServerHarness();
  registerTools(unlinked.server, () => ({ requireAssignedVersion: async () => ({ ...ticketVersion, zendeskTicketId: undefined }) }) as unknown as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });
  const noTicket = parsePayload((await unlinked.handlers.get('template_review_send_ticket_followup')?.({ version_id: 'recVersionZD', message: 'Hello', visibility: 'public', confirm_public_reply: true }))!);
  assert.equal(noTicket.error?.code, 'NO_ZENDESK_TICKET');

  const unconfigured = createServerHarness();
  registerTools(unconfigured.server, () => ({ requireAssignedVersion: async () => ticketVersion }) as unknown as AirtableClient, () => reviewer);
  const missing = parsePayload((await unconfigured.handlers.get('template_review_send_ticket_followup')?.({ version_id: 'recVersionZD', message: 'Hello', visibility: 'public', confirm_public_reply: true }))!);
  assert.equal(missing.error?.code, 'ZENDESK_NOT_CONFIGURED');

  assert.equal(posts, 0);
});

test('update_ticket_status resolves the ticket from an owned version and requires fresh-read confirmation', async () => {
  const writes: unknown[] = [];
  const zendesk = {
    agentTicketUrl: (id: string) => `https://webflow2579.zendesk.com/agent/tickets/${id}`,
    updateTicketStatus: async (ticketId: string, update: unknown) => {
      writes.push([ticketId, update]);
      return { ticketId, previousStatus: 'pending', status: 'solved', tags: ['marketplace'], auditId: 99 };
    },
  } as unknown as ZendeskClient;
  const assigned: unknown[] = [];
  const client = {
    requireAssignedVersion: async (versionId: string, current: unknown) => { assigned.push([versionId, current]); return ticketVersion; },
  } as unknown as AirtableClient;
  const { server, handlers } = createServerHarness();
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });

  const missing = parsePayload((await handlers.get('template_review_update_ticket_status')?.({ version_id: 'recVersionZD', status: 'solved' }))!);
  assert.equal(missing.error?.code, 'TICKET_STATUS_CONFIRMATION_REQUIRED');
  const unconfirmed = parsePayload((await handlers.get('template_review_update_ticket_status')?.({ version_id: 'recVersionZD', status: 'solved', status_change: { confirmed: false, expected_status: 'pending' } }))!);
  assert.equal(unconfirmed.error?.code, 'TICKET_STATUS_CONFIRMATION_REQUIRED');
  assert.equal(writes.length, 0);
  assert.equal(assigned.length, 0);

  const ok = parsePayload((await handlers.get('template_review_update_ticket_status')?.({
    version_id: 'recVersionZD', status: 'solved', private_note: 'Closing after approval.', additional_tags: ['resolved'],
    status_change: { confirmed: true, expected_status: 'pending' },
  }))!);
  assert.equal(ok.ok, true);
  assert.equal(ok.data?.version_id, 'recVersionZD');
  assert.equal(ok.data?.ticket_id, '1199299');
  assert.equal(ok.data?.previous_status, 'pending');
  assert.equal(ok.data?.private_note_added, true);
  assert.deepEqual(assigned[0], ['recVersionZD', { id: reviewer.airtableCollaboratorId, email: reviewer.email, name: reviewer.name }]);
  assert.deepEqual(writes[0], ['1199299', { status: 'solved', expectedStatus: 'pending', privateNote: 'Closing after approval.', additionalTags: ['resolved'], removeTags: undefined }]);
});

test('update_ticket_status fails closed for unowned, unlinked, or reviewer-less sessions without touching Zendesk', async () => {
  let writes = 0;
  const zendesk = { agentTicketUrl: (id: string) => id, updateTicketStatus: async () => { writes += 1; return {}; } } as unknown as ZendeskClient;
  const args = { version_id: 'recVersionZD', status: 'solved', status_change: { confirmed: true, expected_status: 'pending' } };

  const anonymous = createServerHarness();
  registerTools(anonymous.server, () => ({ requireAssignedVersion: async () => ticketVersion }) as unknown as AirtableClient, () => null, { getZendeskClient: () => zendesk });
  assert.equal(parsePayload((await anonymous.handlers.get('template_review_update_ticket_status')?.(args))!).error?.code, 'REVIEWER_IDENTITY_UNAVAILABLE');

  const unowned = createServerHarness();
  registerTools(unowned.server, () => ({
    requireAssignedVersion: async () => { throw new AirtableClientError('REVIEWER_ASSIGNMENT_CONFLICT', 'Version is assigned to a different reviewer.', 409); },
  }) as unknown as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });
  assert.equal(parsePayload((await unowned.handlers.get('template_review_update_ticket_status')?.(args))!).error?.code, 'REVIEWER_ASSIGNMENT_CONFLICT');

  const unlinked = createServerHarness();
  registerTools(unlinked.server, () => ({ requireAssignedVersion: async () => ({ ...ticketVersion, zendeskTicketId: undefined }) }) as unknown as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });
  assert.equal(parsePayload((await unlinked.handlers.get('template_review_update_ticket_status')?.(args))!).error?.code, 'NO_ZENDESK_TICKET');

  assert.equal(writes, 0);
});

test('internal notes and scope=all are reviewer-only for read sessions', async () => {
  let threadReads = 0;
  let searches = 0;
  const zendesk = {
    agentTicketUrl: (id: string) => id,
    getTicketThread: async () => { threadReads += 1; return { ticketId: '1199299', comments: [] }; },
    searchTickets: async () => { searches += 1; return { scope: 'marketplace_review', query: '', count: 0, hasMore: false, tickets: [] }; },
  } as unknown as ZendeskClient;
  const client = { getScopedVersion: async () => ({ version: ticketVersion, asset: { assetId: 'recAssetZD' } }) } as unknown as AirtableClient;
  const { server, handlers } = createServerHarness();
  registerTools(server, () => client, () => null, { getZendeskClient: () => zendesk }, { allowWrites: false });

  const notes = parsePayload((await handlers.get('template_review_get_ticket_thread')?.({ version_id: 'recVersionZD', include_internal_notes: true, limit: 20 }))!);
  assert.equal(notes.error?.code, 'REVIEWER_IDENTITY_UNAVAILABLE');
  const wide = parsePayload((await handlers.get('template_review_search_tickets')?.({ query: 'invoice', limit: 25, scope: 'all' }))!);
  assert.equal(wide.error?.code, 'REVIEWER_IDENTITY_UNAVAILABLE');
  assert.equal(threadReads, 0);
  assert.equal(searches, 0);

  const publicOnly = parsePayload((await handlers.get('template_review_get_ticket_thread')?.({ version_id: 'recVersionZD', include_internal_notes: false, limit: 20 }))!);
  assert.equal(publicOnly.ok, true);
  const scoped = parsePayload((await handlers.get('template_review_search_tickets')?.({ query: 'invoice', limit: 25, scope: 'marketplace_review' }))!);
  assert.equal(scoped.ok, true);
  assert.equal(threadReads, 1);
  assert.equal(searches, 1);
});

class AirtableClientErrorForTest extends Error {
  code: string;
  status = 409;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

test('get_ticket_thread refuses versions outside template scope through the scoped lookup', async () => {
  const { server, handlers } = createServerHarness();
  let reads = 0;
  const zendesk = { agentTicketUrl: (id: string) => id, getTicketThread: async () => { reads += 1; return {}; } } as unknown as ZendeskClient;
  const client = {
    getScopedVersion: async () => { throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Template asset not found in template-review scope.', 404); },
  } as unknown as AirtableClient;
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });
  const payload = parsePayload((await handlers.get('template_review_get_ticket_thread')?.({ version_id: 'recAppVersion', include_internal_notes: true, limit: 20 }))!);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE');
  assert.equal(reads, 0);
});

test('search_tickets rejects a group: term in free text unless scope is all', async () => {
  const { server, handlers } = createServerHarness();
  const queries: unknown[] = [];
  const zendesk = {
    agentTicketUrl: (id: string) => id,
    searchTickets: async (params: { query?: string }) => { queries.push(params.query); return { scope: 'all', query: '', count: 0, hasMore: false, tickets: [] }; },
  } as unknown as ZendeskClient;
  registerTools(server, () => ({}) as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });

  for (const query of ['refund group:46157931219347', '-group:1500002744702 refund', 'GROUP:1', 'refund OR status:open', 'or type:ticket', 'launch OR']) {
    const rejected = parsePayload((await handlers.get('template_review_search_tickets')?.({ query, limit: 25, scope: 'marketplace_review' }))!);
    assert.equal(rejected.error?.code, 'ZENDESK_SCOPE_OVERRIDE_REJECTED', query);
  }
  assert.equal(queries.length, 0);

  for (const tags of [['foo OR group:46157931219347'], ['ok', 'bad tag'], ['group:1']]) {
    const rejected = parsePayload((await handlers.get('template_review_search_tickets')?.({ tags, limit: 25, scope: 'marketplace_review' }))!);
    assert.equal(rejected.error?.code, 'ZENDESK_SCOPE_OVERRIDE_REJECTED', JSON.stringify(tags));
  }
  assert.equal(queries.length, 0);
  const tagged = parsePayload((await handlers.get('template_review_search_tickets')?.({ tags: ['template_review', 'v-2.0'], limit: 25, scope: 'marketplace_review' }))!);
  assert.equal(tagged.ok, true);

  const allowed = parsePayload((await handlers.get('template_review_search_tickets')?.({ query: 'refund group:46157931219347', limit: 25, scope: 'all' }))!);
  assert.equal(allowed.ok, true);
  const plain = parsePayload((await handlers.get('template_review_search_tickets')?.({ query: 'workgroup: launch ordering portfolio', limit: 25, scope: 'marketplace_review' }))!);
  assert.equal(plain.ok, true);
  assert.deepEqual(queries, [undefined, 'refund group:46157931219347', 'workgroup: launch ordering portfolio']);
});

test('send_ticket_followup internal notes need no public confirmation', async () => {
  const comments: unknown[] = [];
  const zendesk = {
    agentTicketUrl: (id: string) => id,
    addTicketComment: async (ticketId: string, input: unknown) => { comments.push([ticketId, input]); return { ticketId, isPublic: false, auditId: 1 }; },
  } as unknown as ZendeskClient;
  const { server, handlers } = createServerHarness();
  registerTools(server, () => ({ requireAssignedVersion: async () => ticketVersion }) as unknown as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });
  const note = parsePayload((await handlers.get('template_review_send_ticket_followup')?.({ version_id: 'recVersionZD', message: 'Internal: waiting on creator.', visibility: 'internal', confirm_public_reply: false }))!);
  assert.equal(note.ok, true);
  assert.deepEqual((comments[0] as [string, { isPublic: boolean }])[1].isPublic, false);
});

// --- Outbound ticket creation --------------------------------------------------

const outboundAsset = { assetId: 'recAssetZD', templateName: 'Studio Portfolio', creatorEmail: 'creator@example.com', creatorName: 'Creator Person' };

function outboundZendesk() {
  const created: unknown[] = [];
  const zendesk = {
    agentTicketUrl: (id: string) => `https://webflow2579.zendesk.com/agent/tickets/${id}`,
    createOutboundTicket: async (input: unknown) => {
      created.push(input);
      return { ticketId: '1200001', status: 'open', groupId: 1500002744702, brandId: 35121420416531, requesterId: 555, agentId: 1, publicCommentAuditId: 7, requesterNotified: true, steps: ['created'] };
    },
  } as unknown as ZendeskClient;
  return { created, zendesk };
}

test('create_ticket is a write tool hidden from read-only sessions', () => {
  assert.ok(WRITE_TOOL_NAMES.has('template_review_create_ticket'));
  const readOnly = createServerHarness();
  registerTools(readOnly.server, () => ({}) as AirtableClient, () => reviewer, {}, { allowWrites: false });
  assert.equal(readOnly.names.indexOf('template_review_create_ticket'), -1);
  const full = createServerHarness();
  registerTools(full.server, () => ({}) as AirtableClient, () => reviewer);
  assert.notEqual(full.names.indexOf('template_review_create_ticket'), -1);
});

test('create_ticket resolves the creator email from the template asset and sends through the outbound flow', async () => {
  const { created, zendesk } = outboundZendesk();
  const client = { getAssetById: async (id: string) => (id === 'recAssetZD' ? outboundAsset : null) } as unknown as AirtableClient;
  const { server, handlers } = createServerHarness();
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });

  const result = parsePayload((await handlers.get('template_review_create_ticket')?.({
    asset_id: 'recAssetZD',
    subject: 'About your Marketplace template',
    message: 'Hi Creator,\n\nPlease update the `<title>` on your listing.\n\nThanks',
    tags: ['relist'],
    confirm_send: true,
  }))!);
  assert.equal(result.ok, true);
  assert.equal(result.data?.ticket_id, '1200001');
  assert.equal(result.data?.requester_email, 'creator@example.com');
  assert.equal(result.data?.requester_email_source, 'airtable');
  assert.equal(result.data?.requester_notified, true);
  const input = created[0] as { requesterEmail: string; requesterName: string; subject: string; publicHtml: string; internalNoteHtml: string; tags: string[] };
  assert.equal(input.requesterEmail, 'creator@example.com');
  assert.equal(input.requesterName, 'Creator Person');
  assert.ok(input.publicHtml.includes('<code>&lt;title&gt;</code>'));
  assert.doesNotMatch(input.publicHtml, /<title/);
  assert.ok(input.internalNoteHtml.includes('Studio Portfolio'));
  assert.deepEqual(input.tags, ['template_review_mcp_outbound', 'relist']);
  assert.match(String((created[0] as { externalId: string }).externalId), /^template-review-mcp:recAssetZD:[0-9a-f]{24}$/);
  assert.equal(result.data?.external_id, (created[0] as { externalId: string }).externalId);
});

test('create_ticket accepts a version_id through the template-scoped lookup and an explicit requester override', async () => {
  const { created, zendesk } = outboundZendesk();
  const client = { getScopedVersion: async () => ({ version: ticketVersion, asset: outboundAsset }) } as unknown as AirtableClient;
  const { server, handlers } = createServerHarness();
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });
  const result = parsePayload((await handlers.get('template_review_create_ticket')?.({
    version_id: 'recVersionZD', subject: 'Hello', message: 'Hi', requester_email: 'other@example.com', confirm_send: true,
  }))!);
  assert.equal(result.ok, true);
  assert.equal(result.data?.requester_email, 'other@example.com');
  assert.equal(result.data?.requester_email_source, 'override');
  assert.equal((created[0] as { requesterEmail: string }).requesterEmail, 'other@example.com');
});

test('create_ticket fails closed before any Zendesk call when unconfirmed, unconfigured, reviewer-less, out of scope, or without an email', async () => {
  const { created, zendesk } = outboundZendesk();
  const base = { asset_id: 'recAssetZD', subject: 'Hello', message: 'Hi', confirm_send: true };
  const client = { getAssetById: async () => outboundAsset } as unknown as AirtableClient;

  const h = createServerHarness();
  registerTools(h.server, () => client, () => reviewer, { getZendeskClient: () => zendesk });
  assert.equal(parsePayload((await h.handlers.get('template_review_create_ticket')?.({ ...base, confirm_send: false }))!).error?.code, 'SEND_CONFIRMATION_REQUIRED');
  assert.equal(parsePayload((await h.handlers.get('template_review_create_ticket')?.({ subject: 'Hello', message: 'Hi', confirm_send: true }))!).error?.code, 'ASSET_REFERENCE_REQUIRED');
  assert.equal(parsePayload((await h.handlers.get('template_review_create_ticket')?.({ ...base, version_id: 'recVersionZD' }))!).error?.code, 'ASSET_REFERENCE_REQUIRED');

  const unconfigured = createServerHarness();
  registerTools(unconfigured.server, () => client, () => reviewer);
  assert.equal(parsePayload((await unconfigured.handlers.get('template_review_create_ticket')?.(base))!).error?.code, 'ZENDESK_NOT_CONFIGURED');

  const anonymous = createServerHarness();
  registerTools(anonymous.server, () => client, () => null, { getZendeskClient: () => zendesk });
  assert.equal(parsePayload((await anonymous.handlers.get('template_review_create_ticket')?.(base))!).error?.code, 'REVIEWER_IDENTITY_UNAVAILABLE');

  const outOfScope = createServerHarness();
  registerTools(outOfScope.server, () => ({ getAssetById: async () => null }) as unknown as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });
  assert.equal(parsePayload((await outOfScope.handlers.get('template_review_create_ticket')?.(base))!).error?.code, 'ASSET_NOT_FOUND_OR_OUT_OF_SCOPE');

  const noEmail = createServerHarness();
  registerTools(noEmail.server, () => ({ getAssetById: async () => ({ ...outboundAsset, creatorEmail: undefined }) }) as unknown as AirtableClient, () => reviewer, { getZendeskClient: () => zendesk });
  assert.equal(parsePayload((await noEmail.handlers.get('template_review_create_ticket')?.(base))!).error?.code, 'NO_CREATOR_EMAIL');

  assert.equal(created.length, 0);
});

test('create_ticket for a version returns a next_step that asks before relinking', async () => {
  const { zendesk } = outboundZendesk();
  const client = { getScopedVersion: async () => ({ version: ticketVersion, asset: outboundAsset }) } as unknown as AirtableClient;
  const { server, handlers } = createServerHarness();
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });
  const result = parsePayload((await handlers.get('template_review_create_ticket')?.({ version_id: 'recVersionZD', subject: 'Hello', message: 'Hi', confirm_send: true }))!);
  assert.equal(result.ok, true);
  const hint = String(result.data?.next_step);
  assert.ok(hint.includes('Ask the reviewer'));
  assert.ok(hint.includes('template_review_link_version_ticket'));
  assert.ok(hint.includes('expected_current_ticket_id="1199299"'));
  assert.ok(hint.includes('ticket_id=1200001'));
});

test('link_version_ticket verifies the ticket belongs to this creator before relinking', async () => {
  const writes: unknown[] = [];
  const client = {
    requireAssignedVersion: async () => ticketVersion,
    getScopedVersion: async () => ({ version: ticketVersion, asset: outboundAsset }),
    setVersionZendeskTicket: async (versionId: string, ticketId: string, expected: unknown) => {
      writes.push([versionId, ticketId, expected]);
      return { version: { ...ticketVersion, zendeskTicketId: ticketId }, previousTicketId: '1199299' };
    },
  } as unknown as AirtableClient;
  const summaries: Record<string, unknown> = {
    '1200001': { ticketId: '1200001', groupId: 1500002744702, externalId: 'template-review-mcp:recAssetZD:abc', requesterEmail: 'someone-else@example.com' },
    '1200002': { ticketId: '1200002', groupId: 1500002744702, externalId: null, requesterEmail: 'Creator@Example.com' },
    '1200003': { ticketId: '1200003', groupId: 46157931219347, externalId: 'template-review-mcp:recAssetZD:abc', requesterEmail: 'creator@example.com' },
    '1200004': { ticketId: '1200004', groupId: 1500002744702, externalId: 'template-review-mcp:recOTHER:abc', requesterEmail: 'other@example.com' },
  };
  const zendesk = {
    marketplaceGroupId: 1500002744702,
    agentTicketUrl: (id: string) => `https://webflow2579.zendesk.com/agent/tickets/${id}`,
    getTicketSummary: async (id: string) => summaries[id],
  } as unknown as ZendeskClient;
  const { server, handlers } = createServerHarness();
  registerTools(server, () => client, () => reviewer, { getZendeskClient: () => zendesk });
  assert.ok(WRITE_TOOL_NAMES.has('template_review_link_version_ticket'));
  const call = (ticket_id: string, confirm = true) =>
    handlers.get('template_review_link_version_ticket')!({ version_id: 'recVersionZD', ticket_id, expected_current_ticket_id: '1199299', confirm_replace: confirm }).then(parsePayload);

  assert.equal((await call('1200001', false)).error?.code, 'REPLACE_CONFIRMATION_REQUIRED');
  assert.equal((await call('1200003')).error?.code, 'ZENDESK_TICKET_OUT_OF_SCOPE');
  assert.equal((await call('1200004')).error?.code, 'TICKET_CREATOR_MISMATCH');
  assert.equal(writes.length, 0);

  const byKey = await call('1200001');
  assert.equal(byKey.ok, true);
  assert.equal(byKey.data?.ticket_verified_by, 'external_id');
  assert.equal(byKey.data?.previous_ticket_id, '1199299');
  assert.equal(byKey.data?.changed, true);
  const byEmail = await call('1200002');
  assert.equal(byEmail.ok, true);
  assert.equal(byEmail.data?.ticket_verified_by, 'requester_email');
  assert.deepEqual(writes, [['recVersionZD', '1200001', '1199299'], ['recVersionZD', '1200002', '1199299']]);

  const anonymous = createServerHarness();
  registerTools(anonymous.server, () => client, () => null, { getZendeskClient: () => zendesk });
  const noReviewer = parsePayload((await anonymous.handlers.get('template_review_link_version_ticket')?.({ version_id: 'recVersionZD', ticket_id: '1200001', expected_current_ticket_id: null, confirm_replace: true }))!);
  assert.equal(noReviewer.error?.code, 'REVIEWER_IDENTITY_UNAVAILABLE');
  const unconfigured = createServerHarness();
  registerTools(unconfigured.server, () => client, () => reviewer);
  assert.equal(parsePayload((await unconfigured.handlers.get('template_review_link_version_ticket')?.({ version_id: 'recVersionZD', ticket_id: '1200001', expected_current_ticket_id: null, confirm_replace: true }))!).error?.code, 'ZENDESK_NOT_CONFIGURED');
  assert.equal(writes.length, 2);
});
