import { FORBIDDEN_CATEGORY_NAMES, PRIMARY_TAGS } from './constants';

const BLOCKED_AI_TOKEN = /\bai\b/i;
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

export interface TemplateNameSyntaxResult {
  valid: boolean;
  errors: string[];
  matchedForbiddenTokens: string[];
}

function firstWordStartsWithCapital(value: string): boolean {
  const firstWord = value.trim().split(/\s+/)[0] || '';
  const firstCharacter = firstWord.charAt(0);
  if (!firstCharacter) return false;
  return firstCharacter === firstCharacter.toUpperCase() && firstCharacter !== firstCharacter.toLowerCase();
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
    matchedForbiddenTokens: [...new Set(forbiddenTokens)]
  };
}
