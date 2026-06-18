import {
	PUBLIC_ATLAS_LANES,
	computePublicAtlasReadiness,
	createPublicAtlasEdge,
	createPublicAtlasNode,
	normalizePublicAtlasCanvas,
	type PublicAtlasAgentResult,
	type PublicAtlasCanvas,
	type PublicAtlasEdge,
	type PublicAtlasNode,
	type PublicAtlasNodeKind,
	type PublicAtlasNodeStatus
} from './public';
import { createLogger } from '@create-something/canon/utils';

type ModelOperationType = 'add_node' | 'update_node' | 'add_edge';
type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

type ModelOperation = {
	type?: ModelOperationType;
	id?: string;
	kind?: PublicAtlasNodeKind;
	label?: string;
	owner?: string;
	status?: PublicAtlasNodeStatus;
	notes?: string;
	source?: string;
	target?: string;
	connectFromId?: string;
	edgeLabel?: string;
};

type ModelPayload = {
	reply?: string;
	suggestions?: unknown;
	operations?: unknown;
};

type RunModelAgentInput = {
	apiKey?: string;
	canvas: PublicAtlasCanvas;
	maxMutations: number;
	maxOutputTokens?: number;
	message: string;
	model?: string;
	reasoningEffort?: ReasoningEffort;
	selectedNodeId?: string;
	selectedSourceId?: string;
	timeoutMs?: number;
};

const DEFAULT_MODEL = 'gpt-5.4';
const DEFAULT_MAX_OUTPUT_TOKENS = 900;
const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'high';
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_MODEL_OPERATIONS = 6;

const logger = createLogger('PublicAtlasModelAgent');
const nodeKinds = new Set(PUBLIC_ATLAS_LANES.map((lane) => lane.kind));
const nodeStatuses = new Set<PublicAtlasNodeStatus>(['unknown', 'run', 'wait', 'stop']);
const responseFormat = {
	type: 'json_schema',
	name: 'public_atlas_mapping_agent',
	strict: false,
	schema: {
		type: 'object',
		additionalProperties: false,
		required: ['reply', 'suggestions', 'operations'],
		properties: {
			reply: { type: 'string', maxLength: 360 },
			suggestions: {
				type: 'array',
				maxItems: 3,
				items: { type: 'string', maxLength: 140 }
			},
			operations: {
				type: 'array',
				maxItems: MAX_MODEL_OPERATIONS,
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['type'],
					properties: {
						type: { type: 'string', enum: ['add_node', 'update_node', 'add_edge'] },
						id: { type: 'string' },
						kind: {
							type: 'string',
							enum: ['actor', 'human', 'ai', 'system', 'data', 'constraint', 'touchpoint']
						},
						label: { type: 'string', maxLength: 90 },
						owner: { type: 'string', maxLength: 90 },
						status: { type: 'string', enum: ['run', 'wait', 'stop', 'unknown'] },
						notes: { type: 'string', maxLength: 360 },
						source: { type: 'string' },
						target: { type: 'string' },
						connectFromId: { type: 'string' },
						edgeLabel: { type: 'string', maxLength: 90 }
					}
				}
			}
		}
	}
} as const;

function clampText(value: unknown, max: number): string | undefined {
	if (typeof value !== 'string') return undefined;
	const normalized = value.trim().replace(/\s+/g, ' ');
	if (!normalized) return undefined;
	return normalized.slice(0, max);
}

function normalizeModelName(value: string | undefined): string {
	const trimmed = value?.trim();
	return trimmed || DEFAULT_MODEL;
}

function logModelFallback(reason: string, details: Record<string, unknown> = {}): void {
	logger.warn('Public Atlas model agent fell back to deterministic mapping', {
		reason,
		...details
	});
}

function hasNode(canvas: PublicAtlasCanvas, nodeId: string | undefined): nodeId is string {
	return typeof nodeId === 'string' && canvas.nodes.some((node) => node.id === nodeId);
}

function findNode(canvas: PublicAtlasCanvas, nodeId: string | undefined): PublicAtlasNode | undefined {
	return typeof nodeId === 'string' ? canvas.nodes.find((node) => node.id === nodeId) : undefined;
}

function nodeExists(canvas: PublicAtlasCanvas, kind: PublicAtlasNodeKind, label: string): boolean {
	const normalized = label.toLowerCase();
	return canvas.nodes.some(
		(node) => node.kind === kind && node.label.toLowerCase() === normalized
	);
}

function edgeExists(canvas: PublicAtlasCanvas, source: string, target: string): boolean {
	return canvas.edges.some((edge) => edge.source === source && edge.target === target);
}

function extractResponseText(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object') return undefined;
	const response = payload as {
		output_text?: unknown;
		output?: Array<{ content?: Array<{ text?: unknown; type?: string }> }>;
	};

	if (typeof response.output_text === 'string') return response.output_text;

	for (const item of response.output ?? []) {
		for (const content of item.content ?? []) {
			if (typeof content.text === 'string') return content.text;
		}
	}

	return undefined;
}

