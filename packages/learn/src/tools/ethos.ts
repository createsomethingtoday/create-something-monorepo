/**
 * Ethos Tool
 *
 * Manage your personal principles derived from the Subtractive Triad.
 * Canon: Your ethos is not imposed—it emerges through reflection and dwelling.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
	loadEthos,
	addPrinciple,
	addConstraint,
	addHealthCheck,
	removePrinciple,
	removeConstraint,
	removeHealthCheck,
	clearEthos,
	exportEthos,
	importEthos,
	getEthosPath
} from '../ethos/storage.js';
import type { EthosPrinciple, UserEthos } from '../types.js';

export const ethosTool: Tool = {
	name: 'learn_ethos',
	description: `Manage your personal ethos—principles derived from the Subtractive Triad.

Your ethos is a living document of principles that guide your work. Claude Code references these during your sessions.

Actions:
- view: See your current ethos
- add_principle: Add a new principle (requires text and level: dry|rams|heidegger)
- add_constraint: Add a constraint to enforce a principle (requires principleId, pattern, rule)
- add_health_check: Add a codebase health metric (requires name, description, metric, threshold)
- remove_principle: Remove a principle and its constraints
- remove_constraint: Remove a constraint
- remove_health_check: Remove a health check
- export: Export your ethos as JSON
- import: Import an ethos from JSON
- clear: Clear your entire ethos

Examples:
- View: { "action": "view" }
- Add principle: { "action": "add_principle", "text": "Every component must justify its props", "level": "rams", "domain": "components" }
- Add constraint: { "action": "add_constraint", "principleId": "abc123", "pattern": "*.test.ts", "rule": "No mocking unless IO boundary" }`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			action: {
				type: 'string',
				enum: [
					'view',
					'add_principle',
					'add_constraint',
					'add_health_check',
					'remove_principle',
					'remove_constraint',
					'remove_health_check',
					'export',
					'import',
					'clear'
				],
				description: 'The action to perform'
			},
			// For add_principle
			text: {
				type: 'string',
				description: 'The principle text (for add_principle)'
			},
			level: {
				type: 'string',
				enum: ['dry', 'rams', 'heidegger'],
				description: 'Which Triad level this principle derives from'
			},
			domain: {
				type: 'string',
				description: 'Optional domain scope (e.g., "components", "api", "tests")'
			},
			// For add_constraint
			principleId: {
				type: 'string',
				description: 'The ID of the principle this constraint enforces'
			},
			pattern: {
				type: 'string',
				description: 'Glob pattern for files this constraint applies to'
			},
			rule: {
				type: 'string',
				description: 'The constraint rule text'
			},
			severity: {
				type: 'string',
				enum: ['error', 'warning', 'info'],
				description: 'Severity level (default: warning)'
			},
			// For add_health_check
			name: {
				type: 'string',
				description: 'Name of the health check'
			},
			description: {
				type: 'string',
				description: 'Description of what this health check measures'
			},
			metric: {
				type: 'string',
				description: 'The metric being measured'
			},
			threshold: {
				type: 'string',
				description: 'The threshold value (e.g., "< 200KB", "> 80%")'
			},
			command: {
				type: 'string',
				description: 'Optional command to run for this check'
			},
			// For remove operations
			id: {
				type: 'string',
				description: 'ID of the item to remove'
			},
			// For import
			json: {
				type: 'string',
				description: 'JSON string to import (for import action)'
			}
		},
		required: ['action']
	}
};

function formatPrinciple(p: EthosPrinciple, ethos: UserEthos): string {
	const levelIcon = { dry: '🔧', rams: '✂️', heidegger: '🔗' }[p.level];
	const domain = p.domain ? ` [${p.domain}]` : '';
	const constraints = ethos.constraints.filter((c) => c.principleId === p.id);
	const constraintList =
		constraints.length > 0
			? '\n' + constraints.map((c) => `    └─ ${c.pattern}: ${c.rule}`).join('\n')
			: '';
	return `  ${levelIcon} **${p.id}**: ${p.text}${domain}${constraintList}`;
}

function formatEthos(ethos: UserEthos): string {
	const principlesByLevel = {
		dry: ethos.principles.filter((p) => p.level === 'dry'),
		rams: ethos.principles.filter((p) => p.level === 'rams'),
		heidegger: ethos.principles.filter((p) => p.level === 'heidegger')
	};

	let output = `# ${ethos.name}

${ethos.description || '*Your personal principles derived from the Subtractive Triad.*'}

**File**: \`${getEthosPath()}\`

---

## Principles (${ethos.principles.length})

### DRY Level — Implementation
*"Have I built this before?"*

${principlesByLevel.dry.length > 0 ? principlesByLevel.dry.map((p) => formatPrinciple(p, ethos)).join('\n') : '  *No principles yet*'}

### Rams Level — Artifact
*"Does this earn its existence?"*

${principlesByLevel.rams.length > 0 ? principlesByLevel.rams.map((p) => formatPrinciple(p, ethos)).join('\n') : '  *No principles yet*'}

### Heidegger Level — System
*"Does this serve the whole?"*

${principlesByLevel.heidegger.length > 0 ? principlesByLevel.heidegger.map((p) => formatPrinciple(p, ethos)).join('\n') : '  *No principles yet*'}
`;

	if (ethos.healthChecks.length > 0) {
		output += `
---

## Health Checks (${ethos.healthChecks.length})

${ethos.healthChecks.map((h) => `  📊 **${h.name}** (${h.id}): ${h.metric} ${h.threshold}`).join('\n')}
`;
	}

	output += `
---

**Actions**:
- Add principle: \`learn_ethos\` with action "add_principle"
- Add constraint: \`learn_ethos\` with action "add_constraint"
- Export: \`learn_ethos\` with action "export"`;

	return output;
}

export async function handleEthos(
	args: Record<string, unknown>
): Promise<{ type: 'text'; text: string }[]> {
	const action = args.action as string;

	switch (action) {
		case 'view': {
			const ethos = loadEthos();
			if (!ethos) {
				return [
					{
						type: 'text' as const,
						text: `# No Ethos Defined

You haven't created your personal ethos yet.

Your ethos is a set of principles derived from the Subtractive Triad, specific to YOUR domain and craft.

## Getting Started

Add your first principle:

\`\`\`
learn_ethos action="add_principle" text="Every component must justify its existence" level="rams" domain="components"
\`\`\`

The three levels:
- **dry**: Implementation — "Have I built this before?"
- **rams**: Artifact — "Does this earn its existence?"
- **heidegger**: System — "Does this serve the whole?"

---

*Your principles emerge through reflection. What has your practice taught you?*`
					}
				];
			}

			return [{ type: 'text' as const, text: formatEthos(ethos) }];
		}

		case 'add_principle': {
			const text = args.text as string;
			const level = args.level as EthosPrinciple['level'];
			const domain = args.domain as string | undefined;

			if (!text || !level) {
				return [
					{
						type: 'text' as const,
						text: 'Error: add_principle requires "text" and "level" (dry|rams|heidegger).'
					}
				];
			}

			const principle = addPrinciple(text, level, domain);

			return [
				{
					type: 'text' as const,
					text: `# Principle Added

**ID**: ${principle.id}
**Level**: ${level}
**Domain**: ${domain || 'general'}

> ${text}

---

To add a constraint enforcing this principle:
\`\`\`
learn_ethos action="add_constraint" principleId="${principle.id}" pattern="*.ts" rule="Your rule here"
\`\`\`

Use \`learn_ethos action="view"\` to see your full ethos.`
				}
			];
		}

		case 'add_constraint': {
			const principleId = args.principleId as string;
			const pattern = args.pattern as string;
			const rule = args.rule as string;
			const severity = (args.severity as 'error' | 'warning' | 'info') || 'warning';

			if (!principleId || !pattern || !rule) {
				return [
					{
						type: 'text' as const,
						text: 'Error: add_constraint requires "principleId", "pattern", and "rule".'
					}
				];
			}

			const constraint = addConstraint(principleId, pattern, rule, severity);

			if (!constraint) {
				return [
					{
						type: 'text' as const,
						text: `Error: Principle "${principleId}" not found. Use \`learn_ethos action="view"\` to see available principles.`
					}
				];
			}

			return [
				{
					type: 'text' as const,
					text: `# Constraint Added

**ID**: ${constraint.id}
**Principle**: ${principleId}
**Pattern**: ${pattern}
**Severity**: ${severity}

> ${rule}

This constraint will be checked when working on files matching \`${pattern}\`.`
				}
			];
		}

		case 'add_health_check': {
			const name = args.name as string;
			const description = args.description as string;
			const metric = args.metric as string;
			const threshold = args.threshold as string;
			const command = args.command as string | undefined;

			if (!name || !description || !metric || !threshold) {
				return [
					{
						type: 'text' as const,
						text: 'Error: add_health_check requires "name", "description", "metric", and "threshold".'
					}
				];
			}

			const healthCheck = addHealthCheck(name, description, metric, threshold, command);

			return [
				{
					type: 'text' as const,
					text: `# Health Check Added

**ID**: ${healthCheck.id}
**Name**: ${name}
**Metric**: ${metric}
**Threshold**: ${threshold}
${command ? `**Command**: \`${command}\`` : ''}

> ${description}`
				}
			];
		}

		case 'remove_principle': {
			const id = args.id as string;
			if (!id) {
				return [
					{
						type: 'text' as const,
						text: 'Error: remove_principle requires "id".'
					}
				];
			}

			const removed = removePrinciple(id);
			return [
				{
					type: 'text' as const,
					text: removed
						? `Principle "${id}" and its constraints removed.`
						: `Principle "${id}" not found.`
				}
			];
		}

		case 'remove_constraint': {
			const id = args.id as string;
			if (!id) {
				return [
					{
						type: 'text' as const,
						text: 'Error: remove_constraint requires "id".'
					}
				];
			}

			const removed = removeConstraint(id);
			return [
				{
					type: 'text' as const,
					text: removed ? `Constraint "${id}" removed.` : `Constraint "${id}" not found.`
				}
			];
		}

		case 'remove_health_check': {
			const id = args.id as string;
			if (!id) {
				return [
					{
						type: 'text' as const,
						text: 'Error: remove_health_check requires "id".'
					}
				];
			}

			const removed = removeHealthCheck(id);
			return [
				{
					type: 'text' as const,
					text: removed ? `Health check "${id}" removed.` : `Health check "${id}" not found.`
				}
			];
		}

		case 'export': {
			const json = exportEthos();
			if (!json) {
				return [
					{
						type: 'text' as const,
						text: 'No ethos to export. Create one first with `learn_ethos action="add_principle"`.'
					}
				];
			}

			return [
				{
					type: 'text' as const,
					text: `# Ethos Export

\`\`\`json
${json}
\`\`\`

Save this JSON to share or back up your ethos.
Import with \`learn_ethos action="import" json="..."\``
				}
			];
		}

		case 'import': {
			const json = args.json as string;
			if (!json) {
				return [
					{
						type: 'text' as const,
						text: 'Error: import requires "json" parameter with the ethos JSON.'
					}
				];
			}

			const imported = importEthos(json);
			if (!imported) {
				return [
					{
						type: 'text' as const,
						text: 'Error: Invalid ethos JSON. Ensure it has the correct structure.'
					}
				];
			}

			return [
				{
					type: 'text' as const,
					text: `# Ethos Imported

**${imported.name}**
- ${imported.principles.length} principles
- ${imported.constraints.length} constraints
- ${imported.healthChecks.length} health checks

Use \`learn_ethos action="view"\` to see the imported ethos.`
				}
			];
		}

		case 'clear': {
			clearEthos();
			return [
				{
					type: 'text' as const,
					text: `# Ethos Cleared

Your ethos has been reset.

*Dwelling begins anew. What principles will you discover?*`
				}
			];
		}

		default:
			return [
				{
					type: 'text' as const,
					text: `Unknown action: ${action}. Valid actions: view, add_principle, add_constraint, add_health_check, remove_principle, remove_constraint, remove_health_check, export, import, clear.`
				}
			];
	}
}
