<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Settings | TEND</title>
</svelte:head>

<div class="settings-page">
	<header class="page-header">
		<h1 class="page-title">Settings</h1>
		<p class="page-description">How your practice runs</p>
	</header>

	<section class="settings-section">
		<h2 class="section-title">Your practice</h2>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Name</span>
				<span class="setting-value">{data.tenant?.name || 'Demo Dental Practice'}</span>
			</div>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Plan</span>
				<span class="setting-value tier-badge">{data.tenant?.tier || 'demo'}</span>
			</div>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Type</span>
				<span class="setting-value">Dental practice</span>
			</div>
		</div>
	</section>

	<section class="settings-section">
		<h2 class="section-title">Automations</h2>
		<p class="section-description">These run all day, every day. No thinking required.</p>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Log calls</span>
				<span class="setting-hint">Every call gets scored and categorized</span>
			</div>
			<span class="setting-badge active">On</span>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Track appointments</span>
				<span class="setting-hint">Know who confirmed, who didn't, who matters most</span>
			</div>
			<span class="setting-badge active">On</span>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Check insurance</span>
				<span class="setting-hint">Catch coverage issues before the patient arrives</span>
			</div>
			<span class="setting-badge active">On</span>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Watch claims</span>
				<span class="setting-hint">Denials bubble up immediately</span>
			</div>
			<span class="setting-badge active">On</span>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Follow up on recalls</span>
				<span class="setting-hint">Overdue patients get contacted automatically</span>
			</div>
			<span class="setting-badge active">On</span>
		</div>
	</section>

	<section class="settings-section">
		<h2 class="section-title">Agents</h2>
		<p class="section-description">These think things through. You decide how much freedom they get.</p>
		
		<div class="autonomy-callout">
			<span class="callout-label">Your choice</span>
			<p class="callout-text">
				Some people review everything. Others let agents run. Move the dial wherever feels right.
			</p>
		</div>

		<div class="setting-row agent-row">
			<div class="setting-info">
				<span class="setting-label">Missed calls</span>
				<span class="setting-hint">Figures out who to call back and why</span>
			</div>
			<div class="approval-control">
				<select class="approval-select" disabled>
					<option value="always">Review all</option>
					<option value="high_value" selected>High value only</option>
					<option value="errors">Problems only</option>
					<option value="never">Let it run</option>
				</select>
				<span class="setting-badge enterprise">Enterprise</span>
			</div>
		</div>
		<div class="setting-row agent-row">
			<div class="setting-info">
				<span class="setting-label">Treatment prep</span>
				<span class="setting-hint">Gets cases ready before the conversation</span>
			</div>
			<div class="approval-control">
				<select class="approval-select" disabled>
					<option value="always" selected>Review all</option>
					<option value="high_value">High value only</option>
					<option value="errors">Problems only</option>
					<option value="never">Let it run</option>
				</select>
				<span class="setting-badge enterprise">Enterprise</span>
			</div>
		</div>
		<div class="setting-row agent-row">
			<div class="setting-info">
				<span class="setting-label">Insurance appeals</span>
				<span class="setting-hint">Drafts appeal letters when claims get denied</span>
			</div>
			<div class="approval-control">
				<select class="approval-select" disabled>
					<option value="always" selected>Review all</option>
					<option value="high_value">High value only</option>
					<option value="errors">Problems only</option>
					<option value="never">Let it run</option>
				</select>
				<span class="setting-badge enterprise">Enterprise</span>
			</div>
		</div>
		<div class="setting-row agent-row">
			<div class="setting-info">
				<span class="setting-label">Schedule gaps</span>
				<span class="setting-hint">Finds patients to fill empty slots</span>
			</div>
			<div class="approval-control">
				<select class="approval-select" disabled>
					<option value="always">Review all</option>
					<option value="high_value">High value only</option>
					<option value="errors" selected>Problems only</option>
					<option value="never">Let it run</option>
				</select>
				<span class="setting-badge enterprise">Enterprise</span>
			</div>
		</div>
		<div class="setting-row agent-row">
			<div class="setting-info">
				<span class="setting-label">Review responses</span>
				<span class="setting-hint">Writes replies to Google and Yelp reviews</span>
			</div>
			<div class="approval-control">
				<select class="approval-select" disabled>
					<option value="always" selected>Review all</option>
					<option value="high_value">High value only</option>
					<option value="errors">Problems only</option>
					<option value="never">Let it run</option>
				</select>
				<span class="setting-badge enterprise">Enterprise</span>
			</div>
		</div>
		<div class="setting-row agent-row">
			<div class="setting-info">
				<span class="setting-label">Patient messages</span>
				<span class="setting-hint">Confirmations, reminders, the routine stuff</span>
			</div>
			<div class="approval-control">
				<select class="approval-select" disabled>
					<option value="always">Review all</option>
					<option value="high_value">High value only</option>
					<option value="errors">Problems only</option>
					<option value="never" selected>Let it run</option>
				</select>
				<span class="setting-badge enterprise">Enterprise</span>
			</div>
		</div>
	</section>

	<section class="settings-section">
		<h2 class="section-title">Priorities</h2>
		<p class="section-description">What matters most to your practice</p>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">New patient boost</span>
				<span class="setting-hint">How much extra attention new patients get</span>
			</div>
			<span class="setting-badge enterprise">Enterprise</span>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">High-value threshold</span>
				<span class="setting-hint">Dollar amount that makes something important</span>
			</div>
			<span class="setting-badge enterprise">Enterprise</span>
		</div>
		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">VIP list</span>
				<span class="setting-hint">Patients who always come first</span>
			</div>
			<span class="setting-badge enterprise">Enterprise</span>
		</div>
	</section>
</div>

<style>
	.settings-page {
		max-width: 600px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 4px;
	}

	.page-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.settings-section {
		margin-bottom: var(--space-lg);
	}

	.section-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 4px;
	}

	.section-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: 4px;
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.setting-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.setting-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.setting-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.tier-badge {
		text-transform: capitalize;
		padding: 2px 8px;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
	}

	.setting-badge {
		font-size: var(--text-caption);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
	}

	.setting-badge.active {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.setting-badge.enterprise {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	/* Autonomy Callout */
	.autonomy-callout {
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
	}

	.callout-label {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.callout-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-top: 4px;
	}

	/* Agent Rows */
	.agent-row {
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.approval-control {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.approval-select {
		padding: 4px 8px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		font-size: var(--text-caption);
		cursor: not-allowed;
		opacity: 0.7;
	}

	.approval-select:not(:disabled) {
		cursor: pointer;
		opacity: 1;
	}

	.approval-select:not(:disabled):hover {
		border-color: var(--color-fg-tertiary);
	}
</style>
