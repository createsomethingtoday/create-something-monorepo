<script lang="ts">
	/**
	 * TriadHealth Component
	 *
	 * Displays Subtractive Triad audit scores (DRY, Rams, Heidegger).
	 * Part of "The Circle Closes" experiment demonstrating the hermeneutic circle.
	 *
	 * "The tool reveals its own concealment."
	 *
	 * @see /packages/triad-audit - The audit tool
	 * @see /packages/ltd/src/routes/experiments/the-circle-closes - Parent experiment
	 */

	interface AuditScores {
		dry: number;
		rams: number;
		heidegger: number;
		overall: number;
	}

	interface AuditSummary {
		criticalCount: number;
		highCount: number;
		mediumCount: number;
		lowCount: number;
		totalViolations: number;
	}

	interface AuditData {
		scores: AuditScores;
		summary: AuditSummary;
		storedAt?: number;
		commitHash?: string;
		isSelfAudit?: boolean;
	}

	interface Props {
		data: AuditData | null;
		selfAuditData?: AuditData | null;
		loading?: boolean;
		compact?: boolean;
		class?: string;
	}

	let {
		data,
		selfAuditData = null,
		loading = false,
		compact = false,
		class: className = ''
	}: Props = $props();

	// Score status helpers
	function getStatus(score: number): 'pass' | 'warn' | 'fail' {
		if (score >= 7) return 'pass';
		if (score >= 5) return 'warn';
		return 'fail';
	}

	function getStatusIcon(status: 'pass' | 'warn' | 'fail'): string {
		switch (status) {
			case 'pass':
				return '+';
			case 'warn':
				return '~';
			case 'fail':
				return '-';
		}
	}

	function getStatusColor(status: 'pass' | 'warn' | 'fail'): string {
		switch (status) {
			case 'pass':
				return 'var(--color-success, #22c55e)';
			case 'warn':
				return 'var(--color-warning, #eab308)';
			case 'fail':
				return 'var(--color-error, #ef4444)';
		}
	}

	// Generate ASCII score bar
	function scoreBar(score: number): string {
		const filled = Math.round(score);
		const empty = 10 - filled;
		return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
	}

	// Format timestamp
	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Self-validation check
	$effect(() => {
		if (selfAuditData && selfAuditData.scores.overall < 6) {
			console.warn(
				'[TriadHealth] Self-audit score below 6. Results should be interpreted with caution.'
			);
		}
	});
</script>

