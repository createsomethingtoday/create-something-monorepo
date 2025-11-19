<script lang="ts">
    import type { Paper } from "$lib/types/paper";
    import { mockPapers, pathways } from "$lib/data/mockPapers";
    import { fly } from "svelte/transition";

    interface Props {
        paper: Paper;
    }

    let { paper }: Props = $props();

    // Get pathway details
    const pathwayKey = paper.pathway;
    const pathway = pathwayKey ? pathways[pathwayKey] : null;

    // Get all papers in this pathway, sorted by order
    const pathwayPapers = pathwayKey
        ? mockPapers
              .filter((p) => p.pathway === pathwayKey)
              .sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

    const currentStepIndex = pathwayPapers.findIndex(
        (p) => p.slug === paper.slug,
    );
    const currentStep = currentStepIndex + 1;
    const totalSteps = pathwayPapers.length;
    const progressPercentage = (currentStep / totalSteps) * 100;
</script>

{#if pathway && totalSteps > 0}
    <div
        class="mb-8 bg-white/5 border border-white/10 rounded-lg p-6"
        in:fly={{ y: 20, duration: 500 }}
    >
        <div class="flex items-center justify-between mb-4">
            <div>
                <div
                    class="text-xs font-medium text-white/40 uppercase tracking-wider mb-1"
                >
                    Learning Pathway
                </div>
                <h3 class="text-lg font-bold text-white">{pathway.title}</h3>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold text-white">
                    {currentStep}<span class="text-white/40 text-lg"
                        >/{totalSteps}</span
                    >
                </div>
                <div class="text-xs text-white/40">Steps Completed</div>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
                class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                style="width: {progressPercentage}%"
            ></div>
        </div>

        <!-- Steps -->
        <div class="flex justify-between text-xs text-white/40">
            <span>Start</span>
            <span>Mastery</span>
        </div>
    </div>
{/if}
