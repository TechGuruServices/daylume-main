<script lang="ts">
    import { widgetStore, type Widget } from '$lib/widgets';
    import WidgetWrapper from './WidgetWrapper.svelte';
    import QuoteWidget from './QuoteWidget.svelte';
    import StatsWidget from './StatsWidget.svelte';
    import MiniCalendarWidget from './MiniCalendarWidget.svelte';
    import WeatherWidget from './WeatherWidget.svelte';
    import UpcomingEventsWidget from './UpcomingEventsWidget.svelte';
    import GoalsProgressWidget from './GoalsProgressWidget.svelte';
    import HabitTrackerWidget from './HabitTrackerWidget.svelte';
    import { flip } from 'svelte/animate';
    import { hapticFeedback } from '$lib/haptics';
    import { onMount } from 'svelte';
    
    export let editMode = false;
    
    let draggedWidget: Widget | null = null;
    let dragOverIndex: number | null = null;
    let touchStartY = 0;
    let touchStartX = 0;
    let touchElement: HTMLElement | null = null;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    
    const widgetComponents: Record<string, any> = {
        'stats': StatsWidget,
        'weather': WeatherWidget,
        'quote': QuoteWidget,
        'mini-calendar': MiniCalendarWidget,
        'upcoming-events': UpcomingEventsWidget,
        'habits-progress': HabitTrackerWidget,
        'goals-progress': GoalsProgressWidget,
        'tasks-today': StatsWidget,
    };
    
    // Responsive size classes - better mobile layout
    function getSizeClasses(size: string): string {
        switch (size) {
            case 'small': return 'col-span-1';
            case 'large': return 'col-span-2 row-span-2';
            default: return 'col-span-1 md:col-span-1'; // medium - single column on mobile
        }
    }
    
    function handleDragStart(e: DragEvent, widget: Widget) {
        if (!editMode) return;
        draggedWidget = widget;
        hapticFeedback.tap();
        
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', widget.id);
        }
    }
    
    function handleDragOver(e: DragEvent, index: number) {
        if (!editMode || !draggedWidget) return;
        e.preventDefault();
        dragOverIndex = index;
    }
    
    function handleDragEnd() {
        if (draggedWidget && dragOverIndex !== null) {
            const widgets = [...$widgetStore];
            const fromIndex = widgets.findIndex(w => w.id === draggedWidget!.id);
            if (fromIndex !== dragOverIndex && fromIndex !== -1) {
                const [removed] = widgets.splice(fromIndex, 1);
                widgets.splice(dragOverIndex, 0, removed);
                widgetStore.reorderWidgets(widgets);
                hapticFeedback.success();
            }
        }
        
        draggedWidget = null;
        dragOverIndex = null;
    }
    
    function handleDrop(e: DragEvent, index: number) {
        e.preventDefault();
        handleDragEnd();
    }
    
    function handleDragLeave() {
        dragOverIndex = null;
    }
    
    function handleRemoveWidget(widgetId: string) {
        widgetStore.removeWidget(widgetId);
        hapticFeedback.tap();
    }
    
    function handleResizeWidget(widgetId: string, detail: 'small' | 'medium' | 'large') {
        widgetStore.updateWidget(widgetId, { size: detail });
    }
    
    // Touch handling for mobile drag and drop
    function handleTouchStart(e: TouchEvent, widget: Widget, index: number) {
        if (!editMode) return;
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchElement = e.currentTarget as HTMLElement;
        
        // Long press to start drag
        longPressTimer = setTimeout(() => {
            draggedWidget = widget;
            hapticFeedback.press();
            if (touchElement) {
                touchElement.classList.add('dragging-touch');
            }
        }, 200);
    }
    
    function handleTouchMove(e: TouchEvent, index: number) {
        if (!editMode || !draggedWidget) return;
        
        // Clear long press if moving
        if (longPressTimer) {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartX);
            const dy = Math.abs(touch.clientY - touchStartY);
            if (dx > 10 || dy > 10) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
        
        if (draggedWidget) {
            e.preventDefault();
            const touch = e.touches[0];
            const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
            const dropTarget = elements.find(el => el.hasAttribute('data-widget-index'));
            if (dropTarget) {
                const targetIndex = parseInt(dropTarget.getAttribute('data-widget-index') || '-1');
                if (targetIndex !== -1 && targetIndex !== dragOverIndex) {
                    dragOverIndex = targetIndex;
                    hapticFeedback.tap();
                }
            }
        }
    }
    
    function handleTouchEnd(e: TouchEvent) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        if (touchElement) {
            touchElement.classList.remove('dragging-touch');
        }
        
        if (draggedWidget && dragOverIndex !== null) {
            const widgets = [...$widgetStore];
            const fromIndex = widgets.findIndex(w => w.id === draggedWidget!.id);
            if (fromIndex !== dragOverIndex && fromIndex !== -1) {
                const [removed] = widgets.splice(fromIndex, 1);
                widgets.splice(dragOverIndex, 0, removed);
                widgetStore.reorderWidgets(widgets);
                hapticFeedback.success();
            }
        }
        
        draggedWidget = null;
        dragOverIndex = null;
        touchElement = null;
    }
