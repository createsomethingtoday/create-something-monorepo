/**
 * Gmail Tools for PM Agent
 *
 * Provides agent with ability to:
 * - Read incoming emails
 * - Search inbox for specific emails
 * - Create draft responses (requires human approval)
 * - Mark emails as read/archived
 *
 * All sending goes through draft_response tool (human approval required)
 */

import type { Tool } from 'agents';
import type { PMAgentEnv } from './tools';
import type { GmailEnv } from './gmail';
import {
	listMessages,
	getMessage,
	getThread,
	createDraft,
	markAsRead,
	archiveMessage,
	formatEmailSummary,
	listLabels
} from './gmail';

// Combined environment type
export type PMAgentWithGmailEnv = PMAgentEnv & GmailEnv;

/**
 * Check if Gmail is configured
 */
function isGmailConfigured(env: PMAgentWithGmailEnv): boolean {
	return !!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
}

/**
 * Tool: Read Gmail Inbox
 * Lists recent emails matching a query
 */
export const readGmailInbox: Tool<PMAgentWithGmailEnv> = {
	name: 'read_gmail_inbox',
	description: `Read emails from Gmail inbox. Use Gmail search syntax for queries.
Common queries:
- "is:unread" - unread emails
- "is:unread in:inbox" - unread inbox emails
- "from:someone@example.com" - emails from specific sender
- "subject:inquiry" - emails with subject containing "inquiry"
- "newer_than:1d" - emails from last day
- "is:unread category:primary" - unread primary emails (not promotions/social)

Returns email summaries with: id, from, subject, date, snippet, isUnread`,
	parameters: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				default: 'is:unread in:inbox category:primary',
				description: 'Gmail search query'
			},
			limit: {
				type: 'number',
				default: 10,
				description: 'Maximum emails to return (max 50)'
			}
		}
	},
	async execute({ query = 'is:unread in:inbox category:primary', limit = 10 }, env) {
		if (!isGmailConfigured(env)) {
			return {
				success: false,
				error: 'Gmail not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN secrets.'
			};
		}

		try {
			// Limit to max 50 to avoid rate limits
			const safeLimit = Math.min(limit, 50);

			const { messages, resultSizeEstimate } = await listMessages(env, query, safeLimit);

			if (!messages || messages.length === 0) {
				return {
					success: true,
					emails: [],
					count: 0,
					totalEstimate: resultSizeEstimate || 0,
					query,
					message: 'No emails matching query'
				};
			}

			// Fetch full details for each message
			const emailDetails = await Promise.all(
				messages.map(async (msg) => {
					const fullMessage = await getMessage(env, msg.id);
					return formatEmailSummary(fullMessage);
				})
			);

			return {
				success: true,
				emails: emailDetails,
				count: emailDetails.length,
				totalEstimate: resultSizeEstimate,
				query
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error reading Gmail'
			};
		}
	}
};

/**
 * Tool: Get Email Thread
 * Retrieves full conversation thread for context
 */
export const getEmailThread: Tool<PMAgentWithGmailEnv> = {
	name: 'get_email_thread',
	description:
		'Get full email conversation thread. Use this when you need context from previous messages in a conversation before responding.',
	parameters: {
		type: 'object',
		properties: {
			thread_id: {
				type: 'string',
				description: 'Thread ID from a previous email (available in email details)'
			}
		},
		required: ['thread_id']
	},
	async execute({ thread_id }, env) {
		if (!isGmailConfigured(env)) {
			return {
				success: false,
				error: 'Gmail not configured'
			};
		}

		try {
			const thread = await getThread(env, thread_id);

			const messages = thread.messages.map((msg) => formatEmailSummary(msg));

			return {
				success: true,
				thread_id: thread.id,
				message_count: messages.length,
				messages,
				snippet: thread.snippet
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error getting thread'
			};
		}
	}
};

/**
 * Tool: Create Gmail Draft
 * Creates a draft reply (does NOT send - requires human approval)
 */
