/**
 * Gmail API Client
 * 
 * Wrapper around Google Gmail API for searching, reading, and parsing emails.
 */

import { google, gmail_v1 } from 'googleapis';
import type { EmailData, EmailAddress } from '../types.js';
import { GmailOAuth } from './oauth.js';

export class GmailClient {
  private gmail: gmail_v1.Gmail | null = null;
  private oauth: GmailOAuth;

  constructor() {
    this.oauth = new GmailOAuth();
  }

  /**
   * Get authenticated Gmail API client.
   */
  private async getGmail(): Promise<gmail_v1.Gmail> {
    if (!this.gmail) {
      const auth = await this.oauth.getAuthenticatedClient();
      this.gmail = google.gmail({ version: 'v1', auth });
    }
    return this.gmail;
  }

  /**
   * Search for emails matching a Gmail query.
   * 
   * @param options.query - Gmail search query (e.g., "from:client@example.com")
   * @param options.maxResults - Maximum emails to return (default: 10)
   * @param options.includeBody - Whether to fetch full email body (default: false)
   */
  async searchEmails(options: {
    query: string;
    maxResults?: number;
    includeBody?: boolean;
  }): Promise<EmailData[]> {
    const { query, maxResults = 10, includeBody = false } = options;
    const gmail = await this.getGmail();

    // List message IDs matching query
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messageIds = listResponse.data.messages || [];
    
    if (messageIds.length === 0) {
      return [];
    }

    const emails: EmailData[] = [];

    // Fetch each message
    for (const { id } of messageIds) {
      if (!id) continue;

      const format = includeBody ? 'full' : 'metadata';
      const metadataHeaders = ['From', 'To', 'Cc', 'Subject', 'Date'];

      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id,
        format,
        metadataHeaders,
      });

      const email = this.parseMessage(msgResponse.data, includeBody);
      if (email) {
        emails.push(email);
      }
    }

    return emails;
  }

  /**
   * Get a single email by ID.
   */
  async getEmail(messageId: string): Promise<EmailData | null> {
    const gmail = await this.getGmail();

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return this.parseMessage(response.data, true);
  }

  /**
   * Get emails with a specific label.
   */
  async getEmailsByLabel(labelId: string, maxResults = 20): Promise<EmailData[]> {
    return this.searchEmails({
      query: `label:${labelId}`,
      maxResults,
      includeBody: true,
    });
  }

  /**
   * Get user's Gmail labels.
   */
  async getLabels(): Promise<Array<{ id: string; name: string }>> {
    const gmail = await this.getGmail();
    
    const response = await gmail.users.labels.list({
      userId: 'me',
    });

    return (response.data.labels || [])
      .filter(l => l.id && l.name)
      .map(l => ({
        id: l.id!,
        name: l.name!,
      }));
  }

  /**
   * Parse Gmail API message into EmailData.
   */
  private parseMessage(message: gmail_v1.Schema$Message, includeBody: boolean): EmailData | null {
    if (!message.id || !message.threadId) return null;

    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const from = this.parseEmailAddress(getHeader('From'));
    const to = this.parseEmailAddressList(getHeader('To'));
    const cc = getHeader('Cc') ? this.parseEmailAddressList(getHeader('Cc')) : undefined;

    let body = '';
    let bodyHtml = '';

    if (includeBody && message.payload) {
      const extracted = this.extractBody(message.payload);
      body = extracted.plain;
      bodyHtml = extracted.html;
    }

    // Check for attachments
    const attachments = this.extractAttachmentMeta(message.payload);

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject') || '(No Subject)',
      from,
      to,
      cc,
      date: this.parseDate(getHeader('Date')),
      snippet: message.snippet || '',
      body,
      bodyHtml,
      labels: message.labelIds || [],
      hasAttachments: attachments.length > 0,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }

  /**
   * Extract plain text and HTML body from message payload.
   */
  private extractBody(payload: gmail_v1.Schema$MessagePart): { plain: string; html: string } {
    let plain = '';
    let html = '';

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        plain = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      // Recurse into nested parts
      if (part.parts) {
        for (const subPart of part.parts) {
          processPart(subPart);
        }
      }
    };

    // Handle single-part messages
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/plain') {
        plain = decoded;
      } else if (payload.mimeType === 'text/html') {
        html = decoded;
      }
    }

    // Handle multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        processPart(part);
      }
    }

    // If no plain text, strip HTML tags as fallback
    if (!plain && html) {
      plain = this.stripHtml(html);
    }

    return { plain, html };
  }

  /**
   * Strip HTML tags to get plain text.
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract attachment metadata (without downloading).
   */
  private extractAttachmentMeta(payload?: gmail_v1.Schema$MessagePart): NonNullable<EmailData['attachments']> {
    const attachments: NonNullable<EmailData['attachments']> = [];

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
        });
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          processPart(subPart);
        }
      }
    };

    if (payload) {
      processPart(payload);
    }

    return attachments;
  }

  /**
   * Parse "Name <email@example.com>" format.
   */
  private parseEmailAddress(raw: string): EmailAddress {
    const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
    
    if (match) {
      return {
        name: match[1]?.trim() || undefined,
        email: match[2]?.trim() || raw.trim(),
      };
    }

    return { email: raw.trim() };
  }

  /**
   * Parse comma-separated email list.
   */
  private parseEmailAddressList(raw: string): EmailAddress[] {
    if (!raw) return [];
    
    // Split on comma but not within quotes
    const parts = raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    return parts.map(p => this.parseEmailAddress(p.trim())).filter(e => e.email);
  }

  /**
   * Parse date string to ISO format.
   */
  private parseDate(dateStr: string): string {
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}
