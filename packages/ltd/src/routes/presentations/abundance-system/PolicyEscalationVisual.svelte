<div class="policy-visual">
	<section class="evidence-card">
		<p class="eyebrow">Conflict example</p>
		<h3>AI stops at contradiction</h3>

		<div class="evidence-grid">
			<div class="evidence-box">
				<span class="box-label">Nurse said</span>
				<strong>Compact license expires 08/2027</strong>
			</div>
			<div class="evidence-box conflict">
				<span class="box-label">Portal returned</span>
				<strong>Compact license expires 03/2027</strong>
			</div>
		</div>
	</section>

	<section class="handoff-card">
		<p class="eyebrow">Escalation path</p>
		<h3>Nothing is silently overwritten</h3>

		<div class="flow">
			<div class="step">
				<span class="step-number">01</span>
				<p>Evidence compared</p>
			</div>
			<div class="connector"></div>
			<div class="step danger">
				<span class="step-number">02</span>
				<p>Conflict detected</p>
			</div>
			<div class="connector"></div>
			<div class="step">
				<span class="step-number">03</span>
				<p>Human review queue</p>
			</div>
		</div>

		<div class="outcomes">
			<span>No overwrite</span>
			<span>Reason recorded</span>
			<span>Thread packaged</span>
		</div>
	</section>
</div>

<style>
	.policy-visual {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		gap: var(--space-performance-lg);
	}

	.evidence-card,
	.handoff-card {
		padding: var(--space-performance-lg);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-performance-scale-lg);
		background: var(--color-performance-bg-surface);
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		font-size: var(--text-performance-caption);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	h3 {
		margin: 0;
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
	}

	.evidence-grid {
		margin-top: var(--space-performance-md);
		display: grid;
		gap: var(--space-performance-sm);
	}

	.evidence-box,
	.step {
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		border: 1px solid var(--color-border-subtle);
		background: rgba(15, 23, 42, 0.04);
	}

	.evidence-box.conflict,
	.step.danger {
		border-color: rgba(239, 68, 68, 0.28);
		background: rgba(239, 68, 68, 0.08);
	}

	.box-label {
		display: block;
		margin-bottom: 0.35rem;
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-performance-widest);
		color: var(--color-performance-fg-muted);
	}

	.evidence-box strong {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-primary);
	}

	.flow {
		margin-top: var(--space-performance-md);
		display: grid;
		grid-template-columns: 1fr auto 1fr auto 1fr;
		align-items: center;
		gap: var(--space-performance-sm);
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-height: 6.5rem;
		justify-content: center;
	}

	.step-number {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.step p {
		margin: 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.45;
	}

	.connector {
		height: 2px;
		width: 2rem;
		background: linear-gradient(90deg, rgba(148, 163, 184, 0.3), rgba(148, 163, 184, 0.8));
	}

	.outcomes {
		margin-top: var(--space-performance-md);
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.outcomes span {
		padding: 0.4rem 0.65rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.08);
		color: #1d4ed8;
		font-size: var(--text-performance-caption);
	}

	@media (max-width: 768px) {
		.policy-visual {
			grid-template-columns: 1fr;
		}

		.flow {
			grid-template-columns: 1fr;
		}

		.connector {
			width: 2px;
			height: 1.5rem;
			justify-self: center;
			background: linear-gradient(180deg, rgba(148, 163, 184, 0.3), rgba(148, 163, 184, 0.8));
		}
	}
</style>
