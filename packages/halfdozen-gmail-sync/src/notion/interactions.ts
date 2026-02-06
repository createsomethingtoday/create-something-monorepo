/**
 * Interactions Client
 * 
 * Syncs email data to Notion Interactions database.
 * Links to Contacts and stores email body in page content.
 */

import { Client } from '@notionhq/client';
import type {
  InteractionData,
  InteractionsPropertyMapping,
  SyncResult,
  BatchSyncResult,
} from '../types.js';
import { ContactLinker } from './linker.js';

/** Maximum characters per rich text block (Notion limit) */
const CHUNK_SIZE = 1900;

/** Maximum blocks per append request (Notion limit) */
const MAX_BLOCKS_PER_REQUEST = 100;

const DEFAULT_MAPPING: InteractionsPropertyMapping = {
  title: 'Interaction',      // Title property in HD database
  from: 'From',              // Will be created if missing
  to: 'To',                  // Will be created if missing  
  date: 'Date',
  direction: 'Direction',    // Will be created if missing
  contact: 'Contacts',       // Relation to Contacts DB
  gmailId: 'Gmail ID',       // Will be created if missing (for dedup)
  status: 'Status',          // Optional
  type: 'Type',
};

export class InteractionsClient {
  private client: Client;
  private databaseId: string;
  private contactLinker: ContactLinker;
  private mapping: InteractionsPropertyMapping;

