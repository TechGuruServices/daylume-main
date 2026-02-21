<script lang="ts">
    /**
     * Skeleton Loading Component
     * Provides various skeleton shapes for loading states
     */
    
    export let variant: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar' | 'button' = 'rectangular';
    export let width: string = '100%';
    export let height: string = 'auto';
    export let lines: number = 1;
    export let animate: boolean = true;
    export let className: string = '';
</script>

{#if variant === 'text'}
    <div class="space-y-2" style="width: {width};">
        {#each Array(lines) as _, i}
            <div 
                class="skeleton-base rounded {animate ? 'skeleton-animate' : ''} {className}"
                style="height: 1em; width: {i === lines - 1 && lines > 1 ? '75%' : '100%'};"
            ></div>
        {/each}
    </div>

{:else if variant === 'circular'}
    <div 
        class="skeleton-base rounded-full {animate ? 'skeleton-animate' : ''} {className}"
        style="width: {width}; height: {width};"
    ></div>

{:else if variant === 'avatar'}
    <div 
        class="skeleton-base rounded-full {animate ? 'skeleton-animate' : ''} {className}"
        style="width: {width || '40px'}; height: {width || '40px'};"
    ></div>

{:else if variant === 'button'}
    <div 
        class="skeleton-base rounded-xl {animate ? 'skeleton-animate' : ''} {className}"
        style="width: {width}; height: {height || '44px'};"
    ></div>

{:else if variant === 'card'}
    <div 
        class="skeleton-base rounded-2xl {animate ? 'skeleton-animate' : ''} {className}"
        style="width: {width}; height: {height || '120px'};"
    ></div>

{:else}
    <div 
        class="skeleton-base rounded-lg {animate ? 'skeleton-animate' : ''} {className}"
        style="width: {width}; height: {height};"
    ></div>
{/if}

<style>
    .skeleton-base {
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.03) 100%
        );
        background-size: 200% 100%;
    }
    
    .skeleton-animate {
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
    
    @keyframes skeleton-shimmer {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
</style>
