<script lang="ts">
    /**
     * Task Skeleton - Loading placeholder for task items
     */
    export let count: number = 3;
</script>

<div class="space-y-3">
    {#each Array(count) as _}
        <div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <!-- Checkbox skeleton -->
            <div class="w-6 h-6 rounded-lg bg-white/5 skeleton-animate flex-shrink-0"></div>
            
            <div class="flex-1 min-w-0 space-y-2">
                <!-- Title -->
                <div class="h-4 bg-white/5 rounded skeleton-animate w-3/4"></div>
                
                <!-- Meta info -->
                <div class="flex items-center gap-2">
                    <div class="h-3 bg-white/5 rounded skeleton-animate w-16"></div>
                    <div class="h-5 bg-white/5 rounded-full skeleton-animate w-14"></div>
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    .skeleton-animate {
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.03) 100%
        );
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
    
    @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>
