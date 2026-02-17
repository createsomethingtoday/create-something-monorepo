import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GmailClient } from './gmail/client.js';

const SERVER_NAME = 'personal-gmail-mcp';
const SERVER_VERSION = '0.1.0';

function assertAllowedEmail(profileEmail: string) {
  const allowed = (process.env.GMAIL_ALLOWED_EMAIL || '').trim().toLowerCase();
  if (!allowed) return;
  if (profileEmail.trim().toLowerCase() !== allowed) {
    throw new Error(`Authenticated Gmail account (${profileEmail}) does not match GMAIL_ALLOWED_EMAIL (${allowed}).`);
  }
}

export function createMcpServer() {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjE2IiB4PSIyIiB5PSI0IiByeD0iMiIvPjxwYXRoIGQ9Im0yMiA3LTguOTcgNS43YTEuOTQgMS45NCAwIDAgMS0yLjA2IDBMMiA3Ii8+PC9nPjwvc3ZnPg==',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  const gmail = new GmailClient();

  // ==========================================================================
  // Database Tier — Resources
  // ==========================================================================

  server.resource(
    'gmail-profile',
    'gmail://profile',
    { description: 'Authenticated Gmail profile (email address + totals)', mimeType: 'application/json' },
    async () => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        return {
          contents: [{
            uri: 'gmail://profile',
            mimeType: 'application/json',
            text: JSON.stringify(profile, null, 2),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: 'gmail://profile',
            mimeType: 'application/json',
            text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2),
          }],
        };
      }
    },
  );

  server.resource(
    'gmail-labels',
    'gmail://labels',
    { description: 'All Gmail labels available for filtering and triage', mimeType: 'application/json' },
    async () => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        const labels = await gmail.getLabels();
        return {
          contents: [{
            uri: 'gmail://labels',
            mimeType: 'application/json',
            text: JSON.stringify({ count: labels.length, labels }, null, 2),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: 'gmail://labels',
            mimeType: 'application/json',
            text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2),
          }],
        };
      }
    },
  );

  // ==========================================================================
  // Automation Tier — Tools
  // ==========================================================================

  server.tool(
    'gmail_whoami',
    'Return the authenticated Gmail account email and message/thread totals. Use to verify you are connected to the correct mailbox.',
    {},
    async () => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        return { content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Gmail whoami failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_list_labels',
    'List Gmail labels (id + name). Use to discover label IDs for filtering or applying/removing labels.',
    {},
    async () => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        const labels = await gmail.getLabels();
        return { content: [{ type: 'text', text: JSON.stringify({ count: labels.length, labels }, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Label list failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_search',
    'Search Gmail using Gmail query syntax (from:, to:, subject:, after:, before:, label:, in:inbox, is:unread, has:attachment, etc.). Returns lightweight results unless include_body=true.',
    {
      query: z.string().describe('Gmail search query (e.g., "in:inbox is:unread newer_than:7d")'),
      limit: z.number().min(1).max(100).default(10).describe('Max emails to return (1-100, default: 10)'),
      include_body: z.boolean().default(false).describe('If true, fetch full bodies (slower). Default: false.'),
    },
    async ({ query, limit, include_body }) => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        const emails = await gmail.searchEmails({ query, maxResults: limit, includeBody: include_body });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: emails.length,
              has_more: emails.length === limit,
              emails,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Gmail search failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_get_email',
    'Fetch a single email by Gmail message ID (from gmail_search). Always returns body + headers.',
    { email_id: z.string().describe('Gmail message ID') },
    async ({ email_id }) => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        const email = await gmail.getEmail(email_id);
        if (!email) {
          return { content: [{ type: 'text', text: `No email found for id ${email_id}` }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify(email, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Get email failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_get_thread',
    'Fetch a thread by Gmail thread ID (from gmail_get_email or gmail_search results).',
    {
      thread_id: z.string().describe('Gmail thread ID'),
      include_body: z.boolean().default(false).describe('If true, fetch full bodies (slower). Default: false.'),
      limit: z.number().min(1).max(100).default(50).describe('Max messages from the end of thread to return (1-100, default: 50)'),
    },
    async ({ thread_id, include_body, limit }) => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        const thread = await gmail.getThread(thread_id, { includeBody: include_body, limit });
        if (!thread) {
          return { content: [{ type: 'text', text: `No thread found for id ${thread_id}` }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify(thread, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Get thread failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_send',
    'Send an email. Supports optional threadId + In-Reply-To/References if you want to reply in-thread.',
    {
      to: z.union([z.string(), z.array(z.string())]).describe('Recipient email(s).'),
      subject: z.string().describe('Email subject'),
      body_text: z.string().describe('Plain text body'),
      body_html: z.string().optional().describe('Optional HTML body (multipart/alternative)'),
      cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC email(s)'),
      bcc: z.union([z.string(), z.array(z.string())]).optional().describe('BCC email(s)'),
      thread_id: z.string().optional().describe('Optional Gmail threadId to attach to'),
      in_reply_to: z.string().optional().describe('Optional RFC822 In-Reply-To header value'),
      references: z.string().optional().describe('Optional RFC822 References header value'),
    },
    async ({ to, subject, body_text, body_html, cc, bcc, thread_id, in_reply_to, references }) => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        const result = await gmail.sendEmail({
          to,
          subject,
          bodyText: body_text,
          bodyHtml: body_html,
          cc,
          bcc,
          threadId: thread_id,
          inReplyTo: in_reply_to,
          references,
        });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, ...result }, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Send failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_create_draft',
    'Create a draft (does not send). Useful when you want user review before sending.',
    {
      to: z.union([z.string(), z.array(z.string())]).describe('Recipient email(s).'),
      subject: z.string().describe('Email subject'),
      body_text: z.string().describe('Plain text body'),
      body_html: z.string().optional().describe('Optional HTML body (multipart/alternative)'),
      cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC email(s)'),
      bcc: z.union([z.string(), z.array(z.string())]).optional().describe('BCC email(s)'),
      thread_id: z.string().optional().describe('Optional Gmail threadId to attach to'),
      in_reply_to: z.string().optional().describe('Optional RFC822 In-Reply-To header value'),
      references: z.string().optional().describe('Optional RFC822 References header value'),
    },
    async ({ to, subject, body_text, body_html, cc, bcc, thread_id, in_reply_to, references }) => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        const result = await gmail.createDraft({
          to,
          subject,
          bodyText: body_text,
          bodyHtml: body_html,
          cc,
          bcc,
          threadId: thread_id,
          inReplyTo: in_reply_to,
          references,
        });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, ...result }, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Create draft failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_modify_labels',
    'Add/remove Gmail label IDs on a message. Requires gmail.modify scope.',
    {
      email_id: z.string().describe('Gmail message ID'),
      add_label_ids: z.array(z.string()).default([]).describe('Label IDs to add'),
      remove_label_ids: z.array(z.string()).default([]).describe('Label IDs to remove'),
    },
    async ({ email_id, add_label_ids, remove_label_ids }) => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        await gmail.modifyLabels(email_id, { addLabelIds: add_label_ids, removeLabelIds: remove_label_ids });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Modify labels failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'gmail_trash',
    'Move an email to Trash. Requires gmail.modify scope.',
    { email_id: z.string().describe('Gmail message ID') },
    async ({ email_id }) => {
      try {
        const profile = await gmail.getProfile();
        assertAllowedEmail(profile.emailAddress);
        await gmail.trashMessage(email_id);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Trash failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  // ==========================================================================
  // Judgment Tier — Prompts
  // ==========================================================================

  server.prompt(
    'inbox_triage',
    'Triage unread inbox: cluster, summarize, and suggest replies/drafts.',
    () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `You have access to my Gmail via MCP tools.

Goal: triage my inbox (unread) efficiently.

Workflow:
1. Run gmail_search with query: "in:inbox is:unread" (limit 20).
2. Group emails by sender/domain and by topic (subject keywords).
3. For each group, propose an action: reply now, draft, label, archive/trash, or defer.
4. If drafting, use gmail_create_draft (not gmail_send) unless I explicitly ask you to send.`,
        },
      }],
    }),
  );

  server.prompt(
    'reply_safely',
    'Draft a reply to a specific email with minimal risk.',
    { email_id: z.string().describe('Gmail message ID to reply to') },
    async ({ email_id }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Draft a reply for the email ${email_id}.

Rules:
- First call gmail_get_email to read the message.
- Draft (gmail_create_draft), do not send.
- Keep the reply short and concrete.
- Include any missing questions or confirmations needed before sending.`,
        },
      }],
    }),
  );

  return server;
}

