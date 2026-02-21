<script lang="ts">
    import { widgetConfigs, widgetStore, type WidgetType } from '$lib/widgets';
    import { hapticFeedback } from '$lib/haptics';
    import { createEventDispatcher } from 'svelte';
    
    export let show = false;
    
    const dispatch = createEventDispatcher();
    
    const widgetIcons: Record<string, string> = {
        'stats': '📊',
        'weather': '🌤️',
        'quote': '💭',
        'mini-calendar': '📅',
        'upcoming-events': '🗓️',
        'habits-progress': '✅',
        'goals-progress': '🎯',
        'tasks-today': '📋',
        'streak-counter': '🔥',
        'mood-tracker': '😊',
        'quick-add': '➕',
        'pomodoro': '🍅'
    };
    
    function handleAddWidget(type: string) {
        widgetStore.addWidget(type as WidgetType);
        hapticFeedback.success();
        show = false;
        dispatch('close');
    }
    
    function handleClose() {
        show = false;
        dispatch('close');
    }
    
    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    }
    
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleClose();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
        on:click={handleBackdropClick}
    >
        <div 
            class="w-full max-w-lg bg-gray-900/95 rounded-t-3xl overflow-hidden animate-slide-up"
        >
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 rounded-full bg-gray-600"></div>
            </div>
            
            <!-- Header -->
            <div class="px-6 pb-4 border-b border-white/10">
                <h2 class="text-xl font-bold">Add Widget</h2>
                <p class="text-sm text-gray-400 mt-1">Choose a widget to add to your dashboard</p>
            </div>
            
            <!-- Widget List -->
            <div class="max-h-[60vh] overflow-y-auto p-4">
                <div class="grid grid-cols-2 gap-3">
                    {#each Object.entries(widgetConfigs) as [type, config]}
                        <button
                            on:click={() => handleAddWidget(type)}
                            class="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 
                                   hover:border-primary/50 transition-all duration-200 text-left group"
                        >
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-2xl">{widgetIcons[type] || '📦'}</span>
                                <span class="font-semibold text-sm group-hover:text-primary transition-colors">
                                    {config.title}
                                </span>
                            </div>
                            <p class="text-xs text-gray-500 line-clamp-2">{config.description}</p>
                            <div class="mt-2 flex gap-1">
                                <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                                    {config.defaultSize}
                                </span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
            
            <!-- Cancel Button -->
            <div class="p-4 border-t border-white/10">
                <button
                    on:click={handleClose}
                    class="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 
                           font-medium transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }
</style>
