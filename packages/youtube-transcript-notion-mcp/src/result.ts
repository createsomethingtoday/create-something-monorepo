import type { FetchDocumentResult, SearchResultItem } from './types.js';

type AppToolResultOptions = {
  visibleContent?: string;
};

export function appToolResult(
  structuredContent: Record<string, unknown>,
  narration?: string,
  meta?: Record<string, unknown>,
  options: AppToolResultOptions = {}
): {
  structuredContent: Record<string, unknown>;
  content: Array<{ type: 'text'; text: string }>;
  _meta?: Record<string, unknown>;
} {
  const visibleText = options.visibleContent ?? narration;

  return {
    structuredContent,
    content: visibleText ? [{ type: 'text' as const, text: visibleText }] : [],
    ...(meta ? { _meta: meta } : {})
  };
}

export function appErrorResult(
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
  meta?: Record<string, unknown>
): {
  isError: true;
  structuredContent: Record<string, unknown>;
  content: Array<{ type: 'text'; text: string }>;
  _meta?: Record<string, unknown>;
} {
  const { details, ...rest } = extra;

  return {
    isError: true,
    structuredContent: {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {})
      },
      ...(details !== undefined ? { details } : {}),
      ...rest
    },
    content: [{ type: 'text', text: message }],
    ...(meta ? { _meta: meta } : {})
  };
}

export function searchToolResult(results: SearchResultItem[]): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify({ results }) }]
  };
}

export function fetchToolResult(document: FetchDocumentResult): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(document) }]
  };
}
