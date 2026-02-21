<script lang="ts">
    /**
     * Calendar Skeleton - Loading placeholder for calendar view
     */
</script>

<div class="glass-panel rounded-3xl p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-white/5 skeleton-animate"></div>
            <div class="h-7 w-48 bg-white/5 rounded skeleton-animate"></div>
            <div class="w-10 h-10 rounded-xl bg-white/5 skeleton-animate"></div>
        </div>
        <div class="h-10 w-20 bg-white/5 rounded-xl skeleton-animate"></div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-2">
        <!-- Day names -->
        {#each Array(7) as _}
            <div class="h-6 w-8 mx-auto bg-white/5 rounded skeleton-animate"></div>
        {/each}

        <!-- Calendar days - 5 weeks -->
        {#each Array(35) as _, i}
            <div class="min-h-[100px] p-2 rounded-2xl bg-white/5 border border-white/5">
                <div class="w-7 h-7 rounded-full bg-white/5 skeleton-animate mb-2"></div>
                {#if i % 3 === 0}
                    <div class="h-5 bg-white/5 rounded skeleton-animate mb-1"></div>
                {/if}
                {#if i % 5 === 0}
                    <div class="h-5 bg-white/5 rounded skeleton-animate"></div>
                {/if}
            </div>
        {/each}
    </div>
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
