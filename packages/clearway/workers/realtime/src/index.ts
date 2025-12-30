/**
 * CourtStateManager - Durable Object
 *
 * One instance per facility for:
 * - Single-threaded booking (no race conditions)
 * - WebSocket hub for real-time availability updates
 * - In-memory availability for current day
 * - 15-second hold on pending bookings
 *
 * The infrastructure disappears; courts get booked.
 */

import type { CourtType } from '$lib/types';

// ============================================================================
// Types
// ============================================================================

interface SlotKey {
	courtId: string;
	startTime: string; // ISO 8601
}

interface SlotState {
	status: 'available' | 'pending' | 'reserved' | 'maintenance';
	reservationId?: string;
	holdExpiry?: number; // timestamp
	memberId?: string;
}

interface ReservationAttempt {
	courtId: string;
	startTime: string;
	endTime: string;
	memberId: string;
	durationMinutes: number;
}

interface BroadcastMessage {
	type: 'slot_update' | 'slot_reserved' | 'slot_released' | 'slot_pending';
	courtId: string;
	startTime: string;
	status: SlotState['status'];
	reservationId?: string;
}

// ============================================================================
// Durable Object
// ============================================================================

export class CourtStateManager {
	private state: DurableObjectState;
	private env: Env;
	private availability: Map<string, SlotState>;
	private websockets: Set<WebSocket>;
	private facilityId: string;
	private holdCleanupTimer?: number;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		this.availability = new Map();
		this.websockets = new Set();
		this.facilityId = ''; // Set on first request

