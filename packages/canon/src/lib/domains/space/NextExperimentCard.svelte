<script lang="ts">
    import type { Paper } from "$lib/types/paper";

    interface Props {
        nextPaper: Paper;
    }

    let { nextPaper }: Props = $props();
</script>

<div class="next-card group relative overflow-hidden p-8 mt-16 text-center animate-reveal">
    <!-- Background Glow -->
    <div
        class="glow-effect absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    ></div>

    <div class="relative z-10">
        <div
            class="badge inline-flex items-center gap-2 px-3 py-1 mb-4"
        >
            <span>Horizon of Possibility</span>
        </div>

        <h3 class="card-title mb-2">
            Ready for the next step?
        </h3>

        <p class="card-subtitle mb-8 max-w-md mx-auto">
            You've mastered the current concept. Continue your journey with <span
                class="highlight">{nextPaper.title}</span
            >.
        </p>

        <a
            href="/experiments/{nextPaper.slug}"
            class="cta-btn inline-flex items-center gap-2 px-8 py-3"
        >
            <span>Start Next Experiment</span>
            <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
            </svg>
        </a>
    </div>
</div>

<style>
	.next-card {
		background: linear-gradient(to bottom right, var(--color-performance-active), var(--color-performance-hover));
		border-radius: var(--radius-performance-scale-xl);
	}

	.glow-effect {
		background: var(--color-performance-data-3-muted);
		filter: blur(3rem);
	}

	.badge {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-full);
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
	}

	.card-title {
		font-size: var(--text-performance-h3);
		font-weight: bold;
		color: var(--color-performance-fg-primary);
	}

	.card-subtitle {
		color: var(--color-performance-fg-tertiary);
	}

	.highlight {
		color: var(--color-performance-fg-primary);
		font-weight: 500;
	}

	.cta-btn {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		font-weight: bold;
		border-radius: var(--radius-performance-scale-full);
		box-shadow: var(--shadow-performance-scale-lg);
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.cta-btn:hover {
		background: var(--color-performance-fg-secondary);
		transform: scale(var(--scale-performance-small));
		box-shadow: var(--shadow-performance-scale-xl);
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(12px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
