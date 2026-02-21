<script lang="ts">
    /**
     * Dashboard Skeleton - Loading placeholder for dashboard hero section
     */
</script>

<!-- Hero Section Skeleton -->
<div class="premium-card p-6 md:p-8 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
    
    <div class="relative z-10">
        <!-- Time Badge + Weather -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-4">
                <div class="h-10 w-24 bg-white/5 rounded-full skeleton-animate"></div>
                <div class="hidden lg:block h-8 w-32 bg-white/5 rounded-lg skeleton-animate"></div>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
            <div class="flex-1 space-y-4">
                <!-- Greeting -->
                <div class="h-12 bg-white/5 rounded skeleton-animate w-64 md:w-96"></div>
                <!-- Date -->
                <div class="h-5 bg-white/5 rounded skeleton-animate w-48"></div>
                
                <!-- Weather on mobile -->
                <div class="mt-4 lg:hidden h-8 w-32 bg-white/5 rounded-lg skeleton-animate"></div>
                
                <!-- Quick Stats -->
                <div class="flex flex-wrap items-center gap-4 md:gap-6 mt-6 md:mt-8">
                    {#each [1, 2, 3] as _}
                        <div class="flex flex-col gap-1">
                            <div class="h-8 w-12 bg-white/5 rounded skeleton-animate"></div>
                            <div class="h-3 w-16 bg-white/5 rounded skeleton-animate"></div>
                        </div>
                        <div class="w-px h-10 bg-white/10"></div>
                    {/each}
                </div>
            </div>
            
            <!-- Progress Circle -->
            <div class="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/5 skeleton-animate self-center lg:self-auto"></div>
        </div>
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
