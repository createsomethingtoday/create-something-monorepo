/**
 * Half Dozen Gmail Sync - MCP Server
 *
 * Provides tools for AI agents to sync Gmail emails to Notion
 * and manage contact linking.
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Gmail labels, contact catalog, sync status
 *   Automation tier (Tools)     — Email search, sync, contact management
 *   Judgment tier (Prompts)     — Sync workflow, contact research
 *
 * Upgraded to @modelcontextprotocol/sdk ^1.25.3 with McpServer + Zod schemas.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { config } from 'dotenv';
import { GmailClient } from '../gmail/client.js';
import { InteractionsClient } from '../notion/interactions.js';
import { ContactLinker } from '../notion/linker.js';
import { Client } from '@notionhq/client';
import type { InteractionData } from '../types.js';

// Load environment
config();

// Validate required env vars before initializing clients
const REQUIRED_ENV = ['NOTION_API_KEY', 'NOTION_INTERACTIONS_DB_ID', 'NOTION_CONTACTS_DB_ID'] as const;
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Set them in .env file or environment variables.');
  process.exit(1);
}

// Initialize clients
const gmail = new GmailClient();
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const interactions = new InteractionsClient({
  interactionsDatabaseId: process.env.NOTION_INTERACTIONS_DB_ID as string,
  contactsDatabaseId: process.env.NOTION_CONTACTS_DB_ID as string,
});
const contactLinker = new ContactLinker({
  client: notion,
  databaseId: process.env.NOTION_CONTACTS_DB_ID as string,
});

// Team emails for direction detection
function getTeamEmails(): string[] {
  const emails = process.env.TEAM_EMAILS || '';
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

// =============================================================================
// Server Factory
// =============================================================================

const server = new McpServer({
  name: 'halfdozen-gmail-sync',
  version: '2.0.0',
  icons: [{
    src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjE2IiB4PSIyIiB5PSI0IiByeD0iMiIvPjxwYXRoIGQ9Im0yMiA3LTguOTcgNS43YTEuOTQgMS45NCAwIDAgMS0yLjA2IDBMMiA3Ii8+PC9nPjwvc3ZnPg==',
    mimeType: 'image/svg+xml',
    sizes: ['any'],
  }],
});

// =============================================================================
// Database Tier — Resources
// =============================================================================

server.resource(
  'gmail-labels',
  'gmail://labels',
  { description: 'All Gmail labels available for filtering email searches', mimeType: 'application/json' },
  async () => {
    try {
      const labels = await gmail.getLabels();
      return {
        contents: [{
          uri: 'gmail://labels',
          mimeType: 'application/json',
          text: JSON.stringify({ count: labels.length, labels: labels.map(l => ({ id: l.id, name: l.name })) }, null, 2),
        }],
      };
    } catch (error) {
      return {
        contents: [{
          uri: 'gmail://labels',
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Failed to fetch labels. Ensure Gmail OAuth is configured.' }),
        }],
      };
    }
  },
);

server.resource(
  'sync-config',
  'sync://config',
  { description: 'Current sync configuration (team emails, database IDs)', mimeType: 'application/json' },
  async () => ({
    contents: [{
      uri: 'sync://config',
      mimeType: 'application/json',
      text: JSON.stringify({
        teamEmails: getTeamEmails(),
        interactionsDatabaseId: process.env.NOTION_INTERACTIONS_DB_ID,
        contactsDatabaseId: process.env.NOTION_CONTACTS_DB_ID,
        gmailConfigured: !!process.env.GOOGLE_CLIENT_ID,
      }, null, 2),
    }],
  }),
);

// =============================================================================
// Automation Tier — Tools
// =============================================================================

server.tool(
  'gmail_search',
  `Search Gmail for emails matching a query. Use when the user wants to find specific emails before syncing them. Supports Gmail search syntax (from:, to:, subject:, label:, after:, before:, has:attachment, etc.).`,
  {
    query: z.string().describe('Gmail search query (e.g., "from:client@example.com after:2024/01/01")'),
    limit: z.number().min(1).max(100).default(10).describe('Maximum number of emails to return (1-100, default: 10)'),
  },
  async ({ query, limit }) => {
    try {
      const emails = await gmail.searchEmails({
        query,
        maxResults: limit,
        includeBody: false,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: emails.length,
            has_more: emails.length === limit,
            emails: emails.map(e => ({
              id: e.id,
              subject: e.subject,
              from: e.from,
              date: e.date,
              snippet: e.snippet,
              hasAttachments: e.hasAttachments,
            })),
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Gmail search failed. Ensure OAuth is configured by running "pnpm auth". Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'gmail_sync_email',
  `Sync a single Gmail email to the Notion Interactions database. Use when the user has identified a specific email (by ID from gmail_search) they want to track in Notion. Automatically links to existing contacts or creates a new contact for the sender.`,
  {
    email_id: z.string().describe('Gmail message ID (from gmail_search results)'),
  },
  async ({ email_id }) => {
    try {
      const email = await gmail.getEmail(email_id);
      if (!email) {
        return {
          content: [{ type: 'text', text: `Email not found with ID "${email_id}". Use gmail_search to find valid email IDs first.` }],
          isError: true,
        };
      }

      const teamEmails = getTeamEmails();
      const interaction: InteractionData = {
        subject: email.subject,
        from: email.from,
        to: email.to,
        date: email.date,
        snippet: email.snippet,
        body: email.body,
        gmailId: email.id,
        threadId: email.threadId,
        direction: teamEmails.includes(email.from.email.toLowerCase()) ? 'Outbound' : 'Inbound',
      };

      const result = await interactions.syncEmail(interaction);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            interactionId: result.interactionId,
            pageUrl: result.pageUrl,
            contactId: result.contactId,
            contactCreated: result.contactCreated,
            error: result.error,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Sync failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'gmail_sync_by_query',
  `Search Gmail and sync all matching emails to Notion Interactions in bulk. Use when the user wants to sync multiple emails at once (e.g., "sync all emails from this client last month"). Automatically creates contacts for unknown senders.`,
  {
    query: z.string().describe('Gmail search query'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum emails to sync (1-50, default: 10)'),
  },
  async ({ query, limit }) => {
    try {
      const emails = await gmail.searchEmails({ query, maxResults: limit, includeBody: true });

      if (emails.length === 0) {
        return {
          content: [{ type: 'text', text: 'No emails found matching that query. Try broadening your search terms.' }],
        };
      }

      const teamEmails = getTeamEmails();
      const interactionsList: InteractionData[] = emails.map(email => ({
        subject: email.subject,
        from: email.from,
        to: email.to,
        date: email.date,
        snippet: email.snippet,
        body: email.body,
        gmailId: email.id,
        threadId: email.threadId,
        direction: teamEmails.includes(email.from.email.toLowerCase()) ? 'Outbound' : 'Inbound',
      }));

      const result = await interactions.syncEmails(interactionsList);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total: result.total,
            synced: result.successful,
            skipped: result.skipped,
            failed: result.failed,
            has_more: emails.length === limit,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Bulk sync failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'contact_find',
  `Find a contact in the Notion Contacts database. Use when the user asks about a specific person or wants to check if a contact exists before creating one. Searches by email first, then falls back to name.`,
  {
    email: z.string().optional().describe('Email address to search for (preferred — exact match)'),
    name: z.string().optional().describe('Name to search for (used if email not provided or not found)'),
  },
  async ({ email, name }) => {
    if (!email && !name) {
      return {
        content: [{ type: 'text', text: 'Provide either an email address or name to search for a contact.' }],
        isError: true,
      };
    }

    try {
      const match = await contactLinker.findContact(email, name);

      if (!match) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ found: false, suggestion: 'Contact not found. Use contact_create to add them.' }) }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            found: true,
            confidence: match.confidence,
            contact: {
              id: match.contact.id,
              name: match.contact.name,
              email: match.contact.email,
              company: match.contact.company,
              notionUrl: `https://notion.so/${match.contact.notionPageId.replace(/-/g, '')}`,
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Contact search failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'contact_create',
  `Create a new contact in the Notion Contacts database. Use when the user wants to add a new person they've been communicating with. Check with contact_find first to avoid duplicates.`,
  {
    name: z.string().describe('Contact full name'),
    email: z.string().optional().describe('Contact email address'),
    company: z.string().optional().describe('Company name'),
  },
  async ({ name, email, company }) => {
    try {
      const contact = await contactLinker.createContact({ name, email, company });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            created: true,
            contact: {
              id: contact.id,
              name: contact.name,
              email: contact.email,
              company: contact.company,
              notionUrl: `https://notion.so/${contact.notionPageId.replace(/-/g, '')}`,
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Contact creation failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'contact_enrich',
  `Append research notes to a contact page in Notion. Use after researching a contact (via browser, Perplexity, etc.) to add background info, LinkedIn summary, company details, or meeting notes. Notes are appended as dated sections so the page builds a research log over time.`,
  {
    contact_id: z.string().describe('Notion page ID of the contact to enrich'),
    notes: z.string().describe('Research notes to append (plain text, can be multi-paragraph)'),
    source: z.string().optional().describe('Source of the information (e.g., "LinkedIn", "Perplexity", "Company website")'),
  },
  async ({ contact_id, notes, source }) => {
    try {
      const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      const blocks: Parameters<typeof notion.blocks.children.append>[0]['children'] = [
        {
          type: 'heading_2' as const,
          heading_2: {
            rich_text: [{ type: 'text' as const, text: { content: `Research Notes \u2014 ${date}` } }],
          },
        },
      ];

      if (source) {
        blocks.push({
          type: 'callout' as const,
          callout: {
            icon: { emoji: '\uD83D\uDD0D' as const },
            rich_text: [{ type: 'text' as const, text: { content: `Source: ${source}` } }],
          },
        });
      }

      // Chunk notes respecting Notion's 2000-char rich_text limit
      const noteChunks: string[] = [];
      let remaining = notes.trim();
      while (remaining.length > 0) {
        if (remaining.length <= 1900) {
          noteChunks.push(remaining);
          break;
        }
        const sentenceEnd = remaining.lastIndexOf('. ', 1900);
        const splitAt = sentenceEnd > 950 ? sentenceEnd + 2 : 1900;
        noteChunks.push(remaining.substring(0, splitAt).trim());
        remaining = remaining.substring(splitAt).trim();
      }

      for (const chunk of noteChunks) {
        blocks.push({
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [{ type: 'text' as const, text: { content: chunk } }],
          },
        });
      }

      blocks.push({ type: 'divider' as const, divider: {} });

      await notion.blocks.children.append({ block_id: contact_id, children: blocks });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            contact_id,
            blocks_added: blocks.length,
            url: `https://notion.so/${contact_id.replace(/-/g, '')}`,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Enrichment failed: ${error instanceof Error ? error.message : String(error)}. Verify the contact_id is correct.` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'contact_relink',
  `Re-link an Interaction to a different Contact. Use when an email was synced and auto-created a duplicate contact, but the sender is actually an existing contact using a different email address. Optionally saves the sender's email as a Secondary Email alias and archives the auto-created duplicate.`,
  {
    interaction_id: z.string().describe('Notion page ID of the Interaction to re-link'),
    contact_id: z.string().describe('Notion page ID of the correct Contact to link to'),
    sender_email: z.string().optional().describe('Email address to save as Secondary Email alias on the contact'),
    delete_auto_created_contact_id: z.string().optional().describe('Notion page ID of the auto-created contact to archive'),
  },
  async ({ interaction_id, contact_id, sender_email, delete_auto_created_contact_id }) => {
    try {
      // 1. Update the Interaction's Contacts relation
      await notion.pages.update({
        page_id: interaction_id,
        properties: {
          Contacts: { relation: [{ id: contact_id }] },
        } as Parameters<typeof notion.pages.update>[0]['properties'],
      });

      // 2. Try to save sender email as Secondary Email alias
      let aliasSaved = false;
      let aliasNote: string | undefined;

      if (sender_email) {
        const contactPage = await notion.pages.retrieve({ page_id: contact_id });
        const props = (contactPage as { properties: Record<string, unknown> }).properties;
        const secondaryEmail = (props['Secondary Email'] as { email?: string })?.email;

        if (!secondaryEmail) {
          await notion.pages.update({
            page_id: contact_id,
            properties: {
              'Secondary Email': { email: sender_email },
            } as Parameters<typeof notion.pages.update>[0]['properties'],
          });
          aliasSaved = true;
        } else {
          aliasNote = 'Both email fields already in use — alias not saved. Consider adding manually.';
        }
      }

      // 3. Archive the auto-created contact if requested
      if (delete_auto_created_contact_id) {
        await notion.pages.update({
          page_id: delete_auto_created_contact_id,
          archived: true,
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            linked: true,
            contact_id,
            alias_saved: aliasSaved,
            alias_note: aliasNote,
            auto_created_archived: !!delete_auto_created_contact_id,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Re-link failed: ${error instanceof Error ? error.message : String(error)}. Verify all page IDs are correct.` }],
        isError: true,
      };
    }
  },
);

// =============================================================================
// Judgment Tier — Prompts
// =============================================================================

server.prompt(
  'sync_workflow',
  'Guided workflow for syncing emails from a specific contact or time period to Notion. Walks through search, review, and sync steps.',
  {
    target: z.string().describe('Who or what to sync (e.g., "emails from john@acme.com last week")'),
  },
  async ({ target }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Help me sync emails to Notion. Target: ${target}

Follow this workflow:
1. Use gmail_search to find matching emails
2. Show me a summary of what was found (count, senders, date range)
3. Ask if I want to sync all or select specific ones
4. Sync the selected emails using gmail_sync_email or gmail_sync_by_query
5. Report the results (synced, skipped, any new contacts created)`,
      },
    }],
  }),
);

server.prompt(
  'contact_research',
  'Research and enrich a contact with background information from available sources.',
  {
    contact_name: z.string().describe('Name of the contact to research'),
  },
  async ({ contact_name }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Research the contact "${contact_name}" and add findings to their Notion page.

Steps:
1. Use contact_find to locate them in Notion
2. Search for background information (company, role, LinkedIn, recent news)
3. Use contact_enrich to append research notes with proper source attribution
4. Summarize what was found and added`,
      },
    }],
  }),
);

// =============================================================================
// Start Server
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Half Dozen Gmail Sync MCP server v2.0.0 started (SDK ^1.25.3, Zod schemas)');
}

main().catch(console.error);
