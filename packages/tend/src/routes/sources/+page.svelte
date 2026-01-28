<script lang="ts">
	import { 
		Mail, MessageSquare, Receipt, CreditCard, CheckCircle, AlertCircle, Pause,
		Phone, FileText, Shield, Star, DollarSign, Image, Users, Clipboard
	} from 'lucide-svelte';

	let { data } = $props();

	function getSourceIcon(type: string) {
		switch (type) {
			// Dental sources
			case 'pms': return Clipboard;
			case 'phone': return Phone;
			case 'insurance': return Shield;
			case 'claims': return FileText;
			case 'reviews': return Star;
			case 'accounting': return DollarSign;
			case 'imaging': return Image;
			case 'patient_comms': return Users;
			// Generic sources
			case 'gmail': return Mail;
			case 'slack': return MessageSquare;
			case 'quickbooks': return Receipt;
			case 'stripe': return CreditCard;
			default: return FileText;
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'active': return CheckCircle;
			case 'demo': return CheckCircle;
			case 'paused': return Pause;
			case 'error': return AlertCircle;
			default: return CheckCircle;
		}
	}

	function getStatusClass(status: string): string {
		switch (status) {
			case 'active':
			case 'demo':
				return 'status-active';
			case 'paused':
				return 'status-paused';
			case 'error':
				return 'status-error';
			default:
				return '';
		}
	}
</script>

<svelte:head>
	<title>Sources | TEND</title>
</svelte:head>

<div class="sources-page">
	<header class="page-header">
		<h1 class="page-title">Sources</h1>
		<p class="page-description">Where your data comes from</p>
	</header>

	<div class="sources-grid">
		{#each data.sources as source (source.id)}
			{@const SourceIcon = getSourceIcon(source.type)}
			{@const StatusIcon = getStatusIcon(source.status)}
			<article class="source-card">
				<div class="source-icon">
					<SourceIcon size={24} />
				</div>
				<div class="source-info">
					<h2 class="source-name">{source.name}</h2>
					<div class="source-status {getStatusClass(source.status)}">
						<StatusIcon size={14} />
						<span>{source.status === 'demo' ? 'Sample data' : source.status}</span>
					</div>
				</div>
			</article>
		{/each}

		<!-- Add source card (placeholder) -->
		<article class="source-card add-source">
			<div class="add-icon">+</div>
			<div class="source-info">
				<h2 class="source-name">Connect something</h2>
				<p class="source-hint">We'll set this up for you</p>
			</div>
		</article>
	</div>

	<section class="enterprise-cta">
		<h2 class="cta-title">Ready to connect your actual systems?</h2>
		<p class="cta-description">
			We'll hook up your practice management, phone system, insurance tools — whatever you use.
			Then we'll train the agents on how your practice actually works.
		</p>
		<a href="mailto:enterprise@createsomething.xyz" class="cta-button">Let's talk</a>
	</section>
</div>

<style>
	.sources-page {
		max-width: 800px;
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

	.sources-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: var(--space-sm);
		margin-bottom: var(--space-xl);
	}

	.source-card {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.source-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.source-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
	}

	.source-info {
		flex: 1;
	}

	.source-name {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: 4px;
		white-space: nowrap;
	}

	.source-status {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-caption);
	}

	.status-active {
		color: var(--color-success);
	}

	.status-paused {
		color: var(--color-warning);
	}

	.status-error {
		color: var(--color-error);
	}

	.add-source {
		border-style: dashed;
		opacity: 0.6;
		cursor: pointer;
	}

	.add-source:hover {
		opacity: 1;
	}

	.add-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		color: var(--color-fg-tertiary);
		font-size: var(--text-h2);
	}

	.source-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.enterprise-cta {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.cta-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.cta-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
		max-width: 500px;
		margin-left: auto;
		margin-right: auto;
	}

	.cta-button {
		display: inline-block;
		padding: var(--space-xs) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		opacity: 0.9;
	}

	/* Mobile responsive - Tufte principles */
	@media (max-width: 768px) {
		.sources-page {
			padding: 0 var(--space-sm);
		}

		.enterprise-cta {
			padding: var(--space-md);
		}

		.cta-button {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.sources-grid {
			grid-template-columns: 1fr;
			gap: 0; /* Tufte: whitespace + rules, not boxes */
		}

		.source-card {
			border-radius: 0;
			border-left: none;
			border-right: none;
			border-top: none;
			border-bottom: 1px solid var(--color-border-subtle);
			padding: var(--space-md) 0;
		}

		.source-card:last-child,
		.source-card.add-source {
			border-bottom: none;
		}

		.source-card:hover {
			border-color: var(--color-border-subtle);
		}

		.source-card.add-source {
			margin-top: var(--space-md);
			padding: var(--space-md);
			border: 1px dashed var(--color-border-default);
			border-radius: var(--radius-md);
		}
	}
</style>
