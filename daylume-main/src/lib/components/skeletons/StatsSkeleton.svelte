<script lang="ts">
    /**
     * Stats Skeleton - Loading placeholder for stat cards
     */
    export let count: number = 4;
</script>

<div class="grid grid-cols-2 md:grid-cols-{count} gap-3 md:gap-4">
    {#each Array(count) as _}
        <div class="stat-card">
            <div class="w-12 h-12 rounded-2xl bg-white/5 skeleton-animate"></div>
            <div class="space-y-1.5">
                <div class="h-7 w-10 bg-white/5 rounded skeleton-animate"></div>
                <div class="h-3 w-14 bg-white/5 rounded skeleton-animate"></div>
            </div>
        </div>
    {/each}
</div>

<style>
    .stat-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
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