export const createGmailDraft: Tool<PMAgentWithGmailEnv> = {
	name: 'create_gmail_draft',
	description: `Create a draft email reply in Gmail. DOES NOT SEND - draft appears in Gmail Drafts folder for human review.

Use this instead of draft_response when:
- Responding to an email (not contact form)
- Want draft to appear directly in Gmail for easy sending
- Need to reply in an existing thread

The draft will be visible in Gmail Drafts folder. Human must review and click Send.`,
	parameters: {
		type: 'object',
		properties: {
			to: {
				type: 'string',
				description: 'Recipient email address'
			},
			subject: {
				type: 'string',
				description: 'Email subject (for replies, typically "Re: Original Subject")'
			},
			body: {
				type: 'string',
				description: 'Email body text (plain text, will be formatted)'
			},
			thread_id: {
				type: 'string',
				description: 'Thread ID to reply in (keeps conversation together)'
			},
			reply_to_message_id: {
				type: 'string',
				description: 'Message ID being replied to (for proper threading)'
			},
			reasoning: {
				type: 'string',
				description: 'Why you drafted this response (logged for review)'
			}
		},
		required: ['to', 'subject', 'body', 'reasoning']
	},
	async execute({ to, subject, body, thread_id, reply_to_message_id, reasoning }, env) {
		if (!isGmailConfigured(env)) {
			return {
				success: false,
				error: 'Gmail not configured'
			};
		}

		try {
			const draft = await createDraft(env, to, subject, body, {
				threadId: thread_id,
				replyToMessageId: reply_to_message_id
			});

			// Log the draft creation for metrics
			const logEntry = {
				type: 'gmail_draft',
				draft_id: draft.id,
				to,
				subject,
				thread_id,
				reasoning,
				created_at: new Date().toISOString(),
				agent_version: 'pm-agent-v1'
			};

			// Store in KV for tracking (optional - could also log to D1)
			await env.CACHE.put(`gmail_draft:${draft.id}`, JSON.stringify(logEntry), {
				expirationTtl: 86400 * 7 // 7 days
			});

			return {
				success: true,
				draft_id: draft.id,
				message_id: draft.message.id,
				thread_id: draft.message.threadId,
				to,
				subject,
				message:
					'Draft created in Gmail. Human must review in Gmail Drafts folder and click Send.',
				reasoning
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error creating draft'
			};
		}
	}
};

/**
 * Tool: Mark Email as Read
 * Marks an email as read after processing
 */
export const markEmailRead: Tool<PMAgentWithGmailEnv> = {
	name: 'mark_email_read',
	description:
		'Mark an email as read after processing it. Use this after you have created a draft response or escalated the email.',
	parameters: {
		type: 'object',
		properties: {
			message_id: {
				type: 'string',
				description: 'Email message ID to mark as read'
			}
		},
		required: ['message_id']
	},
	async execute({ message_id }, env) {
		if (!isGmailConfigured(env)) {
			return {
				success: false,
				error: 'Gmail not configured'
			};
		}

		try {
			await markAsRead(env, message_id);

			return {
				success: true,
				message_id,
				message: 'Email marked as read'
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error marking as read'
			};
		}
	}
};

/**
 * Tool: Archive Email
 * Archives an email (removes from inbox, keeps in All Mail)
 */
export const archiveEmail: Tool<PMAgentWithGmailEnv> = {
	name: 'archive_email',
	description:
		'Archive an email (remove from inbox). Use for emails that have been fully processed and need no further action.',
	parameters: {
		type: 'object',
		properties: {
			message_id: {
				type: 'string',
				description: 'Email message ID to archive'
			}
		},
		required: ['message_id']
	},
	async execute({ message_id }, env) {
		if (!isGmailConfigured(env)) {
			return {
				success: false,
				error: 'Gmail not configured'
			};
		}

		try {
			await archiveMessage(env, message_id);

			return {
				success: true,
				message_id,
				message: 'Email archived (removed from inbox)'
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error archiving'
			};
		}
	}
};

/**
 * Tool: List Gmail Labels
 * Lists available labels (for filtering/organizing)
 */
export const listGmailLabels: Tool<PMAgentWithGmailEnv> = {
	name: 'list_gmail_labels',
	description:
		'List available Gmail labels. Useful for understanding how emails are organized and for applying labels.',
	parameters: {
		type: 'object',
		properties: {}
	},
	async execute({}, env) {
		if (!isGmailConfigured(env)) {
			return {
				success: false,
				error: 'Gmail not configured'
			};
		}

		try {
			const { labels } = await listLabels(env);

			// Filter to show user-created and important system labels
			const importantLabels = labels.filter(
				(l) =>
					l.type === 'user' ||
					['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'UNREAD', 'STARRED', 'IMPORTANT'].includes(
						l.id
					)
			);

			return {
				success: true,
				labels: importantLabels.map((l) => ({
					id: l.id,
					name: l.name,
					type: l.type
				})),
				count: importantLabels.length
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error listing labels'
			};
		}
	}
};

/**
 * All Gmail tools for the PM Agent
 */
export const gmailTools: Tool<PMAgentWithGmailEnv>[] = [
	readGmailInbox,
	getEmailThread,
	createGmailDraft,
	markEmailRead,
	archiveEmail,
	listGmailLabels
];
