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
		// wallStrength(1) + maxSpeed(1) + panicRadius(1) + wallCount(1) + targetCount(1) + scenario(1) = 12 floats
		this.uniformBuffer = this.device.createBuffer({
			size: 12 * 4,
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
	 * Initialize agents with random positions based on scenario
	 */
	private initializeAgents(): void {
		const { agentCount, arenaWidth, arenaHeight } = this.config;
		const agentData = new Float32Array(agentCount * 8);

		// Initial positions spread around the arena
		for (let i = 0; i < agentCount; i++) {
			const idx = i * 8;

			// Random position within arena bounds (with padding)
			const angle = Math.random() * Math.PI * 2;
			const radius = 100 + Math.random() * 200;
			agentData[idx + 0] = arenaWidth / 2 + Math.cos(angle) * radius; // x
			agentData[idx + 1] = arenaHeight / 2 + Math.sin(angle) * radius; // y

			// Initial velocity (stationary)
			agentData[idx + 2] = 0; // vx
			agentData[idx + 3] = 0; // vy

			// Target (will be set by scenario)
			agentData[idx + 4] = arenaWidth / 2; // targetX
			agentData[idx + 5] = arenaHeight / 2; // targetY

			// State and group
			agentData[idx + 6] = AgentState.CALM; // state (as float, will be cast in shader)
			agentData[idx + 7] = Math.floor(Math.random() * 8); // group_id
		}

		this.device.queue.writeBuffer(this.agentBuffer, 0, agentData);
	}

	/**
	 * Update simulation uniforms
	 */
	private updateUniforms(): void {
		const walls = getWallSegments();

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
			this.currentScenario
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
	 * Main animation loop
	 */
	private loop = (): void => {
		if (!this.isRunning) return;

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

		// Scale agent count based on attendance
		const scaledCount = Math.min(
			this.config.agentCount,
			Math.floor(effect.attendance / 2) // Show half as many agents as attendance
		);

		// Redistribute agents based on scenario
		this.redistributeAgents(effect, scaledCount);
	}

	/**
	 * Redistribute agents based on scenario effect
	 */
	private redistributeAgents(effect: ScenarioEffect, activeCount: number): void {
		const { agentCount, arenaWidth, arenaHeight } = this.config;
		const agentData = new Float32Array(agentCount * 8);

		const targets = getScenarioTargets(this.currentScenario);

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

				// Target from scenario
				if (targets.length > 0) {
					const target = targets[Math.floor(Math.random() * targets.length)];
					agentData[idx + 4] = target.x + (Math.random() - 0.5) * target.radius;
					agentData[idx + 5] = target.y + (Math.random() - 0.5) * target.radius;
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
	 */
	private getSpawnPosition(
		crowdFlow: string,
		arenaWidth: number,
		arenaHeight: number
	): { x: number; y: number } {
		const centerX = arenaWidth / 2;
		const centerY = arenaHeight / 2;

		switch (crowdFlow) {
			case 'entering':
				// Spawn from parking lots (north)
				return {
					x: centerX + (Math.random() - 0.5) * 400,
					y: -50 + Math.random() * 100
				};

			case 'vip':
				// Spawn from south VIP entrance
				return {
					x: centerX + (Math.random() - 0.5) * 100,
					y: arenaHeight + 50
				};

			case 'dispersing':
				// Start from seating area
				const angle = Math.random() * Math.PI * 2;
				const radius = 80 + Math.random() * 120;
				return {
					x: centerX + Math.cos(angle) * radius,
					y: centerY + Math.sin(angle) * radius * 0.7
				};

			case 'sheltering':
				// Spread across arena
				return {
					x: 100 + Math.random() * (arenaWidth - 200),
					y: 100 + Math.random() * (arenaHeight - 200)
				};

			case 'evacuating':
				// Start from section 112 area (right side)
				return {
					x: centerX + 100 + Math.random() * 150,
					y: centerY + 50 + Math.random() * 150
				};

			case 'exiting':
				// Start from seats
				const exitAngle = Math.random() * Math.PI * 2;
				const exitRadius = 100 + Math.random() * 150;
				return {
					x: centerX + Math.cos(exitAngle) * exitRadius,
					y: centerY + Math.sin(exitAngle) * exitRadius * 0.7
				};

			case 'empty':
			default:
				// Few maintenance workers
				return {
					x: 200 + Math.random() * (arenaWidth - 400),
					y: 200 + Math.random() * (arenaHeight - 400)
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
