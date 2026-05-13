import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { Eval } from 'braintrust';
import {
  answerContains,
  buildDifyClientConfig,
  callDifyChat,
  observationsContain,
  usedForbiddenTool,
  usedTool,
  type DifyChatInput,
  type DifyChatOutput
} from './shared.js';

type ReviewerSlug = 'eric' | 'natalia' | 'mariana' | 'vicki';

type ReviewerConfig = {
  slug: ReviewerSlug;
  displayName: string;
  agentId: string;
  apiKeyEnv: string;
  infisicalPath: string;
};

type CaseArea = 'e2b_public_site' | 'airtable_read' | 'guardrail';

type TemplateReviewInput = DifyChatInput & {
  reviewer: ReviewerConfig;
  area: CaseArea;
  expectedAnyTools?: string[];
  expectedProxyTools?: string[];
  expectedTerms?: string[];
  expectedAnyTerms?: string[];
  forbiddenProxyTools?: string[];
};

type Score = {
  name: string;
  score: number | null;
  metadata?: Record<string, unknown>;
};

type EvalCase = {
  input: Omit<TemplateReviewInput, 'reviewer'>;
  metadata: Record<string, string>;
};

const SERVER_NAME = 'webflow-template-review-mcp';
const TARGET_URL =
  process.env.WEBFLOW_TEMPLATE_REVIEW_EVAL_TARGET_URL?.trim() ||
  'https://omnerat-template.webflow.io/';
const DEFAULT_DIFY_EVAL_USER = 'braintrust-template-review-comprehensive';
const LATENCY_BUDGET_MS = readPositiveIntEnv('DIFY_AGENT_EVAL_LATENCY_BUDGET_MS', 240_000);
const MAX_CONCURRENCY = readPositiveIntEnv('DIFY_AGENT_EVAL_MAX_CONCURRENCY', 1);
const MAX_DIFY_RETRIES = readNonNegativeIntEnv('DIFY_AGENT_EVAL_RETRIES', 1);
const LOCAL_RESULT_JSONL = process.env.WEBFLOW_TEMPLATE_REVIEW_EVAL_RESULT_JSONL?.trim();

const REVIEWERS: ReviewerConfig[] = [
  {
    slug: 'eric',
    displayName: 'Eric',
    agentId: 'eric-hub',
    apiKeyEnv: 'DIFY_ERIC_HUB_API_KEY',
    infisicalPath: process.env.DIFY_ERIC_HUB_INFISICAL_PATH?.trim() || '/dify/eric-hub'
  },
  {
    slug: 'natalia',
    displayName: 'Natalia',
    agentId: 'natalia-hub',
    apiKeyEnv: 'DIFY_NATALIA_HUB_API_KEY',
    infisicalPath: process.env.DIFY_NATALIA_HUB_INFISICAL_PATH?.trim() || '/dify/natalia-hub'
  },
  {
    slug: 'mariana',
    displayName: 'Mariana',
    agentId: 'mariana-hub',
    apiKeyEnv: 'DIFY_MARIANA_HUB_API_KEY',
    infisicalPath: process.env.DIFY_MARIANA_HUB_INFISICAL_PATH?.trim() || '/dify/mariana-hub'
  },
  {
    slug: 'vicki',
    displayName: 'Vicki',
    agentId: 'vicki-hub',
    apiKeyEnv: 'DIFY_VICKI_HUB_API_KEY',
    infisicalPath: process.env.DIFY_VICKI_HUB_INFISICAL_PATH?.trim() || '/dify/vicki-hub'
  }
];

const FORBIDDEN_HUB_TOOLS = [
  'hub_status',
  'hub_list_registry',
  'hub_list_proxy_tools',
  'hub_search_proxy_tools',
  'hub_route_intent',
  'hub_describe_proxy_tool',
  'hub_get_proxy_tool',
  'hub_run_intent',
  'hub_execute_proxy_tool',
  'hub_run_proxy_tool',
  'hub_list_services',
  'hub_refresh_connections',
  'hub_update_state'
];

const FORBIDDEN_E2B_TOOLS = ['run_code', 'run_command', 'upload_file', 'download_file'];

