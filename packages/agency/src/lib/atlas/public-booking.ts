import type {
	PublicAtlasCanvas,
	PublicAtlasReadiness
} from '@create-something/canon/atlas/headless';

export interface PublicAtlasBookingContext {
	bookingHref: string;
	canvas: PublicAtlasCanvas;
	readiness: PublicAtlasReadiness;
}

export function buildPublicAtlasBookingUrl({
	bookingHref,
	canvas,
	readiness
}: PublicAtlasBookingContext): string {
	const base = bookingHref.split('?')[0] || '/book';
	const params = new URLSearchParams({
		source: 'atlas-canvas',
		intent: readiness.intent,
		lane: readiness.lane,
		warmup: 'atlas_canvas',
		readiness: readiness.slug,
		score: String(readiness.score),
		atlas_session_id: canvas.id,
		agent_messages: String(canvas.agentMessages)
	});

	return `${base}?${params.toString()}`;
}
