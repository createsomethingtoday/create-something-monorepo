<script lang="ts">
	/**
	 * Hermeneutic Debugging Experiment
	 *
	 * Walk through the 8-iteration logo animation debugging case study.
	 * Experience the hermeneutic circle: each failed fix reveals hidden assumptions.
	 *
	 * Based on the paper at createsomething.io/papers/hermeneutic-debugging
	 */

	import { SEO } from '@create-something/canon';

	// Experiment tracking
	const PAPER_ID = 'file-hermeneutic-debugging';
	const sessionId = crypto.randomUUID();

	async function trackExperiment(action: 'start' | 'complete' | 'error', extra?: Record<string, unknown>) {
		try {
			await fetch('/api/experiments/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					paper_id: PAPER_ID,
					session_id: sessionId,
					...extra
				})
			});
		} catch {
			// Silent fail - tracking shouldn't break the experiment
		}
	}

	// Track experiment start on mount
	$effect(() => {
		trackExperiment('start');
	});

	// Iteration data
	interface Iteration {
		number: number;
		title: string;
		code: string;
		description: string;
		predictions: string[];
		correctPrediction: number; // Index of correct prediction
		bugDescription: string;
		hiddenAssumption: string;
		logs?: string; // Console logs for iteration 6
	}

	const iterations: Iteration[] = [
		{
			number: 1,
			title: 'The Naive Implementation',
			code: `const [showFullLogo, setShowFullLogo] = useState(isHome);

useEffect(() => {
  if (isHome) {
    setShowFullLogo(true);
  } else {
    setTimeout(() => setShowFullLogo(false), 600);
  }
}, [isHome]);`,
			description: 'Use state and effects. When not on home, delay 600ms before contracting.',
			predictions: [
				'Logo contracts immediately (no delay)',
				'Logo contracts after 600ms delay',
				'Logo stays expanded forever',
				'Logo flickers between states'
			],
			correctPrediction: 0,
			bugDescription: 'No delay. Logo contracted immediately on navigation.',
			hiddenAssumption: 'That the effect runs once per navigation. React 18\'s strict mode runs effects twice, clearing the timeout.'
		},
		{
			number: 2,
			title: 'Using Refs for Persistence',
			code: `const timerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (isHome) {
    setShowFullLogo(true);
  } else {
    timerRef.current = setTimeout(() => {
      setShowFullLogo(false);
    }, 600);
  }

  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
}, [isHome]);`,
			description: 'Store the timeout in a ref so it survives effect re-runs.',
			predictions: [
				'Logo contracts after 600ms (works perfectly)',
				'Logo still contracts immediately',
				'Logo never contracts at all',
				'Timer runs but state doesn\'t update'
			],
			correctPrediction: 1,
			bugDescription: 'Still no delay. Logo contracted immediately.',
			hiddenAssumption: 'That the component persists across navigation. In Next.js App Router, the Header was remounting on each route change, resetting all refs.'
		},
		{
			number: 3,
			title: 'Tracking Previous Route',
			code: `const prevPathRef = useRef(pathname);

useEffect(() => {
  const wasHome = prevPathRef.current === '/';
  prevPathRef.current = pathname;

  if (isHome && !wasHome) {
    // Coming back to home - expand
    setShowFullLogo(true);
  } else if (!isHome && wasHome) {
    // Leaving home - contract after delay
    setTimeout(() => setShowFullLogo(false), 600);
  }
}, [pathname, isHome]);`,
			description: 'Track the previous route with a ref to detect direction of navigation.',
			predictions: [
				'Works perfectly now',
				'Still no delay (component remounting)',
				'Delay works but expands at wrong time',
				'Previous route is always undefined'
			],
			correctPrediction: 1,
			bugDescription: 'Still no delay. The ref resets on remount.',
			hiddenAssumption: 'That refs persist across component remounts. They don\'t—the entire component instance is destroyed and recreated.'
		},
		{
			number: 4,
			title: 'Enter sessionStorage',
			code: `useEffect(() => {
  if (isHome) {
    const wasExpanded = sessionStorage.getItem('logoExpanded');
    if (wasExpanded) {
      // Coming back to home - expand
      setShowFullLogo(true);
    }
    sessionStorage.setItem('logoExpanded', 'true');
  } else {
    const wasExpanded = sessionStorage.getItem('logoExpanded');
    sessionStorage.removeItem('logoExpanded');
    if (wasExpanded) {
      setTimeout(() => setShowFullLogo(false), 600);
    }
  }
}, [pathname]);`,
			description: 'Use sessionStorage to persist state across remounts.',
			predictions: [
				'Logo contracts after 600ms delay (finally works)',
				'Logo contracts immediately (flag removed too early)',
				'Logo never contracts (flag never set)',
				'sessionStorage throws security error'
			],
			correctPrediction: 1,
			bugDescription: 'Still no delay! Logo contracts immediately.',
			hiddenAssumption: 'That we could remove the flag before the timeout. When the component remounts (which we now knew happened), the flag was already gone before the timeout fires.'
		},
		{
			number: 5,
			title: 'Flag Management Timing',
			code: `useEffect(() => {
  if (isHome) {
    sessionStorage.setItem('logoExpanded', 'true');
    setShowFullLogo(true);
  } else {
    const wasExpanded = sessionStorage.getItem('logoExpanded');
    if (wasExpanded) {
      setTimeout(() => {
        sessionStorage.removeItem('logoExpanded');
        setShowFullLogo(false);
      }, 600);
    }
  }
}, [pathname]);`,
			description: 'Remove the flag AFTER the timeout, inside the setTimeout callback.',
			predictions: [
				'Works! Logo contracts after 600ms',
				'Logo contracts but flag never clears',
				'Still contracts immediately',
				'Delay works but expansion broken'
			],
			correctPrediction: 2,
			bugDescription: 'STILL no delay! What is happening?',
			hiddenAssumption: 'That the timeout callback runs before the component remounts. On fast navigation, the component remounts before the timeout fires, creating a new effect instance that sees no flag.'
		},
		{
			number: 6,
			title: 'The Console.log Revelation',
			code: `useEffect(() => {
  console.log('[Logo Init]', { pathname, isHome });

  if (isHome) {
    console.log('[Logo] On home - expanding');
    sessionStorage.setItem('logoExpanded', 'true');
    setShowFullLogo(true);
  } else {
    const wasExpanded = sessionStorage.getItem('logoExpanded');
    console.log('[Logo] On internal', { wasExpanded });

    if (wasExpanded) {
      console.log('[Logo] Starting 600ms delay');
      setTimeout(() => {
        console.log('[Logo] Delay complete - contracting');
        sessionStorage.removeItem('logoExpanded');
        setShowFullLogo(false);
      }, 600);
    }
  }

  return () => console.log('[Logo] Cleanup');
}, [pathname]);`,
			description: 'Stop guessing. Add console logs to observe actual behavior.',
			predictions: [
				'Logs reveal the timeout is never reached',
				'Logs show component remounting mid-timeout',
				'Logs prove sessionStorage is broken',
				'Logs confirm strict mode interference'
			],
			correctPrediction: 1,
			bugDescription: 'Console reveals: component remounts, cleanup runs, timer cleared, flag already removed.',
			hiddenAssumption: 'That observation follows theory. The logs revealed the complete picture: what we thought was happening vs. what actually happens.',
			logs: `[Logo Init] { pathname: '/work', isHome: false }
[Logo] On internal { wasExpanded: 'true' }
[Logo] Starting 600ms delay
[Logo Init] { pathname: '/work', isHome: false }  <-- REMOUNT!
[Logo] Cleanup                                    <-- Timer cleared!
[Logo] On internal { wasExpanded: null }          <-- Flag already removed!`
		},
		{
			number: 7,
			title: 'Initialize State from Storage',
			code: `const [showFullLogo, setShowFullLogo] = useState(() => {
  if (typeof window !== 'undefined') {
    if (isHome) {
      const wasOnInternal = sessionStorage.getItem('wasOnInternal');
      return !wasOnInternal;
    }
    return sessionStorage.getItem('logoExpanded') === 'true';
  }
  return isHome;
});

useEffect(() => {
  if (isHome) {
    const wasOnInternal = sessionStorage.getItem('wasOnInternal');
    sessionStorage.removeItem('wasOnInternal');
    if (wasOnInternal) {
      setTimeout(() => setShowFullLogo(true), 600);
    }
  } else {
    sessionStorage.setItem('wasOnInternal', 'true');
    const wasExpanded = sessionStorage.getItem('logoExpanded');
    if (wasExpanded) {
      setTimeout(() => {
        sessionStorage.removeItem('logoExpanded');
        setShowFullLogo(false);
      }, 600);
    }
  }
}, [pathname, isHome]);`,
			description: 'Initialize state from sessionStorage. Use different flags for each direction.',
			predictions: [
				'Finally works! Delay on both directions',
				'Works leaving home, broken returning',
				'Works returning home, broken leaving',
				'Timing is off (wrong delay duration)'
			],
			correctPrediction: 1,
			bugDescription: 'Leaving home works! But returning home still broken on fast navigation.',
			hiddenAssumption: 'That the same pattern works bidirectionally. Navigation away can start contracted; navigation back needs different initialization.'
		},
		{
			number: 8,
			title: 'The Final Solution',
			code: `const [showFullLogo, setShowFullLogo] = useState(() => {
  if (typeof window !== 'undefined') {
    if (isHome) {
      const wasOnInternal = sessionStorage.getItem('wasOnInternal');
      return !wasOnInternal; // Start contracted if coming from internal
    }
    return sessionStorage.getItem('logoExpanded') === 'true';
  }
  return isHome;
});

useEffect(() => {
  if (isHome) {
    const wasOnInternal = sessionStorage.getItem('wasOnInternal');
    sessionStorage.removeItem('wasOnInternal');

    if (wasOnInternal) {
      setTimeout(() => setShowFullLogo(true), 600);
    }
  } else {
    sessionStorage.setItem('wasOnInternal', 'true');
    const wasExpanded = sessionStorage.getItem('logoExpanded');

    if (wasExpanded) {
      const currentPath = pathname;
      setTimeout(() => {
        // Only contract if still on same page
        if (window.location.pathname === currentPath) {
          sessionStorage.removeItem('logoExpanded');
          setShowFullLogo(false);
        }
      }, 600);
    }
  }
}, [pathname, isHome]);`,
			description: 'Check pathname before updating state in timeout. Prevent stale updates.',
			predictions: [
				'Perfect! All cases work correctly',
				'Breaks on fast double-navigation',
				'Works but introduces new edge case',
				'State gets desynchronized'
			],
			correctPrediction: 0,
			bugDescription: 'It works! All navigation patterns behave correctly.',
			hiddenAssumption: 'That state updates in timeouts are always valid. Must guard against navigation during timeout execution.'
		}
	];

	// State management
	let currentIteration = $state(0);
	let selectedPrediction = $state<number | null>(null);
	let showResult = $state(false);
	let showAssumption = $state(false);

	// Track iteration progress
	const iterationHistory = $state<boolean[]>(new Array(iterations.length).fill(false));

	const currentIterationData = $derived(iterations[currentIteration]);
	const isLastIteration = $derived(currentIteration === iterations.length - 1);
	const isFirstIteration = $derived(currentIteration === 0);

	function selectPrediction(index: number) {
		selectedPrediction = index;
		showResult = false;
		showAssumption = false;
	}

	function runSimulation() {
		if (selectedPrediction === null) return;
		showResult = true;
		iterationHistory[currentIteration] = true;
	}

	function revealAssumption() {
		showAssumption = true;
	}

	function nextIteration() {
		if (isLastIteration) {
			trackExperiment('complete', {
				iterations_completed: currentIteration + 1,
				predictions_correct: iterationHistory.filter((v, i) =>
					iterations[i] && selectedPrediction === iterations[i].correctPrediction
				).length
			});
			return;
		}
		currentIteration++;
		selectedPrediction = null;
		showResult = false;
		showAssumption = false;
	}

	function previousIteration() {
		if (isFirstIteration) return;
		currentIteration--;
		selectedPrediction = null;
		showResult = false;
		showAssumption = false;
	}

	function reset() {
		currentIteration = 0;
		selectedPrediction = null;
		showResult = false;
		showAssumption = false;
		iterationHistory.fill(false);
	}
