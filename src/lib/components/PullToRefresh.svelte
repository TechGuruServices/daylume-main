<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { browser } from '$app/environment';
    
    export let threshold = 80; // Pull distance needed to trigger refresh
    export let disabled = false;
    
    const dispatch = createEventDispatcher<{ refresh: void }>();
    
    let container: HTMLElement;
    let pullDistance = 0;
    let isRefreshing = false;
    let isPulling = false;
    let startY = 0;
    let currentY = 0;
    
    // Check if we're at the top of the scroll container
    function isAtTop(): boolean {
        if (!browser) return false;
        return window.scrollY <= 0;
    }
    
    function handleTouchStart(e: TouchEvent) {
        if (disabled || isRefreshing || !isAtTop()) return;
        
        startY = e.touches[0].clientY;
        isPulling = true;
    }
    
    function handleTouchMove(e: TouchEvent) {
        if (!isPulling || disabled || isRefreshing) return;
        
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        // Only pull down, not up
        if (diff > 0 && isAtTop()) {
            // Apply resistance to make it feel more natural
            pullDistance = Math.min(diff * 0.5, threshold * 1.5);
            
            // Prevent default scrolling when pulling
            if (pullDistance > 10) {
                e.preventDefault();
            }
        }
    }
    
    function handleTouchEnd() {
        if (!isPulling || disabled) return;
        
        isPulling = false;
        
        if (pullDistance >= threshold && !isRefreshing) {
            // Trigger refresh
            isRefreshing = true;
            pullDistance = threshold * 0.6; // Keep spinner visible
            
            // Haptic feedback if available
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
            
            dispatch('refresh');
            
            // Auto-complete after timeout (parent should call complete())
            setTimeout(() => {
                complete();
            }, 3000);
        } else {
            // Reset
            pullDistance = 0;
        }
    }
    
    export function complete() {
        isRefreshing = false;
        pullDistance = 0;
    }
    
    onMount(() => {
        if (!browser) return;
        
        // Add passive: false to allow preventDefault
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    });
</script>

<!-- Pull indicator -->
{#if pullDistance > 0 || isRefreshing}
    <div 
        class="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none safe-top"
        style="transform: translateY({Math.min(pullDistance, threshold)}px); transition: {isPulling ? 'none' : 'transform 0.3s ease-out'};"
    >
        <div 
            class="mt-4 w-12 h-12 rounded-full bg-[#1e293b] border border-white/10 shadow-xl flex items-center justify-center"
            style="opacity: {Math.min(pullDistance / threshold, 1)};"
        >
            {#if isRefreshing}
                <span class="mdi mdi-loading mdi-spin text-2xl text-primary"></span>
            {:else}
                <span 
                    class="mdi mdi-arrow-down text-2xl text-primary transition-transform"
                    style="transform: rotate({pullDistance >= threshold ? 180 : 0}deg);"
                ></span>
            {/if}
        </div>
    </div>
{/if}

<div bind:this={container}>
    <slot />
</div>
