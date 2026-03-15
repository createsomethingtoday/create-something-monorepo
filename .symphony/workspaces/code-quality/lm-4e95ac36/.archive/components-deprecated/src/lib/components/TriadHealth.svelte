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
		font-family: var(--font-mono);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
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
		color: var(--color-fg-muted);
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
		border-top: 1px solid var(--color-border-default);
	}

	.score-label {
		font-weight: 600;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
	}

	.score-sublabel {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.score-bar {
		font-size: 0.75rem;
		letter-spacing: -0.05em;
		color: var(--status-color, var(--color-fg-muted));
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
		color: var(--color-fg-tertiary);
	}

	.violations-summary {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-default);
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
	}

	.violations-label {
		color: var(--color-fg-tertiary);
	}

	.no-violations {
		color: var(--color-success);
	}

	.violation {
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
	}

	.violation.critical {
		background: color-mix(in srgb, var(--color-error) 20%, transparent);
		color: var(--color-error);
	}

	.violation.high {
		background: color-mix(in srgb, var(--color-warning) 20%, transparent);
		color: var(--color-warning);
	}

	.violation.medium {
		background: color-mix(in srgb, var(--color-warning) 15%, transparent);
		color: var(--color-warning);
	}

	.violation.low {
		background: color-mix(in srgb, var(--color-success) 20%, transparent);
		color: var(--color-success);
	}

	.self-audit {
		margin-top: 1rem;
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		background: var(--color-bg-surface);
		border: 1px dashed var(--color-border-default);
	}

	.self-audit.valid {
		border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
	}

	.self-audit-label {
		color: var(--color-fg-muted);
		margin-right: 0.5rem;
	}

	.self-audit-status.valid {
		color: var(--color-success);
	}

	.self-audit-status.acceptable {
		color: var(--color-warning);
	}

	.self-audit-status.warning {
		color: var(--color-warning);
	}

	.metadata {
		margin-top: 1rem;
		display: flex;
		gap: 1rem;
		font-size: 0.7rem;
		color: var(--color-fg-subtle);
	}

	.commit {
		font-family: var(--font-mono);
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
