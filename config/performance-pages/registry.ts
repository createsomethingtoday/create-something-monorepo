import type {
  PerformancePageArchetype,
  PerformancePageContract,
  PerformancePageRegistryGroup
} from '../../packages/canon/src/lib/components/performance/page-contract.ts';

export const performancePageRegistry: PerformancePageRegistryGroup[] = [
  group(
    'agency-home',
    'agency',
    ['/'],
    'migrated',
    contract(
      'landing',
      'Decide whether one workflow is ready to map.',
      'The indexed operating stage binds the workflow map to Signal, Decision, and Proof.',
      'Map one workflow'
    )
  ),
  group(
    'agency-commercial',
    'agency',
    [
      'about',
      'cloudflare',
      'contact',
      'control',
      'partners',
      'security',
      'services',
      'stack',
      'use-cases/business',
      'use-cases/enterprise'
    ],
    'migrated',
    contract(
      'commercial',
      'Decide whether the operating boundary and engagement fit.',
      'A scoped workflow boundary, operating artifact, or field result demonstrates fit.',
      'Choose the next bounded commitment'
    )
  ),
  group(
    'agency-commercial-detail',
    'agency',
    [
      'bearer-token-policy',
      'field-reports/template-review',
      'methodology',
      'practice',
      'proof/marketplace-workflow'
    ],
    'migrated',
    contract(
      'editorial',
      'Assess the operating argument and decide whether to apply its boundary.',
      'The field report, implementation artifact, or policy evidence supports the argument.',
      'Apply the proven boundary to one workflow'
    )
  ),
  group(
    'agency-delivery-index',
    'agency',
    ['delivery'],
    'migrated',
    contract(
      'index',
      'Choose the delivery record that needs review.',
      'The collection exposes client-safe state, outcome, and a direct review destination.',
      'Open one delivery record'
    )
  ),
  group(
    'agency-delivery-tool',
    'agency',
    ['delivery/abundance'],
    'migrated',
    contract(
      'tool',
      'Review the delivery state and resolve the next client-safe question.',
      'The delivery surface separates public artifacts, private evidence, agent guidance, and owner decisions.',
      'Ask, inspect, or hand off the next governed decision'
    )
  ),
  group(
    'agency-public-index',
    'agency',
    ['experiments', 'field-reports', 'products'],
    'migrated',
    contract(
      'index',
      'Choose the most useful proof or product path to inspect.',
      'The browsable collection exposes current artifacts, states, and destinations.',
      'Inspect one relevant item'
    )
  ),
  group(
    'agency-public-detail',
    'agency',
    [
      'experiments/[slug]',
      'products/decision',
      'products/ground',
      'products/loom',
      'products/proof',
      'products/signal'
    ],
    'migrated',
    contract(
      'editorial',
      'Understand the product or experiment boundary and decide where it applies.',
      'A route-owned product contract or experiment result makes the boundary inspectable.',
      'Continue to the related operating path'
    )
  ),
  group(
    'agency-public-tools',
    'agency',
    [
      'basketball-systems-lab',
      'book',
      'dashboard',
      'map',
      'map/share/[token]',
      'map/subscribe',
      'map/workspace',
      'map/workspace/[mapId]',
      'map/workspace/[mapId]/handoff/[handoffId]',
      'mcp-access',
      'mcp-access/tools',
      'prospects'
    ],
    'pending',
    contract(
      'tool',
      'Complete the current workflow task with visible ownership and state.',
      'The work surface exposes source state, policy, readiness, and receipt.',
      'Commit or hand off the next governed action'
    )
  ),
  group(
    'agency-account',
    'agency',
    ['account', 'login'],
    'pending',
    contract(
      'tool',
      'Complete the identity or account task and return to owned work.',
      'The session and access state explain what is available and why.',
      'Continue to the authorized surface'
    )
  ),
  group(
    'agency-admin',
    'agency',
    [
      'admin/capture',
      'admin/community',
      'admin/funnel',
      'admin/funnel/leads/new',
      'admin/funnel/record',
      'admin/governance',
      'admin/map',
      'admin/security',
      'admin/security/audit',
      'admin/security/bearer-tokens',
      'admin/security/commercial',
      'admin/security/contracts',
      'admin/security/partners',
      'admin/security/seeds',
      'admin/social'
    ],
    'pending',
    contract(
      'tool',
      'Resolve the current administrative decision without losing source, owner, or proof.',
      'The operator workspace exposes record state, policy, and the resulting receipt.',
      'Apply or hand off the governed change'
    )
  ),
  group(
    'agency-legal',
    'agency',
    ['privacy', 'terms'],
    'migrated',
    contract(
      'editorial',
      'Understand the governing policy before using the service.',
      'The published policy text is the authoritative evidence.',
      'Return to the relevant service path'
    )
  ),
  exclusion(
    'agency-auth-callbacks',
    'agency',
    ['auth/callback', 'auth/cross-domain'],
    'callback',
    'Completes identity exchange state and routes the visitor back to the requesting product surface.'
  ),
  exclusion(
    'agency-notion-redirect',
    'agency',
    ['notion'],
    'redirect',
    'Retains a compatibility route that redirects retired Notion positioning to the owned stack page.'
  ),
  exclusion(
    'agency-dify-redirect',
    'agency',
    ['dify'],
    'redirect',
    'Preserves an edge compatibility route that redirects retired Dify positioning to the owned stack page.'
  ),
  exclusion(
    'agency-dify-archive-redirects',
    'agency',
    [
      'dify/agent-eval-gates',
      'dify/mcp-control-plane',
      'dify/ship-dify-app-with-mcp-tools',
      'dify/template-marketplace-proof'
    ],
    'redirect',
    'Retains checked-in historical implementation context behind live compatibility routes that redirect the retired Dify cluster to the owned stack page.'
  ),

  group(
    'ltd-home',
    'ltd',
    ['/'],
    'migrated',
    contract(
      'landing',
      'Choose the canon lens that should govern the work.',
      'The indexed canon stage pairs each principle with its source and consequence.',
      'Continue through the property sequence'
    )
  ),
  group(
    'ltd-editorial',
    'ltd',
    [
      'ethos',
      'experiments/the-circle-closes',
      'standards',
      'taste',
      'voice'
    ],
    'migrated',
    contract(
      'editorial',
      'Understand the governing principle and decide how it changes the work.',
      'Canon sources, examples, and explicit standards support the principle.',
      'Apply the principle or inspect its source'
    )
  ),
  group(
    'ltd-canon-indexes',
    'ltd',
    ['canon', 'masters', 'patterns', 'presentations', 'principles'],
    'pending',
    contract(
      'index',
      'Choose the canon, master, pattern, or presentation most relevant to the current decision.',
      'The collection exposes provenance, status, and a direct destination.',
      'Open one source in context'
    )
  ),
  group(
    'ltd-public-tools',
    'ltd',
    ['brand', 'taste/insights'],
    'pending',
    contract(
      'tool',
      'Inspect the current brand or taste system state and decide what to use next.',
      'The asset library or analytics surface exposes source material, state, and direct actions.',
      'Use the relevant asset, source, or recovery path'
    )
  ),
  group(
    'ltd-canon-details',
    'ltd',
    ['canon/[...path]', 'masters/[slug]', 'patterns/[slug]'],
    'pending',
    contract(
      'editorial',
      'Interpret one canon source and decide how to use it.',
      'The source text, lineage, and applied example make the interpretation inspectable.',
      'Continue to the related canon path'
    )
  ),
  group(
    'ltd-presentations',
    'ltd',
    [
      'presentations/[slug]/script',
      'presentations/abundance-system',
      'presentations/beads-continuity',
      'presentations/canon-design',
      'presentations/claude-code-partner',
      'presentations/cloudflare-edge',
      'presentations/deployment-dwelling',
      'presentations/developer-onboarding',
      'presentations/heidegger-canon',
      'presentations/hub',
      'presentations/user-onboarding',
      'presentations/workway'
    ],
    'pending',
    contract(
      'editorial',
      'Follow the presentation argument and decide which practice it supports.',
      'The ordered slides or script connect the thesis to concrete examples.',
      'Use or continue the presentation'
    )
  ),
  group(
    'ltd-account',
    'ltd',
    ['account', 'login'],
    'pending',
    contract(
      'tool',
      'Complete the identity or account task and return to Canon work.',
      'The session and access state explain what is available and why.',
      'Continue to the authorized surface'
    )
  ),
  group(
    'ltd-legal',
    'ltd',
    ['privacy', 'terms'],
    'pending',
    contract(
      'editorial',
      'Understand the governing policy before using the property.',
      'The published policy text is the authoritative evidence.',
      'Return to the relevant canon path'
    )
  ),
  exclusion(
    'ltd-auth-callbacks',
    'ltd',
    ['auth/callback', 'auth/cross-domain'],
    'callback',
    'Completes identity exchange state and routes the visitor back to the requesting Canon surface.'
  ),

  group(
    'io-home',
    'io',
    ['/'],
    'migrated',
    contract(
      'landing',
      'Choose the research question worth validating next.',
      'The indexed research stage pairs each decision with featured work and methods.',
      'Continue into the research practice'
    )
  ),
  group(
    'io-orientation',
    'io',
    ['about', 'contact', 'docs', 'docs/ground', 'docs/loom', 'methodology'],
    'pending',
    contract(
      'editorial',
      'Understand the research or tool boundary and decide where to continue.',
      'Methods, documentation, and concrete examples support the boundary.',
      'Continue to the relevant research or tool'
    )
  ),
  group(
    'io-catalogs',
    'io',
    ['agents', 'categories', 'experiments', 'mcp', 'papers', 'plugins'],
    'pending',
    contract(
      'index',
      'Choose the most relevant research artifact, agent, experiment, or plugin.',
      'The collection exposes status, metadata, and direct destinations.',
      'Inspect one item in context'
    )
  ),
  group(
    'io-catalog-details',
    'io',
    ['agents/[slug]', 'category/[slug]', 'mcp/[slug]', 'plugins/[slug]'],
    'pending',
    contract(
      'editorial',
      'Assess the artifact boundary and decide whether it fits the current work.',
      'The artifact contract, metadata, and examples make fit inspectable.',
      'Continue to the related artifact or method'
    )
  ),
  group(
    'io-papers',
    'io',
    [
      'papers/[slug]',
      'papers/agent-sdk-gemini-tools-integration',
      'papers/agent-sdk-model-routing-optimization',
      'papers/analyzer-mcp-review-architecture',
      'papers/animation-spec-architecture',
      'papers/autonomous-harness-architecture',
      'papers/beads-cross-session-memory',
      'papers/beads-integration-patterns',
      'papers/code-mode-hermeneutic-analysis',
      'papers/codex-orchestration',
      'papers/cumulative-state-antipattern',
      'papers/dual-agent-routing-experiment',
      'papers/ethos-transfer-agentic-engineering',
      'papers/ground-case-study',
      'papers/ground-evidence-based-claims',
      'papers/haiku-optimization',
      'papers/haiku-ultrathink-validation',
      'papers/harness-agent-sdk-migration',
      'papers/hermeneutic-debugging',
      'papers/hermeneutic-spiral-ux',
      'papers/hermeneutic-triad-review',
      'papers/intellectual-genealogy',
      'papers/kickstand-triad-audit',
      'papers/norvig-partnership',
      'papers/observability-infrastructure',
      'papers/open-weight-models-mcp-guidance',
      'papers/ralph-implementation',
      'papers/ralph-vs-gastown',
      'papers/recursive-language-models',
      'papers/spec-driven-development',
      'papers/subtractive-form-design',
      'papers/subtractive-studio',
      'papers/teaching-modalities-experiment',
      'papers/three-tier-framework',
      'papers/threshold-dwelling',
      'papers/tufte-mobile-optimization',
      'papers/understanding-graphs',
      'papers/webflow-dashboard-refactor',
      'papers/webflow-template-review-webmcp',
      'papers/workers-vs-python-sdk-plagiarism-detection',
      'papers/wrap-pattern'
    ],
    'pending',
    contract(
      'editorial',
      'Understand the paper thesis and decide whether its evidence changes the practice.',
      'The paper body, sources, experiment, or implementation evidence supports the thesis.',
      'Continue to related research or apply the finding'
    )
  ),
  group(
    'io-insights',
    'io',
    ['insights/cumulative-state-antipattern', 'insights/tool-betrayal'],
    'pending',
    contract(
      'editorial',
      'Recognize the operating failure and decide how to change the practice.',
      'A concrete failure pattern and its evidence support the intervention.',
      'Apply the intervention or read the deeper research'
    )
  ),
  group(
    'io-experiments',
    'io',
    [
      'experiments/[slug]',
      'experiments/agent-operations',
      'experiments/agentic-visualization',
      'experiments/ai-native-filtering',
      'experiments/ascii-renderer',
      'experiments/awwwards-patterns',
      'experiments/canvas-interactivity',
      'experiments/data-patterns',
      'experiments/diagrams',
      'experiments/hybrid-scheduling',
      'experiments/ic-mvp-pipeline',
      'experiments/kinetic-typography',
      'experiments/living-arena',
      'experiments/living-arena-gpu',
      'experiments/render-preview',
      'experiments/render-studio',
      'experiments/spritz',
      'experiments/text-revelation',
      'visualizations/arena-scale'
    ],
    'pending',
    contract(
      'tool',
      'Exercise the experiment and decide what its resulting state proves.',
      'The live work surface, controls, and resulting state expose the experiment evidence.',
      'Continue to the related research or next test'
    )
  ),
  group(
    'io-public-tools',
    'io',
    ['graph', 'status'],
    'pending',
    contract(
      'tool',
      'Inspect the current system state and decide what to investigate next.',
      'The graph or status surface exposes source state, health, and evidence.',
      'Open the relevant record or recovery path'
    )
  ),
  group(
    'io-subscription',
    'io',
    ['confirm', 'subscribe', 'unsubscribe'],
    'pending',
    contract(
      'commercial',
      'Complete the publication subscription decision with clear state.',
      'The current subscription state and destination confirm the result.',
      'Continue to the publication or update the subscription'
    )
  ),
  group(
    'io-account',
    'io',
    ['account', 'login'],
    'pending',
    contract(
      'tool',
      'Complete the identity or account task and return to research work.',
      'The session and access state explain what is available and why.',
      'Continue to the authorized surface'
    )
  ),
  group(
    'io-admin',
    'io',
    [
      'admin',
      'admin/agent-drafts',
      'admin/analytics',
      'admin/experiments',
      'admin/login',
      'admin/observability',
      'admin/submissions',
      'admin/subscribers',
      'admin/tufte-dashboard'
    ],
    'pending',
    contract(
      'tool',
      'Resolve the current research administration decision with visible source and state.',
      'The operator workspace exposes records, policy, observability, and resulting state.',
      'Apply or hand off the governed change'
    )
  ),
  group(
    'io-legal',
    'io',
    ['privacy', 'terms'],
    'pending',
    contract(
      'editorial',
      'Understand the governing policy before using the property.',
      'The published policy text is the authoritative evidence.',
      'Return to the relevant research path'
    )
  ),
  exclusion(
    'io-auth-callbacks',
    'io',
    ['auth/callback', 'auth/cross-domain'],
    'callback',
    'Completes identity exchange state and routes the visitor back to the requesting research surface.'
  ),

  group(
    'learn-home',
    'lms',
    ['/'],
    'migrated',
    contract(
      'landing',
      'Choose the learning path that builds the next workflow capability.',
      'The indexed course stage preserves every lesson, proof object, and destination.',
      'Begin or continue one path'
    )
  ),
  group(
    'learn-path-index',
    'lms',
    ['paths'],
    'pending',
    contract(
      'index',
      "Choose the path that matches the learner's current capability.",
      'The path collection exposes objectives, sequence, duration, and progress.',
      'Open one learning path'
    )
  ),
  group(
    'learn-paths',
    'lms',
    ['paths/[id]', 'paths/[id]/[lesson]', 'seeing', 'seeing/[lesson]'],
    'pending',
    contract(
      'learning',
      'Complete the current learning objective and decide what to practice next.',
      'The lesson sequence, exercise, and completion state demonstrate progress.',
      'Continue to the next lesson or practice'
    )
  ),
  group(
    'learn-progress',
    'lms',
    ['progress'],
    'pending',
    contract(
      'tool',
      'Inspect learning state and choose the next incomplete objective.',
      'The progress record exposes completed work and remaining sequence.',
      'Resume the next lesson'
    )
  ),
  group(
    'learn-account',
    'lms',
    ['account', 'auth/magic', 'login', 'signup'],
    'pending',
    contract(
      'tool',
      'Complete the identity or account task and return to learning.',
      'The session and enrollment state explain what is available and why.',
      'Continue to the authorized learning surface'
    )
  ),
  group(
    'learn-legal',
    'lms',
    ['privacy'],
    'pending',
    contract(
      'editorial',
      'Understand the learning property privacy boundary.',
      'The published policy text is the authoritative evidence.',
      'Return to the relevant learning path'
    )
  ),

  group(
    'space-home',
    'space',
    ['/'],
    'pending',
    contract(
      'landing',
      'Choose which material, data, or motion experiment to inspect.',
      'The property index exposes current experiments and their operating states.',
      'Open one experiment'
    )
  ),
  group(
    'space-indexes',
    'space',
    ['data', 'discover'],
    'pending',
    contract(
      'index',
      'Choose the dataset or concept most useful to explore.',
      'The collection exposes the available studies, states, and destinations.',
      'Open one study'
    )
  ),
  group(
    'space-editorial',
    'space',
    ['discover/[concept]', 'praxis'],
    'pending',
    contract(
      'editorial',
      'Understand the experiment concept and decide how it changes practice.',
      'The concept, example, and observed behavior support the interpretation.',
      'Continue to a related experiment'
    )
  ),
  group(
    'space-nba-tools',
    'space',
    [
      'data/nba',
      'data/nba/clutch',
      'data/nba/defensive-impact',
      'data/nba/duo-synergy',
      'data/nba/league-insights',
      'data/nba/overtime',
      'data/nba/pace',
      'data/nba/shot-network'
    ],
    'pending',
    contract(
      'tool',
      'Inspect the selected basketball state and decide what the data supports.',
      'The live data view, filters, and resulting metrics expose the evidence.',
      'Continue to the next relevant comparison'
    )
  ),
  group(
    'space-experiment-tools',
    'space',
    ['motion', 'playground'],
    'pending',
    contract(
      'tool',
      'Exercise the experiment and decide what its resulting state proves.',
      'The work surface, controls, and resulting state expose the experiment evidence.',
      'Continue to the next test or related concept'
    )
  ),

  group(
    'ona-agent-index',
    'ona-agents',
    ['agents'],
    'pending',
    contract(
      'index',
      'Choose the agent whose owned boundary matches the current work.',
      'The agent collection exposes purpose, owner, readiness, and destination.',
      'Inspect one agent'
    )
  ),
  group(
    'ona-agent-detail',
    'ona-agents',
    ['agents/[agentId]'],
    'pending',
    contract(
      'tool',
      'Inspect or operate one agent with visible authority and proof.',
      'The agent surface exposes state, policy, inputs, output, and receipt.',
      'Run, stop, or hand off the governed action'
    )
  ),
  group(
    'ona-sign-in',
    'ona-agents',
    ['sign-in'],
    'pending',
    contract(
      'tool',
      'Complete sign-in and return to the authorized agent surface.',
      'The access state explains the allowed next destination.',
      'Continue to the authorized agent'
    )
  )
];

