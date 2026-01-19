/**
 * Living Arena - Particle System
 * 
 * Manages crowd simulation particles that visualize
 * people moving through the arena during different scenarios.
 */

import type { Particle, CrowdFlow, ScenarioEffect } from './arenaTypes';

let particleIdCounter = 0;

// Particle count by crowd flow type
const countByFlow: Record<CrowdFlow, number> = {
	entering: 35,
	vip: 12,
	dispersing: 30,
	sheltering: 20,
	evacuating: 45,
	exiting: 50,
	empty: 5
};

/**
 * Creates a particle based on the current scenario's crowd flow pattern
 */
export function createParticleForScenario(effect: ScenarioEffect): Particle | null {
	particleIdCounter++;
	const id = particleIdCounter;

	if (effect.crowdFlow === 'entering') {
		// Gate crowding - people flowing from parking/roads toward north entrance
		const fromParking = Math.random() > 0.5;
		let startX: number, startY: number;
		if (fromParking) {
			startX = Math.random() > 0.5 ? -50 + Math.random() * 100 : 780 + Math.random() * 100;
			startY = -50 + Math.random() * 80;
		} else {
			startX = 380 + Math.random() * 40;
			startY = -100 + Math.random() * 50;
		}
		return {
			id,
			x: startX,
			y: startY,
			targetX: 400 + (Math.random() - 0.5) * 100,
			targetY: 60 + Math.random() * 100,
			speed: 0.6 + Math.random() * 0.4,
			size: 3 + Math.random() * 2
		};
	} else if (effect.crowdFlow === 'vip') {
		// VIP arrival - vehicles and people at south entrance
		const isVehicle = Math.random() > 0.7;
		if (isVehicle) {
			return {
				id,
				x: 400 + (Math.random() - 0.5) * 60,
				y: 720,
				targetX: 400 + (Math.random() - 0.5) * 40,
				targetY: 680,
				speed: 0.8,
				size: 6
			};
		}
		return {
			id,
			x: 400 + (Math.random() - 0.5) * 80,
			y: 650,
			targetX: 400 + (Math.random() - 0.5) * 30,
			targetY: 560,
			speed: 0.4 + Math.random() * 0.3,
			size: 3 + Math.random() * 2
		};
	} else if (effect.crowdFlow === 'dispersing') {
		// Halftime - people flowing from seats to concourse
		const angle = Math.random() * Math.PI * 2;
		const innerRadius = 120 + Math.random() * 80;
		const outerRadius = 280 + Math.random() * 60;
		return {
			id,
			x: 400 + Math.cos(angle) * innerRadius,
			y: 300 + Math.sin(angle) * (innerRadius * 0.7),
			targetX: 400 + Math.cos(angle) * outerRadius,
			targetY: 300 + Math.sin(angle) * (outerRadius * 0.7),
			speed: 0.3 + Math.random() * 0.4,
			size: 3 + Math.random() * 2
		};
	} else if (effect.crowdFlow === 'sheltering') {
		// Weather - people moving to covered areas
		return {
			id,
			x: 100 + Math.random() * 600,
			y: -80 + Math.random() * 60,
			targetX: Math.random() > 0.5 ? -50 + Math.random() * 150 : 700 + Math.random() * 150,
			targetY: -80 + Math.random() * 100,
			speed: 0.7 + Math.random() * 0.5,
			size: 3 + Math.random() * 2
		};
	} else if (effect.crowdFlow === 'evacuating') {
		// Emergency - rapid evacuation to south
		const startX = 500 + (Math.random() - 0.5) * 200;
		const startY = 300 + (Math.random() - 0.5) * 150;
		return {
			id,
			x: startX,
			y: startY,
			targetX: 350 + Math.random() * 100,
			targetY: 680 + Math.random() * 80,
			speed: 1.2 + Math.random() * 0.8,
			size: 3 + Math.random() * 2
		};
	} else if (effect.crowdFlow === 'exiting') {
		// Game end - mass exit to all parking
		const exit = Math.floor(Math.random() * 4);
		const targets = [
			{ x: 400, y: -100 }, // north
			{ x: 400, y: 720 }, // south
			{ x: -100, y: 300 }, // west
			{ x: 900, y: 300 } // east
		];
		return {
			id,
			x: 400 + (Math.random() - 0.5) * 300,
			y: 300 + (Math.random() - 0.5) * 200,
			targetX: targets[exit].x + (Math.random() - 0.5) * 100,
			targetY: targets[exit].y + (Math.random() - 0.5) * 50,
			speed: 0.5 + Math.random() * 0.4,
			size: 3 + Math.random() * 2
		};
	} else {
		// Overnight/empty - just a few maintenance workers
		return {
			id,
			x: 200 + Math.random() * 400,
			y: 200 + Math.random() * 200,
			targetX: 200 + Math.random() * 400,
			targetY: 200 + Math.random() * 200,
			speed: 0.2,
			size: 4
		};
	}
}

/**
 * Generates a new set of particles based on the current scenario
 */
export function generateParticles(effect: ScenarioEffect): Particle[] {
	const newParticles: Particle[] = [];
	const count = countByFlow[effect.crowdFlow] || 25;

	for (let i = 0; i < count; i++) {
		const particle = createParticleForScenario(effect);
		if (particle) newParticles.push(particle);
	}

	return newParticles;
}

/**
 * Updates particle positions, moving them toward their targets
 * Returns a new array with updated positions
 */
export function updateParticles(particles: Particle[], effect: ScenarioEffect): Particle[] {
	return particles.map((p) => {
		const dx = p.targetX - p.x;
		const dy = p.targetY - p.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < 5) {
			// Particle reached destination, create new one
			const newParticle = createParticleForScenario(effect);
			return newParticle || p;
		}

		// Move toward target
		const moveX = (dx / dist) * p.speed * 2;
		const moveY = (dy / dist) * p.speed * 2;

		return {
			...p,
			x: p.x + moveX,
			y: p.y + moveY
		};
	});
}

/**
 * Resets the particle ID counter (useful for testing)
 */
export function resetParticleCounter(): void {
	particleIdCounter = 0;
}