		// Schedule periodic cleanup of expired holds
		this.scheduleHoldCleanup();
	}

	/**
	 * Handle incoming requests
	 */
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Extract facility ID from path or query
		const facilityId = url.searchParams.get('facilityId') || url.pathname.split('/')[2];
		if (facilityId && !this.facilityId) {
			this.facilityId = facilityId;
		}

		try {
			switch (url.pathname) {
				case '/websocket':
					return this.handleWebSocket(request);

				case '/attempt':
					return this.handleReservationAttempt(request);

				case '/confirm':
					return this.handleConfirmReservation(request);

				case '/release':
					return this.handleReleaseHold(request);

				case '/cancel':
					return this.handleCancellation(request);

				case '/availability':
					return this.handleGetAvailability(request);

				case '/sync':
					return this.handleSyncFromD1(request);

				default:
					return new Response('Not Found', { status: 404 });
			}
		} catch (error) {
			console.error('CourtStateManager error:', error);
			return new Response(
				JSON.stringify({
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	}

	/**
	 * Handle WebSocket upgrade for real-time updates
	 */
	private async handleWebSocket(request: Request): Promise<Response> {
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		// Accept the WebSocket connection
		server.accept();

		// Add to connected clients
		this.websockets.add(server);

		// Send current availability state
		const availabilitySnapshot = Array.from(this.availability.entries()).map(([key, state]) => {
			const [courtId, startTime] = key.split(':');
			return { courtId, startTime, ...state };
		});

		server.send(
			JSON.stringify({
				type: 'initial_state',
				availability: availabilitySnapshot
			})
		);

		// Handle disconnection
		server.addEventListener('close', () => {
			this.websockets.delete(server);
		});

		server.addEventListener('error', () => {
			this.websockets.delete(server);
		});

		return new Response(null, {
			status: 101,
			webSocket: client
		});
	}

	/**
	 * Attempt to reserve a slot
	 * Single-threaded: guaranteed no double-booking
	 */
	private async handleReservationAttempt(request: Request): Promise<Response> {
		const attempt: ReservationAttempt = await request.json();
		const slotKey = this.makeSlotKey(attempt.courtId, attempt.startTime);
		const currentState = this.availability.get(slotKey);

		// Check if slot is available
		if (currentState && currentState.status !== 'available') {
			// If pending hold has expired, we can take it
			if (
				currentState.status === 'pending' &&
				currentState.holdExpiry &&
				Date.now() > currentState.holdExpiry
			) {
				// Hold expired, we can claim it
				this.releaseHold(slotKey);
			} else {
				return this.json({
					success: false,
					error: `Slot ${currentState.status}`,
					currentStatus: currentState.status
				});
			}
		}

		// Place 15-second hold
		const holdExpiry = Date.now() + 15_000;
		const pendingState: SlotState = {
			status: 'pending',
			memberId: attempt.memberId,
			holdExpiry
		};

		this.availability.set(slotKey, pendingState);

		// Broadcast update
		this.broadcast({
			type: 'slot_pending',
			courtId: attempt.courtId,
			startTime: attempt.startTime,
			status: 'pending'
		});

		return this.json({
			success: true,
			holdExpiry,
			message: 'Slot held for 15 seconds. Complete payment to confirm.'
		});
	}

	/**
	 * Confirm a reservation (after payment success)
	 */
	private async handleConfirmReservation(request: Request): Promise<Response> {
		const { courtId, startTime, reservationId } = await request.json();
		const slotKey = this.makeSlotKey(courtId, startTime);
		const currentState = this.availability.get(slotKey);

		// Verify it's in pending state
		if (!currentState || currentState.status !== 'pending') {
			return this.json({
				success: false,
				error: 'Slot not held or hold expired'
			});
		}

		// Confirm reservation
		const reservedState: SlotState = {
			status: 'reserved',
			reservationId
		};

		this.availability.set(slotKey, reservedState);

		// Broadcast confirmation
		this.broadcast({
			type: 'slot_reserved',
			courtId,
			startTime,
			status: 'reserved',
			reservationId
		});

		return this.json({ success: true, reservationId });
	}

	/**
	 * Release a pending hold (payment failed, timeout, or cancel)
	 */
	private async handleReleaseHold(request: Request): Promise<Response> {
		const { courtId, startTime } = await request.json();
		const slotKey = this.makeSlotKey(courtId, startTime);

		this.releaseHold(slotKey);

		return this.json({ success: true });
	}

	/**
	 * Handle cancellation - make slot available again
	 */
	private async handleCancellation(request: Request): Promise<Response> {
		const { courtId, startTime, reservationId } = await request.json();
		const slotKey = this.makeSlotKey(courtId, startTime);

		// Mark as available
		this.availability.delete(slotKey);

		// Broadcast availability
		this.broadcast({
			type: 'slot_released',
			courtId,
			startTime,
			status: 'available'
		});

		// Notify waitlist (through main app via D1)
		// The cancellation handler in the API will call waitlist.processSlotOpening()

		return this.json({ success: true });
	}

	/**
	 * Get current availability state
	 */
	private async handleGetAvailability(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const courtId = url.searchParams.get('courtId');
		const date = url.searchParams.get('date'); // YYYY-MM-DD

		let slots: Array<{ courtId: string; startTime: string; state: SlotState }> = [];

		if (courtId) {
			// Filter by court
			for (const [key, state] of this.availability.entries()) {
				const [cid, startTime] = key.split(':');
				if (cid === courtId) {
					if (!date || startTime.startsWith(date)) {
						slots.push({ courtId: cid, startTime, state });
					}
				}
			}
		} else {
			// All slots
			for (const [key, state] of this.availability.entries()) {
				const [cid, startTime] = key.split(':');
				if (!date || startTime.startsWith(date)) {
					slots.push({ courtId: cid, startTime, state });
				}
			}
		}

		return this.json({ slots });
	}

	/**
	 * Sync availability from D1 database
	 * Called periodically or on-demand to refresh state
	 */
	private async handleSyncFromD1(request: Request): Promise<Response> {
		const { date } = await request.json(); // YYYY-MM-DD

		// Query D1 for all reservations on this date
		const reservations = await this.env.DB.prepare(
			`
      SELECT court_id, start_time, end_time, id, status
      FROM reservations
      WHERE facility_id = ?
        AND date(start_time) = ?
        AND status IN ('pending', 'confirmed', 'in_progress')
      ORDER BY start_time
    `
		)
			.bind(this.facilityId, date)
			.all<{
				court_id: string;
				start_time: string;
				end_time: string;
				id: string;
				status: string;
			}>();

		// Clear existing state for this date
		for (const key of this.availability.keys()) {
			if (key.includes(date)) {
				this.availability.delete(key);
			}
		}

		// Rebuild from D1
		if (reservations.results) {
			for (const res of reservations.results) {
				const slotKey = this.makeSlotKey(res.court_id, res.start_time);
				const state: SlotState = {
					status: res.status === 'confirmed' ? 'reserved' : 'pending',
					reservationId: res.id
				};
				this.availability.set(slotKey, state);
			}
		}

		// Also check for maintenance blocks
		const blocks = await this.env.DB.prepare(
			`
      SELECT court_id, start_time, end_time
      FROM availability_blocks
      WHERE facility_id = ?
        AND date(start_time) = ?
        AND block_type IN ('blackout', 'maintenance')
    `
		)
			.bind(this.facilityId, date)
			.all<{ court_id: string | null; start_time: string; end_time: string }>();

		if (blocks.results) {
			for (const block of blocks.results) {
				// If court_id is null, it applies to all courts - we'd need to query courts
				if (block.court_id) {
					const slotKey = this.makeSlotKey(block.court_id, block.start_time);
					this.availability.set(slotKey, { status: 'maintenance' });
				}
			}
		}

		return this.json({
			success: true,
			synced: this.availability.size,
			date
		});
	}

	// ========================================================================
	// Helper Methods
	// ========================================================================

	private makeSlotKey(courtId: string, startTime: string): string {
		return `${courtId}:${startTime}`;
	}

	private releaseHold(slotKey: string): void {
		const [courtId, startTime] = slotKey.split(':');
		this.availability.delete(slotKey);

		this.broadcast({
			type: 'slot_released',
			courtId,
			startTime,
			status: 'available'
		});
	}

	private broadcast(message: BroadcastMessage): void {
		const data = JSON.stringify(message);
		for (const ws of this.websockets) {
			try {
				ws.send(data);
			} catch (error) {
				// Client disconnected, remove it
				this.websockets.delete(ws);
			}
		}
	}

	private json(data: unknown): Response {
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	/**
	 * Schedule periodic cleanup of expired holds
	 */
	private scheduleHoldCleanup(): void {
		// Run every 5 seconds
		const cleanup = () => {
			const now = Date.now();
			let cleaned = 0;

			for (const [key, state] of this.availability.entries()) {
				if (state.status === 'pending' && state.holdExpiry && now > state.holdExpiry) {
					this.releaseHold(key);
					cleaned++;
				}
			}

			if (cleaned > 0) {
				console.log(`Cleaned ${cleaned} expired holds`);
			}

			// Schedule next cleanup
			this.holdCleanupTimer = setTimeout(cleanup, 5000) as unknown as number;
		};

		cleanup();
	}
}

// ============================================================================
// Worker Export
// ============================================================================

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Route to appropriate Durable Object instance based on facility
		const url = new URL(request.url);
		const facilityId = url.searchParams.get('facilityId') || url.pathname.split('/')[2];

		if (!facilityId) {
			return new Response(
				JSON.stringify({ error: 'facilityId required' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Get Durable Object instance for this facility
		const id = env.COURT_STATE.idFromName(facilityId);
		const stub = env.COURT_STATE.get(id);

		// Forward request to DO
		return stub.fetch(request);
	}
} satisfies ExportedHandler<Env>;

// ============================================================================
// Env Interface
// ============================================================================

interface Env {
	COURT_STATE: DurableObjectNamespace;
	DB: D1Database;
	NOTIFICATION_QUEUE: Queue;
}