function group(
  id: string,
  property: string,
  routes: string[],
  status: 'pending' | 'migrated',
  pageContract: Omit<PerformancePageContract, 'id'>
): PerformancePageRegistryGroup {
  return {
    id,
    property,
    sources: routeSources(property, routes),
    status,
    contract: pageContract
  };
}

function exclusion(
  id: string,
  property: string,
  routes: string[],
  kind: 'callback' | 'redirect' | 'machine',
  reason: string
): PerformancePageRegistryGroup {
  return {
    id,
    property,
    sources: routeSources(property, routes),
    status: 'technical-exclusion',
    exclusion: { kind, reason }
  };
}

function routeSources(property: string, routes: string[]) {
  return routes.map((route) =>
    route === '/'
      ? `packages/${property}/src/routes/+page.svelte`
      : `packages/${property}/src/routes/${route}/+page.svelte`
  );
}

function contract(
  archetype: PerformancePageArchetype,
  decision: string,
  proof: string,
  handoff: string
): Omit<PerformancePageContract, 'id'> {
  const chapters = chapterSpine(archetype);
  return {
    archetype,
    decision,
    chapters,
    primaryProof: { chapterId: chapters[1]?.id ?? chapters[0].id, description: proof },
    handoff: { chapterId: chapters.at(-1)?.id ?? chapters[0].id, action: handoff }
  };
}

