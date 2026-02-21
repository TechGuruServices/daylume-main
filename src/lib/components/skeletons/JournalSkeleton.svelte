<script lang="ts">
    /**
     * Journal Skeleton - Loading placeholder for journal entries
     */
    export let count: number = 3;
</script>

<div class="space-y-4">
    {#each Array(count) as _}
        <div class="p-6 rounded-2xl bg-white/5 border border-white/5">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <!-- Mood emoji -->
                        <div class="w-8 h-8 rounded-full bg-white/5 skeleton-animate"></div>
                        <!-- Mood label -->
                        <div class="h-5 w-16 bg-white/5 rounded-full skeleton-animate"></div>
                    </div>
                    <!-- Date -->
                    <div class="h-4 w-40 bg-white/5 rounded skeleton-animate mt-2"></div>
                </div>
                <!-- Arrow button -->
                <div class="w-10 h-10 rounded-full bg-white/5 skeleton-animate"></div>
            </div>
            
            <!-- Content lines -->
            <div class="space-y-2 mb-4">
                <div class="h-5 bg-white/5 rounded skeleton-animate w-full"></div>
                <div class="h-5 bg-white/5 rounded skeleton-animate w-11/12"></div>
                <div class="h-5 bg-white/5 rounded skeleton-animate w-3/4"></div>
            </div>
            
            <!-- Tags -->
            <div class="flex gap-2 pt-4 border-t border-white/5">
                <div class="h-6 w-16 bg-white/5 rounded-full skeleton-animate"></div>
                <div class="h-6 w-20 bg-white/5 rounded-full skeleton-animate"></div>
                <div class="h-6 w-14 bg-white/5 rounded-full skeleton-animate"></div>
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
