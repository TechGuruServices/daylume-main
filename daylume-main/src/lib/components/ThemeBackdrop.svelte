<script lang="ts">
    import { themeStore } from '$lib/theme';
    import type { VisualTheme, CustomBackgroundSettings } from '$lib/types';
    import { onMount } from 'svelte';
    
    export let theme: VisualTheme = 'default';
    
    // Custom background image from settings
    let customBackground: CustomBackgroundSettings | undefined = undefined;
    let currentBgImage: string | null = null;
    
    // Ocean theme - mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let isInteracting = false;
    let interactionTimeout: ReturnType<typeof setTimeout>;
    
    // Subscribe to theme store changes
    $: theme = $themeStore?.visualTheme || 'default';
    $: customBackground = $themeStore?.customBackground;
    $: {
        // Compute current background image based on customBackground settings
        if (customBackground?.images?.length) {
            const index = customBackground.currentIndex || 0;
            currentBgImage = customBackground.images[index] || null;
        } else {
            currentBgImage = null;
        }
    }
    
    onMount(() => {
        // Mouse/touch interaction for ocean theme
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (theme !== 'ocean') return;
            
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            
            mouseX = (clientX / window.innerWidth) * 100;
            mouseY = (clientY / window.innerHeight) * 100;
            isInteracting = true;
            
            clearTimeout(interactionTimeout);
            interactionTimeout = setTimeout(() => {
                isInteracting = false;
            }, 2000);
        };
        
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove);
        
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            clearTimeout(interactionTimeout);
        };
    });
</script>

