/**
 * PM Agent for CREATE SOMETHING
 *
 * Experiment #3: Can an AI agent handle PM duties while maintaining brand voice?
 *
 * This agent:
 * - Triages incoming contact form submissions
 * - Drafts responses following CREATE SOMETHING voice guidelines
 * - References relevant experiments and canon when appropriate
 * - Escalates complex inquiries (pricing, strategy, relationships) to human
 * - All drafts require human approval before sending
 *
 * Hypothesis: AI can handle 60-80% of PM duties (triage, drafting, research)
 * while maintaining voice consistency, with human review for approval.
 *
 * Uses Cloudflare Workers AI directly with tool calling (not the agents package).
 */

import { toolDefinitions, toolExecutors, executeTool, type PMAgentEnv } from './tools';
import { gmailToolDefinitions, gmailToolExecutors, executeGmailTool, type PMAgentWithGmailEnv } from './gmail-tools';

// Re-export types
export type { PMAgentEnv } from './tools';
export type { PMAgentWithGmailEnv } from './gmail-tools';

/**
 * System prompt that defines the agent's role and behavior
 */
const PM_AGENT_SYSTEM_PROMPT = `You are the PM (Project Manager) for CREATE SOMETHING, an AI-native design and development studio.

## Your Role

You triage and respond to client inquiries from:
- Contact form submissions (in D1 database)
- Gmail inbox (via Gmail API)

**Available channels:**
- Use query_contact_submissions for form submissions
- Use read_gmail_inbox for email inquiries

Your responsibilities:
1. Read and understand client inquiries
2. Draft responses that match CREATE SOMETHING's distinctive voice
3. Reference relevant experiments (.io) or canon (.ltd) when appropriate
4. Escalate to human when needed

## CREATE SOMETHING Context

**Four Properties:**
- .ltd → Canon (masters, principles, patterns, standards)
- .io → Experiments (documented with metrics, honest assessment)
- .space → Interactive experiments
- .agency → Client services

**Philosophy:**
- AI-native development
- Everything documented as experiments
- Empirical validation (not theory)
- Honest about limitations
- Grounded in master designers/engineers (Rams, Tufte, Mies van der Rohe)

## Voice Guidelines (CRITICAL)

**Always get voice guidelines before drafting** using get_voice_guidelines tool.

Key principles:
1. **Clarity Over Cleverness** - Direct, simple language
2. **Specificity Over Generality** - Metrics, not vague claims
3. **Honesty Over Polish** - Acknowledge limitations
4. **Useful Over Interesting** - Practical, reproducible
5. **Grounded Over Trendy** - Reference masters/principles

**Forbidden:**
- Marketing jargon (leverage, synergy, solutions)
- Vague claims without data
- Superlatives (best, amazing, revolutionary)
- Hype language

**Required:**
- Empirical evidence when claiming capability
- Specific metrics from experiments
- Honest assessment (what works, what doesn't)
- Attribution to masters when relevant

## Decision Framework

**Draft a response when:**
- Inquiry is straightforward question about capabilities
- You can reference specific experiments or canon
- Request aligns with documented services
- No pricing/budget discussion needed

**Escalate to human when:**
- Pricing or budget questions (human negotiation essential)
- Strategic/business decisions needed
- Relationship building opportunities
- Ambiguous or complex requirements
- Anything involving commitments (timeline, scope, deliverables)
- When uncertain - better to escalate than assume

## Workflow

### For contact form submissions:

1. **Read the inquiry** - Use query_contact_submissions
2. **Get voice guidelines** - Use get_voice_guidelines (ALWAYS)
3. **Search context** - Use search_experiments and/or get_canon_context if relevant
4. **Decide: Draft or Escalate**
   - If straightforward → draft_response
   - If complex/pricing/strategy → escalate_to_human
5. **Provide reasoning** - Explain your decision

### For Gmail inbox:

1. **Read emails** - Use read_gmail_inbox with appropriate query (e.g., "is:unread category:primary")
2. **Get voice guidelines** - Use get_voice_guidelines (ALWAYS)
3. **Get thread context** - Use get_email_thread if this is a reply/conversation
4. **Search context** - Use search_experiments and/or get_canon_context if relevant
5. **Decide: Draft or Escalate**
   - If straightforward → create_gmail_draft (creates draft in Gmail for human to send)
   - If complex/pricing/strategy → escalate_to_human
6. **Mark as processed** - Use mark_email_read after creating draft or escalating
7. **Provide reasoning** - Explain your decision

**Gmail-specific notes:**
- use create_gmail_draft (not draft_response) for email replies - it creates the draft directly in Gmail
- Always include thread_id when replying to keep the conversation together
- Drafts appear in Gmail's Drafts folder - human must click Send

## Important Constraints

- **NEVER send emails directly** - All drafts go to human review
- **NEVER make pricing commitments** - Always escalate
- **NEVER promise timelines** - Escalate for human assessment
- **NEVER claim capabilities not documented in experiments** - Be honest about what's been validated

You are an assistant TO the human PM, not a replacement. Your job is to save time on triage and drafting, while ensuring nothing falls through the cracks.`;

