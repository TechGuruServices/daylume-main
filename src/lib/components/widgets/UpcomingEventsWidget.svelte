<script lang="ts">
    import { getEvents } from '$lib/storage';
    import { onMount } from 'svelte';
    import type { CalendarEvent } from '$lib/types';
    
    let upcomingEvents: CalendarEvent[] = [];
    let loading = true;
    
    onMount(() => {
        loadUpcoming();
    });
    
    function loadUpcoming() {
        loading = true;
        const events = getEvents();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get events from today + next 7 days
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        
        upcomingEvents = events
            .filter((e: CalendarEvent) => {
                const eventDate = new Date(e.date);
                return eventDate >= today && eventDate <= weekFromNow;
            })
            .sort((a: CalendarEvent, b: CalendarEvent) => {
                const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
                const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
                return dateA.getTime() - dateB.getTime();
            })
            .slice(0, 4);
        
        loading = false;
    }
    
    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    
    function formatTime(time?: string): string {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
    }
</script>

<div class="h-full flex flex-col">
    <h3 class="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
        <span class="mdi mdi-calendar-clock"></span>
        Upcoming
    </h3>
    
    {#if loading}
        <div class="flex-1 flex flex-col gap-2">
            {#each [1, 2, 3] as _}
                <div class="animate-pulse flex gap-2">
                    <div class="w-8 h-8 rounded bg-white/10"></div>
                    <div class="flex-1">
                        <div class="w-3/4 h-3 rounded bg-white/10 mb-1"></div>
                        <div class="w-1/2 h-2 rounded bg-white/10"></div>
                    </div>
                </div>
            {/each}
        </div>
    {:else if upcomingEvents.length === 0}
        <div class="flex-1 flex items-center justify-center text-center">
            <div>
                <span class="text-2xl block mb-1">📅</span>
                <p class="text-xs text-gray-500">No upcoming events</p>
            </div>
        </div>
    {:else}
        <div class="flex-1 flex flex-col gap-2 overflow-hidden">
            {#each upcomingEvents as event}
                <div class="flex gap-2 items-start p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div 
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style="background: {event.color || '#8B5CF6'}20; color: {event.color || '#8B5CF6'}"
                    >
                        {new Date(event.date).getDate()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">{event.title}</div>
                        <div class="text-xs text-gray-500 flex items-center gap-1">
                            <span>{formatDate(event.date)}</span>
                            {#if event.time}
                                <span>•</span>
                                <span>{formatTime(event.time)}</span>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
