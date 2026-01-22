/**
 * WebGPU Crowd Simulation Engine
 *
 * GPU-accelerated crowd simulation using compute shaders for agent updates
 * and instanced rendering for visualization. Supports 5,000-10,000 agents
 * at 60fps with emergent behaviors like bottleneck formation and panic spreading.
 */

/// <reference types="@webgpu/types" />

import type { ScenarioEffect } from '../living-arena/arenaTypes';
import { getScenarioTargets, getWallSegments, type WallSegment } from './arenaGeometry';
import {
	type AgentDirectiveState,
	type EventPhaseType,
	Directive,
	EventPhase,
	AgentRole,
	initializeAgentDirectives,
	updateDirective,
	getDirectiveTarget,
	getInitialPosition,
	updatePossession,
	getCurrentPossession
} from './agentDirectives';
import {
	type SimulationTelemetry,
	type FrameMetrics,
	type TelemetryConfig,
	createTelemetry
} from './telemetry';

// Import shaders as raw text
import crowdShaderSource from './shaders/crowd.wgsl?raw';
import renderShaderSource from './shaders/render.wgsl?raw';
import arenaShaderSource from './shaders/arena.wgsl?raw';
import cellAssignShaderSource from './shaders/cellAssign.wgsl?raw';
import cellBoundsShaderSource from './shaders/cellBounds.wgsl?raw';
import bitonicSortShaderSource from './shaders/bitonicSort.wgsl?raw';

/** Spatial hash grid constants - must match shader values */
const GRID_COLS = 32;
const GRID_ROWS = 24;
const CELL_SIZE = 25.0;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

/** Agent state constants matching shader values */
export const AgentState = {
	CALM: 0,
	CROWDED: 1,
	PANICKED: 2
} as const;

type AgentStateValue = typeof AgentState[keyof typeof AgentState];

/** Simulation configuration */
export interface SimulationConfig {
	agentCount: number;
	canvasWidth: number;
	canvasHeight: number;
	/** Arena coordinate space (matches SVG viewBox) */
	arenaWidth: number;
	arenaHeight: number;
	/** Simulation parameters */
	goalStrength: number;
	separationStrength: number;
	wallStrength: number;
	maxSpeed: number;
	panicSpreadRadius: number;
	/** Seed for deterministic simulation (0 = non-deterministic) */
	seed: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
	agentCount: 8000,
	canvasWidth: 1200,
	canvasHeight: 900,
	arenaWidth: 1200,
	arenaHeight: 900,
	goalStrength: 2.0,
	separationStrength: 8.0,
	wallStrength: 15.0,
	maxSpeed: 3.0,
	panicSpreadRadius: 30.0,
	seed: 0 // 0 = non-deterministic, any other value = deterministic
};

/** Result of WebGPU initialization */
export interface WebGPUContext {
	device: GPUDevice;
	context: GPUCanvasContext;
	format: GPUTextureFormat;
}

/**
 * Check if WebGPU is supported in this browser
 */
