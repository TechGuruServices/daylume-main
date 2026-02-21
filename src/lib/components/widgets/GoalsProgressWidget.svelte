<script lang="ts">
    import { getGoals } from '$lib/storage';
    import { onMount } from 'svelte';
    import type { Goal } from '$lib/types';
    
    let goals: Goal[] = [];
    let loading = true;
    
    onMount(async () => {
        await loadData();
    });
    
    async function loadData() {
        loading = true;
        const allGoals = getGoals();
        // Get top 4 active goals sorted by progress
        goals = allGoals
            .filter(g => g.progress < 100)
            .sort((a, b) => b.progress - a.progress)
            .slice(0, 4);
        loading = false;
    }
    
    function getProgressColor(progress: number): string {
        if (progress >= 75) return '#22C55E'; // Green
        if (progress >= 50) return '#EAB308'; // Yellow
        if (progress >= 25) return '#F97316'; // Orange
        return '#8B5CF6'; // Purple
    }
</script>

<div class="h-full flex flex-col">
    <h3 class="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
        <span class="mdi mdi-flag"></span>
        Goals Progress
    </h3>
    
    {#if loading}
        <div class="flex-1 flex flex-col gap-3">
            {#each [1, 2, 3] as _}
                <div class="animate-pulse">
                    <div class="w-3/4 h-3 rounded bg-white/10 mb-2"></div>
                    <div class="w-full h-2 rounded-full bg-white/10"></div>
                </div>
            {/each}
        </div>
    {:else if goals.length === 0}
        <div class="flex-1 flex items-center justify-center text-center">
            <div>
                <span class="text-2xl block mb-1">🎯</span>
                <p class="text-xs text-gray-500">No active goals</p>
            </div>
        </div>
    {:else}
        <div class="flex-1 flex flex-col gap-3">
            {#each goals as goal}
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-medium truncate flex-1 mr-2">{goal.title}</span>
                        <span class="text-xs text-gray-400 shrink-0">{goal.progress}%</span>
                    </div>
                    <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            class="h-full rounded-full transition-all duration-500"
                            style="width: {goal.progress}%; background: {getProgressColor(goal.progress)}"
                        ></div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
