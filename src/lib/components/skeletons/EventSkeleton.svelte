<script lang="ts">
    /**
     * Event Skeleton - Loading placeholder for calendar events
     */
    export let count: number = 3;
</script>

<div class="space-y-1">
    {#each Array(count) as _}
        <div class="timeline-item">
            <div class="flex items-start gap-3">
                <!-- Time -->
                <div class="w-14 h-4 bg-white/5 rounded skeleton-animate flex-shrink-0"></div>
                
                <div class="flex-1 space-y-1">
                    <div class="flex items-center gap-2">
                        <!-- Category dot -->
                        <div class="w-2 h-2 rounded-full bg-white/5 skeleton-animate"></div>
                        <!-- Title -->
                        <div class="h-4 bg-white/5 rounded skeleton-animate w-32"></div>
                    </div>
                    <!-- Description -->
                    <div class="h-3 bg-white/5 rounded skeleton-animate w-24"></div>
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    .timeline-item {
        position: relative;
        padding-left: 2rem;
        padding-bottom: 1.5rem;
        border-left: 2px solid rgba(255, 255, 255, 0.1);
    }
    
    .timeline-item:last-child {
        border-left: none;
        padding-bottom: 0;
    }
    
    .timeline-item::before {
        content: '';
        position: absolute;
        left: -5px;
        top: 4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
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
