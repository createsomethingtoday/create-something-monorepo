import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import { RUBRIC_DIMENSIONS } from '../src/comprehensive-review-contract.js';
import type { ReviewerProfile } from '../src/reviewer-directory.js';
import { METRICS_ASSET_FIELD_IDS, TABLE_IDS } from '../src/schema.js';
import { registerTools, WRITE_TOOL_NAMES } from '../src/tools.js';

type ToolResult = { content: Array<{ text: string }>; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

function createServerHarness() {
  const names: string[] = [];
  const handlers = new Map<string, ToolHandler>();

  const server = {
    tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
      names.push(name);
      handlers.set(name, handler);
    },
  } as unknown as McpServer;

  return { server, names, handlers };
}

function parsePayload(result: ToolResult) {
  return JSON.parse(result.content[0]?.text ?? '{}') as {
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
  assert.notEqual(names.indexOf('template_review_save_agent_feedback'), -1);
  assert.notEqual(names.indexOf('template_review_save_draft_feedback'), -1);
  assert.notEqual(names.indexOf('template_review_run_published_site_validation'), -1);
  assert.ok(names.indexOf('template_review_run_published_site_validation') < names.indexOf('template_review_assign_self'));
  assert.ok(names.indexOf('template_review_get_comprehensive_review_contract') < names.indexOf('template_review_run_published_site_validation'));
  assert.ok(names.indexOf('template_review_prepare_published_site_sandbox') < names.indexOf('template_review_run_published_site_validation'));
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
        publishing_checklist: undefined,
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
        review_checklist: undefined,
        publishing_checklist: undefined,
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
