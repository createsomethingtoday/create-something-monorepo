/**
 * NoopInsight — silent insight adapter
 *
 * Does nothing. Use as the default when no observability is configured.
 * Zero overhead — the emit method is a no-op.
 */

import type { InsightEmitter, InsightEvent } from '../insight.js';

export class NoopInsight implements InsightEmitter {
  emit(_event: InsightEvent): void {
    // Intentionally empty — the tool recedes
  }
}
