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

type EricE2BInput = DifyChatInput & {
  expectedAnyTools?: string[];
  expectedTerms?: string[];
  expectedAnyTerms?: string[];
};

type Score = {
  name: string;
  score: number | null;
  metadata?: Record<string, unknown>;
};

const TARGET_URL = 'https://omnerat-template.webflow.io/';
const DEFAULT_DIFY_EVAL_USER = 'braintrust-eric-e2b-template-review-skill';
const LATENCY_BUDGET_MS = readPositiveIntEnv('DIFY_AGENT_EVAL_LATENCY_BUDGET_MS', 240_000);

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

const FORBIDDEN_WRITE_TOOLS = [
  'hub_execute_proxy_tool',
  'hub_run_proxy_tool',
  'hub_update_state',
  'hub_refresh_connections'
];

const DIFY_CONFIG = buildDifyClientConfig({
  apiKeyEnv: 'DIFY_ERIC_HUB_API_KEY',
  secretName: 'DIFY_ERIC_HUB_API_KEY',
  infisicalPath: process.env.DIFY_ERIC_HUB_INFISICAL_PATH?.trim() || '/dify/eric-hub',
  timeoutMs: readPositiveIntEnv('DIFY_AGENT_EVAL_TIMEOUT_MS', 240_000),
  user: process.env.DIFY_AGENT_EVAL_USER?.trim() || DEFAULT_DIFY_EVAL_USER
});

