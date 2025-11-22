<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { ExperimentCommand } from '$lib/types/paper';

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

	let history = $state<string[]>([
		welcomeMessage || '🚀 Welcome to Create Something Terminal v2.0',
		'',
		'Built with SvelteKit + Cloudflare Workers',
		'Type "help" for available commands',
		''
	]);
	let currentInput = $state('');
	let commandHistory = $state<string[]>([]);
	let historyIndex = $state(-1);
	let currentPath = $state('/');

	// NEW: Experiment command tracking
	let suggestedCommand = $state('');
	let commandSequenceIndex = $state(0);

	let inputRef: HTMLInputElement;
	let terminalRef: HTMLDivElement;

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

		// Call API endpoint to process command
		try {
			const response = await fetch('/api/terminal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command, args: arg, path: currentPath })
			});

			if (!response.ok) {
				throw new Error(`Command failed: ${response.statusText}`);
			}

			const result = await response.json();

			// Handle special commands that affect terminal state
			if (command === 'cd' && result.newPath) {
				currentPath = result.newPath;
			}

			return result;
		} catch (error) {
			// Fallback for client-side commands
			return processClientCommand(command, arg);
		}
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
  papers            List all technical papers
  read <id>         Read a paper by ID
  search <query>    Search papers
  save <id>         Save paper to collection
  saved             View saved papers
  about             About Create Something
  contact           Contact information
  theme <dark|light> Change terminal theme
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

			case 'about':
				return {
					output: `
Create Something Terminal v2.0
───────────────────────────────
Built with:
• SvelteKit - Type-safe, edge-native framework
• Cloudflare Workers - Global edge computing
• D1 Database - Distributed SQLite
• KV Store - Session management
• R2 Storage - Object storage

© 2024 Create Something Agency
					`.trim(),
					type: 'info'
				};

			case 'contact':
				return {
					output: `
Contact Create Something:
• Email: hello@createsomething.agency
• GitHub: github.com/createsomethingtoday
• Twitter: @createsomething
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

<div class="h-screen bg-black border border-white/10 rounded-lg font-mono flex flex-col overflow-hidden">
	<!-- Terminal Header -->
	<div class="bg-black border-b border-white/10 px-6 py-4 flex items-center justify-between">
		<div class="text-white/60 text-sm font-medium">
			{currentPath}
		</div>
		<div class="text-white/40 text-xs">
			{commandHistory.length} {commandHistory.length === 1 ? 'command' : 'commands'}
		</div>
	</div>

	<!-- Command Suggestion Bar -->
	{#if suggestedCommand && suggestedCommand !== currentInput && commandSequenceIndex < commands.length}
		<div class="bg-white/5 border-b border-white/10 px-6 py-3 flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm">
				<span class="text-white/40">Next:</span>
				<code class="text-white font-mono text-sm">{suggestedCommand}</code>
				{#if commands[commandSequenceIndex].description}
					<span class="text-white/30 text-xs ml-2">
						{commands[commandSequenceIndex].description}
					</span>
				{/if}
			</div>
			<button
				onclick={useSuggestion}
				type="button"
				class="text-xs px-4 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20 font-medium"
			>
				Use →
			</button>
		</div>
	{/if}

	<!-- Terminal Content -->
	<div
		bind:this={terminalRef}
		class="flex-1 overflow-y-auto p-6 text-white/80"
		onclick={() => inputRef?.focus()}
		role="button"
		tabindex="-1"
	>
		{#each history as line, i (i)}
			<div class="whitespace-pre-wrap">
				{line}
			</div>
		{/each}

		<!-- Input Line -->
		<form onsubmit={handleSubmit} class="flex items-center mt-2">
			<span class="text-white/60 mr-3">
				$
			</span>
			<input
				bind:this={inputRef}
				bind:value={currentInput}
				onkeydown={handleKeyDown}
				type="text"
				class="flex-1 bg-transparent outline-none text-white placeholder:text-white/30"
				placeholder="Type a command..."
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck={false}
			/>
			<span class="text-white/40 animate-pulse ml-1">│</span>
		</form>
	</div>
</div>