/**
 * Check if Gmail is configured in environment
 */
function hasGmailConfig(env: PMAgentEnv | PMAgentWithGmailEnv): env is PMAgentWithGmailEnv {
	const gmailEnv = env as PMAgentWithGmailEnv;
	return !!(gmailEnv.GMAIL_CLIENT_ID && gmailEnv.GMAIL_CLIENT_SECRET && gmailEnv.GMAIL_REFRESH_TOKEN);
}

/**
 * Get all tool definitions based on environment
 */
function getToolDefinitions(env: PMAgentEnv | PMAgentWithGmailEnv) {
	if (hasGmailConfig(env)) {
		return [...toolDefinitions, ...gmailToolDefinitions];
	}
	return toolDefinitions;
}

/**
 * Execute a tool call
 */
async function executeToolCall(
	name: string | undefined,
	args: any,
	env: PMAgentEnv | PMAgentWithGmailEnv
): Promise<any> {
	// Handle undefined name
	if (!name) {
		return { success: false, error: 'Tool name is undefined' };
	}

	// Check if it's a Gmail tool
	const gmailToolNames = [
		'read_gmail_inbox',
		'get_email_thread',
		'create_gmail_draft',
		'mark_email_read',
		'archive_email',
		'list_gmail_labels'
	];

	if (gmailToolNames.includes(name)) {
		return executeGmailTool(name, args, env as PMAgentWithGmailEnv);
	}
	return executeTool(name, args, env);
}

/**
 * Message type for agent conversation
 */
interface AgentMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_call_id?: string;
	name?: string;
}

/**
 * Workers AI tool call response structure
 */
interface WorkersAIToolCall {
	name?: string;
	arguments?: any;
	// Alternative format
	function?: {
		name: string;
		arguments: string | object;
	};
}

/**
 * Run the PM agent with a task
 * Uses Workers AI with tool calling
 */
