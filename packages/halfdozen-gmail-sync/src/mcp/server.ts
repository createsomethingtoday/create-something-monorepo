/**
 * Half Dozen Gmail Sync - MCP Server
 * 
 * Provides tools for AI agents to sync Gmail emails to Notion
 * and manage contact linking.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
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

// Create MCP server
const server = new Server(
  {
    name: 'halfdozen-gmail-sync',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_emails',
      description: 'Search Gmail for emails matching a query. Use Gmail search syntax (from:, to:, subject:, label:, after:, before:, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query (e.g., "from:client@example.com", "subject:proposal", "label:Important")',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of emails to return (default: 10)',
            default: 10,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'sync_email',
      description: 'Sync a Gmail email to the Notion Interactions database. Automatically links to existing contacts by email match.',
      inputSchema: {
        type: 'object',
        properties: {
          email_id: {
            type: 'string',
            description: 'Gmail message ID to sync',
          },
          create_contact: {
            type: 'boolean',
            description: 'Create a new contact if sender not found (default: false)',
            default: false,
          },
        },
        required: ['email_id'],
      },
    },
    {
      name: 'sync_emails_by_query',
      description: 'Search Gmail and sync all matching emails to Notion Interactions. Good for bulk syncing.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum emails to sync (default: 10)',
            default: 10,
          },
          create_contacts: {
            type: 'boolean',
            description: 'Create contacts for unknown senders (default: false)',
            default: false,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'find_contact',
      description: 'Find a contact in the Notion Contacts database by email or name',
      inputSchema: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email address to search for',
          },
          name: {
            type: 'string',
            description: 'Name to search for (used if email not found)',
          },
        },
      },
    },
    {
      name: 'create_contact',
      description: 'Create a new contact in the Notion Contacts database',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Contact name',
          },
          email: {
            type: 'string',
            description: 'Contact email address',
          },
          company: {
            type: 'string',
            description: 'Company name (optional)',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'get_email_labels',
      description: 'List all Gmail labels (useful for finding label names for queries)',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_emails': {
        const { query, limit = 10 } = args as { query: string; limit?: number };
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
      }

      case 'sync_email': {
        const { email_id, create_contact = false } = args as { 
          email_id: string; 
          create_contact?: boolean;
        };

        // Fetch the full email
        const email = await gmail.getEmail(email_id);
        if (!email) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Email not found' }) }],
          };
        }

        // Convert to InteractionData
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

        // Sync to Notion
        const result = await interactions.syncEmail(interaction, {
          createContactIfMissing: create_contact,
        });

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
      }

      case 'sync_emails_by_query': {
        const { query, limit = 10, create_contacts = false } = args as {
          query: string;
          limit?: number;
          create_contacts?: boolean;
        };

        // Search and fetch emails
        const emails = await gmail.searchEmails({
          query,
          maxResults: limit,
          includeBody: true,
        });

        if (emails.length === 0) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ message: 'No emails found', count: 0 }) }],
          };
        }

        // Convert to InteractionData
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

        // Sync all
        const result = await interactions.syncEmails(interactionsList, {
          createContactsIfMissing: create_contacts,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total: result.total,
              synced: result.successful,
              skipped: result.skipped,
              failed: result.failed,
            }, null, 2),
          }],
        };
      }

      case 'find_contact': {
        const { email, name } = args as { email?: string; name?: string };
        
        if (!email && !name) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Provide email or name' }) }],
          };
        }

        const match = await contactLinker.findContact(email, name);

        if (!match) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ found: false }) }],
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
      }

      case 'create_contact': {
        const { name, email, company } = args as { 
          name: string; 
          email?: string; 
          company?: string;
        };

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
      }

      case 'get_email_labels': {
        const labels = await gmail.getLabels();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: labels.length,
              labels: labels.map(l => ({ id: l.id, name: l.name })),
            }, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          error: error instanceof Error ? error.message : String(error) 
        }),
      }],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Half Dozen Gmail Sync MCP server started');
}

main().catch(console.error);
