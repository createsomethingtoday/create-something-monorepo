/**
 * Gmail API client wrapper (single-user).
 */

import { google, gmail_v1 } from 'googleapis';
import type { EmailAddress, EmailData, ThreadData } from '../types.js';
import { GmailOAuth } from './oauth.js';

function decodeBase64(data: string): string {
  return Buffer.from(data, 'base64').toString('utf-8');
}

function base64UrlEncode(raw: string): string {
  return Buffer.from(raw, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function formatAddressList(addrs: string[] | string): string {
  const list = Array.isArray(addrs) ? addrs : [addrs];
  return list.map(s => s.trim()).filter(Boolean).join(', ');
}

export class GmailClient {
  private gmail: gmail_v1.Gmail | null = null;
  private oauth: GmailOAuth;

  constructor() {
    this.oauth = new GmailOAuth();
  }

  private async getGmail(): Promise<gmail_v1.Gmail> {
    if (!this.gmail) {
      const auth = await this.oauth.getAuthenticatedClient();
      this.gmail = google.gmail({ version: 'v1', auth });
    }
    return this.gmail;
  }

  async getProfile(): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number; historyId: string }> {
    const gmail = await this.getGmail();
    const res = await gmail.users.getProfile({ userId: 'me' });
    const data = res.data;
    return {
      emailAddress: data.emailAddress || '',
      messagesTotal: data.messagesTotal || 0,
      threadsTotal: data.threadsTotal || 0,
      historyId: data.historyId || '',
    };
  }

  async getLabels(): Promise<Array<{ id: string; name: string }>> {
    const gmail = await this.getGmail();
    const response = await gmail.users.labels.list({ userId: 'me' });
    return (response.data.labels || [])
      .filter(l => l.id && l.name)
      .map(l => ({ id: l.id!, name: l.name! }));
  }

  async searchEmails(options: {
    query: string;
    maxResults?: number;
    includeBody?: boolean;
  }): Promise<EmailData[]> {
    const { query, maxResults = 10, includeBody = false } = options;
    const gmail = await this.getGmail();

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messageIds = listResponse.data.messages || [];
    if (messageIds.length === 0) return [];

    const emails: EmailData[] = [];

    for (const { id } of messageIds) {
      if (!id) continue;
      const format = includeBody ? 'full' : 'metadata';
      const metadataHeaders = ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID', 'References', 'In-Reply-To'];

      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id,
        format,
        metadataHeaders,
      });

      const email = this.parseMessage(msgResponse.data, includeBody);
      if (email) emails.push(email);
    }

    return emails;
  }

  async getEmail(messageId: string): Promise<EmailData | null> {
    const gmail = await this.getGmail();
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return this.parseMessage(response.data, true);
  }

  async getThread(threadId: string, options?: { includeBody?: boolean; limit?: number }): Promise<ThreadData | null> {
    const includeBody = options?.includeBody ?? false;
    const limit = options?.limit ?? 50;
    const gmail = await this.getGmail();

    const format = includeBody ? 'full' : 'metadata';
    const metadataHeaders = ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID', 'References', 'In-Reply-To'];

    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format,
      metadataHeaders,
    });

    const messages = (response.data.messages || [])
      .slice(-limit)
      .map(m => this.parseMessage(m, includeBody))
      .filter(Boolean) as EmailData[];

    if (!response.data.id) return null;
    return { id: response.data.id, messages };
  }

  async sendEmail(input: {
    to: string[] | string;
    subject: string;
    bodyText: string;
    cc?: string[] | string;
    bcc?: string[] | string;
    bodyHtml?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<{ id: string; threadId: string }> {
    const gmail = await this.getGmail();
    const raw = this.buildRawEmail(input);

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        ...(input.threadId ? { threadId: input.threadId } : {}),
      },
    });

    return { id: response.data.id || '', threadId: response.data.threadId || '' };
  }

  async createDraft(input: {
    to: string[] | string;
    subject: string;
    bodyText: string;
    cc?: string[] | string;
    bcc?: string[] | string;
    bodyHtml?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<{ draftId: string; messageId: string; threadId: string }> {
    const gmail = await this.getGmail();
    const raw = this.buildRawEmail(input);
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw,
          ...(input.threadId ? { threadId: input.threadId } : {}),
        },
      },
    });

    return {
      draftId: response.data.id || '',
      messageId: response.data.message?.id || '',
      threadId: response.data.message?.threadId || '',
    };
  }

  async modifyLabels(messageId: string, input: { addLabelIds?: string[]; removeLabelIds?: string[] }): Promise<void> {
    const gmail = await this.getGmail();
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: input.addLabelIds || [],
        removeLabelIds: input.removeLabelIds || [],
      },
    });
  }

  async trashMessage(messageId: string): Promise<void> {
    const gmail = await this.getGmail();
    await gmail.users.messages.trash({ userId: 'me', id: messageId });
  }

  private buildRawEmail(input: {
    to: string[] | string;
    subject: string;
    bodyText: string;
    cc?: string[] | string;
    bcc?: string[] | string;
    bodyHtml?: string;
    inReplyTo?: string;
    references?: string;
  }): string {
    const headers: string[] = [];
    headers.push(`To: ${formatAddressList(input.to)}`);
    if (input.cc) headers.push(`Cc: ${formatAddressList(input.cc)}`);
    if (input.bcc) headers.push(`Bcc: ${formatAddressList(input.bcc)}`);
    headers.push(`Subject: ${input.subject}`);
    headers.push('MIME-Version: 1.0');
    if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
    if (input.references) headers.push(`References: ${input.references}`);

    if (input.bodyHtml) {
      const boundary = `alt_${Math.random().toString(16).slice(2)}`;
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

      const body = [
        ...headers,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        input.bodyText,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        input.bodyHtml,
        '',
        `--${boundary}--`,
        '',
      ].join('\r\n');

      return base64UrlEncode(body);
    }

    headers.push('Content-Type: text/plain; charset="UTF-8"');
    const raw = [...headers, '', input.bodyText, ''].join('\r\n');
    return base64UrlEncode(raw);
  }

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

    const attachments = this.extractAttachmentMeta(message.payload);

    return {
      id: message.id,
      threadId: message.threadId,
      messageIdHeader: getHeader('Message-ID') || undefined,
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

  private extractBody(payload: gmail_v1.Schema$MessagePart): { plain: string; html: string } {
    let plain = '';
    let html = '';

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        plain = decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64(part.body.data);
      }

      if (part.parts) {
        for (const subPart of part.parts) processPart(subPart);
      }
    };

    if (payload.body?.data) {
      const decoded = decodeBase64(payload.body.data);
      if (payload.mimeType === 'text/plain') plain = decoded;
      if (payload.mimeType === 'text/html') html = decoded;
    }

    if (payload.parts) {
      for (const part of payload.parts) processPart(part);
    }

    if (!plain && html) plain = this.stripHtml(html);
    return { plain, html };
  }

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
        for (const subPart of part.parts) processPart(subPart);
      }
    };

    if (payload) processPart(payload);
    return attachments;
  }

  private parseEmailAddress(value: string): EmailAddress {
    const cleaned = (value || '').trim();
    const match = cleaned.match(/^(.*?)<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].trim().replace(/^\"|\"$/g, '') || match[2].trim(),
        email: match[2].trim().toLowerCase(),
      };
    }
    return { name: cleaned, email: cleaned.toLowerCase() };
  }

  private parseEmailAddressList(value: string): EmailAddress[] {
    if (!value) return [];
    // Split on commas not inside quotes (good enough for typical cases)
    const parts = value.split(/,(?![^"]*")/g).map(s => s.trim()).filter(Boolean);
    return parts.map(p => this.parseEmailAddress(p));
  }

  private parseDate(value: string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return new Date(0).toISOString();
    return date.toISOString();
  }
}

