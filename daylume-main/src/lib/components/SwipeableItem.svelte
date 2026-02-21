<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let swipeLeftAction: 'delete' | 'archive' | 'custom' = 'delete';
    export let swipeRightAction: 'complete' | 'edit' | 'custom' = 'complete';
    export let threshold = 80; // Minimum swipe distance to trigger action
    export let disabled = false;
    
    const dispatch = createEventDispatcher<{
        swipeLeft: void;
        swipeRight: void;
    }>();
    
    let element: HTMLElement;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let offsetX = 0;
    let isSwiping = false;
    let isHorizontalSwipe: boolean | null = null;
    
    const actionConfig = {
        delete: { icon: '/assets/glass_15_delete.png', color: 'bg-danger', label: 'Delete' },
        archive: { icon: '/assets/glass_15_delete.png', color: 'bg-warning', label: 'Archive' },
        complete: { icon: '/assets/glass_11_confirm.png', color: 'bg-success', label: 'Complete' },
        edit: { icon: '/assets/glass_14_edit.png', color: 'bg-info', label: 'Edit' },
        custom: { icon: '/assets/glass_10_add.png', color: 'bg-primary', label: 'Action' }
    };
    
    $: leftConfig = actionConfig[swipeLeftAction];
    $: rightConfig = actionConfig[swipeRightAction];
    $: swipeProgress = Math.abs(offsetX) / threshold;
    
    function handleTouchStart(e: TouchEvent) {
        if (disabled) return;
        
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = true;
        isHorizontalSwipe = null;
    }
    
    function handleTouchMove(e: TouchEvent) {
        if (!isSwiping || disabled) return;
        
        currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;
        
        // Determine swipe direction on first significant movement
        if (isHorizontalSwipe === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
            isHorizontalSwipe = Math.abs(diffX) > Math.abs(diffY);
        }
        
        // Only handle horizontal swipes
        if (isHorizontalSwipe) {
            e.preventDefault();
            // Apply resistance for over-swipe
            const maxSwipe = threshold * 1.5;
            offsetX = Math.max(-maxSwipe, Math.min(maxSwipe, diffX * 0.8));
        }
    }
    
    function handleTouchEnd() {
        if (!isSwiping || disabled) return;
        
        isSwiping = false;
        isHorizontalSwipe = null;
        
        if (Math.abs(offsetX) >= threshold) {
            // Haptic feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(30);
            }
            
            if (offsetX < 0) {
                // Swiped left
                dispatch('swipeLeft');
            } else {
                // Swiped right
                dispatch('swipeRight');
            }
        }
        
        // Reset position
        offsetX = 0;
    }
</script>

<div class="relative overflow-hidden rounded-2xl">
    <!-- Left action background (swipe right reveals this) -->
    <div 
        class="absolute inset-y-0 left-0 w-24 {rightConfig.color} flex items-center justify-start pl-4 rounded-l-2xl"
        style="opacity: {offsetX > 0 ? Math.min(swipeProgress, 1) : 0};"
    >
        <div class="flex flex-col items-center gap-1 text-white">
            <img src={rightConfig.icon} alt={rightConfig.label} class="w-8 h-8" style="transform: scale({Math.min(swipeProgress, 1.2)});" />
            <span class="text-xs font-medium">{rightConfig.label}</span>
        </div>
    </div>
    
    <!-- Right action background (swipe left reveals this) -->
    <div 
        class="absolute inset-y-0 right-0 w-24 {leftConfig.color} flex items-center justify-end pr-4 rounded-r-2xl"
        style="opacity: {offsetX < 0 ? Math.min(swipeProgress, 1) : 0};"
    >
        <div class="flex flex-col items-center gap-1 text-white">
            <img src={leftConfig.icon} alt={leftConfig.label} class="w-8 h-8" style="transform: scale({Math.min(swipeProgress, 1.2)});" />
            <span class="text-xs font-medium">{leftConfig.label}</span>
        </div>
    </div>
    
    <!-- Main content -->
    <div 
        bind:this={element}
        class="relative z-10 touch-pan-y"
        style="transform: translateX({offsetX}px); transition: {isSwiping ? 'none' : 'transform 0.3s ease-out'};"
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd}
    >
        <slot />
    </div>
</div>
