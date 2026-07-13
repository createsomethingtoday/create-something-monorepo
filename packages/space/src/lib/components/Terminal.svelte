<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { ExperimentCommand } from '$lib/types/paper';
	import { keyboardClick } from '@create-something/canon';

	interface Props {
		welcomeMessage?: string;
		commands?: ExperimentCommand[]; // Changed from string[] to ExperimentCommand[]
		onCommandExecuted?: (command: string, result: any) => void;
	}

	interface CommandResponse {
		output: string;
		type: 'success' | 'error' | 'info';
		clearScreen?: boolean;
		newPath?: string;
	}

	let { welcomeMessage, commands = [], onCommandExecuted }: Props = $props();

	let history = $state<string[]>([]);
	let currentInput = $state('');
	let commandHistory = $state<string[]>([]);
	let historyIndex = $state(-1);
	let currentPath = $state('/');

	// NEW: Experiment command tracking
	let suggestedCommand = $state('');
	let commandSequenceIndex = $state(0);

	let inputRef: HTMLInputElement;
	let terminalRef: HTMLDivElement;
	let didInitHistory = false;

	$effect(() => {
		if (didInitHistory) return;
		history = [
			welcomeMessage || '🚀 Welcome to Create Something Terminal v2.0',
			'',
			'Built with SvelteKit + Cloudflare Workers',
			'Type "help" for available commands',
			''
		];
		didInitHistory = true;
	});

	// NEW: Update suggested command when commands are provided
	$effect(() => {
		if (commands.length > 0 && commandSequenceIndex < commands.length) {
			suggestedCommand = commands[commandSequenceIndex].command;
		} else {
			suggestedCommand = '';
		}
	});

	// Auto-focus input on mount
	onMount(() => {
		inputRef?.focus();
	});

	// Auto-scroll to bottom when history updates
	$effect(() => {
		if (terminalRef && history.length) {
			tick().then(() => {
				terminalRef.scrollTop = terminalRef.scrollHeight;
			});
		}
	});

	async function processCommand(input: string): Promise<CommandResponse> {
		const [command, ...args] = input.trim().split(' ');
		const arg = args.join(' ');

		return processClientCommand(command, arg);
	}

	function processClientCommand(command: string, arg: string): CommandResponse {
		switch (command.toLowerCase()) {
			case 'help':
				return {
					output: `
Available commands:
  help              Show this help message
  clear             Clear terminal screen
  ls [path]         List directory contents
  cd <path>         Change directory
  pwd               Show current directory
  about             About Create Something
  contact           Contact information
						`.trim(),
						type: 'info'
					};

			case 'clear':
				return {
					output: '',
					type: 'success',
					clearScreen: true
				};

			case 'pwd':
				return {
					output: currentPath,
					type: 'success'
				};

			case 'ls':
				if (currentPath === '/' || !currentPath) {
					return {
						output: `/
├── experiments/
├── docs/
└── help/`,
						type: 'success'
					};
				}

				return {
					output: `Directory not found: ${currentPath}`,
					type: 'error'
				};

			case 'cd': {
				if (!arg || arg === '~' || arg === '/') {
					return {
						output: '',
						type: 'success',
						newPath: '/'
					};
				}

				if (arg === '..') {
					const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
					return {
						output: '',
						type: 'success',
						newPath: parentPath
					};
				}

				const newPath = arg.startsWith('/')
					? arg
					: currentPath === '/'
					? `/${arg}`
					: `${currentPath}/${arg}`;

				return {
					output: '',
					type: 'success',
					newPath
				};
			}

			case 'about':
				return {
					output: `
Create Something Terminal v2.0
───────────────────────────────
Local terminal simulation for guided experiments.

The public /terminal route and API were retired.
						`.trim(),
						type: 'info'
				};

			case 'contact':
				return {
					output: `
Contact Create Something:
• Email: hello@createsomething.agency
• GitHub: github.com/createsomethingtoday
						`.trim(),
						type: 'info'
				};

			case '':
				return {
					output: '',
					type: 'success'
				};

			default:
				return {
					output: `Command not found: ${command}. Type "help" for available commands.`,
					type: 'error'
				};
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!currentInput.trim()) {
			history = [...history, `$ ${currentInput}`, ''];
			return;
		}

		// Add command to history
		commandHistory = [...commandHistory, currentInput];
		historyIndex = -1;

		// Display command in terminal
		history = [...history, `$ ${currentInput}`];

		// Process command
		const result = await processCommand(currentInput);
		if (result.newPath) {
			currentPath = result.newPath;
		}

		// NEW: Notify parent of command execution
		if (onCommandExecuted) {
			onCommandExecuted(currentInput, result);
		}

		// NEW: Advance command sequence if command matches
		const matchedCommand = commands.find(cmd =>
			cmd.command.toLowerCase() === currentInput.toLowerCase()
		);
		if (matchedCommand) {
			commandSequenceIndex++;
		}

		// Handle output
		if (result.clearScreen) {
			history = [];
		} else if (result.output) {
			history = [...history, result.output, ''];
		} else {
			history = [...history, ''];
		}

		// Clear input
		currentInput = '';
	}

	// NEW: Auto-complete suggested command
	function useSuggestion() {
		currentInput = suggestedCommand;
		inputRef?.focus();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (historyIndex < commandHistory.length - 1) {
				const newIndex = historyIndex + 1;
				historyIndex = newIndex;
				currentInput = commandHistory[commandHistory.length - 1 - newIndex];
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (historyIndex > 0) {
				const newIndex = historyIndex - 1;
				historyIndex = newIndex;
				currentInput = commandHistory[commandHistory.length - 1 - newIndex];
			} else if (historyIndex === 0) {
				historyIndex = -1;
				currentInput = '';
			}
		} else if (e.key === 'Tab') {
			e.preventDefault();
			// Add tab completion logic here
		}
	}
