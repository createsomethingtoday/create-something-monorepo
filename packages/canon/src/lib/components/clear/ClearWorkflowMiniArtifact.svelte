<script lang="ts">
	export interface ClearWorkflowMiniArtifactProps {
		kind: 'signal' | 'decision' | 'proof';
		ariaLabel?: string;
	}

	let { kind, ariaLabel }: ClearWorkflowMiniArtifactProps = $props();
</script>

<div
	class="clear-workflow-mini-artifact clear-workflow-mini-artifact--{kind}"
	aria-hidden={ariaLabel ? undefined : true}
	aria-label={ariaLabel}
>
	{#if kind === 'signal'}
		<div class="clear-workflow-mini-artifact__stack">
			<span class="clear-workflow-mini-artifact__chip"></span>
			<span class="clear-workflow-mini-artifact__chip"></span>
			<span class="clear-workflow-mini-artifact__chip"></span>
		</div>
		<span class="clear-workflow-mini-artifact__rail"></span>
		<span class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--queue">
			<i></i>
			<i></i>
			<i></i>
		</span>
	{:else if kind === 'decision'}
		<span class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--owner">
			<i></i>
			<b></b>
		</span>
		<span class="clear-workflow-mini-artifact__rail"></span>
		<div class="clear-workflow-mini-artifact__states">
			<span
				class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--state clear-workflow-mini-artifact__chip--run"
			>
				RUN
			</span>
			<span
				class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--state clear-workflow-mini-artifact__chip--wait"
			>
				WAIT
			</span>
			<span
				class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--state clear-workflow-mini-artifact__chip--stop"
			>
				STOP
			</span>
		</div>
	{:else}
		<div class="clear-workflow-mini-artifact__receipts">
			<span class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--receipt">
				<i></i>
				<b></b>
			</span>
			<span class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--receipt">
				<i></i>
				<b></b>
			</span>
			<span class="clear-workflow-mini-artifact__chip clear-workflow-mini-artifact__chip--receipt">
				<i></i>
				<b></b>
			</span>
		</div>
	{/if}
</div>

<style>
	.clear-workflow-mini-artifact {
		display: grid;
		grid-template-columns: 4.3rem 2.15rem 6.86rem;
		gap: 0.5rem;
		align-items: center;
		justify-content: center;
		width: min(100%, 14.36rem);
		min-height: 5.95rem;
		margin-inline: auto;
		color: var(--color-performance-ink, #090909);
	}

	.clear-workflow-mini-artifact--proof {
		grid-template-columns: 1fr;
		width: min(100%, 13.18rem);
	}

	.clear-workflow-mini-artifact__stack,
	.clear-workflow-mini-artifact__states,
	.clear-workflow-mini-artifact__receipts {
		display: grid;
		gap: 0.34rem;
	}

	.clear-workflow-mini-artifact__states {
		grid-template-columns: repeat(3, 1fr);
		gap: 0.38rem;
	}

	.clear-workflow-mini-artifact__receipts {
		grid-template-columns: repeat(3, 1fr);
		width: 100%;
	}

	.clear-workflow-mini-artifact__chip {
		display: grid;
		position: relative;
		width: 4.15rem;
		min-width: 0;
		height: 1.38rem;
		border: 1px solid rgba(10, 14, 25, 0.22);
		border-radius: var(--radius-performance-sm, 4px);
		background: #ffffff;
		box-shadow: 0 1px 0 rgba(10, 14, 25, 0.035);
	}

	.clear-workflow-mini-artifact__rail {
		width: 2.15rem;
		height: 1px;
		background: rgba(10, 14, 25, 0.18);
	}

	.clear-workflow-mini-artifact__chip--queue,
	.clear-workflow-mini-artifact__chip--owner {
		width: 4.15rem;
		height: 4.54rem;
		background: rgba(10, 14, 25, 0.018);
	}

	.clear-workflow-mini-artifact__chip--queue {
		align-content: center;
		gap: 0.38rem;
		padding-inline: 0.82rem;
	}

	.clear-workflow-mini-artifact__chip--queue i,
	.clear-workflow-mini-artifact__chip--owner i,
	.clear-workflow-mini-artifact__chip--owner b,
	.clear-workflow-mini-artifact__chip--receipt i,
	.clear-workflow-mini-artifact__chip--receipt b {
		display: block;
		height: 1px;
		border-radius: 999px;
		background: rgba(10, 14, 25, 0.5);
	}

	.clear-workflow-mini-artifact__chip--queue i,
	.clear-workflow-mini-artifact__chip--owner i,
	.clear-workflow-mini-artifact__chip--receipt i {
		width: 100%;
	}

	.clear-workflow-mini-artifact__chip--owner {
		align-content: center;
		gap: 0.4rem;
		padding-inline: 0.82rem;
	}

	.clear-workflow-mini-artifact__chip--owner b,
	.clear-workflow-mini-artifact__chip--receipt b {
		width: 72%;
	}

	.clear-workflow-mini-artifact__chip--state {
		place-items: center;
		width: 2.02rem;
		height: 1.6rem;
		color: var(--color-performance-ink, #090909);
		font-family: var(--font-mono);
		font-size: 0.56rem;
		font-weight: var(--font-semibold);
		line-height: 1;
		letter-spacing: 0;
	}

	.clear-workflow-mini-artifact__chip--run {
		background: rgba(57, 117, 84, 0.055);
	}

	.clear-workflow-mini-artifact__chip--wait {
		background: rgba(49, 92, 255, 0.04);
	}

	.clear-workflow-mini-artifact__chip--stop {
		background: rgba(196, 30, 58, 0.045);
	}

	.clear-workflow-mini-artifact__chip--receipt {
		align-content: center;
		gap: 0.36rem;
		width: 4.15rem;
		height: 2.32rem;
		padding-inline: 0.68rem;
		background: rgba(10, 14, 25, 0.018);
	}
</style>