<!-- Custom Background Image (overrides theme) -->
{#if currentBgImage}
    <div 
        class="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style="background-image: url({currentBgImage});"
    >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
    </div>
{:else}
    <!-- Theme Backdrop Container -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {#if theme === 'aurora'}
            <!-- Aurora (Northern Lights) Theme -->
            <div class="aurora-backdrop">
                <div class="aurora-stars"></div>
                <div class="aurora-wave aurora-wave-1"></div>
                <div class="aurora-wave aurora-wave-2"></div>
                <div class="aurora-wave aurora-wave-3"></div>
                <div class="aurora-wave aurora-wave-4"></div>
                <div class="aurora-glow aurora-glow-1"></div>
                <div class="aurora-glow aurora-glow-2"></div>
                <div class="aurora-glow aurora-glow-3"></div>
            </div>
            
        {:else if theme === 'sunset'}
            <!-- Sunset Theme - Warm gradient orbs with shifting animation -->
            <div class="sunset-backdrop">
                <!-- Sun glow -->
                <div class="sunset-sun"></div>
                <!-- Floating orbs -->
                <div class="sunset-orb sunset-orb-1"></div>
                <div class="sunset-orb sunset-orb-2"></div>
                <div class="sunset-orb sunset-orb-3"></div>
                <div class="sunset-orb sunset-orb-4"></div>
                <div class="sunset-orb sunset-orb-5"></div>
                <!-- Horizon gradient -->
                <div class="sunset-horizon"></div>
            </div>
            
        {:else if theme === 'ocean'}
            <!-- Ocean Theme - Deep blue waves with interactive retract -->
            <div class="ocean-backdrop">
                <!-- Deep water gradient -->
                <div class="ocean-depth"></div>
                <!-- Wave layers -->
                <div 
                    class="ocean-wave ocean-wave-1"
                    class:ocean-retract={isInteracting}
                    style="--mouse-x: {mouseX}%; --mouse-y: {mouseY}%;"
                ></div>
                <div 
                    class="ocean-wave ocean-wave-2"
                    class:ocean-retract={isInteracting}
                    style="--mouse-x: {mouseX}%; --mouse-y: {mouseY}%;"
                ></div>
                <div 
                    class="ocean-wave ocean-wave-3"
                    class:ocean-retract={isInteracting}
                    style="--mouse-x: {mouseX}%; --mouse-y: {mouseY}%;"
                ></div>
                <!-- Light rays -->
                <div class="ocean-rays"></div>
                <!-- Bubbles -->
                <div class="ocean-bubbles">
                    {#each Array(15) as _, i}
                        <div class="ocean-bubble" style="--delay: {i * 0.5}s; --x: {10 + Math.random() * 80}%; --size: {4 + Math.random() * 8}px;"></div>
                    {/each}
                </div>
            </div>
            
        {:else if theme === 'forest'}
            <!-- Forest Theme - Green with leaf particles -->
            <div class="forest-backdrop">
                <!-- Forest gradient -->
                <div class="forest-gradient"></div>
                <!-- Tree silhouettes glow -->
                <div class="forest-glow forest-glow-1"></div>
                <div class="forest-glow forest-glow-2"></div>
                <!-- Floating leaves -->
                <div class="forest-leaves">
                    {#each Array(20) as _, i}
                        <div 
                            class="forest-leaf" 
                            style="--delay: {i * 0.8}s; --x: {Math.random() * 100}%; --duration: {8 + Math.random() * 6}s; --rotation: {Math.random() * 360}deg;"
                        >
                            🍃
                        </div>
                    {/each}
                </div>
                <!-- Fireflies -->
                <div class="forest-fireflies">
                    {#each Array(12) as _, i}
                        <div 
                            class="forest-firefly"
                            style="--delay: {i * 0.7}s; --x: {10 + Math.random() * 80}%; --y: {20 + Math.random() * 60}%;"
                        ></div>
                    {/each}
                </div>
            </div>
            
        {:else if theme === 'minimal'}
            <!-- Minimal Theme - Pure black with subtle accents -->
            <div class="minimal-backdrop">
                <div class="minimal-grid"></div>
                <div class="minimal-accent minimal-accent-1"></div>
                <div class="minimal-accent minimal-accent-2"></div>
            </div>
            
        {:else}
            <!-- Default Theme (Original ambient orbs) -->
            <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow"></div>
            <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px] animate-pulse-slow" style="animation-delay: 2s;"></div>
        {/if}
    </div>
{/if}

<style>
    /* ========================================
       AURORA THEME - Northern Lights
       ======================================== */
    .aurora-backdrop {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .aurora-stars {
        position: absolute;
        inset: 0;
        background-image: 
            radial-gradient(2px 2px at 20px 30px, white, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 90px 40px, white, transparent),
            radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 230px 80px, white, transparent),
            radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 370px 50px, white, transparent),
            radial-gradient(2px 2px at 450px 180px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 520px 90px, white, transparent),
            radial-gradient(2px 2px at 600px 200px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 680px 60px, white, transparent),
            radial-gradient(2px 2px at 750px 140px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 820px 100px, white, transparent),
            radial-gradient(2px 2px at 900px 220px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 970px 70px, white, transparent);
        background-size: 1000px 400px;
        animation: twinkle 8s ease-in-out infinite;
        opacity: 0.6;
    }

    @keyframes twinkle {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 0.9; }
    }

    .aurora-wave {
        position: absolute;
        width: 200%;
        height: 60%;
        left: -50%;
        opacity: 0;
        filter: blur(60px);
        animation: auroraWave 15s ease-in-out infinite;
    }

    .aurora-wave-1 {
        top: 5%;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 255, 127, 0.3) 20%, rgba(0, 200, 150, 0.4) 40%, rgba(0, 150, 200, 0.3) 60%, transparent 100%);
        animation-delay: 0s;
    }

    .aurora-wave-2 {
        top: 10%;
        background: linear-gradient(180deg, transparent 0%, rgba(100, 255, 218, 0.25) 25%, rgba(0, 255, 170, 0.35) 50%, rgba(50, 200, 255, 0.25) 75%, transparent 100%);
        animation-delay: 3s;
    }

    .aurora-wave-3 {
        top: 0%;
        background: linear-gradient(180deg, transparent 0%, rgba(138, 43, 226, 0.2) 30%, rgba(0, 255, 127, 0.3) 50%, rgba(100, 200, 255, 0.2) 70%, transparent 100%);
        animation-delay: 6s;
    }

    .aurora-wave-4 {
        top: 8%;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 255, 200, 0.2) 20%, rgba(100, 255, 150, 0.3) 45%, rgba(0, 200, 255, 0.25) 70%, transparent 100%);
        animation-delay: 9s;
    }

    @keyframes auroraWave {
        0% { opacity: 0; transform: translateX(-20%) scaleY(0.8); }
        15% { opacity: 0.7; }
        30% { opacity: 0.9; transform: translateX(0%) scaleY(1.1); }
        50% { opacity: 0.8; transform: translateX(10%) scaleY(1); }
        70% { opacity: 0.7; transform: translateX(5%) scaleY(0.9); }
        85% { opacity: 0.4; }
        100% { opacity: 0; transform: translateX(-10%) scaleY(0.8); }
    }

    .aurora-glow {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
        animation: auroraGlow 20s ease-in-out infinite;
    }

    .aurora-glow-1 {
        width: 40vw; height: 40vh; top: -10%; left: 10%;
        background: radial-gradient(circle, rgba(0, 255, 127, 0.4) 0%, transparent 70%);
    }

    .aurora-glow-2 {
        width: 50vw; height: 50vh; top: -5%; right: 10%;
        background: radial-gradient(circle, rgba(0, 200, 255, 0.35) 0%, transparent 70%);
        animation-delay: 5s;
    }

    .aurora-glow-3 {
        width: 35vw; height: 35vh; top: 5%; left: 40%;
        background: radial-gradient(circle, rgba(138, 43, 226, 0.3) 0%, transparent 70%);
        animation-delay: 10s;
    }

    @keyframes auroraGlow {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.2); }
    }

    /* ========================================
       SUNSET THEME - Warm Gradient Orbs
       ======================================== */
    .sunset-backdrop {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: linear-gradient(180deg, #1a0a2e 0%, #16213e 50%, #0f0f23 100%);
    }

    .sunset-sun {
        position: absolute;
        width: 40vw;
        height: 40vw;
        max-width: 400px;
        max-height: 400px;
        top: 5%;
        right: 10%;
        background: radial-gradient(circle, rgba(255, 107, 53, 0.6) 0%, rgba(255, 154, 0, 0.3) 40%, transparent 70%);
        border-radius: 50%;
        filter: blur(60px);
        animation: sunPulse 8s ease-in-out infinite;
    }

    @keyframes sunPulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.1); opacity: 0.8; }
    }

    .sunset-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        animation: orbFloat 12s ease-in-out infinite;
    }

    .sunset-orb-1 {
        width: 30vw; height: 30vw;
        top: 20%; left: 5%;
        background: radial-gradient(circle, rgba(255, 107, 53, 0.5) 0%, transparent 70%);
        animation-delay: 0s;
    }

    .sunset-orb-2 {
        width: 25vw; height: 25vw;
        top: 40%; right: 15%;
        background: radial-gradient(circle, rgba(247, 147, 30, 0.4) 0%, transparent 70%);
        animation-delay: 2s;
        animation-duration: 14s;
    }

    .sunset-orb-3 {
        width: 35vw; height: 35vw;
        bottom: 20%; left: 20%;
        background: radial-gradient(circle, rgba(255, 20, 147, 0.35) 0%, transparent 70%);
        animation-delay: 4s;
        animation-duration: 16s;
    }

    .sunset-orb-4 {
        width: 20vw; height: 20vw;
        top: 60%; right: 5%;
        background: radial-gradient(circle, rgba(255, 99, 71, 0.4) 0%, transparent 70%);
        animation-delay: 1s;
        animation-duration: 10s;
    }

    .sunset-orb-5 {
        width: 28vw; height: 28vw;
        bottom: 5%; right: 30%;
        background: radial-gradient(circle, rgba(255, 69, 0, 0.3) 0%, transparent 70%);
        animation-delay: 3s;
        animation-duration: 18s;
    }

    @keyframes orbFloat {
        0%, 100% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(30px, -20px) scale(1.05); }
        50% { transform: translate(-20px, 30px) scale(0.95); }
        75% { transform: translate(20px, 20px) scale(1.02); }
    }

    .sunset-horizon {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 30%;
        background: linear-gradient(180deg, transparent 0%, rgba(255, 107, 53, 0.1) 50%, rgba(255, 69, 0, 0.15) 100%);
    }

    /* ========================================
       OCEAN THEME - Deep Blue Waves
       ======================================== */
    .ocean-backdrop {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: linear-gradient(180deg, #020617 0%, #0c1929 30%, #0a2540 70%, #051628 100%);
    }

    .ocean-depth {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 50% 100%, rgba(0, 119, 182, 0.2) 0%, transparent 60%);
    }

    .ocean-wave {
        position: absolute;
        width: 200%;
        height: 50%;
        left: -50%;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 180, 216, 0.15) 30%, rgba(144, 224, 239, 0.1) 60%, transparent 100%);
        border-radius: 50%;
        animation: oceanWave 10s ease-in-out infinite;
        transition: transform 0.8s ease-out, opacity 0.8s ease-out;
    }

    .ocean-wave-1 { bottom: 0%; animation-delay: 0s; }
    .ocean-wave-2 { bottom: 10%; animation-delay: 2s; opacity: 0.7; }
    .ocean-wave-3 { bottom: 20%; animation-delay: 4s; opacity: 0.5; }

    .ocean-wave.ocean-retract {
        transform: translateX(calc(var(--mouse-x) - 50%)) scaleY(0.5) !important;
        opacity: 0.3 !important;
    }

    @keyframes oceanWave {
        0%, 100% { transform: translateX(-5%) scaleY(1); }
        50% { transform: translateX(5%) scaleY(1.1); }
    }

    .ocean-rays {
        position: absolute;
        top: 0;
        left: 50%;
        width: 100%;
        height: 80%;
        transform: translateX(-50%);
        background: conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(144, 224, 239, 0.05) 45%, transparent 50%, transparent 90%, rgba(144, 224, 239, 0.05) 95%, transparent 100%);
        animation: raysSway 15s ease-in-out infinite;
    }

    @keyframes raysSway {
        0%, 100% { transform: translateX(-50%) rotate(-5deg); }
        50% { transform: translateX(-50%) rotate(5deg); }
    }

    .ocean-bubbles {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .ocean-bubble {
        position: absolute;
        bottom: -20px;
        left: var(--x);
        width: var(--size);
        height: var(--size);
        background: radial-gradient(circle, rgba(144, 224, 239, 0.6) 0%, rgba(144, 224, 239, 0.2) 50%, transparent 100%);
        border-radius: 50%;
        animation: bubbleRise 8s ease-in infinite;
        animation-delay: var(--delay);
    }

    @keyframes bubbleRise {
        0% { transform: translateY(0) scale(1); opacity: 0.6; }
        50% { opacity: 0.8; }
        100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
    }

    /* ========================================
       FOREST THEME - Green with Leaf Particles
       ======================================== */
    .forest-backdrop {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: linear-gradient(180deg, #020617 0%, #0a1f0a 40%, #0d2818 70%, #051505 100%);
    }

    .forest-gradient {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 30% 80%, rgba(45, 90, 39, 0.3) 0%, transparent 50%),
                    radial-gradient(ellipse at 70% 60%, rgba(74, 124, 89, 0.2) 0%, transparent 40%);
    }

    .forest-glow {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
        animation: forestGlow 12s ease-in-out infinite;
    }

    .forest-glow-1 {
        width: 40vw; height: 40vh;
        bottom: 10%; left: 10%;
        background: radial-gradient(circle, rgba(45, 90, 39, 0.4) 0%, transparent 70%);
    }

    .forest-glow-2 {
        width: 35vw; height: 35vh;
        top: 20%; right: 15%;
        background: radial-gradient(circle, rgba(143, 179, 57, 0.25) 0%, transparent 70%);
        animation-delay: 4s;
    }

    @keyframes forestGlow {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
    }

    .forest-leaves {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .forest-leaf {
        position: absolute;
        top: -30px;
        left: var(--x);
        font-size: 20px;
        opacity: 0.7;
        animation: leafFall var(--duration) linear infinite;
        animation-delay: var(--delay);
        transform: rotate(var(--rotation));
    }

    @keyframes leafFall {
        0% { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0.7; }
        25% { transform: translateY(25vh) rotate(90deg) translateX(20px); }
        50% { transform: translateY(50vh) rotate(180deg) translateX(-10px); opacity: 0.8; }
        75% { transform: translateY(75vh) rotate(270deg) translateX(15px); }
        100% { transform: translateY(110vh) rotate(360deg) translateX(0); opacity: 0; }
    }

    .forest-fireflies {
        position: absolute;
        inset: 0;
    }

    .forest-firefly {
        position: absolute;
        left: var(--x);
        top: var(--y);
        width: 4px;
        height: 4px;
        background: #c5f467;
        border-radius: 50%;
        box-shadow: 0 0 10px 3px rgba(197, 244, 103, 0.6), 0 0 20px 6px rgba(197, 244, 103, 0.3);
        animation: fireflyFloat 6s ease-in-out infinite, fireflyGlow 2s ease-in-out infinite;
        animation-delay: var(--delay);
    }

    @keyframes fireflyFloat {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(20px, -15px); }
        50% { transform: translate(-10px, 10px); }
        75% { transform: translate(15px, 5px); }
    }

    @keyframes fireflyGlow {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }

    /* ========================================
       MINIMAL THEME - Pure Black/White
       ======================================== */
    .minimal-backdrop {
        position: absolute;
        inset: 0;
        background: #000000;
    }

    .minimal-grid {
        position: absolute;
        inset: 0;
        background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 50px 50px;
        animation: gridPulse 10s ease-in-out infinite;
    }

    @keyframes gridPulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 0.8; }
    }

    .minimal-accent {
        position: absolute;
        border-radius: 50%;
        filter: blur(150px);
    }

    .minimal-accent-1 {
        width: 30vw; height: 30vh;
        top: 10%; right: 10%;
        background: rgba(255, 255, 255, 0.05);
        animation: minimalFloat 20s ease-in-out infinite;
    }

    .minimal-accent-2 {
        width: 25vw; height: 25vh;
        bottom: 20%; left: 15%;
        background: rgba(255, 255, 255, 0.03);
        animation: minimalFloat 25s ease-in-out infinite reverse;
    }

    @keyframes minimalFloat {
        0%, 100% { transform: translate(0, 0); opacity: 0.5; }
        50% { transform: translate(20px, -20px); opacity: 0.8; }
    }

    /* Performance optimization for reduced motion */
    @media (prefers-reduced-motion: reduce) {
        .aurora-wave, .aurora-glow, .aurora-stars,
        .sunset-orb, .sunset-sun,
        .ocean-wave, .ocean-bubble,
        .forest-leaf, .forest-firefly, .forest-glow,
        .minimal-grid, .minimal-accent {
            animation: none;
            opacity: 0.5;
        }
    }
</style>