</script>

<div class="terminal-container h-screen font-mono flex flex-col overflow-hidden">
	<!-- Terminal Header -->
	<div class="terminal-header px-6 py-4 flex items-center justify-between">
		<div class="path-display font-medium">
			{currentPath}
		</div>
		<div class="command-counter">
			{commandHistory.length} {commandHistory.length === 1 ? 'command' : 'commands'}
		</div>
	</div>

	<!-- Command Suggestion Bar -->
	{#if suggestedCommand && suggestedCommand !== currentInput && commandSequenceIndex < commands.length}
		<div class="suggestion-bar px-6 py-3 flex items-center justify-between">
			<div class="flex items-center gap-2 suggestion-content">
				<span class="suggestion-label">Next:</span>
				<code class="suggested-command font-mono">{suggestedCommand}</code>
				{#if commands[commandSequenceIndex].description}
					<span class="suggestion-description ml-2">
						{commands[commandSequenceIndex].description}
					</span>
				{/if}
			</div>
			<button
				onclick={useSuggestion}
				type="button"
				class="suggestion-button px-4 py-1.5 font-medium"
			>
				Use →
			</button>
		</div>
	{/if}

	<!-- Terminal Content -->
	<div
		bind:this={terminalRef}
		class="terminal-content flex-1 overflow-y-auto p-6"
		onclick={() => inputRef?.focus()}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef?.focus(); } }}
		use:keyboardClick={{ onclick: () => inputRef?.focus() }}
		role="button"
		tabindex="0"
		aria-label="Terminal output area. Click or press Enter to focus the command input."
	>
		{#each history as line, i (i)}
			<div class="whitespace-pre-wrap">
				{line}
			</div>
		{/each}

		<!-- Input Line -->
		<form onsubmit={handleSubmit} class="flex items-center mt-2">
			<span class="prompt mr-3">
				$
			</span>
			<input
				bind:this={inputRef}
				bind:value={currentInput}
				onkeydown={handleKeyDown}
				type="text"
				class="terminal-input flex-1 outline-none"
				placeholder="Type a command..."
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck={false}
			/>
			<span class="cursor animate-pulse ml-1">│</span>
		</form>
	</div>
</div>

<style>
	.terminal-container {
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-lg);
	}

	.terminal-header {
		background: var(--color-performance-bg-pure);
	}

	.path-display {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
	}

	.command-counter {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
	}

	.suggestion-bar {
		background: var(--color-performance-hover);
	}

	.suggestion-content {
		font-size: var(--text-performance-body-sm);
	}

	.suggestion-label {
		color: var(--color-performance-fg-muted);
	}

	.suggested-command {
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
	}

	.suggestion-description {
		color: var(--color-performance-fg-subtle);
		font-size: var(--text-performance-caption);
	}

	.suggestion-button {
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-primary);
		border: 1px solid var(--color-performance-border-emphasis);
		border-radius: var(--radius-performance-scale-lg);
		font-size: var(--text-performance-caption);
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.suggestion-button:hover {
		background: var(--color-performance-active);
	}

	.terminal-content {
		color: var(--color-performance-fg-secondary);
	}

	.prompt {
		color: var(--color-performance-fg-tertiary);
	}

	.terminal-input {
		background: transparent;
		color: var(--color-performance-fg-primary);
	}

	.terminal-input::placeholder {
		color: var(--color-performance-fg-subtle);
	}

	.cursor {
		color: var(--color-performance-fg-muted);
	}
</style>
