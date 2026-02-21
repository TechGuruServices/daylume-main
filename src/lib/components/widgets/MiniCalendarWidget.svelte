<script lang="ts">
    import { getEvents } from '$lib/storage';
    import { onMount } from 'svelte';
    import type { CalendarEvent } from '$lib/types';

    let currentDate = new Date();
    let calendarDays: Array<{ date: number; isToday: boolean; isCurrentMonth: boolean; hasEvents: boolean }> = [];
    let events: CalendarEvent[] = [];

    $: monthName = currentDate.toLocaleString('default', { month: 'short' });
    $: year = currentDate.getFullYear();

    onMount(() => {
        events = getEvents();
        generateCalendar();
    });

    function generateCalendar() {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const today = new Date();

        calendarDays = [];

        // Add padding for days before first day of month
        const startPadding = firstDay.getDay();
        for (let i = 0; i < startPadding; i++) {
            const prevMonthDay = new Date(firstDay);
            prevMonthDay.setDate(prevMonthDay.getDate() - (startPadding - i));
            calendarDays.push({
                date: prevMonthDay.getDate(),
                isToday: false,
                isCurrentMonth: false,
                hasEvents: false
            });
        }

        // Add days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            const dateStr = date.toISOString().split('T')[0];
            const hasEvents = events.some(e => e.date === dateStr);

            calendarDays.push({
                date: i,
                isToday: today.toDateString() === date.toDateString(),
                isCurrentMonth: true,
                hasEvents
            });
        }

        // Add padding for remaining days
        const remaining = 42 - calendarDays.length; // 6 rows * 7 days
        for (let i = 1; i <= remaining; i++) {
            calendarDays.push({
                date: i,
                isToday: false,
                isCurrentMonth: false,
                hasEvents: false
            });
        }
    }

    function prevMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        generateCalendar();
    }

    function nextMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        generateCalendar();
    }
</script>

<div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
        <button on:click={prevMonth} aria-label="Previous month" class="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-gray-400">
            <span class="mdi mdi-chevron-left"></span>
        </button>
        <span class="text-sm font-semibold">{monthName} {year}</span>
        <button on:click={nextMonth} aria-label="Next month" class="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-gray-400">
            <span class="mdi mdi-chevron-right"></span>
        </button>
    </div>

    <!-- Day Headers -->
    <div class="grid grid-cols-7 gap-0.5 mb-1">
        {#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as day}
            <div class="text-center text-xs text-gray-500 font-medium">{day}</div>
        {/each}
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-0.5 flex-1">
        {#each calendarDays.slice(0, 35) as day}
            <div
                class="flex items-center justify-center text-xs relative rounded
                    {day.isToday ? 'bg-primary text-white font-bold' : ''}
                    {!day.isCurrentMonth ? 'text-gray-600' : 'text-gray-300'}
                    {day.hasEvents && !day.isToday ? 'text-primary font-medium' : ''}"
            >
                {day.date}
                {#if day.hasEvents && !day.isToday}
                    <span class="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary"></span>
                {/if}
            </div>
        {/each}
    </div>
</div>
