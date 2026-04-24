import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'transcript_analysis',
    {
      objective: z
        .string()
        .optional()
        .describe('Optional analysis objective, such as summary, action items, or objections'),
      outputStyle: z
        .enum(['summary', 'actions', 'full'])
        .optional()
        .describe('Controls how much emphasis to place on action items versus general analysis'),
    },
    ({ objective, outputStyle }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Analyze the YouTube transcript already in context.',
              'If the transcript is not already present, call `extract_transcript` first.',
              objective ? `Focus on this objective: ${objective}.` : 'Provide the main argument, notable evidence, and key takeaways.',
              outputStyle === 'actions'
                ? 'Prioritize concrete action items, owners, and follow-ups.'
                : outputStyle === 'summary'
                  ? 'Keep the output concise and executive-friendly.'
                  : 'Include a concise summary, notable quotes with timestamps when available, and explicit action items.',
            ].join(' '),
          },
        },
      ],
    }),
  );
}
