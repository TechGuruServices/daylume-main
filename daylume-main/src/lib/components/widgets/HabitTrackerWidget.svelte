<script lang="ts">
    import { getHabits, getHabitLogs } from '$lib/storage';
    import { onMount } from 'svelte';
    import type { Habit } from '$lib/types';
    
    let habits: Array<Habit & { completedToday: boolean }> = [];
    let loading = true;
    
    const today = new Date().toISOString().split('T')[0];
    
    onMount(async () => {
        await loadData();
    });
    
    function loadData() {
        loading = true;
        const allHabits = getHabits();
        const habitLogs = getHabitLogs();
        
        habits = allHabits.slice(0, 5).map(habit => {
            const logs = habitLogs.filter(log => log.habitId === habit.id && log.date === today);
            return {
                ...habit,
                completedToday: logs.length > 0
            };
        });
        
        loading = false;
    }
    
    $: completedCount = habits.filter(h => h.completedToday).length;
    $: totalCount = habits.length;
</script>

<div class="h-full flex flex-col">
    <div class="flex justify-between items-center mb-2">
        <h3 class="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <span class="mdi mdi-check-circle"></span>
            Today's Habits
        </h3>
        {#if habits.length > 0}
            <span class="text-xs px-2 py-0.5 rounded-full" 
                  class:bg-green-500={completedCount === totalCount}
                  class:text-white={completedCount === totalCount}
                  class:bg-white={completedCount !== totalCount}
                  class:bg-opacity-10={completedCount !== totalCount}>
                {completedCount}/{totalCount}
            </span>
        {/if}
    </div>
    
    {#if loading}
        <div class="flex-1 flex flex-col gap-2">
            {#each [1, 2, 3, 4] as _}
                <div class="animate-pulse flex items-center gap-2">
                    <div class="w-5 h-5 rounded-full bg-white/10"></div>
                    <div class="flex-1 h-3 rounded bg-white/10"></div>
                </div>
            {/each}
        </div>
    {:else if habits.length === 0}
        <div class="flex-1 flex items-center justify-center text-center">
            <div>
                <span class="text-2xl block mb-1">✨</span>
                <p class="text-xs text-gray-500">No habits tracked</p>
            </div>
        </div>
    {:else}
        <div class="flex-1 flex flex-col gap-1.5 overflow-hidden">
            {#each habits as habit}
                <div class="flex items-center gap-2 py-1">
                    <div 
                        class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                        style="border-color: {habit.color || '#8B5CF6'}; 
                               background: {habit.completedToday ? (habit.color || '#8B5CF6') : 'transparent'}"
                    >
                        {#if habit.completedToday}
                            <span class="mdi mdi-check text-xs text-white"></span>
                        {/if}
                    </div>
                    <span 
                        class="text-sm truncate transition-all"
                        class:line-through={habit.completedToday}
                        class:text-gray-500={habit.completedToday}
                    >
                        {habit.title}
                    </span>
                </div>
            {/each}
        </div>
    {/if}
</div>