<div class="triad-health {className}" class:compact class:loading>
	{#if loading}
		<div class="loading-state">
			<span class="loading-text">Auditing...</span>
		</div>
	{:else if !data}
		<div class="empty-state">
			<span class="empty-text">No audit data available</span>
			<span class="empty-hint">Run: pnpm triad-audit</span>
		</div>
	{:else}
		<div class="scores-grid">
			<!-- DRY Score -->
			<div class="score-row">
				<span class="score-label">DRY</span>
				<span class="score-sublabel">Implementation</span>
				<span class="score-bar" style="--status-color: {getStatusColor(getStatus(data.scores.dry))}">
					{scoreBar(data.scores.dry)}
				</span>
				<span class="score-value" style="color: {getStatusColor(getStatus(data.scores.dry))}">
					{data.scores.dry.toFixed(1)}
				</span>
				<span class="score-status">{getStatusIcon(getStatus(data.scores.dry))}</span>
			</div>

			<!-- Rams Score -->
			<div class="score-row">
				<span class="score-label">Rams</span>
				<span class="score-sublabel">Artifact</span>
				<span class="score-bar" style="--status-color: {getStatusColor(getStatus(data.scores.rams))}">
					{scoreBar(data.scores.rams)}
				</span>
				<span class="score-value" style="color: {getStatusColor(getStatus(data.scores.rams))}">
					{data.scores.rams.toFixed(1)}
				</span>
				<span class="score-status">{getStatusIcon(getStatus(data.scores.rams))}</span>
			</div>

			<!-- Heidegger Score -->
			<div class="score-row">
				<span class="score-label">Heidegger</span>
				<span class="score-sublabel">System</span>
				<span class="score-bar" style="--status-color: {getStatusColor(getStatus(data.scores.heidegger))}">
					{scoreBar(data.scores.heidegger)}
				</span>
				<span class="score-value" style="color: {getStatusColor(getStatus(data.scores.heidegger))}">
					{data.scores.heidegger.toFixed(1)}
				</span>
				<span class="score-status">{getStatusIcon(getStatus(data.scores.heidegger))}</span>
			</div>

			<!-- Overall Score (emphasized) -->
			<div class="score-row overall">
				<span class="score-label">Overall</span>
				<span class="score-sublabel"></span>
				<span class="score-bar" style="--status-color: {getStatusColor(getStatus(data.scores.overall))}">
					{scoreBar(data.scores.overall)}
				</span>
				<span class="score-value" style="color: {getStatusColor(getStatus(data.scores.overall))}">
					{data.scores.overall.toFixed(1)}
				</span>
				<span class="score-status">{getStatusIcon(getStatus(data.scores.overall))}</span>
			</div>
		</div>

		{#if !compact}
			<!-- Violations Summary -->
			<div class="violations-summary">
				<span class="violations-label">Violations:</span>
				{#if data.summary.totalViolations === 0}
					<span class="no-violations">None</span>
				{:else}
					{#if data.summary.criticalCount > 0}
						<span class="violation critical">{data.summary.criticalCount} critical</span>
					{/if}
					{#if data.summary.highCount > 0}
						<span class="violation high">{data.summary.highCount} high</span>
					{/if}
					{#if data.summary.mediumCount > 0}
						<span class="violation medium">{data.summary.mediumCount} medium</span>
					{/if}
					{#if data.summary.lowCount > 0}
						<span class="violation low">{data.summary.lowCount} low</span>
					{/if}
				{/if}
			</div>

			<!-- Self-Audit Status (The Mirror) -->
			{#if selfAuditData}
				<div class="self-audit" class:valid={selfAuditData.scores.overall >= 6}>
					<span class="self-audit-label">Self-Audit:</span>
					{#if selfAuditData.scores.overall >= 7}
						<span class="self-audit-status valid">The tool validates itself.</span>
					{:else if selfAuditData.scores.overall >= 6}
						<span class="self-audit-status acceptable">The tool passes its own test.</span>
					{:else}
						<span class="self-audit-status warning">
							Self-score {selfAuditData.scores.overall.toFixed(1)} - interpret with caution.
						</span>
					{/if}
				</div>
			{/if}

			<!-- Metadata -->
			{#if data.storedAt || data.commitHash}
				<div class="metadata">
					{#if data.storedAt}
						<span class="timestamp">{formatDate(data.storedAt)}</span>
					{/if}
					{#if data.commitHash}
						<span class="commit">{data.commitHash.slice(0, 7)}</span>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.triad-health {
		font-family: 'IBM Plex Mono', 'Fira Code', monospace;
		background: rgba(10, 10, 10, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.triad-health.compact {
		padding: 1rem;
	}

	.triad-health.loading {
		opacity: 0.7;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.loading-text {
		animation: pulse 1.5s ease-in-out infinite;
	}

	.empty-hint {
		font-size: 0.75rem;
		opacity: 0.6;
	}

	.scores-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.score-row {
		display: grid;
		grid-template-columns: 5rem 6rem 1fr 2.5rem 1.5rem;
		align-items: center;
		gap: 0.5rem;
	}

	.compact .score-row {
		grid-template-columns: 4rem 1fr 2rem 1rem;
	}

	.compact .score-sublabel {
		display: none;
	}

	.score-row.overall {
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.score-label {
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.875rem;
	}

	.score-sublabel {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.score-bar {
		font-size: 0.75rem;
		letter-spacing: -0.05em;
		color: var(--status-color, rgba(255, 255, 255, 0.5));
	}

	.score-value {
		font-weight: 600;
		font-size: 0.875rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.score-status {
		font-weight: bold;
		text-align: center;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.violations-summary {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
	}

	.violations-label {
		color: rgba(255, 255, 255, 0.6);
	}

	.no-violations {
		color: var(--color-success, #22c55e);
	}

	.violation {
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}

	.violation.critical {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.violation.high {
		background: rgba(249, 115, 22, 0.2);
		color: #f97316;
	}

	.violation.medium {
		background: rgba(234, 179, 8, 0.2);
		color: #eab308;
	}

	.violation.low {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.self-audit {
		margin-top: 1rem;
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.1);
	}

	.self-audit.valid {
		border-color: rgba(34, 197, 94, 0.3);
	}

	.self-audit-label {
		color: rgba(255, 255, 255, 0.5);
		margin-right: 0.5rem;
	}

	.self-audit-status.valid {
		color: #22c55e;
	}

	.self-audit-status.acceptable {
		color: #eab308;
	}

	.self-audit-status.warning {
		color: #f97316;
	}

	.metadata {
		margin-top: 1rem;
		display: flex;
		gap: 1rem;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.commit {
		font-family: 'IBM Plex Mono', monospace;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
