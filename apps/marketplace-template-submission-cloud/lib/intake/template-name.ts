import { FORBIDDEN_CATEGORY_NAMES, PRIMARY_TAGS } from './constants';

const BLOCKED_AI_TOKEN = /\bai\b/i;
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const AGENT_OBFUSCATION_PATTERN =
  /(^|[^a-z0-9])(?:a|@|4)[^a-z0-9]*(?:g|9|6)[^a-z0-9]*(?:e|3)[^a-z0-9]*n[^a-z0-9]*(?:t|7|\+)/i;
const CAMEL_CASE_AGENT_PATTERN = /[a-z0-9](?:Agent|Agents|Agentic)(?:\b|[A-Z0-9])/;
const BLOCKED_AGENT_TERM = 'agent';

export interface TemplateNameSyntaxResult {
  valid: boolean;
  errors: string[];
  matchedForbiddenTokens: string[];
}

function firstWordStartsWithCapital(value: string): boolean {
  const firstWord = value.trim().split(/\s+/)[0] || '';
  const firstCharacter = firstWord.charAt(0);
  if (!firstCharacter) return false;
  return (
    firstCharacter === firstCharacter.toUpperCase() &&
    firstCharacter !== firstCharacter.toLowerCase()
  );
}

function normalizeSearchGamingName(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[96]/g, 'g')
    .replace(/3/g, 'e')
    .replace(/[7+]/g, 't');
}

function containsBlockedAgentTerm(value: string): boolean {
  const normalized = normalizeSearchGamingName(value);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  if (
    tokens.some((token) => token === BLOCKED_AGENT_TERM || token.startsWith(BLOCKED_AGENT_TERM))
  ) {
    return true;
  }

  return AGENT_OBFUSCATION_PATTERN.test(normalized) || CAMEL_CASE_AGENT_PATTERN.test(value);
}

export function validateTemplateNameSyntax(value: string): TemplateNameSyntaxResult {
  const name = value.trim();
  const errors: string[] = [];

  if (!name) {
    return {
      valid: false,
      errors: ['Template name is required.'],
      matchedForbiddenTokens: []
    };
  }

  if (!firstWordStartsWithCapital(name)) {
    errors.push('The first word must start with a capital letter.');
  }

  if (EMOJI_REGEX.test(name)) {
    errors.push('Template names cannot contain emoji.');
  }

  if (BLOCKED_AI_TOKEN.test(name) && !/\bair\b/i.test(name)) {
    errors.push('Template names cannot use the standalone term "AI".');
  }

  const blockedSearchTerms = containsBlockedAgentTerm(name) ? [BLOCKED_AGENT_TERM] : [];
  if (blockedSearchTerms.length > 0) {
    errors.push('Template names cannot use "agent" or lookalike spellings.');
  }

  const normalized = name.toLowerCase();
  const forbiddenTokens = [...PRIMARY_TAGS, ...FORBIDDEN_CATEGORY_NAMES].filter((token) =>
    normalized.includes(token.toLowerCase())
  );

  if (forbiddenTokens.length > 0) {
    errors.push('Template names cannot contain category or tag labels.');
  }

  return {
    valid: errors.length === 0,
    errors,
    matchedForbiddenTokens: [...new Set([...forbiddenTokens, ...blockedSearchTerms])]
  };
}
