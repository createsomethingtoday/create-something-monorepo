/**
 * Infrastructure Scenarios
 *
 * Maps arena zones to infrastructure services for visualization:
 * - Court = Critical Service (core database, primary API)
 * - Gates = Load Balancers (entry/exit points, traffic routing)
 * - Concessions = Edge Services (CDN, caching layer)
 * - Seating Sections = Service Replicas (distributed instances)
 *
 * Supports cascade failure propagation to visualize how failures
 * spread through dependent services.
 */

import type { ScenarioEffect, CrowdFlow, SecurityStatus, LightingMode } from '../living-arena/arenaTypes';

// ============================================================================
// Service Types
// ============================================================================

/** Infrastructure service health status */
export type ServiceHealth = 'healthy' | 'degraded' | 'critical' | 'offline';

/** Service tier for priority ordering */
export type ServiceTier = 'critical' | 'core' | 'edge' | 'replica';

/** Cascade failure propagation mode */
export type CascadeMode = 'none' | 'upstream' | 'downstream' | 'bidirectional';

/** Infrastructure service definition */
export interface InfrastructureService {
	id: string;
	name: string;
	tier: ServiceTier;
	health: ServiceHealth;
	/** Arena zone this service maps to */
	zoneId: string;
	/** Position in arena coordinates (800x600) */
	position: { x: number; y: number };
	/** Services this depends on (upstream) */
	dependencies: string[];
	/** Services that depend on this (downstream) */
	dependents: string[];
	/** Current load percentage (0-100) */
	load: number;
	/** Latency in ms */
	latency: number;
	/** Error rate percentage */
	errorRate: number;
}

/** Cascade failure event */
export interface CascadeEvent {
	timestamp: number;
	sourceServiceId: string;
	affectedServiceId: string;
	propagationType: 'upstream' | 'downstream';
	severity: 'warning' | 'error' | 'critical';
	description: string;
}

/** Infrastructure scenario extending arena ScenarioEffect */
export interface InfrastructureScenario extends ScenarioEffect {
	/** Scenario identifier */
	scenarioId: string;
	/** Human-readable name */
	name: string;
	/** Description of what this scenario demonstrates */
	description: string;
	/** Service states for this scenario */
	services: InfrastructureService[];
	/** Active cascade events */
	cascadeEvents: CascadeEvent[];
	/** Cascade propagation mode */
	cascadeMode: CascadeMode;
	/** Time in simulation (for animated scenarios) */
	simulationTime: number;
}

// ============================================================================
// Arena Zone to Service Mappings
// ============================================================================

/** Arena zones with their coordinates (800x600 space) */
export const ARENA_ZONES = {
	court: {
		id: 'court',
		name: 'Court',
		bounds: { x: 300, y: 220, width: 200, height: 160 },
		center: { x: 400, y: 300 }
	},
	gates: {
		north: { id: 'gate-north', x: 400, y: 30, width: 80 },
		south: { id: 'gate-south', x: 400, y: 570, width: 80 },
		east: { id: 'gate-east', x: 770, y: 300, width: 50 },
		west: { id: 'gate-west', x: 30, y: 300, width: 50 }
	},
	concessions: {
		nw: { id: 'concession-nw', x: 150, y: 150, radius: 30 },
		ne: { id: 'concession-ne', x: 650, y: 150, radius: 30 },
		sw: { id: 'concession-sw', x: 150, y: 450, radius: 30 },
		se: { id: 'concession-se', x: 650, y: 450, radius: 30 }
	},
	sections: Array.from({ length: 12 }, (_, i) => ({
		id: `section-${i}`,
		angle: (i * 30 - 90) * (Math.PI / 180),
		innerRadius: 180,
		outerRadius: 350
	}))
} as const;

// ============================================================================
// Default Service Definitions
// ============================================================================

