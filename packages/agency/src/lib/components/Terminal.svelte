<script lang="ts">
	import { onMount, tick } from 'svelte';

	interface Props {
		welcomeMessage?: string;
		commands?: string[];
	}

	interface CommandResponse {
		output: string;
		type: 'success' | 'error' | 'info';
		clearScreen?: boolean;
		newPath?: string;
	}

	let { welcomeMessage, commands = [] }: Props = $props();

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

	let inputRef: HTMLInputElement;
	let terminalRef: HTMLDivElement;

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

<div class="h-screen bg-gray-900 font-mono flex flex-col">
	<!-- Terminal Header -->
	<div class="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
		<div class="flex items-center space-x-2">
			<div class="w-3 h-3 bg-red-500 rounded-full"></div>
			<div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
			<div class="w-3 h-3 bg-green-500 rounded-full"></div>
		</div>
		<div class="text-gray-400 text-sm">
			Create Something Terminal — {currentPath}
		</div>
		<div class="text-gray-500 text-xs">
			SvelteKit + Cloudflare
		</div>
	</div>

	<!-- Terminal Content -->
	<div
		bind:this={terminalRef}
		class="flex-1 overflow-y-auto p-4 text-green-400"
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
		<form onsubmit={handleSubmit} class="flex items-center">
			<span class="text-cyan-400 mr-2">
				user@createsomething:{currentPath}$
			</span>
			<input
				bind:this={inputRef}
				bind:value={currentInput}
				onkeydown={handleKeyDown}
				type="text"
				class="flex-1 bg-transparent outline-none text-green-400"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck={false}
			/>
			<span class="animate-pulse">_</span>
		</form>
	</div>

	<!-- Terminal Footer -->
	<div class="bg-gray-800 border-t border-gray-700 p-2 text-xs text-gray-500 flex justify-between">
		<div>
			Ready • {commandHistory.length} commands
		</div>
		<div>
			Powered by Cloudflare Workers • Global Edge Network
		</div>
	</div>
</div>
