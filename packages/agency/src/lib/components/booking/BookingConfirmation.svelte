<script lang="ts">
	interface BookingEvent {
		id: string;
		start_at: string;
		end_at: string;
		name: string;
		timezone: string;
	}

	interface Props {
		event: BookingEvent;
		timezone: string;
	}

	let { event, timezone }: Props = $props();

	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: timezone
		});
	}

	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: timezone
		});
	}

	// Generate calendar links
	function generateGoogleCalendarLink(): string {
		const start = new Date(event.start_at).toISOString().replace(/-|:|\.\d+/g, '');
		const end = new Date(event.end_at).toISOString().replace(/-|:|\.\d+/g, '');
		const title = encodeURIComponent('Discovery Call - CREATE SOMETHING');
		const details = encodeURIComponent(
			'Discovery call with CREATE SOMETHING to discuss your project.'
		);

		return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
	}

	function generateOutlookLink(): string {
		const start = new Date(event.start_at).toISOString();
		const end = new Date(event.end_at).toISOString();
		const title = encodeURIComponent('Discovery Call - CREATE SOMETHING');
		const body = encodeURIComponent(
			'Discovery call with CREATE SOMETHING to discuss your project.'
		);

		return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start}&enddt=${end}&body=${body}`;
	}

	function generateICalData(): string {
		const start = new Date(event.start_at).toISOString().replace(/-|:|\.\d+/g, '');
		const end = new Date(event.end_at).toISOString().replace(/-|:|\.\d+/g, '');
		const now = new Date().toISOString().replace(/-|:|\.\d+/g, '');

		const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CREATE SOMETHING//Booking//EN
BEGIN:VEVENT
UID:${event.id}@createsomething.agency
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:Discovery Call - CREATE SOMETHING
DESCRIPTION:Discovery call with CREATE SOMETHING to discuss your project.
END:VEVENT
END:VCALENDAR`;

		return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ical);
	}
</script>

<div class="confirmation">
	<div class="success-icon">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polyline points="20 6 9 17 4 12" />
		</svg>
	</div>

	<h2 class="title">You're booked!</h2>

	<p class="message">
		A calendar invitation has been sent to your email. We're looking forward to speaking with you.
	</p>

	<div class="details-card">
		<div class="detail">
			<span class="detail-label">Date</span>
			<span class="detail-value">{formatDate(event.start_at)}</span>
		</div>
		<div class="detail">
			<span class="detail-label">Time</span>
			<span class="detail-value">
				{formatTime(event.start_at)} - {formatTime(event.end_at)}
			</span>
		</div>
		<div class="detail">
			<span class="detail-label">Timezone</span>
			<span class="detail-value">{timezone.replace('_', ' ')}</span>
		</div>
	</div>

	<div class="calendar-links">
		<span class="calendar-label">Add to calendar</span>
		<div class="calendar-buttons">
			<a
				href={generateGoogleCalendarLink()}
				target="_blank"
				rel="noopener noreferrer"
				class="calendar-button"
			>
				Google Calendar
			</a>
			<a
				href={generateOutlookLink()}
				target="_blank"
				rel="noopener noreferrer"
				class="calendar-button"
			>
				Outlook
			</a>
			<a href={generateICalData()} download="discovery-call.ics" class="calendar-button">
				iCal / Apple
			</a>
		</div>
	</div>

	<a href="/" class="back-home">← Back to homepage</a>
</div>

<style>
	.confirmation {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-lg);
	}

	.success-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: var(--color-success-muted);
		border: 2px solid var(--color-success);
		border-radius: 50%;
		color: var(--color-success);
	}

	.success-icon svg {
		width: 32px;
		height: 32px;
	}

	.title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.message {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		max-width: 400px;
		line-height: 1.6;
	}

	.details-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: 100%;
		max-width: 320px;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.detail {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.detail-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.detail-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.calendar-links {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
	}

	.calendar-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.calendar-buttons {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
		justify-content: center;
	}

	.calendar-button {
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.calendar-button:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.calendar-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.back-home {
		margin-top: var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-home:hover {
		color: var(--color-fg-primary);
	}
</style>