/** Create the base service topology */
function createServiceTopology(): InfrastructureService[] {
	const services: InfrastructureService[] = [];

	// Critical Service - Court (Primary Database/API)
	services.push({
		id: 'critical-service',
		name: 'Primary Database',
		tier: 'critical',
		health: 'healthy',
		zoneId: 'court',
		position: { x: 400, y: 300 },
		dependencies: [],
		dependents: ['lb-north', 'lb-south', 'lb-east', 'lb-west'],
		load: 45,
		latency: 12,
		errorRate: 0.01
	});

	// Load Balancers - Gates
	const lbConfigs = [
		{ id: 'lb-north', name: 'LB North (Primary)', x: 400, y: 50, zoneId: 'gate-north' },
		{ id: 'lb-south', name: 'LB South (Secondary)', x: 400, y: 550, zoneId: 'gate-south' },
		{ id: 'lb-east', name: 'LB East (Failover)', x: 750, y: 300, zoneId: 'gate-east' },
		{ id: 'lb-west', name: 'LB West (Failover)', x: 50, y: 300, zoneId: 'gate-west' }
	];

	for (const lb of lbConfigs) {
		services.push({
			id: lb.id,
			name: lb.name,
			tier: 'core',
			health: 'healthy',
			zoneId: lb.zoneId,
			position: { x: lb.x, y: lb.y },
			dependencies: ['critical-service'],
			dependents: ['edge-nw', 'edge-ne', 'edge-sw', 'edge-se'],
			load: 30 + Math.random() * 20,
			latency: 3 + Math.random() * 2,
			errorRate: 0.001
		});
	}

	// Edge Services - Concessions (CDN/Cache)
	const edgeConfigs = [
		{ id: 'edge-nw', name: 'CDN Node NW', x: 150, y: 150, zoneId: 'concession-nw' },
		{ id: 'edge-ne', name: 'CDN Node NE', x: 650, y: 150, zoneId: 'concession-ne' },
		{ id: 'edge-sw', name: 'CDN Node SW', x: 150, y: 450, zoneId: 'concession-sw' },
		{ id: 'edge-se', name: 'CDN Node SE', x: 650, y: 450, zoneId: 'concession-se' }
	];

	for (const edge of edgeConfigs) {
		services.push({
			id: edge.id,
			name: edge.name,
			tier: 'edge',
			health: 'healthy',
			zoneId: edge.zoneId,
			position: { x: edge.x, y: edge.y },
			dependencies: ['lb-north', 'lb-south'],
			dependents: [],
			load: 20 + Math.random() * 30,
			latency: 1 + Math.random(),
			errorRate: 0.0001
		});
	}

	// Service Replicas - Seating Sections
	for (let i = 0; i < 12; i++) {
		const angle = (i * 30 - 90) * (Math.PI / 180);
		const radius = 260;
		const x = 400 + Math.cos(angle) * radius * 0.95;
		const y = 300 + Math.sin(angle) * radius * 0.73;

		services.push({
			id: `replica-${i}`,
			name: `Service Replica ${i + 1}`,
			tier: 'replica',
			health: 'healthy',
			zoneId: `section-${i}`,
			position: { x, y },
			dependencies: ['critical-service'],
			dependents: [],
			load: 10 + Math.random() * 40,
			latency: 5 + Math.random() * 10,
			errorRate: 0.005
		});
	}

	return services;
}

// ============================================================================
// Cascade Failure Logic
// ============================================================================

/**
 * Calculate cascade effects when a service fails
 */
