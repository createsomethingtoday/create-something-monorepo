<script lang="ts">
    import type { Paper } from "$lib/types/paper";
    import { fly } from "svelte/transition";

    interface Props {
        nextPaper: Paper;
    }

    let { nextPaper }: Props = $props();
</script>

<div
    class="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-8 mt-16 text-center relative overflow-hidden group"
    in:fly={{ y: 20, duration: 500, delay: 200 }}
>
    <!-- Background Glow -->
    <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-purple-500/10 blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    ></div>

    <div class="relative z-10">
        <div
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/80 mb-4"
        >
            <span>Horizon of Possibility</span>
        </div>

        <h3 class="text-2xl font-bold text-white mb-2">
            Ready for the next step?
        </h3>

        <p class="text-white/60 mb-8 max-w-md mx-auto">
            You've mastered the current concept. Continue your journey with <span
                class="text-white font-medium">{nextPaper.title}</span
            >.
        </p>

        <a
            href="/experiments/{nextPaper.slug}"
            class="inline-flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-white/20"
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
