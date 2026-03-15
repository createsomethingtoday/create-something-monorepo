/**
 * Voice Audit
 *
 * Machine-readable Voice compliance checking for CREATE SOMETHING.
 * Human-readable version: https://createsomething.ltd/voice
 *
 * @example
 * ```typescript
 * import { auditVoice, formatAuditResult } from '$lib/voice-audit';
 *
 * const result = auditVoice(filePath, content);
 * console.log(formatAuditResult(result));
 * ```
 */

export {
	// Patterns
	FORBIDDEN_PATTERNS,
	VAGUE_PATTERNS,
	TERMINOLOGY_VIOLATIONS,
	TERMINOLOGY_PATTERNS,
	REQUIRED_SECTIONS,
	ACCEPTABLE_CONTEXTS,
	detectContentType,
	// Types
	type VoiceViolation,
	type VoiceAuditResult
} from './patterns';

export { auditVoice, formatAuditResult } from './checker';
