<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Widget, WidgetSize } from '$lib/widgets';
    import { widgetConfigs } from '$lib/widgets';
    
    export let widget: Widget;
    export let editMode: boolean = false;
    
    const dispatch = createEventDispatcher<{
        remove: string;
        resize: { id: string; size: WidgetSize };
        dragstart: { id: string; event: DragEvent };
        dragend: void;
    }>();
    
    $: config = widgetConfigs[widget.type];
    $: sizeClasses = {
        small: 'col-span-1 row-span-1',
        medium: 'col-span-2 row-span-1 md:col-span-1 md:row-span-2',
        large: 'col-span-2 row-span-2'
    };
    
    let isDragging = false;
    
    function handleDragStart(e: DragEvent) {
        if (!editMode) return;
        isDragging = true;
        e.dataTransfer?.setData('text/plain', widget.id);
        dispatch('dragstart', { id: widget.id, event: e });
    }
    
    function handleDragEnd() {
        isDragging = false;
        dispatch('dragend');
    }
    
    function cycleSize() {
        const currentIndex = config.availableSizes.indexOf(widget.size);
        const nextIndex = (currentIndex + 1) % config.availableSizes.length;
        dispatch('resize', { id: widget.id, size: config.availableSizes[nextIndex] });
    }
</script>

<div
    class="widget-container {sizeClasses[widget.size]} {editMode ? 'edit-mode' : ''} {isDragging ? 'dragging' : ''}"
    draggable={editMode}
    on:dragstart={handleDragStart}
    on:dragend={handleDragEnd}
    role="article"
    aria-label="{widget.title} widget"
>
    <div class="widget-inner glass-panel rounded-2xl p-4 h-full relative overflow-hidden group">
        {#if editMode}
            <!-- Edit Mode Controls -->
            <div class="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                {#if config.availableSizes.length > 1}
                    <button
                        on:click={cycleSize}
                        class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                        title="Resize"
                    >
                        <span class="mdi mdi-resize text-sm"></span>
                    </button>
                {/if}
                <button
                    on:click={() => dispatch('remove', widget.id)}
                    class="w-7 h-7 rounded-lg bg-danger/20 hover:bg-danger/40 flex items-center justify-center transition-all"
                    title="Remove"
                >
                    <img src="/assets/glass_15_delete.png" alt="Remove" class="w-4 h-4" />
                </button>
            </div>
            
            <!-- Drag Handle -->
            <div class="absolute top-2 left-2 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center cursor-grab active:cursor-grabbing z-20">
                <span class="mdi mdi-drag text-white/50"></span>
            </div>
        {/if}
        
        <!-- Widget Header -->
        <div class="flex items-center gap-2 mb-3 {editMode ? 'pl-8' : ''}">
            <img src={config.icon} alt="" class="w-5 h-5" />
            <h4 class="text-sm font-semibold text-white/90">{widget.title}</h4>
        </div>
        
        <!-- Widget Content Slot -->
        <div class="widget-content">
            <slot />
        </div>
    </div>
</div>

<style>
    .widget-container {
        transition: transform 0.2s ease, opacity 0.2s ease;
    }
    
    .widget-container.edit-mode {
        animation: wiggle 0.3s ease-in-out infinite;
    }
    
    .widget-container.dragging {
        opacity: 0.5;
        transform: scale(0.95);
    }
    
    .widget-inner {
        transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    
    .edit-mode .widget-inner {
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
    }
    
    .edit-mode .widget-inner:hover {
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.6);
        transform: scale(1.02);
    }
    
    @keyframes wiggle {
        0%, 100% { transform: rotate(-0.5deg); }
        50% { transform: rotate(0.5deg); }
    }
    
    .widget-content {
        height: calc(100% - 2rem);
        overflow: hidden;
    }
</style>
