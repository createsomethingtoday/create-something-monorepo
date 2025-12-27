<script lang="ts">
	/**
	 * OperationPicker - UI for pattern-based SVG operations
	 *
	 * No natural language, no API calls. User selects from predefined
	 * operations—explicit, deterministic, learns vocabulary.
	 */
	import {
		type SvgOperation,
		type FurnitureType,
		getFurnitureTypes,
		getAvailableOperations
	} from './svg-operations';

	interface Props {
		onApplyOperation?: (operation: SvgOperation) => void;
	}

	let { onApplyOperation }: Props = $props();

	const availableOperations = getAvailableOperations();
	const furnitureTypes = getFurnitureTypes();

	// Current operation state
	let selectedOperationType = $state<SvgOperation['type'] | null>(null);
	let selectedFurniture = $state<FurnitureType>('sofa');
	let peopleCount = $state(2);
	let labelText = $state('Living');
	let removeSelector = $state('#element-id');

	// Position state (would be set by clicking on the canvas)
	let position = $state<[number, number]>([50, 50]);

	function applyOperation() {
		if (!selectedOperationType || !onApplyOperation) return;

		let operation: SvgOperation;

		switch (selectedOperationType) {
			case 'add-furniture':
				operation = {
					type: 'add-furniture',
					furniture: selectedFurniture,
					position
				};
				break;
			case 'add-people':
				operation = {
					type: 'add-people',
					count: peopleCount,
					zone: 'center'
				};
				break;
			case 'add-label':
				operation = {
					type: 'add-label',
					text: labelText,
					position
				};
				break;
			case 'remove-element':
				operation = {
					type: 'remove-element',
					selector: removeSelector
				};
				break;
			default:
				return;
		}

		onApplyOperation(operation);
	}
</script>

<div class="operation-picker">
	<h3>SVG Operations</h3>
	<p class="description">
		Edit the floor plan with predefined operations. Explicit actions, deterministic results.
	</p>

	<!-- Operation Type Selection -->
	<div class="operation-buttons">
		{#each availableOperations as op}
			<button
				class="operation-button"
				class:selected={selectedOperationType === op.type}
				onclick={() => (selectedOperationType = op.type)}
				title={op.description}
			>
				<span class="op-icon">{op.icon}</span>
				<span class="op-name">{op.name}</span>
			</button>
		{/each}
	</div>

	<!-- Operation-specific controls -->
	{#if selectedOperationType === 'add-furniture'}
		<div class="operation-controls">
			<label class="control-label">Furniture Type</label>
			<div class="furniture-grid">
				{#each furnitureTypes as f}
					<button
						class="furniture-button"
						class:selected={selectedFurniture === f.type}
						onclick={() => (selectedFurniture = f.type)}
					>
						<span>{f.icon}</span>
						<span>{f.name}</span>
					</button>
				{/each}
			</div>
			<div class="position-input">
				<label>
					X: <input type="number" bind:value={position[0]} min="0" max="200" />
				</label>
				<label>
					Y: <input type="number" bind:value={position[1]} min="0" max="200" />
				</label>
			</div>
		</div>
	{:else if selectedOperationType === 'add-people'}
		<div class="operation-controls">
			<label class="control-label">Number of People</label>
			<input
				type="range"
				bind:value={peopleCount}
				min="1"
				max="10"
				class="people-slider"
			/>
			<span class="count-display">{peopleCount}</span>
		</div>
	{:else if selectedOperationType === 'add-label'}
		<div class="operation-controls">
			<label class="control-label">Label Text</label>
			<input
				type="text"
				bind:value={labelText}
				placeholder="Room name"
				class="text-input"
			/>
			<div class="position-input">
				<label>
					X: <input type="number" bind:value={position[0]} min="0" max="200" />
				</label>
				<label>
					Y: <input type="number" bind:value={position[1]} min="0" max="200" />
				</label>
			</div>
		</div>
	{:else if selectedOperationType === 'remove-element'}
		<div class="operation-controls">
			<label class="control-label">Element Selector</label>
			<input
				type="text"
				bind:value={removeSelector}
				placeholder="#id or .class"
				class="text-input"
			/>
			<p class="help-text">Use #id or .class to select elements</p>
		</div>
	{/if}

	<!-- Apply Button -->
	{#if selectedOperationType}
		<button class="apply-button" onclick={applyOperation}>
			Apply Operation
		</button>
	{/if}
</div>

<style>
	.operation-picker {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-md) 0;
	}

	.operation-buttons {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
	}

	.operation-button {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.operation-button:hover {
		border-color: var(--color-border-emphasis);
	}

	.operation-button.selected {
		border-color: var(--color-fg-primary);
		background: var(--color-active);
	}

	.op-icon {
		font-size: 1.25rem;
	}

	.op-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.operation-controls {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.control-label {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.furniture-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.furniture-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-xs);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.furniture-button:hover {
		border-color: var(--color-border-emphasis);
	}

	.furniture-button.selected {
		border-color: var(--color-fg-primary);
		background: var(--color-active);
		color: var(--color-fg-primary);
	}

	.position-input {
		display: flex;
		gap: var(--space-md);
		margin-top: var(--space-sm);
	}

	.position-input label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.position-input input {
		width: 60px;
		padding: var(--space-xs);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	.people-slider {
		width: 100%;
		margin-bottom: var(--space-xs);
	}

	.count-display {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-family: var(--font-mono);
	}

	.text-input {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-sm);
	}

	.help-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.apply-button {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.apply-button:hover {
		opacity: 0.9;
	}
</style>
