/**
 * The Stack Pricing Data
 *
 * Single source of truth for all pricing information.
 * Update values here and they propagate to:
 * - Homepage (FoundingMembers section)
 * - Pricing page
 * - FAQs
 */

// =============================================================================
// PRICING
// =============================================================================

export const PRICING = {
	founding: {
		limit: 100,
		single: 109,
		couples: 159,
		family: 209,
		perks: [
			'Pricing locked in as long as you remain a member',
			'Available in any combination',
			'STACK Bag Tag',
			'Name in prize drawings'
		]
	},
	memberships: {
		monthly: {
			individual: 129,
			couple: 179,
			family: 229,
			familyMaxSize: 4
		},
		annual: {
			single: 1400,
			couples: 1950,
			family: 2500
		}
	},
	walkIn: {
		courtRate: 48,
		duration: 90, // minutes (1.5 hours)
		maxPlayers: 6,
		paddleRental: 5,
		advanceBookingDays: 1
	},
	happyHours: {
		rate: 9, // per person
		duration: 90, // minutes
		start: '12pm',
		end: '4pm',
		note: 'Reservation(s) must conclude by 4pm'
	},
	passes: {
		threeDay: 39, // per person
		sevenDay: 79 // per person
	},
	addOns: {
		openPlaySession: 5,
		courtRebooking: 5,
		advanceBookingDays: 7 // for members with add-on
	},
	sponsorship: {
		annual: 3000,
		monthlyPlan: 3250, // 12 monthly payments
		monthlyPayments: 12,
		bannersAvailable: 8,
		benefits: [
			'Your banner on 1 of 8 courts',
			'Logo on website',
			'Business shout out on our social media platforms'
		]
	}
} as const;

// =============================================================================
// MEMBERSHIP BENEFITS
// =============================================================================

export const MEMBERSHIP_BENEFITS = [
	'1 court reservation per day (90 minutes, member rate applies)',
	'1 open play session per day',
	'Free paddle rentals',
	'Discounts on lessons, events & pro shop'
] as const;

export const PASS_BENEFITS = [
	'1 open play session per day',
	'1 court reservation per day',
	'1-day advance booking'
] as const;

// =============================================================================
// POLICIES
// =============================================================================

export const POLICIES = {
	noCash: true,
	taxExtra: true,
	cancellationNoticeDays: 30,
	familyMustResideTogether: true,
	foodBeverageNotIncluded: true,
	guestsPayWalkInRate: true,
	additionalCourtTimeSubjectToAvailability: true
} as const;

// =============================================================================
// CONTACT INFO
// =============================================================================

export const CONTACT = {
	phone: '(817) 252-4555',
	website: 'stackpb.com',
	email: 'ernie.thestack@gmail.com',
	location: 'Burleson, Texas',
	tagline: 'Play More. Stay Cool. Play Year-Round.'
} as const;

// =============================================================================
// FAQS
// =============================================================================

export const FAQS = [
	{
		question: 'What does a membership include?',
		answer: `Monthly memberships include: ${MEMBERSHIP_BENEFITS.join(', ').toLowerCase()}. Additional court time is subject to availability and pricing. Guests of members pay regular walk-in pricing.`
	},
	{
		question: 'What is the Founding Member offer?',
		answer: `Our Founding Member program is limited to the first ${PRICING.founding.limit} members. Pricing starts at $${PRICING.founding.single}/month for singles, $${PRICING.founding.couples}/month for couples, and $${PRICING.founding.family}/month for families. The best part? Your price is locked in as long as you remain a member. Founding members also receive a STACK Bag Tag and entry into prize drawings.`
	},
	{
		question: 'Do you have Happy Hours?',
		answer: `Yes! Happy Hours are $${PRICING.happyHours.rate} per person for ${PRICING.happyHours.duration} minutes, available ${PRICING.happyHours.start} - ${PRICING.happyHours.end}. ${PRICING.happyHours.note}.`
	},
	{
		question: 'How far in advance can I book a court?',
		answer: `Walk-in players can book ${PRICING.walkIn.advanceBookingDays} day in advance. Members with the advanced booking add-on can book up to ${PRICING.addOns.advanceBookingDays} days in advance.`
	},
	{
		question: 'Do you provide equipment rentals?',
		answer: `Yes, paddle rentals are $${PRICING.walkIn.paddleRental} for walk-in players. Members receive free paddle rentals as part of their membership benefits.`
	},
	{
		question: 'What are your court reservation rates?',
		answer: `Court reservations are $${PRICING.walkIn.courtRate} per court for ${PRICING.walkIn.duration} minutes (1.5 hours). The cost is split evenly among players on the reservation, with a maximum of ${PRICING.walkIn.maxPlayers} players per court.`
	},
	{
		question: 'Do you offer passes for visitors?',
		answer: `Yes! We offer a 3-day pass for $${PRICING.passes.threeDay} per person and a 7-day pass for $${PRICING.passes.sevenDay} per person. Passes include ${PASS_BENEFITS.join(', ').toLowerCase()}. Guests not on a pass pay regular walk-in pricing.`
	},
	{
		question: 'What forms of payment do you accept?',
		answer: 'This is a NO CASH facility. We accept all major credit cards and digital payments. All pricing is plus tax.'
	},
	{
		question: 'How do I cancel my membership?',
		answer: `A ${POLICIES.cancellationNoticeDays}-day notice is required to cancel memberships. Please contact us to initiate the cancellation process.`
	},
	{
		question: 'Are there sponsorship opportunities?',
		answer: `Yes! We offer court banner sponsorships for $${PRICING.sponsorship.annual.toLocaleString()}/year (${PRICING.sponsorship.bannersAvailable} available). You can pay in full or $${PRICING.sponsorship.monthlyPlan.toLocaleString()} in ${PRICING.sponsorship.monthlyPayments} monthly payments. Benefits include: ${PRICING.sponsorship.benefits.join(', ').toLowerCase()}.`
	}
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatPrice(amount: number, showCents = false): string {
	return showCents ? `$${amount.toFixed(2)}` : `$${amount.toLocaleString()}`;
}

export function formatDuration(minutes: number): string {
	const hours = minutes / 60;
	return hours === 1 ? '1 hour' : `${hours} hours`;
}