  constructor(options: {
    apiKey?: string;
    interactionsDatabaseId: string;
    contactsDatabaseId: string;
    mapping?: Partial<InteractionsPropertyMapping>;
  }) {
    const apiKey = options.apiKey || process.env.NOTION_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'NOTION_API_KEY required.\n' +
        'Set it in .env file or environment variables.'
      );
    }

    this.client = new Client({ auth: apiKey });
    this.databaseId = options.interactionsDatabaseId;
    this.mapping = { ...DEFAULT_MAPPING, ...options.mapping };
    
    this.contactLinker = new ContactLinker({
      client: this.client,
      databaseId: options.contactsDatabaseId,
    });
  }

  /**
   * Sync a single email to Interactions database.
   */
  async syncEmail(
    interaction: InteractionData,
    options: { createContactIfMissing?: boolean } = {}
  ): Promise<SyncResult> {
    const { createContactIfMissing = true } = options;

    try {
      // 1. Check if already synced (by Gmail ID)
      const exists = await this.emailExists(interaction.gmailId);
      if (exists) {
        return {
          success: true,
          error: 'Skipped: email already synced',
        };
      }

      // 2. Find or create contact
      let contactId: string | undefined;
      let contactCreated = false;

      const contactMatch = await this.contactLinker.findContact(
        interaction.from.email,
        interaction.from.name
      );

      if (contactMatch) {
        contactId = contactMatch.contact.notionPageId;
        console.log(`   → Linked to contact: ${contactMatch.contact.name} (${contactMatch.confidence})`);
      } else if (createContactIfMissing && interaction.from.email) {
        const newContact = await this.contactLinker.createContact({
          name: interaction.from.name || interaction.from.email.split('@')[0],
          email: interaction.from.email,
        });
        contactId = newContact.notionPageId;
        contactCreated = true;
        console.log(`   → Created new contact: ${newContact.name}`);
      } else {
        console.log(`   → No contact found for: ${interaction.from.email}`);
      }

      // 3. Create Interaction page
      const properties = this.buildProperties(interaction, contactId);
      
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: properties as Parameters<typeof this.client.pages.create>[0]['properties'],
      });

      const pageId = response.id;
      const pageUrl = (response as { url?: string }).url;

      // 4. Append email metadata and body to page content
      await this.appendEmailContent(pageId, interaction);

      return {
        success: true,
        interactionId: pageId,
        pageUrl,
        contactId,
        contactCreated,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Batch sync multiple emails.
   */
  async syncEmails(
    interactions: InteractionData[],
    options: { createContactsIfMissing?: boolean } = { createContactsIfMissing: true }
  ): Promise<BatchSyncResult> {
    const results: SyncResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`\n📬 Processing ${interactions.length} email(s)...\n`);

    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      
      console.log(`[${i + 1}/${interactions.length}] ${interaction.subject.substring(0, 50)}...`);

      const result = await this.syncEmail(interaction, {
        createContactIfMissing: options.createContactsIfMissing,
      });
      
      results.push(result);
      
      if (result.success && !result.error?.includes('Skipped')) {
        successful++;
        console.log(`   → ✅ Synced`);
      } else if (!result.success) {
        failed++;
        console.log(`   → ❌ Failed: ${result.error}`);
      } else {
        skipped++;
      }

      // Rate limit (Notion allows ~3 requests/second)
      await this.sleep(350);
    }

    return { total: interactions.length, successful, failed, skipped, results };
  }

  /**
   * Check if email already exists by searching title for Gmail ID.
   * Gmail ID is stored in title as: "Subject [gmailId]"
   */
  private async emailExists(gmailId: string): Promise<boolean> {
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter: {
          property: this.mapping.title,
          title: { contains: `[${gmailId}]` },
        },
        page_size: 1,
      });

      return response.results.length > 0;
    } catch (error) {
      console.warn(`Warning: Could not check for existing email: ${error}`);
      return false;
    }
  }

  /**
   * Build Notion properties from InteractionData.
   * Only includes properties that exist in the database.
   */
  private buildProperties(
    interaction: InteractionData,
    contactId?: string
  ): Record<string, unknown> {
    const m = this.mapping;
    const properties: Record<string, unknown> = {};

    // Title (Interaction) - include subject, sender, and Gmail ID for dedup
    // Gmail ID at end allows searching: "19c29992b1ae2df8"
    const titleContent = `${interaction.subject} [${interaction.gmailId}]`;
    properties[m.title] = {
      title: [{ text: { content: titleContent.substring(0, 2000) } }],
    };

    // Date
    properties[m.date] = {
      date: { start: interaction.date.split('T')[0] },
    };

    // From (email property)
    if (m.from && interaction.from.email) {
      properties[m.from] = {
        email: interaction.from.email,
      };
    }

    // To (rich text - comma-separated list)
    if (m.to && interaction.to.length > 0) {
      const toText = interaction.to.map(t => t.email).join(', ');
      properties[m.to] = {
        rich_text: [{ text: { content: toText.substring(0, 2000) } }],
      };
    }

    // Direction (select - Inbound/Outbound)
    if (m.direction) {
      properties[m.direction] = {
        select: { name: interaction.direction },
      };
    }

    // Contact relation (if found)
    if (contactId && m.contact) {
      properties[m.contact] = {
        relation: [{ id: contactId }],
      };
    }

    // Type (Email)
    if (m.type) {
      properties[m.type] = {
        select: { name: 'Email' },
      };
    }

    return properties;
  }

  /**
   * Append email metadata and body to page.
   */
  private async appendEmailContent(pageId: string, interaction: InteractionData): Promise<void> {
    try {
      // Add metadata block first
      const metadataBlock = {
        type: 'callout' as const,
        callout: {
          icon: { emoji: '📧' as const },
          rich_text: [{ 
            type: 'text' as const, 
            text: { 
              content: `From: ${interaction.from.email}\nTo: ${interaction.to.map(t => t.email).join(', ')}\nDirection: ${interaction.direction}\nGmail ID: ${interaction.gmailId}` 
            } 
          }],
        },
      };

      await this.client.blocks.children.append({
        block_id: pageId,
        children: [metadataBlock],
      });

      // Then add body if present
      if (interaction.body && interaction.body.trim()) {
        await this.sleep(350);
        await this.appendBodyToPage(pageId, interaction.body);
      }
    } catch (error) {
      console.warn(`Warning: Could not append email content: ${error}`);
    }
  }

  /**
   * Append email body as collapsible toggle block.
   */
  private async appendBodyToPage(pageId: string, body: string): Promise<void> {
    const chunks = this.chunkText(body, CHUNK_SIZE);
    
    if (chunks.length === 0) return;

    const paragraphs = chunks.map(chunk => ({
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: chunk } }],
      },
    }));

    const firstBatchSize = Math.min(paragraphs.length, MAX_BLOCKS_PER_REQUEST - 1);
    const firstBatch = paragraphs.slice(0, firstBatchSize);

    const toggleBlock = {
      type: 'toggle' as const,
      toggle: {
        rich_text: [{ type: 'text' as const, text: { content: '📧 Email Body' } }],
        children: firstBatch,
      },
    };

    try {
      const response = await this.client.blocks.children.append({
        block_id: pageId,
        children: [toggleBlock],
      });

      // Append remaining chunks if needed
      if (paragraphs.length > firstBatchSize) {
        const toggleId = response.results[0].id;
        
        for (let i = firstBatchSize; i < paragraphs.length; i += MAX_BLOCKS_PER_REQUEST) {
          const batch = paragraphs.slice(i, i + MAX_BLOCKS_PER_REQUEST);
          await this.client.blocks.children.append({
            block_id: toggleId,
            children: batch,
          });
          await this.sleep(350);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not append email body: ${error}`);
    }
  }

  /**
   * Chunk text at sentence boundaries.
   */
  private chunkText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text.trim();

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Find sentence boundary
      const sentenceEnd = remaining.lastIndexOf('. ', maxLength);
      const splitAt = sentenceEnd > maxLength * 0.5 
        ? sentenceEnd + 2
        : maxLength;

      chunks.push(remaining.substring(0, splitAt).trim());
      remaining = remaining.substring(splitAt).trim();
    }

    return chunks;
  }

  /**
   * Sleep helper for rate limiting.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