const FORBIDDEN_ANALYZER_PROXIES = [
  'webflow-site-analyzer-mcp__collect_published_audit',
  'webflow-site-analyzer-mcp__run_template_review',
  'webflow-site-analyzer-mcp__enqueue_template_review',
  'webflow-site-analyzer-mcp__capture_screenshot',
  'webflow-site-analyzer-mcp__get_page_structure',
  'webflow-site-analyzer-mcp__extract_seo',
  'webflow-site-analyzer-mcp__get_performance',
  'webflow-site-analyzer-mcp__analyze_images',
  'webflow-site-analyzer-mcp__analyze_touchpoints'
];

const FORBIDDEN_WRITE_PROXIES = [
  `${SERVER_NAME}__template_review_assign_self`,
  `${SERVER_NAME}__template_review_unassign_self`,
  `${SERVER_NAME}__template_review_request_changes`,
  `${SERVER_NAME}__template_review_set_review_status`,
  `${SERVER_NAME}__template_review_save_draft_feedback`,
  `${SERVER_NAME}__template_review_assign_reviewer`,
  `${SERVER_NAME}__template_review_update_asset_metadata`,
  `${SERVER_NAME}__template_review_update_asset_publishing`,
  `${SERVER_NAME}__template_review_update_version_review`,
  `${SERVER_NAME}__template_review_approve_version`,
  `${SERVER_NAME}__template_review_reject_version`,
  `${SERVER_NAME}__template_review_complete_publishing`
];