export function calculateCascadeEffects(
	services: InfrastructureService[],
	failedServiceId: string,
	mode: CascadeMode
): { updatedServices: InfrastructureService[]; events: CascadeEvent[] } {
	const events: CascadeEvent[] = [];
	const updatedServices = services.map((s) => ({ ...s }));
	const serviceMap = new Map(updatedServices.map((s) => [s.id, s]));
	const visited = new Set<string>();
	const timestamp = Date.now();

	function propagateFailure(serviceId: string, direction: 'upstream' | 'downstream', depth: number) {
		if (visited.has(`${serviceId}-${direction}`) || depth > 5) return;
		visited.add(`${serviceId}-${direction}`);

		const service = serviceMap.get(serviceId);
		if (!service) return;

		// Determine affected services based on direction
		const affectedIds = direction === 'upstream' ? service.dependencies : service.dependents;

		for (const affectedId of affectedIds) {
			const affected = serviceMap.get(affectedId);
			if (!affected) continue;

			// Calculate severity based on tier and depth
			const severity: CascadeEvent['severity'] =
				affected.tier === 'critical' ? 'critical' : depth <= 1 ? 'error' : 'warning';

			// Degrade the affected service
			if (affected.health === 'healthy') {
				affected.health = 'degraded';
				affected.latency *= 1.5 + depth * 0.3;
				affected.errorRate = Math.min(affected.errorRate * (2 + depth), 50);
				affected.load = Math.min(affected.load * 1.3, 100);
			} else if (affected.health === 'degraded' && severity === 'error') {
				affected.health = 'critical';
				affected.latency *= 2;
				affected.errorRate = Math.min(affected.errorRate * 3, 80);
			} else if (affected.health === 'critical' && severity === 'critical') {
				affected.health = 'offline';
				affected.load = 0;
				affected.errorRate = 100;
			}

			events.push({
				timestamp: timestamp + depth * 100,
				sourceServiceId: serviceId,
				affectedServiceId: affectedId,
				propagationType: direction,
				severity,
				description: `${direction === 'upstream' ? 'Dependency' : 'Dependent'} ${affected.name} ${affected.health} due to ${service.name} failure`
			});

			// Continue propagation
			if (mode === 'bidirectional' || (mode === 'downstream' && direction === 'downstream')) {
				propagateFailure(affectedId, 'downstream', depth + 1);
			}
			if (mode === 'bidirectional' || (mode === 'upstream' && direction === 'upstream')) {
				propagateFailure(affectedId, 'upstream', depth + 1);
			}
		}
	}

	// Mark the initial service as failed
	const failedService = serviceMap.get(failedServiceId);
	if (failedService) {
		failedService.health = 'offline';
		failedService.load = 0;
		failedService.errorRate = 100;

		events.push({
			timestamp,
			sourceServiceId: failedServiceId,
			affectedServiceId: failedServiceId,
			propagationType: 'downstream',
			severity: failedService.tier === 'critical' ? 'critical' : 'error',
			description: `${failedService.name} has failed`
		});

		// Start cascade
		if (mode !== 'none') {
			if (mode === 'downstream' || mode === 'bidirectional') {
				propagateFailure(failedServiceId, 'downstream', 1);
			}
			if (mode === 'upstream' || mode === 'bidirectional') {
				propagateFailure(failedServiceId, 'upstream', 1);
			}
		}
	}

	return { updatedServices, events };
}

/**
 * Recover a service and update dependent services
 */
export function recoverService(
	services: InfrastructureService[],
	serviceId: string
): InfrastructureService[] {
	const updatedServices = services.map((s) => ({ ...s }));
	const serviceMap = new Map(updatedServices.map((s) => [s.id, s]));

	const service = serviceMap.get(serviceId);
	if (service && service.health !== 'healthy') {
		service.health = 'healthy';
		service.load = 30 + Math.random() * 20;
		service.latency = service.tier === 'critical' ? 12 : service.tier === 'core' ? 5 : 2;
		service.errorRate = service.tier === 'critical' ? 0.01 : 0.001;

		// Attempt to recover dependent services
		for (const dependentId of service.dependents) {
			const dependent = serviceMap.get(dependentId);
			if (dependent && dependent.health === 'degraded') {
				// Check if all dependencies are healthy
				const allDepsHealthy = dependent.dependencies.every((depId) => {
					const dep = serviceMap.get(depId);
					return dep?.health === 'healthy';
				});

				if (allDepsHealthy) {
					dependent.health = 'healthy';
					dependent.latency = dependent.tier === 'edge' ? 2 : 5;
					dependent.errorRate = 0.001;
				}
			}
		}
	}

	return updatedServices;
}

// ============================================================================
// Predefined Infrastructure Scenarios
// ============================================================================

/** Base healthy state */
function createHealthyScenario(): InfrastructureScenario {
	return {
		scenarioId: 'healthy',
		name: 'Healthy Infrastructure',
		description: 'All services operating normally with optimal latency and error rates',
		services: createServiceTopology(),
		cascadeEvents: [],
		cascadeMode: 'none',
		simulationTime: 0,
		// ScenarioEffect fields
		zones: [],
		entry: null,
		securityStatus: 'monitoring',
		lightingMode: 'event',
		crowdFlow: 'entering',
		attendance: 8000
	};
}

