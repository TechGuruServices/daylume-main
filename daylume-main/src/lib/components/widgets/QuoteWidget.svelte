<script lang="ts">
    import { getTodaysQuote } from '$lib/widgets';
    import { onMount } from 'svelte';
    
    let quote = getTodaysQuote();
    let visible = false;
    
    onMount(() => {
        setTimeout(() => visible = true, 100);
    });
</script>

<div class="h-full flex flex-col justify-center {visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500">
    <blockquote class="text-sm md:text-base text-white/90 italic leading-relaxed mb-2">
        "{quote.text}"
    </blockquote>
    <cite class="text-xs text-primary/80 not-italic">
        — {quote.author}
    </cite>
</div>

<style>
    blockquote {
        position: relative;
    }
    
    blockquote::before {
        content: '"';
        position: absolute;
        top: -0.5rem;
        left: -0.75rem;
        font-size: 2rem;
        color: rgba(139, 92, 246, 0.3);
        font-family: Georgia, serif;
    }
</style>
