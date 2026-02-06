/**
 * Contact Linker
 * 
 * Finds and links email senders to Notion Contacts database.
 * Uses email matching (highest confidence) with name fallback.
 */

import { Client } from '@notionhq/client';
import type { ContactData, ContactMatch, ContactsPropertyMapping } from '../types.js';

const DEFAULT_MAPPING: ContactsPropertyMapping = {
  name: 'Name',
  email: 'Email',
  secondaryEmail: 'Secondary Email',
  company: 'Company',
};

export class ContactLinker {
  private client: Client;
  private databaseId: string;
  private mapping: ContactsPropertyMapping;
  
  // In-memory cache for session
  private cache = new Map<string, ContactData>();

  constructor(options: {
    client: Client;
    databaseId: string;
    mapping?: Partial<ContactsPropertyMapping>;
  }) {
    this.client = options.client;
    this.databaseId = options.databaseId;
    this.mapping = { ...DEFAULT_MAPPING, ...options.mapping };
  }

  /**
   * Find a contact by email or name.
   * Returns confidence level to indicate match quality.
   */
  async findContact(email?: string, name?: string): Promise<ContactMatch | null> {
    // Check cache first (by email)
    if (email) {
      const normalizedEmail = email.toLowerCase();
      if (this.cache.has(normalizedEmail)) {
        return {
          contact: this.cache.get(normalizedEmail)!,
          confidence: 'exact_email',
        };
      }
    }

    // Try primary email match (highest confidence)
    if (email) {
      const emailMatch = await this.queryByEmail(email);
      if (emailMatch) {
        this.cache.set(email.toLowerCase(), emailMatch);
        return { contact: emailMatch, confidence: 'exact_email' };
      }
    }

    // Try secondary email match
    if (email && this.mapping.secondaryEmail) {
      const secondaryMatch = await this.queryBySecondaryEmail(email);
      if (secondaryMatch) {
        this.cache.set(email.toLowerCase(), secondaryMatch);
        return { contact: secondaryMatch, confidence: 'secondary_email' };
      }
    }

    // Try exact name match
    if (name) {
      const nameMatch = await this.queryByName(name, 'equals');
      if (nameMatch) {
        return { contact: nameMatch, confidence: 'exact_name' };
      }

      // Try partial name match (first name only)
      const firstName = name.split(' ')[0];
      if (firstName && firstName.length > 2) {
        const partialMatch = await this.queryByName(firstName, 'contains');
        if (partialMatch) {
          return { contact: partialMatch, confidence: 'partial_name' };
        }
      }
    }

    return null;
  }

  /**
   * Create a new contact in the Contacts database.
   */
  async createContact(data: {
    name: string;
    email?: string;
    company?: string;
  }): Promise<ContactData> {
    const properties: Record<string, unknown> = {};

    // Name (title)
    properties[this.mapping.name] = {
      title: [{ text: { content: data.name } }],
    };

    // Email
    if (data.email) {
      properties[this.mapping.email] = {
        email: data.email,
      };
    }

    // Company
    if (data.company && this.mapping.company) {
      properties[this.mapping.company] = {
        rich_text: [{ text: { content: data.company } }],
      };
    }

    const response = await this.client.pages.create({
      parent: { database_id: this.databaseId },
      properties: properties as Parameters<typeof this.client.pages.create>[0]['properties'],
    });

    const contact: ContactData = {
      id: response.id,
      name: data.name,
      email: data.email,
      company: data.company,
      notionPageId: response.id,
    };

    // Cache by email
    if (data.email) {
      this.cache.set(data.email.toLowerCase(), contact);
    }

    return contact;
  }

  /**
   * Query Contacts database by email.
   */
  private async queryByEmail(email: string): Promise<ContactData | null> {
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter: {
          property: this.mapping.email,
          email: { equals: email },
        },
        page_size: 1,
      });

      if (response.results.length === 0) return null;
      return this.parseContact(response.results[0]);
    } catch (error) {
      console.warn(`Warning: Could not query contacts by email: ${error}`);
      return null;
    }
  }

  /**
   * Query Contacts database by secondary email.
   */
  private async queryBySecondaryEmail(email: string): Promise<ContactData | null> {
    if (!this.mapping.secondaryEmail) return null;
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter: {
          property: this.mapping.secondaryEmail,
          email: { equals: email },
        },
        page_size: 1,
      });

      if (response.results.length === 0) return null;
      return this.parseContact(response.results[0]);
    } catch (error) {
      console.warn(`Warning: Could not query contacts by secondary email: ${error}`);
      return null;
    }
  }

  /**
   * Query Contacts database by name.
   */
  private async queryByName(
    name: string,
    match: 'equals' | 'contains'
  ): Promise<ContactData | null> {
    try {
      const filter = match === 'equals'
        ? { property: this.mapping.name, title: { equals: name } }
        : { property: this.mapping.name, title: { contains: name } };
      
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter,
        page_size: 1,
      });

      if (response.results.length === 0) return null;
      return this.parseContact(response.results[0]);
    } catch (error) {
      console.warn(`Warning: Could not query contacts by name: ${error}`);
      return null;
    }
  }

  /**
   * Parse Notion page into ContactData.
   */
  private parseContact(page: unknown): ContactData {
    const p = page as {
      id: string;
      properties: Record<string, unknown>;
    };

    const getName = (): string => {
      const prop = p.properties[this.mapping.name] as { 
        title?: Array<{ plain_text: string }> 
      };
      return prop?.title?.[0]?.plain_text || 'Unknown';
    };

    const getEmail = (): string | undefined => {
      const prop = p.properties[this.mapping.email] as { email?: string };
      return prop?.email;
    };

    const getSecondaryEmail = (): string | undefined => {
      if (!this.mapping.secondaryEmail) return undefined;
      const prop = p.properties[this.mapping.secondaryEmail] as { email?: string };
      return prop?.email;
    };

    const getCompany = (): string | undefined => {
      if (!this.mapping.company) return undefined;
      const prop = p.properties[this.mapping.company] as { 
        rich_text?: Array<{ plain_text: string }> 
      };
      return prop?.rich_text?.[0]?.plain_text;
    };

    return {
      id: p.id,
      name: getName(),
      email: getEmail(),
      secondaryEmail: getSecondaryEmail(),
      company: getCompany(),
      notionPageId: p.id,
    };
  }

  /**
   * Clear the in-memory cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