/** Database failure scenario */
function createDatabaseFailureScenario(): InfrastructureScenario {
	const services = createServiceTopology();
	const { updatedServices, events } = calculateCascadeEffects(services, 'critical-service', 'downstream');

	return {
		scenarioId: 'database-failure',
		name: 'Critical Database Failure',
		description: 'Primary database fails, cascading to all dependent services',
		services: updatedServices,
		cascadeEvents: events,
		cascadeMode: 'downstream',
		simulationTime: 0,
		zones: ['court'],
		entry: null,
		securityStatus: 'alert',
		lightingMode: 'emergency',
		crowdFlow: 'evacuating',
		attendance: 8000
	};
}

/** Load balancer failure scenario */
function createLoadBalancerFailureScenario(): InfrastructureScenario {
	const services = createServiceTopology();
	const { updatedServices, events } = calculateCascadeEffects(services, 'lb-north', 'bidirectional');

	return {
		scenarioId: 'lb-failure',
		name: 'Primary Load Balancer Failure',
		description: 'North load balancer fails, traffic reroutes through secondary paths',
		services: updatedServices,
		cascadeEvents: events,
		cascadeMode: 'bidirectional',
		simulationTime: 0,
		zones: ['gate-north'],
		entry: 'south',
		securityStatus: 'alert',
		lightingMode: 'event',
		crowdFlow: 'dispersing',
		attendance: 7500
	};
}

/** Edge service degradation scenario */
function createEdgeDegradationScenario(): InfrastructureScenario {
	const services = createServiceTopology();

	// Degrade multiple edge services
	for (const service of services) {
		if (service.tier === 'edge') {
			service.health = 'degraded';
			service.latency *= 3;
			service.errorRate = 5;
			service.load = 85;
		}
	}

	return {
		scenarioId: 'edge-degradation',
		name: 'CDN Cache Miss Storm',
		description: 'Cache invalidation causes high load on edge services',
		services,
		cascadeEvents: [],
		cascadeMode: 'upstream',
		simulationTime: 0,
		zones: ['concession-nw', 'concession-ne', 'concession-sw', 'concession-se'],
		entry: null,
		securityStatus: 'monitoring',
		lightingMode: 'event',
		crowdFlow: 'dispersing',
		attendance: 8000
	};
}

/** Replica failover scenario */
function createReplicaFailoverScenario(): InfrastructureScenario {
	const services = createServiceTopology();

	// Fail half the replicas
	for (let i = 0; i < 6; i++) {
		const replica = services.find((s) => s.id === `replica-${i}`);
		if (replica) {
			replica.health = 'offline';
			replica.load = 0;
			replica.errorRate = 100;
		}
	}

	// Increase load on remaining replicas
	for (let i = 6; i < 12; i++) {
		const replica = services.find((s) => s.id === `replica-${i}`);
		if (replica) {
			replica.health = 'degraded';
			replica.load = 90;
			replica.latency *= 2;
			replica.errorRate = 2;
		}
	}

	return {
		scenarioId: 'replica-failover',
		name: 'Partial Replica Failure',
		description: 'Half of service replicas fail, remaining replicas handle increased load',
		services,
		cascadeEvents: [],
		cascadeMode: 'none',
		simulationTime: 0,
		zones: Array.from({ length: 6 }, (_, i) => `section-${i}`),
		entry: null,
		securityStatus: 'monitoring',
		lightingMode: 'event',
		crowdFlow: 'sheltering',
		attendance: 6000
	};
}

/** Total infrastructure meltdown */
function createMeltdownScenario(): InfrastructureScenario {
	const services = createServiceTopology();
	const { updatedServices, events } = calculateCascadeEffects(services, 'critical-service', 'bidirectional');

	// Further degrade everything
	for (const service of updatedServices) {
		if (service.health !== 'offline') {
			service.health = 'critical';
			service.errorRate = 50;
			service.latency *= 10;
		}
	}

	return {
		scenarioId: 'meltdown',
		name: 'Infrastructure Meltdown',
		description: 'Cascading failure across all services - total system degradation',
		services: updatedServices,
		cascadeEvents: events,
		cascadeMode: 'bidirectional',
		simulationTime: 0,
		zones: ['court', 'gate-north', 'gate-south', 'gate-east', 'gate-west'],
		entry: null,
		securityStatus: 'alert',
		lightingMode: 'emergency',
		crowdFlow: 'evacuating',
		attendance: 8000
	};
}