</script>

<div 
    class="widget-grid"
    class:edit-mode={editMode}
>
    {#each $widgetStore.filter(w => w.visible) as widget, index (widget.id)}
        <div
            class="widget-cell {getSizeClasses(widget.size)}"
            class:opacity-50={draggedWidget?.id === widget.id}
            class:drag-over={dragOverIndex === index && draggedWidget?.id !== widget.id}
            data-widget-index={index}
            animate:flip={{ duration: 300 }}
            draggable={editMode}
            on:dragstart={(e) => handleDragStart(e, widget)}
            on:dragover={(e) => handleDragOver(e, index)}
            on:dragleave={handleDragLeave}
            on:drop={(e) => handleDrop(e, index)}
            on:dragend={handleDragEnd}
            on:touchstart={(e) => handleTouchStart(e, widget, index)}
            on:touchmove={(e) => handleTouchMove(e, index)}
            on:touchend={handleTouchEnd}
            role="listitem"
        >
            <WidgetWrapper 
                {widget} 
                {editMode}
                on:remove={() => handleRemoveWidget(widget.id)}
                on:resize={(e) => handleResizeWidget(widget.id, e.detail.size)}
            >
                {#if widgetComponents[widget.type]}
                    <svelte:component this={widgetComponents[widget.type]} />
                {:else}
                    <div class="flex items-center justify-center h-full text-gray-500 text-sm">
                        Widget: {widget.type}
                    </div>
                {/if}
            </WidgetWrapper>
        </div>
    {/each}
</div>

{#if $widgetStore.filter(w => w.visible).length === 0}
    <div class="text-center py-12 text-gray-500">
        <span class="text-4xl block mb-3">📱</span>
        <p class="text-sm">No widgets added yet</p>
        <p class="text-xs mt-1">Tap edit to add widgets to your dashboard</p>
    </div>
{/if}

<style>
    .widget-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        padding: 0.25rem;
    }
    
    @media (min-width: 768px) {
        .widget-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem;
        }
    }
    
    @media (min-width: 1024px) {
        .widget-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
        }
    }
    
    .widget-cell {
        min-height: 160px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    @media (min-width: 768px) {
        .widget-cell {
            min-height: 180px;
        }
    }
    
    .widget-cell.col-span-2 {
        grid-column: span 2;
    }
    
    .widget-cell.row-span-2 {
        grid-row: span 2;
        min-height: 340px;
    }
    
    @media (min-width: 768px) {
        .widget-cell.row-span-2 {
            min-height: 380px;
        }
    }
    
    .edit-mode {
        background: rgba(139, 92, 246, 0.05);
        border-radius: 1rem;
        padding: 0.75rem;
        margin: -0.5rem;
        border: 2px dashed rgba(139, 92, 246, 0.2);
    }
    
    .edit-mode .widget-cell {
        animation: wiggle 0.4s ease-in-out infinite;
    }
    
    .edit-mode .widget-cell:nth-child(even) {
        animation-delay: 0.1s;
    }
    
    .edit-mode .widget-cell:nth-child(3n) {
        animation-delay: 0.2s;
    }
    
    .drag-over {
        transform: scale(1.05);
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.5);
        border-radius: 1rem;
    }
    
    .dragging-touch {
        transform: scale(1.1);
        opacity: 0.8;
        z-index: 100;
    }
    
    @keyframes wiggle {
        0%, 100% { transform: rotate(-0.5deg) scale(1); }
        50% { transform: rotate(0.5deg) scale(1); }
    }
</style>
