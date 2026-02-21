<script lang="ts">
    /**
     * Habit Skeleton - Loading placeholder for habit items
     */
    export let count: number = 4;
</script>

<div class="space-y-4">
    {#each Array(count) as _}
        <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <!-- Icon -->
                    <div class="w-8 h-8 rounded-lg bg-white/5 skeleton-animate"></div>
                    <div class="space-y-1">
                        <!-- Title -->
                        <div class="h-4 bg-white/5 rounded skeleton-animate w-24"></div>
                        <!-- Count -->
                        <div class="h-3 bg-white/5 rounded skeleton-animate w-16"></div>
                    </div>
                </div>
                <!-- Action button -->
                <div class="w-10 h-10 rounded-xl bg-white/5 skeleton-animate"></div>
            </div>
            <!-- Progress bar -->
            <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-white/5 skeleton-animate w-1/2"></div>
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
