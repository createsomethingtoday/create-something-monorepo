/**
 * Coach Tool
 *
 * Provide real-time Triad-aligned guidance during coding.
 * Canon: The coach reveals what you already know.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { loadEthos } from '../ethos/storage.js';
import type { UserEthos } from '../types.js';

export const coachTool: Tool = {
	name: 'learn_coach',
	description: `Provide Triad-aligned coaching for your current work.

Accepts work context (e.g., "refactoring components", "designing API") and:
1. Loads your personal ethos
2. Applies Subtractive Triad questions
3. Suggests concrete next step

Returns methodology guidance tailored to your situation.

Example:
{
  "context": "I'm refactoring these three similar components into one.",
  "currentThinking": "They share most logic but differ in styling."
}`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			context: {
				type: 'string',
				description: 'What you are currently working on'
			},
			currentThinking: {
				type: 'string',
				description: 'Your current approach or thoughts (optional)'
			},
			question: {
				type: 'string',
				description: 'Specific question you want guidance on (optional)'
			}
		},
		required: ['context']
	}
};

/**
 * Generate Triad-aligned coaching based on context
 */
function generateCoaching(
	context: string,
	currentThinking?: string,
	question?: string,
	ethos?: UserEthos | null
): string {
	const lowerContext = context.toLowerCase();

	// Detect work type
	const isRefactoring =
		lowerContext.includes('refactor') ||
		lowerContext.includes('consolidate') ||
		lowerContext.includes('unify');
	const isDesigning = lowerContext.includes('design') || lowerContext.includes('architect');
	const isRemoving =
		lowerContext.includes('remove') ||
		lowerContext.includes('delete') ||
		lowerContext.includes('simplify');
	const isConnecting =
		lowerContext.includes('connect') ||
		lowerContext.includes('integrate') ||
		lowerContext.includes('system');

	// Build coaching response
	let coaching = '# Triad Coaching\n\n';

	if (question) {
		coaching += `**Your Question**: ${question}\n\n---\n\n`;
	}

	coaching += '## The Three Questions\n\n';

	// DRY question
	if (isRefactoring || lowerContext.includes('duplicate') || lowerContext.includes('similar')) {
		coaching += `### 1. DRY — "Have I built this before?"\n\n`;
		coaching += `You're working with similarity. Ask:\n`;
		coaching += `- What is the **essential** pattern beneath these variations?\n`;
		coaching += `- Can I unify this at a **higher level of abstraction**?\n`;
		coaching += `- Am I creating a **single source of truth**?\n\n`;

		if (ethos) {
			const dryPrinciples = ethos.principles.filter((p) => p.level === 'dry');
			if (dryPrinciples.length > 0) {
				coaching += `**Your DRY Principles**:\n`;
				dryPrinciples.forEach((p) => {
					coaching += `- ${p.text}${p.domain ? ` [${p.domain}]` : ''}\n`;
				});
				coaching += '\n';
			}
		}
	} else {
		coaching += `### 1. DRY — "Have I built this before?"\n\n`;
		coaching += `Before proceeding, check: Is there duplication hiding in plain sight?\n\n`;
	}

	// Rams question
	if (isRemoving || isDesigning) {
		coaching += `### 2. Rams — "Does this earn its existence?"\n\n`;
		coaching += `You're shaping the artifact. Ask:\n`;
		coaching += `- What can I **remove** without losing essential function?\n`;
		coaching += `- Is each piece **justified** by the whole?\n`;
		coaching += `- Am I adding or **revealing**?\n\n`;

		if (ethos) {
			const ramsPrinciples = ethos.principles.filter((p) => p.level === 'rams');
			if (ramsPrinciples.length > 0) {
				coaching += `**Your Rams Principles**:\n`;
				ramsPrinciples.forEach((p) => {
					coaching += `- ${p.text}${p.domain ? ` [${p.domain}]` : ''}\n`;
				});
				coaching += '\n';
			}
		}
	} else {
		coaching += `### 2. Rams — "Does this earn its existence?"\n\n`;
		coaching += `Weniger, aber besser. What can you remove?\n\n`;
	}

	// Heidegger question
	if (isConnecting || lowerContext.includes('whole') || lowerContext.includes('architecture')) {
		coaching += `### 3. Heidegger — "Does this serve the whole?"\n\n`;
		coaching += `You're thinking systemically. Ask:\n`;
		coaching += `- How does this **part** serve the **whole**?\n`;
		coaching += `- What **connections** am I strengthening or breaking?\n`;
		coaching += `- Is this change **coherent** with the system's purpose?\n\n`;

		if (ethos) {
			const heideggerPrinciples = ethos.principles.filter((p) => p.level === 'heidegger');
			if (heideggerPrinciples.length > 0) {
				coaching += `**Your Heidegger Principles**:\n`;
				heideggerPrinciples.forEach((p) => {
					coaching += `- ${p.text}${p.domain ? ` [${p.domain}]` : ''}\n`;
				});
				coaching += '\n';
			}
		}
	} else {
		coaching += `### 3. Heidegger — "Does this serve the whole?"\n\n`;
		coaching += `How does this change strengthen the system?\n\n`;
	}

	coaching += '---\n\n';

	// Suggest concrete next step
	coaching += '## Suggested Next Step\n\n';

	if (currentThinking) {
		coaching += `Given your current thinking: *"${currentThinking}"*\n\n`;
	}

	if (isRefactoring) {
		coaching += `**Action**: Before unifying, map what varies and what stays constant.\n\n`;
		coaching += `Create a comparison table:\n`;
		coaching += `- What changes between instances?\n`;
		coaching += `- What remains the same?\n`;
		coaching += `- What abstraction captures both?\n\n`;
		coaching += `The right abstraction makes duplication impossible.\n`;
	} else if (isDesigning) {
		coaching += `**Action**: Start with constraints, not features.\n\n`;
		coaching += `List what you will NOT include:\n`;
		coaching += `- What features can you defer?\n`;
		coaching += `- What complexity can you avoid?\n`;
		coaching += `- What is the **minimum viable** version?\n\n`;
		coaching += `Design by subtraction reveals essence.\n`;
	} else if (isRemoving) {
		coaching += `**Action**: Remove in layers, test at each layer.\n\n`;
		coaching += `1. Remove the obvious\n`;
		coaching += `2. Run tests\n`;
		coaching += `3. Remove what became obvious\n`;
		coaching += `4. Repeat\n\n`;
		coaching += `The discipline is iterative removal, not bulk deletion.\n`;
	} else {
		coaching += `**Action**: Apply the three questions in sequence.\n\n`;
		coaching += `1. **DRY**: Unify duplication\n`;
		coaching += `2. **Rams**: Remove excess\n`;
		coaching += `3. **Heidegger**: Reconnect to the whole\n\n`;
		coaching += `The Triad is coherent because it's one principle at three scales.\n`;
	}

	coaching += '\n---\n\n';

	if (!ethos || ethos.principles.length === 0) {
		coaching += `**Note**: You haven't defined your personal ethos yet.\n\n`;
		coaching += `Use \`learn_ethos action="add_principle"\` to capture principles derived from your practice.\n`;
		coaching += `Your ethos makes coaching more specific to your domain and craft.\n`;
	}

	return coaching;
}

export async function handleCoach(
	args: Record<string, unknown>
): Promise<{ type: 'text'; text: string }[]> {
	const context = args.context as string;
	const currentThinking = args.currentThinking as string | undefined;
	const question = args.question as string | undefined;

	if (!context) {
		return [
			{
				type: 'text' as const,
				text: 'Error: "context" parameter is required. Describe what you are currently working on.'
			}
		];
	}

	// Load user's ethos if it exists
	const ethos = loadEthos();

	// Generate coaching
	const coaching = generateCoaching(context, currentThinking, question, ethos);

	return [{ type: 'text' as const, text: coaching }];
}
