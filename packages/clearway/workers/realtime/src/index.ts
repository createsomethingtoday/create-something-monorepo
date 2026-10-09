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

// Keep the reconstructible availability cache below the DO per-value storage limit.
// This is a technical cache capacity, not a billing allowance.
const MAX_CACHE_BYTES = 96 * 1024;
const MAX_CACHE_SLOTS = 512;

// ============================================================================
// Durable Object
// ============================================================================

export class CourtStateManager {
	private state: DurableObjectState;
	private env: Env;
	private availability: Map<string, SlotState>;

	private facilityId: string;


	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		this.availability = new Map();

		this.facilityId = ''; // Set on first request

		state.blockConcurrencyWhile(async () => {
			this.facilityId = await state.storage.get<string>('facilityId') || '';
			this.availability = new Map(await state.storage.get<Array<[string, SlotState]>>('availability') || []);
		});
	}

	/**
	 * Handle incoming requests
	 */
	async fetch(request: Request): Promise<Response> {
		// Serialize admission and state changes across body/D1/storage awaits.
		return this.state.blockConcurrencyWhile(() => this.handleRequest(request));
	}

	private async handleRequest(request: Request): Promise<Response> {
		const url = new URL(request.url);

		const facilityId = url.searchParams.get('facilityId');
		if (!facilityId || this.env.COURT_STATE.idFromName(facilityId).toString() !== this.state.id.toString()) {
			return Response.json({ error: 'Valid facilityId required for this object' }, { status: 400 });
		}
		if (this.facilityId && facilityId !== this.facilityId) {
			return Response.json({ error: 'Facility mismatch' }, { status: 409 });
		}
		if (!this.facilityId) {
			if (!await knownFacility(this.env, facilityId)) {
				return Response.json({ error: 'Unknown facility' }, { status: 404 });
			}
			this.facilityId = facilityId;
			await this.state.storage.put('facilityId', facilityId);
		}
		this.prunePastCache();
		this.expireHolds();

		try {
			if (['/attempt', '/confirm', '/release', '/cancel'].includes(url.pathname)) {
				const body = await request.clone().json<{ courtId?: unknown; startTime?: unknown; memberId?: unknown; reservationId?: unknown }>();
				if (typeof body.courtId !== 'string' || typeof body.startTime !== 'string' || body.courtId.length > 128 || body.startTime.length > 64 || !Number.isFinite(Date.parse(body.startTime))) {
					return Response.json({ error: 'Valid courtId and startTime required' }, { status: 400 });
				}
				if (url.pathname === '/attempt' && (typeof body.memberId !== 'string' || body.memberId.length > 128) ||
					url.pathname === '/confirm' && (typeof body.reservationId !== 'string' || body.reservationId.length > 128)) {
					return Response.json({ error: 'Valid member or reservation identity required' }, { status: 400 });
				}
				if (!await this.env.DB.prepare('SELECT id FROM courts WHERE id = ? AND facility_id = ?').bind(body.courtId, facilityId).first()) {
					return Response.json({ error: 'Court does not belong to facility' }, { status: 404 });
				}
			}
			switch (url.pathname) {
				case '/websocket':
					return await this.handleWebSocket(request);

				case '/attempt':
					return await this.handleReservationAttempt(request);

				case '/confirm':
					return await this.handleConfirmReservation(request);

				case '/release':
					return await this.handleReleaseHold(request);

				case '/cancel':
					return await this.handleCancellation(request);

				case '/availability':
					return await this.handleGetAvailability(request);

				case '/sync':
					return await this.handleSyncFromD1(request);

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
		} finally {
			await this.persistAndSchedule();
		}
	}

	/**
	 * Handle WebSocket upgrade for real-time updates
	 */
	private async handleWebSocket(request: Request): Promise<Response> {
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		// Accept the WebSocket connection
		this.state.acceptWebSocket(server);

		// Add to connected clients


		// Send current availability state
		const availabilitySnapshot = Array.from(this.availability.entries()).map(([key, state]) => {
			const [courtId, startTime] = this.splitSlotKey(key);
			return { courtId, startTime, ...state };
		});

		server.send(
			JSON.stringify({
				type: 'initial_state',
				availability: availabilitySnapshot
			})
		);


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

		const next = new Map(this.availability).set(slotKey, pendingState);
		if (!this.withinCacheCapacity(next)) return Response.json({ success: false, error: 'Availability capacity reached; retry after holds expire' }, { status: 503 });
		this.availability = next;

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
		const { courtId, startTime, reservationId } = await request.json<{ courtId: string; startTime: string; reservationId: string }>();
		const slotKey = this.makeSlotKey(courtId, startTime);
		const currentState = this.availability.get(slotKey);

		// Verify it's in pending state
		if (!currentState || currentState.status !== 'pending' || !currentState.holdExpiry || currentState.holdExpiry <= Date.now()) {
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

		const next = new Map(this.availability).set(slotKey, reservedState);
		if (!this.withinCacheCapacity(next)) return Response.json({ success: false, error: 'Availability capacity reached' }, { status: 503 });
		this.availability = next;

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
		const { courtId, startTime } = await request.json<{ courtId: string; startTime: string }>();
		const slotKey = this.makeSlotKey(courtId, startTime);

		this.releaseHold(slotKey);

		return this.json({ success: true });
	}

	/**
	 * Handle cancellation - make slot available again
	 */
	private async handleCancellation(request: Request): Promise<Response> {
		const { courtId, startTime, reservationId } = await request.json<{ courtId: string; startTime: string; reservationId: string }>();
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
				const [cid, startTime] = this.splitSlotKey(key);
				if (cid === courtId) {
					if (!date || startTime.startsWith(date)) {
						slots.push({ courtId: cid, startTime, state });
					}
				}
			}
		} else {
			// All slots
			for (const [key, state] of this.availability.entries()) {
				const [cid, startTime] = this.splitSlotKey(key);
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
		const { date } = await request.json<{ date: string }>(); // YYYY-MM-DD

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

		const next = new Map(this.availability);

		// Clear existing state for this date
		for (const key of next.keys()) {
			if (key.includes(date)) {
				next.delete(key);
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
				next.set(slotKey, state);
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
					next.set(slotKey, { status: 'maintenance' });
				}
			}
		}

		if (!this.withinCacheCapacity(next)) return Response.json({ success: false, error: 'Availability capacity reached' }, { status: 503 });
		this.availability = next;

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
		const [courtId, startTime] = this.splitSlotKey(slotKey);
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
		for (const ws of this.state.getWebSockets()) {
			try {
				ws.send(data);
			} catch (error) {
				// Client disconnected, remove it
				try { ws.close(1011, 'Send failed'); } catch { /* Already closed. */ }
			}
		}
	}

	private json(data: unknown): Response {
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	private withinCacheCapacity(slots: Map<string, SlotState>): boolean {
		return slots.size <= MAX_CACHE_SLOTS && new TextEncoder().encode(JSON.stringify([...slots])).byteLength <= MAX_CACHE_BYTES;
	}

	private prunePastCache(): void {
		// Slots older than a full day are outside the documented current-day cache.
		// D1 remains the source of truth for historical reservation records.
		for (const [key, slot] of this.availability) {
			if (!slot.holdExpiry && Date.parse(this.splitSlotKey(key)[1]) < Date.now() - 86_400_000) this.availability.delete(key);
		}
	}

	private splitSlotKey(key: string): [string, string] {
		const separator = key.indexOf(':');
		return [key.slice(0, separator), key.slice(separator + 1)];
	}

	private expireHolds(): void {
		for (const [key, slot] of this.availability) {
			if (slot.status === 'pending' && slot.holdExpiry !== undefined && slot.holdExpiry <= Date.now()) {
				this.releaseHold(key);
			}
		}
	}

	private async persistAndSchedule(): Promise<void> {
		const expiries = [...this.availability.values()]
			.filter(slot => slot.status === 'pending' && Number.isFinite(slot.holdExpiry))
			.map(slot => slot.holdExpiry!);
		await this.state.storage.transaction(async tx => {
			await tx.put('availability', [...this.availability]);
			if (expiries.length) await tx.setAlarm(Math.min(...expiries));
			else await tx.deleteAlarm();
		});
	}

	async alarm(): Promise<void> {
		await this.state.blockConcurrencyWhile(async () => {
			this.expireHolds();
			await this.persistAndSchedule();
		});
	}

	webSocketMessage(): void {
		// This is a server-to-client availability stream; no periodic keepalive work.
	}

	webSocketClose(ws: WebSocket, code: number, reason: string): void {
		try { ws.close(code === 1005 ? 1000 : code, reason); } catch { /* Already closed. */ }
	}

	webSocketError(ws: WebSocket): void {
		try { ws.close(1011, 'Socket error'); } catch { /* Already closed. */ }
	}

}

// ============================================================================
// Worker Export
// ============================================================================

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Route to appropriate Durable Object instance based on facility
		const url = new URL(request.url);
		const facilityId = url.searchParams.get('facilityId');

		if (!facilityId) {
			return new Response(
				JSON.stringify({ error: 'facilityId required' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		if (!await knownFacility(env, facilityId)) {
			return Response.json({ error: 'Unknown facility' }, { status: 404 });
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

async function knownFacility(env: Env, facilityId: string): Promise<boolean> {
	if (facilityId.length > 128) return false;
	return !!await env.DB.prepare('SELECT id FROM facilities WHERE id = ?').bind(facilityId).first();
}
