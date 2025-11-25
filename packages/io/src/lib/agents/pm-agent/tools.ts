/**
 * PM Agent Tools
 *
 * These tools give the PM agent access to:
 * - Contact submissions from D1
 * - CREATE SOMETHING voice guidelines
 * - Experiment database for relevant references
 * - Draft creation (stored in KV for review)
 * - Escalation workflow
 *
 * Uses Workers AI-compatible tool format instead of the agents package.
 */

export interface PMAgentEnv {
	DB: D1Database;
	AI: Ai;
	SESSIONS: KVNamespace;
	CACHE: KVNamespace;
}

/**
 * Tool definition for Workers AI tool calling
 */
export interface WorkersAITool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, any>;
			required?: string[];
		};
	};
}

/**
 * Tool definitions for Workers AI
 */
export const toolDefinitions: WorkersAITool[] = [
	{
		type: 'function',
		function: {
			name: 'query_contact_submissions',
			description:
				'Retrieve contact form submissions from CREATE SOMETHING website. Use this to see who has reached out and what they need. Returns: id, name, email, message, submitted_at, status.',
			parameters: {
				type: 'object',
				properties: {
					status: {
						type: 'string',
						enum: ['new', 'in_progress', 'responded', 'escalated'],
						description: 'Filter by submission status. Omit to get all.'
					},
					limit: {
						type: 'number',
						description: 'Maximum number of submissions to return (default: 10)'
					}
				}
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'get_voice_guidelines',
			description:
				'Get CREATE SOMETHING voice guidelines to ensure responses match brand voice. ALWAYS use this before drafting any client communication.',
			parameters: {
				type: 'object',
				properties: {}
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'search_experiments',
			description:
				'Search CREATE SOMETHING experiments (.io) to reference relevant work when responding to client inquiries. Use this when inquiry relates to AI, design, development, or specific technologies.',
			parameters: {
				type: 'object',
				properties: {
					keywords: {
						type: 'string',
						description: 'Search keywords (e.g., "AI design analysis", "Claude Code", "TypeScript")'
					}
				},
				required: ['keywords']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'get_canon_context',
			description:
				'Get context from CREATE SOMETHING canon (.ltd) - masters, principles, or patterns. Use when inquiry relates to design philosophy, development standards, or theoretical foundations.',
			parameters: {
				type: 'object',
				properties: {
					topic: {
						type: 'string',
						description: 'Topic to search (e.g., "design principles", "data visualization", "Tufte")'
					}
				},
				required: ['topic']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'draft_response',
			description:
				'Draft a response email following CREATE SOMETHING voice. DOES NOT SEND - stores draft in KV for human review and approval. Always include relevant experiment or canon references when appropriate.',
			parameters: {
				type: 'object',
				properties: {
					contact_id: {
						type: 'number',
						description: 'ID of the contact submission'
					},
					to_email: {
						type: 'string',
						description: 'Recipient email address'
					},
					to_name: {
						type: 'string',
						description: 'Recipient name'
					},
					subject: {
						type: 'string',
						description: 'Email subject line'
					},
					body: {
						type: 'string',
						description: 'Email body in plain text (will be formatted as needed)'
					},
					reasoning: {
						type: 'string',
						description: 'Why you drafted this response this way (for human reviewer context)'
					}
				},
				required: ['contact_id', 'to_email', 'to_name', 'subject', 'body', 'reasoning']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'escalate_to_human',
			description:
				'Escalate inquiry to human for review. Use when: pricing questions, strategic decisions, relationship-building, ambiguous requirements, or when uncertain. Better to escalate than make wrong assumption.',
			parameters: {
				type: 'object',
				properties: {
					contact_id: {
						type: 'number',
						description: 'ID of the contact submission'
					},
					reason: {
						type: 'string',
						enum: [
							'pricing_question',
							'strategic_decision',
							'relationship_building',
							'ambiguous_requirements',
							'technical_uncertainty',
							'scope_unclear',
							'other'
						],
						description: 'Reason for escalation'
					},
					context: {
						type: 'string',
						description: 'Additional context for human reviewer - what you learned, what you need clarified'
					},
					urgency: {
						type: 'string',
						enum: ['low', 'medium', 'high'],
						description: 'Urgency level for human review (default: medium)'
					}
				},
				required: ['contact_id', 'reason', 'context']
			}
		}
	}
];

/**
 * Tool execution functions
 */
export const toolExecutors: Record<string, (args: any, env: PMAgentEnv) => Promise<any>> = {
	async query_contact_submissions({ status, limit = 10 }: { status?: string; limit?: number }, env: PMAgentEnv) {
		try {
			let query: D1PreparedStatement;

			if (status) {
				query = env.DB.prepare(
					`SELECT id, name, email, message, submitted_at, status, responded_at
           FROM contact_submissions
           WHERE status = ?
           ORDER BY submitted_at DESC
           LIMIT ?`
				).bind(status, limit);
			} else {
				query = env.DB.prepare(
					`SELECT id, name, email, message, submitted_at, status, responded_at
           FROM contact_submissions
           ORDER BY submitted_at DESC
           LIMIT ?`
				).bind(limit);
			}

			const result = await query.all();
			return {
				success: true,
				submissions: result.results,
				count: result.results?.length || 0
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error querying submissions'
			};
		}
	},

	async get_voice_guidelines(_args: any, _env: PMAgentEnv) {
		return {
			success: true,
			voice: {
				core_principles: [
					'Clarity Over Cleverness - Direct, simple language. Code is read 10x more than written.',
					'Specificity Over Generality - Metrics, not vague claims. Show the data.',
					'Honesty Over Polish - Document failures and limitations. Real experiments include what went wrong.',
					'Useful Over Interesting - Reproducible, practical. Share the methodology.',
					'Grounded Over Trendy - Connect to masters and principles. Stand on shoulders of giants.'
				],
				forbidden_patterns: [
					'Marketing jargon: leverage, synergy, solutions, ecosystem, cutting-edge',
					'Vague claims: "significantly improved", "greatly enhanced", "optimized"',
					'Superlatives without data: best, amazing, revolutionary, game-changing',
					'Unqualified "we": Always specify who did what',
					'False modesty: "just", "simply", "merely"',
					'Hype language: disrupting, transforming, reinventing'
				],
				required_patterns: [
					'Empirical: "Built in X hours, cost $Y, saved Z%"',
					'Specific: "5 components, 615 lines, 88% time savings"',
					'Honest: "This works for X, doesn\'t work for Y"',
					'Attributed: "As Dieter Rams taught, as Tufte showed"'
				],
				tone: 'Empirical engineer documenting findings. Not marketing pitch, not tutorial, not blog post. Research paper meets honest assessment.',
				sentence_structure: 'Declarative. Subject-verb-object. One idea per sentence. Short paragraphs.',
				when_to_escalate: [
					'Pricing discussions (human negotiation essential)',
					'Strategic decisions (business judgment required)',
					'Relationship building (human touch matters)',
					'Ambiguous requirements (clarification needed)',
					'Budget/timeline commitments (stakeholder approval required)'
				]
			}
		};
	},

	async search_experiments({ keywords }: { keywords: string }, env: PMAgentEnv) {
		try {
			const searchPattern = `%${keywords}%`;
			const result = await env.DB.prepare(
				`SELECT id, title, slug, excerpt_short, category, published_at
         FROM papers
         WHERE published = 1
           AND archived = 0
           AND (title LIKE ? OR description LIKE ? OR excerpt LIKE ?)
         ORDER BY published_at DESC
         LIMIT 5`
			)
				.bind(searchPattern, searchPattern, searchPattern)
				.all();

			const experiments = result.results?.map((p: any) => ({
				title: p.title,
				url: `https://createsomething.io/experiments/${p.slug}`,
				excerpt: p.excerpt_short,
				category: p.category
			}));

			return {
				success: true,
				experiments,
				count: experiments?.length || 0,
				keywords
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error searching experiments'
			};
		}
	},

	async get_canon_context({ topic }: { topic: string }, env: PMAgentEnv) {
		try {
			const searchPattern = `%${topic}%`;

			// Search masters
			const masters = await env.DB.prepare(
				`SELECT name, slug, tagline, discipline
         FROM masters
         WHERE name LIKE ? OR discipline LIKE ? OR tagline LIKE ?
         LIMIT 3`
			)
				.bind(searchPattern, searchPattern, searchPattern)
				.all();

			// Search principles
			const principles = await env.DB.prepare(
				`SELECT title, slug, description, master_id
         FROM principles
         WHERE title LIKE ? OR description LIKE ?
         LIMIT 5`
			)
				.bind(searchPattern, searchPattern)
				.all();

			return {
				success: true,
				masters: masters.results?.map((m: any) => ({
					name: m.name,
					url: `https://createsomething.ltd/masters/${m.slug}`,
					tagline: m.tagline,
					discipline: m.discipline
				})),
				principles: principles.results?.map((p: any) => ({
					title: p.title,
					url: `https://createsomething.ltd/principles/${p.slug}`,
					description: p.description
				})),
				topic
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error getting canon context'
			};
		}
	},

	async draft_response(
		{
			contact_id,
			to_email,
			to_name,
			subject,
			body,
			reasoning
		}: {
			contact_id: number;
			to_email: string;
			to_name: string;
			subject: string;
			body: string;
			reasoning: string;
		},
		env: PMAgentEnv
	) {
		try {
			const draft = {
				contact_id,
				to_email,
				to_name,
				subject,
				body,
				reasoning,
				created_at: new Date().toISOString(),
				status: 'pending_review',
				agent_version: 'pm-agent-v2'
			};

			// Store draft in KV for 7 days
			await env.CACHE.put(`draft:${contact_id}`, JSON.stringify(draft), {
				expirationTtl: 86400 * 7
			});

			// Update contact submission status
			await env.DB.prepare(
				`UPDATE contact_submissions
         SET status = 'in_progress',
             updated_at = datetime('now')
         WHERE id = ?`
			).bind(contact_id).run();

			return {
				success: true,
				draft_id: `draft:${contact_id}`,
				message: 'Draft created and queued for human review',
				review_url: `https://createsomething.io/admin/agent-drafts/${contact_id}`,
				next_steps: 'Human will review and either approve, edit, or reject this draft.'
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error creating draft'
			};
		}
	},

	async escalate_to_human(
		{
			contact_id,
			reason,
			context,
			urgency = 'medium'
		}: {
			contact_id: number;
			reason: string;
			context: string;
			urgency?: string;
		},
		env: PMAgentEnv
	) {
		try {
			const escalation = {
				contact_id,
				reason,
				context,
				urgency,
				escalated_at: new Date().toISOString(),
				agent_version: 'pm-agent-v2'
			};

			// Store escalation details in KV
			await env.CACHE.put(`escalation:${contact_id}`, JSON.stringify(escalation), {
				expirationTtl: 86400 * 30 // 30 days
			});

			// Update contact submission status
			await env.DB.prepare(
				`UPDATE contact_submissions
         SET status = 'escalated',
             updated_at = datetime('now')
         WHERE id = ?`
			).bind(contact_id).run();

			return {
				success: true,
				escalation_id: `escalation:${contact_id}`,
				message: `Escalated to human review: ${reason}`,
				urgency,
				context,
				next_steps: 'Human will review this inquiry and take appropriate action.'
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error escalating to human'
			};
		}
	}
};

/**
 * Execute a tool by name
 */
export async function executeTool(name: string, args: any, env: PMAgentEnv): Promise<any> {
	const executor = toolExecutors[name];
	if (!executor) {
		return { success: false, error: `Unknown tool: ${name}` };
	}
	return executor(args, env);
}
