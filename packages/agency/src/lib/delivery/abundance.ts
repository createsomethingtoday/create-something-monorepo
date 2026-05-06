export type DeliveryArtifact = {
	label: string;
	href?: string;
	meta: string;
	visibility: 'client-safe' | 'private-reference';
};

export type DeliveryLayer = {
	tier: 'Database' | 'Automation' | 'Judgment';
	title: string;
	status: string;
	body: string;
};

export type DeliveryKnowledgeCard = {
	id: string;
	label: string;
	keywords: string[];
	answer: string;
	followUpQuestions: string[];
};

export type DeliveryAgentEmbed = {
	label: string;
	chatUrl: string;
	embedUrl: string;
	meta: string;
	summary: string;
	valuePoints: string[];
	guardrail: string;
	evaluationNote: string;
};

export const abundanceDeliverySummary = {
	client: 'The NP Group / NPG',
	owner: 'CREATE SOMETHING',
	phase: 'Build / delivery review',
	headline: 'Abundance nurse staffing system.',
	description:
		'The NP Group now has a live concierge app, a repo-backed database, Staff and Jobs MCP endpoint references, a Staff Headcount Agent, walkthrough artifacts, and a clear agent boundary for recruiter-led review.'
};

export const abundanceStaffHeadcountAgent: DeliveryAgentEmbed = {
	label: 'Abundance Staff Headcount Agent',
	chatUrl: 'https://udify.app/chat/N0MmKYaAQAzgmZhy',
	embedUrl: 'https://udify.app/chatbot/N0MmKYaAQAzgmZhy',
	meta: 'Latest agent + MCP delivery',
	summary:
		'The Staff Headcount Agent is the newest reviewable surface for the Abundance staff/operator workstream. It uses the Abundance Staff MCP as its source of truth for Paylocity active-headcount summaries, staff profile lookup, and enrichment task tracking.',
	valuePoints: [
		'Lets NPG inspect active-headcount context through chat instead of reading raw CSV rows.',
		'Connects the visible agent experience to the Staff MCP boundary rather than a loose prompt.',
		'Keeps recruiter/operator judgment in the loop for enrichment, access, and staffing decisions.'
	],
	guardrail:
		'The embedded chat is client-safe. The Dify API key, MCP credentials, employee-level exports, and token-bearing URLs stay in secret storage and are not published here.',
	evaluationNote:
		'Braintrust/eval evidence is useful as a value translator once attached to run artifacts: tool use, refusal behavior, latency, and MCP boundary checks can be summarized without exposing raw traces or secrets.'
};

export const abundanceArtifactLinks: DeliveryArtifact[] = [
	{
		label: 'Abundance Concierge live app',
		href: 'https://abundance-concierge-chat.pages.dev/',
		meta: 'Live nurse-facing intake surface',
		visibility: 'client-safe'
	},
	{
		label: 'Progress walkthrough',
		href: 'https://share.descript.com/view/RWYv3CqKbEC',
		meta: 'Current job/database workflow walkthrough',
		visibility: 'client-safe'
	},
	{
		label: 'Pilot overview',
		href: 'https://share.descript.com/view/0wxPcYQzl8G',
		meta: 'Concierge pilot walkthrough',
		visibility: 'client-safe'
	},
	{
		label: 'Staff Headcount Agent',
		href: abundanceStaffHeadcountAgent.chatUrl,
		meta: 'Dify chat over Staff MCP',
		visibility: 'client-safe'
	},
	{
		label: 'Generated delivery package',
		href: 'https://create-something-deliveries.pages.dev/projects/abundance/',
		meta: 'Portable monorepo-generated delivery page',
		visibility: 'client-safe'
	}
];

export const abundanceOperatingLayers: DeliveryLayer[] = [
	{
		tier: 'Database',
		title: 'Created DB',
		status: 'Created',
		body:
			'The Abundance data layer captures profile context, intake history, matching state, and private source artifacts for the next staff/operator integration pass.'
	},
	{
		tier: 'Automation',
		title: 'Staff and Jobs MCP',
		status: 'Deployed endpoints',
		body:
			'Staff and jobs MCP endpoints are tracked as tokenless delivery artifacts. The Staff Headcount Agent now gives NPG a chat surface over the Staff MCP while credentials stay in secret storage.'
	},
	{
		tier: 'Judgment',
		title: 'Agent Boundary',
		status: 'Ready for review',
		body:
			'The agent supports headcount inspection, intake, shortlist, missing-information flags, and recruiter review. It does not autonomously make staffing decisions.'
	}
];

export const abundancePrivateArtifacts = [
	'Paylocity active-headcount CSV received for private staff/operator context.',
	'Dify Abundance Staff Headcount Agent is published as a client-safe chat surface; API credentials remain private.',
	'MCP credentials should be verified from Infisical before live agent smoke tests.',
	'Any token shared outside secret storage should be rotated before production reliance.'
];

export const abundanceNextReview = [
	'Confirm how Paylocity fields map into staff/operator records.',
	'Verify Staff MCP and Jobs MCP credentials from Infisical.',
	'Walk through the live app, Staff Headcount Agent, generated delivery package, and MCP boundaries with NPG.',
	'Decide which operator roster receives MCP/database access.'
];

export const abundanceSuggestedPrompts = [
	'Explain what changed in plain English.',
	'What decisions do you need from us?',
	'What is safe to forward to our team?',
	'How do the DB, MCP, and agent fit together?',
	'What can we ask the Staff Headcount Agent?'
];