function chapterSpine(archetype: PerformancePageArchetype): PerformancePageContract['chapters'] {
  switch (archetype) {
    case 'landing':
      return [
        { id: 'opening', role: 'opening', purpose: 'Create one operating question.' },
        { id: 'focused-proof', role: 'proof', purpose: 'Resolve the question with focused proof.' },
        { id: 'handoff', role: 'handoff', purpose: 'Offer the earned next action.' }
      ];
    case 'commercial':
      return [
        { id: 'fit', role: 'opening', purpose: 'Name the decision and fit boundary.' },
        { id: 'boundary-proof', role: 'conditions', purpose: 'Show the boundary and its proof.' },
        { id: 'commitment', role: 'handoff', purpose: 'Offer one bounded commitment.' }
      ];
    case 'editorial':
      return [
        { id: 'thesis', role: 'orientation', purpose: 'State one thesis or question.' },
        { id: 'evidence-body', role: 'body', purpose: 'Develop the thesis through evidence.' },
        { id: 'continuation', role: 'handoff', purpose: 'Offer one relevant continuation.' }
      ];
    case 'index':
      return [
        {
          id: 'orientation',
          role: 'orientation',
          purpose: 'Explain how to choose from the collection.'
        },
        { id: 'collection', role: 'collection', purpose: 'Browse and inspect the collection.' },
        { id: 'continuation', role: 'handoff', purpose: 'Continue with one selected item.' }
      ];
    case 'learning':
      return [
        { id: 'objective', role: 'orientation', purpose: 'Name the current learning objective.' },
        { id: 'learning-sequence', role: 'sequence', purpose: 'Teach and exercise the objective.' },
        {
          id: 'progression',
          role: 'handoff',
          purpose: 'Record progress and name the next practice.'
        }
      ];
    case 'tool':
      return [
        { id: 'task-state', role: 'orientation', purpose: 'Name the current task and state.' },
        {
          id: 'workspace',
          role: 'workspace',
          purpose: 'Complete the task with visible controls and evidence.'
        },
        {
          id: 'decision-receipt',
          role: 'handoff',
          purpose: 'Commit, stop, or hand off with a receipt.'
        }
      ];
  }
}
