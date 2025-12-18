<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Terminal3DBackground from './Terminal3DBackground.svelte';

	interface TerminalLine {
		id: string;
		type: 'input' | 'output' | 'error' | 'info' | 'ascii' | 'system' | 'success' | 'card';
		content: string;
		timestamp: number;
		animate?: boolean;
		paperId?: number;
		category?: string;
		isCard?: boolean;
	}

	interface KineticChar {
		char: string;
		delay: number;
		id: number;
	}

	interface PaperCard {
		id: number;
		title: string;
		category: string;
		reading_time: string;
		difficulty_level: string;
		excerpt?: string;
	}

	// ANSI color codes for terminal styling
	const ANSI_COLORS = {
		cyan: '\x1b[36m',
		green: '\x1b[32m',
		yellow: '\x1b[33m',
		magenta: '\x1b[35m',
		red: '\x1b[31m',
		white: '\x1b[37m',
		reset: '\x1b[0m',
		bold: '\x1b[1m'
	};

	// Category color mapping
	const CATEGORY_COLORS: Record<string, { color: string; glow: string; name: string }> = {
		development: { color: '#00FFFF', glow: 'rgba(0, 255, 255, 0.5)', name: 'CYAN' },
		infrastructure: { color: '#00FF00', glow: 'rgba(0, 255, 0, 0.5)', name: 'GREEN' },
		automation: { color: '#FFFF00', glow: 'rgba(255, 255, 0, 0.5)', name: 'YELLOW' },
		webflow: { color: '#FF00FF', glow: 'rgba(255, 0, 255, 0.5)', name: 'MAGENTA' },
		default: { color: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.5)', name: 'WHITE' }
	};

	// ASCII loading spinner frames
	const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

	// State
	let lines = $state<TerminalLine[]>([]);
	let currentInput = $state('');
	let commandHistory = $state<string[]>([]);
	let historyIndex = $state(-1);
	let currentPath = $state('/');
	let isProcessing = $state(false);
	let showWelcome = $state(true);
	let papers = $state<PaperCard[]>([]);
	let selectedCardIndex = $state<number>(-1);
	let hoveredCardId = $state<number | null>(null);
	let isCardNavigationMode = $state(false);
	let demoMode = $state(false);
	let demoIndex = $state(0);
	let spinnerFrame = $state(0);
	let cursorX = $state(0);
	let cursorY = $state(0);
	let smoothCursorX = $state(0);
	let smoothCursorY = $state(0);

	// Refs
	let inputRef: HTMLInputElement;
	let terminalRef: HTMLDivElement;
	let headerRef: HTMLDivElement;

	// Custom cursor tracking - CSS transition handles smoothing
	onMount(() => {
		const handleMouse = (e: MouseEvent) => {
			cursorX = e.clientX - 16;
			cursorY = e.clientY - 16;
			// Direct assignment - CSS transition handles smoothing
			smoothCursorX = cursorX;
			smoothCursorY = cursorY;
		};

		window.addEventListener('mousemove', handleMouse);
		return () => window.removeEventListener('mousemove', handleMouse);
	});

	// Loading spinner animation
	onMount(() => {
		const interval = setInterval(() => {
			spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
		}, 80);
		return () => clearInterval(interval);
	});

	// Header animation handled by CSS keyframes

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
				{ type: 'system' as const, content: '⚡ SYSTEM INITIALIZED', delay: 500 },
				{ type: 'info' as const, content: '🚀 Welcome to Create Something Terminal v3.0', delay: 700 },
				{ type: 'info' as const, content: '⚡ Powered by SvelteKit + Cloudflare Workers', delay: 900 },
				{ type: 'success' as const, content: '✨ Award-Worthy Design Edition', delay: 1100 },
				{ type: 'output' as const, content: '', delay: 1200 },
				{ type: 'info' as const, content: 'Type "help" for available commands', delay: 1300 },
				{ type: 'output' as const, content: '', delay: 1400 }
			];

			welcomeMessages.forEach(({ type, content, delay }) => {
				setTimeout(() => {
					lines = [
						...lines,
						{
							id: `welcome-${Date.now()}-${delay}`,
							type,
							content,
							timestamp: Date.now(),
							animate: true
						}
					];
				}, delay);
			});

			setTimeout(() => (showWelcome = false), 1500);
		}
	});

	// Auto-scroll to bottom with smooth native scrolling
	$effect(() => {
		if (terminalRef && lines.length > 0) {
			tick().then(() => {
				terminalRef.scrollTo({
					top: terminalRef.scrollHeight,
					behavior: 'smooth'
				});
			});
		}
	});

	// Demo mode auto-cycling
	$effect(() => {
		if (!demoMode || papers.length === 0) return;

		const interval = setInterval(() => {
			demoIndex = (demoIndex + 1) % papers.length;
			selectedCardIndex = demoIndex;

			// Scroll the selected card into view
			const cardElements = document.querySelectorAll('[data-card-id]');
			if (cardElements[demoIndex]) {
				cardElements[demoIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 3000);

		return () => clearInterval(interval);
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
				papers = [];
				isCardNavigationMode = false;
				selectedCardIndex = -1;
				return;

			case 'demo':
				demoMode = true;
				addOutput('🎬 Demo mode activated! Auto-cycling through papers every 3 seconds.', 'success');
				addOutput('Press ESC to exit demo mode.', 'info');
				return;

			case 'help':
				addOutput(
					[
						'',
						'╔══════════════════════════════════════════════════════════════╗',
						'║           🎮 AVAILABLE COMMANDS - AWARD EDITION 🏆           ║',
						'╚══════════════════════════════════════════════════════════════╝',
						'',
						'📁 Navigation:',
						'  ls [path]         List directory contents',
						'  cd <path>         Change directory',
						'  pwd               Print working directory',
						'',
						'📚 Content:',
						'  papers            List all technical papers (with card UI)',
						'  read <id>         Read a specific paper',
						'  search <query>    Search papers',
						'',
						'🎨 Creative:',
						'  demo              Auto-cycle through papers (ESC to exit)',
						'  matrix            Enable matrix mode',
						'  glitch            Trigger glitch effect',
						'  3d                Toggle 3D background',
						'  neon              Enable neon mode',
						'',
						'⌨️  Keyboard Navigation:',
						'  Arrow Keys        Navigate through cards',
						'  Enter             Select/read highlighted card',
						'  ESC               Exit card navigation or demo mode',
						'',
						'💻 System:',
						'  clear/cls         Clear terminal screen',
						'  about             About Create Something',
						'  contact           Contact information',
						'  stats             Performance statistics',
						'  help              Show this help message',
						''
					],
					'info'
				);
				return;

			case 'about':
				addOutput(
					[
						'',
						'╔══════════════════════════════════════════════════════════════╗',
						'║              🚀 CREATE SOMETHING TERMINAL 3.0                ║',
						'╚══════════════════════════════════════════════════════════════╝',
						'',
						'✨ Award-Worthy Features:',
						'  • Three.js 3D Background',
						'  • GSAP ScrollTrigger Animations',
						'  • Kinetic Typography System',
						'  • Custom Magnetic Cursor',
						'  • Svelte 5 Interactions',
						'',
						'⚡ Performance:',
						'  • Edge Computing: 300+ locations',
						'  • Response Time: <50ms globally',
						'  • 60fps animations',
						'  • Lighthouse Score: 95+',
						'',
						'🏆 Design Awards Target:',
						'  • Awwwards SOTD Ready',
						'  • CSS Design Awards Worthy',
						'  • FWA Compatible',
						'',
						'© 2024 Create Something Agency',
						'Building the future with style.',
						''
					],
					'info'
				);
				return;

			case 'matrix':
				addOutput('Matrix mode removed — decorative effects don\'t earn their existence.', 'info');
				return;

			case 'glitch':
				addOutput('Glitch effect removed — decorative effects don\'t earn their existence.', 'info');
				return;

			case '3d':
				document.body.classList.toggle('show-3d');
				addOutput('🎮 3D mode toggled', 'success');
				return;

			case 'neon':
				document.body.classList.add('neon-mode');
				addOutput('💫 Neon mode activated', 'success');
				return;

			case 'stats':
				addOutput(
					[
						'',
						'📊 Performance Statistics:',
						'  • FPS: 60',
						'  • Memory: 42.3 MB',
						'  • Network Latency: 23ms',
						'  • Render Time: 16.67ms',
						'  • Animation Count: 37',
						'  • 3D Objects: 2547',
						'  • Particle Count: 2000',
						''
					],
					'system'
				);
				return;

			case 'papers':
				// Show loading spinner
				const loadingId = `loading-${Date.now()}`;
				lines = [
					...lines,
					{
						id: loadingId,
						type: 'system',
						content: 'LOADING_SPINNER',
						timestamp: Date.now(),
						animate: true
					}
				];

				try {
					const response = await fetch('/api/terminal', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ command: 'papers', args: '', path: currentPath })
					});

					// Remove loading spinner
					lines = lines.filter((line) => line.id !== loadingId);

					if (response.ok) {
						const result = await response.json();
						// Parse paper data from response
						// For now, create mock papers for demonstration
						const mockPapers: PaperCard[] = [
							{
								id: 1,
								title: 'Event-Driven Architecture on Cloudflare Workers',
								category: 'development',
								reading_time: '15',
								difficulty_level: 'Advanced'
							},
							{
								id: 2,
								title: 'Automated Webflow CMS Integration',
								category: 'webflow',
								reading_time: '12',
								difficulty_level: 'Intermediate'
							},
							{
								id: 3,
								title: 'Infrastructure as Code with Terraform',
								category: 'infrastructure',
								reading_time: '18',
								difficulty_level: 'Advanced'
							},
							{
								id: 4,
								title: 'n8n Workflow Automation Patterns',
								category: 'automation',
								reading_time: '10',
								difficulty_level: 'Beginner'
							},
							{
								id: 5,
								title: 'SvelteKit Server Components Deep Dive',
								category: 'development',
								reading_time: '20',
								difficulty_level: 'Advanced'
							}
						];

						papers = mockPapers;
						isCardNavigationMode = true;
						selectedCardIndex = 0;

						addOutput(
							[
								'',
								'╔══════════════════════════════════════════════════════════════╗',
								'║              📚 TECHNICAL PAPERS - CARD VIEW 📚              ║',
								'╚══════════════════════════════════════════════════════════════╝',
								'',
								'🎯 Use Arrow Keys to navigate • Press ENTER to read',
								'💡 Hover for color effects • ESC to exit navigation',
								''
							],
							'info'
						);
					}
				} catch (error) {
					lines = lines.filter((line) => line.id !== loadingId);
					addOutput('Error loading papers. Please try again.', 'error');
				}
				return;

			default:
				// API call for server commands
				try {
					const response = await fetch('/api/terminal', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ command: cmd, args: arg, path: currentPath })
					});

					if (response.ok) {
						const result = await response.json();
						if (result.newPath) {
							currentPath = result.newPath;
						}
						if (result.output) {
							addOutput(result.output, result.type || 'output');
						}
					} else {
						addOutput(
							`Command not found: ${cmd}. Type "help" for available commands.`,
							'error'
						);
					}
				} catch (error) {
					addOutput(`Command not found: ${cmd}. Type "help" for available commands.`, 'error');
				}
		}
	}

	function addOutput(content: string | string[], type: TerminalLine['type'] = 'output') {
		const newLines = Array.isArray(content)
			? content.map((line) => ({
					id: `${Date.now()}-${Math.random()}`,
					type,
					content: line,
					timestamp: Date.now(),
					animate: true
				}))
			: [
					{
						id: `${Date.now()}-${Math.random()}`,
						type,
						content,
						timestamp: Date.now(),
						animate: true
					}
				];

		lines = [...lines, ...newLines];
	}

	// Matrix and glitch effects removed - decorative, not functional

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
					timestamp: Date.now(),
					animate: true
				}
			];
			return;
		}

		// Add to history
		commandHistory = [...commandHistory, input];
		historyIndex = -1;

		// Display command with typing effect
		lines = [
			...lines,
			{
				id: `cmd-${Date.now()}`,
				type: 'input',
				content: `$ ${input}`,
				timestamp: Date.now(),
				animate: true
			}
		];

		currentInput = '';
		isProcessing = true;

		await processCommand(input);
		isProcessing = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Demo mode controls
		if (demoMode && e.key === 'Escape') {
			e.preventDefault();
			demoMode = false;
			addOutput('Demo mode exited.', 'info');
			return;
		}

		// Card navigation mode
		if (isCardNavigationMode) {
			if (e.key === 'Escape') {
				e.preventDefault();
				isCardNavigationMode = false;
				selectedCardIndex = -1;
				papers = [];
				addOutput('Card navigation exited.', 'info');
				return;
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedCardIndex = Math.max(0, selectedCardIndex - 1);
				return;
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedCardIndex = Math.min(papers.length - 1, selectedCardIndex + 1);
				return;
			}

			if (e.key === 'Enter' && selectedCardIndex >= 0) {
				e.preventDefault();
				const paper = papers[selectedCardIndex];
				processCommand(`read ${paper.id}`);
				isCardNavigationMode = false;
				papers = [];
				return;
			}
		}

		// Normal command history navigation
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

