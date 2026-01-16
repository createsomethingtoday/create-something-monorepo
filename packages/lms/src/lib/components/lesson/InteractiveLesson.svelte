<script lang="ts">
	/**
	 * InteractiveLesson - Main orchestrator for interactive lessons
	 * 
	 * Renders a lesson from structured JSON content using section components.
	 * Supports: hero, philosophy, spritz, steps, code, reflection, remotion
	 */
	import { onMount } from 'svelte';
	import LessonHero from './LessonHero.svelte';
	import LessonPhilosophy from './LessonPhilosophy.svelte';
	import LessonSpritz from './LessonSpritz.svelte';
	import LessonSteps from './LessonSteps.svelte';
	import LessonCode from './LessonCode.svelte';
	import LessonReflection from './LessonReflection.svelte';
	import LessonRemotion from './LessonRemotion.svelte';

	// Section type definitions
	interface HeroSection {
		type: 'hero';
		text: string;
		subtitle?: string;
		reveal?: 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';
		duration?: number;
	}

	interface PhilosophySection {
		type: 'philosophy';
		concept?: string;
		text: string;
		explanation: string;
		reveal?: 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';
		duration?: number;
	}

	interface SpritzSection {
		type: 'spritz';
		messages: string[] | { label?: string; text: string }[];
		wpm?: number;
	}

	interface StepsSection {
		type: 'steps';
		title: string;
		steps: {
			command?: string;
			text?: string;
			platform?: string;
			note?: string;
		}[];
	}

	interface CodeSection {
		type: 'code';
		title?: string;
		code: string;
		language?: string;
		filename?: string;
	}

	interface ReflectionSection {
		type: 'reflection';
		prompt: string;
		answer: string;
		reveal?: 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';
	}

	interface RemotionSection {
		type: 'remotion';
		compositionId: string;
		caption?: string;
		width?: number;
		height?: number;
		fps?: number;
		durationInFrames?: number;
	}

	type Section = HeroSection | PhilosophySection | SpritzSection | StepsSection | CodeSection | ReflectionSection | RemotionSection;

	interface LessonData {
		sections: Section[];
	}

	let {
		data,
		class: className = '',
		onSectionView,
		onComplete
	}: {
		data: LessonData;
		class?: string;
		onSectionView?: (index: number, type: string) => void;
		onComplete?: () => void;
	} = $props();

	let currentSection = $state(0);
	let sectionRefs: HTMLElement[] = [];

	// Track section visibility for analytics
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const index = sectionRefs.indexOf(entry.target as HTMLElement);
						if (index !== -1 && index !== currentSection) {
							currentSection = index;
							onSectionView?.(index, data.sections[index].type);
						}
					}
				});
			},
			{ threshold: 0.5 }
		);

		sectionRefs.forEach((ref) => {
			if (ref) observer.observe(ref);
		});

		return () => observer.disconnect();
	});

	// Check if all sections have been viewed
	$effect(() => {
		if (currentSection === data.sections.length - 1) {
			onComplete?.();
		}
	});
</script>

<div class="interactive-lesson {className}">
	<!-- Progress dots -->
	<nav class="section-nav" aria-label="Lesson progress">
		{#each data.sections as section, index}
			<button
				class="nav-dot"
				class:active={index === currentSection}
				class:viewed={index <= currentSection}
				onclick={() => sectionRefs[index]?.scrollIntoView({ behavior: 'smooth' })}
				aria-label="Go to section {index + 1}"
			>
				<span class="dot-inner"></span>
			</button>
		{/each}
	</nav>

	<!-- Sections -->
	<div class="sections">
		{#each data.sections as section, index}
			<div 
				class="section section-{section.type}"
				bind:this={sectionRefs[index]}
			>
				{#if section.type === 'hero'}
					<LessonHero
						text={section.text}
						subtitle={section.subtitle}
						reveal={section.reveal}
						duration={section.duration}
					/>
				{:else if section.type === 'philosophy'}
					<LessonPhilosophy
						concept={section.concept}
						text={section.text}
						explanation={section.explanation}
						reveal={section.reveal}
						duration={section.duration}
					/>
				{:else if section.type === 'spritz'}
					<LessonSpritz
						messages={section.messages}
						wpm={section.wpm}
					/>
				{:else if section.type === 'steps'}
					<LessonSteps
						title={section.title}
						steps={section.steps}
					/>
				{:else if section.type === 'code'}
					<LessonCode
						title={section.title}
						code={section.code}
						language={section.language}
						filename={section.filename}
					/>
				{:else if section.type === 'reflection'}
					<LessonReflection
						prompt={section.prompt}
						answer={section.answer}
						reveal={section.reveal}
					/>
				{:else if section.type === 'remotion'}
					<LessonRemotion
						compositionId={section.compositionId}
						caption={section.caption}
						width={section.width}
						height={section.height}
						fps={section.fps}
						durationInFrames={section.durationInFrames}
					/>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.interactive-lesson {
		position: relative;
		min-height: 100vh;
	}

	/* Progress navigation */
	.section-nav {
		position: fixed;
		right: var(--space-lg);
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		z-index: 100;
	}

	.nav-dot {
		width: 12px;
		height: 12px;
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dot-inner {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-border-subtle);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-dot.viewed .dot-inner {
		background: var(--color-fg-muted);
	}

	.nav-dot.active .dot-inner {
		background: var(--color-fg-primary);
		transform: scale(1.5);
	}

	.nav-dot:hover .dot-inner {
		background: var(--color-fg-secondary);
	}

	/* Sections */
	.sections {
		display: flex;
		flex-direction: column;
	}

	.section {
		min-height: 80vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	/* Section-specific adjustments */
	.section-hero {
		min-height: 100vh;
	}

	.section-steps,
	.section-code {
		min-height: auto;
		padding: var(--space-xl) 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.section-nav {
			display: none;
		}
	}
</style>