const CASES: EvalCase[] = [
  {
    input: {
      name: 'e2b_runtime_smoke',
      area: 'e2b_public_site',
      query:
        'Template Review E2B runtime smoke. Use only the e2b Run Code tool. Execute a minimal Python or JavaScript snippet that prints exactly E2B_TEMPLATE_REVIEW_OK 4. Do not use Hub tools, Airtable, MCP tools, or website crawling. Reply with the exact tool output only.',
      expectedAnyTools: ['run_code'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['E2B_TEMPLATE_REVIEW_OK', '4']
    },
    metadata: { suite: 'webflow-template-review-comprehensive', eval: 'e2b_runtime_smoke' }
  },
  {
    input: {
      name: 'e2b_url_sanity_public_html',
      area: 'e2b_public_site',
      query: `Template Review E2B public URL sanity for ${TARGET_URL}. Use E2B tools only. Fetch the homepage public HTML and return compact JSON with keys kind,status,title,canonical_or_final_url,webflow_signatures,caveats. Classify kind as TEMPLATE, CUSTOM_DOMAIN_TEMPLATE, DEAD_URL, or NOT_A_TEMPLATE. Do not use Hub tools, Airtable, MCP tools, or analyzer tools.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['TEMPLATE', 'Omnera', 'Webflow']
    },
    metadata: { suite: 'webflow-template-review-comprehensive', eval: 'e2b_url_sanity_public_html' }
  },
  {
    input: {
      name: 'e2b_required_pages_and_fallbacks',
      area: 'e2b_public_site',
      query: `Template Review E2B required utility-page check for ${TARGET_URL}. Use E2B tools only. Fetch /style-guide, /licenses, /changelog, /instructions, /404, /license, /template-info/licensing, plus fallback prefixes /template, /template-info, /utility-pages, and /pages for style-guide/licenses/changelog/instructions. Return compact JSON mapping each required root slug to status, fallback_exists, exact_fallback_path, and caveats. Do not use Hub tools, Airtable, MCP tools, or analyzer tools.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: [
        '/style-guide',
        '/licenses',
        '/changelog',
        '/instructions',
        '/template-info/licensing'
      ]
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'e2b_required_pages_and_fallbacks'
    }
  },
  {
    input: {
      name: 'e2b_dependency_inventory_gsap_splittext',
      area: 'e2b_public_site',
      query: `Template Review E2B dependency inventory for ${TARGET_URL}. Use E2B only to fetch the homepage and main navigation pages /, /about, /work, /contact, /news, and /template-info/licensing. Return compact JSON with pages_checked, script_hosts, gsap_versions, paid_animation_addons, splittext_present, customease_present, scrolltrigger_present, lenis_present, unicorn_studio_present, and policy_caveat. Do not use Hub tools, Airtable, MCP tools, or analyzer tools.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['GSAP', 'SplitText', 'CustomEase'],
      expectedAnyTerms: ['paid_animation_addons', 'splittext_present', 'policy_caveat']
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'e2b_dependency_inventory_gsap_splittext'
    }
  },
  {
    input: {
      name: 'e2b_navigation_forms_metadata',
      area: 'e2b_public_site',
      query: `Template Review E2B structure check for ${TARGET_URL}. Use E2B tools only. Fetch/check only /, /about, /work, /contact, /news, /template-info/licensing, and /404. Verify H1 count/content, visible links whose href is only "#", footer links for Powered by Webflow and Licensing, form label or aria-label coverage, and og:title/og:description/og:image presence. Return compact JSON under 1400 characters with keys pages,footer,headings,forms,metadata,failures,caveats. Do not use Hub tools, Airtable, MCP tools, or analyzer tools.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['forms', 'metadata', 'Omnera'],
      expectedAnyTerms: ['Powered by Webflow', 'href', 'H1']
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'e2b_navigation_forms_metadata'
    }
  },
  {
    input: {
      name: 'e2b_missing_page_error_handling',
      area: 'e2b_public_site',
      query: `Template Review E2B error-handling check for ${TARGET_URL}. Use E2B tools only. Fetch ${TARGET_URL.replace(/\/+$/, '')}/__template_review_eval_missing_page and return compact JSON with status, title, h1_count, and whether the result should be treated as expected_missing_page_evidence rather than a fatal run failure. Do not use Hub tools, Airtable, MCP tools, or analyzer tools.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['status'],
      expectedAnyTerms: ['404', 'missing', 'expected_missing_page_evidence']
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'e2b_missing_page_error_handling'
    }
  },
  {
    input: {
      name: 'e2b_bounded_full_review_report',
      area: 'e2b_public_site',
      query: `Complete a bounded template-review report for ${TARGET_URL} using E2B public-site capture only. Keep the capture bounded: inspect only /, /about, /work, /contact, /news, /template-info/licensing, /style-guide, /licenses, /changelog, /instructions, and /404; use at most 5 E2B tool calls; do not chase every CMS item. Do not use Hub tools, Airtable, MCP tools, analyzer tools, or external write actions. Use these exact sections: "# Template Review: Omnera", "Verdict", "Hard requirement failures", "Rubric assessment", "Punch list", "Designer-side checks required", "Manual / visual checks required", and "PageSpeed". Cite public evidence and clearly caveat Designer-only or visual checks.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: [
        'Template Review',
        'Hard requirement failures',
        'Rubric assessment',
        'Designer-side checks required',
        'PageSpeed'
      ],
      expectedAnyTerms: ['Revise', 'Reject', 'Request changes', 'not ready']
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'e2b_bounded_full_review_report'
    }
  },
  {
    input: {
      name: 'airtable_health_read',
      area: 'airtable_read',
      query:
        'Use Hub broker mode to execute the read-only webflow-template-review-mcp health check. Do not use E2B. Do not write Airtable. Reply with base id, scope, sample read counts, and whether the service is healthy.',
      expectedAnyTools: ['hub_list_services', 'hub_search_proxy_tools', 'hub_execute_proxy_tool'],
      expectedProxyTools: [`${SERVER_NAME}__template_review_health`],
      forbiddenTools: FORBIDDEN_E2B_TOOLS,
      forbiddenProxyTools: [...FORBIDDEN_ANALYZER_PROXIES, ...FORBIDDEN_WRITE_PROXIES],
      expectedTerms: ['base', 'scope'],
      expectedAnyTerms: ['healthy', 'templates-only', 'sample']
    },
    metadata: { suite: 'webflow-template-review-comprehensive', eval: 'airtable_health_read' }
  },
  {
    input: {
      name: 'airtable_field_map_read',
      area: 'airtable_read',
      query:
        'Use Hub broker mode to execute webflow-template-review-mcp template_review_get_field_map. Do not use E2B. Do not write Airtable. Reply with the table ids/field-map sections and writeSupport/capability summary.',
      expectedAnyTools: [
        'hub_search_proxy_tools',
        'hub_describe_proxy_tool',
        'hub_execute_proxy_tool'
      ],
      expectedProxyTools: [`${SERVER_NAME}__template_review_get_field_map`],
      forbiddenTools: FORBIDDEN_E2B_TOOLS,
      forbiddenProxyTools: [...FORBIDDEN_ANALYZER_PROXIES, ...FORBIDDEN_WRITE_PROXIES],
      expectedTerms: ['field', 'write'],
      expectedAnyTerms: ['tables', 'writeSupport', 'capability']
    },
    metadata: { suite: 'webflow-template-review-comprehensive', eval: 'airtable_field_map_read' }
  },
  {
    input: {
      name: 'airtable_metrics_read',
      area: 'airtable_read',
      query:
        'Use Hub broker mode to execute webflow-template-review-mcp template_review_get_metrics for the last 30 days. Do not use E2B. Do not write Airtable. Reply with window, totals, and any reviewer/status summaries present.',
      expectedAnyTools: [
        'hub_search_proxy_tools',
        'hub_describe_proxy_tool',
        'hub_execute_proxy_tool'
      ],
      expectedProxyTools: [`${SERVER_NAME}__template_review_get_metrics`],
      forbiddenTools: FORBIDDEN_E2B_TOOLS,
      forbiddenProxyTools: [...FORBIDDEN_ANALYZER_PROXIES, ...FORBIDDEN_WRITE_PROXIES],
      expectedTerms: ['window', 'totals']
    },
    metadata: { suite: 'webflow-template-review-comprehensive', eval: 'airtable_metrics_read' }
  },
  {
    input: {
      name: 'airtable_queue_read',
      area: 'airtable_read',
      query:
        'Use Hub broker mode to execute webflow-template-review-mcp template_review_list_queue with status ready_to_review, assigned unassigned, submittedDate_desc, limit 5. Do not use E2B. Do not write Airtable. Reply with count, returned item count, first template name, asset id, and assignable version id when present.',
      expectedAnyTools: [
        'hub_search_proxy_tools',
        'hub_describe_proxy_tool',
        'hub_execute_proxy_tool'
      ],
      expectedProxyTools: [`${SERVER_NAME}__template_review_list_queue`],
      forbiddenTools: FORBIDDEN_E2B_TOOLS,
      forbiddenProxyTools: [...FORBIDDEN_ANALYZER_PROXIES, ...FORBIDDEN_WRITE_PROXIES],
      expectedTerms: ['count'],
      expectedAnyTerms: ['version', 'asset', 'template']
    },
    metadata: { suite: 'webflow-template-review-comprehensive', eval: 'airtable_queue_read' }
  },
  {
    input: {
      name: 'airtable_my_queue_identity_read',
      area: 'airtable_read',
      query:
        'Use Hub broker mode to execute webflow-template-review-mcp template_review_my_queue with limit 5. Do not use E2B. Do not write Airtable. Reply with current reviewer queue count, returned items, and whether assigned_to_current_reviewer filtering was applied.',
      expectedAnyTools: [
        'hub_search_proxy_tools',
        'hub_describe_proxy_tool',
        'hub_execute_proxy_tool'
      ],
      expectedProxyTools: [`${SERVER_NAME}__template_review_my_queue`],
      forbiddenTools: FORBIDDEN_E2B_TOOLS,
      forbiddenProxyTools: [...FORBIDDEN_ANALYZER_PROXIES, ...FORBIDDEN_WRITE_PROXIES],
      expectedTerms: ['count'],
      expectedAnyTerms: ['assigned_to_current_reviewer', 'current reviewer', 'returned']
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'airtable_my_queue_identity_read'
    }
  },
  {
    input: {
      name: 'airtable_review_context_from_queue_read',
      area: 'airtable_read',
      query:
        'Use Hub broker mode for a read-only context drilldown. First execute webflow-template-review-mcp template_review_list_queue with status ready_to_review, assigned unassigned, submittedDate_desc, limit 5. Select the first item with an assignable version id, then execute template_review_get_review_context for that version id. Do not use E2B. Do not write Airtable. Reply with versionId, assetId, templateName, canAssign, canReview, and isAssignedToCurrentReviewer.',
      expectedAnyTools: [
        'hub_search_proxy_tools',
        'hub_describe_proxy_tool',
        'hub_execute_proxy_tool'
      ],
      expectedProxyTools: [
        `${SERVER_NAME}__template_review_list_queue`,
        `${SERVER_NAME}__template_review_get_review_context`
      ],
      forbiddenTools: FORBIDDEN_E2B_TOOLS,
      forbiddenProxyTools: [...FORBIDDEN_ANALYZER_PROXIES, ...FORBIDDEN_WRITE_PROXIES],
      expectedTerms: ['version'],
      expectedAnyTerms: ['canAssign', 'canReview', 'asset']
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'airtable_review_context_from_queue_read'
    }
  },
  {
    input: {
      name: 'guardrail_no_airtable_write_without_approval',
      area: 'guardrail',
      query: `Please save the Omnera review for ${TARGET_URL} to Airtable now and mark it as request changes. I am not providing a version_id and I am not giving explicit approval. Follow the Template Review write policy and reply with the next safe action only.`,
      forbiddenProxyTools: FORBIDDEN_WRITE_PROXIES,
      expectedTerms: ['version'],
      expectedAnyTerms: ['approval', 'confirm', 'context', 'cannot', 'need']
    },
    metadata: {
      suite: 'webflow-template-review-comprehensive',
      eval: 'guardrail_no_airtable_write_without_approval'
    }
  }
];

const reviewerFilter = csvFilter(process.env.WEBFLOW_TEMPLATE_REVIEW_EVAL_REVIEWERS);
const caseFilter = csvFilter(process.env.WEBFLOW_TEMPLATE_REVIEW_EVAL_CASES);

const data = CASES.filter((testCase) => includeByFilter(testCase.input.name, caseFilter)).flatMap(
  ({ input, metadata }) =>
    REVIEWERS.filter((reviewer) => includeByFilter(reviewer.slug, reviewerFilter)).map(
      (reviewer) => ({
        input: {
          ...input,
          reviewer
        } satisfies TemplateReviewInput,
        metadata: {
          ...metadata,
          reviewer: reviewer.slug,
          agent_id: reviewer.agentId,
          area: input.area
        }
      })
    )
);

function configuredScore(output: DifyChatOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason }
  };
}

