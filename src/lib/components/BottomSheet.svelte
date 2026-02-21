<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    
    export let open = false;
    export let title = '';
    export let snapPoints: number[] = [0.5, 0.9]; // As percentage of screen height
    export let initialSnap = 0; // Index of initial snap point
    export let dismissible = true;
    
    const dispatch = createEventDispatcher<{ close: void }>();
    
    let sheet: HTMLElement;
    let handle: HTMLElement;
    let currentHeight: number;
    let startY = 0;
    let startHeight = 0;
    let isDragging = false;
    let windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    
    $: snapHeights = snapPoints.map(p => windowHeight * p);
    $: if (open && snapHeights.length > 0) {
        currentHeight = snapHeights[initialSnap] || snapHeights[0];
    }
    
    function handleTouchStart(e: TouchEvent) {
        if (!dismissible && snapPoints.length <= 1) return;
        
        startY = e.touches[0].clientY;
        startHeight = currentHeight;
        isDragging = true;
    }
    
    function handleTouchMove(e: TouchEvent) {
        if (!isDragging) return;
        
        const currentY = e.touches[0].clientY;
        const diff = startY - currentY;
        const newHeight = startHeight + diff;
        
        // Clamp between minimum (for dismiss) and maximum snap point
        const minHeight = dismissible ? -50 : snapHeights[0] * 0.5;
        const maxHeight = Math.max(...snapHeights) * 1.1;
        currentHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        
        e.preventDefault();
    }
    
    function handleTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        // Find closest snap point or dismiss
        if (dismissible && currentHeight < snapHeights[0] * 0.3) {
            // Dismiss
            close();
            return;
        }
        
        // Snap to closest point
        let closestSnap = snapHeights[0];
        let closestDist = Math.abs(currentHeight - closestSnap);
        
        for (const snap of snapHeights) {
            const dist = Math.abs(currentHeight - snap);
            if (dist < closestDist) {
                closestDist = dist;
                closestSnap = snap;
            }
        }
        
        currentHeight = closestSnap;
        
        // Haptic feedback on snap
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }
    
    function close() {
        open = false;
        dispatch('close');
    }
    
    function handleBackdropClick() {
        if (dismissible) {
            close();
        }
    }
    
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && dismissible) {
            close();
        }
    }
    
    onMount(() => {
        windowHeight = window.innerHeight;
        window.addEventListener('keydown', handleKeydown);
        
        const handleResize = () => {
            windowHeight = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('resize', handleResize);
        };
    });
</script>

{#if open}
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
        transition:fade={{ duration: 200 }}
        on:click={handleBackdropClick}
        on:keydown={(e) => e.key === 'Escape' && handleBackdropClick()}
        role="button"
        tabindex="-1"
    ></div>
    
    <!-- Bottom Sheet -->
    <div 
        bind:this={sheet}
        class="fixed inset-x-0 bottom-0 z-[201] bg-[#0f172a] border-t border-white/10 rounded-t-3xl shadow-2xl safe-bottom"
        style="height: {currentHeight}px; transition: {isDragging ? 'none' : 'height 0.3s ease-out'};"
        transition:fly={{ y: 300, duration: 300, easing: quintOut }}
    >
        <!-- Drag Handle -->
        <div 
            bind:this={handle}
            class="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
            on:touchstart={handleTouchStart}
            on:touchmove={handleTouchMove}
            on:touchend={handleTouchEnd}
            role="slider"
            tabindex="0"
            aria-label="Drag to resize"
            aria-valuenow={currentHeight}
        >
            <div class="w-12 h-1.5 rounded-full bg-white/20"></div>
        </div>
        
        <!-- Header -->
        {#if title}
            <div class="flex items-center justify-between px-6 pb-4 border-b border-white/5">
                <h2 class="text-lg font-heading font-bold text-white">{title}</h2>
                {#if dismissible}
                    <button 
                        on:click={close}
                        class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <span class="mdi mdi-close text-lg"></span>
                    </button>
                {/if}
            </div>
        {/if}
        
        <!-- Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar px-6 py-4" style="max-height: calc(100% - 60px);">
            <slot />
        </div>
    </div>
{/if}