// ============================================================================
// Scenario Registry
// ============================================================================

/** All available infrastructure scenarios */
export const INFRASTRUCTURE_SCENARIOS: Record<string, () => InfrastructureScenario> = {
	healthy: createHealthyScenario,
	'database-failure': createDatabaseFailureScenario,
	'lb-failure': createLoadBalancerFailureScenario,
	'edge-degradation': createEdgeDegradationScenario,
	'replica-failover': createReplicaFailoverScenario,
	meltdown: createMeltdownScenario
};

/** Get a scenario by ID */
export function getInfrastructureScenario(scenarioId: string): InfrastructureScenario {
	const factory = INFRASTRUCTURE_SCENARIOS[scenarioId];
	return factory ? factory() : createHealthyScenario();
}

/** List all available scenario IDs */
export function listInfrastructureScenarios(): string[] {
	return Object.keys(INFRASTRUCTURE_SCENARIOS);
}

// ============================================================================
// Service Health Utilities
// ============================================================================

/** Get overall system health based on service states */
export function getSystemHealth(services: InfrastructureService[]): ServiceHealth {
	const criticalServices = services.filter((s) => s.tier === 'critical');
	const coreServices = services.filter((s) => s.tier === 'core');

	// If any critical service is offline, system is offline
	if (criticalServices.some((s) => s.health === 'offline')) {
		return 'offline';
	}

	// If any critical service is critical, system is critical
	if (criticalServices.some((s) => s.health === 'critical')) {
		return 'critical';
	}

	// If majority of core services are degraded/critical, system is degraded
	const unhealthyCoreCount = coreServices.filter(
		(s) => s.health === 'degraded' || s.health === 'critical' || s.health === 'offline'
	).length;

	if (unhealthyCoreCount > coreServices.length / 2) {
		return 'degraded';
	}

	// If any service is not healthy, system is degraded
	if (services.some((s) => s.health !== 'healthy')) {
		return 'degraded';
	}

	return 'healthy';
}

/** Get color for service health status */
export function getHealthColor(health: ServiceHealth): string {
	switch (health) {
		case 'healthy':
			return '#22c55e'; // green-500
		case 'degraded':
			return '#eab308'; // yellow-500
		case 'critical':
			return '#f97316'; // orange-500
		case 'offline':
			return '#ef4444'; // red-500
		default:
			return '#6b7280'; // gray-500
	}
}

/** Get color for service tier */
export function getTierColor(tier: ServiceTier): string {
	switch (tier) {
		case 'critical':
			return '#8b5cf6'; // violet-500
		case 'core':
			return '#3b82f6'; // blue-500
		case 'edge':
			return '#06b6d4'; // cyan-500
		case 'replica':
			return '#6b7280'; // gray-500
		default:
			return '#6b7280';
	}
}

// ============================================================================
// Arena Zone Mapping
// ============================================================================

/** Map a service to its arena zone position */
export function getServiceArenaPosition(service: InfrastructureService): { x: number; y: number } {
	return service.position;
}

/** Get all services in a specific arena zone */
export function getServicesInZone(services: InfrastructureService[], zoneId: string): InfrastructureService[] {
	return services.filter((s) => s.zoneId === zoneId);
}

/** Map arena scenario index to infrastructure scenario */
export function arenaScenarioToInfrastructure(scenarioIndex: number): string {
	const mapping: Record<number, string> = {
		0: 'healthy', // Gate crowding - normal state
		1: 'healthy', // VIP arrival - normal state
		2: 'edge-degradation', // Halftime - high edge load
		3: 'replica-failover', // Weather - partial failures
		4: 'meltdown', // Emergency - cascading failure
		5: 'database-failure', // Game end - database stress
		6: 'healthy' // Overnight - maintenance/healthy
	};
	return mapping[scenarioIndex] ?? 'healthy';
}
