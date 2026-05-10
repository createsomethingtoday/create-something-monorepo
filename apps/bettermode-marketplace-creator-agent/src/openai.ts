// OpenAI Chat Completions client. We use Chat Completions (not Responses)
// because it has the broadest model support and the response shape is stable.

import type { BettermodePost } from './bettermode';
import type { CreatorContext } from './airtable';
import { REGENERATE_HINT, SYSTEM_PROMPT } from './voice-canon';

const DEFAULT_BASE = 'https://api.openai.com/v1';

export type OpenAIConfig = {
  apiKey: string;
  apiBase: string;
  defaultModel: string;
  richModel: string;
};

export function openaiConfig(env: {
  OPENAI_API_KEY?: string;
  OPENAI_API_BASE?: string;
  OPENAI_MODEL_DEFAULT?: string;
  OPENAI_MODEL_RICH?: string;
}): OpenAIConfig | null {
  if (!env.OPENAI_API_KEY) return null;
  return {
    apiKey: env.OPENAI_API_KEY,
    apiBase: env.OPENAI_API_BASE || DEFAULT_BASE,
    defaultModel: env.OPENAI_MODEL_DEFAULT || 'gpt-4o-mini',
    richModel: env.OPENAI_MODEL_RICH || 'gpt-4o',
  };
}

export type DraftInput = {
  post: BettermodePost;
  isTopLevel: boolean;
  creator: CreatorContext | null;
  fewShotApprovedDrafts: Array<{
    post_excerpt: string;
    approved_reply: string;
  }>;
  regenerate?: boolean;
};

export async function generateDraft(input: DraftInput, config: OpenAIConfig): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...input.fewShotApprovedDrafts.flatMap((shot) => [
      { role: 'user' as const, content: `Example post:\n${shot.post_excerpt}` },
      { role: 'assistant' as const, content: shot.approved_reply },
    ]),
    { role: 'user', content: buildUserPrompt(input) },
  ];
  if (input.regenerate) {
    messages.push({ role: 'user', content: REGENERATE_HINT });
  }

  const model = input.isTopLevel ? config.richModel : config.defaultModel;
  const response = await fetch(`${config.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 600,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const draft = payload.choices?.[0]?.message?.content?.trim();
  if (!draft) throw new Error('OpenAI returned no draft content.');
  return draft;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function buildUserPrompt(input: DraftInput): string {
  const post = input.post;
  const lines: string[] = [];

  lines.push('## Post to reply to');
  if (post.title) lines.push(`Title: ${post.title}`);
  if (post.url) lines.push(`URL: ${post.url}`);
  lines.push(`Body:\n${stripHtml(post.shortContent || post.description || '')}`);
  lines.push('');

  const author = post.owner || post.createdBy;
  if (author) {
    lines.push('## Author (from Bettermode)');
    if (author.name) lines.push(`Name: ${author.name}`);
    if (author.username) lines.push(`Username: @${author.username}`);
    if (author.email) lines.push(`Email: ${author.email}`);
    if (author.role?.name) lines.push(`Role: ${author.role.name}`);
    lines.push('');
  }

  if (input.creator) {
    lines.push('## Author (from Webflow Creators Airtable)');
    lines.push(`Creator record: ${input.creator.creator.name || input.creator.creator.id}`);
    if (input.creator.creator.email) lines.push(`Email: ${input.creator.creator.email}`);

    if (input.creator.assets.length > 0) {
      lines.push('');
      lines.push('### Their templates / Assets');
      for (const asset of input.creator.assets) {
        const summary = summarizeAsset(asset.fields);
        lines.push(`- ${asset.name || asset.id}${summary ? `: ${summary}` : ''}`);
      }
    } else {
      lines.push('No linked templates in Airtable.');
    }
    lines.push('');
  } else {
    lines.push('## Author (from Webflow Creators Airtable)');
    lines.push('No matching Airtable record found by email.');
    lines.push('');
  }

  const replies = post.replies?.nodes ?? [];
  if (replies.length > 0) {
    lines.push('## Existing thread (oldest first)');
    for (const reply of replies) {
      const who = reply.createdBy?.name || reply.createdBy?.username || 'someone';
      lines.push(`- ${who}: ${stripHtml(reply.shortContent || reply.description || '').slice(0, 600)}`);
    }
    lines.push('');
  }

  lines.push('Draft the admin reply now. Output the reply text only.');
  return lines.join('\n');
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function summarizeAsset(fields: Record<string, unknown>): string {
  const parts: string[] = [];
  const status = pickString(fields, ['Status', 'Approval Status', 'Marketplace Status']);
  if (status) parts.push(`status=${status}`);
  const slug = pickString(fields, ['Slug', 'URL Slug']);
  if (slug) parts.push(`slug=${slug}`);
  const lastUpdate = pickString(fields, ['Last Updated', 'Updated', 'Modified']);
  if (lastUpdate) parts.push(`updated=${lastUpdate}`);
  return parts.join(', ');
}

function pickString(fields: Record<string, unknown>, names: string[]): string | undefined {
  for (const name of names) {
    const value = fields[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}