export async function runAgent(task: string, env: PMAgentWithGmailEnv): Promise<string> {
	const tools = getToolDefinitions(env);
	const messages: AgentMessage[] = [
		{ role: 'system', content: PM_AGENT_SYSTEM_PROMPT },
		{ role: 'user', content: task }
	];

	const maxIterations = 10;
	let iterations = 0;

	while (iterations < maxIterations) {
		iterations++;

		try {
			// Call Workers AI
			const response = await env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
				messages: messages.map(m => ({
					role: m.role === 'tool' ? 'user' : m.role,
					content: m.role === 'tool' ? `Tool result for ${m.name}: ${m.content}` : m.content
				})),
				tools,
				max_tokens: 2000,
				temperature: 0.2
			}) as { response?: string; tool_calls?: WorkersAIToolCall[] };

			// Check for tool calls
			if (response.tool_calls && response.tool_calls.length > 0) {
				// Add assistant message with tool calls
				messages.push({
					role: 'assistant',
					content: JSON.stringify(response.tool_calls)
				});

				// Execute each tool call
				for (const toolCall of response.tool_calls) {
					// Handle different tool call formats from Workers AI
					const toolName = toolCall.name || toolCall.function?.name;
					const rawArgs = toolCall.arguments || toolCall.function?.arguments;
					const toolArgs = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : (rawArgs || {});

					const result = await executeToolCall(toolName, toolArgs, env);

					messages.push({
						role: 'tool',
						name: toolName || 'unknown',
						tool_call_id: `${toolName || 'unknown'}_${iterations}`,
						content: JSON.stringify(result)
					});
				}
			} else {
				// No more tool calls, return final response
				return response.response || 'Agent completed without response';
			}
		} catch (error) {
			console.error('Agent iteration error:', error);
			return `Agent error: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	return 'Agent reached maximum iterations without completing';
}

/**
 * Helper: Process a specific contact submission
 */
export async function processContactSubmission(contactId: number, env: PMAgentEnv) {
	const task = `Process contact submission #${contactId}:

1. Query the contact submission details
2. Get voice guidelines
3. Search for relevant experiments or canon (if the inquiry relates to our work)
4. Analyze: Can I draft a response, or should I escalate?
5. Either draft_response OR escalate_to_human
6. Provide clear reasoning for your decision

Remember: When in doubt, escalate. Better to have human review than make wrong assumption.`;

	return runAgent(task, env as PMAgentWithGmailEnv);
}

/**
 * Helper: Triage all new contact submissions
 */
export async function triageNewSubmissions(env: PMAgentEnv) {
	const task = `Triage all new contact submissions:

1. Query contact submissions with status='new'
2. Get voice guidelines
3. For each submission:
   - Analyze the inquiry
   - Search for relevant context if needed (experiments/canon)
   - Draft response OR escalate
   - Update status appropriately

Provide a summary of actions taken for each submission.

If there are no new submissions, simply report that.`;

	return runAgent(task, env as PMAgentWithGmailEnv);
}

/**
 * Helper: Get draft for human review
 */
export async function getDraft(contactId: number, env: PMAgentEnv) {
	const draftKey = `draft:${contactId}`;
	const draftData = await env.CACHE.get(draftKey);

	if (!draftData) {
		return null;
	}

	return JSON.parse(draftData);
}

/**
 * Helper: Get escalation details
 */
export async function getEscalation(contactId: number, env: PMAgentEnv) {
	const escalationKey = `escalation:${contactId}`;
	const escalationData = await env.CACHE.get(escalationKey);

	if (!escalationData) {
		return null;
	}

	return JSON.parse(escalationData);
}

/**
 * Helper: Approve and log draft decision
 */
export async function approveDraft(contactId: number, approved: boolean, env: PMAgentEnv) {
	const draft = await getDraft(contactId, env);

	if (!draft) {
		throw new Error(`Draft not found for contact ${contactId}`);
	}

	// Log the human decision for metrics
	const decision = {
		contact_id: contactId,
		draft_id: `draft:${contactId}`,
		approved,
		reviewed_at: new Date().toISOString(),
		draft_created_at: draft.created_at
	};

	// Store decision in D1 for metrics tracking
	await env.DB.prepare(
		`INSERT INTO agent_decisions (contact_id, draft_id, approved, reviewed_at, draft_created_at, draft_body)
     VALUES (?, ?, ?, ?, ?, ?)`
	)
		.bind(
			decision.contact_id,
			decision.draft_id,
			approved ? 1 : 0,
			decision.reviewed_at,
			decision.draft_created_at,
			draft.body
		)
		.run();

	if (approved) {
		// Update contact status to responded
		await env.DB.prepare(
			`UPDATE contact_submissions
       SET status = 'responded',
           responded_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`
		).bind(contactId).run();
	}

	// Delete draft from KV after decision
	await env.CACHE.delete(`draft:${contactId}`);

	return decision;
}

/**
 * Helper: Triage Gmail inbox
 * Requires Gmail secrets to be configured
 */
export async function triageGmailInbox(env: PMAgentWithGmailEnv, query: string = 'is:unread in:inbox category:primary') {
	if (!hasGmailConfig(env)) {
		throw new Error('Gmail not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN secrets.');
	}

	const task = `Triage Gmail inbox for new client inquiries:

1. Read emails using query: "${query}"
2. Get voice guidelines
3. For each unread email that appears to be a client inquiry:
   - Get thread context if it's part of a conversation
   - Search for relevant experiments or canon
   - Decide: create_gmail_draft OR escalate_to_human
   - Mark the email as read after processing
   - Provide reasoning for each decision

Skip emails that are:
- Automated/marketing emails
- Internal notifications
- Newsletters or subscriptions
- Spam

Provide a summary of actions taken for each email processed.

If there are no new client inquiries, simply report that.`;

	return runAgent(task, env);
}

/**
 * Helper: Process a specific Gmail thread
 */
export async function processGmailThread(threadId: string, env: PMAgentWithGmailEnv) {
	if (!hasGmailConfig(env)) {
		throw new Error('Gmail not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN secrets.');
	}

	const task = `Process Gmail thread ${threadId}:

1. Get the full thread using get_email_thread
2. Get voice guidelines
3. Understand the conversation context
4. Search for relevant experiments or canon
5. Decide: create_gmail_draft OR escalate_to_human
6. If drafting, include thread_id for proper threading
7. Mark latest message as read
8. Provide reasoning for your decision

Remember: When in doubt, escalate. Better to have human review than make wrong assumption.`;

	return runAgent(task, env);
}

/**
 * Helper: Full triage (both contact forms and Gmail)
 * Runs triage on both channels
 */
export async function triageAll(env: PMAgentWithGmailEnv) {
	const results = {
		contact_forms: null as any,
		gmail: null as any,
		gmail_configured: hasGmailConfig(env)
	};

	// Always triage contact forms
	results.contact_forms = await triageNewSubmissions(env);

	// Only triage Gmail if configured
	if (hasGmailConfig(env)) {
		results.gmail = await triageGmailInbox(env);
	}

	return results;
}
