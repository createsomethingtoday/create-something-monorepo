<script lang="ts">
    import type { Paper } from "$lib/types/paper";

    interface Props {
        nextPaper: Paper;
    }

    let { nextPaper }: Props = $props();
</script>

<div class="next-card group p-8 mt-16 text-center relative overflow-hidden animate-reveal">
    <!-- Background Glow -->
    <div class="bg-glow absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10"></div>

    <div class="relative z-10">
        <div class="horizon-badge inline-flex items-center gap-2 px-3 py-1 mb-4">
            <span>Horizon of Possibility</span>
        </div>

        <h3 class="next-heading mb-2">
            Ready for the next step?
        </h3>

        <p class="next-description mb-8 max-w-md mx-auto">
            You've mastered the current concept. Continue your journey with <span class="next-title-highlight">{nextPaper.title}</span>.
        </p>

        <a href="/experiments/{nextPaper.slug}" class="next-button inline-flex items-center gap-2 px-8 py-3 transform">
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
        background: linear-gradient(to bottom right, var(--color-border-default), var(--color-hover));
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-xl);
    }

    .bg-glow {
        background: var(--color-data-3-muted);
        filter: blur(48px);
        opacity: 0;
        transition: opacity 500ms;
    }

    .group:hover .bg-glow {
        opacity: 1;
    }

    .horizon-badge {
        border-radius: var(--radius-full);
        background: var(--color-hover);
        font-size: var(--text-caption);
        font-weight: 500;
        color: var(--color-fg-secondary);
    }

    .next-heading {
        font-size: clamp(1.25rem, 3vw, 1.5rem);
        font-weight: bold;
        color: var(--color-fg-primary);
    }

    .next-description {
        color: var(--color-fg-tertiary);
    }

    .next-title-highlight {
        color: var(--color-fg-primary);
        font-weight: 500;
    }

    .next-button {
        background: var(--color-fg-primary);
        color: var(--color-bg-pure);
        font-weight: bold;
        border-radius: var(--radius-full);
        transition: all var(--duration-standard);
        box-shadow: var(--shadow-lg);
    }

    .next-button:hover {
        background: var(--color-fg-secondary);
        transform: scale(var(--scale-small));
        box-shadow: var(--shadow-2xl);
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
