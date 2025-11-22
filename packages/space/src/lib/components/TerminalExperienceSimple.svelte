<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	interface TerminalLine {
		id: string;
		type: 'input' | 'output' | 'error' | 'info' | 'ascii' | 'system' | 'success';
		content: string;
		timestamp: number;
	}

	let lines = $state<TerminalLine[]>([]);
	let currentInput = $state('');
	let commandHistory = $state<string[]>([]);
	let historyIndex = $state(-1);
	let currentPath = $state('/');
	let isProcessing = $state(false);
	let showWelcome = $state(true);

	let inputRef: HTMLInputElement;
	let terminalRef: HTMLDivElement;

	// Welcome sequence
	onMount(() => {
		if (showWelcome) {
			const asciiArt = `
   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝`;

			const welcomeMessages = [
				{ type: 'ascii' as const, content: asciiArt, delay: 0 },
				{ type: 'system' as const, content: 'SYSTEM INITIALIZED', delay: 500 },
				{ type: 'info' as const, content: 'Welcome to Create Something Terminal v3.0', delay: 700 },
				{ type: 'info' as const, content: 'Powered by SvelteKit + Cloudflare Workers', delay: 900 },
				{ type: 'output' as const, content: '', delay: 1000 },
				{ type: 'info' as const, content: 'Type "help" for available commands', delay: 1100 },
				{ type: 'output' as const, content: '', delay: 1200 }
			];

			welcomeMessages.forEach(({ type, content, delay }) => {
				setTimeout(() => {
					lines = [
						...lines,
						{
							id: `welcome-${Date.now()}-${delay}`,
							type,
							content,
							timestamp: Date.now()
						}
					];
				}, delay);
			});

			setTimeout(() => (showWelcome = false), 1300);
		}
	});

	// Auto-scroll to bottom with smooth scroll
	$effect(() => {
		if (terminalRef && lines.length) {
			tick().then(() => {
				terminalRef.scrollTo({
					top: terminalRef.scrollHeight,
					behavior: 'smooth'
				});
			});
		}
	});

	async function processCommand(command: string) {
		const [cmd, ...args] = command.trim().toLowerCase().split(' ');
		const arg = args.join(' ');

		switch (cmd) {
			case '':
				return;

			case 'clear':
			case 'cls':
				lines = [];
				return;

			case 'help':
				addOutput(
					[
						'',
						'╔════════════════════════════════════════════════════════╗',
						'║                  AVAILABLE COMMANDS                    ║',
						'╚════════════════════════════════════════════════════════╝',
						'',
						'Navigation:',
						'  ls [path]         List directory contents',
						'  cd <path>         Change directory',
						'  pwd               Print working directory',
						'',
						'Content:',
						'  papers            List all technical papers',
						'  read <id>         Read a specific paper',
						'  search <query>    Search papers',
						'',
						'System:',
						'  clear/cls         Clear terminal screen',
						'  about             About Create Something',
						'  contact           Contact information',
						'  help              Show this help message',
						'',
						'────────────────────────────────────────────────────────',
						'Tip: Use ↑/↓ for command history',
						''
					],
					'info'
				);
				return;

			case 'about':
				addOutput(
					[
						'',
						'╔════════════════════════════════════════════════════════╗',
						'║              CREATE SOMETHING TERMINAL                 ║',
						'╚════════════════════════════════════════════════════════╝',
						'',
						'Version: 3.0.0',
						'Platform: SvelteKit + Cloudflare Workers',
						'',
						'Infrastructure:',
						'  • Edge Computing: 300+ global locations',
						'  • Database: Cloudflare D1 (SQLite at edge)',
						'  • Storage: Cloudflare R2',
						'  • Cache: Cloudflare KV',
						'',
						'Performance:',
						'  • Cold Start: ~14ms',
						'  • Global Latency: <50ms',
						'  • Availability: 99.99%',
						'',
						'© 2024 Create Something Agency',
						'Building the future, one command at a time.',
						''
					],
					'info'
				);
				return;

			case 'contact':
				addOutput(
					[
						'',
						'╔════════════════════════════════════════════════════════╗',
						'║                   CONTACT US                           ║',
						'╚════════════════════════════════════════════════════════╝',
						'',
						'Email:    hello@createsomething.agency',
						'GitHub:   github.com/createsomethingtoday',
						'Twitter:  @createsomething',
						'Web:      createsomething.agency',
						''
					],
					'info'
				);
				return;

			case 'pwd':
				addOutput(currentPath, 'output');
				return;

			default:
				// Server-side commands
				try {
					const response = await fetch('/api/terminal', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ command: cmd, args: arg, path: currentPath })
					});

					if (!response.ok) {
						addOutput(`Error: ${response.statusText}`, 'error');
						return;
					}

					const result = await response.json();

					if (result.newPath) {
						currentPath = result.newPath;
					}

					if (result.output) {
						addOutput(result.output, result.type || 'output');
					}
				} catch (error) {
					addOutput(
						`Command not found: ${cmd}. Type "help" for available commands.`,
						'error'
					);
				}
		}
	}

	function addOutput(
		content: string | string[],
		type: TerminalLine['type'] = 'output'
	) {
		const newLines = Array.isArray(content)
			? content.map((line) => ({
					id: `${Date.now()}-${Math.random()}`,
					type,
					content: line,
					timestamp: Date.now()
				}))
			: [
					{
						id: `${Date.now()}-${Math.random()}`,
						type,
						content,
						timestamp: Date.now()
					}
				];

		lines = [...lines, ...newLines];
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isProcessing) return;

		const input = currentInput.trim();
		if (!input) {
			lines = [
				...lines,
				{
					id: `empty-${Date.now()}`,
					type: 'input',
					content: '$ ',
					timestamp: Date.now()
				}
			];
			return;
		}

		// Add to history
		commandHistory = [...commandHistory, input];
		historyIndex = -1;

		// Display command
		lines = [
			...lines,
			{
				id: `cmd-${Date.now()}`,
				type: 'input',
				content: `$ ${input}`,
				timestamp: Date.now()
			}
		];

		currentInput = '';
		isProcessing = true;

		await processCommand(input);
		isProcessing = false;
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
		}
	}
