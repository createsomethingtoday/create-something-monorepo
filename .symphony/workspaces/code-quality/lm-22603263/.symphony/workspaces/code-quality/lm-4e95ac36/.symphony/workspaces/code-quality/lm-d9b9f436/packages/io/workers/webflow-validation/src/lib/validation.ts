/**
 * Validation Utilities
 *
 * Canon: Validation should prevent mistakes, not punish users.
 */

// Email regex - standard validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Check if a name contains "AI" (restricted) but allow "Air"
 */
export function containsRestrictedAI(name: string): boolean {
  const aiPattern = /\bAI\b|\bai\b/i;
  const airPattern = /\bAir\b|\bair\b/i;

  if (!aiPattern.test(name)) {
    return false;  // No AI found at all
  }

  // Check if it's specifically "Air" only (not AI + Air combination)
  if (airPattern.test(name)) {
    const lowerName = name.toLowerCase();
    const isAirOnly =
      !lowerName.includes('ai ') && !lowerName.includes(' ai');
    return !isAirOnly;
  }

  return true;  // Contains AI but not Air
}

/**
 * Template name exceptions that should always be allowed
 */
const NAME_EXCEPTIONS = new Set([
  'orizon',
  'cycle',
  'noda',
  'sana',
  'noday studio',
]);

/**
 * Check if a template name is a known exception
 */
export function isNameException(name: string): boolean {
  return NAME_EXCEPTIONS.has(name.toLowerCase());
}

/**
 * Sanitize string for Airtable formula (prevent injection)
 */
export function sanitizeForFormula(input: string): string {
  return input.replace(/'/g, "\\'");
}

/**
 * Parse JSON body from request with validation
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('Content-Type') || '';

  if (!contentType.includes('application/json')) {
    throw new ValidationError('Content-Type must be application/json');
  }

  try {
    return await request.json() as T;
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Validation Error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
