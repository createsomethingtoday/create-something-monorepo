<script lang="ts">
	import type { AgencyGovernedActionGate } from '$lib/agency-access';
	import { widgetRegistry } from './registry';
	import type { ConciergeWidget } from './types';

export let widgets: ConciergeWidget[] = [];
export let placement: 'inline' | 'rail' | 'any' = 'any';
export let threadId = '';
export let governedActionGate: AgencyGovernedActionGate | null = null;
export let intakeProtectedActionsBlocked = false;
export let intakeProtectionMessage = '';
export let showInternalWidgets = true;
export let showWidgetTypeBadge = true;
export let renderEmptyState = true;

	const hybridGovernedWidgetTypes = new Set(['appointment_picker']);
	const internalOnlyWidgetTypes = new Set([
		'staffing_queue',
		'facility_response',
		'onboarding_queue'
	]);
	const governedWidgetTypes = new Set([...hybridGovernedWidgetTypes, ...internalOnlyWidgetTypes]);
	const intakeProtectedWidgetTypes = new Set(['document_upload', ...governedWidgetTypes]);

	$: visibleWidgets =
		placement === 'any'
			? widgets
			: widgets.filter((widget) => widget.placement === placement);
	$: filteredWidgets = showInternalWidgets
		? visibleWidgets
		: visibleWidgets.filter((widget) => !internalOnlyWidgetTypes.has(widget.type));
</script>

{#if filteredWidgets.length === 0}
	{#if renderEmptyState}
	<div class="empty glass">No active widgets for this surface.</div>
	{/if}
{:else}
	<div class={`renderer ${placement} ${showInternalWidgets ? 'internal' : 'nurse-facing'}`}>
			{#each filteredWidgets as widget (widget.id)}
				{@const component = widgetRegistry[widget.type]}
				<section class={`widget-card glass ${placement} ${showInternalWidgets ? 'internal' : 'nurse-facing'}`}>
					<header class="widget-header">
						<h3>{widget.title}</h3>
						{#if showWidgetTypeBadge}
							<span class="status-pill">{widget.type.replace('_', ' ')}</span>
						{/if}
					</header>
					{#if hybridGovernedWidgetTypes.has(widget.type)}
						<svelte:component
							this={component}
							widget={widget}
							threadId={threadId}
							governedActionGate={governedActionGate}
							intakeProtectedActionsBlocked={intakeProtectedActionsBlocked}
							intakeProtectionMessage={intakeProtectionMessage}
							showInternalControls={showInternalWidgets}
						/>
					{:else if internalOnlyWidgetTypes.has(widget.type)}
						<svelte:component
							this={component}
							widget={widget}
							threadId={threadId}
							governedActionGate={governedActionGate}
							intakeProtectedActionsBlocked={intakeProtectedActionsBlocked}
							intakeProtectionMessage={intakeProtectionMessage}
						/>
					{:else if intakeProtectedWidgetTypes.has(widget.type)}
						<svelte:component
							this={component}
							widget={widget}
							threadId={threadId}
							intakeProtectedActionsBlocked={intakeProtectedActionsBlocked}
							intakeProtectionMessage={intakeProtectionMessage}
						/>
					{:else}
						<svelte:component this={component} widget={widget} threadId={threadId} />
					{/if}
				</section>
			{/each}
		</div>
	{/if}

<style>
	.renderer {
		display: grid;
		gap: 1rem;
	}

	.renderer.inline.nurse-facing {
		gap: 0.85rem;
	}

	.widget-card,
	.empty {
		padding: 1.15rem 1.2rem;
	}

	.widget-card {
		position: relative;
		overflow: hidden;
	}

	.widget-card::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			rgba(167, 184, 255, 0),
			rgba(167, 184, 255, 0.34),
			rgba(167, 184, 255, 0)
		);
		pointer-events: none;
	}

	.widget-card.inline.nurse-facing {
		background: linear-gradient(180deg, rgba(18, 24, 37, 0.74), rgba(12, 16, 25, 0.9));
		border-radius: 24px 24px 24px 14px;
		border-color: rgba(167, 184, 255, 0.14);
		box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
	}

	.widget-card.rail {
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.2);
	}

	.widget-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0;
		font-size: 1.02rem;
		letter-spacing: -0.02em;
	}
</style>
