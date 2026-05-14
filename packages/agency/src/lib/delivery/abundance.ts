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

export const abundanceDeliverySummary = {
	client: 'The NP Group / NPG',
	owner: 'CREATE SOMETHING',
	phase: 'Build / delivery review',
	headline: 'Abundance nurse staffing system.',
	description:
		'The NP Group now has a live concierge app, a repo-backed database, hardened Abundance API routes, production-smoked Staff and Jobs MCPs, an NPG scoped hub, Braintrust/Langfuse eval evidence for the Dify agent path, walkthrough artifacts, and a clear agent boundary for recruiter-led review.'
};

export const abundanceArtifactLinks: DeliveryArtifact[] = [
	{
		label: 'Abundance Concierge live app',
		href: 'https://abundance-concierge-chat.pages.dev/',
		meta: 'Live nurse-facing intake surface',
		visibility: 'client-safe'
	},
	{
		label: 'Abundance Jobs Agent',
		href: 'https://createsomething.agency/delivery/abundance#job-agent',
		meta: 'Embedded read-only Dify job discovery agent',
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
		title: 'Staff, Jobs, and NPG Hub',
		status: 'Production-smoked',
		body:
			'Staff MCP, Jobs MCP, the NPG scoped hub, and Dify Abundance Hub have passed production smoke checks. The Abundance Dify agent also has a published Braintrust eval suite with Langfuse trace join keys. Credentials stay in secret storage and are not published in the delivery surface.'
	},
	{
		tier: 'Judgment',
		title: 'Agent Boundary',
		status: 'Ready for review',
		body:
			'The agent supports intake, shortlist, missing-information flags, and recruiter review. It does not autonomously make staffing decisions.'
	}
];

export const abundancePrivateArtifacts = [
	'Paylocity active-headcount CSV received for private staff/operator context.',
	'Dify Abundance Hub configuration is tracked as an external operational artifact and was production-smoked through the Service API.',
	'Braintrust eval coverage for Abundance Hub is published under create-something-dify-agents / abundance_hub and verifies Dify API health, Abundance Jobs MCP tool routing, forbidden writes, secret refusal, latency, and trace IDs for Langfuse inspection.',
	'MCP credentials remain in Infisical; Staff MCP, Jobs MCP, and the NPG scoped hub were smoked without exposing token values.',
	'Cloudflare Pages production has AGENCY_INTERNAL_API_KEY, but WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET still need to be provisioned before enabling the Meta webhook.',
	'NPG scoped hub status calls are reachable, but Jotform, Mailchimp, and WhatsApp currently report connected=false and need account-owner authorization before write-capable automation.'
];

export const abundanceNextReview = [
	'Provision WhatsApp webhook secrets in Cloudflare Pages production.',
	'Promote the secured Abundance API build from a clean release branch or clean deployment workspace.',
	'Have NPG account owners review or reauthorize Jotform, Mailchimp, and WhatsApp before write-capable automation.',
	'Confirm how Paylocity fields map into staff/operator records.',
	'Decide which operator roster receives MCP/database access.'
];

export const abundanceSuggestedPrompts = [
	'Explain what changed in plain English.',
	'What decisions do you need from us?',
	'What is safe to forward to our team?',
	'How do the DB, MCP, and agent fit together?'
];

export const abundanceJobAgentPrompts = [
	'Show current public nursing jobs.',
	'Search for travel nurse roles.',
	'Find med surg roles with the strongest matches.',
	'What confirmation is needed before sending a job to the funnel?'
];

export const abundanceKnowledgeCards: DeliveryKnowledgeCard[] = [
	{
		id: 'status',
		label: 'Delivery status',
		keywords: ['changed', 'shipped', 'status', 'summary', 'plain', 'english', 'update', 'ready'],
		answer:
			'Abundance has moved from a concept into a working delivery shape: a live nurse-facing concierge app, a repo-backed data layer, hardened API routes, production-smoked Staff and Jobs MCP endpoints, an NPG scoped hub, walkthrough artifacts, and an agent boundary for recruiter-led review. The useful summary is that the workflow now has durable data, callable actions, and explainable recommendations instead of a loose chatbot or one-off demo.',
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
			'The client-safe review set is the Abundance Concierge live app, the progress walkthrough, the pilot overview, and the generated delivery package. These are safe to use for review because they exclude token-bearing MCP URLs, raw employee rows, private Notion details, and contact data.',
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
			'The MCP layer is the callable automation surface. Staff MCP, Jobs MCP, and the NPG scoped hub are tracked as tokenless references so agents and workflow tools can be connected without putting secrets in the delivery page. Production smoke passed for Staff headcount, Jobs public listing, NPG hub service/status calls, and Dify jobs-tool usage. The Abundance Dify smoke now covers list, search, write-confirmation, and secret-refusal cases. The NPG hub is reachable, but Jotform, Mailchimp, and WhatsApp currently report connected=false and need account-owner authorization before write-capable automation. Credentials stay in Infisical or equivalent secret storage.',
		followUpQuestions: [
			'Who should have MCP/database access?',
			'Should Staff MCP and Jobs MCP stay separate, or should they eventually sit behind one client-facing registry?'
		]
	},
	{
		id: 'agent',
		label: 'Agent boundary',
		keywords: ['agent', 'dify', 'chat', 'recommend', 'recommendation', 'judgment', 'decision', 'autonomous'],
		answer:
			'The agent should be treated as recommendation support. It can support intake, shortlist candidates, flag missing information, and prepare recruiter review, but it should not autonomously hire, place, reject, or make final staffing decisions. The published Braintrust eval verifies this boundary through Dify/MCP tool-use checks, no speculative send_job_to_funnel calls, secret refusal, and trace IDs that can be inspected in Dify/Langfuse.',
		followUpQuestions: [
			'What actions can the agent draft but not send?',
			'Which recruiter or operator approves matches before anything reaches a candidate or client?'
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
			'The current decisions are: provision WhatsApp webhook secrets before enabling Meta webhooks, map Paylocity fields into staff/operator records, have NPG account owners review or reauthorize Jotform/Mailchimp/WhatsApp before write-capable automation, review the live app and MCP boundaries with NPG, and decide which operator roster should receive MCP/database access.',
		followUpQuestions: [
			'Who is the approval owner for operator access?',
			'Which decision needs to be made before the next build pass?'
		]
	}
];