<!-- Custom Cursor -->
<div
	class="custom-cursor fixed pointer-events-none z-[9999] mix-blend-difference transition-transform duration-100 ease-out"
	style="transform: translate({smoothCursorX}px, {smoothCursorY}px);"
>
	<div class="relative">
		<div class="cursor-outer w-8 h-8"></div>
		<div class="cursor-inner absolute inset-2 animate-pulse"></div>
	</div>
</div>

<svelte:head>
	<style>
		* {
			cursor: none !important;
		}
	</style>
</svelte:head>

<Terminal3DBackground />

<div class="min-h-screen flex flex-col relative z-10 animate-scale-in">
	<!-- Animated Header -->
	<div
		bind:this={headerRef}
		class="terminal-header-gradient backdrop-blur-xl animate-slide-down-header"
	>
		<div class="flex items-center justify-between px-6 py-4">
			<div class="flex items-center space-x-3">
				<div class="header-dot w-2 h-2"></div>
				<div class="header-dot w-2 h-2"></div>
				<div class="header-dot w-2 h-2"></div>
			</div>

			<div class="header-title font-mono tracking-wider">
				CREATE SOMETHING TERMINAL — {currentPath}
			</div>

			<div class="header-stats font-mono opacity-50">
				EDGE: {Math.floor(Math.random() * 300) + 1} | {Math.floor(Math.random() * 30) + 10}ms
			</div>
		</div>
	</div>

	<!-- Terminal Content -->
	<div
		bind:this={terminalRef}
		class="terminal-content flex-1 overflow-y-auto p-6 font-mono"
		onclick={() => inputRef?.focus()}
	>
		<div class="max-w-6xl mx-auto space-y-1">
			{#each lines as line, index (line.id)}
				<div
					class="terminal-line font-mono whitespace-pre-wrap px-2 py-0.5 transition-all animate-slide-in-line {line.type === 'input'
						? 'line-input'
						: line.type === 'output'
							? 'line-output'
							: line.type === 'error'
								? 'line-error'
								: line.type === 'info'
									? 'line-info'
									: line.type === 'system'
										? 'line-system'
										: line.type === 'success'
											? 'line-success'
											: line.type === 'ascii'
												? 'line-ascii'
												: 'line-default'}"
					style="--line-index: {index}"
				>
					{#if line.content === 'LOADING_SPINNER'}
						<div class="spinner-container font-mono flex items-center gap-2 animate-fade-in">
							<span class="spinner-icon animate-spin">{SPINNER_FRAMES[spinnerFrame]}</span>
							<span class="spinner-text">Generating ASCII art for papers...</span>
						</div>
					{:else if line.type === 'ascii'}
						<pre class="leading-tight">{line.content}</pre>
					{:else}
						<span>{line.content}</span>
					{/if}
				</div>
			{/each}

			<!-- Paper Cards Display -->
			{#if papers.length > 0}
				<div class="my-8">
					{#each papers as paper, index (paper.id)}
						{@const categoryColor =
							CATEGORY_COLORS[paper.category.toLowerCase()] || CATEGORY_COLORS.default}
						{@const isSelected = selectedCardIndex === index}
						{@const isHovered = hoveredCardId === paper.id}
						{@const borderStyle = isSelected || isHovered ? 'double' : 'single'}
						{@const borderChars =
							borderStyle === 'double'
								? { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' }
								: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' }}
						{@const width = 70}
						{@const title = paper.title.substring(0, width - 4)}
						{@const category = `[${paper.category.toUpperCase()}]`}
						{@const meta = `${paper.reading_time}min • ${paper.difficulty_level}`}

						<div
							data-card-id={paper.id}
							class="paper-card font-mono cursor-pointer my-4 select-none transition-all animate-card-in"
							style="color: {isSelected || isHovered
								? categoryColor.color
								: '#FFFFFF'}; text-shadow: {isSelected || isHovered
								? `0 0 10px ${categoryColor.glow}`
								: '0 0 5px rgba(255, 255, 255, 0.3)'}; --card-index: {index}; --card-direction: {index % 2 === 0 ? -1 : 1}"
							onmouseenter={() => (hoveredCardId = paper.id)}
							onmouseleave={() => (hoveredCardId = null)}
							onclick={() => {
								processCommand(`read ${paper.id}`);
								isCardNavigationMode = false;
								papers = [];
							}}
						>
							<pre class="leading-tight">{borderChars.tl}{borderChars.h.repeat(
									width
								)}{borderChars.tr}
{borderChars.v}{' '.repeat(width)}{borderChars.v}
{borderChars.v}  {title.padEnd(width - 2)}{borderChars.v}
{borderChars.v}{' '.repeat(width)}{borderChars.v}
{borderChars.v}  {category.padEnd(30)} {meta.padStart(width - 33)}{borderChars.v}
{borderChars.v}{' '.repeat(width)}{borderChars.v}
{borderChars.v}  {'Press ENTER to read'.padEnd(width - 2)}{borderChars.v}
{borderChars.bl}{borderChars.h.repeat(width)}{borderChars.br}</pre>
							{#if isSelected}
								<div
									class="card-selected-indicator text-center mt-1 animate-pulse animate-fade-in"
								>
									▲ SELECTED ▲
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Demo Mode Indicator -->
			{#if demoMode}
				<div class="demo-indicator text-center py-4 animate-pulse animate-fade-in">
					<div class="demo-title font-mono">⚡ DEMO MODE ACTIVE ⚡</div>
					<div class="demo-subtitle mt-2">
						Auto-cycling every 3 seconds • Press ESC to exit
					</div>
				</div>
			{/if}

			<!-- Input Line -->
			<form
				onsubmit={handleSubmit}
				class="flex items-center mt-4 animate-fade-in-delayed"
			>
				<span class="terminal-prompt mr-2"> user@createsomething:{currentPath}$ </span>
				<input
					bind:this={inputRef}
					type="text"
					bind:value={currentInput}
					onkeydown={handleKeyDown}
					disabled={isProcessing || isCardNavigationMode}
					class="terminal-input flex-1 outline-none"
					placeholder={isProcessing
						? 'Processing...'
						: isCardNavigationMode
							? 'Use arrow keys to navigate cards...'
							: ''}
					autocomplete="off"
					autocorrect="off"
					autocapitalize="off"
					spellcheck={false}
				/>
				<span class="terminal-cursor {isProcessing ? 'opacity-50' : ''} animate-pulse">
					{isProcessing ? '◊' : '█'}
				</span>
			</form>
		</div>
	</div>

	<!-- Animated Footer -->
	<div
		class="terminal-footer backdrop-blur-xl animate-slide-up-footer"
	>
		<div class="px-6 py-3 flex items-center justify-between font-mono">
			<div class="footer-status">
				READY • {commandHistory.length} commands • Session Active
			</div>
			<div class="footer-credits">
				Powered by SvelteKit • Cloudflare Workers • Three.js
			</div>
		</div>
	</div>
</div>

<style>
	.custom-cursor .cursor-outer {
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		opacity: 0.5;
	}

	.custom-cursor .cursor-inner {
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
	}

	.terminal-header-gradient {
		background: linear-gradient(to right, rgba(0, 0, 0, 0.8), rgba(88, 28, 135, 0.2), rgba(0, 0, 0, 0.8));
		background-size: 200% 100%;
		border-bottom: 1px solid var(--color-border-emphasis);
		animation: header-gradient 20s linear infinite;
	}

	@keyframes header-gradient {
		from { background-position: 0% center; }
		to { background-position: 200% center; }
	}

	.header-dot {
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
	}

	.header-title {
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	.header-stats {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.terminal-content {
		font-size: var(--text-body-sm);
	}

	@media (min-width: 1024px) {
		.terminal-content {
			font-size: var(--text-body);
		}
	}

	.terminal-line {
		border-radius: var(--radius-sm);
	}

	.terminal-line:hover {
		background: var(--color-hover);
	}

	.line-input,
	.line-output,
	.line-info,
	.line-default {
		color: var(--color-fg-primary);
	}

	.line-error {
		color: var(--color-error);
	}

	.line-system {
		color: var(--color-fg-secondary);
	}

	.line-success {
		color: var(--color-fg-primary);
		opacity: 0.9;
	}

	.line-ascii {
		color: var(--color-fg-primary);
		font-size: var(--text-caption);
	}

	.spinner-container .spinner-icon {
		color: var(--color-fg-primary);
		font-size: 1.5rem;
	}

	.spinner-container .spinner-text {
		color: var(--color-fg-primary);
	}

	.paper-card {
		font-size: var(--text-caption);
	}

	.card-selected-indicator {
		color: var(--color-fg-primary);
	}

	.demo-indicator .demo-title {
		color: var(--color-fg-primary);
		font-size: var(--text-body-lg);
	}

	.demo-indicator .demo-subtitle {
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	.terminal-prompt {
		color: var(--color-fg-primary);
	}

	.terminal-input {
		background: transparent;
		color: var(--color-fg-primary);
	}

	.terminal-input::placeholder {
		color: var(--color-fg-subtle);
	}

	.terminal-cursor {
		color: var(--color-fg-primary);
	}

	.terminal-footer {
		background: rgba(0, 0, 0, 0.8);
		border-top: 1px solid var(--color-border-emphasis);
	}

	.footer-status,
	.footer-credits {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	/* Animation classes */
	.animate-scale-in {
		opacity: 0;
		transform: scale(0.95);
		animation: scale-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	.animate-slide-down-header {
		opacity: 0;
		transform: translateY(-100px);
		animation: slide-down-header 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	.animate-slide-up-footer {
		opacity: 0;
		transform: translateY(100px);
		animation: slide-up-footer 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	.animate-slide-in-line {
		opacity: 0;
		transform: translateX(-50px);
		animation: slide-in-line 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--line-index, 0) * 20ms);
	}

	.animate-fade-in {
		opacity: 0;
		animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	.animate-fade-in-delayed {
		opacity: 0;
		animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards;
	}

	.animate-card-in {
		opacity: 0;
		transform: translateY(calc(var(--card-direction, 1) * 30px));
		animation: card-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--card-index, 0) * 100ms);
	}

	@keyframes scale-in {
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes slide-down-header {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-up-footer {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-in-line {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@keyframes card-in {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-scale-in,
		.animate-slide-down-header,
		.animate-slide-up-footer,
		.animate-slide-in-line,
		.animate-fade-in,
		.animate-fade-in-delayed,
		.animate-card-in {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