export function isWebGPUSupported(): boolean {
	return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Initialize WebGPU context
 */
export async function initWebGPU(canvas: HTMLCanvasElement): Promise<WebGPUContext | null> {
	if (!isWebGPUSupported()) {
		return null;
	}

	try {
		const adapter = await navigator.gpu.requestAdapter({
			powerPreference: 'high-performance'
		});

		if (!adapter) {
			console.error('No WebGPU adapter found');
			return null;
		}

		const device = await adapter.requestDevice({
			requiredFeatures: [],
			requiredLimits: {
				maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
				maxComputeWorkgroupsPerDimension: adapter.limits.maxComputeWorkgroupsPerDimension
			}
		});

		const context = canvas.getContext('webgpu');
		if (!context) {
			console.error('Failed to get WebGPU context');
			return null;
		}

		const format = navigator.gpu.getPreferredCanvasFormat();
		context.configure({
			device,
			format,
			alphaMode: 'premultiplied'
		});

		return { device, context, format };
	} catch (error) {
		console.error('WebGPU initialization failed:', error);
		return null;
	}
}

/**
 * Main crowd simulation class
 */
export class CrowdSimulation {
	private device: GPUDevice;
	private context: GPUCanvasContext;
	private format: GPUTextureFormat;
	private config: SimulationConfig;

	// Compute pipeline
	private computePipeline!: GPUComputePipeline;
	private computeBindGroup!: GPUBindGroup;

	// Render pipeline
	private renderPipeline!: GPURenderPipeline;
	private renderBindGroup!: GPUBindGroup;

	// Buffers
	private agentBuffer!: GPUBuffer;
	private agentReadBuffer!: GPUBuffer; // For reading back data
	private uniformBuffer!: GPUBuffer;
	private wallBuffer!: GPUBuffer;

	// Spatial hash grid buffers for O(1) neighbor queries
	private agentCellBuffer!: GPUBuffer; // Cell assignment per agent
	private cellBoundsBuffer!: GPUBuffer; // Start/end indices per cell
	private sortedAgentIndicesBuffer!: GPUBuffer; // Agent indices sorted by cell
	private sortUniformBuffer!: GPUBuffer; // Uniforms for bitonic sort

	// Spatial hash grid pipelines
	private cellAssignPipeline!: GPUComputePipeline;
	private cellAssignBindGroup!: GPUBindGroup;
	private bitonicSortPipeline!: GPUComputePipeline;
	private bitonicSortBindGroup!: GPUBindGroup;
	private cellBoundsPipeline!: GPUComputePipeline;
	private cellBoundsResetPipeline!: GPUComputePipeline;
	private cellBoundsBindGroup!: GPUBindGroup;
	private cellBoundsResetBindGroup!: GPUBindGroup;

	// Vertex buffer for circle geometry
	private circleVertexBuffer!: GPUBuffer;
	private circleIndexBuffer!: GPUBuffer;
	private circleIndexCount = 0;

	// Arena line rendering
	private arenaPipeline!: GPURenderPipeline;
	private arenaBindGroup!: GPUBindGroup;
	private arenaVertexBuffer!: GPUBuffer;
	private arenaVertexCount = 0;

	// Current state
	private currentScenario: number = 0;
	private deltaTime: number = 1 / 60;
	private frameCount: number = 0;
	private isRunning = false;
	private animationFrameId: number | null = null;

	// Directive system
	private agentDirectives: AgentDirectiveState[] = [];
	private currentEventPhase: EventPhaseType = EventPhase.PRE_EVENT;
	private directiveUpdateTimer = 0;
	private directiveUpdateInterval = 0.1; // Update directives every 100ms
	private useDirectiveSystem = true; // Enable new directive system

	// Telemetry for observability and harness integration
	private telemetry: SimulationTelemetry | null = null;
	private lastFrameTime = 0;
	private computeStartTime = 0;
	private renderStartTime = 0;
	private currentExperimentId: string | null = null;

	constructor(webgpu: WebGPUContext, config: Partial<SimulationConfig> = {}) {
		this.device = webgpu.device;
		this.context = webgpu.context;
		this.format = webgpu.format;
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Initialize all GPU resources
	 */
	async initialize(): Promise<void> {
		this.createBuffers();
		this.createCircleGeometry();
		this.createArenaGeometry();
		await this.createSpatialHashPipelines();
		await this.createComputePipeline();
		await this.createRenderPipeline();
		await this.createArenaPipeline();
		this.initializeAgents();
	}

	/**
	 * Create spatial hash grid compute pipelines for O(1) neighbor queries
	 */
	private async createSpatialHashPipelines(): Promise<void> {
		// Cell assignment pipeline
		const cellAssignModule = this.device.createShaderModule({
			code: cellAssignShaderSource,
			label: 'Cell Assign Shader'
		});

		this.cellAssignPipeline = this.device.createComputePipeline({
			layout: 'auto',
			compute: {
				module: cellAssignModule,
				entryPoint: 'main'
			},
			label: 'Cell Assign Pipeline'
		});

		this.cellAssignBindGroup = this.device.createBindGroup({
			layout: this.cellAssignPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.agentBuffer } },
				{ binding: 1, resource: { buffer: this.uniformBuffer } },
				{ binding: 2, resource: { buffer: this.agentCellBuffer } }
			],
			label: 'Cell Assign Bind Group'
		});

		// Bitonic sort pipeline
		const bitonicSortModule = this.device.createShaderModule({
			code: bitonicSortShaderSource,
			label: 'Bitonic Sort Shader'
		});

		this.bitonicSortPipeline = this.device.createComputePipeline({
			layout: 'auto',
			compute: {
				module: bitonicSortModule,
				entryPoint: 'main'
			},
			label: 'Bitonic Sort Pipeline'
		});

		this.bitonicSortBindGroup = this.device.createBindGroup({
			layout: this.bitonicSortPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.agentCellBuffer } },
				{ binding: 1, resource: { buffer: this.sortUniformBuffer } }
			],
			label: 'Bitonic Sort Bind Group'
		});

		// Cell bounds pipeline
		const cellBoundsModule = this.device.createShaderModule({
			code: cellBoundsShaderSource,
			label: 'Cell Bounds Shader'
		});

		this.cellBoundsPipeline = this.device.createComputePipeline({
			layout: 'auto',
			compute: {
				module: cellBoundsModule,
				entryPoint: 'main'
			},
			label: 'Cell Bounds Pipeline'
		});

		this.cellBoundsResetPipeline = this.device.createComputePipeline({
			layout: 'auto',
			compute: {
				module: cellBoundsModule,
				entryPoint: 'resetCells'
			},
			label: 'Cell Bounds Reset Pipeline'
		});

		this.cellBoundsBindGroup = this.device.createBindGroup({
			layout: this.cellBoundsPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.agentCellBuffer } },
				{ binding: 1, resource: { buffer: this.uniformBuffer } },
				{ binding: 2, resource: { buffer: this.cellBoundsBuffer } },
				{ binding: 3, resource: { buffer: this.sortedAgentIndicesBuffer } }
			],
			label: 'Cell Bounds Bind Group'
		});

		this.cellBoundsResetBindGroup = this.device.createBindGroup({
			layout: this.cellBoundsResetPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.agentCellBuffer } },
				{ binding: 1, resource: { buffer: this.uniformBuffer } },
				{ binding: 2, resource: { buffer: this.cellBoundsBuffer } },
				{ binding: 3, resource: { buffer: this.sortedAgentIndicesBuffer } }
			],
			label: 'Cell Bounds Reset Bind Group'
		});
	}

	/**
	 * Create GPU buffers for agent data and simulation parameters
	 */
	private createBuffers(): void {
		const { agentCount } = this.config;

		// Agent buffer: position(2) + velocity(2) + target(2) + state(1) + group(1) = 8 floats per agent
		const agentBufferSize = agentCount * 8 * 4; // 8 floats * 4 bytes
		this.agentBuffer = this.device.createBuffer({
			size: agentBufferSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
			label: 'Agent Buffer'
		});

		this.agentReadBuffer = this.device.createBuffer({
			size: agentBufferSize,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
			label: 'Agent Read Buffer'
		});

		// Uniform buffer for simulation parameters
		// deltaTime(1) + agentCount(1) + arenaSize(2) + goalStrength(1) + separationStrength(1) +
		// wallStrength(1) + maxSpeed(1) + panicRadius(1) + wallCount(1) + targetCount(1) + scenario(1) +
		// ellipse params: centerX(1) + centerY(1) + rx(1) + ry(1) +
		// canvas dimensions: canvasWidth(1) + canvasHeight(1) +
		// determinism: seed(1) + frameCount(1) = 20 floats (padded to 24 for alignment)
		this.uniformBuffer = this.device.createBuffer({
			size: 24 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			label: 'Uniform Buffer'
		});

		// Wall segments buffer (max 64 walls, each wall is 4 floats: x1, y1, x2, y2)
		this.wallBuffer = this.device.createBuffer({
			size: 64 * 4 * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			label: 'Wall Buffer'
		});

		// Spatial hash grid buffers for O(1) neighbor queries
		// Agent cell buffer: packed (cellIndex << 16) | agentIndex for sorting
		this.agentCellBuffer = this.device.createBuffer({
			size: agentCount * 4, // 1 u32 per agent
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			label: 'Agent Cell Buffer'
		});

		// Cell bounds buffer: start/end indices for each cell (2 u32 per cell)
		this.cellBoundsBuffer = this.device.createBuffer({
			size: TOTAL_CELLS * 2 * 4, // 2 u32 per cell
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			label: 'Cell Bounds Buffer'
		});

		// Sorted agent indices: agent indices sorted by cell
		this.sortedAgentIndicesBuffer = this.device.createBuffer({
			size: agentCount * 4, // 1 u32 per agent
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			label: 'Sorted Agent Indices Buffer'
		});

		// Sort uniforms: agentCount, stage, step, padding
		this.sortUniformBuffer = this.device.createBuffer({
			size: 4 * 4, // 4 u32
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			label: 'Sort Uniform Buffer'
		});
	}

	/**
	 * Create circle geometry for instanced rendering
	 */
	private createCircleGeometry(): void {
		const segments = 12; // Lower poly for performance
		const vertices: number[] = [];
		const indices: number[] = [];

		// Center vertex
		vertices.push(0, 0);

		// Circle vertices
		for (let i = 0; i <= segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			vertices.push(Math.cos(angle), Math.sin(angle));
		}

		// Triangle fan indices
		for (let i = 1; i <= segments; i++) {
			indices.push(0, i, i + 1);
		}
		this.circleIndexCount = indices.length;

		this.circleVertexBuffer = this.device.createBuffer({
			size: vertices.length * 4,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
			label: 'Circle Vertex Buffer'
		});
		this.device.queue.writeBuffer(this.circleVertexBuffer, 0, new Float32Array(vertices));

		this.circleIndexBuffer = this.device.createBuffer({
			size: indices.length * 4,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
			label: 'Circle Index Buffer'
		});
		this.device.queue.writeBuffer(this.circleIndexBuffer, 0, new Uint32Array(indices));
	}

	/**
	 * Create arena line geometry for direct rendering on canvas
	 */
	private createArenaGeometry(): void {
		const vertices: number[] = [];

		// Helper to add a line segment with color
		const addLine = (
			x1: number,
			y1: number,
			x2: number,
			y2: number,
			r: number,
			g: number,
			b: number,
			a: number
		) => {
			// Each vertex: x, y, r, g, b, a
			vertices.push(x1, y1, r, g, b, a);
			vertices.push(x2, y2, r, g, b, a);
		};

		// Arena ellipse (approximated with line segments)
		const ellipseSegments = 64;
		const centerX = 400;
		const centerY = 300;
		const rx = 380;
		const ry = 280;
		const ellipseColor = { r: 1.0, g: 1.0, b: 1.0, a: 0.15 };

		for (let i = 0; i < ellipseSegments; i++) {
			const angle1 = (i / ellipseSegments) * Math.PI * 2;
			const angle2 = ((i + 1) / ellipseSegments) * Math.PI * 2;
			const x1 = centerX + Math.cos(angle1) * rx;
			const y1 = centerY + Math.sin(angle1) * ry;
			const x2 = centerX + Math.cos(angle2) * rx;
			const y2 = centerY + Math.sin(angle2) * ry;
			addLine(x1, y1, x2, y2, ellipseColor.r, ellipseColor.g, ellipseColor.b, ellipseColor.a);
		}

		// Inner bowl ring
		const innerRx = 180;
		const innerRy = 130;
		for (let i = 0; i < ellipseSegments; i++) {
			const angle1 = (i / ellipseSegments) * Math.PI * 2;
			const angle2 = ((i + 1) / ellipseSegments) * Math.PI * 2;
			const x1 = centerX + Math.cos(angle1) * innerRx;
			const y1 = centerY + Math.sin(angle1) * innerRy;
			const x2 = centerX + Math.cos(angle2) * innerRx;
			const y2 = centerY + Math.sin(angle2) * innerRy;
			addLine(x1, y1, x2, y2, 1.0, 1.0, 1.0, 0.1);
		}

		// Section dividers (12 sections)
		for (let i = 0; i < 12; i++) {
			const angle = (i * 30 * Math.PI) / 180;
			const x1 = centerX + Math.cos(angle) * innerRx;
			const y1 = centerY + Math.sin(angle) * innerRy;
			const x2 = centerX + Math.cos(angle) * (rx * 0.97);
			const y2 = centerY + Math.sin(angle) * (ry * 0.97);
			addLine(x1, y1, x2, y2, 1.0, 1.0, 1.0, 0.08);
		}

		// Court rectangle
		const courtColor = { r: 1.0, g: 1.0, b: 1.0, a: 0.25 };
		addLine(300, 220, 500, 220, courtColor.r, courtColor.g, courtColor.b, courtColor.a); // Top
		addLine(500, 220, 500, 380, courtColor.r, courtColor.g, courtColor.b, courtColor.a); // Right
		addLine(500, 380, 300, 380, courtColor.r, courtColor.g, courtColor.b, courtColor.a); // Bottom
		addLine(300, 380, 300, 220, courtColor.r, courtColor.g, courtColor.b, courtColor.a); // Left

		// Court markings
		const markingColor = { r: 1.0, g: 1.0, b: 1.0, a: 0.2 };
		// Center line
		addLine(400, 225, 400, 375, markingColor.r, markingColor.g, markingColor.b, markingColor.a);
		// Center circle (approximated)
		const ccSegments = 24;
		const ccRadius = 25;
		for (let i = 0; i < ccSegments; i++) {
			const angle1 = (i / ccSegments) * Math.PI * 2;
			const angle2 = ((i + 1) / ccSegments) * Math.PI * 2;
			addLine(
				centerX + Math.cos(angle1) * ccRadius,
				centerY + Math.sin(angle1) * ccRadius,
				centerX + Math.cos(angle2) * ccRadius,
				centerY + Math.sin(angle2) * ccRadius,
				markingColor.r,
				markingColor.g,
				markingColor.b,
				markingColor.a
			);
		}

		// Team benches
		const homeColor = { r: 0.8, g: 0.2, b: 0.2, a: 0.3 };
		const awayColor = { r: 0.2, g: 0.4, b: 0.8, a: 0.3 };
		// Home bench (left)
		addLine(275, 260, 275, 340, homeColor.r, homeColor.g, homeColor.b, homeColor.a);
		addLine(290, 260, 290, 340, homeColor.r, homeColor.g, homeColor.b, homeColor.a);
		// Away bench (right)
		addLine(510, 260, 510, 340, awayColor.r, awayColor.g, awayColor.b, awayColor.a);
		addLine(525, 260, 525, 340, awayColor.r, awayColor.g, awayColor.b, awayColor.a);

		// Gates
		const gateColor = { r: 0.4, g: 0.8, b: 0.4, a: 0.4 };
		// North gate
		addLine(365, 20, 435, 20, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(365, 20, 365, 35, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(435, 20, 435, 35, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		// South gate
		addLine(365, 580, 435, 580, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(365, 565, 365, 580, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(435, 565, 435, 580, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		// West gate
		addLine(20, 275, 20, 325, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(20, 275, 35, 275, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(20, 325, 35, 325, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		// East gate
		addLine(780, 275, 780, 325, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(765, 275, 780, 275, gateColor.r, gateColor.g, gateColor.b, gateColor.a);
		addLine(765, 325, 780, 325, gateColor.r, gateColor.g, gateColor.b, gateColor.a);

		this.arenaVertexCount = vertices.length / 6; // 6 floats per vertex

		this.arenaVertexBuffer = this.device.createBuffer({
			size: vertices.length * 4,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
			label: 'Arena Vertex Buffer'
		});
		this.device.queue.writeBuffer(this.arenaVertexBuffer, 0, new Float32Array(vertices));
	}

	/**
	 * Create compute pipeline for agent simulation
	 */
	private async createComputePipeline(): Promise<void> {
		const computeModule = this.device.createShaderModule({
			code: crowdShaderSource,
			label: 'Crowd Compute Shader'
		});

		// Check for shader compilation errors
		const compilationInfo = await computeModule.getCompilationInfo();
		for (const message of compilationInfo.messages) {
			console.log(`[Shader ${message.type}] Line ${message.lineNum}: ${message.message}`);
			if (message.type === 'error') {
				throw new Error(`Compute shader compilation error: ${message.message}`);
			}
		}

		this.computePipeline = this.device.createComputePipeline({
			layout: 'auto',
			compute: {
				module: computeModule,
				entryPoint: 'main'
			},
			label: 'Crowd Compute Pipeline'
		});

		this.computeBindGroup = this.device.createBindGroup({
			layout: this.computePipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.agentBuffer } },
				{ binding: 1, resource: { buffer: this.uniformBuffer } },
				{ binding: 2, resource: { buffer: this.wallBuffer } },
				{ binding: 3, resource: { buffer: this.cellBoundsBuffer } },
				{ binding: 4, resource: { buffer: this.sortedAgentIndicesBuffer } }
			],
			label: 'Compute Bind Group'
		});
	}

	/**
	 * Create render pipeline for agent visualization
	 */
	private async createRenderPipeline(): Promise<void> {
		const renderModule = this.device.createShaderModule({
			code: renderShaderSource,
			label: 'Render Shader'
		});

		// Check for shader compilation errors
		const compilationInfo = await renderModule.getCompilationInfo();
		for (const message of compilationInfo.messages) {
			console.log(`[Shader ${message.type}] Line ${message.lineNum}: ${message.message}`);
			if (message.type === 'error') {
				throw new Error(`Render shader compilation error: ${message.message}`);
			}
		}

		this.renderPipeline = this.device.createRenderPipeline({
			layout: 'auto',
			vertex: {
				module: renderModule,
				entryPoint: 'vertexMain',
				buffers: [
					{
						// Circle geometry (per-vertex)
						arrayStride: 2 * 4,
						stepMode: 'vertex',
						attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }]
					}
				]
			},
			fragment: {
				module: renderModule,
				entryPoint: 'fragmentMain',
				targets: [
					{
						format: this.format,
						blend: {
							color: {
								srcFactor: 'src-alpha',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add'
							},
							alpha: {
								srcFactor: 'one',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add'
							}
						}
					}
				]
			},
			primitive: {
				topology: 'triangle-list',
				cullMode: 'none'
			},
			label: 'Render Pipeline'
		});

		this.renderBindGroup = this.device.createBindGroup({
			layout: this.renderPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.agentBuffer } },
				{ binding: 1, resource: { buffer: this.uniformBuffer } }
			],
			label: 'Render Bind Group'
		});
	}

	/**
	 * Create arena line rendering pipeline
	 */
	private async createArenaPipeline(): Promise<void> {
		const arenaModule = this.device.createShaderModule({
			code: arenaShaderSource,
			label: 'Arena Shader'
		});

		const compilationInfo = await arenaModule.getCompilationInfo();
		for (const message of compilationInfo.messages) {
			console.log(`[Arena Shader ${message.type}] Line ${message.lineNum}: ${message.message}`);
			if (message.type === 'error') {
				throw new Error(`Arena shader compilation error: ${message.message}`);
			}
		}

		this.arenaPipeline = this.device.createRenderPipeline({
			layout: 'auto',
			vertex: {
				module: arenaModule,
				entryPoint: 'vertexMain',
				buffers: [
					{
						// Line vertex: position(2) + color(4) = 6 floats
						arrayStride: 6 * 4,
						stepMode: 'vertex',
						attributes: [
							{ shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
							{ shaderLocation: 1, offset: 2 * 4, format: 'float32x4' } // color
						]
					}
				]
			},
			fragment: {
				module: arenaModule,
				entryPoint: 'fragmentMain',
				targets: [
					{
						format: this.format,
						blend: {
							color: {
								srcFactor: 'src-alpha',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add'
							},
							alpha: {
								srcFactor: 'one',
								dstFactor: 'one-minus-src-alpha',
								operation: 'add'
							}
						}
					}
				]
			},
			primitive: {
				topology: 'line-list',
				cullMode: 'none'
			},
			label: 'Arena Pipeline'
		});

		this.arenaBindGroup = this.device.createBindGroup({
			layout: this.arenaPipeline.getBindGroupLayout(0),
			entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
			label: 'Arena Bind Group'
		});
	}

	/**
	 * Initialize agents with directive-based positions and goals
	 * Encodes role and team info for rendering colors
	 */
	private initializeAgents(): void {
		const { agentCount } = this.config;
		const agentData = new Float32Array(agentCount * 8);

		// Initialize directive states for all agents
		this.agentDirectives = initializeAgentDirectives(agentCount, this.currentEventPhase);

		// Set up agents based on their directives
		for (let i = 0; i < agentCount; i++) {
			const idx = i * 8;
			const directive = this.agentDirectives[i];

			// Position based on directive
			const pos = getInitialPosition(directive);
			agentData[idx + 0] = pos.x;
			agentData[idx + 1] = pos.y;

			// Initial velocity (small random, less for seated)
			const isStationary =
				directive.directive === Directive.SEATED ||
				directive.directive === Directive.ON_COURT ||
				directive.directive === Directive.ON_BENCH;
			agentData[idx + 2] = isStationary ? 0 : (Math.random() - 0.5) * 0.3;
			agentData[idx + 3] = isStationary ? 0 : (Math.random() - 0.5) * 0.3;

			// Target based on directive
			const target = getDirectiveTarget(directive);
			agentData[idx + 4] = target.x;
			agentData[idx + 5] = target.y;

			// State based on directive (affects color)
			let state: AgentStateValue = AgentState.CALM;
			if (
				directive.directive === Directive.GOING_TO_RESTROOM ||
				directive.directive === Directive.GOING_TO_FOOD ||
				directive.directive === Directive.EXITING
			) {
				state = AgentState.CROWDED; // Yellow - moving
			}
			agentData[idx + 6] = state;

			// Encode role, team, directive, and group in group_id slot:
			// Bits 0-1: role (0=fan, 1=player, 2=staff)
			// Bits 2-3: teamId (0=home, 1=away, 2=neutral)
			// Bits 4-7: directive type (0-15)
			// Bits 8-15: groupId for cohesion (0=no group, 1-255=group)
			const encodedGroup =
				(directive.role & 0x3) |
				((directive.teamId & 0x3) << 2) |
				((directive.directive & 0xf) << 4) |
				((directive.groupId & 0xff) << 8);
			agentData[idx + 7] = encodedGroup;
		}

		this.device.queue.writeBuffer(this.agentBuffer, 0, agentData);
	}

	/**
	 * Update simulation uniforms
	 */
	private updateUniforms(): void {
		const walls = getWallSegments();

		// Arena ellipse parameters (matching overlay: center 400,300, rx=380, ry=280)
		const arenaCenterX = 400;
		const arenaCenterY = 300;
		const arenaRx = 380;
		const arenaRy = 280;

		const uniformData = new Float32Array([
			this.deltaTime,
			this.config.agentCount,
			this.config.arenaWidth,
			this.config.arenaHeight,
			this.config.goalStrength,
			this.config.separationStrength,
			this.config.wallStrength,
			this.config.maxSpeed,
			this.config.panicSpreadRadius,
			walls.length,
			0, // targetCount (unused, targets are per-agent)
			this.currentScenario,
			// Ellipse parameters
			arenaCenterX,
			arenaCenterY,
			arenaRx,
			arenaRy,
			// Canvas dimensions for aspect ratio correction
			this.config.canvasWidth,
			this.config.canvasHeight,
			// Determinism parameters
			this.config.seed,
			this.frameCount,
			0, // padding
			0 // padding
		]);

		this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

		// Update wall buffer
		const wallData = new Float32Array(64 * 4);
		walls.forEach((wall, i) => {
			if (i < 64) {
				wallData[i * 4 + 0] = wall.x1;
				wallData[i * 4 + 1] = wall.y1;
				wallData[i * 4 + 2] = wall.x2;
				wallData[i * 4 + 3] = wall.y2;
			}
		});
		this.device.queue.writeBuffer(this.wallBuffer, 0, wallData);
	}

	/**
	 * Run one simulation step
	 */
	private simulate(): void {
		this.updateUniforms();
		this.frameCount++;

		const { agentCount } = this.config;
		const agentWorkgroups = Math.ceil(agentCount / 64);
		const cellWorkgroups = Math.ceil(TOTAL_CELLS / 64);

		// Phase 1: Spatial hash grid construction
		const hashEncoder = this.device.createCommandEncoder();

		// 1a. Reset cell bounds
		const resetPass = hashEncoder.beginComputePass();
		resetPass.setPipeline(this.cellBoundsResetPipeline);
		resetPass.setBindGroup(0, this.cellBoundsResetBindGroup);
		resetPass.dispatchWorkgroups(cellWorkgroups);
		resetPass.end();

		// 1b. Assign agents to cells
		const assignPass = hashEncoder.beginComputePass();
		assignPass.setPipeline(this.cellAssignPipeline);
		assignPass.setBindGroup(0, this.cellAssignBindGroup);
		assignPass.dispatchWorkgroups(agentWorkgroups);
		assignPass.end();

		this.device.queue.submit([hashEncoder.finish()]);

		// 1c. Bitonic sort - requires multiple passes with barriers
		this.runBitonicSort(agentCount);

		// 1d. Compute cell bounds
		const boundsEncoder = this.device.createCommandEncoder();
		const boundsPass = boundsEncoder.beginComputePass();
		boundsPass.setPipeline(this.cellBoundsPipeline);
		boundsPass.setBindGroup(0, this.cellBoundsBindGroup);
		boundsPass.dispatchWorkgroups(agentWorkgroups);
		boundsPass.end();
		this.device.queue.submit([boundsEncoder.finish()]);

		// Phase 2: Main simulation with spatial hashing
		const simEncoder = this.device.createCommandEncoder();
		const computePass = simEncoder.beginComputePass();
		computePass.setPipeline(this.computePipeline);
		computePass.setBindGroup(0, this.computeBindGroup);
		computePass.dispatchWorkgroups(agentWorkgroups);
		computePass.end();

		this.device.queue.submit([simEncoder.finish()]);
	}

	/**
	 * Run bitonic sort on agent cells
	 * Bitonic sort requires O(log²n) passes
	 */
	private runBitonicSort(count: number): void {
		// Pad to next power of 2
		const n = Math.pow(2, Math.ceil(Math.log2(count)));
		const stages = Math.ceil(Math.log2(n));

		for (let stage = 0; stage < stages; stage++) {
			for (let step = stage; step >= 0; step--) {
				// Update sort uniforms
				const sortData = new Uint32Array([count, stage, step, 0]);
				this.device.queue.writeBuffer(this.sortUniformBuffer, 0, sortData);

				// Run one sort pass
				const encoder = this.device.createCommandEncoder();
				const pass = encoder.beginComputePass();
				pass.setPipeline(this.bitonicSortPipeline);
				pass.setBindGroup(0, this.bitonicSortBindGroup);
				pass.dispatchWorkgroups(Math.ceil(n / 512)); // 256 threads process n/2 pairs
				pass.end();
				this.device.queue.submit([encoder.finish()]);
			}
		}
	}

	/**
	 * Render arena and agents to canvas
	 */
	private render(): void {
		const commandEncoder = this.device.createCommandEncoder();

		const textureView = this.context.getCurrentTexture().createView();

		const renderPass = commandEncoder.beginRenderPass({
			colorAttachments: [
				{
					view: textureView,
					clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 }, // Dark background
					loadOp: 'clear',
					storeOp: 'store'
				}
			]
		});

		// First, draw arena lines (behind agents)
		renderPass.setPipeline(this.arenaPipeline);
		renderPass.setBindGroup(0, this.arenaBindGroup);
		renderPass.setVertexBuffer(0, this.arenaVertexBuffer);
		renderPass.draw(this.arenaVertexCount);

		// Then, draw agents on top
		renderPass.setPipeline(this.renderPipeline);
		renderPass.setBindGroup(0, this.renderBindGroup);
		renderPass.setVertexBuffer(0, this.circleVertexBuffer);
		renderPass.setIndexBuffer(this.circleIndexBuffer, 'uint32');
		renderPass.drawIndexed(this.circleIndexCount, this.config.agentCount);

		renderPass.end();

		this.device.queue.submit([commandEncoder.finish()]);
	}

	/**
	 * Update player positions when possession changes (offense/defense switch)
	 */
	private updatePlayerPositions(): void {
		if (!this.useDirectiveSystem || this.agentDirectives.length === 0) return;

		const targetsToUpdate: Array<{ index: number; x: number; y: number }> = [];

		for (let i = 0; i < this.agentDirectives.length; i++) {
			const directive = this.agentDirectives[i];
			
			// Only update players who are ON_COURT
			if (directive.role === AgentRole.PLAYER && directive.directive === Directive.ON_COURT) {
				const target = getDirectiveTarget(directive);
				targetsToUpdate.push({ index: i, x: target.x, y: target.y });
			}
		}

		// Batch update targets to GPU
		if (targetsToUpdate.length > 0) {
			const updateData = new Float32Array(targetsToUpdate.length * 3);
			for (let j = 0; j < targetsToUpdate.length; j++) {
				const update = targetsToUpdate[j];
				updateData[j * 3] = update.index;
				updateData[j * 3 + 1] = update.x;
				updateData[j * 3 + 2] = update.y;
			}

			// Write individual target updates
			for (const update of targetsToUpdate) {
				const targetOffset = update.index * 8 * 4 + 4 * 4; // offset to target.x
				const targetData = new Float32Array([update.x, update.y]);
				this.device.queue.writeBuffer(this.agentBuffer, targetOffset, targetData);
			}
		}
	}

	/**
	 * Update agent directives and sync targets to GPU
	 */
	private updateAgentDirectives(): void {
		if (!this.useDirectiveSystem || this.agentDirectives.length === 0) return;

		const { agentCount } = this.config;

		// Create buffer for target updates only (positions 4,5 in each agent's data)
		// We'll batch update targets for agents whose directives changed
		const targetsToUpdate: Array<{ index: number; x: number; y: number; state: number }> = [];

		for (let i = 0; i < agentCount; i++) {
			const oldDirective = this.agentDirectives[i].directive;

			// Update directive state
			this.agentDirectives[i] = updateDirective(
				this.agentDirectives[i],
				this.currentEventPhase,
				this.directiveUpdateInterval
			);

			const newDirective = this.agentDirectives[i].directive;

			// If directive changed, update target
			if (oldDirective !== newDirective) {
				const target = getDirectiveTarget(this.agentDirectives[i]);
				let state: AgentStateValue = AgentState.CALM;

				// Set state based on directive
				if (
					newDirective === Directive.GOING_TO_RESTROOM ||
					newDirective === Directive.GOING_TO_FOOD ||
					newDirective === Directive.EXITING
				) {
					state = AgentState.CROWDED;
				} else if (newDirective === Directive.ARRIVING || newDirective === Directive.ENTERING) {
					state = AgentState.CALM;
				}

				targetsToUpdate.push({ index: i, x: target.x, y: target.y, state });
			}
		}

		// Batch update targets in GPU buffer
		if (targetsToUpdate.length > 0) {
			// For efficiency, update targets in small batches
			const updateData = new Float32Array(targetsToUpdate.length * 4); // x, y, state, directive
			targetsToUpdate.forEach((update, i) => {
				const offset = i * 4;
				updateData[offset + 0] = update.x;
				updateData[offset + 1] = update.y;
				updateData[offset + 2] = update.state;
				updateData[offset + 3] = this.agentDirectives[update.index].directive;
			});

			// Update each agent's target individually (GPU writes are small anyway)
			targetsToUpdate.forEach((update) => {
				const agentOffset = update.index * 8 * 4; // 8 floats per agent, 4 bytes per float
				const targetData = new Float32Array([
					update.x,
					update.y,
					update.state,
					this.agentDirectives[update.index].directive
				]);
				// Write target (offset 4,5), state (offset 6), directive (offset 7)
				this.device.queue.writeBuffer(this.agentBuffer, agentOffset + 4 * 4, targetData);
			});
		}
	}

	/**
	 * Main animation loop
	 */
	private loop = (): void => {
		if (!this.isRunning) return;

		const frameStartTime = performance.now();

		// Update directives periodically (not every frame)
		this.directiveUpdateTimer += this.deltaTime;
		if (this.directiveUpdateTimer >= this.directiveUpdateInterval) {
			this.updateAgentDirectives();
			this.directiveUpdateTimer = 0;
		}

		// Update basketball possession and player positions
		const prevPossession = getCurrentPossession();
		updatePossession(this.deltaTime);
		const newPossession = getCurrentPossession();
		
		// When possession changes, update all player targets
		if (prevPossession !== newPossession) {
			this.updatePlayerPositions();
		}

		// Track compute time
		const computeStartTime = performance.now();
		this.simulate();
		const computeEndTime = performance.now();

		// Track render time
		const renderStartTime = performance.now();
		this.render();
		const renderEndTime = performance.now();

		// Record telemetry if enabled
		if (this.telemetry) {
			const frameEndTime = performance.now();
			const frameMetrics = this.collectFrameMetrics(
				frameStartTime,
				frameEndTime,
				computeEndTime - computeStartTime,
				renderEndTime - renderStartTime
			);
			this.telemetry.recordFrame(frameMetrics);
		}

		this.animationFrameId = requestAnimationFrame(this.loop);
	};

	/**
	 * Start the simulation
	 */
	start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.loop();
	}

	/**
	 * Stop the simulation
	 */
	stop(): void {
		this.isRunning = false;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * Set the current scenario (triggers agent redistribution)
	 */
	setScenario(scenarioIndex: number, effect: ScenarioEffect): void {
		const previousScenario = this.currentScenario;
		this.currentScenario = scenarioIndex;

		// Record scenario change in telemetry
		if (this.telemetry && previousScenario !== scenarioIndex) {
			this.telemetry.recordScenarioChange(
				`scenario_${scenarioIndex}`,
				`scenario_${previousScenario}`
			);
		}

		// Map scenario to event phase for directive system
		const phaseMap: Record<number, EventPhaseType> = {
			0: EventPhase.PRE_EVENT, // Gate crowding - entering
			1: EventPhase.EVENT_START, // VIP arrival
			2: EventPhase.HALFTIME, // Halftime - dispersing
			3: EventPhase.SECOND_HALF, // Weather - sheltering (treat as second half)
			4: EventPhase.EVENT_END, // Emergency - evacuating (triggers exit)
			5: EventPhase.EVENT_END, // Game end - exiting
			6: EventPhase.POST_EVENT // Overnight - maintenance
		};

		const newPhase = phaseMap[scenarioIndex] ?? EventPhase.EVENT_START;

		// If phase changed significantly, reinitialize directives
		if (this.currentEventPhase !== newPhase) {
			this.currentEventPhase = newPhase;

			// Reinitialize agent directives for new phase
			const { agentCount } = this.config;
			this.agentDirectives = initializeAgentDirectives(agentCount, newPhase);

			// Update all agents with new directive-based positions and targets
			const agentData = new Float32Array(agentCount * 8);
			for (let i = 0; i < agentCount; i++) {
				const idx = i * 8;
				const directive = this.agentDirectives[i];

				const pos = getInitialPosition(directive);
				agentData[idx + 0] = pos.x;
				agentData[idx + 1] = pos.y;

				agentData[idx + 2] = (Math.random() - 0.5) * 0.3;
				agentData[idx + 3] = (Math.random() - 0.5) * 0.3;

				const target = getDirectiveTarget(directive);
				agentData[idx + 4] = target.x;
				agentData[idx + 5] = target.y;

				let state: AgentStateValue = AgentState.CALM;
				if (
					directive.directive === Directive.EXITING ||
					directive.directive === Directive.GOING_TO_RESTROOM
				) {
					state = AgentState.CROWDED;
				}
				if (effect.crowdFlow === 'evacuating') {
					state = AgentState.PANICKED;
				}
				agentData[idx + 6] = state;

				// Properly encode role, team, directive, and group (same as initializeAgents)
				const encodedGroup =
					(directive.role & 0x3) |
					((directive.teamId & 0x3) << 2) |
					((directive.directive & 0xf) << 4) |
					((directive.groupId & 0xff) << 8);
				agentData[idx + 7] = encodedGroup;
			}

			this.device.queue.writeBuffer(this.agentBuffer, 0, agentData);
		}
	}

	/**
	 * Redistribute agents based on scenario effect (legacy, now handled by directive system)
	 */
	private redistributeAgents(effect: ScenarioEffect, activeCount: number): void {
		const { agentCount } = this.config;
		const agentData = new Float32Array(agentCount * 8);

		// Get targets from scenario (now in 800x600 coordinates)
		const targets = getScenarioTargets(this.currentScenario);

		for (let i = 0; i < agentCount; i++) {
			const idx = i * 8;
			const isActive = i < activeCount;

			if (isActive) {
				// Position based on crowd flow
				const spawnPos = this.getSpawnPosition(effect.crowdFlow, 800, 600);
				agentData[idx + 0] = spawnPos.x;
				agentData[idx + 1] = spawnPos.y;

				// Small random initial velocity
				agentData[idx + 2] = (Math.random() - 0.5) * 0.5;
				agentData[idx + 3] = (Math.random() - 0.5) * 0.5;

				// Target from scenario (directly, no scaling needed)
				if (targets.length > 0) {
					const target = targets[Math.floor(Math.random() * targets.length)];
					agentData[idx + 4] = target.x + (Math.random() - 0.5) * target.radius;
					agentData[idx + 5] = target.y + (Math.random() - 0.5) * target.radius;
				} else {
					agentData[idx + 4] = 400;
					agentData[idx + 5] = 300;
				}

				// State based on scenario
				agentData[idx + 6] =
					effect.crowdFlow === 'evacuating' ? AgentState.PANICKED : AgentState.CALM;
				agentData[idx + 7] = Math.floor(Math.random() * 8);
			} else {
				// Inactive agents go off-screen
				agentData[idx + 0] = -1000;
				agentData[idx + 1] = -1000;
				agentData[idx + 2] = 0;
				agentData[idx + 3] = 0;
				agentData[idx + 4] = -1000;
				agentData[idx + 5] = -1000;
				agentData[idx + 6] = AgentState.CALM;
				agentData[idx + 7] = 0;
			}
		}

		this.device.queue.writeBuffer(this.agentBuffer, 0, agentData);
	}

	/**
	 * Get spawn position based on crowd flow type
	 * Uses 800x600 arena coordinates matching original Living Arena
	 * Arena ellipse: cx=400, cy=300, rx=380, ry=280
	 */
	private getSpawnPosition(
		crowdFlow: string,
		arenaWidth: number,
		arenaHeight: number
	): { x: number; y: number } {
		// Arena center and ellipse radii (matching original SVG)
		const centerX = 400;
		const centerY = 300;
		const arenaRx = 380;
		const arenaRy = 280;

		switch (crowdFlow) {
			case 'entering':
				// Spawn from north gate area (top of arena)
				return {
					x: centerX + (Math.random() - 0.5) * 200,
					y: 30 + Math.random() * 50
				};

			case 'vip':
				// Spawn from south VIP entrance
				return {
					x: centerX + (Math.random() - 0.5) * 80,
					y: 550 + Math.random() * 40
				};

			case 'dispersing':
				// Start from seating area (within arena ellipse)
				const angle = Math.random() * Math.PI * 2;
				const radiusFactor = 0.4 + Math.random() * 0.5; // 40-90% of arena radius
				return {
					x: centerX + Math.cos(angle) * arenaRx * radiusFactor,
					y: centerY + Math.sin(angle) * arenaRy * radiusFactor
				};

			case 'sheltering':
				// Spread across arena interior
				const shAngle = Math.random() * Math.PI * 2;
				const shRadius = 0.2 + Math.random() * 0.6; // 20-80% of arena radius
				return {
					x: centerX + Math.cos(shAngle) * arenaRx * shRadius,
					y: centerY + Math.sin(shAngle) * arenaRy * shRadius
				};

			case 'evacuating':
				// Start from section 112 area (right side of arena)
				const evAngle = (Math.random() - 0.5) * Math.PI * 0.5 + Math.PI * 0.25; // Right quadrant
				const evRadius = 0.4 + Math.random() * 0.4;
				return {
					x: centerX + Math.cos(evAngle) * arenaRx * evRadius,
					y: centerY + Math.sin(evAngle) * arenaRy * evRadius
				};

			case 'exiting':
				// Start from seats (throughout arena)
				const exitAngle = Math.random() * Math.PI * 2;
				const exitRadius = 0.3 + Math.random() * 0.5;
				return {
					x: centerX + Math.cos(exitAngle) * arenaRx * exitRadius,
					y: centerY + Math.sin(exitAngle) * arenaRy * exitRadius
				};

			case 'empty':
			default:
				// Few maintenance workers in court area
				return {
					x: 300 + Math.random() * 200,
					y: 220 + Math.random() * 160
				};
		}
	}

	/**
	 * Update canvas size
	 */
	resize(width: number, height: number): void {
		this.config.canvasWidth = width;
		this.config.canvasHeight = height;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// TELEMETRY INTEGRATION
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Enable telemetry collection for observability.
	 * Integrates with @create-something/harness for CI/CD validation.
	 */
	enableTelemetry(config?: Partial<TelemetryConfig>): SimulationTelemetry {
		this.telemetry = createTelemetry(config);
		return this.telemetry;
	}

	/**
	 * Disable telemetry collection.
	 */
	disableTelemetry(): void {
		if (this.currentExperimentId && this.telemetry) {
			this.telemetry.endExperimentSpan(this.currentExperimentId);
			this.currentExperimentId = null;
		}
		this.telemetry = null;
	}

	/**
	 * Get the current telemetry instance (if enabled).
	 */
	getTelemetry(): SimulationTelemetry | null {
		return this.telemetry;
	}

	/**
	 * Start an experiment span for tracing.
	 * Use this to correlate simulation runs with harness sessions.
	 */
	startExperiment(
		experimentId: string,
		options: {
			name?: string;
			hypothesis?: string;
			harnessSessionId?: string;
			beadsIssueId?: string;
			labels?: string[];
		} = {}
	): void {
		if (!this.telemetry) {
			this.enableTelemetry();
		}

		// End any existing experiment
		if (this.currentExperimentId) {
			this.endExperiment();
		}

		this.currentExperimentId = experimentId;
		this.telemetry!.startExperimentSpan(experimentId, {
			name: options.name,
			hypothesis: options.hypothesis,
			config: {
				agentCount: this.config.agentCount,
				scenario: this.currentScenario,
				eventPhase: this.currentEventPhase,
				seed: this.config.seed
			},
			harnessSessionId: options.harnessSessionId,
			beadsIssueId: options.beadsIssueId,
			labels: options.labels
		});

		// Record scenario as starting event
		this.telemetry!.recordScenarioChange(`scenario_${this.currentScenario}`);
	}

	/**
	 * End the current experiment span.
	 */
	endExperiment(status: 'ok' | 'error' = 'ok', message?: string): void {
		if (!this.telemetry || !this.currentExperimentId) return;

		this.telemetry.endExperimentSpan(this.currentExperimentId, status, message);
		this.currentExperimentId = null;
	}

	/**
	 * Get a checkpoint summary for harness integration.
	 * Returns telemetry state suitable for AgentContext.
	 */
	getCheckpointSummary(): ReturnType<SimulationTelemetry['generateCheckpointSummary']> | null {
		return this.telemetry?.generateCheckpointSummary() ?? null;
	}

	/**
	 * Collect frame metrics for telemetry.
	 */
	private collectFrameMetrics(
		frameStartTime: number,
		frameEndTime: number,
		computeTimeMs: number,
		renderTimeMs: number
	): FrameMetrics {
		// Count agent states from directive system
		let panickedAgents = 0;
		let crowdedAgents = 0;

		for (const directive of this.agentDirectives) {
			// Check for panic-inducing directives
			if (directive.directive === Directive.EXITING) {
				panickedAgents++;
			} else if (
				directive.directive === Directive.GOING_TO_RESTROOM ||
				directive.directive === Directive.GOING_TO_FOOD
			) {
				crowdedAgents++;
			}
		}

		// Estimate density (simplified - actual density would require GPU readback)
		const avgDensity = this.config.agentCount / (GRID_COLS * GRID_ROWS);
		const maxDensity = avgDensity * 3; // Estimate - hotspots can be 3x average

		// Convert EventPhase number to string name
		const eventPhaseNames: Record<number, string> = {
			[EventPhase.PRE_EVENT]: 'PRE_EVENT',
			[EventPhase.EVENT_START]: 'EVENT_START',
			[EventPhase.HALFTIME]: 'HALFTIME',
			[EventPhase.SECOND_HALF]: 'SECOND_HALF',
			[EventPhase.EVENT_END]: 'EVENT_END',
			[EventPhase.POST_EVENT]: 'POST_EVENT'
		};

		return {
			frameNumber: this.frameCount,
			frameTimeMs: frameEndTime - frameStartTime,
			computeTimeMs,
			renderTimeMs,
			activeAgents: this.config.agentCount,
			panickedAgents,
			crowdedAgents,
			avgDensity,
			maxDensity,
			scenario: this.currentScenario,
			eventPhase: eventPhaseNames[this.currentEventPhase] ?? 'UNKNOWN'
		};
	}

	/**
	 * Clean up GPU resources
	 */
	destroy(): void {
		this.stop();

		// Clean up telemetry
		if (this.currentExperimentId && this.telemetry) {
			this.telemetry.endExperimentSpan(this.currentExperimentId);
			this.currentExperimentId = null;
		}
		this.telemetry = null;

		// GPU buffers
		this.agentBuffer?.destroy();
		this.agentReadBuffer?.destroy();
		this.uniformBuffer?.destroy();
		this.wallBuffer?.destroy();
		// Spatial hash grid buffers
		this.agentCellBuffer?.destroy();
		this.cellBoundsBuffer?.destroy();
		this.sortedAgentIndicesBuffer?.destroy();
		this.sortUniformBuffer?.destroy();
		// Render buffers
		this.circleVertexBuffer?.destroy();
		this.circleIndexBuffer?.destroy();
		this.arenaVertexBuffer?.destroy();
	}
}