function parseModelPayload(text: string | undefined): ModelPayload | null {
	if (!text) return null;

	try {
		const parsed = JSON.parse(text) as ModelPayload;
		if (parsed && typeof parsed === 'object') return parsed;
	} catch {
		const match = text.match(/\{[\s\S]*\}/);
		if (!match) return null;
		try {
			return JSON.parse(match[0]) as ModelPayload;
		} catch {
			return null;
		}
	}

	return null;
}

function normalizeOperations(value: unknown): ModelOperation[] {
	if (!Array.isArray(value)) return [];
	return value.slice(0, MAX_MODEL_OPERATIONS).flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const op = item as ModelOperation;
		if (op.type !== 'add_node' && op.type !== 'update_node' && op.type !== 'add_edge') return [];
		return [op];
	});
}

function normalizeSuggestions(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.flatMap((item) => {
			const suggestion = clampText(item, 140);
			return suggestion ? [suggestion] : [];
		})
		.slice(0, 3);
}

function buildPrompt(input: RunModelAgentInput): string {
	const selectedNode = findNode(input.canvas, input.selectedNodeId);
	const selectedSource = findNode(input.canvas, input.selectedSourceId);
	return [
		'You are the CREATE SOMETHING Atlas mapping agent for a public prospect canvas.',
		'Behave like a careful Codex-style workflow mapper: infer the next useful map change, name assumptions, and preserve execution boundaries.',
		'Return JSON only with reply, suggestions, and operations.',
		'Allowed node kinds: actor, human, ai, system, data, constraint, touchpoint.',
		'Allowed statuses: run, wait, stop, unknown.',
		'Use concise, concrete labels. Do not create secrets, credentials, private records, or production-tool actions.',
		'Prefer mapping the workflow owner, durable record, system/tool operation, AI assist task, approval owner, privacy/access constraint, and inspection touchpoint.',
		'When the visitor asks to connect, link the selected source or workflow data node to the most likely next nodes with useful handoff labels.',
		'Never exceed the requested mutation budget. A node add, edge add, or node update is one mutation. Adding a node and connecting it costs two mutations.',
		'If the user asks for unavailable/private execution, map it as a constraint or approval boundary instead of claiming it can run.',
		'Current selected node:',
		selectedNode ? JSON.stringify(selectedNode) : 'none',
		'Current selected source:',
		selectedSource ? JSON.stringify(selectedSource) : 'none'
	].join('\n');
}

function buildModelInput(input: RunModelAgentInput): string {
	return JSON.stringify({
		message: input.message,
		mutationBudget: Math.max(0, Math.min(MAX_MODEL_OPERATIONS, input.maxMutations)),
		canvas: {
			id: input.canvas.id,
			nodes: input.canvas.nodes.map((node) => ({
				id: node.id,
				kind: node.kind,
				label: node.label,
				owner: node.owner,
				status: node.status,
				notes: node.notes
			})),
			edges: input.canvas.edges.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
				label: edge.label
			}))
		},
		outputShape: {
			reply: 'One or two sentences explaining what changed and why.',
			suggestions: ['Up to three concrete next mapping prompts.'],
			operations: [
				{
					type: 'add_node | update_node | add_edge',
					id: 'Existing node id for update_node only.',
					kind: 'Node kind for add_node.',
					label: 'Node label.',
					status: 'run | wait | stop | unknown',
					notes: 'Short note.',
					source: 'Existing source node id for add_edge.',
					target: 'Existing target node id for add_edge.',
					connectFromId: 'Optional existing node id to connect from when adding a node.',
					edgeLabel: 'Optional handoff label.'
				}
			]
		}
	});
}