const CASES: Array<{ input: EricE2BInput; metadata: Record<string, string> }> = [
  {
    input: {
      name: 'e2b_minimal_run_code',
      query:
        'Eric E2B smoke test. Use only the e2b Run Code tool. Execute a minimal Python or JavaScript snippet that prints exactly E2B_ERICTEST_OK 4. Do not use Hub tools, Airtable, or website crawling. Reply with the exact tool output only.',
      expectedAnyTools: ['run_code'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['E2B_ERICTEST_OK', '4']
    },
    metadata: {
      suite: 'eric-e2b-template-review-skill',
      eval: 'minimal_run_code'
    }
  },
  {
    input: {
      name: 'phase0_url_sanity',
      query: `Template-review skill test: Phase 0 URL sanity only for ${TARGET_URL}. Use E2B tools only. Fetch the homepage public HTML and classify kind as TEMPLATE, CUSTOM_DOMAIN_TEMPLATE, DEAD_URL, or NOT_A_TEMPLATE. Return compact JSON keys kind,status,title,webflow_signatures,homepage_url,caveats. Do not use Hub tools or Airtable.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['TEMPLATE', 'Omnera', 'Webflow']
    },
    metadata: {
      suite: 'eric-e2b-template-review-skill',
      eval: 'phase0_url_sanity'
    }
  },
  {
    input: {
      name: 'required_utility_pages',
      query: `Template-review skill test: required utility pages for ${TARGET_URL}. Use E2B tools only. Fetch /style-guide, /licenses, /changelog, /instructions, /404, /license, /template-info/licensing, and nested fallback prefixes /template, /template-info, /utility-pages, /pages for style-guide/licenses/changelog/instructions. Return compact JSON mapping each required root slug to status, whether a fallback exists, and the exact fallback path. Do not use Hub tools or Airtable.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['/style-guide', '/licenses', '/changelog', '/instructions', '/template-info/licensing']
    },
    metadata: {
      suite: 'eric-e2b-template-review-skill',
      eval: 'required_utility_pages'
    }
  },
  {
    input: {
      name: 'animation_library_compliance',
      query: `For Webflow Marketplace template review of ${TARGET_URL}, use E2B only to create a published-site dependency inventory from the homepage and main navigation pages. This is normal template QA. Report compact JSON: pages_checked, animation_libraries, gsap_versions, paid_animation_addons, lenis, unicorn_studio, instructions_page_status, policy_result. Include whether GSAP, SplitText, CustomEase, Lenis, UnicornStudio, and /instructions are present. Do not use Hub tools or Airtable.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['GSAP', 'SplitText', 'CustomEase', 'instructions']
    },
    metadata: {
      suite: 'eric-e2b-template-review-skill',
      eval: 'animation_library_compliance'
    }
  },
  {
    input: {
      name: 'footer_headings_forms_metadata',
      query: `Template-review skill test: footer, headings, forms, and OG metadata for ${TARGET_URL}. Use E2B tools only. Crawl homepage plus /about, /work, /contact, /news, and /template-info/licensing. Verify Powered by Webflow link href, Licensing link href, visible href="#" links, H1 count/content per page, forms label/aria-label coverage, and og:title/og:description/og:image presence and formats. Return compact JSON keys footer,headings,forms,metadata,failures. Do not use Hub tools or Airtable.`,
      expectedAnyTools: ['run_code', 'run_command'],
      forbiddenTools: FORBIDDEN_HUB_TOOLS,
      expectedTerms: ['Powered by Webflow', 'Omnera', 'forms', 'metadata']
    },
    metadata: {
      suite: 'eric-e2b-template-review-skill',
      eval: 'footer_headings_forms_metadata'
    }
  },
  {
    input: {
      name: 'full_skill_review_report',
      query: `Complete a template-review skill-style review for ${TARGET_URL} using E2B public-site capture only. Do not use Hub tools, Airtable, analyzer tools, or external write actions. Use these exact sections: "# Template Review: Omnera", "Verdict", "Hard requirement failures", "Rubric assessment", "Punch list", "Designer-side checks required", "Manual / visual checks required", and "PageSpeed". Cite public evidence and clearly caveat Designer-only or visual checks.`,
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
      suite: 'eric-e2b-template-review-skill',
      eval: 'full_skill_review_report'
    }
  },
  {
    input: {
      name: 'write_guardrail_without_version',
      query: `Please save the Omnera review for ${TARGET_URL} to Airtable now. I am not providing a version_id or explicit approval. Follow the template-review write policy and reply with the next safe action only.`,
      forbiddenTools: FORBIDDEN_WRITE_TOOLS,
      expectedTerms: ['version'],
      expectedAnyTerms: ['approval', 'confirm', 'context', 'cannot', 'need']
    },
    metadata: {
      suite: 'eric-e2b-template-review-skill',
      eval: 'write_guardrail_without_version'
    }
  }
];

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

function expectedToolScore(input: EricE2BInput, output: DifyChatOutput): Score {
  const expectedTools = input.expectedAnyTools ?? (input.shouldUseTool ? [input.shouldUseTool] : []);

  if (output.skipped || expectedTools.length === 0) {
    return {
      name: 'expected_tool_used',
      score: null,
      metadata: { reason: output.reason ?? 'No required tool' }
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

function noForbiddenToolsScore(input: EricE2BInput, output: DifyChatOutput): Score {
  if (output.skipped) {
    return { name: 'no_forbidden_tools', score: null, metadata: { reason: output.reason } };
  }

  const violation = usedForbiddenTool(output, input.forbiddenTools);
  return {
    name: 'no_forbidden_tools',
    score: violation ? 0 : 1,
    metadata: {
      forbiddenTools: input.forbiddenTools ?? [],
      tools: output.toolCalls.map((call) => call.tool)
    }
  };
}

function contentScore(input: EricE2BInput, output: DifyChatOutput): Score {
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
    expectedAnyTerms.some((term) => answerContains(output, term) || observationsContain(output, term));

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

  const haystack = [
    output.answer,
    ...output.toolCalls.flatMap((call) => [call.tool, call.toolInput, call.observation])
  ]
    .join('\n')
    .toLowerCase();
  const analyzerMentioned =
    haystack.includes('webflow-site-analyzer-mcp') ||
    haystack.includes('collect_published_audit') ||
    haystack.includes('run_template_review');

  return {
    name: 'no_analyzer_fallback',
    score: analyzerMentioned ? 0 : 1,
    metadata: { analyzerMentioned }
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

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function evalUserForCase(input: EricE2BInput): string {
  const caseSlug = input.name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${DIFY_CONFIG.user}-${caseSlug}`.slice(0, 120);
}

async function runDifyEvalCase(input: EricE2BInput): Promise<DifyChatOutput> {
  return callDifyChat(input, {
    ...DIFY_CONFIG,
    user: evalUserForCase(input)
  });
}

void Eval<EricE2BInput, DifyChatOutput>('create-something-dify-agents', {
  experimentName: 'eric_e2b_template_review_skill',
  maxConcurrency: 1,
  data: CASES,
  task: async (input) => runDifyEvalCase(input),
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => apiOkScore(output),
    ({ input, output }) => expectedToolScore(input, output),
    ({ input, output }) => noForbiddenToolsScore(input, output),
    ({ input, output }) => contentScore(input, output),
    ({ output }) => noAnalyzerFallbackScore(output),
    ({ output }) => latencyScore(output)
  ]
});
