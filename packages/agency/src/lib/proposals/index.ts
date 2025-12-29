/**
 * Proposal System
 *
 * Standardized proposal generation for CREATE SOMETHING agency services.
 *
 * Usage:
 * ```typescript
 * import { generateProposal, proposalToMarkdown } from '$lib/proposals';
 *
 * const proposal = generateProposal({
 *   prospect: { company: 'Acme', contact: 'John', email: 'john@acme.com' },
 *   problem: { summary: '...', currentState: [...], impact: [...], desiredState: '...' },
 *   serviceId: 'automation'
 * });
 *
 * const markdown = proposalToMarkdown(proposal);
 * ```
 */

export * from './types';
export { generateProposal, proposalToMarkdown } from './generator';
