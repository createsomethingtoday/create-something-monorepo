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
	import Sofa from 'lucide-svelte/icons/sofa';
	import Users from 'lucide-svelte/icons/users';
	import Tag from 'lucide-svelte/icons/tag';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Circle from 'lucide-svelte/icons/circle';
	import BedDouble from 'lucide-svelte/icons/bed-double';
	import Armchair from 'lucide-svelte/icons/armchair';
	import Square from 'lucide-svelte/icons/square';
	import Flower2 from 'lucide-svelte/icons/flower-2';

	// Icon component mapping
	const iconMap: Record<string, typeof Sofa> = {
		sofa: Sofa,
		users: Users,
		tag: Tag,
		'trash-2': Trash2,
		circle: Circle,
		'bed-double': BedDouble,
		armchair: Armchair,
		square: Square,
		'flower-2': Flower2
	};

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
			{@const IconComponent = iconMap[op.icon]}
			<button
				class="operation-button"
				class:selected={selectedOperationType === op.type}
				onclick={() => (selectedOperationType = op.type)}
				title={op.description}
			>
				<span class="op-icon">
					{#if IconComponent}
						<IconComponent size={20} strokeWidth={1.5} />
					{/if}
				</span>
				<span class="op-name">{op.name}</span>
			</button>
		{/each}
	</div>

	<!-- Operation-specific controls -->
	{#if selectedOperationType === 'add-furniture'}
		<div class="operation-controls">
			<p class="control-label">Furniture Type</p>
			<div class="furniture-grid">
				{#each furnitureTypes as f}
					{@const FurnitureIcon = iconMap[f.icon]}
					<button
						class="furniture-button"
						class:selected={selectedFurniture === f.type}
						onclick={() => (selectedFurniture = f.type)}
					>
						<span class="furniture-icon">
							{#if FurnitureIcon}
								<FurnitureIcon size={16} strokeWidth={1.5} />
							{/if}
						</span>
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
			<p class="control-label">Number of People</p>
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
			<p class="control-label">Label Text</p>
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
			<p class="control-label">Element Selector</p>
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
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
	}

	h3 {
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin: 0 0 var(--space-performance-md) 0;
	}

	.operation-buttons {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-md);
	}

	.operation-button {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-md);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.operation-button:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.operation-button.selected {
		border-color: var(--color-performance-fg-primary);
		background: var(--color-performance-active);
	}

	.op-icon {
		font-size: 1.25rem;
	}

	.op-name {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
	}

	.operation-controls {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-md);
		margin-bottom: var(--space-performance-md);
	}

	.control-label {
		display: block;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
	}

	.furniture-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-sm);
	}

	.furniture-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-performance-xs);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		cursor: pointer;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.furniture-button:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.furniture-button.selected {
		border-color: var(--color-performance-fg-primary);
		background: var(--color-performance-active);
		color: var(--color-performance-fg-primary);
	}

	.position-input {
		display: flex;
		gap: var(--space-performance-md);
		margin-top: var(--space-performance-sm);
	}

	.position-input label {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.position-input input {
		width: 60px;
		padding: var(--space-performance-xs);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
	}

	.people-slider {
		width: 100%;
		margin-bottom: var(--space-performance-xs);
	}

	.count-display {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
		font-family: var(--font-performance-mono);
	}

	.text-input {
		width: 100%;
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
		margin-bottom: var(--space-performance-sm);
	}

	.help-text {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin: 0;
	}

	.apply-button {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-medium);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.apply-button:hover {
		opacity: 0.9;
	}
</style>
