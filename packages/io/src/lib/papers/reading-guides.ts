export interface PaperReadingGuide {
	question: string;
	thesis: string;
	evidence: string;
	limit: string;
	continueLabel: string;
	continueHref: string;
	mode?: 'paper' | 'tool';
}

function guide(
	question: string,
	thesis: string,
	evidence: string,
	limit: string,
	continueLabel = 'Browse more research',
	continueHref = '/papers',
	mode: PaperReadingGuide['mode'] = 'paper'
): PaperReadingGuide {
	return { question, thesis, evidence, limit, continueLabel, continueHref, mode };
}

export const paperReadingGuides: Record<string, PaperReadingGuide> = {
	'agent-sdk-gemini-tools-integration': guide(
		'How can a Gemini agent use shell and file tools without losing control?',
		'The integration works when each tool has a narrow contract, explicit limits, and a visible result.',
		'Inspect the tool definitions, safety boundaries, and loop behavior.',
		'The findings cover this provider and tool pair, not every agent runtime.'
	),
	'agent-sdk-model-routing-optimization': guide(
		'When should an agent use a smaller model instead of the strongest one?',
		'Route routine work to smaller models only when measured quality stays inside the task boundary.',
		'Compare the routing rules, evaluation results, and failure cases.',
		'The result depends on these tasks, prompts, and model versions.'
	),
	'analyzer-mcp-review-architecture': guide(
		'How should an automated code review separate facts from judgment?',
		'A reliable reviewer gathers facts first, applies named rules second, and keeps final judgment visible.',
		'Follow the analyzer stages, review tools, and evidence handoffs.',
		'The design explains review flow; it does not replace owner approval.'
	),
	'andon-protocol': guide(
		'When should an automated workflow stop and ask for help?',
		'The workflow should stop when evidence crosses a named risk boundary and a person owns the next decision.',
		'Inspect the stop conditions, owner handoff, and restart receipt.',
		'The protocol needs local risk rules before it can govern real work.'
	),
	'animation-spec-architecture': guide(
		'How can one animation plan drive both web and video output?',
		'A shared timing and scene description keeps two renderers aligned without duplicating creative decisions.',
		'Compare the shared specification, renderer outputs, and timing checks.',
		'The approach covers planned scenes, not every form of interactive motion.'
	),
	'autonomous-harness-architecture': guide(
		'How can an automated coding run continue without taking authority from its owner?',
		'The run remains safe when progress, limits, and stop reasons stay visible while execution continues.',
		'Inspect the run states, progress reports, and approval boundaries.',
		'The design governs bounded work; it does not authorize unattended production changes.'
	),
	'beads-cross-session-memory': guide(
		'How can unfinished agent work survive the end of a chat session?',
		'Commit task state and dependencies beside the code so the next session can resume from evidence.',
		'Inspect the stored task records, dependency links, and resume path.',
		'The pattern preserves work state, not the full reasoning history.'
	),
	'beads-integration-patterns': guide(
		'Where should persistent task records fit into an existing development workflow?',
		'Add persistent records at handoff points while keeping the established issue tracker as the team record.',
		'Compare the integration patterns, commands, and ownership boundaries.',
		'The examples assume repository access and disciplined task updates.'
	),
	'code-mode-hermeneutic-analysis': guide(
		'Why does writing code change how a language model uses tools?',
		'Code lets the model combine tool results in a working environment instead of requesting each fact separately.',
		'Inspect the tool-use examples, information flow, and observed tradeoffs.',
		'The analysis explains a working pattern, not a universal model behavior.'
	),
	'codex-orchestration': guide(
		'How can one agent plan while another executes the plan?',
		'Separate planning from execution only when the handoff includes scope, checks, and a clear done boundary.',
		'Follow the plan format, execution loop, and completion evidence.',
		'The pattern adds coordination cost and does not fit every small task.'
	),
	'composio-three-tier-delivery': guide(
		'How should a team connect outside services without mixing data, actions, and approval?',
		'Keep service data, callable actions, and human policy in separate layers with explicit handoffs.',
		'Inspect the connection flow, action boundaries, and approval checks.',
		'The example covers one integration platform and still requires service-specific review.'
	),
	'cumulative-state-antipattern': guide(
		'Why do long automated runs become less reliable as they accumulate state?',
		'Repeatedly carrying every prior result increases ambiguity; compact checkpoints keep the next decision clear.',
		'Inspect the failure sequence, state growth, and checkpoint alternative.',
		'The pattern diagnoses accumulated context, not every cause of agent failure.'
	),
	'dual-agent-routing-experiment': guide(
		'Does sending different tasks to different agents improve the final result?',
		'Routing helps only when task boundaries are clear and both agents are judged against the same outcome.',
		'Compare the task split, measured results, and coordination failures.',
		'The experiment is limited to the tested agents and workload.'
	),
	'endpoint-construction-product': guide(
		'Can teams create reliable service endpoints without rebuilding the same integration work?',
		'A product can standardize endpoint creation when it owns schemas, tests, deployment, and change records together.',
		'Inspect the construction flow, generated outputs, and verification steps.',
		'The proposal does not remove provider-specific security and operations work.'
	),
	'ethos-transfer-agentic-engineering': guide(
		'How can a coding agent learn a team method by doing real work?',
		'Agents adopt a method when repository rules shape their actions and checks, not when they merely read principles.',
		'Inspect the guided tasks, observed behavior, and repository constraints.',
		'The study shows one transfer setting and does not prove lasting learning.'
	),
	'eval-evidence-layer': guide(
		'What evidence should support a claim that an automated system improved?',
		'An evaluation is useful when cases, scores, traces, and reviewer decisions remain connected and inspectable.',
		'Inspect the case design, scoring records, and review receipts.',
		'Scores support a decision; they do not replace judgment about real outcomes.'
	),
	'ground-case-study': guide(
		'Can code analysis make useful claims without pretending to know more than the evidence?',
		'The analyzer should tie each claim to a source location and lower confidence when proof is incomplete.',
		'Inspect the analyzed cases, cited source lines, and confidence decisions.',
		'This case study covers selected repositories and claim types.'
	),
	'ground-evidence-based-claims': guide(
		'How can an automated code review show why each claim should be trusted?',
		'Attach every claim to code evidence, a named rule, and a confidence level that readers can challenge.',
		'Inspect the claim schema, source references, and validation examples.',
		'The method improves traceability but cannot prove every inferred intent.'
	),
	'haiku-optimization': guide(
		'Which coding tasks can a smaller model handle without lowering quality?',
		'Use the smaller model for bounded routine steps only after task-level evaluations show equivalent outcomes.',
		'Compare task categories, routing rules, cost, and quality results.',
		'The thresholds depend on these prompts, models, and evaluation cases.'
	),
	'haiku-ultrathink-validation': guide(
		'Does giving a smaller model more reasoning time close the quality gap?',
		'Additional reasoning helps some bounded tasks, but measured results must decide where the combination is safe.',
		'Inspect the paired runs, scoring method, and failure examples.',
		'The result does not generalize beyond the tested model and task set.'
	),
	'harness-agent-sdk-migration': guide(
		'Can an autonomous coding harness replace broad permissions with named tools?',
		'Explicit tool grants preserve the useful loop while making authority narrower and easier to review.',
		'Compare the old and new permission paths, runs, and failures.',
		'The migration covers this harness and does not eliminate tool-level risk.'
	),
	'hermeneutic-debugging': guide(
		'How can a developer debug by comparing expected behavior with what the system actually reveals?',
		'Debugging improves when each observation updates the working explanation before the next test is chosen.',
		'Follow the observation, revised explanation, and next-test sequence.',
		'The method guides inquiry; it does not replace technical instrumentation.'
	),
	'hermeneutic-spiral-ux': guide(
		'Why should a returning user see a different path from a first-time user?',
		'Each visit adds context, so the interface should preserve progress and reveal the next useful depth.',
		'Inspect the return states, context changes, and navigation examples.',
		'The model needs observed user state and should not guess private intent.'
	),
	'hermeneutic-triad-review': guide(
		'How can a review connect technical facts, design intent, and practical use?',
		'A complete review checks what exists, what it means in context, and whether it helps the intended person act.',
		'Inspect the three review passes and their combined decision.',
		'The method organizes judgment but still depends on qualified reviewers.'
	),
	'intellectual-genealogy': guide(
		'Which ideas shaped the CREATE SOMETHING method?',
		'Three traditions contribute distinct tools for interpretation, clear writing, and systems practice.',
		'Trace the cited thinkers, concepts, and links between the three traditions.',
		'This is a selected working lineage, not a complete history of the fields.'
	),
	'kickstand-triad-audit': guide(
		'What can a real product audit reveal that a design checklist misses?',
		'Reviewing use, clarity, and removable complexity together exposes problems that isolated scores can hide.',
		'Inspect the Kickstand findings, screenshots, and recommended removals.',
		'The audit reflects one product state and should be rerun after changes.'
	),
	'loop-operable-codebase': guide(
		'What must a codebase provide before automated development loops are safe to run?',
		'The codebase needs visible tasks, isolated work, executable checks, stop rules, and durable completion records.',
		'Inspect the readiness gates, dispatch path, and recorded outcomes.',
		'The pattern enables bounded loops; it does not make every repository ready.'
	),
	'norvig-partnership': guide(
		'What happens when practical experiments test a philosophy-led design method?',
		'Measurement strengthens the method when it tests real behavior without reducing every design choice to a score.',
		'Inspect the experiments, observations, and points of agreement or tension.',
		'The partnership is interpretive and does not prove one universal design theory.'
	),
	'observability-infrastructure': guide(
		'What should operators see while automated systems are running?',
		'Operators need current state, important changes, failures, cost, and ownership in one inspectable record.',
		'Inspect the event model, traces, dashboards, and alert boundaries.',
		'Visibility helps diagnosis but does not make an unsafe action acceptable.'
	),
	'open-weight-models-mcp-guidance': guide(
		'When are open-weight models appropriate for client tool workflows?',
		'Use them when deployment control matters and task evaluations prove they can follow the required tool contract.',
		'Inspect model constraints, tool tests, privacy needs, and operating cost.',
		'The guidance changes with model releases and client risk requirements.'
	),
	'policy-os-contract-bundle': guide(
		'How can policy travel with an automated workflow instead of living in a prompt?',
		'Package permissions, approval rules, checks, and receipts as versioned files that execution can enforce.',
		'Inspect the bundle contents, enforcement points, and review history.',
		'A contract bundle needs an owning runtime and does not enforce itself.'
	),
	'policy-os-development-infrastructure': guide(
		'What development infrastructure is needed to enforce policy during agent work?',
		'Connect versioned rules to task intake, execution gates, verification, and recorded completion decisions.',
		'Inspect the repository hooks, runtime checks, and evidence flow.',
		'The infrastructure supports governance but still needs accountable owners.'
	),
	'proof-surface': guide(
		'How can a team verify automated work without exposing private logs?',
		'Publish a concise work record that links status and decisions to protected evidence and named ownership.',
		'Inspect the public record, private evidence boundary, and support example.',
		'The record proves what was captured; it does not guarantee the work was wise.'
	),
	'ralph-implementation': guide(
		'What does an overnight autonomous coding loop need to finish useful work?',
		'The loop needs small tasks, isolated changes, executable checks, clear stops, and a morning review record.',
		'Inspect the implementation, run sequence, and completed task evidence.',
		'The pattern is for bounded repository work, not unattended production authority.'
	),
	'ralph-vs-gastown': guide(
		'How do two agent-orchestration patterns differ in control and coordination?',
		'One favors a simple repeated loop while the other adds explicit roles; task shape determines which cost is justified.',
		'Compare their state, handoffs, failure modes, and operating overhead.',
		'The comparison reflects the evaluated versions and workloads.'
	),
	'recursive-language-models': guide(
		'Can a model work with more context by treating it as a searchable environment?',
		'Recursive calls can inspect selected context without loading everything into one prompt, if depth and cost stay bounded.',
		'Inspect the recursion pattern, context access, and measured tradeoffs.',
		'The approach adds runtime complexity and does not remove context limits.'
	),
	'spec-driven-development': guide(
		'Does a precise specification improve autonomous implementation work?',
		'A specification helps when it states outcomes, boundaries, checks, and evidence while leaving local implementation choices open.',
		'Compare the specification, agent actions, and resulting verification.',
		'The experiment covers one workflow and cannot prove that more detail always helps.'
	),
	'subtractive-form-design': guide(
		'When should a form hide a field instead of explaining why it can be skipped?',
		'Remove fields that do not apply so people only consider decisions they can actually make.',
		'Inspect the before-and-after forms, task paths, and observed confusion.',
		'Hiding is appropriate only when the omitted choice truly does not apply.'
	),
	'subtractive-studio': guide(
		'How can a design philosophy become repeatable product practice?',
		'Turn principles into shared components, review questions, and removal rules that shape everyday decisions.',
		'Inspect the studio system, component choices, and review examples.',
		'The system supports judgment; it cannot automate taste or context.'
	),
	'teaching-modalities-experiment': guide(
		'Which format helps people understand a new method and remember how to use it?',
		'Compare focused reading, guided motion, and active lessons by what people complete and retain.',
		'Try each teaching format, then compare its purpose and session results.',
		'This exploratory session does not establish long-term learning outcomes.'
	),
	'three-tier-framework': guide(
		'How should an automated system separate facts, actions, and human judgment?',
		'Keep stored truth, executable work, and decision policy in separate layers with explicit connections.',
		'Inspect the three layers, their boundaries, and the worked examples.',
		'The framework organizes a system; it does not choose the right policy for you.'
	),
	'threshold-dwelling': guide(
		'How does one house design balance privacy, shared life, light, movement, and cost?',
		'Explore coordinated architectural views to see how each design choice affects the whole dwelling.',
		'Start with the floor plan, then compare sections, light, circulation, materials, and budget.',
		'This is an interactive design study, not construction documents or a final cost estimate.',
		'Browse the research papers',
		'/papers',
		'tool'
	),
	'tufte-mobile-optimization': guide(
		'How can a dense information design stay readable on a small screen?',
		'Preserve hierarchy and evidence while changing layout, spacing, and interaction for the narrower context.',
		'Inspect the responsive decisions, before-and-after views, and readability checks.',
		'The recommendations address these examples, not every mobile interface.'
	),
	'understanding-graphs': guide(
		'How can a developer understand an unfamiliar codebase without reading every file?',
		'A focused dependency graph reveals important relationships when it removes noise and keeps source links available.',
		'Inspect the graph construction, filtering rules, and navigation examples.',
		'The graph reflects declared and detected relationships, not every runtime behavior.'
	),
	'webflow-analyzer-productization': guide(
		'What would turn a Webflow analysis script into a dependable product?',
		'The product must own repeatable inputs, clear findings, evidence links, recovery, and a reviewable delivery path.',
		'Inspect the proposed workflow, output contract, and operating requirements.',
		'The proposal does not prove market demand or replace Designer-only review.'
	),
	'webflow-dashboard-refactor': guide(
		'What changed when the Webflow dashboard moved from Next.js to SvelteKit?',
		'The migration reduced framework overhead while preserving the dashboard tasks, data paths, and deployment boundary.',
		'Compare the architectures, implementation changes, and measured results.',
		'The findings apply to this dashboard and migration, not every framework choice.'
	),
	'webflow-template-review-webmcp': guide(
		'How much template review can an agent complete from a published Webflow site?',
		'A read-only review snippet can expose common quality checks before a person opens the Designer for the rest.',
		'Inspect the available checks, tool calls, and Designer-only boundary.',
		'The method cannot inspect every private project setting or authoring decision.'
	),
	'workers-vs-python-sdk-plagiarism-detection': guide(
		'Which runtime is a better fit for checking Webflow templates for copied work?',
		'Choose between Workers and Python by data access, library needs, latency, deployment, and review operations.',
		'Compare both implementations, measured constraints, and operating tradeoffs.',
		'The recommendation depends on the tested detection method and platform limits.'
	),
	'workflow-trust-layer': guide(
		'What makes an automated workflow trustworthy after it starts acting?',
		'Trust comes from visible scope, approval points, current state, evidence, and a named owner for exceptions.',
		'Inspect the workflow states, approval boundaries, and completion records.',
		'The model supports accountable work but cannot guarantee good policy.'
	),
	'wrap-pattern': guide(
		'When should a product hide an integration behind a simpler capability?',
		'Wrap commodity plumbing when the product can own a stable outcome, clear limits, and reliable recovery.',
		'Inspect the integration boundary, user path, and failure handling.',
		'The pattern fits mature inputs; unstable dependencies may still need direct exposure.'
	)
};

export function getPaperReadingGuide(pathname: string): PaperReadingGuide | undefined {
	const slug = pathname.split('/').filter(Boolean).at(-1);
	return slug ? paperReadingGuides[slug] : undefined;
}