export const abundanceKnowledgeCards: DeliveryKnowledgeCard[] = [
	{
		id: 'status',
		label: 'Delivery status',
		keywords: ['changed', 'shipped', 'status', 'summary', 'plain', 'english', 'update', 'ready'],
		answer:
			'Abundance has moved from a concept into a working delivery shape: a live nurse-facing concierge app, a repo-backed data layer, tokenless Staff and Jobs MCP endpoint references, walkthrough artifacts, and an agent boundary for recruiter-led review. The useful summary is that the workflow now has durable data, callable actions, and explainable recommendations instead of a loose chatbot or one-off demo.',
		followUpQuestions: [
			'Who should receive the client-safe walkthrough?',
			'Should the next update use nurse staffing language, or should it preserve the generic Seeker/Talent/Match vocabulary underneath?'
		]
	},
	{
		id: 'artifacts',
		label: 'Review artifacts',
		keywords: ['link', 'links', 'artifact', 'artifacts', 'walkthrough', 'demo', 'live', 'url', 'review'],
		answer:
			'The client-safe review set is the Abundance Concierge live app, the Staff Headcount Agent chat, the progress walkthrough, the pilot overview, and the generated delivery package. These are safe to use for review because they exclude token-bearing MCP URLs, raw employee rows, private Notion details, and contact data.',
		followUpQuestions: [
			'Who should be included in the review loop?',
			'Should the generated delivery page remain public-link accessible, or should future delivery pages require login?'
		]
	},
	{
		id: 'database',
		label: 'Database layer',
		keywords: ['database', 'db', 'data', 'd1', 'records', 'schema', 'paylocity', 'headcount'],
		answer:
			'The database layer is the durable memory for the workflow. It is meant to preserve profile context, intake history, matching state, and source-artifact context. The Paylocity active-headcount export has been acknowledged as a private source artifact for staff/operator mapping, but raw employee rows are not part of this public delivery surface.',
		followUpQuestions: [
			'Which Paylocity fields should become staff/operator records?',
			'Which system should be treated as authoritative for staff status and availability?'
		]
	},
	{
		id: 'mcp',
		label: 'MCP and automation',
		keywords: ['mcp', 'api', 'tool', 'tools', 'automation', 'staff', 'jobs', 'endpoint', 'credentials'],
		answer:
			'The MCP layer is the callable automation surface. Staff and Jobs MCP endpoints are tracked as tokenless references so agents and workflow tools can be connected without putting secrets in the delivery page. Credentials should stay in Infisical or equivalent secret storage and should be verified before live agent smoke tests.',
		followUpQuestions: [
			'Who should have MCP/database access?',
			'Should Staff MCP and Jobs MCP stay separate, or should they eventually sit behind one client-facing registry?'
		]
	},
	{
		id: 'agent',
		label: 'Agent boundary',
		keywords: [
			'agent',
			'dify',
			'chat',
			'headcount',
			'staff',
			'recommend',
			'recommendation',
			'judgment',
			'decision',
			'autonomous'
		],
		answer:
			'The Staff Headcount Agent should be treated as review and recommendation support over the Abundance Staff MCP. It can summarize active-headcount context, look up staff profiles, queue enrichment tasks, support intake, shortlist candidates, flag missing information, and prepare recruiter review, but it should not autonomously hire, place, reject, or make final staffing decisions. That human review boundary is part of the delivery value.',
		followUpQuestions: [
			'What actions can the agent draft but not send?',
			'Which recruiter or operator approves matches before anything reaches a candidate or client?'
		]
	},
	{
		id: 'evaluation',
		label: 'Evaluation evidence',
		keywords: ['eval', 'evals', 'braintrust', 'test', 'tests', 'quality', 'proof', 'trace', 'latency'],
		answer:
			'Braintrust/eval evidence can help translate the value of the agent and MCP work into proof: which tools were used, whether private material was refused, whether MCP boundaries held, and whether latency was acceptable. The current delivery page should only claim completed evals once run artifacts or summaries are attached; otherwise it should describe evals as the next proof lane.',
		followUpQuestions: [
			'Which eval results are safe to share with NPG?',
			'Should eval evidence be summarized as a client-facing scorecard or kept as an internal appendix?'
		]
	},
	{
		id: 'privacy',
		label: 'Private and shareable material',
		keywords: ['private', 'share', 'safe', 'forward', 'secret', 'token', 'contact', 'employee', 'notion'],
		answer:
			'Safe to share: the live app, the walkthrough links, and the generated delivery page. Keep private: token-bearing MCP URLs, raw Paylocity rows, local file paths, private Notion links, contact names or emails, and any credential values. If a token was shared outside secret storage, rotate it before relying on it in production.',
		followUpQuestions: [
			'Should this delivery be shared by link, email recap, or a logged-in portal?',
			'Which internal audience needs a lighter non-technical version?'
		]
	},
	{
		id: 'decisions',
		label: 'Decisions needed',
		keywords: ['decision', 'decisions', 'need', 'next', 'review', 'approve', 'owner', 'owners', 'access'],
		answer:
			'The current decisions are: map Paylocity fields into staff/operator records, verify Staff MCP and Jobs MCP credentials from secret storage, review the live app and MCP boundaries with NPG, and decide which operator roster should receive MCP/database access.',
		followUpQuestions: [
			'Who is the approval owner for operator access?',
			'Which decision needs to be made before the next build pass?'
		]
	}
];
