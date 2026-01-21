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

// Import shaders as raw text
import crowdShaderSource from './shaders/crowd.wgsl?raw';
import renderShaderSource from './shaders/render.wgsl?raw';
import arenaShaderSource from './shaders/arena.wgsl?raw';

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
	panicSpreadRadius: 30.0
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
	private isRunning = false;
	private animationFrameId: number | null = null;

	// Directive system
	private agentDirectives: AgentDirectiveState[] = [];
	private currentEventPhase: EventPhaseType = EventPhase.PRE_EVENT;
	private directiveUpdateTimer = 0;
	private directiveUpdateInterval = 0.1; // Update directives every 100ms
	private useDirectiveSystem = true; // Enable new directive system

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
		await this.createComputePipeline();
		await this.createRenderPipeline();
		await this.createArenaPipeline();
		this.initializeAgents();
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
		// canvas dimensions: canvasWidth(1) + canvasHeight(1) = 18 floats (padded to 20 for alignment)
		this.uniformBuffer = this.device.createBuffer({
			size: 20 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			label: 'Uniform Buffer'
		});

		// Wall segments buffer (max 64 walls, each wall is 4 floats: x1, y1, x2, y2)
		this.wallBuffer = this.device.createBuffer({
			size: 64 * 4 * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			label: 'Wall Buffer'
		});
		// Note: targets are stored per-agent, not in a separate buffer
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
				{ binding: 2, resource: { buffer: this.wallBuffer } }
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

			// Encode role and team in group_id slot:
			// Bits 0-1: role (0=fan, 1=player, 2=staff)
			// Bits 2-3: teamId (0=home, 1=away, 2=neutral)
			// Bits 4-7: directive type
			const encodedGroup =
				(directive.role & 0x3) | ((directive.teamId & 0x3) << 2) | ((directive.directive & 0xf) << 4);
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

		const commandEncoder = this.device.createCommandEncoder();

		// Compute pass
		const computePass = commandEncoder.beginComputePass();
		computePass.setPipeline(this.computePipeline);
		computePass.setBindGroup(0, this.computeBindGroup);

		// Dispatch enough workgroups to cover all agents (64 threads per workgroup)
		const workgroupCount = Math.ceil(this.config.agentCount / 64);
		computePass.dispatchWorkgroups(workgroupCount);
		computePass.end();

		this.device.queue.submit([commandEncoder.finish()]);
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

		this.simulate();
		this.render();

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
		this.currentScenario = scenarioIndex;

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

				// Properly encode role, team, and directive (same as initializeAgents)
				const encodedGroup =
					(directive.role & 0x3) | ((directive.teamId & 0x3) << 2) | ((directive.directive & 0xf) << 4);
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

	/**
	 * Clean up GPU resources
	 */
	destroy(): void {
		this.stop();
		this.agentBuffer?.destroy();
		this.agentReadBuffer?.destroy();
		this.uniformBuffer?.destroy();
		this.wallBuffer?.destroy();
		this.circleVertexBuffer?.destroy();
		this.circleIndexBuffer?.destroy();
		this.arenaVertexBuffer?.destroy();
	}
}
