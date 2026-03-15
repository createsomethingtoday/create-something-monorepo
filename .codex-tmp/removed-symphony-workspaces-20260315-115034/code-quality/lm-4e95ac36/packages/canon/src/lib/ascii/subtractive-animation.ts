/**
 * Subtractive Animation: The Triad Revealed
 *
 * Demonstrates "creation is removing what obscures"
 * through ASCII art frames. Each frame removes noise
 * to reveal the essential form.
 *
 * Inspired by Gabriel Santos (Stone Story RPG):
 * "I start with the full pyramid and I erase it layer by layer."
 *
 * Usage:
 *   import { frames, getFrame } from './subtractive-animation';
 *   // Animate by iterating through frames
 *   // Or display final frame as static art
 */

// Frame 0: Maximum noise - the obscured state
const frame0 = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

// Frame 1: First removal - structure emerges
const frame1 = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
║ ▒▒▒▒▒▒▒▒   DRY   ▒▒▒▒▒▒▒▒▒   Rams  ▒▒▒▒▒▒▒▒▒  Heidegger ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

// Frame 2: More removal - columns emerge
const frame2 = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░   DRY   ░░░░░░░░░   Rams  ░░░░░░░░░  Heidegger ░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░  ─────  ░░░░░░░░░  ─────  ░░░░░░░░░  ───────── ░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░  Unify  ░░░░░░░░░  Remove ░░░░░░░░░  Reconnect ░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

// Frame 3: Significant removal - questions emerge
const frame3 = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                                                                               ║
║            DRY              Rams            Heidegger                         ║
║           ─────            ─────           ─────────                          ║
║           Unify            Remove          Reconnect                          ║
║                                                                               ║
║   "Have I built      "Does this earn    "Does this serve                      ║
║    this before?"      its existence?"    the whole?"                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

// Frame 4: Near-final - essence visible
const frame4 = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║      DRY              Rams              Heidegger                             ║
║     ─────            ─────             ─────────                              ║
║     Unify            Remove            Reconnect                              ║
║                                                                               ║
║   "Have I built   "Does this earn    "Does this serve                         ║
║    this before?"   its existence?"    the whole?"                             ║
║                                                                               ║
║                  ┌─────────────────────┐                                      ║
║                  │  Weniger, aber      │                                      ║
║                  │      besser         │                                      ║
║                  └─────────────────────┘                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

// Frame 5: Final - the essential form revealed
const frame5 = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║   SUBTRACTIVE TRIAD                                                           ║
║                                                                               ║
║   DRY              Rams              Heidegger                                ║
║   ─────            ─────             ─────────                                ║
║   Unify            Remove            Reconnect                                ║
║                                                                               ║
║   "Have I built    "Does this earn   "Does this serve                         ║
║    this before?"    its existence?"   the whole?"                             ║
║                                                                               ║
║                                                                               ║
║              "Creation is removing what obscures."                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

/**
 * All frames in order (0 = most obscured, 5 = revealed)
 */
export const frames = [frame0, frame1, frame2, frame3, frame4, frame5];

/**
 * Get a specific frame by index
 */
export function getFrame(index: number): string {
	return frames[Math.max(0, Math.min(index, frames.length - 1))];
}

/**
 * Get the final revealed frame (for static display)
 */
export function getFinalFrame(): string {
	return frame5;
}

/**
 * Animation metadata
 */
export const animationMeta = {
	name: 'Subtractive Triad Revealed',
	frameCount: 6,
	concept: 'Creation through removal',
	technique: 'Subtractive animation',
	source: 'Gabriel Santos / Stone Story RPG',
	philosophy: 'Start complete, erase to reveal essence'
};
