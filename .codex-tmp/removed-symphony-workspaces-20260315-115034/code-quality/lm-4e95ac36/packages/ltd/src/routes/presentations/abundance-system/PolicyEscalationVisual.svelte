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
		gap: var(--space-lg);
	}

	.evidence-card,
	.handoff-card {
		padding: var(--space-lg);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	h3 {
		margin: 0;
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.evidence-grid {
		margin-top: var(--space-md);
		display: grid;
		gap: var(--space-sm);
	}

	.evidence-box,
	.step {
		padding: var(--space-md);
		border-radius: var(--radius-md);
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
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-muted);
	}

	.evidence-box strong {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.flow {
		margin-top: var(--space-md);
		display: grid;
		grid-template-columns: 1fr auto 1fr auto 1fr;
		align-items: center;
		gap: var(--space-sm);
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-height: 6.5rem;
		justify-content: center;
	}

	.step-number {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.step p {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.45;
	}

	.connector {
		height: 2px;
		width: 2rem;
		background: linear-gradient(90deg, rgba(148, 163, 184, 0.3), rgba(148, 163, 184, 0.8));
	}

	.outcomes {
		margin-top: var(--space-md);
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.outcomes span {
		padding: 0.4rem 0.65rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.08);
		color: #1d4ed8;
		font-size: var(--text-caption);
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
