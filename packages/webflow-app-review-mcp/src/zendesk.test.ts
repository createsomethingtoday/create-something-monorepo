import { describe, expect, it, vi } from 'vitest';

import { ZendeskClient, ZendeskClientError, renderCreatorFacingHtml } from './zendesk.js';

describe('renderCreatorFacingHtml', () => {
  it('escapes raw HTML tags so they render as visible text', () => {
    const html = renderCreatorFacingHtml('Remove the <script type="application/ld+json"> block.');
    expect(html).toContain('&lt;script type="application/ld+json"&gt;');
    expect(html).not.toMatch(/<script/);
  });

  it('renders backticked tags as code, matching the patched composer', () => {
    const html = renderCreatorFacingHtml('Remove the `<script>` block.');
    expect(html).toContain('<code>&lt;script&gt;</code>');
  });

  it('renders bold, links, and autolinks', () => {
    const html = renderCreatorFacingHtml(
      '**Required change:** see [the guidelines](https://example.com/docs) and <https://example.com/more>.',
    );
    expect(html).toContain('<strong>Required change:</strong>');
    expect(html).toContain('<a href="https://example.com/docs">the guidelines</a>');
    expect(html).toContain('<a href="https://example.com/more">https://example.com/more</a>');
  });

  it('renders ordered and unordered lists with <br> between paragraphs', () => {
    const html = renderCreatorFacingHtml('Hi Wistia,\n\n1. Fix the iframe.\n2. Pin the script.\n\nCheers');
    expect(html).toContain('<ol><li>Fix the iframe.</li><li>Pin the script.</li></ol>');
    expect(html).toContain('Hi Wistia,<br>');
    expect(html).toContain('Cheers');
  });
});

describe('ZendeskClient.addTicketComment', () => {
  it('PUTs an html_body comment with basic token auth', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://webflow2579.zendesk.com/api/v2/tickets/1170775.json');
      expect(init?.method).toBe('PUT');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Basic ${btoa('reviewer@webflow.com/token:secret')}`);
      const body = JSON.parse(String(init?.body)) as {
        ticket: { comment: { html_body: string; public: boolean } };
      };
      expect(body.ticket.comment.public).toBe(true);
      expect(body.ticket.comment.html_body).toContain('Hi Wistia');
      return new Response(JSON.stringify({ audit: { id: 42 }, ticket: { status: 'open' } }), { status: 200 });
    });

    const client = new ZendeskClient({
      subdomain: 'webflow2579',
      email: 'reviewer@webflow.com',
      apiToken: 'secret',
      fetchFn,
    });

    const result = await client.addTicketComment('1170775', { htmlBody: 'Hi Wistia', isPublic: true });
    expect(result).toEqual({ ticketId: '1170775', isPublic: true, auditId: 42, ticketStatus: 'open' });
  });

  it('rejects non-numeric ticket IDs without calling Zendesk', async () => {
    const fetchFn = vi.fn();
    const client = new ZendeskClient({
      subdomain: 'webflow2579',
      email: 'reviewer@webflow.com',
      apiToken: 'secret',
      fetchFn,
    });

    await expect(client.addTicketComment('recABC', { htmlBody: 'x', isPublic: true })).rejects.toMatchObject({
      code: 'INVALID_TICKET_ID',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('surfaces Zendesk errors with status and details', async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ error: 'RecordInvalid' }), { status: 422 }),
    );
    const client = new ZendeskClient({
      subdomain: 'webflow2579',
      email: 'reviewer@webflow.com',
      apiToken: 'secret',
      fetchFn,
    });

    await expect(client.addTicketComment('123', { htmlBody: 'x', isPublic: false })).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ZendeskClientError);
        expect((error as ZendeskClientError).status).toBe(422);
        return true;
      },
    );
  });
});