function applyModelOperations(
	inputCanvas: PublicAtlasCanvas,
	operations: ModelOperation[],
	maxMutations: number
): { canvas: PublicAtlasCanvas; mutationCount: number } {
	const canvas = normalizePublicAtlasCanvas(inputCanvas);
	let mutationCount = 0;
	const canMutate = () => mutationCount < maxMutations;

	for (const op of operations) {
		if (!canMutate()) break;

		if (op.type === 'update_node') {
			const node = findNode(canvas, op.id);
			if (!node) continue;

			const label = clampText(op.label, 90);
			const owner = clampText(op.owner, 90);
			const notes = clampText(op.notes, 360);
			const status = nodeStatuses.has(op.status as PublicAtlasNodeStatus)
				? (op.status as PublicAtlasNodeStatus)
				: undefined;
			const next: PublicAtlasNode = {
				...node,
				label: label ?? node.label,
				owner: owner ?? node.owner,
				notes: notes ?? node.notes,
				status: status ?? node.status,
				updatedAt: new Date().toISOString()
			};
			if (JSON.stringify(next) === JSON.stringify(node)) continue;

			canvas.nodes = canvas.nodes.map((item) => (item.id === node.id ? next : item));
			mutationCount += 1;
			continue;
		}

		if (op.type === 'add_node') {
			if (!nodeKinds.has(op.kind as PublicAtlasNodeKind)) continue;
			if (canvas.nodes.length >= 48) continue;

			const kind = op.kind as PublicAtlasNodeKind;
			const label = clampText(op.label, 90);
			if (!label || nodeExists(canvas, kind, label)) continue;

			const status = nodeStatuses.has(op.status as PublicAtlasNodeStatus)
				? (op.status as PublicAtlasNodeStatus)
				: 'unknown';
			const node = createPublicAtlasNode(kind, {
				label,
				owner: clampText(op.owner, 90),
				notes: clampText(op.notes, 360),
				status,
				createdBy: 'agent'
			});
			canvas.nodes.push(node);
			mutationCount += 1;

			const connectFrom =
				findNode(canvas, op.connectFromId) ??
				findNode(canvas, 'data_workflow') ??
				canvas.nodes.find((item) => item.id !== node.id);
			const edgeLabel = clampText(op.edgeLabel, 90) ?? (kind === 'constraint' ? 'bounded by' : 'maps to');
			if (
				canMutate() &&
				connectFrom &&
				connectFrom.id !== node.id &&
				canvas.edges.length < 72 &&
				!edgeExists(canvas, connectFrom.id, node.id)
			) {
				canvas.edges.push(
					createPublicAtlasEdge(connectFrom.id, node.id, {
						label: edgeLabel,
						createdBy: 'agent'
					})
				);
				mutationCount += 1;
			}
			continue;
		}

		if (op.type === 'add_edge') {
			const source = clampText(op.source, 90);
			const target = clampText(op.target, 90);
			if (!source || !target || source === target) continue;
			if (!hasNode(canvas, source) || !hasNode(canvas, target)) continue;
			if (canvas.edges.length >= 72 || edgeExists(canvas, source, target)) continue;

			const edge: PublicAtlasEdge = createPublicAtlasEdge(source, target, {
				label: clampText(op.edgeLabel ?? op.label, 90) ?? 'hands off to',
				createdBy: 'agent'
			});
			canvas.edges.push(edge);
			mutationCount += 1;
		}
	}

	canvas.agentMessages += 1;
	canvas.mutationCount += mutationCount;
	canvas.updatedAt = new Date().toISOString();
	return { canvas, mutationCount };
}

export async function runOpenAiPublicAtlasMappingAgent(
	input: RunModelAgentInput
): Promise<PublicAtlasAgentResult | null> {
	if (!input.apiKey || input.maxMutations <= 0) return null;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

	try {
		const response = await fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				authorization: `Bearer ${input.apiKey}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model: normalizeModelName(input.model),
				input: [
					{ role: 'system', content: buildPrompt(input) },
					{ role: 'user', content: buildModelInput(input) }
				],
				max_output_tokens: input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
				reasoning: { effort: input.reasoningEffort ?? DEFAULT_REASONING_EFFORT },
				store: false,
				text: { format: responseFormat }
			}),
			signal: controller.signal
		});

		if (!response.ok) {
			const errorPayload = await response.json().catch(() => null);
			const code =
				errorPayload && typeof errorPayload === 'object'
					? ((errorPayload as { error?: { code?: unknown } }).error?.code ?? undefined)
					: undefined;
			logModelFallback('http_error', {
				status: response.status,
				code: typeof code === 'string' ? code : undefined,
				model: normalizeModelName(input.model)
			});
			return null;
		}

		const payload = await response.json();
		const parsed = parseModelPayload(extractResponseText(payload));
		const operations = normalizeOperations(parsed?.operations);
		if (!parsed || !operations.length) {
			logModelFallback(!parsed ? 'invalid_model_json' : 'empty_model_operations', {
				model: normalizeModelName(input.model)
			});
			return null;
		}

		const { canvas, mutationCount } = applyModelOperations(input.canvas, operations, input.maxMutations);
		const readiness = computePublicAtlasReadiness(canvas);
		const reply =
			clampText(parsed.reply, 360) ??
			(mutationCount
				? `I updated the map with ${mutationCount} item${mutationCount === 1 ? '' : 's'}. ${readiness.reason}`
				: `I did not change the map yet. ${readiness.nextStep}`);

		return {
			reply,
			canvas,
			mutationCount,
			suggestions: normalizeSuggestions(parsed.suggestions),
			readiness,
			agentMode: 'model'
		};
	} catch (err) {
		logModelFallback('request_error', {
			errorName: err instanceof Error ? err.name : typeof err,
			model: normalizeModelName(input.model)
		});
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
