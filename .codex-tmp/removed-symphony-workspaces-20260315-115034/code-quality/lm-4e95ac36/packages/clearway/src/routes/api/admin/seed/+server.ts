/**
 * Demo Data Seeding API
 *
 * Generates realistic booking data to make the demo feel lived-in.
 * Heideggerian: The demo data recedes; only the authentic experience remains.
 *
 * POST /api/admin/seed - Generate demo data
 *   ?members=20    - Number of members to create (default: 20)
 *   ?days=14       - Days of booking history (default: 14)
 *   ?future=7      - Days of future bookings (default: 7)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId } from '$lib/types';

const FACILITY_ID = 'fac_thestack';

// Court IDs from The Stack setup
const COURTS = [
	'crt_grandview1',
	'crt_grandview2',
	'crt_oakridge1',
	'crt_oakridge2',
	'crt_riverview1',
	'crt_riverview2',
	'crt_pinecrest1',
	'crt_pinecrest2'
];

// Realistic member names
const FIRST_NAMES = [
	'Sarah',
	'Michael',
	'Jennifer',
	'David',
	'Emily',
	'Robert',
	'Amanda',
	'James',
	'Ashley',
	'Christopher',
	'Jessica',
	'Matthew',
	'Samantha',
	'Daniel',
	'Lauren',
	'Andrew',
	'Megan',
	'Joshua',
	'Brittany',
	'Ryan'
];

const LAST_NAMES = [
	'Chen',
	'Patel',
	'Rodriguez',
	'Thompson',
	'Williams',
	'Johnson',
	'Kim',
	'Garcia',
	'Martinez',
	'Anderson',
	'Taylor',
	'Wilson',
	'Brown',
	'Lee',
	'Davis',
	'Miller',
	'Jackson',
	'White',
	'Harris',
	'Clark'
];

// Booking patterns - probability weights by hour (0-23)
// Higher = more likely to book
const WEEKDAY_WEIGHTS = [
	0, 0, 0, 0, 0, 0, // 0-5am: closed
	0.2, 0.4, 0.5, 0.3, // 6-9am: early birds
	0.2, 0.3, 0.4, 0.3, // 10am-1pm: lunch crowd
	0.2, 0.3, 0.5, // 2-4pm: afternoon
	0.9, 1.0, 0.9, 0.7, // 5-8pm: PEAK
	0.4, 0, 0 // 9-11pm: winding down
];

const WEEKEND_WEIGHTS = [
	0, 0, 0, 0, 0, 0, // 0-5am: closed
	0.3, 0.6, 0.8, 0.9, // 6-9am: morning rush
	0.9, 0.8, 0.7, 0.6, // 10am-1pm: midday
	0.5, 0.6, 0.7, // 2-4pm: afternoon
	0.8, 0.7, 0.5, 0.3, // 5-8pm: evening
	0.2, 0, 0 // 9-11pm: winding down
];

export const POST: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// Parse parameters
	const memberCount = parseInt(url.searchParams.get('members') || '20');
	const historyDays = parseInt(url.searchParams.get('days') || '14');
	const futureDays = parseInt(url.searchParams.get('future') || '7');

	const results = {
		membersCreated: 0,
		reservationsCreated: 0,
		cancellations: 0,
		noShows: 0
	};

	try {
		// Step 1: Create demo members
		const members = await createMembers(db, memberCount);
		results.membersCreated = members.length;

		// Step 2: Generate historical bookings (past)
		const pastBookings = await generateBookings(db, members, -historyDays, 0, true);
		results.reservationsCreated += pastBookings.total;
		results.cancellations += pastBookings.cancellations;
		results.noShows += pastBookings.noShows;

		// Step 3: Generate future bookings
		const futureBookings = await generateBookings(db, members, 0, futureDays, false);
		results.reservationsCreated += futureBookings.total;

		return json({
			success: true,
			message: 'Demo data generated successfully',
			results
		});
	} catch (err) {
		console.error('Seeding error:', err);
		throw error(500, `Seeding failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

interface Member {
	id: string;
	email: string;
	name: string;
}

async function createMembers(db: D1Database, count: number): Promise<Member[]> {
	const members: Member[] = [];

	for (let i = 0; i < count; i++) {
		const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
		const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
		const name = `${firstName} ${lastName}`;
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@example.com`;

		const id = generateId('mbr');

		// Varied membership types
		const membershipTypes = ['guest', 'member', 'member', 'member', 'premium', 'unlimited'];
		const membershipType = membershipTypes[Math.floor(Math.random() * membershipTypes.length)];

		const phone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;

		try {
			await db
				.prepare(
					`
				INSERT OR IGNORE INTO members (
					id, facility_id, email, name, phone, membership_type, status, created_at
				) VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'))
			`
				)
				.bind(id, FACILITY_ID, email, name, phone, membershipType)
				.run();

			members.push({ id, email, name });
		} catch {
			// Ignore duplicates
		}
	}

	return members;
}

async function generateBookings(
	db: D1Database,
	members: Member[],
	startDays: number,
	endDays: number,
	canFinalize: boolean
): Promise<{ total: number; cancellations: number; noShows: number }> {
	let total = 0;
	let cancellations = 0;
	let noShows = 0;

	const now = new Date();
	const startDate = new Date(now);
	startDate.setDate(startDate.getDate() + startDays);

	const endDate = new Date(now);
	endDate.setDate(endDate.getDate() + endDays);

	// Iterate each day
	for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
		const dayOfWeek = d.getDay(); // 0=Sunday, 6=Saturday
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
		const weights = isWeekend ? WEEKEND_WEIGHTS : WEEKDAY_WEIGHTS;

		// For each hour (6am to 9pm)
		for (let hour = 6; hour < 22; hour++) {
			const weight = weights[hour];
			if (weight === 0) continue;

			// For each court, decide if there's a booking
			for (const courtId of COURTS) {
				// Use weight as probability
				if (Math.random() > weight * 0.7) continue; // Scale down a bit

				// Pick a random member
				const member = members[Math.floor(Math.random() * members.length)];

				// Create the booking
				const startTime = new Date(d);
				startTime.setHours(hour, 0, 0, 0);

				const endTime = new Date(startTime);
				endTime.setHours(hour + 1); // 1 hour slots

				const isPeak = !isWeekend && hour >= 17 && hour < 20;
				const rateCents = isPeak ? 5000 : 4000;

				// Determine status
				let status = 'confirmed';
				let cancelledAt = null;
				let completedAt = null;

				if (canFinalize && startTime < now) {
					// Past booking - finalize it
					const roll = Math.random();
					if (roll < 0.05) {
						// 5% cancellation rate
						status = 'cancelled';
						cancelledAt = new Date(startTime);
						cancelledAt.setHours(cancelledAt.getHours() - Math.floor(Math.random() * 24));
						cancellations++;
					} else if (roll < 0.08) {
						// 3% no-show rate
						status = 'no_show';
						noShows++;
					} else {
						status = 'completed';
						completedAt = new Date(endTime);
					}
				}

				const id = generateId('rsv');
				const bookingSources = ['web', 'web', 'web', 'sms', 'api'];
				const bookingSource = bookingSources[Math.floor(Math.random() * bookingSources.length)];

				try {
					await db
						.prepare(
							`
						INSERT OR IGNORE INTO reservations (
							id, facility_id, court_id, member_id,
							start_time, end_time, duration_minutes,
							status, booking_type, rate_cents, payment_status,
							booking_source, cancelled_at, completed_at, created_at
						) VALUES (?, ?, ?, ?, ?, ?, 60, ?, 'standard', ?, 'paid', ?, ?, ?, datetime('now'))
					`
						)
						.bind(
							id,
							FACILITY_ID,
							courtId,
							member.id,
							startTime.toISOString(),
							endTime.toISOString(),
							status,
							rateCents,
							bookingSource,
							cancelledAt?.toISOString() || null,
							completedAt?.toISOString() || null
						)
						.run();

					total++;

					// Update member's booking count
					await db
						.prepare('UPDATE members SET total_bookings = total_bookings + 1 WHERE id = ?')
						.bind(member.id)
						.run();
				} catch {
					// Ignore conflicts (duplicate start_time for court)
				}
			}
		}
	}

	return { total, cancellations, noShows };
}
