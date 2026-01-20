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
	initializeAgentDirectives,
	updateDirective,
	getDirectiveTarget,
	getInitialPosition
} from './agentDirectives';

// Import shaders as raw text
import crowdShaderSource from './shaders/crowd.wgsl?raw';
import renderShaderSource from './shaders/render.wgsl?raw';

/** Agent state constants matching shader values */
export const AgentState = {
	CALM: 0,
	CROWDED: 1,
	PANICKED: 2
} as const;

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
		await this.createComputePipeline();
		await this.createRenderPipeline();
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
		// ellipse params: centerX(1) + centerY(1) + rx(1) + ry(1) = 16 floats
		this.uniformBuffer = this.device.createBuffer({
			size: 16 * 4,
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
	 * Initialize agents with directive-based positions and goals
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

			// Initial velocity (small random)
			agentData[idx + 2] = (Math.random() - 0.5) * 0.3;
			agentData[idx + 3] = (Math.random() - 0.5) * 0.3;

			// Target based on directive
			const target = getDirectiveTarget(directive);
			agentData[idx + 4] = target.x;
			agentData[idx + 5] = target.y;

			// State based on directive
			let state = AgentState.CALM;
			if (
				directive.directive === Directive.GOING_TO_RESTROOM ||
				directive.directive === Directive.GOING_TO_FOOD
			) {
				state = AgentState.CROWDED; // Slightly hurried
			}
			agentData[idx + 6] = state;

			// Store directive type in group_id slot for visualization
			agentData[idx + 7] = directive.directive;
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
			arenaRy
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
	 * Render agents to canvas
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

		renderPass.setPipeline(this.renderPipeline);
		renderPass.setBindGroup(0, this.renderBindGroup);
		renderPass.setVertexBuffer(0, this.circleVertexBuffer);
		renderPass.setIndexBuffer(this.circleIndexBuffer, 'uint32');

		// Draw all agents as instances
		renderPass.drawIndexed(this.circleIndexCount, this.config.agentCount);
		renderPass.end();

		this.device.queue.submit([commandEncoder.finish()]);
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
				let state = AgentState.CALM;

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

				let state = AgentState.CALM;
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
				agentData[idx + 7] = directive.directive;
			}

			this.device.queue.writeBuffer(this.agentBuffer, 0, agentData);
		}
	}

	/**
	 * Redistribute agents based on scenario effect
	 */
	private redistributeAgents(effect: ScenarioEffect, activeCount: number): void {
		const { agentCount, arenaWidth, arenaHeight } = this.config;
		const agentData = new Float32Array(agentCount * 8);

		// Get targets from scenario (these use 1200x900 coordinate system from arenaGeometry.ts)
		const targets = getScenarioTargets(this.currentScenario);
		// Scale factors from arenaGeometry coordinate system (1200x900) to our arena (800x600)
		const ORIG_WIDTH = 1200;
		const ORIG_HEIGHT = 900;
		const scaleX = arenaWidth / ORIG_WIDTH;
		const scaleY = arenaHeight / ORIG_HEIGHT;

		for (let i = 0; i < agentCount; i++) {
			const idx = i * 8;
			const isActive = i < activeCount;

			if (isActive) {
				// Position based on crowd flow
				const spawnPos = this.getSpawnPosition(effect.crowdFlow, arenaWidth, arenaHeight);
				agentData[idx + 0] = spawnPos.x;
				agentData[idx + 1] = spawnPos.y;

				// Small random initial velocity
				agentData[idx + 2] = (Math.random() - 0.5) * 0.5;
				agentData[idx + 3] = (Math.random() - 0.5) * 0.5;

				// Target from scenario (scaled to current arena dimensions)
				if (targets.length > 0) {
					const target = targets[Math.floor(Math.random() * targets.length)];
					const scaledX = target.x * scaleX;
					const scaledY = target.y * scaleY;
					const scaledRadius = target.radius * Math.min(scaleX, scaleY);
					agentData[idx + 4] = scaledX + (Math.random() - 0.5) * scaledRadius;
					agentData[idx + 5] = scaledY + (Math.random() - 0.5) * scaledRadius;
				} else {
					agentData[idx + 4] = arenaWidth / 2;
					agentData[idx + 5] = arenaHeight / 2;
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
	}
}