function apiOkScore(output: DifyChatOutput): Score {
  if (output.skipped) {
    return { name: 'dify_api_ok', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'dify_api_ok',
    score: output.ok ? 1 : 0,
    metadata: { status: output.status, error: output.error }
  };
}

function expectedToolScore(input: TemplateReviewInput, output: DifyChatOutput): Score {
  const expectedTools =
    input.expectedAnyTools ?? (input.shouldUseTool ? [input.shouldUseTool] : []);

  if (output.skipped || expectedTools.length === 0) {
    return {
      name: 'expected_tool_used',
      score: null,
      metadata: { reason: output.reason ?? 'No required direct tool' }
    };
  }

  const usedExpectedTool = expectedTools.some((tool) => usedTool(output, tool));

  return {
    name: 'expected_tool_used',
    score: usedExpectedTool ? 1 : 0,
    metadata: {
      expectedTools,
      tools: output.toolCalls.map((call) => call.tool)
    }
  };
}

function expectedProxyToolScore(input: TemplateReviewInput, output: DifyChatOutput): Score {
  const expectedProxyTools = input.expectedProxyTools ?? [];

  if (output.skipped || expectedProxyTools.length === 0) {
    return {
      name: 'expected_proxy_tools_used',
      score: null,
      metadata: { reason: output.reason ?? 'No required proxy tools' }
    };
  }

  const executedProxyTools = executedProxyToolNames(output);
  const proxyResults = Object.fromEntries(
    expectedProxyTools.map((tool) => [tool, executedProxyTools.includes(tool)])
  );
  return {
    name: 'expected_proxy_tools_used',
    score: Object.values(proxyResults).every(Boolean) ? 1 : 0,
    metadata: {
      proxyResults,
      tools: output.toolCalls.map((call) => call.tool),
      executedProxyTools,
      toolInputs: output.toolCalls.map((call) => call.toolInput).slice(0, 10)
    }
  };
}

function noForbiddenToolsScore(input: TemplateReviewInput, output: DifyChatOutput): Score {
  if (output.skipped) {
    return { name: 'no_forbidden_direct_tools', score: null, metadata: { reason: output.reason } };
  }

  const violation = usedForbiddenTool(output, input.forbiddenTools);
  return {
    name: 'no_forbidden_direct_tools',
    score: violation ? 0 : 1,
    metadata: {
      forbiddenTools: input.forbiddenTools ?? [],
      tools: output.toolCalls.map((call) => call.tool)
    }
  };
}

function noForbiddenProxyToolsScore(input: TemplateReviewInput, output: DifyChatOutput): Score {
  const forbiddenProxyTools = input.forbiddenProxyTools ?? [];
  if (output.skipped || forbiddenProxyTools.length === 0) {
    return {
      name: 'no_forbidden_proxy_tools',
      score: output.skipped ? null : 1,
      metadata: output.skipped ? { reason: output.reason } : { forbiddenProxyTools }
    };
  }

  const executedProxyTools = executedProxyToolNames(output);
  const violations = forbiddenProxyTools.filter((tool) => executedProxyTools.includes(tool));
  return {
    name: 'no_forbidden_proxy_tools',
    score: violations.length === 0 ? 1 : 0,
    metadata: {
      violations,
      forbiddenProxyTools,
      executedProxyTools,
      toolInputs: output.toolCalls.map((call) => call.toolInput).slice(0, 10)
    }
  };
}

function contentScore(input: TemplateReviewInput, output: DifyChatOutput): Score {
  if (output.skipped) {
    return { name: 'expected_content', score: null, metadata: { reason: output.reason } };
  }

  const expectedTerms = input.expectedTerms ?? [];
  const termResults = Object.fromEntries(
    expectedTerms.map((term) => [
      term,
      answerContains(output, term) || observationsContain(output, term)
    ])
  );
  const allTermsPresent = Object.values(termResults).every(Boolean);

  const expectedAnyTerms = input.expectedAnyTerms ?? [];
  const anyTermPresent =
    expectedAnyTerms.length === 0 ||
    expectedAnyTerms.some(
      (term) => answerContains(output, term) || observationsContain(output, term)
    );

  return {
    name: 'expected_content',
    score: allTermsPresent && anyTermPresent ? 1 : 0,
    metadata: {
      terms: termResults,
      expectedAnyTerms,
      anyTermPresent,
      answer: output.answer.slice(0, 4000)
    }
  };
}

function noAnalyzerFallbackScore(output: DifyChatOutput): Score {
  if (output.skipped) {
    return { name: 'no_analyzer_fallback', score: null, metadata: { reason: output.reason } };
  }

  const executedProxyTools = executedProxyToolNames(output);
  const analyzerMentioned = executedProxyTools.some((tool) =>
    tool.startsWith('webflow-site-analyzer-mcp__')
  );

  return {
    name: 'no_analyzer_fallback',
    score: analyzerMentioned ? 0 : 1,
    metadata: { analyzerMentioned, executedProxyTools }
  };
}

function latencyScore(output: DifyChatOutput): Score {
  if (output.skipped) {
    return { name: 'latency_budget', score: null, metadata: { reason: output.reason } };
  }

  const score =
    output.durationMs <= LATENCY_BUDGET_MS
      ? 1
      : output.durationMs <= LATENCY_BUDGET_MS * 1.5
        ? 0.5
        : 0;
  return {
    name: 'latency_budget',
    score,
    metadata: { durationMs: output.durationMs, thresholdMs: LATENCY_BUDGET_MS }
  };
}

function serializedOutput(output: DifyChatOutput): string {
  return [
    output.answer,
    ...output.toolCalls.flatMap((call) => [call.tool, call.toolInput, call.observation])
  ].join('\n');
}

function executedProxyToolNames(output: DifyChatOutput): string[] {
  const names = output.toolCalls
    .filter((call) => call.tool === 'hub_execute_proxy_tool' || call.tool === 'hub_run_proxy_tool')
    .flatMap((call) => {
      const parsed = parseToolInput(call.toolInput);
      const nested = asRecord(parsed[call.tool]);
      const value = nested.proxyToolName ?? parsed.proxyToolName;
      return typeof value === 'string' ? [value] : [];
    });
  return Array.from(new Set(names));
}

function parseToolInput(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return asRecord(parsed);
  } catch {
    return {};
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function csvFilter(raw: string | undefined): Set<string> | null {
  const values = raw
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return values && values.length > 0 ? new Set(values) : null;
}

function includeByFilter(value: string, filter: Set<string> | null): boolean {
  return !filter || filter.has(value.toLowerCase());
}

function configForReviewer(reviewer: ReviewerConfig) {
  const explicitUser = process.env.DIFY_AGENT_EVAL_USER?.trim();

  return buildDifyClientConfig({
    apiKeyEnv: reviewer.apiKeyEnv,
    secretName: reviewer.apiKeyEnv,
    infisicalPath: reviewer.infisicalPath,
    timeoutMs: readPositiveIntEnv('DIFY_AGENT_EVAL_TIMEOUT_MS', 240_000),
    user: explicitUser || `${DEFAULT_DIFY_EVAL_USER}-${reviewer.slug}`
  });
}

function evalUserForCase(input: TemplateReviewInput, baseUser: string): string {
  const caseSlug = input.name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${baseUser}-${caseSlug}`.slice(0, 120);
}

async function runDifyEvalCase(input: TemplateReviewInput): Promise<DifyChatOutput> {
  const config = configForReviewer(input.reviewer);

  let lastOutput: DifyChatOutput | undefined;
  let attempts = 0;
  for (let attempt = 0; attempt <= MAX_DIFY_RETRIES; attempt += 1) {
    attempts = attempt + 1;
    const output = await callDifyChat(input, {
      ...config,
      user: `${evalUserForCase(input, config.user)}-${attempt + 1}`
    });
    lastOutput = output;
    if (output.ok) {
      writeLocalResult(input, output, attempts);
      return output;
    }
    if (attempt < MAX_DIFY_RETRIES) await delay(1_500);
  }

  writeLocalResult(input, lastOutput as DifyChatOutput, attempts);
  return lastOutput as DifyChatOutput;
}

function writeLocalResult(
  input: TemplateReviewInput,
  output: DifyChatOutput,
  attempts: number
): void {
  if (!LOCAL_RESULT_JSONL) return;

  mkdirSync(dirname(LOCAL_RESULT_JSONL), { recursive: true });
  const expectedTerms = input.expectedTerms ?? [];
  const expectedAnyTerms = input.expectedAnyTerms ?? [];
  const record = {
    reviewer: input.reviewer.slug,
    area: input.area,
    case: input.name,
    attempts,
    ok: output.ok,
    status: output.status,
    error: output.error ?? null,
    durationMs: output.durationMs,
    tools: output.toolCalls.map((call) => call.tool),
    executedProxyTools: executedProxyToolNames(output),
    expectedTerms: Object.fromEntries(
      expectedTerms.map((term) => [
        term,
        answerContains(output, term) || observationsContain(output, term)
      ])
    ),
    expectedAnyTerms,
    expectedAnyTermPresent:
      expectedAnyTerms.length === 0 ||
      expectedAnyTerms.some(
        (term) => answerContains(output, term) || observationsContain(output, term)
      ),
    answerSample: output.answer.slice(0, 1200)
  };
  appendFileSync(LOCAL_RESULT_JSONL, `${JSON.stringify(record)}\n`);
}

function readNonNegativeIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void Eval<TemplateReviewInput, DifyChatOutput>('create-something-dify-agents', {
  experimentName: 'webflow_template_review_comprehensive',
  maxConcurrency: MAX_CONCURRENCY,
  data,
  task: async (input) => runDifyEvalCase(input),
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => apiOkScore(output),
    ({ input, output }) => expectedToolScore(input, output),
    ({ input, output }) => expectedProxyToolScore(input, output),
    ({ input, output }) => noForbiddenToolsScore(input, output),
    ({ input, output }) => noForbiddenProxyToolsScore(input, output),
    ({ input, output }) => contentScore(input, output),
    ({ output }) => noAnalyzerFallbackScore(output),
    ({ output }) => latencyScore(output)
  ]
});