</script>

<div
	class="min-h-screen flex flex-col"
	style="background: #000000; color: #ffffff;"
	in:fade={{ duration: 500 }}
>
	<!-- Terminal Header -->
	<div class="bg-black border-b border-white/20" in:fly={{ y: -50, duration: 500, delay: 200 }}>
		<div class="flex items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 rounded-full bg-white/30"></div>
				<div class="w-3 h-3 rounded-full bg-white/30"></div>
				<div class="w-3 h-3 rounded-full bg-white/30"></div>
			</div>
			<div class="font-mono text-sm tracking-wider text-white">
				CREATE SOMETHING TERMINAL — {currentPath}
			</div>
			<div class="font-mono text-xs text-white/50">SvelteKit + Cloudflare</div>
		</div>
	</div>

	<!-- Terminal Content -->
	<div
		class="flex-1 overflow-hidden flex items-center justify-center p-4"
		in:fade={{ duration: 500, delay: 400 }}
	>
		<div
			class="w-full max-w-6xl h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-white/20"
		>
			<div
				bind:this={terminalRef}
				class="h-[calc(100%-4rem)] overflow-y-auto p-6 font-mono text-sm"
				onclick={() => inputRef?.focus()}
				style="background: #000000;"
				role="button"
				tabindex="-1"
			>
				{#each lines as line, i (line.id)}
					<div
						class="whitespace-pre-wrap mb-1 {line.type === 'ascii'
							? 'text-xs lg:text-sm leading-tight'
							: ''}"
						style="color: #ffffff;"
						in:fly={{ y: -5, duration: 200, delay: i < 7 ? i * 80 : 0 }}
					>
						{line.content}
					</div>
				{/each}
			</div>

			<!-- Input Line -->
			<div
				class="border-t border-white/20 px-6 py-3"
				style="background: #000000;"
				onclick={() => inputRef?.focus()}
				role="button"
				tabindex="-1"
			>
				<form onsubmit={handleSubmit} class="flex items-center font-mono text-sm">
					<span class="mr-2 text-white"> user@createsomething:{currentPath}$ </span>
					<input
						bind:this={inputRef}
						bind:value={currentInput}
						onkeydown={handleKeyDown}
						disabled={isProcessing}
						type="text"
						class="flex-1 bg-transparent border-none outline-none font-mono text-base text-white"
						style="caret-color: #ffffff;"
						placeholder={isProcessing ? 'Processing...' : ''}
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
						spellcheck={false}
						autofocus
					/>
					<span
						class="inline-block w-2 h-4 ml-1 bg-white"
						class:opacity-30={isProcessing}
						class:animate-pulse={!isProcessing}
					></span>
				</form>
			</div>
		</div>
	</div>

	<!-- Terminal Footer -->
	<div class="bg-black border-t border-white/20" in:fly={{ y: 50, duration: 500, delay: 600 }}>
		<div class="px-4 py-2 flex items-center justify-between text-xs font-mono">
			<div class="text-white/50">
				READY • {commandHistory.length} commands • Session Active
			</div>
			<div class="text-white/50">Powered by Cloudflare Workers • SvelteKit</div>
		</div>
	</div>
</div>