</script>

<SEO
	title="Hermeneutic Debugging"
	description="Experience the hermeneutic circle in debugging. Walk through 8 iterations of a React bug, predicting outcomes and discovering hidden assumptions."
	keywords="hermeneutic circle, debugging, React, hidden assumptions, iterative development, bug fixing"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Experiments', url: 'https://createsomething.space/experiments' },
		{ name: 'Hermeneutic Debugging', url: 'https://createsomething.space/experiments/hermeneutic-debugging' }
	]}
/>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   HERMENEUTIC DEBUGGING                         |
    |                                                 |
    |   Attempt ──► Fail ──► Observe ──► Revise       |
    |      │                               │          |
    |      └───────────────────────────────┘          |
    |                                                 |
    |   Each failure reveals a hidden assumption.     |
    |                                                 |
    |   Understanding emerges through iteration.      |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="hero-title">Hermeneutic Debugging</h1>
		<p class="hero-subtitle italic">Try this: 8 iterations of the same bug</p>
		<p class="hero-description max-w-2xl mx-auto">
			A simple logo animation took <span class="highlight-text">8 attempts</span> to get right. Each failed fix revealed an assumption we didn't know we had. Walk through the same process—predict what will happen, then see what actually happens.
		</p>
	</div>
</section>

<!-- The Problem -->
<section class="px-6 pb-8">
	<div class="max-w-4xl mx-auto">
		<div class="context-card p-6 space-y-4">
			<h2 class="card-title">The Problem</h2>
			<div class="space-y-3 body-text-light">
				<p>
					Animate a logo in a Next.js App Router application:
				</p>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Home page: show full logo (expanded)</li>
					<li>Home → Internal page: wait 600ms, then contract to icon</li>
					<li>Internal → Home: expand back to full logo</li>
					<li>Internal → Internal: stay as icon</li>
				</ul>
				<p class="emphasis-text">
					Seems simple. It wasn't.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Iteration Walkthrough -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto space-y-6">
		<!-- Progress Indicator -->
		<div class="flex items-center justify-between mb-8">
			<div class="flex items-center gap-2">
				{#each iterations as _, i}
					<button
						onclick={() => {
							currentIteration = i;
							selectedPrediction = null;
							showResult = false;
							showAssumption = false;
						}}
						class="iteration-dot"
						class:active={i === currentIteration}
						class:completed={iterationHistory[i]}
					>
						{i + 1}
					</button>
				{/each}
			</div>
			<div class="step-indicator">
				{currentIteration + 1} / {iterations.length}
			</div>
		</div>

		<!-- Iteration Content -->
		<div class="iteration-card p-6 space-y-6">
			<div class="flex items-start justify-between">
				<div>
					<div class="iteration-number">Iteration {currentIterationData.number}</div>
					<h2 class="iteration-title">{currentIterationData.title}</h2>
				</div>
				{#if iterationHistory[currentIteration]}
					<span class="completed-badge">Completed</span>
				{/if}
			</div>

			<p class="body-text-light">{currentIterationData.description}</p>

			<!-- Code Block -->
			<div class="code-container">
				<div class="code-header">
					<span class="code-label">React Component</span>
				</div>
				<pre class="code-block"><code>{currentIterationData.code}</code></pre>
			</div>

			<!-- Predictions -->
			<div class="space-y-3">
				<h3 class="section-label">What will happen?</h3>
				<div class="grid gap-3">
					{#each currentIterationData.predictions as prediction, i}
						<button
							onclick={() => selectPrediction(i)}
							class="prediction-option"
							class:selected={selectedPrediction === i}
							disabled={showResult}
						>
							<span class="prediction-marker">{String.fromCharCode(65 + i)}</span>
							<span class="prediction-text">{prediction}</span>
							{#if showResult && i === currentIterationData.correctPrediction}
								<span class="correct-badge">Correct</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Run Button -->
			{#if selectedPrediction !== null && !showResult}
				<button onclick={runSimulation} class="run-button w-full">
					Run Simulation
				</button>
			{/if}

			<!-- Result -->
			{#if showResult}
				<div class="result-container space-y-4">
					<div class="result-header">
						<h3 class="section-label">Actual Behavior</h3>
						{#if selectedPrediction === currentIterationData.correctPrediction}
							<span class="badge-success">You predicted correctly!</span>
						{:else}
							<span class="badge-neutral">Different than expected</span>
						{/if}
					</div>

					<p class="bug-description">{currentIterationData.bugDescription}</p>

					<!-- Console Logs (Iteration 6 special case) -->
					{#if currentIterationData.logs}
						<div class="console-container">
							<div class="console-header">Console Output</div>
							<pre class="console-logs">{currentIterationData.logs}</pre>
						</div>
					{/if}

					<!-- Reveal Assumption Button -->
					{#if !showAssumption}
						<button onclick={revealAssumption} class="reveal-button w-full">
							What assumption was exposed?
						</button>
					{/if}
				</div>
			{/if}

			<!-- Hidden Assumption -->
			{#if showAssumption}
				<div class="assumption-reveal">
					<h3 class="assumption-label">Hidden Assumption Revealed</h3>
					<p class="assumption-text">{currentIterationData.hiddenAssumption}</p>

					{#if isLastIteration}
						<div class="success-message">
							<div class="success-icon">✓</div>
							<div>
								<div class="success-title">Solution Found!</div>
								<div class="success-description">
									The final implementation accounts for: component remounting, strict mode double-invocation,
									navigation during timeouts, bidirectional animation, and initial state hydration.
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Navigation -->
		<div class="flex items-center justify-between pt-4">
			<button
				onclick={previousIteration}
				disabled={isFirstIteration}
				class="nav-button"
			>
				← Previous
			</button>

			{#if showAssumption}
				{#if isLastIteration}
					<button onclick={reset} class="nav-button-primary">
						Start Over
					</button>
				{:else}
					<button onclick={nextIteration} class="nav-button-primary">
						Next Iteration →
					</button>
				{/if}
			{/if}

			{#if !showAssumption}
				<div class="helper-text">Select a prediction and run to continue</div>
			{/if}
		</div>
	</div>
</section>

<!-- What You Learned -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto">
		<div class="insight-card p-8 text-center space-y-4">
			<h2 class="insight-title">What You Just Experienced</h2>
			<p class="insight-text">
				Each failed fix revealed an assumption you didn't know you had. That's the pattern: attempt, observe what actually happens, revise your understanding.
			</p>
			<p class="insight-quote">
				"One observation is worth more than ten guesses."
			</p>
			<p class="insight-next">
				<strong>Try this in your next bug:</strong> Before the second fix attempt, write down what assumption the first failure revealed.
			</p>
		</div>
	</div>
</section>

<!-- Read More -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto text-center">
		<a
			href="https://createsomething.io/papers/hermeneutic-debugging"
			target="_blank"
			rel="noopener noreferrer"
			class="read-more-link inline-flex items-center gap-2"
		>
			Read the full paper at createsomething.io
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
			</svg>
		</a>
	</div>
</section>

<style>
	/* Structure: Tailwind | Design: Canon */

	.ascii-container {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.ascii-art {
		color: var(--color-fg-secondary);
		font-size: clamp(0.6rem, 1.5vw, 0.9rem);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.hero-description {
		color: var(--color-fg-muted);
	}

	.highlight-text {
		color: var(--color-fg-secondary);
	}

	.context-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.body-text-light {
		color: var(--color-fg-secondary);
	}

	.emphasis-text {
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	/* Progress */
	.iteration-dot {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
	}

	.iteration-dot:hover {
		border-color: var(--color-border-emphasis);
	}

	.iteration-dot.active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.iteration-dot.completed {
		background: var(--color-success);
		border-color: var(--color-success);
		color: var(--color-bg-pure);
	}

	.step-indicator {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	/* Iteration Card */
	.iteration-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.iteration-number {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.iteration-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-top: 0.25rem;
	}

	.completed-badge {
		padding: 0.25rem 0.75rem;
		background: var(--color-success-muted);
		color: var(--color-success);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	.section-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Code */
	.code-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.code-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	.code-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-family: monospace;
	}

	.code-block {
		padding: 1rem;
		overflow-x: auto;
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		line-height: 1.6;
	}

	/* Predictions */
	.prediction-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		text-align: left;
	}

	.prediction-option:hover:not(:disabled) {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.prediction-option.selected {
		border-color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.prediction-option:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.prediction-marker {
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 50%;
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.prediction-option.selected .prediction-marker {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.prediction-text {
		flex: 1;
	}

	.correct-badge {
		padding: 0.25rem 0.5rem;
		background: var(--color-success-muted);
		color: var(--color-success);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 500;
	}

	/* Buttons */
	.run-button {
		padding: 0.75rem 1.5rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.run-button:hover {
		opacity: 0.9;
	}

	.reveal-button {
		padding: 0.75rem 1.5rem;
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.reveal-button:hover {
		border-color: var(--color-fg-primary);
		color: var(--color-fg-primary);
	}

	/* Results */
	.result-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}

	.result-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.badge-success {
		padding: 0.25rem 0.75rem;
		background: var(--color-success-muted);
		color: var(--color-success);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	.badge-neutral {
		padding: 0.25rem 0.75rem;
		background: var(--color-warning-muted);
		color: var(--color-warning);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	.bug-description {
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	/* Console */
	.console-container {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
		margin-top: 1rem;
	}

	.console-header {
		padding: 0.5rem 1rem;
		background: var(--color-bg-surface);
		border-bottom: 1px solid var(--color-border-default);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		font-family: monospace;
	}

	.console-logs {
		padding: 1rem;
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-success);
		line-height: 1.6;
		overflow-x: auto;
	}

	/* Assumption Reveal */
	.assumption-reveal {
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-top: 1rem;
	}

	.assumption-label {
		font-size: var(--text-h3);
		color: var(--color-info);
		margin-bottom: 0.75rem;
	}

	.assumption-text {
		color: var(--color-fg-primary);
		line-height: 1.6;
	}

	.success-message {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 1rem;
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-md);
	}

	.success-icon {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-success);
		color: var(--color-bg-pure);
		border-radius: 50%;
		font-weight: bold;
	}

	.success-title {
		font-weight: 600;
		color: var(--color-success);
		margin-bottom: 0.25rem;
	}

	.success-description {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	/* Navigation */
	.nav-button {
		padding: 0.5rem 1rem;
		background: transparent;
		color: var(--color-fg-tertiary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-button:hover:not(:disabled) {
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.nav-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.nav-button-primary {
		padding: 0.5rem 1rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.nav-button-primary:hover {
		opacity: 0.9;
	}

	.helper-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Insight Card */
	.insight-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-xl);
	}

	.insight-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.insight-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		line-height: 1.6;
	}

	.insight-quote {
		color: var(--color-fg-tertiary);
		font-style: italic;
		font-size: var(--text-body);
	}

	.insight-next {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		margin-top: var(--space-sm);
	}

	/* Read More */
	.read-more-link {
		color: var(--color-fg-secondary);
		padding: 0.75rem 1.5rem;
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.read-more-link:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}
</style>
